import { PageHeader } from "@/components/app/PageHeader";
import { ScheduleTable } from "@/components/Dashboard/ScheduleTable";
import { useSchedules } from "@/hooks/useSchedules";

export default function EscalaPage() {
  const schedules = useSchedules("Escala");

  return (
    <section className="space-y-5">
      <PageHeader
        title="Escala"
        description="Organize os profissionais por dia e turno. Selecione pessoas cadastradas para manter os vínculos consistentes."
      />
      {schedules.isLoading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground" role="status">
          Carregando escala…
        </div>
      ) : (
        <ScheduleTable
          schedules={schedules.schedules}
          onUpdate={schedules.updateSchedule}
          onUpdateProfessional={schedules.updateScheduleProfessional}
          onDelete={schedules.deleteSchedule}
          onRefresh={schedules.fetchSchedules}
        />
      )}
    </section>
  );
}
