import { useState, useMemo } from "react";
import { Calculator, Settings, Target, TrendingUp, Zap, Calendar, CalendarDays, CalendarRange, DollarSign, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcompanhamentoDiarioSection } from "./AcompanhamentoDiarioSection";
import { Schedule } from "@/hooks/useSchedules";
import { AcompanhamentoDiario } from "@/hooks/useAcompanhamentoDiario";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTH_LABELS: Record<string, string> = {
  jan: "Janeiro",
  fev: "Fevereiro",
  mar: "Março",
  abr: "Abril",
  mai: "Maio",
  jun: "Junho",
  jul: "Julho",
  ago: "Agosto",
  set: "Setembro",
  out: "Outubro",
  nov: "Novembro",
  dez: "Dezembro",
};

interface MetasCalculatorProps {
  schedules: Schedule[];
  acompanhamentoRegistros: AcompanhamentoDiario[];
  onUpdateAcompanhamento: (data: string, field: "vendas_realizadas" | "faturamento_realizado", value: number) => void;
}

interface ConfigValues {
  periodos: number;
  mediaAtendimentos: number;
  percentualReceita: number;
  percentualComparecimento: number;
  percentualConversao: number;
  metaFaturamentoMensal: number;
}

// Helper: extrai o mês de uma data (suporta DD/MM/YYYY e DD/mes)
function getMonthFromDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Tenta formato DD/mes (ex: 05/jan)
  const parts = dateStr.split("/");
  if (parts.length >= 2) {
    const monthPart = parts[1].toLowerCase().trim();
    // Verifica se é um nome de mês abreviado
    if (MONTH_NAMES.includes(monthPart)) {
      return monthPart;
    }
    // Tenta formato numérico DD/MM/YYYY ou DD/MM
    const monthNum = parseInt(monthPart, 10);
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      return MONTH_NAMES[monthNum - 1];
    }
  }
  return null;
}

