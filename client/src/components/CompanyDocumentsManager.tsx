import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CalendarClock, CheckCircle2, Download, Edit, FileText, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DOCUMENT_FILE_ACCEPT, MAX_DOCUMENT_FILE_BYTES, fileToBase64 } from "@/lib/files";
import { motivoSemPontoFinal } from "@shared/documentVersions";
import { COMPANY_DOCUMENT_TYPES, splitCompanyDocuments } from "@shared/companyDocuments";
import { isPlatformOperator, isPlatformUser } from "@shared/permissions";
import { DeletionRequestDialog, type DeletionTarget } from "@/components/DeletionRequestDialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatDateOnlyBr, getDocumentDateBounds, getDocumentDatesError, getValidityState } from "@shared/formValidation";

// Limites dos campos de data de documentos (barra anos implausíveis, como 1900).
const DOC_DATES = getDocumentDateBounds();

type UploadForm = {
  tipo: string;
  nome: string;
  dataEmissao: string;
  validade: string;
  observacao: string;
};

type EditForm = {
  id: number;
  nome: string;
  dataEmissao: string;
  validade: string;
  observacao: string;
};

function formatDate(value?: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR");
}

/** Situação de um envio ainda não aprovado (em validação ou rejeitado). */
const REVIEW_STATUS: Record<string, { label: string; tone: string }> = {
  aguardando_validacao: { label: "Em validação", tone: "bg-blue-500/10 text-blue-700 border border-blue-500/20" },
  rejeitado: { label: "Rejeitado", tone: "bg-red-500/10 text-red-700 border border-red-500/20" },
};

/** Rótulo de uma versão no histórico. */
const HISTORY_LABELS: Record<string, string> = {
  valido: "Versão anterior",
  substituido: "Substituído",
  rejeitado: "Rejeitado",
  aguardando_validacao: "Em validação",
};

function getDocumentStatus(validade?: string | Date | null) {
  const state = getValidityState(validade);
  if (state === "sem_validade") return { key: "sem_validade", label: "Sem validade", tone: "bg-muted text-muted-foreground" };
  if (state === "vencido") return { key: "vencido", label: "Vencido", tone: "bg-red-500/10 text-red-700 border border-red-500/20" };
  if (state === "a_vencer") return { key: "a_vencer", label: "A vencer", tone: "bg-amber-500/10 text-amber-700 border border-amber-500/20" };
  return { key: "ok", label: "Válido", tone: "bg-green-500/10 text-green-700 border border-green-500/20" };
}

