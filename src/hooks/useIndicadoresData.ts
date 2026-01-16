import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "./useLeads";

interface Detalhado {
  id: string;
  data: string | null;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  como_conheceu: string | null;
  receita: string | null;
  visitou_loja: string | null;
  venda: string | null;
  obs: string | null;
}

interface AmigoAttendance {
  id: number;
  start_date?: string;
  date?: string;
  canceled?: boolean;
  status: string;
  agenda_event?: {
    id: number;
    name: string;
  };
  patient?: {
    id: number;
    name: string;
  };
  place?: {
    id: number;
    name: string;
  };
}

interface AcompanhamentoDiario {
  id: string;
  data: string;
  vendas_realizadas: number | null;
  faturamento_realizado: number | null;
}

interface DayMetrics {
  atendimentos: number;
  receitas: number;
  potencial: number;
  visitou_dnz: number;
  vendas: number;
  conversao: number;
  faturamento: number;
  ticket: number;
}

// Tipos de eventos a excluir para contagem de consultas (atendimentos)
const EXCLUDE_CONSULTAS = [
  "cirurgia",
  "exames complementares",
  "mapeamento de retina",
  "ishihara",
  "teste ortóptico",
];

export function useIndicadoresData(leads: Lead[], selectedMonth: number, year: number) {
  const [detalhados, setDetalhados] = useState<Detalhado[]>([]);
  const [attendances, setAttendances] = useState<AmigoAttendance[]>([]);
  const [acompanhamentos, setAcompanhamentos] = useState<AcompanhamentoDiario[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Buscar dados da tabela detalhado
  useEffect(() => {
    const fetchDetalhado = async () => {
      const { data, error } = await supabase
        .from("detalhado")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao buscar detalhado:", error);
        return;
      }

      console.log(`[useIndicadoresData] Detalhados carregados: ${data?.length || 0}`);
      setDetalhados(data || []);
    };

    fetchDetalhado();
  }, []);

  // Buscar dados de acompanhamento diário (faturamento)
  useEffect(() => {
    const fetchAcompanhamento = async () => {
      const { data, error } = await supabase
        .from("acompanhamento_diario")
        .select("*")
        .order("data", { ascending: true });

      if (error) {
        console.error("[useIndicadoresData] Erro ao buscar acompanhamento:", error);
        return;
      }

      console.log(`[useIndicadoresData] Acompanhamentos carregados: ${data?.length || 0}`);
      setAcompanhamentos(data || []);
    };

    fetchAcompanhamento();
  }, []);

  // Buscar atendimentos da API do Amigo para o mês selecionado (igual à aba Detalhado)
  useEffect(() => {
    const fetchAttendances = async () => {
      setIsLoading(true);
      try {
        // Primeiro e último dia do mês
        const startDate = `${year}-${String(selectedMonth).padStart(2, "0")}-01`;
        const lastDay = new Date(year, selectedMonth, 0).getDate();
        const endDate = `${year}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        console.log(`[useIndicadoresData] Fetching attendances from ${startDate} to ${endDate}`);

        const { data, error } = await supabase.functions.invoke("amigo-api", {
          body: {
            action: "attendances",
            params: {
              start_date: startDate,
              end_date: endDate,
              status: "DONE", // Apenas atendimentos finalizados (igual à aba Detalhado)
            },
          },
        });

        if (error) {
          console.error("[useIndicadoresData] Erro ao buscar atendimentos:", error);
          return;
        }

        if (data?.success && data.data?.data && Array.isArray(data.data.data)) {
          // Filtrar apenas atendimentos da unidade SUA VISAO (igual à aba Detalhado)
          const validAttendances = data.data.data.filter((att: any) => {
            const placeName = (att.place?.name || "").toLowerCase();
            return placeName.includes("sua visao") && placeName.includes("padre pedro pinto");
          });
          console.log(`[useIndicadoresData] Atendimentos SUA VISAO filtrados: ${validAttendances.length}`);
          setAttendances(validAttendances);
        } else if (data?.success && Array.isArray(data.data)) {
          const validAttendances = data.data.filter((att: any) => {
            const placeName = (att.place?.name || "").toLowerCase();
            return placeName.includes("sua visao") && placeName.includes("padre pedro pinto");
          });
          setAttendances(validAttendances);
        } else {
          console.log("[useIndicadoresData] Resposta da API:", data);
          setAttendances([]);
        }
      } catch (error) {
        console.error("[useIndicadoresData] Erro ao chamar API:", error);
        setAttendances([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendances();
  }, [selectedMonth, year]);

  // Função auxiliar para normalizar data no formato DD/MM/YYYY
  const parseDate = (dateStr: string | null): { day: number; month: number; year: number } | null => {
    if (!dateStr) return null;
    
    // Tenta parsear DD/MM/YYYY
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return {
        day: parseInt(parts[0]),
        month: parseInt(parts[1]),
        year: parseInt(parts[2]),
      };
    }
    
    // Tenta parsear YYYY-MM-DD
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return {
        day: parseInt(isoMatch[3]),
        month: parseInt(isoMatch[2]),
        year: parseInt(isoMatch[1]),
      };
    }
    
    return null;
  };

  // Função para verificar se um atendimento deve ser excluído
  const shouldExcludeFromConsultas = (eventName: string): boolean => {
    const normalizedName = eventName.toLowerCase().trim();
    return EXCLUDE_CONSULTAS.some(exclude => 
      normalizedName.includes(exclude.toLowerCase())
    );
  };

  // Helper: criar chave de data no formato usado pela aba Metas (ex: "05/jan", "15/jan")
  const getAcompanhamentoDateKey = (day: number): string => {
    const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const monthAbbrev = monthNames[selectedMonth - 1];
    return `${String(day).padStart(2, "0")}/${monthAbbrev}`;
  };

  // Calcular métricas para um dia específico
  const getMetricsForDay = (day: number): DayMetrics => {
    // ATENDIMENTOS (Consultas) - da API do Amigo (Detalhado), excluindo eventos específicos
    const dayAttendances = attendances.filter((att) => {
      const dateStr = att.start_date || att.date;
      if (!dateStr) return false;
      const attDate = new Date(dateStr);
      if (isNaN(attDate.getTime())) return false;
      return attDate.getDate() === day && 
             (attDate.getMonth() + 1) === selectedMonth && 
             attDate.getFullYear() === year;
    });
    
    const eventName = (att: AmigoAttendance) => att.agenda_event?.name || "";
    const atendimentos = dayAttendances.filter(att => !shouldExcludeFromConsultas(eventName(att))).length;

    // RECEITAS - da aba DETALHADO (banco de dados), onde receita = "sim"
    const dayDetalhados = detalhados.filter((det) => {
      const detDate = parseDate(det.data);
      if (!detDate) return false;
      return detDate.day === day && detDate.month === selectedMonth && detDate.year === year;
    });
    const receitas = dayDetalhados.filter(det => 
      det.receita?.toLowerCase().trim() === "sim"
    ).length;

    // POTENCIAL (%) = Receitas / Atendimentos
    const potencial = atendimentos > 0 ? (receitas / atendimentos) * 100 : 0;

    // VISITOU DNZ - da aba DETALHADO, onde visitou_loja = "sim"
    const visitou_dnz = dayDetalhados.filter(det => 
      det.visitou_loja?.toLowerCase().trim() === "sim"
    ).length;

    // VENDAS - da aba DETALHADO, onde venda = "sim"
    const vendas = dayDetalhados.filter(det => 
      det.venda?.toLowerCase().trim() === "sim"
    ).length;

    // CONVERSÃO (%) = Vendas / Visitou DNZ
    const conversao = visitou_dnz > 0 ? (vendas / visitou_dnz) * 100 : 0;

    // FATURAMENTO - da aba METAS (acompanhamento_diario)
    const dateKey = getAcompanhamentoDateKey(day);
    const acompanhamento = acompanhamentos.find(a => a.data === dateKey);
    const faturamento = acompanhamento?.faturamento_realizado ?? 0;

    // TICKET MÉDIO = Faturamento / Vendas
    const ticket = vendas > 0 ? faturamento / vendas : 0;

    return {
      atendimentos,
      receitas,
      potencial,
      visitou_dnz,
      vendas,
      conversao,
      faturamento,
      ticket,
    };
  };

  return {
    isLoading,
    attendances,
    detalhados,
    acompanhamentos,
    getMetricsForDay,
  };
}
