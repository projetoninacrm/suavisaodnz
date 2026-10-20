import { useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/data/SearchInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MultiSelectFilterProps {
  id?: string;
  options: MultiSelectFilterItem[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  ariaLabel?: string;
}

export interface MultiSelectFilterOption {
  value: string;
  label: string;
}

export type MultiSelectFilterItem = string | MultiSelectFilterOption;

export const UNINFORMED_FILTER_VALUE = "\u0000dnz-uninformed";

export function MultiSelectFilter({
  id,
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Selecione...",
  emptyText = "Nenhuma opção disponível",
  ariaLabel,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const normalizedOptions = options.map((option) => typeof option === "string" ? { value: option, label: option } : option);
  const searchLabel = ariaLabel
    ? `Buscar ${ariaLabel.replace(/^Filtrar(?: por)?\s*/i, "").toLocaleLowerCase("pt-BR")}`
    : "Buscar opções";
  const visibleOptions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return normalizedOptions;
    return normalizedOptions.filter((option) => option.label.toLocaleLowerCase("pt-BR").includes(query));
  }, [normalizedOptions, search]);

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onSelectionChange(selectedValues.filter((v) => v !== option));
    } else {
      onSelectionChange([...selectedValues, option]);
    }
  };

  const selectAll = () => {
    if (!search.trim()) {
      onSelectionChange(normalizedOptions.map((option) => option.value));
      return;
    }
    const selected = new Set(selectedValues);
    visibleOptions.forEach((option) => selected.add(option.value));
    onSelectionChange([...selected]);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const displayValue = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === normalizedOptions.length) return "Todos";
    if (selectedValues.length === 1) {
      return normalizedOptions.find((option) => option.value === selectedValues[0])?.label || selectedValues[0];
    }
    return `${selectedValues.length} selecionados`;
  };

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) setSearch("");
    }}>
      <PopoverTrigger render={
        <Button
          id={id}
          variant="outline"
          aria-label={ariaLabel}
          aria-expanded={open}
          className="h-10 w-full justify-between bg-background text-sm font-normal"
        >
          <span className="truncate">{displayValue()}</span>
          <ChevronDown aria-hidden="true" className="ml-2 size-4 shrink-0 text-muted-foreground" />
        </Button>
      } />
      <PopoverContent className="w-[220px] p-0 bg-popover border-border z-50" align="start">
        <div className="space-y-2 border-b border-border p-2">
          <SearchInput
            aria-label={searchLabel}
            placeholder={`${searchLabel}...`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9"
          />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={selectAll}
              className="h-7 text-xs flex-1"
            >
              {search.trim() ? "Marcar resultados" : "Marcar todos"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={clearAll}
              className="h-7 text-xs flex-1"
            >
              <X className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          </div>
        </div>
        <div role="group" aria-label={ariaLabel || placeholder} className="max-h-[240px] overflow-y-auto p-1">
          {normalizedOptions.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : visibleOptions.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">Nenhuma opção encontrada.</div>
          ) : (
            visibleOptions.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={isSelected}
                  onClick={() => toggleOption(option.value)}
                  className={cn(
                    "h-auto w-full justify-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                    isSelected && "bg-accent/50"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-4 items-center justify-center rounded-sm border",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50",
                    )}
                  >
                    {isSelected && <Check className="size-3" />}
                  </span>
                  <span className="truncate">{option.label}</span>
                </Button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
