const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AMIGO_API_BASE = 'https://amigobot-api.amigoapp.com.br';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiToken = Deno.env.get('AMIGO_API_TOKEN');
    if (!apiToken) {
      throw new Error('AMIGO_API_TOKEN não configurado');
    }

    const { action, params } = await req.json();
    console.log(`Action: ${action}`);

    let endpoint = '';
    let queryParams = '';

    switch (action) {
      case 'events':
        // Tipos de atendimento
        endpoint = '/events';
        break;
      case 'attendances': {
        // Lista de atendimentos. A API do Amigo aceita no máximo ~90 dias por
        // requisição, então dividimos o período em janelas menores.
        const startDate = params?.start_date || new Date().toISOString().split('T')[0];
        const endDate = params?.end_date || startDate;
        const status = params?.status || '';

        const MAX_DAYS = 85;
        const DAY_MS = 86400000;
        const chunks: Array<{ s: string; e: string }> = [];
        let cursor = new Date(`${startDate}T00:00:00Z`).getTime();
        const finalMs = new Date(`${endDate}T00:00:00Z`).getTime();

        while (cursor <= finalMs) {
          const chunkEnd = Math.min(cursor + (MAX_DAYS - 1) * DAY_MS, finalMs);
          chunks.push({
            s: new Date(cursor).toISOString().split('T')[0],
            e: new Date(chunkEnd).toISOString().split('T')[0],
          });
          cursor = chunkEnd + DAY_MS;
        }

        const merged: unknown[] = [];
        for (const c of chunks) {
          const chunkUrl = `${AMIGO_API_BASE}/attendances?start_date=${c.s}&end_date=${c.e}${status ? `&status=${status}` : ''}`;
          console.log("Buscando atendimentos em lotes");
          const res = await fetch(chunkUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
          });
          if (!res.ok) {
            const errText = await res.text();
            console.error(`API error: ${c.s} - ${c.e}`);
            throw new Error(`API retornou status ${res.status}: ${errText}`);
          }
          const json = await res.json();
          const items = Array.isArray(json?.data) ? json.data : [];
          merged.push(...items);
        }

        console.log(`Atendimentos agregados: ${merged.length} em ${chunks.length} janelas`);
        return new Response(
          JSON.stringify({ success: true, data: { data: merged, status: 'success' } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      case 'patient':
        // Dados de um paciente específico
        endpoint = `/patients/${params.patientId}`;
        break;
      case 'doctors':
        // Lista de médicos
        endpoint = '/doctors';
        break;
      case 'places':
        // Unidades da clínica
        endpoint = '/places';
        break;
      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    const url = `${AMIGO_API_BASE}${endpoint}${queryParams}`;
    console.log("Consultando API Amigo");

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error: ${response.status}`);
      throw new Error(`API retornou status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Resposta da API Amigo recebida");

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error in amigo-api function:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
