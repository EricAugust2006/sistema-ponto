import orchestrator from "@/_tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.cleanDatabase();
  await orchestrator.runMigrations();
});

async function criarEmpregadoELogar(overrides = {}) {
  const empregadoData = {
    nome: "Teste Logout",
    email: "teste.logout@example.com",
    matricula: "555555",
    senha: "senha123",
    ...overrides,
  };

  const empregadoRes = await fetch("http://localhost:3000/api/v1/empregados", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(empregadoData),
  });

  if (!empregadoRes.ok) {
    console.log(
      "Falha ao criar empregado:",
      empregadoRes.status,
      await empregadoRes.text(),
    );
  }

  const loginRes = await fetch("http://localhost:3000/api/v1/sessoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      matricula: empregadoData.matricula,
      senha: empregadoData.senha,
    }),
  });

  if (!loginRes.ok) {
    console.log("Falha no login:", loginRes.status, await loginRes.text());
  }

  const setCookieHeader = loginRes.headers.get("set-cookie");
  const cookie = setCookieHeader.split(";")[0];

  return { empregadoData, cookie };
}

test("DELETE to /api/v1/sessoes with valid session should return 200 and clear the session cookie", async () => {
  const { cookie } = await criarEmpregadoELogar();

  const res = await fetch("http://localhost:3000/api/v1/sessoes", {
    method: "DELETE",
    headers: {
      Cookie: cookie,
    },
  });

  expect(res.status).toBe(200);

  const resBody = await res.json();

  expect(resBody).toHaveProperty("mensagem", "Sessão encerrada com sucesso");

  const setCookieHeader = res.headers.get("set-cookie");
  expect(setCookieHeader).toContain("session_token=;");
});

test("DELETE to /api/v1/sessoes without session should return 200 (idempotent)", async () => {
  const res = await fetch("http://localhost:3000/api/v1/sessoes", {
    method: "DELETE",
  });

  expect(res.status).toBe(200);
});

test("token should be invalid for protected routes after logout", async () => {
  const { cookie } = await criarEmpregadoELogar({
    email: "outro.logout@example.com",
    matricula: "654321",
  });

  // aqui faz logout
  await fetch("http://localhost:3000/api/v1/sessoes", {
    method: "DELETE",
    headers: {
      Cookie: cookie,
    },
  });

  //  aqui tenta usar o msm cookie numa rota protegida
  const res = await fetch("http://localhost:3000/api/v1/ponto", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      type: "entrada",
    }),
  });

  expect(res.status).toBe(401);
});
