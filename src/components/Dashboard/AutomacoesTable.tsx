import { useState, useEffect, useRef } from "react";
import { Plus, Pause, Play, Pencil, Trash2, Bot, Send, Clock, Filter, UserX, Upload, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAutomacoes, type Automacao, type NewAutomacaoData } from "@/hooks/useAutomacoes";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { DisparosTable } from "./DisparosTable";
import { EnviadosTable } from "./EnviadosTable";
import { AutomacaoDetailView } from "./AutomacaoDetailView";
import type { Lead } from "@/hooks/useLeads";

interface AutomacoesTableProps {
  leads?: Lead[];
}

export function AutomacoesTable({ leads = [] }: AutomacoesTableProps) {
  const {
    automacoes,
    disparos,
    pausadoGlobal,
    isLoading,
    createAutomacao,
    updateAutomacao,
    deleteAutomacao,
    togglePausaGlobal,
  } = useAutomacoes();

  const [selectedAutomacao, setSelectedAutomacao] = useState<Automacao | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewAutomacaoData>({
    nome: "",
    dias_apos_venda: 7,
    mensagem: "",
    status: "Ativa",
    fonte: "leads",
    filtro_como_conheceu: null,
    audio_url: null,
    audios_vendedor: null,
    instancia: "suavisao",
  });
  const [isUploadingAudio, setIsUploadingAudio] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [uploadingVendedor, setUploadingVendedor] = useState<string | null>(null);
  const vendedores = ["Bernardo", "Thayssa"];

  const [comoConheceuOptions, setComoConheceuOptions] = useState<string[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      const { data } = await supabase
        .from("detalhado")
        .select("como_conheceu")
        .not("como_conheceu", "is", null);
      if (data) {
        const unique = [...new Set(data.map(d => d.como_conheceu).filter(Boolean))] as string[];
        setComoConheceuOptions(unique.sort());
      }
    };
    fetchOptions();
  }, []);

  const resetForm = () => {
    setForm({ nome: "", dias_apos_venda: 7, mensagem: "", status: "Ativa", fonte: "leads", filtro_como_conheceu: null, audio_url: null, audios_vendedor: null, instancia: "suavisao" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, vendedor: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAudio(vendedor);
    const fileName = `automacao-audio-${vendedor}-${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("whatsapp-media")
      .upload(fileName, file, { contentType: file.type });
    if (error) {
      console.error("Upload error:", error);
      setIsUploadingAudio(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("whatsapp-media").getPublicUrl(data.path);
    const current = form.audios_vendedor || {};
    setForm({ ...form, audios_vendedor: { ...current, [vendedor]: urlData.publicUrl } });
    setIsUploadingAudio(null);
  };

  const handleSubmit = async () => {
    if (!form.nome || !form.mensagem) return;
    if (editingId) {
      await updateAutomacao(editingId, form);
    } else {
      await createAutomacao(form);
    }
    resetForm();
  };

  const handleEdit = (a: Automacao) => {
    setForm({ nome: a.nome, dias_apos_venda: a.dias_apos_venda, mensagem: a.mensagem, status: a.status, fonte: a.fonte, filtro_como_conheceu: a.filtro_como_conheceu, audio_url: a.audio_url, audios_vendedor: a.audios_vendedor, instancia: a.instancia || "suavisao" });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleToggleStatus = (a: Automacao) => {
    updateAutomacao(a.id, { status: a.status === "Ativa" ? "Inativa" : "Ativa" });
  };

  const formatDias = (dias: number) => {
    if (dias < 30) return `${dias} dias`;
    if (dias < 365) return `${Math.round(dias / 30)} meses`;
    return `${Math.round(dias / 365)} ano(s)`;
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "enviado": return "bg-green-500/10 text-green-600 border-green-200";
      case "erro": return "bg-red-500/10 text-red-600 border-red-200";
      case "pendente": return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>;
  }

  // If showing automation detail
  if (selectedAutomacao) {
    return (
      <AutomacaoDetailView
        automacao={selectedAutomacao}
        onBack={() => setSelectedAutomacao(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Pausa geral:</span>
          <Switch checked={pausadoGlobal} onCheckedChange={togglePausaGlobal} />
          {pausadoGlobal && <Badge variant="destructive" className="text-xs">Pausado</Badge>}
        </div>

        <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); else setShowForm(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Nova automação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar automação" : "Nova automação"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Nome da automação</label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Adaptação 7 dias"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Fonte dos clientes</label>
                <select
                  className="text-sm border rounded px-2 py-1 bg-background w-full"
                  value={form.fonte}
                  onChange={(e) => {
                    const fonte = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      fonte,
                      filtro_como_conheceu: fonte === "detalhado" ? prev.filtro_como_conheceu : null,
                      dias_apos_venda: fonte === "detalhado_inativos" && prev.fonte !== "detalhado_inativos" ? 730 : prev.dias_apos_venda,
                    }));
                  }}
                >
                  <option value="leads">Leads (com venda)</option>
                  <option value="perdidos">Leads (perdidos)</option>
                  <option value="detalhado">Detalhado (receita sem visita à loja)</option>
                  <option value="detalhado_inativos">Detalhado (2+ anos sem atendimento)</option>
                </select>
              </div>
              {form.fonte === "detalhado" && (
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    <Filter className="w-3.5 h-3.5 inline mr-1" />
                    Filtrar por "Como Conheceu"
                  </label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1.5 bg-background">
                    {comoConheceuOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma opção encontrada</p>
                    ) : (
                      comoConheceuOptions.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={form.filtro_como_conheceu?.includes(opt) ?? false}
                            onCheckedChange={(checked) => {
                              const current = form.filtro_como_conheceu || [];
                              if (checked) {
                                setForm({ ...form, filtro_como_conheceu: [...current, opt] });
                              } else {
                                const next = current.filter(v => v !== opt);
                                setForm({ ...form, filtro_como_conheceu: next.length > 0 ? next : null });
                              }
                            }}
                          />
                          {opt}
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Filtra pacientes com receita que NÃO visitaram a loja
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {form.fonte === "perdidos"
                    ? "Disparar após quantos dias de marcado como perdido"
                    : form.fonte === "detalhado_inativos"
                      ? "Disparar após quantos dias desde o último atendimento"
                      : "Disparar após quantos dias da venda"}
                </label>
                <Input
                  type="number"
                  value={form.dias_apos_venda}
                  onChange={(e) => setForm({ ...form, dias_apos_venda: Number(e.target.value) })}
                  min={1}
                />
                {form.fonte === "detalhado_inativos" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Use 730 para alcançar pacientes com 2 anos ou mais sem atendimento.
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Mensagem</label>
                <Textarea
                  value={form.mensagem}
                  onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                  placeholder="Olá {nome_cliente}! Já faz..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variáveis: {"{nome_cliente}"}, {"{data_compra}"}, {"{vendedor}"}, {"{medico}"}
                </p>
                {form.fonte === "detalhado_inativos" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Nesta fonte, {"{data_compra}"} será a data do último atendimento na clínica.
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  <Volume2 className="w-3.5 h-3.5 inline mr-1" />
                  Áudios por vendedor (enviados após a mensagem)
                </label>
                <div className="space-y-3">
                  {vendedores.map((vendedor) => {
                    const audioUrl = form.audios_vendedor?.[vendedor];
                    return (
                      <div key={vendedor} className="border rounded p-2.5 bg-muted/20 space-y-1.5">
                        <span className="text-sm font-medium">{vendedor}</span>
                        {audioUrl ? (
                          <div className="flex items-center gap-2">
                            <audio controls src={audioUrl} className="h-8 flex-1" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => {
                                const current = { ...form.audios_vendedor };
                                delete current[vendedor];
                                setForm({ ...form, audios_vendedor: Object.keys(current).length > 0 ? current : null });
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              id={`audio-${vendedor}`}
                              onChange={(e) => handleAudioUpload(e, vendedor)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => document.getElementById(`audio-${vendedor}`)?.click()}
                              disabled={isUploadingAudio === vendedor}
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {isUploadingAudio === vendedor ? "Enviando..." : "Enviar áudio"}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  O áudio do vendedor que fez a venda será enviado automaticamente após a mensagem de texto.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Instância WhatsApp</label>
                <select
                  className="text-sm border rounded px-2 py-1 bg-background w-full"
                  value={form.instancia || "suavisao"}
                  onChange={(e) => setForm({ ...form, instancia: e.target.value })}
                >
                  <option value="suavisao">Suavisão (Evolution API)</option>
                  <option value="dnz">DNZ (uazapi)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <select
                  className="text-sm border rounded px-2 py-1 bg-background"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="Ativa">Ativa</option>
                  <option value="Inativa">Inativa</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={!form.nome || !form.mensagem}>
                {editingId ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Automações list */}
      <div className="space-y-3">
        {automacoes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Bot className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhuma automação cadastrada.</p>
              <p className="text-sm mt-1">Crie sua primeira régua de pós-venda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Nº</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Fonte</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Dias</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Mensagem</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Envios</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {automacoes.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedAutomacao(a)}
                  >
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        {a.nome}
                        {(a.audio_url || (a.audios_vendedor && Object.keys(a.audios_vendedor).length > 0)) && <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        {a.fonte === "detalhado"
                          ? "Detalhado"
                          : a.fonte === "detalhado_inativos"
                            ? "2+ anos"
                            : a.fonte === "perdidos"
                              ? "Perdidos"
                              : "Leads"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" /> {formatDias(a.dias_apos_venda)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 max-w-[300px] truncate text-muted-foreground">{a.mensagem}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={a.status === "Ativa" ? "default" : "secondary"}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="gap-1">
                        <Send className="w-3 h-3" /> {a.total_envios}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(a)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleStatus(a)}
                        >
                          {a.status === "Ativa" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir automação</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir "{a.nome}"? Todo o histórico de disparos será perdido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteAutomacao(a.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
