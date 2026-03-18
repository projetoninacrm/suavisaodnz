import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AMIGO_API_BASE = "https://amigobot-api.amigoapp.com.br";

// Fetch attendances in monthly chunks to avoid API limits
async function fetchAttendancesRange(
  startDate: string,
  endDate: string,
  apiToken: string,
  status = "DONE",
): Promise<any[]> {
  const allAttendances: any[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let current = new Date(start);

  while (current <= end) {
    const chunkEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0); // last day of month
    const actualEnd = chunkEnd > end ? end : chunkEnd;

    const sd = current.toISOString().split("T")[0];
    const ed = actualEnd.toISOString().split("T")[0];

    console.log(`Fetching chunk: ${sd} to ${ed}`);

    const url = `${AMIGO_API_BASE}/attendances?start_date=${sd}&end_date=${ed}&status=${status}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const apiData = await response.json();
      const chunk = apiData.data || [];
      console.log(`Chunk ${sd}-${ed}: ${chunk.length} attendances`);
      allAttendances.push(...chunk);
    } else {
      console.error(`Failed chunk ${sd}-${ed}: ${response.status}`);
    }

    // Move to first day of next month
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return allAttendances;
}

function cleanPhone(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

function normalizePhone(phone: string): string {
  return phone.length === 13 && phone.startsWith("55") ? phone.slice(2) : phone;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function formatPhone(phone: string | null): string {
  if (!phone) return "Sem telefone";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 13 && cleaned.startsWith("55")) {
    const local = cleaned.slice(2);
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  return phone;
}

function buildPatientKey(att: any): string | null {
  const patientId = att.patient?.id ?? att.patient_id;
  if (patientId) return `id:${patientId}`;

  const cleanedPhone = cleanPhone(att.patient?.contact_cellphone ?? null);
  if (!cleanedPhone || cleanedPhone.length < 10) return null;

  return `phone:${normalizePhone(cleanedPhone)}`;
}

function formatDateStr(d: string): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}

function isFromSuaVisaoUnit(att: any): boolean {
  const placeName = normalizeText(att.place?.name || "");
  return placeName.includes("SUA VISAO");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiToken = Deno.env.get("AMIGO_API_TOKEN");
    if (!apiToken) throw new Error("AMIGO_API_TOKEN não configurado");

    const { start_date, end_date } = await req.json();
    if (!start_date || !end_date) throw new Error("start_date and end_date are required (YYYY-MM-DD)");

    console.log(`=== Return Rate: period ${start_date} to ${end_date} ===`);

    // 1) Fetch DONE attendances in selected period
    const periodAttendances = await fetchAttendancesRange(start_date, end_date, apiToken);
    console.log(`Period attendances (DONE): ${periodAttendances.length}`);

    const periodFiltered = periodAttendances.filter(isFromSuaVisaoUnit);
    console.log(`Period filtered by unidade SUA VISAO: ${periodFiltered.length}`);

    // 2) Build unique patients map for the selected period
    const patientsMap = new Map<string, {
      nome: string;
      telefone_formatted: string;
      tipos_atendimento: string[];
      primeiro_atendimento: string;
      atendimentos_no_periodo: number;
      datas_periodo: string[];
    }>();

    let skippedWithoutIdentityInPeriod = 0;

    for (const att of periodFiltered) {
      const patientKey = buildPatientKey(att);
      if (!patientKey) {
        skippedWithoutIdentityInPeriod += 1;
        continue;
      }

      const attDate = att.start_date?.split("T")[0] || "";
      const tipoAtendimento = att.agenda_event?.name || att.user?.name || "Sem tipo";

      const existing = patientsMap.get(patientKey);
      if (existing) {
        existing.atendimentos_no_periodo += 1;
        if (attDate && !existing.datas_periodo.includes(attDate)) {
          existing.datas_periodo.push(attDate);
        }
        if (!existing.tipos_atendimento.includes(tipoAtendimento)) {
          existing.tipos_atendimento.push(tipoAtendimento);
        }
        if (attDate < existing.primeiro_atendimento) {
          existing.primeiro_atendimento = attDate;
        }
      } else {
        patientsMap.set(patientKey, {
          nome: att.patient?.name || "Sem nome",
          telefone_formatted: formatPhone(att.patient?.contact_cellphone ?? null),
          tipos_atendimento: [tipoAtendimento],
          primeiro_atendimento: attDate,
          atendimentos_no_periodo: 1,
          datas_periodo: [attDate],
        });
      }
    }

    console.log(`Unique patients in period: ${patientsMap.size}`);
    console.log(`Period attendances skipped without patient identity: ${skippedWithoutIdentityInPeriod}`);

    // 3) Fetch DONE attendances after selected period (to identify return)
    const today = new Date().toISOString().split("T")[0];
    const dayAfterEnd = new Date(new Date(end_date).getTime() + 86400000).toISOString().split("T")[0];

    const postPeriodByPatient = new Map<string, { count: number; lastDate: string }>();

    if (dayAfterEnd <= today) {
      const postAttendances = await fetchAttendancesRange(dayAfterEnd, today, apiToken);
      console.log(`Post-period attendances (DONE): ${postAttendances.length}`);

      const postFiltered = postAttendances.filter(isFromSuaVisaoUnit);
      console.log(`Post-period filtered by unidade SUA VISAO: ${postFiltered.length}`);

      let skippedWithoutIdentityInPostPeriod = 0;

      for (const att of postFiltered) {
        const patientKey = buildPatientKey(att);
        if (!patientKey) {
          skippedWithoutIdentityInPostPeriod += 1;
          continue;
        }

        const attDate = att.start_date?.split("T")[0] || "";
        const existing = postPeriodByPatient.get(patientKey);

        if (existing) {
          existing.count += 1;
          if (attDate > existing.lastDate) existing.lastDate = attDate;
        } else {
          postPeriodByPatient.set(patientKey, { count: 1, lastDate: attDate });
        }
      }

      console.log(`Post-period attendances skipped without patient identity: ${skippedWithoutIdentityInPostPeriod}`);
    }

    // 4) Build final result by patient
    const results: any[] = [];
    let idx = 0;

    for (const [patientKey, patient] of patientsMap) {
      const postData = postPeriodByPatient.get(patientKey);
      const retornou = !!postData && postData.count > 0;
      const atendimentosApos = postData?.count || 0;
      const ultimoAtendimento = retornou
        ? postData!.lastDate
        : patient.datas_periodo.sort().at(-1) || patient.primeiro_atendimento;

      results.push({
        id: `pat-${idx++}`,
        nome: patient.nome,
        telefone: patient.telefone_formatted,
        tipo_atendimento: patient.tipo_atendimento,
        primeiro_atendimento: formatDateStr(patient.primeiro_atendimento),
        ultimo_atendimento: formatDateStr(ultimoAtendimento),
        atendimentos_no_periodo: patient.atendimentos_no_periodo,
        atendimentos_apos_periodo: atendimentosApos,
        total_atendimentos: patient.atendimentos_no_periodo + atendimentosApos,
        retornou,
      });
    }

    results.sort((a, b) => a.nome.localeCompare(b.nome));

    console.log(
      `=== Result: ${results.length} unique patients, ${results.filter((r) => r.retornou).length} returned ===`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        meta: {
          total_finalizados_periodo: periodFiltered.length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
