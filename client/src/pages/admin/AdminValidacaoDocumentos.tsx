import { useState } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Eye, FileCheck2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { canManageRequestWorkflow } from "@shared/permissions";
import { formatDateOnlyBr } from "@shared/formValidation";

const CATEGORIA_LABELS: Record<string, string> = {
  pessoal: "Pessoal", contratual: "Contratual", exame_medico: "Exame médico", treinamento: "Treinamento",
  psicossocial: "Psicossocial", advertencia: "Advertência", afastamento: "Afastamento", atestado: "Atestado",
  opcional: "Opcional", outros: "Outros",
};

/** Fila de documentos de colaboradores aguardando validação da equipe SmartDocPlan. */
export default function AdminValidacaoDocumentos() {
  const { user } = useAuth();
  const canReview = canManageRequestWorkflow(user?.role ?? null);
  const utils = trpc.useUtils();
  const { data: fila = [], isLoading } = trpc.employeeDocs.pendingReview.useQuery();
  const [rejectTarget, setRejectTarget] = useState<(typeof fila)[number] | null>(null);
  const [motivo, setMotivo] = useState("");

  const reviewMutation = trpc.employeeDocs.review.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.decisao === "aprovar" ? "Documento aprovado." : "Documento rejeitado; a empresa foi avisada.");
      setRejectTarget(null);
      setMotivo("");
      utils.employeeDocs.pendingReview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <AdminLayout title="Validação de documentos">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Validação de documentos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Documentos enviados pelas empresas para o checklist dos colaboradores. O colaborador é liberado quando todos os obrigatórios estão aprovados.
          </p>
        </div>

        {isLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        ) : fila.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileCheck2 className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">Nenhum documento aguardando validação.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{fila.length} documento(s) na fila, dos mais antigos para os mais recentes.</p>
            {fila.map((doc) => (
              <Card key={doc.id} className="border-border">
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-[14rem] flex-1">
                    <p className="text-sm font-semibold text-foreground">{doc.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.empresaNome} · {doc.colaboradorNome} · {CATEGORIA_LABELS[doc.categoria] ?? doc.categoria}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Enviado em {new Date(doc.updatedAt).toLocaleDateString("pt-BR")}
                      {doc.validade ? ` · validade ${formatDateOnlyBr(doc.validade)}` : " · sem validade informada"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {doc.fileUrl && (
                      <Button asChild size="sm" variant="ghost">
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><Eye className="mr-1 h-3.5 w-3.5" />Ver arquivo</a>
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/colaboradores/${doc.employeeId}`}><FolderOpen className="mr-1 h-3.5 w-3.5" />Dossiê</Link>
                    </Button>
                    {canReview && (
                      <>
                        <Button size="sm" variant="outline" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ id: doc.id, decisao: "aprovar" })} className="border-green-500/40 text-green-700 hover:bg-green-500/10 dark:text-green-400">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Aprovar
                        </Button>
                        <Button size="sm" variant="outline" disabled={reviewMutation.isPending} onClick={() => setRejectTarget(doc)} className="border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-400">
                          <AlertCircle className="mr-1 h-3.5 w-3.5" />Rejeitar
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setMotivo(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rejeitar documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">O RH da empresa recebe o motivo e precisa enviar um novo arquivo para "{rejectTarget?.nome}".</p>
            <Label htmlFor="fila-motivo">Motivo *</Label>
            <Textarea id="fila-motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: certificado ilegível ou sem assinatura do instrutor" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setMotivo(""); }}>Cancelar</Button>
            <Button variant="destructive" disabled={!motivo.trim() || reviewMutation.isPending} onClick={() => rejectTarget && reviewMutation.mutate({ id: rejectTarget.id, decisao: "rejeitar", motivo })}>
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
