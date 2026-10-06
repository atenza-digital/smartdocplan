import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, EyeOff, Pencil, Plus, Ribbon } from "lucide-react";
import { toast } from "sonner";
import { CampaignBanner, setCampaignPreview, useCampaignPreview } from "@/components/HealthCampaign";
import { MESES, PUBLICO_LABELS, isSafeCampaignLink } from "@shared/campaigns";
import { canManagePlatformSettings } from "@shared/permissions";

type Form = { id?: number; titulo: string; mensagem: string; link: string; linkTexto: string; cor: string; mes: number; publico: "todos" | "empresas" | "plataforma"; ativo: boolean };
const novo = (): Form => ({ titulo: "", mensagem: "", link: "", linkTexto: "", cor: "#16a34a", mes: new Date().getMonth() + 1, publico: "todos", ativo: false });

/** Calendário da saúde: campanhas mensais com banner e cor da plataforma durante o mês. */
export default function AdminCampanhas() {
  const { user } = useAuth();
  const canEdit = canManagePlatformSettings(user?.role ?? null);
  const utils = trpc.useUtils();
  const { data: campanhas = [], isLoading } = trpc.healthCampaigns.list.useQuery();
  const [form, setForm] = useState<Form | null>(null);
  const mesAtual = new Date().getMonth() + 1;
  const previa = useCampaignPreview();

  const salvar = trpc.healthCampaigns.save.useMutation({
    onSuccess: () => {
      toast.success("Campanha salva.");
      setForm(null);
      utils.healthCampaigns.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggle = (c: (typeof campanhas)[number]) =>
    salvar.mutate({
      id: c.id, titulo: c.titulo, mensagem: c.mensagem, link: c.link ?? undefined, linkTexto: c.linkTexto ?? undefined,
      cor: c.cor, mes: c.mes, publico: c.publico as Form["publico"], ativo: !c.ativo,
    });

  const linkInvalido = !!form?.link.trim() && !isSafeCampaignLink(form.link.trim());

  return (
    <AdminLayout title="Calendário da saúde">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Calendário da saúde</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Campanhas mensais (Janeiro Branco, Abril Verde, Outubro Rosa…). Quando ativa, a campanha do mês muda a cor da plataforma, mostra o laço no topo e um banner que cada pessoa pode fechar. As campanhas sugeridas vêm como rascunho: revise o texto e o link antes de ativar.
            </p>
          </div>
          {canEdit && (
            <Button onClick={() => setForm(novo())}>
              <Plus className="mr-2 h-4 w-4" />
              Nova campanha
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {campanhas.map((c) => (
              <Card key={c.id} className={c.mes === mesAtual ? "border-primary" : "border-border"}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Ribbon className="mt-0.5 h-6 w-6 shrink-0" style={{ color: c.cor, fill: c.cor }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{c.titulo}</p>
                        <Badge variant="outline">{MESES[c.mes - 1]}</Badge>
                        {c.mes === mesAtual && <Badge>Mês atual</Badge>}
                        {c.ativo ? (
                          <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400">Ativa</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Rascunho</Badge>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.mensagem}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {PUBLICO_LABELS[c.publico] ?? c.publico}
                        {c.link ? " · com link" : " · sem link"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    {previa?.id === c.id ? (
                      <Button size="sm" variant="secondary" onClick={() => setCampaignPreview(null)}>
                        <EyeOff className="mr-1 h-3.5 w-3.5" />
                        Encerrar prévia
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        title="Aplica o tema só para você, neste navegador, sem ativar a campanha"
                        onClick={() => setCampaignPreview({ id: c.id, titulo: c.titulo, mensagem: c.mensagem, link: c.link, linkTexto: c.linkTexto, cor: c.cor })}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Ver tema na plataforma
                      </Button>
                    )}
                    {canEdit && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setForm({ id: c.id, titulo: c.titulo, mensagem: c.mensagem, link: c.link ?? "", linkTexto: c.linkTexto ?? "", cor: c.cor, mes: c.mes, publico: c.publico as Form["publico"], ativo: c.ativo })}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                          {c.ativo ? "Ativa para todos" : "Ativar"}
                          <Switch checked={c.ativo} onCheckedChange={() => toggle(c)} disabled={salvar.isPending} aria-label={`Ativar ${c.titulo}`} />
                        </label>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar campanha" : "Nova campanha"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="camp-titulo">Título *</Label>
                  <Input id="camp-titulo" maxLength={120} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Outubro Rosa" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="camp-msg">Mensagem do banner *</Label>
                  <Textarea id="camp-msg" rows={3} maxLength={400} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} />
                  <p className="text-right text-xs text-muted-foreground">{form.mensagem.length}/400</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="camp-link">Link (opcional)</Label>
                  <Input id="camp-link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://www.gov.br/saude/..." aria-invalid={linkInvalido} />
                  {linkInvalido && <p className="text-xs text-destructive">Use um link que comece com https://</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="camp-link-texto">Texto do link</Label>
                  <Input id="camp-link-texto" maxLength={60} value={form.linkTexto} onChange={(e) => setForm({ ...form, linkTexto: e.target.value })} placeholder="Saiba mais" disabled={!form.link.trim()} />
                </div>
                <div className="space-y-1.5">
                  <Label>Mês *</Label>
                  <Select value={String(form.mes)} onValueChange={(v) => setForm({ ...form, mes: Number(v) })}>
                    <SelectTrigger aria-label="Mês"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="camp-cor">Cor *</Label>
                  <div className="flex items-center gap-2">
                    <input id="camp-cor" type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="h-9 w-14 cursor-pointer rounded-md border border-border bg-transparent" />
                    <span className="font-mono text-xs text-muted-foreground">{form.cor}</span>
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Quem vê</Label>
                  <Select value={form.publico} onValueChange={(v) => setForm({ ...form, publico: v as Form["publico"] })}>
                    <SelectTrigger aria-label="Quem vê"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PUBLICO_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.ativo} onCheckedChange={(ativo) => setForm({ ...form, ativo })} />
                Ativa (aparece durante o mês escolhido)
              </label>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Prévia do banner</p>
                <CampaignBanner preview campaign={{ id: form.id ?? 0, titulo: form.titulo || "Título da campanha", mensagem: form.mensagem || "Mensagem do banner.", link: form.link.trim() || null, linkTexto: form.linkTexto || null, cor: form.cor }} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button
              disabled={!form || form.titulo.trim().length < 3 || form.mensagem.trim().length < 10 || linkInvalido || salvar.isPending}
              onClick={() => form && salvar.mutate({ ...form, link: form.link.trim() || undefined, linkTexto: form.linkTexto.trim() || undefined })}
            >
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
