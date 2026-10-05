import { useState } from "react";
import CompanyLayout from "@/components/CompanyLayout";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FolderOpen, FileText, CheckCircle2, AlertCircle, Clock,
  Upload, ArrowLeft, User, Calendar, Download, Briefcase, MapPin, Mail, Phone,
  Eye, Pencil, Trash2,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageCompanyData, canManageRequestWorkflow } from "@shared/permissions";
import { DossieChecklist, RELEASE_COLORS, type ChecklistItem } from "@/components/DossieChecklist";
import { MonthlyDocsGrid, type MonthlyCell, type MonthlyRow } from "@/components/MonthlyDocsGrid";
import { formatCompetencia } from "@shared/recurring";
import { RELEASE_LABELS, type EmployeeRelease } from "@shared/compliance";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_FILE_ACCEPT, MAX_DOCUMENT_FILE_BYTES, fileToBase64 } from "@/lib/files";
import { formatDateOnlyBr, getDocumentDateBounds, getDocumentDatesError } from "@shared/formValidation";

// Limites dos campos de data de documentos (barra anos implausíveis, como 1900).
const DOC_DATES = getDocumentDateBounds();

type DocStatus = "valido" | "vencido" | "pendente" | "rejeitado" | "aguardando_validacao";

type DocForm = {
  categoria: string;
  nome: string;
  tipo: string;
  dataEmissao: string;
  validade: string;
  requirementId: number | null;
  recurringTypeId: number | null;
  competencia: string | null;
};

const emptyDocForm: DocForm = { categoria: "pessoal", nome: "", tipo: "", dataEmissao: "", validade: "", requirementId: null, recurringTypeId: null, competencia: null };

const docStatusLabels: Record<string, string> = {
  valido: "Válido",
  vencido: "Vencido",
  a_vencer: "A vencer",
  pendente: "Pendente",
  rejeitado: "Rejeitado",
  aguardando_validacao: "Aguardando validação",
};

const docStatusColors: Record<string, string> = {
  valido: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  vencido: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  a_vencer: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  pendente: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  rejeitado: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  aguardando_validacao: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
};

const categoriaLabels: Record<string, string> = {
  pessoal: "Pessoal",
  contratual: "Contratual",
  exame_medico: "Exame Médico",
  treinamento: "Treinamento",
  advertencia: "Advertência",
  afastamento: "Afastamento",
  atestado: "Atestado",
  psicossocial: "Psicossocial",
  opcional: "Opcional",
  outros: "Outros",
};

/**
 * Dossiê do colaborador. Na área da empresa usa /empresa/colaboradores/:id; a equipe SmartDocPlan
 * (inclusive analista e auditor, só leitura) abre por /admin/colaboradores/:id, no layout do admin.
 */
