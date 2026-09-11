const DATA_CALENDARIO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function dataCalendarioAtual(): string {
  return new Date().toISOString().split("T")[0];
}

export function prazoJustificativa(dataReferencia: string): string {
  if (!DATA_CALENDARIO_REGEX.test(dataReferencia)) {
    throw new Error("Data de referência inválida");
  }

  const [ano, mes] = dataReferencia.split("-").map(Number);
  return new Date(Date.UTC(ano, mes, 5)).toISOString().split("T")[0];
}

export function prazoJustificativaExpirado(
  dataReferencia: string,
  dataAtual = dataCalendarioAtual(),
): boolean {
  return dataAtual > prazoJustificativa(dataReferencia);
}