import orchestrator from "@/_tests/orchestrator.js";
import database from "@/_infra/database.js";

beforeAll(async () => {
  await orchestrator.cleanDatabase();
  await orchestrator.runMigrations();
});

async function criarEmpregadoELogar(overrides = {}) {
  const empregadoData = {
    nome: "Teste Ponto POST",
    email: "teste.ponto.post@example.com",
    matricula: "555999",
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

test("POST to /api/v1/ponto should register a punch successfully", async () => {
  const { cookie } = await criarEmpregadoELogar();

  const res = await fetch("http://127.0.0.1:3000/api/v1/ponto", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ type: "entrada" }),
  });

  expect(res.status).toBe(201);

  const resBody = await res.json();
  expect(resBody).toHaveProperty("tipo", "entrada");
});

test("POST to /api/v1/ponto should not allow registering the same type twice in the same day", async () => {
  const { cookie } = await criarEmpregadoELogar({
    email: "duplicado@example.com",
    matricula: "222999",
  });

  await fetch("http://127.0.0.1:3000/api/v1/ponto", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ type: "entrada" }),
  });

  const res = await fetch("http://127.0.0.1:3000/api/v1/ponto", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ type: "entrada" }),
  });

  expect(res.status).toBe(400);
});

test("POST to /api/v1/ponto with invalid type should return 400", async () => {
  const { cookie } = await criarEmpregadoELogar({
    email: "tipo.invalido@example.com",
    matricula: "333999",
  });

  const res = await fetch("http://127.0.0.1:3000/api/v1/ponto", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ type: "almoco_extra" }),
  });

  expect(res.status).toBe(400);
});

test("POST to /api/v1/ponto should reject punches out of logical sequence", async () => {
  const { cookie } = await criarEmpregadoELogar({
    email: "sequencia.ordem@example.com",
    matricula: "777999",
  });

  // Tentar bater saida_almoco sem ter batido entrada
  const saidaAlmocoSemEntradaRes = await fetch(
    "http://127.0.0.1:3000/api/v1/ponto",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ type: "saida_almoco" }),
    },
  );
  expect(saidaAlmocoSemEntradaRes.status).toBe(400);
  const saidaAlmocoSemEntradaBody = await saidaAlmocoSemEntradaRes.json();
  expect(saidaAlmocoSemEntradaBody.erro).toContain("entrada");

  // Bater entrada com sucesso
  const entradaRes = await fetch("http://127.0.0.1:3000/api/v1/ponto", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ type: "entrada" }),
  });
  expect(entradaRes.status).toBe(201);

  // Tentar bater saida sem ter batido almoço
  const saidaDiretaRes = await fetch("http://127.0.0.1:3000/api/v1/ponto", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ type: "saida" }),
  });
  expect(saidaDiretaRes.status).toBe(400);

  // Bater saida_almoco com sucesso
  const saidaAlmocoRes = await fetch("http://127.0.0.1:3000/api/v1/ponto", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ type: "saida_almoco" }),
  });
  expect(saidaAlmocoRes.status).toBe(201);

  // Bater retorno_almoco com sucesso
  const retornoAlmocoRes = await fetch("http://127.0.0.1:3000/api/v1/ponto", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ type: "retorno_almoco" }),
  });
  expect(retornoAlmocoRes.status).toBe(201);

  // Bater saida com sucesso
  const saidaRes = await fetch("http://127.0.0.1:3000/api/v1/ponto", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ type: "saida" }),
  });
  expect(saidaRes.status).toBe(201);
});

test("POST to /api/v1/ponto without authentication should return 401", async () => {
  const res = await fetch("http://127.0.0.1:3000/api/v1/ponto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "entrada" }),
  });

  expect(res.status).toBe(401);
});

test("closing the day (saida) should calculate banco_horas with correct entrada/almoco deviations", async () => {
  const { cookie, empregadoId } = await criarEmpregadoELogar({
    email: "banco.horas@example.com",
    matricula: "444999",
  });

  await database.query({
    text: `UPDATE empregados SET horario_entrada = '08:00:00', horario_saida = '17:00:00' WHERE id = $1`,
    values: [empregadoId],
  });

  //ex: 
  // entrada real: 08:10 (10min de atraso -> desvio de -10)
  // saida_almoco: 12:00
  // retorno_almoco: 13:20 (almoço de 80min em vez de 60 -> desvio de -20)
  await database.query({
    text: `
      INSERT INTO pontos (empregado_id, tipo, criado_em) VALUES
      ($1, 'entrada', CURRENT_DATE + interval '8 hours 10 minutes'),
      ($1, 'saida_almoco', CURRENT_DATE + interval '12 hours'),
      ($1, 'retorno_almoco', CURRENT_DATE + interval '13 hours 20 minutes')
    `,
    values: [empregadoId],
  });

  const res = await fetch("http://127.0.0.1:3000/api/v1/ponto", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ type: "saida" }),
  });

  expect(res.status).toBe(201);

  const bancoHorasResult = await database.query({
    text: `SELECT * FROM banco_horas WHERE empregado_id = $1`,
    values: [empregadoId],
  });

  expect(bancoHorasResult.rowCount).toBe(1);

  const registro = bancoHorasResult.rows[0];
  expect(registro.detalhes.desvio_entrada_minutos).toBe(-10);
  expect(registro.detalhes.desvio_almoco_minutos).toBe(-20);
  expect(typeof registro.detalhes.desvio_saida_minutos).toBe("number");
  expect(registro.saldo_minutos).toBe(
    registro.detalhes.desvio_entrada_minutos +
      registro.detalhes.desvio_almoco_minutos +
      registro.detalhes.desvio_saida_minutos,
  );
});

test("POST to /api/v1/ponto should block registering earlier punch when posterior punch was already registered", async () => {
  const { cookie, empregadoId } = await criarEmpregadoELogar({
    email: "trava.retroativa@example.com",
    matricula: "111888",
  });

  // Insere diretamente um ponto de tipo posterior (saida_almoco)
  await database.query({
    text: `INSERT INTO pontos (empregado_id, tipo) VALUES ($1, 'saida_almoco')`,
    values: [empregadoId],
  });

  // Tenta bater entrada (anterior a saida_almoco)
  const res = await fetch("http://127.0.0.1:3000/api/v1/ponto", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ type: "entrada" }),
  });

  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.erro).toContain("Você já registrou um ponto posterior");
});

