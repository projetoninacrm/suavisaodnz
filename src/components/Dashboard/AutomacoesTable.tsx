import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pause, Play, Pencil, Trash2, Send, Clock, Filter, UserX, Upload, Volume2, X, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataState } from "@/components/data/DataState";
import { EntityDataTable } from "@/components/data/EntityDataTable";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAutomacoes, type Automacao, type NewAutomacaoData } from "@/hooks/useAutomacoes";
import { useCategories, type CategoryCatalogItem } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { AutomacaoDetailView } from "./AutomacaoDetailView";

const AUTOMATION_ORIGIN_TIMEOUT_MS = 30_000;
const AUTOMATION_ORIGIN_TIMEOUT_MESSAGE = "A consulta de origens demorou mais de 30 segundos. Tente novamente.";
type AutomationTableMeta = {
  formatLastSend: (automationId: string) => string;
  renderActions: (automation: Automacao) => ReactNode;
};
const automationTableFeatures = tableFeatures({ tableMeta: {} as AutomationTableMeta });
const automationColumn = createColumnHelper<typeof automationTableFeatures, Automacao>();

const createEmptyAutomationForm = (): NewAutomacaoData => ({
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

function formatAutomationDays(days: number) {
  if (days < 30) return `${days} ${days === 1 ? "dia" : "dias"}`;
  const months = Math.round(days / 30);
  if (days < 365) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.round(days / 365);
  return `${years} ${years === 1 ? "ano" : "anos"}`;
}

function formatAutomationSource(source: Automacao["fonte"]) {
  if (source === "detalhado") return "Atendimentos";
  if (source === "detalhado_inativos") return "Atendimentos inativos";
  if (source === "perdidos") return "Perdidos";
  return "Leads";
}

function hasConfiguredAudio(automacao: Automacao) {
  return Boolean(automacao.audio_url || (automacao.audios_vendedor && Object.keys(automacao.audios_vendedor).length > 0));
}

const automationColumns = automationColumn.columns([
  automationColumn.accessor("nome", {
    header: "Nome",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <Link to={`/automacoes/${encodeURIComponent(row.original.id)}`} className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
          {row.original.nome}
        </Link>
        {hasConfiguredAudio(row.original) && <Volume2 className="size-3.5 text-muted-foreground" aria-label="Áudio configurado" />}
      </div>
    ),
  }),
  automationColumn.accessor("fonte", {
    header: "Fonte",
    cell: ({ getValue }) => <Badge variant="outline" className="text-xs">{formatAutomationSource(getValue())}</Badge>,
  }),
  automationColumn.accessor("dias_apos_venda", {
    header: "Prazo",
    cell: ({ getValue }) => <Badge variant="outline" className="gap-1"><Clock className="size-3" aria-hidden="true" />{formatAutomationDays(getValue())}</Badge>,
  }),
  automationColumn.accessor("mensagem", {
    header: "Mensagem",
    cell: ({ getValue }) => getValue(),
  }),
  automationColumn.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => <Badge variant={getValue() === "Ativa" ? "success" : "secondary"}>{getValue()}</Badge>,
  }),
  automationColumn.accessor("total_envios", {
    header: "Envios",
    cell: ({ getValue }) => <Badge variant="outline" className="gap-1"><Send className="size-3" aria-hidden="true" />{getValue()}</Badge>,
  }),
  automationColumn.display({
    id: "ultimo_envio",
    header: "Último envio",
    cell: ({ row, table }) => {
      const latest = table.options.meta.formatLastSend(row.original.id);
      return <span aria-label={`Último envio de ${row.original.nome}: ${latest}`}>{latest}</span>;
    },
  }),
  automationColumn.display({
    id: "acoes",
    header: "Ações",
    cell: ({ row, table }) => table.options.meta.renderActions(row.original),
  }),
]);

interface AutomationOriginFilterOption {
  value: string;
  label: string;
  rawValues: string[];
}

function normalizeOriginKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function buildOriginFilterOptions(rawValues: string[], categories: CategoryCatalogItem[], selectedValues: string[] | null): AutomationOriginFilterOption[] {
  const selectedKeys = new Set((selectedValues || []).map(normalizeOriginKey));
  const availableCategories = categories.filter((category) =>
    category.is_active || [category.label, ...category.aliases].some((value) => selectedKeys.has(normalizeOriginKey(value))),
  );
  const categoryKeyByTerm = new Map<string, string>();
  const groups = new Map<string, { label: string; rawValues: Set<string>; category: boolean }>();

  for (const category of availableCategories) {
    const key = `category:${normalizeOriginKey(category.label)}`;
    const current = groups.get(key);
    if (!current || (category.is_active && !current.category)) {
      groups.set(key, { label: category.label, rawValues: new Set([category.label, ...category.aliases]), category: category.is_active });
    } else {
      [category.label, ...category.aliases].forEach((value) => current.rawValues.add(value));
    }
    for (const term of [category.label, ...category.aliases]) {
      categoryKeyByTerm.set(normalizeOriginKey(term), key);
    }
  }

  for (const value of [...rawValues, ...(selectedValues || [])]) {
    const key = categoryKeyByTerm.get(normalizeOriginKey(value)) || `legacy:${normalizeOriginKey(value)}`;
    const current = groups.get(key);
    if (current) current.rawValues.add(value);
    else groups.set(key, { label: value.trim().replace(/\s+/g, " "), rawValues: new Set([value]), category: false });
  }

  return [...groups.entries()]
    .map(([value, group]) => ({ value, label: group.label, rawValues: [...group.rawValues] }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}
import { useDirectory } from "@/hooks/useDirectory";
import { getEmployeeAudioKey, getEmployeeAudioUrl, normalizeEmployeeName } from "@/lib/employeeAudio";
import { toast } from "@/hooks/use-toast";

export function AutomacoesTable({ automationId }: { automationId?: string }) {
  const navigate = useNavigate();
  const {
    automacoes,
    ultimoEnvioPorAutomacao,
    isLoadingUltimosEnvios,
    pausadoGlobal,
    isPausaConfigLoading,
    pausaConfigError,
    isSavingPausaGlobal,
    isLoading,
    error,
    createAutomacao,
    updateAutomacao,
    deleteAutomacao,
    togglePausaGlobal,
    refreshPausaGlobal,
    refresh,
  } = useAutomacoes();
  const selectedAutomacao = automationId ? automacoes.find((item) => item.id === automationId) || null : null;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const formReturnFocusRef = useRef<HTMLElement | null>(null);
  const {
    categories: originCategories,
    error: originCategoriesError,
    isLoading: isLoadingOriginCategories,
    refresh: refreshOriginCategories,
  } = useCategories("service_origin", { enabled: showForm });
  const [form, setForm] = useState<NewAutomacaoData>(createEmptyAutomationForm);
  const [isUploadingAudio, setIsUploadingAudio] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const deleteInFlightRef = useRef(false);
  const statusActionInFlightRef = useRef(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const {
    people: employees,
    isLoading: employeesLoading,
    error: employeesError,
    refresh: refreshEmployees,
  } = useDirectory("employees", { enabled: showForm });
  const vendedores = employees.map((employee) => employee.name);
  const isDelayValid = Number.isInteger(form.dias_apos_venda) && form.dias_apos_venda >= 1;
  const isFormValid = Boolean(form.nome.trim() && form.mensagem.trim() && isDelayValid);

  const [comoConheceuOptions, setComoConheceuOptions] = useState<string[]>([]);
  const [isLoadingOrigins, setIsLoadingOrigins] = useState(true);
  const [originsError, setOriginsError] = useState<string | null>(null);
  const originsRequestRef = useRef(0);
  const originsControllerRef = useRef<AbortController | null>(null);
  const originFilterOptions = useMemo(
    () => buildOriginFilterOptions(comoConheceuOptions, originCategories, form.filtro_como_conheceu),
    [comoConheceuOptions, form.filtro_como_conheceu, originCategories],
  );
  const selectedOriginOptionValues = useMemo(() => {
    const selectedRawValues = new Set((form.filtro_como_conheceu || []).map(normalizeOriginKey));
    return originFilterOptions
      .filter((option) => option.rawValues.some((value) => selectedRawValues.has(normalizeOriginKey(value))))
      .map((option) => option.value);
  }, [form.filtro_como_conheceu, originFilterOptions]);

  const fetchOriginOptions = useCallback(async () => {
    const requestId = ++originsRequestRef.current;
    originsControllerRef.current?.abort();
    const controller = new AbortController();
    originsControllerRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, AUTOMATION_ORIGIN_TIMEOUT_MS);
    setIsLoadingOrigins(true);
    setOriginsError(null);

    try {
      const pageSize = 1_000;
      const values = new Set<string>();
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("detalhado")
          .select("como_conheceu")
          .not("como_conheceu", "is", null)
          .order("como_conheceu")
          .range(from, from + pageSize - 1)
          .abortSignal(controller.signal);
        if (error) throw error;
        if (requestId !== originsRequestRef.current) return;
        (data || []).forEach((row) => {
          if (row.como_conheceu?.trim()) values.add(row.como_conheceu);
        });
        if (!data || data.length < pageSize) break;
      }
      if (requestId === originsRequestRef.current) {
        setComoConheceuOptions([...values].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" })));
      }
    } catch (cause) {
      if (requestId !== originsRequestRef.current) return;
      console.error("Error fetching automation origin options:", cause);
      setOriginsError(timedOut ? AUTOMATION_ORIGIN_TIMEOUT_MESSAGE : "Não foi possível carregar as origens para filtrar a automação.");
    } finally {
      window.clearTimeout(timeout);
      if (requestId === originsRequestRef.current) {
        originsControllerRef.current = null;
        setIsLoadingOrigins(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!showForm || form.fonte !== "detalhado") return;
    void fetchOriginOptions();
    return () => {
      originsRequestRef.current += 1;
      originsControllerRef.current?.abort();
      originsControllerRef.current = null;
    };
  }, [fetchOriginOptions, form.fonte, showForm]);

  const resetForm = () => {
    setForm(createEmptyAutomationForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleNewAutomation = (trigger?: HTMLElement) => {
    formReturnFocusRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setForm(createEmptyAutomationForm());
    setEditingId(null);
    setShowForm(true);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, vendedor: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAudio(vendedor);
    const fileName = `automacao-audio-${vendedor}-${Date.now()}-${file.name}`;
    try {
      const { data, error } = await supabase.storage
        .from("whatsapp-media")
        .upload(fileName, file, { contentType: file.type });
      if (error) {
        toast({ title: "Erro ao enviar áudio", description: "Verifique o arquivo e tente enviar novamente.", variant: "destructive" });
        return;
      }

      const { data: urlData, error: urlError } = await supabase.storage
        .from("whatsapp-media")
        .createSignedUrl(data.path, 60 * 60 * 24 * 365);
      if (urlError || !urlData) {
        toast({
          title: "Não foi possível preparar o áudio",
          description: "Tente enviar o arquivo novamente.",
          variant: "destructive",
        });
        await supabase.storage.from("whatsapp-media").remove([data.path]);
        return;
      }

      setForm((currentForm) => {
        const currentAudios = { ...(currentForm.audios_vendedor || {}) };
        Object.keys(currentAudios).forEach((key) => {
          if (normalizeEmployeeName(key) === normalizeEmployeeName(vendedor)) delete currentAudios[key];
        });
        return { ...currentForm, audios_vendedor: { ...currentAudios, [vendedor]: urlData.signedUrl } };
      });
    } catch (error) {
      console.error("Could not upload automation audio:", error);
      toast({
        title: "Erro ao enviar áudio",
        description: "Verifique o arquivo e tente enviar novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAudio(null);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!form.nome.trim() || !form.mensagem.trim() || !isDelayValid || isSaving || isUploadingAudio) return;
    setIsSaving(true);
    try {
      const saved = editingId
        ? await updateAutomacao(editingId, form)
        : await createAutomacao(form);
      if (saved) resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = useCallback((a: Automacao, trigger: HTMLButtonElement) => {
    formReturnFocusRef.current = trigger;
    setForm({ nome: a.nome, dias_apos_venda: a.dias_apos_venda, mensagem: a.mensagem, status: a.status, fonte: a.fonte, filtro_como_conheceu: a.filtro_como_conheceu, audio_url: a.audio_url, audios_vendedor: a.audios_vendedor, instancia: a.instancia || "suavisao" });
    setEditingId(a.id);
    setShowForm(true);
  }, []);

  const handleToggleStatus = useCallback(async (a: Automacao) => {
    if (statusActionInFlightRef.current || deleteInFlightRef.current || deletingId !== null || isSaving || isUploadingAudio !== null) return;
    statusActionInFlightRef.current = true;
    setTogglingStatusId(a.id);
    try {
      await updateAutomacao(a.id, { status: a.status === "Ativa" ? "Inativa" : "Ativa" });
    } finally {
      statusActionInFlightRef.current = false;
      setTogglingStatusId(null);
    }
  }, [deletingId, isSaving, isUploadingAudio, updateAutomacao]);

  const handleDelete = async (id: string) => {
    if (deleteInFlightRef.current || statusActionInFlightRef.current) return;
    deleteInFlightRef.current = true;
    setDeletingId(id);
    try {
      if (await deleteAutomacao(id)) setDeleteDialogId(null);
    } finally {
      deleteInFlightRef.current = false;
      setDeletingId(null);
    }
  };

  const formatUltimoEnvio = (automacaoId: string) => {
    const latest = ultimoEnvioPorAutomacao[automacaoId];
    if (latest?.error) return "Falha ao consultar";
    if (latest?.dataEnvio) {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(latest.dataEnvio));
    }
    if (isLoadingUltimosEnvios || latest === undefined) return "Carregando…";
    return "Ainda não enviado";
  };

  const renderAutomationActions = (automacao: Automacao, compact = false) => {
    const actionsLocked = deletingId !== null || togglingStatusId !== null;
    const isToggling = togglingStatusId === automacao.id;
    const toggleLabel = automacao.status === "Ativa" ? "Pausar" : "Ativar";

    return (
      <div className={`flex items-center ${compact ? "justify-end gap-2" : "justify-center gap-1"}`}>
        <Button
          type="button"
          variant={compact ? "outline" : "ghost"}
          size={compact ? "sm" : "icon"}
          className={compact ? "gap-1.5" : "h-8 w-8"}
          aria-label={`Editar ${automacao.nome}`}
          onClick={(event) => handleEdit(automacao, event.currentTarget)}
          disabled={actionsLocked}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          {compact && <span>Editar</span>}
        </Button>
        <Button
          type="button"
          variant={compact ? "outline" : "ghost"}
          size={compact ? "sm" : "icon"}
          className={compact ? "gap-1.5" : "h-8 w-8"}
          aria-label={isToggling ? `Atualizando status de ${automacao.nome}` : `${toggleLabel} ${automacao.nome}`}
          aria-busy={isToggling}
          onClick={() => void handleToggleStatus(automacao)}
          disabled={actionsLocked}
        >
          {isToggling
            ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            : automacao.status === "Ativa"
              ? <Pause className="size-3.5" aria-hidden="true" />
              : <Play className="size-3.5" aria-hidden="true" />}
          {compact && <span>{isToggling ? "Atualizando…" : toggleLabel}</span>}
        </Button>
        <Button
          type="button"
          variant={compact ? "outline" : "ghost"}
          size={compact ? "sm" : "icon"}
          className={compact ? "gap-1.5 text-destructive hover:text-destructive" : "h-8 w-8 text-muted-foreground hover:text-destructive"}
          aria-label={`Excluir ${automacao.nome}`}
          onClick={() => setDeleteDialogId(automacao.id)}
          disabled={actionsLocked}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          {compact && <span>Excluir</span>}
        </Button>
      </div>
    );
  };
  const automationTable = useTable({
    features: automationTableFeatures,
    columns: automationColumns,
    data: automacoes,
    getRowId: (automacao) => automacao.id,
    meta: {
      formatLastSend: formatUltimoEnvio,
      renderActions: (automacao) => renderAutomationActions(automacao),
    },
  });

  const pendingDeleteAutomation = automacoes.find((automacao) => automacao.id === deleteDialogId) || null;

  if (isLoading && automacoes.length === 0) {
    return <DataState variant="loading" title="Carregando automações" />;
  }

  if (error && automacoes.length === 0) {
    return <DataState variant="error" title="Automações indisponíveis" description={error} action={{ label: "Tentar novamente", onClick: () => void refresh() }} />;
  }

  if (automationId && selectedAutomacao) {
    return (
      <div className="space-y-4">
        {error && <DataState variant="error" title="Dados desatualizados" description="A lista de automações não foi atualizada; os dados carregados anteriormente continuam visíveis." action={{ label: "Tentar novamente", onClick: () => void refresh() }} />}
        <AutomacaoDetailView automacao={selectedAutomacao} onBack={() => navigate("/automacoes")} />
      </div>
    );
  }

  if (automationId) {
    return (
      <DataState
        variant="empty"
        title="Automação não encontrada"
        description="Ela pode ter sido removida ou o link pode estar incorreto."
        action={{ label: "Voltar para automações", onClick: () => navigate("/automacoes") }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && <DataState variant="error" title="Lista desatualizada" description="As automações carregadas permanecem disponíveis, mas a última atualização falhou." action={{ label: "Tentar novamente", onClick: () => void refresh() }} />}
      {/* Header controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          {pausaConfigError ? (
            <div role="alert" className="flex flex-wrap items-center gap-2 text-destructive">
              <span>{pausaConfigError}</span>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void refreshPausaGlobal()}>
                <RefreshCw className="size-3.5" aria-hidden="true" /> Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              <span className="text-muted-foreground">
                {isPausaConfigLoading ? "Verificando pausa geral…" : isSavingPausaGlobal ? "Salvando pausa geral…" : "Pausa geral:"}
              </span>
              <Switch
                aria-label={isSavingPausaGlobal ? "Salvando pausa geral" : "Pausar todas as automações"}
                aria-busy={isSavingPausaGlobal}
                disabled={isPausaConfigLoading || isSavingPausaGlobal}
                checked={pausadoGlobal}
                onCheckedChange={togglePausaGlobal}
              />
              {pausadoGlobal && !isPausaConfigLoading && <Badge variant="destructive" className="text-xs">Pausado</Badge>}
            </>
          )}
        </div>

        <Dialog open={showForm} onOpenChange={(open) => {
          if (isSaving || isUploadingAudio) return;
          if (!open) resetForm();
        }}>
          <Button size="sm" className="gap-1.5" onClick={(event) => handleNewAutomation(event.currentTarget)}><Plus className="w-4 h-4" /> Nova automação</Button>
          <DialogContent finalFocus={formReturnFocusRef} closeButtonDisabled={isSaving || Boolean(isUploadingAudio)} aria-busy={isSaving || Boolean(isUploadingAudio)} className="sm:max-w-lg max-h-[85vh] overflow-y-auto scrollbar-visible">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar automação" : "Nova automação"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="automation-name" className="mb-1 block">
                  Nome da automação <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Input
                  id="automation-name"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Adaptação 7 dias"
                />
              </div>
              <div>
                <Label htmlFor="automation-source" className="mb-1 block">Fonte dos clientes</Label>
                <Select
                  value={form.fonte}
                  onValueChange={(fonte) => {
                    setForm((prev) => ({
                      ...prev,
                      fonte,
                      filtro_como_conheceu: fonte === "detalhado" ? prev.filtro_como_conheceu : null,
                      dias_apos_venda: fonte === "detalhado_inativos" && prev.fonte !== "detalhado_inativos" ? 730 : prev.dias_apos_venda,
                    }));
                  }}
                >
                  <SelectTrigger id="automation-source" aria-label="Fonte dos clientes"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leads">Leads (com venda)</SelectItem>
                    <SelectItem value="perdidos">Leads (perdidos)</SelectItem>
                    <SelectItem value="detalhado">Atendimentos (com receita, sem visita à loja)</SelectItem>
                    <SelectItem value="detalhado_inativos">Atendimentos (sem retorno há 2+ anos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="automation-instance" className="mb-1 block">Número WhatsApp de envio</Label>
                <Select value={form.instancia} onValueChange={(instancia) => setForm({ ...form, instancia })}>
                  <SelectTrigger id="automation-instance" aria-label="Número WhatsApp de envio"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suavisao">Sua Visão (padrão legado)</SelectItem>
                    <SelectItem value="uazapi">Sua Visão (UAZAPI)</SelectItem>
                    <SelectItem value="uazapi_dnz">DNZ Óticas (UAZAPI)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Escolha por qual número esta automação vai enviar as mensagens.
                </p>
              </div>
              {form.fonte === "detalhado" && (
                <div>
                  <p id="automation-source-filter-label" className="text-sm font-medium mb-1 block">
                    <Filter className="w-3.5 h-3.5 inline mr-1" />
                    Filtrar por "Como Conheceu"
                  </p>
                  <div role="group" aria-labelledby="automation-source-filter-label" className="space-y-2">
                    {isLoadingOrigins ? (
                      <p role="status" className="text-xs text-muted-foreground">Carregando origens…</p>
                    ) : originsError ? (
                      <div role="alert" className="flex flex-wrap items-center justify-between gap-2 text-xs text-destructive">
                        <span>{originsError}</span>
                        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={() => void fetchOriginOptions()}>
                          <RefreshCw className="size-3.5" aria-hidden="true" /> Tentar novamente
                        </Button>
                      </div>
                    ) : (
                      <>
                        {originCategoriesError && (
                          <div role="status" className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>Catálogo indisponível; origens equivalentes serão agrupadas pela grafia.</span>
                            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={() => void refreshOriginCategories()}>
                              <RefreshCw className="size-3.5" aria-hidden="true" /> Atualizar categorias
                            </Button>
                          </div>
                        )}
                        <MultiSelectFilter
                          id="automation-origin-filter"
                          ariaLabel="Filtrar por como conheceu"
                          placeholder="Todas as origens"
                          emptyText="Nenhuma origem encontrada"
                          options={originFilterOptions.map(({ value, label }) => ({ value, label }))}
                          selectedValues={selectedOriginOptionValues}
                          onSelectionChange={(selectedOptions) => {
                            const selectedKeys = new Set(selectedOptions);
                            const rawValues = originFilterOptions
                              .filter((option) => selectedKeys.has(option.value))
                              .flatMap((option) => option.rawValues);
                            const uniqueRawValues = [...new Set(rawValues)];
                            setForm((previous) => ({
                              ...previous,
                              filtro_como_conheceu: uniqueRawValues.length > 0 ? uniqueRawValues : null,
                            }));
                          }}
                        />
                        {isLoadingOriginCategories && !originCategoriesError && (
                          <p role="status" className="text-xs text-muted-foreground">Carregando categorias consolidadas…</p>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Filtra atendimentos com receita sem visita à loja.
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="automation-delay" className="mb-1 block">
                  {form.fonte === "perdidos"
                    ? "Disparar após quantos dias de marcado como perdido"
                    : form.fonte === "detalhado_inativos"
                      ? "Disparar após quantos dias desde o último atendimento"
                      : "Disparar após quantos dias da venda"} <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Input
                  id="automation-delay"
                  type="number"
                  min={1}
                  step={1}
                  required
                  aria-invalid={!isDelayValid}
                  aria-describedby={!isDelayValid || form.fonte === "detalhado_inativos" ? "automation-delay-help" : undefined}
                  value={form.dias_apos_venda}
                  onChange={(e) => setForm({ ...form, dias_apos_venda: Number(e.target.value) })}
                />
                {!isDelayValid ? (
                  <p id="automation-delay-help" className="text-xs text-destructive mt-1">
                    Informe um número inteiro igual ou maior que 1.
                  </p>
                ) : form.fonte === "detalhado_inativos" && (
                  <p id="automation-delay-help" className="text-xs text-muted-foreground mt-1">
                    Use 730 dias para incluir clientes sem atendimento há 2 anos ou mais.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="automation-message" className="mb-1 block">
                  Mensagem <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="automation-message"
                  required
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
                    Nesta fonte, {"{data_compra}"} representa a data do último atendimento na unidade.
                  </p>
                )}
              </div>
              <section aria-labelledby="automation-audio-heading" className="space-y-3">
                <h3 id="automation-audio-heading" className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <Volume2 aria-hidden="true" className="size-3.5" />
                  Áudios por vendedor (enviados após a mensagem)
                </h3>
                <div className="space-y-3">
                  {vendedores.map((vendedor) => {
                    const audioKey = getEmployeeAudioKey(form.audios_vendedor, vendedor) || vendedor;
                    const audioUrl = getEmployeeAudioUrl(form.audios_vendedor, vendedor);
                    return (
                      <fieldset key={vendedor} className="min-w-0 rounded-md border border-border bg-muted/20 p-3">
                        <legend className="max-w-full break-words px-1 text-sm font-medium">{vendedor}</legend>
                        {audioUrl ? (
                          <div className="flex items-center gap-2">
                            <audio controls src={audioUrl} className="h-8 flex-1" aria-label={`Áudio do vendedor ${vendedor}`} />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              aria-label={`Remover áudio de ${vendedor}`}
                              onClick={() => {
                                const current = { ...form.audios_vendedor };
                                delete current[audioKey];
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
                              aria-label={isUploadingAudio === vendedor ? `Enviando áudio de ${vendedor}` : `Enviar áudio de ${vendedor}`}
                              aria-busy={isUploadingAudio === vendedor}
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {isUploadingAudio === vendedor ? "Enviando..." : "Enviar áudio"}
                            </Button>
                          </div>
                        )}
                      </fieldset>
                    );
                  })}
                </div>
                <div aria-busy={employeesLoading} className="space-y-2">
                  {employeesLoading && <p role="status" className="text-xs text-muted-foreground">Carregando funcionários…</p>}
                  {employeesError && !employeesLoading && (
                    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 text-xs text-destructive">
                      <span>{employees.length > 0 ? "Não foi possível atualizar a lista; os funcionários carregados continuam disponíveis." : "Não foi possível carregar a lista de funcionários."}</span>
                      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={() => void refreshEmployees()}>
                        <RefreshCw aria-hidden="true" className="size-3.5" /> Tentar novamente
                      </Button>
                    </div>
                  )}
                  {!employeesLoading && !employeesError && vendedores.length === 0 && (
                    <p className="text-xs text-muted-foreground">Cadastre funcionários na aba Cadastros para configurar áudios.</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  O áudio do vendedor que fez a venda será enviado automaticamente após a mensagem de texto.
                </p>
              </section>
              <div className="flex items-center gap-2">
                <Label htmlFor="automation-status">Status:</Label>
                <Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}>
                  <SelectTrigger id="automation-status" aria-label="Status da automação" className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativa">Ativa</SelectItem>
                    <SelectItem value="Inativa">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p id="automation-required-fields-help" className="text-xs text-muted-foreground">
              Campos com * são obrigatórios. Informe um nome, uma mensagem e um prazo em dias igual ou maior que 1.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm} disabled={isSaving || Boolean(isUploadingAudio)}>Cancelar</Button>
              <Button onClick={handleSubmit} aria-describedby="automation-required-fields-help" disabled={!isFormValid || isSaving || Boolean(isUploadingAudio)}>
                {isSaving ? "Salvando…" : editingId ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Automações list */}
      <div className="space-y-3">
        {automacoes.length === 0 ? (
          <DataState
            variant="empty"
            title="Nenhuma automação cadastrada"
            description="Crie sua primeira régua de pós-venda."
            action={{ label: "Nova automação", onClick: () => handleNewAutomation() }}
          />
        ) : (
          <>
            <ul className="grid gap-3 md:hidden" aria-label="Lista de automações">
              {automacoes.map((a) => (
                <li key={a.id}>
                  <Card>
                    <CardHeader className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Link to={`/automacoes/${encodeURIComponent(a.id)}`} className="min-w-0 truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                              {a.nome}
                            </Link>
                            {hasConfiguredAudio(a) && <Volume2 className="size-3.5 shrink-0 text-muted-foreground" aria-label="Áudio configurado" />}
                          </div>
                          <p className="line-clamp-3 break-words text-sm text-muted-foreground">{a.mensagem}</p>
                        </div>
                        <Badge variant={a.status === "Ativa" ? "success" : "secondary"} className="shrink-0">{a.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 pb-4">
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">Fonte</dt>
                          <dd className="mt-1"><Badge variant="outline" className="text-xs">{formatAutomationSource(a.fonte)}</Badge></dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Prazo</dt>
                          <dd className="mt-1 flex items-center gap-1.5"><Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />{formatAutomationDays(a.dias_apos_venda)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Envios</dt>
                          <dd className="mt-1 flex items-center gap-1.5"><Send className="size-3.5 text-muted-foreground" aria-hidden="true" />{a.total_envios}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">Último envio</dt>
                          <dd className="mt-1 break-words text-muted-foreground">{formatUltimoEnvio(a.id)}</dd>
                        </div>
                      </dl>
                      <div className="border-t border-border pt-3">{renderAutomationActions(a, true)}</div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
            <EntityDataTable
              table={automationTable}
              label="Lista de automações"
              className="hidden rounded-lg border border-border bg-card md:block"
              tableClassName="min-w-[1080px]"
              headerRowClassName="bg-muted/50 hover:bg-muted/50"
              getHeaderClassName={(columnId) => columnId === "nome" ? "sticky left-0 z-20 min-w-[180px] border-r border-border bg-muted/50 font-bold shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]" : ["fonte", "dias_apos_venda", "status", "total_envios", "ultimo_envio", "acoes"].includes(columnId) ? "text-center" : undefined}
              getCellClassName={(columnId) => columnId === "nome" ? "sticky left-0 z-10 min-w-[180px] border-r border-border bg-card font-medium shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]" : columnId === "mensagem" ? "max-w-[300px] truncate text-muted-foreground" : ["fonte", "dias_apos_venda", "status", "total_envios", "ultimo_envio", "acoes"].includes(columnId) ? "text-center" : undefined}
            />
          </>
        )}
      </div>

      <AlertDialog
        open={pendingDeleteAutomation !== null}
        onOpenChange={(open) => {
          if (deleteInFlightRef.current) return;
          if (!open) setDeleteDialogId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir automação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir “{pendingDeleteAutomation?.nome}”? Todo o histórico de disparos será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={!pendingDeleteAutomation || deletingId === pendingDeleteAutomation.id}
              aria-busy={Boolean(pendingDeleteAutomation && deletingId === pendingDeleteAutomation.id)}
              onClick={() => pendingDeleteAutomation && void handleDelete(pendingDeleteAutomation.id)}
            >
              {pendingDeleteAutomation && deletingId === pendingDeleteAutomation.id && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              {pendingDeleteAutomation && deletingId === pendingDeleteAutomation.id ? "Excluindo…" : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
