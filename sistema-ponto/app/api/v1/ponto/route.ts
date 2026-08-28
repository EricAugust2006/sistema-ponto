import { NextRequest, NextResponse } from "next/server";
import { autenticatorRequisicao } from "@/_infra/auth";
import database from "@/_infra/database.js";
import z from "zod";
import type { PoolClient } from "pg";

const criarPontoSchema = z.object({
  type: z.enum(["entrada", "saida_almoco", "retorno_almoco", "saida"], {
    message: "Tipo de ponto inválido",
  }),
});

const TOLERANCIA_ALMOCO_MINUTOS = 60;

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

    const jaExisteResult = await client.query({
      text: `
        SELECT id FROM pontos
        WHERE empregado_id = $1
          AND tipo = $2
          AND data_referencia = CURRENT_DATE
      `,
      values: [empregado.id, body.type],
    });

    if ((jaExisteResult.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      transacaoIniciada = false;

      return NextResponse.json(
        { erro: "Você já registrou este tipo de ponto hoje." },
        { status: 400 },
      );
    }

    const res = await client.query({
      text: `
        INSERT INTO pontos (empregado_id, tipo)
        VALUES ($1, $2)
        RETURNING *
      `,
      values: [empregado.id, body.type],
    });

    const pontoCriado = res.rows[0];

    if (body.type === "saida") {
      await calcularEBaterBancoDeHoras(empregado.id, client);
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

    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "23505"
    ) {
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

    return NextResponse.json(
      { erro: "Erro interno do servidor" },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}

async function calcularEBaterBancoDeHoras(
  empregadoId: number,
  client: PoolClient,
) {
  const [pontosResult, empregadoResult] = await Promise.all([
    client.query({
      text: `
        SELECT tipo, criado_em FROM pontos
        WHERE empregado_id = $1 AND data_referencia = CURRENT_DATE
      `,
      values: [empregadoId],
    }),
    client.query({
      text: `SELECT horario_entrada, horario_saida FROM empregados WHERE id = $1`,
      values: [empregadoId],
    }),
  ]);

  const pontosDoDia = pontosResult.rows;
  const { horario_entrada, horario_saida } = empregadoResult.rows[0];

  const horarioDe = (tipo: string) =>
    pontosDoDia.find((p: { tipo: string }) => p.tipo === tipo)?.criado_em as
      | Date
      | undefined;

  const entrada = horarioDe("entrada");
  const saidaAlmoco = horarioDe("saida_almoco");
  const retornoAlmoco = horarioDe("retorno_almoco");
  const saida = horarioDe("saida");

  if (!entrada || !saidaAlmoco || !retornoAlmoco || !saida) {
    return;
  }

  const detalhes: Record<string, number> = {};
  let saldoTotalMinutos = 0;

  const duracaoAlmocoMinutos = diferencaEmMinutos(saidaAlmoco, retornoAlmoco);
  const desvioAlmoco = TOLERANCIA_ALMOCO_MINUTOS - duracaoAlmocoMinutos;
  detalhes.desvio_almoco_minutos = desvioAlmoco;
  saldoTotalMinutos += desvioAlmoco;

  const entradaEsperada = combinarDataComHorario(entrada, horario_entrada);
  const desvioEntrada = diferencaEmMinutos(entrada, entradaEsperada);
  detalhes.desvio_entrada_minutos = desvioEntrada;
  saldoTotalMinutos += desvioEntrada;

  const saidaEsperada = combinarDataComHorario(saida, horario_saida);
  const desvioSaida = diferencaEmMinutos(saidaEsperada, saida);
  detalhes.desvio_saida_minutos = desvioSaida;
  saldoTotalMinutos += desvioSaida;

  await client.query({
    text: `
      INSERT INTO banco_horas (empregado_id, data, saldo_minutos, detalhes)
      VALUES ($1, CURRENT_DATE, $2, $3)
      ON CONFLICT (empregado_id, data)
      DO UPDATE SET saldo_minutos = $2, detalhes = $3
    `,
    values: [empregadoId, saldoTotalMinutos, JSON.stringify(detalhes)],
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
      text: `
        SELECT * FROM pontos
        WHERE empregado_id = $1
        ORDER BY criado_em DESC
      `,
      values: [empregado.id],
    });

    return NextResponse.json(res.rows, { status: 200 });
  } catch {
    return NextResponse.json({ err: "Erro ao buscar pontos" }, { status: 500 });
  }
}
