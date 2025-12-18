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

    const { start_date, end_date } = await req.json();
    console.log(`Fetching attendances from ${start_date} to ${end_date}`);

    // Fetch done attendances from Amigo API
    const url = `${AMIGO_API_BASE}/attendances?start_date=${start_date}&end_date=${end_date}&status=DONE`;
    console.log(`Fetching: ${url}`);

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

    // Transform to detalhado format
    const records = filteredAttendances.map((att: any) => ({
      nome: att.patient?.name || '',
      telefone: formatPhone(att.patient?.contact_cellphone),
      email: '', // API doesn't have email
      como_conheceu: '', // User fills
      receita: '', // User fills
      data: formatDate(att.start_date),
      visitou_loja: '', // User fills
      obs: att.observation || '',
    }));

    // Insert into Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Insert in batches of 50
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from('detalhado').insert(batch);
      if (error) {
        console.error(`Batch insert error:`, error);
        throw error;
      }
      inserted += batch.length;
      console.log(`Inserted batch: ${inserted}/${records.length}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      total_fetched: attendances.length,
      total_filtered: filteredAttendances.length,
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
