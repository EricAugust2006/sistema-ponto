import {
  agruparJustificativas,
  formatarMesReferencia,
  type Justificativa,
} from "./admin-justifications";

function justificativa(overrides: Partial<Justificativa> = {}): Justificativa {
  return {
    id: 1,
    empregado_id: 10,
    empregado_nome: "Empregado A",
    matricula: "1001",
    data: "2026-09-01",
    tipo_ponto: "entrada",
    motivo: "Motivo suficientemente longo",
    status: "pendente",
    observacao_analise: null,
    ...overrides,
  };
}

test("agrupa por empregado e por mês, ordenando os registros mais recentes primeiro", () => {
  const grupos = agruparJustificativas([
    justificativa({ id: 2, data: "2026-08-20" }),
    justificativa({ id: 3, data: "2026-09-10" }),
    justificativa({
      id: 4,
      empregado_id: 20,
      empregado_nome: "Empregado B",
      matricula: "1002",
      data: "2026-09-05",
    }),
  ]);

  expect(grupos.map((grupo) => grupo.nome)).toEqual(["Empregado A", "Empregado B"]);
  expect(grupos[0].meses.map((mes) => mes.chave)).toEqual(["2026-09", "2026-08"]);
  expect(grupos[0].meses[0].justificativas.map((item) => item.id)).toEqual([3]);
  expect(grupos[0].meses[0].rotulo).toBe("setembro de 2026");
});

test("usa o id como desempate para registros na mesma data", () => {
  const grupos = agruparJustificativas([
    justificativa({ id: 2 }),
    justificativa({ id: 5 }),
  ]);

  expect(grupos[0].meses[0].justificativas.map((item) => item.id)).toEqual([5, 2]);
});

test("mantém dezembro e janeiro em buckets distintos", () => {
  const grupos = agruparJustificativas([
    justificativa({ id: 2, data: "2027-01-02" }),
    justificativa({ id: 3, data: "2026-12-31" }),
  ]);

  expect(grupos[0].meses.map((mes) => [mes.chave, mes.rotulo])).toEqual([
    ["2027-01", "janeiro de 2027"],
    ["2026-12", "dezembro de 2026"],
  ]);
});

test("agrupa somente os registros que chegam após o filtro de status", () => {
  const registros = [
    justificativa({ id: 1, status: "pendente" }),
    justificativa({ id: 2, status: "aprovada", empregado_id: 20, empregado_nome: "Empregado B" }),
  ];

  const grupos = agruparJustificativas(
    registros.filter((registro) => registro.status === "pendente"),
  );

  expect(grupos).toHaveLength(1);
  expect(grupos[0].nome).toBe("Empregado A");
  expect(grupos[0].meses[0].justificativas.map((item) => item.id)).toEqual([1]);
});

test("formata apenas chaves de mês válidas", () => {
  expect(formatarMesReferencia("2026-05")).toBe("maio de 2026");
  expect(() => formatarMesReferencia("2026-13")).toThrow("Mês de referência inválido");
});