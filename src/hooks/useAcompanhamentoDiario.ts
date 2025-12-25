import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AcompanhamentoDiario {
  id: string;
  data: string;
  vendas_realizadas: number;
  faturamento_realizado: number;
  obs: string | null;
  created_at: string;
  updated_at: string;
}

export function useAcompanhamentoDiario() {
  const [registros, setRegistros] = useState<AcompanhamentoDiario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRegistros = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("acompanhamento_diario")
        .select("*")
        .order("data", { ascending: true });

      if (error) throw error;
      
      // Cast the data to the correct type
      const typedData = (data || []).map(item => ({
        ...item,
        vendas_realizadas: Number(item.vendas_realizadas) || 0,
        faturamento_realizado: Number(item.faturamento_realizado) || 0,
      })) as AcompanhamentoDiario[];
      
      setRegistros(typedData);
    } catch (error) {
      console.error("Error fetching acompanhamento diario:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar o acompanhamento diário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const upsertRegistro = useCallback(async (data: string, field: "vendas_realizadas" | "faturamento_realizado", value: number) => {
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from("acompanhamento_diario")
        .select("*")
        .eq("data", data)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("acompanhamento_diario")
          .update({ [field]: value })
          .eq("data", data);

        if (error) throw error;

        setRegistros(prev =>
          prev.map(r =>
            r.data === data ? { ...r, [field]: value } : r
          )
        );
      } else {
        // Insert new
        const newRecord = {
          data,
          vendas_realizadas: field === "vendas_realizadas" ? value : 0,
          faturamento_realizado: field === "faturamento_realizado" ? value : 0,
        };

        const { data: inserted, error } = await supabase
          .from("acompanhamento_diario")
          .insert(newRecord)
          .select()
          .single();

        if (error) throw error;

        const typedInserted = {
          ...inserted,
          vendas_realizadas: Number(inserted.vendas_realizadas) || 0,
          faturamento_realizado: Number(inserted.faturamento_realizado) || 0,
        } as AcompanhamentoDiario;

        setRegistros(prev => [...prev, typedInserted].sort((a, b) => a.data.localeCompare(b.data)));
      }

      toast({
        title: "Salvo",
        description: "Valor atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Error upserting acompanhamento:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o valor.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  return {
    registros,
    isLoading,
    fetchRegistros,
    upsertRegistro,
  };
}
