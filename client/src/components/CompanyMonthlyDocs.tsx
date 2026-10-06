import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MonthlyDocsGrid, type MonthlyCell, type MonthlyRow } from "@/components/MonthlyDocsGrid";
import { DOCUMENT_FILE_ACCEPT, MAX_DOCUMENT_FILE_BYTES, fileToBase64 } from "@/lib/files";
import { COMPANY_MONTHLY_DOCUMENT_TIPO } from "@shared/companyDocuments";

/** Documentos recorrentes da própria empresa (ex.: guia do FGTS): grade por competência e envio. */
export function CompanyMonthlyDocs({ companyId, canEdit }: { companyId: number; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const { data } = trpc.recurringDocs.companyGrid.useQuery({ companyId, quantidade: 6 }, { enabled: companyId > 0 });
  const [target, setTarget] = useState<{ row: MonthlyRow; cell: MonthlyCell } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const createMutation = trpc.companyDocuments.create.useMutation();

  const send = async () => {
    if (!target || !file) return;
    if (file.size > MAX_DOCUMENT_FILE_BYTES) {
      toast.error("O arquivo deve ter no máximo 10 MB.");
      return;
    }
    setSending(true);
    try {
      await createMutation.mutateAsync({
        companyId,
        tipo: COMPANY_MONTHLY_DOCUMENT_TIPO,
        nome: `${target.row.tipo.nome} ${target.cell.rotulo}`,
        fileNome: file.name,
        fileBase64: await fileToBase64(file),
        recurringTypeId: target.row.tipo.id,
        competencia: target.cell.competencia,
      });
      toast.success("Documento recorrente enviado.");
      setTarget(null);
      setFile(null);
      await Promise.all([utils.recurringDocs.invalidate(), utils.companyDocuments.invalidate()]);
    } catch (error: any) {
      toast.error(error.message ?? "Não foi possível enviar o documento.");
    } finally {
      setSending(false);
    }
  };

  if (!data || data.linhas.length === 0) return null;

  return (
    <>
      <MonthlyDocsGrid
        titulo="Documentos recorrentes da empresa"
        linhas={data.linhas as MonthlyRow[]}
        canSend={canEdit}
        onSend={(row, cell) => { setTarget({ row, cell }); setFile(null); }}
      />
      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Enviar {target?.row.tipo.nome} {target?.cell.rotulo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="mensal-empresa-arquivo">Arquivo *</Label>
            <Input id="mensal-empresa-arquivo" type="file" accept={DOCUMENT_FILE_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">PDF, PNG ou JPG com até 10 MB.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancelar</Button>
            <Button onClick={send} disabled={!file || sending}>{sending ? "Enviando..." : "Enviar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
