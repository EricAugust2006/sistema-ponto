"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Clock3,
  Loader2,
  LogOut,
  Timer,
  TrendingDown,
  TrendingUp,
  User,
  Utensils,
} from "lucide-react";

type Empregado = {
  id: number;
  nome: string;
  email: string;
  matricula: string;
};

type Ponto = {
  id: string;
  empregado_id: number;
  tipo: "entrada" | "saida_almoco" | "retorno_almoco" | "saida";
  criado_em: string;
};

type RegistroBancoHoras = {
  data: string;
  saldo_minutos: number;
  detalhes: Record<string, number>;
};

type BancoHorasResponse = {
  saldoTotalMinutos: number;
  registros: RegistroBancoHoras[];
};

const TIPOS_PONTO = [
  {
    valor: "entrada" as const,
    rotulo: "Entrada",
    detalhe: "Início da jornada",
    Icon: BriefcaseBusiness,
  },
  {
    valor: "saida_almoco" as const,
    rotulo: "Saída almoço",
    detalhe: "Pausa para almoço",
    Icon: Utensils,
  },
  {
    valor: "retorno_almoco" as const,
    rotulo: "Volta almoço",
    detalhe: "Retorno da pausa",
    Icon: Timer,
  },
  {
    valor: "saida" as const,
    rotulo: "Saída",
    detalhe: "Fim da jornada",
    Icon: LogOut,
  },
];

