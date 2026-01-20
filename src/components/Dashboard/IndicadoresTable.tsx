import { useMemo, useState, useEffect } from "react";
import { format, getDaysInMonth, getDay, getWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Lead } from "@/hooks/useLeads";
import { useIndicadoresData, DayMetrics } from "@/hooks/useIndicadoresData";
import { Loader2, Calendar, TrendingUp, BarChart3, X, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface SimulatorValues {
  vendas: number;
  ticketMedio: number;
  potencial: number;
  taxaPresenca: number;
  conversao: number;
}

interface IndicadoresTableProps {
  leads: Lead[];
}

const MONTHS = [
  { value: 1, label: "Janeiro", short: "Jan" },
  { value: 2, label: "Fevereiro", short: "Fev" },
  { value: 3, label: "Março", short: "Mar" },
  { value: 4, label: "Abril", short: "Abr" },
  { value: 5, label: "Maio", short: "Mai" },
  { value: 6, label: "Junho", short: "Jun" },
  { value: 7, label: "Julho", short: "Jul" },
  { value: 8, label: "Agosto", short: "Ago" },
  { value: 9, label: "Setembro", short: "Set" },
  { value: 10, label: "Outubro", short: "Out" },
  { value: 11, label: "Novembro", short: "Nov" },
  { value: 12, label: "Dezembro", short: "Dez" },
];

const YEARS = [
  { value: "2025", label: "2025" },
  { value: "2026", label: "2026" },
];

const SUA_VISAO_METRICS = [
  { key: "atendimentos", label: "Atendimentos" },
  { key: "receitas", label: "Receitas" },
  { key: "potencial", label: "Potencial (%)" },
  { key: "visitou_dnz", label: "Visitou DNZ" },
  { key: "taxa_presenca", label: "Taxa de Presença (%)" },
  { key: "vendas", label: "Vendas" },
  { key: "conversao", label: "Conversão (%)" },
  { key: "faturamento", label: "Faturamento (R$)" },
  { key: "ticket", label: "Ticket Médio (R$)" },
];

const DAY_NAMES: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

const DAY_FULL_NAMES: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

export function IndicadoresTable({ leads }: IndicadoresTableProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [selectedMonths, setSelectedMonths] = useState<number[]>([currentMonth]);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const { isLoading, getMetricsForDay } = 
    useIndicadoresData(leads, selectedMonths, parseInt(selectedYear));

  // Estado do simulador - inicializa com valores consolidados
  const [simulator, setSimulator] = useState<SimulatorValues>({
    vendas: 0,
    ticketMedio: 0,
    potencial: 0,
    taxaPresenca: 0,
    conversao: 0,
  });

  // Toggle month selection
  const toggleMonth = (month: number) => {
    setSelectedMonths(prev => {
      if (prev.includes(month)) {
        // Don't allow deselecting if it's the only month
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== month);
      }
      return [...prev, month].sort((a, b) => a - b);
    });
  };

  // Clear all and select one
  const selectOnlyMonth = (month: number) => {
    setSelectedMonths([month]);
  };

  // Gerar dias para todos os meses selecionados (excluindo domingos)
  const daysOfPeriod = useMemo(() => {
    const year = parseInt(selectedYear);
    const days: { day: number; month: number; formattedDate: string; dayOfWeek: number; weekNumber: number }[] = [];

    selectedMonths.forEach(month => {
      const daysInMonth = getDaysInMonth(new Date(year, month - 1));
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = getDay(date);
        
        // Excluir domingos (0 = domingo)
        if (dayOfWeek !== 0) {
          const monthAbbrev = format(date, "MMM", { locale: ptBR });
          const weekNumber = getWeek(date, { weekStartsOn: 1 });
          days.push({
            day,
            month,
            formattedDate: `${String(day).padStart(2, "0")}/${monthAbbrev}`,
            dayOfWeek,
            weekNumber,
          });
        }
      }
    });

    return days;
  }, [selectedMonths, selectedYear]);

  // Formatar valores para exibição
  const formatValue = (value: number, type: string): string => {
    if (type.includes("%")) {
      return value === 0 ? "0,00%" : `${value.toFixed(2).replace(".", ",")}%`;
    }
    if (type.includes("R$") || type === "ticket" || type === "faturamento") {
      if (value === 0) return "";
      return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    }
    return value === 0 ? "" : String(value);
  };

  // Gerar valores para cada métrica e dia
  const periodData = useMemo(() => {
    return daysOfPeriod.map(day => ({
      ...getMetricsForDay(day.day, day.month),
      dayOfWeek: day.dayOfWeek,
      weekNumber: day.weekNumber,
      month: day.month,
    }));
  }, [daysOfPeriod, getMetricsForDay]);

  // Calcular dados consolidados do período
  const consolidatedData = useMemo(() => {
    const totals = {
      atendimentos: 0,
      receitas: 0,
      visitou_dnz: 0,
      vendas: 0,
      faturamento: 0,
    };

    periodData.forEach(data => {
      totals.atendimentos += data.atendimentos;
      totals.receitas += data.receitas;
      totals.visitou_dnz += data.visitou_dnz;
      totals.vendas += data.vendas;
      totals.faturamento += data.faturamento;
    });

    // Calcular percentuais baseados nos totais
    const potencial = totals.atendimentos > 0 ? (totals.receitas / totals.atendimentos) * 100 : 0;
    const taxa_presenca = totals.receitas > 0 ? (totals.visitou_dnz / totals.receitas) * 100 : 0;
    const conversao = totals.visitou_dnz > 0 ? (totals.vendas / totals.visitou_dnz) * 100 : 0;
    const ticket = totals.vendas > 0 ? totals.faturamento / totals.vendas : 0;

    return {
      ...totals,
      potencial,
      taxa_presenca,
      conversao,
      ticket,
    };
  }, [periodData]);

  // Inicializar simulador com valores consolidados quando os dados carregarem
  useEffect(() => {
    if (consolidatedData.vendas > 0 || consolidatedData.potencial > 0) {
      setSimulator({
        vendas: consolidatedData.vendas,
        ticketMedio: consolidatedData.ticket,
        potencial: consolidatedData.potencial,
        taxaPresenca: consolidatedData.taxa_presenca,
        conversao: consolidatedData.conversao,
      });
    }
  }, [consolidatedData]);

  // Cálculos reversos do simulador
  const simulatorResults = useMemo(() => {
    const { vendas, ticketMedio, potencial, taxaPresenca, conversao } = simulator;
    
    // Faturamento = Vendas × Ticket Médio
    const faturamento = vendas * ticketMedio;
    
    // Visitou DNZ = Vendas / (Conversão/100)
    const visitouDnz = conversao > 0 ? vendas / (conversao / 100) : 0;
    
    // Receitas = Visitou DNZ / (Taxa de Presença/100)
    const receitas = taxaPresenca > 0 ? visitouDnz / (taxaPresenca / 100) : 0;
    
    // Atendimentos = Receitas / (Potencial/100)
    const atendimentos = potencial > 0 ? receitas / (potencial / 100) : 0;
    
    return {
      faturamento,
      visitouDnz: Math.round(visitouDnz),
      receitas: Math.round(receitas),
      atendimentos: Math.round(atendimentos),
    };
  }, [simulator]);

  // Calcular faturamento por semana
  const weeklyRevenue = useMemo(() => {
    const weekMap = new Map<string, { total: number; weekLabel: string }>();
    
    daysOfPeriod.forEach((day, idx) => {
      const faturamento = periodData[idx]?.faturamento || 0;
      const weekKey = `${day.month}-${day.weekNumber}`;
      const monthShort = MONTHS.find(m => m.value === day.month)?.short || "";
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { 
          total: 0, 
          weekLabel: selectedMonths.length > 1 
            ? `Sem ${day.weekNumber} (${monthShort})` 
            : `Semana ${day.weekNumber}` 
        });
      }
      weekMap.get(weekKey)!.total += faturamento;
    });

    return Array.from(weekMap.entries())
      .map(([key, data]) => ({
        weekKey: key,
        total: data.total,
        label: data.weekLabel,
      }))
      .sort((a, b) => b.total - a.total);
  }, [daysOfPeriod, periodData, selectedMonths.length]);

  // Calcular média de faturamento por dia da semana
  const dailyAverageRevenue = useMemo(() => {
    const dayMap = new Map<number, { total: number; count: number }>();
    
    periodData.forEach((data) => {
      const dayOfWeek = data.dayOfWeek;
      const faturamento = data.faturamento || 0;
      
      if (!dayMap.has(dayOfWeek)) {
        dayMap.set(dayOfWeek, { total: 0, count: 0 });
      }
      const entry = dayMap.get(dayOfWeek)!;
      entry.total += faturamento;
      if (faturamento > 0) entry.count += 1;
    });

    return Array.from(dayMap.entries())
      .map(([dayOfWeek, data]) => ({
        dayOfWeek,
        dayName: DAY_FULL_NAMES[dayOfWeek],
        average: data.count > 0 ? data.total / data.count : 0,
        total: data.total,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 3);
  }, [periodData]);

  // Formatar moeda
  const formatCurrency = (value: number): string => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k`;
    }
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
  };

  // Formatar moeda completa
  const formatCurrencyFull = (value: number): string => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  // Get period label for display
  const getPeriodLabel = () => {
    if (selectedMonths.length === 1) {
      return MONTHS.find(m => m.value === selectedMonths[0])?.label || "";
    }
    const sortedMonths = [...selectedMonths].sort((a, b) => a - b);
    const firstMonth = MONTHS.find(m => m.value === sortedMonths[0])?.short;
    const lastMonth = MONTHS.find(m => m.value === sortedMonths[sortedMonths.length - 1])?.short;
    return `${firstMonth} - ${lastMonth}`;
  };

  return (
    <div className="space-y-4">
      {/* Filtro de Meses e Ano */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Filtrar por:</span>
        
        {/* Multi-select de meses */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[180px] justify-between">
              <span>{getPeriodLabel()}</span>
              {selectedMonths.length > 1 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedMonths.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Selecionar meses</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedMonths([currentMonth])}
                >
                  Limpar
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((month) => (
                  <div
                    key={month.value}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted transition-colors ${
                      selectedMonths.includes(month.value) ? "bg-primary/10" : ""
                    }`}
                    onClick={() => toggleMonth(month.value)}
                  >
                    <Checkbox
                      checked={selectedMonths.includes(month.value)}
                      onCheckedChange={() => toggleMonth(month.value)}
                    />
                    <span className="text-sm">{month.short}</span>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Selected months badges */}
        {selectedMonths.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {selectedMonths.map(month => (
              <Badge 
                key={month} 
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/20"
                onClick={() => toggleMonth(month)}
              >
                {MONTHS.find(m => m.value === month)?.short}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        )}

        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[100px] bg-background">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {YEARS.map((year) => (
              <SelectItem key={year.value} value={year.value}>
                {year.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Carregando dados da API...</span>
          </div>
        )}
      </div>

      {/* Kanbans de Indicadores - Grid 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Dados Consolidados do Período */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Consolidado do Período
              <Badge variant="outline" className="ml-auto text-xs">
                {getPeriodLabel()} {selectedYear}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Atendimentos</span>
                <span className="font-bold">{consolidatedData.atendimentos}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Receitas</span>
                <span className="font-bold">{consolidatedData.receitas}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Potencial</span>
                <span className="font-bold">{consolidatedData.potencial.toFixed(2).replace(".", ",")}%</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Visitou DNZ</span>
                <span className="font-bold">{consolidatedData.visitou_dnz}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Taxa de Presença</span>
                <span className="font-bold">{consolidatedData.taxa_presenca.toFixed(2).replace(".", ",")}%</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Vendas</span>
                <span className="font-bold">{consolidatedData.vendas}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Conversão</span>
                <span className="font-bold">{consolidatedData.conversao.toFixed(2).replace(".", ",")}%</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-primary/10 border border-primary/20">
                <span className="text-muted-foreground">Faturamento</span>
                <span className="font-bold text-primary">{formatCurrencyFull(consolidatedData.faturamento)}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Ticket Médio</span>
                <span className="font-bold">{formatCurrencyFull(consolidatedData.ticket)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Simulador de Metas */}
        <Card className="bg-card border-border border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              Simulador de Metas
              <Badge variant="default" className="ml-auto text-xs">
                Editável
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {/* Campos editáveis */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Vendas (meta)</label>
                  <Input
                    type="number"
                    value={simulator.vendas || ""}
                    onChange={(e) => setSimulator(prev => ({ ...prev, vendas: Number(e.target.value) || 0 }))}
                    className="h-8 text-right font-bold"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Ticket Médio (R$)</label>
                  <Input
                    type="number"
                    value={simulator.ticketMedio || ""}
                    onChange={(e) => setSimulator(prev => ({ ...prev, ticketMedio: Number(e.target.value) || 0 }))}
                    className="h-8 text-right font-bold"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Potencial (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={simulator.potencial || ""}
                    onChange={(e) => setSimulator(prev => ({ ...prev, potencial: Number(e.target.value) || 0 }))}
                    className="h-8 text-right text-sm"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Tx. Presença (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={simulator.taxaPresenca || ""}
                    onChange={(e) => setSimulator(prev => ({ ...prev, taxaPresenca: Number(e.target.value) || 0 }))}
                    className="h-8 text-right text-sm"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Conversão (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={simulator.conversao || ""}
                    onChange={(e) => setSimulator(prev => ({ ...prev, conversao: Number(e.target.value) || 0 }))}
                    className="h-8 text-right text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Resultados calculados */}
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Resultados Calculados:</p>
                <div className="flex justify-between items-center p-2 rounded bg-blue-500/10 border border-blue-500/20">
                  <span className="text-muted-foreground">Atendimentos necessários</span>
                  <span className="font-bold text-blue-600">{simulatorResults.atendimentos}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Receitas necessárias</span>
                  <span className="font-bold">{simulatorResults.receitas}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Visitou DNZ necessários</span>
                  <span className="font-bold">{simulatorResults.visitouDnz}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-primary/10 border border-primary/20">
                  <span className="text-muted-foreground">Faturamento projetado</span>
                  <span className="font-bold text-primary">{formatCurrencyFull(simulatorResults.faturamento)}</span>
                </div>
              </div>

              {/* Fórmulas */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Fórmulas: Atend = Rec ÷ Pot% | Rec = Visita ÷ Pres% | Visita = Vendas ÷ Conv% | Fat = Vendas × Ticket
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Faturamento por Semana */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Faturamento por Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {weeklyRevenue.length > 0 ? (
                weeklyRevenue.slice(0, 8).map((week, idx) => (
                  <div 
                    key={week.weekKey} 
                    className={`flex justify-between items-center p-2 rounded ${
                      idx === 0 ? "bg-primary/10 border border-primary/20" : "bg-muted/30"
                    }`}
                  >
                    <span className={`text-sm ${idx === 0 ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                      {week.label}
                      {idx === 0 && " 🏆"}
                    </span>
                    <span className={`font-bold ${idx === 0 ? "text-primary" : ""}`}>
                      {formatCurrency(week.total)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados de faturamento</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 3 Dias da Semana */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Top 3 Dias que Mais Faturam
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dailyAverageRevenue.length > 0 ? (
                dailyAverageRevenue.map((day, idx) => (
                  <div 
                    key={day.dayOfWeek} 
                    className={`flex justify-between items-center p-2 rounded ${
                      idx === 0 ? "bg-green-500/10 border border-green-500/20" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${
                        idx === 0 ? "text-green-500" : idx === 1 ? "text-yellow-500" : "text-orange-500"
                      }`}>
                        {idx + 1}º
                      </span>
                      <span className={`text-sm ${idx === 0 ? "font-semibold" : "text-muted-foreground"}`}>
                        {day.dayName}
                      </span>
                    </div>
                    <span className={`font-bold ${idx === 0 ? "text-green-500" : ""}`}>
                      média {formatCurrency(day.average)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados de faturamento</p>
              )}
            </div>
            {dailyAverageRevenue.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                {dailyAverageRevenue.map(d => d.dayName).join(", ")} são os dias que mais faturam no período
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela Principal */}
      <div className="w-full rounded-lg border border-border">
        <div className="overflow-x-auto">
          <Table className="relative">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="sticky left-0 z-20 bg-muted min-w-[180px] font-bold border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]">
                  SUA VISÃO / DNZ
                </TableHead>
                {daysOfPeriod.map((day, idx) => (
                  <TableHead key={`${day.month}-${day.day}`} className="text-center min-w-[90px] font-semibold">
                    <div className="flex flex-col items-center">
                      <span>{day.formattedDate}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {DAY_NAMES[day.dayOfWeek]}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {SUA_VISAO_METRICS.map((metric) => (
                <TableRow key={metric.key} className="hover:bg-muted/30">
                  <TableCell className="sticky left-0 z-10 bg-card min-w-[180px] font-medium border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]">
                    {metric.label}
                  </TableCell>
                  {daysOfPeriod.map((day, idx) => {
                    const data = periodData[idx];
                    const value = data[metric.key as keyof DayMetrics] as number;
                    return (
                      <TableCell key={`${day.month}-${day.day}`} className="text-center text-sm">
                        {formatValue(value, metric.label)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
