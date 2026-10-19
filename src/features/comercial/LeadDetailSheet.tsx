import { useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BaseButton as Button } from "@/components/base/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DirectoryPerson } from "@/hooks/useDirectory";
import type { Lead } from "@/hooks/useLeads";

type LeadDraft = Pick<Lead,
  "nome" | "numero" | "canal" | "status" | "orcamento" | "venda" |
  "entrar_em_contato" | "medico" | "medico_id" | "vendedor" | "vendedor_id" | "valor" | "obs"
>;

const draftFromLead = (lead: Lead): LeadDraft => ({
  nome: lead.nome || "",
  numero: lead.numero || "",
  canal: lead.canal || "",
  status: lead.status || "Ativo",
  orcamento: lead.orcamento || "Não",
  venda: lead.venda || "Não",
  entrar_em_contato: lead.entrar_em_contato || "",
  medico: lead.medico || "",
  medico_id: lead.medico_id,
  vendedor: lead.vendedor || "",
  vendedor_id: lead.vendedor_id,
  valor: lead.valor || "",
  obs: lead.obs || "",
});

const toIsoDate = (value: string | null) => {
  if (!value) return "";
  const parts = value.includes("/") ? value.split("/").reverse() : value.split("-");
  return parts.length === 3 ? `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}` : "";
};

const toLocalDate = (value: string) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
};

interface LeadDetailSheetProps {
  lead: Lead | null;
  employees: DirectoryPerson[];
  professionals: DirectoryPerson[];
  saving: boolean;
  onClose: () => void;
  onSave: (changes: LeadDraft) => Promise<void>;
}

export function LeadDetailSheet({ lead, employees, professionals, saving, onClose, onSave }: LeadDetailSheetProps) {
  const [draft, setDraft] = useState<LeadDraft>(() => lead ? draftFromLead(lead) : {} as LeadDraft);
  useEffect(() => {
    if (lead) setDraft(draftFromLead(lead));
  }, [lead?.id, lead?.updated_at]);

  const update = <K extends keyof LeadDraft>(field: K, value: LeadDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(draft);
  };

  return (
    <Dialog.Root open={Boolean(lead)} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-border bg-background shadow-xl outline-none data-[open]:animate-in data-[closed]:animate-out data-[closed]:slide-in-from-right data-[open]:slide-in-from-right-8 max-sm:inset-x-0 max-sm:inset-y-auto max-sm:bottom-0 max-sm:max-h-[92svh] max-sm:rounded-t-xl max-sm:border-l-0 max-sm:border-t">
          {lead ? (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
                <div className="min-w-0">
                  <Dialog.Title className="truncate text-xl font-semibold tracking-tight">{draft.nome || "Lead sem nome"}</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                    Criado em {lead.data_registro || "Data não informada"} · registro {lead.id.slice(0, 8)}
                  </Dialog.Description>
                </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{draft.status || "Ativo"}</Badge>
                    <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving} aria-label="Fechar detalhe"><X className="size-4" /></Button>
                  </div>
              </div>

              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="lead-name">Nome</Label>
                      <Input id="lead-name" autoComplete="name" value={draft.nome || ""} onChange={(event) => update("nome", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lead-phone">WhatsApp</Label>
                      <Input id="lead-phone" inputMode="tel" autoComplete="tel" value={draft.numero || ""} onChange={(event) => update("numero", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lead-channel">Canal</Label>
                      <select id="lead-channel" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={draft.canal || ""} onChange={(event) => update("canal", event.target.value)}>
                        <option value="">Sem canal</option>
                        {["Internet", "Sua Visão", "Loja", "Du Benefícios", "Indique e Ganhe"].map((option) => <option key={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lead-status">Status</Label>
                      <select id="lead-status" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={draft.status || "Ativo"} onChange={(event) => update("status", event.target.value)}>
                        {["Ativo", "Perdido", "Pós Venda"].map((option) => <option key={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lead-next-contact">Próximo contato</Label>
                      <Input id="lead-next-contact" type="date" value={toIsoDate(draft.entrar_em_contato)} onChange={(event) => update("entrar_em_contato", toLocalDate(event.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lead-budget">Orçamento</Label>
                      <select id="lead-budget" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={draft.orcamento || "Não"} onChange={(event) => update("orcamento", event.target.value)}>
                        <option>Não</option><option>Sim</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lead-sale">Venda</Label>
                      <select id="lead-sale" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={draft.venda || "Não"} onChange={(event) => update("venda", event.target.value)}>
                        <option>Não</option><option>Sim</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lead-value">Valor</Label>
                      <Input id="lead-value" inputMode="decimal" placeholder="R$ 0,00" value={draft.valor || ""} onChange={(event) => update("valor", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Funcionário responsável</Label>
                      <select value={draft.vendedor_id || ""} onChange={(event) => {
                        const person = employees.find((item) => item.id === event.target.value);
                        setDraft((current) => ({ ...current, vendedor_id: person?.id || null, vendedor: person?.name || "" }));
                      }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="">Sem responsável</option>
                        {employees.map((person) => <option key={person.id} value={person.id}>{person.name}{!person.is_active ? " (inativo)" : ""}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Profissional</Label>
                      <select value={draft.medico_id || ""} onChange={(event) => {
                        const person = professionals.find((item) => item.id === event.target.value);
                        setDraft((current) => ({ ...current, medico_id: person?.id || null, medico: person?.name || "" }));
                      }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="">Sem profissional</option>
                        {professionals.map((person) => <option key={person.id} value={person.id}>{person.name}{!person.is_active ? " (inativo)" : ""}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="lead-notes">Observação</Label>
                      <Textarea id="lead-notes" rows={4} value={draft.obs || ""} onChange={(event) => update("obs", event.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between gap-3 border-t border-border px-5 py-4 sm:px-7">
                  {draft.numero ? <a className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-primary hover:bg-accent" href={`https://wa.me/55${draft.numero.replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noreferrer">Abrir WhatsApp</a> : <span />}
                  <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</Button>
                </div>
              </form>
            </>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
