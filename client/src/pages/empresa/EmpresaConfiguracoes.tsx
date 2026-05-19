import { useState, useEffect } from "react";
import CompanyLayout from "@/components/CompanyLayout";
import { trpc } from "@/lib/trpc";
import { useLocalAuth as useAuth } from "@/contexts/LocalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Settings, Building2, Users, Shield, Briefcase,
  MapPin, BookOpen, Plus, Trash2, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

const roleLabel: Record<string, string> = {
  company_admin: "Administrador da Empresa",
  company_hr: "Profissional de RH",
  company_manager: "Gestor",
  company_viewer: "Consulta",
};

export default function EmpresaConfiguracoes() {
  const { user } = useAuth();
  const companyId = user?.companyId ?? 0;
  const canEdit = ["company_admin", "company_hr"].includes(user?.role ?? "");

  const { data: empresa } = trpc.companies.get.useQuery({ id: companyId }, { enabled: companyId > 0 });
  const { data: cargos = [], refetch: refetchCargos } = trpc.positions.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: locais = [], refetch: refetchLocais } = trpc.worksites.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: matrizLegal = [], refetch: refetchMatriz } = trpc.legalRequirements.list.useQuery({ companyId }, { enabled: companyId > 0 });

  // Form dados empresa
  const [form, setForm] = useState({ razaoSocial: "", nomeFantasia: "", cnpj: "", email: "", telefone: "" });
  useEffect(() => {
    if (empresa) setForm({
      razaoSocial: empresa.razaoSocial ?? "",
      nomeFantasia: empresa.nomeFantasia ?? "",
      cnpj: empresa.cnpj ?? "",
      email: empresa.email ?? "",
      telefone: empresa.telefone ?? "",
    });
  }, [empresa]);

  const updateEmpresaMutation = trpc.companies.update.useMutation({
    onSuccess: () => toast.success("Dados atualizados!"),
    onError: (e) => toast.error(e.message),
  });

  // Cargos
  const [novoCargo, setNovoCargo] = useState({ nome: "", cbo: "", descricao: "" });
  const [cargoModal, setCargoModal] = useState(false);
  const createCargoMutation = trpc.positions.create.useMutation({
    onSuccess: () => { toast.success("Cargo criado!"); setCargoModal(false); setNovoCargo({ nome: "", cbo: "", descricao: "" }); refetchCargos(); },
    onError: (e) => toast.error(e.message),
  });

  // Locais de trabalho
  const [novoLocal, setNovoLocal] = useState({ nome: "", cnos: "", endereco: "", cidade: "", estado: "" });
  const [localModal, setLocalModal] = useState(false);
  const createLocalMutation = trpc.worksites.create.useMutation({
    onSuccess: () => { toast.success("Local criado!"); setLocalModal(false); setNovoLocal({ nome: "", cnos: "", endereco: "", cidade: "", estado: "" }); refetchLocais(); },
    onError: (e) => toast.error(e.message),
  });

  // Matriz Legal
  const [novaLegal, setNovaLegal] = useState({ norma: "", requisito: "", documentoExigido: "", validadeMeses: "", descricao: "" });
  const [legalModal, setLegalModal] = useState(false);
  const createLegalMutation = trpc.legalRequirements.create.useMutation({
    onSuccess: () => { toast.success("Requisito legal adicionado!"); setLegalModal(false); setNovaLegal({ norma: "", requisito: "", documentoExigido: "", validadeMeses: "", descricao: "" }); refetchMatriz(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteLegalMutation = trpc.legalRequirements.delete.useMutation({
    onSuccess: () => { toast.success("Requisito removido!"); refetchMatriz(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <CompanyLayout title="Configurações">
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
          <p className="text-muted-foreground text-sm mt-1">Gerencie as informações, cargos, locais e requisitos legais da sua empresa.</p>
        </div>

        <Tabs defaultValue="empresa">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="empresa" className="text-xs"><Building2 className="w-3.5 h-3.5 mr-1" />Empresa</TabsTrigger>
            <TabsTrigger value="cargos" className="text-xs"><Briefcase className="w-3.5 h-3.5 mr-1" />Cargos</TabsTrigger>
            <TabsTrigger value="locais" className="text-xs"><MapPin className="w-3.5 h-3.5 mr-1" />Locais</TabsTrigger>
            <TabsTrigger value="matriz" className="text-xs"><BookOpen className="w-3.5 h-3.5 mr-1" />Matriz Legal</TabsTrigger>
            <TabsTrigger value="perfil" className="text-xs"><Users className="w-3.5 h-3.5 mr-1" />Perfil</TabsTrigger>
          </TabsList>

          {/* Aba: Dados da Empresa */}
          <TabsContent value="empresa" className="mt-4">
            <Card className="max-w-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Dados da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Razão Social</Label>
                    <Input value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} disabled={!canEdit} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nome Fantasia</Label>
                    <Input value={form.nomeFantasia} onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })} disabled={!canEdit} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CNPJ</Label>
                    <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} disabled={!canEdit} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!canEdit} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} disabled={!canEdit} />
                  </div>
                </div>
                {canEdit && (
                  <div className="flex justify-end pt-2">
                    <Button onClick={() => updateEmpresaMutation.mutate({ id: companyId, ...form })} disabled={updateEmpresaMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      {updateEmpresaMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Cargos */}
          <TabsContent value="cargos" className="mt-4">
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Cargos da Empresa</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Cadastre os cargos para vincular aos colaboradores.</p>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={() => setCargoModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="w-4 h-4 mr-1.5" />Novo Cargo
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {cargos.length === 0 && (
                  <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Nenhum cargo cadastrado.</CardContent></Card>
                )}
                {cargos.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground">{c.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {c.cbo && <span className="text-xs text-muted-foreground">CBO: {c.cbo}</span>}
                          {c.descricao && <span className="text-xs text-muted-foreground">— {c.descricao}</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Aba: Locais de Trabalho */}
          <TabsContent value="locais" className="mt-4">
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Locais de Trabalho / Obras</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Cadastre os locais para vincular aos colaboradores.</p>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={() => setLocalModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="w-4 h-4 mr-1.5" />Novo Local
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {locais.length === 0 && (
                  <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Nenhum local cadastrado.</CardContent></Card>
                )}
                {locais.map((l) => (
                  <Card key={l.id}>
                    <CardContent className="py-3 px-4">
                      <p className="font-medium text-sm text-foreground">{l.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        {l.cnos && <span>CNOS: {l.cnos}</span>}
                        {l.cidade && <span>{l.cidade}{l.estado ? `/${l.estado}` : ""}</span>}
                        {l.endereco && <span>{l.endereco}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Aba: Matriz Legal */}
          <TabsContent value="matriz" className="mt-4">
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Matriz de Requisitos Legais</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">NRs e requisitos legais aplicáveis a esta empresa.</p>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={() => setLegalModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="w-4 h-4 mr-1.5" />Adicionar Requisito
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {matrizLegal.length === 0 && (
                  <Card>
                    <CardContent className="py-10 text-center">
                      <AlertCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">Nenhum requisito legal cadastrado para esta empresa.</p>
                    </CardContent>
                  </Card>
                )}
                {matrizLegal.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">{req.norma}</Badge>
                            <p className="font-medium text-sm text-foreground">{req.requisito}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Documento: {req.documentoExigido}</p>
                          {req.validadeMeses && (
                            <p className="text-xs text-muted-foreground">Validade: {req.validadeMeses} meses</p>
                          )}
                          {req.descricao && <p className="text-xs text-muted-foreground mt-1">{req.descricao}</p>}
                        </div>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-destructive hover:text-destructive shrink-0"
                            onClick={() => deleteLegalMutation.mutate({ id: req.id })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Aba: Perfil */}
          <TabsContent value="perfil" className="mt-4">
            <div className="space-y-4 max-w-md">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Meu Perfil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {roleLabel[user?.role ?? ""] ?? user?.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para alterar seus dados ou senha, entre em contato com o administrador da plataforma.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Segurança
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">Autenticação</p>
                      <p className="text-xs text-muted-foreground">Login por e-mail e senha</p>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">Ativo</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal: Novo Cargo */}
      <Dialog open={cargoModal} onOpenChange={(o) => !o && setCargoModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Cargo</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Nome do Cargo *</Label><Input value={novoCargo.nome} onChange={(e) => setNovoCargo({ ...novoCargo, nome: e.target.value })} placeholder="Ex: Eletricista de Manutenção" /></div>
            <div className="space-y-1.5"><Label>Código CBO</Label><Input value={novoCargo.cbo} onChange={(e) => setNovoCargo({ ...novoCargo, cbo: e.target.value })} placeholder="Ex: 9101-05" /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><Input value={novoCargo.descricao} onChange={(e) => setNovoCargo({ ...novoCargo, descricao: e.target.value })} placeholder="Descrição opcional" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCargoModal(false)}>Cancelar</Button>
            <Button onClick={() => createCargoMutation.mutate({ companyId, ...novoCargo })} disabled={!novoCargo.nome || createCargoMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {createCargoMutation.isPending ? "Criando..." : "Criar Cargo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Novo Local */}
      <Dialog open={localModal} onOpenChange={(o) => !o && setLocalModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Local de Trabalho</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Nome *</Label><Input value={novoLocal.nome} onChange={(e) => setNovoLocal({ ...novoLocal, nome: e.target.value })} placeholder="Ex: Obra Av. Paulista" /></div>
            <div className="space-y-1.5"><Label>CNOS</Label><Input value={novoLocal.cnos} onChange={(e) => setNovoLocal({ ...novoLocal, cnos: e.target.value })} placeholder="Código CNOS" /></div>
            <div className="space-y-1.5"><Label>Endereço</Label><Input value={novoLocal.endereco} onChange={(e) => setNovoLocal({ ...novoLocal, endereco: e.target.value })} placeholder="Rua, número" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Cidade</Label><Input value={novoLocal.cidade} onChange={(e) => setNovoLocal({ ...novoLocal, cidade: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>UF</Label><Input value={novoLocal.estado} onChange={(e) => setNovoLocal({ ...novoLocal, estado: e.target.value })} maxLength={2} placeholder="SP" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocalModal(false)}>Cancelar</Button>
            <Button onClick={() => createLocalMutation.mutate({ companyId, ...novoLocal })} disabled={!novoLocal.nome || createLocalMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {createLocalMutation.isPending ? "Criando..." : "Criar Local"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Novo Requisito Legal */}
      <Dialog open={legalModal} onOpenChange={(o) => !o && setLegalModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar Requisito Legal</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Norma *</Label><Input value={novaLegal.norma} onChange={(e) => setNovaLegal({ ...novaLegal, norma: e.target.value })} placeholder="Ex: NR-35" /></div>
            <div className="space-y-1.5"><Label>Requisito *</Label><Input value={novaLegal.requisito} onChange={(e) => setNovaLegal({ ...novaLegal, requisito: e.target.value })} placeholder="Ex: Trabalho em altura" /></div>
            <div className="space-y-1.5"><Label>Documento Exigido *</Label><Input value={novaLegal.documentoExigido} onChange={(e) => setNovaLegal({ ...novaLegal, documentoExigido: e.target.value })} placeholder="Ex: Certificado NR-35" /></div>
            <div className="space-y-1.5"><Label>Validade (meses)</Label><Input type="number" value={novaLegal.validadeMeses} onChange={(e) => setNovaLegal({ ...novaLegal, validadeMeses: e.target.value })} placeholder="Ex: 24" /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><Input value={novaLegal.descricao} onChange={(e) => setNovaLegal({ ...novaLegal, descricao: e.target.value })} placeholder="Observações adicionais" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLegalModal(false)}>Cancelar</Button>
            <Button
              onClick={() => createLegalMutation.mutate({
                companyId,
                norma: novaLegal.norma,
                requisito: novaLegal.requisito,
                documentoExigido: novaLegal.documentoExigido,
                validadeMeses: novaLegal.validadeMeses ? parseInt(novaLegal.validadeMeses) : undefined,
                descricao: novaLegal.descricao || undefined,
              })}
              disabled={!novaLegal.norma || !novaLegal.requisito || !novaLegal.documentoExigido || createLegalMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {createLegalMutation.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CompanyLayout>
  );
}
