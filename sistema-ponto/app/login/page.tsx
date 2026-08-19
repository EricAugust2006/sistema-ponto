"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

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
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setErroApi(null);
    setCarregando(true);

    try {
      const res = await fetch("/api/v1/sessoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        setErroApi(body.erro ?? "Nao foi possível fazer login");
        return;
      }

      router.push("/ponto");
    } catch (error) {
      setErroApi("Erro de conexão. Tente novamente");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-center text-2xl font-semibold text-gray-800">
          Entrar
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="matricula"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Matrícula
            </label>

            <input
              id="matricula"
              type="text"
              {...register("matricula")}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none text-black"
            />
            {errors.matricula && (
              <p className="mt-1 text-sm text-red-600">
                {errors.matricula.message}{" "}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="senha"
              className="mb-1 block text-sm font-medium text-black"
            >
              Senha
            </label>

            <input
              id="senha"
              type="password"
              {...register("senha")}
              className="w-full rounded border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
            />
            {errors.senha && (
              <p className="mt-1 text-sm text-red-600">
                {errors.senha.message}{" "}
              </p>
            )}
          </div>

          {erroApi && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {erroApi}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
