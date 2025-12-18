import { useState, useMemo } from "react";
import { DollarSign, ShoppingCart, Receipt } from "lucide-react";
import { Header } from "@/components/Dashboard/Header";
import { TabNavigation } from "@/components/Dashboard/TabNavigation";
import { ScheduleTable } from "@/components/Dashboard/ScheduleTable";
import { LeadsTable } from "@/components/Dashboard/LeadsTable";
import { GenericTable } from "@/components/Dashboard/GenericTable";
import { NewLeadDialog } from "@/components/Dashboard/NewLeadDialog";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { useSchedules } from "@/hooks/useSchedules";
import { useLeads, type NewLeadData } from "@/hooks/useLeads";
import { useGenericTable } from "@/hooks/useGenericTable";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, parse, isWithinInterval, isToday, isValid } from "date-fns";

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
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  
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

  // Stats for Leads tab - by channel
  const leadsStatsByChannel = useMemo(() => {
    const calcStats = (filteredLeads: typeof leads.leads) => {
      const total = filteredLeads.length;
      const orcamentos = filteredLeads.filter((l) => l.orcamento === "Sim").length;
      const vendas = filteredLeads.filter((l) => l.venda === "Sim").length;
      const conversao = orcamentos > 0 ? Math.round((vendas / orcamentos) * 100) : 0;
      return { leads: total, orcamentos, vendas, conversao };
    };

    const lojaLeads = leads.leads.filter(l => l.canal?.toLowerCase() === "loja");
    const internetLeads = leads.leads.filter(l => 
      l.canal?.toLowerCase() === "internet" || 
      l.canal?.toLowerCase() === "google" || 
      l.canal?.toLowerCase() === "facebook"
    );

    return {
      loja: calcStats(lojaLeads),
      internet: calcStats(internetLeads),
      todos: calcStats(leads.leads),
    };
  }, [leads.leads]);

  // Stats for Metas tab - Vendas e Faturamento por período
  const metasStats = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const parseDateStr = (dateStr: string | null): Date | null => {
      if (!dateStr) return null;
      const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
      return isValid(parsed) ? parsed : null;
    };

    // Filter vendas (sales) by period
    const vendasHoje = leads.leads.filter(l => {
      if (l.venda !== "Sim") return false;
      const date = parseDateStr(l.data_registro);
      return date && isToday(date);
    }).length;

    const vendasSemana = leads.leads.filter(l => {
      if (l.venda !== "Sim") return false;
      const date = parseDateStr(l.data_registro);
      return date && isWithinInterval(date, { start: weekStart, end: weekEnd });
    }).length;

    const vendasMes = leads.leads.filter(l => {
      if (l.venda !== "Sim") return false;
      const date = parseDateStr(l.data_registro);
      return date && isWithinInterval(date, { start: monthStart, end: monthEnd });
    }).length;

    // Calculate faturamento from detalhado table (assuming it has valor column)
    const calcFaturamento = (records: any[], start: Date, end: Date, checkToday = false) => {
      return records.reduce((sum, r) => {
        const date = parseDateStr(r.data);
        if (!date) return sum;
        const inPeriod = checkToday ? isToday(date) : isWithinInterval(date, { start, end });
        if (!inPeriod) return sum;
        const valor = parseFloat(String(r.valor || "0").replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
        return sum + valor;
      }, 0);
    };

    const faturamentoHoje = calcFaturamento(detalhado.records, today, today, true);
    const faturamentoSemana = calcFaturamento(detalhado.records, weekStart, weekEnd);
    const faturamentoMes = calcFaturamento(detalhado.records, monthStart, monthEnd);

    // Ticket médio
    const ticketMedio = vendasMes > 0 ? faturamentoMes / vendasMes : 0;

    return {
      vendasHoje,
      vendasSemana,
      vendasMes,
      faturamentoHoje,
      faturamentoSemana,
      faturamentoMes,
      ticketMedio
    };
  }, [leads.leads, detalhado.records]);

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
      case "Leads": setShowNewLeadDialog(true); break;
      case "Indicadores": indicadores.addRecord(); break;
      case "Metas": metas.addRecord(); break;
      case "Detalhado": detalhado.addRecord(); break;
      case "MKT": mkt.addRecord(); break;
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
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.todos.leads}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.todos.orcamentos}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.todos.vendas}</td>
                  <td className="px-4 py-3 text-center">{leadsStatsByChannel.todos.conversao}%</td>
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

        {/* Stats for Metas tab */}
        {activeTab === "Metas" && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <StatsCard
              title="Vendas Hoje"
              value={metasStats.vendasHoje}
              icon={ShoppingCart}
              color="primary"
            />
            <StatsCard
              title="Vendas Semana"
              value={metasStats.vendasSemana}
              icon={ShoppingCart}
              color="chart-4"
            />
            <StatsCard
              title="Vendas Mês"
              value={metasStats.vendasMes}
              icon={ShoppingCart}
              color="accent"
            />
            <StatsCard
              title="Fat. Hoje"
              value={`R$ ${metasStats.faturamentoHoje.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
              icon={DollarSign}
              color="chart-3"
            />
            <StatsCard
              title="Fat. Semana"
              value={`R$ ${metasStats.faturamentoSemana.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
              icon={DollarSign}
              color="chart-4"
            />
            <StatsCard
              title="Fat. Mês"
              value={`R$ ${metasStats.faturamentoMes.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
              icon={DollarSign}
              color="chart-5"
            />
            <StatsCard
              title="Ticket Médio"
              value={`R$ ${metasStats.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
              icon={Receipt}
              color="accent"
            />
          </div>
        )}

        <div className="mb-6">
          <TabNavigation
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {renderTable()}
      </main>

      <NewLeadDialog 
        open={showNewLeadDialog} 
        onOpenChange={setShowNewLeadDialog}
        onSubmit={handleNewLeadSubmit}
      />
    </div>
  );
};

export default Index;
