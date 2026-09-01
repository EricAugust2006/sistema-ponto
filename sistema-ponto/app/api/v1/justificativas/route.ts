import { NextRequest, NextResponse } from "next/server";
import { autenticatorRequisicao } from "@/_infra/auth";
import database from "@/_infra/database.js";
import { tentarFecharDia } from "@/app/api/v1/ponto/route";
import z from "zod";
import type { PoolClient } from "pg";

const criarJustificativaSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data em formato inválido (YYYY-MM-DD)"),
  tipoPonto: z.enum(["entrada", "saida_almoco", "retorno_almoco", "saida"], {
    message: "Tipo de ponto inválido",
  }),
  motivo: z.string().min(10, "O motivo deve ter pelo menos 10 caracteres"),
});

const atualizarJustificativaSchema = z.object({
  id: z.number(),
  status: z.enum(["aprovada", "recusada"]),
  observacao: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const empregado = await autenticatorRequisicao(req);
  if (!empregado) {
    return NextResponse.json({ erro: "Não Autorizado" }, { status: 401 });
  }

  try {
    const rawBody = await req.json();
    const body = criarJustificativaSchema.parse(rawBody);

    const hoje = new Date().toISOString().split("T")[0];
    if (body.data > hoje) {
      return NextResponse.json(
        { erro: "Não é possível criar justificativa para datas futuras." },
        { status: 400 }
      );
    }

    const pontoExistente = await database.query({
      text: `SELECT id FROM pontos WHERE empregado_id = $1 AND data_referencia = $2 AND tipo = $3`,
      values: [empregado.id, body.data, body.tipoPonto],
    });

    if (pontoExistente.rows.length > 0) {
      return NextResponse.json(
        { erro: "Este ponto já foi registrado e não necessita de justificativa." },
        { status: 400 }
      );
    }

    const res = await database.query({
      text: `
        INSERT INTO justificativas_ponto (empregado_id, data, tipo_ponto, motivo)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (empregado_id, data, tipo_ponto) 
        DO UPDATE SET motivo = EXCLUDED.motivo, status = 'pendente'
        RETURNING *
      `,
      values: [empregado.id, body.data, body.tipoPonto, body.motivo],
    });

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("Erro ao criar justificativa:", err);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const empregado = await autenticatorRequisicao(req);
  if (!empregado) {
    return NextResponse.json({ erro: "Não Autorizado" }, { status: 401 });
  }

  try {
    const eGestorOuAdmin = empregado.papel === "gestor" || empregado.papel === "admin";
    const query = eGestorOuAdmin
      ? `SELECT j.*, e.nome as empregado_nome, e.matricula FROM justificativas_ponto j JOIN empregados e ON j.empregado_id = e.id ORDER BY j.criado_em DESC`
      : `SELECT * FROM justificativas_ponto WHERE empregado_id = $1 ORDER BY criado_em DESC`;
    const values = eGestorOuAdmin ? [] : [empregado.id];

    const res = await database.query({ text: query, values });
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    console.error("Erro ao listar justificativas:", err);
    return NextResponse.json({ erro: "Erro ao buscar justificativas" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const empregado = await autenticatorRequisicao(req);
  if (!empregado || (empregado.papel !== "gestor" && empregado.papel !== "admin")) {
    return NextResponse.json({ erro: "Acesso negado. Apenas gestores ou administradores." }, { status: 403 });
  }

  let client: PoolClient | undefined;
  try {
    const rawBody = await req.json();
    const body = atualizarJustificativaSchema.parse(rawBody);

    client = await database.getClient();
    await client.query("BEGIN");

    const resJust = await client.query({
      text: `
        UPDATE justificativas_ponto 
        SET status = $1, observacao = $2, analisado_por = $3, atualizado_em = NOW()
        WHERE id = $4
        RETURNING *
      `,
      values: [body.status, body.observacao ?? null, empregado.id, body.id],
    });

    if (resJust.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ erro: "Justificativa não encontrada" }, { status: 404 });
    }

    const justificativa = resJust.rows[0];

    // Recalcula o banco de horas do colaborador para o dia ajustado
    await tentarFecharDia(justificativa.empregado_id, justificativa.data, client);

    await client.query("COMMIT");
    return NextResponse.json(justificativa, { status: 200 });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    if (err instanceof z.ZodError) {
      return NextResponse.json({ erro: "Dados inválidos", detalhes: err.flatten().fieldErrors }, { status: 400 });
    }
    console.error("Erro ao atualizar justificativa:", err);
    return NextResponse.json({ erro: "Erro interno ao atualizar justificativa" }, { status: 500 });
  } finally {
    client?.release();
  }
}
