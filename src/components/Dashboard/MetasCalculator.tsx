import { useState, useMemo } from "react";
import { Calculator, Settings, Target, TrendingUp, Zap, Calendar, CalendarDays, CalendarRange, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetasCalculatorProps {
  diasComMedico: number;
  periodosComMedico: number;
}

interface ConfigValues {
  periodos: number;
  mediaAtendimentos: number;
  percentualReceita: number;
  percentualComparecimento: number;
  percentualConversao: number;
  metaFaturamentoMensal: number;
}

export function MetasCalculator({ diasComMedico, periodosComMedico }: MetasCalculatorProps) {
  const [config, setConfig] = useState<ConfigValues>({
    periodos: periodosComMedico,
    mediaAtendimentos: 8,
    percentualReceita: 60,
    percentualComparecimento: 50,
    percentualConversao: 66,
    metaFaturamentoMensal: 60000,
  });

  // Atualiza períodos quando vem da Agenda
  useMemo(() => {
    if (periodosComMedico > 0 && config.periodos !== periodosComMedico) {
      setConfig(prev => ({ ...prev, periodos: periodosComMedico }));
    }
  }, [periodosComMedico]);

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
                {Math.round(calculations.metaVendas)}
              </p>
              <p className="text-xs opacity-80 mt-1">
                {Math.round(calculations.pacientesComparecem)} × {config.percentualConversao}%
              </p>
            </div>

            {/* Super Meta */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5" />
                <span className="text-sm font-medium opacity-90">Super Meta</span>
              </div>
              <p className="text-3xl font-bold">
                {Math.round(calculations.superMeta)}
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
                  {Math.round(calculations.metaDiaria)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(calculations.metaMensal)} ÷ {diasComMedico} dias
                </p>
              </div>

              {/* Meta Semanal */}
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarRange className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-medium text-muted-foreground">Meta Semanal</span>
                </div>
                <p className="text-2xl font-bold text-indigo-500">
                  {Math.round(calculations.metaSemanal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(calculations.metaMensal)} ÷ 4 semanas
                </p>
              </div>

              {/* Meta Mensal */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Meta Mensal</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {Math.round(calculations.metaMensal)}
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
                  {Math.round(calculations.superMetaDiaria)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(calculations.superMetaMensal)} ÷ {diasComMedico} dias
                </p>
              </div>

              {/* Super Meta Semanal */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-medium text-muted-foreground">Super Semanal</span>
                </div>
                <p className="text-2xl font-bold text-orange-500">
                  {Math.round(calculations.superMetaSemanal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(calculations.superMetaMensal)} ÷ 4 semanas
                </p>
              </div>

              {/* Super Meta Mensal */}
              <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-muted-foreground">Super Mensal</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {Math.round(calculations.superMetaMensal)}
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
              Metas de Faturamento (Ticket Médio: R$ {Math.round(calculations.ticketMedio).toLocaleString("pt-BR")})
            </h4>
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
              → × {config.percentualReceita}% = {Math.round(calculations.pacientesComReceita)} c/ receita
              → × {config.percentualComparecimento}% = {Math.round(calculations.pacientesComparecem)} comparecem
              → × {config.percentualConversao}% = <span className="text-primary font-bold">{Math.round(calculations.metaVendas)} vendas</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
