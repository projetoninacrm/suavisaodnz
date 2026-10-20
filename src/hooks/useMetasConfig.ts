import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const METAS_CONFIG_QUERY_TIMEOUT_MS = 30_000;
const METAS_CONFIG_QUERY_TIMEOUT_MESSAGE = "A consulta das metas demorou mais de 30 segundos. Tente novamente.";

export interface MetasConfig {
  id?: string;
  mes: string;
  periodos: number;
  media_atendimentos: number;
  percentual_receita: number;
  percentual_comparecimento: number;
  percentual_conversao: number;
  meta_faturamento_mensal: number;
  vendas_loja?: number;
  vendas_internet?: number;
}

const DEFAULT_CONFIG: Omit<MetasConfig, "mes"> = {
  periodos: 0,
  media_atendimentos: 8,
  percentual_receita: 60,
  percentual_comparecimento: 50,
  percentual_conversao: 66,
  meta_faturamento_mensal: 60000,
};

export function useMetasConfig() {
  const [configs, setConfigs] = useState<Record<string, MetasConfig>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const requestIdRef = useRef(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  // Carrega todas as configurações
  const fetchConfigs = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, METAS_CONFIG_QUERY_TIMEOUT_MS);
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("metas_config")
        .select("*")
        .abortSignal(controller.signal);

      if (error) throw error;
      if (requestId !== requestIdRef.current) return;

      const configMap: Record<string, MetasConfig> = {};
      (data || []).forEach((item) => {
        configMap[item.mes] = {
          id: item.id,
          mes: item.mes,
          periodos: Number(item.periodos) || 0,
          media_atendimentos: Number(item.media_atendimentos) || 8,
          percentual_receita: Number(item.percentual_receita) || 60,
          percentual_comparecimento: Number(item.percentual_comparecimento) || 50,
          percentual_conversao: Number(item.percentual_conversao) || 66,
          meta_faturamento_mensal: Number(item.meta_faturamento_mensal) || 60000,
          vendas_loja: Number(item.vendas_loja) || 0,
          vendas_internet: Number(item.vendas_internet) || 0,
        };
      });

      setConfigs(configMap);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error("Error fetching metas config:", error);
      setError(timedOut ? METAS_CONFIG_QUERY_TIMEOUT_MESSAGE : "Não foi possível carregar as configurações de metas. Tente novamente.");
      toast({
        title: "Erro ao carregar configurações",
        description: timedOut ? METAS_CONFIG_QUERY_TIMEOUT_MESSAGE : "Não foi possível carregar as configurações de metas.",
        variant: "destructive",
      });
    } finally {
      window.clearTimeout(timeout);
      if (requestId === requestIdRef.current) {
        activeControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }, [toast]);

  // Obtém configuração de um mês (retorna default se não existir)
  const getConfigForMonth = useCallback((mes: string): MetasConfig => {
    if (configs[mes]) {
      return configs[mes];
    }
    return { mes, ...DEFAULT_CONFIG };
  }, [configs]);

  // Salva configuração de um mês
  const saveConfig = useCallback(async (config: MetasConfig): Promise<boolean> => {
    try {
      const existingConfig = configs[config.mes];

      if (existingConfig?.id) {
        // Update
        const { error } = await supabase
          .from("metas_config")
          .update({
            periodos: config.periodos,
            media_atendimentos: config.media_atendimentos,
            percentual_receita: config.percentual_receita,
            percentual_comparecimento: config.percentual_comparecimento,
            percentual_conversao: config.percentual_conversao,
            meta_faturamento_mensal: config.meta_faturamento_mensal,
            vendas_loja: config.vendas_loja ?? 0,
            vendas_internet: config.vendas_internet ?? 0,
          })
          .eq("id", existingConfig.id);

        if (error) throw error;

        setConfigs(prev => ({
          ...prev,
          [config.mes]: { ...config, id: existingConfig.id },
        }));
      } else {
        // Insert
        const { data, error } = await supabase
          .from("metas_config")
          .insert({
            mes: config.mes,
            periodos: config.periodos,
            media_atendimentos: config.media_atendimentos,
            percentual_receita: config.percentual_receita,
            percentual_comparecimento: config.percentual_comparecimento,
            percentual_conversao: config.percentual_conversao,
            meta_faturamento_mensal: config.meta_faturamento_mensal,
            vendas_loja: config.vendas_loja ?? 0,
            vendas_internet: config.vendas_internet ?? 0,
          })
          .select()
          .single();

        if (error) throw error;

        setConfigs(prev => ({
          ...prev,
          [config.mes]: { ...config, id: data.id },
        }));
      }

      toast({
        title: "Configuração salva",
        description: `Metas de ${config.mes} salvas com sucesso.`,
      });
      return true;
    } catch (error) {
      console.error("Error saving metas config:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
      return false;
    }
  }, [configs, toast]);

  useEffect(() => {
    void fetchConfigs();
    return () => {
      requestIdRef.current += 1;
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
    };
  }, [fetchConfigs]);

  return {
    configs,
    isLoading,
    error,
    getConfigForMonth,
    saveConfig,
    fetchConfigs,
  };
}
