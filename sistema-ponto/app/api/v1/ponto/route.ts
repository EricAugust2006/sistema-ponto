import { NextRequest, NextResponse } from "next/server";
import { autenticatorRequisicao } from "@/_infra/auth";
import database from "@/_infra/database.js";
import z from "zod";
import type { PoolClient } from "pg";

const ORDEM_TIPOS = ["entrada", "saida_almoco", "retorno_almoco", "saida"] as const;

const criarPontoSchema = z.object({
  type: z.enum(ORDEM_TIPOS, { message: "Tipo de ponto inválido" }),
});

const TOLERANCIA_ALMOCO_MINUTOS = 60;
const PENALIDADE_RECUSA_MINUTOS = -60;

export async function POST(req: NextRequest) {
  const empregado = await autenticatorRequisicao(req);

  if (!empregado) {
    return NextResponse.json({ erro: "Não Autorizado" }, { status: 401 });
  }

  let client: PoolClient | undefined;
  let transacaoIniciada = false;

  try {
    const rawBody = await req.json();
    const body = criarPontoSchema.parse(rawBody);

    client = await database.getClient();
    await client.query("BEGIN");
    transacaoIniciada = true;

    const pontosHojeResult = await client.query({
      text: `
        SELECT tipo FROM pontos
        WHERE empregado_id = $1 AND data_referencia = CURRENT_DATE
      `,
      values: [empregado.id],
    });

    const pontosHojeSet = new Set(
      pontosHojeResult.rows.map((r: { tipo: string }) => r.tipo),
    );

    if (pontosHojeSet.has(body.type)) {
      await client.query("ROLLBACK");
      transacaoIniciada = false;
      return NextResponse.json(
        { erro: "Você já registrou este tipo de ponto hoje." },
        { status: 400 },
      );
    }

    // Não permite voltar para um tipo que já foi ultrapassado
    const indiceAtual = ORDEM_TIPOS.indexOf(body.type);
    const tiposPosteriores = ORDEM_TIPOS.slice(indiceAtual + 1);
    const foiUltrapassado = tiposPosteriores.some((t) => pontosHojeSet.has(t));

    if (foiUltrapassado) {
      await client.query("ROLLBACK");
      transacaoIniciada = false;

      return NextResponse.json(
        {
          erro: `Você já registrou um ponto posterior a "${body.type}". Envie uma justificativa para este horário.`,
        },
        { status: 400 },
      );
    }

    // Não permite pular etapas da sequência
    if (indiceAtual > 0) {
      const tipoAnterior = ORDEM_TIPOS[indiceAtual - 1];

      if (!pontosHojeSet.has(tipoAnterior)) {
        await client.query("ROLLBACK");
        transacaoIniciada = false;

        return NextResponse.json(
          {
            erro: `Não é possível registrar "${body.type}" sem registrar "${tipoAnterior}" primeiro.`,
          },
          { status: 400 },
        );
      }
    }

    const res = await client.query({
      text: `INSERT INTO pontos (empregado_id, tipo) VALUES ($1, $2) RETURNING *`,
      values: [empregado.id, body.type],
    });

    const pontoCriado = res.rows[0];

    if (body.type === "saida") {
      await tentarFecharDia(empregado.id, "CURRENT_DATE", client);
    }

    await client.query("COMMIT");
    transacaoIniciada = false;

    return NextResponse.json(pontoCriado, { status: 201 });
  } catch (err) {
    if (transacaoIniciada && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Erro ao desfazer transação:", rollbackError);
      }
    }

    console.error("Erro ao registrar ponto:", err);

    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return NextResponse.json(
        { erro: "Você já registrou este tipo de ponto hoje." },
        { status: 400 },
      );
    }

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: err.flatten().fieldErrors },
        { status: 400 },
      );
    }

    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  } finally {
    client?.release();
  }
}

