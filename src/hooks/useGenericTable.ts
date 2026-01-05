import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type TableName = "indicadores" | "metas" | "detalhado" | "mkt";

export interface GenericRecord {
  id: string;
  created_at: string;
  updated_at: string;
  [key: string]: string | null;
}

export function useGenericTable(tableName: TableName, defaultValues: Record<string, string> = {}) {
  const [records, setRecords] = useState<GenericRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      let data: GenericRecord[] | null = null;
      let error: Error | null = null;

      if (tableName === "indicadores") {
        const result = await supabase.from("indicadores").select("*").order("created_at", { ascending: true });
        data = result.data as GenericRecord[] | null;
        error = result.error;
      } else if (tableName === "metas") {
        const result = await supabase.from("metas").select("*").order("created_at", { ascending: true });
        data = result.data as GenericRecord[] | null;
        error = result.error;
      } else if (tableName === "detalhado") {
        const result = await supabase.from("detalhado").select("*").order("created_at", { ascending: true });
        data = result.data as GenericRecord[] | null;
        error = result.error;
      } else if (tableName === "mkt") {
        const result = await supabase.from("mkt").select("*").order("created_at", { ascending: true });
        data = result.data as GenericRecord[] | null;
        error = result.error;
      }

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error);
      toast({
        title: "Erro ao carregar dados",
        description: `Não foi possível carregar ${tableName}.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateRecord = async (id: string, field: string, value: string) => {
    try {
      let error: Error | null = null;

      if (tableName === "indicadores") {
        const result = await supabase.from("indicadores").update({ [field]: value }).eq("id", id);
        error = result.error;
      } else if (tableName === "metas") {
        const result = await supabase.from("metas").update({ [field]: value }).eq("id", id);
        error = result.error;
      } else if (tableName === "detalhado") {
        const result = await supabase.from("detalhado").update({ [field]: value }).eq("id", id);
        error = result.error;
      } else if (tableName === "mkt") {
        const result = await supabase.from("mkt").update({ [field]: value }).eq("id", id);
        error = result.error;
      }

      if (error) throw error;

      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );

      toast({ title: "Atualizado", description: "Dados salvos." });
    } catch (error) {
      console.error(`Error updating ${tableName}:`, error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar.",
        variant: "destructive",
      });
    }
  };

  const addRecord = async () => {
    try {
      let data: GenericRecord | null = null;
      let error: Error | null = null;

      if (tableName === "indicadores") {
        const result = await supabase.from("indicadores").insert(defaultValues as Tables<"indicadores">).select().single();
        data = result.data as GenericRecord | null;
        error = result.error;
      } else if (tableName === "metas") {
        const result = await supabase.from("metas").insert(defaultValues as Tables<"metas">).select().single();
        data = result.data as GenericRecord | null;
        error = result.error;
      } else if (tableName === "detalhado") {
        const result = await supabase.from("detalhado").insert(defaultValues as Tables<"detalhado">).select().single();
        data = result.data as GenericRecord | null;
        error = result.error;
      } else if (tableName === "mkt") {
        const result = await supabase.from("mkt").insert(defaultValues as Tables<"mkt">).select().single();
        data = result.data as GenericRecord | null;
        error = result.error;
      }

      if (error) throw error;
      if (data) setRecords((prev) => [...prev, data]);
      toast({ title: "Adicionado", description: "Novo registro criado." });
    } catch (error) {
      console.error(`Error adding to ${tableName}:`, error);
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar.",
        variant: "destructive",
      });
    }
  };

  // Cria um registro com valores específicos e retorna o ID
  const createRecord = async (values: Partial<GenericRecord>): Promise<string | null> => {
    try {
      let data: GenericRecord | null = null;
      let error: Error | null = null;

      if (tableName === "detalhado") {
        const result = await supabase.from("detalhado").insert(values as Tables<"detalhado">).select().single();
        data = result.data as GenericRecord | null;
        error = result.error;
      }

      if (error) throw error;
      if (data) {
        setRecords((prev) => [...prev, data]);
        return data.id;
      }
      return null;
    } catch (error) {
      console.error(`Error creating record in ${tableName}:`, error);
      toast({
        title: "Erro ao criar",
        description: "Não foi possível criar o registro.",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      let error: Error | null = null;

      if (tableName === "indicadores") {
        const result = await supabase.from("indicadores").delete().eq("id", id);
        error = result.error;
      } else if (tableName === "metas") {
        const result = await supabase.from("metas").delete().eq("id", id);
        error = result.error;
      } else if (tableName === "detalhado") {
        const result = await supabase.from("detalhado").delete().eq("id", id);
        error = result.error;
      } else if (tableName === "mkt") {
        const result = await supabase.from("mkt").delete().eq("id", id);
        error = result.error;
      }

      if (error) throw error;
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Excluído", description: "Registro removido." });
    } catch (error) {
      console.error(`Error deleting from ${tableName}:`, error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [tableName]);

  return { records, isLoading, fetchRecords, updateRecord, addRecord, createRecord, deleteRecord };
}
