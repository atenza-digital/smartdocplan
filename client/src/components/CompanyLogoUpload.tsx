import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { fileToBase64 } from "@/lib/files";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Logo da empresa: aparece no cabeçalho da área da empresa e nos relatórios em PDF. */
export function CompanyLogoUpload({
  companyId,
  logoUrl,
  canEdit,
}: {
  companyId: number;
  logoUrl: string | null | undefined;
  canEdit: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const utils = trpc.useUtils();
  const mutation = trpc.companies.updateLogo.useMutation({
    onSuccess: (result) => {
      toast.success(result.logoUrl ? "Logo atualizada." : "Logo removida.");
      utils.companies.get.invalidate({ id: companyId });
      utils.companies.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const enviar = async (file: File | null) => {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Envie a logo em PNG ou JPG.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("A logo deve ter no máximo 2 MB.");
      return;
    }
    setLendo(true);
    try {
      mutation.mutate({ companyId, fileBase64: await fileToBase64(file) });
    } catch {
      toast.error("Não foi possível ler o arquivo selecionado.");
    } finally {
      setLendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const ocupado = lendo || mutation.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" /> Logo da empresa
        </CardTitle>
        <CardDescription className="text-xs">
          Aparece no topo da área da empresa e na capa dos relatórios em PDF. PNG ou JPG, até 2 MB, de preferência com fundo transparente.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo da empresa" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">Sem logo</span>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              id={`logo-empresa-${companyId}`}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => enviar(e.target.files?.[0] ?? null)}
            />
            <Button size="sm" variant="outline" disabled={ocupado} onClick={() => inputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              {ocupado ? "Enviando..." : logoUrl ? "Trocar logo" : "Enviar logo"}
            </Button>
            {logoUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={ocupado}
                onClick={() => mutation.mutate({ companyId, fileBase64: null })}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remover
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
