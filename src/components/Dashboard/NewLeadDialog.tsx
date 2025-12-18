import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface NewLeadFormData {
  data_registro: string;
  canal: string;
  nome: string;
  numero: string;
  orcamento: string;
  venda: string;
  entrar_em_contato: string;
  medico: string;
  obs: string;
}

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NewLeadFormData) => void;
}

export function NewLeadDialog({ open, onOpenChange, onSubmit }: NewLeadDialogProps) {
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
    obs: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    // Reset form
    setFormData({
      data_registro: formattedToday,
      canal: "",
      nome: "",
      numero: "",
      orcamento: "Não",
      venda: "Não",
      entrar_em_contato: "",
      medico: "",
      obs: "",
    });
    onOpenChange(false);
  };

  const updateField = (field: keyof NewLeadFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_registro">Data (DD/MM/AAAA)</Label>
              <Input
                id="data_registro"
                value={formData.data_registro}
                onChange={(e) => updateField("data_registro", e.target.value)}
                placeholder="DD/MM/AAAA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="canal">Canal</Label>
              <Select value={formData.canal} onValueChange={(v) => updateField("canal", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internet">Internet</SelectItem>
                  <SelectItem value="Sua Visão">Sua Visão</SelectItem>
                  <SelectItem value="Loja">Loja</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
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
              <Label htmlFor="entrar_em_contato">Entrar em Contato</Label>
              <Input
                id="entrar_em_contato"
                value={formData.entrar_em_contato}
                onChange={(e) => updateField("entrar_em_contato", e.target.value)}
                placeholder="DD/MM/AAAA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medico">Médico</Label>
              <Select value={formData.medico} onValueChange={(v) => updateField("medico", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ana">Ana</SelectItem>
                  <SelectItem value="Thabata">Thabata</SelectItem>
                  <SelectItem value="Carol">Carol</SelectItem>
                  <SelectItem value="Larissa">Larissa</SelectItem>
                  <SelectItem value="Amanda">Amanda</SelectItem>
                  <SelectItem value="Cassio">Cassio</SelectItem>
                  <SelectItem value="Karollyne">Karollyne</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Adicionar Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
