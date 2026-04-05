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

function extractMessageText(body: any): string | null {
  const msg = body.message || body.data?.message || body.data?.messages?.[0]?.message;
  if (!msg) return null;

  // uazapi format: content can be string or { text: "..." }
  if (typeof msg.content === "string") return msg.content;
  if (typeof msg.content?.text === "string") return msg.content.text;

  if (typeof msg.conversation === "string") return msg.conversation;
  if (typeof msg.extendedTextMessage?.text === "string") return msg.extendedTextMessage.text;
  if (typeof msg.text === "string") return msg.text;
  if (typeof msg.body === "string") return msg.body;
  
  // uazapi direct body.message as string
  if (typeof body.message === "string") return body.message;
  
  // data.body or data.text
  if (typeof body.data?.body === "string") return body.data.body;
  if (typeof body.data?.text === "string") return body.data.text;

  // Audio/media - indicate type
  if (msg.audioMessage) return "[Áudio recebido]";
  if (msg.imageMessage) return "[Imagem recebida]";
  if (msg.videoMessage) return "[Vídeo recebido]";
  if (msg.documentMessage) return "[Documento recebido]";
  if (msg.stickerMessage) return "[Sticker recebido]";
  if (msg.mediaType === "audio" || msg.messageType === "audioMessage") return "[Áudio recebido]";
  if (msg.mediaType === "image" || msg.messageType === "imageMessage") return "[Imagem recebida]";

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
    else if (body.EventType === "messages") {
      const messageFromMe = parseFromMe(body.message?.fromMe);
      if (messageFromMe === true) {
        isIncoming = false;
      } else {
        isIncoming = true;
      }

      if (body.message?.key?.remoteJid) {
        senderPhone = body.message.key.remoteJid.replace(/@.*$/, "");
        if (parseFromMe(body.message.key.fromMe) === true) isIncoming = false;
      }
      else if (body.chat?.wa_chatid) {
        senderPhone = body.chat.wa_chatid.replace(/@.*$/, "");
      }
      else if (body.chat?.id && body.chat.id.includes("@")) {
        senderPhone = body.chat.id.replace(/@.*$/, "");
      }
      else if (body.messages?.[0]?.key?.remoteJid) {
        senderPhone = body.messages[0].key.remoteJid.replace(/@.*$/, "");
        if (parseFromMe(body.messages[0].key.fromMe) === true) isIncoming = false;
      }
      else if (body.chat?.phone) {
        senderPhone = String(body.chat.phone);
      }
      else if (body.message?.chatid) {
        senderPhone = body.message.chatid.replace(/@.*$/, "");
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

    // Extract message text from payload
    const messageText = extractMessageText(body);
    console.log(`Mensagem recebida de: ${senderPhone}, texto: ${messageText?.substring(0, 100) || "(sem texto)"}`);

    // Clean phone for matching
    const cleanedPhone = cleanPhone(senderPhone);
    if (!cleanedPhone) {
      console.log("Telefone inválido:", senderPhone);
      return new Response(JSON.stringify({ received: true, action: "invalid_phone" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Connect to Supabase
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find dispatches sent to this phone
    const last8 = cleanedPhone.slice(-8);

    const { data: disparos, error } = await supabase
      .rpc("match_disparo_by_phone", { phone_suffix: last8 });

    if (error) {
      console.error("Erro ao buscar disparos (tentando fallback):", error.message);
      
      const phoneVariants = [
        cleanedPhone,
        `55${cleanedPhone}`,
        cleanedPhone.length === 11 ? cleanedPhone.substring(1) : null,
      ].filter(Boolean);

      const digitPatterns: string[] = [];
      for (const variant of phoneVariants) {
        const last = variant!.slice(-8);
        const wildcardPattern = `%${last.split("").join("%")}%`;
        digitPatterns.push(wildcardPattern);
      }

      const { data: fallbackDisparos, error: fallbackError } = await supabase
        .from("automacao_disparos")
        .select("id, telefone, resposta_cliente, observacao")
        .eq("status", "enviado")
        .eq("resposta_cliente", false)
        .or(digitPatterns.map(p => `telefone.like.${p}`).join(","));

      if (fallbackError) {
        console.error("Erro no fallback:", fallbackError.message);
        return new Response(JSON.stringify({ received: true, action: "db_error" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!fallbackDisparos || fallbackDisparos.length === 0) {
        console.log(`Nenhum disparo pendente encontrado para ${cleanedPhone}`);
        return new Response(JSON.stringify({ received: true, action: "no_match" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ids = fallbackDisparos.map(d => d.id);
      console.log(`[fallback] Marcando ${ids.length} disparo(s) como respondido(s): ${ids.join(", ")}`);

      // Build observacao with message text
      for (const disparo of fallbackDisparos) {
        const newObs = buildObservacao(disparo.observacao, messageText);
        await supabase
          .from("automacao_disparos")
          .update({ 
            resposta_cliente: true, 
            observacao: newObs,
            updated_at: new Date().toISOString() 
          })
          .eq("id", disparo.id);
      }

      return new Response(
        JSON.stringify({ received: true, action: "marked_responded", count: ids.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!disparos || disparos.length === 0) {
      console.log(`Nenhum disparo pendente encontrado para ${cleanedPhone}`);
      return new Response(JSON.stringify({ received: true, action: "no_match" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark all matching dispatches as responded and save message text
    const ids = disparos.map((d: any) => d.id);
    console.log(`Marcando ${ids.length} disparo(s) como respondido(s): ${ids.join(", ")}`);

    // Get current observacao for each dispatch to append
    for (const disparo of disparos) {
      const { data: current } = await supabase
        .from("automacao_disparos")
        .select("observacao")
        .eq("id", disparo.id)
        .single();

      const newObs = buildObservacao(current?.observacao, messageText);
      await supabase
        .from("automacao_disparos")
        .update({ 
          resposta_cliente: true, 
          observacao: newObs,
          updated_at: new Date().toISOString() 
        })
        .eq("id", disparo.id);
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

function buildObservacao(existing: string | null, messageText: string | null): string {
  if (!messageText) return existing || "";
  
  const timestamp = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const newEntry = `[${timestamp}] ${messageText}`;
  
  if (existing && existing.trim()) {
    return `${existing}\n${newEntry}`;
  }
  return newEntry;
}
