export type StatusJustificativa = "pendente" | "aprovada" | "recusada";

export type Justificativa = {
  id: number;
  empregado_id: number;
  empregado_nome: string;
  matricula: string;
  data: string;
  tipo_ponto: string;
  motivo: string;
  status: StatusJustificativa;
  observacao_analise: string | null;
};

export type GrupoMesJustificativas = {
  chave: string;
  rotulo: string;
  justificativas: Justificativa[];
};

export type GrupoEmpregadoJustificativas = {
  empregadoId: number;
  nome: string;
  matricula: string;
  meses: GrupoMesJustificativas[];
};

const ROTULOS_MES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function chaveData(data: string): string {
  return data.slice(0, 10);
}

export function formatarMesReferencia(chave: string): string {
  const [ano, mes] = chave.split("-");
  const indiceMes = Number(mes) - 1;
  const rotuloMes = ROTULOS_MES[indiceMes];

  if (!/^\d{4}-\d{2}$/.test(chave) || !rotuloMes) {
    throw new Error("Mês de referência inválido");
  }

  return `${rotuloMes} de ${ano}`;
}

export function agruparJustificativas(
  justificativas: Justificativa[],
): GrupoEmpregadoJustificativas[] {
  const grupos = new Map<number, Map<string, Justificativa[]>>();

  for (const justificativa of justificativas) {
    const meses = grupos.get(justificativa.empregado_id) ?? new Map();
    const mes = chaveData(justificativa.data).slice(0, 7);
    const registros = meses.get(mes) ?? [];
    registros.push(justificativa);
    meses.set(mes, registros);
    grupos.set(justificativa.empregado_id, meses);
  }

  return Array.from(grupos.entries())
    .map(([empregadoId, meses]) => {
      const registros = Array.from(meses.values()).flat();
      const primeiroRegistro = registros[0];

      return {
        empregadoId,
        nome: primeiroRegistro.empregado_nome,
        matricula: primeiroRegistro.matricula,
        meses: Array.from(meses.entries())
          .sort(([mesA], [mesB]) => mesB.localeCompare(mesA))
          .map(([chave, registrosDoMes]) => ({
            chave,
            rotulo: formatarMesReferencia(chave),
            justificativas: [...registrosDoMes].sort((a, b) => {
              const ordemData = chaveData(b.data).localeCompare(chaveData(a.data));
              return ordemData || b.id - a.id;
            }),
          })),
      };
    })
    .sort((a, b) => {
      const ultimaDataA = a.meses[0]?.justificativas[0]?.data ?? "";
      const ultimaDataB = b.meses[0]?.justificativas[0]?.data ?? "";
      const ordemData = chaveData(ultimaDataB).localeCompare(chaveData(ultimaDataA));
      return ordemData || a.nome.localeCompare(b.nome, "pt-BR") || a.empregadoId - b.empregadoId;
    });
}