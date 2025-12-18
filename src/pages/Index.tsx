import { useState, useMemo } from "react";
import { Calendar, Users, Clock, Sun } from "lucide-react";
import { Header } from "@/components/Dashboard/Header";
import { TabNavigation } from "@/components/Dashboard/TabNavigation";
import { ScheduleTable } from "@/components/Dashboard/ScheduleTable";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { useSchedules } from "@/hooks/useSchedules";

const TABS = ["Escala"];

const Index = () => {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const { 
    schedules, 
    isLoading, 
    fetchSchedules, 
    updateSchedule, 
    addSchedule, 
    deleteSchedule 
  } = useSchedules(activeTab);

  const stats = useMemo(() => {
    const uniqueEmployees = new Set<string>();
    let morningShifts = 0;
    let afternoonShifts = 0;

    schedules.forEach((s) => {
      if (s.morning_shift) {
        uniqueEmployees.add(s.morning_shift);
        morningShifts++;
      }
      if (s.afternoon_shift) {
        uniqueEmployees.add(s.afternoon_shift);
        afternoonShifts++;
      }
    });

    return {
      totalDays: schedules.length,
      employees: uniqueEmployees.size,
      morningShifts,
      afternoonShifts,
    };
  }, [schedules]);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onRefresh={fetchSchedules} 
        onAddRow={addSchedule}
        isLoading={isLoading} 
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total de Dias"
            value={stats.totalDays}
            icon={Calendar}
            color="primary"
          />
          <StatsCard
            title="Funcionários"
            value={stats.employees}
            icon={Users}
            color="accent"
          />
          <StatsCard
            title="Turnos Manhã"
            value={stats.morningShifts}
            icon={Sun}
            color="chart-4"
          />
          <StatsCard
            title="Turnos Tarde"
            value={stats.afternoonShifts}
            icon={Clock}
            color="chart-5"
          />
        </div>

        <div className="mb-6">
          <TabNavigation
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        <ScheduleTable
          schedules={schedules}
          onUpdate={updateSchedule}
          onDelete={deleteSchedule}
        />
      </main>
    </div>
  );
};

export default Index;
