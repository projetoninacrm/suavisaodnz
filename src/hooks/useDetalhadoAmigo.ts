import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

// Unidade específica para filtrar
const TARGET_PLACE = "SUA VISÃO OFTALMOLOGIA – Rua Padre Pedro Pinto, 1595 – Loja 05 – Em frente à Caixa Econômica";

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
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "HH:mm");
};

export function useDetalhadoAmigo() {
  const [attendances, setAttendances] = useState<AmigoAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const today = new Date();
    return {
      start: startOfMonth(today),
      end: endOfMonth(today),
    };
  });

  const fetchAttendances = useCallback(async () => {
    setIsLoading(true);
    try {
      // Garantia extra contra "Invalid time value"
      if (Number.isNaN(dateRange.start?.getTime?.()) || Number.isNaN(dateRange.end?.getTime?.())) {
        throw new Error("Período inválido. Selecione novamente.");
      }

      const startDate = format(dateRange.start, "yyyy-MM-dd");
      const endDate = format(dateRange.end, "yyyy-MM-dd");

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
      });

      if (error) {
        console.error("[useDetalhadoAmigo] Error:", error);
        toast.error("Erro ao buscar atendimentos da API Amigo");
        setAttendances([]);
        return;
      }

      if (!data?.success || !data?.data?.data) {
        console.warn("[useDetalhadoAmigo] No data received");
        setAttendances([]);
        return;
      }

      const rawAttendances = data.data.data as any[];
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

      setAttendances(mapped);
      console.log(`[useDetalhadoAmigo] Set ${mapped.length} attendances`);

    } catch (err) {
      console.error("[useDetalhadoAmigo] Exception:", err);
      toast.error("Erro ao processar atendimentos");
      setAttendances([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  const updateDateRange = useCallback((start: Date, end: Date) => {
    setDateRange({ start, end });
  }, []);

  return {
    attendances,
    isLoading,
    dateRange,
    updateDateRange,
    refresh: fetchAttendances,
  };
}
