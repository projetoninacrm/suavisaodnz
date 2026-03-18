import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AMIGO_API_BASE = 'https://amigobot-api.amigoapp.com.br';

// Fetch attendances in monthly chunks to avoid API limits
async function fetchAttendancesRange(
  startDate: string,
  endDate: string,
  apiToken: string,
  status = "DONE"
): Promise<any[]> {
  const allAttendances: any[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let current = new Date(start);

  while (current <= end) {
    const chunkEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0); // last day of month
    const actualEnd = chunkEnd > end ? end : chunkEnd;

    const sd = current.toISOString().split('T')[0];
    const ed = actualEnd.toISOString().split('T')[0];

    console.log(`Fetching chunk: ${sd} to ${ed}`);

    const url = `${AMIGO_API_BASE}/attendances?start_date=${sd}&end_date=${ed}&status=${status}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
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
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function formatPhone(phone: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    const local = cleaned.slice(2);
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  return phone;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiToken = Deno.env.get('AMIGO_API_TOKEN');
    if (!apiToken) throw new Error('AMIGO_API_TOKEN não configurado');

    const { start_date, end_date } = await req.json();
    if (!start_date || !end_date) throw new Error('start_date and end_date are required (YYYY-MM-DD)');

    console.log(`=== Return Rate: period ${start_date} to ${end_date} ===`);

    // 1. Fetch all DONE attendances in the selected period
    const periodAttendances = await fetchAttendancesRange(start_date, end_date, apiToken);
    console.log(`Period attendances (DONE): ${periodAttendances.length}`);

    // All DONE attendances are from the company - no need to filter by place
    const periodFiltered = periodAttendances;
    console.log(`Period attendances (DONE): ${periodFiltered.length}`);

    // 2. Build unique patients map from period (by cleaned phone)
    const patientsMap = new Map<string, {
      nome: string;
      telefone: string;
      telefone_formatted: string;
      tipo_atendimento: string;
      primeiro_atendimento: string;
      atendimentos_no_periodo: number;
      datas_periodo: string[];
    }>();

    for (const att of periodFiltered) {
      const phone = cleanPhone(att.patient?.contact_cellphone);
      if (!phone || phone.length < 10) continue;

      // Normalize: remove leading 55
      const normalizedPhone = phone.length === 13 && phone.startsWith('55') ? phone.slice(2) : phone;
      const attDate = att.start_date?.split('T')[0] || '';
      const tipoAtendimento = att.agenda_event?.name || att.user?.name || '';

      const existing = patientsMap.get(normalizedPhone);
      if (existing) {
        existing.atendimentos_no_periodo += 1;
        if (attDate && !existing.datas_periodo.includes(attDate)) {
          existing.datas_periodo.push(attDate);
        }
        // Keep earliest date as primeiro_atendimento
        if (attDate < existing.primeiro_atendimento) {
          existing.primeiro_atendimento = attDate;
        }
      } else {
        patientsMap.set(normalizedPhone, {
          nome: att.patient?.name || 'Sem nome',
          telefone: phone,
          telefone_formatted: formatPhone(att.patient?.contact_cellphone),
          tipo_atendimento: tipoAtendimento,
          primeiro_atendimento: attDate,
          atendimentos_no_periodo: 1,
          datas_periodo: [attDate],
        });
      }
    }

    console.log(`Unique patients in period: ${patientsMap.size}`);

    // 3. Fetch attendances AFTER the period until today to check returns
    const today = new Date().toISOString().split('T')[0];
    const dayAfterEnd = new Date(new Date(end_date).getTime() + 86400000).toISOString().split('T')[0];

    let postPeriodPhones = new Map<string, { count: number; lastDate: string }>();

    if (dayAfterEnd <= today) {
      const postAttendances = await fetchAttendancesRange(dayAfterEnd, today, apiToken);
      console.log(`Post-period attendances: ${postAttendances.length}`);

      for (const att of postAttendances) {
        const phone = cleanPhone(att.patient?.contact_cellphone);
        if (!phone || phone.length < 10) continue;
        const normalizedPhone = phone.length === 13 && phone.startsWith('55') ? phone.slice(2) : phone;
        const attDate = att.start_date?.split('T')[0] || '';

        const existing = postPeriodPhones.get(normalizedPhone);
        if (existing) {
          existing.count += 1;
          if (attDate > existing.lastDate) existing.lastDate = attDate;
        } else {
          postPeriodPhones.set(normalizedPhone, { count: 1, lastDate: attDate });
        }
      }
    }

    // 4. Build result
    const results: any[] = [];
    let idx = 0;

    for (const [phone, patient] of patientsMap) {
      const postData = postPeriodPhones.get(phone);
      const retornou = !!postData && postData.count > 0;
      const atendimentosApos = postData?.count || 0;
      const ultimoAtendimento = postData?.lastDate || patient.primeiro_atendimento;

      // Format dates to DD/MM/YYYY
      const formatDateStr = (d: string) => {
        if (!d) return '';
        const parts = d.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return d;
      };

      results.push({
        id: `pat-${idx++}`,
        nome: patient.nome,
        telefone: patient.telefone_formatted,
        tipo_atendimento: patient.tipo_atendimento,
        primeiro_atendimento: formatDateStr(patient.primeiro_atendimento),
        ultimo_atendimento: formatDateStr(retornou ? ultimoAtendimento : patient.datas_periodo.sort().pop() || ''),
        atendimentos_no_periodo: patient.atendimentos_no_periodo,
        atendimentos_apos_periodo: atendimentosApos,
        total_atendimentos: patient.atendimentos_no_periodo + atendimentosApos,
        retornou,
      });
    }

    // Sort by name
    results.sort((a, b) => a.nome.localeCompare(b.nome));

    console.log(`=== Result: ${results.length} unique patients, ${results.filter(r => r.retornou).length} returned ===`);

    return new Response(JSON.stringify({ success: true, data: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
