"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Fingerprint,
  Loader2,
  ShieldCheck,
} from "lucide-react";

const loginSchema = z.object({
  matricula: z
    .string()
    .trim()
    .min(1, "Matrícula é obrigatória")
    .max(6, "Matrícula deve ter no máximo 6 caracteres"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginFormData) {
    setErroApi(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/v1/sessoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json();
        setErroApi(body.erro ?? "Não foi possível fazer login");
        return;
      }
      router.push("/ponto");
    } catch {
      setErroApi("Erro de conexão. Tente novamente");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_80px_-32px_oklch(0.2_0.08_250/0.28)] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
            <div className="absolute -right-24 -top-24 size-72 rounded-full border border-primary-foreground/15" />
            <div className="absolute -bottom-36 -left-24 size-96 rounded-full border border-primary-foreground/10" />
            <div className="relative flex items-center gap-3 text-sm font-semibold tracking-wide">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground text-primary">
                <Fingerprint />
              </span>{" "}
              PONTO<span className="font-normal opacity-60">/ empresa</span>
            </div>
            <div className="relative max-w-md">
              <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground/60">
                Gestão simples, todos os dias
              </p>
              <h1 className="text-balance text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
                Seu tempo importa. Registre com confiança.
              </h1>
              <p className="mt-6 max-w-sm text-base leading-7 text-primary-foreground/70">
                Uma experiência segura e transparente para acompanhar sua
                jornada de trabalho.
              </p>
            </div>
            <div className="relative grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4">
                <Clock3 className="mb-8" />
                <p className="text-sm text-primary-foreground/65">
                  Registro rápido
                </p>
                <p className="mt-1 font-medium">Em poucos segundos</p>
              </div>
              <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4">
                <ShieldCheck className="mb-8" />
                <p className="text-sm text-primary-foreground/65">Seus dados</p>
                <p className="mt-1 font-medium">Sempre protegidos</p>
              </div>
            </div>
          </section>
          <section className="flex min-h-[620px] items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-sm">
              <div className="mb-10 lg:hidden">
                <div className="flex items-center gap-3 text-sm font-semibold tracking-wide">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Fingerprint />
                  </span>
                  PONTO{" "}
                  <span className="font-normal text-muted-foreground">
                    / empresa
                  </span>
                </div>
              </div>
              <div className="mb-8">
                <p className="mb-3 text-sm font-medium text-primary">
                  Área do funcionário
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Bem-vindo de volta
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Entre para registrar e consultar seus horários.
                </p>
              </div>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-5"
                noValidate
              >
                <div className="flex flex-col gap-2">
                  <label htmlFor="matricula" className="text-sm font-medium">
                    Matrícula
                  </label>
                  <input
                    id="matricula"
                    autoComplete="username"
                    aria-invalid={!!errors.matricula}
                    {...register("matricula")}
                    placeholder="Digite sua matrícula"
                    className="h-12 rounded-xl border border-input bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/15"
                  />
                  {errors.matricula && (
                    <p className="text-xs text-destructive">
                      {errors.matricula.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="senha" className="text-sm font-medium">
                    Senha
                  </label>
                  <input
                    id="senha"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={!!errors.senha}
                    {...register("senha")}
                    placeholder="Digite sua senha"
                    className="h-12 rounded-xl border border-input bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/15"
                  />
                  {errors.senha && (
                    <p className="text-xs text-destructive">
                      {errors.senha.message}
                    </p>
                  )}
                </div>
                {erroApi && (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  >
                    {erroApi}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={carregando}
                  className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {carregando ? (
                    <>
                      <Loader2 className="animate-spin" /> Entrando...
                    </>
                  ) : (
                    <>
                      Entrar <ArrowRight />
                    </>
                  )}
                </button>
              </form>
              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="text-primary" /> Ambiente exclusivo
                para colaboradores
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
