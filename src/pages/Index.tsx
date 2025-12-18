import { useState, useMemo } from "react";
import { Calendar, Users, Clock, Sun, Target, TrendingUp, Megaphone, FileText } from "lucide-react";
import { Header } from "@/components/Dashboard/Header";
import { TabNavigation } from "@/components/Dashboard/TabNavigation";
import { ScheduleTable } from "@/components/Dashboard/ScheduleTable";
import { LeadsTable } from "@/components/Dashboard/LeadsTable";
import { GenericTable } from "@/components/Dashboard/GenericTable";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { useSchedules } from "@/hooks/useSchedules";
import { useLeads } from "@/hooks/useLeads";
import { useGenericTable } from "@/hooks/useGenericTable";

const TABS = ["Agenda", "Leads", "Indicadores", "Metas", "Detalhado", "MKT"];

const INDICADORES_COLUMNS = [
  { key: "indicador", label: "Indicador", width: "200px" },
  { key: "valor", label: "Valor", width: "120px" },
  { key: "meta", label: "Meta", width: "120px" },
  { key: "periodo", label: "Período", width: "120px" },
  { key: "obs", label: "Observações" },
];

const METAS_COLUMNS = [
  { key: "descricao", label: "Descrição", width: "250px" },
  { key: "valor_meta", label: "Meta", width: "120px" },
  { key: "valor_atual", label: "Atual", width: "120px" },
  { key: "percentual", label: "%", width: "80px" },
  { key: "status", label: "Status", width: "100px" },
  { key: "obs", label: "Observações" },
];

const DETALHADO_COLUMNS = [
  { key: "data", label: "Data", width: "100px" },
  { key: "descricao", label: "Descrição", width: "250px" },
  { key: "valor", label: "Valor", width: "120px" },
  { key: "categoria", label: "Categoria", width: "120px" },
  { key: "responsavel", label: "Responsável", width: "120px" },
  { key: "obs", label: "Observações" },
];

const MKT_COLUMNS = [
  { key: "campanha", label: "Campanha", width: "200px" },
  { key: "canal", label: "Canal", width: "120px" },
  { key: "investimento", label: "Investimento", width: "120px" },
  { key: "retorno", label: "Retorno", width: "120px" },
  { key: "leads_gerados", label: "Leads", width: "80px" },
  { key: "conversoes", label: "Conversões", width: "100px" },
  { key: "obs", label: "Observações" },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  
  const schedules = useSchedules("Escala");
  const leads = useLeads();
  const indicadores = useGenericTable("indicadores");
  const metas = useGenericTable("metas");
  const detalhado = useGenericTable("detalhado");
  const mkt = useGenericTable("mkt");

  const isLoading = 
    activeTab === "Agenda" ? schedules.isLoading :
    activeTab === "Leads" ? leads.isLoading :
    activeTab === "Indicadores" ? indicadores.isLoading :
    activeTab === "Metas" ? metas.isLoading :
    activeTab === "Detalhado" ? detalhado.isLoading :
    mkt.isLoading;

  const stats = useMemo(() => {
    const uniqueDoctors = new Set<string>();
    let morningShifts = 0;
    let afternoonShifts = 0;

    schedules.schedules.forEach((s) => {
      if (s.morning_shift) {
        uniqueDoctors.add(s.morning_shift);
        morningShifts++;
      }
      if (s.afternoon_shift) {
        uniqueDoctors.add(s.afternoon_shift);
        afternoonShifts++;
      }
    });

    const totalLeads = leads.leads.length;
    const vendas = leads.leads.filter((l) => l.venda === "Sim").length;

    return {
      totalDays: schedules.schedules.length,
      doctors: uniqueDoctors.size,
      morningShifts,
      afternoonShifts,
      totalLeads,
      vendas,
    };
  }, [schedules.schedules, leads.leads]);

  const handleRefresh = () => {
    switch (activeTab) {
      case "Agenda": schedules.fetchSchedules(); break;
      case "Leads": leads.fetchLeads(); break;
      case "Indicadores": indicadores.fetchRecords(); break;
      case "Metas": metas.fetchRecords(); break;
      case "Detalhado": detalhado.fetchRecords(); break;
      case "MKT": mkt.fetchRecords(); break;
    }
  };

  const handleAddRow = () => {
    switch (activeTab) {
      case "Agenda": schedules.addSchedule(); break;
      case "Leads": leads.addLead(); break;
      case "Indicadores": indicadores.addRecord(); break;
      case "Metas": metas.addRecord(); break;
      case "Detalhado": detalhado.addRecord(); break;
      case "MKT": mkt.addRecord(); break;
    }
  };

  const renderTable = () => {
    switch (activeTab) {
      case "Agenda":
        return (
          <ScheduleTable
            schedules={schedules.schedules}
            onUpdate={schedules.updateSchedule}
            onDelete={schedules.deleteSchedule}
          />
        );
      case "Leads":
        return (
          <LeadsTable
            leads={leads.leads}
            onUpdate={leads.updateLead}
            onDelete={leads.deleteLead}
          />
        );
      case "Indicadores":
        return (
          <GenericTable
            records={indicadores.records}
            columns={INDICADORES_COLUMNS}
            onUpdate={indicadores.updateRecord}
            onDelete={indicadores.deleteRecord}
            emptyMessage="Nenhum indicador cadastrado."
          />
        );
      case "Metas":
        return (
          <GenericTable
            records={metas.records}
            columns={METAS_COLUMNS}
            onUpdate={metas.updateRecord}
            onDelete={metas.deleteRecord}
            emptyMessage="Nenhuma meta cadastrada."
          />
        );
      case "Detalhado":
        return (
          <GenericTable
            records={detalhado.records}
            columns={DETALHADO_COLUMNS}
            onUpdate={detalhado.updateRecord}
            onDelete={detalhado.deleteRecord}
            emptyMessage="Nenhum registro detalhado."
          />
        );
      case "MKT":
        return (
          <GenericTable
            records={mkt.records}
            columns={MKT_COLUMNS}
            onUpdate={mkt.updateRecord}
            onDelete={mkt.deleteRecord}
            emptyMessage="Nenhuma campanha cadastrada."
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onRefresh={handleRefresh} 
        onAddRow={handleAddRow}
        isLoading={isLoading} 
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatsCard
            title="Dias na Agenda"
            value={stats.totalDays}
            icon={Calendar}
            color="primary"
          />
          <StatsCard
            title="Médicos"
            value={stats.doctors}
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
          <StatsCard
            title="Total Leads"
            value={stats.totalLeads}
            icon={TrendingUp}
            color="chart-3"
          />
          <StatsCard
            title="Vendas"
            value={stats.vendas}
            icon={Target}
            color="accent"
          />
        </div>

        <div className="mb-6">
          <TabNavigation
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {renderTable()}
      </main>
    </div>
  );
};

export default Index;
