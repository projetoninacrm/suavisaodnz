import { useState, useMemo, useEffect } from "react";
import { Filter, X, MessageCircle, Calendar, RefreshCw, Users, FileText, Store, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarFilterPopover } from "./CalendarFilterPopover";
import { EditableCell } from "./EditableCell";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AmigoAttendance } from "@/hooks/useDetalhadoAmigo";
import type { GenericRecord } from "@/hooks/useGenericTable";
import type { DateRange } from "react-day-picker";

interface DetalhadoAmigoTableProps {
  attendances: AmigoAttendance[];
  isLoading: boolean;
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (start: Date, end: Date) => void;
  onRefresh: () => void;
  dbRecords: GenericRecord[];
  onUpdateDb: (id: string, field: string, value: string) => void;
  onCreateDb: (record: Partial<GenericRecord>) => Promise<string | null>;
  onRefreshDb: () => void;
}

interface Filters {
  patient_name: string;
  data: string[];
  como_conheceu: string[];
  receita: string[];
}

// Tipo combinado: dados da API + dados editáveis do banco
interface CombinedRecord {
  apiId: string;
  dbId: string | null;
  date: string;
  patient_name: string;
  patient_phone: string | null;
  patient_know_by: string | null;
  event_name: string; // Tipo de atendimento da API
  // Campos editáveis do banco
  como_conheceu: string;
  receita: string;
  visitou_loja: string;
}

