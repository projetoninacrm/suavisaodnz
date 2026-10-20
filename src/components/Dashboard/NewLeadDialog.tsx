import { useState, useMemo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { DatePickerField } from "@/components/data/DatePickerField";
import { CategorySelect } from "@/components/data/CategorySelect";
import { PersonSelect } from "@/components/Dashboard/PersonSelect";
import { PersonDirectoryHint } from "@/components/data/PersonDirectoryHint";
import type { DirectoryPerson } from "@/hooks/useDirectory";
import { Link } from "react-router-dom";
import { DEFAULT_LEAD_CHANNELS, type CategoryCatalogItem } from "@/hooks/useCategories";
import type { Lead, NewLeadData } from "@/hooks/useLeads";

interface NewLeadFormData {
  data_registro: string;
  canal: string;
  nome: string;
  numero: string;
  orcamento: string;
  venda: string;
  entrar_em_contato: string;
  medico: string;
  medico_id: string | null;
  obs: string;
  status: string;
  vendedor: string;
  vendedor_id: string | null;
  valor: string;
}

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NewLeadData) => void | Promise<void>;
  existingLeads?: Lead[];
  channelCategories: CategoryCatalogItem[];
  channelsLoading: boolean;
  channelsError: string | null;
  refreshChannels: () => Promise<boolean>;
  employees: DirectoryPerson[];
  employeesLoading: boolean;
  employeesError: string | null;
  refreshEmployees: () => Promise<boolean>;
  professionals: DirectoryPerson[];
  professionalsLoading: boolean;
  professionalsError: string | null;
  refreshProfessionals: () => Promise<boolean>;
}
export function NewLeadDialog({
  open,
  onOpenChange,
  onSubmit,
  existingLeads = [],
  channelCategories,
  channelsLoading,
  channelsError,
  refreshChannels,
  employees,
  employeesLoading,
  employeesError,
  refreshEmployees,
  professionals,
  professionalsLoading,
  professionalsError,
  refreshProfessionals,
}: NewLeadDialogProps) {
  const today = new Date();
  const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const [formData, setFormData] = useState<NewLeadFormData>({
    data_registro: formattedToday,
    canal: "",
    nome: "",
    numero: "",
    orcamento: "Não",
    venda: "Não",
    entrar_em_contato: "",
    medico: "",
    medico_id: null,
    obs: "",
    status: "Ativo",
    vendedor: "",
    vendedor_id: null,
    valor: "",
  });

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingChannels, setIsRefreshingChannels] = useState(false);

  // Normalize phone number for comparison
  const normalizePhone = (phone: string | null): string => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  // Normalize name for comparison (lowercase, trim)
  const normalizeName = (name: string | null): string => {
    if (!name) return "";
    return name.toLowerCase().trim();
  };

  // Check for duplicate leads
  const duplicateInfo = useMemo(() => {
    const normalizedFormName = normalizeName(formData.nome);
    const normalizedFormPhone = normalizePhone(formData.numero);
    
    const duplicates: { byName: Lead[]; byPhone: Lead[] } = {
      byName: [],
      byPhone: [],
    };

    if (!normalizedFormName && !normalizedFormPhone) {
      return duplicates;
    }

    existingLeads.forEach(lead => {
      if (normalizedFormName && normalizeName(lead.nome) === normalizedFormName) {
        duplicates.byName.push(lead);
      }
      if (normalizedFormPhone && normalizePhone(lead.numero) === normalizedFormPhone) {
        duplicates.byPhone.push(lead);
      }
    });

    return duplicates;
  }, [formData.nome, formData.numero, existingLeads]);

  const hasDuplicates = duplicateInfo.byName.length > 0 || duplicateInfo.byPhone.length > 0;
  const activeChannels = channelCategories.filter((category) => category.is_active);
  const catalogUnavailable = activeChannels.length === 0 && (channelsError !== null || isRefreshingChannels);
  const isInitialChannelsLoading = channelsLoading && !catalogUnavailable;
  const fallbackChannels = catalogUnavailable ? DEFAULT_LEAD_CHANNELS : [];
  const channelChoices = activeChannels.length > 0
    ? activeChannels.map((category) => ({ value: category.id, label: category.label }))
    : fallbackChannels.map((label) => ({ value: `fallback:${label}`, label }));

  const retryChannels = async () => {
    if (isRefreshingChannels) return;
    setIsRefreshingChannels(true);
    try {
      await refreshChannels();
    } finally {
      setIsRefreshingChannels(false);
    }
  };

  const isCanalEmpty = !formData.canal.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Block submission if canal is not filled
    if (isCanalEmpty || channelChoices.length === 0) {
      return;
    }

    // If there are duplicates and user hasn't confirmed, show confirmation
    if (hasDuplicates && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    // Proceed with submission
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({
        data_registro: formattedToday,
        canal: "",
        nome: "",
        numero: "",
        orcamento: "Não",
        venda: "Não",
        entrar_em_contato: "",
        medico: "",
        medico_id: null,
        obs: "",
        status: "Ativo",
        vendedor: "",
        vendedor_id: null,
        valor: "",
      });
      setShowConfirmation(false);
      onOpenChange(false);
    } catch {
      // Keep the draft visible so the employee can retry after a failed save.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    onOpenChange(false);
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  const updateField = (field: keyof NewLeadFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Reset confirmation when user changes data
    if (showConfirmation) {
      setShowConfirmation(false);
    }
  };
  const updatePerson = (kind: "employee" | "professional", id: string | null, name: string | null) => {
    setFormData((prev) => kind === "employee"
      ? { ...prev, vendedor_id: id, vendedor: name || "" }
      : { ...prev, medico_id: id, medico: name || "" });
    if (showConfirmation) setShowConfirmation(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && isSubmitting) return;
      if (!newOpen) {
        setShowConfirmation(false);
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent closeButtonDisabled={isSubmitting} aria-busy={isSubmitting} className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4" aria-busy={isSubmitting}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePickerField
              id="lead-date"
              label="Data"
              value={formData.data_registro}
              onValueChange={(value) => updateField("data_registro", value)}
              clearable={false}
            />
            <div className="space-y-2">
              <Label htmlFor="canal" className="flex items-center gap-1">
                Canal <span className="text-destructive">*</span>
              </Label>
              <CategorySelect
                id="canal"
                value={formData.canal}
                categories={activeChannels}
                fallbackValues={fallbackChannels}
                placeholder="Selecione um canal"
                ariaLabel="Canal do lead"
                onValueChange={(value) => updateField("canal", value)}
                disabled={isInitialChannelsLoading || channelChoices.length === 0}
                className={cn((isCanalEmpty || channelChoices.length === 0) && "border-destructive")}
              />
              {catalogUnavailable ? (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="size-4" />
                  <AlertDescription className="text-xs">
                    <span>Não foi possível carregar o catálogo. Os canais padrão continuam disponíveis. Tente novamente ou abra Cadastros → Categorias.</span>
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" variant="outline" aria-disabled={isRefreshingChannels} aria-busy={isRefreshingChannels} className={cn(isRefreshingChannels && "cursor-wait opacity-70")} onClick={() => void retryChannels()}>
                        <RefreshCw className={cn("mr-1 size-3.5", isRefreshingChannels && "animate-spin")} aria-hidden="true" />
                        {isRefreshingChannels ? "Atualizando…" : "Tentar novamente"}
                      </Button>
                      <Link className="font-medium underline" to="/cadastros/categorias" onClick={() => onOpenChange(false)}>Abrir Categorias</Link>
                    </span>
                    <span role="status" aria-live="polite" className="sr-only">{isRefreshingChannels ? "Atualizando catálogo de canais…" : ""}</span>
                  </AlertDescription>
                </Alert>
              ) : isInitialChannelsLoading ? (
                <p role="status" className="text-xs text-muted-foreground">Carregando canais…</p>
              ) : channelChoices.length === 0 ? (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="size-4" />
                  <AlertDescription className="text-xs">Não há canais ativos. Cadastre ou reative uma categoria em <Link className="font-medium underline" to="/cadastros/categorias" onClick={() => onOpenChange(false)}>Cadastros → Categorias</Link>.</AlertDescription>
                </Alert>
              ) : isCanalEmpty ? (
                <p className="text-xs text-destructive">Campo obrigatório</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => updateField("nome", e.target.value)}
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero">Número (WhatsApp)</Label>
            <Input
              id="numero"
              value={formData.numero}
              onChange={(e) => updateField("numero", e.target.value)}
              placeholder="(31) 99999-9999"
            />
          </div>

          {/* Duplicate Warning Alert */}
          {hasDuplicates && showConfirmation && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-semibold">Lead já existente encontrado!</p>
                {duplicateInfo.byName.length > 0 && (
                  <p>
                    <span className="font-medium">Nome duplicado:</span>{" "}
                    {duplicateInfo.byName.map(l => `"${l.nome}" (${l.data_registro || "sem data"})`).join(", ")}
                  </p>
                )}
                {duplicateInfo.byPhone.length > 0 && (
                  <p>
                    <span className="font-medium">Telefone duplicado:</span>{" "}
                    {duplicateInfo.byPhone.map(l => `"${l.nome || "Sem nome"}" - ${l.numero}`).join(", ")}
                  </p>
                )}
                <p className="text-sm mt-2">Tem certeza que deseja adicionar este lead mesmo assim?</p>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orcamento">Orçamento</Label>
              <Select value={formData.orcamento} onValueChange={(v) => updateField("orcamento", v)}>
                <SelectTrigger id="orcamento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="venda">Venda</Label>
              <Select value={formData.venda} onValueChange={(v) => updateField("venda", v)}>
                <SelectTrigger id="venda">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePickerField
              id="lead-contact-date"
              label="Entrar em Contato"
              value={formData.entrar_em_contato}
              onValueChange={(value) => updateField("entrar_em_contato", value)}
              clearable={false}
            />
            <div className="space-y-2">
              <Label htmlFor="medico">Médico</Label>
              <PersonSelect
                id="medico"
                people={professionals}
                value={formData.medico_id}
                onValueChange={(id, person) => updatePerson("professional", id, person?.name || null)}
                placeholder="Selecionar profissional"
                ariaLabel="Médico"
                emptyLabel="Sem médico"
                disabled={professionalsLoading}
              />
              <PersonDirectoryHint
                title="Profissionais"
                kind="profissional"
                path="/cadastros/profissionais"
                people={professionals}
                isLoading={professionalsLoading}
                error={professionalsError}
                onRetry={refreshProfessionals}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Perdido">Perdido</SelectItem>
                  <SelectItem value="Pós Venda">Pós Venda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendedor">Vendedor</Label>
              <PersonSelect
                id="vendedor"
                people={employees}
                value={formData.vendedor_id}
                onValueChange={(id, person) => updatePerson("employee", id, person?.name || null)}
                placeholder="Selecionar funcionário"
                ariaLabel="Vendedor"
                emptyLabel="Sem vendedor"
                disabled={employeesLoading}
              />
              <PersonDirectoryHint
                title="Funcionários"
                kind="funcionário"
                path="/cadastros/funcionarios"
                people={employees}
                isLoading={employeesLoading}
                error={employeesError}
                onRetry={refreshEmployees}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor</Label>
            <Input
              id="valor"
              value={formData.valor}
              onChange={(e) => updateField("valor", e.target.value)}
              placeholder="R$ 0,00"
              inputMode="decimal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              value={formData.obs}
              onChange={(e) => updateField("obs", e.target.value)}
              placeholder="Observações sobre o lead..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {showConfirmation ? (
              <>
                <Button type="button" variant="outline" onClick={handleCancelConfirmation} disabled={isSubmitting}>
                  Voltar
                </Button>
                <Button type="submit" variant="destructive" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando…" : "Adicionar Mesmo Assim"}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || isInitialChannelsLoading || channelChoices.length === 0}>
                  {isSubmitting ? "Salvando…" : "Adicionar Lead"}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
