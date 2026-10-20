import { useState, useEffect, useCallback, useMemo } from "react";
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
    phone?: string;
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

// Tipo combinado: dados da API + dados editáveis do banco (igual ao Detalhado)
interface CombinedRecord {
  apiId: number;
  dbId: string | null;
  date: string; // formato DD/MM/YYYY
  patient_name: string;
  patient_phone: string | null;
  receita: string;
  visitou_loja: string;
  venda: string;
}

export interface DayMetrics {
  atendimentos: number;
  receitas: number;
  potencial: number;
  visitou_dnz: number;
  taxa_presenca: number;
  vendas: number;
  conversao: number;
  faturamento: number;
  ticket: number;
}

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const PAGE_SIZE = 1000;
const SOURCE_QUERY_TIMEOUT_MS = 30_000;

// Helper para formatar data ISO para DD/MM/YYYY
function formatDateToDDMMYYYY(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function useIndicadoresData(leads: Lead[], selectedMonths: number[], year: number) {
  const [detalhados, setDetalhados] = useState<Detalhado[]>([]);
  const [attendances, setAttendances] = useState<AmigoAttendance[]>([]);
  const [acompanhamentos, setAcompanhamentos] = useState<AcompanhamentoDiario[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingSources, setLoadingSources] = useState({ detalhado: true, acompanhamento: true, amigo: true });
  const [sourceErrors, setSourceErrors] = useState({ detalhado: null as string | null, acompanhamento: null as string | null, amigo: null as string | null });
  const isLoading = Object.values(loadingSources).some(Boolean);
  const error = Object.values(sourceErrors).filter(Boolean).join(" ") || null;
  const refresh = useCallback(() => setRefreshKey((current) => current + 1), []);

  // Buscar dados da tabela detalhado (com paginação para não truncar em 1000)
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, SOURCE_QUERY_TIMEOUT_MS);

    const fetchDetalhado = async () => {
      const allDetalhados: Detalhado[] = [];
      let from = 0;

      setLoadingSources((current) => ({ ...current, detalhado: true }));
      setSourceErrors((current) => ({ ...current, detalhado: null }));
      try {
        while (true) {
          const to = from + PAGE_SIZE - 1;
          const { data, error } = await supabase
            .from("detalhado")
            .select("*")
            .order("created_at", { ascending: true })
            .range(from, to)
            .abortSignal(controller.signal);

          if (error) throw error;

          const chunk = (data || []) as Detalhado[];
          allDetalhados.push(...chunk);

          if (chunk.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        if (!isMounted) return;
        console.log(`[useIndicadoresData] Detalhados carregados: ${allDetalhados.length}`);
        setDetalhados(allDetalhados);
      } catch (cause) {
        console.error("Erro ao buscar detalhado:", cause);
        if (isMounted) setSourceErrors((current) => ({ ...current, detalhado: timedOut ? "A consulta dos complementos demorou mais de 30 segundos. Tente novamente." : "Não foi possível carregar os complementos de atendimento." }));
      } finally {
        window.clearTimeout(timeout);
        if (isMounted) setLoadingSources((current) => ({ ...current, detalhado: false }));
      }
    };

    fetchDetalhado();

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [refreshKey]);

  // Buscar dados de acompanhamento diário (faturamento)
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, SOURCE_QUERY_TIMEOUT_MS);
    const fetchAcompanhamento = async () => {
      setLoadingSources((current) => ({ ...current, acompanhamento: true }));
      setSourceErrors((current) => ({ ...current, acompanhamento: null }));
      try {
        const { data, error } = await supabase
          .from("acompanhamento_diario")
          .select("*")
          .order("data", { ascending: true })
          .abortSignal(controller.signal);

        if (error) throw error;

        if (!isMounted) return;
        console.log(`[useIndicadoresData] Acompanhamentos carregados: ${data?.length || 0}`);
        setAcompanhamentos(data || []);
      } catch (cause) {
        console.error("[useIndicadoresData] Erro ao buscar acompanhamento:", cause);
        if (isMounted) setSourceErrors((current) => ({ ...current, acompanhamento: timedOut ? "A consulta do acompanhamento demorou mais de 30 segundos. Tente novamente." : "Não foi possível carregar o acompanhamento diário." }));
      } finally {
        window.clearTimeout(timeout);
        if (isMounted) setLoadingSources((current) => ({ ...current, acompanhamento: false }));
      }
    };

    void fetchAcompanhamento();
    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [refreshKey]);

  // Buscar atendimentos da API do Amigo para os meses selecionados
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, SOURCE_QUERY_TIMEOUT_MS);
    const fetchAttendances = async () => {
      setLoadingSources((current) => ({ ...current, amigo: true }));
      setSourceErrors((current) => ({ ...current, amigo: null }));
      try {
        if (selectedMonths.length === 0) {
          setAttendances([]);
          return;
        }
        // Calcular range de datas baseado nos meses selecionados
        const sortedMonths = [...selectedMonths].sort((a, b) => a - b);
        const firstMonth = sortedMonths[0];
        const lastMonth = sortedMonths[sortedMonths.length - 1];
        
        const startDate = `${year}-${String(firstMonth).padStart(2, "0")}-01`;
        const lastDay = new Date(year, lastMonth, 0).getDate();
        const endDate = `${year}-${String(lastMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        console.log(`[useIndicadoresData] Fetching attendances from ${startDate} to ${endDate}`);

        const { data, error } = await supabase.functions.invoke("amigo-api", {
          body: {
            action: "attendances",
            params: {
              start_date: startDate,
              end_date: endDate,
              status: "DONE",
            },
          },
          signal: controller.signal,
        });

        if (error) throw error;

        const processAttendances = (attendanceList: AmigoAttendance[]) => {
          // Filtrar apenas atendimentos da unidade SUA VISAO e dos meses selecionados
          return attendanceList.filter((att) => {
            const placeName = (att.place?.name || "").toLowerCase();
            const isValidPlace = placeName.includes("sua visao") && placeName.includes("padre pedro pinto");
            
            // Verificar se está em um dos meses selecionados
            const dateStr = att.start_date || att.date;
            if (!dateStr) return false;
            const attDate = new Date(dateStr);
            if (isNaN(attDate.getTime())) return false;
            const attMonth = attDate.getMonth() + 1;
            
            return isValidPlace && selectedMonths.includes(attMonth) && attDate.getFullYear() === year;
          });
        };

        if (!isMounted) return;
        if (data?.success && data.data?.data && Array.isArray(data.data.data)) {
          const validAttendances = processAttendances(data.data.data);
          console.log(`[useIndicadoresData] Atendimentos SUA VISAO filtrados: ${validAttendances.length}`);
          setAttendances(validAttendances);
        } else if (data?.success && Array.isArray(data.data)) {
          const validAttendances = processAttendances(data.data);
          setAttendances(validAttendances);
        } else {
          console.log("[useIndicadoresData] Resposta da API:", data);
          throw new Error("Invalid Amigo response");
        }
      } catch (cause) {
        console.error("[useIndicadoresData] Erro ao chamar API:", cause);
        if (isMounted) setSourceErrors((current) => ({ ...current, amigo: timedOut ? "A consulta ao Amigo demorou mais de 30 segundos. Tente novamente." : "Não foi possível carregar os atendimentos da unidade Sua Visão no Amigo." }));
      } finally {
        window.clearTimeout(timeout);
        if (isMounted) setLoadingSources((current) => ({ ...current, amigo: false }));
      }
    };

    void fetchAttendances();
    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedMonths, year, refreshKey]);

  // Normalizar nome para comparação (lowercase, sem espaços extras)
  const normalizeName = useCallback((name: string | null): string => {
    if (!name) return "";
    return name.toLowerCase().trim().replace(/\s+/g, " ");
  }, []);

  // Combinar dados da API com dados do banco (igual ao Detalhado)
  const combinedRecords = useMemo((): CombinedRecord[] => {
    return attendances.map(att => {
      const dateStr = att.start_date || att.date || "";
      const formattedDate = formatDateToDDMMYYYY(dateStr);
      const patientName = att.patient?.name || "";

      // Procurar registro no banco pelo nome normalizado e data
      // (igual à lógica do DetalhadoAmigoTable)
      const dbRecord = detalhados.find(db => 
        normalizeName(db.nome) === normalizeName(patientName) && db.data === formattedDate
      );

      return {
        apiId: att.id,
        dbId: dbRecord?.id || null,
        date: formattedDate,
        patient_name: patientName,
        patient_phone: att.patient?.phone || null,
        // Prioriza o valor do banco (igual ao Detalhado)
        receita: dbRecord?.receita || "",
        visitou_loja: dbRecord?.visitou_loja || "",
        venda: dbRecord?.venda || "",
      };
    });
  }, [attendances, detalhados, normalizeName]);

  // Função auxiliar para normalizar data no formato DD/MM/YYYY
  const parseDate = useCallback((dateStr: string | null): { day: number; month: number; year: number } | null => {
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
  }, []);

  // Helper: criar chave de data no formato usado pela aba Metas (ex: "05/jan", "15/jan")
  const getAcompanhamentoDateKey = useCallback((day: number, month: number): string => {
    const monthAbbrev = MONTH_NAMES[month - 1];
    return `${String(day).padStart(2, "0")}/${monthAbbrev}`;
  }, []);

  // Filtrar leads "Sua Visão" com orçamento "Sim" por dia
  const getLeadsSuaVisaoOrcamentoForDay = useCallback((day: number, month: number): number => {
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    const dateKey = `${dayStr}/${monthStr}/${year}`;

    return leads.filter(lead => {
      const canal = (lead.canal || "").toLowerCase().trim();
      const orcamento = (lead.orcamento || "").toLowerCase().trim();
      return canal.includes("sua vis") && orcamento === "sim" && lead.data_registro === dateKey;
    }).length;
  }, [leads, year]);

  // Calcular métricas para um dia específico de um mês específico
  const getMetricsForDay = useCallback((day: number, month: number): DayMetrics => {
    // Filtrar registros combinados para este dia
    const dayCombinedRecords = combinedRecords.filter(record => {
      const parsedDate = parseDate(record.date);
      if (!parsedDate) return false;
      return parsedDate.day === day && 
             parsedDate.month === month && 
             parsedDate.year === year;
    });
    
    // ATENDIMENTOS = Total de registros da API para o dia
    const atendimentos = dayCombinedRecords.length;

    // RECEITAS = registros com receita = "sim" (usando dados combinados)
    const receitas = dayCombinedRecords.filter(r => 
      r.receita?.toLowerCase().trim() === "sim"
    ).length;

    // POTENCIAL (%) = Receitas / Atendimentos
    const potencial = atendimentos > 0 ? (receitas / atendimentos) * 100 : 0;

    // LEADS COM ORÇAMENTO = leads do canal "Sua Visão" com orçamento "Sim" no dia
    const visitou_dnz = getLeadsSuaVisaoOrcamentoForDay(day, month);

    // VENDAS = registros com venda = "sim"
    const vendas = dayCombinedRecords.filter(r => 
      r.venda?.toLowerCase().trim() === "sim"
    ).length;

    // CONVERSÃO (%) = Vendas / Leads com orçamento
    const conversao = visitou_dnz > 0 ? (vendas / visitou_dnz) * 100 : 0;

    // FATURAMENTO - da aba METAS (acompanhamento_diario)
    // Suporta dois formatos de chave: "DD/mmm" (legado) e "YYYY-MM-DD" (ISO)
    const dateKeyLegacy = getAcompanhamentoDateKey(day, month);
    const dateKeyISO = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const acompanhamento = acompanhamentos.find(
      (a) => a.data === dateKeyLegacy || a.data === dateKeyISO
    );
    const faturamento = acompanhamento?.faturamento_realizado ?? 0;

    // TICKET MÉDIO = Faturamento / Vendas
    const ticket = vendas > 0 ? faturamento / vendas : 0;

    // TAXA DE PRESENÇA (%) = Leads com orçamento / Receitas
    const taxa_presenca = receitas > 0 ? (visitou_dnz / receitas) * 100 : 0;

    return {
      atendimentos,
      receitas,
      potencial,
      visitou_dnz,
      taxa_presenca,
      vendas,
      conversao,
      faturamento,
      ticket,
    };
  }, [combinedRecords, acompanhamentos, year, parseDate, getAcompanhamentoDateKey, getLeadsSuaVisaoOrcamentoForDay]);

  return {
    isLoading,
    error,
    refresh,
    attendances,
    detalhados,
    acompanhamentos,
    getMetricsForDay,
  };
}
