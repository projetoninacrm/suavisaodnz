import { useMemo, useState } from "react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { format, getDaysInMonth, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Lead } from "@/hooks/useLeads";
import { useIndicadoresData, type DayMetrics } from "@/hooks/useIndicadoresData";
import { BarChart3, Info, X, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataState } from "@/components/data/DataState";
import { EntityDataTable } from "@/components/data/EntityDataTable";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SelectFilter } from "@/components/data/SelectFilter";
import { FilterField } from "@/components/data/FilterField";
import { FilterGrid } from "@/components/data/FilterGrid";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRouteState } from "@/hooks/useRouteState";
import { calculateConsolidatedReportMetrics, getCalendarWeekOfMonth } from "@/lib/reportCalculations";

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

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, index) => String(CURRENT_YEAR - 2 + index));

interface IndicatorsPeriod {
  months: number[];
  year: string;
}

function getCurrentIndicatorsPeriod(): IndicatorsPeriod {
  const now = new Date();
  return { months: [now.getMonth() + 1], year: String(now.getFullYear()) };
}

function parseIndicatorsPeriod(value: unknown): IndicatorsPeriod {
  if (typeof value !== "object" || value === null || !("months" in value) || !("year" in value)) {
    return getCurrentIndicatorsPeriod();
  }

  const months = Array.isArray(value.months)
    ? [...new Set(value.months.filter((month): month is number => Number.isInteger(month) && month >= 1 && month <= 12))].sort((a, b) => a - b)
    : [];
  const year = typeof value.year === "string" && /^\d{4}$/.test(value.year) && Number(value.year) >= 1900
    ? value.year
    : "";

  return months.length > 0 && year ? { months, year } : getCurrentIndicatorsPeriod();
}

const SUA_VISAO_METRICS = [
  { key: "atendimentos", label: "Atendimentos" },
  { key: "receitas", label: "Receitas" },
  { key: "potencial", label: "Potencial (%)" },
  { key: "visitou_dnz", label: "Leads com orçamento" },
  { key: "taxa_presenca", label: "Taxa de Presença (%)" },
  { key: "vendas", label: "Vendas" },
  { key: "conversao", label: "Conversão (%)" },
  { key: "faturamento", label: "Faturamento (R$)" },
  { key: "ticket", label: "Ticket Médio (R$)" },
];

type IndicatorsMatrixDay = {
  day: number;
  month: number;
  formattedDate: string;
  dayOfWeek: number;
  weekNumber: number;
};

type IndicatorsMatrixPeriodData = DayMetrics & {
  dayOfWeek: number;
  weekNumber: number;
  month: number;
};

type IndicatorsMatrixMeta = {
  days: IndicatorsMatrixDay[];
  periodData: IndicatorsMatrixPeriodData[];
  formatValue: (value: number, type: string) => string;
};

