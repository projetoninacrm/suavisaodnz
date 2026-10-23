import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AcompanhamentoDiario {
  id: string;
  data: string;
  vendas_realizadas: number | null;
  faturamento_realizado: number | null;
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
      
      // Cast the data to the correct type, preserving null values
      const typedData = (data || []).map(item => ({
        ...item,
        vendas_realizadas: item.vendas_realizadas !== null ? Number(item.vendas_realizadas) : null,
        faturamento_realizado: item.faturamento_realizado !== null ? Number(item.faturamento_realizado) : null,
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

  const upsertRegistro = useCallback(async (data: string, field: "vendas_realizadas" | "faturamento_realizado", value: number | null) => {
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from("acompanhamento_diario")
        .select("*")
        .eq("data", data)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("acompanhamento_diario")
          .update({ [field]: value })
          .eq("data", data);

        if (error) throw error;

        // Check if both fields are null - if so, delete the record
        const otherField = field === "vendas_realizadas" ? "faturamento_realizado" : "vendas_realizadas";
        const otherValue = existing[otherField];
        
        if (value === null && otherValue === null) {
          // Delete the record if both are null
          await supabase
            .from("acompanhamento_diario")
            .delete()
            .eq("data", data);
          
          setRegistros(prev => prev.filter(r => r.data !== data));
        } else {
          setRegistros(prev =>
            prev.map(r =>
              r.data === data ? { ...r, [field]: value } : r
            )
          );
        }
      } else if (value !== null) {
        // Only insert new if value is not null
        const newRecord = {
          data,
          vendas_realizadas: field === "vendas_realizadas" ? value : null,
          faturamento_realizado: field === "faturamento_realizado" ? value : null,
        };

        const { data: inserted, error } = await supabase
          .from("acompanhamento_diario")
          .insert(newRecord)
          .select()
          .single();

        if (error) throw error;

        const typedInserted = {
          ...inserted,
          vendas_realizadas: inserted.vendas_realizadas !== null ? Number(inserted.vendas_realizadas) : null,
          faturamento_realizado: inserted.faturamento_realizado !== null ? Number(inserted.faturamento_realizado) : null,
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
