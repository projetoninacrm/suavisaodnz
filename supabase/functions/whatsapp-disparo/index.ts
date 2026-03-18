const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
  const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE");

  try {
    const { leads, mensagem, mediaUrl, mediaType, instancia } = await req.json();

    const useUazapi = instancia === "uazapi";
    const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
    const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    if (useUazapi && (!UAZAPI_URL || !UAZAPI_TOKEN)) {
      return new Response(
        JSON.stringify({ error: "UAZAPI não configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!useUazapi && (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE)) {
      return new Response(
        JSON.stringify({ error: "Evolution API não configurada" }),
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

      // Replace variables in message
      const msg = mensagem
        ? mensagem
            .replace(/\{nome\}/g, lead.nome || "Cliente")
            .replace(/\{medico\}/g, lead.medico || "")
            .replace(/\{canal\}/g, lead.canal || "")
            .replace(/\{vendedor\}/g, lead.vendedor || "")
            .replace(/\{data_registro\}/g, lead.data_registro || "")
        : "";

      try {
        if (useUazapi) {
          // --- UAZAPI ---
          if (mediaUrl) {
            const mediaEndpoint = mediaType === "audio"
              ? `${UAZAPI_URL}/send/audio`
              : `${UAZAPI_URL}/send/video`;

            const mediaBody = mediaType === "audio"
              ? { number: `55${phone}`, audio: mediaUrl }
              : { number: `55${phone}`, video: mediaUrl, caption: msg || undefined };

            const mediaResponse = await fetch(mediaEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN! },
              body: JSON.stringify(mediaBody),
            });

            if (!mediaResponse.ok) {
              const errBody = await mediaResponse.text();
              results.push({ leadId: lead.id, nome: lead.nome || "—", status: "erro", erro: `Mídia HTTP ${mediaResponse.status}: ${errBody.substring(0, 200)}` });
              continue;
            }

            if (mediaType === "audio" && msg) {
              await fetch(`${UAZAPI_URL}/send/text`, {
                method: "POST",
                headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN! },
                body: JSON.stringify({ number: `55${phone}`, text: msg }),
              });
            }

            results.push({ leadId: lead.id, nome: lead.nome || "—", status: "enviado" });
          } else {
            const response = await fetch(`${UAZAPI_URL}/send/text`, {
              method: "POST",
              headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN! },
              body: JSON.stringify({ number: `55${phone}`, text: msg }),
            });

            if (response.ok) {
              results.push({ leadId: lead.id, nome: lead.nome || "—", status: "enviado" });
            } else {
              const errBody = await response.text();
              results.push({ leadId: lead.id, nome: lead.nome || "—", status: "erro", erro: `HTTP ${response.status}: ${errBody.substring(0, 200)}` });
            }
          }
        } else {
          // --- EVOLUTION API ---
          if (mediaUrl) {
            const mediaEndpoint = mediaType === "audio"
              ? `${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${EVOLUTION_INSTANCE}`
              : `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`;

            const mediaBody = mediaType === "audio"
              ? { number: `55${phone}`, audio: mediaUrl }
              : { number: `55${phone}`, mediatype: "video", media: mediaUrl, caption: msg || undefined };

            const mediaResponse = await fetch(mediaEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY! },
              body: JSON.stringify(mediaBody),
            });

            if (!mediaResponse.ok) {
              const errBody = await mediaResponse.text();
              results.push({ leadId: lead.id, nome: lead.nome || "—", status: "erro", erro: `Mídia HTTP ${mediaResponse.status}: ${errBody.substring(0, 200)}` });
              continue;
            }

            if (mediaType === "audio" && msg) {
              await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY! },
                body: JSON.stringify({ number: `55${phone}`, text: msg }),
              });
            }

            results.push({ leadId: lead.id, nome: lead.nome || "—", status: "enviado" });
          } else {
            const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY! },
              body: JSON.stringify({ number: `55${phone}`, text: msg }),
            });

            if (response.ok) {
              results.push({ leadId: lead.id, nome: lead.nome || "—", status: "enviado" });
            } else {
              const errBody = await response.text();
              results.push({ leadId: lead.id, nome: lead.nome || "—", status: "erro", erro: `HTTP ${response.status}: ${errBody.substring(0, 200)}` });
            }
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

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10) return null;
  if (cleaned.startsWith("55") && cleaned.length >= 12) {
    return cleaned.substring(2);
  }
  return cleaned;
}
