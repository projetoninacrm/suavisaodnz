import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useRouteState } from "@/hooks/useRouteState";
import { useLocation } from "react-router-dom";

// Unidade específica para filtrar
const TARGET_PLACE = "SUA VISÃO OFTALMOLOGIA – Rua Padre Pedro Pinto, 1595 – Loja 05 – Em frente à Caixa Econômica";
const ATTENDANCES_QUERY_TIMEOUT_MS = 30_000;
const ATTENDANCES_QUERY_TIMEOUT_MESSAGE = "A consulta ao Amigo demorou mais de 30 segundos. Tente novamente.";

interface AttendanceRangeState { start: string; end: string }

function parseLocalDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function defaultAttendanceRange(): AttendanceRangeState {
  const today = new Date();
  return {
    start: format(startOfMonth(today), "yyyy-MM-dd"),
    end: format(endOfMonth(today), "yyyy-MM-dd"),
  };
}

function parseAttendanceRange(value: unknown): AttendanceRangeState {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const range = value as Partial<AttendanceRangeState>;
    const start = parseLocalDate(range.start);
    const end = parseLocalDate(range.end);
    if (start && end && start <= end) return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") };
  }
  return defaultAttendanceRange();
}

export interface AmigoAttendance {
  id: string;
  date: string;
  time: string;
  patient_name: string;
  patient_phone: string | null;
  patient_email: string | null;
  patient_know_by: string | null;
  patient_age: number | null;
  event_name: string;
  doctor_name: string | null;
  place_name: string | null;
  status: string;
}

interface AmigoApiAttendance {
  id?: string | number;
  start_date?: string;
  date?: string;
  status?: string | null;
  place?: { name?: string | null } | null;
  patient?: {
    name?: string | null;
    contact_cellphone?: string | null;
    contact_phone?: string | null;
    cellphone?: string | null;
    contact_email?: string | null;
    email?: string | null;
    know_by?: string | null;
    born?: string | null;
  } | null;
  agenda_event?: { name?: string | null } | null;
  event?: { name?: string | null } | null;
  doctor?: { name?: string | null } | null;
  user?: { name?: string | null } | null;
}

const formatPhone = (phone: string | null): string | null => {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const getPatientAge = (born?: string, referenceDate?: string): number | null => {
  if (!born) return null;

  const birthDate = new Date(born);
  const baseDate = referenceDate ? new Date(referenceDate) : new Date();

  if (Number.isNaN(birthDate.getTime()) || Number.isNaN(baseDate.getTime())) {
    return null;
  }

  let age = baseDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = baseDate.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && baseDate.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
};

const formatDate = (isoDate?: string): string => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "dd/MM/yyyy");
};

