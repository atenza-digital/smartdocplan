import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

/**
 * Primeiro acesso com senha provisória (usuário novo ou com senha redefinida pelo administrador): janela que não
 * fecha até a pessoa criar a própria senha. Ao trocar, o servidor limpa a marca e a janela some.
 */
export function ForcedPasswordChange() {
  const { user, refresh, logout } = useLocalAuth();
  return (
    <Dialog open={!!user?.mustChangePassword}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Crie a sua senha</DialogTitle>
          <DialogDescription>
            Você entrou com uma senha provisória. Para continuar, escolha uma senha só sua: pelo menos 8 caracteres, com letras, números e símbolos.
          </DialogDescription>
        </DialogHeader>
        <ChangePasswordForm className="max-w-none" onChanged={() => void refresh()} />
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => void logout()}>
            Sair
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
