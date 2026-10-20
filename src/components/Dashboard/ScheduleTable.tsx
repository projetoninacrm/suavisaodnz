import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Trash2, Calendar, Wand2, Loader2, Upload, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableCell } from "./EditableCell";
import { DayBadge } from "./DayBadge";
import { Card, CardContent } from "@/components/ui/card";
import { SelectFilter } from "@/components/data/SelectFilter";
import { FilterGrid } from "@/components/data/FilterGrid";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Schedule } from "@/hooks/useSchedules";
import { PersonSelect } from "@/components/Dashboard/PersonSelect";
import { EntityDataTable } from "@/components/data/EntityDataTable";
import { DataState } from "@/components/data/DataState";
import { PersonDirectoryHint } from "@/components/data/PersonDirectoryHint";
import { useDirectory } from "@/hooks/useDirectory";
import { useRouteState } from "@/hooks/useRouteState";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  parseSchedulePreviewResponse,
  ScheduleImportValidationError,
  type SchedulePreviewRow,
} from "../../../supabase/functions/_shared/schedule-import.ts";

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
type SchedulePeriod = { month: string; year: number };

function getCurrentSchedulePeriod(): SchedulePeriod {
  const now = new Date();
  return { month: MONTH_NAMES[now.getMonth()], year: now.getFullYear() };
}

function parseSchedulePeriod(value: unknown): SchedulePeriod {
  if (
    typeof value === "object" && value !== null &&
    "month" in value && typeof value.month === "string" && MONTH_NAMES.includes(value.month) &&
    "year" in value && typeof value.year === "number" && Number.isInteger(value.year) && value.year >= 1900 && value.year <= 9999
  ) {
    return { month: value.month, year: value.year };
  }
  return getCurrentSchedulePeriod();
}

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
const LEGACY_SCHEDULE_YEAR = 2026;

type ScheduleTableMeta = {
  renderDate: (schedule: Schedule) => ReactNode;
  renderMorning: (schedule: Schedule) => ReactNode;
  renderAfternoon: (schedule: Schedule) => ReactNode;
  renderDay: (schedule: Schedule) => ReactNode;
  renderActions: (schedule: Schedule) => ReactNode;
};

type SchedulePreviewTableMeta = {
  renderDate: (row: SchedulePreviewRow) => ReactNode;
  renderMorning: (row: SchedulePreviewRow) => ReactNode;
  renderAfternoon: (row: SchedulePreviewRow) => ReactNode;
};

const scheduleTableFeatures = tableFeatures({ tableMeta: {} as ScheduleTableMeta });
const scheduleColumn = createColumnHelper<typeof scheduleTableFeatures, Schedule>();
const scheduleColumns = scheduleColumn.columns([
  scheduleColumn.display({ id: "data", header: "Data", cell: ({ row, table }) => table.options.meta.renderDate(row.original) }),
  scheduleColumn.display({ id: "manha", header: "8:00 - 12:00", cell: ({ row, table }) => table.options.meta.renderMorning(row.original) }),
  scheduleColumn.display({ id: "tarde", header: "13:00 - 18:00", cell: ({ row, table }) => table.options.meta.renderAfternoon(row.original) }),
  scheduleColumn.display({ id: "dia", header: "Dia", cell: ({ row, table }) => table.options.meta.renderDay(row.original) }),
  scheduleColumn.display({ id: "acoes", header: "Ações", cell: ({ row, table }) => table.options.meta.renderActions(row.original) }),
]);
const schedulePreviewTableFeatures = tableFeatures({ tableMeta: {} as SchedulePreviewTableMeta });
const schedulePreviewColumn = createColumnHelper<typeof schedulePreviewTableFeatures, SchedulePreviewRow>();
const schedulePreviewColumns = schedulePreviewColumn.columns([
  schedulePreviewColumn.display({ id: "data", header: "Data", cell: ({ row, table }) => table.options.meta.renderDate(row.original) }),
  schedulePreviewColumn.display({ id: "manha", header: "Manhã", cell: ({ row, table }) => table.options.meta.renderMorning(row.original) }),
  schedulePreviewColumn.display({ id: "tarde", header: "Tarde", cell: ({ row, table }) => table.options.meta.renderAfternoon(row.original) }),
]);

const normalizePersonName = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

