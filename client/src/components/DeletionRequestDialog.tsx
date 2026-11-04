import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export type DeletionTarget = { alvo: "colaborador" | "empresa"; documentoId: number; nome: string };

/** Pedido de exclusão de documento (empresa): a equipe SmartDocPlan aprova ou rejeita. */
export function DeletionRequestDialog({ target, onClose, onDone }: { target: DeletionTarget | null; onClose: () => void; onDone: () => void }) {
  const [motivo, setMotivo] = useState("");
  const fechar = () => { setMotivo(""); onClose(); };
  const createMutation = trpc.deletionRequests.create.useMutation({
    onSuccess: () => {
      toast.success("Pedido de exclusão enviado à equipe SmartDocPlan.");
      setMotivo("");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pedir exclusão de documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-sm text-muted-foreground">
            O documento "{target?.nome}" continua no lugar até a equipe SmartDocPlan aprovar o pedido. Você é avisado no sino da decisão.
          </p>
          <Label htmlFor="pedido-exclusao-motivo">Motivo *</Label>
          <Textarea id="pedido-exclusao-motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: documento enviado por engano ou em duplicidade" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={motivo.trim().length < 5 || createMutation.isPending}
            onClick={() => target && createMutation.mutate({ alvo: target.alvo, documentoId: target.documentoId, motivo: motivo.trim() })}
          >
            {createMutation.isPending ? "Enviando..." : "Pedir exclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
