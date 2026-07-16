import { useState, useMemo, useEffect } from "react";
import { Filter, X, MessageCircle, Calendar, RefreshCw, Users, FileText, Tag, ChevronDown, Check, TrendingUp, Percent, ShoppingCart, Store, UserCheck, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarFilterPopover } from "./CalendarFilterPopover";
import { EditableCell } from "./EditableCell";
import { ExpandableTextCell } from "./ExpandableTextCell";
import { YesNoSelectCell } from "./YesNoSelectCell";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AmigoAttendance } from "@/hooks/useDetalhadoAmigo";
import type { GenericRecord } from "@/hooks/useGenericTable";
import type { DateRange } from "react-day-picker";
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

interface DetalhadoAmigoTableProps {
  attendances: AmigoAttendance[];
  isLoading: boolean;
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (start: Date, end: Date) => void;
  onRefresh: () => void;
  dbRecords: GenericRecord[];
  onUpdateDb: (id: string, field: string, value: string) => void;
  onCreateDb: (record: Partial<GenericRecord>) => Promise<string | null>;
  onDeleteDb: (id: string) => void;
  onRefreshDb: () => void;
}

interface Filters {
  patient_name: string;
  data: string[];
  como_conheceu: string[];
  receita: string[];
  venda: string[];
  visitou_loja: string[];
  tipo: string[];
}