async function readScheduleValidationMessage(error: unknown): Promise<string | null> {
  if (typeof error !== "object" || error === null || !("context" in error)) return null;
  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response) || context.status !== 422) return null;

  try {
    const payload: unknown = await context.clone().json();
    if (typeof payload === "object" && payload !== null && "error" in payload
      && typeof (payload as { error?: unknown }).error === "string") {
      return (payload as { error: string }).error.slice(0, 300);
    }
  } catch {
    return null;
  }
  return null;
}

const DAY_OF_WEEK_MAP: Record<number, string> = {
  0: "DOM",
  1: "SEG",
  2: "TER",
  3: "QUA",
  4: "QUI",
  5: "SEX",
  6: "SAB",
};

// Padrão fixo baseado em Janeiro (dia da semana -> médicos)
const WEEKLY_PATTERN: Record<string, { morning: string; afternoon: string }> = {
  SEG: { morning: "ANA", afternoon: "ANA" },
  TER: { morning: "THABATA", afternoon: "THABATA" },
  QUA: { morning: "CAROL", afternoon: "ANA" },
  QUI: { morning: "LARISSA", afternoon: "CASSIO" },
  SEX: { morning: "AMANDA", afternoon: "AMANDA" },
  SAB: { morning: "ALICE", afternoon: "" },
  DOM: { morning: "", afternoon: "" },
};

// Helper: extrai o mês de uma data (suporta DD/MM/YYYY, DD/mes e YYYY-MM-DD)
function getMonthFromDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // ISO format: YYYY-MM-DD
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length >= 2) {
      const monthNum = parseInt(parts[1], 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        return MONTH_NAMES[monthNum - 1];
      }
    }
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
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return Number(dateStr.slice(0, 4));
  const parts = dateStr.split("/");
  if (parts.length >= 3 && /^\d{4}$/.test(parts[2].trim())) return Number(parts[2].trim());
  // Schedules created by the earlier UI stored only DD/mon and were generated for 2026.
  if (parts.length === 2) return LEGACY_SCHEDULE_YEAR;
  return null;
}

// Helper: formata data ISO (YYYY-MM-DD) para DD/mes
function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return "";
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const monthNum = parseInt(parts[1], 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        return `${parts[2]}/${MONTH_NAMES[monthNum - 1]}/${parts[0]}`;
      }
    }
  }
  return dateStr;
}

