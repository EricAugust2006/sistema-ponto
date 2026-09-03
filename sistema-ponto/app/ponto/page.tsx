"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
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
  MessageSquarePlus,
  Timer,
  TrendingDown,
  TrendingUp,
  User,
  Utensils,
  X,
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

// tipos possíveis de status de uma justificativa
type StatusJustificativa = "pendente" | "aprovada" | "recusada";

type Justificativa = {
  id: number;
  empregado_id: number;
  data: string;
  tipo_ponto: string;
  motivo: string;
  status: StatusJustificativa;
};

const TIPOS_PONTO = [
  {
    valor: "entrada" as const,
    rotulo: "Entrada",
    detalhe: "Início da jornada",
    esperaTexto: "Aguardando início",
    Icon: BriefcaseBusiness,
  },
  {
    valor: "saida_almoco" as const,
    rotulo: "Saída almoço",
    detalhe: "Pausa para almoço",
    esperaTexto: "Aguarde a Entrada",
    Icon: Utensils,
  },
  {
    valor: "retorno_almoco" as const,
    rotulo: "Volta almoço",
    detalhe: "Retorno da pausa",
    esperaTexto: "Aguarde Saída almoço",
    Icon: Timer,
  },
  {
    valor: "saida" as const,
    rotulo: "Saída",
    detalhe: "Fim da jornada",
    esperaTexto: "Aguarde Volta almoço",
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
  return {
    numero: String(dia).padStart(2, "0"),
    semana: semana.charAt(0).toUpperCase() + semana.slice(1),
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

// agrupa a lista plana de pontos em: mês -> dia -> pontos daquele dia
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
  const [justificativas, setJustificativas] = useState<Justificativa[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const [carregandoPagina, setCarregandoPagina] = useState(true);
  const [carregandoTipo, setCarregandoTipo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [horaAtual, setHoraAtual] = useState<Date | null>(null);

  // dados do modal de justificativa aberto no momento (null = fechado)
  const [modalJustificativa, setModalJustificativa] = useState<{
    data: string; // "YYYY-MM-DD"
    tipoPonto: string;
    rotulo: string;
    justificativaExistente?: Justificativa;
  } | null>(null);
  const [motivoTexto, setMotivoTexto] = useState("");
  const [modoEdicao, setModoEdicao] = useState(false);
  const [enviandoJustificativa, setEnviandoJustificativa] = useState(false);

  // relógio em tempo real
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
      // falha silenciosa em atualização de segundo plano
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
      // falha silenciosa em atualização de segundo plano
    }
  }, []);

  const buscarJustificativas = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/justificativas");
      if (res.ok) {
        const data: Justificativa[] = await res.json();
        setJustificativas(data);
      }
    } catch {
      // falha silenciosa em atualização de segundo plano
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

        await Promise.all([
          buscarPontos(),
          buscarBancoHoras(),
          buscarJustificativas(),
        ]);
      } catch {
        router.push("/login");
      } finally {
        setCarregandoPagina(false);
      }
    }

    carregarDadosIniciais();
  }, [router, buscarPontos, buscarBancoHoras, buscarJustificativas]);

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

      const rotuloAtual =
        TIPOS_PONTO.find((t) => t.valor === tipo)?.rotulo ?? "Ponto";
      setSucesso(`${rotuloAtual} registrado com sucesso!`);
      await Promise.all([buscarPontos(), buscarBancoHoras()]);
      setMesSelecionado(chaveDoMes(new Date()));

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

  // abre o modal de justificativa para uma célula específica (dia + tipo de ponto)
  function abrirModalJustificativa(
    chaveDia: string,
    tipoPonto: string,
    rotulo: string,
    justificativaExistente?: Justificativa,
  ) {
    const eNova = !justificativaExistente;
    setModalJustificativa({ data: chaveDia, tipoPonto, rotulo, justificativaExistente });
    setMotivoTexto(justificativaExistente?.motivo ?? "");
    setModoEdicao(eNova); // se já existe, começa em modo visualização; se é nova, já em modo edição
    setErro(null);
  }

  function fecharModalJustificativa() {
    setModalJustificativa(null);
    setMotivoTexto("");
    setModoEdicao(false);
  }

  async function enviarJustificativa() {
    if (!modalJustificativa) return;

    if (motivoTexto.trim().length < 10) {
      setErro("O motivo precisa ter pelo menos 10 caracteres.");
      return;
    }

    setEnviandoJustificativa(true);
    setErro(null);

    try {
      const res = await fetch("/api/v1/justificativas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: modalJustificativa.data,
          tipoPonto: modalJustificativa.tipoPonto,
          motivo: motivoTexto.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setErro(body.erro ?? "Não foi possível enviar a justificativa.");
        return;
      }

      setSucesso("Justificativa enviada! Aguarde a análise do gestor.");
      fecharModalJustificativa();
      await buscarJustificativas();

      setTimeout(() => setSucesso(null), 4000);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviandoJustificativa(false);
    }
  }

  const agrupados = useMemo(() => agruparPontos(pontos), [pontos]);

  const meses = useMemo(() => {
    const chaves = new Set<string>();
    const hoje = new Date();
    for (let i = 0; i < 12; i++) {
      chaves.add(
        chaveDoMes(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)),
      );
    }
    for (const ponto of pontos) {
      if (ponto.criado_em) {
        chaves.add(chaveDoMes(new Date(ponto.criado_em)));
      }
    }
    return Array.from(chaves).sort().reverse();
  }, [pontos]);

  const indiceMes = mesSelecionado ? meses.indexOf(mesSelecionado) : -1;

  const dias = useMemo(() => {
    if (!mesSelecionado || !agrupados.has(mesSelecionado)) return [];
    return Array.from(agrupados.get(mesSelecionado)!.keys()).sort().reverse();
  }, [mesSelecionado, agrupados]);

  // pontos já registrados hoje
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

  // próximo tipo de ponto que ainda pode ser batido hoje (não pulado)
  const proximoTipoPermitido = useMemo(() => {
    if (!pontosHoje.has("entrada")) return "entrada";
    if (!pontosHoje.has("saida_almoco")) return "saida_almoco";
    if (!pontosHoje.has("retorno_almoco")) return "retorno_almoco";
    if (!pontosHoje.has("saida")) return "saida";
    return null;
  }, [pontosHoje]);

  // busca se já existe justificativa para uma célula (dia + tipo) específica
  function justificativaDaCelula(chaveDia: string, tipo: string) {
    return justificativas.find(
      (j) => j.data.slice(0, 10) === chaveDia && j.tipo_ponto === tipo,
    );
  }

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
      {/* cabeçalho fixo no topo */}
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
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              title="Encerrar sessão"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        {/* boas-vindas e cards de resumo */}
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

          {/* relógio e data atual */}
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

          {/* saldo total do banco de horas */}
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

        {/* mensagens de feedback */}
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

        {/* botões de registrar ponto */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold tracking-tight">Registrar ponto</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Selecione a marcação de ponto correspondente.
              </p>
            </div>
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />{" "}
              Atualização em tempo real
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TIPOS_PONTO.map(
              ({ valor, rotulo, detalhe, esperaTexto, Icon }) => {
                const pontoHoje = pontosHoje.get(valor);
                const jaRegistrado = !!pontoHoje;
                const ehProximo = valor === proximoTipoPermitido;
                const estaCarregando = carregandoTipo === valor;
                const desabilitado =
                  jaRegistrado || !ehProximo || carregandoTipo !== null;

                return (
                  <button
                    key={valor}
                    onClick={() => baterPonto(valor)}
                    disabled={desabilitado}
                    className={`group relative flex min-h-32 flex-col justify-between rounded-2xl border p-4 text-left transition-all ${jaRegistrado
                      ? "cursor-default border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                      : ehProximo
                        ? "cursor-pointer border-primary bg-card shadow-md ring-2 ring-primary/25 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 active:translate-y-0"
                        : "cursor-not-allowed border-border/60 bg-muted/20 opacity-50"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex size-10 items-center justify-center rounded-xl transition ${jaRegistrado
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : ehProximo
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {estaCarregando ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <Icon className="size-5" />
                        )}
                      </span>

                      {jaRegistrado ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <Check className="size-3" /> Registrado
                        </span>
                      ) : ehProximo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                          Próximo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
                          Bloqueado
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      <span className="block text-sm font-semibold">
                        {rotulo}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {jaRegistrado
                          ? `Às ${formatarHorario(pontoHoje.criado_em)}`
                          : ehProximo
                            ? detalhe
                            : esperaTexto}
                      </span>
                    </div>
                  </button>
                );
              },
            )}
          </div>
        </section>

        {/* histórico de registros, agrupado por mês */}
        <section>
          <div className="mb-4">
            <h2 className="font-semibold tracking-tight">
              Histórico de registros
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Consulte os registros de batidas agrupados por mês. Clique no
              ícone de balão para justificar um ponto ausente ou registrado
              incorretamente.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {/* seletor de mês */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-6">
              <button
                aria-label="Mês anterior"
                onClick={() =>
                  indiceMes < meses.length - 1 &&
                  setMesSelecionado(meses[indiceMes + 1])
                }
                disabled={indiceMes >= meses.length - 1}
                className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ArrowLeft className="size-4" />
              </button>

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

              <button
                aria-label="Próximo mês"
                onClick={() =>
                  indiceMes > 0 && setMesSelecionado(meses[indiceMes - 1])
                }
                disabled={indiceMes <= 0}
                className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>

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
                <div className="min-w-[760px]">
                  {/* cabeçalho da tabela */}
                  <div className="grid grid-cols-[140px_repeat(4,1fr)] border-b border-border bg-muted/40 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Dia</span>
                    {TIPOS_PONTO.map((tipo) => (
                      <span key={tipo.valor} className="text-center">
                        {tipo.rotulo}
                      </span>
                    ))}
                  </div>

                  {/* uma linha por dia */}
                  {dias.map((dia) => {
                    const { numero, semana } = formatarDia(dia);
                    const pontosDoDia = agrupados
                      .get(mesSelecionado!)!
                      .get(dia)!;
                    const isHoje = dia === chaveDoDia(new Date());

                    return (
                      <div
                        key={dia}
                        className={`group grid grid-cols-[140px_repeat(4,1fr)] items-center border-b border-border/70 px-6 py-4 transition-colors last:border-0 hover:bg-muted/20 ${isHoje ? "bg-primary/5" : ""
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
                          const justificativa = justificativaDaCelula(
                            dia,
                            tipo.valor,
                          );

                          return (
                            <div
                              key={tipo.valor}
                              className="flex items-center justify-center gap-1.5 text-sm"
                            >
                              {ponto ? (
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1 font-mono text-xs font-semibold text-foreground shadow-2xs">
                                  <Check className="size-3 text-emerald-500" />
                                  {formatarHorario(ponto.criado_em)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/30">
                                  —
                                </span>
                              )}

                              {justificativa ? (
                                <div className="relative flex items-center justify-center">
                                  <button
                                    onClick={() =>
                                      abrirModalJustificativa(
                                        dia,
                                        tipo.valor,
                                        tipo.rotulo,
                                        justificativa,
                                      )
                                    }
                                    className={`peer flex size-7 items-center justify-center rounded-full border font-bold transition hover:scale-110 active:scale-95 ${
                                      justificativa.status === "aprovada"
                                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                        : justificativa.status === "recusada"
                                          ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                                          : "border-amber-400/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                    }`}
                                  >
                                    <AlertCircle className="size-4" />
                                  </button>
                                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-lg opacity-0 transition-opacity duration-150 peer-hover:opacity-100">
                                    {justificativa.status === "aprovada" ? "Aprovada — clique para ver" : justificativa.status === "recusada" ? "Recusada — clique para ver" : "Pendente — clique para editar"}
                                    <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-border" />
                                  </div>
                                </div>
                              ) : (
                                <div className="relative flex items-center justify-center">
                                  <button
                                    onClick={() =>
                                      abrirModalJustificativa(
                                        dia,
                                        tipo.valor,
                                        tipo.rotulo,
                                      )
                                    }
                                    className="peer flex size-7 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-500 transition hover:scale-110 hover:border-amber-400/70 hover:bg-amber-500/20 hover:text-amber-400 active:scale-95"
                                  >
                                    <MessageSquarePlus className="size-4" />
                                  </button>
                                  {/* tooltip */}
                                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-lg opacity-0 transition-opacity duration-150 peer-hover:opacity-100">
                                    Justificar ponto
                                    <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-border" />
                                  </div>
                                </div>
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

      {/* modal de justificativa — visualização + edição */}
      {modalJustificativa && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => e.target === e.currentTarget && fecharModalJustificativa()}
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            {/* cabeçalho */}
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold">
                {modoEdicao && modalJustificativa.justificativaExistente
                  ? "Editar justificativa"
                  : modalJustificativa.justificativaExistente
                    ? "Justificativa enviada"
                    : "Justificar ponto"}
              </h3>
              <button
                onClick={fecharModalJustificativa}
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mb-4 text-xs text-muted-foreground">
              {modalJustificativa.rotulo} — dia{" "}
              {modalJustificativa.data.split("-").reverse().join("/")}
            </p>

            {/* badge de status quando há justificativa existente */}
            {modalJustificativa.justificativaExistente && !modoEdicao && (
              <div
                className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  modalJustificativa.justificativaExistente.status === "aprovada"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : modalJustificativa.justificativaExistente.status === "recusada"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-amber-500/10 text-amber-600"
                }`}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {modalJustificativa.justificativaExistente.status === "aprovada"
                  ? "Aprovada"
                  : modalJustificativa.justificativaExistente.status === "recusada"
                    ? "Recusada"
                    : "Aguardando análise"}
              </div>
            )}

            {/* motivo — modo leitura ou edição */}
            {modoEdicao ? (
              <textarea
                value={motivoTexto}
                onChange={(e) => setMotivoTexto(e.target.value)}
                placeholder="Explique o motivo (mínimo 10 caracteres)..."
                rows={4}
                autoFocus
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
              />
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground">
                {modalJustificativa.justificativaExistente?.motivo}
              </div>
            )}

            {erro && (
              <p className="mt-2 text-xs text-destructive">{erro}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              {/* modo leitura com justificativa pendente → botão editar */}
              {!modoEdicao && modalJustificativa.justificativaExistente?.status === "pendente" && (
                <button
                  onClick={() => {
                    setModoEdicao(true);
                    setErro(null);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Editar
                </button>
              )}

              {/* modo edição com justificativa existente → cancelar edição (volta a ver) */}
              {modoEdicao && modalJustificativa.justificativaExistente ? (
                <button
                  onClick={() => {
                    setModoEdicao(false);
                    setMotivoTexto(modalJustificativa.justificativaExistente!.motivo);
                    setErro(null);
                  }}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
              ) : (
                <button
                  onClick={fecharModalJustificativa}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  {modoEdicao ? "Cancelar" : "Fechar"}
                </button>
              )}

              {/* botão de envio — só aparece no modo edição */}
              {modoEdicao && (
                <button
                  onClick={enviarJustificativa}
                  disabled={enviandoJustificativa}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {enviandoJustificativa && <Loader2 className="size-4 animate-spin" />}
                  {modalJustificativa.justificativaExistente ? "Salvar alteração" : "Enviar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}