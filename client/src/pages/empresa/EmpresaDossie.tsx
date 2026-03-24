import { useState } from "react";
import CompanyLayout from "@/components/CompanyLayout";
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
  FolderOpen, FileText, CheckCircle2, AlertCircle, Clock,
  Upload, ArrowLeft, User, Calendar,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

type DocStatus = "valido" | "vencido" | "pendente" | "rejeitado" | "aguardando_validacao";

const docStatusColors: Record<string, string> = {
  valido: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  vencido: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
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
  opcional: "Opcional",
};

export default function EmpresaDossie() {
  const [, params] = useRoute("/empresa/colaboradores/:id");
  const employeeId = parseInt(params?.id ?? "0");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    categoria: "pessoal" as const,
    nome: "",
    tipo: "",
    validade: "",
    fileUrl: "",
  });

  const { data: employee } = trpc.employees.get.useQuery(
    { id: employeeId },
    { enabled: employeeId > 0 }
  );
  const { data: documentos = [], refetch } = trpc.employeeDocs.list.useQuery(
    { employeeId },
    { enabled: employeeId > 0 }
  );

  const createDocMutation = trpc.employeeDocs.create.useMutation({
    onSuccess: () => {
      toast.success("Documento cadastrado com sucesso!");
      setShowUpload(false);
      refetch();
      setUploadForm({ categoria: "pessoal", nome: "", tipo: "", validade: "", fileUrl: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  if (!employee && employeeId > 0) {
    return (
      <CompanyLayout title="Dossiê">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>Carregando colaborador...</p>
        </div>
      </CompanyLayout>
    );
  }

  const scoreColor = (score: number) =>
    score >= 80 ? "text-green-600 dark:text-green-400" : score >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  const byCategoria = (cat: string) => documentos.filter((d) => d.categoria === cat);

  return (
    <CompanyLayout title={employee ? `Dossiê — ${employee.nome}` : "Dossiê"}>
      <div className="space-y-6">
        {/* Voltar */}
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
          <Link href="/empresa/colaboradores">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar para Colaboradores
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
                      {employee.dataAdmissao && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Admissão: {new Date(employee.dataAdmissao).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {employee.email && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {employee.email}
                        </span>
                      )}
                    </div>
                  </div>
                  {employee.scoreConformidade !== null && employee.scoreConformidade !== undefined && (
                    <div className="text-center shrink-0">
                      <p className={`text-3xl font-bold ${scoreColor(employee.scoreConformidade)}`}>
                        {employee.scoreConformidade}%
                      </p>
                      <p className="text-xs text-muted-foreground">Conformidade</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Documentos por categoria */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Documentos do Colaborador</h3>
              <Button size="sm" onClick={() => setShowUpload(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Upload className="w-4 h-4 mr-2" />
                Enviar Documento
              </Button>
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
                <DocGrid docs={documentos} />
              </TabsContent>
              {Object.keys(categoriaLabels).map((cat) => (
                <TabsContent key={cat} value={cat} className="mt-4">
                  <DocGrid docs={byCategoria(cat)} />
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </div>

      {/* Modal Upload */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={uploadForm.categoria} onValueChange={(v) => setUploadForm({ ...uploadForm, categoria: v as any })}>
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
              <Label>Data de Validade</Label>
              <Input type="date" value={uploadForm.validade} onChange={(e) => setUploadForm({ ...uploadForm, validade: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>URL do Arquivo (opcional)</Label>
              <Input value={uploadForm.fileUrl} onChange={(e) => setUploadForm({ ...uploadForm, fileUrl: e.target.value })} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">Cole o link do documento ou faça upload via sistema de arquivos</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancelar</Button>
            <Button
              onClick={() => createDocMutation.mutate({
                employeeId,
                companyId: employee?.companyId ?? 0,
                categoria: uploadForm.categoria,
                nome: uploadForm.nome,
                tipo: uploadForm.tipo || undefined,
                validade: uploadForm.validade || undefined,
                fileUrl: uploadForm.fileUrl || undefined,
                obrigatorio: true,
              })}
              disabled={!uploadForm.nome || !uploadForm.categoria || createDocMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {createDocMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CompanyLayout>
  );
}

function DocGrid({ docs }: { docs: any[] }) {
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
                    {doc.status}
                  </Badge>
                </div>
                {doc.tipo && <p className="text-xs text-muted-foreground mt-0.5">{doc.tipo}</p>}
                {doc.validade && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Validade: {new Date(doc.validade).toLocaleDateString("pt-BR")}
                  </p>
                )}
                {doc.fileUrl && (
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                    Ver documento
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
