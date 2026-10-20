import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface YesNoSelectCellProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function YesNoSelectCell({ value, onSave, placeholder = "Selecione", emptyLabel = "—", disabled = false, ariaLabel }: YesNoSelectCellProps) {
  const normalizedValue = value?.toLowerCase() === "sim" ? "Sim" : 
                          value?.toLowerCase() === "não" || value?.toLowerCase() === "nao" ? "Não" : 
                          "";

  return (
    <Select value={normalizedValue} onValueChange={onSave} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel || `Selecionar ${placeholder.toLocaleLowerCase("pt-BR")}`} className="h-8 text-xs bg-background border-border min-w-[80px]">
        <SelectValue placeholder={emptyLabel} />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border z-50">
        <SelectItem value="Sim">Sim</SelectItem>
        <SelectItem value="Não">Não</SelectItem>
      </SelectContent>
    </Select>
  );
}
