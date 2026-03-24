import { useState } from "react";
import CompanyLayout from "@/components/CompanyLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Ticket, Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  aberto: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  em_atendimento: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  aguardando_cliente: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  resolvido: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  fechado: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
};

const statusLabels: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em Atendimento",
  aguardando_cliente: "Aguardando Retorno",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

const tipoLabels: Record<string, string> = {
  criacao_usuario: "Criação de Usuário",
  bloqueio_usuario: "Bloqueio de Usuário",
  alteracao_acesso: "Alteração de Acesso",
  suporte_tecnico: "Suporte Técnico",
  duvida: "Dúvida",
  outros: "Outros",
};

export default function EmpresaChamados() {
  const { user } = useAuth();
  const companyId = user?.companyId ?? 0;
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    titulo: "", tipo: "duvida" as const, descricao: "", prioridade: "media" as const,
  });

  const { data: chamados = [], isLoading, refetch } = trpc.tickets.list.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );
  const { data: stats } = trpc.tickets.stats.useQuery();

  const createMutation = trpc.tickets.create.useMutation({
    onSuccess: () => {
      toast.success("Chamado aberto com sucesso!");
      setShowModal(false);
      refetch();
      setForm({ titulo: "", tipo: "duvida", descricao: "", prioridade: "media" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <CompanyLayout title="Chamados">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Chamados de Suporte</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Abra e acompanhe seus chamados de suporte com a equipe SmartDocPlan.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Abrir Chamado
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats?.total ?? 0, icon: Ticket, color: "text-primary" },
            { label: "Abertos", value: stats?.abertos ?? 0, icon: AlertCircle, color: "text-red-500" },
            { label: "Em Atendimento", value: stats?.emAtendimento ?? 0, icon: Clock, color: "text-amber-500" },
            { label: "Resolvidos", value: stats?.resolvidos ?? 0, icon: CheckCircle2, color: "text-green-500" },
          ].map((s) => (
            <Card key={s.label} className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {isLoading && [...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
          {!isLoading && chamados.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Ticket className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum chamado aberto</p>
              <p className="text-sm">Clique em "Abrir Chamado" para solicitar suporte</p>
            </div>
          )}
          {chamados.map((chamado) => (
            <Card key={chamado.id} className="border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">#{chamado.id} — {chamado.titulo}</span>
                      <Badge variant="outline" className={`text-xs ${statusColors[chamado.status]}`}>
                        {statusLabels[chamado.status]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {tipoLabels[chamado.tipo] ?? chamado.tipo}
                      </Badge>
                    </div>
                    {chamado.descricao && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{chamado.descricao}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Aberto em {new Date(chamado.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal Novo Chamado */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir Novo Chamado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo de Chamado *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Descreva brevemente o problema" />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição Detalhada</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descreva o problema com detalhes para facilitar o atendimento..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({ companyId, ...form })}
              disabled={!form.titulo || createMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {createMutation.isPending ? "Abrindo..." : "Abrir Chamado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CompanyLayout>
  );
}