// Tenta calcular e gravar o banco de horas de um dia específico do empregado.
// dataRef pode ser "CURRENT_DATE" (literal SQL) ou uma string "YYYY-MM-DD".
export async function tentarFecharDia(
  empregadoId: number,
  dataRef: string,
  client: PoolClient,
) {
  const dataExpr = dataRef === "CURRENT_DATE" ? "CURRENT_DATE" : "$2::date";
  const valuesPontos =
    dataRef === "CURRENT_DATE" ? [empregadoId] : [empregadoId, dataRef];

  const [pontosResult, empregadoResult, justificativasResult] = await Promise.all([
    client.query({
      text: `SELECT tipo, criado_em FROM pontos WHERE empregado_id = $1 AND data_referencia = ${dataExpr}`,
      values: valuesPontos,
    }),
    client.query({
      text: `SELECT horario_entrada, horario_saida FROM empregados WHERE id = $1`,
      values: [empregadoId],
    }),
    client.query({
      text: `SELECT tipo_ponto, status FROM justificativas_ponto WHERE empregado_id = $1 AND data = ${dataExpr}`,
      values: valuesPontos,
    }),
  ]);

  const pontosDoDia = pontosResult.rows;
  const { horario_entrada, horario_saida } = empregadoResult.rows[0];
  const justificativas = justificativasResult.rows;

  const horarioDe = (tipo: string) =>
    pontosDoDia.find((p: { tipo: string }) => p.tipo === tipo)?.criado_em as Date | undefined;

  const justificativaDe = (tipo: string) =>
    justificativas.find((j: { tipo_ponto: string }) => j.tipo_ponto === tipo) as
    | { status: string }
    | undefined;

  // confirma se todos os 4 tipos estão resolvidos (batidos ou já justificados)
  for (const tipo of ORDEM_TIPOS) {
    if (horarioDe(tipo)) continue;
    const j = justificativaDe(tipo);
    if (!j || j.status === "pendente") {
      return; // ainda falta resolver esse tipo, dia continua em aberto
    }
  }

  const entrada = horarioDe("entrada");
  const saidaAlmoco = horarioDe("saida_almoco");
  const retornoAlmoco = horarioDe("retorno_almoco");
  const saida = horarioDe("saida");

  const detalhes: Record<string, number> = {};
  let saldoTotalMinutos = 0;

  // desvio da entrada em relação ao horário esperado
  if (entrada) {
    const esperada = combinarDataComHorario(entrada, horario_entrada);
    detalhes.desvio_entrada_minutos = diferencaEmMinutos(entrada, esperada);
  } else {
    detalhes.desvio_entrada_minutos =
      justificativaDe("entrada")!.status === "aprovada" ? 0 : PENALIDADE_RECUSA_MINUTOS;
  }
  saldoTotalMinutos += detalhes.desvio_entrada_minutos;

  // desvio do almoço (duração real vs 60min esperados)
  if (saidaAlmoco && retornoAlmoco) {
    const duracao = diferencaEmMinutos(saidaAlmoco, retornoAlmoco);
    detalhes.desvio_almoco_minutos = TOLERANCIA_ALMOCO_MINUTOS - duracao;
  } else {
    const j = justificativaDe("saida_almoco") ?? justificativaDe("retorno_almoco");
    detalhes.desvio_almoco_minutos =
      j?.status === "aprovada" ? 0 : PENALIDADE_RECUSA_MINUTOS;
  }
  saldoTotalMinutos += detalhes.desvio_almoco_minutos;

  // desvio da saída em relação ao horário esperado
  if (saida) {
    const esperada = combinarDataComHorario(saida, horario_saida);
    detalhes.desvio_saida_minutos = diferencaEmMinutos(esperada, saida);
  } else {
    detalhes.desvio_saida_minutos =
      justificativaDe("saida")!.status === "aprovada" ? 0 : PENALIDADE_RECUSA_MINUTOS;
  }
  saldoTotalMinutos += detalhes.desvio_saida_minutos;

  // grava ou atualiza o registro do banco de horas daquele dia
  await client.query({
    text: `
      INSERT INTO banco_horas (empregado_id, data, saldo_minutos, detalhes)
      VALUES ($1, ${dataExpr}, $${dataRef === "CURRENT_DATE" ? 2 : 3}, $${dataRef === "CURRENT_DATE" ? 3 : 4})
      ON CONFLICT (empregado_id, data)
      DO UPDATE SET saldo_minutos = EXCLUDED.saldo_minutos, detalhes = EXCLUDED.detalhes
    `,
    values:
      dataRef === "CURRENT_DATE"
        ? [empregadoId, saldoTotalMinutos, JSON.stringify(detalhes)]
        : [empregadoId, dataRef, saldoTotalMinutos, JSON.stringify(detalhes)],
  });
}

function diferencaEmMinutos(a: Date, b: Date) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

function combinarDataComHorario(referencia: Date, horario: string) {
  const [h, m, s] = horario.split(":").map(Number);
  const data = new Date(referencia);
  data.setHours(h, m, s ?? 0, 0);
  return data;
}

export async function GET(req: NextRequest) {
  const empregado = await autenticatorRequisicao(req);

  if (!empregado) {
    return NextResponse.json({ erro: "Não Autorizado" }, { status: 401 });
  }

  try {
    const res = await database.query({
      text: `SELECT * FROM pontos WHERE empregado_id = $1 ORDER BY criado_em DESC`,
      values: [empregado.id],
    });

    return NextResponse.json(res.rows, { status: 200 });
  } catch {
    return NextResponse.json({ err: "Erro ao buscar pontos" }, { status: 500 });
  }
}