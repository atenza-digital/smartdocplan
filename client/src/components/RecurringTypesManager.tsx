import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarClock, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

const ALVO_LABELS: Record<string, string> = { colaborador: "Por colaborador", empresa: "Da empresa" };
const CATEGORIA_LABELS: Record<string, string> = { pessoal: "Pessoal", contratual: "Contratual", treinamento: "Treinamento", outros: "Outros" };

type FormState = { id?: number; nome: string; alvo: "colaborador" | "empresa"; categoria: string; diaLimite: string };
const emptyForm: FormState = { nome: "", alvo: "colaborador", categoria: "outros", diaLimite: "10" };

/** Cadastro dos documentos mensais da empresa (folha de ponto, ficha de EPI, contracheque…). */
export function RecurringTypesManager({ companyId, canEdit }: { companyId: number; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const { data: tipos = [], isLoading } = trpc.recurringDocs.list.useQuery({ companyId, incluirInativos: true }, { enabled: companyId > 0 });
  const [form, setForm] = useState<FormState | null>(null);

  const onSaved = (message: string) => {
    toast.success(message);
    setForm(null);
    utils.recurringDocs.invalidate();
  };
  const createMutation = trpc.recurringDocs.create.useMutation({ onSuccess: () => onSaved("Documento mensal cadastrado."), onError: (e) => toast.error(e.message) });
  const updateMutation = trpc.recurringDocs.update.useMutation({ onSuccess: () => onSaved("Documento mensal atualizado."), onError: (e) => toast.error(e.message) });

  const save = () => {
    if (!form) return;
    const diaLimite = Number(form.diaLimite);
    if (!Number.isInteger(diaLimite) || diaLimite < 1 || diaLimite > 28) {
      toast.error("O dia limite vai de 1 a 28.");
      return;
    }
    if (form.id) updateMutation.mutate({ id: form.id, nome: form.nome, categoria: form.categoria as any, diaLimite });
    else createMutation.mutate({ companyId, nome: form.nome, alvo: form.alvo, categoria: form.categoria as any, diaLimite });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarClock className="h-4 w-4 text-primary" />
              Documentos mensais
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Documentos enviados todo mês. O prazo é o dia limite do mês seguinte à competência (ex.: folha de ponto de setembro até o dia 10 de outubro).
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setForm(emptyForm)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo documento mensal
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
        ) : tipos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum documento mensal cadastrado. {canEdit ? "Cadastre, por exemplo, folha de ponto, ficha de EPI ou contracheque." : ""}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {tipos.map((tipo) => (
              <li key={tipo.id} className={`flex flex-wrap items-center gap-3 p-3 ${tipo.ativo ? "" : "opacity-60"}`}>
                <div className="min-w-[12rem] flex-1">
                  <p className="text-sm font-medium text-foreground">{tipo.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {ALVO_LABELS[tipo.alvo]} · prazo até o dia {tipo.diaLimite} do mês seguinte
                    {tipo.alvo === "colaborador" ? ` · ${CATEGORIA_LABELS[tipo.categoria] ?? tipo.categoria}` : ""}
                  </p>
                </div>
                {!tipo.ativo && <Badge variant="outline">Inativo</Badge>}
                {canEdit && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setForm({ id: tipo.id, nome: tipo.nome, alvo: tipo.alvo as any, categoria: tipo.categoria, diaLimite: String(tipo.diaLimite) })}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: tipo.id, ativo: !tipo.ativo })}>
                      {tipo.ativo ? "Desativar" : "Reativar"}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar documento mensal" : "Novo documento mensal"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="mensal-nome">Nome *</Label>
                <Input id="mensal-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Folha de ponto" />
              </div>
              <div className="space-y-1.5">
                <Label>Enviado</Label>
                <Select value={form.alvo} onValueChange={(v) => setForm({ ...form, alvo: v as any })} disabled={!!form.id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colaborador">Por colaborador (um por pessoa, no dossiê)</SelectItem>
                    <SelectItem value="empresa">Da empresa (um por mês, em Documentos da Empresa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.alvo === "colaborador" && (
                <div className="space-y-1.5">
                  <Label>Categoria no dossiê</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIA_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="mensal-dia">Dia limite no mês seguinte *</Label>
                <Input id="mensal-dia" type="number" min={1} max={28} value={form.diaLimite} onChange={(e) => setForm({ ...form, diaLimite: e.target.value })} className="w-28" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={save} disabled={!form?.nome.trim() || createMutation.isPending || updateMutation.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
