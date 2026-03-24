import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, User, Calendar, Monitor } from "lucide-react";

export default function AdminAuditoria() {
  const { data: logs = [], isLoading } = trpc.audit.list.useQuery({ limit: 100 });

  return (
    <AdminLayout title="Auditoria">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Log de Auditoria</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Registro completo de todas as ações realizadas na plataforma.
          </p>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-primary" />
              Últimas Ações ({logs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            )}
            {!isLoading && logs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum registro de auditoria</p>
              </div>
            )}
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <ScrollText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{log.acao}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {log.entidade && (
                        <Badge variant="outline" className="text-xs py-0">{log.entidade}</Badge>
                      )}
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Usuário #{log.userId ?? "—"}
                      </span>
                      {log.ip && (
                        <span className="flex items-center gap-1">
                          <Monitor className="w-3 h-3" />
                          {log.ip}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
