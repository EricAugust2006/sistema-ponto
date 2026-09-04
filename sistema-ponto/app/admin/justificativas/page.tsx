"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";

type StatusJustificativa = "pendente" | "aprovada" | "recusada";

type Justificativa = {
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

const ROTULOS_TIPO: Record<string, string> = {
  entrada: "Entrada",
  saida_almoco: "Saída almoço",
  retorno_almoco: "Volta almoço",
  saida: "Saída",
};

const FILTROS = [
  { valor: "pendente" as const, rotulo: "Pendentes" },
  { valor: "aprovada" as const, rotulo: "Aprovadas" },
  { valor: "recusada" as const, rotulo: "Recusadas" },
  { valor: "todas" as const, rotulo: "Todas" },
];

function formatarData(dataIso: string) {
  return new Date(dataIso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminJustificativasPage() {
  const router = useRouter();
  const [justificativas, setJustificativas] = useState<Justificativa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<"pendente" | "aprovada" | "recusada" | "todas">("pendente");
  const [processandoId, setProcessandoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const buscarJustificativas = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/justificativas");
      if (res.ok) {
        const data: Justificativa[] = await res.json();
        setJustificativas(data);
      }
    } catch {
      setErro("Não foi possível carregar as justificativas.");
    }
  }, []);

  useEffect(() => {
    async function carregar() {
      await buscarJustificativas();
      setCarregando(false);
    }
    carregar();
  }, [buscarJustificativas]);

  async function analisar(id: number, status: "aprovada" | "recusada") {
    setProcessandoId(id);
    setErro(null);
    setSucesso(null);

    try {
      const res = await fetch("/api/v1/justificativas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (!res.ok) {
        const body = await res.json();
        setErro(body.erro ?? "Não foi possível analisar a justificativa.");
        return;
      }

      setSucesso(
        status === "aprovada"
          ? "Justificativa aprovada com sucesso."
          : "Justificativa recusada.",
      );
      await buscarJustificativas();

      setTimeout(() => setSucesso(null), 4000);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setProcessandoId(null);
    }
  }

  const listaFiltrada = useMemo(() => {
    if (filtro === "todas") return justificativas;
    return justificativas.filter((j) => j.status === filtro);
  }, [justificativas, filtro]);

  const contagemPendentes = useMemo(
    () => justificativas.filter((j) => j.status === "pendente").length,
    [justificativas],
  );

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" /> Carregando
          justificativas...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-wide">
                ADMIN{" "}
                <span className="font-normal text-muted-foreground">
                  / justificativas
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Painel de aprovação de pontos
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/ponto")}
            className="rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Voltar ao painel
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Justificativas de ponto
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {contagemPendentes > 0
                ? `${contagemPendentes} justificativa(s) aguardando análise.`
                : "Nenhuma justificativa pendente no momento."}
            </p>
          </div>
        </div>

        {erro && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3.5 text-sm text-destructive"
          >
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div
            role="status"
            className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3.5 text-sm text-emerald-700 dark:text-emerald-300"
          >
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{sucesso}</span>
          </div>
        )}

        {/* filtro por status */}
        <div className="mb-4 flex gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                filtro === f.valor
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.rotulo}
              {f.valor === "pendente" && contagemPendentes > 0 && (
                <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px]">
                  {contagemPendentes}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* lista de justificativas */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {listaFiltrada.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Clock3 className="size-6" />
              </span>
              <p className="text-sm font-medium">
                Nenhuma justificativa neste filtro.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/70">
              {listaFiltrada.map((j) => (
                <div key={j.id} className="flex flex-col gap-3 px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {j.empregado_nome}{" "}
                        <span className="font-normal text-muted-foreground">
                          (matrícula {j.matricula})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ROTULOS_TIPO[j.tipo_ponto] ?? j.tipo_ponto} — dia{" "}
                        {formatarData(j.data)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        j.status === "aprovada"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : j.status === "recusada"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {j.status === "pendente"
                        ? "Pendente"
                        : j.status === "aprovada"
                          ? "Aprovada"
                          : "Recusada"}
                    </span>
                  </div>

                  <p className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-foreground">
                    {j.motivo}
                  </p>

                  {j.observacao_analise && (
                    <p className="text-xs text-muted-foreground">
                      Observação do gestor: {j.observacao_analise}
                    </p>
                  )}

                  {j.status === "pendente" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => analisar(j.id, "aprovada")}
                        disabled={processandoId !== null}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {processandoId === j.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                        Aprovar
                      </button>
                      <button
                        onClick={() => analisar(j.id, "recusada")}
                        disabled={processandoId !== null}
                        className="flex items-center gap-1.5 rounded-xl border border-destructive/30 px-3.5 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
                      >
                        {processandoId === j.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <X className="size-3.5" />
                        )}
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