// Gera todos os dias de um mês (exceto domingos)
function generateMonthDays(monthIndex: number, year: number): { date: string; dayOfWeek: string }[] {
  const days: { date: string; dayOfWeek: string }[] = [];
  
  // Primeiro dia do mês
  const firstDay = new Date(year, monthIndex, 1);
  // Último dia do mês
  const lastDay = new Date(year, monthIndex + 1, 0);
  
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, monthIndex, day);
    const dayOfWeek = DAY_OF_WEEK_MAP[date.getDay()];
    
    // Exclui domingos
    if (dayOfWeek !== "DOM") {
      const dayStr = day.toString().padStart(2, "0");
      days.push({
        date: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${dayStr}`,
        dayOfWeek,
      });
    }
  }
  
  return days;
}

interface ScheduleTableProps {
  schedules: Schedule[];
  isRefreshing?: boolean;
  onUpdate: (id: string, field: keyof Schedule, value: string) => void;
  onUpdateProfessional: (id: string, shift: "morning" | "afternoon", professionalId: string | null, name: string | null) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
}

export function ScheduleTable({ schedules, isRefreshing = false, onUpdate, onUpdateProfessional, onDelete, onRefresh }: ScheduleTableProps) {
  const { toast } = useToast();
  const { people: professionals, isLoading: professionalsLoading, error: professionalsError, refresh: refreshProfessionals } = useDirectory("professionals");
  const [period, setPeriod] = useRouteState<SchedulePeriod>("schedulePeriod", getCurrentSchedulePeriod, parseSchedulePeriod);
  const { month: selectedMonth, year: selectedYear } = period;
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<SchedulePreviewRow[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (professionalsLoading || previewRows.length === 0) return;
    setPreviewRows((current) => current.map((row) => {
      const resolve = (name: string, id: string | null) => {
        if (id || !name.trim()) return { name, id };
        const match = professionals.find((person) => normalizePersonName(person.name) === normalizePersonName(name));
        return match ? { name: match.name, id: match.id } : { name, id: null };
      };
      const morning = resolve(row.morning_shift, row.morning_shift_professional_id);
      const afternoon = resolve(row.afternoon_shift, row.afternoon_shift_professional_id);
      return {
        ...row,
        morning_shift: morning.name,
        morning_shift_professional_id: morning.id,
        afternoon_shift: afternoon.name,
        afternoon_shift_professional_id: afternoon.id,
      };
    }));
  }, [professionals, professionalsLoading, previewRows.length]);

  // Detecta meses disponíveis nos schedules
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    schedules.forEach(s => {
      const month = getMonthFromDate(s.date);
      if (month && getYearFromDate(s.date) === selectedYear) monthsSet.add(month);
    });
    return MONTH_NAMES.filter(m => monthsSet.has(m));
  }, [schedules, selectedYear]);

  const availableYears = useMemo(() => {
    const years = new Set(schedules.map((schedule) => getYearFromDate(schedule.date)).filter((year): year is number => year !== null));
    years.add(new Date().getFullYear() - 1);
    years.add(new Date().getFullYear());
    years.add(new Date().getFullYear() + 1);
    years.add(selectedYear);
    return [...years].sort((a, b) => a - b);
  }, [schedules, selectedYear]);

  // Filtra schedules pelo mês selecionado
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const month = getMonthFromDate(s.date);
      return month === selectedMonth && getYearFromDate(s.date) === selectedYear;
    });
  }, [schedules, selectedMonth, selectedYear]);

  const scheduleTable = useTable({
    features: scheduleTableFeatures,
    columns: scheduleColumns,
    data: filteredSchedules,
    getRowId: (schedule) => schedule.id,
    meta: {
      renderDate: (schedule) => {
        const formattedDate = formatDateForDisplay(schedule.date);
        return (
          <EditableCell
            value={formattedDate}
            onSave={(value) => onUpdate(schedule.id, "date", value)}
            placeholder="DD/MMM"
            ariaLabel={`Data da escala de ${formattedDate}`}
          />
        );
      },
      renderMorning: (schedule) => (
        <PersonSelect
          people={professionals}
          value={schedule.morning_shift_professional_id}
          currentLabel={schedule.morning_shift}
          onValueChange={(id, person) => onUpdateProfessional(schedule.id, "morning", id, person?.name || null)}
          placeholder="Selecionar profissional"
          ariaLabel={`Profissional da manhã em ${formatDateForDisplay(schedule.date)}`}
          emptyLabel="Sem profissional"
          disabled={professionalsLoading}
        />
      ),
      renderAfternoon: (schedule) => (
        <PersonSelect
          people={professionals}
          value={schedule.afternoon_shift_professional_id}
          currentLabel={schedule.afternoon_shift}
          onValueChange={(id, person) => onUpdateProfessional(schedule.id, "afternoon", id, person?.name || null)}
          placeholder="Selecionar profissional"
          ariaLabel={`Profissional da tarde em ${formatDateForDisplay(schedule.date)}`}
          emptyLabel="Sem profissional"
          disabled={professionalsLoading}
        />
      ),
      renderDay: (schedule) => <DayBadge day={schedule.day_of_week} />,
      renderActions: (schedule) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setScheduleToDelete(schedule)}
          aria-label={`Excluir escala de ${formatDateForDisplay(schedule.date)}`}
          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    },
  });

  const scheduleCount = filteredSchedules.length;
  const hasDataInMonth = availableMonths.includes(selectedMonth);
  const activeProfessionals = professionals.filter((person) => person.is_active);
  const requiredProfessionalNames = [...new Set(Object.values(WEEKLY_PATTERN)
    .flatMap((pattern) => [pattern.morning, pattern.afternoon])
    .filter(Boolean))];
  const findActiveProfessionals = (name: string) => activeProfessionals.filter(
    (person) => normalizePersonName(person.name) === normalizePersonName(name)
  );
  const missingProfessionalNames = requiredProfessionalNames.filter((name) => findActiveProfessionals(name).length === 0);
  const ambiguousProfessionalNames = requiredProfessionalNames.filter((name) => findActiveProfessionals(name).length > 1);
  const canGenerateAutomaticPattern = missingProfessionalNames.length === 0 && ambiguousProfessionalNames.length === 0;
  const getPatternDisplayName = (name: string) => findActiveProfessionals(name)[0]?.name || name;

  // Gera escala para o mês selecionado baseado no padrão
  const handleGenerateSchedule = async () => {
    if (isGenerating || professionalsLoading) return;
    if (professionalsError) {
      toast({ title: "Profissionais indisponíveis", description: "Atualize o cadastro de profissionais antes de gerar a escala.", variant: "destructive" });
      return;
    }

    if (!canGenerateAutomaticPattern) {
      const guidance = [
        missingProfessionalNames.length > 0 ? `Cadastre ou reative: ${missingProfessionalNames.join(", ")}.` : "",
        ambiguousProfessionalNames.length > 0 ? `Deixe cada nome único no cadastro: ${ambiguousProfessionalNames.join(", ")}.` : "",
      ].filter(Boolean).join(" ");
      toast({
        title: "Revise o cadastro de profissionais",
        description: guidance,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const monthIndex = MONTH_NAMES.indexOf(selectedMonth);
      const year = selectedYear;
      
      const days = generateMonthDays(monthIndex, year);
      
      // Cria os registros para inserir
      const newSchedules = days.map((day) => {
        const pattern = WEEKLY_PATTERN[day.dayOfWeek];
        const resolveProfessional = (name: string) => findActiveProfessionals(name)[0];
        const morning = resolveProfessional(pattern?.morning || "");
        const afternoon = resolveProfessional(pattern?.afternoon || "");
        return {
          sheet_name: "Escala",
          date: day.date,
          day_of_week: day.dayOfWeek,
          morning_shift: morning?.name || "",
          morning_shift_professional_id: morning?.id || null,
          afternoon_shift: afternoon?.name || "",
          afternoon_shift_professional_id: afternoon?.id || null,
        };
      });
      
      // Insere no banco
      const { error } = await supabase
        .from("schedules")
        .insert(newSchedules);
      
      if (error) throw error;
      
      toast({
        title: "Escala gerada!",
        description: `${newSchedules.length} dias criados para ${MONTH_LABELS[selectedMonth]} de ${selectedYear}.`,
      });
      
      // Atualiza a lista
      if (onRefresh) onRefresh();
      
    } catch (error) {
      console.error("Error generating schedule:", error);
      if (onRefresh) onRefresh();
      toast({
        title: "Não foi possível confirmar a geração da escala",
        description: "A lista será atualizada. Confira os dias do mês antes de tentar gerar novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewSchedule = async () => {
    if (!importFile) return;
    setPreviewError(null);
    setIsImporting(true);
    try {
      const monthIndex = MONTH_NAMES.indexOf(selectedMonth);
      const year = selectedYear;

      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] || "");
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(importFile);
      });

      const { data, error } = await supabase.functions.invoke("import-schedule-image", {
        body: {
          action: "preview",
          fileBase64,
          mimeType: importFile.type || "image/png",
          month: monthIndex + 1,
          year,
          sheetName: "Escala",
        },
      });

      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      const rows = parseSchedulePreviewResponse(data, year, monthIndex + 1, "Escala");
      setPreviewRows(rows);
      setPreviewError(null);
      toast({
        title: "Prévia pronta",
        description: `${rows.length} dias reconhecidos. Revise antes de gravar.`,
      });
    } catch (err) {
      console.error("Schedule preview error:", err);
      const serverValidationMessage = await readScheduleValidationMessage(err);
      const isValidationError = err instanceof ScheduleImportValidationError || serverValidationMessage !== null;
      const description = err instanceof ScheduleImportValidationError
        ? err.message
        : serverValidationMessage || "Confira o formato e a nitidez do arquivo e tente novamente.";
      setPreviewError(description);
      toast({
        title: isValidationError ? "Prévia incompleta" : "Não foi possível analisar a escala",
        description,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewRows.length) return;
    const unresolvedNames = previewRows.some((row) => (row.morning_shift.trim() && !row.morning_shift_professional_id)
      || (row.afternoon_shift.trim() && !row.afternoon_shift_professional_id));
    if (unresolvedNames) {
      toast({ title: "Revise os profissionais", description: "Associe cada nome reconhecido a um profissional cadastrado antes de confirmar.", variant: "destructive" });
      return;
    }
    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-schedule-image", {
        body: {
          action: "confirm",
          rows: previewRows.map((row) => ({
            date: row.date,
            morning_shift_professional_id: row.morning_shift_professional_id,
            afternoon_shift_professional_id: row.afternoon_shift_professional_id,
          })),
          month: MONTH_NAMES.indexOf(selectedMonth) + 1,
          year: selectedYear,
          sheetName: "Escala",
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      const inserted = (data as { inserted?: number })?.inserted ?? 0;
      toast({
        title: "Escala importada",
        description: `${inserted} dias gravados para ${MONTH_LABELS[selectedMonth]} de ${selectedYear}.`,
      });
      setImportOpen(false);
      setImportFile(null);
      setPreviewRows([]);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Schedule import error:", err);
      if (onRefresh) onRefresh();
      toast({
        title: "Não foi possível confirmar a importação",
        description: "A lista será atualizada. Confira a escala do mês antes de repetir a importação.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelected = (file: File | undefined | null) => {
    if (!file) return;
    const okTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    if (!okTypes.includes(file.type)) {
      const description = "Envie uma imagem PNG, JPG, WEBP ou PDF.";
      setPreviewError(description);
      toast({
        title: "Formato não suportado",
        description,
        variant: "destructive",
      });
      return;
    }
    setImportFile(file);
    setPreviewRows([]);
    setPreviewError(null);
  };

  const updatePreviewProfessional = (date: string, shift: "morning" | "afternoon", id: string | null, personName: string | null) => {
    setPreviewRows((current) => current.map((row) => row.date !== date ? row : shift === "morning"
      ? { ...row, morning_shift_professional_id: id, morning_shift: personName || "" }
      : { ...row, afternoon_shift_professional_id: id, afternoon_shift: personName || "" }));
  };

  const unresolvedNameCount = previewRows.reduce((count, row) => count
    + Number(Boolean(row.morning_shift.trim() && !row.morning_shift_professional_id))
    + Number(Boolean(row.afternoon_shift.trim() && !row.afternoon_shift_professional_id)), 0);
  const schedulePreviewTable = useTable({
    features: schedulePreviewTableFeatures,
    columns: schedulePreviewColumns,
    data: previewRows,
    getRowId: (row) => row.date,
    meta: {
      renderDate: (row) => <span className="whitespace-nowrap">{formatDateForDisplay(row.date)}</span>,
      renderMorning: (row) => (
        <PersonSelect
          people={professionals}
          value={row.morning_shift_professional_id}
          currentLabel={row.morning_shift || null}
          placeholder="Selecionar profissional"
          ariaLabel={`Profissional da manhã em ${formatDateForDisplay(row.date)}`}
          emptyLabel="Sem profissional"
          disabled={professionalsLoading}
          onValueChange={(id, person) => updatePreviewProfessional(row.date, "morning", id, person?.name || null)}
        />
      ),
      renderAfternoon: (row) => (
        <PersonSelect
          people={professionals}
          value={row.afternoon_shift_professional_id}
          currentLabel={row.afternoon_shift || null}
          placeholder="Selecionar profissional"
          ariaLabel={`Profissional da tarde em ${formatDateForDisplay(row.date)}`}
          emptyLabel="Sem profissional"
          disabled={professionalsLoading}
          onValueChange={(id, person) => updatePreviewProfessional(row.date, "afternoon", id, person?.name || null)}
        />
      ),
    },
  });

  return (
    <div className="space-y-4">
      <PersonDirectoryHint
        title="Profissionais"
        kind="profissional"
        path="/cadastros/profissionais"
        people={professionals}
        isLoading={professionalsLoading}
        error={professionalsError}
        onRetry={refreshProfessionals}
      />
      {/* Filtro de Mês */}
      <Card className="border-border">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:p-5">
          <FilterGrid columns={2} className="w-full sm:w-auto sm:grid-cols-[190px_110px]">
            <SelectFilter
              id="schedule-month"
              label="Mês"
              value={selectedMonth}
              onValueChange={(month) => setPeriod((current) => ({ ...current, month }))}
              options={MONTH_NAMES.map((month) => ({
                value: month,
                label: `${MONTH_LABELS[month]}${availableMonths.includes(month) ? "" : " · Sem registros"}`,
              }))}
              labelAdornment={<Calendar aria-hidden="true" className="size-4 text-primary" />}
              className="w-full min-w-0"
              triggerClassName="w-full"
            />
            <SelectFilter
              id="schedule-year"
              label="Ano"
              value={String(selectedYear)}
              onValueChange={(year) => setPeriod((current) => ({ ...current, year: Number(year) }))}
              options={availableYears.map(String)}
              className="w-full min-w-0"
              triggerClassName="w-full"
            />
          </FilterGrid>
          <p className="text-sm text-muted-foreground sm:pb-2" aria-live="polite">
            {scheduleCount} {scheduleCount === 1 ? "dia" : "dias"} na escala
            {isRefreshing && <span className="ml-2">· Atualizando…</span>}
          </p>

          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setImportOpen(true)}
              disabled={isImporting}
            >
              <Upload className="h-4 w-4" />
              Importar escala
            </Button>

            {/* Botão para gerar escala */}
            {!hasDataInMonth && (
              <AlertDialog>
                <AlertDialogTrigger render={
                  <Button variant="default" className="gap-2" disabled={isGenerating || professionalsLoading || Boolean(professionalsError) || !canGenerateAutomaticPattern}>
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Gerar Escala de {MONTH_LABELS[selectedMonth]} de {selectedYear}
                  </Button>
                } />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Gerar Escala Automática</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        Isso criará a escala de <strong>{MONTH_LABELS[selectedMonth]} de {selectedYear}</strong> seguindo o padrão semanal:
                      </p>
                      <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-1">
                        <p><strong>SEG:</strong> {getPatternDisplayName(WEEKLY_PATTERN.SEG.morning)} (manhã e tarde)</p>
                        <p><strong>TER:</strong> {getPatternDisplayName(WEEKLY_PATTERN.TER.morning)} (manhã e tarde)</p>
                        <p><strong>QUA:</strong> {getPatternDisplayName(WEEKLY_PATTERN.QUA.morning)} (manhã) / {getPatternDisplayName(WEEKLY_PATTERN.QUA.afternoon)} (tarde)</p>
                        <p><strong>QUI:</strong> {getPatternDisplayName(WEEKLY_PATTERN.QUI.morning)} (manhã) / {getPatternDisplayName(WEEKLY_PATTERN.QUI.afternoon)} (tarde)</p>
                        <p><strong>SEX:</strong> {getPatternDisplayName(WEEKLY_PATTERN.SEX.morning)} (manhã e tarde)</p>
                        <p><strong>SAB:</strong> {getPatternDisplayName(WEEKLY_PATTERN.SAB.morning)} (manhã)</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Domingos são automaticamente excluídos.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGenerateSchedule} disabled={isGenerating || professionalsLoading || Boolean(professionalsError) || !canGenerateAutomaticPattern}>
                      Gerar Escala
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {professionalsError && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 text-muted-foreground">Não foi possível carregar o cadastro de profissionais: {professionalsError}</span>
          <Button type="button" variant="outline" size="sm" disabled={professionalsLoading} onClick={() => void refreshProfessionals()}>
            {professionalsLoading ? "Atualizando…" : "Tentar novamente"}
          </Button>
          <Link className="font-medium text-primary underline" to="/cadastros/profissionais">Cadastros de profissionais</Link>
        </div>
      )}

      {!hasDataInMonth && !professionalsLoading && !professionalsError && !canGenerateAutomaticPattern && (
        <div role="alert" className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
          <p className="min-w-0 flex-1 text-warning-foreground">
            {missingProfessionalNames.length > 0 && <>Cadastre ou reative: {missingProfessionalNames.join(", ")}.</>}
            {missingProfessionalNames.length > 0 && ambiguousProfessionalNames.length > 0 && " "}
            {ambiguousProfessionalNames.length > 0 && <>Mantenha um único cadastro ativo para: {ambiguousProfessionalNames.join(", ")}.</>}
          </p>
          <Link className="shrink-0 font-medium text-primary underline" to="/cadastros/profissionais">Revisar profissionais</Link>
        </div>
      )}

      {/* Modal Importar Agenda */}
      <Dialog open={importOpen} onOpenChange={(o) => {
        if (!o && isImporting) return;
        setImportOpen(o);
        if (!o) { setImportFile(null); setPreviewRows([]); setPreviewError(null); }
      }}>
        <DialogContent className="max-w-lg" closeButtonDisabled={isImporting} aria-busy={isImporting}>
          <DialogHeader>
            <DialogTitle>Importar Escala — {MONTH_LABELS[selectedMonth]} de {selectedYear}</DialogTitle>
            <DialogDescription>
              A IA lê os profissionais por turno. Você verá a prévia antes de gravar; os registros atuais só serão substituídos na confirmação.
            </DialogDescription>
          </DialogHeader>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileSelected(e.dataTransfer.files?.[0]);
            }}
            className={`mt-2 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              className="sr-only"
              tabIndex={-1}
              aria-label="Arquivo da escala"
              onChange={(event) => {
                handleFileSelected(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              aria-describedby="schedule-import-file-help"
              className="h-auto w-full flex-col gap-2 whitespace-normal py-3 text-center hover:bg-transparent"
            >
              {importFile ? (
                <>
                  <FileImage aria-hidden="true" className="size-8 text-primary" />
                  <span className="text-sm font-medium">{importFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(importFile.size / 1024).toFixed(0)} KB — selecione para trocar
                  </span>
                </>
              ) : (
                <>
                  <Upload aria-hidden="true" className="size-8 text-muted-foreground" />
                  <span className="text-sm font-medium">Arraste a imagem aqui</span>
                  <span className="text-xs text-muted-foreground">
                    ou pressione Enter para selecionar (PNG, JPG, WEBP ou PDF)
                  </span>
                </>
              )}
            </Button>
            <p id="schedule-import-file-help" className="sr-only">Arquivo aceito: PNG, JPG, WEBP ou PDF.</p>
          </div>

          {previewError && (
            <div role="alert" className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning-foreground">
              {previewError}
            </div>
          )}

          {previewRows.length > 0 && (
            <section aria-label="Prévia da escala reconhecida" className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Prévia: {previewRows.length} dias</p>
                <p className="text-xs text-muted-foreground">
                  {scheduleCount > 0 ? `${scheduleCount} registros atuais serão substituídos.` : "Nenhum registro atual será removido."}
                </p>
              </div>
              <EntityDataTable
                table={schedulePreviewTable}
                label="Dias e turnos identificados"
                className="max-h-56 overflow-auto rounded-md border"
                tableClassName="text-sm"
                headerClassName="sticky top-0 bg-muted"
                getHeaderClassName={(columnId) => columnId === "data"
                  ? "px-3 py-2"
                  : "min-w-[230px] px-3 py-2"}
                getCellClassName={(columnId) => columnId === "data" ? "whitespace-nowrap px-3 py-2" : "px-2 py-2"}
              />
              {unresolvedNameCount > 0 && <div role={professionalsError ? "alert" : "status"} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className={professionalsError ? "text-destructive" : "text-warning-foreground"}>{professionalsError || `${unresolvedNameCount} nome(s) precisam ser associados a profissionais cadastrados.`}</span>
                <Link className="font-medium text-primary underline" to="/cadastros/profissionais" target="_blank" rel="noreferrer">Abrir cadastros de profissionais</Link>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={professionalsLoading} onClick={() => void refreshProfessionals()}>{professionalsLoading ? "Atualizando…" : "Atualizar lista"}</Button>
              </div>}
              {professionals.some((person) => !person.is_active && previewRows.some((row) => row.morning_shift_professional_id === person.id || row.afternoon_shift_professional_id === person.id)) && <p className="text-xs text-muted-foreground">A prévia inclui profissional(is) inativo(s); confirme se a escala se refere a um período histórico.</p>}
            </section>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={isImporting}>
              Cancelar
            </Button>
            <Button
              onClick={previewRows.length > 0 ? handleConfirmImport : handlePreviewSchedule}
              disabled={!importFile || isImporting || (previewRows.length > 0 && (professionalsLoading || unresolvedNameCount > 0))}
              className="gap-2"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {isImporting ? "Processando…" : previewRows.length > 0
                ? scheduleCount > 0 ? `Confirmar e substituir ${scheduleCount}` : `Confirmar escala (${previewRows.length} dias)`
                : "Ler e mostrar prévia"}
            </Button>
            <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {isImporting ? "Processando a escala; aguarde até que seja seguro fechar." : ""}
            </span>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lista compacta para celular */}
      <div className="space-y-3 md:hidden" aria-label={`Escala de ${MONTH_LABELS[selectedMonth]} de ${selectedYear}`}>
        {filteredSchedules.length === 0 ? (
          <DataState
            variant="empty"
            title={`Sem dias cadastrados em ${MONTH_LABELS[selectedMonth]} de ${selectedYear}`}
            description="Importe uma escala ou gere o mês pelas ações acima."
            className="min-h-48"
          />
        ) : filteredSchedules.map((schedule) => {
          const formattedDate = formatDateForDisplay(schedule.date);
          return (
            <Card key={schedule.id}>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Data</p>
                    <EditableCell
                      value={formattedDate}
                      onSave={(value) => onUpdate(schedule.id, "date", value)}
                      placeholder="DD/MMM"
                      ariaLabel={`Data da escala de ${formattedDate}`}
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <DayBadge day={schedule.day_of_week} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setScheduleToDelete(schedule)}
                      aria-label={`Excluir escala de ${formattedDate}`}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor={`schedule-morning-${schedule.id}`} className="text-xs font-medium text-muted-foreground">
                      Manhã · 8:00–12:00
                    </label>
                    <PersonSelect
                      id={`schedule-morning-${schedule.id}`}
                      people={professionals}
                      value={schedule.morning_shift_professional_id}
                      currentLabel={schedule.morning_shift}
                      onValueChange={(id, person) => onUpdateProfessional(schedule.id, "morning", id, person?.name || null)}
                      placeholder="Selecionar profissional"
                      ariaLabel={`Profissional da manhã em ${formattedDate}`}
                      emptyLabel="Sem profissional"
                      disabled={professionalsLoading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor={`schedule-afternoon-${schedule.id}`} className="text-xs font-medium text-muted-foreground">
                      Tarde · 13:00–18:00
                    </label>
                    <PersonSelect
                      id={`schedule-afternoon-${schedule.id}`}
                      people={professionals}
                      value={schedule.afternoon_shift_professional_id}
                      currentLabel={schedule.afternoon_shift}
                      onValueChange={(id, person) => onUpdateProfessional(schedule.id, "afternoon", id, person?.name || null)}
                      placeholder="Selecionar profissional"
                      ariaLabel={`Profissional da tarde em ${formattedDate}`}
                      emptyLabel="Sem profissional"
                      disabled={professionalsLoading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabela para telas médias e grandes */}
      <div className="hidden md:block">
      {filteredSchedules.length === 0 ? (
        <DataState
          variant="empty"
          title={`Sem dias cadastrados em ${MONTH_LABELS[selectedMonth]} de ${selectedYear}`}
          description="Importe uma escala ou gere o mês pelas ações acima."
          className="min-h-48"
        />
      ) : (
      <EntityDataTable
        table={scheduleTable}
        label={`Escala de ${MONTH_LABELS[selectedMonth]} de ${selectedYear}`}
        className="rounded-xl border border-border bg-card"
        tableClassName="min-w-[760px]"
        headerRowClassName="bg-table-header border-table-border hover:bg-table-header"
        rowClassName="table-cell-hover animate-slide-in"
        getRowStyle={(_, index) => ({ animationDelay: `${index * 20}ms` })}
        getHeaderClassName={(columnId) => columnId === "data"
          ? "w-[140px] text-xs font-semibold uppercase tracking-wider"
          : columnId === "dia"
            ? "w-[90px] text-center text-xs font-semibold uppercase tracking-wider"
            : columnId === "acoes"
              ? "w-[72px] text-center text-xs font-semibold uppercase tracking-wider"
              : "text-xs font-semibold uppercase tracking-wider"}
        getCellClassName={(columnId) => columnId === "dia" || columnId === "acoes"
          ? "px-4 py-2 text-center"
          : "px-4 py-1"}
      />
      )}
      </div>

      <AlertDialog
        open={Boolean(scheduleToDelete)}
        onOpenChange={(open) => { if (!open) setScheduleToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dia da escala?</AlertDialogTitle>
            <AlertDialogDescription>
              {scheduleToDelete && (
                <>
                  O dia {formatDateForDisplay(scheduleToDelete.date)} será removido da escala, incluindo os profissionais dos dois turnos. Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (scheduleToDelete) onDelete(scheduleToDelete.id);
                setScheduleToDelete(null);
              }}
            >
              Excluir dia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
