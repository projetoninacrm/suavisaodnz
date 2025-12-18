import { useState } from "react";
import { Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableCell } from "./EditableCell";
import type { Lead } from "@/hooks/useLeads";

interface LeadsTableProps {
  leads: Lead[];
  onUpdate: (id: string, field: keyof Lead, value: string) => void;
  onDelete: (id: string) => void;
}

export function LeadsTable({ leads, onUpdate, onDelete }: LeadsTableProps) {
  const statusBadge = (value: string | null) => {
    if (value === "Sim") {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-accent/20 text-accent">Sim</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-muted text-muted-foreground">Não</span>;
  };

  const formatPhoneForWhatsApp = (phone: string | null) => {
    if (!phone) return null;
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, "");
    // Add Brazil country code if not present
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

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden card-shadow-lg animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-table-header border-b border-table-border">
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[110px]">Data</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Canal</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px]">Nome</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[160px]">Número</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">Orçam.</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[70px]">Venda</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Entrar em Contato</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Médico</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px]">Obs</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[50px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-table-border">
            {leads.map((lead, index) => (
              <tr 
                key={lead.id} 
                className="table-cell-hover animate-slide-in"
                style={{ animationDelay: `${index * 15}ms` }}
              >
                <td className="px-1 py-1">
                  <EditableCell value={lead.data_registro || ""} onSave={(v) => onUpdate(lead.id, "data_registro", v)} placeholder="DD/MM/AAAA" />
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
                  <EditableCell value={lead.entrar_em_contato || ""} onSave={(v) => onUpdate(lead.id, "entrar_em_contato", v)} placeholder="DD/MM/AAAA" />
                </td>
                <td className="px-1 py-1">
                  <EditableCell value={lead.medico || ""} onSave={(v) => onUpdate(lead.id, "medico", v)} placeholder="Médico" />
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
      {leads.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground">
          <p>Nenhum lead encontrado.</p>
          <p className="text-sm mt-1">Clique em "Nova Linha" para adicionar.</p>
        </div>
      )}
    </div>
  );
}
