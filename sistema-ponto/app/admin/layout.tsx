"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Empregado {
    id: number;
    nome: string;
    papel: "empregado" | "admin" | "gestor";
}

export default function adminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [autorizado, setAutorizado] = useState(false);
    const [verificando, setVerificando] = useState(true);

    useEffect(() => {
        async function verificarAcesso() {
            try {
                const res = await fetch("/api/v1/sessoes");

                if (!res.ok) {
                    router.push("/login");
                    return
                }

                const body = await res.json();
                const empregado: Empregado = body.empregado;

                if (empregado.papel !== "gestor" && empregado.papel !== "admin") {
                    router.push("/ponto")
                    return;
                }

                setAutorizado(true)
            } catch {
                router.push("/login")
            } finally {
                setVerificando(false)
            }
        }
        verificarAcesso()
    }, [router])

    if (verificando || !autorizado) {
        return <>
            <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="size-5 animate-spin text-primary" /> Verificando permissão...
                </div>
            </main>
        </>
    }

    return <>{children}</>
}