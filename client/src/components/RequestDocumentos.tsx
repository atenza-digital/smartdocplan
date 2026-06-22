import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Eye,
  Trash2,
  AlertCircle,
  CalendarDays,
  Hash,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  requestId: number;
  tipoSolicitacao: string;
  canUpload: boolean;
  canReview: boolean;
  readOnly?: boolean;
}

type UploadTarget = {
  templateId?: number;
  nome: string;
  categoria: string;
};

type ReviewTarget = {
  id: number;
  nome: string;
  numeroDocumento?: string | null;
  dataEmissao?: string | null;
  validade?: string | null;
};

const CATEGORIA_LABEL: Record<string, string> = {
  pessoal: "Pessoal",
  empresa: "Empresa",
  treinamento: "Treinamento",
  exame_medico: "Exame Médico",
  outros: "Outros",
};

const STATUS_CONFIG = {
  pendente: { label: "Pendente", icon: Clock, className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  aprovado: { label: "Aprovado", icon: CheckCircle2, className: "bg-green-500/10 text-green-700 border-green-500/20" },
  reprovado: { label: "Reprovado", icon: XCircle, className: "bg-red-500/10 text-red-700 border-red-500/20" },
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

export function RequestDocumentos({ requestId, tipoSolicitacao, canUpload, canReview, readOnly }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadModal, setUploadModal] = useState<UploadTarget | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = useState({ numeroDocumento: "", dataEmissao: "", validade: "" });
  const [avaliarModal, setAvaliarModal] = useState<ReviewTarget | null>(null);
  const [avaliarStatus, setAvaliarStatus] = useState<"aprovado" | "reprovado">("aprovado");
  const [motivo, setMotivo] = useState("");
  const [reviewMeta, setReviewMeta] = useState({ numeroDocumento: "", dataEmissao: "", validade: "" });

  const { data: templates = [] } = trpc.documentTemplates.listByTipo.useQuery(
    { tipoSolicitacao: tipoSolicitacao as any },
    { enabled: !!tipoSolicitacao }
  );

  const { data: uploads = [], refetch } = trpc.requestDocUploads.listByRequest.useQuery({ requestId });

  const uploadMutation = trpc.requestDocUploads.upload.useMutation({
    onSuccess: () => {
      toast.success("Documento enviado!");
      refetch();
      setUploadModal(null);
      setSelectedFile(null);
      setUploadMeta({ numeroDocumento: "", dataEmissao: "", validade: "" });
    },
    onError: (error) => toast.error("Erro no upload: " + error.message),
  });

  const avaliarMutation = trpc.requestDocUploads.avaliar.useMutation({
    onSuccess: () => {
      toast.success("Documento avaliado!");
      refetch();
      setAvaliarModal(null);
      setMotivo("");
      setReviewMeta({ numeroDocumento: "", dataEmissao: "", validade: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.requestDocUploads.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Documento removido.");
    },
    onError: (error) => toast.error(error.message),
  });

  const templatesPorCategoria = templates.reduce((acc, template) => {
    if (!acc[template.categoria]) acc[template.categoria] = [];
    acc[template.categoria].push(template);
    return acc;
  }, {} as Record<string, typeof templates>);

  const uploadsByTemplate = uploads.reduce((acc, upload) => {
    if (upload.templateId) acc[upload.templateId] = [...(acc[upload.templateId] || []), upload];
    return acc;
  }, {} as Record<number, typeof uploads>);

  const uploadsAvulsos = uploads.filter((upload) => !upload.templateId);
  const totalConfigurados = templates.length;
  const totalAnexados = uploads.length;
  const totalPendentes = uploads.filter((upload) => upload.status === "pendente").length;
  const totalAprovados = uploads.filter((upload) => upload.status === "aprovado").length;

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const openUploadModal = (target: UploadTarget) => {
    setUploadModal(target);
    setSelectedFile(null);
    setUploadMeta({ numeroDocumento: "", dataEmissao: "", validade: "" });
  };

  const handleUploadConfirm = async () => {
    if (!uploadModal || !selectedFile) {
      toast.error("Selecione um arquivo para anexar.");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setUploading(true);
    try {
      const fileBase64 = await fileToBase64(selectedFile);
      await uploadMutation.mutateAsync({
        requestId,
        templateId: uploadModal.templateId,
        nome: uploadModal.nome,
        categoria: uploadModal.categoria as any,
        obrigatorio: false,
        numeroDocumento: uploadMeta.numeroDocumento.trim() || undefined,
        dataEmissao: uploadMeta.dataEmissao || undefined,
        validade: uploadMeta.validade || undefined,
        fileNome: selectedFile.name,
        fileMime: selectedFile.type,
        fileTamanho: selectedFile.size,
        fileBase64,
      });
    } finally {
      setUploading(false);
    }
  };

  const openReviewModal = (doc: any) => {
    setAvaliarModal({
      id: doc.id,
      nome: doc.nome,
      numeroDocumento: doc.numeroDocumento ?? "",
      dataEmissao: doc.dataEmissao ?? "",
      validade: doc.validade ?? "",
    });
    setReviewMeta({
      numeroDocumento: doc.numeroDocumento ?? "",
      dataEmissao: doc.dataEmissao ? new Date(doc.dataEmissao).toISOString().slice(0, 10) : "",
      validade: doc.validade ? new Date(doc.validade).toISOString().slice(0, 10) : "",
    });
    setAvaliarStatus("aprovado");
    setMotivo(doc.motivoReprovacao ?? "");
  };

  return (
    <div className="space-y-4">
      {templates.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-xl font-bold text-primary">{totalConfigurados}</p>
            <p className="text-xs text-muted-foreground">Itens do checklist</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{totalAnexados}</p>
            <p className="text-xs text-muted-foreground">Arquivos anexados</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-xl font-bold text-yellow-600">{totalPendentes}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-xl font-bold text-green-600">{totalAprovados}</p>
            <p className="text-xs text-muted-foreground">Aprovados</p>
          </div>
        </div>
      )}

      {Object.entries(templatesPorCategoria).map(([categoria, categoriaTemplates]) => (
        <div key={categoria}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {CATEGORIA_LABEL[categoria]}
          </p>
          <div className="space-y-2">
            {categoriaTemplates.map((template) => {
              const docsEnviados = uploadsByTemplate[template.id] || [];
              const hasAprovado = docsEnviados.some((doc) => doc.status === "aprovado");
              const hasReprovado = docsEnviados.some((doc) => doc.status === "reprovado");

              return (
                <div
                  key={template.id}
                  className={`space-y-2 rounded-lg border p-3 ${
                    hasAprovado ? "border-green-500/30 bg-green-500/5" : hasReprovado ? "border-red-500/30 bg-red-500/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{template.nome}</span>
                        <Badge variant="outline" className="text-xs">
                          {CATEGORIA_LABEL[template.categoria] ?? template.categoria}
                        </Badge>
                        {template.sexo !== "todos" && (
                          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700">
                            {template.sexo}
                          </Badge>
                        )}
                      </div>
                      {template.descricao && <p className="mt-0.5 text-xs text-muted-foreground">{template.descricao}</p>}
                    </div>
                    {canUpload && !readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 text-xs"
                        disabled={uploading}
                        onClick={() => openUploadModal({ templateId: template.id, nome: template.nome, categoria: template.categoria })}
                      >
                        {docsEnviados.length > 0 ? <Plus className="mr-1 h-3 w-3" /> : <Upload className="mr-1 h-3 w-3" />}
                        {docsEnviados.length > 0 ? "Adicionar" : "Anexar"}
                      </Button>
                    )}
                  </div>

                  {docsEnviados.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                      Nenhum arquivo anexado ainda.
                    </div>
                  )}

                  {docsEnviados.map((doc) => (
                    <DocItem
                      key={doc.id}
                      doc={doc}
                      canReview={canReview}
                      canDelete={canUpload && !readOnly && doc.status !== "aprovado"}
                      onAvaliar={() => openReviewModal(doc)}
                      onDelete={() => {
                        if (window.confirm("Deseja excluir este arquivo?")) {
                          deleteMutation.mutate({ id: doc.id });
                        }
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {canUpload && !readOnly && (
        <div className="rounded-lg border-2 border-dashed p-4 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-40" />
          <p className="mb-2 text-sm text-muted-foreground">Adicionar documento complementar</p>
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => openUploadModal({ nome: "Documento adicional", categoria: "outros" })}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Enviar arquivo
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">PDF, JPG, PNG ou DOC — máx. 10MB</p>
        </div>
      )}

      {uploadsAvulsos.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentos adicionais</p>
          <div className="space-y-2">
            {uploadsAvulsos.map((doc) => (
              <DocItem
                key={doc.id}
                doc={doc}
                canReview={canReview}
                canDelete={canUpload && !readOnly}
                onAvaliar={() => openReviewModal(doc)}
                onDelete={() => {
                  if (window.confirm("Deseja excluir este arquivo?")) {
                    deleteMutation.mutate({ id: doc.id });
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!uploadModal} onOpenChange={() => setUploadModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Anexar documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Documento</Label>
              <p className="text-sm text-muted-foreground">{uploadModal?.nome}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="request-upload-file">Arquivo</Label>
              <Input
                id="request-upload-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Número / referência</Label>
                <Input
                  value={uploadMeta.numeroDocumento}
                  onChange={(event) => setUploadMeta((current) => ({ ...current, numeroDocumento: event.target.value }))}
                  placeholder="Ex: nº do ASO, registro, protocolo"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data de emissão</Label>
                <Input
                  type="date"
                  value={uploadMeta.dataEmissao}
                  onChange={(event) => setUploadMeta((current) => ({ ...current, dataEmissao: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Validade</Label>
              <Input
                type="date"
                value={uploadMeta.validade}
                onChange={(event) => setUploadMeta((current) => ({ ...current, validade: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUploadConfirm} disabled={uploadMutation.isPending || uploading}>
              {uploadMutation.isPending || uploading ? "Enviando..." : "Enviar documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!avaliarModal} onOpenChange={() => setAvaliarModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Avaliar documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{avaliarModal?.nome}</p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAvaliarStatus("aprovado")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                  avaliarStatus === "aprovado" ? "border-green-500 bg-green-500/10 text-green-700" : "border-border hover:border-green-500/50"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Aprovar
              </button>
              <button
                type="button"
                onClick={() => setAvaliarStatus("reprovado")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                  avaliarStatus === "reprovado" ? "border-red-500 bg-red-500/10 text-red-700" : "border-border hover:border-red-500/50"
                }`}
              >
                <XCircle className="h-4 w-4" />
                Reprovar
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Número / referência</Label>
                <Input
                  value={reviewMeta.numeroDocumento}
                  onChange={(event) => setReviewMeta((current) => ({ ...current, numeroDocumento: event.target.value }))}
                  placeholder="Ex: nº do ASO, registro, protocolo"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data de emissão</Label>
                <Input
                  type="date"
                  value={reviewMeta.dataEmissao}
                  onChange={(event) => setReviewMeta((current) => ({ ...current, dataEmissao: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Validade</Label>
              <Input
                type="date"
                value={reviewMeta.validade}
                onChange={(event) => setReviewMeta((current) => ({ ...current, validade: event.target.value }))}
              />
            </div>

            {avaliarStatus === "reprovado" && (
              <div className="space-y-1.5">
                <Label>Motivo da reprovação *</Label>
                <Textarea
                  placeholder="Informe o motivo para o solicitante corrigir..."
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  rows={5}
                  className="min-h-28 resize-y"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvaliarModal(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!avaliarModal) return;
                if (avaliarStatus === "reprovado" && !motivo.trim()) {
                  toast.error("Informe o motivo da reprovação.");
                  return;
                }
                avaliarMutation.mutate({
                  id: avaliarModal.id,
                  status: avaliarStatus,
                  motivoReprovacao: motivo || undefined,
                  numeroDocumento: reviewMeta.numeroDocumento.trim() || undefined,
                  dataEmissao: reviewMeta.dataEmissao || undefined,
                  validade: reviewMeta.validade || undefined,
                });
              }}
              className={avaliarStatus === "aprovado" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              disabled={avaliarMutation.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocItem({
  doc,
  canReview,
  canDelete,
  onAvaliar,
  onDelete,
}: {
  doc: any;
  canReview: boolean;
  canDelete: boolean;
  onAvaliar: () => void;
  onDelete: () => void;
}) {
  const config = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente;
  const Icon = config.icon;
  const numeroDocumento = doc.numeroDocumento?.trim();
  const dataEmissao = formatDate(doc.dataEmissao);
  const validade = formatDate(doc.validade);

  return (
    <div className="rounded-lg border bg-background p-2 text-sm">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{doc.fileNome || doc.nome}</p>

          {(numeroDocumento || dataEmissao || validade) && (
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              {numeroDocumento && (
                <span className="inline-flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {numeroDocumento}
                </span>
              )}
              {dataEmissao && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Emissão: {dataEmissao}
                </span>
              )}
              {validade && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Validade: {validade}
                </span>
              )}
            </div>
          )}

          {doc.motivoReprovacao && (
            <p className="mt-0.5 text-xs text-red-600">
              <span className="font-medium">Motivo:</span> {doc.motivoReprovacao}
            </p>
          )}
        </div>

        <Badge variant="outline" className={`shrink-0 text-xs ${config.className}`}>
          <Icon className="mr-1 h-3 w-3" />
          {config.label}
        </Badge>

        <div className="flex shrink-0 gap-1">
          {doc.fileUrl && (
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" title="Visualizar">
                <Eye className="h-3 w-3" />
              </Button>
            </a>
          )}
          {canReview && doc.status === "pendente" && (
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-primary" title="Avaliar" onClick={onAvaliar}>
              <CheckCircle2 className="h-3 w-3" />
            </Button>
          )}
          {canDelete && (
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Remover" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
