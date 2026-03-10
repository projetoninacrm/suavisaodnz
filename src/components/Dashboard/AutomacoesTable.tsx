import { useState, useEffect, useRef } from "react";
import { Plus, Pause, Play, Pencil, Trash2, History, Bot, Send, Clock, Filter, UserX, Upload, Volume2, X } from "lucide-react";
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

  const [subTab, setSubTab] = useState("automacoes");
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
  });
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

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
    setForm({ nome: "", dias_apos_venda: 7, mensagem: "", status: "Ativa", fonte: "leads", filtro_como_conheceu: null, audio_url: null });
    setEditingId(null);
    setShowForm(false);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAudio(true);
    const fileName = `automacao-audio-${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("whatsapp-media")
      .upload(fileName, file, { contentType: file.type });
    if (error) {
      console.error("Upload error:", error);
      setIsUploadingAudio(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("whatsapp-media").getPublicUrl(data.path);
    setForm({ ...form, audio_url: urlData.publicUrl });
    setIsUploadingAudio(false);
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
    setForm({ nome: a.nome, dias_apos_venda: a.dias_apos_venda, mensagem: a.mensagem, status: a.status, fonte: a.fonte, filtro_como_conheceu: a.filtro_como_conheceu, audio_url: a.audio_url });
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

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={subTab} onValueChange={setSubTab} className="w-auto">
          <TabsList>
            <TabsTrigger value="automacoes" className="gap-1.5">
              <Bot className="w-4 h-4" /> Automações
            </TabsTrigger>
            <TabsTrigger value="perdidos" className="gap-1.5">
              <UserX className="w-4 h-4" /> Perdidos
            </TabsTrigger>
            <TabsTrigger value="enviados" className="gap-1.5">
              <Send className="w-4 h-4" /> Enviados
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5">
              <History className="w-4 h-4" /> Histórico
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {subTab !== "perdidos" && <div className="flex items-center gap-3">
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
                    onChange={(e) => setForm({ ...form, fonte: e.target.value, filtro_como_conheceu: e.target.value === "detalhado" ? form.filtro_como_conheceu : null })}
                  >
                    <option value="leads">Leads (com venda)</option>
                    <option value="detalhado">Detalhado (receita sem visita à loja)</option>
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
                  <label className="text-sm font-medium mb-1 block">Disparar após quantos dias da venda</label>
                  <Input
                    type="number"
                    value={form.dias_apos_venda}
                    onChange={(e) => setForm({ ...form, dias_apos_venda: Number(e.target.value) })}
                    min={1}
                  />
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
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    <Volume2 className="w-3.5 h-3.5 inline mr-1" />
                    Áudio (enviado após a mensagem de texto)
                  </label>
                  {form.audio_url ? (
                    <div className="flex items-center gap-2 border rounded p-2 bg-muted/30">
                      <audio controls src={form.audio_url} className="h-8 flex-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setForm({ ...form, audio_url: null })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={handleAudioUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => audioInputRef.current?.click()}
                        disabled={isUploadingAudio}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {isUploadingAudio ? "Enviando..." : "Enviar áudio"}
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Opcional. O áudio será enviado logo após a mensagem de texto.
                  </p>
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
        </div>}
      </div>

      {/* Automações list */}
      {subTab === "automacoes" && (
        <div className="space-y-3">
          {automacoes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
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
                    <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-1.5">
                          {a.nome}
                          {a.audio_url && <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          {a.fonte === "detalhado" ? "Detalhado" : "Leads"}
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
                        <div className="flex items-center justify-center gap-1">
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
      )}

      {/* Perdidos */}
      {subTab === "perdidos" && (
        <DisparosTable leads={leads} />
      )}

      {/* Enviados */}
      {subTab === "enviados" && (
        <EnviadosTable />
      )}

      {/* Histórico */}
      {subTab === "historico" && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {disparos.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum disparo realizado ainda.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Telefone</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Automação</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Data Programada</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Envio</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Erro</th>
                </tr>
              </thead>
              <tbody>
                {disparos.map((d) => {
                  const automacao = automacoes.find(a => a.id === d.automacao_id);
                  return (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{d.nome_cliente || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.telefone || "—"}</td>
                      <td className="px-4 py-3">{automacao?.nome || "—"}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{d.data_programada}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {d.data_envio ? new Date(d.data_envio).toLocaleString("pt-BR") : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={statusColor(d.status)}>
                          {d.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-destructive max-w-[200px] truncate">{d.erro || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
