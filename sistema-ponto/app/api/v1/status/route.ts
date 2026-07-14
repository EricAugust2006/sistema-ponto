import { NextRequest, NextResponse } from "next/server";
import database from "@/_infra/database";

// aqui, nesse codigo `index.ts` eu vou pedir o status da pagina
// onde aqui vai ter:
// - status code da aplicação (ex: 200, 500, etc.)
// - data e hora da última atualização (updatedAt)
// - informações gerais do serviço (health check)
// - status da conexão com o banco de dados
// - informações sobre migrations (aplicadas / pendentes)
// - estado do pool de conexões (ativo, limites, uso atual)
// - limites configurados da aplicação (ex: conexões, requisições)
// - outras métricas básicas para monitoramento e diagnóstico

export async function GET(req: NextRequest) {
  try {
    // Data e hora da atualização da API.
    const updatedAt = new Date().toISOString();

    // Testa se o banco está respondendo.
    const res = await database.query("SELECT 1 + 1 AS sum;");

    // Obtém a versão do PostgreSQL.
    const databaseVersionResult = await database.query("SHOW server_version;");
    const databaseVersionValue =
      databaseVersionResult.rows[0].server_version.split(" ")[0];

    // Obtém o limite máximo de conexões permitidas.
    const databaseMaxConnectionsResults = await database.query(
      "SHOW max_connections",
    );
    const databaseMaxConnectionsValue =
      databaseMaxConnectionsResults.rows[0].max_connections;

    // Nome do banco definido nas variáveis de ambiente.
    const databaseName = process.env.POSTGRES_DB;

    // Conta quantas conexões estão abertas para este banco.
    const databaseOpenedConnectionsResult = await database.query({
      text: "SELECT count(*)::int FROM pg_stat_activity WHERE datname = $1",
      values: [databaseName],
    });

    const databaseOpenedConnectionsValue =
      databaseOpenedConnectionsResult.rows[0].count;

    // Retorna o status da aplicação e informações do banco.
    return NextResponse.json(
      {
        status: "health",
        updated_at: updatedAt,
        database: {
          sum: res.rows[0].sum,
          version: databaseVersionValue,
          max_connections: databaseMaxConnectionsValue,
          opened_connections: databaseOpenedConnectionsValue,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "unhealthy",
      },
      { status: 503 },
    );
  }
}
