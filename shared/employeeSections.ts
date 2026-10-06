/** Seções da tela de Colaboradores. */
export type EmployeeSection = "ativos" | "efetivacao" | "desligados";

export const EMPLOYEE_SECTION_LABELS: Record<EmployeeSection, string> = {
  ativos: "Ativos",
  efetivacao: "Em efetivação",
  desligados: "Desligados",
};

/**
 * Seção do colaborador: desligado vai para Desligados; quem ainda depende de documentação ou análise
 * fica Em efetivação; liberados e cargos sem requisitos ficam em Ativos (afastados inclusive).
 */
export function employeeSection(employee: { status: string; liberacao: string }): EmployeeSection {
  if (employee.status === "desligado") return "desligados";
  if (employee.liberacao === "aguardando_documentacao" || employee.liberacao === "em_analise") return "efetivacao";
  return "ativos";
}
