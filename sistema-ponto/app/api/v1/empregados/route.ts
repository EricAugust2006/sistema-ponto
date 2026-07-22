import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import database from "@/_infra/database.js";
import z from "zod";

const criarEmpregadosSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().trim().email("E-mail inválido"),
  matricula: z
    .string()
    .trim()
    .max(6, "Matrícula deve ter ao máximo 6 caractéres"),
  senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

type CriarEmpregadoBody = z.infer<typeof criarEmpregadosSchema>;

export async function POST(req: NextRequest) {
  //esse ra
  let rawBody: unknown;

  try {
    //esse rawBody é o corpo da requisição, que vem em json, e a gente vai tentar parsear ele pra json
    rawBody = await req.json();
  } catch (err) {
    return NextResponse.json(
      { err: "Corpo da Requisição inválido" },
      { status: 400 },
    );
  }

  //validacao com zod
  const parsed = criarEmpregadosSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        erro: "Dados inválidos.",
        // esse .flatten vai transformar o erro em um objeto com os campos e seus erros
        detalhes: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  // desestruturando os dados validados , transformando eles em variaveis
  const { nome, email, matricula, senha }: CriarEmpregadoBody = parsed.data;

  // hash da senha com bcrypt
  const senhaHash = await bcrypt.hash(senha as string, 10);

  //vamo botar os bagui no banco de dados é o tal do Insert no banco
  try {
    const res = await database.query({
      text: `
      INSERT INTO empregados (nome, email, matricula, senha)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nome, email, matricula, criado_em
      `,
      values: [nome!.trim(), email!.toLowerCase().trim(), matricula, senhaHash],
    });

    const empregadoCriado = res.rows[0];
    return NextResponse.json(empregadoCriado, { status: 201 });
  } catch (err: any) {
    //codigo de violão de unicidade do pg]
    if (err?.code === "23505") {
      // identifica qual campo duplicou, via o error.constrraint ou error.detail
      const campo = identificarCampoDuplicado(err);
      return NextResponse.json(
        { err: `Já existe um empregado cadastrado com este ${campo}` },
        { status: 409 }, // esse 409 é de conflict
      );
    }
    console.error("Erro ao criar empregado:", err);
    return NextResponse.json(
      { erro: "ERRO interno ao criar empregado" },
      { status: 500 },
    );
  }
}

function identificarCampoDuplicado(error: any): string {
  // error.detail costuma vir como: 'Key (email)=(x@x.com) already exists.'
  const detail: string = error?.detail ?? "";
  if (detail.includes("email")) return "e-mail";
  if (detail.includes("matricula")) return "matrícula";
  return "dado informado";
}
