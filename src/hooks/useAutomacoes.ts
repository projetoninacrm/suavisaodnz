import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
}

export function useAutomacoes() {
  const [automacoes, setAutomacoes] = useState<Automacao[]>([]);
  const [disparos, setDisparos] = useState<AutomacaoDisparo[]>([]);
  const [pausadoGlobal, setPausadoGlobal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAutomacoes = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("automacoes")
      .select("*")
      .order("dias_apos_venda", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar automações", description: error.message, variant: "destructive" });
    } else {
      setAutomacoes(data || []);
    }
    setIsLoading(false);
  }, []);

  const fetchDisparos = useCallback(async () => {
    const { data, error } = await supabase
      .from("automacao_disparos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast({ title: "Erro ao carregar histórico", description: error.message, variant: "destructive" });
    } else {
      setDisparos(data || []);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase
      .from("automacoes_config")
      .select("*")
      .limit(1)
      .single();
    if (data) setPausadoGlobal(data.pausado);
  }, []);

  useEffect(() => {
    fetchAutomacoes();
    fetchDisparos();
    fetchConfig();
  }, [fetchAutomacoes, fetchDisparos, fetchConfig]);

  const createAutomacao = async (automacao: NewAutomacaoData) => {
    const { error } = await supabase.from("automacoes").insert(automacao);
    if (error) {
      toast({ title: "Erro ao criar automação", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Automação criada com sucesso!" });
      fetchAutomacoes();
    }
  };

  const updateAutomacao = async (id: string, fields: Partial<Automacao>) => {
    const { error } = await supabase.from("automacoes").update(fields).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      fetchAutomacoes();
    }
  };

  const deleteAutomacao = async (id: string) => {
    const { error } = await supabase.from("automacoes").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Automação excluída" });
      fetchAutomacoes();
    }
  };

  const togglePausaGlobal = async () => {
    const newVal = !pausadoGlobal;
    const { error } = await supabase
      .from("automacoes_config")
      .update({ pausado: newVal })
      .not("id", "is", null);
    if (!error) {
      setPausadoGlobal(newVal);
      toast({ title: newVal ? "Automações pausadas" : "Automações ativadas" });
    }
  };

  return {
    automacoes,
    disparos,
    pausadoGlobal,
    isLoading,
    createAutomacao,
    updateAutomacao,
    deleteAutomacao,
    togglePausaGlobal,
    refresh: () => { fetchAutomacoes(); fetchDisparos(); fetchConfig(); },
  };
}
