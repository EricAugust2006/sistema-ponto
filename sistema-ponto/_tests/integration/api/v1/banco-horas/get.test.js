import orchestrator from "@/_tests/orchestrator.js";
import database from "@/_infra/database.js";

beforeAll(async () => {
  await orchestrator.cleanDatabase();
  await orchestrator.runMigrations();
});

async function criarEmpregadoELogar(overrides = {}) {
  const empregadoData = {
    nome: "Teste Banco Horas",
    email: "teste.banco.horas@example.com",
    matricula: "777888",
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

test("GET to /api/v1/banco-horas without authentication should return 401", async () => {
  const res = await fetch("http://127.0.0.1:3000/api/v1/banco-horas");
  expect(res.status).toBe(401);
});

test("GET to /api/v1/banco-horas with on punches ishould return zero balance and empty list", async () => {
  const { cookie } = await criarEmpregadoELogar();

  const res = await fetch("http://127.0.0.1:3000/api/v1/banco-horas", {
    headers: { Cookie: cookie },
  });
  expect(res.status).toBe(200);

  const body = await res.json();
  expect(body.saldoTotalMinutos).toBe(0);
  expect(body.registros).toEqual([]);
});

test("GET to /api/v1/banco-horas should reflect the balance after closing a day", async () => {
  const { cookie, empregadoId } = await criarEmpregadoELogar({
    email: "banco.horas.fechado@example.com",
    matricula: "999888",
  });

  await database.query({
    text: `UPDATE empregados SET horario_entrada = '08:00:00', horario_saida = '17:00:00' WHERE id = $1`,
    values: [empregadoId],
  });

  await database.query({
    text: `
    INSERT INTO pontos (empregado_id, tipo, criado_em) VALUES
    ($1, 'entrada', CURRENT_DATE + interval '8 hours'),
    ($1, 'saida_almoco', CURRENT_DATE + interval '12 hours'),
    ($1, 'retorno_almoco', CURRENT_DATE + interval '13 hours')
    `,
    values: [empregadoId],
  });

  await fetch("http://127.0.0.1:3000/api/v1/ponto", {
    method: "POST",
    headers: {
      "Content-type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ type: "saida" }),
  });

  const res = await fetch("http://127.0.0.1:3000/api/v1/banco-horas", {
    headers: { Cookie: cookie },
  });

  expect(res.status).toBe(200);

  const body = await res.json();
  expect(body.registros.length).toBe(1);
  expect(body.registros[0]).toHaveProperty("saldo_minutos");
  expect(body.registros[0]).toHaveProperty("detalhes");
  expect(body.registros[0].detalhes.desvio_entrada_minutos).toBe(0);
  expect(body.registros[0].detalhes.desvio_almoco_minutos).toBe(0);
  expect(body.saldoTotalMinutos).toBe(body.registros[0].saldo_minutos);
});
