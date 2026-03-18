import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Send, XCircle, Clock, CheckCircle, AlertCircle, Loader2, Eye, Volume2, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
import type { Automacao, AutomacaoDisparo } from "@/hooks/useAutomacoes";

interface ClienteAgendado {
  id: string;
  nome: string;
  telefone: string;
  data_compra: string;
  data_envio_programada: string;
  dias_faltam: number;
  status: "pendente" | "enviado" | "erro" | "cancelado";
  vendedor?: string;
  disparo_id?: string;
  data_envio_real?: string;
  erro?: string;
}

interface AutomacaoDetailViewProps {
  automacao: Automacao;
  onBack: () => void;
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateBR(date: Date): string {
  return date.toLocaleDateString("pt-BR");
}

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10) return null;
  if (cleaned.startsWith("55") && cleaned.length >= 12) return cleaned.substring(2);
  return cleaned;
}

function normalizePatientKey(nome: string | null, telefone: string | null): string {
  const normalizedPhone = cleanPhone(telefone);
  if (normalizedPhone) return `phone:${normalizedPhone}`;

  return `name:${(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()}`;
}

function buildLatestDetalhadoClients(records: Array<{ id: string; nome: string | null; telefone: string | null; data: string | null }> | null) {
  const latestMap = new Map<string, { id: string; nome: string; telefone: string; data_registro: string; vendedor?: string; medico?: string; parsedDate: Date }>();

  for (const record of records || []) {
    const parsedDate = parseDate(record.data);
    const telefone = record.telefone || "";
    const nome = record.nome || "Sem nome";

    if (!parsedDate || !telefone) continue;

    const key = normalizePatientKey(nome, telefone);
    const existing = latestMap.get(key);

    if (!existing || parsedDate > existing.parsedDate) {
      latestMap.set(key, {
        id: record.id,
        nome,
        telefone,
        data_registro: record.data || "",
        vendedor: undefined,
        medico: undefined,
        parsedDate,
      });
    }
  }

  return Array.from(latestMap.values()).map(({ parsedDate, ...client }) => client);
}

