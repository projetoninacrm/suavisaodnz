import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10) return null;
  if (cleaned.startsWith("55") && cleaned.length >= 12) {
    return cleaned.substring(2);
  }
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook recebido:", JSON.stringify(body).substring(0, 1000));

    // uazapi webhook format: { instance, event, data: { from, body, type, ... } }
    // Also handles: { event: "message", data: { key: { fromMe, remoteJid }, message } }
    const event = body.event || body.typeWebhook;
    
    // Only process incoming messages (not sent by us)
    const isIncoming =
      (event === "message" || event === "messages.upsert" || event === "incomingMessageReceived") &&
      body.data?.key?.fromMe === false;

    // Alternative: uazapi simple format
    const isUazapiIncoming = event === "message" && body.data?.from && !body.data?.key?.fromMe;

    if (!isIncoming && !isUazapiIncoming) {
      console.log("Evento ignorado:", event);
      return new Response(JSON.stringify({ received: true, action: "ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract sender phone number
    let senderPhone: string | null = null;
    
    if (body.data?.key?.remoteJid) {
      // Evolution/standard format: 5531987097887@s.whatsapp.net
      senderPhone = body.data.key.remoteJid.replace(/@.*$/, "");
    } else if (body.data?.from) {
      // uazapi simple format
      senderPhone = String(body.data.from);
    } else if (body.senderData?.sender) {
      // Green API format
      senderPhone = body.senderData.sender.replace(/@.*$/, "");
    }

    if (!senderPhone) {
      console.log("Telefone do remetente não encontrado");
      return new Response(JSON.stringify({ received: true, action: "no_phone" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean phone for matching
    const cleanedPhone = cleanPhone(senderPhone);
    if (!cleanedPhone) {
      console.log("Telefone inválido:", senderPhone);
      return new Response(JSON.stringify({ received: true, action: "invalid_phone" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Mensagem recebida de: ${senderPhone} (limpo: ${cleanedPhone})`);

    // Connect to Supabase
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find dispatches sent to this phone that haven't been responded to yet
    // Match by cleaned phone digits (last 10-11 digits)
    const phoneVariants = [
      cleanedPhone,
      `55${cleanedPhone}`,
      cleanedPhone.length === 11 ? cleanedPhone.substring(1) : null, // without area code 9th digit
    ].filter(Boolean);

    // Build LIKE patterns for phone matching
    const likePatterns = phoneVariants.map(p => `%${p!.slice(-8)}%`);

    const { data: disparos, error } = await supabase
      .from("automacao_disparos")
      .select("id, telefone, resposta_cliente")
      .eq("status", "enviado")
      .eq("resposta_cliente", false)
      .or(likePatterns.map(p => `telefone.like.${p}`).join(","));

    if (error) {
      console.error("Erro ao buscar disparos:", error.message);
      return new Response(JSON.stringify({ received: true, action: "db_error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!disparos || disparos.length === 0) {
      console.log(`Nenhum disparo pendente encontrado para ${cleanedPhone}`);
      return new Response(JSON.stringify({ received: true, action: "no_match" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark all matching dispatches as responded
    const ids = disparos.map(d => d.id);
    console.log(`Marcando ${ids.length} disparo(s) como respondido(s): ${ids.join(", ")}`);

    const { error: updateError } = await supabase
      .from("automacao_disparos")
      .update({ resposta_cliente: true, updated_at: new Date().toISOString() })
      .in("id", ids);

    if (updateError) {
      console.error("Erro ao atualizar disparos:", updateError.message);
    }

    return new Response(
      JSON.stringify({ received: true, action: "marked_responded", count: ids.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no webhook:", error);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
