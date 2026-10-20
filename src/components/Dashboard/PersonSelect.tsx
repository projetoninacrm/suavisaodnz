import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import type { DirectoryPerson } from "@/hooks/useDirectory";

interface PersonSelectProps {
  id?: string;
  people: DirectoryPerson[];
  value: string | null;
  onValueChange: (id: string | null, person: DirectoryPerson | null) => void;
  placeholder: string;
  ariaLabel?: string;
  emptyLabel?: string;
  currentLabel?: string | null;
  disabled?: boolean;
  includeInactive?: boolean;
}

const UNASSIGNED_VALUE = "__unassigned__";

export function PersonSelect({
  id,
  people,
  value,
  onValueChange,
  placeholder,
  ariaLabel,
  emptyLabel = "Não atribuído",
  currentLabel,
  disabled,
  includeInactive = false,
}: PersonSelectProps) {
  const [open, setOpen] = useState(false);
  const selectablePeople = useMemo(
    () => people.filter((person) => includeInactive || person.is_active || person.id === value),
    [includeInactive, people, value]
  );
  const items = useMemo(
    () => [UNASSIGNED_VALUE, ...selectablePeople.map((person) => person.id)],
    [selectablePeople]
  );
  const selected = people.find((person) => person.id === value);
  const selectedLabel = selected
    ? `${selected.name}${selected.is_active ? "" : " (inativo)"}`
    : currentLabel || placeholder;
  const searchSubject = placeholder.replace(/^(?:selecione|selecionar|escolha|escolher)\s+(?:(?:um|uma)\s+)?/i, "").trim();
  const comboboxValue = value ?? (currentLabel ? null : UNASSIGNED_VALUE);

  const getPersonLabel = (personId: string) => {
    if (personId === UNASSIGNED_VALUE) return emptyLabel;
    const person = selectablePeople.find((candidate) => candidate.id === personId);
    return person ? `${person.name}${person.is_active ? "" : " (inativo)"}` : "";
  };

  return (
    <Combobox
      items={items}
      value={comboboxValue}
      onValueChange={(nextValue) => {
        if (nextValue === UNASSIGNED_VALUE || nextValue === null) {
          onValueChange(null, null);
        } else {
          const person = people.find((candidate) => candidate.id === nextValue) || null;
          onValueChange(person?.id ?? null, person);
        }
        setOpen(false);
      }}
      itemToStringLabel={getPersonLabel}
      itemToStringValue={(personId) => personId}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
    >
      <ComboboxTrigger className="w-full justify-between"
        render={
          <Button
            type="button"
            id={id}
            variant="outline"
            aria-label={ariaLabel || placeholder}
            aria-expanded={open}
            disabled={disabled}
            className="h-9 w-full justify-between font-normal"
          >
            <span className={cn("truncate", !selected && !currentLabel && "text-muted-foreground")}>
              {selectedLabel}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        }
      />
      <ComboboxContent className="w-[var(--anchor-width)] min-w-[220px] p-1" align="start">
        <ComboboxInput
          aria-label={`Buscar ${searchSubject.toLocaleLowerCase("pt-BR")}`}
          placeholder={`Buscar ${searchSubject.toLocaleLowerCase("pt-BR")}...`}
        />
        <ComboboxEmpty>Nenhum cadastro encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(personId: string) => (
            <ComboboxItem key={personId} value={personId}>
              <Check
                aria-hidden="true"
                className={cn("h-4 w-4 shrink-0", personId === comboboxValue ? "opacity-100" : "opacity-0")}
              />
              <span className="truncate">{getPersonLabel(personId)}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
