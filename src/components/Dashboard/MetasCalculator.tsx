import { useState, useMemo } from "react";
import { Calculator, Settings, Target, TrendingUp, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetasCalculatorProps {
  periodosComMedico: number;
}

interface ConfigValues {
  periodos: number;
  mediaAtendimentos: number;
  percentualReceita: number;
  percentualComparecimento: number;
  percentualConversao: number;
}

export function MetasCalculator({ periodosComMedico }: MetasCalculatorProps) {
  const [config, setConfig] = useState<ConfigValues>({
    periodos: periodosComMedico,
    mediaAtendimentos: 8,
    percentualReceita: 60,
    percentualComparecimento: 50,
    percentualConversao: 66,
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

    return {
      totalPacientes,
      pacientesComReceita,
      pacientesComparecem,
      metaVendas,
      superMeta,
    };
  }, [config]);

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
                {calculations.metaVendas.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs opacity-80 mt-1">
                {calculations.pacientesComparecem.toFixed(0)} × {config.percentualConversao}%
              </p>
            </div>

            {/* Super Meta */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5" />
                <span className="text-sm font-medium opacity-90">Super Meta</span>
              </div>
              <p className="text-3xl font-bold">
                {calculations.superMeta.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs opacity-80 mt-1">
                Meta + 20%
              </p>
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
              → × {config.percentualReceita}% = {calculations.pacientesComReceita.toFixed(0)} c/ receita
              → × {config.percentualComparecimento}% = {calculations.pacientesComparecem.toFixed(0)} comparecem
              → × {config.percentualConversao}% = <span className="text-primary font-bold">{calculations.metaVendas.toFixed(2)} vendas</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
