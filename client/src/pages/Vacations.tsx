import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import AdminLayout from "@/components/AdminLayout";
import CompanyLayout from "@/components/CompanyLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  canManageCompanyData,
  canManageRequestWorkflow,
  isPlatformUser,
} from "@shared/permissions";
import {
  brazilToday,
  calendarDays,
  deadlineDays,
  vacationDisplayStatus,
  vacationStatusLabels,
} from "@shared/vacations";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Upload,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

const selectClass =
  "w-full h-10 rounded-md border border-input bg-background px-3 text-sm min-w-0";
const dateLabel = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "Não informado";
const eventLabel: Record<string, string> = {
  criado: "Programação criada",
  editado: "Programação alterada",
  aviso_anexado: "Aviso anexado",
  enviar: "Enviada para análise",
  aprovar: "Aviso aprovado",
  devolver: "Devolvida para correção",
  cancelar: "Programação cancelada",
};
type Action = "enviar" | "aprovar" | "devolver" | "cancelar";
const actionLabel: Record<Action, string> = {
  enviar: "Enviar para análise",
  aprovar: "Aprovar aviso",
  devolver: "Solicitar correção",
  cancelar: "Cancelar programação",
};
const blankForm = () => ({
  employeeId: "",
  acquisitionStart: "",
  acquisitionEnd: "",
  concessionDeadline: "",
  startDate: "",
  endDate: "",
  notes: "",
});

