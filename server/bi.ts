import { z } from "zod";
import { sql, type SQL } from "drizzle-orm";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { isPlatformUser } from "@shared/permissions";

// Datas gravadas em UTC (timestamp sem fuso) são convertidas para o dia no fuso de Brasília.
const TZ = "America/Sao_Paulo";
const localDay = (column: string) => sql.raw(`(("${column}" AT TIME ZONE 'UTC') AT TIME ZONE '${TZ}')::date`);

const periodInput = z
  .object({
    inicio: z.iso.date(),
    fim: z.iso.date(),
    agrupamento: z.enum(["dia", "semana", "mes"]).default("mes"),
  })
  .refine((v) => v.inicio <= v.fim, { message: "A data inicial deve ser anterior ou igual à final." })
  .refine((v) => Date.parse(v.fim) - Date.parse(v.inicio) <= 5 * 366 * 86_400_000, {
    message: "Escolha um período de até 5 anos.",
  });

type Periodo = z.infer<typeof periodInput>;
type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const TRUNC: Record<Periodo["agrupamento"], { trunc: string; step: string }> = {
  dia: { trunc: "day", step: "1 day" },
  semana: { trunc: "week", step: "1 week" },
  mes: { trunc: "month", step: "1 month" },
};

async function rows<T>(db: Db, query: SQL): Promise<T[]> {
  const result: any = await db.execute(query);
  return (result.rows ?? result) as T[];
}

const num = (value: unknown) => Number(value ?? 0);
const media = (value: unknown) => (value === null || value === undefined ? null : Math.round(Number(value) * 10) / 10);