export default function CompanyDocumentsManager({
  companyId,
  canEdit,
  title = "Documentos da Empresa",
  description = "Acompanhe os anexos obrigatórios e opcionais da empresa.",
}: {
  companyId: number;
  canEdit: boolean;
  title?: string;
  description?: string;
}) {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const { data: docs = [] } = trpc.companyDocuments.listByCompany.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: stats } = trpc.companyDocuments.statsByCompany.useQuery({ companyId }, { enabled: companyId > 0 });

  const [uploadTarget, setUploadTarget] = useState<(typeof COMPANY_DOCUMENT_TYPES)[number] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState<UploadForm>({ tipo: "", nome: "", dataEmissao: "", validade: "", observacao: "" });
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  // Só a equipe SmartDocPlan exclui direto; a empresa pede a exclusão.
  const podeExcluirDireto = isPlatformOperator(user?.role);
  const [pedidoTarget, setPedidoTarget] = useState<DeletionTarget | null>(null);
  const { data: pedidosExclusao = [] } = trpc.deletionRequests.pendingByCompany.useQuery({ companyId }, { enabled: companyId > 0 });
  const pedidosPorDoc = new Map(pedidosExclusao.filter((p) => p.alvo === "empresa").map((p) => [p.documentoId, p.id]));
  const cancelPedidoMutation = trpc.deletionRequests.cancel.useMutation({
    onSuccess: () => {
      toast.success("Pedido de exclusão cancelado.");
      utils.deletionRequests.pendingByCompany.invalidate({ companyId });
    },
    onError: (error) => toast.error(error.message),
  });

  const createMutation = trpc.companyDocuments.create.useMutation({
    onSuccess: async (result) => {
      toast.success(result.status === "aguardando_validacao"
        ? "Documento enviado. Ele passa a valer depois da validação da equipe SmartDocPlan."
        : "Documento da empresa enviado com sucesso!");
      await utils.companyDocuments.listByCompany.invalidate({ companyId });
      await utils.companyDocuments.statsByCompany.invalidate({ companyId });
      setUploadTarget(null);
      setSelectedFile(null);
      setUploadForm({ tipo: "", nome: "", dataEmissao: "", validade: "", observacao: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.companyDocuments.update.useMutation({
    onSuccess: async (result, variables) => {
      toast.success(result.id !== variables.id
        ? "Datas alteradas: a nova versão aguarda a validação da equipe SmartDocPlan; a atual continua valendo."
        : "Documento da empresa atualizado!");
      await utils.companyDocuments.listByCompany.invalidate({ companyId });
      await utils.companyDocuments.statsByCompany.invalidate({ companyId });
      setEditForm(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.companyDocuments.delete.useMutation({
    onSuccess: async () => {
      toast.success("Documento da empresa removido.");
      await utils.deletionRequests.pendingByCompany.invalidate({ companyId });
      await utils.companyDocuments.listByCompany.invalidate({ companyId });
      await utils.companyDocuments.statsByCompany.invalidate({ companyId });
    },
    onError: (error) => toast.error(error.message),
  });

  // Por tipo: a versão em vigor (aprovada mais recente), a nova versão ainda não aprovada e o histórico.
  const versoes = useMemo(() => splitCompanyDocuments(docs.filter((doc) => !doc.recurringTypeId)), [docs]);

  const documentRows = COMPANY_DOCUMENT_TYPES.map((item) => {
    const grupo = versoes.get(item.tipo);
    const emVigor = grupo?.emVigor ?? null;
    // Sem versão aprovada, o envio mais novo (em validação ou rejeitado) é o que aparece.
    const latest = emVigor ?? grupo?.novaVersao ?? null;
    return { ...item, latest, emVigor, nova: emVigor ? grupo?.novaVersao ?? null : null, historico: grupo?.historico ?? [] };
  });

  const handleOpenUpload = (target: (typeof COMPANY_DOCUMENT_TYPES)[number]) => {
    setUploadTarget(target);
    setSelectedFile(null);
    setUploadForm({ tipo: target.tipo, nome: target.nome, dataEmissao: "", validade: "", observacao: "" });
  };

  const handleUpload = async () => {
    if (!uploadTarget || !selectedFile) {
      toast.error("Selecione um arquivo para enviar.");
      return;
    }
    if (selectedFile.size > MAX_DOCUMENT_FILE_BYTES) {
      toast.error("O arquivo deve ter no máximo 10 MB.");
      return;
    }
    const datesError = getDocumentDatesError(uploadForm.dataEmissao, uploadForm.validade);
    if (datesError) {
      toast.error(datesError);
      return;
    }
    const fileBase64 = await fileToBase64(selectedFile);
    await createMutation.mutateAsync({
      companyId,
      tipo: uploadForm.tipo,
      nome: uploadForm.nome.trim() || uploadTarget.nome,
      dataEmissao: uploadForm.dataEmissao || undefined,
      validade: uploadForm.validade || undefined,
      observacao: uploadForm.observacao.trim() || undefined,
      fileNome: selectedFile.name,
      fileBase64,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Aprovados</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{stats?.enviados ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Em validação</p>
            <p className="mt-2 text-2xl font-semibold text-blue-600">{stats?.emValidacao ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Obrigatórios pendentes</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{stats?.obrigatoriosPendentes ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Vencidos</p>
            <p className="mt-2 text-2xl font-semibold text-red-600">{stats?.vencidos ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">A vencer em 30 dias</p>
            <p className="mt-2 text-2xl font-semibold text-amber-600">{stats?.aVencer ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {documentRows.map((item) => {
          const latest = item.latest;
          // Aprovado: situação pela validade. Sem versão aprovada: em validação ou rejeitado.
          const status = latest ? (item.emVigor ? getDocumentStatus(latest.validade) : REVIEW_STATUS[latest.status] ?? null) : null;

          return (
            <Card key={item.tipo}>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{item.nome}</p>
                      <Badge variant={item.obrigatorio ? "default" : "outline"}>
                        {item.obrigatorio ? "Obrigatório" : "Opcional"}
                      </Badge>
                      {!latest ? (
                        <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-700">
                          Pendente
                        </Badge>
                      ) : (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status?.tone}`}>{status?.label}</span>
                      )}
                    </div>

                    {latest ? (
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">{latest.nome}</p>
                        {!item.emVigor && latest.status === "aguardando_validacao" ? (
                          <p className="text-xs">Aguardando a validação da equipe SmartDocPlan para passar a valer.</p>
                        ) : null}
                        {!item.emVigor && latest.status === "rejeitado" ? (
                          <p className="text-xs text-red-700 dark:text-red-400">Motivo da rejeição: {latest.motivoRejeicao ? motivoSemPontoFinal(latest.motivoRejeicao) : "não informado"}. Envie uma nova versão.</p>
                        ) : null}
                        <p>Última atualização: {formatDate(latest.updatedAt) ?? "-"}</p>
                        {latest.dataEmissao ? <p>Emissão: {formatDateOnlyBr(latest.dataEmissao)}</p> : null}
                        {latest.validade ? <p>Validade: {formatDateOnlyBr(latest.validade)}</p> : null}
                        {latest.observacao ? <p className="whitespace-pre-wrap">{latest.observacao}</p> : null}
                        {latest.fileUrl ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <a href={latest.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              <FileText className="h-3.5 w-3.5" />
                              Ver arquivo
                            </a>
                            <a href={latest.fileUrl} download={latest.nome} className="inline-flex items-center gap-1 text-primary hover:underline">
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum arquivo enviado ainda para este documento.
                      </p>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => handleOpenUpload(item)}>
                        <Upload className="mr-2 h-4 w-4" />
                        {latest ? "Nova versão" : "Anexar"}
                      </Button>
                      {latest ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setEditForm({
                                id: latest.id,
                                nome: latest.nome,
                                dataEmissao: latest.dataEmissao ? new Date(latest.dataEmissao).toISOString().slice(0, 10) : "",
                                validade: latest.validade ? new Date(latest.validade).toISOString().slice(0, 10) : "",
                                observacao: latest.observacao ?? "",
                              })
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {podeExcluirDireto || !pedidosPorDoc.has(latest.id) ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={podeExcluirDireto ? `Excluir ${item.nome}` : `Pedir exclusão de ${item.nome}`}
                              title={podeExcluirDireto ? "Excluir" : "Pedir exclusão"}
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (!podeExcluirDireto) {
                                  setPedidoTarget({ alvo: "empresa", documentoId: latest.id, nome: latest.nome });
                                } else if (window.confirm("Excluir este documento? Todas as versões dele saem da lista (os registros ficam guardados).")) {
                                  deleteMutation.mutate({ id: latest.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                {latest && pedidosPorDoc.has(latest.id) ? (
                  <p className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                    Exclusão solicitada: aguardando a decisão da equipe SmartDocPlan.
                    {canEdit && !podeExcluirDireto ? (
                      <button type="button" disabled={cancelPedidoMutation.isPending} onClick={() => cancelPedidoMutation.mutate({ id: pedidosPorDoc.get(latest.id)! })} className="font-medium underline">
                        Cancelar pedido
                      </button>
                    ) : null}
                  </p>
                ) : null}

                {item.nova ? (
                  <div className={`rounded-xl border p-3 text-sm ${item.nova.status === "rejeitado" ? "border-red-500/30 bg-red-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
                    <p className="font-medium text-foreground">
                      {item.nova.status === "rejeitado" ? "Nova versão rejeitada" : "Nova versão em validação"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Enviada em {formatDate(item.nova.createdAt) ?? "-"}
                      {item.nova.validade ? ` · validade ${formatDateOnlyBr(item.nova.validade)}` : ""}
                      {item.nova.status === "rejeitado"
                        ? ` · motivo: ${item.nova.motivoRejeicao ? motivoSemPontoFinal(item.nova.motivoRejeicao) : "não informado"}. A versão acima continua valendo.`
                        : ". A versão acima continua valendo até a equipe SmartDocPlan aprovar a nova."}
                    </p>
                    {item.nova.fileUrl ? (
                      <a href={item.nova.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <FileText className="h-3.5 w-3.5" />
                        Ver arquivo enviado
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {item.historico.length > 0 ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Versões anteriores</p>
                    <div className="space-y-2">
                      {item.historico.map((doc) => (
                        <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium text-foreground">{doc.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {HISTORY_LABELS[doc.status] ?? "Versão anterior"}
                              {doc.status === "rejeitado" && doc.motivoRejeicao ? ` (${doc.motivoRejeicao})` : ""}
                              {` • enviado em ${formatDate(doc.createdAt) ?? "-"}`}
                              {doc.validade ? ` • validade ${formatDateOnlyBr(doc.validade)}` : ""}
                            </p>
                          </div>
                          {doc.fileUrl ? (
                            <div className="flex items-center gap-3">
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                Abrir
                              </a>
                              <a href={doc.fileUrl} download={doc.nome} className="text-primary hover:underline">
                                Download
                              </a>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(stats?.obrigatoriosPendentes ?? 0) > 0 || (stats?.vencidos ?? 0) > 0 || (stats?.aVencer ?? 0) > 0 ? (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Atenção documental</p>
              <p className="text-sm text-muted-foreground">
                Existem documentos obrigatórios pendentes, vencidos ou próximos do vencimento. Esse resumo já ajuda a priorizar regularização operacional.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <DeletionRequestDialog
        target={pedidoTarget}
        onClose={() => setPedidoTarget(null)}
        onDone={() => { setPedidoTarget(null); utils.deletionRequests.pendingByCompany.invalidate({ companyId }); }}
      />

      <Dialog open={!!uploadTarget} onOpenChange={(open) => !open && setUploadTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar documento da empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              {isPlatformUser(user?.role)
                ? "Enviado pela equipe SmartDocPlan, o documento já entra aprovado e passa a ser a versão em vigor."
                : "O envio da empresa passa pela validação da equipe SmartDocPlan. Se já houver uma versão aprovada, ela continua valendo até a nova ser aprovada."}
            </p>
            <div className="space-y-1.5">
              <Label>Documento</Label>
              <Input value={uploadForm.nome} onChange={(event) => setUploadForm((current) => ({ ...current, nome: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Arquivo</Label>
              <Input type="file" accept={DOCUMENT_FILE_ACCEPT} onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de emissão</Label>
              <Input type="date" min={DOC_DATES.min} max={DOC_DATES.emissaoMax} value={uploadForm.dataEmissao} onChange={(event) => setUploadForm((current) => ({ ...current, dataEmissao: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Validade</Label>
              <Input type="date" min={DOC_DATES.min} max={DOC_DATES.validadeMax} value={uploadForm.validade} onChange={(event) => setUploadForm((current) => ({ ...current, validade: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea
                rows={4}
                className="min-h-28 resize-y"
                value={uploadForm.observacao}
                onChange={(event) => setUploadForm((current) => ({ ...current, observacao: event.target.value }))}
                placeholder="Observações, número do documento, versão, observações internas."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadTarget(null)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!selectedFile || createMutation.isPending}>
              {createMutation.isPending ? "Enviando..." : "Salvar documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editForm} onOpenChange={(open) => !open && setEditForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar documento da empresa</DialogTitle>
          </DialogHeader>
          {editForm ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Documento</Label>
                <Input value={editForm.nome} onChange={(event) => setEditForm((current) => (current ? { ...current, nome: event.target.value } : current))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data de emissão</Label>
                <Input type="date" min={DOC_DATES.min} max={DOC_DATES.emissaoMax} value={editForm.dataEmissao} onChange={(event) => setEditForm((current) => (current ? { ...current, dataEmissao: event.target.value } : current))} />
              </div>
              <div className="space-y-1.5">
                <Label>Validade</Label>
                <Input type="date" min={DOC_DATES.min} max={DOC_DATES.validadeMax} value={editForm.validade} onChange={(event) => setEditForm((current) => (current ? { ...current, validade: event.target.value } : current))} />
              </div>
              <div className="space-y-1.5">
                <Label>Observação</Label>
                <Textarea
                  rows={4}
                  className="min-h-28 resize-y"
                  value={editForm.observacao}
                  onChange={(event) => setEditForm((current) => (current ? { ...current, observacao: event.target.value } : current))}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditForm(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!editForm) return;
                const datesError = getDocumentDatesError(editForm.dataEmissao, editForm.validade);
                if (datesError) {
                  toast.error(datesError);
                  return;
                }
                updateMutation.mutate({
                  id: editForm.id,
                  nome: editForm.nome.trim(),
                  dataEmissao: editForm.dataEmissao || undefined,
                  validade: editForm.validade || undefined,
                  observacao: editForm.observacao.trim() || undefined,
                });
              }}
              disabled={!editForm?.nome.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
