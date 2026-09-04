import orchestrator from "@/_tests/orchestrator.js";
import database from "@/_infra/database.js";

beforeAll(async () => {
  await orchestrator.cleanDatabase();
  await orchestrator.runMigrations();
});

async function criarEmpregadoELogar(overrides = {}) {
  const empregadoData = {
    nome: "Empregado Justificativa",
    email: "emp.justificativa@example.com",
    matricula: "123789",
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
  const loginBody = await loginRes.json();

  return { empregadoData, cookie, empregadoId: loginBody.id };
}

test("POST to /api/v1/justificativas without auth should return 401", async () => {
  const res = await fetch("http://127.0.0.1:3000/api/v1/justificativas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: "2026-09-01",
      tipoPonto: "entrada",
      motivo: "Esqueci de bater o ponto na entrada",
    }),
  });

  expect(res.status).toBe(401);
});

test("POST to /api/v1/justificativas with valid data should create a justification (201)", async () => {
  const { cookie, empregadoId } = await criarEmpregadoELogar({
    email: "just.valida@example.com",
    matricula: "333444",
  });

  const res = await fetch("http://127.0.0.1:3000/api/v1/justificativas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      data: "2026-09-01",
      tipoPonto: "entrada",
      motivo: "Esqueci de registrar meu ponto de entrada por problema na catraca",
    }),
  });

  expect(res.status).toBe(201);
  const body = await res.json();
  expect(body).toHaveProperty("id");
  expect(body.status).toBe("pendente");
  expect(body.tipo_ponto).toBe("entrada");
  expect(body.empregado_id).toBe(empregadoId);

  const dbRes = await database.query({
    text: "SELECT * FROM justificativas_ponto WHERE id = $1",
    values: [body.id],
  });
  expect(dbRes.rowCount).toBe(1);
});

test("POST to /api/v1/justificativas should block future dates (400)", async () => {
  const { cookie } = await criarEmpregadoELogar({
    email: "just.futura@example.com",
    matricula: "555666",
  });

  // Data futura garantida
  const amanhã = new Date();
  amanhã.setDate(amanhã.getDate() + 2);
  const dataFutura = amanhã.toISOString().split("T")[0];

  const res = await fetch("http://127.0.0.1:3000/api/v1/justificativas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      data: dataFutura,
      tipoPonto: "saida",
      motivo: "Vou esquecer de registrar o ponto no futuro",
    }),
  });

  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.erro).toContain("Não é possível criar justificativa para datas futuras");
});

test("POST to /api/v1/justificativas with short reason or invalid type should return 400", async () => {
  const { cookie } = await criarEmpregadoELogar({
    email: "just.invalida@example.com",
    matricula: "777888",
  });

  // Motivo com menos de 10 caracteres
  const resCurto = await fetch("http://127.0.0.1:3000/api/v1/justificativas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      data: "2026-09-01",
      tipoPonto: "entrada",
      motivo: "Curto",
    }),
  });
  expect(resCurto.status).toBe(400);

  // Tipo inválido
  const resTipo = await fetch("http://127.0.0.1:3000/api/v1/justificativas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      data: "2026-09-01",
      tipoPonto: "tipo_inexistente",
      motivo: "Motivo com tamanho suficientemente longo",
    }),
  });
  expect(resTipo.status).toBe(400);
});
