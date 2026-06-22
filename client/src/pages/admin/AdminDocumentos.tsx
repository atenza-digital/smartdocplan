import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

const TIPOS_LABEL: Record<string, string> = {
  admissao: "Admissão", demissao: "Demissão", mudanca_funcao: "Mudança de Função",
  afastamento: "Afastamento", atestado_medico: "Atestado Médico", outros: "Outros",
};
const TIPOS = Object.keys(TIPOS_LABEL);

const CATEGORIA_LABEL: Record<string, string> = {
  pessoal: "Pessoal", empresa: "Empresa", treinamento: "Treinamento", exame_medico: "Exame Médico", psicossocial: "Psicossocial", outros: "Outros",
};

const CATEGORIA_COLORS: Record<string, string> = {
  pessoal: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  empresa: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  treinamento: "bg-green-500/10 text-green-700 border-green-500/20",
  exame_medico: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  psicossocial: "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20",
  outros: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const emptyForm = {
  tipoSolicitacao: "admissao" as const,
  categoria: "pessoal" as const,
  nome: "",
  descricao: "",
  obrigatorio: false,
  sexo: "todos" as const,
  ordem: 0,
};

export default function AdminDocumentos() {
  const [tipoAtivo, setTipoAtivo] = useState("admissao");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: templates = [], refetch } = trpc.documentTemplates.list.useQuery();

  const createMutation = trpc.documentTemplates.create.useMutation({
    onSuccess: () => { toast.success("Documento criado!"); refetch(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.documentTemplates.update.useMutation({
    onSuccess: () => { toast.success("Atualizado!"); refetch(); setShowModal(false); setEditando(null); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.documentTemplates.delete.useMutation({
    onSuccess: () => { toast.success("Removido!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const filtrados = templates.filter(t => t.tipoSolicitacao === tipoAtivo);

  const abrirNovo = () => {
    setForm({ ...emptyForm, tipoSolicitacao: tipoAtivo as any });
    setEditando(null);
    setShowModal(true);
  };

  const abrirEditar = (t: typeof templates[0]) => {
    setForm({
      tipoSolicitacao: t.tipoSolicitacao as any,
      categoria: t.categoria as any,
      nome: t.nome,
      descricao: t.descricao ?? "",
      obrigatorio: t.obrigatorio,
      sexo: t.sexo as any,
      ordem: t.ordem,
    });
    setEditando(t.id);
    setShowModal(true);
  };

  const salvar = () => {
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    if (editando) {
      updateMutation.mutate({ id: editando, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <AdminLayout title="Gestão de Documentos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Checklist de Documentos</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Configure quais documentos são exigidos em cada tipo de solicitação.
            </p>
          </div>
          <Button onClick={abrirNovo} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Novo Documento
          </Button>
        </div>

        {/* Tabs por tipo de solicitação */}
        <Tabs value={tipoAtivo} onValueChange={setTipoAtivo}>
          <TabsList className="flex-wrap h-auto gap-1">
            {TIPOS.map(t => (
              <TabsTrigger key={t} value={t} className="text-xs">
                {TIPOS_LABEL[t]}
                <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">
                  {templates.filter(d => d.tipoSolicitacao === t && d.ativo).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {TIPOS.map(tipo => (
            <TabsContent key={tipo} value={tipo}>
              {filtrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
                  <FileText className="w-10 h-10 mb-3 opacity-30" />
                  <p className="font-medium">Nenhum documento configurado</p>
                  <p className="text-sm mt-1">Clique em "Novo Documento" para adicionar</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={abrirNovo}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  {["pessoal", "empresa", "treinamento", "exame_medico", "psicossocial", "outros"].map(cat => {
                    const docs = filtrados.filter(d => d.categoria === cat);
                    if (docs.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                          {CATEGORIA_LABEL[cat]}
                        </p>
                        <div className="space-y-1.5">
                          {docs.map(doc => (
                            <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-lg border ${doc.ativo ? "bg-card" : "bg-muted/40 opacity-60"}`}>
                              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">{doc.nome}</span>
                                  <Badge variant="outline" className={`text-xs ${CATEGORIA_COLORS[doc.categoria]}`}>
                                    {CATEGORIA_LABEL[doc.categoria]}
                                  </Badge>
                                  {doc.sexo !== "todos" && (
                                    <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 border-purple-500/20">
                                      {doc.sexo === "masculino" ? "♂ Masculino" : "♀ Feminino"}
                                    </Badge>
                                  )}
                                </div>
                                {doc.descricao && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.descricao}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEditar(doc)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (window.confirm("Deseja excluir este documento do checklist?")) {
                                      deleteMutation.mutate({ id: doc.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Modal criar/editar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Documento" : "Novo Documento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Solicitação *</Label>
                <Select value={form.tipoSolicitacao} onValueChange={v => setForm(f => ({ ...f, tipoSolicitacao: v as any }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => <SelectItem key={t} value={t}>{TIPOS_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria *</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v as any }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIA_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Documento *</Label>
              <Input className="h-9 text-sm" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: RG, CPF, ASO Admissional..." />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descrição / Instruções</Label>
              <Input className="h-9 text-sm" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Orientações para o usuário..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Aplica-se a</Label>
                <Select value={form.sexo} onValueChange={v => setForm(f => ({ ...f, sexo: v as any }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ordem</Label>
                <Input type="number" className="h-9 text-sm" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary hover:bg-primary/90">
              {editando ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
