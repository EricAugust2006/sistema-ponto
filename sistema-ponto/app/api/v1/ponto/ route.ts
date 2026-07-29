import { NextRequest, NextResponse } from "next/server";
import { autenticatorRequisicao } from "@/_infra/auth";

export function POST(req: NextRequest) {
  const empregado = autenticatorRequisicao(req);

  if (!empregado) {
    return NextResponse.json({ erro: "Não Autorizado" }, { status: 401 });
  }

  //passos pra outro dia
  // se autenticado, ler e validar o corpo
  // usar o await req.json() pra pegar o tipo do ponto
  // validar os dados com zod? os 4 valores do ponto ex: saida, entrada e tal

  // insetir o registro do ponto aqui
  // com INSERT INTO pontos e tal tal

  // dps retornar o sucesso
}
