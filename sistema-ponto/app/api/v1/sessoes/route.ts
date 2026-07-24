import database from "@/_infra/database";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import z from "zod";

//codigo mei ocnfuso ent vou coemntar
const criarLoginSchema = z.object({
  matricula: z
    .string()
    .trim()
    .min(1, "Matrícula é obrigatória")
    .max(6, "Matrícula deve ter no máximo 6 caracteres"),
  senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

type CriarLoginSchema = z.infer<typeof criarLoginSchema>;

export async function POST(req: NextRequest) {
  // 1 - aqui ta lendo o corpo da requisição, que vem em json, e a gente vai tentar parsear ele pra json
  // esse let rawBody: unknown; é uma variavel que vai receber o corpo da requisição, que vem em json.
  let rawBody: unknown;

  try {
    rawBody = await req.json();
  } catch (err) {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido" },
      { status: 400 },
    );
  }

  // 2 - validacao com zod
  const parsed = criarLoginSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        erro: "Dados inválidos.",
        detalhes: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  // 3 - extrair os dados
  const { matricula, senha }: CriarLoginSchema = parsed.data;

  // 4 - buscar e validar tudo dentro de um try/catch, pra tratar erro de banco/query
  try {
    // 4.1 - busca o empregado pela matrícula
    const empregadosResult = await database.query({
      text: `
      SELECT id, nome, email, matricula, senha FROM empregados WHERE matricula = $1
      `,
      values: [matricula],
    });

    const empregado = empregadosResult.rows[0];

    // se não achou empregado, erro genérico (não revela se foi matrícula ou senha)
    if (!empregado) {
      return NextResponse.json(
        { erro: "Matrícula ou senha inválidos" },
        { status: 401 },
      );
    }

    // 5 - comparar a senha com o hash da senha do banco de dados
    const senhaValida = await bcrypt.compare(senha, empregado.senha);
    if (!senhaValida) {
      return NextResponse.json(
        { erro: "Matrícula ou senha inválidos" },
        { status: 401 },
      );
    }

    // 6 - gerar token
    const token = crypto.randomBytes(32).toString("hex");

    // 7 - quanto tempo o token vai expirar
    // a partir de 8h
    const expiraEm = new Date(Date.now() + 8 * 60 * 60 * 1000);

    // 8 - salvar o token no banco de dados
    await database.query({
      text: `
      INSERT INTO sessoes (token, empregado_id, expira_em)
      VALUES ($1, $2, $3)`,
      values: [token, empregado.id, expiraEm],
    });

    // 9 - montar a resposta e setar o cookie
    const response = NextResponse.json(
      {
        id: empregado.id,
        nome: empregado.nome,
        email: empregado.email,
        matricula: empregado.matricula,
      },
      { status: 201 }, // 201 porque estamos criando um recurso novo (a sessão)
    );

    response.cookies.set("session_token", token, {
      httpOnly: true,
      expires: expiraEm,
      path: "/",
    });

    return response;
  } catch (err) {
    // captura qualquer erro inesperado de banco/query e responde com 500,
    // em vez de deixar a exceção vazar sem tratamento
    console.error("Erro ao processar login:", err);
    return NextResponse.json(
      { erro: "Erro interno ao processar login" },
      { status: 500 },
    );
  }
}
