import orchestrator from "@/_tests/orchestrator.js";
import database from "@/_infra/database.js";

beforeAll(async () => {
  await orchestrator.cleanDatabase();
  await orchestrator.runMigrations();
});

async function criarEmpregadoELogar(overrides = {}, papel = "funcionario") {
  const empregadoData = {
    nome: "Empregado Teste",
    email: "emp.patch@example.com",
    matricula: "111222",
    senha: "senha123",
    ...overrides,
  };

  await fetch("http://127.0.0.1:3000/api/v1/empregados", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(empregadoData),
  });

  // Busca ID do empregado criado e atualiza papel se necessário
  const dbEmp = await database.query({
    text: "SELECT id FROM empregados WHERE matricula = $1",
    values: [empregadoData.matricula],
  });
  const empregadoId = dbEmp.rows[0].id;

  if (papel !== "funcionario") {
    await database.query({
      text: "UPDATE empregados SET papel = $1 WHERE id = $2",
      values: [papel, empregadoId],
    });
  }

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

  return { empregadoData, cookie, empregadoId };
}

test("PATCH to /api/v1/justificativas without auth should return 401", async () => {
  const res = await fetch("http://127.0.0.1:3000/api/v1/justificativas", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: 1, status: "aprovada" }),
  });

  expect(res.status).toBe(401);
});

test("PATCH to /api/v1/justificativas by standard employee should return 403", async () => {
  const funcionario = await criarEmpregadoELogar({
    email: "comum@example.com",
    matricula: "333111",
  }, "funcionario");

  // Cria uma justificativa
  const justRes = await fetch("http://127.0.0.1:3000/api/v1/justificativas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: funcionario.cookie,
    },
    body: JSON.stringify({
      data: "2026-09-01",
      tipoPonto: "entrada",
      motivo: "Esqueci de registrar meu ponto ao chegar",
    }),
  });
  const justBody = await justRes.json();

  // Funcionário comum tenta aprovar
  const res = await fetch("http://127.0.0.1:3000/api/v1/justificativas", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: funcionario.cookie,
    },
    body: JSON.stringify({
      id: justBody.id,
      status: "aprovada",
    }),
  });

  expect(res.status).toBe(403);
  const body = await res.json();
  expect(body.erro).toContain("Apenas gestores ou administradores");
});

test("PATCH to /api/v1/justificativas: gestor approves justification and recalculates banco de horas (0 penalty)", async () => {
  const dataRef = "2026-09-01";

  // Cria funcionário com jornada 08:00 às 17:00
  const funcionario = await criarEmpregadoELogar({
    email: "aprovado.func@example.com",
    matricula: "444111",
  }, "funcionario");

  await database.query({
    text: `UPDATE empregados SET horario_entrada = '08:00:00', horario_saida = '17:00:00' WHERE id = $1`,
    values: [funcionario.empregadoId],
  });

  // Insere pontos de almoço e saída para a data de referência
  await database.query({
    text: `
      INSERT INTO pontos (empregado_id, tipo, criado_em, data_referencia) VALUES
      ($1, 'saida_almoco', '2026-09-01 12:00:00', $2),
      ($1, 'retorno_almoco', '2026-09-01 13:00:00', $2),
      ($1, 'saida', '2026-09-01 17:00:00', $2)
    `,
    values: [funcionario.empregadoId, dataRef],
  });

  // Funcionário cria justificativa para a 'entrada' que faltou
  const justRes = await fetch("http://127.0.0.1:3000/api/v1/justificativas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: funcionario.cookie,
    },
    body: JSON.stringify({
      data: dataRef,
      tipoPonto: "entrada",
      motivo: "Problema com biometria no dia 01/09",
    }),
  });
  expect(justRes.status).toBe(201);
  const justBody = await justRes.json();

  // Cria gestor para aprovar
  const gestor = await criarEmpregadoELogar({
    email: "gestor.aprova@example.com",
    matricula: "555111",
  }, "gestor");

  const patchRes = await fetch("http://127.0.0.1:3000/api/v1/justificativas", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: gestor.cookie,
    },
    body: JSON.stringify({
      id: justBody.id,
      status: "aprovada",
      observacao: "Justificativa aceita pelo gestor",
    }),
  });

  expect(patchRes.status).toBe(200);
  const patchBody = await patchRes.json();
  expect(patchBody.status).toBe("aprovada");
  expect(patchBody.analisado_por).toBe(gestor.empregadoId);

  // Confirma recálculo do banco de horas do dia com saldo 0
  const bancoRes = await database.query({
    text: "SELECT * FROM banco_horas WHERE empregado_id = $1 AND data = $2",
    values: [funcionario.empregadoId, dataRef],
  });

  expect(bancoRes.rowCount).toBe(1);
  const registro = bancoRes.rows[0];
  expect(registro.saldo_minutos).toBe(0);
  expect(registro.detalhes.desvio_entrada_minutos).toBe(0);
  expect(registro.detalhes.desvio_almoco_minutos).toBe(0);
  expect(registro.detalhes.desvio_saida_minutos).toBe(0);
});

test("PATCH to /api/v1/justificativas: gestor rejects justification and applies -60min penalty", async () => {
  const dataRef = "2026-09-02";

  // Cria funcionário com jornada 08:00 às 17:00
  const funcionario = await criarEmpregadoELogar({
    email: "recusado.func@example.com",
    matricula: "666111",
  }, "funcionario");

  await database.query({
    text: `UPDATE empregados SET horario_entrada = '08:00:00', horario_saida = '17:00:00' WHERE id = $1`,
    values: [funcionario.empregadoId],
  });

  // Insere pontos de almoço e saída para a data de referência
  await database.query({
    text: `
      INSERT INTO pontos (empregado_id, tipo, criado_em, data_referencia) VALUES
      ($1, 'saida_almoco', '2026-09-02 12:00:00', $2),
      ($1, 'retorno_almoco', '2026-09-02 13:00:00', $2),
      ($1, 'saida', '2026-09-02 17:00:00', $2)
    `,
    values: [funcionario.empregadoId, dataRef],
  });

  // Funcionário cria justificativa para a 'entrada' que faltou
  const justRes = await fetch("http://127.0.0.1:3000/api/v1/justificativas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: funcionario.cookie,
    },
    body: JSON.stringify({
      data: dataRef,
      tipoPonto: "entrada",
      motivo: "Achei que não precisava bater ponto hoje",
    }),
  });
  expect(justRes.status).toBe(201);
  const justBody = await justRes.json();

  // Cria gestor para recusar
  const gestor = await criarEmpregadoELogar({
    email: "gestor.recusa@example.com",
    matricula: "777111",
  }, "gestor");

  const patchRes = await fetch("http://127.0.0.1:3000/api/v1/justificativas", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: gestor.cookie,
    },
    body: JSON.stringify({
      id: justBody.id,
      status: "recusada",
      observacao: "Motivo insuficiente para abonar",
    }),
  });

  expect(patchRes.status).toBe(200);
  const patchBody = await patchRes.json();
  expect(patchBody.status).toBe("recusada");

  // Confirma recálculo do banco de horas com penalidade de -60min aplicada
  const bancoRes = await database.query({
    text: "SELECT * FROM banco_horas WHERE empregado_id = $1 AND data = $2",
    values: [funcionario.empregadoId, dataRef],
  });

  expect(bancoRes.rowCount).toBe(1);
  const registro = bancoRes.rows[0];
  expect(registro.detalhes.desvio_entrada_minutos).toBe(-60);
  expect(registro.saldo_minutos).toBe(-60);
});
