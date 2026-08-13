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

  await fetch("http://localhost:3000/api/v1/empregados", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(empregadoData),
  });

  const loginRes = await fetch("http://localhost:3000/api/v1/sessoes", {
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

test("GET to /api/v1/ponto with valid session should return 200 and the employee's punches", async () => {
  const { cookie } = await criarEmpregadoELogar();

  // bate um ponto antes de consultar
  await fetch("http://localhost:3000/api/v1/ponto", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ type: "entrada" }),
  });

  const res = await fetch("http://localhost:3000/api/v1/ponto", {
    method: "GET",
    headers: { Cookie: cookie },
  });

  expect(res.status).toBe(200);

  const resBody = await res.json();
  expect(Array.isArray(resBody)).toBe(true);
  expect(resBody.length).toBeGreaterThan(0);
  expect(resBody[0]).toHaveProperty("tipo", "entrada");
});

test("GET to /api/v1/ponto without authentication should return 401", async () => {
  const res = await fetch("http://localhost:3000/api/v1/ponto", {
    method: "GET",
  });

  expect(res.status).toBe(401);
});

test("GET to /api/v1/ponto should only return the logged employee's own punches", async () => {
  const empregadoA = await criarEmpregadoELogar({
    email: "empregado.a@example.com",
    matricula: "111222",
  });

  const empregadoB = await criarEmpregadoELogar({
    email: "empregado.b@example.com",
    matricula: "333444",
  });

  // empregadoA bate ponto
  await fetch("http://localhost:3000/api/v1/ponto", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: empregadoA.cookie,
    },
    body: JSON.stringify({ type: "entrada" }),
  });

  // empregadob vai consultar os pontos e tem que ta v azio
  const res = await fetch("http://localhost:3000/api/v1/ponto", {
    method: "GET",
    headers: { Cookie: empregadoB.cookie },
  });

  const resBody = await res.json();
  expect(resBody.length).toBe(0);
});
