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

// Empregado envia uma justificativa para um ponto — seja ele ausente
// (esqueceu de bater) ou já registrado (bateu errado / precisa de correção).
export async function POST(req: NextRequest) {
  const empregado = await autenticatorRequisicao(req);
  if (!empregado) {
    return NextResponse.json({ erro: "Não Autorizado" }, { status: 401 });
  }

  try {
    const rawBody = await req.json();
    const body = criarJustificativaSchema.parse(rawBody);

    // não faz sentido justificar um dia que ainda nem chegou
    const hoje = new Date().toISOString().split("T")[0];
    if (body.data > hoje) {
      return NextResponse.json(
        { erro: "Não é possível criar justificativa para datas futuras." },
        { status: 400 },
      );
    }

    // Observação: antes bloqueávamos justificativa se o ponto já existia.
    // Agora permitimos, pois o empregado também pode usar isso para
    // sinalizar que bateu um ponto errado e precisa de correção/análise.

    // grava a justificativa; se já existir uma para esse empregado/dia/tipo,
    // atualiza o motivo e volta o status para "pendente" (novo pedido de análise)
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
        { status: 400 },
      );
    }
    console.error("Erro ao criar justificativa:", err);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

// Lista justificativas: funcionário vê só as próprias,
// gestor/admin vê de todo mundo (com nome e matrícula do empregado)
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

// Gestor/admin aprova ou recusa uma justificativa pendente.
// Depois de decidir, tentamos fechar/recalcular o dia correspondente,
// já que a decisão pode liberar (ou não) o cálculo do banco de horas.
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

    // nomes de coluna corretos conforme a migration:
    // observacao_analise (não "observacao") e analisado_em (não "atualizado_em")
    const resJust = await client.query({
      text: `
        UPDATE justificativas_ponto
        SET status = $1, observacao_analise = $2, analisado_por = $3, analisado_em = NOW()
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

    // "data" vem do banco como Date; convertemos para "YYYY-MM-DD"
    // pra reaproveitar a mesma função usada no fechamento do dia atual
    const dataFormatada = new Date(justificativa.data).toISOString().split("T")[0];
    await tentarFecharDia(justificativa.empregado_id, dataFormatada, client);

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