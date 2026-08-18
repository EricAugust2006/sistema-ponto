import orchestrator from "@/_tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.cleanDatabase();
  await orchestrator.runMigrations();
});

async function criarEmpregadoELogar(overrides = {}) {
  const empregadoData = {
    nome: "Teste Ponto GET",
    email: "teste.ponto.get@example.com",
    matricula: "888888",
    senha: "senha123",
    ...overrides,
  };

  await fetch("http://127.0.0.1:3000/api/v1/empregados", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(empregadoData),
  });

  const loginRes = await fetch("http://127.0.0.1:3000/api/v1/sessoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      matricula: empregadoData.matricula,
      senha: empregadoData.senha,
    }),
  });

  const setCookieHeader = loginRes.headers.get("set-cookie");
  const cookie = setCookieHeader.split(";")[0];

  return { empregadoData, cookie };
}

test("GET to /api/v1/sessoes with valid session should return 200 and the employee's session info", async () => {
  const { empregadoData, cookie } = await criarEmpregadoELogar();

  const res = await fetch("http://127.0.0.1:3000/api/v1/sessoes", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });

  expect(res.status).toBe(200);

  const resBody = await res.json();
  expect(resBody).toHaveProperty("mensagem");
  expect(resBody).toHaveProperty("empregado");
  expect(resBody.empregado).toHaveProperty("nome", empregadoData.nome);
  expect(resBody.empregado).toHaveProperty(
    "matricula",
    empregadoData.matricula,
  );
  expect(resBody.empregado).not.toHaveProperty("senha");
});

test("GET to /api/v1/sessoes without valid session should return 401", async () => {
  const res = await fetch("http://127.0.0.1:3000/api/v1/sessoes", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  expect(res.status).toBe(401);
});
