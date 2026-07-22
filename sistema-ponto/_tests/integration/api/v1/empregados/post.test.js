import orchestrator from "@/_tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.cleanDatabase();
  await orchestrator.runMigrations();
});

test("POST to /api/v1/empregados should return 201 and the created empregado", async () => {
  const empregadoData = {
    nome: "John Doe",
    email: "john.doe@example.com",
    matricula: "123456",
    senha: "securepassword",
  };

  const res = await fetch("http://localhost:3000/api/v1/empregados", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(empregadoData),
  });

  expect(res.status).toBe(201);
  const resBody = await res.json();
  expect(resBody).toHaveProperty("id");
  expect(resBody).toHaveProperty("nome", empregadoData.nome);
  expect(resBody).toHaveProperty("email", empregadoData.email);
  expect(resBody).toHaveProperty("matricula", empregadoData.matricula);
  expect(resBody).toHaveProperty("criado_em");
  expect(resBody).not.toHaveProperty("senha");
});

test("POST to /api/v1/empregados with missing fields should return 400", async () => {
  const res = await fetch("http://localhost:3000/api/v1/empregados", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nome: "Jane Doe" }),
  });
  expect(res.status).toBe(400);
});

test("POST to /api/v1/empregados with duplicate email should return 409", async () => {
  const empregadoData = {
    nome: "John Doe",
    email: "john.doe@example.com",
    matricula: "123456",
    senha: "securepassword",
  };

  await fetch("http://localhost:3000/api/v1/empregados", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(empregadoData),
  });

  const res = await fetch("http://localhost:3000/api/v1/empregados", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...empregadoData, matricula: "999999" }),
  });

  expect(res.status).toBe(409);
});
