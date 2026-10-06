import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AGRUPAMENTO_LABELS,
  PRESET_LABELS,
  autoAgrupamento,
  presetRange,
  type Agrupamento,
  type Periodo,
  type Preset,
} from "./biFormat";

export type PeriodState = Periodo & { preset: Preset };

export function initialPeriod(preset: Exclude<Preset, "personalizado"> = "mes"): PeriodState {
  const range = presetRange(preset);
  return { preset, ...range, agrupamento: autoAgrupamento(range.inicio, range.fim) };
}

export function PeriodFilter({ value, onChange }: { value: PeriodState; onChange: (next: PeriodState) => void }) {
  const setPreset = (preset: Preset) => {
    if (preset === "personalizado") {
      onChange({ ...value, preset });
      return;
    }
    const range = presetRange(preset);
    onChange({ preset, ...range, agrupamento: autoAgrupamento(range.inicio, range.fim) });
  };

  const setData = (campo: "inicio" | "fim", data: string) => {
    if (!data) return;
    const next = { ...value, preset: "personalizado" as const, [campo]: data };
    if (next.inicio > next.fim) {
      if (campo === "inicio") next.fim = data;
      else next.inicio = data;
    }
    onChange({ ...next, agrupamento: autoAgrupamento(next.inicio, next.fim) });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5 min-w-0">
        <Label htmlFor="bi-periodo">Período</Label>
        <Select value={value.preset} onValueChange={(v) => setPreset(v as Preset)}>
          <SelectTrigger id="bi-periodo" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PRESET_LABELS) as Preset[]).map((preset) => (
              <SelectItem key={preset} value={preset}>{PRESET_LABELS[preset]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 min-w-0">
        <Label htmlFor="bi-inicio">De</Label>
        <Input id="bi-inicio" type="date" value={value.inicio} max={value.fim} onChange={(e) => setData("inicio", e.target.value)} />
      </div>
      <div className="space-y-1.5 min-w-0">
        <Label htmlFor="bi-fim">Até</Label>
        <Input id="bi-fim" type="date" value={value.fim} min={value.inicio} onChange={(e) => setData("fim", e.target.value)} />
      </div>
      <div className="space-y-1.5 min-w-0">
        <Label htmlFor="bi-agrupamento">Agrupar gráfico</Label>
        <Select value={value.agrupamento} onValueChange={(v) => onChange({ ...value, agrupamento: v as Agrupamento })}>
          <SelectTrigger id="bi-agrupamento" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(AGRUPAMENTO_LABELS) as Agrupamento[]).map((a) => (
              <SelectItem key={a} value={a}>{AGRUPAMENTO_LABELS[a]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
