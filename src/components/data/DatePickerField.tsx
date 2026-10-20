import { useState } from "react";
import { format, isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerFieldProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  valueFormat?: string;
  displayFormat?: string;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
}

export function DatePickerField({
  id,
  label,
  value,
  onValueChange,
  valueFormat = "dd/MM/yyyy",
  displayFormat = "dd/MM/yyyy",
  placeholder = "Selecionar data",
  disabled = false,
  clearable = true,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const parsedValue = value ? parse(value, valueFormat, new Date()) : undefined;
  const selectedDate = parsedValue && isValid(parsedValue) && format(parsedValue, valueFormat) === value
    ? parsedValue
    : undefined;
  const buttonLabel = selectedDate
    ? format(selectedDate, displayFormat, { locale: ptBR })
    : value || placeholder;

  const selectDate = (date?: Date) => {
    if (!date) return;
    onValueChange(format(date, valueFormat));
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={`${label}: ${buttonLabel}`}
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-start gap-2 text-left font-normal"
          >
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{buttonLabel}</span>
          </Button>
        } />
        <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0" align="start" collisionPadding={8}>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={selectDate}
            initialFocus
            locale={ptBR}
            className="pointer-events-auto"
          />
          {clearable && value && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => { onValueChange(""); setOpen(false); }}
              >
                <X className="mr-2 size-4" aria-hidden="true" />
                Limpar {label.toLocaleLowerCase("pt-BR")}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