export default function Vacations() {
  const { user, effectiveCompanyId } = useLocalAuth();
  const [location] = useLocation();
  const platformView = location.startsWith("/admin");
  const Layout = platformView ? AdminLayout : CompanyLayout;
  const [companySelection, setCompanySelection] = useState(
    () =>
      Number(new URLSearchParams(window.location.search).get("empresa")) || 0
  );
  const companyId = isPlatformUser(user?.role)
    ? companySelection || effectiveCompanyId || 0
    : effectiveCompanyId || 0;
  const [selectedId, setSelectedId] = useState(
    () =>
      Number(new URLSearchParams(window.location.search).get("periodo")) || 0
  );
  const [employeeFilter, setEmployeeFilter] = useState(
    () => new URLSearchParams(window.location.search).get("colaborador") || ""
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const today = brazilToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState<{
    id: number;
    revision: number;
  } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    setFile(null);
    setAction(null);
  }, [selectedId, companyId]);
  const [uploading, setUploading] = useState(false);
  const canEdit = canManageCompanyData(user?.role);
  const canReview = canManageRequestWorkflow(user?.role);
  const companies = trpc.companies.list.useQuery();
  const employees = trpc.employees.list.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );
  const periods = trpc.vacations.list.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );
  const selected = periods.data?.find(p => p.id === selectedId);
  const history = trpc.vacations.history.useQuery(
    { id: selected?.id ?? 0 },
    { enabled: !!selected }
  );
  const employee = (employeeId: number) =>
    employees.data?.find(e => e.id === employeeId);
  const reload = async () => {
    await periods.refetch();
    await history.refetch();
  };
  const failed = (e: { message: string }) => {
    toast.error(e.message);
    void periods.refetch();
  };
  const create = trpc.vacations.create.useMutation({
    onSuccess: async p => {
      setSelectedId(p.id);
      setFormOpen(false);
      await periods.refetch();
      toast.success("Programação criada. Anexe o aviso e envie para análise.");
    },
    onError: failed,
  });
  const update = trpc.vacations.update.useMutation({
    onSuccess: async () => {
      setFormOpen(false);
      await reload();
      toast.success("Programação atualizada. Anexe o aviso atualizado.");
    },
    onError: failed,
  });
  const upload = trpc.vacations.uploadNotice.useMutation({
    onSuccess: async () => {
      setFile(null);
      await reload();
      toast.success("Aviso anexado.");
    },
    onError: failed,
  });
  const transition = trpc.vacations.transition.useMutation({
    onSuccess: async () => {
      setAction(null);
      await reload();
      toast.success(
        "Programação atualizada. Os responsáveis foram notificados."
      );
    },
    onError: failed,
  });
  const records = periods.data ?? [];
  const filtered = records.filter(p => {
    const person = employee(p.employeeId);
    const term = search.toLocaleLowerCase("pt-BR");
    return (
      (!employeeFilter || String(p.employeeId) === employeeFilter) &&
      (!statusFilter || vacationDisplayStatus(p, today) === statusFilter) &&
      (!from || p.endDate >= from) &&
      (!to || p.startDate <= to) &&
      (!term ||
        `${person?.nome ?? ""} ${person?.cpf ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(term) ||
        (term.replace(/\D/g, "").length > 0 &&
          person?.cpf.replace(/\D/g, "").includes(term.replace(/\D/g, ""))))
    );
  });
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1));
  const calendarStart = new Date(firstDay);
  calendarStart.setUTCDate(1 - firstDay.getUTCDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const d = new Date(calendarStart);
    d.setUTCDate(d.getUTCDate() + index);
    return d.toISOString().slice(0, 10);
  });
  function changeMonth(offset: number) {
    const d = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
    setMonth(d.toISOString().slice(0, 7));
  }
  function editSelected() {
    if (!selected) return;
    setEditing({ id: selected.id, revision: selected.revision });
    setForm({
      employeeId: String(selected.employeeId),
      acquisitionStart: selected.acquisitionStart,
      acquisitionEnd: selected.acquisitionEnd,
      concessionDeadline: selected.concessionDeadline ?? "",
      startDate: selected.startDate,
      endDate: selected.endDate,
      notes: selected.notes ?? "",
    });
    setFormOpen(true);
  }
  async function uploadNotice() {
    if (!selected || !file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await upload.mutateAsync({
        id: selected.id,
        revision: selected.revision,
        fileName: file.name,
        base64,
      });
    } catch {
      /* Mutation displays the validation error. */
    } finally {
      setUploading(false);
    }
  }
  return (
    <Layout title="Gestão de férias">
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Gestão de férias</h1>
            <p className="mt-2 text-muted-foreground">
              Programe períodos, acompanhe os avisos e consulte o histórico.
            </p>
          </div>
          {canEdit && (
            <Button
              disabled={!companyId}
              onClick={() => {
                setEditing(null);
                setForm(blankForm());
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Programar férias
            </Button>
          )}
        </div>
        <p className="text-sm rounded-lg border p-4 text-muted-foreground">
          Nesta fase, os períodos aquisitivos e os prazos são informados pelo
          RH. Os dias exibidos são dias corridos programados, não saldo legal
          calculado. A aprovação é documental.
        </p>
        {isPlatformUser(user?.role) && (
          <div className="max-w-md space-y-2">
            <Label htmlFor="vac-company">Empresa</Label>
            <select
              id="vac-company"
              className={selectClass}
              value={companyId}
              onChange={e => {
                setCompanySelection(Number(e.target.value));
                setSelectedId(0);
                setEmployeeFilter("");
                setFile(null);
              }}
            >
              <option value={0}>Selecione uma empresa</option>
              {companies.data?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.razaoSocial}
                </option>
              ))}
            </select>
          </div>
        )}
        {!companyId ? (
          <p>Selecione uma empresa para começar.</p>
        ) : periods.isLoading || employees.isLoading ? (
          <p role="status">Carregando programações...</p>
        ) : periods.error || employees.error ? (
          <p role="alert">
            Não foi possível carregar os dados.{" "}
            <Button
              variant="outline"
              onClick={() => {
                void periods.refetch();
                void employees.refetch();
              }}
            >
              Tentar novamente
            </Button>
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Em análise",
                  count: records.filter(p => p.status === "pendente").length,
                  filter: "pendente",
                },
                {
                  label: "Em férias",
                  count: records.filter(
                    p => vacationDisplayStatus(p, today) === "em_ferias"
                  ).length,
                  filter: "em_ferias",
                },
                {
                  label: "Aprovadas para iniciar",
                  count: records.filter(
                    p => vacationDisplayStatus(p, today) === "aprovado"
                  ).length,
                  filter: "aprovado",
                },
                {
                  label: "Correção solicitada",
                  count: records.filter(p => p.status === "reprovado").length,
                  filter: "reprovado",
                },
              ].map(card => (
                <button
                  key={card.label}
                  className="rounded-xl border bg-card p-5 text-left hover:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setStatusFilter(card.filter)}
                >
                  <span className="text-sm text-muted-foreground">
                    {card.label}
                  </span>
                  <strong className="block mt-2 text-3xl">{card.count}</strong>
                </button>
              ))}
            </div>
            {records.some(
              p =>
                ["rascunho", "pendente", "reprovado"].includes(p.status) &&
                deadlineDays(p.concessionDeadline, today) !== null &&
                deadlineDays(p.concessionDeadline, today)! <= 30
            ) && (
              <div
                role="status"
                className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4"
              >
                <p className="font-medium">
                  Prazos informados que precisam de atenção
                </p>
                <div className="mt-2 space-y-1">
                  {records
                    .filter(
                      p =>
                        ["rascunho", "pendente", "reprovado"].includes(
                          p.status
                        ) &&
                        deadlineDays(p.concessionDeadline, today) !== null &&
                        deadlineDays(p.concessionDeadline, today)! <= 30
                    )
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedId(p.id)}
                        className="block text-left text-sm underline"
                      >
                        {employee(p.employeeId)?.nome} ·{" "}
                        {dateLabel(p.concessionDeadline)} ·{" "}
                        {deadlineDays(p.concessionDeadline, today)! < 0
                          ? "Prazo ultrapassado"
                          : "Nos próximos 30 dias"}
                      </button>
                    ))}
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Input
                aria-label="Buscar colaborador ou CPF"
                placeholder="Buscar nome ou CPF"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select
                aria-label="Filtrar colaborador"
                className={selectClass}
                value={employeeFilter}
                onChange={e => setEmployeeFilter(e.target.value)}
              >
                <option value="">Todos os colaboradores</option>
                {employees.data?.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar situação"
                className={selectClass}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">Todas as situações</option>
                {Object.entries(vacationStatusLabels).map(([key, value]) => (
                  <option value={key} key={key}>
                    {value}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                aria-label="Período a partir de"
                value={from}
                onChange={e => setFrom(e.target.value)}
              />
              <Input
                type="date"
                aria-label="Período até"
                value={to}
                onChange={e => setTo(e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setEmployeeFilter("");
                setFrom("");
                setTo("");
              }}
            >
              Limpar filtros
            </Button>
            <div className="grid gap-5 xl:grid-cols-2">
              <Card className="min-w-0">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="capitalize">
                      {firstDay.toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Mês anterior"
                        onClick={() => changeMonth(-1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setMonth(today.slice(0, 7))}
                      >
                        Hoje
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Próximo mês"
                        onClick={() => changeMonth(1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-2 sm:px-5">
                  <div className="grid grid-cols-7 text-center text-xs font-medium mb-2">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                      d => (
                        <span key={d}>{d}</span>
                      )
                    )}
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-border border rounded-lg overflow-hidden">
                    {days.map(day => {
                      const matches = filtered.filter(
                        p =>
                          p.status !== "cancelado" &&
                          p.startDate <= day &&
                          p.endDate >= day
                      );
                      return (
                        <div
                          key={day}
                          className={`min-h-20 p-1 bg-card min-w-0 ${day.slice(0, 7) !== month ? "opacity-60" : ""}`}
                        >
                          <span
                            className={`text-xs ${day === today ? "rounded-full bg-primary text-primary-foreground p-1" : ""}`}
                          >
                            {Number(day.slice(-2))}
                          </span>
                          {matches.slice(0, 2).map(p => (
                            <button
                              key={p.id}
                              title={`${employee(p.employeeId)?.nome}: ${vacationStatusLabels[vacationDisplayStatus(p, today)]}`}
                              onClick={() => setSelectedId(p.id)}
                              className={`block w-full truncate rounded text-[10px] text-left mt-1 px-1 py-0.5 ${p.status === "aprovado" ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-foreground"}`}
                            >
                              {employee(p.employeeId)?.nome ??
                                `#${p.employeeId}`}
                            </button>
                          ))}
                          {matches.length > 2 && (
                            <span className="text-[10px]">
                              +{matches.length - 2}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Verde: aprovado. Amarelo: ainda não aprovado. Todos os
                    registros podem ser consultados na lista abaixo.
                  </p>
                </CardContent>
              </Card>
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Detalhes da programação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selected ? (
                    <p className="text-muted-foreground">
                      Selecione um período no calendário ou na lista.
                    </p>
                  ) : (
                    <>
                      <div>
                        <h2 className="text-lg font-semibold">
                          {employee(selected.employeeId)?.nome}
                        </h2>
                        <Badge variant="outline" className="mt-2">
                          {
                            vacationStatusLabels[
                              vacationDisplayStatus(selected, today)
                            ]
                          }
                        </Badge>
                      </div>
                      <dl className="space-y-3 text-sm">
                        {[
                          [
                            "Período aquisitivo informado",
                            `${dateLabel(selected.acquisitionStart)} a ${dateLabel(selected.acquisitionEnd)}`,
                          ],
                          [
                            "Férias programadas",
                            `${dateLabel(selected.startDate)} a ${dateLabel(selected.endDate)}`,
                          ],
                          [
                            "Dias corridos programados",
                            String(
                              calendarDays(selected.startDate, selected.endDate)
                            ),
                          ],
                          [
                            "Prazo de concessão informado",
                            dateLabel(selected.concessionDeadline),
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="flex flex-wrap justify-between gap-1"
                          >
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                      {selected.notes && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {selected.notes}
                        </p>
                      )}
                      {selected.reviewReason && (
                        <p className="rounded-md border p-3 text-sm whitespace-pre-wrap break-words">
                          <strong>Motivo registrado: </strong>
                          {selected.reviewReason}
                        </p>
                      )}
                      {selected.noticeFileUrl ? (
                        <Button asChild variant="outline">
                          <a
                            href={selected.noticeFileUrl}
                            download={selected.noticeFileName ?? "aviso-ferias"}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Baixar aviso de férias
                          </a>
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Aviso de férias ainda não anexado.
                        </p>
                      )}
                      {canEdit &&
                        ["rascunho", "reprovado"].includes(selected.status) && (
                          <div className="space-y-3 border-t pt-4">
                            <Button variant="outline" onClick={editSelected}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar programação
                            </Button>
                            <Label htmlFor="vac-notice" className="block">
                              Anexar aviso (PDF, PNG ou JPEG, até 10 MB)
                            </Label>
                            <Input
                              key={`${selected.id}-${selected.revision}`}
                              id="vac-notice"
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={e =>
                                setFile(e.target.files?.[0] ?? null)
                              }
                            />
                            <Button
                              variant="outline"
                              disabled={!file || uploading}
                              onClick={uploadNotice}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {uploading ? "Enviando..." : "Salvar aviso"}
                            </Button>
                          </div>
                        )}
                      <div className="flex flex-wrap gap-2">
                        {canEdit &&
                          ["rascunho", "reprovado"].includes(
                            selected.status
                          ) && (
                            <Button
                              disabled={!selected.noticeFileUrl}
                              onClick={() => {
                                setAction("enviar");
                                setReason("");
                              }}
                            >
                              Enviar para análise
                            </Button>
                          )}
                        {canReview && selected.status === "pendente" && (
                          <>
                            <Button
                              onClick={() => {
                                setAction("aprovar");
                                setReason("");
                              }}
                            >
                              Aprovar aviso
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setAction("devolver");
                                setReason("");
                              }}
                            >
                              Solicitar correção
                            </Button>
                          </>
                        )}
                        {canEdit &&
                          selected.status !== "cancelado" &&
                          (selected.status !== "aprovado" || canReview) && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setAction("cancelar");
                                setReason("");
                              }}
                            >
                              Cancelar programação
                            </Button>
                          )}
                      </div>
                      <div className="border-t pt-4">
                        <h3 className="font-medium mb-3">Histórico</h3>
                        {history.isLoading ? (
                          <p>Carregando...</p>
                        ) : history.error ? (
                          <p role="alert">
                            Não foi possível carregar o histórico.
                          </p>
                        ) : (
                          <ol className="space-y-3">
                            {history.data?.map(e => (
                              <li key={e.id} className="text-sm">
                                <p className="font-medium">
                                  {eventLabel[e.action] ?? e.action}
                                </p>
                                <p className="text-muted-foreground">
                                  {e.userName ?? "Usuário"} ·{" "}
                                  {new Date(e.createdAt).toLocaleString(
                                    "pt-BR"
                                  )}
                                </p>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Programações e histórico de férias</CardTitle>
              </CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <p className="text-muted-foreground">
                    Nenhum período encontrado. Ajuste os filtros ou cadastre uma
                    programação.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b">
                          <th className="p-3">Colaborador</th>
                          <th className="p-3">Período</th>
                          <th className="p-3">Dias</th>
                          <th className="p-3">Situação</th>
                          <th className="p-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(p => (
                          <tr
                            key={p.id}
                            className={`border-b ${selectedId === p.id ? "bg-primary/5" : ""}`}
                          >
                            <td className="p-3">
                              {employee(p.employeeId)?.nome ??
                                `Colaborador #${p.employeeId}`}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              {dateLabel(p.startDate)} a {dateLabel(p.endDate)}
                            </td>
                            <td className="p-3">
                              {calendarDays(p.startDate, p.endDate)}
                            </td>
                            <td className="p-3">
                              {
                                vacationStatusLabels[
                                  vacationDisplayStatus(p, today)
                                ]
                              }
                            </td>
                            <td className="p-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedId(p.id);
                                  setFile(null);
                                }}
                              >
                                Detalhes
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar programação" : "Programar férias"}
            </DialogTitle>
            <DialogDescription>
              Informe os períodos conforme o controle do RH. Ao editar, será
              necessário anexar o aviso atualizado.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4 min-w-0"
            onSubmit={e => {
              e.preventDefault();
              const values = {
                acquisitionStart: form.acquisitionStart,
                acquisitionEnd: form.acquisitionEnd,
                concessionDeadline: form.concessionDeadline || null,
                startDate: form.startDate,
                endDate: form.endDate,
                notes: form.notes,
              };
              if (editing) update.mutate({ ...values, ...editing });
              else
                create.mutate({
                  ...values,
                  companyId,
                  employeeId: Number(form.employeeId),
                });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="vac-employee">Colaborador</Label>
              <select
                id="vac-employee"
                required
                disabled={!!editing}
                className={selectClass}
                value={form.employeeId}
                onChange={e => setForm({ ...form, employeeId: e.target.value })}
              >
                <option value="">Selecione</option>
                {employees.data
                  ?.filter(
                    e =>
                      e.status === "ativo" || String(e.id) === form.employeeId
                  )
                  .map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["acquisitionStart", "Início do período aquisitivo"],
                  ["acquisitionEnd", "Fim do período aquisitivo"],
                  ["startDate", "Início das férias"],
                  ["endDate", "Último dia das férias"],
                  ["concessionDeadline", "Prazo de concessão (opcional)"],
                ] as const
              ).map(([field, label]) => (
                <div className="space-y-2 min-w-0" key={field}>
                  <Label htmlFor={field}>{label}</Label>
                  <Input
                    id={field}
                    type="date"
                    required={field !== "concessionDeadline"}
                    value={form[field]}
                    onChange={e =>
                      setForm({ ...form, [field]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vac-notes">Observações</Label>
              <Textarea
                id="vac-notes"
                rows={4}
                maxLength={20000}
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button disabled={create.isPending || update.isPending}>
                Salvar programação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!action} onOpenChange={open => !open && setAction(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {action ? actionLabel[action] : "Confirmar"}
            </DialogTitle>
            <DialogDescription>
              Esta alteração será registrada no histórico e os responsáveis
              serão notificados. Aprovar o aviso não significa validar cálculos
              legais ou financeiros.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              if (selected && action)
                transition.mutate({
                  id: selected.id,
                  revision: selected.revision,
                  action,
                  reason,
                });
            }}
          >
            <Label htmlFor="vac-reason">
              Motivo{" "}
              {action === "devolver" || action === "cancelar"
                ? "(obrigatório)"
                : "(opcional)"}
            </Label>
            <Textarea
              id="vac-reason"
              rows={4}
              maxLength={20000}
              required={action === "devolver" || action === "cancelar"}
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAction(null)}
              >
                Voltar
              </Button>
              <Button disabled={transition.isPending}>Confirmar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
