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
import {
  categoryMatchesValue,
  normalizeCategoryValue,
  type CategoryCatalogItem,
} from "@/hooks/useCategories";

const EMPTY_VALUE = "__category_empty__";
const categoryOptionValue = (id: string) => `category:${id}`;
const literalOptionValue = (value: string) => `literal:${value}`;

interface CategoryOption {
  value: string;
  label: string;
  persistedValue: string;
}

interface CategorySelectProps {
  id?: string;
  value: string;
  categories: CategoryCatalogItem[];
  fallbackValues?: readonly string[];
  onValueChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  emptyLabel?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

/** Select a canonical category while preserving legacy text values until changed. */
export function CategorySelect({
  id,
  value,
  categories,
  fallbackValues = [],
  onValueChange,
  placeholder,
  ariaLabel,
  emptyLabel = "Não informado",
  disabled = false,
  clearable = false,
  className,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const currentCategory = categories.find((category) => categoryMatchesValue(category, value));

  const options = useMemo<CategoryOption[]>(() => {
    const current = categories.find((category) => categoryMatchesValue(category, value));
    const categoryOptions = categories
      .filter((category) => category.is_active || category.id === current?.id)
      .map((category) => ({
        value: categoryOptionValue(category.id),
        label: `${category.label}${category.is_active ? "" : " (inativa; valor atual)"}`,
        persistedValue: category.label,
      }));

    const knownCategoryValues = [...categories];
    const literalOptions: CategoryOption[] = [];
    const seenLiterals = new Set<string>();
    for (const candidate of [...fallbackValues, value]) {
      const label = candidate.trim().replace(/\s+/g, " ");
      if (!label || knownCategoryValues.some((category) => categoryMatchesValue(category, label))) continue;
      const normalized = normalizeCategoryValue(label);
      if (seenLiterals.has(normalized)) continue;
      seenLiterals.add(normalized);
      const isCurrent = normalizeCategoryValue(label) === normalizeCategoryValue(value);
      literalOptions.push({
        value: literalOptionValue(label),
        label: `${label}${isCurrent ? " (valor existente)" : ""}`,
        persistedValue: label,
      });
    }

    return [...categoryOptions, ...literalOptions];
  }, [categories, fallbackValues, value]);

  const optionByValue = useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);
  const currentLiteral = options.find(
    (option) => option.value.startsWith("literal:") && normalizeCategoryValue(option.persistedValue) === normalizeCategoryValue(value),
  );
  const selectedOptionValue = currentCategory
    ? categoryOptionValue(currentCategory.id)
    : currentLiteral?.value ?? (clearable && !value ? EMPTY_VALUE : null);
  const selectedLabel = currentCategory
    ? `${currentCategory.label}${currentCategory.is_active ? "" : " (inativa; valor atual)"}`
    : currentLiteral?.label || (clearable && !value ? emptyLabel : placeholder);
  const searchSubject = placeholder.replace(/^(?:selecione|selecionar|escolha|escolher)\s+(?:(?:um|uma)\s+)?/i, "").trim();
  const items = useMemo(
    () => [...(clearable ? [EMPTY_VALUE] : []), ...options.map((option) => option.value)],
    [clearable, options],
  );

  const itemLabel = (optionValue: string) => {
    if (optionValue === EMPTY_VALUE) return emptyLabel;
    return optionByValue.get(optionValue)?.label || "";
  };

  return (
    <Combobox
      items={items}
      value={selectedOptionValue}
      onValueChange={(nextValue) => {
        if (nextValue === EMPTY_VALUE || nextValue === null) onValueChange("");
        else {
          const selectedOption = optionByValue.get(nextValue);
          if (selectedOption) onValueChange(selectedOption.persistedValue);
        }
        setOpen(false);
      }}
      itemToStringLabel={itemLabel}
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
            aria-label={ariaLabel || placeholder}
            aria-expanded={open}
            disabled={disabled}
            className={cn("h-9 w-full justify-between font-normal", className)}
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>{selectedLabel}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        }
      />
      <ComboboxContent className="w-[var(--anchor-width)] min-w-[220px] p-1" align="start">
        <ComboboxInput aria-label={`Buscar ${searchSubject.toLocaleLowerCase("pt-BR")}`} placeholder={`Buscar ${searchSubject.toLocaleLowerCase("pt-BR")}...`} />
        <ComboboxEmpty>Nenhuma categoria encontrada.</ComboboxEmpty>
        <ComboboxList>
          {(optionValue: string) => (
            <ComboboxItem key={optionValue} value={optionValue}>
              <Check aria-hidden="true" className={cn("size-4 shrink-0", optionValue === selectedOptionValue ? "opacity-100" : "opacity-0")} />
              <span className="truncate">{itemLabel(optionValue)}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
