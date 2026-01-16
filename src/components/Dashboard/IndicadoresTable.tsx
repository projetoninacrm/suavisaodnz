import { useMemo, useState } from "react";
import { format, getDaysInMonth, getDay } from "date-fns";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useIndicadoresData } from "@/hooks/useIndicadoresData";
import { Loader2 } from "lucide-react";

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

// Métricas para cada bloco
const SUA_VISAO_METRICS = [
  { key: "atendimentos", label: "Atendimentos" },
  { key: "receitas", label: "Receitas" },
  { key: "potencial", label: "Potencial (%)" },
  { key: "visitou_dnz", label: "Visitou DNZ" },
  { key: "vendas", label: "Vendas" },
  { key: "conversao", label: "Conversão (%)" },
  { key: "faturamento", label: "Faturamento (R$)" },
  { key: "ticket", label: "Ticket Médio (R$)" },
];

const LOJA_METRICS = [
  { key: "visitas", label: "Visitas" },
  { key: "vendas", label: "Vendas" },
  { key: "conversao", label: "Conversão (%)" },
  { key: "faturamento", label: "Faturamento (R$)" },
  { key: "ticket", label: "Ticket Médio (R$)" },
];

const MKT_METRICS = [
  { key: "leads", label: "Leads" },
  { key: "vendas", label: "Vendas" },
  { key: "conversao", label: "Conversão (%)" },
  { key: "faturamento", label: "Faturamento (R$)" },
  { key: "ticket", label: "Ticket Médio (R$)" },
  { key: "investimento", label: "Investimento" },
  { key: "cac", label: "CAC" },
];

export function IndicadoresTable({ leads }: IndicadoresTableProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const { isLoading, getMetricsForDay, getLojaMetricsForDay, getMktMetricsForDay } = 
    useIndicadoresData(leads, parseInt(selectedMonth), parseInt(selectedYear));

  // Gerar dias do mês (excluindo domingos)
  const daysOfMonth = useMemo(() => {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    const days: { day: number; formattedDate: string }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = getDay(date);
      
      // Excluir domingos (0 = domingo)
      if (dayOfWeek !== 0) {
        const monthAbbrev = format(date, "MMM", { locale: ptBR });
        days.push({
          day,
          formattedDate: `${String(day).padStart(2, "0")}/${monthAbbrev}`,
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
    if (type === "cac" || type === "investimento") {
      if (value === 0) return "";
      return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    }
    return value === 0 ? "" : String(value);
  };

  // Gerar valores para cada métrica e dia
  const suaVisaoData = useMemo(() => {
    return daysOfMonth.map(day => getMetricsForDay(day.day));
  }, [daysOfMonth, getMetricsForDay]);

  const lojaData = useMemo(() => {
    return daysOfMonth.map(day => getLojaMetricsForDay(day.day));
  }, [daysOfMonth, getLojaMetricsForDay]);

  const mktData = useMemo(() => {
    return daysOfMonth.map(day => getMktMetricsForDay(day.day));
  }, [daysOfMonth, getMktMetricsForDay]);

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

      <div className="w-full rounded-lg border border-border">
        <div className="overflow-x-auto">
          <Table className="relative">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="sticky left-0 z-20 bg-muted min-w-[180px] font-bold border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]">
                  SUA VISÃO / DNZ
                </TableHead>
                {daysOfMonth.map((day) => (
                  <TableHead key={day.day} className="text-center min-w-[80px] font-semibold">
                    {day.formattedDate}
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

          {/* Espaço entre blocos */}
          <div className="h-4" />

          {/* BLOCO LOJA */}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="sticky left-0 z-20 bg-muted min-w-[180px] font-bold border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]">
                  LOJA
                </TableHead>
                {daysOfMonth.map((day) => (
                  <TableHead key={day.day} className="text-center min-w-[80px] font-semibold">
                    {day.formattedDate}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {LOJA_METRICS.map((metric) => (
                <TableRow key={metric.key} className="hover:bg-muted/30">
                  <TableCell className="sticky left-0 z-10 bg-card min-w-[180px] font-medium border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]">
                    {metric.label}
                  </TableCell>
                  {daysOfMonth.map((day, idx) => {
                    const data = lojaData[idx];
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

          {/* Espaço entre blocos */}
          <div className="h-4" />

          {/* BLOCO MKT */}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="sticky left-0 z-20 bg-muted min-w-[180px] font-bold border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]">
                  MKT
                </TableHead>
                {daysOfMonth.map((day) => (
                  <TableHead key={day.day} className="text-center min-w-[80px] font-semibold">
                    {day.formattedDate}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MKT_METRICS.map((metric) => (
                <TableRow key={metric.key} className="hover:bg-muted/30">
                  <TableCell className="sticky left-0 z-10 bg-card min-w-[180px] font-medium border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]">
                    {metric.label}
                  </TableCell>
                  {daysOfMonth.map((day, idx) => {
                    const data = mktData[idx];
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