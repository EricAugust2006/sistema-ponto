import database from "@/_infra/database";
import { NextRequest, NextResponse } from "next/server";

export async function autenticatorRequisicao(req: NextRequest) {
  const tokenCookie = req.cookies.get("session_token");

  if (!tokenCookie) {
    return null;
  }

  const token = tokenCookie.value;
  try {
    const res = await database.query({
      text: `
        SELECT empregados.id, empregados.nome, empregados.email, empregados.matricula
        FROM sessoes
        JOIN empregados ON empregados.id = sessoes.empregado_id
        WHERE sessoes.token = $1 AND sessoes.expira_em > NOW()
      `,
      values: [token],
    });

    if (res.rowCount === 0) {
      return null;
    }

    return res.rows[0];
  } catch (err) {
    console.error("Erro ao autenticar requisição", err);
    return null;
  }
}