// Tipo combinado: dados da API + dados editáveis do banco
interface CombinedRecord {
  apiId: string;
  dbId: string | null;
  date: string;
  time: string; // Horário do atendimento para ordenação
  patient_name: string;
  patient_age: number | null;
  patient_phone: string | null;
  patient_know_by: string | null;
  event_name: string; // Tipo de atendimento da API
// Campos editáveis do banco
  como_conheceu: string;
  receita: string;
  visitou_loja: string;
  venda: string;
  obs: string;
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
  onDeleteDb,
  onRefreshDb
}: DetalhadoAmigoTableProps) {
  const [filters, setFilters] = useState<Filters>({
    patient_name: "",
    data: [],
    como_conheceu: [],
    receita: [],
    venda: [],
    visitou_loja: [],
    tipo: [],
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

  // Normalizar nome para comparação (lowercase, sem espaços extras)
  const normalizeName = (name: string | null | undefined): string => {
    if (!name) return "";
    return name.toLowerCase().trim().replace(/\s+/g, " ");
  };

  // Combinar dados da API com dados do banco
  const combinedRecords = useMemo((): CombinedRecord[] => {
    return attendances.map(att => {
      // Procurar registro no banco pelo nome normalizado e data
      const dbRecord = dbRecords.find(db => 
        normalizeName(db.nome) === normalizeName(att.patient_name) && db.data === att.date
      );

      return {
        apiId: att.id,
        dbId: dbRecord?.id || null,
        date: att.date,
        time: att.time || "", // Horário do atendimento
        patient_name: att.patient_name,
        patient_age: att.patient_age,
        patient_phone: att.patient_phone,
        patient_know_by: att.patient_know_by,
        event_name: att.event_name || "",
        // Prioriza o valor do banco, mas usa o da API como fallback
        como_conheceu: dbRecord?.como_conheceu || att.patient_know_by || "",
        receita: dbRecord?.receita || "",
        visitou_loja: dbRecord?.visitou_loja || "",
        venda: (dbRecord as any)?.venda || "",
        obs: (dbRecord as any)?.obs || "",
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
      tipo: [...new Set(combinedRecords.map(r => r.event_name).filter(Boolean))].sort() as string[],
    };
  }, [combinedRecords, uniqueValuesFromDb]);

  const filteredRecords = useMemo(() => {
    const filtered = combinedRecords.filter(record => {
      // Filtro de busca por nome (case-insensitive)
      if (filters.patient_name && !record.patient_name?.toLowerCase().includes(filters.patient_name.toLowerCase())) return false;
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
      // Filtro multi-select para Venda
      if (filters.venda.length > 0) {
        const value = record.venda || "";
        if (!filters.venda.includes(value)) return false;
      }
      // Filtro multi-select para Visitou a Loja
      if (filters.visitou_loja.length > 0) {
        const value = record.visitou_loja || "";
        if (!filters.visitou_loja.includes(value)) return false;
      }
      // Filtro multi-select para Tipo
      if (filters.tipo.length > 0) {
        const value = record.event_name || "";
        if (!filters.tipo.includes(value)) return false;
      }
      return true;
    });
    // Ordenar por data e hora decrescente (mais recentes primeiro)
    return filtered.sort((a, b) => {
      const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')) : new Date(0);
      const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')) : new Date(0);
      const dateDiff = dateB.getTime() - dateA.getTime();
      if (dateDiff !== 0) return dateDiff;
      // Se mesma data, ordenar por hora decrescente
      const timeA = a.time || "00:00";
      const timeB = b.time || "00:00";
      return timeB.localeCompare(timeA);
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
      venda: [],
      visitou_loja: [],
      tipo: [],
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
        obs: field === "obs" ? value : "",
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

  // Registros filtrados SEM o filtro de como_conheceu (para calcular total do período)
  const recordsWithoutComoConheceuFilter = useMemo(() => {
    return combinedRecords.filter(record => {
      if (filters.patient_name && record.patient_name !== filters.patient_name) return false;
      if (filters.data.length > 0 && !filters.data.includes(record.date || "")) return false;
      if (filters.receita.length > 0) {
        const value = record.receita || "";
        if (!filters.receita.includes(value)) return false;
      }
      return true;
    });
  }, [combinedRecords, filters.patient_name, filters.data, filters.receita]);

  // Métricas calculadas baseadas nos filtros ativos
  const metrics = useMemo(() => {
    // Consultas = Total de leads do período (sem filtro como_conheceu)
    const consultas = recordsWithoutComoConheceuFilter.length;
    
    // Receitas Totais = Todos com receita = sim (do período, sem filtro como_conheceu)
    const receitasTotais = recordsWithoutComoConheceuFilter.filter(r => 
      r.receita?.toLowerCase() === "sim"
    ).length;
    
    // Agrupamento por "como_conheceu" para filtro interativo (apenas receita=sim)
    const byComoConheceu: Record<string, number> = {};
    recordsWithoutComoConheceuFilter.forEach(r => {
      if (r.receita?.toLowerCase() === "sim") {
        const key = r.como_conheceu || "Não informado";
        byComoConheceu[key] = (byComoConheceu[key] || 0) + 1;
      }
    });
    
    // Receitas com potencial de venda = Receitas sim COM filtro de como_conheceu aplicado
    const receitasPotencial = filteredRecords.filter(r => 
      r.receita?.toLowerCase() === "sim"
    ).length;
    
    // Vendas = registros com venda preenchida (sim)
    const vendasRecords = filteredRecords.filter(r => 
      r.venda?.toLowerCase() === "sim"
    );
    const vendas = vendasRecords.length;

    // Média de idade dos clientes que compraram
    const vendasComIdade = vendasRecords.filter((r) => r.patient_age !== null);
    const mediaIdadeCompradores = vendasComIdade.length > 0
      ? (vendasComIdade.reduce((acc, record) => acc + (record.patient_age || 0), 0) / vendasComIdade.length).toFixed(1)
      : "-";
    
    // Visitou a Loja = registros com visitou_loja = sim (com filtro como_conheceu)
    const visitouLoja = filteredRecords.filter(r => 
      r.visitou_loja?.toLowerCase() === "sim"
    ).length;
    
    // Taxa de Presença = Visitou a Loja / Receitas com potencial
    const taxaPresenca = receitasPotencial > 0 
      ? ((visitouLoja / receitasPotencial) * 100).toFixed(0) 
      : "0";
    
    // Conversão = Vendas / Visitou a Loja
    const conversao = visitouLoja > 0 
      ? ((vendas / visitouLoja) * 100).toFixed(0) 
      : "0";
    
    // Receitas x Consultas = Receitas c/ Potencial / Consultas
    const receitasXConsultas = consultas > 0 
      ? ((receitasPotencial / consultas) * 100).toFixed(0) 
      : "0";
    
    return {
      consultas,
      receitasTotais,
      byComoConheceu,
      receitasPotencial,
      visitouLoja,
      taxaPresenca,
      vendas,
      mediaIdadeCompradores,
      conversao,
      receitasXConsultas
    };
  }, [recordsWithoutComoConheceuFilter, filteredRecords]);

  return (
    <div className="space-y-4">
      {/* Métricas / Kanbans */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 animate-fade-in">
        {/* Consultas (Total de Leads) */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Consultas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.consultas}</p>
          </CardContent>
        </Card>

        {/* Receitas Totais */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">Receitas Totais</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.receitasTotais}</p>
          </CardContent>
        </Card>

        {/* Receitas c/ Potencial (filtro como conheceu) */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground">Receitas c/ Potencial</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-9 justify-between text-sm">
                  <span className="truncate">
                    {filters.como_conheceu.length === 0 
                      ? "Selecionar origens" 
                      : `${filters.como_conheceu.length} origem(ns)`}
                  </span>
                  <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0 bg-popover border-border" align="start">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <button
                    className="text-sm text-foreground hover:underline"
                    onClick={() => setFilters(f => ({ 
                      ...f, 
                      como_conheceu: Object.keys(metrics.byComoConheceu) 
                    }))}
                  >
                    Marcar todos
                  </button>
                  <X className="w-4 h-4 text-muted-foreground" />
                  <button
                    className="text-sm text-foreground hover:underline"
                    onClick={() => setFilters(f => ({ ...f, como_conheceu: [] }))}
                  >
                    Limpar
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {Object.entries(metrics.byComoConheceu)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([origem, count]) => {
                      const isSelected = filters.como_conheceu.includes(origem);
                      return (
                        <button
                          key={origem}
                          onClick={() => {
                            setFilters(f => {
                              const current = f.como_conheceu;
                              if (current.includes(origem)) {
                                return { ...f, como_conheceu: current.filter(v => v !== origem) };
                              } else {
                                return { ...f, como_conheceu: [...current, origem] };
                              }
                            });
                          }}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 text-left"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? "bg-primary border-primary" : "border-border"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="text-sm text-foreground truncate flex-1">{origem}</span>
                          <span className="text-xs text-muted-foreground">({count})</span>
                        </button>
                      );
                    })}
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-2xl font-bold text-foreground mt-2">{metrics.receitasPotencial}</p>
          </CardContent>
        </Card>
        
        {/* Visitou a Loja */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Visitou a Loja</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.visitouLoja}</p>
          </CardContent>
        </Card>

        {/* Taxa de Presença */}
        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-medium text-muted-foreground">Taxa de Presença</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.taxaPresenca}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">Visitou ÷ Potencial</p>
          </CardContent>
        </Card>

        {/* Vendas */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Vendas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.vendas}</p>
          </CardContent>
        </Card>

        {/* Média de Idade */}
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-medium text-muted-foreground">Média de Idade</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {metrics.mediaIdadeCompradores === "-" ? "-" : `${metrics.mediaIdadeCompradores} anos`}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Clientes com venda = sim</p>
          </CardContent>
        </Card>

        {/* Conversão */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium text-muted-foreground">Conversão</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.conversao}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">Vendas ÷ Visitou Loja</p>
          </CardContent>
        </Card>

        {/* Receitas x Consultas */}
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-medium text-muted-foreground">Receitas x Consultas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.receitasXConsultas}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">Potencial ÷ Consultas</p>
          </CardContent>
        </Card>
      </div>

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
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                type="text"
                value={filters.patient_name}
                onChange={(e) => setFilters(f => ({ ...f, patient_name: e.target.value }))}
                placeholder="Buscar nome..."
                className="h-8 text-xs pl-7 bg-background border-border"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Tipo</label>
            <MultiSelectFilter
              options={uniqueValues.tipo}
              selectedValues={filters.tipo}
              onSelectionChange={(values) => setFilters(f => ({ ...f, tipo: values }))}
              placeholder="Todos"
              emptyText="Nenhum tipo"
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
            <label className="text-xs text-muted-foreground">Venda</label>
            <MultiSelectFilter
              options={["Sim", "Não"]}
              selectedValues={filters.venda}
              onSelectionChange={(values) => setFilters(f => ({ ...f, venda: values }))}
              placeholder="Todos"
              emptyText="Nenhum valor"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Visitou a Loja</label>
            <MultiSelectFilter
              options={["Sim", "Não"]}
              selectedValues={filters.visitou_loja}
              onSelectionChange={(values) => setFilters(f => ({ ...f, visitou_loja: values }))}
              placeholder="Todos"
              emptyText="Nenhum valor"
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
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">Idade</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">Telefone</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Tipo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">Como Conheceu</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">Receita</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">Venda</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Data</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Visitou a Loja</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px]">Obs</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[50px]"></th>
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
                      <td className="px-3 py-2 text-sm">
                        <div>{record.patient_name}</div>
                        {record.time && (
                          <div className="text-xs text-muted-foreground">{record.time}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">{record.patient_age !== null ? `${record.patient_age} anos` : "-"}</td>
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
                        <YesNoSelectCell 
                          value={record.receita} 
                          onSave={(v) => handleDbUpdate(record, "receita", v)} 
                          placeholder="Receita" 
                        />
                      </td>
                      <td className="px-1 py-1">
                        <YesNoSelectCell 
                          value={record.venda} 
                          onSave={(v) => handleDbUpdate(record, "venda", v)} 
                          placeholder="Venda" 
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{record.date}</td>
                      <td className="px-1 py-1">
                        <YesNoSelectCell 
                          value={record.visitou_loja} 
                          onSave={(v) => handleDbUpdate(record, "visitou_loja", v)} 
                          placeholder="Visitou" 
                        />
                      </td>
                      <td className="px-1 py-1">
                        <ExpandableTextCell 
                          value={record.obs} 
                          onSave={(v) => handleDbUpdate(record, "obs", v)} 
                          placeholder="Motivo / observação" 
                        />
                      </td>
                      <td className="px-1 py-1 text-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir registro</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir <strong>{record.patient_name}</strong> da lista? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => {
                                  if (record.dbId) {
                                    onDeleteDb(record.dbId);
                                  }
                                }}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
