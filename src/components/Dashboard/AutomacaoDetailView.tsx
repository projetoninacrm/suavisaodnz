import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { ArrowLeft, Send, XCircle, Clock, CheckCircle, AlertCircle, Loader2, Eye, Volume2, ChevronDown, ChevronUp, Download, BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataState } from "@/components/data/DataState";
import { DataTablePagination } from "@/components/data/DataTablePagination";
import { EntityDataTable } from "@/components/data/EntityDataTable";
import { FilterPanel } from "@/components/data/FilterPanel";
import { FilterField } from "@/components/data/FilterField";
import { SearchInput } from "@/components/data/SearchInput";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRouteState } from "@/hooks/useRouteState";
import { useInlineEditorFocus } from "@/hooks/useInlineEditorFocus";
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
import { getEmployeeAudioUrl } from "@/lib/employeeAudio";

const AUTOMATION_DETAIL_QUERY_TIMEOUT_MS = 30_000;
const AUTOMATION_DETAIL_QUERY_TIMEOUT_MESSAGE = "A consulta demorou mais de 30 segundos. Tente novamente.";

interface ClienteAgendado {
  id: string;
  nome: string;
  telefone: string;
  data_compra: string;
  data_envio_programada: string;
  dias_faltam: number;
  status: "pendente" | "agendado" | "enviado" | "erro" | "cancelado";
  vendedor?: string;
  disparo_id?: string;
  data_envio_real?: string;
  _data_envio_iso?: string;
  erro?: string;
  resposta_cliente?: boolean;
  observacao?: string;
}

type DispatchTableActionMeta = {
  actionsUnavailable: boolean;
  isBulkSending: boolean;
  sendingId: string | null;
  cancellingId: string | null;
  onSend: (client: ClienteAgendado, isRetry?: boolean) => Promise<void>;
  onCancel: (client: ClienteAgendado) => Promise<void>;
};

type PendingDispatchTableMeta = DispatchTableActionMeta & {
  source: Automacao["fonte"];
  referenceDateLabel: string;
  durationLabel: string;
};

type ProcessedDispatchTableMeta = DispatchTableActionMeta & {
  referenceDateLabel: string;
  onUpdateObservation: (dispatchId: string, value: string) => Promise<boolean>;
};

const pendingDispatchTableFeatures = tableFeatures({ tableMeta: {} as PendingDispatchTableMeta });
const pendingDispatchColumn = createColumnHelper<typeof pendingDispatchTableFeatures, ClienteAgendado>();
const processedDispatchTableFeatures = tableFeatures({ tableMeta: {} as ProcessedDispatchTableMeta });
const processedDispatchColumn = createColumnHelper<typeof processedDispatchTableFeatures, ClienteAgendado>();

