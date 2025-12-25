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

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return format(date, "dd/MM/yyyy");
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
      const filteredAttendances = rawAttendances.filter((att) => {
        const placeName = att.place?.name || "";
        // Comparação case-insensitive e parcial para ser mais flexível
        return placeName.toLowerCase().includes("sua visão") && 
               placeName.toLowerCase().includes("padre pedro pinto");
      });

      console.log(`[useDetalhadoAmigo] Filtered to ${filteredAttendances.length} attendances from target place`);

      // Mapear para o formato desejado
      const mapped: AmigoAttendance[] = filteredAttendances.map((att) => ({
        id: att.id?.toString() || Math.random().toString(),
        date: formatDate(att.date),
        time: att.time || "",
        patient_name: att.patient?.name || "Sem nome",
        patient_phone: formatPhone(att.patient?.contact_phone || att.patient?.cellphone),
        patient_email: att.patient?.contact_email || att.patient?.email || null,
        patient_know_by: att.patient?.know_by || null,
        event_name: att.event?.name || "Sem tipo",
        doctor_name: att.doctor?.name || null,
        place_name: att.place?.name || null,
        status: att.status || "",
      }));

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
