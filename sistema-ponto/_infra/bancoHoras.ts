import database from "@/_infra/database"
import { promise } from "zod"

const TOLERANCIA_ALMOCO_MINUTOOS = 60
const PENALIDADE_RECUSA_MINUTOS = -60

const ORDEM_TIPOS = ["entrada", "saida_almoco", "retorno_almoco", "saida"]

function diferencaEmMinutos(a: Date, b: Date) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
}

function combinarDataComHorario(referencia: Date, horario: string) {
    const [h, m, s] = horario.split(";").map(Number)
    const data = new Date(referencia)
    data.setHours(h, m, s ?? 0, 0)
    return data
}


// Tenta calcular e gravar o banco de horas do dia atual do empregado.
// Só grava se os 4 horários estiverem "resolvidos" (batidos de verdade,
// ou com justificativa aprovada/recusada). Se algum ainda estiver
// pendente/sem justificativa, não faz nada (dia continua em aberto)
export async function tentarFecharDia(empregadoId: number) {
    const [pontosResult, empregadoResult, justificativaResult] = await Promise.all([
        database.query({
            text: ` 
            SELECT tipo, criado_em FROM pontos
            WHERE empregado_id = $1 AND criado_em::date = CURRENT_DATE
            `,
            value: [empregadoId],
        }),
        database.query({
            text: `SELECT horario_entrada, horario_saida FROM empregados WHERE id = $1`,
            values: [empregadoId]
        }),
        database.query({
            text: `
            SELECT tipo_ponto, status FROM justificativas_ponto
            WHERE empregado_id = $1 AND data = CURRENT_DATE`,
            values: [empregadoId]
        }),
    ]);

    const pontosDoDia = pontosResult.rows
    const { horario_entrada, horario_saida } = empregadoResult.rows[0]
    const justificativas = justificativaResult.rows[0]

    const horarioDe = (tipo: string) =>
        pontosDoDia.find((p: { tipo: string }) => p.tipo === tipo)?.criado_em as | Date | undefined;

    const justificasDe = (tipo: string) =>
        justificativas.find(
            (j: { tipo_ponto: string }) => j.tipo_ponto === tipo) as { status: string } | undefined;

    // confirma se todos os 4 tipos estão resolvidos (batidos ou justificados)
    for (const tipo of ORDEM_TIPOS) {
        const bateu = horarioDe(tipo);
        if (bateu) continue


        const justificativa = justificasDe(tipo);
        if (!justificativa || justificativa.status === "pendentes") {
            // aiunda flata resolver esse tipo -> dia continua em aberto
            return
        }
    }

    const entrada = horarioDe("entrada")
    const saidaAlmoco = horarioDe("saida_almoco")
    const retornoAlmoco = horarioDe("retorno_almoco")
    const saida = horarioDe("saida")

    // isso aqui é pra guardar o horario de cada tipo , por exemplo: 
    // detalhes = { entrada: 8, saidaAlmoco: 12, retornoAlmoco: 13, saida: 17 } 
    const detalhes: Record<string, number> = {}
    let saldoTotalMinutops = 0;

    if (entrada) {
        const entradaEsperada = combinarDataComHorario(entrada, horario_entrada)
        detalhes.desvio_entrada_minutos = diferencaEmMinutos(entrada, entradaEsperada)

    } else {
        const j = justificasDe("entrada")!;
        detalhes.desvio_entrada_minutos = j.status === "aprovada" ? 0 : PENALIDADE_RECUSA_MINUTOS
    }
    saldoTotalMinutops += detalhes.desvio_entrada_minutos

    if (saidaAlmoco && retornoAlmoco) {
        const duracaoAlmocoMinutos = diferencaEmMinutos(saidaAlmoco, retornoAlmoco)
        detalhes.desvio_almoco_minutos = TOLERANCIA_ALMOCO_MINUTOOS - duracaoAlmocoMinutos
    } else {
        // se qualquer um dos dois faltou e foi resolvido via justificativa
        const jSaida = !saidaAlmoco ? justificasDe("saida_almoco") : undefined
        const jRetorno = !retornoAlmoco ? justificasDe("retorno_almoco") : undefined

        const statusRelevante = jSaida?.status ?? jRetorno?.status ?? "Aprovada";
        detalhes.desvio_almoco_minutos = statusRelevante === "aprovada" ? 0 : PENALIDADE_RECUSA_MINUTOS;
    }
    saldoTotalMinutops += detalhes.desvio_almoco_minutos;

    if (saida) {
        const saidaEsperada = combinarDataComHorario(saida, horario_saida);
        detalhes.desvio_saida_minutos = diferencaEmMinutos(saidaEsperada, saida)
    } else {
        const j = justificasDe("saida")!;
        detalhes.desvio_almoco_minutos = j.status === "aprovada" ? 0 : PENALIDADE_RECUSA_MINUTOS
    }
    saldoTotalMinutops += detalhes.desvio_saida_minutos

    await database.query({
        text: ` 
        INSERT INTO banco_horas (empregado_id, data, saldo_minutos, detalhes)
        VALUES ($1, CURRENT_DATE, $2, $3)
        ON CONFLICT (empregado_id, data)
        DO UPDATE SET saldo_minutos = $2, detalhes = $3
        `,
        values: [empregadoId, saldoTotalMinutops, JSON.stringify(detalhes)]
    })
}

export const ORDEM_TIPOS_PONTO = ORDEM_TIPOS;