const pendingDispatchColumns = pendingDispatchColumn.columns([
  pendingDispatchColumn.display({
    id: "cliente",
    header: "Cliente",
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.nome}</span>
        <span className="block text-xs text-muted-foreground">{row.original.telefone}</span>
      </div>
    ),
  }),
  pendingDispatchColumn.accessor("vendedor", {
    header: "Vendedor",
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() || "—"}</span>,
  }),
  pendingDispatchColumn.accessor("data_compra", {
    id: "data_referencia",
    header: ({ table }) => table.options.meta.referenceDateLabel,
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
  }),
  pendingDispatchColumn.accessor("data_envio_programada", {
    header: "Data do Envio",
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
  }),
  pendingDispatchColumn.accessor("dias_faltam", {
    header: ({ table }) => table.options.meta.durationLabel,
    cell: ({ getValue, table }) => {
      const daysRemaining = getValue();
      const isInactive = table.options.meta.source === "detalhado_inativos";
      return (
        <Badge
          variant={isInactive ? (daysRemaining <= 0 ? "destructive" : "info") : "warning"}
          className="gap-1"
        >
          <Clock className="w-3 h-3" />
          {isInactive
            ? daysRemaining <= 0
              ? `${Math.abs(daysRemaining)}d em atraso`
              : `${daysRemaining}d restantes`
            : daysRemaining === 0
              ? "Hoje"
              : `${daysRemaining}d`}
        </Badge>
      );
    },
  }),
  pendingDispatchColumn.display({
    id: "acoes",
    header: "Ações",
    cell: ({ row, table }) => {
      const client = row.original;
      const { actionsUnavailable, isBulkSending, sendingId, cancellingId, onSend, onCancel } = table.options.meta;
      const actionsLocked = actionsUnavailable || isBulkSending || sendingId !== null || cancellingId !== null;
      const isSending = sendingId === client.id;
      const isCancelling = cancellingId === client.id;
      return (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs h-7"
            disabled={actionsLocked}
            aria-busy={isSending}
            aria-label={isSending ? `Enviando para ${client.nome}` : `Enviar agora para ${client.nome}`}
            onClick={() => void onSend(client)}
          >
            {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {isSending ? "Enviando…" : "Enviar agora"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs h-7 text-muted-foreground hover:text-destructive"
                disabled={actionsLocked}
                aria-busy={isCancelling}
              >
                {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                Cancelar
              </Button>
            } />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar disparo</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja cancelar o disparo para {client.nome}? A mensagem não será enviada.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={actionsLocked}
                  onClick={() => void onCancel(client)}
                >
                  Cancelar disparo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  }),
]);

const processedDispatchColumns = processedDispatchColumn.columns([
  processedDispatchColumn.display({
    id: "cliente",
    header: "Cliente",
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.nome}</span>
        <span className="block text-xs text-muted-foreground">{row.original.telefone}</span>
      </div>
    ),
  }),
  processedDispatchColumn.accessor("vendedor", {
    header: "Vendedor",
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() || "—"}</span>,
  }),
  processedDispatchColumn.accessor("data_compra", {
    id: "data_referencia",
    header: ({ table }) => table.options.meta.referenceDateLabel,
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
  }),
  processedDispatchColumn.accessor("data_envio_real", {
    header: "Enviado em",
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() || "—"}</span>,
  }),
  processedDispatchColumn.accessor("status", {
    header: "Status",
    cell: ({ row }) => (
      <div className="flex flex-col items-center gap-1">
        <Badge variant={dispatchStatusVariant(row.original.status)} className="gap-1">
          {dispatchStatusIcon(row.original.status)} {row.original.status}
        </Badge>
        {row.original.erro && (
          <span className="text-[10px] text-muted-foreground max-w-[200px] truncate" title={describeDispatchError(row.original.erro)}>
            {describeDispatchError(row.original.erro)}
          </span>
        )}
      </div>
    ),
  }),
  processedDispatchColumn.accessor("resposta_cliente", {
    header: "Resposta",
    cell: ({ getValue }) => (
      <Badge variant={getValue() ? "success" : "secondary"} className="gap-1">
        {getValue() ? <><CheckCircle className="w-3 h-3" /> Sim</> : <><Clock className="w-3 h-3" /> Não</>}
      </Badge>
    ),
  }),
  processedDispatchColumn.accessor("observacao", {
    header: () => (
      <span className="inline-flex items-center gap-2">
        Observação
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px] leading-4">IA</Badge>
      </span>
    ),
    cell: ({ row, getValue, table }) => (
      <ObservacaoCell
        value={getValue() || ""}
        customerName={row.original.nome}
        onSave={(value) => row.original.disparo_id
          ? table.options.meta.onUpdateObservation(row.original.disparo_id, value)
          : Promise.resolve(false)}
      />
    ),
  }),
  processedDispatchColumn.display({
    id: "acoes",
    header: "Ações",
    cell: ({ row, table }) => {
      const client = row.original;
      const { actionsUnavailable, isBulkSending, sendingId, cancellingId, onSend } = table.options.meta;
      const isSending = sendingId === client.id;
      return (
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs h-7"
          disabled={actionsUnavailable || isBulkSending || sendingId !== null || cancellingId !== null}
          aria-busy={isSending}
          aria-label={isSending ? `Reenviando para ${client.nome}` : `Reenviar para ${client.nome}`}
          onClick={() => void onSend(client, true)}
        >
          {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {isSending ? "Reenviando…" : "Reenviar"}
        </Button>
      );
    },
  }),
]);

interface AutomacaoDetailViewProps {
  automacao: Automacao;
  onBack: () => void;
}

type AutomationDetailTab = "pendentes" | "enviados" | "relatorio";
type AutomationResponseFilter = "todos" | "sim" | "nao";

interface AutomationDetailViewState {
  searchQuery: string;
  respostaFilter: AutomationResponseFilter;
  activeTab: AutomationDetailTab;
  pendingPage: number;
  sentPage: number;
  pageSize: number;
}

function defaultAutomationDetailViewState(): AutomationDetailViewState {
  return { searchQuery: "", respostaFilter: "todos", activeTab: "pendentes", pendingPage: 1, sentPage: 1, pageSize: 25 };
}

