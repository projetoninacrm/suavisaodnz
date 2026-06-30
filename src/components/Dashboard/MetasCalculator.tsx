import { useState, useMemo, useEffect, useCallback } from "react";
import { Calculator, Settings, Target, TrendingUp, Zap, Calendar, CalendarDays, CalendarRange, DollarSign, ChevronDown, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcompanhamentoDiarioSection } from "./AcompanhamentoDiarioSection";
import { Schedule } from "@/hooks/useSchedules";
import { AcompanhamentoDiario } from "@/hooks/useAcompanhamentoDiario";
import { useMetasConfig } from "@/hooks/useMetasConfig";
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
  
  // ISO format: YYYY-MM-DD
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    const monthNum = parseInt(parts[1], 10);
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      return MONTH_NAMES[monthNum - 1];
    }
    return null;
  }
  
  const parts = dateStr.split("/");
  if (parts.length >= 2) {
    const monthPart = parts[1].toLowerCase().trim();
    if (MONTH_NAMES.includes(monthPart)) {
      return monthPart;
    }
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
  const { getConfigForMonth, saveConfig, isLoading: isLoadingConfig } = useMetasConfig();

  // Detecta meses disponíveis nos schedules
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    schedules.forEach(s => {
      const month = getMonthFromDate(s.date);
      if (month) monthsSet.add(month);
    });
    return MONTH_NAMES.filter(m => monthsSet.has(m));
  }, [schedules]);

  // Estado do filtro de mês - inicia com o mês atual
  const currentMonthIndex = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTH_NAMES[currentMonthIndex]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filtra schedules pelo mês selecionado
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const month = getMonthFromDate(s.date);
      return month === selectedMonth;
    });
  }, [schedules, selectedMonth]);

  // Gera lista de dias para exibir na tabela: todos os dias do mês exceto domingos.
  // Dias sem médico aparecem como placeholders com turnos vazios (peso 0, não entram
  // nos cálculos), mas permitem registrar vendas externas.
  const displaySchedules = useMemo(() => {
    const monthIdx = MONTH_NAMES.indexOf(selectedMonth);
    if (monthIdx < 0) return filteredSchedules;

    // Descobre o ano a partir de um schedule real do mês; fallback ano atual.
    let year = new Date().getFullYear();
    for (const s of filteredSchedules) {
      if (s.date?.includes("-")) {
        const y = parseInt(s.date.split("-")[0], 10);
        if (!isNaN(y)) { year = y; break; }
      } else if (s.date?.includes("/")) {
        const parts = s.date.split("/");
        if (parts[2]) {
          const y = parseInt(parts[2], 10);
          if (!isNaN(y)) { year = y; break; }
        }
      }
    }

    const byDate = new Map<string, Schedule>();
    filteredSchedules.forEach((s) => byDate.set(s.date, s));

    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const result: Schedule[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(year, monthIdx, day);
      if (dt.getDay() === 0) continue; // pula domingos
      const iso = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const existing = byDate.get(iso);
      if (existing) {
        result.push(existing);
      } else {
        const dayNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
        result.push({
          id: `placeholder-${iso}`,
          sheet_name: "Escala",
          date: iso,
          morning_shift: "",
          afternoon_shift: "",
          day_of_week: dayNames[dt.getDay()],
          created_at: "",
          updated_at: "",
        });
      }
    }
    return result;
  }, [filteredSchedules, selectedMonth]);

  // Filtra registros de acompanhamento pelo mês selecionado
  const filteredAcompanhamento = useMemo(() => {
    return acompanhamentoRegistros.filter(r => {
      const month = getMonthFromDate(r.data);
      return month === selectedMonth;
    });
  }, [acompanhamentoRegistros, selectedMonth]);

  // Calcula diasComMedico, periodosComMedico e peso dos dias baseados no mês filtrado
  // Dias com 2 períodos = peso 1, dias com 1 período = peso 0.5
  const { diasComMedico, periodosComMedico, diasCompletos, diasMeios, pesoTotalDias } = useMemo(() => {
    let dias = 0;
    let periodos = 0;
    let completos = 0; // dias com 2 períodos
    let meios = 0; // dias com apenas 1 período
    
    filteredSchedules.forEach((schedule) => {
      const temManha = schedule.morning_shift && schedule.morning_shift.trim() !== "";
      const temTarde = schedule.afternoon_shift && schedule.afternoon_shift.trim() !== "";
      
      if (temManha) periodos += 1;
      if (temTarde) periodos += 1;
      
      if (temManha && temTarde) {
        dias += 1;
        completos += 1;
      } else if (temManha || temTarde) {
        dias += 1;
        meios += 1;
      }
    });
    
    // Peso total: dias completos contam 1, meios contam 0.5
    const pesoTotal = completos + (meios * 0.5);
    
    return { 
      diasComMedico: dias, 
      periodosComMedico: periodos,
      diasCompletos: completos,
      diasMeios: meios,
      pesoTotalDias: pesoTotal
    };
  }, [filteredSchedules]);

  // Estado local das configurações
  const [config, setConfig] = useState<ConfigValues>({
    periodos: 0,
    mediaAtendimentos: 8,
    percentualReceita: 60,
    percentualComparecimento: 50,
    percentualConversao: 66,
    metaFaturamentoMensal: 60000,
  });

  // Carrega configuração do mês selecionado
  useEffect(() => {
    if (!isLoadingConfig) {
      const monthConfig = getConfigForMonth(selectedMonth);
      setConfig({
        periodos: periodosComMedico > 0 ? periodosComMedico : (monthConfig.periodos || 0),
        mediaAtendimentos: monthConfig.media_atendimentos,
        percentualReceita: monthConfig.percentual_receita,
        percentualComparecimento: monthConfig.percentual_comparecimento,
        percentualConversao: monthConfig.percentual_conversao,
        metaFaturamentoMensal: monthConfig.meta_faturamento_mensal,
      });
      setMediaAtendimentosText(String(monthConfig.media_atendimentos).replace(".", ","));
      setHasUnsavedChanges(false);
    }
  }, [selectedMonth, isLoadingConfig, getConfigForMonth, periodosComMedico]);

  // Atualiza períodos quando muda a escala
  useEffect(() => {
    if (periodosComMedico > 0) {
      setConfig(prev => {
        if (prev.periodos !== periodosComMedico) {
          setHasUnsavedChanges(true);
          return { ...prev, periodos: periodosComMedico };
        }
        return prev;
      });
    }
  }, [periodosComMedico]);

  const [mediaAtendimentosText, setMediaAtendimentosText] = useState("");

  const handleConfigChange = (field: keyof ConfigValues, value: string) => {
    if (field === "mediaAtendimentos") {
      // Allow comma as decimal separator and keep raw text for editing
      const sanitized = value.replace(",", ".");
      setMediaAtendimentosText(value);
      const numValue = parseFloat(sanitized) || 0;
      setConfig(prev => ({ ...prev, [field]: numValue }));
    } else {
      const numValue = parseFloat(value) || 0;
      setConfig(prev => ({ ...prev, [field]: numValue }));
    }
    setHasUnsavedChanges(true);
  };

  const handleSaveConfig = useCallback(() => {
    saveConfig({
      mes: selectedMonth,
      periodos: config.periodos,
      media_atendimentos: config.mediaAtendimentos,
      percentual_receita: config.percentualReceita,
      percentual_comparecimento: config.percentualComparecimento,
      percentual_conversao: config.percentualConversao,
      meta_faturamento_mensal: config.metaFaturamentoMensal,
    });
    setHasUnsavedChanges(false);
  }, [saveConfig, selectedMonth, config]);

  // Quando não há escala no mês (pesoTotalDias = 0), usamos os dias úteis exibidos
  // (todos os dias do mês exceto domingos) como base de distribuição para que a
  // Meta de Faturamento configurada apareça mesmo sem escala definida.
  const diasUteisFallback = useMemo(
    () => displaySchedules.length,
    [displaySchedules]
  );
  const pesoDistribuicao = pesoTotalDias > 0 ? pesoTotalDias : diasUteisFallback;

  // Cálculos da meta
  const calculations = useMemo(() => {
    const totalPacientes = config.periodos * config.mediaAtendimentos;
    const pacientesComReceita = totalPacientes * (config.percentualReceita / 100);
    const pacientesComparecem = pacientesComReceita * (config.percentualComparecimento / 100);
    const metaVendas = pacientesComparecem * (config.percentualConversao / 100);

    const superMeta = metaVendas * 1.2;
    
    // Metas por período - agora usa pesoTotalDias para distribuição justa
    // Dias com 2 períodos = peso 1, dias com 1 período = peso 0.5
    const metaMensal = metaVendas;
    
    // Meta diária base: dividida pelo peso total (considera dias meio período)
    // Ex: 22 dias completos + 4 meios = peso 24 (22 + 4*0.5)
    // Meta diária completa = mensal / 24, meta dia meio = (mensal / 24) / 2
    const metaDiariaBase = pesoDistribuicao > 0 ? metaVendas / pesoDistribuicao : 0;
    const metaDiariaCompleta = metaDiariaBase; // para dias com 2 períodos
    const metaDiariaMeio = metaDiariaBase * 0.5; // para dias com 1 período
    
    const metaDiaria = metaDiariaCompleta; // valor de referência (dia completo)
    const metaSemanal = metaVendas / 4;
    const superMetaMensal = superMeta;
    const superMetaDiariaCompleta = pesoDistribuicao > 0 ? superMeta / pesoDistribuicao : 0;
    const superMetaDiariaMeio = superMetaDiariaCompleta * 0.5;
    const superMetaDiaria = superMetaDiariaCompleta;
    const superMetaSemanal = superMeta / 4;

    // Faturamento com mesma lógica de distribuição
    const ticketMedio = metaVendas > 0 ? config.metaFaturamentoMensal / metaVendas : 0;
    const faturamentoMensal = config.metaFaturamentoMensal;
    const faturamentoDiarioBase = pesoDistribuicao > 0 ? faturamentoMensal / pesoDistribuicao : 0;
    const faturamentoDiarioCompleto = faturamentoDiarioBase;
    const faturamentoDiarioMeio = faturamentoDiarioBase * 0.5;
    const faturamentoDiario = faturamentoDiarioCompleto; // referência
    const faturamentoSemanal = faturamentoMensal / 4;
    const superFaturamentoMensal = faturamentoMensal * 1.2;
    const superFaturamentoDiarioCompleto = pesoDistribuicao > 0 ? superFaturamentoMensal / pesoDistribuicao : 0;
    const superFaturamentoDiarioMeio = superFaturamentoDiarioCompleto * 0.5;
    const superFaturamentoDiario = superFaturamentoDiarioCompleto;
    const superFaturamentoSemanal = superFaturamentoMensal / 4;

    return {
      totalPacientes,
      pacientesComReceita,
      pacientesComparecem,
      metaVendas,
      superMeta,
      metaMensal,
      metaDiaria,
      metaDiariaCompleta,
      metaDiariaMeio,
      metaSemanal,
      superMetaMensal,
      superMetaDiaria,
      superMetaDiariaCompleta,
      superMetaDiariaMeio,
      superMetaSemanal,
      ticketMedio,
      faturamentoMensal,
      faturamentoDiario,
      faturamentoDiarioCompleto,
      faturamentoDiarioMeio,
      faturamentoSemanal,
      superFaturamentoMensal,
      superFaturamentoDiario,
      superFaturamentoDiarioCompleto,
      superFaturamentoDiarioMeio,
      superFaturamentoSemanal,
    };
  }, [config, pesoDistribuicao]);

  // Peso por dia ajustado pela quinzena: 1ª quinzena (dias 1-15) = 60%,
  // 2ª quinzena (dias 16-31) = 40% do peso total. Isso reflete a sazonalidade
  // histórica observada (média jan-mai). O peso total é preservado.
  const pesoPorDia = useMemo(() => {
    const map: Record<string, number> = {};

    // Sem escala: distribui peso 1 para cada dia útil exibido (exceto domingos),
    // ainda aplicando o ajuste 60/40 por quinzena.
    if (pesoTotalDias === 0 && displaySchedules.length > 0) {
      const totalQ1 = displaySchedules.filter((s) => {
        const day = s.date.includes("-") ? parseInt(s.date.split("-")[2], 10) : parseInt(s.date.split("/")[0], 10);
        return !isNaN(day) && day <= 15;
      }).length;
      const totalQ2 = displaySchedules.length - totalQ1;
      const totalPeso = displaySchedules.length;
      const fatorQ1 = totalQ1 > 0 ? (0.6 * totalPeso) / totalQ1 : 1;
      const fatorQ2 = totalQ2 > 0 ? (0.4 * totalPeso) / totalQ2 : 1;
      displaySchedules.forEach((s) => {
        const day = s.date.includes("-") ? parseInt(s.date.split("-")[2], 10) : parseInt(s.date.split("/")[0], 10);
        if (isNaN(day)) return;
        map[s.date] = day <= 15 ? fatorQ1 : fatorQ2;
      });
      return map;
    }

    // Calcula peso base (1 ou 0.5) por dia e separa por quinzena
    const diasInfo = filteredSchedules
      .map((s) => {
        const temManha = s.morning_shift && s.morning_shift.trim() !== "";
        const temTarde = s.afternoon_shift && s.afternoon_shift.trim() !== "";
        const pesoBase = temManha && temTarde ? 1 : temManha || temTarde ? 0.5 : 0;
        if (pesoBase === 0) return null;

        // Extrai o dia do mês (suporta DD/mes, DD/MM/YYYY, YYYY-MM-DD)
        let dayOfMonth = 0;
        if (s.date.includes("-")) {
          dayOfMonth = parseInt(s.date.split("-")[2], 10);
        } else {
          dayOfMonth = parseInt(s.date.split("/")[0], 10);
        }
        if (isNaN(dayOfMonth)) return null;

        return { date: s.date, pesoBase, quinzena: dayOfMonth <= 15 ? 1 : 2 };
      })
      .filter((x): x is { date: string; pesoBase: number; quinzena: number } => x !== null);

    const pesoBaseQ1 = diasInfo.filter((d) => d.quinzena === 1).reduce((s, d) => s + d.pesoBase, 0);
    const pesoBaseQ2 = diasInfo.filter((d) => d.quinzena === 2).reduce((s, d) => s + d.pesoBase, 0);

    // Fatores de escala: redistribui o peso total para 60/40 entre as quinzenas
    const fatorQ1 = pesoBaseQ1 > 0 ? (0.6 * pesoTotalDias) / pesoBaseQ1 : 1;
    const fatorQ2 = pesoBaseQ2 > 0 ? (0.4 * pesoTotalDias) / pesoBaseQ2 : 1;

    diasInfo.forEach((d) => {
      const fator = d.quinzena === 1 ? fatorQ1 : fatorQ2;
      map[d.date] = d.pesoBase * fator;
    });

    return map;
  }, [filteredSchedules, pesoTotalDias, displaySchedules]);

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
                  {MONTH_NAMES.map((month) => {
                    const hasScheduleData = availableMonths.includes(month);
                    return (
                      <div
                        key={month}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                          selectedMonth === month
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedMonth(month)}
                      >
                        <span className="text-sm font-medium">{MONTH_LABELS[month]}</span>
                        {!hasScheduleData && (
                          <span className={`text-xs ${selectedMonth === month ? "opacity-80" : "text-muted-foreground"}`}>
                            sem escala
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-sm text-muted-foreground">
              ({diasCompletos} dias completos + {diasMeios} meio período = peso {pesoTotalDias.toFixed(1)} / {periodosComMedico} períodos)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Bloco 1: Configurações Gerais */}
      <Card className={`border-border ${hasUnsavedChanges ? "ring-2 ring-amber-500/50" : ""}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5 text-primary" />
              Configurações Gerais - {MONTH_LABELS[selectedMonth]}
            </CardTitle>
            <Button 
              onClick={handleSaveConfig}
              variant={hasUnsavedChanges ? "default" : "outline"}
              size="sm"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {hasUnsavedChanges ? "Salvar Alterações" : "Salvo"}
            </Button>
          </div>
          {hasUnsavedChanges && (
            <p className="text-xs text-amber-600 mt-2">
              Você tem alterações não salvas. Clique em "Salvar Alterações" para guardar.
            </p>
          )}
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
                  type="text"
                  inputMode="decimal"
                  value={mediaAtendimentosText}
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
              Metas por Período ({diasCompletos} dias completos + {diasMeios} meio período = peso {pesoTotalDias.toFixed(1)})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {/* Meta Diária Completa */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium text-muted-foreground">Meta Dia Completo</span>
                </div>
                <p className="text-2xl font-bold text-blue-500">
                  {calculations.metaDiariaCompleta.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculations.metaMensal.toFixed(2)} ÷ {pesoTotalDias.toFixed(1)}
                </p>
              </div>

              {/* Meta Dia Meio Período */}
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-sky-500" />
                  <span className="text-xs font-medium text-muted-foreground">Meta Meio Período</span>
                </div>
                <p className="text-2xl font-bold text-sky-500">
                  {calculations.metaDiariaMeio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  50% da meta diária
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

              {/* Super Meta Dia Completo */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-muted-foreground">Super Dia Completo</span>
                </div>
                <p className="text-2xl font-bold text-amber-500">
                  {calculations.superMetaDiariaCompleta.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculations.superMetaMensal.toFixed(2)} ÷ {pesoTotalDias.toFixed(1)}
                </p>
              </div>

              {/* Super Meta Meio Período */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-medium text-muted-foreground">Super Meio Período</span>
                </div>
                <p className="text-2xl font-bold text-orange-500">
                  {calculations.superMetaDiariaMeio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  50% da super diária
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

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {/* Faturamento Dia Completo */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-medium text-muted-foreground">Fat. Dia Completo</span>
                </div>
                <p className="text-2xl font-bold text-green-500">
                  R$ {Math.round(calculations.faturamentoDiarioCompleto).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {Math.round(calculations.faturamentoMensal).toLocaleString("pt-BR")} ÷ {pesoTotalDias.toFixed(1)}
                </p>
              </div>

              {/* Faturamento Meio Período */}
              <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-teal-500" />
                  <span className="text-xs font-medium text-muted-foreground">Fat. Meio Período</span>
                </div>
                <p className="text-2xl font-bold text-teal-500">
                  R$ {Math.round(calculations.faturamentoDiarioMeio).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  50% do fat. dia completo
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

              {/* Super Fat. Dia Completo */}
              <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-lime-600" />
                  <span className="text-xs font-medium text-muted-foreground">Super Dia Completo</span>
                </div>
                <p className="text-2xl font-bold text-lime-600">
                  R$ {Math.round(calculations.superFaturamentoDiarioCompleto).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {Math.round(calculations.superFaturamentoMensal).toLocaleString("pt-BR")} ÷ {pesoTotalDias.toFixed(1)}
                </p>
              </div>

              {/* Super Fat. Meio Período */}
              <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-muted-foreground">Super Meio Período</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  R$ {Math.round(calculations.superFaturamentoDiarioMeio).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  50% do super dia completo
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
        schedules={displaySchedules}
        registros={filteredAcompanhamento}
        onUpdateRegistro={onUpdateAcompanhamento}
        metaDiariaVendasCompleta={calculations.metaDiariaCompleta}
        metaDiariaVendasMeio={calculations.metaDiariaMeio}
        metaFaturamentoDiarioCompleto={calculations.faturamentoDiarioCompleto}
        metaFaturamentoDiarioMeio={calculations.faturamentoDiarioMeio}
        metaMensalFaturamento={calculations.faturamentoMensal}
        pesoTotalDias={pesoTotalDias}
        pesoPorDia={pesoPorDia}
      />
    </div>
  );
}
