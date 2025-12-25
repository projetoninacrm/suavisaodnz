import { useState } from "react";
import { format, parse, isValid, eachDayOfInterval, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [rangeStart, setRangeStart] = useState<Date | null>(null);

  const parseDateStr = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
    return isValid(parsed) ? parsed : null;
  };

  const selectedDateObjects = selectedDates
    .map(parseDateStr)
    .filter((d): d is Date => d !== null);

  const availableDateObjects = availableDates
    .map(parseDateStr)
    .filter((d): d is Date => d !== null);

  const handleDayClick = (day: Date) => {
    if (!rangeStart) {
      // First click - set start of range
      setRangeStart(day);
      const dateStr = format(day, "dd/MM/yyyy");
      if (!selectedDates.includes(dateStr)) {
        onDatesChange([...selectedDates, dateStr]);
      }
    } else {
      // Second click - complete the range
      const start = isBefore(day, rangeStart) ? day : rangeStart;
      const end = isAfter(day, rangeStart) ? day : rangeStart;
      
      const datesInRange = eachDayOfInterval({ start, end });
      const dateStrings = datesInRange.map(d => format(d, "dd/MM/yyyy"));
      
      // Merge with existing selected dates (avoiding duplicates)
      const newSelectedDates = [...new Set([...selectedDates, ...dateStrings])];
      onDatesChange(newSelectedDates);
      setRangeStart(null);
    }
  };

  const clearAll = () => {
    onDatesChange([]);
    setRangeStart(null);
  };

  const getButtonLabel = () => {
    if (selectedDates.length === 0) return placeholder;
    if (selectedDates.length === 1) return selectedDates[0];
    return `${selectedDates.length} datas`;
  };

  const getRangeLabel = () => {
    if (rangeStart) {
      return `Início: ${format(rangeStart, "dd/MM")} - Clique no fim do intervalo`;
    }
    return "Clique em uma data para iniciar o intervalo";
  };

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setRangeStart(null);
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 text-xs border-border justify-between text-left font-normal w-full gap-2",
            selectedDates.length > 0 
              ? "bg-accent/20 border-accent/50 text-accent-foreground" 
              : "bg-background text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="truncate">{getButtonLabel()}</span>
          </div>
          {selectedDates.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
              {selectedDates.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 shadow-lg" align="start">
        <div className="bg-card rounded-t-lg">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">
                {selectedDates.length} selecionada(s)
              </span>
            </div>
            {selectedDates.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAll} 
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          
          {/* Range selection hint */}
          <div className="px-3 py-2 border-b border-border bg-primary/10">
            <p className={cn(
              "text-xs text-center",
              rangeStart ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              {getRangeLabel()}
            </p>
          </div>
          
          {selectedDates.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-3 border-b border-border bg-muted/30 max-w-[300px] max-h-[100px] overflow-y-auto">
              {selectedDates.sort().map(date => (
                <button
                  key={date}
                  onClick={() => onDatesChange(selectedDates.filter(d => d !== date))}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-accent/20 text-accent-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
                >
                  {date}
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}
        </div>
        
        <Calendar
          mode="multiple"
          selected={selectedDateObjects}
          onDayClick={handleDayClick}
          locale={ptBR}
          className="p-3 pointer-events-auto"
          modifiers={{
            available: availableDateObjects,
            selected: selectedDateObjects,
            rangeStart: rangeStart ? [rangeStart] : []
          }}
          modifiersClassNames={{
            available: "font-bold bg-accent/30 text-accent-foreground",
            selected: "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground",
            rangeStart: "ring-2 ring-primary ring-offset-2"
          }}
        />
        
        <div className="p-2 border-t border-border bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">
            Datas destacadas possuem registros
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
