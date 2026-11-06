import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, Plus, RotateCcw, ShieldCheck, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { COMPANY_ROLES, PERFIL_BASE_LABEL, type CompanyRole } from "@shared/permissions";

type Perfil = {
  id: number | null;
  tipo: "padrao" | "personalizado";
  nome: string;
  baseRole: CompanyRole;
  editado: boolean;
  permissoes: string[];
  usuarios: { id: number; name: string | null; email: string | null; ativo: boolean }[];
};

const chaveDe = (p: Pick<Perfil, "tipo" | "id" | "baseRole">) => (p.tipo === "padrao" ? `padrao:${p.baseRole}` : `id:${p.id}`);

/** Motivo da caixa travada, mostrado ao lado dela. */
function motivoTrava(chave: string, perfil: Perfil, permitidas: string[]) {
  if (!permitidas.includes(chave)) {
    if (chave.startsWith("saude.")) return "Dado de saúde (LGPD): só em perfis baseados em Admin ou RH da empresa.";
    if (chave === "perfis.gerenciar") return "Só em perfis baseados no Admin da empresa.";
    return "Não disponível para este perfil.";
  }
  if (chave === "perfis.gerenciar" && perfil.tipo === "padrao" && perfil.baseRole === "company_admin") {
    return "Sempre ligado no Admin da empresa, para ninguém perder o acesso a esta tela.";
  }
  return null;
}

/**
 * Perfis e permissões da empresa: o Admin da empresa (ou o Administrador Geral) ajusta o que cada perfil faz,
 * cria perfis com nome próprio e move as pessoas entre eles. O servidor confere as mesmas travas.
 */
