import { useState, useMemo, useEffect, useCallback } from "react";
import { Calculator, Settings, Target, TrendingUp, Zap, Calendar, CalendarDays, CalendarRange, DollarSign, Save, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcompanhamentoDiarioSection } from "./AcompanhamentoDiarioSection";
import { Schedule } from "@/hooks/useSchedules";
import { AcompanhamentoDiario } from "@/hooks/useAcompanhamentoDiario";
import { useMetasConfig } from "@/hooks/useMetasConfig";
import { useRouteState } from "@/hooks/useRouteState";
import { calculateMonthlyGoalMetrics } from "@/lib/reportCalculations";
import { Button } from "@/components/ui/button";
import { SelectFilter } from "@/components/data/SelectFilter";
import { DataState } from "@/components/data/DataState";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function getCurrentTargetsMonth(): string {
  return MONTH_NAMES[new Date().getMonth()];
}

function parseTargetsMonth(value: unknown): string {
  return typeof value === "string" && MONTH_NAMES.includes(value) ? value : getCurrentTargetsMonth();
}

const LEGACY_SCHEDULE_YEAR = 2026;
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
  onUpdateAcompanhamento: (data: string, field: "vendas_realizadas" | "faturamento_realizado", value: number | null) => Promise<boolean>;
  isSourceLoading?: boolean;
  sourceError?: string | null;
  onRetrySources?: () => void;
  view?: "all" | "targets" | "tracking";
}

