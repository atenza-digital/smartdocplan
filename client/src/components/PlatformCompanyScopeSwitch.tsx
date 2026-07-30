import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Building2, Undo2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PlatformCompanyScopeSwitchProps = {
  companyView?: boolean;
};

export default function PlatformCompanyScopeSwitch({
  companyView = false,
}: PlatformCompanyScopeSwitchProps) {
  const [, navigate] = useLocation();
  const { user, scopedCompanyId, setScopedCompanyId } = useLocalAuth();
  const { data: companies = [] } = trpc.companies.list.useQuery(undefined, {
    enabled: user?.role === "platform_admin",
  });
  const [open, setOpen] = useState(false);
  const [draftCompanyId, setDraftCompanyId] = useState<string>("");

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === scopedCompanyId) ?? null,
    [companies, scopedCompanyId],
  );

  useEffect(() => {
    setDraftCompanyId(scopedCompanyId ? String(scopedCompanyId) : "");
  }, [scopedCompanyId]);

  if (user?.role !== "platform_admin") return null;

  const handleSelectCompany = () => {
    const nextCompanyId = Number(draftCompanyId || 0);
    if (!nextCompanyId) return;
    setScopedCompanyId(nextCompanyId);
    setOpen(false);
    navigate("/empresa");
  };

  const handleBackToPlatform = () => {
    setScopedCompanyId(null);
    navigate("/admin");
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {companyView && selectedCompany ? (
          <Button variant="outline" size="sm" onClick={handleBackToPlatform}>
            <Undo2 className="mr-2 h-4 w-4" />
            Voltar para plataforma
          </Button>
        ) : null}

        <Button variant="outline" size="sm" className="max-w-[260px]" onClick={() => setOpen(true)}>
          <Building2 className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {selectedCompany ? selectedCompany.nomeFantasia || selectedCompany.razaoSocial : "Operar como empresa"}
          </span>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Visão da empresa</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label>Empresa para operar</Label>
            <Select value={draftCompanyId} onValueChange={setDraftCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)}>
                    {company.nomeFantasia || company.razaoSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            {selectedCompany && (
              <Button variant="outline" onClick={handleBackToPlatform}>
                Limpar contexto
              </Button>
            )}
            <Button onClick={handleSelectCompany} disabled={!draftCompanyId}>
              Entrar nessa visão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
