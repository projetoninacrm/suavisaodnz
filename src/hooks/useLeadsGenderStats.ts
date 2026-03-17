import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/hooks/useLeads";
import type { LeadsFilters } from "@/components/Dashboard/LeadsTable";

interface GenderStats {
  male: number;
  female: number;
  unknown: number;
  matched: number;
}

const normalizeText = (value: string | null | undefined) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizePhone = (value: string | null | undefined) => (value || "").replace(/\D/g, "");

const parseLeadDateToIso = (value: string | null | undefined) => {
  if (!value) return null;
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const isContactDateOverdue = (lead: Lead) => {
  if (!lead.entrar_em_contato) return false;
  if (lead.status === "Perdido" || lead.status === "Pós Venda") return false;

  const [day, month, year] = lead.entrar_em_contato.split("/").map(Number);
  const contactDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return contactDate < today;
};

const applyLeadFilters = (leads: Lead[], filters: LeadsFilters) => {
  return leads.filter((lead) => {
    if (filters.data_registro.length > 0 && !filters.data_registro.includes(lead.data_registro || "")) return false;
    if (filters.canal && lead.canal !== filters.canal) return false;
    if (filters.nome && !(lead.nome || "").toLowerCase().includes(filters.nome.toLowerCase())) return false;
    if (filters.orcamento && lead.orcamento !== filters.orcamento) return false;
    if (filters.venda && lead.venda !== filters.venda) return false;
    if (filters.entrar_em_contato.length > 0 && !filters.entrar_em_contato.includes(lead.entrar_em_contato || "")) return false;
    if (filters.medico && lead.medico !== filters.medico) return false;
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.vendedor && lead.vendedor !== filters.vendedor) return false;
    if (filters.pendente && !isContactDateOverdue(lead)) return false;
    return true;
  });
};

const getMonthBounds = (dates: string[]) => {
  const isoDates = dates
    .map(parseLeadDateToIso)
    .filter((value): value is string => Boolean(value))
    .sort();

  if (isoDates.length === 0) return null;

  return {
    start: isoDates[0],
    end: isoDates[isoDates.length - 1],
  };
};

const mapGender = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
  if (normalized.startsWith("masc")) return "male" as const;
  if (normalized.startsWith("fem")) return "female" as const;
  return "unknown" as const;
};

export function useLeadsGenderStats(leads: Lead[], filters: LeadsFilters) {
  const [genderByLeadId, setGenderByLeadId] = useState<Record<string, "male" | "female" | "unknown">>({});
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Record<string, "male" | "female" | "unknown">>({});

  const filteredLeads = useMemo(() => applyLeadFilters(leads, filters), [leads, filters]);

  const uniqueLeadKeys = useMemo(
    () =>
      filteredLeads.map((lead) => ({
        id: lead.id,
        name: normalizeText(lead.nome),
        phone: normalizePhone(lead.numero),
      })),
    [filteredLeads]
  );

  useEffect(() => {
    let ignore = false;

    const loadGenders = async () => {
      const monthBounds = getMonthBounds(filters.data_registro);
      if (!monthBounds || filteredLeads.length === 0) {
        if (!ignore) setGenderByLeadId({});
        return;
      }

      const missingLeads = uniqueLeadKeys.filter(({ id }) => !cacheRef.current[id]);
      if (missingLeads.length === 0) {
        if (!ignore) {
          setGenderByLeadId(
            uniqueLeadKeys.reduce<Record<string, "male" | "female" | "unknown">>((acc, lead) => {
              acc[lead.id] = cacheRef.current[lead.id] || "unknown";
              return acc;
            }, {})
          );
        }
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("amigo-api", {
          body: {
            action: "attendances",
            params: {
              start_date: monthBounds.start,
              end_date: monthBounds.end,
              status: "DONE",
            },
          },
        });

        if (error) throw error;

        const attendances = (data?.data?.data || []) as Array<{
          patient?: { id?: number | string; name?: string; contact_cellphone?: string | null; contact_phone?: string | null };
        }>;

        const matchedPatients = new Map<string, string>();

        attendances.forEach((attendance) => {
          const patientId = attendance.patient?.id;
          if (!patientId) return;

          const attendanceName = normalizeText(attendance.patient?.name);
          const attendancePhone = normalizePhone(attendance.patient?.contact_cellphone || attendance.patient?.contact_phone);

          uniqueLeadKeys.forEach((lead) => {
            const samePhone = lead.phone && attendancePhone && lead.phone === attendancePhone;
            const sameName = lead.name && attendanceName && lead.name === attendanceName;

            if ((samePhone || sameName) && !matchedPatients.has(lead.id)) {
              matchedPatients.set(lead.id, String(patientId));
            }
          });
        });

        const unresolvedLeadIds = uniqueLeadKeys
          .filter((lead) => !matchedPatients.has(lead.id))
          .map((lead) => lead.id);

        unresolvedLeadIds.forEach((leadId) => {
          cacheRef.current[leadId] = "unknown";
        });

        const patientRequests = Array.from(matchedPatients.entries())
          .filter(([leadId]) => !cacheRef.current[leadId])
          .map(async ([leadId, patientId]) => {
            const response = await supabase.functions.invoke("amigo-api", {
              body: {
                action: "patient",
                params: { patientId },
              },
            });

            const gender = mapGender(response.data?.data?.data?.gender);
            return { leadId, gender };
          });

        const resolvedPatients = await Promise.all(patientRequests);
        resolvedPatients.forEach(({ leadId, gender }) => {
          cacheRef.current[leadId] = gender;
        });

        if (!ignore) {
          setGenderByLeadId(
            uniqueLeadKeys.reduce<Record<string, "male" | "female" | "unknown">>((acc, lead) => {
              acc[lead.id] = cacheRef.current[lead.id] || "unknown";
              return acc;
            }, {})
          );
        }
      } catch (error) {
        console.error("Erro ao carregar gênero dos leads:", error);
        if (!ignore) {
          setGenderByLeadId(
            uniqueLeadKeys.reduce<Record<string, "male" | "female" | "unknown">>((acc, lead) => {
              acc[lead.id] = cacheRef.current[lead.id] || "unknown";
              return acc;
            }, {})
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadGenders();

    return () => {
      ignore = true;
    };
  }, [filters.data_registro, filteredLeads.length, uniqueLeadKeys]);

  const stats = useMemo<GenderStats>(() => {
    return filteredLeads.reduce(
      (acc, lead) => {
        const gender = genderByLeadId[lead.id] || "unknown";
        if (gender === "male") acc.male += 1;
        else if (gender === "female") acc.female += 1;
        else acc.unknown += 1;
        return acc;
      },
      { male: 0, female: 0, unknown: 0, matched: filteredLeads.length }
    );
  }, [filteredLeads, genderByLeadId]);

  return {
    stats,
    isLoading,
  };
}
