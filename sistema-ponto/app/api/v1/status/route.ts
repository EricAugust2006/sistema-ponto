import { NextRequest, NextResponse } from "next/server";

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
  const updatedAt = new Date().toISOString();

  return NextResponse.json(
    {
      status: "ok",
      updated_at: updatedAt,
    },
    { status: 200 },
  );
}
