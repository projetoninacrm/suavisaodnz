import { useState, useMemo } from "react";
import { Filter, X, MessageCircle, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarFilterPopover } from "./CalendarFilterPopover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AmigoAttendance } from "@/hooks/useDetalhadoAmigo";
import type { DateRange } from "react-day-picker";

interface DetalhadoAmigoTableProps {
  attendances: AmigoAttendance[];
  isLoading: boolean;
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (start: Date, end: Date) => void;
  onRefresh: () => void;
}

interface Filters {
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  patient_know_by: string;
  event_name: string;
  doctor_name: string;
  data: string[];
}

export function DetalhadoAmigoTable({ 
  attendances, 
  isLoading, 
  dateRange,
  onDateRangeChange,
  onRefresh 
}: DetalhadoAmigoTableProps) {
  const [filters, setFilters] = useState<Filters>({
    patient_name: "",
    patient_phone: "",
    patient_email: "",
    patient_know_by: "",
    event_name: "",
    doctor_name: "",
    data: [],
  });

  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>({
    from: dateRange.start,
    to: dateRange.end,
  });

  const uniqueValues = useMemo(() => ({
    patient_name: [...new Set(attendances.map(r => r.patient_name).filter(Boolean))] as string[],
    patient_phone: [...new Set(attendances.map(r => r.patient_phone).filter(Boolean))] as string[],
    patient_email: [...new Set(attendances.map(r => r.patient_email).filter(Boolean))] as string[],
    patient_know_by: [...new Set(attendances.map(r => r.patient_know_by).filter(Boolean))] as string[],
    event_name: [...new Set(attendances.map(r => r.event_name).filter(Boolean))] as string[],
    doctor_name: [...new Set(attendances.map(r => r.doctor_name).filter(Boolean))] as string[],
    data: [...new Set(attendances.map(r => r.date).filter(Boolean))] as string[],
  }), [attendances]);

  const filteredRecords = useMemo(() => {
    return attendances.filter(record => {
      if (filters.patient_name && record.patient_name !== filters.patient_name) return false;
      if (filters.patient_phone && record.patient_phone !== filters.patient_phone) return false;
      if (filters.patient_email && record.patient_email !== filters.patient_email) return false;
      if (filters.patient_know_by && record.patient_know_by !== filters.patient_know_by) return false;
      if (filters.event_name && record.event_name !== filters.event_name) return false;
      if (filters.doctor_name && record.doctor_name !== filters.doctor_name) return false;
      if (filters.data.length > 0 && !filters.data.includes(record.date || "")) return false;
      return true;
    });
  }, [attendances, filters]);

  const hasActiveFilters = Object.entries(filters).some(([, value]) => 
    Array.isArray(value) ? value.length > 0 : value !== ""
  );

  const clearFilters = () => {
    setFilters({
      patient_name: "",
      patient_phone: "",
      patient_email: "",
      patient_know_by: "",
      event_name: "",
      doctor_name: "",
      data: [],
    });
  };

  const formatPhoneForWhatsApp = (phone: string | null) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 || cleaned.length === 10) {
      return `55${cleaned}`;
    }
    if (cleaned.length === 13 && cleaned.startsWith("55")) {
      return cleaned;
    }
    return cleaned;
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setCalendarRange(range);
    if (range?.from && range?.to) {
      onDateRangeChange(range.from, range.to);
    }
  };

  const FilterSelect = ({ 
    value, 
    onChange, 
    options, 
    placeholder 
  }: { 
    value: string; 
    onChange: (v: string) => void; 
    options: string[]; 
    placeholder: string;
  }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs bg-background border-border">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border z-50">
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map(opt => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-4">
      {/* Date Range Selector */}
      <div className="bg-card rounded-xl border border-border p-4 card-shadow animate-fade-in">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Período:</span>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 text-sm">
                {format(dateRange.start, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
              <CalendarComponent
                mode="range"
                selected={calendarRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <div className="ml-auto text-sm text-muted-foreground">
            Unidade: <span className="font-medium text-foreground">Sua Visão - Padre Pedro Pinto</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 card-shadow animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filtros</span>
          <span className="text-xs text-muted-foreground ml-2">
            {filteredRecords.length} de {attendances.length} registros
          </span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-7 text-xs">
              <X className="w-3 h-3 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nome</label>
            <FilterSelect
              value={filters.patient_name}
              onChange={(v) => setFilters(f => ({ ...f, patient_name: v === "all" ? "" : v }))}
              options={uniqueValues.patient_name}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Telefone</label>
            <FilterSelect
              value={filters.patient_phone}
              onChange={(v) => setFilters(f => ({ ...f, patient_phone: v === "all" ? "" : v }))}
              options={uniqueValues.patient_phone}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Email</label>
            <FilterSelect
              value={filters.patient_email}
              onChange={(v) => setFilters(f => ({ ...f, patient_email: v === "all" ? "" : v }))}
              options={uniqueValues.patient_email}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Como Conheceu</label>
            <FilterSelect
              value={filters.patient_know_by}
              onChange={(v) => setFilters(f => ({ ...f, patient_know_by: v === "all" ? "" : v }))}
              options={uniqueValues.patient_know_by}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Tipo</label>
            <FilterSelect
              value={filters.event_name}
              onChange={(v) => setFilters(f => ({ ...f, event_name: v === "all" ? "" : v }))}
              options={uniqueValues.event_name}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data</label>
            <CalendarFilterPopover
              selectedDates={filters.data}
              onDatesChange={(dates) => setFilters(f => ({ ...f, data: dates }))}
              placeholder="Todas"
              availableDates={uniqueValues.data}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Médico</label>
            <FilterSelect
              value={filters.doctor_name}
              onChange={(v) => setFilters(f => ({ ...f, doctor_name: v === "all" ? "" : v }))}
              options={uniqueValues.doctor_name}
              placeholder="Todos"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden card-shadow-lg animate-fade-in">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Carregando atendimentos...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-table-header border-b border-table-border">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[200px]">Nome</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">Telefone</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[180px]">Email</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">Como Conheceu</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[150px]">Tipo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Data</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[150px]">Médico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-table-border">
                {filteredRecords.map((record, index) => {
                  const whatsappNumber = formatPhoneForWhatsApp(record.patient_phone);
                  return (
                    <tr 
                      key={record.id} 
                      className="table-cell-hover animate-slide-in"
                      style={{ animationDelay: `${index * 15}ms` }}
                    >
                      <td className="px-3 py-2 text-sm">{record.patient_name}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{record.patient_phone || "-"}</span>
                          {whatsappNumber && (
                            <a
                              href={`https://wa.me/${whatsappNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-md hover:bg-accent/20 text-accent transition-colors"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm">{record.patient_email || "-"}</td>
                      <td className="px-3 py-2 text-sm">{record.patient_know_by || "-"}</td>
                      <td className="px-3 py-2 text-sm">{record.event_name}</td>
                      <td className="px-3 py-2 text-sm">{record.date}</td>
                      <td className="px-3 py-2 text-sm">{record.doctor_name || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && filteredRecords.length === 0 && (
          <div className="px-6 py-12 text-center text-muted-foreground">
            <p>Nenhum atendimento encontrado.</p>
            <p className="text-sm mt-1">
              {hasActiveFilters 
                ? "Tente ajustar os filtros." 
                : "Ajuste o período ou verifique se há atendimentos concluídos na unidade."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
