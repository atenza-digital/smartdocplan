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
import { PERIODICIDADES, PERIODICIDADE_LABELS, asPeriodicidade, formatPeriod, recentPeriods, recurringDeadline, type Periodicidade } from "@shared/recurring";
import { formatDateOnlyBr } from "@shared/formValidation";
import { brazilToday } from "@shared/vacations";

const ALVO_LABELS: Record<string, string> = { colaborador: "Por colaborador", empresa: "Da empresa" };
const CATEGORIA_LABELS: Record<string, string> = { pessoal: "Pessoal", contratual: "Contratual", treinamento: "Treinamento", outros: "Outros" };

type FormState = { id?: number; nome: string; alvo: "colaborador" | "empresa"; categoria: string; periodicidade: Periodicidade; prazoDias: string };
const emptyForm: FormState = { nome: "", alvo: "colaborador", categoria: "outros", periodicidade: "mensal", prazoDias: "10" };

/** Cadastro dos documentos recorrentes da empresa (folha de ponto, ficha de EPI, contracheque…), de semanal a anual. */
export function RecurringTypesManager({ companyId, canEdit }: { companyId: number; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const { data: tipos = [], isLoading } = trpc.recurringDocs.list.useQuery({ companyId, incluirInativos: true }, { enabled: companyId > 0 });
  const [form, setForm] = useState<FormState | null>(null);

  const onSaved = (message: string) => {
    toast.success(message);
    setForm(null);
    utils.recurringDocs.invalidate();
  };
  const createMutation = trpc.recurringDocs.create.useMutation({ onSuccess: () => onSaved("Documento recorrente cadastrado."), onError: (e) => toast.error(e.message) });
  const updateMutation = trpc.recurringDocs.update.useMutation({ onSuccess: () => onSaved("Documento recorrente atualizado."), onError: (e) => toast.error(e.message) });

  const prazoValido = (value: string) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 90 && value.trim() !== "";

  const save = () => {
    if (!form) return;
    if (!prazoValido(form.prazoDias)) {
      toast.error("O prazo vai de 0 a 90 dias.");
      return;
    }
    const prazoDias = Number(form.prazoDias);
    if (form.id) updateMutation.mutate({ id: form.id, nome: form.nome, categoria: form.categoria as any, periodicidade: form.periodicidade, prazoDias });
    else createMutation.mutate({ companyId, nome: form.nome, alvo: form.alvo, categoria: form.categoria as any, periodicidade: form.periodicidade, prazoDias });
  };

  // Exemplo com o último período encerrado, para a pessoa entender o prazo.
  const exemplo = form && prazoValido(form.prazoDias)
    ? (() => {
        const inicio = recentPeriods(form.periodicidade, 1, brazilToday())[0];
        return `Ex.: ${formatPeriod(inicio, form.periodicidade)} deve ser enviado até ${formatDateOnlyBr(recurringDeadline(inicio, form.periodicidade, Number(form.prazoDias)))}.`;
      })()
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarClock className="h-4 w-4 text-primary" />
              Documentos recorrentes
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Documentos enviados de tempos em tempos (semanal a anual). O prazo conta a partir do fim de cada período (ex.: folha de ponto mensal com prazo de 10 dias: setembro até 10 de outubro).
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setForm(emptyForm)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo documento recorrente
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
        ) : tipos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum documento recorrente cadastrado. {canEdit ? "Cadastre, por exemplo, folha de ponto, ficha de EPI ou contracheque." : ""}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {tipos.map((tipo) => {
              const periodicidade = asPeriodicidade(tipo.periodicidade);
              return (
                <li key={tipo.id} className={`flex flex-wrap items-center gap-3 p-3 ${tipo.ativo ? "" : "opacity-60"}`}>
                  <div className="min-w-[12rem] flex-1">
                    <p className="text-sm font-medium text-foreground">{tipo.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {ALVO_LABELS[tipo.alvo]} · {PERIODICIDADE_LABELS[periodicidade]} · prazo de {tipo.prazoDias} dia(s) após o fim do período
                      {tipo.alvo === "colaborador" ? ` · ${CATEGORIA_LABELS[tipo.categoria] ?? tipo.categoria}` : ""}
                    </p>
                  </div>
                  {!tipo.ativo && <Badge variant="outline">Inativo</Badge>}
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setForm({ id: tipo.id, nome: tipo.nome, alvo: tipo.alvo as any, categoria: tipo.categoria, periodicidade, prazoDias: String(tipo.prazoDias) })}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: tipo.id, ativo: !tipo.ativo })}>
                        {tipo.ativo ? "Desativar" : "Reativar"}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar documento recorrente" : "Novo documento recorrente"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="recorrente-nome">Nome *</Label>
                <Input id="recorrente-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Folha de ponto" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Enviado</Label>
                  <Select value={form.alvo} onValueChange={(v) => setForm({ ...form, alvo: v as any })} disabled={!!form.id}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="colaborador">Por colaborador (no dossiê)</SelectItem>
                      <SelectItem value="empresa">Da empresa (em Documentos da Empresa)</SelectItem>
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
                  <Label>Periodicidade *</Label>
                  <Select value={form.periodicidade} onValueChange={(v) => setForm({ ...form, periodicidade: v as Periodicidade })}>
                    <SelectTrigger aria-label="Periodicidade"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERIODICIDADES.map((p) => <SelectItem key={p} value={p}>{PERIODICIDADE_LABELS[p]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="recorrente-prazo">Prazo após o fim do período (dias) *</Label>
                  <Input id="recorrente-prazo" type="number" min={0} max={90} value={form.prazoDias} onChange={(e) => setForm({ ...form, prazoDias: e.target.value })} className="w-28" />
                </div>
              </div>
              {exemplo && <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">{exemplo}</p>}
              {form.id && <p className="text-xs text-muted-foreground">Mudar a periodicidade muda os períodos cobrados daqui em diante; documentos já enviados continuam no dossiê.</p>}
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
