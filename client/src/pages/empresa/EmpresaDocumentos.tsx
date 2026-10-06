import CompanyLayout from "@/components/CompanyLayout";
import CompanyDocumentsManager from "@/components/CompanyDocumentsManager";
import { CompanyMonthlyDocs } from "@/components/CompanyMonthlyDocs";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageCompanyData } from "@shared/permissions";

/** Módulo Documentos da Empresa: documentos fixos com versões (PCMSO, PGR…) e documentos recorrentes da empresa. */
export default function EmpresaDocumentos() {
  const { user, effectiveCompanyId } = useAuth();
  const companyId = effectiveCompanyId ?? 0;
  const canEdit = canManageCompanyData(user?.role ?? null);

  return (
    <CompanyLayout title="Documentos da Empresa">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Documentos da Empresa</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Documentos legais com histórico de versões e alerta de validade, e documentos recorrentes da empresa.
          </p>
        </div>
        <CompanyMonthlyDocs companyId={companyId} canEdit={canEdit} />
        <CompanyDocumentsManager
          companyId={companyId}
          canEdit={canEdit}
          title="Documentos legais"
          description="Cartão CNPJ, Contrato Social, PCMSO, PGR, LTCAT e CNO. Cada novo envio vira uma versão; as anteriores ficam no histórico."
        />
      </div>
    </CompanyLayout>
  );
}
