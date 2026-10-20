import type { ReactNode } from "react";
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { FilterField } from "@/components/data/FilterField";
import { cn } from "@/lib/utils";

export type SelectFilterOption = string | { value: string; label: string };

interface SelectFilterProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectFilterOption[];
  labelAdornment?: ReactNode;
  labelClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  orientation?: "vertical" | "horizontal";
  className?: string;
  triggerClassName?: string;
}

export function SelectFilter({
  id,
  label,
  value,
  onValueChange,
  options,
  labelAdornment,
  labelClassName,
  placeholder,
  disabled = false,
  searchable = false,
  orientation = "vertical",
  className,
  triggerClassName,
}: SelectFilterProps) {
  const normalizedOptions = options.map((option) => typeof option === "string" ? { value: option, label: option } : option);

  return (
    <FilterField
      id={id}
      label={label}
      labelAdornment={labelAdornment}
      labelClassName={labelClassName}
      className={cn(orientation === "horizontal" && "flex items-center gap-3 space-y-0", className)}
    >
      {searchable ? (
        <SearchableSelectFilter
          id={id}
          label={label}
          value={value}
          options={normalizedOptions}
          onValueChange={onValueChange}
          placeholder={placeholder}
          disabled={disabled}
          triggerClassName={triggerClassName}
        />
      ) : (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger id={id} className={triggerClassName}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {normalizedOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </FilterField>
  );
}

function SearchableSelectFilter({
  id,
  label,
  value,
  options,
  onValueChange,
  placeholder,
  disabled,
  triggerClassName,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const optionLabels = new Map(options.map((option) => [option.value, option.label]));
  const selectedLabel = optionLabels.get(value);
  const searchLabel = label.replace(/:$/, "").toLocaleLowerCase("pt-BR");

  return (
    <Combobox
      items={options.map((option) => option.value)}
      value={selectedLabel ? value : null}
      onValueChange={(nextValue) => {
        onValueChange(nextValue || "");
        setOpen(false);
      }}
      itemToStringLabel={(optionValue) => optionLabels.get(optionValue) || ""}
      itemToStringValue={(optionValue) => optionValue}
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
            disabled={disabled}
            className={cn("h-10 w-full justify-between bg-background text-sm font-normal", triggerClassName)}
          >
            <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
              {selectedLabel || placeholder || "Selecione uma opção"}
            </span>
            <ChevronsUpDown aria-hidden="true" className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <ComboboxContent className="w-[var(--anchor-width)] min-w-[220px] p-1" align="start">
        <ComboboxInput
          aria-label={`Buscar ${searchLabel}`}
          placeholder={`Buscar ${searchLabel}...`}
        />
        <ComboboxEmpty>Nenhuma opção encontrada.</ComboboxEmpty>
        <ComboboxList>
          {(optionValue: string) => (
            <ComboboxItem key={optionValue} value={optionValue}>
              <Check aria-hidden="true" className={cn("size-4 shrink-0", optionValue === value ? "opacity-100" : "opacity-0")} />
              <span className="truncate">{optionLabels.get(optionValue) || ""}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
