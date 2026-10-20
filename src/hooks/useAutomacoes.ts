import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const AUTOMATION_QUERY_TIMEOUT_MS = 30_000;
const AUTOMATION_QUERY_TIMEOUT_MESSAGE = "A consulta demorou mais de 30 segundos. Tente novamente.";

export interface Automacao {
  id: string;
  nome: string;
  dias_apos_venda: number;
  mensagem: string;
  status: string;
  total_envios: number;
  fonte: string;
  filtro_como_conheceu: string[] | null;
  audio_url: string | null;
  audios_vendedor: Record<string, string> | null;
  instancia: string;
  created_at: string;
  updated_at: string;
}

export interface AutomacaoDisparo {
  id: string;
  automacao_id: string;
  lead_id: string;
  nome_cliente: string | null;
  telefone: string | null;
  mensagem_enviada: string | null;
  status: string;
  data_envio: string | null;
  data_programada: string;
  erro: string | null;
  observacao?: string | null;
  resposta_cliente?: boolean;
  created_at: string;
}

export interface NewAutomacaoData {
  nome: string;
  dias_apos_venda: number;
  mensagem: string;
  status: string;
  fonte: string;
  filtro_como_conheceu: string[] | null;
  audio_url: string | null;
  audios_vendedor: Record<string, string> | null;
  instancia: string;
}

export interface UltimoEnvioAutomacao {
  dataEnvio: string | null;
  error: boolean;
}

