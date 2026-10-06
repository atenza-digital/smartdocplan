import type { Express } from "express";
import { resolve, sep } from "node:path";
import { access } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { uploadRoot } from "./uploadFiles";
import { getUserFromLocalSession } from "./_core/localAuth";
import {
  companies,
  companyDocuments,
  employeeDocuments,
  requestDocumentUploads,
  requests,
  auditLogs,
  vacations,
} from "../drizzle/schema";
import {
  canAccessHealthData,
  isHealthCategory,
  isPlatformUser,
} from "../shared/permissions";
import { auditClientFields } from "./_core/clientInfo";

// Keep legacy URLs working, but never allow them to fall through to static serving.
export function registerDocumentAccess(app: Express) {
  app.use("/uploads", async (req, res) => {
    res.set({
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    try {
      const user = await getUserFromLocalSession(req.headers.cookie);
      if (!user) {
        res.sendStatus(401);
        return;
      }
      const db = await getDb();
      if (!db) {
        res.sendStatus(503);
        return;
      }
      const fileUrl = `/uploads${decodeURIComponent(req.path)}`;
      const root = uploadRoot();
      let path = resolve(root, `.${decodeURIComponent(req.path)}`);
      if (!path.startsWith(root + sep)) {
        res.sendStatus(404);
        return;
      }
      const requestFiles = await db
        .select({
          companyId: requests.companyId,
          categoria: requestDocumentUploads.categoria,
          tipo: requests.tipo,
        })
        .from(requestDocumentUploads)
        .innerJoin(requests, eq(requests.id, requestDocumentUploads.requestId))
        .where(eq(requestDocumentUploads.fileUrl, fileUrl));
      const employeeFiles = await db
        .select({
          companyId: employeeDocuments.companyId,
          categoria: employeeDocuments.categoria,
          status: employeeDocuments.status,
        })
        .from(employeeDocuments)
        .where(eq(employeeDocuments.fileUrl, fileUrl));
      // Documento excluído (exclusão lógica) só continua acessível à plataforma, para auditoria.
      const deletedForUser =
        !isPlatformUser(user.role) &&
        employeeFiles.length > 0 &&
        employeeFiles.every(r => r.status === "excluido");
      const companyFiles = await db
        .select({ companyId: companyDocuments.companyId })
        .from(companyDocuments)
        .where(eq(companyDocuments.fileUrl, fileUrl));
      // Logo da empresa: liberada para a plataforma e para a própria empresa, sem registro de acesso.
      const logoOwners = await db
        .select({ companyId: companies.id })
        .from(companies)
        .where(eq(companies.logoUrl, fileUrl));
      if (logoOwners.length) {
        if (!isPlatformUser(user.role) && !logoOwners.some(r => r.companyId === user.companyId)) {
          res.sendStatus(404);
          return;
        }
        await access(path);
        res.set("Cache-Control", "private, max-age=300");
        res.sendFile(path, { dotfiles: "deny" });
        return;
      }
      const vacationFiles = await db
        .select({ companyId: vacations.companyId })
        .from(vacations)
        .where(eq(vacations.noticeFileUrl, fileUrl));
      const records = [
        ...requestFiles,
        ...employeeFiles,
        ...companyFiles,
        ...vacationFiles,
      ];
      const sensitive =
        requestFiles.some(
          r => isHealthCategory(r.categoria) || isHealthCategory(r.tipo)
        ) || employeeFiles.some(r => isHealthCategory(r.categoria));
      if (
        !records.length ||
        deletedForUser ||
        (sensitive && !canAccessHealthData(user.role)) ||
        !records.every(
          r => isPlatformUser(user.role) || r.companyId === user.companyId
        )
      ) {
        res.sendStatus(404);
        return;
      }
      try {
        await access(path);
      } catch {
        const legacyRoot = resolve("dist/public/uploads");
        path = resolve(legacyRoot, `.${decodeURIComponent(req.path)}`);
        if (!path.startsWith(legacyRoot + sep)) {
          res.sendStatus(404);
          return;
        }
        await access(path);
      }
      await db.insert(auditLogs).values({
        ...auditClientFields(),
        userId: user.id,
        companyId: records[0].companyId,
        action: "acessou_documento",
        entity: "documento",
        details: JSON.stringify({ arquivo: fileUrl, sensivel: sensitive }),
      });
      res.sendFile(path, { dotfiles: "deny" });
    } catch {
      res.sendStatus(404);
    }
  });
}
