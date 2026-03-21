import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ArrowLeft, Send, XCircle, Clock, CheckCircle, AlertCircle, Loader2, Eye, Volume2, ChevronDown, ChevronUp, Search, Download, BarChart3 } from "lucide-react";
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
  resposta_cliente?: boolean;
  observacao?: string;
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

const CHART_COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
  "#818cf8", "#7c3aed", "#5b21b6", "#4f46e5",
  "#10b981", "#f59e0b", "#ec4899", "#14b8a6",
];

function ObservacaoCell({ value, onSave }: { value: string; onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const handleSave = () => {
    setEditing(false);
    if (text !== value) onSave(text);
  };

  if (!editing) {
    return (
      <div
        className="cursor-pointer text-sm text-muted-foreground hover:text-foreground min-h-[24px] px-1 py-0.5 rounded hover:bg-muted/50 transition-colors"
        onClick={() => setEditing(true)}
        title="Clique para editar"
      >
        {value || <span className="italic text-muted-foreground/50">Clique para adicionar...</span>}
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      className="w-full text-sm border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setText(value); setEditing(false); } }}
    />
  );
}

function RelatorioTab({ clientes }: { clientes: ClienteAgendado[] }) {
  const chartData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of clientes) {
      const obs = (c.observacao || "").trim();
      if (!obs) continue;
      const key = obs.length > 40 ? obs.substring(0, 40) + "…" : obs;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([motivo, quantidade]) => ({ motivo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [clientes]);

  const totalObs = chartData.reduce((s, d) => s + d.quantidade, 0);
  const totalClientes = clientes.length;

  if (chartData.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>Nenhuma observação registrada ainda.</p>
        <p className="text-xs mt-1">Preencha a coluna "Observação" na aba Enviados para ver o relatório.</p>
      </div>
    );
  }

  const maxVal = Math.max(...chartData.map(d => d.quantidade));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          Motivos de não fechamento
        </h4>
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          {totalObs} de {totalClientes} clientes
        </span>
      </div>

      <div className="space-y-2.5">
        {chartData.map((item, index) => {
          const pct = maxVal > 0 ? (item.quantidade / maxVal) * 100 : 0;
          const pctTotal = totalObs > 0 ? ((item.quantidade / totalObs) * 100).toFixed(0) : "0";
          return (
            <div key={index} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground font-medium truncate max-w-[70%]" title={item.motivo}>
                  {item.motivo}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {item.quantidade}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({pctTotal}%)
                  </span>
                </div>
              </div>
              <div className="w-full h-7 bg-muted/50 rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(pct, 3)}%`,
                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AutomacaoDetailView({ automacao, onBack }: AutomacaoDetailViewProps) {
  const [clientes, setClientes] = useState<ClienteAgendado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [respostaFilter, setRespostaFilter] = useState<"todos" | "sim" | "nao">("todos");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, errors: 0, total: 0 });

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
      // Use server-side function for fast deduplication and filtering
      const { data, error } = await supabase.rpc("get_inactive_patients", {
        dias_limite: automacao.dias_apos_venda,
        dias_janela: 30,
      });

      if (!error && data) {
        rawClients = (data as any[]).map(d => ({
          id: d.id,
          nome: d.nome || "Sem nome",
          telefone: d.telefone || "",
          data_registro: d.ultimo_atendimento || "",
          vendedor: undefined,
          medico: undefined,
        }));
      }
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
          resposta_cliente: (disparo as any).resposta_cliente || false,
          observacao: (disparo as any).observacao || undefined,
        });
      } else if (automacao.fonte === "detalhado_inativos") {
        // Only show clients within 30 days of threshold or already past it
        if (diasFaltam <= 30) {
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

  const handleImportHistorico = useCallback(async () => {
    setIsImporting(true);
    setImportProgress("Iniciando importação histórica...");

    try {
      const today = new Date();
      const startYear = today.getFullYear() - 3;
      let totalInserted = 0;
      let totalSkipped = 0;

      for (let year = startYear; year <= today.getFullYear(); year++) {
        const startMonth = year === startYear ? today.getMonth() : 0;
        const endMonth = year === today.getFullYear() ? today.getMonth() : 11;

        for (let month = startMonth; month <= endMonth; month++) {
          const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month + 1, 0).getDate();
          const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

          const monthLabel = `${String(month + 1).padStart(2, "0")}/${year}`;
          setImportProgress(`Importando ${monthLabel}...`);

          try {
            const { data, error } = await supabase.functions.invoke("import-attendances", {
              body: { start_date: startDate, end_date: endDate },
            });

            if (!error && data) {
              totalInserted += data.total_inserted || 0;
              totalSkipped += data.total_skipped || 0;
            }
          } catch (e) {
            console.error(`Erro importando ${monthLabel}:`, e);
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setImportProgress("");
      toast({
        title: "Importação concluída!",
        description: `${totalInserted} novos registros importados, ${totalSkipped} já existentes.`,
      });

      fetchData();
    } catch (err) {
      toast({ title: "Erro na importação", variant: "destructive" });
    } finally {
      setIsImporting(false);
      setImportProgress("");
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription for resposta_cliente updates
  useEffect(() => {
    const channel = supabase
      .channel(`disparos-${automacao.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'automacao_disparos',
          filter: `automacao_id=eq.${automacao.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setClientes((prev) =>
            prev.map((c) =>
              c.disparo_id === updated.id
                ? {
                    ...c,
                    resposta_cliente: updated.resposta_cliente,
                    status: updated.status,
                    erro: updated.erro || undefined,
                    observacao: updated.observacao || undefined,
                    data_envio_real: updated.data_envio
                      ? new Date(updated.data_envio).toLocaleString("pt-BR")
                      : c.data_envio_real,
                  }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [automacao.id]);

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

      const leadPayload = {
        id: cliente.id,
        nome: cliente.nome,
        numero: cliente.telefone,
        vendedor: cliente.vendedor || "",
        medico: "",
        canal: "",
        data_registro: cliente.data_compra || "",
      };

      if (automacao.fonte === "detalhado" || automacao.fonte === "detalhado_inativos") {
        const { error: ensureLeadError } = await supabase.from("leads").upsert(
          {
            id: cliente.id,
            nome: cliente.nome,
            numero: cliente.telefone,
            venda: "Não",
            status: "Ativo",
            data_registro: cliente.data_compra || undefined,
          },
          { onConflict: "id" }
        );

        if (ensureLeadError) {
          throw new Error(`Erro ao preparar lead para histórico de disparo: ${ensureLeadError.message}`);
        }
      }

      const { data, error } = await supabase.functions.invoke("whatsapp-disparo", {
        body: {
          leads: [leadPayload],
          mensagem,
          instancia: automacao.instancia || "suavisao",
        },
      });

      const sendResult = (data as { results?: Array<{ status?: string; erro?: string }> } | null)?.results?.[0];
      const textSent = !error && sendResult?.status === "enviado";
      const textError = error ? String(error.message || error) : (sendResult?.erro || null);

      let audioOk = true;
      const audioUrl = (cliente.vendedor && automacao.audios_vendedor?.[cliente.vendedor]) || automacao.audios_vendedor?.["Thayssa"] || automacao.audio_url;
      if (textSent && audioUrl) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const { data: audioData, error: audioErr } = await supabase.functions.invoke("whatsapp-disparo", {
          body: {
            leads: [leadPayload],
            mediaUrl: audioUrl,
            mediaType: "audio",
            instancia: automacao.instancia || "suavisao",
          },
        });

        const audioResult = (audioData as { results?: Array<{ status?: string }> } | null)?.results?.[0];
        if (audioErr || audioResult?.status !== "enviado") {
          audioOk = false;
        }
      }

      const status = textSent ? "enviado" : "erro";
      const erroMensagem = status === "erro"
        ? (textError || "Falha ao enviar mensagem")
        : (!audioOk ? "Mensagem enviada, mas o áudio falhou" : null);

      if (isRetry && cliente.disparo_id) {
        const { error: updateError } = await supabase.from("automacao_disparos").update({
          status,
          data_envio: status === "enviado" ? new Date().toISOString() : null,
          erro: erroMensagem,
          mensagem_enviada: mensagem,
        }).eq("id", cliente.disparo_id);

        if (updateError) {
          throw new Error(`Erro ao atualizar disparo: ${updateError.message}`);
        }
      } else {
        const { error: insertError } = await supabase.from("automacao_disparos").insert({
          automacao_id: automacao.id,
          lead_id: cliente.id,
          nome_cliente: cliente.nome,
          telefone: cliente.telefone,
          mensagem_enviada: mensagem,
          status,
          data_envio: status === "enviado" ? new Date().toISOString() : null,
          data_programada: new Date().toISOString().split("T")[0],
          erro: erroMensagem,
        });

        if (insertError) {
          throw new Error(`Erro ao salvar histórico do disparo: ${insertError.message}`);
        }
      }

      if (status === "enviado") {
        await supabase
          .from("automacoes")
          .update({ total_envios: automacao.total_envios + 1 })
          .eq("id", automacao.id);
      }

      toast({
        title: status === "enviado" ? "Mensagem enviada!" : "Erro no envio",
        description: erroMensagem || undefined,
        variant: status === "erro" ? "destructive" : "default",
      });

      fetchData();
    } catch (err) {
      toast({
        title: "Erro ao enviar",
        description: err instanceof Error ? err.message : "Erro inesperado",
        variant: "destructive",
      });
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

  const pendentesEmAtraso = useMemo(() => {
    return clientes.filter(c => c.status === "pendente" && c.dias_faltam <= 0);
  }, [clientes]);

  const handleUpdateObservacao = async (disparoId: string, value: string) => {
    const { error } = await supabase
      .from("automacao_disparos")
      .update({ observacao: value || null } as any)
      .eq("id", disparoId);
    if (error) {
      toast({ title: "Erro ao salvar observação", variant: "destructive" });
    } else {
      setClientes((prev) =>
        prev.map((c) =>
          c.disparo_id === disparoId ? { ...c, observacao: value || undefined } : c
        )
      );
    }
  };

  const handleEnviarTodosEmAtraso = async () => {
    const emAtraso = pendentesEmAtraso;
    if (emAtraso.length === 0) {
      toast({ title: "Nenhum cliente em atraso para enviar" });
      return;
    }

    setIsBulkSending(true);
    setBulkProgress({ sent: 0, errors: 0, total: emAtraso.length });

    let sent = 0;
    let errors = 0;

    for (const cliente of emAtraso) {
      const phone = cleanPhone(cliente.telefone);
      if (!phone) {
        errors++;
        setBulkProgress({ sent, errors, total: emAtraso.length });
        continue;
      }

      try {
        const mensagem = automacao.mensagem
          .replace(/\{nome_cliente\}/g, cliente.nome || "Cliente")
          .replace(/\{data_compra\}/g, cliente.data_compra || "")
          .replace(/\{vendedor\}/g, cliente.vendedor || "")
          .replace(/\{medico\}/g, "");

        const leadPayload = {
          id: cliente.id,
          nome: cliente.nome,
          numero: cliente.telefone,
          vendedor: cliente.vendedor || "",
          medico: "",
          canal: "",
          data_registro: cliente.data_compra || "",
        };

        if (automacao.fonte === "detalhado" || automacao.fonte === "detalhado_inativos") {
          await supabase.from("leads").upsert(
            {
              id: cliente.id,
              nome: cliente.nome,
              numero: cliente.telefone,
              venda: "Não",
              status: "Ativo",
              data_registro: cliente.data_compra || undefined,
            },
            { onConflict: "id" }
          );
        }

        const { data, error } = await supabase.functions.invoke("whatsapp-disparo", {
          body: {
            leads: [leadPayload],
            mensagem,
            instancia: automacao.instancia || "suavisao",
          },
        });

        const sendResult = (data as { results?: Array<{ status?: string; erro?: string }> } | null)?.results?.[0];
        const textSent = !error && sendResult?.status === "enviado";
        const textError = error ? String(error.message || error) : (sendResult?.erro || null);

        let audioOk = true;
        const audioUrl = (cliente.vendedor && automacao.audios_vendedor?.[cliente.vendedor]) || automacao.audios_vendedor?.["Thayssa"] || automacao.audio_url;
        if (textSent && audioUrl) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const { data: audioData, error: audioErr } = await supabase.functions.invoke("whatsapp-disparo", {
            body: {
              leads: [leadPayload],
              mediaUrl: audioUrl,
              mediaType: "audio",
              instancia: automacao.instancia || "suavisao",
            },
          });
          const audioResult = (audioData as { results?: Array<{ status?: string }> } | null)?.results?.[0];
          if (audioErr || audioResult?.status !== "enviado") audioOk = false;
        }

        const status = textSent ? "enviado" : "erro";
        const erroMensagem = status === "erro"
          ? (textError || "Falha ao enviar mensagem")
          : (!audioOk ? "Mensagem enviada, mas o áudio falhou" : null);

        await supabase.from("automacao_disparos").insert({
          automacao_id: automacao.id,
          lead_id: cliente.id,
          nome_cliente: cliente.nome,
          telefone: cliente.telefone,
          mensagem_enviada: mensagem,
          status,
          data_envio: status === "enviado" ? new Date().toISOString() : null,
          data_programada: new Date().toISOString().split("T")[0],
          erro: erroMensagem,
        });

        if (status === "enviado") sent++;
        else errors++;
      } catch {
        errors++;
      }

      setBulkProgress({ sent, errors, total: emAtraso.length });

      // Small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (sent > 0) {
      await supabase
        .from("automacoes")
        .update({ total_envios: automacao.total_envios + sent })
        .eq("id", automacao.id);
    }

    setIsBulkSending(false);
    toast({
      title: `Envio em massa concluído`,
      description: `${sent} enviado(s), ${errors} erro(s) de ${emAtraso.length} total.`,
    });
    fetchData();
  };

  const filterBySearch = (list: ClienteAgendado[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(c => c.nome.toLowerCase().includes(q) || c.telefone.includes(q));
  };

  const pendentes = filterBySearch(clientes.filter(c => c.status === "pendente"));
  const processadosAll = filterBySearch(clientes.filter(c => c.status !== "pendente"));
  const processados = respostaFilter === "todos" 
    ? processadosAll 
    : respostaFilter === "sim" 
      ? processadosAll.filter(c => c.resposta_cliente === true) 
      : processadosAll.filter(c => !c.resposta_cliente);

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
        {automacao.fonte === "detalhado_inativos" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleImportHistorico}
            disabled={isImporting}
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isImporting ? importProgress || "Importando..." : "Importar histórico"}
          </Button>
        )}
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
          <TabsTrigger value="relatorio" className="gap-1.5">
            <BarChart3 className="w-4 h-4" /> Relatório
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
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Pendentes ({pendentes.length})
                </h4>
                {pendentesEmAtraso.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1.5"
                        disabled={isBulkSending}
                      >
                        {isBulkSending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {bulkProgress.sent + bulkProgress.errors}/{bulkProgress.total}
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Enviar todos em atraso ({pendentesEmAtraso.length})
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Enviar para todos em atraso</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja enviar a mensagem para {pendentesEmAtraso.length} cliente(s) em atraso? O envio será feito um a um com intervalo de 2 segundos entre cada.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleEnviarTodosEmAtraso}>
                          Confirmar envio em massa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
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
                          <Badge variant="outline" className={`gap-1 ${
                            automacao.fonte === "detalhado_inativos"
                              ? c.dias_faltam <= 0
                                ? "bg-red-500/10 text-red-600 border-red-200"
                                : "bg-blue-500/10 text-blue-600 border-blue-200"
                              : "bg-yellow-500/10 text-yellow-600 border-yellow-200"
                          }`}>
                            <Clock className="w-3 h-3" />
                            {automacao.fonte === "detalhado_inativos"
                              ? c.dias_faltam <= 0
                                ? `${Math.abs(c.dias_faltam)}d em atraso`
                                : `${c.dias_faltam}d restantes`
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
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Enviados ({processados.length}{respostaFilter !== "todos" ? ` de ${processadosAll.length}` : ""})
                </h4>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Resposta:</span>
                  {([
                    { key: "todos", label: "Todos" },
                    { key: "sim", label: "Sim" },
                    { key: "nao", label: "Não" },
                  ] as const).map(({ key, label }) => (
                    <Button
                      key={key}
                      variant={respostaFilter === key ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs px-3"
                      onClick={() => setRespostaFilter(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Cliente</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Vendedor</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">{automacao.fonte === "perdidos" ? "Marcado como Perdido" : automacao.fonte === "detalhado_inativos" ? "Último Atendimento" : "Data da Compra"}</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Enviado em</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Resposta</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground min-w-[200px]">Observação</th>
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
                          <Badge variant="outline" className={`gap-1 ${
                            c.resposta_cliente
                              ? "bg-green-500/10 text-green-600 border-green-200"
                              : "bg-muted text-muted-foreground border-border"
                          }`}>
                            {c.resposta_cliente ? (
                              <><CheckCircle className="w-3 h-3" /> Sim</>
                            ) : (
                              <><Clock className="w-3 h-3" /> Não</>
                            )}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <ObservacaoCell
                            value={c.observacao || ""}
                            onSave={(val) => c.disparo_id && handleUpdateObservacao(c.disparo_id, val)}
                          />
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

        <TabsContent value="relatorio">
          <RelatorioTab clientes={processadosAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