export function useAutomacoes() {
  const [automacoes, setAutomacoes] = useState<Automacao[]>([]);
  const [ultimoEnvioPorAutomacao, setUltimoEnvioPorAutomacao] = useState<Record<string, UltimoEnvioAutomacao>>({});
  const [isLoadingUltimosEnvios, setIsLoadingUltimosEnvios] = useState(false);
  const [pausadoGlobal, setPausadoGlobal] = useState(false);
  const [isPausaConfigLoading, setIsPausaConfigLoading] = useState(true);
  const [pausaConfigError, setPausaConfigError] = useState<string | null>(null);
  const [isSavingPausaGlobal, setIsSavingPausaGlobal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pausaActionInFlightRef = useRef(false);
  const latestSendsRequestRef = useRef(0);
  const latestSendsControllerRef = useRef<AbortController | null>(null);
  const automacoesRequestRef = useRef(0);
  const automacoesControllerRef = useRef<AbortController | null>(null);
  const configRequestRef = useRef(0);
  const configControllerRef = useRef<AbortController | null>(null);

  const fetchUltimosEnvios = useCallback(async (automacaoIds: string[]) => {
    const requestId = ++latestSendsRequestRef.current;
    latestSendsControllerRef.current?.abort();
    if (automacaoIds.length === 0) {
      setUltimoEnvioPorAutomacao({});
      setIsLoadingUltimosEnvios(false);
      return;
    }

    const controller = new AbortController();
    latestSendsControllerRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, AUTOMATION_QUERY_TIMEOUT_MS);
    setIsLoadingUltimosEnvios(true);
    setUltimoEnvioPorAutomacao({});

    const latestSends: Array<readonly [string, UltimoEnvioAutomacao]> = [];
    try {
      for (let offset = 0; offset < automacaoIds.length; offset += 8) {
        const batch = automacaoIds.slice(offset, offset + 8);
        const batchResults = await Promise.all(batch.map(async (automacaoId) => {
          try {
            const { data, error } = await supabase
              .from("automacao_disparos")
              .select("data_envio")
              .eq("automacao_id", automacaoId)
              .eq("status", "enviado")
              .not("data_envio", "is", null)
              .order("data_envio", { ascending: false })
              .limit(1)
              .abortSignal(controller.signal)
              .maybeSingle();

            return [automacaoId, { dataEnvio: error ? null : data?.data_envio || null, error: Boolean(error) }] as const;
          } catch {
            return [automacaoId, { dataEnvio: null, error: true }] as const;
          }
        }));
        latestSends.push(...batchResults);
        if (controller.signal.aborted) break;
      }

      if (requestId !== latestSendsRequestRef.current) return;
      const sendsById = new Map(latestSends);
      if (timedOut) {
        setUltimoEnvioPorAutomacao(Object.fromEntries(automacaoIds.map((id) => [id, sendsById.get(id) || { dataEnvio: null, error: true }])));
      } else {
        setUltimoEnvioPorAutomacao(Object.fromEntries(latestSends));
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestId === latestSendsRequestRef.current) {
        latestSendsControllerRef.current = null;
        setIsLoadingUltimosEnvios(false);
      }
    }
  }, []);

  const fetchAutomacoes = useCallback(async (suppressToast = false) => {
    const requestId = ++automacoesRequestRef.current;
    automacoesControllerRef.current?.abort();
    const controller = new AbortController();
    automacoesControllerRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, AUTOMATION_QUERY_TIMEOUT_MS);
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("automacoes")
        .select("*")
        .order("dias_apos_venda", { ascending: true })
        .abortSignal(controller.signal);
      if (error) throw error;
      if (requestId !== automacoesRequestRef.current) return;

      setAutomacoes((data || []).map(d => ({
        ...d,
        audios_vendedor: (d.audios_vendedor as Record<string, string>) || null,
        instancia: d.instancia || "suavisao",
      })));
      void fetchUltimosEnvios((data || []).map((automacao) => automacao.id));
    } catch (cause) {
      if (requestId !== automacoesRequestRef.current) return;
      setError(timedOut ? AUTOMATION_QUERY_TIMEOUT_MESSAGE : "Não foi possível carregar as automações. Tente novamente.");
      if (!suppressToast) toast({
        title: "Erro ao carregar automações",
        description: timedOut ? AUTOMATION_QUERY_TIMEOUT_MESSAGE : "Não foi possível atualizar a lista. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      window.clearTimeout(timeout);
      if (requestId === automacoesRequestRef.current) {
        automacoesControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }, [fetchUltimosEnvios]);

  const fetchConfig = useCallback(async (suppressToast = false) => {
    const requestId = ++configRequestRef.current;
    configControllerRef.current?.abort();
    const controller = new AbortController();
    configControllerRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, AUTOMATION_QUERY_TIMEOUT_MS);
    setIsPausaConfigLoading(true);
    setPausaConfigError(null);
    try {
      const { data, error } = await supabase
        .from("automacoes_config")
        .select("*")
        .limit(1)
        .abortSignal(controller.signal)
        .single();
      if (error) throw error;
      if (!data) throw new Error("Configuração global não encontrada.");
      if (requestId !== configRequestRef.current) return;
      setPausadoGlobal(data.pausado);
    } catch (cause) {
      if (requestId !== configRequestRef.current) return;
      setPausaConfigError(timedOut ? AUTOMATION_QUERY_TIMEOUT_MESSAGE : "Não foi possível verificar a pausa geral das automações.");
      if (!suppressToast) toast({
        title: "Erro ao carregar a pausa geral",
        description: timedOut ? AUTOMATION_QUERY_TIMEOUT_MESSAGE : "Não foi possível confirmar o estado da pausa geral. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      window.clearTimeout(timeout);
      if (requestId === configRequestRef.current) {
        configControllerRef.current = null;
        setIsPausaConfigLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchAutomacoes();
    void fetchConfig();
    return () => {
      automacoesRequestRef.current += 1;
      automacoesControllerRef.current?.abort();
      automacoesControllerRef.current = null;
      latestSendsRequestRef.current += 1;
      latestSendsControllerRef.current?.abort();
      latestSendsControllerRef.current = null;
      configRequestRef.current += 1;
      configControllerRef.current?.abort();
      configControllerRef.current = null;
    };
  }, [fetchAutomacoes, fetchConfig]);

  const createAutomacao = async (automacao: NewAutomacaoData): Promise<boolean> => {
    try {
      const { error } = await supabase.from("automacoes").insert(automacao);
      if (error) throw error;

      toast({ title: "Automação criada com sucesso!" });
      void fetchAutomacoes();
      return true;
    } catch (error) {
      console.error("Could not confirm automation creation:", error);
      void fetchAutomacoes(true);
      toast({
        title: "Não foi possível confirmar a criação",
        description: "A lista será atualizada. Confira se a automação apareceu antes de tentar novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateAutomacao = async (id: string, fields: Partial<Automacao>): Promise<boolean> => {
    try {
      const { error } = await supabase.from("automacoes").update(fields).eq("id", id);
      if (error) throw error;

      toast({ title: "Automação atualizada com sucesso!" });
      void fetchAutomacoes();
      return true;
    } catch (error) {
      console.error("Could not confirm automation update:", error);
      void fetchAutomacoes(true);
      toast({
        title: "Não foi possível confirmar a atualização",
        description: "A lista será atualizada para conferir o estado salvo antes de repetir a ação.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteAutomacao = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("automacoes").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Automação excluída" });
      void fetchAutomacoes();
      return true;
    } catch (cause) {
      console.error("Could not confirm automation deletion:", cause);
      void fetchAutomacoes(true);
      toast({
        title: "Não foi possível confirmar a exclusão",
        description: "A lista será atualizada para conferir se a regra ainda existe antes de repetir a ação.",
        variant: "destructive",
      });
      return false;
    }
  };

  const togglePausaGlobal = async (): Promise<boolean> => {
    if (pausaActionInFlightRef.current || isPausaConfigLoading || pausaConfigError) return false;
    pausaActionInFlightRef.current = true;
    setIsSavingPausaGlobal(true);
    const newVal = !pausadoGlobal;
    try {
      const { error } = await supabase
        .from("automacoes_config")
        .update({ pausado: newVal })
        .not("id", "is", null);
      if (error) throw error;
      setPausadoGlobal(newVal);
      toast({ title: newVal ? "Automações pausadas" : "Automações ativadas" });
      return true;
    } catch (cause) {
      console.error("Could not confirm global automation pause:", cause);
      void fetchConfig(true);
      toast({
        title: "Não foi possível confirmar a pausa geral",
        description: "O estado salvo será consultado antes de uma nova tentativa.",
        variant: "destructive",
      });
      return false;
    } finally {
      pausaActionInFlightRef.current = false;
      setIsSavingPausaGlobal(false);
    }
  };

  return {
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
    refreshPausaGlobal: fetchConfig,
    refresh: () => { void fetchAutomacoes(); void fetchConfig(); },
  };
}
