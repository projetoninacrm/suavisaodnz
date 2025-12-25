import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Lead {
  id: string;
  data_registro: string | null;
  canal: string | null;
  nome: string | null;
  numero: string | null;
  orcamento: string | null;
  venda: string | null;
  entrar_em_contato: string | null;
  medico: string | null;
  obs: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewLeadData {
  data_registro: string;
  canal: string;
  nome: string;
  numero: string;
  orcamento: string;
  venda: string;
  entrar_em_contato: string;
  medico: string;
  obs: string;
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("data_registro", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os leads.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateLead = async (id: string, field: keyof Lead, value: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;

      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
      );

      toast({ title: "Atualizado", description: "Dados salvos." });
    } catch (error) {
      console.error("Error updating lead:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar.",
        variant: "destructive",
      });
    }
  };

  const addLead = async (leadData: NewLeadData) => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .insert(leadData)
        .select()
        .single();

      if (error) throw error;
      setLeads((prev) => [...prev, data]);
      toast({ title: "Adicionado", description: "Novo lead criado com sucesso!" });
    } catch (error) {
      console.error("Error adding lead:", error);
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar o lead.",
        variant: "destructive",
      });
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      setLeads((prev) => prev.filter((l) => l.id !== id));
      toast({ title: "Excluído", description: "Lead removido." });
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return { leads, isLoading, fetchLeads, updateLead, addLead, deleteLead };
}
