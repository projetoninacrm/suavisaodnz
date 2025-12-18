import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableCell } from "./EditableCell";
import { DayBadge } from "./DayBadge";
import type { Schedule } from "@/hooks/useSchedules";

interface ScheduleTableProps {
  schedules: Schedule[];
  onUpdate: (id: string, field: keyof Schedule, value: string) => void;
  onDelete: (id: string) => void;
}

export function ScheduleTable({ schedules, onUpdate, onDelete }: ScheduleTableProps) {
  return (
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
            {schedules.map((schedule, index) => (
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
      {schedules.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground">
          <p>Nenhum registro encontrado.</p>
          <p className="text-sm mt-1">Clique em "Nova Linha" para adicionar.</p>
        </div>
      )}
    </div>
  );
}
