import orchestrator from "@/_tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.cleanDatabase();
  await orchestrator.runMigrations();
});

// criar um usuario fake

// esse "overrides" é um objeto que pode sobrescrever os valores padrão do empregado
// por exemplo, se você quiser criar um empregado com um nome diferente, você pode passar { nome: "Novo Nome" } como argumento
async function criarEmpregado(overrides = {}) {
  const empregadoData = {
    nome: "John Doe",
    email: "jonhDoe.login@exemplo.com",
    matricula: "222222",
    senha: "senha123",
    ...overrides,
  };

  //aqui vou fazer um fetch da rota de criação de empregado, para criar o empregado no banco de dados
  // ai depois vou retornar o empregado criado, para que possamos usar ele nos testes
  //
  await fetch("http://localhost:3000/api/v1/empregados", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(empregadoData),
  });

  return empregadoData;
}

test("POST to /api/v1/sessoes with correct credentials should return 201 and set cookie", async () => {
  const empregado = await criarEmpregado();

  const res = await fetch("http://localhost:3000/api/v1/sessoes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      matricula: empregado.matricula,
      senha: "senha123",
    }),
  });

  expect(res.status).toBe(201);

  const resBody = await res.json();
  expect(resBody).toHaveProperty("id");
  expect(resBody).toHaveProperty("nome", empregado.nome);
  expect(resBody).toHaveProperty("email", empregado.email.toLowerCase());
  expect(resBody).toHaveProperty("matricula", empregado.matricula);
  expect(resBody).not.toHaveProperty("senha");

  const setCookiesHeader = res.headers.get("set-cookie");
  expect(setCookiesHeader).toContain("session_token=");
  expect(setCookiesHeader).toContain("HttpOnly");
});

test("POST to /api/v1/sessoes with incorrect credentials should return 401", async () => {
  const empregado = await criarEmpregado({
    email: "outro.email@example.com",
    matricula: "333333",
  });

  const res = await fetch("http://localhost:3000/api/v1/sessoes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      matricula: empregado.matricula,
      senha: "senhaerrada",
    }),
  });

  expect(res.status).toBe(401);
});

test("POST to /api/v1/sessoes with missing fields should return 400", async () => {
  const res = await fetch("http://localhost:3000/api/v1/sessoes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ matricula: "222222" }),
  });

  expect(res.status).toBe(400);
});
