"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Empregado = {
  id: number;
  nome: string;
  email: string;
  matricula: string;
};

type Ponto = {
  id: string;
  empregado_id: number;
  tipo: string;
  criado_em: string;
};

const TIPOS_PONTO = [
  { valor: "entrada", rotulo: "Entrada" },
  { valor: "saida_almoco", rotulo: "Saída Almoço" },
  { valor: "retorno_almoco", rotulo: "Volta Almoço" },
  { valor: "saida", rotulo: "Saída" },
];

function chaveDoMes(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function chaveDoDia(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(
    data.getDate(),
  ).padStart(2, "0")}`;
}

function nomeDoMes(chave: string) {
  const [ano, mes] = chave.split("-").map(Number);
  const data = new Date(ano, mes - 1, 1);
  const nome = data.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

function agruparPontos(pontos: Ponto[]) {
  const porMes = new Map<string, Map<string, Ponto[]>>();

  for (const ponto of pontos) {
    const data = new Date(ponto.criado_em);
    const cMes = chaveDoMes(data);
    const cDia = chaveDoDia(data);

    if (!porMes.has(cMes)) {
      porMes.set(cMes, new Map());
    }
    const diasDoMes = porMes.get(cMes)!;

    if (!diasDoMes.has(cDia)) {
      diasDoMes.set(cDia, []);
    }
    diasDoMes.get(cDia)!.push(ponto);
  }

  return porMes;
}

function formatarDiaCurto(chave: string) {
  const [ano, mes, dia] = chave.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  const diaSemana = data
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
  return {
    numero: String(dia).padStart(2, "0"),
    semana: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
  };
}

export default function PontoPage() {
  const router = useRouter();
  const [empregado, setEmpregado] = useState<Empregado | null>(null);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const [carregandoPagina, setCarregandoPagina] = useState(true);
  const [carregandoTipo, setCarregandoTipo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const buscarPontos = useCallback(async () => {
    const res = await fetch("/api/v1/ponto");
    if (res.ok) {
      const data: Ponto[] = await res.json();
      setPontos(data);
      setMesSelecionado((atual) => atual ?? chaveDoMes(new Date()));
    }
  }, []);

  useEffect(() => {
    async function carregarDados() {
      const sessaoRes = await fetch("/api/v1/sessoes");

      if (!sessaoRes.ok) {
        router.push("/login");
        return;
      }

      const sessaoBody = await sessaoRes.json();
      setEmpregado(sessaoBody.empregado);

      await buscarPontos();
      setCarregandoPagina(false);
    }

    carregarDados();
  }, [router, buscarPontos]);

  async function baterPonto(tipo: string) {
    setErro(null);
    setCarregandoTipo(tipo);

    try {
      const res = await fetch("/api/v1/ponto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tipo }),
      });

      if (!res.ok) {
        const body = await res.json();
        setErro(body.erro ?? "Não foi possível registrar o ponto.");
        return;
      }

      await buscarPontos();
    } catch (err) {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregandoTipo(null);
    }
  }

  async function sair() {
    await fetch("/api/v1/sessoes", { method: "DELETE" });
    router.push("/login");
  }

  const pontosAgrupados = useMemo(() => agruparPontos(pontos), [pontos]);

  const mesesDisponiveis = useMemo(() => {
    const meses: string[] = [];
    const hoje = new Date();

    for (let i = 0; i < 12; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push(chaveDoMes(data));
    }

    return meses;
  }, []);

  const indiceMesAtual = mesSelecionado
    ? mesesDisponiveis.indexOf(mesSelecionado)
    : -1;

  function irParaMesAnterior() {
    if (indiceMesAtual < mesesDisponiveis.length - 1) {
      setMesSelecionado(mesesDisponiveis[indiceMesAtual + 1]);
    }
  }

  function irParaProximoMes() {
    if (indiceMesAtual > 0) {
      setMesSelecionado(mesesDisponiveis[indiceMesAtual - 1]);
    }
  }

  if (carregandoPagina) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Carregando...</p>
      </main>
    );
  }

  const diasDoMesSelecionado = mesSelecionado
    ? pontosAgrupados.get(mesSelecionado)
    : undefined;

  const diasOrdenados = diasDoMesSelecionado
    ? Array.from(diasDoMesSelecionado.keys()).sort().reverse()
    : [];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">
            Olá, {empregado?.nome}
          </h1>
          <button
            onClick={sair}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Sair
          </button>
        </div>

        {erro && (
          <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TIPOS_PONTO.map((tipo) => (
            <button
              key={tipo.valor}
              onClick={() => baterPonto(tipo.valor)}
              disabled={carregandoTipo !== null}
              className="rounded-lg bg-blue-600 py-4 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {carregandoTipo === tipo.valor ? "..." : tipo.rotulo}
            </button>
          ))}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium text-gray-600">
            Histórico
          </h2>

          {/* Seletor de mês */}
          <div className="mb-4 flex items-center justify-between rounded-lg bg-white px-4 py-2 shadow-sm">
            <button
              onClick={irParaMesAnterior}
              disabled={indiceMesAtual >= mesesDisponiveis.length - 1}
              className="px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
            >
              ←
            </button>

            <select
              value={mesSelecionado ?? ""}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="cursor-pointer rounded border-none bg-transparent px-2 py-1 text-center font-medium text-gray-700 focus:outline-none"
            >
              {mesesDisponiveis.map((chave) => (
                <option key={chave} value={chave}>
                  {nomeDoMes(chave)}
                </option>
              ))}
            </select>

            <button
              onClick={irParaProximoMes}
              disabled={indiceMesAtual <= 0}
              className="px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
            >
              →
            </button>
          </div>

          {diasOrdenados.length === 0 ? (
            <p className="rounded-lg bg-white px-4 py-6 text-center text-sm text-gray-400 shadow-sm">
              Nenhum ponto registrado neste mês.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-[100px_repeat(4,1fr)] border-b border-gray-100 px-3 py-2 text-xs font-medium text-gray-400">
                  <span>Dia</span>
                  {TIPOS_PONTO.map((tipo) => (
                    <span key={tipo.valor} className="text-center">
                      {tipo.rotulo}
                    </span>
                  ))}
                </div>

                {diasOrdenados.map((chaveDia) => {
                  const pontosDoDia = diasDoMesSelecionado!.get(chaveDia)!;
                  const { numero, semana } = formatarDiaCurto(chaveDia);

                  return (
                    <div
                      key={chaveDia}
                      className="grid grid-cols-[100px_repeat(4,1fr)] items-center border-b border-gray-50 px-3 py-3 last:border-0"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {semana} {numero}
                      </span>

                      {TIPOS_PONTO.map((tipo) => {
                        const ponto = pontosDoDia.find(
                          (p) => p.tipo === tipo.valor,
                        );
                        const horario = ponto
                          ? new Date(ponto.criado_em).toLocaleTimeString(
                              "pt-BR",
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : "—";

                        return (
                          <span
                            key={tipo.valor}
                            className={`text-center text-sm ${
                              ponto ? "text-gray-700" : "text-gray-300"
                            }`}
                          >
                            {horario}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}