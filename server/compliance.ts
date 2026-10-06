import { and, eq, inArray, ne } from "drizzle-orm";
import { employeeDocuments, employees, positionRequirements } from "../drizzle/schema";
import { evaluateChecklist, type ChecklistDocument, type ChecklistRequirement } from "@shared/compliance";
import { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

// Requisitos do checklist: obrigatórios e ativos do cargo, valendo para admissão ou para todos os tipos.
async function loadRequirements(db: Db, positionIds: number[]) {
  if (positionIds.length === 0) return new Map<number, ChecklistRequirement[]>();
  const rows = await db
    .select({
      id: positionRequirements.id,
      positionId: positionRequirements.positionId,
      documentoNome: positionRequirements.documentoNome,
      categoria: positionRequirements.categoria,
      validadeMeses: positionRequirements.validadeMeses,
      ordem: positionRequirements.ordem,
    })
    .from(positionRequirements)
    .where(and(
      inArray(positionRequirements.positionId, positionIds),
      eq(positionRequirements.ativo, true),
      eq(positionRequirements.obrigatorio, true),
      inArray(positionRequirements.tipoSolicitacao, ["admissao", "todos"]),
    ));
  const map = new Map<number, ChecklistRequirement[]>();
  for (const { positionId, ...req } of rows) {
    map.set(positionId, [...(map.get(positionId) ?? []), req]);
  }
  return map;
}

async function loadDocuments(db: Db, employeeIds: number[]) {
  if (employeeIds.length === 0) return new Map<number, ChecklistDocument[]>();
  const rows = await db
    .select({
      id: employeeDocuments.id,
      employeeId: employeeDocuments.employeeId,
      nome: employeeDocuments.nome,
      categoria: employeeDocuments.categoria,
      requirementId: employeeDocuments.requirementId,
      status: employeeDocuments.status,
      dataEmissao: employeeDocuments.dataEmissao,
      validade: employeeDocuments.validade,
      createdAt: employeeDocuments.createdAt,
    })
    .from(employeeDocuments)
    .where(and(inArray(employeeDocuments.employeeId, employeeIds), ne(employeeDocuments.status, "excluido")));
  const map = new Map<number, ChecklistDocument[]>();
  for (const { employeeId, ...doc } of rows) {
    map.set(employeeId, [...(map.get(employeeId) ?? []), doc]);
  }
  return map;
}

/** Checklist do colaborador (requisitos do cargo × documentos enviados), sem gravar nada. */
export async function getEmployeeChecklist(db: Db, employee: { id: number; positionId: number | null }) {
  const requirements = employee.positionId ? (await loadRequirements(db, [employee.positionId])).get(employee.positionId) ?? [] : [];
  const docs = (await loadDocuments(db, [employee.id])).get(employee.id) ?? [];
  return evaluateChecklist(requirements, docs);
}

/**
 * Recalcula e grava conformidade e liberação. Sem `employeeIds`, recalcula todos os colaboradores
 * (usado na subida do servidor e no job horário, para refletir vencimentos).
 */
export async function recalcCompliance(db: Db, employeeIds?: number[]) {
  const list = await db
    .select({ id: employees.id, positionId: employees.positionId, scoreConformidade: employees.scoreConformidade, liberacao: employees.liberacao })
    .from(employees)
    .where(employeeIds ? inArray(employees.id, employeeIds.length ? employeeIds : [-1]) : undefined);
  if (list.length === 0) return 0;
  const requirements = await loadRequirements(db, Array.from(new Set(list.map((e) => e.positionId).filter((id): id is number => id != null))));
  const docs = await loadDocuments(db, list.map((e) => e.id));
  let changed = 0;
  for (const employee of list) {
    const result = evaluateChecklist(employee.positionId ? requirements.get(employee.positionId) ?? [] : [], docs.get(employee.id) ?? []);
    if (result.score === employee.scoreConformidade && result.liberacao === employee.liberacao) continue;
    const becameReleased = result.liberacao === "liberado" && employee.liberacao !== "liberado";
    await db
      .update(employees)
      .set({
        scoreConformidade: result.score,
        liberacao: result.liberacao,
        ...(becameReleased ? { liberadoAt: new Date() } : result.liberacao !== "liberado" ? { liberadoAt: null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(employees.id, employee.id));
    changed++;
  }
  return changed;
}

/** Recalcula todos os colaboradores dos cargos informados (após mudar requisitos de um cargo). */
export async function recalcComplianceForPositions(db: Db, positionIds: number[]) {
  if (positionIds.length === 0) return 0;
  const list = await db.select({ id: employees.id }).from(employees).where(inArray(employees.positionId, positionIds));
  return recalcCompliance(db, list.map((e) => e.id));
}
