import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Send, XCircle, Clock, CheckCircle, AlertCircle, Loader2, Eye, Volume2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  id: string; // lead/detalhado id
  nome: string;
  telefone: string;
  data_compra: string;
  data_envio_programada: string;
  dias_faltam: number;
  status: "pendente" | "enviado" | "erro" | "cancelado";
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

export function AutomacaoDetailView({ automacao, onBack }: AutomacaoDetailViewProps) {
  const [clientes, setClientes] = useState<ClienteAgendado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // Get existing disparos for this automation
    const { data: disparosExistentes } = await supabase
      .from("automacao_disparos")
      .select("*")
      .eq("automacao_id", automacao.id);

    const disparosMap = new Map<string, any>();
    (disparosExistentes || []).forEach(d => disparosMap.set(d.lead_id, d));

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

      const disparo = disparosMap.get(client.id);

      if (disparo) {
        result.push({
          id: client.id,
          nome: client.nome,
          telefone: client.telefone,
          data_compra: client.data_registro,
          data_envio_programada: formatDateBR(targetDate),
          dias_faltam: diasFaltam,
          status: disparo.status as any,
          disparo_id: disparo.id,
          data_envio_real: disparo.data_envio ? new Date(disparo.data_envio).toLocaleString("pt-BR") : undefined,
          erro: disparo.erro || undefined,
        });
      } else if (diasFaltam >= 0) {
        // Only show pending if not yet past
        result.push({
          id: client.id,
          nome: client.nome,
          telefone: client.telefone,
          data_compra: client.data_registro,
          data_envio_programada: formatDateBR(targetDate),
          dias_faltam: diasFaltam,
          status: "pendente",
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

  const handleEnviarAgora = async (cliente: ClienteAgendado) => {
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
        .replace(/\{vendedor\}/g, "")
        .replace(/\{medico\}/g, "");

      const { data, error } = await supabase.functions.invoke("whatsapp-disparo", {
        body: {
          phone: `55${phone}`,
          message: mensagem,
        },
      });

      let audioOk = true;
      if (!error && automacao.audio_url) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const { error: audioErr } = await supabase.functions.invoke("whatsapp-disparo", {
          body: {
            phone: `55${phone}`,
            mediaUrl: automacao.audio_url,
            mediaType: "audio",
          },
        });
        if (audioErr) audioOk = false;
      }

      const status = error ? "erro" : "enviado";

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

  const pendentes = clientes.filter(c => c.status === "pendente");
  const processados = clientes.filter(c => c.status !== "pendente");

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
            {automacao.fonte === "detalhado" ? "Detalhado" : "Leads"} · {automacao.dias_apos_venda} dias após venda
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando clientes...
        </div>
      ) : clientes.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum cliente encontrado para esta automação.</p>
        </div>
      ) : (
        <>
          {/* Pending dispatches */}
          {pendentes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                Pendentes ({pendentes.length})
              </h4>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Cliente</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Data da Compra</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Data do Envio</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Dias Restantes</th>
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
                        <td className="px-4 py-3 text-center text-muted-foreground">{c.data_compra}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{c.data_envio_programada}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-200">
                            <Clock className="w-3 h-3" />
                            {c.dias_faltam === 0 ? "Hoje" : `${c.dias_faltam}d`}
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

          {/* Already processed */}
          {processados.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                Processados ({processados.length})
              </h4>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Cliente</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Data da Compra</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Enviado em</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
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
                        <td className="px-4 py-3 text-center text-muted-foreground">{c.data_compra}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {c.data_envio_real || "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={`gap-1 ${statusColor(c.status)}`}>
                            {statusIcon(c.status)} {c.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
