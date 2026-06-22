import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CalendarClock, CheckCircle2, Edit, FileText, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

const COMPANY_DOCUMENT_TYPES = [
  { tipo: "cartao_cnpj", nome: "Cartão CNPJ", obrigatorio: true },
  { tipo: "contrato_social", nome: "Contrato Social", obrigatorio: true },
  { tipo: "pcmso", nome: "PCMSO", obrigatorio: true },
  { tipo: "pgr", nome: "PGR", obrigatorio: true },
  { tipo: "ltcat", nome: "LTCAT", obrigatorio: true },
  { tipo: "cno", nome: "CNO", obrigatorio: false },
] as const;

type UploadForm = {
  tipo: string;
  nome: string;
  validade: string;
  observacao: string;
};

type EditForm = {
  id: number;
  nome: string;
  validade: string;
  observacao: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatDate(value?: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR");
}

function getDocumentStatus(validade?: string | Date | null) {
  if (!validade) return { key: "sem_validade", label: "Sem validade", tone: "bg-muted text-muted-foreground" };
  const today = new Date();
  const warning = new Date();
  warning.setDate(warning.getDate() + 30);
  const expiry = new Date(validade);
  if (expiry < today) return { key: "vencido", label: "Vencido", tone: "bg-red-500/10 text-red-700 border border-red-500/20" };
  if (expiry <= warning) return { key: "a_vencer", label: "A vencer", tone: "bg-amber-500/10 text-amber-700 border border-amber-500/20" };
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
  const { data: docs = [] } = trpc.companyDocuments.listByCompany.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: stats } = trpc.companyDocuments.statsByCompany.useQuery({ companyId }, { enabled: companyId > 0 });

  const [uploadTarget, setUploadTarget] = useState<(typeof COMPANY_DOCUMENT_TYPES)[number] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState<UploadForm>({ tipo: "", nome: "", validade: "", observacao: "" });
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const createMutation = trpc.companyDocuments.create.useMutation({
    onSuccess: async () => {
      toast.success("Documento da empresa enviado com sucesso!");
      await utils.companyDocuments.listByCompany.invalidate({ companyId });
      await utils.companyDocuments.statsByCompany.invalidate({ companyId });
      setUploadTarget(null);
      setSelectedFile(null);
      setUploadForm({ tipo: "", nome: "", validade: "", observacao: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.companyDocuments.update.useMutation({
    onSuccess: async () => {
      toast.success("Documento da empresa atualizado!");
      await utils.companyDocuments.listByCompany.invalidate({ companyId });
      await utils.companyDocuments.statsByCompany.invalidate({ companyId });
      setEditForm(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.companyDocuments.delete.useMutation({
    onSuccess: async () => {
      toast.success("Documento da empresa removido.");
      await utils.companyDocuments.listByCompany.invalidate({ companyId });
      await utils.companyDocuments.statsByCompany.invalidate({ companyId });
    },
    onError: (error) => toast.error(error.message),
  });

  const docsByType = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const doc of docs) {
      const current = map.get(doc.tipo) ?? [];
      current.push(doc);
      map.set(doc.tipo, current);
    }
    return map;
  }, [docs]);

  const documentRows = COMPANY_DOCUMENT_TYPES.map((item) => {
    const versions = [...(docsByType.get(item.tipo) ?? [])].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const latest = versions[0];
    return { ...item, latest, versions };
  });

  const handleOpenUpload = (target: (typeof COMPANY_DOCUMENT_TYPES)[number]) => {
    setUploadTarget(target);
    setSelectedFile(null);
    setUploadForm({ tipo: target.tipo, nome: target.nome, validade: "", observacao: "" });
  };

  const handleUpload = async () => {
    if (!uploadTarget || !selectedFile) {
      toast.error("Selecione um arquivo para enviar.");
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      toast.error("O arquivo excede o limite de 15MB.");
      return;
    }
    const fileBase64 = await fileToBase64(selectedFile);
    await createMutation.mutateAsync({
      companyId,
      tipo: uploadForm.tipo,
      nome: uploadForm.nome.trim() || uploadTarget.nome,
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

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Enviados</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{stats?.enviados ?? 0}</p>
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
          const status = latest ? getDocumentStatus(latest.validade) : null;

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
                        <p>Última atualização: {formatDate(latest.updatedAt) ?? "-"}</p>
                        {latest.validade ? <p>Validade: {formatDate(latest.validade)}</p> : null}
                        {latest.observacao ? <p className="whitespace-pre-wrap">{latest.observacao}</p> : null}
                        {latest.fileUrl ? (
                          <a href={latest.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            <FileText className="h-3.5 w-3.5" />
                            Ver arquivo
                          </a>
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
                                validade: latest.validade ? new Date(latest.validade).toISOString().slice(0, 10) : "",
                                observacao: latest.observacao ?? "",
                              })
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (window.confirm("Deseja remover este arquivo da empresa?")) {
                                deleteMutation.mutate({ id: latest.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                {item.versions.length > 1 ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Versões anteriores</p>
                    <div className="space-y-2">
                      {item.versions.slice(1).map((doc) => (
                        <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium text-foreground">{doc.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              Atualizado em {formatDate(doc.updatedAt) ?? "-"}
                              {doc.validade ? ` • validade ${formatDate(doc.validade)}` : ""}
                            </p>
                          </div>
                          {doc.fileUrl ? (
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              Abrir
                            </a>
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

      <Dialog open={!!uploadTarget} onOpenChange={(open) => !open && setUploadTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar documento da empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Documento</Label>
              <Input value={uploadForm.nome} onChange={(event) => setUploadForm((current) => ({ ...current, nome: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Arquivo</Label>
              <Input type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Validade</Label>
              <Input type="date" value={uploadForm.validade} onChange={(event) => setUploadForm((current) => ({ ...current, validade: event.target.value }))} />
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
        <DialogContent className="sm:max-w-lg">
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
                <Label>Validade</Label>
                <Input type="date" value={editForm.validade} onChange={(event) => setEditForm((current) => (current ? { ...current, validade: event.target.value } : current))} />
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
                updateMutation.mutate({
                  id: editForm.id,
                  nome: editForm.nome.trim(),
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
