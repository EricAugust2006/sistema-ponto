import { NextRequest, NextResponse } from "next/server";
import { autenticatorRequisicao } from "@/_infra/auth";
import database from "@/_infra/database.js";
import z from "zod";

// DOCUMENTAÇÃPO POR I.A PRRA FICAR MAIS FACIL

const criarPontoSchema = z.object({
  type: z.enum(["entrada", "saida_almoco", "retorno_almoco", "saida"], {
    message: "Tipo de ponto inválido",
  }),
});

const TOLERANCIA_ALMOCO_MINUTOS = 60; // almoço tem que durar exatamente 60min

export async function POST(req: NextRequest) {
  const empregado = await autenticatorRequisicao(req);

  if (!empregado) {
    return NextResponse.json({ erro: "Não Autorizado" }, { status: 401 });
  }

  try {
    const rawBody = await req.json();
    const body = criarPontoSchema.parse(rawBody);

    // 1 - impede bater o mesmo tipo duas vezes no mesmo dia
    const jaExisteResult = await database.query({
      text: `
        SELECT id FROM pontos
        WHERE empregado_id = $1
          AND tipo = $2
          AND criado_em::date = CURRENT_DATE
      `,
      values: [empregado.id, body.type],
    });

    if (jaExisteResult.rowCount! > 0) {
      return NextResponse.json(
        { erro: `Você já registrou "${body.type}" hoje.` },
        { status: 400 },
      );
    }

    // 2 - insere o ponto
    const res = await database.query({
      text: `
        INSERT INTO pontos (empregado_id, tipo)
        VALUES ($1, $2)
        RETURNING *
      `,
      values: [empregado.id, body.type],
    });

    const pontoCriado = res.rows[0];

    // 3 - se foi a "saída", o dia fechou: calcula o banco de horas
    if (body.type === "saida") {
      await calcularEBaterBancoDeHoras(empregado.id);
    }

    return NextResponse.json(pontoCriado, { status: 201 });
  } catch (err) {
    console.error("Erro ao registrar ponto:", err);

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
  }
}

async function calcularEBaterBancoDeHoras(empregadoId: number) {
  // busca os 4 pontos do dia + o horário esperado do empregado
  const [pontosResult, empregadoResult] = await Promise.all([
    database.query({
      text: `
        SELECT tipo, criado_em FROM pontos
        WHERE empregado_id = $1 AND criado_em::date = CURRENT_DATE
      `,
      values: [empregadoId],
    }),
    database.query({
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

  // sem os 4 pontos, não dá pra calcular corretamente
  if (!entrada || !saidaAlmoco || !retornoAlmoco || !saida) {
    return;
  }

  const detalhes: Record<string, number> = {};
  let saldoTotalMinutos = 0;

  // duração real do almoço vs o esperado (60min)
  const duracaoAlmocoMinutos = diferencaEmMinutos(saidaAlmoco, retornoAlmoco);
  const desvioAlmoco = TOLERANCIA_ALMOCO_MINUTOS - duracaoAlmocoMinutos;
  // se almoçou mais que 60min, desvioAlmoco é negativo (deve horas)
  // se almoçou menos que 60min, desvioAlmoco é positivo (empresa deve)
  detalhes.desvio_almoco_minutos = desvioAlmoco;
  saldoTotalMinutos += desvioAlmoco;

  // horário de entrada vs esperado
  const entradaEsperada = combinarDataComHorario(entrada, horario_entrada);
  const desvioEntrada = diferencaEmMinutos(entrada, entradaEsperada);
  // entrou depois do esperado = negativo (deve horas); entrou antes = positivo
  detalhes.desvio_entrada_minutos = desvioEntrada;
  saldoTotalMinutos += desvioEntrada;

  // horário de saída vs esperado
  const saidaEsperada = combinarDataComHorario(saida, horario_saida);
  const desvioSaida = diferencaEmMinutos(saidaEsperada, saida);
  // saiu depois do esperado = positivo (empresa deve); saiu antes = negativo
  detalhes.desvio_saida_minutos = desvioSaida;
  saldoTotalMinutos += desvioSaida;

  await database.query({
    text: `
      INSERT INTO banco_horas (empregado_id, data, saldo_minutos, detalhes)
      VALUES ($1, CURRENT_DATE, $2, $3)
      ON CONFLICT (empregado_id, data)
      DO UPDATE SET saldo_minutos = $2, detalhes = $3
    `,
    values: [empregadoId, saldoTotalMinutos, JSON.stringify(detalhes)],
  });
}

// diferença em minutos entre duas datas (b - a)
function diferencaEmMinutos(a: Date, b: Date) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

// pega a data de "referencia" e substitui só o horário (HH:MM:SS) pelo esperado
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
      SELECT * FROM pontos WHERE empregado_id = $1 ORDER BY criado_em DESC`,
      values: [empregado.id],
    });

    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    return NextResponse.json({ err: "Erro ao buscar pontos" }, { status: 500 });
  }
}
