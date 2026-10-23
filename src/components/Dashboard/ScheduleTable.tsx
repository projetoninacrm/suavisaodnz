import { useState, useMemo, useRef } from "react";
import { Trash2, Calendar, ChevronDown, Wand2, Loader2, Upload, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableCell } from "./EditableCell";
import { DayBadge } from "./DayBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

// Helper: formata data ISO (YYYY-MM-DD) para DD/mes
function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return "";
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const monthNum = parseInt(parts[1], 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        return `${parts[2]}/${MONTH_NAMES[monthNum - 1]}`;
      }
    }
  }
  return dateStr;
}

// Gera todos os dias de um mês (exceto domingos)
function generateMonthDays(monthIndex: number, year: number): { date: string; dayOfWeek: string }[] {
  const days: { date: string; dayOfWeek: string }[] = [];
  const monthName = MONTH_NAMES[monthIndex];
  
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
        date: `${dayStr}/${monthName}`,
        dayOfWeek,
      });
    }
  }
  
  return days;
}

interface ScheduleTableProps {
  schedules: Schedule[];
  onUpdate: (id: string, field: keyof Schedule, value: string) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
}

export function ScheduleTable({ schedules, onUpdate, onDelete, onRefresh }: ScheduleTableProps) {
  const { toast } = useToast();
  // Inicia com o mês atual
  const currentMonthIndex = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTH_NAMES[currentMonthIndex]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detecta meses disponíveis nos schedules
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    schedules.forEach(s => {
      const month = getMonthFromDate(s.date);
      if (month) monthsSet.add(month);
    });
    return MONTH_NAMES.filter(m => monthsSet.has(m));
  }, [schedules]);

  // Filtra schedules pelo mês selecionado
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const month = getMonthFromDate(s.date);
      return month === selectedMonth;
    });
  }, [schedules, selectedMonth]);

  const scheduleCount = filteredSchedules.length;
  const hasDataInMonth = availableMonths.includes(selectedMonth);

  // Gera escala para o mês selecionado baseado no padrão
  const handleGenerateSchedule = async () => {
    setIsGenerating(true);
    
    try {
      const monthIndex = MONTH_NAMES.indexOf(selectedMonth);
      // Usa 2026 como ano padrão (baseado no contexto do projeto)
      const year = 2026;
      
      const days = generateMonthDays(monthIndex, year);
      
      // Cria os registros para inserir
      const newSchedules = days.map(day => ({
        sheet_name: "Escala",
        date: day.date,
        day_of_week: day.dayOfWeek,
        morning_shift: WEEKLY_PATTERN[day.dayOfWeek]?.morning || "",
        afternoon_shift: WEEKLY_PATTERN[day.dayOfWeek]?.afternoon || "",
      }));
      
      // Insere no banco
      const { error } = await supabase
        .from("schedules")
        .insert(newSchedules);
      
      if (error) throw error;
      
      toast({
        title: "Escala gerada!",
        description: `${newSchedules.length} dias criados para ${MONTH_LABELS[selectedMonth]}.`,
      });
      
      // Atualiza a lista
      if (onRefresh) onRefresh();
      
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        title: "Erro ao gerar escala",
        description: "Não foi possível criar a escala. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportSchedule = async () => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const monthIndex = MONTH_NAMES.indexOf(selectedMonth);
      const year = 2026;

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
          fileBase64,
          mimeType: importFile.type || "image/png",
          month: monthIndex + 1,
          year,
          sheetName: "Escala",
        },
      });

      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      const inserted = (data as { inserted?: number })?.inserted ?? 0;
      toast({
        title: "Agenda importada!",
        description: `${inserted} dias replicados para ${MONTH_LABELS[selectedMonth]}.`,
      });
      setImportOpen(false);
      setImportFile(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Import error:", err);
      toast({
        title: "Erro ao importar agenda",
        description: (err as Error).message || "Tente outra imagem mais nítida.",
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
      toast({
        title: "Formato não suportado",
        description: "Envie uma imagem (PNG, JPG, WEBP) ou PDF.",
        variant: "destructive",
      });
      return;
    }
    setImportFile(file);
  };

  return (
    <div className="space-y-4">
      {/* Filtro de Mês */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4 flex-wrap">
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
                    const hasData = availableMonths.includes(month);
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
                        {!hasData && (
                          <span className={`text-xs ${selectedMonth === month ? "opacity-80" : "text-muted-foreground"}`}>
                            vazio
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-sm text-muted-foreground">
              ({scheduleCount} registros)
            </span>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Importar Agenda
            </Button>

            {/* Botão para gerar escala */}
            {!hasDataInMonth && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" className="gap-2" disabled={isGenerating}>
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Gerar Escala de {MONTH_LABELS[selectedMonth]}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Gerar Escala Automática</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        Isso criará a escala de <strong>{MONTH_LABELS[selectedMonth]}</strong> seguindo o padrão semanal:
                      </p>
                      <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-1">
                        <p><strong>SEG:</strong> ANA (manhã e tarde)</p>
                        <p><strong>TER:</strong> THABATA (manhã e tarde)</p>
                        <p><strong>QUA:</strong> CAROL (manhã) / ANA (tarde)</p>
                        <p><strong>QUI:</strong> LARISSA (manhã) / CASSIO (tarde)</p>
                        <p><strong>SEX:</strong> AMANDA (manhã e tarde)</p>
                        <p><strong>SAB:</strong> ALICE (manhã)</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Domingos são automaticamente excluídos.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGenerateSchedule}>
                      Gerar Escala
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Importar Agenda */}
      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) setImportFile(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Agenda — {MONTH_LABELS[selectedMonth]}</DialogTitle>
            <DialogDescription>
              Arraste uma foto/print ou PDF da escala. A IA vai ler e replicar exatamente os médicos
              de cada turno. Os registros já existentes em {MONTH_LABELS[selectedMonth]} serão substituídos.
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
            onClick={() => fileInputRef.current?.click()}
            className={`mt-2 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />
            {importFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileImage className="h-8 w-8 text-primary" />
                <p className="text-sm font-medium">{importFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(importFile.size / 1024).toFixed(0)} KB — clique para trocar
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Arraste a imagem aqui</p>
                <p className="text-xs text-muted-foreground">
                  ou clique para selecionar (PNG, JPG, WEBP ou PDF)
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={isImporting}>
              Cancelar
            </Button>
            <Button onClick={handleImportSchedule} disabled={!importFile || isImporting} className="gap-2">
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {isImporting ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabela */}
      <div className="bg-card rounded-xl border border-border overflow-hidden card-shadow-lg animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-table-header border-b border-table-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  8:00 - 12:00
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  13:00 - 18:00
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                  Dia
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[60px]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-table-border">
              {filteredSchedules.map((schedule, index) => (
                <tr 
                  key={schedule.id} 
                  className="table-cell-hover animate-slide-in"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <td className="px-4 py-1">
                    <EditableCell
                      value={formatDateForDisplay(schedule.date)}
                      onSave={(value) => onUpdate(schedule.id, "date", value)}
                      placeholder="DD/MMM"
                    />
                  </td>
                  <td className="px-4 py-1">
                    <EditableCell
                      value={schedule.morning_shift || ""}
                      onSave={(value) => onUpdate(schedule.id, "morning_shift", value)}
                      placeholder="Nome"
                    />
                  </td>
                  <td className="px-4 py-1">
                    <EditableCell
                      value={schedule.afternoon_shift || ""}
                      onSave={(value) => onUpdate(schedule.id, "afternoon_shift", value)}
                      placeholder="Nome"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <DayBadge day={schedule.day_of_week} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(schedule.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSchedules.length === 0 && (
          <div className="px-6 py-12 text-center text-muted-foreground">
            <p>Nenhum registro encontrado para {MONTH_LABELS[selectedMonth]}.</p>
            <p className="text-sm mt-1">
              {hasDataInMonth 
                ? 'Clique em "Nova Linha" para adicionar.' 
                : `Clique em "Gerar Escala de ${MONTH_LABELS[selectedMonth]}" para criar automaticamente.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
