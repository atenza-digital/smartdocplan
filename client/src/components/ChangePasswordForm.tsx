import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ChangePasswordForm() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);

  const handleSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não conferem.");
      return;
    }
    if (novaSenha.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      if (res.ok) {
        toast.success("Senha alterada com sucesso!");
        setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Erro ao alterar senha.");
      }
    } catch {
      toast.error("Erro de comunicação com o servidor.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={handleSenha} className="space-y-4 max-w-sm">
      <div className="space-y-1.5">
        <Label htmlFor="senhaAtual" className="text-xs">Senha atual</Label>
        <Input id="senhaAtual" type="password" autoComplete="current-password" value={senhaAtual}
          onChange={e => setSenhaAtual(e.target.value)} required className="h-9 text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="novaSenha" className="text-xs">Nova senha</Label>
        <Input id="novaSenha" type="password" autoComplete="new-password" value={novaSenha}
          onChange={e => setNovaSenha(e.target.value)} required minLength={8} className="h-9 text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmar" className="text-xs">Confirmar nova senha</Label>
        <Input id="confirmar" type="password" autoComplete="new-password" value={confirmarSenha}
          onChange={e => setConfirmarSenha(e.target.value)} required className="h-9 text-sm" />
      </div>
      <Button type="submit" size="sm" disabled={salvando} className="bg-primary hover:bg-primary/90">
        {salvando ? "Salvando..." : "Alterar Senha"}
      </Button>
    </form>
  );
}