interface ConfigValues {
  periodos: number;
  mediaAtendimentos: number;
  percentualReceita: number;
  percentualComparecimento: number;
  percentualConversao: number;
  metaFaturamentoMensal: number;
  vendasLoja: number;
  vendasInternet: number;
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

function getYearFromDate(dateStr: string): number | null {
  if (!dateStr) return null;
  if (dateStr.includes("-")) {
    const year = Number(dateStr.split("-")[0]);
    return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
  }

  const parts = dateStr.split("/");
  if (parts.length >= 3) {
    const year = Number(parts[2]);
    return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
  }
  if (parts.length === 2 && MONTH_NAMES.includes(parts[1].toLowerCase().trim())) return LEGACY_SCHEDULE_YEAR;
  return null;
}

export function MetasCalculator({ 
  schedules, 
  acompanhamentoRegistros, 
  onUpdateAcompanhamento,
  isSourceLoading = false,
  sourceError = null,
  onRetrySources,
  view = "all",
}: MetasCalculatorProps) {
  const { getConfigForMonth, saveConfig, isLoading: isLoadingConfig, error: configError, fetchConfigs } = useMetasConfig();

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
  const [selectedMonth, setSelectedMonth] = useRouteState<string>("targetsMonth", getCurrentTargetsMonth, parseTargetsMonth);
  const [pendingMonth, setPendingMonth] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const handleMonthChange = (month: string) => {
    if (month === selectedMonth) return;
    if (hasUnsavedChanges) {
      setPendingMonth(month);
      return;
    }
    setSelectedMonth(month);
  };

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

    // Normaliza a chave para o formato ISO YYYY-MM-DD, independentemente de como
    // a data está salva (ISO, DD/mes ou DD/MM/YYYY) — assim os schedules legados
    // (ex.: "01/jul") batem com o placeholder ISO gerado abaixo.
    const toIsoKey = (raw: string): string | null => {
      if (!raw) return null;
      if (raw.includes("-")) {
        const [y, m, d] = raw.split("-");
        if (y && m && d) return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        return null;
      }
      const parts = raw.split("/");
      const day = parseInt(parts[0], 10);
      if (isNaN(day)) return null;
      const monthPart = (parts[1] || "").toLowerCase().trim();
      let mIdx = MONTH_NAMES.indexOf(monthPart);
      if (mIdx < 0) {
        const mNum = parseInt(monthPart, 10);
        if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) mIdx = mNum - 1;
      }
      if (mIdx < 0) return null;
      const y = parts[2] ? parseInt(parts[2], 10) : year;
      if (isNaN(y)) return null;
      return `${y}-${String(mIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    };

    const byDate = new Map<string, Schedule>();
    filteredSchedules.forEach((s) => {
      const key = toIsoKey(s.date);
      if (key) byDate.set(key, s);
      // Também guarda pelo valor original como fallback
      byDate.set(s.date, s);
    });

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
          morning_shift_professional_id: null,
          afternoon_shift: "",
          afternoon_shift_professional_id: null,
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

  const selectedMonthScope = useMemo(() => {
    const years = new Set<number>();
    let hasYearlessRecords = false;
    const collect = (date: string) => {
      if (getMonthFromDate(date) !== selectedMonth) return;
      const year = getYearFromDate(date);
      if (year === null) hasYearlessRecords = true;
      else years.add(year);
    };
    schedules.forEach((schedule) => collect(schedule.date));
    acompanhamentoRegistros.forEach((record) => collect(record.data));
    return { years: [...years].sort((a, b) => a - b), hasYearlessRecords };
  }, [acompanhamentoRegistros, schedules, selectedMonth]);

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
    vendasLoja: 0,
    vendasInternet: 0,
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
        vendasLoja: monthConfig.vendas_loja ?? 0,
        vendasInternet: monthConfig.vendas_internet ?? 0,
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
    setIsConfigOpen(true);
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

  const handleSaveConfig = useCallback(async () => {
    setIsSavingConfig(true);
    try {
      const saved = await saveConfig({
        mes: selectedMonth,
        periodos: config.periodos,
        media_atendimentos: config.mediaAtendimentos,
        percentual_receita: config.percentualReceita,
        percentual_comparecimento: config.percentualComparecimento,
        percentual_conversao: config.percentualConversao,
        meta_faturamento_mensal: config.metaFaturamentoMensal,
        vendas_loja: config.vendasLoja,
        vendas_internet: config.vendasInternet,
      });
      if (saved) setHasUnsavedChanges(false);
      return saved;
    } finally {
      setIsSavingConfig(false);
    }
  }, [saveConfig, selectedMonth, config]);

  const handleSaveAndSwitchMonth = async () => {
    const nextMonth = pendingMonth;
    const saved = await handleSaveConfig();
    if (saved && nextMonth) {
      setSelectedMonth(nextMonth);
      setPendingMonth(null);
    }
  };

  // Quando não há escala no mês (pesoTotalDias = 0), usamos os dias úteis exibidos
  // (todos os dias do mês exceto domingos) como base de distribuição para que a
  // Meta de Faturamento configurada apareça mesmo sem escala definida.
  const diasUteisFallback = useMemo(
    () => displaySchedules.length,
    [displaySchedules]
  );
  const pesoDistribuicao = pesoTotalDias > 0 ? pesoTotalDias : diasUteisFallback;

  // Cálculos da meta
  const calculations = useMemo(
    () => calculateMonthlyGoalMetrics(config, pesoDistribuicao),
    [config, pesoDistribuicao],
  );

  // Distribuição uniforme ao longo do mês: cada dia recebe apenas o seu peso
  // base (2 períodos = 1, 1 período = 0.5). Sem ajuste por quinzena.
  const pesoPorDia = useMemo(() => {
    const map: Record<string, number> = {};

    // Sem escala: distribui peso 1 para cada dia útil exibido (exceto domingos).
    if (pesoTotalDias === 0 && displaySchedules.length > 0) {
      displaySchedules.forEach((s) => {
        const day = s.date.includes("-") ? parseInt(s.date.split("-")[2], 10) : parseInt(s.date.split("/")[0], 10);
        if (isNaN(day)) return;
        map[s.date] = 1;
      });
      return map;
    }

    // Calcula peso base (1 ou 0.5) por dia
    filteredSchedules
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

        return { date: s.date, pesoBase };
      })
      .filter((x): x is { date: string; pesoBase: number } => x !== null)
      .forEach((d) => {
        map[d.date] = d.pesoBase;
      });

    return map;
  }, [filteredSchedules, pesoTotalDias, displaySchedules]);

  if (sourceError || configError) {
    return (
      <DataState
        variant="error"
        title="Resultados de metas indisponíveis"
        description={`${sourceError || ""} ${configError || ""}`.trim()}
        action={{ label: "Tentar novamente", onClick: () => { onRetrySources?.(); void fetchConfigs(); } }}
      />
    );
  }

  if (isSourceLoading || isLoadingConfig) {
    return <DataState variant="loading" title="Carregando resultados" description="Consultando escala, realizado e configurações de metas." />;
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Mês */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <SelectFilter
              id="metas-month"
              label="Mês:"
              value={selectedMonth}
              onValueChange={handleMonthChange}
              options={MONTH_NAMES.map((month) => ({
                value: month,
                label: `${MONTH_LABELS[month]}${!availableMonths.includes(month) ? " · sem escala" : ""}`,
              }))}
              labelAdornment={<Calendar aria-hidden="true" className="size-4 text-primary" />}
              placeholder="Selecione o mês"
              disabled={isSavingConfig}
              orientation="horizontal"
              triggerClassName="min-w-[180px]"
            />
            <div role="note" className="basis-full min-w-0 text-sm text-muted-foreground sm:basis-0 sm:flex-1">
              {pesoTotalDias > 0 ? (
                <p>
                  Base de distribuição da escala: {diasCompletos} dias completos + {diasMeios} dias de meio período = peso {pesoTotalDias.toFixed(1)} ({periodosComMedico} períodos preenchidos). Dia completo vale 1; meio período, 0,5.
                </p>
              ) : (
                <p>
                  Sem turnos preenchidos na escala. A previsão de atendimentos usa {config.periodos} períodos cadastrados; a meta de faturamento é distribuída pelos {diasUteisFallback} dias exibidos do mês, exceto domingos.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {(selectedMonthScope.years.length > 1 || selectedMonthScope.hasYearlessRecords) && (
        <div role="note" className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-muted-foreground">
          <CalendarRange aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
          <p>
            Os dados de {MONTH_LABELS[selectedMonth]} são agrupados por mês nesta tela.
            {selectedMonthScope.years.length > 1 && <> Há registros de {selectedMonthScope.years.join(" e ")} no mesmo cálculo.</>}
            {selectedMonthScope.hasYearlessRecords && " Há também registros sem ano explícito."}
            {" "}As fórmulas permanecem inalteradas enquanto a separação por ano é validada.
          </p>
        </div>
      )}

      <AlertDialog
        open={Boolean(pendingMonth)}
        onOpenChange={(open) => { if (!open) setPendingMonth(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Há alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              As configurações de {MONTH_LABELS[selectedMonth]} foram alteradas. Salve antes de trocar para {pendingMonth ? MONTH_LABELS[pendingMonth] : "outro mês"}, descarte o rascunho ou continue editando.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingConfig}>Continuar editando</AlertDialogCancel>
            <Button type="button" variant="outline" disabled={isSavingConfig} onClick={() => void handleSaveAndSwitchMonth()}>
              {isSavingConfig ? "Salvando…" : "Salvar e trocar mês"}
            </Button>
            <AlertDialogAction
              disabled={isSavingConfig}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingMonth) setSelectedMonth(pendingMonth);
                setPendingMonth(null);
              }}
            >
              Descartar e trocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {view !== "tracking" && (
        <>
      {/* Bloco 1: Configurações Gerais */}
      <Card className={`border-border ${hasUnsavedChanges ? "ring-2 ring-warning/50" : ""}`}>
        <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-primary" />
                Parâmetros da meta · {MONTH_LABELS[selectedMonth]}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {config.periodos} períodos com médico · {hasUnsavedChanges ? "Alterações não salvas" : "Configuração salva"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => void handleSaveConfig()}
                variant={hasUnsavedChanges ? "default" : "outline"}
                size="sm"
                disabled={!hasUnsavedChanges || isSavingConfig}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSavingConfig ? "Salvando…" : hasUnsavedChanges ? "Salvar alterações" : "Salvo"}
              </Button>
              <CollapsibleTrigger render={
                <Button type="button" variant="outline" size="sm" className="gap-2">
                  {isConfigOpen ? "Ocultar parâmetros" : "Editar parâmetros"}
                  {isConfigOpen ? <ChevronUp aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}
                </Button>
              } />
            </div>
          </div>
          {hasUnsavedChanges && (
            <p className="mt-2 text-xs text-warning-foreground">
              Você tem alterações não salvas. Clique em “Salvar alterações” para guardar.
            </p>
          )}
        </CardHeader>
        <CollapsibleContent>
        <CardContent className="border-t pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                Média de atendimentos
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
                % de atendimentos com receita
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
                % de comparecimento à loja
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
                % de conversão em venda
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
                Meta mensal de faturamento
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

            {([["vendasLoja", "Vendas esperadas · Loja"], ["vendasInternet", "Vendas esperadas · Internet"]] as const).map(([field, label]) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={`expected-sales-${field}`} className="text-sm font-medium">{label}</Label>
                <Input
                  id={`expected-sales-${field}`}
                  type="number"
                  min={0}
                  value={config[field] || ""}
                  placeholder="0"
                  onChange={(event) => handleConfigChange(field, event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Somado à meta total de vendas</p>
              </div>
            ))}
          </div>
        </CardContent>
        </CollapsibleContent>
        </Collapsible>
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
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <dt className="text-sm font-medium text-muted-foreground">Meta de vendas</dt>
              <dd className="mt-2 text-2xl font-bold tabular-nums text-primary">
                {calculations.metaVendas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">Sua Visão + Loja + Internet</p>
            </div>
            <div className="rounded-lg border border-success/20 bg-success/5 p-4">
              <dt className="text-sm font-medium text-muted-foreground">Faturamento mensal</dt>
              <dd className="mt-2 text-2xl font-bold tabular-nums text-success-foreground">
                R$ {calculations.faturamentoMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">Valor configurado para o mês</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <dt className="text-sm font-medium text-muted-foreground">Ticket médio planejado</dt>
              <dd className="mt-2 text-2xl font-bold tabular-nums">
                R$ {calculations.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">Faturamento ÷ meta de vendas</p>
            </div>
            <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
              <dt className="text-sm font-medium text-muted-foreground">Supermeta</dt>
              <dd className="mt-2 text-2xl font-bold tabular-nums text-warning-foreground">
                {calculations.superMeta.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">Meta de vendas + 20%</p>
            </div>
          </dl>

          <Collapsible open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen} className="mt-6 rounded-lg border border-border">
            <div className="p-2">
              <CollapsibleTrigger render={
                <Button variant="ghost" className="h-auto w-full min-w-0 whitespace-normal justify-between px-3 py-2 text-left hover:bg-muted/50">
                  <span className="min-w-0 break-words">
                    <span className="block text-sm font-medium">Composição da meta e distribuição por período</span>
                    <span className="mt-1 block break-words text-xs font-normal text-muted-foreground">Etapas intermediárias, metas diárias e semanais, faturamento e fórmulas</span>
                  </span>
                  {isBreakdownOpen ? <ChevronUp aria-hidden="true" className="size-4 shrink-0" /> : <ChevronDown aria-hidden="true" className="size-4 shrink-0" />}
                </Button>
              } />
            </div>
            <CollapsibleContent>
            <div className="space-y-6 border-t p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Passo 1 */}
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold dark:text-foreground">
                  1
                </span>
                <span className="text-sm font-medium text-muted-foreground">Atendimentos previstos</span>
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
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold dark:text-foreground">
                  2
                </span>
                <span className="text-sm font-medium text-muted-foreground">Atendimentos com receita</span>
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
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold dark:text-foreground">
                  3
                </span>
                <span className="text-sm font-medium text-muted-foreground">Comparecimentos à loja</span>
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
                Sua Visão {calculations.metaVendasSuaVisao.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} + Loja {config.vendasLoja} + Internet {config.vendasInternet}
              </p>
            </div>

            {/* Super Meta */}
            <div className="rounded-lg border border-warning/20 bg-warning/10 p-4 text-warning-foreground">
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

          {/* Outros canais: Loja e Internet */}
          <div className="mt-6 rounded-lg border border-border bg-card p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Vendas esperadas – Sua Visão</p>
              <p className="text-2xl font-bold text-foreground">
                {calculations.metaVendasSuaVisao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{calculations.pacientesComparecem.toFixed(2)} × {config.percentualConversao}%</p>
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
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Meta Dia Completo</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {calculations.metaDiariaCompleta.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculations.metaMensal.toFixed(2)} ÷ {pesoTotalDias.toFixed(1)}
                </p>
              </div>

              {/* Meta Dia Meio Período */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Meta Meio Período</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {calculations.metaDiariaMeio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  50% da meta diária
                </p>
              </div>

              {/* Meta Semanal */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarRange className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Meta Semanal</span>
                </div>
                <p className="text-2xl font-bold text-primary">
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
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-warning-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Super Dia Completo</span>
                </div>
                <p className="text-2xl font-bold text-warning-foreground">
                  {calculations.superMetaDiariaCompleta.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculations.superMetaMensal.toFixed(2)} ÷ {pesoTotalDias.toFixed(1)}
                </p>
              </div>

              {/* Super Meta Meio Período */}
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-warning-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Super Meio Período</span>
                </div>
                <p className="text-2xl font-bold text-warning-foreground">
                  {calculations.superMetaDiariaMeio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  50% da super diária
                </p>
              </div>

              {/* Super Meta Semanal */}
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-warning-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Super Semanal</span>
                </div>
                <p className="text-2xl font-bold text-warning-foreground">
                  {calculations.superMetaSemanal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculations.superMetaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ÷ 4 semanas
                </p>
              </div>

              {/* Super Meta Mensal */}
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-warning-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Super Mensal</span>
                </div>
                <p className="text-2xl font-bold text-warning-foreground">
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
              <DollarSign className="h-4 w-4 text-success-foreground" />
              Metas de Faturamento
            </h4>
            
            {/* Card do Ticket Médio em destaque */}
            <div className="mb-4 rounded-lg border border-success/20 bg-success/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ticket Médio que devemos buscar</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Meta Faturamento (R$ {config.metaFaturamentoMensal.toLocaleString("pt-BR")}) ÷ Meta Vendas ({Math.round(calculations.metaVendas)})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-success-foreground">
                    R$ {Math.round(calculations.ticketMedio).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {/* Faturamento Dia Completo */}
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-success-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Fat. Dia Completo</span>
                </div>
                <p className="text-2xl font-bold text-success-foreground">
                  R$ {Math.round(calculations.faturamentoDiarioCompleto).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {Math.round(calculations.faturamentoMensal).toLocaleString("pt-BR")} ÷ {pesoTotalDias.toFixed(1)}
                </p>
              </div>

              {/* Faturamento Meio Período */}
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-success-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Fat. Meio Período</span>
                </div>
                <p className="text-2xl font-bold text-success-foreground">
                  R$ {Math.round(calculations.faturamentoDiarioMeio).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  50% do fat. dia completo
                </p>
              </div>

              {/* Faturamento Semanal */}
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarRange className="h-4 w-4 text-success-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Fat. Semanal</span>
                </div>
                <p className="text-2xl font-bold text-success-foreground">
                  R$ {Math.round(calculations.faturamentoSemanal).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {Math.round(calculations.faturamentoMensal).toLocaleString("pt-BR")} ÷ 4 semanas
                </p>
              </div>

              {/* Faturamento Mensal */}
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-success-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Fat. Mensal</span>
                </div>
                <p className="text-2xl font-bold text-success-foreground">
                  R$ {Math.round(calculations.faturamentoMensal).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Meta configurada
                </p>
              </div>

              {/* Super Fat. Dia Completo */}
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-warning-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Super Dia Completo</span>
                </div>
                <p className="text-2xl font-bold text-warning-foreground">
                  R$ {Math.round(calculations.superFaturamentoDiarioCompleto).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {Math.round(calculations.superFaturamentoMensal).toLocaleString("pt-BR")} ÷ {pesoTotalDias.toFixed(1)}
                </p>
              </div>

              {/* Super Fat. Meio Período */}
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-success-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Super Meio Período</span>
                </div>
                <p className="text-2xl font-bold text-success-foreground">
                  R$ {Math.round(calculations.superFaturamentoDiarioMeio).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  50% do super dia completo
                </p>
              </div>

              {/* Super Faturamento Semanal */}
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-success-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Super Semanal</span>
                </div>
                <p className="text-2xl font-bold text-success-foreground">
                  R$ {Math.round(calculations.superFaturamentoSemanal).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {Math.round(calculations.superFaturamentoMensal).toLocaleString("pt-BR")} ÷ 4 semanas
                </p>
              </div>

              {/* Super Faturamento Mensal */}
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-success-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Super Mensal</span>
                </div>
                <p className="text-2xl font-bold text-success-foreground">
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
              Períodos ({config.periodos}) × Média de atendimentos ({config.mediaAtendimentos}) = {calculations.totalPacientes} atendimentos previstos
              → × {config.percentualReceita}% = {calculations.pacientesComReceita.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} atendimentos com receita
              → × {config.percentualComparecimento}% = {calculations.pacientesComparecem.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} comparecimentos à loja
              → × {config.percentualConversao}% = <span className="text-primary font-bold">{calculations.metaVendas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} vendas</span>
            </p>
          </div>
            </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
        </>
      )}

      {/* Seção de Acompanhamento Diário */}
      {view !== "targets" && <AcompanhamentoDiarioSection
        schedules={displaySchedules}
        registros={filteredAcompanhamento}
        onUpdateRegistro={onUpdateAcompanhamento}
        metaDiariaVendasCompleta={calculations.metaDiariaCompleta}
        metaDiariaVendasMeio={calculations.metaDiariaMeio}
        metaFaturamentoDiarioCompleto={calculations.faturamentoDiarioCompleto}
        metaFaturamentoDiarioMeio={calculations.faturamentoDiarioMeio}
        metaMensalFaturamento={calculations.faturamentoMensal}
        pesoTotalDias={pesoDistribuicao}
        pesoPorDia={pesoPorDia}
      />}
    </div>
  );
}