export function DetalhadoAmigoTable({ 
  attendances, 
  isLoading, 
  dateRange,
  onDateRangeChange,
  onRefresh,
  dbRecords,
  onUpdateDb,
  onCreateDb,
  onRefreshDb
}: DetalhadoAmigoTableProps) {
  const [filters, setFilters] = useState<Filters>({
    patient_name: "",
    data: [],
    como_conheceu: [],
    receita: [],
  });

  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>({
    from: dateRange.start,
    to: dateRange.end,
  });

  // Carregar dados do banco quando a API retornar
  useEffect(() => {
    if (attendances.length > 0) {
      onRefreshDb();
    }
  }, [attendances.length]);

  // Combinar dados da API com dados do banco
  const combinedRecords = useMemo((): CombinedRecord[] => {
    return attendances.map(att => {
      // Procurar registro no banco pelo nome e data (ou telefone)
      const dbRecord = dbRecords.find(db => 
        db.nome === att.patient_name && db.data === att.date
      ) || dbRecords.find(db =>
        db.telefone === att.patient_phone && db.data === att.date
      );

      return {
        apiId: att.id,
        dbId: dbRecord?.id || null,
        date: att.date,
        patient_name: att.patient_name,
        patient_phone: att.patient_phone,
        patient_know_by: att.patient_know_by,
        event_name: att.event_name || "",
        // Prioriza o valor do banco, mas usa o da API como fallback
        como_conheceu: dbRecord?.como_conheceu || att.patient_know_by || "",
        receita: dbRecord?.receita || "",
        visitou_loja: dbRecord?.visitou_loja || "",
      };
    });
  }, [attendances, dbRecords]);

  // Buscar valores únicos do banco para os filtros (além da API)
  const uniqueValuesFromDb = useMemo(() => {
    const comoConheceuDb = dbRecords.map(r => r.como_conheceu).filter(Boolean) as string[];
    const receitaDb = dbRecords.map(r => r.receita).filter(Boolean) as string[];
    return { comoConheceuDb, receitaDb };
  }, [dbRecords]);

  const uniqueValues = useMemo(() => {
    // Combinar valores da API + banco para os filtros
    const allComoConheceu = [
      ...combinedRecords.map(r => r.como_conheceu),
      ...uniqueValuesFromDb.comoConheceuDb
    ].filter(Boolean);
    
    const allReceita = [
      ...combinedRecords.map(r => r.receita),
      ...uniqueValuesFromDb.receitaDb
    ].filter(Boolean);

    return {
      patient_name: [...new Set(combinedRecords.map(r => r.patient_name).filter(Boolean))] as string[],
      data: [...new Set(combinedRecords.map(r => r.date).filter(Boolean))] as string[],
      como_conheceu: [...new Set(allComoConheceu)].sort() as string[],
      receita: [...new Set(allReceita)].sort() as string[],
    };
  }, [combinedRecords, uniqueValuesFromDb]);

  const filteredRecords = useMemo(() => {
    return combinedRecords.filter(record => {
      if (filters.patient_name && record.patient_name !== filters.patient_name) return false;
      if (filters.data.length > 0 && !filters.data.includes(record.date || "")) return false;
      // Filtro multi-select para Como Conheceu
      if (filters.como_conheceu.length > 0) {
        const value = record.como_conheceu || "";
        if (!filters.como_conheceu.includes(value)) return false;
      }
      // Filtro multi-select para Receita
      if (filters.receita.length > 0) {
        const value = record.receita || "";
        if (!filters.receita.includes(value)) return false;
      }
      return true;
    });
  }, [combinedRecords, filters]);

  const hasActiveFilters = Object.entries(filters).some(([, value]) => 
    Array.isArray(value) ? value.length > 0 : value !== ""
  );

  const clearFilters = () => {
    setFilters({
      patient_name: "",
      data: [],
      como_conheceu: [],
      receita: [],
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

  // Handler para editar campos do banco (receita, visitou_loja, como_conheceu)
  const handleDbUpdate = async (record: CombinedRecord, field: string, value: string) => {
    if (record.dbId) {
      // Atualizar registro existente no banco
      onUpdateDb(record.dbId, field, value);
    } else {
      // Criar novo registro no banco com os dados da API
      const newId = await onCreateDb({
        nome: record.patient_name,
        telefone: record.patient_phone || "",
        data: record.date,
        como_conheceu: field === "como_conheceu" ? value : record.patient_know_by || "",
        receita: field === "receita" ? value : "",
        visitou_loja: field === "visitou_loja" ? value : "",
      });
      if (newId) {
        // Recarregar dados do banco para atualizar a UI
        onRefreshDb();
      }
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

  // Métricas calculadas baseadas nos filtros ativos
  const metrics = useMemo(() => {
    // Total de leads únicos (por nome)
    const uniqueLeads = new Set(filteredRecords.map(r => r.patient_name)).size;
    
    // Agrupamento por "como_conheceu"
    const byComoConheceu: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const key = r.como_conheceu || "Não informado";
      byComoConheceu[key] = (byComoConheceu[key] || 0) + 1;
    });
    
    // Receita Sim / Não
    const receitaSim = filteredRecords.filter(r => 
      r.receita?.toLowerCase() === "sim"
    ).length;
    const receitaNao = filteredRecords.filter(r => 
      r.receita?.toLowerCase() === "não" || r.receita?.toLowerCase() === "nao"
    ).length;
    
    // Visitou DNZ
    const visitouDnz = filteredRecords.filter(r => 
      r.visitou_loja?.toLowerCase() === "sim"
    ).length;
    
    return {
      uniqueLeads,
      byComoConheceu,
      receitaSim,
      receitaNao,
      visitouDnz
    };
  }, [filteredRecords]);

  return (
    <div className="space-y-4">
      {/* Métricas / Kanbans */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-fade-in">
        {/* Total de Leads */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Total Leads</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.uniqueLeads}</p>
          </CardContent>
        </Card>
        
        {/* Receita = Sim */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">Receita Sim</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.receitaSim}</p>
          </CardContent>
        </Card>
        
        {/* Receita = Não */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium text-muted-foreground">Receita Não</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.receitaNao}</p>
          </CardContent>
        </Card>
        
        {/* Visitou DNZ */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Visitou DNZ</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.visitouDnz}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards dinâmicos por Como Conheceu */}
      {Object.keys(metrics.byComoConheceu).length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 card-shadow animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Leads por Origem (Como Conheceu)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(metrics.byComoConheceu)
              .sort((a, b) => b[1] - a[1])
              .map(([origem, count]) => (
                <div 
                  key={origem} 
                  className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border"
                >
                  <span className="text-sm text-foreground">{origem}</span>
                  <span className="bg-primary/20 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <label className="text-xs text-muted-foreground">Como Conheceu</label>
            <MultiSelectFilter
              options={uniqueValues.como_conheceu}
              selectedValues={filters.como_conheceu}
              onSelectionChange={(values) => setFilters(f => ({ ...f, como_conheceu: values }))}
              placeholder="Todos"
              emptyText="Nenhum valor preenchido"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Receita</label>
            <MultiSelectFilter
              options={uniqueValues.receita}
              selectedValues={filters.receita}
              onSelectionChange={(values) => setFilters(f => ({ ...f, receita: values }))}
              placeholder="Todos"
              emptyText="Nenhum valor preenchido"
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
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Tipo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">Como Conheceu</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">Receita</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Data</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Visitou a Loja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-table-border">
                {filteredRecords.map((record, index) => {
                  const whatsappNumber = formatPhoneForWhatsApp(record.patient_phone);
                  return (
                    <tr 
                      key={record.apiId} 
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
                      <td className="px-3 py-2 text-sm">{record.event_name || "-"}</td>
                      <td className="px-1 py-1">
                        <EditableCell 
                          value={record.como_conheceu} 
                          onSave={(v) => handleDbUpdate(record, "como_conheceu", v)} 
                          placeholder="Como Conheceu" 
                        />
                      </td>
                      <td className="px-1 py-1">
                        <EditableCell 
                          value={record.receita} 
                          onSave={(v) => handleDbUpdate(record, "receita", v)} 
                          placeholder="Receita" 
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{record.date}</td>
                      <td className="px-1 py-1">
                        <EditableCell 
                          value={record.visitou_loja} 
                          onSave={(v) => handleDbUpdate(record, "visitou_loja", v)} 
                          placeholder="Sim/Não" 
                        />
                      </td>
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
