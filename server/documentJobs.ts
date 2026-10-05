import { getDb } from "./db";
import { recalcCompliance } from "./compliance";

/**
 * Rotina horária de documentos: recalcula conformidade e liberação de todos os colaboradores
 * (vencimentos mudam a situação sem que ninguém altere o documento).
 */
export async function runDocumentJobs() {
  const db = await getDb();
  if (!db) return;
  await recalcCompliance(db);
}
