const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
  const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

  if (!UAZAPI_URL || !UAZAPI_TOKEN) {
    return new Response(
      JSON.stringify({ error: "UAZAPI não configurada", UAZAPI_URL: !!UAZAPI_URL, UAZAPI_TOKEN: !!UAZAPI_TOKEN }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { number, text } = await req.json();

    // Try multiple endpoint formats
    const endpoints = [
      `${UAZAPI_URL}/chat/send/text`,
      `${UAZAPI_URL}/message/sendText`,
      `${UAZAPI_URL}/send/text`,
    ];

    let lastResponse: any = null;
    for (const endpoint of endpoints) {
      console.log(`Tentando: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
        body: JSON.stringify({ number, text }),
      });
      const body = await response.text();
      console.log(`Resposta: ${response.status} - ${body.substring(0, 300)}`);
      lastResponse = { endpoint, status: response.status, ok: response.ok, body };
      if (response.ok) break;
    }

    return new Response(
      JSON.stringify(lastResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