function chaveDoMes(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function chaveDoDia(data: Date) {
  return `${chaveDoMes(data)}-${String(data.getDate()).padStart(2, "0")}`;
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

function formatarDia(chave: string) {
  const [ano, mes, dia] = chave.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  const semana = data
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
  const semanaCompleta = data.toLocaleDateString("pt-BR", { weekday: "long" });
  return {
    numero: String(dia).padStart(2, "0"),
    semana: semana.charAt(0).toUpperCase() + semana.slice(1),
    semanaCompleta:
      semanaCompleta.charAt(0).toUpperCase() + semanaCompleta.slice(1),
  };
}

function formatarHorario(dataIso: string) {
  return new Date(dataIso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarSaldo(minutos: number) {
  const sinal = minutos > 0 ? "+" : minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  const horas = Math.floor(abs / 60);
  const mins = abs % 60;
  return `${sinal}${horas}h ${String(mins).padStart(2, "0")}m`;
}

function agruparPontos(pontos: Ponto[]) {
  const porMes = new Map<string, Map<string, Ponto[]>>();

  for (const ponto of pontos) {
    const data = new Date(ponto.criado_em);
    const mes = chaveDoMes(data);
    const dia = chaveDoDia(data);

    if (!porMes.has(mes)) {
      porMes.set(mes, new Map());
    }
    const diasDoMes = porMes.get(mes)!;

    if (!diasDoMes.has(dia)) {
      diasDoMes.set(dia, []);
    }
    diasDoMes.get(dia)!.push(ponto);
  }

  return porMes;
}

export default function PontoPage() {
  const router = useRouter();
  const [empregado, setEmpregado] = useState<Empregado | null>(null);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [bancoHoras, setBancoHoras] = useState<BancoHorasResponse | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const [carregandoPagina, setCarregandoPagina] = useState(true);
  const [carregandoTipo, setCarregandoTipo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [horaAtual, setHoraAtual] = useState<Date | null>(null);

  // Relógio em tempo real
  useEffect(() => {
    setHoraAtual(new Date());
    const intervalo = setInterval(() => {
      setHoraAtual(new Date());
    }, 1000);
    return () => clearInterval(intervalo);
  }, []);

  const buscarPontos = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/ponto");
      if (res.ok) {
        const data: Ponto[] = await res.json();
        setPontos(data);
        setMesSelecionado((atual) => atual ?? chaveDoMes(new Date()));
      }
    } catch {
      // Falha silenciosa na atualização em segundo plano
    }
  }, []);

  const buscarBancoHoras = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/banco-horas");
      if (res.ok) {
        const data: BancoHorasResponse = await res.json();
        setBancoHoras(data);
      }
    } catch {
      // Falha silenciosa na atualização em segundo plano
    }
  }, []);

  useEffect(() => {
    async function carregarDadosIniciais() {
      try {
        const sessaoRes = await fetch("/api/v1/sessoes");
        if (!sessaoRes.ok) {
          router.push("/login");
          return;
        }

        const sessaoBody = await sessaoRes.json();
        setEmpregado(sessaoBody.empregado);

        await Promise.all([buscarPontos(), buscarBancoHoras()]);
      } catch {
        router.push("/login");
      } finally {
        setCarregandoPagina(false);
      }
    }

    carregarDadosIniciais();
  }, [router, buscarPontos, buscarBancoHoras]);

  async function baterPonto(tipo: (typeof TIPOS_PONTO)[number]["valor"]) {
    setErro(null);
    setSucesso(null);
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

      setSucesso("Ponto registrado com sucesso!");
      await Promise.all([buscarPontos(), buscarBancoHoras()]);

      setTimeout(() => {
        setSucesso(null);
      }, 4000);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregandoTipo(null);
    }
  }

  async function sair() {
    try {
      await fetch("/api/v1/sessoes", { method: "DELETE" });
    } finally {
      router.push("/login");
    }
  }

  const agrupados = useMemo(() => agruparPontos(pontos), [pontos]);

  const meses = useMemo(() => {
    const hoje = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      return chaveDoMes(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1));
    });
  }, []);

  const indiceMes = mesSelecionado ? meses.indexOf(mesSelecionado) : -1;

  const dias = useMemo(() => {
    if (!mesSelecionado || !agrupados.has(mesSelecionado)) return [];
    return Array.from(agrupados.get(mesSelecionado)!.keys()).sort().reverse();
  }, [mesSelecionado, agrupados]);

  // Pontos já registrados hoje
  const pontosHoje = useMemo(() => {
    const hojeChave = chaveDoDia(new Date());
    const mapa = new Map<string, Ponto>();
    for (const ponto of pontos) {
      const data = new Date(ponto.criado_em);
      if (chaveDoDia(data) === hojeChave) {
        mapa.set(ponto.tipo, ponto);
      }
    }
    return mapa;
  }, [pontos]);

  if (carregandoPagina) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" /> Carregando
          seu painel...
        </div>
      </main>
    );
  }

  const saldoMinutos = bancoHoras?.saldoTotalMinutos ?? 0;
  const saldoPositivo = saldoMinutos > 0;
  const saldoNegativo = saldoMinutos < 0;

  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
              <Clock3 className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-wide">
                PONTO{" "}
                <span className="font-normal text-muted-foreground">
                  / SISTEMA
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Controle de jornada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
              <User className="size-3.5 text-primary" />
              <span>Matrícula:</span>
              <span className="font-semibold text-foreground">
                {empregado?.matricula}
              </span>
            </div>

            <button
              onClick={sair}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              title="Encerrar sessão"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        {/* Welcome and Summary Cards */}
        <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto_auto]">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Painel do funcionário
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Olá, {empregado?.nome?.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe seus horários e registre sua jornada diária com
              facilidade.
            </p>
          </div>

          {/* Relógio em Tempo Real e Data */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hoje</p>
              <p className="text-sm font-semibold capitalize">
                {horaAtual
                  ? horaAtual.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                  : "..."}
              </p>
              <p className="flex items-center gap-1 font-mono text-xs text-primary">
                <Clock className="size-3" />
                {horaAtual
                  ? horaAtual.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                  : "--:--:--"}
              </p>
            </div>
          </div>

          {/* Banco de Horas Total */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div
              className={`flex size-10 items-center justify-center rounded-xl ${saldoPositivo
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : saldoNegativo
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
                }`}
            >
              {saldoPositivo ? (
                <TrendingUp className="size-5" />
              ) : saldoNegativo ? (
                <TrendingDown className="size-5" />
              ) : (
                <Timer className="size-5" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Banco de horas</p>
              <p
                className={`text-sm font-bold ${saldoPositivo
                  ? "text-emerald-600 dark:text-emerald-400"
                  : saldoNegativo
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground"
                  }`}
              >
                {bancoHoras ? formatarSaldo(saldoMinutos) : "0h 00m"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {bancoHoras?.registros?.length ?? 0} dias contabilizados
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {erro && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3.5 text-sm text-destructive"
          >
            <div className="size-2 rounded-full bg-destructive" />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div
            role="status"
            className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3.5 text-sm text-emerald-700 dark:text-emerald-300"
          >
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{sucesso}</span>
          </div>
        )}

        {/* Ponto Action Buttons */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold tracking-tight">Registrar ponto</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Selecione a marcação de ponto correspondente.
              </p>
            </div>
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
              Atualização em tempo real
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TIPOS_PONTO.map(({ valor, rotulo, detalhe, Icon }) => {
              const pontoHoje = pontosHoje.get(valor);
              const jaRegistrado = !!pontoHoje;
              const estaCarregando = carregandoTipo === valor;

              return (
                <button
                  key={valor}
                  onClick={() => baterPonto(valor)}
                  disabled={jaRegistrado || carregandoTipo !== null}
                  className={`group relative flex min-h-32 flex-col justify-between rounded-2xl border p-4 text-left transition-all ${jaRegistrado
                    ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10 cursor-default"
                    : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 active:translate-y-0"
                    } disabled:cursor-not-allowed disabled:opacity-80`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex size-10 items-center justify-center rounded-xl transition ${jaRegistrado
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                        }`}
                    >
                      {estaCarregando ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <Icon className="size-5" />
                      )}
                    </span>

                    {jaRegistrado && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="size-3" /> Registrado
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <span className="block text-sm font-semibold">{rotulo}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {jaRegistrado
                        ? `Às ${formatarHorario(pontoHoje.criado_em)}`
                        : detalhe}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* History Section */}
        <section>
          <div className="mb-4">
            <h2 className="font-semibold tracking-tight">
              Histórico de registros
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Consulte os registros de batidas agrupados por mês.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {/* Month Filter Selector */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-6">
              <button
                aria-label="Mês anterior"
                onClick={() =>
                  indiceMes < meses.length - 1 &&
                  setMesSelecionado(meses[indiceMes + 1])
                }
                disabled={indiceMes >= meses.length - 1}
                className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              >
                <ArrowLeft className="size-4" />
              </button>

              <div className="flex items-center gap-2">
                <select
                  value={mesSelecionado ?? ""}
                  onChange={(e) => setMesSelecionado(e.target.value)}
                  className="cursor-pointer rounded-xl border border-border bg-muted/40 px-4 py-2 text-center text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
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
              </div>

              <button
                aria-label="Próximo mês"
                onClick={() =>
                  indiceMes > 0 && setMesSelecionado(meses[indiceMes - 1])
                }
                disabled={indiceMes <= 0}
                className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>

            {/* Table or Empty State */}
            {dias.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <CalendarDays className="size-6" />
                </span>
                <p className="text-sm font-medium">
                  Nenhum ponto registrado em{" "}
                  {mesSelecionado ? nomeDoMes(mesSelecionado) : "neste mês"}.
                </p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Seus registros aparecerão listados aqui assim que forem
                  marcados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[680px]">
                  {/* Table Header */}
                  <div className="grid grid-cols-[140px_repeat(4,1fr)] border-b border-border bg-muted/40 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Dia</span>
                    {TIPOS_PONTO.map((tipo) => (
                      <span key={tipo.valor} className="text-center">
                        {tipo.rotulo}
                      </span>
                    ))}
                  </div>

                  {/* Table Rows */}
                  {dias.map((dia) => {
                    const { numero, semana } = formatarDia(dia);
                    const pontosDoDia = agrupados
                      .get(mesSelecionado!)!
                      .get(dia)!;
                    const isHoje = dia === chaveDoDia(new Date());

                    return (
                      <div
                        key={dia}
                        className={`grid grid-cols-[140px_repeat(4,1fr)] items-center border-b border-border/70 px-6 py-4 transition-colors last:border-0 hover:bg-muted/20 ${isHoje ? "bg-primary/5" : ""
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {numero}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            {semana}
                          </span>
                          {isHoje && (
                            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              Hoje
                            </span>
                          )}
                        </div>

                        {TIPOS_PONTO.map((tipo) => {
                          const ponto = pontosDoDia.find(
                            (p) => p.tipo === tipo.valor,
                          );

                          return (
                            <div
                              key={tipo.valor}
                              className="flex items-center justify-center text-sm"
                            >
                              {ponto ? (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1 font-mono text-xs font-semibold text-foreground border border-border/60 shadow-2xs">
                                  <Check className="size-3 text-emerald-500" />
                                  {formatarHorario(ponto.criado_em)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/30">
                                  —
                                </span>
                              )}
                            </div>
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
