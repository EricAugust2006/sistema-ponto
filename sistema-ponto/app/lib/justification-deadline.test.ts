import {
  prazoJustificativa,
  prazoJustificativaExpirado,
} from "./justification-deadline";

test("calcula o quinto dia do mês seguinte", () => {
  expect(prazoJustificativa("2026-01-15")).toBe("2026-02-05");
});

test("considera o quinto dia válido e o sexto dia expirado", () => {
  expect(prazoJustificativaExpirado("2026-04-30", "2026-05-05")).toBe(false);
  expect(prazoJustificativaExpirado("2026-04-30", "2026-05-06")).toBe(true);
});

test("faz rollover de dezembro para janeiro", () => {
  expect(prazoJustificativa("2026-12-31")).toBe("2027-01-05");
  expect(prazoJustificativaExpirado("2026-12-31", "2027-01-05")).toBe(false);
  expect(prazoJustificativaExpirado("2026-12-31", "2027-01-06")).toBe(true);
});