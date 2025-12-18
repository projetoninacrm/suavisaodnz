import { useMemo, useState } from "react";
import { format, getDaysInMonth, getDay, parse, isValid } from "date-fns";
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

const CURRENT_YEAR = new Date().getFullYear();

// Métricas para cada bloco
const SUA_VISAO_METRICS = [
  { key: "atendimentos", label: "Atendimentos" },
  { key: "consultas", label: "Consultas" },
  { key: "receitas", label: "Receitas" },
  { key: "potencial", label: "Potencial (%)" },
  { key: "visitou_dnz", label: "Visitou DNZ" },
  { key: "comparecimento", label: "Comparecimento (%)" },
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
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));

  // Gerar dias do mês (excluindo domingos)
  const daysOfMonth = useMemo(() => {
    const month = parseInt(selectedMonth);
    const daysInMonth = getDaysInMonth(new Date(CURRENT_YEAR, month - 1));
    const days: { day: number; dateStr: string; formattedDate: string }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(CURRENT_YEAR, month - 1, day);
      const dayOfWeek = getDay(date);
      
      // Excluir domingos (0 = domingo)
      if (dayOfWeek !== 0) {
        const monthAbbrev = format(date, "MMM", { locale: ptBR });
        days.push({
          day,
          dateStr: format(date, "dd/MM/yyyy"),
          formattedDate: `${String(day).padStart(2, "0")}/${monthAbbrev}`,
        });
      }
    }

    return days;
  }, [selectedMonth]);

  // Parse data_registro para Date
  const parseDateStr = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
    return isValid(parsed) ? parsed : null;
  };

  // Filtrar leads por canal e data
  const getLeadsForDayAndChannel = (dateStr: string, channel: string) => {
    return leads.filter((lead) => {
      const leadDate = lead.data_registro;
      const leadChannel = lead.canal?.toLowerCase();
      const targetChannel = channel.toLowerCase();
      
      if (channel === "sua visão") {
        return leadDate === dateStr && leadChannel === "sua visão";
      } else if (channel === "loja") {
        return leadDate === dateStr && leadChannel === "loja";
      } else if (channel === "internet") {
        return leadDate === dateStr && (
          leadChannel === "internet" || 
          leadChannel === "google" || 
          leadChannel === "facebook"
        );
      }
      return false;
    });
  };

  // Calcular métricas para Sua Visão
  const calcSuaVisaoMetrics = (dateStr: string) => {
    const dayLeads = getLeadsForDayAndChannel(dateStr, "sua visão");
    const atendimentos = dayLeads.length;
    const consultas = dayLeads.filter(l => l.medico).length;
    const receitas = dayLeads.filter(l => l.orcamento === "Sim").length;
    const potencial = atendimentos > 0 ? ((receitas / atendimentos) * 100) : 0;
    const visitou_dnz = dayLeads.filter(l => l.venda === "Sim" || l.orcamento === "Sim").length;
    const comparecimento = receitas > 0 ? ((visitou_dnz / receitas) * 100) : 0;
    const vendas = dayLeads.filter(l => l.venda === "Sim").length;
    const conversao = visitou_dnz > 0 ? ((vendas / visitou_dnz) * 100) : 0;
    
    // Placeholder para faturamento - seria necessário campo de valor
    const faturamento = vendas * 1500; // Valor médio estimado
    const ticket = vendas > 0 ? faturamento / vendas : 0;

    return {
      atendimentos,
      consultas,
      receitas,
      potencial,
      visitou_dnz,
      comparecimento,
      vendas,
      conversao,
      faturamento,
      ticket,
    };
  };

  // Calcular métricas para Loja
  const calcLojaMetrics = (dateStr: string) => {
    const dayLeads = getLeadsForDayAndChannel(dateStr, "loja");
    const visitas = dayLeads.length;
    const vendas = dayLeads.filter(l => l.venda === "Sim").length;
    const conversao = visitas > 0 ? ((vendas / visitas) * 100) : 0;
    const faturamento = vendas * 1200; // Valor médio estimado
    const ticket = vendas > 0 ? faturamento / vendas : 0;

    return { visitas, vendas, conversao, faturamento, ticket };
  };

  // Calcular métricas para MKT (Internet)
  const calcMktMetrics = (dateStr: string) => {
    const dayLeads = getLeadsForDayAndChannel(dateStr, "internet");
    const leadsCount = dayLeads.length;
    const vendas = dayLeads.filter(l => l.venda === "Sim").length;
    const conversao = leadsCount > 0 ? ((vendas / leadsCount) * 100) : 0;
    const faturamento = vendas * 1000; // Valor médio estimado
    const ticket = vendas > 0 ? faturamento / vendas : 0;
    const investimento = 0; // Viria da tabela MKT
    const cac = vendas > 0 ? investimento / vendas : 0;

    return { leads: leadsCount, vendas, conversao, faturamento, ticket, investimento, cac };
  };

  // Formatar valores para exibição
  const formatValue = (value: number, type: string): string => {
    if (type.includes("%")) {
      return value === 0 ? "0,00%" : `${value.toFixed(2).replace(".", ",")}%`;
    }
    if (type.includes("R$") || type === "ticket" || type === "faturamento") {
      return value === 0 ? "R$ 0,00" : `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    }
    if (type === "cac" || type === "investimento") {
      return value === 0 ? "R$ 0,00" : `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    }
    return value === 0 ? "" : String(value);
  };

  // Gerar valores para cada métrica e dia
  const suaVisaoData = useMemo(() => {
    return daysOfMonth.map(day => calcSuaVisaoMetrics(day.dateStr));
  }, [daysOfMonth, leads]);

  const lojaData = useMemo(() => {
    return daysOfMonth.map(day => calcLojaMetrics(day.dateStr));
  }, [daysOfMonth, leads]);

  const mktData = useMemo(() => {
    return daysOfMonth.map(day => calcMktMetrics(day.dateStr));
  }, [daysOfMonth, leads]);

  return (
    <div className="space-y-4">
      {/* Filtro de Mês */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm font-medium text-muted-foreground">Filtrar por mês:</span>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Selecione o mês" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {MONTHS.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">/ {CURRENT_YEAR}</span>
      </div>

      <ScrollArea className="w-full whitespace-nowrap rounded-lg border border-border">
        <div className="min-w-max">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="sticky left-0 z-20 bg-muted/50 min-w-[150px] font-bold">
                  SUA VISÃO
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
                  <TableCell className="sticky left-0 z-10 bg-card font-medium border-r">
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
                <TableHead className="sticky left-0 z-20 bg-muted/50 min-w-[150px] font-bold">
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
                  <TableCell className="sticky left-0 z-10 bg-card font-medium border-r">
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
                <TableHead className="sticky left-0 z-20 bg-muted/50 min-w-[150px] font-bold">
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
                  <TableCell className="sticky left-0 z-10 bg-card font-medium border-r">
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
