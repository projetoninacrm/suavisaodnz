import { useState, useMemo } from "react";
import { Header } from "@/components/Dashboard/Header";
import { TabNavigation } from "@/components/Dashboard/TabNavigation";
import { ScheduleTable } from "@/components/Dashboard/ScheduleTable";
import { LeadsTable, type LeadsFilters } from "@/components/Dashboard/LeadsTable";

import { DetalhadoAmigoTable } from "@/components/Dashboard/DetalhadoAmigoTable";
import { IndicadoresTable } from "@/components/Dashboard/IndicadoresTable";
import { MetasCalculator } from "@/components/Dashboard/MetasCalculator";
import { NewLeadDialog } from "@/components/Dashboard/NewLeadDialog";
import { PerdasSection } from "@/components/Dashboard/PerdasSection";
import { useSchedules } from "@/hooks/useSchedules";
import { useLeads, type NewLeadData } from "@/hooks/useLeads";
import { useGenericTable } from "@/hooks/useGenericTable";
import { useDetalhadoAmigo } from "@/hooks/useDetalhadoAmigo";
import { useAcompanhamentoDiario } from "@/hooks/useAcompanhamentoDiario";

const TABS = ["Agenda", "Leads", "Perdas", "Indicadores", "Metas", "Detalhado"];

const INDICADORES_COLUMNS = [
  { key: "indicador", label: "Indicador", width: "200px" },
  { key: "valor", label: "Valor", width: "120px" },
  { key: "meta", label: "Meta", width: "120px" },
  { key: "periodo", label: "Período", width: "120px" },
  { key: "obs", label: "Observações" },
];




