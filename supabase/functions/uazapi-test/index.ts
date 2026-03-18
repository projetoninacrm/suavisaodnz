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

    console.log(`Enviando via uazapi para ${number}: ${text}`);

    const response = await fetch(`${UAZAPI_URL}/sendText`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
      body: JSON.stringify({ number, text }),
    });

    const body = await response.text();
    console.log(`Resposta uazapi: ${response.status} - ${body}`);

    return new Response(
      JSON.stringify({ status: response.status, ok: response.ok, body: JSON.parse(body) }),
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
