import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ACCOMPANHAMENTO_QUERY_TIMEOUT_MS = 30_000;
const ACCOMPANHAMENTO_QUERY_TIMEOUT_MESSAGE = "A consulta do acompanhamento demorou mais de 30 segundos. Tente novamente.";

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
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const requestIdRef = useRef(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  const fetchRegistros = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ACCOMPANHAMENTO_QUERY_TIMEOUT_MS);
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("acompanhamento_diario")
        .select("*")
        .order("data", { ascending: true })
        .abortSignal(controller.signal);

      if (error) throw error;
      if (requestId !== requestIdRef.current) return;
      
      // Cast the data to the correct type, preserving null values
      const typedData = (data || []).map(item => ({
        ...item,
        vendas_realizadas: item.vendas_realizadas !== null ? Number(item.vendas_realizadas) : null,
        faturamento_realizado: item.faturamento_realizado !== null ? Number(item.faturamento_realizado) : null,
      })) as AcompanhamentoDiario[];
      
      setRegistros(typedData);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error("Error fetching acompanhamento diario:", error);
      setError(timedOut ? ACCOMPANHAMENTO_QUERY_TIMEOUT_MESSAGE : "Não foi possível carregar o acompanhamento diário. Tente novamente.");
      toast({
        title: "Erro ao carregar dados",
        description: timedOut ? ACCOMPANHAMENTO_QUERY_TIMEOUT_MESSAGE : "Não foi possível carregar o acompanhamento diário.",
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

  const upsertRegistro = useCallback(async (data: string, field: "vendas_realizadas" | "faturamento_realizado", value: number | null): Promise<boolean> => {
    try {
      // Check if record exists
      const { data: existing, error: lookupError } = await supabase
        .from("acompanhamento_diario")
        .select("*")
        .eq("data", data)
        .maybeSingle();
      if (lookupError) throw lookupError;

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
          const { error: deleteError } = await supabase
            .from("acompanhamento_diario")
            .delete()
            .eq("data", data);
          if (deleteError) throw deleteError;
          
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
      } else {
        return true;
      }

      toast({
        title: "Salvo",
        description: "Valor atualizado com sucesso.",
      });
      return true;
    } catch (error) {
      console.error("Error upserting acompanhamento:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o valor.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    void fetchRegistros();
    return () => {
      requestIdRef.current += 1;
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
    };
  }, [fetchRegistros]);

  return {
    registros,
    isLoading,
    error,
    fetchRegistros,
    upsertRegistro,
  };
}