export function AutomacaoDetailView({ automacao, onBack }: AutomacaoDetailViewProps) {
  const [clientes, setClientes] = useState<ClienteAgendado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // Get existing disparos for this automation
    const { data: disparosExistentes } = await supabase
      .from("automacao_disparos")
      .select("*")
      .eq("automacao_id", automacao.id);

    const disparosMap = new Map<string, any>();
    (disparosExistentes || []).forEach((d) => {
      const key = automacao.fonte === "detalhado_inativos"
        ? normalizePatientKey(d.nome_cliente, d.telefone)
        : d.lead_id;
      disparosMap.set(key, d);
    });

    let rawClients: { id: string; nome: string; telefone: string; data_registro: string; vendedor?: string; medico?: string }[] = [];

    if (automacao.fonte === "detalhado") {
      let query = supabase
        .from("detalhado")
        .select("*")
        .not("telefone", "is", null)
        .or("receita.eq.Sim,receita.eq.sim,receita.eq.SIM")
        .or("visitou_loja.eq.Não,visitou_loja.eq.não,visitou_loja.eq.NAO,visitou_loja.is.null");

      if (automacao.filtro_como_conheceu && automacao.filtro_como_conheceu.length > 0) {
        query = query.in("como_conheceu", automacao.filtro_como_conheceu);
      }

      const { data } = await query;
      rawClients = (data || []).map(d => ({
        id: d.id,
        nome: d.nome || "Sem nome",
        telefone: d.telefone || "",
        data_registro: d.data || "",
        vendedor: undefined,
        medico: undefined,
      }));
    } else if (automacao.fonte === "detalhado_inativos") {
      const { data } = await supabase
        .from("detalhado")
        .select("id, nome, telefone, data")
        .not("telefone", "is", null)
        .not("data", "is", null);

      rawClients = buildLatestDetalhadoClients(data);
    } else if (automacao.fonte === "perdidos") {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("status", "Perdido")
        .not("numero", "is", null);

      rawClients = (data || []).map(l => ({
        id: l.id,
        nome: l.nome || "Sem nome",
        telefone: l.numero || "",
        data_registro: l.updated_at ? new Date(l.updated_at).toLocaleDateString("pt-BR") : "",
        vendedor: l.vendedor || undefined,
        medico: l.medico || undefined,
      }));
    } else {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("venda", "Sim")
        .not("numero", "is", null);

      rawClients = (data || []).map(l => ({
        id: l.id,
        nome: l.nome || "Sem nome",
        telefone: l.numero || "",
        data_registro: l.data_registro || "",
        vendedor: l.vendedor || undefined,
        medico: l.medico || undefined,
      }));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result: ClienteAgendado[] = [];

    for (const client of rawClients) {
      const dataVenda = parseDate(client.data_registro);
      if (!dataVenda) continue;

      const targetDate = new Date(dataVenda);
      targetDate.setDate(targetDate.getDate() + automacao.dias_apos_venda);

      const diffTime = targetDate.getTime() - today.getTime();
      const diasFaltam = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const disparoKey = automacao.fonte === "detalhado_inativos"
        ? normalizePatientKey(client.nome, client.telefone)
        : client.id;
      const disparo = disparosMap.get(disparoKey);

      if (disparo) {
        result.push({
          id: client.id,
          nome: client.nome,
          telefone: client.telefone,
          data_compra: client.data_registro,
          data_envio_programada: formatDateBR(targetDate),
          dias_faltam: diasFaltam,
          status: disparo.status as any,
          vendedor: client.vendedor,
          disparo_id: disparo.id,
          data_envio_real: disparo.data_envio ? new Date(disparo.data_envio).toLocaleString("pt-BR") : undefined,
          erro: disparo.erro || undefined,
        });
      } else if (automacao.fonte === "detalhado_inativos") {
        // Show ALL clients for inativos — those past threshold AND approaching it
        result.push({
          id: client.id,
          nome: client.nome,
          telefone: client.telefone,
          data_compra: client.data_registro,
          data_envio_programada: formatDateBR(targetDate),
          dias_faltam: diasFaltam,
          status: "pendente",
          vendedor: client.vendedor,
        });
      } else if (diasFaltam >= 0) {
        result.push({
          id: client.id,
          nome: client.nome,
          telefone: client.telefone,
          data_compra: client.data_registro,
          data_envio_programada: formatDateBR(targetDate),
          dias_faltam: diasFaltam,
          status: "pendente",
          vendedor: client.vendedor,
        });
      }
    }

    // Sort: pending first (by days remaining asc), then sent/error
    result.sort((a, b) => {
      if (a.status === "pendente" && b.status !== "pendente") return -1;
      if (a.status !== "pendente" && b.status === "pendente") return 1;
      return a.dias_faltam - b.dias_faltam;
    });

    setClientes(result);
    setIsLoading(false);
  }, [automacao]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEnviarAgora = async (cliente: ClienteAgendado, isRetry = false) => {
    const phone = cleanPhone(cliente.telefone);
    if (!phone) {
      toast({ title: "Telefone inválido", variant: "destructive" });
      return;
    }

    setSendingId(cliente.id);

    try {
      const mensagem = automacao.mensagem
        .replace(/\{nome_cliente\}/g, cliente.nome || "Cliente")
        .replace(/\{data_compra\}/g, cliente.data_compra || "")
        .replace(/\{vendedor\}/g, cliente.vendedor || "")
        .replace(/\{medico\}/g, "");

      // Send text message
      const leadPayload = {
        id: cliente.id,
        nome: cliente.nome,
        numero: cliente.telefone,
        vendedor: cliente.vendedor || "",
        medico: "",
        canal: "",
        data_registro: cliente.data_compra || "",
      };

      const { data, error } = await supabase.functions.invoke("whatsapp-disparo", {
        body: {
          leads: [leadPayload],
          mensagem,
        },
      });

      // Send audio if configured
      let audioOk = true;
      const audioUrl = (cliente.vendedor && automacao.audios_vendedor?.[cliente.vendedor]) || automacao.audios_vendedor?.["Thayssa"] || automacao.audio_url;
      if (!error && audioUrl) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const { error: audioErr } = await supabase.functions.invoke("whatsapp-disparo", {
          body: {
            leads: [leadPayload],
            mediaUrl: audioUrl,
            mediaType: "audio",
          },
        });
        if (audioErr) audioOk = false;
      }

      const status = error ? "erro" : "enviado";

      if (isRetry && cliente.disparo_id) {
        // Update existing disparo record on retry
        await supabase.from("automacao_disparos").update({
          status,
          data_envio: status === "enviado" ? new Date().toISOString() : null,
          erro: error ? String(error) : null,
          mensagem_enviada: mensagem,
        }).eq("id", cliente.disparo_id);
      } else {
        await supabase.from("automacao_disparos").insert({
          automacao_id: automacao.id,
          lead_id: cliente.id,
          nome_cliente: cliente.nome,
          telefone: cliente.telefone,
          mensagem_enviada: mensagem,
          status,
          data_envio: status === "enviado" ? new Date().toISOString() : null,
          data_programada: new Date().toISOString().split("T")[0],
          erro: error ? String(error) : null,
        });
      }

      if (status === "enviado") {
        await supabase
          .from("automacoes")
          .update({ total_envios: automacao.total_envios + 1 })
          .eq("id", automacao.id);
      }

      toast({ title: status === "enviado" ? "Mensagem enviada!" : "Erro no envio", variant: status === "erro" ? "destructive" : "default" });
      fetchData();
    } catch (err) {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  };

  const handleCancelar = async (cliente: ClienteAgendado) => {
    setCancellingId(cliente.id);

    await supabase.from("automacao_disparos").insert({
      automacao_id: automacao.id,
      lead_id: cliente.id,
      nome_cliente: cliente.nome,
      telefone: cliente.telefone,
      mensagem_enviada: null,
      status: "cancelado",
      data_envio: null,
      data_programada: new Date().toISOString().split("T")[0],
      erro: "Cancelado manualmente",
    });

    toast({ title: "Disparo cancelado" });
    fetchData();
    setCancellingId(null);
  };

  const filterBySearch = (list: ClienteAgendado[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(c => c.nome.toLowerCase().includes(q) || c.telefone.includes(q));
  };

  const pendentes = filterBySearch(clientes.filter(c => c.status === "pendente"));
  const processados = filterBySearch(clientes.filter(c => c.status !== "pendente"));

  const statusIcon = (s: string) => {
    switch (s) {
      case "enviado": return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
      case "erro": return <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
      case "cancelado": return <XCircle className="w-3.5 h-3.5 text-muted-foreground" />;
      default: return <Clock className="w-3.5 h-3.5 text-yellow-600" />;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "enviado": return "bg-green-500/10 text-green-600 border-green-200";
      case "erro": return "bg-red-500/10 text-red-600 border-red-200";
      case "cancelado": return "bg-muted text-muted-foreground border-border";
      default: return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{automacao.nome}</h3>
          <p className="text-sm text-muted-foreground">
            {automacao.fonte === "detalhado"
              ? "Detalhado"
              : automacao.fonte === "detalhado_inativos"
                ? "Detalhado · Último atendimento"
                : automacao.fonte === "perdidos"
                  ? "Perdidos"
                  : "Leads"} · {automacao.dias_apos_venda} dias após {automacao.fonte === "perdidos"
              ? "marcado como perdido"
              : automacao.fonte === "detalhado_inativos"
                ? "o último atendimento"
                : "venda"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye className="w-4 h-4" />
          {showPreview ? "Ocultar prévia" : "Ver prévia"}
          {showPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      {/* Message & Audio Preview */}
      {showPreview && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Prévia da mensagem
          </h4>
          <div className="rounded-md bg-background border border-border p-3 text-sm whitespace-pre-wrap">
            {automacao.mensagem
              .replace(/\{nome_cliente\}/g, "João da Silva")
              .replace(/\{data_compra\}/g, "10/03/2026")
              .replace(/\{vendedor\}/g, "Vendedor")
              .replace(/\{medico\}/g, "Dr. Exemplo")}
          </div>
          <p className="text-xs text-muted-foreground italic">
            * Variáveis substituídas com dados de exemplo
          </p>
          {automacao.audios_vendedor && Object.keys(automacao.audios_vendedor).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Áudios por vendedor
              </h4>
              {Object.entries(automacao.audios_vendedor).map(([vendedor, url]) => (
                <div key={vendedor} className="border rounded p-2 bg-background space-y-1">
                  <span className="text-sm font-medium">{vendedor}</span>
                  <audio controls src={url} className="w-full max-w-md h-10" />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                O áudio do vendedor que fez a venda será enviado automaticamente.
              </p>
            </div>
          )}
          {automacao.audio_url && (!automacao.audios_vendedor || Object.keys(automacao.audios_vendedor).length === 0) && (
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Áudio padrão
              </h4>
              <audio controls src={automacao.audio_url} className="w-full max-w-md h-10" />
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Pesquisar por nome ou telefone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <Tabs defaultValue="pendentes" className="w-full">
        <TabsList>
          <TabsTrigger value="pendentes" className="gap-1.5">
            <Clock className="w-4 h-4" /> Pendentes
          </TabsTrigger>
          <TabsTrigger value="enviados" className="gap-1.5">
            <Send className="w-4 h-4" /> Enviados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando clientes...
            </div>
          ) : pendentes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum disparo pendente.</p>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                Pendentes ({pendentes.length})
              </h4>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Cliente</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Vendedor</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">{automacao.fonte === "perdidos" ? "Marcado como Perdido" : automacao.fonte === "detalhado_inativos" ? "Último Atendimento" : "Data da Compra"}</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Data do Envio</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">{automacao.fonte === "detalhado_inativos" ? "Tempo" : "Dias Restantes"}</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendentes.map((c) => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-medium">{c.nome}</span>
                            <span className="block text-xs text-muted-foreground">{c.telefone}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{c.vendedor || "—"}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{c.data_compra}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{c.data_envio_programada}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-200">
                            <Clock className="w-3 h-3" />
                            {automacao.fonte === "detalhado_inativos"
                              ? `${Math.abs(c.dias_faltam)}d em atraso`
                              : c.dias_faltam === 0
                                ? "Hoje"
                                : `${c.dias_faltam}d`}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs h-7"
                              disabled={sendingId === c.id}
                              onClick={() => handleEnviarAgora(c)}
                            >
                              {sendingId === c.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              Enviar agora
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-xs h-7 text-muted-foreground hover:text-destructive"
                                  disabled={cancellingId === c.id}
                                >
                                  {cancellingId === c.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <XCircle className="w-3 h-3" />
                                  )}
                                  Cancelar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancelar disparo</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja cancelar o disparo para {c.nome}? A mensagem não será enviada.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleCancelar(c)}
                                  >
                                    Cancelar disparo
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
            </div>
          )}
        </TabsContent>

        <TabsContent value="enviados">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : processados.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Send className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum disparo enviado ainda.</p>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                Enviados ({processados.length})
              </h4>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Cliente</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Vendedor</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">{automacao.fonte === "perdidos" ? "Marcado como Perdido" : automacao.fonte === "detalhado_inativos" ? "Último Atendimento" : "Data da Compra"}</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Enviado em</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processados.map((c) => (
                      <tr key={`${c.id}-${c.disparo_id}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-medium">{c.nome}</span>
                            <span className="block text-xs text-muted-foreground">{c.telefone}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{c.vendedor || "—"}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{c.data_compra}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {c.data_envio_real || "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant="outline" className={`gap-1 ${statusColor(c.status)}`}>
                              {statusIcon(c.status)} {c.status}
                            </Badge>
                            {c.erro && (
                              <span className="text-[10px] text-muted-foreground max-w-[200px] truncate" title={c.erro}>
                                {c.erro}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {c.status === "erro" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs h-7"
                              disabled={sendingId === c.id}
                              onClick={() => handleEnviarAgora(c, true)}
                            >
                              {sendingId === c.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              Reenviar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
