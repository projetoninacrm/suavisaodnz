import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Header } from "@/components/Dashboard/Header";
import { TabNavigation } from "@/components/Dashboard/TabNavigation";
import { ScheduleTable } from "@/components/Dashboard/ScheduleTable";
import { LeadsTable, type LeadsFilters } from "@/components/Dashboard/LeadsTable";

import { DetalhadoAmigoTable } from "@/components/Dashboard/DetalhadoAmigoTable";
import { IndicadoresTable } from "@/components/Dashboard/IndicadoresTable";
import { MetasCalculator } from "@/components/Dashboard/MetasCalculator";
import { NewLeadDialog } from "@/components/Dashboard/NewLeadDialog";
import { PerdasSection } from "@/components/Dashboard/PerdasSection";
import { AnunciosTable } from "@/components/Dashboard/AnunciosTable";
import { AutomacoesTable } from "@/components/Dashboard/AutomacoesTable";
import { LeadGenderKanban } from "@/components/Dashboard/LeadGenderKanban";
import { TaxaRetornoSection } from "@/components/Dashboard/TaxaRetornoSection";
import { useSchedules } from "@/hooks/useSchedules";
import { useLeads, type NewLeadData } from "@/hooks/useLeads";
import { useGenericTable } from "@/hooks/useGenericTable";
import { useDetalhadoAmigo } from "@/hooks/useDetalhadoAmigo";
import { useAcompanhamentoDiario } from "@/hooks/useAcompanhamentoDiario";
import { useLeadsGenderStats, applyLeadFilters } from "@/hooks/useLeadsGenderStats";

const TABS_DNZ = ["Agenda", "Leads", "Perdas", "Detalhado", "Indicadores", "Metas", "Anúncios DNZ", "Anúncios SV", "Automações", "Taxa de Retorno SV"];

const INDICADORES_COLUMNS = [
  { key: "indicador", label: "Indicador", width: "200px" },
  { key: "valor", label: "Valor", width: "120px" },
  { key: "meta", label: "Meta", width: "120px" },
  { key: "periodo", label: "Período", width: "120px" },
  { key: "obs", label: "Observações" },
];




