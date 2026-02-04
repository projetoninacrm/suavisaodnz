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

export interface ExtractedRawMetrics {
  investimento: number;
  mensagens: number;
  cliques: number;
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

  const extractMetricsFromImage = async (imageBase64: string): Promise<ExtractedRawMetrics | null> => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-ad-metrics", {
        body: { imageBase64 },
      });

      if (error) throw error;

      if (data?.success && data.rawMetrics) {
        return data.rawMetrics;
      }
      return null;
    } catch (error) {
      console.error("Error extracting metrics:", error);
      toast({
        title: "Erro ao extrair métricas",
        description: "Não foi possível analisar a imagem.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsExtracting(false);
    }
  };

  const savePlatformMetrics = async (plataforma: "META" | "GOOGLE", rawMetrics: ExtractedRawMetrics) => {
    try {
      // Calculate derived metrics
      // Conversão = leads / cliques (leads = mensagens in this context)
      // CPL = investimento / mensagens
      const leads = rawMetrics.mensagens || 0;
      const cliques = rawMetrics.cliques || 0;
      const investimento = rawMetrics.investimento || 0;
      
      const conversao = cliques > 0 ? (leads / cliques) * 100 : 0;
      const custo_por_lead = leads > 0 ? investimento / leads : 0;

      // Check if record exists for this platform/month/year
      const { data: existing } = await supabase
        .from("anuncios")
        .select("id")
        .eq("tipo", tipo)
        .eq("ano", selectedAno)
        .eq("mes", selectedMes)
        .eq("plataforma", plataforma)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("anuncios")
          .update({
            cliques,
            leads,
            conversao: parseFloat(conversao.toFixed(2)),
            investimento,
            custo_por_lead: parseFloat(custo_por_lead.toFixed(2)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from("anuncios").insert({
          tipo,
          ano: selectedAno,
          mes: selectedMes,
          plataforma,
          cliques,
          leads,
          conversao: parseFloat(conversao.toFixed(2)),
          investimento,
          custo_por_lead: parseFloat(custo_por_lead.toFixed(2)),
          pacientes: 0,
          percentual: 0,
          cac: 0,
        });
        if (error) throw error;
      }

      toast({
        title: "Métricas salvas",
        description: `Dados de ${plataforma} importados com sucesso.`,
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

      // Get current record to calculate derived fields
      const currentRecord = anuncios.find(a => a.id === id);
      if (!currentRecord) return;

      let updates: Record<string, unknown> = { 
        [field]: finalValue, 
        updated_at: new Date().toISOString() 
      };

      // If pacientes is being updated, recalculate percentual and CAC
      if (field === "pacientes") {
        const pacientes = finalValue as number;
        const leads = currentRecord.leads || 0;
        const investimento = currentRecord.investimento || 0;
        
        // % Conversão = (pacientes / leads) * 100
        const percentual = leads > 0 ? (pacientes / leads) * 100 : 0;
        // CAC = investimento / pacientes
        const cac = pacientes > 0 ? investimento / pacientes : 0;
        
        updates = {
          ...updates,
          percentual: parseFloat(percentual.toFixed(2)),
          cac: parseFloat(cac.toFixed(2)),
        };
      }

      // If leads or investimento changes, recalculate derived fields
      if (field === "leads" || field === "investimento") {
        const leads = field === "leads" ? (finalValue as number) : currentRecord.leads || 0;
        const investimento = field === "investimento" ? (finalValue as number) : currentRecord.investimento || 0;
        const pacientes = currentRecord.pacientes || 0;
        
        // Recalculate conversao (leads/cliques) and custo_por_lead
        const cliques = currentRecord.cliques || 0;
        const conversao = cliques > 0 ? (leads / cliques) * 100 : 0;
        const custo_por_lead = leads > 0 ? investimento / leads : 0;
        
        // Recalculate percentual and CAC
        const percentual = leads > 0 ? (pacientes / leads) * 100 : 0;
        const cac = pacientes > 0 ? investimento / pacientes : 0;
        
        updates = {
          ...updates,
          conversao: parseFloat(conversao.toFixed(2)),
          custo_por_lead: parseFloat(custo_por_lead.toFixed(2)),
          percentual: parseFloat(percentual.toFixed(2)),
          cac: parseFloat(cac.toFixed(2)),
        };
      }

      // If cliques changes, recalculate conversao
      if (field === "cliques") {
        const cliques = finalValue as number;
        const leads = currentRecord.leads || 0;
        const conversao = cliques > 0 ? (leads / cliques) * 100 : 0;
        
        updates = {
          ...updates,
          conversao: parseFloat(conversao.toFixed(2)),
        };
      }

      const { error } = await supabase
        .from("anuncios")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setAnuncios((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
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
    savePlatformMetrics,
    updateAnuncio,
    deleteAnuncio,
    addManualRow,
    MESES,
  };
}
