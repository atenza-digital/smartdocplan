import type { Express } from "express";
import { resolve, sep } from "node:path";
import { access } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { uploadRoot } from "./uploadFiles";
import { getUserFromLocalSession } from "./_core/localAuth";
import {
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
        })
        .from(employeeDocuments)
        .where(eq(employeeDocuments.fileUrl, fileUrl));
      const companyFiles = await db
        .select({ companyId: companyDocuments.companyId })
        .from(companyDocuments)
        .where(eq(companyDocuments.fileUrl, fileUrl));
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
