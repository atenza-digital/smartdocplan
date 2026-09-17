import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import express from "express";
import type { Server } from "node:http";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { uploadRoot } from "./uploadFiles";
import { notifyVacationDeadlines } from "./vacations";
import { runPostgresMigrations } from "./_core/postgresMigrations";
import { registerDocumentAccess } from "./documentAccess";
import type { TrpcContext } from "./_core/context";

const auth = vi.hoisted(() => ({ user: null as any }));
vi.mock("./_core/localAuth", () => ({
  getUserFromLocalSession: async () => auth.user,
}));
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("Minuta - PostgreSQL e isolamento de documentos", () => {
  let pool: Pool;
  let server: Server;
  let origin: string;
  let companyId: number;
  let otherCompany: number;
  let positionId: number;
  let employeeId: number;
  let templateId: number;
  let ruleId: number;
  let requestId: number;
  let contractId: number;
  let healthFileId: number;
  let healthUrl: string;
  let vacation: any;
  const dates = {
    acquisitionStart: "2025-01-01",
    acquisitionEnd: "2025-12-31",
    startDate: "2027-01-04",
    endDate: "2027-01-18",
    concessionDeadline: "2026-10-01",
  };
  const fileUrls: string[] = [];
  const previousUrl = process.env.DATABASE_URL;
  const ctx = (role = "platform_admin", company: number | null = null) =>
    ({
      user: {
        id: 1,
        name: "Pessoa Teste",
        role,
        companyId: company,
        ativo: true,
      },
      req: { headers: {} },
      res: {},
    }) as TrpcContext;
  const caller = (role = "platform_admin", company: number | null = null) =>
    appRouter.createCaller(ctx(role, company));

  beforeAll(async () => {
    const parsed = new URL(url!);
    if (
      !parsed.pathname.endsWith("_test") ||
      !["localhost", "127.0.0.1"].includes(parsed.hostname)
    )
      throw new Error(
        "Use somente um banco local dedicado com nome terminado em _test."
      );
    process.env.DATABASE_URL = url;
    pool = new Pool({ connectionString: url });
    const present = await pool.query(
      "SELECT to_regclass('smartdocplan.companies') AS table_name"
    );
    if (!present.rows[0].table_name) {
      await pool.query("CREATE SCHEMA IF NOT EXISTS smartdocplan");
      await pool.query(
        await readFile(resolve("drizzle/0000_sleepy_cargill.sql"), "utf8")
      );
    }
    await runPostgresMigrations(url);
    await runPostgresMigrations(url);
    companyId = (
      await pool.query(
        `INSERT INTO smartdocplan.companies ("razaoSocial") VALUES ('Empresa Minuta Teste') RETURNING id`
      )
    ).rows[0].id;
    otherCompany = (
      await pool.query(
        `INSERT INTO smartdocplan.companies ("razaoSocial") VALUES ('Outra Empresa Teste') RETURNING id`
      )
    ).rows[0].id;
    positionId = (
      await pool.query(
        `INSERT INTO smartdocplan.positions ("companyId",nome) VALUES ($1,'Assistente Teste') RETURNING id`,
        [companyId]
      )
    ).rows[0].id;
    employeeId = (
      await pool.query(
        `INSERT INTO smartdocplan.employees ("companyId",nome,cpf) VALUES ($1,'Pessoa Teste','529.982.247-25') RETURNING id`,
        [companyId]
      )
    ).rows[0].id;
    templateId = (
      await pool.query(
        `INSERT INTO smartdocplan.document_type_templates ("tipoSolicitacao",nome,categoria) VALUES ('admissao','ASO Teste','exame_medico') RETURNING id`
      )
    ).rows[0].id;
    ruleId = (
      await pool.query(
        `INSERT INTO smartdocplan.position_requirements ("positionId","documentoNome",categoria,"tipoSolicitacao") VALUES ($1,'Treinamento Teste','treinamento','admissao') RETURNING id`,
        [positionId]
      )
    ).rows[0].id;
    const app = express();
    registerDocumentAccess(app);
    server = await new Promise<Server>(resolveServer => {
      const s = app.listen(0, "127.0.0.1", () => resolveServer(s));
    });
    origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  }, 30000);
  afterAll(async () => {
    await new Promise<void>(r => server?.close(() => r()) ?? r());
    for (const file of fileUrls)
      await unlink(
        resolve(uploadRoot(), file.replace(/^\/uploads\//, ""))
      ).catch(() => {});
    await pool?.end();
    const db = await getDb();
    await (db as any)?.$client?.end();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });

  it("aplica migração uma única vez", async () => {
    expect(
      (
        await pool.query(
          `SELECT count(*) FROM smartdocplan.app_migrations WHERE name='20260917_minuta.sql'`
        )
      ).rows[0].count
    ).toBe("1");
  });
  it("grava datas de nascimento e admissão como datas PostgreSQL", async () => {
    await caller().employees.create({ companyId, nome: "Pessoa Datas Teste", cpf: "11144477735", dataNascimento: "2000-02-29", dataAdmissao: "2025-01-01" });
    const employee = (await caller().employees.list({companyId})).find(e => e.nome === "Pessoa Datas Teste")!;
    expect(employee.dataNascimento).toBe("2000-02-29");
    expect(employee.dataAdmissao).toBe("2025-01-01");
  });
  it("grava, altera e limpa datas dos documentos da empresa", async () => {
    const created = await caller().companyDocuments.create({ companyId, tipo: "contrato_social", nome: "Documento Datas Teste", dataEmissao: "2026-01-01", validade: "2027-01-01", fileNome: "teste.pdf", fileBase64: Buffer.from("%PDF-1.4\n%%EOF").toString("base64") });
    fileUrls.push(created.fileUrl);
    const doc = (await caller().companyDocuments.listByCompany({companyId})).find(d => d.fileUrl === created.fileUrl)!;
    expect(doc.dataEmissao).toBe("2026-01-01");
    await caller().companyDocuments.update({id:doc.id,dataEmissao:"2026-02-01",validade:""});
    const updated = (await caller().companyDocuments.listByCompany({companyId})).find(d => d.id === doc.id)!;
    expect(updated.dataEmissao).toBe("2026-02-01");
    expect(updated.validade).toBeNull();
    auth.user = ctx("company_hr",companyId).user;
    expect((await fetch(origin + created.fileUrl)).status).toBe(200);
    auth.user = ctx("company_hr",otherCompany).user;
    expect((await fetch(origin + created.fileUrl)).status).toBe(404);
  });
  it("mantém contratos, unidades e obras separados e auditados", async () => {
    for (const kind of ["contrato", "unidade", "obra"] as const) {
      const created = await caller().organization.create({
        companyId,
        kind,
        nome: `Cadastro ${kind}`,
      });
      expect(created.id).toBeGreaterThan(0);
      if (kind === "contrato") contractId = created.id;
      expect(
        (
          await caller("company_hr", companyId).organization.list({
            companyId,
            kind,
          })
        ).some(r => r.id === created.id)
      ).toBe(true);
      await expect(
        caller("company_hr", otherCompany).organization.list({
          companyId,
          kind,
        })
      ).rejects.toThrow();
      await expect(
        caller("company_viewer", companyId).organization.update({
          id: created.id,
          kind,
          nome: "Alteração negada",
        })
      ).rejects.toThrow();
    }
  });
  it("impede vínculos entre empresas sem criar solicitação parcial", async () => {
    const before = await pool.query(
      `SELECT count(*) FROM smartdocplan.requests`
    );
    await expect(
      caller().requests.create({
        companyId: otherCompany,
        positionId,
        employeeId,
        tipo: "admissao",
        titulo: "Vínculo inválido",
      })
    ).rejects.toThrow("não pertence");
    expect(
      (await pool.query(`SELECT count(*) FROM smartdocplan.requests`)).rows
    ).toEqual(before.rows);
  });
  it("cria solicitação com ID PostgreSQL, contexto e checklist persistidos", async () => {
    const created = await caller().requests.create({
      companyId,
      employeeId,
      positionId,
      contractId,
      tipo: "admissao",
      titulo: "Admissão Pessoa Teste",
    });
    requestId = created.id;
    expect(requestId).toBeGreaterThan(0);
    const request = await caller().requests.get({ id: requestId });
    expect(JSON.parse(request!.contextSnapshot!).contrato.id).toBe(contractId);
    const docs = await caller().requestDocUploads.listByRequest({ requestId });
    expect(
      docs.some(d => d.nome === "Treinamento Teste" && d.obrigatorio)
    ).toBe(true);
    healthFileId = docs.find(d => d.templateId === templateId)!.id;
  });
  it("alterações na matriz não mudam o histórico da solicitação", async () => {
    await pool.query(
      `UPDATE smartdocplan.position_requirements SET "documentoNome"='Treinamento Novo' WHERE id=$1`,
      [ruleId]
    );
    await pool.query(
      `UPDATE smartdocplan.document_type_templates SET nome='ASO Novo' WHERE id=$1`,
      [templateId]
    );
    expect(
      (await caller().requestDocUploads.templates({ requestId })).find(
        t => t.id === templateId
      )?.nome
    ).toBe("ASO Teste");
    const req = await caller().requests.get({ id: requestId });
    expect(
      JSON.parse(req!.requirementsSnapshot!).positionRequirements[0]
        .documentoNome
    ).toBe("Treinamento Teste");
  });
  it("inativa sem apagar histórico e impede novos vínculos inativos", async () => {
    await caller().organization.update({
      kind: "contrato",
      id: contractId,
      nome: "Contrato Inativo",
      status: "inativo",
    });
    expect(
      (await caller().organization.list({ companyId, kind: "contrato" })).some(
        r => r.id === contractId
      )
    ).toBe(false);
    expect(
      (
        await caller().organization.list({
          companyId,
          kind: "contrato",
          includeInactive: true,
        })
      ).some(r => r.id === contractId)
    ).toBe(true);
    await expect(
      caller().requests.create({
        companyId,
        contractId,
        tipo: "admissao",
        titulo: "Teste",
      })
    ).rejects.toThrow("não está ativo");
    expect(
      JSON.parse(
        (await caller().requests.get({ id: requestId }))!.contextSnapshot!
      ).contrato.nome
    ).toBe("Cadastro contrato");
  });
  it("restringe saúde ao Administrador Geral e RH da própria empresa", async () => {
    const denied = [
      "company_admin",
      "company_manager",
      "company_viewer",
      "platform_analyst",
      "platform_auditor",
    ];
    for (const role of denied) {
      expect(
        (
          await caller(role, companyId).requestDocUploads.listByRequest({
            requestId,
          })
        ).some(d => d.id === healthFileId)
      ).toBe(false);
      await expect(
        caller(role, companyId).requests.create({
          companyId,
          tipo: "atestado_medico",
          titulo: "Restrito",
        })
      ).rejects.toThrow();
    }
    expect(
      (
        await caller("company_hr", companyId).requestDocUploads.listByRequest({
          requestId,
        })
      ).some(d => d.id === healthFileId)
    ).toBe(true);
    expect(
      await caller("company_hr", otherCompany).requestDocUploads.listByRequest({
        requestId,
      })
    ).toEqual([]);
  });
  it("upload mantém obrigatoriedade, datas e controla acesso pela URL direta", async () => {
    const buffer = Buffer.from("%PDF-1.4\n%%EOF");
    const uploaded = await caller(
      "company_hr",
      companyId
    ).requestDocUploads.upload({
      requestId,
      templateId,
      nome: "ASO Teste",
      categoria: "exame_medico",
      obrigatorio: false,
      dataEmissao: "2026-09-17",
      validade: "2027-09-17",
      fileNome: "teste.pdf",
      fileMime: "application/pdf",
      fileTamanho: buffer.length,
      fileBase64: buffer.toString("base64"),
    });
    healthUrl = uploaded.fileUrl;
    fileUrls.push(healthUrl);
    const doc = (
      await caller().requestDocUploads.listByRequest({ requestId })
    ).find(d => d.id === healthFileId)!;
    expect(doc.obrigatorio).toBe(true);
    expect(doc.dataEmissao).toBe("2026-09-17");
    auth.user = null;
    expect((await fetch(origin + healthUrl)).status).toBe(401);
    auth.user = ctx("company_admin", companyId).user;
    expect((await fetch(origin + healthUrl)).status).toBe(404);
    auth.user = ctx("company_hr", otherCompany).user;
    expect((await fetch(origin + healthUrl)).status).toBe(404);
    auth.user = ctx("company_hr", companyId).user;
    const response = await fetch(origin + healthUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("remover anexo preserva requisito e revoga URL", async () => {
    await caller().requestDocUploads.delete({ id: healthFileId });
    const doc = (
      await caller().requestDocUploads.listByRequest({ requestId })
    ).find(d => d.id === healthFileId)!;
    expect(doc.fileUrl).toBeNull();
    expect(doc.obrigatorio).toBe(true);
    expect((await fetch(origin + healthUrl)).status).toBe(404);
  });
  it("férias valida empresa, perfil, datas e colaborador antes de criar", async () => {
    await expect(
      caller("company_viewer", companyId).vacations.create({
        ...dates,
        companyId,
        employeeId,
      })
    ).rejects.toThrow();
    await expect(
      caller("company_hr", otherCompany).vacations.create({
        ...dates,
        companyId,
        employeeId,
      })
    ).rejects.toThrow();
    await expect(
      caller().vacations.create({
        ...dates,
        companyId: otherCompany,
        employeeId,
      })
    ).rejects.toThrow();
    await expect(
      caller().vacations.create({
        ...dates,
        companyId,
        employeeId,
        endDate: "2026-01-01",
      })
    ).rejects.toThrow("anterior");
    vacation = await caller("company_hr", companyId).vacations.create({
      ...dates,
      companyId,
      employeeId,
    });
    expect(vacation.status).toBe("rascunho");
    await expect(
      caller("company_hr", otherCompany).vacations.list({ companyId })
    ).rejects.toThrow();
    await expect(
      caller("company_hr", otherCompany).vacations.history({ id: vacation.id })
    ).rejects.toThrow();
  });
  it("férias bloqueia sobreposição, envio sem aviso e arquivo inválido", async () => {
    await expect(
      caller().vacations.create({ ...dates, companyId, employeeId })
    ).rejects.toThrow("Já existe");
    await expect(
      caller().vacations.transition({
        id: vacation.id,
        revision: vacation.revision,
        action: "enviar",
      })
    ).rejects.toThrow("Anexe");
    await expect(
      caller().vacations.uploadNotice({
        id: vacation.id,
        revision: vacation.revision,
        fileName: "falso.pdf",
        base64: Buffer.from("not a pdf").toString("base64"),
      })
    ).rejects.toThrow();
  });
  it("férias anexa aviso privado e rejeita revisão obsoleta", async () => {
    const previous = vacation.revision;
    vacation = await caller("company_hr", companyId).vacations.uploadNotice({
      id: vacation.id,
      revision: previous,
      fileName: "aviso.pdf",
      base64: Buffer.from("%PDF-1.4\n%%EOF").toString("base64"),
    });
    fileUrls.push(vacation.noticeFileUrl);
    await expect(
      caller().vacations.transition({
        id: vacation.id,
        revision: previous,
        action: "enviar",
      })
    ).rejects.toThrow("outra pessoa");
    auth.user = null;
    expect((await fetch(origin + vacation.noticeFileUrl)).status).toBe(401);
    auth.user = ctx("company_hr", otherCompany).user;
    expect((await fetch(origin + vacation.noticeFileUrl)).status).toBe(404);
    auth.user = ctx("company_hr", companyId).user;
    expect((await fetch(origin + vacation.noticeFileUrl)).status).toBe(200);
  });
  it("férias exige avaliação SmartDocPlan e motivo de devolução", async () => {
    vacation = await caller("company_hr", companyId).vacations.transition({
      id: vacation.id,
      revision: vacation.revision,
      action: "enviar",
    });
    expect(vacation.status).toBe("pendente");
    await expect(
      caller("company_hr", companyId).vacations.transition({
        id: vacation.id,
        revision: vacation.revision,
        action: "aprovar",
      })
    ).rejects.toThrow("SmartDocPlan");
    await expect(
      caller().vacations.transition({
        id: vacation.id,
        revision: vacation.revision,
        action: "devolver",
      })
    ).rejects.toThrow("motivo");
    vacation = await caller().vacations.transition({
      id: vacation.id,
      revision: vacation.revision,
      action: "devolver",
      reason: "Ajustar aviso",
    });
    expect(vacation.status).toBe("reprovado");
  });
  it("férias edição exige novo aviso, mantendo histórico e revogando arquivo anterior", async () => {
    const oldUrl = vacation.noticeFileUrl;
    vacation = await caller("company_hr", companyId).vacations.update({
      ...dates,
      id: vacation.id,
      revision: vacation.revision,
      notes: "Correção",
    });
    expect(vacation.noticeFileUrl).toBeNull();
    expect((await fetch(origin + oldUrl)).status).toBe(404);
    vacation = await caller().vacations.uploadNotice({
      id: vacation.id,
      revision: vacation.revision,
      fileName: "corrigido.pdf",
      base64: Buffer.from("%PDF-1.4\n%%EOF").toString("base64"),
    });
    fileUrls.push(vacation.noticeFileUrl);
    vacation = await caller().vacations.transition({
      id: vacation.id,
      revision: vacation.revision,
      action: "enviar",
    });
    vacation = await caller().vacations.transition({
      id: vacation.id,
      revision: vacation.revision,
      action: "aprovar",
    });
    expect(vacation.status).toBe("aprovado");
    await expect(
      caller().vacations.update({
        ...dates,
        id: vacation.id,
        revision: vacation.revision,
      })
    ).rejects.toThrow("Somente");
    const history = await caller().vacations.history({ id: vacation.id });
    expect(history.map(e => e.action)).toContain("editado");
    expect(history.map(e => e.action)).toContain("aprovar");
  });
  it("férias aprovadas só podem ser canceladas pela plataforma com motivo", async () => {
    await expect(
      caller("company_hr", companyId).vacations.transition({
        id: vacation.id,
        revision: vacation.revision,
        action: "cancelar",
        reason: "Alteração",
      })
    ).rejects.toThrow("SmartDocPlan");
    await expect(
      caller().vacations.transition({
        id: vacation.id,
        revision: vacation.revision,
        action: "cancelar",
      })
    ).rejects.toThrow("motivo");
    vacation = await caller().vacations.transition({
      id: vacation.id,
      revision: vacation.revision,
      action: "cancelar",
      reason: "Cancelamento de teste",
    });
    expect(vacation.status).toBe("cancelado");
  });
  it("férias serializa criações concorrentes para impedir períodos duplicados", async () => {
    const results = await Promise.allSettled([
      caller().vacations.create({ ...dates, companyId, employeeId }),
      caller().vacations.create({ ...dates, companyId, employeeId }),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    vacation = (
      results.find(r => r.status === "fulfilled") as PromiseFulfilledResult<any>
    ).value;
  });
  it("alerta de prazo informado não duplica e respeita empresa e perfil", async () => {
    const ids: number[] = [];
    for (const [role, company] of [
      ["company_hr", companyId],
      ["company_hr", otherCompany],
      ["company_viewer", companyId],
    ] as const) {
      ids.push(
        (
          await pool.query(
            `INSERT INTO smartdocplan.users(name,role,"companyId") VALUES ('RH Teste',$1,$2) RETURNING id`,
            [role, company]
          )
        ).rows[0].id
      );
    }
    await notifyVacationDeadlines("2026-09-17");
    await notifyVacationDeadlines("2026-09-17");
    const result = await pool.query(
      `SELECT "userId" FROM smartdocplan.user_notifications WHERE tipo=$1 AND "userId"=ANY($2)`,
      [`ferias_prazo_${vacation.id}_${vacation.revision}_30`, ids]
    );
    expect(result.rows.map(r => r.userId)).toEqual([ids[0]]);
  });
});