function parseAutomationDetailViewState(value: unknown): AutomationDetailViewState {
  if (typeof value !== "object" || value === null) return defaultAutomationDetailViewState();
  const searchQuery = "searchQuery" in value && typeof value.searchQuery === "string" ? value.searchQuery : "";
  const respostaFilter = "respostaFilter" in value && (value.respostaFilter === "sim" || value.respostaFilter === "nao")
    ? value.respostaFilter
    : "todos";
  const activeTab = "activeTab" in value && (value.activeTab === "enviados" || value.activeTab === "relatorio")
    ? value.activeTab
    : "pendentes";
  const pendingPage = "pendingPage" in value && Number.isInteger(value.pendingPage) && Number(value.pendingPage) > 0
    ? Number(value.pendingPage)
    : 1;
  const sentPage = "sentPage" in value && Number.isInteger(value.sentPage) && Number(value.sentPage) > 0
    ? Number(value.sentPage)
    : 1;
  const pageSize = "pageSize" in value && [25, 50, 100].includes(Number(value.pageSize))
    ? Number(value.pageSize)
    : 25;
  return { searchQuery, respostaFilter, activeTab, pendingPage, sentPage, pageSize };
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

function normalizeDispatchStatus(status: string): ClienteAgendado["status"] {
  switch (status) {
    case "pendente":
    case "agendado":
    case "enviado":
    case "erro":
    case "cancelado":
      return status;
    default:
      return "erro";
  }
}

function describeWhatsAppSendFailure(error: unknown, resultError?: string | null): string | null {
  if (!error && !resultError) return null;
  if (!error && resultError === "Telefone inválido") {
    return "O número de telefone parece inválido. Confira o cadastro do cliente.";
  }
  return error
    ? "Não foi possível confirmar o envio da mensagem. Confira o histórico antes de tentar novamente."
    : "Não foi possível enviar a mensagem. Confira o histórico antes de tentar novamente.";
}

function describeDispatchError(error: string): string {
  const normalized = error.trim().toLocaleLowerCase("pt-BR");
  if (normalized === "telefone inválido") return "O número de telefone parece inválido. Confira o cadastro do cliente.";
  if (normalized === "cancelado manualmente") return "Disparo cancelado manualmente.";
  if (normalized === "mensagem enviada, mas o áudio falhou") return "Mensagem enviada, mas o áudio falhou.";
  if (normalized === "automação não encontrada") return "Regra indisponível. Atualize a lista de automações.";
  if (normalized === "uazapi não configurada") return "WhatsApp indisponível. Avise a pessoa administradora da plataforma.";
  if (normalized.startsWith("limite diário")) return "Limite diário de envios atingido.";
  return "Falha no envio. Confira o histórico antes de tentar novamente.";
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

function ObservacaoCell({
  value,
  customerName,
  onSave,
}: {
  value: string;
  customerName: string;
  onSave: (val: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [text, setText] = useState(value);
  const { triggerRef, restoreFocusOnClose, clearPendingFocusRestore } = useInlineEditorFocus(editing);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelEditRef = useRef(false);
  const saveInFlightRef = useRef(false);

  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const handleSave = async () => {
    if (saveInFlightRef.current) return;
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      return;
    }
    if (text === value) {
      setEditing(false);
      return;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    try {
      const saved = await onSave(text);
      if (saved) {
        setEditing(false);
      } else {
        clearPendingFocusRestore();
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  if (!editing) {
    return (
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        type="button"
        className="h-auto min-h-[24px] w-full min-w-0 max-w-full justify-start whitespace-pre-wrap break-words rounded px-1 py-0.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        onClick={() => setEditing(true)}
        aria-label={`${value ? "Editar observação" : "Adicionar observação"} de ${customerName}`}
      >
        {value || <span className="italic text-muted-foreground">Clique para adicionar...</span>}
      </Button>
    );
  }

  return (
    <div className="min-w-0 space-y-1">
      <Input
        ref={inputRef}
        aria-label={isSaving ? `Salvando observação de ${customerName}` : `Observação de ${customerName}`}
        aria-busy={isSaving}
        className="h-9 w-full px-2 py-1 text-sm"
        value={text}
        disabled={isSaving}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { void handleSave(); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            restoreFocusOnClose();
            inputRef.current?.blur();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            restoreFocusOnClose();
            cancelEditRef.current = true;
            setText(value);
            inputRef.current?.blur();
            setEditing(false);
          }
        }}
      />
      {isSaving && (
        <span role="status" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-3 animate-spin" />
          Salvando observação de {customerName}…
        </span>
      )}
    </div>
  );
}

function dispatchStatusIcon(status: string) {
  switch (status) {
    case "enviado": return <CheckCircle className="size-3.5 text-success-foreground" aria-hidden="true" />;
    case "erro": return <AlertCircle className="size-3.5 text-destructive" aria-hidden="true" />;
    case "cancelado": return <XCircle className="size-3.5 text-muted-foreground" aria-hidden="true" />;
    default: return <Clock className="size-3.5 text-warning-foreground" aria-hidden="true" />;
  }
}

function dispatchStatusVariant(status: string): NonNullable<BadgeProps["variant"]> {
  switch (status) {
    case "enviado": return "success";
    case "erro": return "destructive";
    case "cancelado": return "secondary";
    default: return "warning";
  }
}

function PendingDispatchCard({ automacao, client, disabled, isSending, isCancelling, onSend, onCancel }: {
  automacao: Automacao;
  client: ClienteAgendado;
  disabled: boolean;
  isSending: boolean;
  isCancelling: boolean;
  onSend: () => void;
  onCancel: () => void;
}) {
  const isInactiveAttendanceSource = automacao.fonte === "detalhado_inativos";
  const daysLabel = isInactiveAttendanceSource
    ? client.dias_faltam <= 0 ? `${Math.abs(client.dias_faltam)}d em atraso` : `${client.dias_faltam}d restantes`
    : client.dias_faltam === 0 ? "Hoje" : `${client.dias_faltam}d`;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words font-semibold">{client.nome}</p>
            <p className="mt-0.5 break-all text-xs text-muted-foreground">{client.telefone}</p>
          </div>
          <Badge variant={isInactiveAttendanceSource ? client.dias_faltam <= 0 ? "destructive" : "info" : "warning"} className="shrink-0 gap-1">
            <Clock className="size-3" aria-hidden="true" />{daysLabel}
          </Badge>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">Vendedor</dt><dd className="mt-0.5">{client.vendedor || "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{isInactiveAttendanceSource ? "Último atendimento" : automacao.fonte === "perdidos" ? "Marcado como perdido" : "Data da compra"}</dt><dd className="mt-0.5">{client.data_compra}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-muted-foreground">Data do envio</dt><dd className="mt-0.5">{client.data_envio_programada}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" disabled={disabled} aria-busy={isSending} aria-label={isSending ? `Enviando para ${client.nome}` : `Enviar agora para ${client.nome}`} onClick={onSend}>
            {isSending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
            {isSending ? "Enviando…" : "Enviar agora"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive" disabled={disabled} aria-busy={isCancelling}>{isCancelling ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}Cancelar</Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar disparo</AlertDialogTitle>
                <AlertDialogDescription>Tem certeza que deseja cancelar o disparo para {client.nome}? A mensagem não será enviada.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={disabled} onClick={onCancel}>Cancelar disparo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function SentDispatchCard({ automacao, client, disabled, isSending, onResend, onUpdateObservation }: {
  automacao: Automacao;
  client: ClienteAgendado;
  disabled: boolean;
  isSending: boolean;
  onResend: () => void;
  onUpdateObservation: (value: string) => Promise<boolean>;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words font-semibold">{client.nome}</p>
            <p className="mt-0.5 break-all text-xs text-muted-foreground">{client.telefone}</p>
          </div>
          <Badge variant={dispatchStatusVariant(client.status)} className="shrink-0 gap-1">{dispatchStatusIcon(client.status)}{client.status}</Badge>
        </div>
        {client.erro && <p className="rounded-md bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">{client.erro}</p>}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">Vendedor</dt><dd className="mt-0.5">{client.vendedor || "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{automacao.fonte === "perdidos" ? "Marcado como perdido" : automacao.fonte === "detalhado_inativos" ? "Último atendimento" : "Data da compra"}</dt><dd className="mt-0.5">{client.data_compra}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Enviado em</dt><dd className="mt-0.5">{client.data_envio_real || "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Resposta do cliente</dt><dd className="mt-0.5"><Badge variant={client.resposta_cliente ? "success" : "secondary"} className="gap-1">{client.resposta_cliente ? <CheckCircle className="size-3" aria-hidden="true" /> : <Clock className="size-3" aria-hidden="true" />}{client.resposta_cliente ? "Sim" : "Não"}</Badge></dd></div>
        </dl>
        <div className="space-y-1 border-t border-border pt-3">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Observação <Badge variant="secondary" className="px-1.5 py-0 text-[10px] leading-4">IA</Badge></p>
          <ObservacaoCell value={client.observacao || ""} customerName={client.nome} onSave={onUpdateObservation} />
        </div>
        <Button variant="outline" size="sm" className="w-full gap-1.5" disabled={disabled} aria-busy={isSending} aria-label={isSending ? `Reenviando para ${client.nome}` : `Reenviar para ${client.nome}`} onClick={onResend}>
          {isSending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
          {isSending ? "Reenviando…" : "Reenviar"}
        </Button>
      </CardContent>
    </Card>
  );
}

function extractMainReason(obs: string): string {
  const text = obs.toLowerCase().trim();
  const keywords: [string[], string][] = [
    [["preço", "preco", "caro", "valor", "barato", "custo", "orçamento", "orcamento", "dinheiro", "pagar"], "Preço"],
    [["distância", "distancia", "longe", "localização", "localizacao", "perto"], "Distância"],
    [["concorrência", "concorrencia", "outra ótica", "outra otica", "outro lugar", "já tem", "ja tem", "costume", "sempre foi"], "Já tem outra ótica"],
    [["tempo", "agenda", "horário", "horario", "ocupado", "sem tempo", "disponibilidade"], "Sem tempo/agenda"],
    [["não precisa", "nao precisa", "não quer", "nao quer", "desistiu", "não quis", "nao quis", "não quero", "nao quero"], "Não quis"],
    [["mudou", "cidade", "viajou", "mudança", "mudanca"], "Mudou de cidade"],
    [["convênio", "convenio", "plano", "sus"], "Usa convênio/plano"],
    [["não respondeu", "nao respondeu", "sem resposta", "não atende", "nao atende", "ignorou"], "Não respondeu"],
    [["já comprou", "ja comprou", "já fez", "ja fez", "já realizou", "ja realizou"], "Já comprou em outro lugar"],
    [["prazo", "parcela", "condição", "condicao", "pagamento"], "Condição de pagamento"],
  ];

  for (const [terms, label] of keywords) {
    if (terms.some(t => text.includes(t))) return label;
  }

  // Fallback: capitalize first ~30 chars
  const short = obs.length > 30 ? obs.substring(0, 30).trim() + "…" : obs;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

function RelatorioTab({ clientes }: { clientes: ClienteAgendado[] }) {
  const chartData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of clientes) {
      const obs = (c.observacao || "").trim();
      if (!obs) continue;
      const key = extractMainReason(obs);
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
      <DataState
        variant="empty"
        title="Nenhuma observação para agrupar"
        description="Este relatório agrupa observações por palavras-chave. Quando houver observações salvas nos envios, os motivos aparecerão aqui."
        className="my-4"
      />
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
      <p className="text-xs text-muted-foreground">
        Agrupamento automático por palavras encontradas nas observações; confira o texto original para validar o contexto.
      </p>

      <div className="space-y-2.5">
        {chartData.map((item) => {
          const pct = maxVal > 0 ? (item.quantidade / maxVal) * 100 : 0;
          const pctTotal = totalObs > 0 ? ((item.quantidade / totalObs) * 100).toFixed(0) : "0";
          return (
            <div key={item.motivo} className="group">
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
              <div aria-hidden="true" className="h-7 w-full overflow-hidden rounded-md bg-muted/50">
                <div
                  className="h-full rounded-md bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(pct, 3)}%` }}
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [viewState, setViewState] = useRouteState<AutomationDetailViewState>(
    `automationDetail:${automacao.id}`,
    defaultAutomationDetailViewState,
    parseAutomationDetailViewState,
  );
  const { searchQuery, respostaFilter, activeTab, pendingPage, sentPage, pageSize } = viewState;
  const setSearchQuery = (searchQuery: string) => setViewState((current) => ({ ...current, searchQuery, pendingPage: 1, sentPage: 1 }));
  const setRespostaFilter = (respostaFilter: AutomationResponseFilter) => setViewState((current) => ({ ...current, respostaFilter, sentPage: 1 }));
  const setActiveTab = (activeTab: AutomationDetailTab) => setViewState((current) => ({ ...current, activeTab }));
  const setPendingPage = (pendingPage: number) => setViewState((current) => ({ ...current, pendingPage }));
  const setSentPage = (sentPage: number) => setViewState((current) => ({ ...current, sentPage }));
  const setPageSize = (pageSize: number) => setViewState((current) => ({ ...current, pageSize, pendingPage: 1, sentPage: 1 }));
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, errors: 0, total: 0 });
  const actionInProgressRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const loadControllerRef = useRef<AbortController | null>(null);
  const actionsUnavailable = isLoading || loadError !== null;

  const fetchData = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, AUTOMATION_DETAIL_QUERY_TIMEOUT_MS);
    setIsLoading(true);
    setLoadError(null);

    try {
      const { data: disparosExistentes, error: disparosError } = await supabase
        .from("automacao_disparos")
        .select("*")
        .eq("automacao_id", automacao.id)
        .abortSignal(controller.signal);
      if (disparosError) throw disparosError;

      const disparosMap = new Map<string, AutomacaoDisparo>();
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

        const { data, error } = await query.abortSignal(controller.signal);
        if (error) throw error;
        rawClients = (data || []).map(d => ({
          id: d.id,
          nome: d.nome || "Sem nome",
          telefone: d.telefone || "",
          data_registro: d.data || "",
          vendedor: undefined,
          medico: undefined,
        }));
      } else if (automacao.fonte === "detalhado_inativos") {
        const { data, error } = await supabase.rpc("get_inactive_patients", {
          dias_limite: automacao.dias_apos_venda,
          dias_janela: 30,
        }).abortSignal(controller.signal);
        if (error) throw error;
        rawClients = (data || []).map(d => ({
          id: d.id,
          nome: d.nome || "Sem nome",
          telefone: d.telefone || "",
          data_registro: d.ultimo_atendimento || "",
          vendedor: undefined,
          medico: undefined,
        }));
      } else if (automacao.fonte === "perdidos") {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .eq("status", "Perdido")
          .not("numero", "is", null)
          .abortSignal(controller.signal);
        if (error) throw error;
        rawClients = (data || []).map(l => ({
          id: l.id,
          nome: l.nome || "Sem nome",
          telefone: l.numero || "",
          data_registro: l.updated_at ? new Date(l.updated_at).toLocaleDateString("pt-BR") : "",
          vendedor: l.vendedor || undefined,
          medico: l.medico || undefined,
        }));
      } else {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .eq("venda", "Sim")
          .not("numero", "is", null)
          .abortSignal(controller.signal);
        if (error) throw error;
        rawClients = (data || []).map(l => ({
          id: l.id,
          nome: l.nome || "Sem nome",
          telefone: l.numero || "",
          data_registro: l.data_registro || "",
          vendedor: l.vendedor || undefined,
          medico: l.medico || undefined,
        }));
      }

      if (requestId !== loadRequestIdRef.current) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const result: ClienteAgendado[] = [];

      for (const client of rawClients) {
        const dataVenda = parseDate(client.data_registro);
        if (!dataVenda) continue;

        const targetDate = new Date(dataVenda);
        targetDate.setDate(targetDate.getDate() + automacao.dias_apos_venda);
        const diasFaltam = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
            status: normalizeDispatchStatus(disparo.status),
            vendedor: client.vendedor,
            disparo_id: disparo.id,
            data_envio_real: disparo.data_envio ? new Date(disparo.data_envio).toLocaleString("pt-BR") : undefined,
            _data_envio_iso: disparo.data_envio || undefined,
            erro: disparo.erro || undefined,
            resposta_cliente: disparo.resposta_cliente || false,
            observacao: disparo.observacao || undefined,
          });
        } else if (automacao.fonte === "detalhado_inativos") {
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

      result.sort((a, b) => {
        const isPendingA = a.status === "pendente" || a.status === "agendado";
        const isPendingB = b.status === "pendente" || b.status === "agendado";
        if (isPendingA && !isPendingB) return -1;
        if (!isPendingA && isPendingB) return 1;
        if (isPendingA && isPendingB) return a.dias_faltam - b.dias_faltam;
        const dateA = a._data_envio_iso ? new Date(a._data_envio_iso).getTime() : 0;
        const dateB = b._data_envio_iso ? new Date(b._data_envio_iso).getTime() : 0;
        return dateB - dateA;
      });

      if (requestId === loadRequestIdRef.current) setClientes(result);
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) return;
      const failureMessage = timedOut ? AUTOMATION_DETAIL_QUERY_TIMEOUT_MESSAGE : "Não foi possível atualizar os dados desta automação.";
      setLoadError(failureMessage);
      toast({ title: "Erro ao carregar automação", description: failureMessage, variant: "destructive" });
    } finally {
      window.clearTimeout(timeout);
      if (requestId === loadRequestIdRef.current) {
        loadControllerRef.current = null;
        setIsLoading(false);
      }
    }
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
    void fetchData();
    return () => {
      loadRequestIdRef.current += 1;
      loadControllerRef.current?.abort();
      loadControllerRef.current = null;
    };
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
          const updated = payload.new as AutomacaoDisparo;
          setClientes((prev) =>
            prev.map((c) =>
              c.disparo_id === updated.id
                ? {
                    ...c,
                    resposta_cliente: updated.resposta_cliente,
                    status: normalizeDispatchStatus(updated.status),
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
    if (actionsUnavailable || actionInProgressRef.current) return;

    actionInProgressRef.current = true;
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
      const textError = describeWhatsAppSendFailure(error, sendResult?.erro);

      let audioOk = true;
      const audioUrl = getEmployeeAudioUrl(automacao.audios_vendedor, cliente.vendedor)
        || getEmployeeAudioUrl(automacao.audios_vendedor, "Thayssa")
        || automacao.audio_url;
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
        title: status === "enviado" ? "Mensagem enviada!" : "Não foi possível confirmar o envio",
        description: erroMensagem || undefined,
        variant: status === "erro" ? "destructive" : "default",
      });

      await fetchData();
    } catch (err) {
      console.error("Could not confirm automation message send:", err);
      void fetchData();
      toast({
        title: "Não foi possível confirmar o envio",
        description: "O histórico será atualizado. Confira o resultado antes de tentar novamente.",
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
      actionInProgressRef.current = false;
    }
  };

  const handleCancelar = async (cliente: ClienteAgendado) => {
    if (actionsUnavailable || actionInProgressRef.current) return;
    actionInProgressRef.current = true;
    setCancellingId(cliente.id);
    try {
      const { error } = await supabase.from("automacao_disparos").insert({
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
      if (error) throw new Error(error.message);

      toast({ title: "Disparo cancelado" });
      await fetchData();
    } catch (error) {
      console.error("Could not confirm automation cancellation:", error);
      void fetchData();
      toast({
        title: "Não foi possível confirmar o cancelamento",
        description: "A lista será atualizada. Confira o estado do disparo antes de tentar novamente.",
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
      actionInProgressRef.current = false;
    }
  };

  const pendentesEmAtraso = useMemo(() => {
    return clientes.filter(c => (c.status === "pendente" || c.status === "agendado") && c.dias_faltam <= 0);
  }, [clientes]);

  const handleUpdateObservacao = async (disparoId: string, value: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("automacao_disparos")
        .update({ observacao: value || null })
        .eq("id", disparoId);
      if (error) {
        toast({
          title: "Não foi possível confirmar a observação",
          description: "O rascunho foi mantido. Confira o valor salvo antes de repetir.",
          variant: "destructive",
        });
        return false;
      }

      setClientes((prev) =>
        prev.map((c) =>
          c.disparo_id === disparoId ? { ...c, observacao: value || undefined } : c
        )
      );
      return true;
    } catch (error) {
      console.error("Could not confirm automation observation update:", error);
      toast({
        title: "Não foi possível confirmar a observação",
        description: "O rascunho foi mantido. Confira o valor salvo antes de repetir.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleEnviarTodosEmAtraso = async () => {
    if (actionsUnavailable) return;
    const emAtraso = pendentesEmAtraso;
    if (emAtraso.length === 0) {
      toast({ title: "Nenhum cliente em atraso para enviar" });
      return;
    }
    if (actionInProgressRef.current) return;

    actionInProgressRef.current = true;
    try {
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
          if (ensureLeadError) throw ensureLeadError;
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
        const textError = describeWhatsAppSendFailure(error, sendResult?.erro);

        let audioOk = true;
        const audioUrl = getEmployeeAudioUrl(automacao.audios_vendedor, cliente.vendedor)
          || getEmployeeAudioUrl(automacao.audios_vendedor, "Thayssa")
          || automacao.audio_url;
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

        const { error: historyError } = await supabase.from("automacao_disparos").insert({
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
        if (historyError) throw historyError;

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
      const { error: totalError } = await supabase
        .from("automacoes")
        .update({ total_envios: automacao.total_envios + sent })
        .eq("id", automacao.id);
      if (totalError) throw totalError;
    }

    toast({
      title: `Envio em massa concluído`,
      description: `${sent} enviado(s), ${errors} erro(s) de ${emAtraso.length} total.`,
    });
    await fetchData();
    } catch (error) {
      console.error("Could not confirm bulk automation send:", error);
      void fetchData();
      toast({
        title: "Não foi possível confirmar o envio em massa",
        description: "O histórico será atualizado. Confira os resultados antes de iniciar outro envio.",
        variant: "destructive",
      });
    } finally {
      setIsBulkSending(false);
      actionInProgressRef.current = false;
    }
  };

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("pt-BR");
  const hasSearch = normalizedSearchQuery.length > 0;
  const hasSearchInput = searchQuery.length > 0;
  const filterBySearch = (list: ClienteAgendado[]) => {
    if (!hasSearch) return list;
    return list.filter(c => c.nome.toLocaleLowerCase("pt-BR").includes(normalizedSearchQuery) || c.telefone.includes(normalizedSearchQuery));
  };

  const pendentesSemBusca = clientes.filter(c => c.status === "pendente");
  const processadosSemBusca = clientes.filter(c => c.status !== "pendente");
  const pendentes = filterBySearch(pendentesSemBusca);
  const processadosAll = filterBySearch(processadosSemBusca);
  const processados = respostaFilter === "todos" 
    ? processadosAll 
    : respostaFilter === "sim" 
      ? processadosAll.filter(c => c.resposta_cliente === true) 
      : processadosAll.filter(c => !c.resposta_cliente);
  const pendingPageCount = Math.max(1, Math.ceil(pendentes.length / pageSize));
  const sentPageCount = Math.max(1, Math.ceil(processados.length / pageSize));
  const currentPendingPage = Math.min(pendingPage, pendingPageCount);
  const currentSentPage = Math.min(sentPage, sentPageCount);
  const visiblePendentes = pendentes.slice((currentPendingPage - 1) * pageSize, currentPendingPage * pageSize);
  const visibleProcessados = processados.slice((currentSentPage - 1) * pageSize, currentSentPage * pageSize);
  const referenceDateLabel = automacao.fonte === "perdidos"
    ? "Marcado como Perdido"
    : automacao.fonte === "detalhado_inativos"
      ? "Último Atendimento"
      : "Data da Compra";
  const pendingDispatchTable = useTable({
    features: pendingDispatchTableFeatures,
    columns: pendingDispatchColumns,
    data: visiblePendentes,
    getRowId: (client) => client.id,
    meta: {
      source: automacao.fonte,
      referenceDateLabel,
      durationLabel: automacao.fonte === "detalhado_inativos" ? "Tempo" : "Dias Restantes",
      actionsUnavailable,
      isBulkSending,
      sendingId,
      cancellingId,
      onSend: handleEnviarAgora,
      onCancel: handleCancelar,
    },
  });
  const processedDispatchTable = useTable({
    features: processedDispatchTableFeatures,
    columns: processedDispatchColumns,
    data: visibleProcessados,
    getRowId: (client) => `${client.id}-${client.disparo_id || "sem-disparo"}`,
    meta: {
      referenceDateLabel,
      actionsUnavailable,
      isBulkSending,
      sendingId,
      cancellingId,
      onSend: handleEnviarAgora,
      onCancel: handleCancelar,
      onUpdateObservation: handleUpdateObservacao,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-lg">{automacao.nome}</h3>
          <p className="text-sm text-muted-foreground">
            {automacao.fonte === "detalhado"
              ? "Atendimentos"
              : automacao.fonte === "detalhado_inativos"
                ? "Atendimentos · Último atendimento"
                : automacao.fonte === "perdidos"
                  ? "Perdidos"
                  : "Leads"} · {automacao.dias_apos_venda} dias após {automacao.fonte === "perdidos"
              ? "marcado como perdido"
              : automacao.fonte === "detalhado_inativos"
                ? "o último atendimento"
                : "venda"}
          </p>
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto sm:shrink-0 sm:flex-nowrap">
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
      </div>

      {loadError && (
        <DataState
          variant="error"
          title={clientes.length ? "Dados desatualizados" : "Dados da automação indisponíveis"}
          description={clientes.length ? `A consulta mais recente falhou. ${loadError} Os dados carregados anteriormente continuam visíveis.` : loadError}
          action={{ label: "Tentar novamente", onClick: () => void fetchData() }}
        />
      )}
      {isLoading && clientes.length > 0 && (
        <DataState variant="refreshing" title="Atualizando a fila" description="Ações temporariamente indisponíveis." />
      )}

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

      <FilterPanel
        hasActiveFilters={hasSearchInput || (activeTab === "enviados" && respostaFilter !== "todos")}
        onClear={() => { setSearchQuery(""); setRespostaFilter("todos"); }}
      >
        <FilterField id="automation-client-search" label="Pesquisar clientes da automação" className="max-w-2xl">
          <SearchInput
            id="automation-client-search"
            placeholder="Nome ou telefone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </FilterField>
      </FilterPanel>

      <Tabs value={activeTab} onValueChange={(value) => {
        if (value === "pendentes" || value === "enviados" || value === "relatorio") setActiveTab(value);
      }} className="w-full">
        <TabsList aria-label="Visões da automação" className="max-w-full justify-start">
          <TabsTrigger value="pendentes" className="gap-1 px-2">
            <Clock className="w-4 h-4" /> Pendentes
          </TabsTrigger>
          <TabsTrigger value="enviados" className="gap-1 px-2">
            <Send className="w-4 h-4" /> Enviados
          </TabsTrigger>
          <TabsTrigger value="relatorio" className="gap-1 px-2">
            <BarChart3 className="w-4 h-4" /> Relatório
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          {isLoading && clientes.length === 0 ? (
            <DataState variant="loading" title="Carregando disparos pendentes" description="Consultando a fila desta automação." className="my-4" />
          ) : pendentes.length === 0 ? (
            <DataState
              variant="empty"
              title={pendentesSemBusca.length > 0 && hasSearch ? "Nenhum cliente encontrado" : "Nenhum disparo pendente"}
              description={pendentesSemBusca.length > 0 && hasSearch
                ? "Nenhum cliente pendente corresponde ao nome ou telefone pesquisado."
                : "Nenhum cliente aguarda envio nesta automação."}
              action={pendentesSemBusca.length > 0 && hasSearch ? { label: "Limpar busca", onClick: () => setSearchQuery("") } : undefined}
              className="my-4"
            />
          ) : (
            <div>
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Pendentes ({pendentes.length})
                </h4>
                {pendentesEmAtraso.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger render={
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1.5"
                        disabled={actionsUnavailable || isBulkSending || sendingId !== null || cancellingId !== null}
                        aria-busy={isBulkSending}
                        aria-label={isBulkSending
                          ? `Envio em massa em andamento: ${bulkProgress.sent + bulkProgress.errors} de ${bulkProgress.total} clientes`
                          : `Enviar todos os ${pendentesEmAtraso.length} clientes em atraso`}
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
                    } />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Enviar para todos em atraso</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja enviar a mensagem para {pendentesEmAtraso.length} cliente(s) em atraso? O envio será feito um a um com intervalo de 2 segundos entre cada.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleEnviarTodosEmAtraso}
                          disabled={actionsUnavailable || isBulkSending || sendingId !== null || cancellingId !== null}
                        >
                          Confirmar envio em massa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <ul className="grid grid-cols-1 gap-3 md:hidden" aria-label="Clientes com envio pendente" aria-busy={isLoading}>
                {visiblePendentes.map((client) => (
                  <li key={client.id} className="min-w-0">
                    <PendingDispatchCard
                      automacao={automacao}
                      client={client}
                      disabled={actionsUnavailable || isBulkSending || sendingId !== null || cancellingId !== null}
                      isSending={sendingId === client.id}
                      isCancelling={cancellingId === client.id}
                      onSend={() => handleEnviarAgora(client)}
                      onCancel={() => handleCancelar(client)}
                    />
                  </li>
                ))}
              </ul>
              <EntityDataTable table={pendingDispatchTable} label="Clientes com envio pendente" busy={isLoading} className="hidden rounded-lg border border-border bg-card md:block" tableClassName="min-w-[850px]" />
              <DataTablePagination
                total={pendentes.length}
                page={currentPendingPage}
                pageSize={pageSize}
                onPageChange={setPendingPage}
                onPageSizeChange={setPageSize}
                label="pendentes"
                className="mt-3"
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="enviados">
          {isLoading && clientes.length === 0 ? (
            <DataState variant="loading" title="Carregando envios" description="Consultando o histórico desta automação." className="my-4" />
          ) : processados.length === 0 ? (
            <DataState
              variant="empty"
              title={processadosAll.length > 0
                ? "Nenhum envio corresponde a este filtro"
                : processadosSemBusca.length > 0 && hasSearch
                  ? "Nenhum envio encontrado"
                  : "Nenhum disparo enviado ainda"}
              description={processadosAll.length > 0
                ? "Altere a resposta selecionada para consultar outros envios."
                : processadosSemBusca.length > 0 && hasSearch
                  ? "Nenhum envio corresponde ao nome ou telefone pesquisado."
                  : "Os envios concluídos aparecerão nesta lista."}
              action={processadosAll.length > 0 && respostaFilter !== "todos"
                ? { label: "Mostrar todos", onClick: () => setRespostaFilter("todos") }
                : processadosSemBusca.length > 0 && hasSearch
                  ? { label: "Limpar busca", onClick: () => setSearchQuery("") }
                  : undefined}
              className="my-4"
            />
          ) : (
            <div>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Enviados ({processados.length}{respostaFilter !== "todos" ? ` de ${processadosAll.length}` : ""})
                </h4>
                <div role="group" aria-label="Filtrar envios pela resposta do cliente" className="flex flex-wrap items-center gap-1">
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
                      aria-pressed={respostaFilter === key}
                      onClick={() => setRespostaFilter(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <ul className="grid grid-cols-1 gap-3 md:hidden" aria-label="Histórico de envios da automação" aria-busy={isLoading}>
                {visibleProcessados.map((client) => (
                  <li key={`${client.id}-${client.disparo_id}`} className="min-w-0">
                    <SentDispatchCard
                      automacao={automacao}
                      client={client}
                      disabled={actionsUnavailable || isBulkSending || sendingId !== null || cancellingId !== null}
                      isSending={sendingId === client.id}
                      onResend={() => handleEnviarAgora(client, true)}
                      onUpdateObservation={(value) => client.disparo_id ? handleUpdateObservacao(client.disparo_id, value) : Promise.resolve(false)}
                    />
                  </li>
                ))}
              </ul>
              <EntityDataTable table={processedDispatchTable} label="Histórico de envios da automação" busy={isLoading} className="hidden rounded-lg border border-border bg-card md:block" tableClassName="min-w-[1180px]" getHeaderClassName={(columnId) => columnId === "observacao" ? "min-w-[200px]" : undefined} />
              <DataTablePagination
                total={processados.length}
                page={currentSentPage}
                pageSize={pageSize}
                onPageChange={setSentPage}
                onPageSizeChange={setPageSize}
                label="envios"
                className="mt-3"
              />
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
