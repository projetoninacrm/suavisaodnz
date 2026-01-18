import { useState, useMemo } from "react";
import { Trash2, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableCell } from "./EditableCell";
import { DayBadge } from "./DayBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Schedule } from "@/hooks/useSchedules";

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTH_LABELS: Record<string, string> = {
  jan: "Janeiro",
  fev: "Fevereiro",
  mar: "Março",
  abr: "Abril",
  mai: "Maio",
  jun: "Junho",
  jul: "Julho",
  ago: "Agosto",
  set: "Setembro",
  out: "Outubro",
  nov: "Novembro",
  dez: "Dezembro",
};

// Helper: extrai o mês de uma data (suporta DD/MM/YYYY e DD/mes)
function getMonthFromDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  const parts = dateStr.split("/");
  if (parts.length >= 2) {
    const monthPart = parts[1].toLowerCase().trim();
    if (MONTH_NAMES.includes(monthPart)) {
      return monthPart;
    }
    const monthNum = parseInt(monthPart, 10);
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      return MONTH_NAMES[monthNum - 1];
    }
  }
  return null;
}

interface ScheduleTableProps {
  schedules: Schedule[];
  onUpdate: (id: string, field: keyof Schedule, value: string) => void;
  onDelete: (id: string) => void;
}

export function ScheduleTable({ schedules, onUpdate, onDelete }: ScheduleTableProps) {
  // Estado do filtro de mês - começa em janeiro
  const [selectedMonth, setSelectedMonth] = useState<string>("jan");

  // Detecta meses disponíveis nos schedules
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    schedules.forEach(s => {
      const month = getMonthFromDate(s.date);
      if (month) monthsSet.add(month);
    });
    return MONTH_NAMES.filter(m => monthsSet.has(m));
  }, [schedules]);

  // Filtra schedules pelo mês selecionado
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const month = getMonthFromDate(s.date);
      return month === selectedMonth;
    });
  }, [schedules, selectedMonth]);

  // Contagem de registros no mês
  const scheduleCount = filteredSchedules.length;

  return (
    <div className="space-y-4">
      {/* Filtro de Mês */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Mês:
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[180px] justify-between">
                  {MONTH_LABELS[selectedMonth] || selectedMonth}
                  <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px] p-2" align="start">
                <div className="space-y-1">
                  {MONTH_NAMES.map((month) => {
                    const hasData = availableMonths.includes(month);
                    return (
                      <div
                        key={month}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                          selectedMonth === month
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedMonth(month)}
                      >
                        <span className="text-sm font-medium">{MONTH_LABELS[month]}</span>
                        {!hasData && (
                          <span className={`text-xs ${selectedMonth === month ? "opacity-80" : "text-muted-foreground"}`}>
                            vazio
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-sm text-muted-foreground">
              ({scheduleCount} registros)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <div className="bg-card rounded-xl border border-border overflow-hidden card-shadow-lg animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-table-header border-b border-table-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  8:00 - 12:00
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  13:00 - 18:00
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                  Dia
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[60px]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-table-border">
              {filteredSchedules.map((schedule, index) => (
                <tr 
                  key={schedule.id} 
                  className="table-cell-hover animate-slide-in"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <td className="px-4 py-1">
                    <EditableCell
                      value={schedule.date}
                      onSave={(value) => onUpdate(schedule.id, "date", value)}
                      placeholder="DD/MMM"
                    />
                  </td>
                  <td className="px-4 py-1">
                    <EditableCell
                      value={schedule.morning_shift || ""}
                      onSave={(value) => onUpdate(schedule.id, "morning_shift", value)}
                      placeholder="Nome"
                    />
                  </td>
                  <td className="px-4 py-1">
                    <EditableCell
                      value={schedule.afternoon_shift || ""}
                      onSave={(value) => onUpdate(schedule.id, "afternoon_shift", value)}
                      placeholder="Nome"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <DayBadge day={schedule.day_of_week} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(schedule.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSchedules.length === 0 && (
          <div className="px-6 py-12 text-center text-muted-foreground">
            <p>Nenhum registro encontrado para {MONTH_LABELS[selectedMonth]}.</p>
            <p className="text-sm mt-1">Clique em "Nova Linha" para adicionar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
