import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DirectoryPerson } from "@/hooks/useDirectory";

interface PersonSelectProps {
  people: DirectoryPerson[];
  value: string | null;
  onValueChange: (id: string | null, person: DirectoryPerson | null) => void;
  placeholder: string;
  emptyLabel?: string;
  currentLabel?: string | null;
  disabled?: boolean;
  includeInactive?: boolean;
}

export function PersonSelect({ people, value, onValueChange, placeholder, emptyLabel = "Não atribuído", currentLabel, disabled, includeInactive = false }: PersonSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = people.find((person) => person.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="h-9 w-full justify-between font-normal">
          <span className={cn("truncate", !selected && !currentLabel && "text-muted-foreground")}>{selected?.name || currentLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Buscar ${placeholder.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>Nenhum cadastro encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__unassigned__" onSelect={() => { onValueChange(null, null); setOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", !selected && !currentLabel ? "opacity-100" : "opacity-0")} />
                {emptyLabel}
              </CommandItem>
              {people.filter((person) => includeInactive || person.is_active || person.id === value).map((person) => (
                <CommandItem key={person.id} value={`${person.name} ${person.role || ""}`} onSelect={() => { onValueChange(person.id, person); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", person.id === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{person.name}{!person.is_active ? " (inativo)" : ""}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
