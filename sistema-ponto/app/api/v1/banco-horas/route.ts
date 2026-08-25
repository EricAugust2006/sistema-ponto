import { NextRequest, NextResponse } from "next/server";
import { autenticatorRequisicao } from "@/_infra/auth";
import database from "@/_infra/database.js";

export async function GET(req: NextRequest) {
  const empregado = await autenticatorRequisicao(req);

  if (!empregado) {
    return NextResponse.json({ erro: "Não Autorizado" }, { status: 401 });
  }

  const res = await database.query({
    text: `
      SELECT data, saldo_minutos, detalhes
      FROM banco_horas
      WHERE empregado_id = $1
      ORDER BY data DESC
    `,
    values: [empregado.id],
  });

  const saldoTotal = res.rows.reduce(
    (soma: number, r: { saldo_minutos: number }) => soma + r.saldo_minutos,
    0,
  );

  return NextResponse.json(
    { saldoTotalMinutos: saldoTotal, registros: res.rows },
    { status: 200 },
  );
}
