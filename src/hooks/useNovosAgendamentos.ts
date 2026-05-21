import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NovoAgendamento {
  id: string;
  startIso: string;
  date: string; // dd/MM/yyyy
  time: string; // HH:mm
  patientName: string;
  patientPhone: string | null;
  eventName: string;
  doctorName: string | null;
  status: string;
}

const formatPhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  if (cleaned.length === 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return String(phone);
};

const formatDateFromIso = (iso?: string): string => {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
};

const formatTimeFromIso = (iso?: string): string => {
  if (!iso) return "";
  const m = iso.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "";
};

const todayYmd = () => {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
};

const plusDaysYmd = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
};

export function useNovosAgendamentos() {
  const [start, setStart] = useState<string>(todayYmd());
  const [end, setEnd] = useState<string>(plusDaysYmd(30));
  const [items, setItems] = useState<NovoAgendamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (s?: string, e?: string) => {
      const sd = s ?? start;
      const ed = e ?? end;
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("amigo-api", {
          body: { action: "attendances", params: { start_date: sd, end_date: ed } },
        });
        if (fnErr) throw fnErr;
        if (!data?.success || !data?.data?.data) {
          setItems([]);
          return;
        }
        const raw = data.data.data as any[];

        // Cutoff: only future (>= now)
        const now = new Date();

        const filtered = raw.filter((att) => {
          if (att?.canceled === true) return false;
          const placeName = (att?.place?.name || "").toLowerCase();
          const isSuaVisao =
            placeName.includes("sua visao") && placeName.includes("padre pedro pinto");
          if (!isSuaVisao) return false;
          const iso = att?.start_date as string | undefined;
          if (!iso) return false;
          const startDate = new Date(iso);
          if (Number.isNaN(startDate.getTime())) return false;
          return startDate.getTime() >= now.getTime() - 60 * 60 * 1000; // tolerância 1h
        });

        const mapped: NovoAgendamento[] = filtered.map((att) => {
          const iso: string = att.start_date;
          return {
            id: String(att.id ?? `${iso}-${att.patient?.id ?? Math.random()}`),
            startIso: iso,
            date: formatDateFromIso(iso),
            time: formatTimeFromIso(iso),
            patientName: att.patient?.name || "Sem nome",
            patientPhone: formatPhone(
              att.patient?.contact_cellphone || att.patient?.contact_phone || null,
            ),
            eventName: att.agenda_event?.name || att.event?.name || "—",
            doctorName: att.user?.name || att.doctor?.name || null,
            status: att.status || "",
          };
        });

        mapped.sort((a, b) => (a.startIso < b.startIso ? -1 : a.startIso > b.startIso ? 1 : 0));
        setItems(mapped);
      } catch (err: any) {
        console.error("[useNovosAgendamentos] erro:", err);
        setError(err?.message ?? "Erro ao buscar agendamentos");
        toast.error("Erro ao buscar agendamentos da API Amigo");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [start, end],
  );

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    start,
    end,
    setStart,
    setEnd,
    items,
    loading,
    error,
    refresh: fetchData,
  };
}
