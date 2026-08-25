"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, Check, Clock3, LogOut, Loader2, Timer, Utensils,} from "lucide-react";

type Empregado = { id: number; nome: string; email: string; matricula: string };
type Ponto = {
  id: string;
  empregado_id: number;
  tipo: string;
  criado_em: string;
};
const TIPOS_PONTO = [
  {
    valor: "entrada",
    rotulo: "Entrada",
    detalhe: "Início da jornada",
    Icon: BriefcaseBusiness,
  },
  {
    valor: "saida_almoco",
    rotulo: "Saída almoço",
    detalhe: "Pausa para almoço",
    Icon: Utensils,
  },
  {
    valor: "retorno_almoco",
    rotulo: "Volta almoço",
    detalhe: "Retorno da pausa",
    Icon: Timer,
  },
  { valor: "saida", rotulo: "Saída", detalhe: "Fim da jornada", Icon: LogOut },
];
function chaveDoMes(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}
function chaveDoDia(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}
function nomeDoMes(chave: string) {
  const [ano, mes] = chave.split("-").map(Number);
  const nome = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}
function agruparPontos(pontos: Ponto[]) {
  const mapa = new Map<string, Map<string, Ponto[]>>();
  for (const ponto of pontos) {
    const data = new Date(ponto.criado_em);
    const mes = chaveDoMes(data);
    const dia = chaveDoDia(data);
    if (!mapa.has(mes)) mapa.set(mes, new Map());
    if (!mapa.get(mes)!.has(dia)) mapa.get(mes)!.set(dia, []);
    mapa.get(mes)!.get(dia)!.push(ponto);
  }
  return mapa;
}
function formatarDia(chave: string) {
  const [ano, mes, dia] = chave.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  const semana = data
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
  return {
    numero: String(dia).padStart(2, "0"),
    semana: semana.charAt(0).toUpperCase() + semana.slice(1),
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
      setPontos(await res.json());
      setMesSelecionado((atual) => atual ?? chaveDoMes(new Date()));
    }
  }, []);
  useEffect(() => {
    async function carregar() {
      const res = await fetch("/api/v1/sessoes");
      if (!res.ok) {
        return;
      }
      const body = await res.json();
      setEmpregado(body.empregado);
      await buscarPontos();
      setCarregandoPagina(false);
    }
    carregar();
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
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregandoTipo(null);
    }
  }
  async function sair() {
    await fetch("/api/v1/sessoes", { method: "DELETE" });
    router.push("/login");
  }
  const agrupados = useMemo(() => agruparPontos(pontos), [pontos]);
  const meses = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const hoje = new Date();
        return chaveDoMes(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1));
      }),
    [],
  );
  const indice = mesSelecionado ? meses.indexOf(mesSelecionado) : -1;
  const dias =
    mesSelecionado && agrupados.get(mesSelecionado)
      ? Array.from(agrupados.get(mesSelecionado)!.keys()).sort().reverse()
      : [];
  if (carregandoPagina)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="animate-spin text-primary" /> Carregando seu
          painel...
        </div>
      </main>
    );
  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Clock3 />
            </span>
            <div>
              <p className="text-sm font-bold tracking-wide">
                PONTO{" "}
                <span className="font-normal text-muted-foreground">
                  / MGS
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Controle de jornada
              </p>
            </div>
          </div>
          <button
            onClick={sair}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <LogOut /> Sair
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-primary">
              Painel do funcionário
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Olá, {empregado?.nome?.split(" ")[0]}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Registre sua jornada e acompanhe seu histórico.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <CalendarDays className="text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Hoje</p>
              <p className="text-sm font-semibold">
                {new Date().toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                })}
              </p>
            </div>
          </div>
        </div>
        {erro && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {erro}
          </div>
        )}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Registrar ponto</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecione o momento correspondente.
              </p>
            </div>
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="size-2 rounded-full bg-primary" /> Atualização
              instantânea
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {TIPOS_PONTO.map(({ valor, rotulo, detalhe, Icon }) => (
              <button
                key={valor}
                onClick={() => baterPonto(valor)}
                disabled={carregandoTipo !== null}
                className="group flex min-h-32 flex-col justify-between rounded-2xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  {carregandoTipo === valor ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Icon />
                  )}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{rotulo}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {detalhe}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
        <section>
          <div className="mb-4">
            <h2 className="font-semibold">Histórico de registros</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulte suas batidas por mês.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
              <button
                aria-label="Mês anterior"
                onClick={() =>
                  indice < meses.length - 1 &&
                  setMesSelecionado(meses[indice + 1])
                }
                disabled={indice >= meses.length - 1}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-30"
              >
                <ArrowLeft />
              </button>
              <select
                value={mesSelecionado ?? ""}
                onChange={(e) => setMesSelecionado(e.target.value)}
                className="rounded-lg border-0 bg-transparent px-3 py-2 text-center text-sm font-semibold outline-none"
              >
                <option disabled value="">
                  Selecione o mês
                </option>
                {meses.map((mes) => (
                  <option key={mes} value={mes}>
                    {nomeDoMes(mes)}
                  </option>
                ))}
              </select>
              <button
                aria-label="Próximo mês"
                onClick={() =>
                  indice > 0 && setMesSelecionado(meses[indice - 1])
                }
                disabled={indice <= 0}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-30"
              >
                <ArrowRight />
              </button>
            </div>
            {dias.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <CalendarDays />
                </span>
                <p className="text-sm font-medium">
                  Nenhum ponto registrado neste mês.
                </p>
                <p className="text-xs text-muted-foreground">
                  Seus registros aparecerão aqui após a primeira batida.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[680px]">
                  <div className="grid grid-cols-[120px_repeat(4,1fr)] border-b border-border bg-muted/40 px-6 py-3 text-xs font-medium text-muted-foreground">
                    <span>Dia</span>
                    {TIPOS_PONTO.map((tipo) => (
                      <span key={tipo.valor} className="text-center">
                        {tipo.rotulo}
                      </span>
                    ))}
                  </div>
                  {dias.map((dia) => {
                    const { numero, semana } = formatarDia(dia);
                    const doDia = agrupados.get(mesSelecionado!)!.get(dia)!;
                    return (
                      <div
                        key={dia}
                        className="grid grid-cols-[120px_repeat(4,1fr)] items-center border-b border-border/70 px-6 py-4 last:border-0"
                      >
                        <span className="text-sm font-semibold">
                          <span className="mr-2 text-muted-foreground">
                            {numero}
                          </span>
                          {semana}
                        </span>
                        {TIPOS_PONTO.map((tipo) => {
                          const ponto = doDia.find(
                            (p) => p.tipo === tipo.valor,
                          );
                          return (
                            <span
                              key={tipo.valor}
                              className={`text-center text-sm ${ponto ? "font-medium" : "text-muted-foreground/40"}`}
                            >
                              {ponto ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Check className="text-primary" />
                                  {new Date(ponto.criado_em).toLocaleTimeString(
                                    "pt-BR",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                              ) : (
                                "—"
                              )}
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
        </section>
      </div>
    </main>
  );
}