async function buildReport(db: Db, companyId: number | null, p: Periodo) {
  const empresa = companyId ? sql`AND "companyId" = ${companyId}` : sql``;
  const noPeriodo = (column: string) => sql`${localDay(column)} BETWEEN ${p.inicio}::date AND ${p.fim}::date`;
  const { trunc, step } = TRUNC[p.agrupamento];

  const [solic] = await rows<any>(db, sql`
    SELECT
      count(*) FILTER (WHERE ${noPeriodo("createdAt")}) AS abertas,
      count(*) FILTER (WHERE status = 'concluido' AND "concluidoAt" IS NOT NULL AND ${noPeriodo("concluidoAt")}) AS concluidas,
      count(*) FILTER (WHERE status = 'rejeitado' AND ${noPeriodo("updatedAt")}) AS rejeitadas,
      count(*) FILTER (WHERE status NOT IN ('concluido','rejeitado')) AS em_andamento_hoje,
      avg(GREATEST(0, EXTRACT(EPOCH FROM ("concluidoAt" - "createdAt")) / 86400))
        FILTER (WHERE status = 'concluido' AND "concluidoAt" IS NOT NULL AND ${noPeriodo("concluidoAt")}) AS tempo_medio
    FROM smartdocplan.requests WHERE true ${empresa}`);
  const solicPorStatus = await rows<any>(db, sql`
    SELECT status, count(*) AS total FROM smartdocplan.requests
    WHERE ${noPeriodo("createdAt")} ${empresa} GROUP BY status ORDER BY total DESC`);
  const solicPorTipo = await rows<any>(db, sql`
    SELECT tipo, count(*) AS total FROM smartdocplan.requests
    WHERE ${noPeriodo("createdAt")} ${empresa} GROUP BY tipo ORDER BY total DESC`);

  const [cham] = await rows<any>(db, sql`
    SELECT
      count(*) FILTER (WHERE ${noPeriodo("createdAt")}) AS abertos,
      count(*) FILTER (WHERE "resolvidoAt" IS NOT NULL AND ${noPeriodo("resolvidoAt")}) AS resolvidos,
      count(*) FILTER (WHERE status IN ('aberto','em_atendimento','aguardando_cliente')) AS pendentes_hoje,
      avg(GREATEST(0, EXTRACT(EPOCH FROM ("resolvidoAt" - "createdAt")) / 86400))
        FILTER (WHERE "resolvidoAt" IS NOT NULL AND ${noPeriodo("resolvidoAt")}) AS tempo_medio
    FROM smartdocplan.tickets WHERE true ${empresa}`);
  const chamPorStatus = await rows<any>(db, sql`
    SELECT status, count(*) AS total FROM smartdocplan.tickets
    WHERE ${noPeriodo("createdAt")} ${empresa} GROUP BY status ORDER BY total DESC`);
  const chamPorTipo = await rows<any>(db, sql`
    SELECT tipo, count(*) AS total FROM smartdocplan.tickets
    WHERE ${noPeriodo("createdAt")} ${empresa} GROUP BY tipo ORDER BY total DESC`);

  const [colab] = await rows<any>(db, sql`
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE status = 'ativo') AS ativos,
      count(*) FILTER (WHERE status = 'afastado') AS afastados,
      count(*) FILTER (WHERE status = 'desligado') AS desligados,
      count(*) FILTER (WHERE "dataAdmissao" BETWEEN ${p.inicio}::date AND ${p.fim}::date) AS admissoes
    FROM smartdocplan.employees WHERE true ${empresa}`);

  const hoje = sql.raw(`(now() AT TIME ZONE '${TZ}')::date`);
  const [docsEmpresa] = await rows<any>(db, sql`
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE validade < ${hoje}) AS vencidos,
      count(*) FILTER (WHERE validade BETWEEN ${hoje} AND ${hoje} + 30) AS a_vencer
    FROM (
      -- Só a versão atual de cada documento fixo da empresa (versões antigas e mensais ficam de fora).
      SELECT DISTINCT ON ("companyId", tipo) validade
      FROM smartdocplan.company_documents
      WHERE "recurringTypeId" IS NULL ${empresa}
      ORDER BY "companyId", tipo, "createdAt" DESC, id DESC
    ) atuais`);
  const [docsColab] = await rows<any>(db, sql`
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE validade < ${hoje}) AS vencidos,
      count(*) FILTER (WHERE validade BETWEEN ${hoje} AND ${hoje} + 30) AS a_vencer,
      count(*) FILTER (WHERE ${noPeriodo("createdAt")}) AS enviados
    FROM smartdocplan.employee_documents WHERE status <> 'excluido' ${empresa}`);

  const [ferias] = await rows<any>(db, sql`
    SELECT
      count(*) FILTER (WHERE status = 'aprovado' AND "startDate" BETWEEN ${p.inicio}::date AND ${p.fim}::date) AS aprovadas,
      count(*) FILTER (WHERE status = 'pendente') AS pendentes_hoje
    FROM smartdocplan.vacations WHERE true ${empresa}`);

  const serie = await rows<any>(db, sql`
    WITH buckets AS (
      SELECT generate_series(
        date_trunc(${trunc}, ${p.inicio}::date),
        date_trunc(${trunc}, ${p.fim}::date),
        ${step}::interval
      )::date AS periodo
    )
    SELECT b.periodo,
      (SELECT count(*) FROM smartdocplan.requests r WHERE date_trunc(${trunc}, ${localDay("createdAt")})::date = b.periodo
         AND ${noPeriodo("createdAt")} ${companyId ? sql`AND r."companyId" = ${companyId}` : sql``}) AS solicitacoes_abertas,
      (SELECT count(*) FROM smartdocplan.requests r WHERE r.status = 'concluido' AND r."concluidoAt" IS NOT NULL
         AND date_trunc(${trunc}, ${localDay("concluidoAt")})::date = b.periodo
         AND ${noPeriodo("concluidoAt")} ${companyId ? sql`AND r."companyId" = ${companyId}` : sql``}) AS solicitacoes_concluidas,
      (SELECT count(*) FROM smartdocplan.tickets t WHERE date_trunc(${trunc}, ${localDay("createdAt")})::date = b.periodo
         AND ${noPeriodo("createdAt")} ${companyId ? sql`AND t."companyId" = ${companyId}` : sql``}) AS chamados_abertos,
      (SELECT count(*) FROM smartdocplan.tickets t WHERE t."resolvidoAt" IS NOT NULL
         AND date_trunc(${trunc}, ${localDay("resolvidoAt")})::date = b.periodo
         AND ${noPeriodo("resolvidoAt")} ${companyId ? sql`AND t."companyId" = ${companyId}` : sql``}) AS chamados_resolvidos
    FROM buckets b ORDER BY b.periodo`);

  return {
    periodo: p,
    geradoEm: new Date().toISOString(),
    solicitacoes: {
      abertas: num(solic?.abertas),
      concluidas: num(solic?.concluidas),
      rejeitadas: num(solic?.rejeitadas),
      emAndamentoHoje: num(solic?.em_andamento_hoje),
      tempoMedioConclusaoDias: media(solic?.tempo_medio),
      porStatus: solicPorStatus.map((r) => ({ chave: String(r.status), total: num(r.total) })),
      porTipo: solicPorTipo.map((r) => ({ chave: String(r.tipo), total: num(r.total) })),
    },
    chamados: {
      abertos: num(cham?.abertos),
      resolvidos: num(cham?.resolvidos),
      pendentesHoje: num(cham?.pendentes_hoje),
      tempoMedioResolucaoDias: media(cham?.tempo_medio),
      porStatus: chamPorStatus.map((r) => ({ chave: String(r.status), total: num(r.total) })),
      porTipo: chamPorTipo.map((r) => ({ chave: String(r.tipo), total: num(r.total) })),
    },
    colaboradores: {
      total: num(colab?.total),
      ativos: num(colab?.ativos),
      afastados: num(colab?.afastados),
      desligados: num(colab?.desligados),
      admissoesNoPeriodo: num(colab?.admissoes),
    },
    documentos: {
      empresa: { total: num(docsEmpresa?.total), vencidos: num(docsEmpresa?.vencidos), aVencer30: num(docsEmpresa?.a_vencer) },
      colaboradores: {
        total: num(docsColab?.total),
        vencidos: num(docsColab?.vencidos),
        aVencer30: num(docsColab?.a_vencer),
        enviadosNoPeriodo: num(docsColab?.enviados),
      },
    },
    ferias: { aprovadasNoPeriodo: num(ferias?.aprovadas), pendentesHoje: num(ferias?.pendentes_hoje) },
    serie: serie.map((r) => ({
      periodo: String(r.periodo instanceof Date ? r.periodo.toISOString().slice(0, 10) : r.periodo).slice(0, 10),
      solicitacoesAbertas: num(r.solicitacoes_abertas),
      solicitacoesConcluidas: num(r.solicitacoes_concluidas),
      chamadosAbertos: num(r.chamados_abertos),
      chamadosResolvidos: num(r.chamados_resolvidos),
    })),
  };
}