const indicatorsMatrixFeatures = tableFeatures({ tableMeta: {} as IndicatorsMatrixMeta });
const indicatorsMetricColumn = createColumnHelper<typeof indicatorsMatrixFeatures, typeof SUA_VISAO_METRICS[number]>();

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
  const [period, setPeriod] = useRouteState<IndicatorsPeriod>("indicatorsPeriod", getCurrentIndicatorsPeriod, parseIndicatorsPeriod);
  const selectedMonths = period.months;
  const selectedYear = period.year;
  const setSelectedMonths = (action: number[] | ((previous: number[]) => number[])) => {
    setPeriod((current) => ({
      ...current,
      months: typeof action === "function" ? action(current.months) : action,
    }));
  };
  const setSelectedYear = (year: string) => setPeriod((current) => ({ ...current, year }));
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [mobileDayKey, setMobileDayKey] = useState(() => {
    const today = new Date();
    return `${today.getMonth() + 1}-${today.getDate()}`;
  });

  const { isLoading, error, refresh, getMetricsForDay } =
    useIndicadoresData(leads, selectedMonths, parseInt(selectedYear));

  const setMonthSelected = (month: number, selected: boolean) => {
    setSelectedMonths(prev => {
      if (selected) {
        if (prev.includes(month)) return prev;
        return [...prev, month].sort((a, b) => a - b);
      }
      if (prev.includes(month)) {
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== month);
      }
      return prev;
    });
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
          // Usar semana dentro do mês (1-5) ao invés de semana do ano
          const weekNumber = getCalendarWeekOfMonth(date);
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

  const mobileDay = daysOfPeriod.find((day) => `${day.month}-${day.day}` === mobileDayKey) || daysOfPeriod[0];
  const mobileDayIndex = mobileDay
    ? daysOfPeriod.findIndex((day) => day.month === mobileDay.month && day.day === mobileDay.day)
    : -1;
  const mobileDayData = mobileDayIndex >= 0 ? periodData[mobileDayIndex] : undefined;
  const indicatorsMatrixColumns = useMemo(() => indicatorsMetricColumn.columns([
    indicatorsMetricColumn.accessor("label", {
      id: "metric",
      header: "SUA VISÃO / DNZ",
    }),
    ...daysOfPeriod.map((day, index) => indicatorsMetricColumn.display({
      id: `day-${day.month}-${day.day}`,
      header: ({ table }) => {
        const headerDay = table.options.meta.days[index];
        return (
          <div className="flex flex-col items-center">
            <span>{headerDay.formattedDate}</span>
            <span className="text-xs font-normal text-muted-foreground">{DAY_NAMES[headerDay.dayOfWeek]}</span>
          </div>
        );
      },
      cell: ({ row, table }) => {
        const data = table.options.meta.periodData[index];
        const value = data[row.original.key as keyof DayMetrics] as number;
        return <span className="text-sm">{table.options.meta.formatValue(value, row.original.label)}</span>;
      },
    })),
  ]), [daysOfPeriod]);
  const indicatorsMatrixTable = useTable({
    features: indicatorsMatrixFeatures,
    columns: indicatorsMatrixColumns,
    data: SUA_VISAO_METRICS,
    getRowId: (metric) => metric.key,
    meta: {
      days: daysOfPeriod,
      periodData,
      formatValue,
    },
  });

  // Calcular vendas do canal "Sua Visão" da aba Leads no período selecionado
  const leadsVendas = useMemo(() => {
    return leads.filter(lead => {
      // Filtrar apenas leads do canal "Sua Visão" (case insensitive)
      const canal = (lead.canal || "").toLowerCase().trim();
      if (!canal.includes("sua vis")) return false;
      
      // Filtrar leads com venda = "sim"
      const venda = (lead.venda || "").toLowerCase().trim();
      if (venda !== "sim") return false;
      
      // Verificar se está no período selecionado
      if (!lead.data_registro) return false;
      
      // Parse da data (formato esperado: DD/MM/YYYY ou YYYY-MM-DD)
      let leadMonth: number;
      let leadYear: number;
      
      if (lead.data_registro.includes("/")) {
        const parts = lead.data_registro.split("/");
        if (parts.length === 3) {
          leadMonth = parseInt(parts[1]);
          leadYear = parseInt(parts[2]);
        } else return false;
      } else if (lead.data_registro.includes("-")) {
        const parts = lead.data_registro.split("-");
        if (parts.length >= 2) {
          leadYear = parseInt(parts[0]);
          leadMonth = parseInt(parts[1]);
        } else return false;
      } else {
        return false;
      }
      
      return selectedMonths.includes(leadMonth) && leadYear === parseInt(selectedYear);
    });
  }, [leads, selectedMonths, selectedYear]);

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

    // Vendas consolidadas continuam vindo dos leads do canal Sua Visão.
    return calculateConsolidatedReportMetrics(totals, leadsVendas.length);
  }, [periodData, leadsVendas]);

  // Agregar o faturamento realizado por semana para o gráfico da visão geral.
  const weeklyRevenue = useMemo(() => {
    const weekMap = new Map<string, { faturamento: number; weekLabel: string }>();
    
    daysOfPeriod.forEach((day, idx) => {
      const data = periodData[idx];
      const weekKey = `${day.month}-${day.weekNumber}`;
      const monthShort = MONTHS.find(m => m.value === day.month)?.short || "";
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { 
          faturamento: 0, 
          weekLabel: selectedMonths.length > 1 
            ? `Sem ${day.weekNumber} (${monthShort})` 
            : `Semana ${day.weekNumber}`,
        });
      }
      const entry = weekMap.get(weekKey)!;
      entry.faturamento += data?.faturamento || 0;
    });

    return Array.from(weekMap.entries()).map(([weekKey, data]) => ({
      weekKey,
      total: data.faturamento,
      label: data.weekLabel,
    }));
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
    return sortedMonths
      .map((month) => MONTHS.find((item) => item.value === month)?.short)
      .filter((month): month is string => Boolean(month))
      .join(", ");
  };

  const weeklyRevenueChronological = [...weeklyRevenue].sort((a, b) => {
    const [monthA, weekA] = a.weekKey.split("-").map(Number);
    const [monthB, weekB] = b.weekKey.split("-").map(Number);
    return monthA - monthB || weekA - weekB;
  });
  const maxWeeklyRevenue = Math.max(0, ...weeklyRevenueChronological.map((week) => week.total));
  const headlineMetrics = [
    { label: "Atendimentos", value: consolidatedData.atendimentos.toLocaleString("pt-BR"), detail: "Amigo · atendimentos concluídos na unidade" },
    { label: "Vendas", value: consolidatedData.vendas.toLocaleString("pt-BR"), detail: "Leads do canal Sua Visão com venda = Sim" },
    { label: "Conversão", value: `${consolidatedData.conversao.toFixed(2).replace(".", ",")}%`, detail: `${consolidatedData.vendas} vendas ÷ ${consolidatedData.visitou_dnz} leads com orçamento Sim` },
    { label: "Faturamento", value: formatCurrencyFull(consolidatedData.faturamento), detail: "Acompanhamento diário · realizado" },
  ];
  const supportingMetrics = [
    { label: "Receitas", value: consolidatedData.receitas.toLocaleString("pt-BR"), detail: "Atendimentos do Amigo com Receita = Sim na ficha complementar" },
    { label: "Potencial", value: `${consolidatedData.potencial.toFixed(2).replace(".", ",")}%`, detail: `${consolidatedData.receitas} receitas ÷ ${consolidatedData.atendimentos} atendimentos` },
    { label: "Leads com orçamento", value: consolidatedData.visitou_dnz.toLocaleString("pt-BR"), detail: "Leads do canal Sua Visão com orçamento = Sim" },
    { label: "Taxa de presença", value: `${consolidatedData.taxa_presenca.toFixed(2).replace(".", ",")}%`, detail: `${consolidatedData.visitou_dnz} leads com orçamento ÷ ${consolidatedData.receitas} receitas · fontes diferentes` },
    { label: "Ticket médio", value: formatCurrencyFull(consolidatedData.ticket), detail: `${formatCurrencyFull(consolidatedData.faturamento)} faturamento ÷ ${consolidatedData.vendas} vendas dos leads` },
  ];

  return (
    <div className="space-y-4">
      <FilterGrid columns={2} className="mb-6 max-w-2xl">
        <FilterField id="indicator-months" label="Meses do relatório">
        
        {/* Multi-select de meses */}
        <Popover>
          <PopoverTrigger render={<Button id="indicator-months" type="button" variant="outline" aria-label={`Meses do relatório: ${getPeriodLabel()}`} className="w-full min-w-0 justify-between">
              <span className="truncate">{getPeriodLabel()}</span>
              {selectedMonths.length > 1 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedMonths.length}
                </Badge>
              )}
            </Button>} />
          <PopoverContent className="w-[280px] p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Selecionar meses</p>
                  <p id="month-filter-help" className="text-xs text-muted-foreground">Mantenha pelo menos um mês selecionado; a última opção fica desabilitada.</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedMonths([currentMonth])}
                >
                  Mês atual
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Meses do relatório">
                {MONTHS.map((month) => (
                  <div
                    key={month.value}
                    className="flex min-w-0 items-center gap-2 rounded-md p-2 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedMonths.includes(month.value)}
                      onCheckedChange={(checked) => setMonthSelected(month.value, checked === true)}
                      disabled={selectedMonths.length === 1 && selectedMonths[0] === month.value}
                      aria-label={`${selectedMonths.includes(month.value) ? "Remover" : "Incluir"} ${month.label} no período`}
                      aria-describedby="month-filter-help"
                    />
                    <span aria-hidden="true">{month.short}</span>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Selected months badges */}
        {selectedMonths.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {selectedMonths.map((month) => {
              const label = MONTHS.find((item) => item.value === month)?.short || String(month);
              return (
                <Button key={month} type="button" variant="ghost" size="sm" onClick={() => setMonthSelected(month, false)} aria-label={`Remover ${label} do período`} className="h-auto rounded-full p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <Badge variant="secondary" className="pointer-events-none">
                    {label}<X aria-hidden="true" className="ml-1 size-3" />
                  </Badge>
                </Button>
              );
            })}
          </div>
        )}

        </FilterField>

        <SelectFilter
          id="indicator-year"
          label="Ano do relatório"
          value={selectedYear}
          onValueChange={setSelectedYear}
          options={[...new Set([...YEARS, selectedYear])].sort((a, b) => Number(a) - Number(b))}
          placeholder="Ano"
          className="w-full min-w-0"
          triggerClassName="w-full bg-background"
        />
      </FilterGrid>

      {error ? (
        <DataState
          variant="error"
          title="Não foi possível montar o relatório"
          description={`${error} Os indicadores ficam ocultos para evitar que uma fonte indisponível apareça como zero.`}
          action={{ label: "Tentar novamente", onClick: refresh }}
        />
      ) : isLoading ? (
        <DataState variant="loading" title="Carregando resultados" description="Consultando as fontes do período selecionado." />
      ) : (
        <>
      <section aria-label="Indicadores principais" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {headlineMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="break-words text-2xl font-semibold tracking-tight">{metric.value}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div role="note" className="flex gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">As vendas usam fontes diferentes nesta visão</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Os cartões de Vendas e Conversão contam leads do canal Sua Visão. A tabela diária conta vendas dos atendimentos do Amigo marcadas na ficha complementar; o faturamento vem do acompanhamento diário. Por isso, o número mensal pode diferir da soma das vendas por dia.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 aria-hidden="true" className="size-4 text-primary" />
            Faturamento por semana
            <Badge variant="outline" className="ml-auto text-xs">{getPeriodLabel()} {selectedYear}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">Fonte: acompanhamento diário do faturamento realizado.</p>
          <p className="text-xs text-muted-foreground">As semanas seguem o calendário de domingo a sábado; domingos ficam fora da grade diária.</p>
        </CardHeader>
        <CardContent>
          {maxWeeklyRevenue > 0 ? (
            <div role="list" aria-label="Faturamento por semana" className="space-y-3">
              {weeklyRevenueChronological.map((week) => {
                const width = maxWeeklyRevenue > 0 ? (week.total / maxWeeklyRevenue) * 100 : 0;
                return (
                  <div key={week.weekKey} role="listitem" className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3">
                    <span className="text-sm text-muted-foreground">{week.label}</span>
                    <Progress value={width} aria-label={`Faturamento de ${week.label}`} aria-valuetext={formatCurrencyFull(week.total)} />
                    <span className="min-w-20 text-right text-sm font-medium tabular-nums">{formatCurrencyFull(week.total)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem faturamento neste período.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CardHeader className="py-3">
            <CollapsibleTrigger render={
              <Button variant="ghost" className="h-auto w-full min-w-0 justify-between gap-3 whitespace-normal p-0 text-left hover:bg-transparent">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">Mais indicadores e bases de cálculo</span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">Receitas, potencial, presença, ticket médio e média por dia da semana</span>
                </span>
                {isDetailsOpen ? <ChevronUp aria-hidden="true" className="size-4 shrink-0" /> : <ChevronDown aria-hidden="true" className="size-4 shrink-0" />}
              </Button>
            } />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="grid gap-6 border-t pt-4 lg:grid-cols-2">
              <div className="space-y-2" role="list" aria-label="Indicadores complementares e suas bases">
                {supportingMetrics.map((metric) => (
                  <div key={metric.label} role="listitem" className="rounded-md bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{metric.label}</span>
                      <span className="text-sm font-semibold tabular-nums">{metric.value}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{metric.detail}</p>
                  </div>
                ))}
                <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  Presença compara leads com orçamento marcado com receitas dos atendimentos do Amigo; são bases diferentes. A conversão usa vendas de leads divididas por esses leads com orçamento.
                </p>
              </div>

              <section aria-labelledby="average-revenue-heading" className="space-y-2">
                <div>
                  <h3 id="average-revenue-heading" className="text-sm font-medium">Média de faturamento por dia da semana</h3>
                  <p className="mt-1 text-xs text-muted-foreground">A média considera apenas os dias com faturamento maior que zero.</p>
                </div>
                {dailyAverageRevenue.length > 0 ? dailyAverageRevenue.map((day, index) => (
                  <div key={day.dayOfWeek} className="flex items-center justify-between gap-3 rounded-md bg-muted/30 p-3">
                    <span className="text-sm">{index + 1}º · {day.dayName}</span>
                    <span className="text-sm font-medium tabular-nums">{formatCurrencyFull(day.average)}</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Sem dias com faturamento para calcular a média.</p>}
              </section>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Tabela Principal */}
      <section className="space-y-3 md:hidden" aria-label="Indicadores diários por data">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SelectFilter
            id="indicator-mobile-day"
            label="Dia"
            value={mobileDay ? `${mobileDay.month}-${mobileDay.day}` : ""}
            onValueChange={setMobileDayKey}
            options={daysOfPeriod.map((day) => ({
              value: `${day.month}-${day.day}`,
              label: `${day.formattedDate} · ${DAY_FULL_NAMES[day.dayOfWeek]}`,
            }))}
            disabled={!mobileDay}
            className="min-w-0 flex-1"
            triggerClassName="w-full"
          />
          {mobileDay && <p className="pb-2 text-xs text-muted-foreground">Dia {mobileDayIndex + 1} de {daysOfPeriod.length}</p>}
        </div>
        {mobileDay && mobileDayData ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{mobileDay.formattedDate} · {DAY_FULL_NAMES[mobileDay.dayOfWeek]}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                {SUA_VISAO_METRICS.map((metric) => {
                  const value = mobileDayData[metric.key as keyof DayMetrics] as number;
                  return (
                    <div key={metric.key} className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{metric.label}</dt>
                      <dd className="mt-1 break-words text-sm font-medium tabular-nums">{formatValue(value, metric.label) || "—"}</dd>
                    </div>
                  );
                })}
              </dl>
            </CardContent>
          </Card>
        ) : (
          <DataState
            variant="empty"
            title="Não há dias disponíveis no período selecionado"
            description="Selecione outro período para consultar os indicadores."
            className="min-h-48"
          />
        )}
      </section>

      <div className="hidden md:block">
      {daysOfPeriod.length === 0 ? (
        <DataState
          variant="empty"
          title="Não há dias disponíveis no período selecionado"
          description="Selecione outro período para consultar os indicadores."
          className="min-h-48"
        />
      ) : (
      <EntityDataTable
        table={indicatorsMatrixTable}
        label="Indicadores diários por data"
        className="w-full rounded-lg border border-border"
        tableClassName="relative"
        headerRowClassName="bg-muted/50"
        rowClassName="hover:bg-muted/30"
        getHeaderClassName={(columnId) => columnId === "metric"
          ? "sticky left-0 z-20 min-w-[180px] border-r border-border bg-muted font-bold shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]"
          : "min-w-[90px] text-center font-semibold"}
        getCellClassName={(columnId) => columnId === "metric"
          ? "sticky left-0 z-10 min-w-[180px] border-r border-border bg-card font-medium shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]"
          : "whitespace-nowrap text-center"}
      />
      )}
      </div>
        </>
      )}
    </div>
  );
}
