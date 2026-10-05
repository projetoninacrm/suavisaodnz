import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AMIGO_API_BASE = 'https://amigobot-api.amigoapp.com.br';

// Tipos de atendimento selecionados (com checkmark nas imagens)
const ALLOWED_EVENT_TYPES = [
  'Alice Guedes',
  'Amanda Calheiros',
  'Carolina Hannas',
  'Cassio Rocha',
  'Consulta com Especialista',
  'CONSULTA ELO OFTALMOLOGISTA',
  'Consulta Particular R$ 120,00',
  'Convênio',
  'FERNANDO',
  'Laura',
  'Oftalmopediatra R$ 180,00',
  'OFTALPLUS',
  'Óticas',
  'Paulina Miquilino',
  'Thabata Machado',
  'Vitor Porto',
];

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatPhone(phone: string | null): string {
  if (!phone) return '';
  // Format as (XX) XXXXX-XXXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

async function fetchPatientDetails(patientId: string, apiToken: string): Promise<any> {
  try {
    const url = `${AMIGO_API_BASE}/patients/${patientId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      console.error(`Patient fetch failed: ${response.status}`);
      return null;
    }
    const data = await response.json();
    console.log("Dados do paciente recebidos");
    return data;
  } catch (error) {
    console.error("Falha ao consultar paciente");
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiToken = Deno.env.get('AMIGO_API_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiToken || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }

    // Parse body - use today's date if not provided (for cron jobs)
    let start_date: string;
    let end_date: string;
    
    try {
      const body = await req.json();
      start_date = body.start_date;
      end_date = body.end_date;
    } catch {
      // No body provided - use today's date
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      start_date = dateStr;
      end_date = dateStr;
    }
    
    // Default to today if dates not provided
    if (!start_date || !end_date) {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      start_date = start_date || dateStr;
      end_date = end_date || dateStr;
    }
    
    console.log(`Fetching attendances from ${start_date} to ${end_date}`);

    // Fetch done attendances from Amigo API
    const url = `${AMIGO_API_BASE}/attendances?start_date=${start_date}&end_date=${end_date}&status=DONE`;
    console.log("Consultando API de atendimentos");

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const apiData = await response.json();
    const attendances = apiData.data || [];
    console.log(`Total attendances fetched: ${attendances.length}`);

    // Filter by allowed event types (check both agenda_event.name and user.name)
    const filteredAttendances = attendances.filter((att: any) => {
      const eventName = att.agenda_event?.name || '';
      const userName = att.user?.name || '';
      return ALLOWED_EVENT_TYPES.some(allowed => 
        eventName.toLowerCase().includes(allowed.toLowerCase()) ||
        userName.toLowerCase().includes(allowed.toLowerCase())
      );
    });
    console.log(`Filtered attendances: ${filteredAttendances.length}`);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch existing records to avoid duplicates (by nome + data + telefone)
    const { data: existingRecords, error: fetchError } = await supabase
      .from('detalhado')
      .select('nome, data, telefone');
    
    if (fetchError) {
      console.error('Error fetching existing records:', fetchError);
      throw fetchError;
    }
    
    // Create a Set of existing record keys for fast lookup
    const existingKeys = new Set(
      (existingRecords || []).map(r => `${r.nome?.toLowerCase() || ''}|${r.data || ''}|${r.telefone || ''}`)
    );
    console.log(`Existing records in database: ${existingKeys.size}`);

    // Fetch patient details for each attendance to get email
    const records = [];
    let skipped = 0;
    
    for (const att of filteredAttendances) {
      const nome = att.patient?.name || '';
      const telefone = formatPhone(att.patient?.contact_cellphone);
      const data = formatDate(att.start_date);
      
      // Check if record already exists
      const key = `${nome.toLowerCase()}|${data}|${telefone}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }
      
      const patientId = att.patient?.id;
      let email = '';
      
      if (patientId) {
        const patientResponse = await fetchPatientDetails(patientId, apiToken);
        if (patientResponse?.data) {
          const patientData = patientResponse.data;
          email = patientData.email || '';
        }
      }
      
      records.push({
        nome,
        telefone,
        email,
        como_conheceu: '',
        receita: '',
        data,
        visitou_loja: '',
      });
    }
    
    console.log(`New records to insert: ${records.length}, Skipped duplicates: ${skipped}`);

    // Insert in batches of 50
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from('detalhado').insert(batch);
      if (error) {
        console.error("Falha ao salvar lote de atendimentos");
        throw error;
      }
      inserted += batch.length;
      console.log(`Inserted batch: ${inserted}/${records.length}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      total_fetched: attendances.length,
      total_filtered: filteredAttendances.length,
      total_skipped: skipped,
      total_inserted: inserted
    }), {
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
