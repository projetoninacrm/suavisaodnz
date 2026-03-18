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

function parseFromMe(value: unknown): boolean | null {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook payload keys:", Object.keys(body));
    console.log("Webhook recebido:", JSON.stringify(body).substring(0, 2000));

    // Detect event type from multiple providers
    const event = body.event || body.typeWebhook || body.EventType;

    // --- Detect if message is incoming (not sent by us) ---
    let senderPhone: string | null = null;
    let isIncoming = false;

    // Format 1: Evolution API / standard
    // { event: "messages.upsert", data: { key: { fromMe: false, remoteJid: "55...@s.whatsapp.net" } } }
    if (body.data?.key?.remoteJid) {
      const fromMe = parseFromMe(body.data.key.fromMe);
      if (fromMe !== true) {
        isIncoming = true;
        senderPhone = body.data.key.remoteJid.replace(/@.*$/, "") || null;
      }
    }
    // Format 1.1: Evolution API with nested key
    else if (body.data?.message?.key?.remoteJid) {
      const fromMe = parseFromMe(body.data.message.key.fromMe);
      if (fromMe !== true) {
        isIncoming = true;
        senderPhone = body.data.message.key.remoteJid.replace(/@.*$/, "") || null;
      }
    }
    // Format 1.2: Evolution API with batched messages array
    else if (body.data?.messages?.[0]?.key?.remoteJid) {
      const fromMe = parseFromMe(body.data.messages[0].key.fromMe);
      if (fromMe !== true) {
        isIncoming = true;
        senderPhone = body.data.messages[0].key.remoteJid.replace(/@.*$/, "") || null;
      }
    }
    // Format 2: uazapi simple
    // { event: "message", data: { from: "55...", ... } }
    else if (body.data?.from && parseFromMe(body.data?.key?.fromMe) !== true) {
      isIncoming = true;
      senderPhone = String(body.data.from);
    }
    // Format 3: Green API
    else if (body.senderData?.sender) {
      isIncoming = true;
      senderPhone = body.senderData.sender.replace(/@.*$/, "");
    }
    // Format 4: uazapi webhook with EventType: "messages"
    // { EventType: "messages", chat: { id: "..." }, message: {...} }
    // The phone can be in: chat.id (as JID), message.key.remoteJid, or extracted from chat fields
    else if (body.EventType === "messages") {
      isIncoming = true;

      // Try to get phone from message.key.remoteJid
      if (body.message?.key?.remoteJid) {
        senderPhone = body.message.key.remoteJid.replace(/@.*$/, "");
        if (parseFromMe(body.message.key.fromMe) === true) isIncoming = false;
      }
      // Try chat.id as JID (e.g. "5531999999999@s.whatsapp.net")
      else if (body.chat?.id && body.chat.id.includes("@")) {
        senderPhone = body.chat.id.replace(/@.*$/, "");
      }
      // Try messages array
      else if (body.messages?.[0]?.key?.remoteJid) {
        senderPhone = body.messages[0].key.remoteJid.replace(/@.*$/, "");
        if (parseFromMe(body.messages[0].key.fromMe) === true) isIncoming = false;
      }
      // Try from field directly
      else if (body.from) {
        senderPhone = String(body.from).replace(/@.*$/, "");
      }
      // Try chat.phone or chat.number
      else if (body.chat?.phone) {
        senderPhone = String(body.chat.phone);
      }
    }

    if (!isIncoming) {
      console.log("Evento ignorado (não é mensagem recebida):", event);
      return new Response(JSON.stringify({ received: true, action: "ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!senderPhone) {
      console.log("Telefone do remetente não encontrado no payload");
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
    const phoneVariants = [
      cleanedPhone,
      `55${cleanedPhone}`,
      cleanedPhone.length === 11 ? cleanedPhone.substring(1) : null,
    ].filter(Boolean);

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