export const biRouter = router({
  company: protectedProcedure
    .input(z.object({ companyId: z.number() }).and(periodInput))
    .query(async ({ ctx, input }) => {
      if (!isPlatformUser(ctx.user.role) && ctx.user.companyId !== input.companyId) {
        throw new Error("Acesso negado");
      }
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      const [empresa] = await rows<any>(db, sql`
        SELECT id, "razaoSocial", "nomeFantasia", cnpj, "logoUrl" FROM smartdocplan.companies WHERE id = ${input.companyId}`);
      if (!empresa) throw new Error("Empresa não encontrada");
      const { companyId, ...periodo } = input;
      return {
        empresa: {
          id: num(empresa.id),
          nome: empresa.nomeFantasia || empresa.razaoSocial,
          razaoSocial: String(empresa.razaoSocial),
          cnpj: empresa.cnpj ?? null,
          logoUrl: empresa.logoUrl ?? null,
        },
        ...(await buildReport(db, companyId, periodo)),
      };
    }),

  global: adminProcedure.input(periodInput).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const noPeriodo = (column: string) => sql`${localDay(column)} BETWEEN ${input.inicio}::date AND ${input.fim}::date`;
    const [empresas] = await rows<any>(db, sql`
      SELECT count(*) AS total,
        count(*) FILTER (WHERE status = 'ativo') AS ativas,
        count(*) FILTER (WHERE ${noPeriodo("createdAt")}) AS novas
      FROM smartdocplan.companies`);
    const ranking = await rows<any>(db, sql`
      SELECT c.id, coalesce(c."nomeFantasia", c."razaoSocial") AS nome,
        (SELECT count(*) FROM smartdocplan.requests r WHERE r."companyId" = c.id
           AND ((r."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ})::date BETWEEN ${input.inicio}::date AND ${input.fim}::date) AS solicitacoes,
        (SELECT count(*) FROM smartdocplan.requests r WHERE r."companyId" = c.id AND r.status = 'concluido' AND r."concluidoAt" IS NOT NULL
           AND ((r."concluidoAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ})::date BETWEEN ${input.inicio}::date AND ${input.fim}::date) AS concluidas,
        (SELECT count(*) FROM smartdocplan.tickets t WHERE t."companyId" = c.id
           AND ((t."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ})::date BETWEEN ${input.inicio}::date AND ${input.fim}::date) AS chamados,
        (SELECT count(*) FROM smartdocplan.employees e WHERE e."companyId" = c.id AND e.status = 'ativo') AS colaboradores_ativos
      FROM smartdocplan.companies c
      ORDER BY solicitacoes DESC, chamados DESC, nome
      LIMIT 20`);
    return {
      empresas: { total: num(empresas?.total), ativas: num(empresas?.ativas), novasNoPeriodo: num(empresas?.novas) },
      ranking: ranking.map((r) => ({
        companyId: num(r.id),
        nome: String(r.nome),
        solicitacoes: num(r.solicitacoes),
        concluidas: num(r.concluidas),
        chamados: num(r.chamados),
        colaboradoresAtivos: num(r.colaboradores_ativos),
      })),
      ...(await buildReport(db, null, input)),
    };
  }),
});
