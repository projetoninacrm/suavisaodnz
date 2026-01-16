import { useMemo, useState } from "react";
import { format, getDaysInMonth, getDay, getWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Lead } from "@/hooks/useLeads";
import { useIndicadoresData } from "@/hooks/useIndicadoresData";
import { Loader2, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface IndicadoresTableProps {
  leads: Lead[];
}

const MONTHS = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
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
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const { isLoading, getMetricsForDay, acompanhamentos } = 
    useIndicadoresData(leads, parseInt(selectedMonth), parseInt(selectedYear));

  // Gerar dias do mês (excluindo domingos) com dia da semana
  const daysOfMonth = useMemo(() => {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    const days: { day: number; formattedDate: string; dayOfWeek: number; weekNumber: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = getDay(date);
      
      // Excluir domingos (0 = domingo)
      if (dayOfWeek !== 0) {
        const monthAbbrev = format(date, "MMM", { locale: ptBR });
        const weekNumber = getWeek(date, { weekStartsOn: 1 });
        days.push({
          day,
          formattedDate: `${String(day).padStart(2, "0")}/${monthAbbrev}`,
          dayOfWeek,
          weekNumber,
        });
      }
    }

    return days;
  }, [selectedMonth, selectedYear]);

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
  const suaVisaoData = useMemo(() => {
    return daysOfMonth.map(day => ({
      ...getMetricsForDay(day.day),
      dayOfWeek: day.dayOfWeek,
      weekNumber: day.weekNumber,
    }));
  }, [daysOfMonth, getMetricsForDay]);

  // Calcular faturamento por semana
  const weeklyRevenue = useMemo(() => {
    const weekMap = new Map<number, { total: number; weekLabel: string }>();
    
    daysOfMonth.forEach((day, idx) => {
      const faturamento = suaVisaoData[idx]?.faturamento || 0;
      const weekNum = day.weekNumber;
      
      if (!weekMap.has(weekNum)) {
        weekMap.set(weekNum, { total: 0, weekLabel: `Semana ${weekNum}` });
      }
      weekMap.get(weekNum)!.total += faturamento;
    });

    return Array.from(weekMap.entries())
      .map(([weekNum, data]) => ({
        weekNumber: weekNum,
        total: data.total,
        label: data.weekLabel,
      }))
      .sort((a, b) => b.total - a.total);
  }, [daysOfMonth, suaVisaoData]);

  // Calcular média de faturamento por dia da semana
  const dailyAverageRevenue = useMemo(() => {
    const dayMap = new Map<number, { total: number; count: number }>();
    
    suaVisaoData.forEach((data) => {
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
  }, [suaVisaoData]);

  // Formatar moeda
  const formatCurrency = (value: number): string => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k`;
    }
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-4">
      {/* Filtro de Mês e Ano */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Filtrar por:</span>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {MONTHS.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Kanbans de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Faturamento por Semana */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Faturamento por Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {weeklyRevenue.length > 0 ? (
                weeklyRevenue.map((week, idx) => (
                  <div 
                    key={week.weekNumber} 
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
                {dailyAverageRevenue.map(d => d.dayName).join(", ")} são os dias que mais faturam no mês
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
                {daysOfMonth.map((day) => (
                  <TableHead key={day.day} className="text-center min-w-[90px] font-semibold">
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
                  {daysOfMonth.map((day, idx) => {
                    const data = suaVisaoData[idx];
                    const value = data[metric.key as keyof typeof data] as number;
                    return (
                      <TableCell key={day.day} className="text-center text-sm">
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
