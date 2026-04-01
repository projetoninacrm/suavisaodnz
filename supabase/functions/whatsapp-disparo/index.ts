const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leads, mensagem, mediaUrl, mediaType, instancia } = await req.json();

    const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
    const UAZAPI_TOKEN = instancia === "uazapi_dnz"
      ? Deno.env.get("UAZAPI_TOKEN_DNZ")
      : Deno.env.get("UAZAPI_TOKEN");

    if (!UAZAPI_URL || !UAZAPI_TOKEN) {
      return new Response(
        JSON.stringify({ error: "UAZAPI não configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum lead fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!mensagem && !mediaUrl) {
      return new Response(
        JSON.stringify({ error: "Mensagem ou mídia não fornecida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { leadId: string; nome: string; status: string; erro?: string }[] = [];

    for (const lead of leads) {
      const phone = cleanPhone(lead.numero);
      if (!phone) {
        results.push({ leadId: lead.id, nome: lead.nome || "—", status: "erro", erro: "Telefone inválido" });
        continue;
      }

      const msg = mensagem
        ? mensagem
            .replace(/\{nome\}/g, lead.nome || "Cliente")
            .replace(/\{medico\}/g, lead.medico || "")
            .replace(/\{canal\}/g, lead.canal || "")
            .replace(/\{vendedor\}/g, lead.vendedor || "")
            .replace(/\{data_registro\}/g, lead.data_registro || "")
        : "";

      try {
        if (mediaUrl) {
          const mediaPath = mediaType === "audio" ? "/send/audio" : "/send/video";

          const mediaBody = mediaType === "audio"
            ? { number: `55${phone}`, audio: mediaUrl }
            : { number: `55${phone}`, video: mediaUrl, caption: msg || undefined };

          const mediaResponse = await sendUazapiRequest(UAZAPI_URL, UAZAPI_TOKEN, mediaPath, mediaBody);

          if (!mediaResponse.ok) {
            const errBody = await mediaResponse.text();
            results.push({ leadId: lead.id, nome: lead.nome || "—", status: "erro", erro: `Mídia HTTP ${mediaResponse.status}: ${errBody.substring(0, 200)}` });
            continue;
          }

          if (mediaType === "audio" && msg) {
            await sendUazapiRequest(UAZAPI_URL, UAZAPI_TOKEN, "/send/text", {
              number: `55${phone}`,
              text: msg,
            });
          }

          results.push({ leadId: lead.id, nome: lead.nome || "—", status: "enviado" });
        } else {
          const response = await sendUazapiRequest(UAZAPI_URL, UAZAPI_TOKEN, "/send/text", {
            number: `55${phone}`,
            text: msg,
          });

          if (response.ok) {
            results.push({ leadId: lead.id, nome: lead.nome || "—", status: "enviado" });
          } else {
            const errBody = await response.text();
            results.push({ leadId: lead.id, nome: lead.nome || "—", status: "erro", erro: `HTTP ${response.status}: ${errBody.substring(0, 200)}` });
          }
        }
      } catch (e) {
        results.push({
          leadId: lead.id,
          nome: lead.nome || "—",
          status: "erro",
          erro: e instanceof Error ? e.message : "Erro desconhecido",
        });
      }
    }

    const enviados = results.filter(r => r.status === "enviado").length;
    const erros = results.filter(r => r.status === "erro").length;

    return new Response(
      JSON.stringify({ enviados, erros, total: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no disparo:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendUazapiRequest(
  baseUrl: string,
  token: string,
  path: string,
  payload: unknown,
): Promise<Response> {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const requestBody = JSON.stringify(payload);
  const encodedToken = encodeURIComponent(token);

  const attempts: Array<{ url: string; headers: Record<string, string> }> = [
    {
      url: `${normalizedBase}${path}`,
      headers: { "Content-Type": "application/json", token },
    },
    {
      url: `${normalizedBase}${path}`,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    },
    {
      url: `${normalizedBase}${path}?token=${encodedToken}`,
      headers: { "Content-Type": "application/json" },
    },
    {
      url: `${normalizedBase}${path}?admintoken=${encodedToken}&token=${encodedToken}`,
      headers: { "Content-Type": "application/json" },
    },
  ];

  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: "POST",
        headers: attempt.headers,
        body: requestBody,
      });

      if (response.ok) {
        return response;
      }

      lastResponse = response;
      if (response.status !== 401 && response.status !== 403) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha ao conectar com UAZAPI");
}

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10) return null;
  if (cleaned.startsWith("55") && cleaned.length >= 12) {
    return cleaned.substring(2);
  }
  return cleaned;
}
