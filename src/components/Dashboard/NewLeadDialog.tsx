import { useState, useMemo } from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { PersonSelect } from "@/components/Dashboard/PersonSelect";
import { useDirectory } from "@/hooks/useDirectory";
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
}

export function NewLeadDialog({ open, onOpenChange, onSubmit, existingLeads = [] }: NewLeadDialogProps) {
  const { people: employees, isLoading: employeesLoading } = useDirectory("employees");
  const { people: professionals, isLoading: professionalsLoading } = useDirectory("professionals");
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

  const isCanalEmpty = !formData.canal.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Block submission if canal is not filled
    if (isCanalEmpty) {
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4" aria-busy={isSubmitting}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.data_registro && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data_registro || "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.data_registro ? parse(formData.data_registro, "dd/MM/yyyy", new Date()) : undefined}
                    onSelect={(date) => date && updateField("data_registro", format(date, "dd/MM/yyyy"))}
                    initialFocus
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="canal" className="flex items-center gap-1">
                Canal <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.canal} onValueChange={(v) => updateField("canal", v)}>
                <SelectTrigger className={cn(isCanalEmpty && "border-destructive")}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internet">Internet</SelectItem>
                  <SelectItem value="Sua Visão">Sua Visão</SelectItem>
                  <SelectItem value="Loja">Loja</SelectItem>
                  <SelectItem value="Du Benefícios">Du Benefícios</SelectItem>
                  <SelectItem value="Indique e Ganhe">Indique e Ganhe</SelectItem>
                </SelectContent>
              </Select>
              {isCanalEmpty && (
                <p className="text-xs text-destructive">Campo obrigatório</p>
              )}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orcamento">Orçamento</Label>
              <Select value={formData.orcamento} onValueChange={(v) => updateField("orcamento", v)}>
                <SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entrar em Contato</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.entrar_em_contato && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.entrar_em_contato || "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.entrar_em_contato ? parse(formData.entrar_em_contato, "dd/MM/yyyy", new Date()) : undefined}
                    onSelect={(date) => date && updateField("entrar_em_contato", format(date, "dd/MM/yyyy"))}
                    initialFocus
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Médico</Label>
              <PersonSelect
                people={professionals}
                value={formData.medico_id}
                onValueChange={(id, person) => updatePerson("professional", id, person?.name || null)}
                placeholder="Selecionar profissional"
                emptyLabel="Sem médico"
                disabled={professionalsLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger>
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
              <Label>Vendedor</Label>
              <PersonSelect
                people={employees}
                value={formData.vendedor_id}
                onValueChange={(id, person) => updatePerson("employee", id, person?.name || null)}
                placeholder="Selecionar funcionário"
                emptyLabel="Sem vendedor"
                disabled={employeesLoading}
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
                <Button type="submit" disabled={isSubmitting}>
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
