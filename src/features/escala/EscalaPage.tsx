import { PageHeader } from "@/components/app/PageHeader";
import { DataState } from "@/components/data/DataState";
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
      {schedules.isLoading && schedules.schedules.length === 0 ? (
        <DataState variant="loading" title="Carregando escala" description="Buscando os dias e turnos cadastrados." />
      ) : schedules.error && schedules.schedules.length === 0 ? (
        <DataState
          variant="error"
          title="Escala indisponível"
          description={schedules.error}
          action={{ label: "Tentar novamente", onClick: () => void schedules.fetchSchedules() }}
        />
      ) : (
        <>
          {schedules.error && (
            <DataState
              variant="error"
              title="Escala não atualizada"
              description={schedules.error}
              action={{ label: "Tentar novamente", onClick: () => void schedules.fetchSchedules() }}
            />
          )}
          <ScheduleTable
            schedules={schedules.schedules}
            isRefreshing={schedules.isLoading}
            onUpdate={schedules.updateSchedule}
            onUpdateProfessional={schedules.updateScheduleProfessional}
            onDelete={schedules.deleteSchedule}
            onRefresh={schedules.fetchSchedules}
          />
        </>
      )}
    </section>
  );
}
