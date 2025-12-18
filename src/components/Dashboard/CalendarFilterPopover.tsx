import { useState } from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface CalendarFilterPopoverProps {
  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
  placeholder?: string;
  availableDates?: string[];
}

export function CalendarFilterPopover({ 
  selectedDates, 
  onDatesChange, 
  placeholder = "Selecionar datas",
  availableDates = []
}: CalendarFilterPopoverProps) {
  const [open, setOpen] = useState(false);

  // Parse date strings to Date objects
  const parseDateStr = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
    return isValid(parsed) ? parsed : null;
  };

  // Convert selected date strings to Date objects
  const selectedDateObjects = selectedDates
    .map(parseDateStr)
    .filter((d): d is Date => d !== null);

  // Convert available dates to Date objects for highlighting
  const availableDateObjects = availableDates
    .map(parseDateStr)
    .filter((d): d is Date => d !== null);

  const handleSelect = (dates: Date[] | undefined) => {
    if (!dates) {
      onDatesChange([]);
      return;
    }
    const dateStrings = dates.map(d => format(d, "dd/MM/yyyy"));
    onDatesChange(dateStrings);
  };

  const removeDate = (dateToRemove: string) => {
    onDatesChange(selectedDates.filter(d => d !== dateToRemove));
  };

  const clearAll = () => {
    onDatesChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 text-xs bg-background border-border justify-start text-left font-normal w-full",
            selectedDates.length === 0 && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-3 w-3" />
          {selectedDates.length === 0 ? (
            placeholder
          ) : selectedDates.length === 1 ? (
            selectedDates[0]
          ) : (
            `${selectedDates.length} datas`
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="start">
        <div className="p-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {selectedDates.length} selecionada(s)
            </span>
            {selectedDates.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 text-xs">
                <X className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          {selectedDates.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 max-w-[280px]">
              {selectedDates.map(date => (
                <Badge 
                  key={date} 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-destructive/20"
                  onClick={() => removeDate(date)}
                >
                  {date}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Calendar
          mode="multiple"
          selected={selectedDateObjects}
          onSelect={handleSelect}
          locale={ptBR}
          className="p-3 pointer-events-auto"
          modifiers={{
            available: availableDateObjects
          }}
          modifiersStyles={{
            available: {
              fontWeight: "bold",
              backgroundColor: "hsl(var(--accent) / 0.2)"
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
