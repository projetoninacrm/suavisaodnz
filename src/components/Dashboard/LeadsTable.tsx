import { useState, useMemo } from "react";
import { Trash2, MessageCircle, Filter, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EditableCell } from "./EditableCell";
import { DatePickerCell } from "./DatePickerCell";
import { SelectCell } from "./SelectCell";
import { CalendarFilterPopover } from "./CalendarFilterPopover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Lead } from "@/hooks/useLeads";

const CANAL_OPTIONS = ["Internet", "Sua Visão", "Loja"];

export interface LeadsFilters {
  data_registro: string[];
  canal: string;
  nome: string;
  orcamento: string;
  venda: string;
  entrar_em_contato: string[];
  medico: string;
  status: string;
  pendente: boolean;
}

interface LeadsTableProps {
  leads: Lead[];
  onUpdate: (id: string, field: keyof Lead, value: string) => void;
  onDelete: (id: string) => void;
  onFiltersChange?: (filters: LeadsFilters) => void;
}

export function LeadsTable({ leads, onUpdate, onDelete, onFiltersChange }: LeadsTableProps) {
  const [filters, setFilters] = useState<LeadsFilters>({
    data_registro: [],
    canal: "",
    nome: "",
    orcamento: "",
    venda: "",
    entrar_em_contato: [],
    medico: "",
    status: "",
    pendente: false,
  });

  const updateFilters = (newFilters: LeadsFilters) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const uniqueValues = useMemo(() => ({
    data_registro: [...new Set(leads.map(l => l.data_registro).filter(Boolean))] as string[],
    canal: [...new Set(leads.map(l => l.canal).filter(Boolean))] as string[],
    nome: [...new Set(leads.map(l => l.nome).filter(Boolean))].sort() as string[],
    orcamento: ["Sim", "Não"],
    venda: ["Sim", "Não"],
    entrar_em_contato: [...new Set(leads.map(l => l.entrar_em_contato).filter(Boolean))] as string[],
    medico: [...new Set(leads.map(l => l.medico).filter(Boolean))] as string[],
    status: ["Ativo", "Perdido", "Pós Venda"],
    vendedor: ["Bernardo", "Thayssa"],
  }), [leads]);

  const isContactDateOverdue = (lead: Lead) => {
    if (!lead.entrar_em_contato) return false;
    if (lead.status === "Perdido" || lead.status === "Pós Venda") return false;
    
    const [day, month, year] = lead.entrar_em_contato.split('/').map(Number);
    const contactDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return contactDate < today;
  };

  const filteredLeads = useMemo(() => {
    const filtered = leads.filter(lead => {
      if (filters.data_registro.length > 0 && !filters.data_registro.includes(lead.data_registro || "")) return false;
      if (filters.canal && lead.canal !== filters.canal) return false;
      if (filters.nome && !(lead.nome || "").toLowerCase().includes(filters.nome.toLowerCase())) return false;
      if (filters.orcamento && lead.orcamento !== filters.orcamento) return false;
      if (filters.venda && lead.venda !== filters.venda) return false;
      if (filters.entrar_em_contato.length > 0 && !filters.entrar_em_contato.includes(lead.entrar_em_contato || "")) return false;
      if (filters.medico && lead.medico !== filters.medico) return false;
      if (filters.status && lead.status !== filters.status) return false;
      if (filters.pendente && !isContactDateOverdue(lead)) return false;
      return true;
    });
    // Ordenar por data decrescente (mais recentes primeiro)
    return filtered.sort((a, b) => {
      const dateA = a.data_registro ? new Date(a.data_registro.split('/').reverse().join('-')) : new Date(0);
      const dateB = b.data_registro ? new Date(b.data_registro.split('/').reverse().join('-')) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [leads, filters]);

  const hasActiveFilters = filters.data_registro.length > 0 || filters.canal !== "" || filters.nome !== "" || filters.orcamento !== "" || filters.venda !== "" || filters.entrar_em_contato.length > 0 || filters.medico !== "" || filters.status !== "" || filters.pendente;

  const clearFilters = () => {
    const newFilters = {
      data_registro: [],
      canal: "",
      nome: "",
      orcamento: "",
      venda: "",
      entrar_em_contato: [],
      medico: "",
      status: "",
      pendente: false,
    };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const statusBadge = (value: string | null) => {
    if (value === "Sim") {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-accent/20 text-accent">Sim</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-muted text-muted-foreground">Não</span>;
  };

  const statusClienteBadge = (value: string | null) => {
    if (value === "Perdido") {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-destructive/20 text-destructive">Perdido</span>;
    }
    if (value === "Pós Venda") {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">Pós Venda</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-accent/20 text-accent">Ativo</span>;
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

  const PhoneCell = ({ phone, leadId }: { phone: string | null; leadId: string }) => {
    const [isEditing, setIsEditing] = useState(false);

    if (isEditing) {
      return (
        <EditableCell 
          value={phone || ""} 
          onSave={(v) => {
            onUpdate(leadId, "numero", v);
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
            {filteredLeads.length} de {leads.length} leads
          </span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-7 text-xs">
              <X className="w-3 h-3 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data</label>
            <CalendarFilterPopover
              selectedDates={filters.data_registro}
              onDatesChange={(dates) => updateFilters({ ...filters, data_registro: dates })}
              placeholder="Todas"
              availableDates={uniqueValues.data_registro}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Canal</label>
            <FilterSelect
              value={filters.canal}
              onChange={(v) => updateFilters({ ...filters, canal: v === "all" ? "" : v })}
              options={uniqueValues.canal}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nome</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={filters.nome}
                onChange={(e) => updateFilters({ ...filters, nome: e.target.value })}
                className="h-8 text-xs pl-7 bg-background border-border"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Orçamento</label>
            <FilterSelect
              value={filters.orcamento}
              onChange={(v) => updateFilters({ ...filters, orcamento: v === "all" ? "" : v })}
              options={uniqueValues.orcamento}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Venda</label>
            <FilterSelect
              value={filters.venda}
              onChange={(v) => updateFilters({ ...filters, venda: v === "all" ? "" : v })}
              options={uniqueValues.venda}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Entrar em Contato</label>
            <CalendarFilterPopover
              selectedDates={filters.entrar_em_contato}
              onDatesChange={(dates) => updateFilters({ ...filters, entrar_em_contato: dates })}
              placeholder="Todas"
              availableDates={uniqueValues.entrar_em_contato}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Médico</label>
            <FilterSelect
              value={filters.medico}
              onChange={(v) => updateFilters({ ...filters, medico: v === "all" ? "" : v })}
              options={uniqueValues.medico}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <FilterSelect
              value={filters.status}
              onChange={(v) => updateFilters({ ...filters, status: v === "all" ? "" : v })}
              options={uniqueValues.status}
              placeholder="Todos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Pendente</label>
            <Button
              variant={filters.pendente ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilters({ ...filters, pendente: !filters.pendente })}
              className={`h-8 w-full text-xs ${filters.pendente ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}`}
            >
              {filters.pendente ? "Filtrando" : "Filtrar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden card-shadow-lg animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-table-header border-b border-table-border">
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[110px]">Data</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Canal</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px]">Nome</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[160px]">Número</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">Orçam.</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[70px]">Venda</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Entrar em Contato</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Médico</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Vendedor</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Status</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px]">Obs</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[50px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-table-border">
              {filteredLeads.map((lead, index) => (
                <tr 
                  key={lead.id} 
                  className={`table-cell-hover animate-slide-in ${isContactDateOverdue(lead) ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}`}
                  style={{ animationDelay: `${index * 15}ms` }}
                >
                  <td className="px-1 py-1">
                    <div className="flex flex-col">
                      <DatePickerCell value={lead.data_registro || ""} onSave={(v) => onUpdate(lead.id, "data_registro", v)} placeholder="Selecionar" />
                      {lead.created_at && (
                        <span className="text-[10px] text-muted-foreground px-3 -mt-1">
                          {new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell value={lead.canal || ""} onSave={(v) => onUpdate(lead.id, "canal", v)} placeholder="Canal" />
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell value={lead.nome || ""} onSave={(v) => onUpdate(lead.id, "nome", v)} placeholder="Nome" />
                  </td>
                  <td className="py-1">
                    <PhoneCell phone={lead.numero} leadId={lead.id} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => onUpdate(lead.id, "orcamento", lead.orcamento === "Sim" ? "Não" : "Sim")}>
                      {statusBadge(lead.orcamento)}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => onUpdate(lead.id, "venda", lead.venda === "Sim" ? "Não" : "Sim")}>
                      {statusBadge(lead.venda)}
                    </button>
                  </td>
                  <td className="px-1 py-1">
                    <DatePickerCell value={lead.entrar_em_contato || ""} onSave={(v) => onUpdate(lead.id, "entrar_em_contato", v)} placeholder="Selecionar" />
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell value={lead.medico || ""} onSave={(v) => onUpdate(lead.id, "medico", v)} placeholder="Médico" />
                  </td>
                  <td className="px-1 py-1">
                    <SelectCell
                      value={lead.vendedor || ""}
                      onSave={(v) => onUpdate(lead.id, "vendedor", v)}
                      options={uniqueValues.vendedor}
                      placeholder="Vendedor"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Select value={lead.status || "Ativo"} onValueChange={(v) => onUpdate(lead.id, "status", v)}>
                      <SelectTrigger className="h-8 text-xs border-0 bg-transparent hover:bg-muted/50 focus:ring-0">
                        <SelectValue>
                          {statusClienteBadge(lead.status)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {uniqueValues.status.map(status => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell value={lead.obs || ""} onSave={(v) => onUpdate(lead.id, "obs", v)} placeholder="Observação" />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <Button variant="ghost" size="icon" onClick={() => onDelete(lead.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLeads.length === 0 && (
          <div className="px-6 py-12 text-center text-muted-foreground">
            <p>Nenhum lead encontrado.</p>
            <p className="text-sm mt-1">{hasActiveFilters ? "Tente ajustar os filtros." : "Clique em \"Nova Linha\" para adicionar."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