const formatTime = (isoDate?: string): string => {
  if (!isoDate) return "";
  // A API Amigo retorna horários locais (BRT) — extrair direto da string ISO
  // para evitar conversão de timezone do navegador
  const timeMatch = isoDate.match(/T(\d{2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1]}:${timeMatch[2]}`;
  }
  // Fallback para parsing normal
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "HH:mm");
};

export function useDetalhadoAmigo() {
  const location = useLocation();
  const [attendances, setAttendances] = useState<AmigoAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedDateRange, setLoadedDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const requestIdRef = useRef(0);
  const activeControllerRef = useRef<AbortController | null>(null);
  const [rangeState, setRangeState] = useRouteState("atendimentosRange", defaultAttendanceRange, parseAttendanceRange);
  const routeState = location.state && typeof location.state === "object" && !Array.isArray(location.state)
    ? location.state as Record<string, unknown>
    : {};
  const hasSavedRange = Object.prototype.hasOwnProperty.call(routeState, "atendimentosRange");
  const dateRange = useMemo(() => ({
    start: parseLocalDate(rangeState.start) ?? startOfMonth(new Date()),
    end: parseLocalDate(rangeState.end) ?? endOfMonth(new Date()),
  }), [rangeState.end, rangeState.start]);

  useEffect(() => {
    if (!hasSavedRange) setRangeState(rangeState);
  }, [hasSavedRange, rangeState, setRangeState]);

  const fetchAttendances = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ATTENDANCES_QUERY_TIMEOUT_MS);
    const requestedDateRange = {
      start: new Date(dateRange.start),
      end: new Date(dateRange.end),
    };
    setIsLoading(true);
    setError(null);
    try {
      // Garantia extra contra "Invalid time value"
      if (Number.isNaN(requestedDateRange.start?.getTime?.()) || Number.isNaN(requestedDateRange.end?.getTime?.())) {
        throw new Error("Período inválido. Selecione novamente.");
      }

      const startDate = format(requestedDateRange.start, "yyyy-MM-dd");
      const endDate = format(requestedDateRange.end, "yyyy-MM-dd");

      console.log(`[useDetalhadoAmigo] Fetching attendances from ${startDate} to ${endDate}`);

      const { data, error } = await supabase.functions.invoke("amigo-api", {
        body: {
          action: "attendances",
          params: {
            start_date: startDate,
            end_date: endDate,
            status: "DONE", // Apenas atendimentos finalizados/concluídos
          },
        },
        signal: controller.signal,
      });

      if (error) {
        console.error("[useDetalhadoAmigo] Error:", error);
        if (requestId !== requestIdRef.current) return;
        const message = timedOut
          ? ATTENDANCES_QUERY_TIMEOUT_MESSAGE
          : "Não foi possível carregar os atendimentos do Amigo. Tente novamente.";
        toast.error(timedOut ? "A consulta ao Amigo demorou demais" : "Erro ao buscar atendimentos da API Amigo");
        setError(message);
        return;
      }

      if (!data?.success || !Array.isArray(data?.data?.data)) {
        console.warn("[useDetalhadoAmigo] Invalid or missing data received");
        if (requestId !== requestIdRef.current) return;
        setError("A integração do Amigo não retornou uma lista válida de atendimentos.");
        return;
      }

      const rawAttendances = data.data.data as AmigoApiAttendance[];
      console.log(`[useDetalhadoAmigo] Received ${rawAttendances.length} raw attendances`);

      // Filtrar apenas atendimentos da unidade específica
      // API retorna "SUA VISAO" sem acento
      const filteredAttendances = rawAttendances.filter((att) => {
        const placeName = (att.place?.name || "").toLowerCase();
        return placeName.includes("sua visao") && 
               placeName.includes("padre pedro pinto");
      });

      console.log(`[useDetalhadoAmigo] Filtered to ${filteredAttendances.length} attendances from target place`);

      // Log para debug do campo know_by
      filteredAttendances.forEach((att) => {
        if (att.patient?.name?.toLowerCase().includes('antonio')) {
          console.log('[useDetalhadoAmigo] Antonio raw data:', {
            name: att.patient?.name,
            know_by: att.patient?.know_by,
            full_patient: att.patient
          });
        }
      });

      // Mapear para o formato desejado (com validação)
      const mapped: AmigoAttendance[] = filteredAttendances
        .map((att) => {
          const startDateIso: string | undefined = att.start_date || att.date;
          const formattedDate = formatDate(startDateIso);
          if (!formattedDate) return null;

          return {
            id: att.id?.toString() || (globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random())),
            date: formattedDate,
            time: formatTime(startDateIso),
            patient_name: att.patient?.name || "Sem nome",
            patient_phone: formatPhone(
              att.patient?.contact_cellphone || att.patient?.contact_phone || att.patient?.cellphone || null
            ),
            patient_email: att.patient?.contact_email || att.patient?.email || null,
            patient_know_by: att.patient?.know_by || null,
            patient_age: getPatientAge(att.patient?.born, startDateIso),
            event_name: att.agenda_event?.name || att.event?.name || "Sem tipo",
            doctor_name: att.doctor?.name || att.user?.name || null,
            place_name: att.place?.name || null,
            status: att.status || "",
          } as AmigoAttendance;
        })
        .filter(Boolean) as AmigoAttendance[];

      // Ordenar por data (mais recente primeiro)
      mapped.sort((a, b) => {
        const parseDate = (dateStr: string) => {
          const parts = dateStr.split("/");
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        };
        return parseDate(b.date).getTime() - parseDate(a.date).getTime();
      });

      if (requestId !== requestIdRef.current) return;
      setAttendances(mapped);
      setLoadedDateRange(requestedDateRange);
      console.log(`[useDetalhadoAmigo] Set ${mapped.length} attendances`);

    } catch (err) {
      console.error("[useDetalhadoAmigo] Exception:", err);
      if (requestId !== requestIdRef.current) return;
      toast.error(timedOut ? "A consulta ao Amigo demorou demais" : "Erro ao processar atendimentos");
      setError(timedOut
        ? ATTENDANCES_QUERY_TIMEOUT_MESSAGE
        : "Não foi possível processar os atendimentos. Tente novamente.");
    } finally {
      window.clearTimeout(timeout);
      if (activeControllerRef.current === controller) activeControllerRef.current = null;
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void fetchAttendances();
    return () => {
      requestIdRef.current += 1;
      activeControllerRef.current?.abort();
    };
  }, [fetchAttendances]);

  const updateDateRange = useCallback((start: Date, end: Date) => {
    setRangeState({ start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") });
  }, [setRangeState]);
  const isLoadedRangeCurrent = Boolean(loadedDateRange
    && format(loadedDateRange.start, "yyyy-MM-dd") === format(dateRange.start, "yyyy-MM-dd")
    && format(loadedDateRange.end, "yyyy-MM-dd") === format(dateRange.end, "yyyy-MM-dd"));

  return {
    attendances,
    isLoading,
    error,
    dateRange,
    loadedDateRange,
    isLoadedRangeCurrent,
    updateDateRange,
    refresh: fetchAttendances,
  };
}
