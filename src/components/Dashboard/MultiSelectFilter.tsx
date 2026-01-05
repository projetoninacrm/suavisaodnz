import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MultiSelectFilterProps {
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  emptyText?: string;
}

export function MultiSelectFilter({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Selecione...",
  emptyText = "Nenhuma opção disponível",
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onSelectionChange(selectedValues.filter((v) => v !== option));
    } else {
      onSelectionChange([...selectedValues, option]);
    }
  };

  const selectAll = () => {
    onSelectionChange([...options]);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const displayValue = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === options.length) return "Todos";
    if (selectedValues.length === 1) return selectedValues[0];
    return `${selectedValues.length} selecionados`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between text-xs bg-background border-border font-normal"
        >
          <span className="truncate">{displayValue()}</span>
          <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0 bg-popover border-border z-50" align="start">
        <div className="p-2 border-b border-border">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="h-7 text-xs flex-1"
            >
              Marcar todos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-7 text-xs flex-1"
            >
              <X className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1">
          {options.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            options.map((option) => {
              const isSelected = selectedValues.includes(option);
              return (
                <div
                  key={option}
                  onClick={() => toggleOption(option)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer text-sm",
                    "hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent/50"
                  )}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded-sm border flex items-center justify-center",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/50"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="truncate">{option}</span>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
