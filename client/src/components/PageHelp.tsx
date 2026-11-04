import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { HelpCircle, Lightbulb, ListChecks, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPageHelp } from "@/lib/pageHelp";

/**
 * Botão "Ajuda" (?) do cabeçalho: abre uma janela que explica a tela atual, o passo a passo para usá-la,
 * dicas e quem pode fazer o quê. O texto de cada tela fica em `lib/pageHelp.ts`.
 */
export default function PageHelp({ suporte = false }: { suporte?: boolean }) {
  const [open, setOpen] = useState(false);
  const [path] = useLocation();
  const search = useSearch();
  const help = getPageHelp(path, search);
  if (!help) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1.5 px-2.5"
        onClick={() => setOpen(true)}
        aria-label="Ajuda desta tela"
        title="Ajuda: o que é esta tela e como seguir"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Ajuda</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Ajuda: {help.titulo}
            </DialogTitle>
            <DialogDescription>Para que serve esta tela e como seguir, passo a passo.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <section className="space-y-1.5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Target className="h-4 w-4 text-primary" />
                Para que serve esta tela
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">{help.paraQueServe}</p>
            </section>

            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ListChecks className="h-4 w-4 text-primary" />
                Como seguir
              </h3>
              <ol className="space-y-2">
                {help.passos.map((passo, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-6 text-foreground">{passo}</span>
                  </li>
                ))}
              </ol>
            </section>

            {help.dicas && help.dicas.length > 0 && (
              <section className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Dicas e cuidados
                </h3>
                <ul className="list-disc space-y-1 pl-5">
                  {help.dicas.map((dica) => (
                    <li key={dica} className="text-sm leading-6 text-muted-foreground">{dica}</li>
                  ))}
                </ul>
              </section>
            )}

            {help.quemPode && (
              <section className="space-y-1.5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  Quem pode fazer o quê
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">{help.quemPode}</p>
              </section>
            )}

            {suporte && (
              <p className="text-xs text-muted-foreground">
                Ainda com dúvida? Abra um chamado no menu “Chamados”: a equipe SmartDocPlan responde por lá.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
