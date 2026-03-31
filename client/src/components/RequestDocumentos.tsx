import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Upload, CheckCircle2, XCircle, Clock, FileText,
  Eye, Trash2, AlertCircle, Download,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  requestId: number;
  tipoSolicitacao: string;
  canUpload: boolean;    // empresa pode fazer upload
  canReview: boolean;    // analista/admin pode aprovar/reprovar
  readOnly?: boolean;
}

const CATEGORIA_LABEL: Record<string, string> = {
  pessoal: "Pessoal", treinamento: "Treinamento", exame_medico: "Exame Médico", outros: "Outros",
};

const STATUS_CONFIG = {
  pendente: { label: "Pendente", icon: Clock, className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  aprovado: { label: "Aprovado", icon: CheckCircle2, className: "bg-green-500/10 text-green-700 border-green-500/20" },
  reprovado: { label: "Reprovado", icon: XCircle, className: "bg-red-500/10 text-red-700 border-red-500/20" },
};

export function RequestDocumentos({ requestId, tipoSolicitacao, canUpload, canReview, readOnly }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avaliarModal, setAvaliarModal] = useState<{ id: number; nome: string } | null>(null);
  const [avaliarStatus, setAvaliarStatus] = useState<"aprovado" | "reprovado">("aprovado");
  const [motivo, setMotivo] = useState("");
  const [uploadingFor, setUploadingFor] = useState<{ templateId?: number; nome: string; categoria: string; obrigatorio: boolean } | null>(null);

  const { data: templates = [] } = trpc.documentTemplates.listByTipo.useQuery(
    { tipoSolicitacao: tipoSolicitacao as any },
    { enabled: !!tipoSolicitacao }
  );

  const { data: uploads = [], refetch } = trpc.requestDocUploads.listByRequest.useQuery({ requestId });

  const uploadMutation = trpc.requestDocUploads.upload.useMutation({
    onSuccess: () => { toast.success("Documento enviado!"); refetch(); setUploadingFor(null); },
    onError: (e) => toast.error("Erro no upload: " + e.message),
  });

  const avaliarMutation = trpc.requestDocUploads.avaliar.useMutation({
    onSuccess: () => { toast.success("Documento avaliado!"); refetch(); setAvaliarModal(null); setMotivo(""); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.requestDocUploads.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Removido"); },
    onError: (e) => toast.error(e.message),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingFor) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      await uploadMutation.mutateAsync({
        requestId,
        templateId: uploadingFor.templateId,
        nome: uploadingFor.nome,
        categoria: uploadingFor.categoria as any,
        obrigatorio: uploadingFor.obrigatorio,
        fileNome: file.name,
        fileMime: file.type,
        fileTamanho: file.size,
        fileBase64: base64,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const triggerUpload = (info: typeof uploadingFor) => {
    setUploadingFor(info);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  // Agrupar templates por categoria
  const templatesPorCategoria = templates.reduce((acc, t) => {
    if (!acc[t.categoria]) acc[t.categoria] = [];
    acc[t.categoria].push(t);
    return acc;
  }, {} as Record<string, typeof templates>);

  // Verificar quais templates têm upload
  const uploadsByTemplate = uploads.reduce((acc, u) => {
    if (u.templateId) acc[u.templateId] = [...(acc[u.templateId] || []), u];
    return acc;
  }, {} as Record<number, typeof uploads>);

  // Uploads sem template (avulsos)
  const uploadsAvulsos = uploads.filter(u => !u.templateId);

  const totalObrigatorios = templates.filter(t => t.obrigatorio && t.sexo === "todos").length;
  const totalEnviados = templates.filter(t => uploadsByTemplate[t.id]?.some(u => u.status === "aprovado")).length;
  const totalPendentes = templates.filter(t => t.obrigatorio && !uploadsByTemplate[t.id]?.length).length;

  return (
    <div className="space-y-4">
      {/* Input file oculto */}
      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileSelect} />

      {/* Resumo */}
      {templates.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-primary">{totalEnviados}/{totalObrigatorios}</p>
            <p className="text-xs text-muted-foreground">Aprovados</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-yellow-600">{uploads.filter(u => u.status === "pendente").length}</p>
            <p className="text-xs text-muted-foreground">Em análise</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-red-600">{totalPendentes}</p>
            <p className="text-xs text-muted-foreground">Faltando</p>
          </div>
        </div>
      )}

      {/* Templates por categoria */}
      {Object.entries(templatesPorCategoria).map(([cat, tpls]) => (
        <div key={cat}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {CATEGORIA_LABEL[cat]}
          </p>
          <div className="space-y-2">
            {tpls.map(tpl => {
              const docsEnviados = uploadsByTemplate[tpl.id] || [];
              const hasAprovado = docsEnviados.some(d => d.status === "aprovado");
              const hasReprovado = docsEnviados.some(d => d.status === "reprovado");
              const hasPendente = docsEnviados.some(d => d.status === "pendente");

              return (
                <div key={tpl.id} className={`border rounded-lg p-3 space-y-2 ${hasAprovado ? "border-green-500/30 bg-green-500/5" : hasReprovado ? "border-red-500/30 bg-red-500/5" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{tpl.nome}</span>
                        {tpl.obrigatorio ? (
                          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-700 border-red-500/20">Obrigatório</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Opcional</Badge>
                        )}
                        {tpl.sexo !== "todos" && (
                          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700">{tpl.sexo}</Badge>
                        )}
                      </div>
                      {tpl.descricao && <p className="text-xs text-muted-foreground mt-0.5">{tpl.descricao}</p>}
                    </div>
                    {canUpload && !readOnly && !hasAprovado && (
                      <Button
                        variant="outline" size="sm"
                        className="h-7 text-xs shrink-0"
                        disabled={uploading}
                        onClick={() => triggerUpload({ templateId: tpl.id, nome: tpl.nome, categoria: tpl.categoria, obrigatorio: tpl.obrigatorio })}
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        {hasPendente || hasReprovado ? "Reenviar" : "Enviar"}
                      </Button>
                    )}
                  </div>

                  {/* Documentos enviados para este template */}
                  {docsEnviados.map(doc => (
                    <DocItem key={doc.id} doc={doc} canReview={canReview} canDelete={canUpload && !readOnly && doc.status !== "aprovado"}
                      onAvaliar={() => { setAvaliarModal({ id: doc.id, nome: doc.nome }); setAvaliarStatus("aprovado"); setMotivo(""); }}
                      onDelete={() => deleteMutation.mutate({ id: doc.id })}
                    />
                  ))}

                  {docsEnviados.length === 0 && tpl.obrigatorio && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                      Documento ainda não enviado
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Upload avulso */}
      {canUpload && !readOnly && (
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground mb-2">Adicionar documento adicional</p>
          <Button variant="outline" size="sm" disabled={uploading}
            onClick={() => triggerUpload({ nome: "Documento Adicional", categoria: "outros", obrigatorio: false })}>
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Enviar Arquivo
          </Button>
          <p className="text-xs text-muted-foreground mt-2">PDF, JPG, PNG ou DOC — máx. 10MB</p>
        </div>
      )}

      {/* Uploads avulsos */}
      {uploadsAvulsos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Documentos Adicionais</p>
          <div className="space-y-2">
            {uploadsAvulsos.map(doc => (
              <DocItem key={doc.id} doc={doc} canReview={canReview} canDelete={canUpload && !readOnly}
                onAvaliar={() => { setAvaliarModal({ id: doc.id, nome: doc.nome }); setAvaliarStatus("aprovado"); setMotivo(""); }}
                onDelete={() => deleteMutation.mutate({ id: doc.id })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal de avaliação */}
      <Dialog open={!!avaliarModal} onOpenChange={() => setAvaliarModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Avaliar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{avaliarModal?.nome}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAvaliarStatus("aprovado")}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${avaliarStatus === "aprovado" ? "border-green-500 bg-green-500/10 text-green-700" : "border-border hover:border-green-500/50"}`}
              >
                <CheckCircle2 className="w-4 h-4" /> Aprovar
              </button>
              <button
                onClick={() => setAvaliarStatus("reprovado")}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${avaliarStatus === "reprovado" ? "border-red-500 bg-red-500/10 text-red-700" : "border-border hover:border-red-500/50"}`}
              >
                <XCircle className="w-4 h-4" /> Reprovar
              </button>
            </div>
            {avaliarStatus === "reprovado" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Motivo da reprovação *</label>
                <Textarea
                  placeholder="Informe o motivo para o solicitante corrigir..."
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className="text-sm resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvaliarModal(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!avaliarModal) return;
                if (avaliarStatus === "reprovado" && !motivo.trim()) {
                  toast.error("Informe o motivo da reprovação");
                  return;
                }
                avaliarMutation.mutate({ id: avaliarModal.id, status: avaliarStatus, motivoReprovacao: motivo || undefined });
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

// Sub-componente para exibir um documento enviado
function DocItem({ doc, canReview, canDelete, onAvaliar, onDelete }: {
  doc: any; canReview: boolean; canDelete: boolean;
  onAvaliar: () => void; onDelete: () => void;
}) {
  const cfg = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente;
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border text-sm">
      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-xs">{doc.fileNome || doc.nome}</p>
        {doc.motivoReprovacao && (
          <p className="text-xs text-red-600 mt-0.5">
            <span className="font-medium">Motivo:</span> {doc.motivoReprovacao}
          </p>
        )}
      </div>
      <Badge variant="outline" className={`text-xs shrink-0 ${cfg.className}`}>
        <Icon className="w-3 h-3 mr-1" />
        {cfg.label}
      </Badge>
      <div className="flex gap-1 shrink-0">
        {doc.fileUrl && (
          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="h-6 w-6" title="Visualizar">
              <Eye className="w-3 h-3" />
            </Button>
          </a>
        )}
        {canReview && doc.status === "pendente" && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" title="Avaliar" onClick={onAvaliar}>
            <CheckCircle2 className="w-3 h-3" />
          </Button>
        )}
        {canDelete && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Remover" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
