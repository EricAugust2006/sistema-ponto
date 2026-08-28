import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import { autenticatorRequisicao } from "@/_infra/auth";
import database from "@/_infra/database.js";

const tiposDePonto = [
  "entrada",
  "saida_almoco",
  "retorno_almoco",
  "saida",
] as const;

const criarJustificativaSchema = z.object({
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .refine(
      (data) => !Number.isNaN(Date.parse(`${data}T00:00:00Z`)),
      "Data inválida",
    ),
  tipoPonto: z.enum(tiposDePonto),
  motivo: z.string().trim().min(10, "Explique o motivo da ausência").max(500),
});

const analisarJustificativaSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["aprovada", "recusada"]),
  observacao: z.string().trim().max(500).optional(),
});

function podeAnalisar(papel: string) {
  return papel === "admin" || papel === "gestor";
}

export async function GET(req: NextRequest) {
  const empregado = await autenticatorRequisicao(req);

  if (!empregado) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const gestor = podeAnalisar(empregado.papel);
  const res = await database.query({
    text: `
      SELECT
        justificativas_ponto.*,
        empregados.nome AS empregado_nome,
        analista.nome AS analisado_por_nome
      FROM justificativas_ponto
      JOIN empregados ON empregados.id = justificativas_ponto.empregado_id
      LEFT JOIN empregados AS analista
        ON analista.id = justificativas_ponto.analisado_por
      WHERE ($1::boolean = true OR justificativas_ponto.empregado_id = $2)
      ORDER BY
        CASE justificativas_ponto.status WHEN 'pendente' THEN 0 ELSE 1 END,
        justificativas_ponto.criado_em DESC
    `,
    values: [gestor, empregado.id],
  });

  return NextResponse.json(res.rows, { status: 200 });
}

export async function POST(req: NextRequest) {
  const empregado = await autenticatorRequisicao(req);

  if (!empregado) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = criarJustificativaSchema.parse(await req.json());

    const dataFutura = await database.query({
      text: "SELECT $1::date > CURRENT_DATE AS eh_futura",
      values: [body.data],
    });

    if (dataFutura.rows[0].eh_futura) {
      return NextResponse.json(
        { erro: "Não é possível justificar um ponto futuro." },
        { status: 400 },
      );
    }

    const pontoExistente = await database.query({
      text: `
        SELECT id FROM pontos
        WHERE empregado_id = $1
          AND tipo = $2
          AND data_referencia = $3::date
      `,
      values: [empregado.id, body.tipoPonto, body.data],
    });

    if ((pontoExistente.rowCount ?? 0) > 0) {
      return NextResponse.json(
        { erro: "Esse ponto já foi registrado e não precisa de justificativa." },
        { status: 400 },
      );
    }

    const res = await database.query({
      text: `
        INSERT INTO justificativas_ponto (empregado_id, data, tipo_ponto, motivo)
        VALUES ($1, $2::date, $3, $4)
        RETURNING *
      `,
      values: [empregado.id, body.data, body.tipoPonto, body.motivo],
    });

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: err.flatten().fieldErrors },
        { status: 400 },
      );
    }

    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return NextResponse.json(
        { erro: "Já existe uma justificativa para este ponto." },
        { status: 409 },
      );
    }

    console.error("Erro ao criar justificativa:", err);
    return NextResponse.json(
      { erro: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const empregado = await autenticatorRequisicao(req);

  if (!empregado) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  if (!podeAnalisar(empregado.papel)) {
    return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
  }

  try {
    const body = analisarJustificativaSchema.parse(await req.json());
    const res = await database.query({
      text: `
        UPDATE justificativas_ponto
        SET
          status = $1,
          analisado_por = $2,
          observacao_analise = $3,
          analisado_em = NOW()
        WHERE id = $4 AND status = 'pendente'
        RETURNING *
      `,
      values: [body.status, empregado.id, body.observacao ?? null, body.id],
    });

    if ((res.rowCount ?? 0) === 0) {
      return NextResponse.json(
        { erro: "Justificativa não encontrada ou já analisada." },
        { status: 404 },
      );
    }

    return NextResponse.json(res.rows[0], { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: err.flatten().fieldErrors },
        { status: 400 },
      );
    }

    console.error("Erro ao analisar justificativa:", err);
    return NextResponse.json(
      { erro: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
