import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type PickerEmployee = { id: number; nome: string; cpf: string };

/** Lista pesquisável de colaboradores (por nome ou CPF), para escolher em vez de digitar o CPF. */
export function EmployeePicker<T extends PickerEmployee>({
  employees,
  selectedId,
  onSelect,
  placeholder = "Selecione o colaborador",
}: {
  employees: T[];
  selectedId: number | null;
  onSelect: (employee: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = employees.find((employee) => employee.id === selectedId) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? `${selected.nome} · ${selected.cpf}` : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome ou CPF..." />
          <CommandList>
            <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
            <CommandGroup>
              {employees.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={`${employee.nome} ${employee.cpf}`}
                  onSelect={() => {
                    onSelect(employee);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", employee.id === selectedId ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{employee.nome}</span>
                  <span className="ml-auto pl-3 font-mono text-xs text-muted-foreground">{employee.cpf}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
