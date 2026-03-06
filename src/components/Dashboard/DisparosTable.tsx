import { useMemo, useRef, useState } from "react";
import { Send, Filter, X, CheckSquare, Square, Loader2, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CalendarFilterPopover } from "./CalendarFilterPopover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SyncedHorizontalScrollbar } from "@/components/ui/synced-horizontal-scrollbar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/hooks/useLeads";

const VARIABLES = [
  { label: "{nome}", desc: "Nome do cliente" },
  { label: "{medico}", desc: "Médico" },
  { label: "{canal}", desc: "Canal" },
  { label: "{vendedor}", desc: "Vendedor" },
  { label: "{data_registro}", desc: "Data de registro" },
];

interface DisparosTableProps {
  leads: Lead[];
}

export function DisparosTable({ leads }: DisparosTableProps) {
  const { toast } = useToast();
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState(
    "Olá {nome}, tudo bem? Aqui é da Sua Visão! Notamos que você nos visitou mas ainda não fechou. Gostaria de saber se podemos ajudar com algo?"
  );
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [isMassSending, setIsMassSending] = useState(false);

  // Only "Perdido" leads
  const perdidos = useMemo(() => leads.filter(l => l.status === "Perdido"), [leads]);

  const uniqueDates = useMemo(
    () => [...new Set(perdidos.map(l => l.data_registro).filter(Boolean))] as string[],
    [perdidos]
  );

  const filteredLeads = useMemo(() => {
    return perdidos.filter(lead => {
      if (selectedDates.length > 0 && !selectedDates.includes(lead.data_registro || "")) return false;
      return true;
    }).sort((a, b) => {
      const dateA = a.data_registro ? new Date(a.data_registro.split('/').reverse().join('-')) : new Date(0);
      const dateB = b.data_registro ? new Date(b.data_registro.split('/').reverse().join('-')) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [perdidos, selectedDates]);

  const toggleSelect = (id: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const sendToLeads = async (leadsToSend: Lead[]) => {
    if (!mensagem.trim()) {
      toast({ title: "Erro", description: "Escreva uma mensagem antes de enviar.", variant: "destructive" });
      return;
    }

    const validLeads = leadsToSend.filter(l => l.numero && l.numero.trim());
    if (validLeads.length === 0) {
      toast({ title: "Erro", description: "Nenhum lead com número de telefone válido.", variant: "destructive" });
      return;
    }

    const ids = new Set(validLeads.map(l => l.id));
    setSendingIds(prev => new Set([...prev, ...ids]));

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-disparo", {
        body: {
          leads: validLeads.map(l => ({
            id: l.id,
            nome: l.nome,
            numero: l.numero,
            medico: l.medico,
            canal: l.canal,
            vendedor: l.vendedor,
            data_registro: l.data_registro,
          })),
          mensagem,
        },
      });

      if (error) throw error;

      const enviados = data?.results?.filter((r: any) => r.status === "enviado").map((r: any) => r.leadId) || [];
      setSentIds(prev => new Set([...prev, ...enviados]));

      toast({
        title: "Disparos concluídos",
        description: `${data?.enviados || 0} enviados, ${data?.erros || 0} erros de ${data?.total || 0} total.`,
        variant: data?.erros > 0 ? "destructive" : "default",
      });
    } catch (error) {
      console.error("Erro ao enviar disparos:", error);
      toast({ title: "Erro ao enviar", description: "Não foi possível enviar as mensagens.", variant: "destructive" });
    } finally {
      setSendingIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const handleSendSingle = (lead: Lead) => sendToLeads([lead]);

  const handleMassSend = async () => {
    const leadsToSend = filteredLeads.filter(l => selectedLeads.has(l.id));
    if (leadsToSend.length === 0) {
      toast({ title: "Nenhum selecionado", description: "Selecione ao menos um lead para envio em massa.", variant: "destructive" });
      return;
    }
    setIsMassSending(true);
    await sendToLeads(leadsToSend);
    setIsMassSending(false);
  };

  const insertVariable = (variable: string) => {
    setMensagem(prev => prev + variable);
  };

  const hasActiveFilters = selectedDates.length > 0;

  const clearFilters = () => {
    setSelectedDates([]);
  };

  const formatPhoneForWhatsApp = (phone: string | null) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 || cleaned.length === 10) return `55${cleaned}`;
    if (cleaned.length === 13 && cleaned.startsWith("55")) return cleaned;
    return cleaned;
  };

  return (
    <div className="space-y-4">
      {/* Message Template */}
      <div className="bg-card rounded-xl border border-border p-4 card-shadow animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Modelo de Mensagem</span>
        </div>
        <Textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          rows={4}
          placeholder="Digite sua mensagem aqui..."
          className="mb-3"
        />
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Variáveis:</span>
          {VARIABLES.map(v => (
            <Button
              key={v.label}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => insertVariable(v.label)}
              title={v.desc}
            >
              {v.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Filters + Mass send */}
      <div className="bg-card rounded-xl border border-border p-4 card-shadow animate-fade-in">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filtros</span>
          <span className="text-xs text-muted-foreground ml-2">
            {filteredLeads.length} leads perdidos
          </span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
              <X className="w-3 h-3 mr-1" />Limpar
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selectedLeads.size} selecionados</span>
            <Button
              onClick={handleMassSend}
              disabled={selectedLeads.size === 0 || isMassSending}
              size="sm"
              className="h-8"
            >
              {isMassSending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Envio em Massa ({selectedLeads.size})
            </Button>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="space-y-1 min-w-[140px]">
            <label className="text-xs text-muted-foreground">Período</label>
            <CalendarFilterPopover
              selectedDates={selectedDates}
              onDatesChange={setSelectedDates}
              placeholder="Todas"
              availableDates={uniqueDates}
            />
          </div>
          <div className="space-y-1 min-w-[120px]">
            <label className="text-xs text-muted-foreground">Vendedor</label>
            <Select value={vendedorFilter} onValueChange={v => setVendedorFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs bg-background border-border">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Bernardo">Bernardo</SelectItem>
                <SelectItem value="Thayssa">Thayssa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[120px]">
            <label className="text-xs text-muted-foreground">Canal</label>
            <Select value={canalFilter} onValueChange={v => setCanalFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs bg-background border-border">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Internet">Internet</SelectItem>
                <SelectItem value="Sua Visão">Sua Visão</SelectItem>
                <SelectItem value="Loja">Loja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden card-shadow-lg animate-fade-in">
        <SyncedHorizontalScrollbar targetRef={tableScrollRef} />
        <div ref={tableScrollRef} className="overflow-x-auto scrollbar-visible">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="bg-table-header border-b border-table-border">
                <th className="px-3 py-3 text-center w-[50px]">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground transition-colors">
                    {selectedLeads.size === filteredLeads.length && filteredLeads.length > 0
                      ? <CheckSquare className="w-4 h-4" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[110px]">Data</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Canal</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px]">Nome</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[160px]">Número</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">Orçam.</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Médico</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Vendedor</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px]">Obs</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Enviar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-table-border">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum lead com status "Perdido" encontrado para o período selecionado.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, index) => {
                  const isSending = sendingIds.has(lead.id);
                  const isSent = sentIds.has(lead.id);
                  const whatsappNumber = formatPhoneForWhatsApp(lead.numero);

                  return (
                    <tr
                      key={lead.id}
                      className={`table-cell-hover animate-slide-in ${isSent ? "bg-accent/10" : ""}`}
                      style={{ animationDelay: `${index * 15}ms` }}
                    >
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => toggleSelect(lead.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                          {selectedLeads.has(lead.id)
                            ? <CheckSquare className="w-4 h-4 text-primary" />
                            : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-sm">{lead.data_registro || "—"}</td>
                      <td className="px-3 py-2 text-sm">{lead.canal || "—"}</td>
                      <td className="px-3 py-2 text-sm font-medium">{lead.nome || "—"}</td>
                      <td className="px-3 py-2 text-sm">
                        <div className="flex items-center gap-1">
                          <span>{lead.numero || "—"}</span>
                          {whatsappNumber && (
                            <a
                              href={`https://wa.me/${whatsappNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-md hover:bg-accent/20 text-accent transition-colors"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${lead.orcamento === "Sim" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}>
                          {lead.orcamento || "Não"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm">{lead.medico || "—"}</td>
                      <td className="px-3 py-2 text-sm">{lead.vendedor || "—"}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{lead.obs || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        {isSent ? (
                          <span className="text-xs text-accent font-medium">Enviado ✓</span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={isSending || !lead.numero}
                            onClick={() => handleSendSingle(lead)}
                          >
                            {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
