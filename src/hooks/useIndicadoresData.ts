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
  obs: string | null;
}

interface AmigoAttendance {
  id: number;
  start_date: string;
  canceled: boolean;
  status: string;
  agenda_event?: {
    id: number;
    name: string;
  };
  patient?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    name: string;
  };
}

interface DayMetrics {
  atendimentos: number;
  consultas: number;
  receitas: number;
  potencial: number;
  visitou_dnz: number;
  comparecimento: number;
  vendas: number;
  conversao: number;
  faturamento: number;
  ticket: number;
}

// Tipos de eventos a excluir para ATENDIMENTOS
const EXCLUDE_ATENDIMENTOS = [
  "cirurgia",
  "exames complementares",
];

// Tipos de eventos a excluir para CONSULTAS (além dos de atendimentos)
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

      setDetalhados(data || []);
    };

    fetchDetalhado();
  }, []);

  // Buscar atendimentos da API do Amigo para o mês selecionado
  useEffect(() => {
    const fetchAttendances = async () => {
      setIsLoading(true);
      try {
        // Primeiro e último dia do mês
        const startDate = `${year}-${String(selectedMonth).padStart(2, "0")}-01`;
        const lastDay = new Date(year, selectedMonth, 0).getDate();
        const endDate = `${year}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const { data, error } = await supabase.functions.invoke("amigo-api", {
          body: {
            action: "attendances",
            params: {
              start_date: startDate,
              end_date: endDate,
            },
          },
        });

        if (error) {
          console.error("Erro ao buscar atendimentos:", error);
          return;
        }

        if (data?.success && data.data?.data && Array.isArray(data.data.data)) {
          // Filtrar apenas atendimentos não cancelados
          const validAttendances = data.data.data.filter((att: AmigoAttendance) => !att.canceled);
          console.log(`Atendimentos carregados: ${validAttendances.length}`);
          setAttendances(validAttendances);
        } else if (data?.success && Array.isArray(data.data)) {
          setAttendances(data.data.filter((att: AmigoAttendance) => !att.canceled));
        } else {
          console.log("Resposta da API:", data);
          setAttendances([]);
        }
      } catch (error) {
        console.error("Erro ao chamar API:", error);
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
  const shouldExcludeFromAtendimentos = (eventName: string): boolean => {
    const normalizedName = eventName.toLowerCase().trim();
    return EXCLUDE_ATENDIMENTOS.some(exclude => 
      normalizedName.includes(exclude.toLowerCase())
    );
  };

  const shouldExcludeFromConsultas = (eventName: string): boolean => {
    const normalizedName = eventName.toLowerCase().trim();
    return EXCLUDE_CONSULTAS.some(exclude => 
      normalizedName.includes(exclude.toLowerCase())
    );
  };

  // Calcular métricas para um dia específico
  const getMetricsForDay = (day: number): DayMetrics => {
    // ATENDIMENTOS - da API do Amigo, excluindo cirurgias e exames complementares
    const dayAttendances = attendances.filter((att) => {
      // Parsear start_date no formato ISO
      const attDate = new Date(att.start_date);
      if (isNaN(attDate.getTime())) return false;
      return attDate.getDate() === day && 
             (attDate.getMonth() + 1) === selectedMonth && 
             attDate.getFullYear() === year;
    });
    
    const eventName = (att: AmigoAttendance) => att.agenda_event?.name || "";
    const atendimentos = dayAttendances.filter(att => !shouldExcludeFromAtendimentos(eventName(att))).length;

    // CONSULTAS - da API do Amigo, excluindo cirurgias, exames, mapeamento, ishihara, teste ortóptico
    const consultas = dayAttendances.filter(att => !shouldExcludeFromConsultas(eventName(att))).length;

    // RECEITAS - da aba DETALHADO, onde receita = "sim"
    const dayDetalhados = detalhados.filter((det) => {
      const detDate = parseDate(det.data);
      if (!detDate) return false;
      return detDate.day === day && detDate.month === selectedMonth && detDate.year === year;
    });
    const receitas = dayDetalhados.filter(det => 
      det.receita?.toLowerCase().trim() === "sim"
    ).length;

    // POTENCIAL (%) = Receitas / Consultas
    const potencial = consultas > 0 ? (receitas / consultas) * 100 : 0;

    // VISITOU DNZ - da aba LEADS, canal "Sua Visão", onde orcamento = "sim"
    const dayLeadsSuaVisao = leads.filter((lead) => {
      const leadDate = parseDate(lead.data_registro);
      if (!leadDate) return false;
      const isSuaVisao = lead.canal?.toLowerCase().trim() === "sua visão";
      return leadDate.day === day && leadDate.month === selectedMonth && leadDate.year === year && isSuaVisao;
    });
    const visitou_dnz = dayLeadsSuaVisao.filter(lead => 
      lead.orcamento?.toLowerCase().trim() === "sim"
    ).length;

    // COMPARECIMENTO (%) = Visitou DNZ / Receitas
    const comparecimento = receitas > 0 ? (visitou_dnz / receitas) * 100 : 0;

    // VENDAS - da aba LEADS, canal "Sua Visão", onde venda = "Sim"
    const vendas = dayLeadsSuaVisao.filter(lead => 
      lead.venda?.toLowerCase().trim() === "sim"
    ).length;

    // CONVERSÃO (%) = Vendas / Comparecimento (usando visitou_dnz como comparecimento)
    const conversao = visitou_dnz > 0 ? (vendas / visitou_dnz) * 100 : 0;

    // FATURAMENTO e TICKET MÉDIO - deixar em branco
    const faturamento = 0;
    const ticket = 0;

    return {
      atendimentos,
      consultas,
      receitas,
      potencial,
      visitou_dnz,
      comparecimento,
      vendas,
      conversao,
      faturamento,
      ticket,
    };
  };

  // Métricas para LOJA
  const getLojaMetricsForDay = (day: number) => {
    const dayLeads = leads.filter((lead) => {
      const leadDate = parseDate(lead.data_registro);
      if (!leadDate) return false;
      const isLoja = lead.canal?.toLowerCase().trim() === "loja";
      return leadDate.day === day && leadDate.month === selectedMonth && leadDate.year === year && isLoja;
    });

    const visitas = dayLeads.length;
    const vendas = dayLeads.filter(lead => lead.venda?.toLowerCase().trim() === "sim").length;
    const conversao = visitas > 0 ? (vendas / visitas) * 100 : 0;
    const faturamento = 0;
    const ticket = 0;

    return { visitas, vendas, conversao, faturamento, ticket };
  };

  // Métricas para MKT (Internet)
  const getMktMetricsForDay = (day: number) => {
    const dayLeads = leads.filter((lead) => {
      const leadDate = parseDate(lead.data_registro);
      if (!leadDate) return false;
      const isMkt = lead.canal?.toLowerCase().trim() === "internet";
      return leadDate.day === day && leadDate.month === selectedMonth && leadDate.year === year && isMkt;
    });

    const leadsCount = dayLeads.length;
    const vendas = dayLeads.filter(lead => lead.venda?.toLowerCase().trim() === "sim").length;
    const conversao = leadsCount > 0 ? (vendas / leadsCount) * 100 : 0;
    const faturamento = 0;
    const ticket = 0;
    const investimento = 0;
    const cac = 0;

    return { leads: leadsCount, vendas, conversao, faturamento, ticket, investimento, cac };
  };

  return {
    isLoading,
    attendances,
    detalhados,
    getMetricsForDay,
    getLojaMetricsForDay,
    getMktMetricsForDay,
  };
}
