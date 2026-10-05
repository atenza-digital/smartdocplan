import { DIALOG_SIZES, useDisplayPreferences, type DialogSize } from "@/contexts/DisplayPreferencesContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Maximize2 } from "lucide-react";

const PREVIEW_WIDTH: Record<DialogSize, string> = { pequeno: "38%", medio: "58%", grande: "78%" };

export function DialogSizePreference() {
  const { dialogSize, setDialogSize } = useDisplayPreferences();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Maximize2 className="w-4 h-4 text-primary" /> Tamanho das janelas
        </CardTitle>
        <CardDescription className="text-xs">
          Define a largura das janelas de cadastro e de detalhes neste navegador. Em celulares, elas ocupam a tela toda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div role="radiogroup" aria-label="Tamanho das janelas" className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(DIALOG_SIZES) as DialogSize[]).map((size) => {
            const option = DIALOG_SIZES[size];
            const active = dialogSize === size;
            return (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDialogSize(size)}
                className={`rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex h-12 items-center justify-center rounded-md bg-muted/60">
                  <div
                    className={`h-8 rounded border ${active ? "border-primary bg-primary/20" : "border-border bg-background"}`}
                    style={{ width: PREVIEW_WIDTH[size] }}
                  />
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.descricao}</p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