const Index = () => {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  const [leadsFilters, setLeadsFilters] = useState<LeadsFilters>({
    data_registro: [],
    canal: "",
    nome: "",
    orcamento: "",
    venda: "",
    entrar_em_contato: [],
    medico: "",
    status: "",
    pendente: false,
  });
  
  const schedules = useSchedules("Escala");
  const leads = useLeads();
  const indicadores = useGenericTable("indicadores");
  const detalhadoAmigo = useDetalhadoAmigo();
  const detalhadoDb = useGenericTable("detalhado");
  
  const acompanhamento = useAcompanhamentoDiario();
  const isLoading = 
    activeTab === "Agenda" ? schedules.isLoading :
    activeTab === "Leads" ? leads.isLoading :
    activeTab === "Indicadores" ? indicadores.isLoading :
    activeTab === "Metas" ? false :
    activeTab === "Detalhado" ? detalhadoAmigo.isLoading :
    activeTab === "Perdas" ? leads.isLoading :
    false;

  // Stats for Leads tab - by channel (filtered by date if filter is active)
  const leadsStatsByChannel = useMemo(() => {
    // First filter by date if filter is active
    let baseLeads = leads.leads;
    if (leadsFilters.data_registro.length > 0) {
      baseLeads = leads.leads.filter(l => 
        leadsFilters.data_registro.includes(l.data_registro || "")
      );
    }

    const calcStats = (filteredLeads: typeof leads.leads) => {
      const total = filteredLeads.length;
      const orcamentos = filteredLeads.filter((l) => l.orcamento === "Sim").length;
      const vendas = filteredLeads.filter((l) => l.venda === "Sim").length;
      const conversao = orcamentos > 0 ? Math.round((vendas / orcamentos) * 100) : 0;
      return { leads: total, orcamentos, vendas, conversao };
    };

    const suaVisaoLeads = baseLeads.filter(l => l.canal?.toLowerCase() === "sua visão");
    const lojaLeads = baseLeads.filter(l => l.canal?.toLowerCase() === "loja");
    const internetLeads = baseLeads.filter(l => 
      l.canal?.toLowerCase() === "internet" || 
      l.canal?.toLowerCase() === "google" || 
      l.canal?.toLowerCase() === "facebook"
    );

    return {
      suaVisao: calcStats(suaVisaoLeads),
      loja: calcStats(lojaLeads),
      internet: calcStats(internetLeads),
      todos: calcStats(baseLeads),
    };
  }, [leads.leads, leadsFilters.data_registro]);

  // Cálculo de dias com médico e períodos totais a partir da Agenda
  const { diasComMedico, periodosComMedico } = useMemo(() => {
    let dias = 0;
    let periodos = 0;
    
    schedules.schedules.forEach((schedule) => {
      const temManha = schedule.morning_shift && schedule.morning_shift.trim() !== "";
      const temTarde = schedule.afternoon_shift && schedule.afternoon_shift.trim() !== "";
      
      // Conta períodos (turnos)
      if (temManha) periodos += 1;
      if (temTarde) periodos += 1;
      
      // Conta dias (se tem pelo menos um turno)
      if (temManha || temTarde) dias += 1;
    });
    
    return { diasComMedico: dias, periodosComMedico: periodos };
  }, [schedules.schedules]);


  const handleRefresh = () => {
    switch (activeTab) {
      case "Agenda": schedules.fetchSchedules(); break;
      case "Leads": leads.fetchLeads(); break;
      case "Indicadores": indicadores.fetchRecords(); break;
      case "Metas": schedules.fetchSchedules(); break;
      case "Detalhado": detalhadoAmigo.refresh(); break;
      case "Perdas": leads.fetchLeads(); break;
    }
  };

  const handleAddRow = () => {
    switch (activeTab) {
      case "Agenda": schedules.addSchedule(); break;
      case "Leads": setShowNewLeadDialog(true); break;
      case "Indicadores": indicadores.addRecord(); break;
      case "Metas": break;
      case "Detalhado": break;
      case "Perdas": break;
    }
  };

  const handleNewLeadSubmit = (data: NewLeadData) => {
    leads.addLead(data);
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
            onFiltersChange={setLeadsFilters}
          />
        );
      case "Indicadores":
        return (
          <IndicadoresTable leads={leads.leads} />
        );
      case "Metas":
        return (
          <MetasCalculator 
            diasComMedico={diasComMedico} 
            periodosComMedico={periodosComMedico}
            schedules={schedules.schedules}
            acompanhamentoRegistros={acompanhamento.registros}
            onUpdateAcompanhamento={acompanhamento.upsertRegistro}
          />
        );
      case "Detalhado":
        return (
          <DetalhadoAmigoTable
            attendances={detalhadoAmigo.attendances}
            isLoading={detalhadoAmigo.isLoading}
            dateRange={detalhadoAmigo.dateRange}
            onDateRangeChange={detalhadoAmigo.updateDateRange}
            onRefresh={detalhadoAmigo.refresh}
            dbRecords={detalhadoDb.records}
            onUpdateDb={detalhadoDb.updateRecord}
            onCreateDb={detalhadoDb.createRecord}
            onRefreshDb={detalhadoDb.fetchRecords}
          />
        );
      case "Perdas":
        return (
          <PerdasSection leads={leads.leads} />
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
        {/* Tab Navigation - Always at top */}
        <div className="mb-6">
          <TabNavigation
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Stats for Leads tab - table format by channel */}
        {activeTab === "Leads" && (
          <div className="mb-8 overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Canal</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Leads</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Orçamentos</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Vendas</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Conversão</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors bg-primary/5">
                  <td className="px-4 py-3 font-medium text-primary">Sua Visão</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.suaVisao.leads}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.suaVisao.orcamentos}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.suaVisao.vendas}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.suaVisao.conversao}%</td>
                </tr>
                <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">Loja</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.loja.leads}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.loja.orcamentos}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.loja.vendas}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.loja.conversao}%</td>
                </tr>
                <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">Internet</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.internet.leads}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.internet.orcamentos}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.internet.vendas}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.internet.conversao}%</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors font-semibold bg-muted/20">
                  <td className="px-4 py-3">Todos</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.todos.leads}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.todos.orcamentos}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.todos.vendas}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.todos.conversao}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {renderTable()}
      </main>

      <NewLeadDialog 
        open={showNewLeadDialog} 
        onOpenChange={setShowNewLeadDialog}
        onSubmit={handleNewLeadSubmit}
        existingLeads={leads.leads}
      />
    </div>
  );
};

export default Index;
