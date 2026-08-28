import database from "@/_infra/database";
import { NextRequest } from "next/server";

//rota para autejnticação
export async function autenticatorRequisicao(req: NextRequest) {
  const tokenCookie = req.cookies.get("session_token");

  if (!tokenCookie) {
    return null;
  }

  const token = tokenCookie.value;

  try {

    // aqui ele atualiza a sessao para 30 minutos
    // e retorna os dados do empregado que tem aquela sessao

    //   const res = await database.query({
    //     text: `
    //   UPDATE sessoes
    //   SET expira_em = NOW() + INTERVAL '30 minutes'
    //   FROM empregados
    //   WHERE sessoes.token = $1
    //     AND sessoes.expira_em > NOW()
    //     AND empregados.id = sessoes.empregado_id
    //   RETURNING
    //     empregados.id,
    //     empregados.nome,
    //     empregados.email,
    //     empregados.matricula,
    //     empregados.papel
    // `,
    //     values: [token],
    //   });


    // aqui ele só verifica se a sessão é valida
    const res = await database.query({
      text: `
      SELECT empregados.id, empregados.nome, empregados.email, empregados.matricula, empregados.papel
      FROM sessoes
      JOIN empregados ON empregados.id = sessoes.empregado_id
      WHERE sessoes.token = $1 AND sessoes.expira_em > NOW()
      `,
      values: [token]
    })

    if (res.rowCount === 0) {
      return null;
    }

    return res.rows[0];
  } catch (err) {
    console.error("Erro ao autenticar requisição", err);
    return null;
  }
}