export function CompanyProfilesManager({ companyId, currentUserId }: { companyId: number; currentUserId?: number }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.profiles.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const [selecionado, setSelecionado] = useState<string>("padrao:company_admin");
  const [rascunho, setRascunho] = useState<string[]>([]);
  const [nomeRascunho, setNomeRascunho] = useState("");
  const [novo, setNovo] = useState<{ nome: string; baseRole: CompanyRole } | null>(null);

  const perfis = (data?.perfis ?? []) as Perfil[];
  const perfil = perfis.find((p) => chaveDe(p) === selecionado) ?? perfis[0];
  const permitidas = perfil && data ? data.permitidas[perfil.baseRole] : [];

  useEffect(() => {
    if (!perfil) return;
    setRascunho(perfil.permissoes);
    setNomeRascunho(perfil.nome);
  }, [perfil?.id, perfil?.baseRole, perfil?.tipo, perfil?.permissoes.join(","), perfil?.nome]);

  const atualizar = () => utils.profiles.list.invalidate({ companyId });
  const erro = (e: { message: string }) => toast.error(e.message);
  const salvar = trpc.profiles.save.useMutation({ onSuccess: () => { toast.success("Permissões salvas."); atualizar(); }, onError: erro });
  const criar = trpc.profiles.save.useMutation({
    onSuccess: (r) => { toast.success("Perfil criado."); setNovo(null); setSelecionado(`id:${r.id}`); atualizar(); },
    onError: erro,
  });
  const restaurar = trpc.profiles.restoreDefault.useMutation({ onSuccess: () => { toast.success("Permissões padrão restauradas."); atualizar(); }, onError: erro });
  const desativar = trpc.profiles.deactivate.useMutation({ onSuccess: () => { toast.success("Perfil desativado."); setSelecionado("padrao:company_admin"); atualizar(); }, onError: erro });
  const mover = trpc.profiles.assignUser.useMutation({ onSuccess: () => { toast.success("Perfil do usuário alterado."); atualizar(); }, onError: erro });

  const areas = useMemo(() => {
    const mapa = new Map<string, { chave: string; rotulo: string }[]>();
    for (const item of data?.catalogo ?? []) {
      mapa.set(item.area, [...(mapa.get(item.area) ?? []), { chave: item.chave, rotulo: item.rotulo }]);
    }
    return Array.from(mapa.entries());
  }, [data?.catalogo]);

  if (isLoading || !data || !perfil) {
    return <p className="text-sm text-muted-foreground">Carregando perfis…</p>;
  }

  const mudou = rascunho.slice().sort().join(",") !== perfil.permissoes.slice().sort().join(",")
    || (perfil.tipo === "personalizado" && nomeRascunho.trim() !== perfil.nome);
  const alternar = (chave: string, ligado: boolean) =>
    setRascunho((atual) => (ligado ? Array.from(new Set([...atual, chave])) : atual.filter((c) => c !== chave)));
  const enviar = () =>
    salvar.mutate(perfil.tipo === "padrao"
      ? { companyId, padraoDe: perfil.baseRole, permissoes: rascunho }
      : { companyId, id: perfil.id ?? undefined, nome: nomeRascunho.trim(), permissoes: rascunho });

  const opcoesDestino = perfis.map((p) => ({ valor: chaveDe(p), rotulo: p.tipo === "padrao" ? p.nome : `${p.nome} (personalizado)` }));
  const moverPara = (userId: number, destino: string) => {
    const alvo = perfis.find((p) => chaveDe(p) === destino);
    if (!alvo) return;
    mover.mutate({ companyId, userId, baseRole: alvo.baseRole, profileId: alvo.tipo === "personalizado" ? alvo.id : null });
  };

  return (
    <div className="grid max-w-6xl gap-4 lg:grid-cols-[18rem_1fr]">
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><UserCog className="h-4 w-4" />Perfis da empresa</CardTitle>
          <p className="text-xs text-muted-foreground">Escolha um perfil para ver e ajustar o que ele pode fazer.</p>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {perfis.map((p) => {
            const ativo = chaveDe(p) === chaveDe(perfil);
            return (
              <button
                key={chaveDe(p)}
                type="button"
                onClick={() => setSelecionado(chaveDe(p))}
                aria-pressed={ativo}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${ativo ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">{p.nome}</span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" />{p.usuarios.length}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.tipo === "personalizado"
                    ? <Badge variant="secondary" className="text-[10px]">Personalizado · base {PERFIL_BASE_LABEL[p.baseRole]}</Badge>
                    : <Badge variant="outline" className="text-[10px]">{p.editado ? "Padrão ajustado" : "Padrão"}</Badge>}
                </div>
              </button>
            );
          })}
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setNovo({ nome: "", baseRole: "company_viewer" })}>
            <Plus className="mr-1 h-4 w-4" />Novo perfil
          </Button>
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" />{perfil.nome}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {perfil.tipo === "padrao"
                    ? "Perfil padrão: a mudança vale para todos os usuários com este perfil nesta empresa."
                    : `Perfil criado pela empresa, com base no perfil ${PERFIL_BASE_LABEL[perfil.baseRole]}.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {perfil.tipo === "padrao" && perfil.editado && (
                  <Button variant="outline" size="sm" disabled={restaurar.isPending} onClick={() => restaurar.mutate({ companyId, baseRole: perfil.baseRole })}>
                    <RotateCcw className="mr-1 h-4 w-4" />Restaurar padrão
                  </Button>
                )}
                {perfil.tipo === "personalizado" && (
                  <Button variant="outline" size="sm" disabled={desativar.isPending || perfil.usuarios.length > 0}
                    title={perfil.usuarios.length > 0 ? "Mova os usuários para outro perfil antes de desativar." : undefined}
                    onClick={() => perfil.id && desativar.mutate({ companyId, id: perfil.id })}>
                    Desativar perfil
                  </Button>
                )}
                <Button size="sm" disabled={!mudou || salvar.isPending} onClick={enviar}>Salvar alterações</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {perfil.tipo === "personalizado" && (
              <div className="max-w-sm space-y-1">
                <Label htmlFor="perfil-nome">Nome do perfil</Label>
                <Input id="perfil-nome" value={nomeRascunho} maxLength={120} onChange={(e) => setNomeRascunho(e.target.value)} />
              </div>
            )}
            {areas.map(([area, itens]) => (
              <fieldset key={area} className="rounded-lg border p-3">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{area}</legend>
                <div className="space-y-2">
                  {itens.map((item) => {
                    const trava = motivoTrava(item.chave, perfil, permitidas);
                    const bloqueadoLigado = item.chave === "perfis.gerenciar" && perfil.tipo === "padrao" && perfil.baseRole === "company_admin";
                    const marcado = bloqueadoLigado || rascunho.includes(item.chave);
                    const id = `perm-${item.chave}`;
                    return (
                      <div key={item.chave} className="flex items-start gap-2">
                        <Checkbox id={id} checked={marcado} disabled={!!trava} onCheckedChange={(v) => alternar(item.chave, v === true)} className="mt-0.5" />
                        <div className="min-w-0">
                          <Label htmlFor={id} className={`text-sm font-normal leading-snug ${trava && !marcado ? "text-muted-foreground" : ""}`}>{item.rotulo}</Label>
                          {trava && <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground"><Lock className="mt-0.5 h-3 w-3 shrink-0" />{trava}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <p className="text-xs text-muted-foreground">
              As mudanças valem em até 30 segundos e ficam registradas na auditoria. Mudanças no acesso a dados de saúde também avisam a equipe SmartDocPlan.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Usuários deste perfil</CardTitle>
            <p className="text-xs text-muted-foreground">Para mover alguém, escolha o novo perfil. Novos usuários são criados pela equipe SmartDocPlan.</p>
          </CardHeader>
          <CardContent>
            {perfil.usuarios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuário com este perfil.</p>
            ) : (
              <ul className="divide-y">
                {perfil.usuarios.map((u) => (
                  <li key={u.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.name ?? "Sem nome"}{!u.ativo && <span className="ml-2 text-xs text-muted-foreground">(inativo)</span>}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Select value={chaveDe(perfil)} onValueChange={(v) => moverPara(u.id, v)} disabled={u.id === currentUserId || mover.isPending}>
                      <SelectTrigger className="w-full sm:w-60" aria-label={`Perfil de ${u.name ?? u.email}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {opcoesDestino.map((o) => <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!novo} onOpenChange={(aberto) => !aberto && setNovo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo perfil</DialogTitle>
            <DialogDescription>O perfil começa com as permissões do perfil-base; depois é só ajustar.</DialogDescription>
          </DialogHeader>
          {novo && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="novo-perfil-nome">Nome *</Label>
                <Input id="novo-perfil-nome" value={novo.nome} maxLength={120} placeholder="Ex.: Encarregado de obra" onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Baseado em *</Label>
                <Select value={novo.baseRole} onValueChange={(v) => setNovo({ ...novo, baseRole: v as CompanyRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_ROLES.map((r) => <SelectItem key={r} value={r}>{PERFIL_BASE_LABEL[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Documentos de saúde só podem ser liberados em perfis baseados em Admin ou RH da empresa.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovo(null)}>Cancelar</Button>
            <Button
              disabled={!novo || novo.nome.trim().length < 2 || criar.isPending}
              onClick={() => novo && criar.mutate({ companyId, nome: novo.nome.trim(), baseRole: novo.baseRole, permissoes: [...(data.padroesOriginais[novo.baseRole] ?? [])].filter((c) => c !== "perfis.gerenciar") })}
            >
              Criar perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
