import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Anuncio {
  id: string;
  tipo: "DNZ" | "SV";
  ano: number;
  mes: string;
  plataforma: string;
  cliques: number;
  leads: number;
  conversao: number;
  investimento: number;
  custo_por_lead: number;
  pacientes: number;
  percentual: number;
  cac: number;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedMetrics {
  plataforma: string;
  cliques: number;
  leads: number;
  conversao: number;
  investimento: number;
  custo_por_lead: number;
  pacientes: number;
  percentual: number;
  cac: number;
}

const MESES = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
];

export function useAnuncios(tipo: "DNZ" | "SV") {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear());
  const [selectedMes, setSelectedMes] = useState(MESES[new Date().getMonth()]);
  const { toast } = useToast();

  const fetchAnuncios = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("anuncios")
        .select("*")
        .eq("tipo", tipo)
        .eq("ano", selectedAno)
        .eq("mes", selectedMes)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setAnuncios((data as Anuncio[]) || []);
    } catch (error) {
      console.error("Error fetching anuncios:", error);
      toast({
        title: "Erro ao carregar anúncios",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [tipo, selectedAno, selectedMes, toast]);

  useEffect(() => {
    fetchAnuncios();
  }, [fetchAnuncios]);

  const extractMetricsFromImage = async (imageBase64: string): Promise<ExtractedMetrics[]> => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-ad-metrics", {
        body: { imageBase64 },
      });

      if (error) throw error;

      if (data?.success && data.metrics) {
        return data.metrics;
      }
      return [];
    } catch (error) {
      console.error("Error extracting metrics:", error);
      toast({
        title: "Erro ao extrair métricas",
        description: "Não foi possível analisar a imagem.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsExtracting(false);
    }
  };

  const saveMetrics = async (metrics: ExtractedMetrics[]) => {
    try {
      // Delete existing records for this month/year/type
      await supabase
        .from("anuncios")
        .delete()
        .eq("tipo", tipo)
        .eq("ano", selectedAno)
        .eq("mes", selectedMes);

      // Insert new records
      const records = metrics.map((m) => ({
        tipo,
        ano: selectedAno,
        mes: selectedMes,
        plataforma: m.plataforma,
        cliques: m.cliques || 0,
        leads: m.leads || 0,
        conversao: m.conversao || 0,
        investimento: m.investimento || 0,
        custo_por_lead: m.custo_por_lead || 0,
        pacientes: m.pacientes || 0,
        percentual: m.percentual || 0,
        cac: m.cac || 0,
      }));

      const { error } = await supabase.from("anuncios").insert(records);
      if (error) throw error;

      toast({
        title: "Métricas salvas",
        description: `${metrics.length} registro(s) importado(s) com sucesso.`,
      });

      fetchAnuncios();
    } catch (error) {
      console.error("Error saving metrics:", error);
      toast({
        title: "Erro ao salvar métricas",
        description: "Não foi possível salvar os dados.",
        variant: "destructive",
      });
    }
  };

  const updateAnuncio = async (id: string, field: string, value: string | number) => {
    try {
      const numericFields = ["cliques", "leads", "conversao", "investimento", "custo_por_lead", "pacientes", "percentual", "cac"];
      const finalValue = numericFields.includes(field) ? parseFloat(String(value)) || 0 : value;

      const { error } = await supabase
        .from("anuncios")
        .update({ [field]: finalValue, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setAnuncios((prev) =>
        prev.map((a) => (a.id === id ? { ...a, [field]: finalValue } : a))
      );
    } catch (error) {
      console.error("Error updating anuncio:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar a alteração.",
        variant: "destructive",
      });
    }
  };

  const deleteAnuncio = async (id: string) => {
    try {
      const { error } = await supabase.from("anuncios").delete().eq("id", id);
      if (error) throw error;
      setAnuncios((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Error deleting anuncio:", error);
      toast({
        title: "Erro ao excluir",
        variant: "destructive",
      });
    }
  };

  const addManualRow = async () => {
    try {
      const { error } = await supabase.from("anuncios").insert({
        tipo,
        ano: selectedAno,
        mes: selectedMes,
        plataforma: "NOVA",
        cliques: 0,
        leads: 0,
        conversao: 0,
        investimento: 0,
        custo_por_lead: 0,
        pacientes: 0,
        percentual: 0,
        cac: 0,
      });
      if (error) throw error;
      fetchAnuncios();
    } catch (error) {
      console.error("Error adding row:", error);
    }
  };

  return {
    anuncios,
    isLoading,
    isExtracting,
    selectedAno,
    selectedMes,
    setSelectedAno,
    setSelectedMes,
    fetchAnuncios,
    extractMetricsFromImage,
    saveMetrics,
    updateAnuncio,
    deleteAnuncio,
    addManualRow,
    MESES,
  };
}
