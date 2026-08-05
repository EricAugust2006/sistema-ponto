import { NextRequest, NextResponse } from "next/server";
import { autenticatorRequisicao } from "@/_infra/auth";
import database from "@/_infra/database.js";
import z from "zod";

export async function POST(req: NextRequest) {
  const empregado = await autenticatorRequisicao(req);

  if (!empregado) {
    return NextResponse.json({ erro: "Não Autorizado" }, { status: 401 });
  }

  try {
    //pegar o tipo do ponto
    const rawBody = await req.json();

    const criarPontoSchema = z.object({
      type: z.enum(["entrada", "saida_almoco", "retorno_almoco", "saida"], {
        message: "Tipo de ponto inválido",
      }),
    });

    type CriarPonto = z.infer<typeof criarPontoSchema>;

    const body = criarPontoSchema.parse(rawBody);

    const res = await database.query({
      text: `
      INSERT INTO pontos (empregado_id, tipo)
      VALUES ($1, $2)
      RETURNING *`,
      values: [empregado.id, body.type],
    });

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ err: "Dados inválidos" }, { status: 400 });
  }
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
