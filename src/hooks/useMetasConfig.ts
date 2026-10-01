import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  // Carrega todas as configurações
  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("metas_config")
        .select("*");

      if (error) throw error;

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
          vendas_loja: Number((item as any).vendas_loja) || 0,
          vendas_internet: Number((item as any).vendas_internet) || 0,
        };
      });

      setConfigs(configMap);
    } catch (error) {
      console.error("Error fetching metas config:", error);
      toast({
        title: "Erro ao carregar configurações",
        description: "Não foi possível carregar as configurações de metas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
  const saveConfig = useCallback(async (config: MetasConfig) => {
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
    } catch (error) {
      console.error("Error saving metas config:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    }
  }, [configs, toast]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return {
    configs,
    isLoading,
    getConfigForMonth,
    saveConfig,
    fetchConfigs,
  };
}
