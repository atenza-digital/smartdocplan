import { useState } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Building2, CheckCircle2, Eye, FileCheck2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { canManageRequestWorkflow } from "@shared/permissions";
import { formatDateOnlyBr } from "@shared/formValidation";
import { COMPANY_DOCUMENT_TYPES } from "@shared/companyDocuments";

const CATEGORIA_LABELS: Record<string, string> = {
  pessoal: "Pessoal", contratual: "Contratual", exame_medico: "Exame médico", treinamento: "Treinamento",
  psicossocial: "Psicossocial", advertencia: "Advertência", afastamento: "Afastamento", atestado: "Atestado",
  opcional: "Opcional", outros: "Outros",
};

type Alvo = "colaborador" | "empresa";
type RejectTarget = { alvo: Alvo; id: number; nome: string };

const NovaVersaoSelo = ({ texto }: { texto: string }) => (
  <span className="ml-2 rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400">
    {texto}
  </span>
);

const FilaVazia = ({ texto }: { texto: string }) => (
  <Card>
    <CardContent className="py-12 text-center text-muted-foreground">
      <FileCheck2 className="mx-auto mb-3 h-10 w-10 opacity-30" />
      <p className="font-medium">{texto}</p>
    </CardContent>
  </Card>
);

/** Fila de documentos aguardando validação da equipe SmartDocPlan: dos colaboradores e da própria empresa. */
export default function AdminValidacaoDocumentos() {
  const { user } = useAuth();
  const canReview = canManageRequestWorkflow(user?.role ?? null);
  const utils = trpc.useUtils();
  const { data: fila = [], isLoading } = trpc.employeeDocs.pendingReview.useQuery();
  const { data: filaEmpresa = [], isLoading: carregandoEmpresa } = trpc.companyDocuments.pendingReview.useQuery();
  const [aba, setAba] = useState<Alvo>(() => (new URLSearchParams(window.location.search).get("aba") === "empresa" ? "empresa" : "colaborador"));
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [motivo, setMotivo] = useState("");

  const onReviewed = (decisao: "aprovar" | "rejeitar") => {
    toast.success(decisao === "aprovar" ? "Documento aprovado." : "Documento rejeitado; a empresa foi avisada.");
    setRejectTarget(null);
    setMotivo("");
  };
  const reviewMutation = trpc.employeeDocs.review.useMutation({
    onSuccess: (_, variables) => {
      onReviewed(variables.decisao);
      utils.employeeDocs.pendingReview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const reviewEmpresaMutation = trpc.companyDocuments.review.useMutation({
    onSuccess: (_, variables) => {
      onReviewed(variables.decisao);
      utils.companyDocuments.pendingReview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const reviewing = reviewMutation.isPending || reviewEmpresaMutation.isPending;
  const decidir = (alvo: Alvo, id: number, decisao: "aprovar" | "rejeitar", motivoRejeicao?: string) =>
    (alvo === "empresa" ? reviewEmpresaMutation : reviewMutation).mutate({ id, decisao, motivo: motivoRejeicao });

  const botoes = (alvo: Alvo, doc: { id: number; nome: string }) =>
    canReview && (
      <>
        <Button size="sm" variant="outline" disabled={reviewing} onClick={() => decidir(alvo, doc.id, "aprovar")} className="border-green-500/40 text-green-700 hover:bg-green-500/10 dark:text-green-400">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Aprovar
        </Button>
        <Button size="sm" variant="outline" disabled={reviewing} onClick={() => setRejectTarget({ alvo, id: doc.id, nome: doc.nome })} className="border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-400">
          <AlertCircle className="mr-1 h-3.5 w-3.5" />Rejeitar
        </Button>
      </>
    );

  const verArquivo = (fileUrl: string | null) =>
    fileUrl && (
      <Button asChild size="sm" variant="ghost">
        <a href={fileUrl} target="_blank" rel="noopener noreferrer"><Eye className="mr-1 h-3.5 w-3.5" />Ver arquivo</a>
      </Button>
    );

  return (
    <AdminLayout title="Validação de documentos">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Validação de documentos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Documentos enviados pelas empresas. O colaborador é liberado quando todos os obrigatórios estão aprovados; o documento da empresa passa a valer quando aprovado.
          </p>
        </div>

        <Tabs value={aba} onValueChange={(value) => setAba(value as Alvo)}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="colaborador">Colaboradores ({fila.length})</TabsTrigger>
            <TabsTrigger value="empresa">Empresa ({filaEmpresa.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="colaborador" className="mt-4">
            {isLoading ? (
              <div className="h-40 animate-pulse rounded-lg bg-muted" />
            ) : fila.length === 0 ? (
              <FilaVazia texto="Nenhum documento de colaborador aguardando validação." />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{fila.length} documento(s) na fila, dos mais antigos para os mais recentes.</p>
                {fila.map((doc) => (
                  <Card key={doc.id} className="border-border">
                    <CardContent className="flex flex-wrap items-center gap-3 p-4">
                      <div className="min-w-[14rem] flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {doc.nome}
                          {doc.substituiDocId != null && <NovaVersaoSelo texto={`Nova versão (${doc.versao}): a anterior vale até a aprovação`} />}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.empresaNome} · {doc.colaboradorNome} · {CATEGORIA_LABELS[doc.categoria] ?? doc.categoria}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Enviado em {new Date(doc.updatedAt).toLocaleDateString("pt-BR")}
                          {doc.validade ? ` · validade ${formatDateOnlyBr(doc.validade)}` : " · sem validade informada"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {verArquivo(doc.fileUrl)}
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/admin/colaboradores/${doc.employeeId}`}><FolderOpen className="mr-1 h-3.5 w-3.5" />Dossiê</Link>
                        </Button>
                        {botoes("colaborador", doc)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="empresa" className="mt-4">
            {carregandoEmpresa ? (
              <div className="h-40 animate-pulse rounded-lg bg-muted" />
            ) : filaEmpresa.length === 0 ? (
              <FilaVazia texto="Nenhum documento da empresa aguardando validação." />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{filaEmpresa.length} documento(s) na fila, dos mais antigos para os mais recentes.</p>
                {filaEmpresa.map((doc) => (
                  <Card key={doc.id} className="border-border">
                    <CardContent className="flex flex-wrap items-center gap-3 p-4">
                      <div className="min-w-[14rem] flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {doc.nome}
                          {doc.temVersaoAprovada && <NovaVersaoSelo texto="Nova versão: a aprovada vale até a decisão" />}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.empresaNome} · {doc.recurringTypeId ? "Documento recorrente" : COMPANY_DOCUMENT_TYPES.find((item) => item.tipo === doc.tipo)?.nome ?? doc.tipo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Enviado em {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                          {doc.validade ? ` · validade ${formatDateOnlyBr(doc.validade)}` : " · sem validade informada"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {verArquivo(doc.fileUrl)}
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/admin/empresas/${doc.companyId}`}><Building2 className="mr-1 h-3.5 w-3.5" />Empresa</Link>
                        </Button>
                        {botoes("empresa", doc)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setMotivo(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              A empresa recebe o motivo e precisa enviar um novo arquivo para "{rejectTarget?.nome}". Se houver uma versão aprovada, ela continua valendo.
            </p>
            <Label htmlFor="fila-motivo">Motivo *</Label>
            <Textarea id="fila-motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: arquivo ilegível ou sem assinatura" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setMotivo(""); }}>Cancelar</Button>
            <Button variant="destructive" disabled={!motivo.trim() || reviewing} onClick={() => rejectTarget && decidir(rejectTarget.alvo, rejectTarget.id, "rejeitar", motivo)}>
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