const Index = () => {
  const TABS = TABS_DNZ;
  const [activeTab, setActiveTab] = useState(TABS_DNZ[0]);
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
    vendedor: "",
    pendente: false,
  });
  
  const schedules = useSchedules("Escala");
  const leads = useLeads();
  const indicadores = useGenericTable("indicadores");
  const detalhadoAmigo = useDetalhadoAmigo();
  const detalhadoDb = useGenericTable("detalhado");
  
  const acompanhamento = useAcompanhamentoDiario();
  const leadGenderStats = useLeadsGenderStats(leads.leads, leadsFilters, activeTab === "Leads");

  const isLoading = 
    activeTab === "Agenda" ? schedules.isLoading :
    activeTab === "Leads" ? leads.isLoading :
    activeTab === "Indicadores" ? indicadores.isLoading :
    activeTab === "Metas" ? false :
    activeTab === "Detalhado" ? detalhadoAmigo.isLoading :
    activeTab === "Perdas" ? leads.isLoading :
    activeTab === "Anúncios DNZ" ? false :
    activeTab === "Anúncios SV" ? false :
    activeTab === "Automações" ? false :
    activeTab === "Taxa de Retorno SV" ? false :
    false;

  // Stats for Leads tab - by channel (filtered by date and vendedor if filters are active)
  const leadsStatsByChannel = useMemo(() => {
    // Apply ALL active table filters so the summary matches exactly what is shown
    const baseLeads = applyLeadFilters(leads.leads, leadsFilters);

    const calcStats = (filteredLeads: typeof leads.leads) => {
      const total = filteredLeads.length;
      const orcamentos = filteredLeads.filter((l) => l.orcamento === "Sim").length;
      const vendas = filteredLeads.filter((l) => l.venda === "Sim").length;
      const conversao = orcamentos > 0 ? Math.round((vendas / orcamentos) * 100) : 0;
      const valor = filteredLeads.reduce((sum, l) => {
        const raw = (l.valor || "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
        const n = parseFloat(raw);
        return sum + (isNaN(n) ? 0 : n);
      }, 0);
      return { leads: total, orcamentos, vendas, conversao, valor };
    };

    const suaVisaoLeads = baseLeads.filter(l => classifyCanal(l.canal) === "Sua Visão");
    const lojaLeads = baseLeads.filter(l => classifyCanal(l.canal) === "Loja");
    const duBeneficiosLeads = baseLeads.filter(l => classifyCanal(l.canal) === "Du Benefícios");
    const internetLeads = baseLeads.filter(l => classifyCanal(l.canal) === "Internet");
    const semCanalLeads = baseLeads.filter(l => classifyCanal(l.canal) === "Sem Canal");

    return {
      suaVisao: calcStats(suaVisaoLeads),
      loja: calcStats(lojaLeads),
      internet: calcStats(internetLeads),
      duBeneficios: calcStats(duBeneficiosLeads),
      semCanal: calcStats(semCanalLeads),
      todos: calcStats(baseLeads),
    };
  }, [leads.leads, leadsFilters]);

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
      case "Anúncios DNZ": break;
      case "Anúncios SV": break;
      case "Automações": break;
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
      case "Anúncios DNZ": break;
      case "Anúncios SV": break;
      case "Automações": break;
    }
  };

  const handleNewLeadSubmit = (data: NewLeadData) => {
    leads.addLead(data);
  };

  const handleDetailedLeadSubmit = async ({ nome, numero }: { nome: string; numero: string }) => {
    await leads.addLead({
      data_registro: format(new Date(), "dd/MM/yyyy"),
      canal: "",
      nome,
      numero,
      orcamento: "Não",
      venda: "Não",
      entrar_em_contato: "",
      medico: "",
      obs: "",
    });
  };

  const renderTable = () => {
    switch (activeTab) {
      case "Agenda":
        return (
          <ScheduleTable
            schedules={schedules.schedules}
            onUpdate={schedules.updateSchedule}
            onDelete={schedules.deleteSchedule}
            onRefresh={schedules.fetchSchedules}
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
            onDeleteDb={detalhadoDb.deleteRecord}
            onRefreshDb={detalhadoDb.fetchRecords}
            onAddToLeads={handleDetailedLeadSubmit}
          />
        );
      case "Perdas":
        return (
          <PerdasSection leads={leads.leads} />
        );
      case "Anúncios DNZ":
        return <AnunciosTable tipo="DNZ" />;
      case "Anúncios SV":
        return <AnunciosTable tipo="SV" />;
      case "Automações":
        return <AutomacoesTable leads={leads.leads} />;
      case "Taxa de Retorno SV":
        return <TaxaRetornoSection />;
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
          <div className="mb-8 space-y-4">
            <LeadGenderKanban
              maleCount={leadGenderStats.stats.male}
              femaleCount={leadGenderStats.stats.female}
              unknownCount={leadGenderStats.stats.unknown}
              isLoading={leadGenderStats.isLoading}
            />

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Canal</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Leads</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Orçamentos</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Vendas</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Conversão</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors bg-primary/5">
                    <td className="px-4 py-3 font-medium text-primary">Sua Visão</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.suaVisao.leads}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.suaVisao.orcamentos}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.suaVisao.vendas}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.suaVisao.conversao}%</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.suaVisao.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  </tr>
                  <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">Loja</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.loja.leads}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.loja.orcamentos}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.loja.vendas}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.loja.conversao}%</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.loja.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  </tr>
                  <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">Internet</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.internet.leads}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.internet.orcamentos}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.internet.vendas}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.internet.conversao}%</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.internet.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  </tr>
                  <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">Du Benefícios</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.duBeneficios.leads}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.duBeneficios.orcamentos}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.duBeneficios.vendas}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.duBeneficios.conversao}%</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.duBeneficios.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  </tr>
                  {leadsStatsByChannel.semCanal.leads > 0 && (
                    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">Sem Canal</td>
                      <td className="px-4 py-3 text-center">{leadsStatsByChannel.semCanal.leads}</td>
                      <td className="px-4 py-3 text-center">{leadsStatsByChannel.semCanal.orcamentos}</td>
                      <td className="px-4 py-3 text-center">{leadsStatsByChannel.semCanal.vendas}</td>
                      <td className="px-4 py-3 text-center">{leadsStatsByChannel.semCanal.conversao}%</td>
                      <td className="px-4 py-3 text-center">{leadsStatsByChannel.semCanal.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    </tr>
                  )}
                  <tr className="hover:bg-muted/30 transition-colors font-semibold bg-muted/20">
                    <td className="px-4 py-3">Todos</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.todos.leads}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.todos.orcamentos}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.todos.vendas}</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.todos.conversao}%</td>
                    <td className="px-4 py-3 text-center">{leadsStatsByChannel.todos.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
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