export default function EmpresaDossie() {
  const [isAdminRoute, adminParams] = useRoute("/admin/colaboradores/:id");
  const [, empresaParams] = useRoute("/empresa/colaboradores/:id");
  const params = isAdminRoute ? adminParams : empresaParams;
  const Layout = isAdminRoute ? AdminLayout : CompanyLayout;
  const employeeId = parseInt(params?.id ?? "0");
  const { user } = useAuth();
  const canManage = canManageCompanyData(user?.role ?? null);
  const canReview = canManageRequestWorkflow(user?.role ?? null);
  const utils = trpc.useUtils();
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [uploadForm, setUploadForm] = useState<DocForm>(emptyDocForm);

  const { data: employee } = trpc.employees.get.useQuery(
    { id: employeeId },
    { enabled: employeeId > 0 }
  );
  const { data: documentos = [], refetch } = trpc.employeeDocs.list.useQuery(
    { employeeId },
    { enabled: employeeId > 0 }
  );
  const { data: checklist } = trpc.employeeDocs.checklist.useQuery(
    { employeeId },
    { enabled: employeeId > 0 }
  );
  const { data: mensais } = trpc.recurringDocs.employeeGrid.useQuery(
    { employeeId, meses: 6 },
    { enabled: employeeId > 0 }
  );
  // Documentos, checklist e conformidade mudam juntos: recarrega os três após qualquer alteração.
  const refreshDossie = () => {
    refetch();
    utils.employeeDocs.checklist.invalidate({ employeeId });
    utils.employees.get.invalidate({ id: employeeId });
    utils.recurringDocs.employeeGrid.invalidate({ employeeId });
  };
  const { data: cargos = [] } = trpc.positions.list.useQuery(
    { companyId: employee?.companyId ?? 0 },
    { enabled: (employee?.companyId ?? 0) > 0 }
  );
  const { data: obras = [] } = trpc.worksites.list.useQuery(
    { companyId: employee?.companyId ?? 0 },
    { enabled: (employee?.companyId ?? 0) > 0 }
  );
  const { data: historicoSolicitacoes = [] } = trpc.requests.list.useQuery(
    { companyId: employee?.companyId ?? 0, employeeId },
    { enabled: (employee?.companyId ?? 0) > 0 && employeeId > 0 }
  );

  const closeDocDialog = () => {
    setShowUpload(false);
    setEditingDoc(null);
    setSelectedFile(null);
    setUploadForm(emptyDocForm);
  };

  const openNewDoc = () => {
    setEditingDoc(null);
    setSelectedFile(null);
    setUploadForm(emptyDocForm);
    setShowUpload(true);
  };

  const openEditDoc = (doc: any) => {
    setEditingDoc(doc);
    setSelectedFile(null);
    setUploadForm({
      categoria: doc.categoria,
      nome: doc.nome ?? "",
      tipo: doc.tipo ?? "",
      dataEmissao: doc.dataEmissao ? String(doc.dataEmissao).slice(0, 10) : "",
      validade: doc.validade ? String(doc.validade).slice(0, 10) : "",
      requirementId: doc.requirementId ?? null,
      recurringTypeId: null,
      competencia: null,
    });
    setShowUpload(true);
  };

  // Envio a partir do checklist: já vincula o documento ao item exigido pelo cargo.
  const openChecklistUpload = (item: ChecklistItem) => {
    setEditingDoc(null);
    setSelectedFile(null);
    setUploadForm({
      ...emptyDocForm,
      categoria: item.categoria in categoriaLabels ? item.categoria : "outros",
      nome: item.documentoNome,
      requirementId: item.requirementId,
    });
    setShowUpload(true);
  };

  // Envio a partir da grade mensal: já preenche tipo, competência e nome.
  const openMonthlyUpload = (row: MonthlyRow, cell: MonthlyCell) => {
    setEditingDoc(null);
    setSelectedFile(null);
    setUploadForm({
      ...emptyDocForm,
      categoria: row.tipo.categoria in categoriaLabels ? row.tipo.categoria : "outros",
      nome: `${row.tipo.nome} ${formatCompetencia(cell.competencia)}`,
      recurringTypeId: row.tipo.id,
      competencia: cell.competencia,
    });
    setShowUpload(true);
  };

  const reviewMutation = trpc.employeeDocs.review.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.decisao === "aprovar" ? "Documento aprovado." : "Documento rejeitado; a empresa foi avisada.");
      setRejectTarget(null);
      setRejectReason("");
      refreshDossie();
    },
    onError: (e) => toast.error(e.message),
  });

  const createDocMutation = trpc.employeeDocs.create.useMutation({
    onSuccess: () => {
      toast.success("Documento enviado com sucesso!");
      closeDocDialog();
      refreshDossie();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateDocMutation = trpc.employeeDocs.update.useMutation({
    onSuccess: () => {
      toast.success("Documento atualizado com sucesso!");
      closeDocDialog();
      refreshDossie();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteDocMutation = trpc.employeeDocs.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento excluído.");
      setDeleteTarget(null);
      refreshDossie();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSelectFile = (file: File | null) => {
    if (file && file.size > MAX_DOCUMENT_FILE_BYTES) {
      toast.error("O arquivo deve ter no máximo 10 MB.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleSaveDoc = async () => {
    const datesError = getDocumentDatesError(uploadForm.dataEmissao, uploadForm.validade);
    if (datesError) {
      toast.error(datesError);
      return;
    }
    let fileBase64: string | undefined;
    if (selectedFile) {
      setIsReadingFile(true);
      try {
        fileBase64 = await fileToBase64(selectedFile);
      } catch {
        toast.error("Não foi possível ler o arquivo selecionado.");
        return;
      } finally {
        setIsReadingFile(false);
      }
    }
    const fields = {
      categoria: uploadForm.categoria as any,
      nome: uploadForm.nome.trim(),
      tipo: uploadForm.tipo,
      dataEmissao: uploadForm.dataEmissao,
      validade: uploadForm.validade,
      fileNome: selectedFile?.name,
      fileBase64,
      requirementId: uploadForm.requirementId ?? undefined,
    };
    const mensal = uploadForm.recurringTypeId && uploadForm.competencia
      ? { recurringTypeId: uploadForm.recurringTypeId, competencia: uploadForm.competencia }
      : {};
    if (editingDoc) {
      updateDocMutation.mutate({ id: editingDoc.id, ...fields });
    } else {
      createDocMutation.mutate({
        employeeId,
        companyId: employee?.companyId ?? 0,
        ...fields,
        tipo: fields.tipo || undefined,
        dataEmissao: fields.dataEmissao || undefined,
        validade: fields.validade || undefined,
        obrigatorio: true,
        ...mensal,
      });
    }
  };

  const isSavingDoc = isReadingFile || createDocMutation.isPending || updateDocMutation.isPending;

  if (!employee && employeeId > 0) {
    return (
      <Layout title="Dossiê">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>Carregando colaborador...</p>
        </div>
      </Layout>
    );
  }

  const selectedCargo = cargos.find((cargo) => cargo.id === employee?.positionId);
  const selectedObra = obras.find((obra) => obra.id === employee?.worksiteId);

  const scoreColor = (score: number) =>
    score >= 80 ? "text-green-600 dark:text-green-400" : score >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  const byCategoria = (cat: string) => documentos.filter((d) => d.categoria === cat);

  return (
    <Layout title={employee ? `Dossiê — ${employee.nome}` : "Dossiê"}>
      <div className="space-y-6">
        {employee && <Button asChild variant="outline"><Link href={`${isAdminRoute ? "/admin" : "/empresa"}/ferias?empresa=${employee.companyId}&colaborador=${employee.id}`}>Consultar férias do colaborador</Link></Button>}
        {/* Voltar */}
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
          <Link href={isAdminRoute ? (employee ? `/admin/empresas/${employee.companyId}` : "/admin/empresas") : "/empresa/colaboradores"}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {isAdminRoute ? "Voltar para a empresa" : "Voltar para Colaboradores"}
          </Link>
        </Button>

        {employee && (
          <>
            {/* Header do Colaborador */}
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-lg">
                      {employee.nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{employee.nome}</h3>
                        <p className="text-sm text-muted-foreground font-mono">{employee.cpf}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={employee.status === "ativo"
                          ? "bg-green-500/10 text-green-700 dark:text-green-400"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}
                      >
                        {employee.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                      {selectedCargo && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {selectedCargo.nome}
                        </span>
                      )}
                      {selectedObra && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {selectedObra.nome}
                        </span>
                      )}
                      {employee.dataAdmissao && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Admissão: {formatDateOnlyBr(employee.dataAdmissao)}
                        </span>
                      )}
                      {employee.dataNascimento && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Nascimento: {formatDateOnlyBr(employee.dataNascimento)}
                        </span>
                      )}
                      {employee.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {employee.email}
                        </span>
                      )}
                      {employee.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {employee.telefone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-center shrink-0">
                    {employee.scoreConformidade !== null && employee.scoreConformidade !== undefined ? (
                      <p className={`text-3xl font-bold ${scoreColor(employee.scoreConformidade)}`}>
                        {employee.scoreConformidade}%
                      </p>
                    ) : (
                      <p className="text-3xl font-bold text-muted-foreground">—</p>
                    )}
                    <p className="text-xs text-muted-foreground">Conformidade</p>
                    <Badge variant="outline" className={`mt-1.5 text-xs ${RELEASE_COLORS[employee.liberacao as EmployeeRelease] ?? ""}`}>
                      {RELEASE_LABELS[employee.liberacao as EmployeeRelease] ?? employee.liberacao}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {checklist && (
              <DossieChecklist
                items={checklist.items as ChecklistItem[]}
                total={checklist.total}
                aprovados={checklist.aprovados}
                liberacao={checklist.liberacao}
                canSend={canManage}
                onSend={openChecklistUpload}
              />
            )}

            {mensais && (
              <MonthlyDocsGrid competencias={mensais.competencias} linhas={mensais.linhas as MonthlyRow[]} canSend={canManage} onSend={openMonthlyUpload} />
            )}

            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-foreground">Histórico do colaborador</h3>
                    <p className="text-sm text-muted-foreground">
                      Solicitações vinculadas e andamento completo deste colaborador.
                    </p>
                  </div>
                  <Badge variant="outline">
                    {historicoSolicitacoes.length} registro(s)
                  </Badge>
                </div>

                {historicoSolicitacoes.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Ainda não há solicitações vinculadas a este colaborador.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {historicoSolicitacoes.map((solicitacao) => (
                      <div key={solicitacao.id} className="rounded-lg border border-border p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{solicitacao.titulo}</p>
                            <p className="text-xs text-muted-foreground">{solicitacao.tipo}</p>
                          </div>
                          <Badge variant="outline">{solicitacao.status}</Badge>
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <p>Criada em {new Date(solicitacao.createdAt).toLocaleDateString("pt-BR")}</p>
                          <p>Prioridade: {solicitacao.prioridade}</p>
                          {solicitacao.concluidoAt ? (
                            <p>Concluída em {new Date(solicitacao.concluidoAt).toLocaleDateString("pt-BR")}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documentos por categoria */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-semibold text-foreground">Documentos do Colaborador</h3>
              {canManage && (
                <Button size="sm" onClick={openNewDoc} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Documento
                </Button>
              )}
            </div>

            <Tabs defaultValue="todos">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="todos">Todos ({documentos.length})</TabsTrigger>
                {Object.entries(categoriaLabels).map(([k, v]) => {
                  const count = byCategoria(k).length;
                  if (count === 0) return null;
                  return <TabsTrigger key={k} value={k}>{v} ({count})</TabsTrigger>;
                })}
              </TabsList>

              <TabsContent value="todos" className="mt-4">
                <DocGrid docs={documentos} canManage={canManage} canReview={canReview} reviewing={reviewMutation.isPending} onEdit={openEditDoc} onDelete={setDeleteTarget} onApprove={(doc) => reviewMutation.mutate({ id: doc.id, decisao: "aprovar" })} onReject={setRejectTarget} />
              </TabsContent>
              {Object.keys(categoriaLabels).map((cat) => (
                <TabsContent key={cat} value={cat} className="mt-4">
                  <DocGrid docs={byCategoria(cat)} canManage={canManage} canReview={canReview} reviewing={reviewMutation.isPending} onEdit={openEditDoc} onDelete={setDeleteTarget} onApprove={(doc) => reviewMutation.mutate({ id: doc.id, decisao: "aprovar" })} onReject={setRejectTarget} />
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </div>

      {/* Modal Upload */}
      <Dialog open={showUpload} onOpenChange={(open) => !open && closeDocDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Editar Documento" : "Enviar Documento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {uploadForm.competencia && (
              <p className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-foreground">
                Documento mensal da competência {formatCompetencia(uploadForm.competencia)}.
              </p>
            )}
            {uploadForm.requirementId && (
              <p className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-foreground">
                Este documento atende o item exigido pelo cargo e será validado pela equipe SmartDocPlan.
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={uploadForm.categoria} onValueChange={(v) => setUploadForm({ ...uploadForm, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoriaLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nome do Documento *</Label>
              <Input value={uploadForm.nome} onChange={(e) => setUploadForm({ ...uploadForm, nome: e.target.value })} placeholder="Ex: Certificado NR35 - João Silva" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Input value={uploadForm.tipo} onChange={(e) => setUploadForm({ ...uploadForm, tipo: e.target.value })} placeholder="Ex: PDF, Certificado, ASO" />
            </div>
            <div className="space-y-1.5">
              <Label>Data de Emissão</Label>
              <Input type="date" min={DOC_DATES.min} max={DOC_DATES.emissaoMax} value={uploadForm.dataEmissao} onChange={(e) => setUploadForm({ ...uploadForm, dataEmissao: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de Validade</Label>
              <Input type="date" min={DOC_DATES.min} max={DOC_DATES.validadeMax} value={uploadForm.validade} onChange={(e) => setUploadForm({ ...uploadForm, validade: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dossie-arquivo">{editingDoc ? "Substituir arquivo (opcional)" : "Arquivo *"}</Label>
              <Input
                id="dossie-arquivo"
                type="file"
                accept={DOCUMENT_FILE_ACCEPT}
                onChange={(e) => handleSelectFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                PDF, PNG ou JPG com até 10 MB.
                {editingDoc?.fileUrl && !selectedFile ? " Se nenhum arquivo for escolhido, o atual é mantido." : ""}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDocDialog}>Cancelar</Button>
            <Button
              onClick={handleSaveDoc}
              disabled={!uploadForm.nome.trim() || !uploadForm.categoria || (!editingDoc && !selectedFile) || isSavingDoc}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSavingDoc ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O documento "{deleteTarget?.nome}" deixará de aparecer no dossiê. O registro fica guardado no histórico da auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (deleteTarget) deleteDocMutation.mutate({ id: deleteTarget.id });
              }}
              disabled={deleteDocMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteDocMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rejeitar documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">O RH da empresa recebe o motivo e precisa enviar um novo arquivo para "{rejectTarget?.nome}".</p>
            <Label htmlFor="motivo-rejeicao">Motivo *</Label>
            <Textarea id="motivo-rejeicao" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Ex.: certificado ilegível ou sem assinatura do instrutor" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || reviewMutation.isPending}
              onClick={() => rejectTarget && reviewMutation.mutate({ id: rejectTarget.id, decisao: "rejeitar", motivo: rejectReason })}
            >
              {reviewMutation.isPending ? "Salvando..." : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function DocGrid({
  docs,
  canManage,
  canReview,
  reviewing,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: {
  docs: any[];
  canManage: boolean;
  canReview: boolean;
  reviewing: boolean;
  onEdit: (doc: any) => void;
  onDelete: (doc: any) => void;
  onApprove: (doc: any) => void;
  onReject: (doc: any) => void;
}) {
  if (docs.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Nenhum documento nesta categoria</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {docs.map((doc) => (
        <Card key={doc.id} className="border-border hover:border-primary/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{doc.nome}</p>
                  <Badge variant="outline" className={`text-xs shrink-0 ${docStatusColors[doc.status] ?? ""}`}>
                    {docStatusLabels[doc.status] ?? doc.status}
                  </Badge>
                </div>
                {doc.tipo && <p className="text-xs text-muted-foreground mt-0.5">{doc.tipo}</p>}
                {doc.dataEmissao && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Emissão: {formatDateOnlyBr(doc.dataEmissao)}
                  </p>
                )}
                {doc.validade && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Validade: {formatDateOnlyBr(doc.validade)}
                    {doc.situacaoValidade === "a_vencer" && (
                      <span className="ml-1.5 font-medium text-amber-700 dark:text-amber-400">· vence em até 30 dias</span>
                    )}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {doc.fileUrl && (
                    <>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Eye className="h-3 w-3" />
                        Visualizar
                      </a>
                      <a href={doc.fileUrl} download={doc.nome} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    </>
                  )}
                  {canManage && (
                    <>
                      <button type="button" onClick={() => onEdit(doc)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Pencil className="h-3 w-3" />
                        Editar
                      </button>
                      <button type="button" onClick={() => onDelete(doc)} className="inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                        <Trash2 className="h-3 w-3" />
                        Excluir
                      </button>
                    </>
                  )}
                </div>
                {doc.status === "rejeitado" && doc.motivoRejeicao && (
                  <p className="mt-2 rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-700 dark:text-red-400">Motivo da rejeição: {doc.motivoRejeicao}</p>
                )}
                {canReview && doc.status === "aguardando_validacao" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={reviewing} onClick={() => onApprove(doc)} className="h-7 border-green-500/40 text-green-700 hover:bg-green-500/10 dark:text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Aprovar
                    </Button>
                    <Button size="sm" variant="outline" disabled={reviewing} onClick={() => onReject(doc)} className="h-7 border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-400">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                )}
                {doc.versao > 1 && <p className="text-xs text-muted-foreground mt-1">Versão {doc.versao}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
