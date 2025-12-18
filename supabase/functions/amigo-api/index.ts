import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AMIGO_API_BASE = 'https://amigobot-api.amigoapp.com.br';

serve(async (req) => {
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
    console.log(`Action: ${action}, Params:`, params);

    let endpoint = '';
    let queryParams = '';

    switch (action) {
      case 'events':
        // Tipos de atendimento
        endpoint = '/events';
        break;
      case 'attendances':
        // Lista de atendimentos (requer start_date e end_date)
        endpoint = '/attendances';
        const startDate = params?.start_date || new Date().toISOString().split('T')[0];
        const endDate = params?.end_date || startDate;
        queryParams = `?start_date=${startDate}&end_date=${endDate}`;
        break;
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
    console.log(`Fetching: ${url}`);

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
      console.error(`API Error: ${errorText}`);
      throw new Error(`API retornou status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`Data received:`, JSON.stringify(data).substring(0, 500));

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
