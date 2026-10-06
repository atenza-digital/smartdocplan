import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { UFS, formatCep, normalizeCep, type AddressValue } from "@shared/address";
import { lookupCep } from "@/lib/cep";

/**
 * Campos de endereço com busca pelo CEP: ao completar os 8 dígitos, preenche rua, bairro, cidade e UF.
 * Se o CEP não existir ou o serviço não responder, os campos seguem editáveis para preenchimento manual.
 */
export function AddressFields({
  value,
  onChange,
  idPrefix = "endereco",
  disabled = false,
}: {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  idPrefix?: string;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "notfound" | "error" | "ok">("idle");
  const numeroRef = useRef<HTMLInputElement>(null);
  const latest = useRef(value);
  latest.current = value;
  const pending = useRef<AbortController | null>(null);

  // A busca só roda quando a pessoa digita o CEP: carregar um endereço salvo nunca o sobrescreve.
  const searchCep = (cep: string) => {
    pending.current?.abort();
    const digits = normalizeCep(cep);
    if (digits.length !== 8) return;
    const controller = new AbortController();
    pending.current = controller;
    setStatus("loading");
    lookupCep(digits, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!result) {
          setStatus("notfound");
          return;
        }
        const current = latest.current;
        // Preenche o que o CEP trouxe e mantém número e complemento digitados.
        onChange({
          ...current,
          endereco: result.endereco || current.endereco,
          bairro: result.bairro || current.bairro,
          cidade: result.cidade || current.cidade,
          estado: result.estado || current.estado,
        });
        setStatus("ok");
        if (!current.numero) numeroRef.current?.focus();
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setStatus("error");
      });
  };

  const set = (field: keyof AddressValue) => (event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [field]: event.target.value });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-cep`}>CEP</Label>
        <div className="relative">
          <Input
            id={`${idPrefix}-cep`}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={formatCep(value.cep)}
            disabled={disabled}
            onChange={(e) => {
              const cep = formatCep(e.target.value);
              setStatus("idle");
              onChange({ ...value, cep });
              searchCep(cep);
            }}
          />
          {status === "loading" && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        {status === "notfound" && <p className="text-xs text-amber-700 dark:text-amber-400">CEP não encontrado. Preencha o endereço à mão.</p>}
        {status === "error" && <p className="text-xs text-amber-700 dark:text-amber-400">Não foi possível consultar o CEP agora. Preencha à mão.</p>}
        {status === "ok" && <p className="text-xs text-muted-foreground">Endereço preenchido pelo CEP. Confira e informe o número.</p>}
      </div>
      <div className="space-y-1.5 sm:col-span-4">
        <Label htmlFor={`${idPrefix}-rua`}>Endereço (rua, avenida)</Label>
        <Input id={`${idPrefix}-rua`} autoComplete="address-line1" value={value.endereco} disabled={disabled} onChange={set("endereco")} placeholder="Ex.: Av. Paulista" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-numero`}>Número</Label>
        <Input id={`${idPrefix}-numero`} ref={numeroRef} value={value.numero} disabled={disabled} onChange={set("numero")} placeholder="Ex.: 1000 ou s/n" />
      </div>
      <div className="space-y-1.5 sm:col-span-4">
        <Label htmlFor={`${idPrefix}-complemento`}>Complemento</Label>
        <Input id={`${idPrefix}-complemento`} value={value.complemento} disabled={disabled} onChange={set("complemento")} placeholder="Ex.: bloco B, galpão 3" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-bairro`}>Bairro</Label>
        <Input id={`${idPrefix}-bairro`} value={value.bairro} disabled={disabled} onChange={set("bairro")} />
      </div>
      <div className="space-y-1.5 sm:col-span-3">
        <Label htmlFor={`${idPrefix}-cidade`}>Cidade</Label>
        <Input id={`${idPrefix}-cidade`} autoComplete="address-level2" value={value.cidade} disabled={disabled} onChange={set("cidade")} />
      </div>
      <div className="space-y-1.5 sm:col-span-1">
        <Label>UF</Label>
        <Select value={value.estado || undefined} onValueChange={(estado) => onChange({ ...value, estado })} disabled={disabled}>
          <SelectTrigger aria-label="UF"><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>
            {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