export function MetasCalculator({ 
  schedules, 
  acompanhamentoRegistros, 
  onUpdateAcompanhamento 
}: MetasCalculatorProps) {
  // Detecta meses disponíveis nos schedules
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    schedules.forEach(s => {
      const month = getMonthFromDate(s.date);
      if (month) monthsSet.add(month);
    });
    return MONTH_NAMES.filter(m => monthsSet.has(m));
  }, [schedules]);

  // Estado do filtro de mês - por padrão seleciona o primeiro mês disponível ou janeiro
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const currentMonth = MONTH_NAMES[now.getMonth()];
    return availableMonths.includes(currentMonth) ? currentMonth : (availableMonths[0] || "jan");
  });

  // Filtra schedules pelo mês selecionado
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const month = getMonthFromDate(s.date);
      return month === selectedMonth;
    });
  }, [schedules, selectedMonth]);

  // Filtra registros de acompanhamento pelo mês selecionado
  const filteredAcompanhamento = useMemo(() => {
    return acompanhamentoRegistros.filter(r => {
      const month = getMonthFromDate(r.data);
      return month === selectedMonth;
    });
  }, [acompanhamentoRegistros, selectedMonth]);

  // Calcula diasComMedico e periodosComMedico baseados no mês filtrado
  const { diasComMedico, periodosComMedico } = useMemo(() => {
    let dias = 0;
    let periodos = 0;
    
    filteredSchedules.forEach((schedule) => {
      const temManha = schedule.morning_shift && schedule.morning_shift.trim() !== "";
      const temTarde = schedule.afternoon_shift && schedule.afternoon_shift.trim() !== "";
      
      if (temManha) periodos += 1;
      if (temTarde) periodos += 1;
      
      if (temManha || temTarde) dias += 1;
    });
    
    return { diasComMedico: dias, periodosComMedico: periodos };
  }, [filteredSchedules]);

  const [config, setConfig] = useState<ConfigValues>({
    periodos: periodosComMedico,
    mediaAtendimentos: 8,
    percentualReceita: 60,
    percentualComparecimento: 50,
    percentualConversao: 66,
    metaFaturamentoMensal: 60000,
  });

  // Atualiza períodos quando muda o mês ou recalcula
  useMemo(() => {
    if (periodosComMedico > 0) {
      setConfig(prev => ({ ...prev, periodos: periodosComMedico }));
    }
  }, [periodosComMedico, selectedMonth]);

  const handleConfigChange = (field: keyof ConfigValues, value: string) => {
    const numValue = parseFloat(value) || 0;
    setConfig(prev => ({ ...prev, [field]: numValue }));
  };

  // Cálculos da meta
  const calculations = useMemo(() => {
    const totalPacientes = config.periodos * config.mediaAtendimentos;
    const pacientesComReceita = totalPacientes * (config.percentualReceita / 100);
    const pacientesComparecem = pacientesComReceita * (config.percentualComparecimento / 100);
    const metaVendas = pacientesComparecem * (config.percentualConversao / 100);

    const superMeta = metaVendas * 1.2;
    
    // Metas por período - agora usa diasComMedico para dividir
    const metaMensal = metaVendas;
    const metaDiaria = diasComMedico > 0 ? metaVendas / diasComMedico : 0;
    const metaSemanal = metaVendas / 4;
    const superMetaMensal = superMeta;
    const superMetaDiaria = diasComMedico > 0 ? superMeta / diasComMedico : 0;
    const superMetaSemanal = superMeta / 4;

    // Faturamento
    const ticketMedio = metaVendas > 0 ? config.metaFaturamentoMensal / metaVendas : 0;
    const faturamentoMensal = config.metaFaturamentoMensal;
    const faturamentoDiario = diasComMedico > 0 ? faturamentoMensal / diasComMedico : 0;
    const faturamentoSemanal = faturamentoMensal / 4;
    const superFaturamentoMensal = faturamentoMensal * 1.2;
    const superFaturamentoDiario = diasComMedico > 0 ? superFaturamentoMensal / diasComMedico : 0;
    const superFaturamentoSemanal = superFaturamentoMensal / 4;

    return {
      totalPacientes,
      pacientesComReceita,
      pacientesComparecem,
      metaVendas,
      superMeta,
      metaMensal,
      metaDiaria,
      metaSemanal,
      superMetaMensal,
      superMetaDiaria,
      superMetaSemanal,
      ticketMedio,
      faturamentoMensal,
      faturamentoDiario,
      faturamentoSemanal,
      superFaturamentoMensal,
      superFaturamentoDiario,
      superFaturamentoSemanal,
    };
  }, [config, diasComMedico]);

  return (
    <div className="space-y-6">
      {/* Filtro de Mês */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Mês:
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[180px] justify-between">
                  {MONTH_LABELS[selectedMonth] || selectedMonth}
                  <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px] p-2" align="start">
                <div className="space-y-1">
                  {availableMonths.map((month) => (
                    <div
                      key={month}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                        selectedMonth === month 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedMonth(month)}
                    >
                      <span className="text-sm font-medium">{MONTH_LABELS[month]}</span>
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-sm text-muted-foreground">
              ({diasComMedico} dias com médico / {periodosComMedico} períodos)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Bloco 1: Configurações Gerais */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-primary" />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodos" className="text-sm font-medium">
                Períodos com médico
              </Label>
              <div className="relative">
                <Input
                  id="periodos"
                  type="number"
                  min="0"
                  value={config.periodos}
                  onChange={(e) => handleConfigChange("periodos", e.target.value)}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  /mês
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Vem da aba Agenda</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mediaAtendimentos" className="text-sm font-medium">
                Média atendimentos
              </Label>
              <div className="relative">
                <Input
                  id="mediaAtendimentos"
                  type="number"
                  min="0"
                  value={config.mediaAtendimentos}
                  onChange={(e) => handleConfigChange("mediaAtendimentos", e.target.value)}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  /período
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Padrão: 8</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentualReceita" className="text-sm font-medium">
                % Pacientes c/ receita
              </Label>
              <div className="relative">
                <Input
                  id="percentualReceita"
                  type="number"
                  min="0"
                  max="100"
                  value={config.percentualReceita}
                  onChange={(e) => handleConfigChange("percentualReceita", e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Padrão: 60%</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentualComparecimento" className="text-sm font-medium">
                % Comparecimento loja
              </Label>
              <div className="relative">
                <Input
                  id="percentualComparecimento"
                  type="number"
                  min="0"
                  max="100"
                  value={config.percentualComparecimento}
                  onChange={(e) => handleConfigChange("percentualComparecimento", e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Padrão: 50%</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentualConversao" className="text-sm font-medium">
                % Conversão em venda
              </Label>
              <div className="relative">
                <Input
                  id="percentualConversao"
                  type="number"
                  min="0"
                  max="100"
                  value={config.percentualConversao}
                  onChange={(e) => handleConfigChange("percentualConversao", e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Padrão: 66%</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaFaturamentoMensal" className="text-sm font-medium flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Meta Faturamento Mensal
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  R$
                </span>
                <Input
                  id="metaFaturamentoMensal"
                  type="number"
                  min="0"
                  value={config.metaFaturamentoMensal}
                  onChange={(e) => handleConfigChange("metaFaturamentoMensal", e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Padrão: R$ 60.000</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloco 2: Cálculo da Meta - Canal Sua Visão */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            Cálculo da Meta – Canal "Sua Visão"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Passo 1 */}
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                  1
                </span>
                <span className="text-sm font-medium text-muted-foreground">Total atendidos</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {calculations.totalPacientes.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {config.periodos} × {config.mediaAtendimentos} = {calculations.totalPacientes}
              </p>
            </div>

            {/* Passo 2 */}
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                  2
                </span>
                <span className="text-sm font-medium text-muted-foreground">Com receita</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {calculations.pacientesComReceita.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {calculations.totalPacientes} × {config.percentualReceita}% = {calculations.pacientesComReceita.toFixed(0)}
              </p>
            </div>

            {/* Passo 3 */}
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                  3
                </span>
                <span className="text-sm font-medium text-muted-foreground">Comparecem à loja</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {calculations.pacientesComparecem.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {calculations.pacientesComReceita.toFixed(0)} × {config.percentualComparecimento}% = {calculations.pacientesComparecem.toFixed(0)}
              </p>
            </div>

            {/* Meta Final */}
            <div className="bg-primary rounded-lg p-4 text-primary-foreground">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5" />
                <span className="text-sm font-medium opacity-90">Meta de Vendas</span>
              </div>
              <p className="text-3xl font-bold">
                {calculations.metaVendas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs opacity-80 mt-1">
                {calculations.pacientesComparecem.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × {config.percentualConversao}%
              </p>
            </div>

            {/* Super Meta */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5" />
                <span className="text-sm font-medium opacity-90">Super Meta</span>
              </div>
              <p className="text-3xl font-bold">
                {calculations.superMeta.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs opacity-80 mt-1">
                Meta + 20%
              </p>
            </div>
          </div>

          {/* Metas por Período */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Metas por Período ({diasComMedico} dias com médico / {periodosComMedico} períodos)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Meta Diária */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium text-muted-foreground">Meta Diária</span>
                </div>
                <p className="text-2xl font-bold text-blue-500">
                  {calculations.metaDiaria.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculations.metaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ÷ {diasComMedico} dias
                </p>
              </div>

              {/* Meta Semanal */}
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarRange className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-medium text-muted-foreground">Meta Semanal</span>
                </div>
                <p className="text-2xl font-bold text-indigo-500">
                  {calculations.metaSemanal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculations.metaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ÷ 4 semanas
                </p>
              </div>

              {/* Meta Mensal */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Meta Mensal</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {calculations.metaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total do mês
                </p>
              </div>

              {/* Super Meta Diária */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-muted-foreground">Super Diária</span>
                </div>
                <p className="text-2xl font-bold text-amber-500">
                  {calculations.superMetaDiaria.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculations.superMetaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ÷ {diasComMedico} dias
                </p>
              </div>

              {/* Super Meta Semanal */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-medium text-muted-foreground">Super Semanal</span>
                </div>
                <p className="text-2xl font-bold text-orange-500">
                  {calculations.superMetaSemanal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculations.superMetaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ÷ 4 semanas
                </p>
              </div>

              {/* Super Meta Mensal */}
              <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-muted-foreground">Super Mensal</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {calculations.superMetaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Meta + 20%
                </p>
              </div>
            </div>
          </div>

          {/* Metas de Faturamento */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Metas de Faturamento
            </h4>
            
            {/* Card do Ticket Médio em destaque */}
            <div className="mb-4 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/40 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ticket Médio que devemos buscar</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Meta Faturamento (R$ {config.metaFaturamentoMensal.toLocaleString("pt-BR")}) ÷ Meta Vendas ({Math.round(calculations.metaVendas)})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-green-600">
                    R$ {Math.round(calculations.ticketMedio).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Faturamento Diário */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-medium text-muted-foreground">Fat. Diário</span>
                </div>
                <p className="text-2xl font-bold text-green-500">
                  R$ {Math.round(calculations.faturamentoDiario).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {Math.round(calculations.faturamentoMensal).toLocaleString("pt-BR")} ÷ {diasComMedico} dias
                </p>
              </div>

              {/* Faturamento Semanal */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarRange className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium text-muted-foreground">Fat. Semanal</span>
                </div>
                <p className="text-2xl font-bold text-emerald-500">
                  R$ {Math.round(calculations.faturamentoSemanal).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {Math.round(calculations.faturamentoMensal).toLocaleString("pt-BR")} ÷ 4 semanas
                </p>
              </div>

              {/* Faturamento Mensal */}
              <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-teal-500" />
                  <span className="text-xs font-medium text-muted-foreground">Fat. Mensal</span>
                </div>
                <p className="text-2xl font-bold text-teal-500">
                  R$ {Math.round(calculations.faturamentoMensal).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Meta configurada
                </p>
              </div>

              {/* Super Faturamento Diário */}
              <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-lime-600" />
                  <span className="text-xs font-medium text-muted-foreground">Super Diário</span>
                </div>
                <p className="text-2xl font-bold text-lime-600">
                  R$ {Math.round(calculations.superFaturamentoDiario).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {Math.round(calculations.superFaturamentoMensal).toLocaleString("pt-BR")} ÷ {diasComMedico} dias
                </p>
              </div>

              {/* Super Faturamento Semanal */}
              <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-muted-foreground">Super Semanal</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  R$ {Math.round(calculations.superFaturamentoSemanal).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {Math.round(calculations.superFaturamentoMensal).toLocaleString("pt-BR")} ÷ 4 semanas
                </p>
              </div>

              {/* Super Faturamento Mensal */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-green-700" />
                  <span className="text-xs font-medium text-muted-foreground">Super Mensal</span>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  R$ {Math.round(calculations.superFaturamentoMensal).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Meta + 20%
                </p>
              </div>
            </div>
          </div>

          {/* Resumo da fórmula */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Fórmula aplicada:</span>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              Períodos ({config.periodos}) × Média ({config.mediaAtendimentos}) = {calculations.totalPacientes} pacientes
              → × {config.percentualReceita}% = {calculations.pacientesComReceita.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} c/ receita
              → × {config.percentualComparecimento}% = {calculations.pacientesComparecem.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} comparecem
              → × {config.percentualConversao}% = <span className="text-primary font-bold">{calculations.metaVendas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} vendas</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Seção de Acompanhamento Diário */}
      <AcompanhamentoDiarioSection
        schedules={filteredSchedules}
        registros={filteredAcompanhamento}
        onUpdateRegistro={onUpdateAcompanhamento}
        metaDiariaVendas={calculations.metaDiaria}
        metaMensalFaturamento={calculations.faturamentoMensal}
      />
    </div>
  );
}
