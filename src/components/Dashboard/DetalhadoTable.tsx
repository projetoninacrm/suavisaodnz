import { useState, useMemo } from "react";
import { Trash2, Filter, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableCell } from "./EditableCell";
import { CalendarFilterPopover } from "./CalendarFilterPopover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GenericRecord } from "@/hooks/useGenericTable";

interface DetalhadoTableProps {
  records: GenericRecord[];
  onUpdate: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
}

interface Filters {
  nome: string;
  telefone: string;
  email: string;
  como_conheceu: string;
  receita: string;
  data: string[];
  visitou_loja: string;
}

export function DetalhadoTable({ records, onUpdate, onDelete }: DetalhadoTableProps) {
  const [filters, setFilters] = useState<Filters>({
    nome: "",
    telefone: "",
    email: "",
    como_conheceu: "",
    receita: "",
    data: [],
    visitou_loja: "",
  });

  const uniqueValues = useMemo(() => ({
    nome: [...new Set(records.map(r => r.nome).filter(Boolean))] as string[],
    telefone: [...new Set(records.map(r => r.telefone).filter(Boolean))] as string[],
    email: [...new Set(records.map(r => r.email).filter(Boolean))] as string[],
    como_conheceu: [...new Set(records.map(r => r.como_conheceu).filter(Boolean))] as string[],
    receita: [...new Set(records.map(r => r.receita).filter(Boolean))] as string[],
    data: [...new Set(records.map(r => r.data).filter(Boolean))] as string[],
    visitou_loja: [...new Set(records.map(r => r.visitou_loja).filter(Boolean))] as string[],
  }), [records]);

  // Função para converter data DD/MM/YYYY em Date para ordenação
  const parseDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return null;
  };

  const filteredRecords = useMemo(() => {
    const filtered = records.filter(record => {
      if (filters.nome && record.nome !== filters.nome) return false;
      if (filters.telefone && record.telefone !== filters.telefone) return false;
      if (filters.email && record.email !== filters.email) return false;
      if (filters.como_conheceu && record.como_conheceu !== filters.como_conheceu) return false;
      if (filters.receita && record.receita !== filters.receita) return false;
      if (filters.data.length > 0 && !filters.data.includes(record.data || "")) return false;
      if (filters.visitou_loja && record.visitou_loja !== filters.visitou_loja) return false;
      return true;
    });

    // Ordenar por data em ordem crescente
    return filtered.sort((a, b) => {
      const dateA = parseDate(a.data);
      const dateB = parseDate(b.data);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });
  }, [records, filters]);

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    Array.isArray(value) ? value.length > 0 : value !== ""
  );

  const clearFilters = () => {
    setFilters({
      nome: "",
      telefone: "",
      email: "",
      como_conheceu: "",
      receita: "",
      data: [],
      visitou_loja: "",
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

  const PhoneCell = ({ phone, recordId }: { phone: string | null; recordId: string }) => {
    const [isEditing, setIsEditing] = useState(false);

    if (isEditing) {
      return (
        <EditableCell 
          value={phone || ""} 
          onSave={(v) => {
            onUpdate(recordId, "telefone", v);
            setIsEditing(false);
          }} 
          placeholder="Telefone" 
        />
      );
    }

    const whatsappNumber = formatPhoneForWhatsApp(phone);
    
    if (!phone) {
      return (
        <div 
          onClick={() => setIsEditing(true)}
          className="px-3 py-2 text-sm cursor-pointer min-h-[36px] rounded-md hover:bg-muted/50 transition-colors"
        >
          <span className="text-muted-foreground">-</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 px-2">
        <span 
          onClick={() => setIsEditing(true)}
          className="text-sm cursor-pointer hover:text-primary transition-colors"
        >
          {phone}
        </span>
        {whatsappNumber && (
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-accent/20 text-accent transition-colors"
            title="Abrir WhatsApp"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="w-4 h-4" />
          </a>
        )}
      </div>
    );
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
      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 card-shadow animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filtros</span>
          <span className="text-xs text-muted-foreground ml-2">
            {filteredRecords.length} de {records.length} registros
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
              value={filters.nome}
              onChange={(v) => setFilters(f => ({ ...f, nome: v === "all" ? "" : v }))}
              options={uniqueValues.nome}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Telefone</label>
            <FilterSelect
              value={filters.telefone}
              onChange={(v) => setFilters(f => ({ ...f, telefone: v === "all" ? "" : v }))}
              options={uniqueValues.telefone}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Email</label>
            <FilterSelect
              value={filters.email}
              onChange={(v) => setFilters(f => ({ ...f, email: v === "all" ? "" : v }))}
              options={uniqueValues.email}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Como Conheceu</label>
            <FilterSelect
              value={filters.como_conheceu}
              onChange={(v) => setFilters(f => ({ ...f, como_conheceu: v === "all" ? "" : v }))}
              options={uniqueValues.como_conheceu}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Receita</label>
            <FilterSelect
              value={filters.receita}
              onChange={(v) => setFilters(f => ({ ...f, receita: v === "all" ? "" : v }))}
              options={uniqueValues.receita}
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
            <label className="text-xs text-muted-foreground">Visitou Loja</label>
            <FilterSelect
              value={filters.visitou_loja}
              onChange={(v) => setFilters(f => ({ ...f, visitou_loja: v === "all" ? "" : v }))}
              options={uniqueValues.visitou_loja}
              placeholder="Todos"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden card-shadow-lg animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-table-header border-b border-table-border">
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[200px]">Nome</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[160px]">Telefone</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[180px]">Email</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[150px]">Como Conheceu</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Receita</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Data</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Visitou Loja</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[50px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-table-border">
              {filteredRecords.map((record, index) => (
                <tr 
                  key={record.id} 
                  className="table-cell-hover animate-slide-in"
                  style={{ animationDelay: `${index * 15}ms` }}
                >
                  <td className="px-1 py-1">
                    <EditableCell value={record.nome || ""} onSave={(v) => onUpdate(record.id, "nome", v)} placeholder="Nome" />
                  </td>
                  <td className="py-1">
                    <PhoneCell phone={record.telefone || null} recordId={record.id} />
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell value={record.email || ""} onSave={(v) => onUpdate(record.id, "email", v)} placeholder="Email" />
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell value={record.como_conheceu || ""} onSave={(v) => onUpdate(record.id, "como_conheceu", v)} placeholder="Como Conheceu" />
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell value={record.receita || ""} onSave={(v) => onUpdate(record.id, "receita", v)} placeholder="Receita" />
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell value={record.data || ""} onSave={(v) => onUpdate(record.id, "data", v)} placeholder="Data" />
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell value={record.visitou_loja || ""} onSave={(v) => onUpdate(record.id, "visitou_loja", v)} placeholder="Visitou" />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <Button variant="ghost" size="icon" onClick={() => onDelete(record.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRecords.length === 0 && (
          <div className="px-6 py-12 text-center text-muted-foreground">
            <p>Nenhum registro encontrado.</p>
            <p className="text-sm mt-1">{hasActiveFilters ? "Tente ajustar os filtros." : "Clique em \"Nova Linha\" para adicionar."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
