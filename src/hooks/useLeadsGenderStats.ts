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

type GenderValue = "male" | "female" | "unknown";

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

const getFirstName = (value: string | null | undefined) => normalizeText(value).split(" ").filter(Boolean)[0] || "";

const FEMALE_NAME_HINTS = [
  "maria", "ana", "julia", "juliana", "beatriz", "bruna", "carla", "camila", "claudia", "daniela", "debora", "eduarda",
  "eliane", "elisangela", "fernanda", "gabriela", "giovana", "isabela", "isabella", "jessica", "joana", "larissa", "leticia",
  "luana", "luciana", "mariana", "michelle", "michele", "patricia", "paula", "raquel", "renata", "silvana", "tabata", "tatiane",
  "thabata", "thayssa", "vitoria", "yasmin", "samara", "sabrina", "amanda", "karollyne", "cassia", "katia", "gisele", "giselly",
  "rute", "eliane", "cintia", "eliana", "fatima", "aparecida", "raissa", "keren", "renya", "cintya"
];

const MALE_NAME_HINTS = [
  "joao", "jose", "antonio", "carlos", "paulo", "marcos", "bruno", "lucas", "gabriel", "guilherme", "rafael", "mateus",
  "matheus", "thiago", "diogo", "claudio", "sergio", "edgard", "jeferson", "jefferson", "andre", "andre", "moises", "kaio",
  "elias", "davi", "renato", "daniel", "vinicius", "felipe", "rodrigo", "wander", "paulo", "denio", "guilherme", "edmar",
  "erivelton", "jeferson", "claudio", "lorenzo", "diogo", "sergio", "jefferson", "guilherme", "moises", "jeferson", "edgard"
];

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

const mapGender = (value: string | null | undefined): GenderValue => {
  const normalized = normalizeText(value);
  if (normalized.startsWith("masc")) return "male";
  if (normalized.startsWith("fem")) return "female";
  return "unknown";
};

const inferGenderByName = (name: string | null | undefined): GenderValue => {
  const firstName = getFirstName(name);
  if (!firstName) return "unknown";
  if (FEMALE_NAME_HINTS.includes(firstName)) return "female";
  if (MALE_NAME_HINTS.includes(firstName)) return "male";
  if (firstName.endsWith("a") && !firstName.endsWith("ua")) return "female";
  if (firstName.endsWith("o") || firstName.endsWith("r") || firstName.endsWith("s")) return "male";
  return "unknown";
};

export function useLeadsGenderStats(leads: Lead[], filters: LeadsFilters, enabled = true) {
  const [genderByLeadId, setGenderByLeadId] = useState<Record<string, GenderValue>>({});
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Record<string, GenderValue>>({});

  const filteredLeads = useMemo(() => applyLeadFilters(leads, filters), [leads, filters]);

  const uniqueLeadKeys = useMemo(
    () =>
      filteredLeads.map((lead) => ({
        id: lead.id,
        fullName: normalizeText(lead.nome),
        firstName: getFirstName(lead.nome),
        phone: normalizePhone(lead.numero),
      })),
    [filteredLeads]
  );

  useEffect(() => {
    let ignore = false;

    const loadGenders = async () => {
      if (!enabled) {
        if (!ignore) {
          setGenderByLeadId({});
          setIsLoading(false);
        }
        return;
      }

      const monthBounds = getMonthBounds(filters.data_registro);
      if (!monthBounds || filteredLeads.length === 0) {
        if (!ignore) setGenderByLeadId({});
        return;
      }

      const missingLeads = uniqueLeadKeys.filter(({ id }) => !cacheRef.current[id]);
      if (missingLeads.length === 0) {
        if (!ignore) {
          setGenderByLeadId(
            uniqueLeadKeys.reduce<Record<string, GenderValue>>((acc, lead) => {
              acc[lead.id] = cacheRef.current[lead.id] || inferGenderByName(lead.firstName);
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

        const phoneMatches = new Map<string, string>();
        const nameMatches = new Map<string, string>();

        attendances.forEach((attendance) => {
          const patientId = attendance.patient?.id;
          if (!patientId) return;

          const attendanceName = normalizeText(attendance.patient?.name);
          const attendancePhone = normalizePhone(attendance.patient?.contact_cellphone || attendance.patient?.contact_phone);

          uniqueLeadKeys.forEach((lead) => {
            if (!phoneMatches.has(lead.id) && lead.phone && attendancePhone && lead.phone === attendancePhone) {
              phoneMatches.set(lead.id, String(patientId));
              return;
            }

            if (!nameMatches.has(lead.id) && lead.fullName && attendanceName && lead.fullName === attendanceName) {
              nameMatches.set(lead.id, String(patientId));
            }
          });
        });

        const patientRequests = uniqueLeadKeys
          .map((lead) => {
            const patientId = phoneMatches.get(lead.id) || nameMatches.get(lead.id);
            if (!patientId || cacheRef.current[lead.id]) return null;

            return (async () => {
              const response = await supabase.functions.invoke("amigo-api", {
                body: {
                  action: "patient",
                  params: { patientId },
                },
              });

              const apiGender = mapGender(response.data?.data?.data?.gender);
              return {
                leadId: lead.id,
                gender: apiGender === "unknown" ? inferGenderByName(lead.firstName) : apiGender,
              };
            })();
          })
          .filter(Boolean) as Promise<{ leadId: string; gender: GenderValue }>[];

        const resolvedPatients = await Promise.all(patientRequests);
        resolvedPatients.forEach(({ leadId, gender }) => {
          cacheRef.current[leadId] = gender;
        });

        uniqueLeadKeys.forEach((lead) => {
          if (!cacheRef.current[lead.id]) {
            cacheRef.current[lead.id] = inferGenderByName(lead.firstName);
          }
        });

        if (!ignore) {
          setGenderByLeadId(
            uniqueLeadKeys.reduce<Record<string, GenderValue>>((acc, lead) => {
              acc[lead.id] = cacheRef.current[lead.id] || "unknown";
              return acc;
            }, {})
          );
        }
      } catch (error) {
        console.error("Erro ao carregar gênero dos leads:", error);
        if (!ignore) {
          setGenderByLeadId(
            uniqueLeadKeys.reduce<Record<string, GenderValue>>((acc, lead) => {
              acc[lead.id] = cacheRef.current[lead.id] || inferGenderByName(lead.firstName);
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
  }, [enabled, filters.data_registro, filteredLeads.length, uniqueLeadKeys]);

  const stats = useMemo<GenderStats>(() => {
    return filteredLeads.reduce(
      (acc, lead) => {
        const gender = genderByLeadId[lead.id] || inferGenderByName(lead.nome);
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
