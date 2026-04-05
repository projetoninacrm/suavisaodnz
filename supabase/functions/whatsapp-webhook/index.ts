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

  if (typeof msg.content === "string") return msg.content;
  if (typeof msg.content?.text === "string") return msg.content.text;
  if (typeof msg.conversation === "string") return msg.conversation;
  if (typeof msg.extendedTextMessage?.text === "string") return msg.extendedTextMessage.text;
  if (typeof msg.text === "string") return msg.text;
  if (typeof msg.body === "string") return msg.body;
  if (typeof body.message === "string") return body.message;
  if (typeof body.data?.body === "string") return body.data.body;
  if (typeof body.data?.text === "string") return body.data.text;

  if (msg.audioMessage) return "[Áudio]";
  if (msg.imageMessage) return "[Imagem]";
  if (msg.videoMessage) return "[Vídeo]";
  if (msg.documentMessage) return "[Documento]";
  if (msg.stickerMessage) return "[Sticker]";
  if (msg.mediaType === "audio" || msg.messageType === "audioMessage") return "[Áudio]";
  if (msg.mediaType === "image" || msg.messageType === "imageMessage") return "[Imagem]";

  return null;
}

/** Detect sender phone and whether the message is fromMe */
function detectMessage(body: any): { phone: string | null; fromMe: boolean | null } {
  let phone: string | null = null;
  let fromMe: boolean | null = null;

  // Evolution API formats
  if (body.data?.key?.remoteJid) {
    fromMe = parseFromMe(body.data.key.fromMe);
    phone = body.data.key.remoteJid.replace(/@.*$/, "") || null;
  } else if (body.data?.message?.key?.remoteJid) {
    fromMe = parseFromMe(body.data.message.key.fromMe);
    phone = body.data.message.key.remoteJid.replace(/@.*$/, "") || null;
  } else if (body.data?.messages?.[0]?.key?.remoteJid) {
    fromMe = parseFromMe(body.data.messages[0].key.fromMe);
    phone = body.data.messages[0].key.remoteJid.replace(/@.*$/, "") || null;
  }
  // uazapi simple
  else if (body.data?.from) {
    fromMe = parseFromMe(body.data?.key?.fromMe);
    phone = String(body.data.from);
  }
  // Green API
  else if (body.senderData?.sender) {
    fromMe = false;
    phone = body.senderData.sender.replace(/@.*$/, "");
  }
  // uazapi EventType: "messages"
  else if (body.EventType === "messages") {
    fromMe = parseFromMe(body.message?.fromMe);

    if (body.message?.key?.remoteJid) {
      phone = body.message.key.remoteJid.replace(/@.*$/, "");
      if (parseFromMe(body.message.key.fromMe) === true) fromMe = true;
    } else if (body.chat?.wa_chatid) {
      phone = body.chat.wa_chatid.replace(/@.*$/, "");
    } else if (body.chat?.id && body.chat.id.includes("@")) {
      phone = body.chat.id.replace(/@.*$/, "");
    } else if (body.messages?.[0]?.key?.remoteJid) {
      phone = body.messages[0].key.remoteJid.replace(/@.*$/, "");
      if (parseFromMe(body.messages[0].key.fromMe) === true) fromMe = true;
    } else if (body.chat?.phone) {
      phone = String(body.chat.phone);
    } else if (body.message?.chatid) {
      phone = body.message.chatid.replace(/@.*$/, "");
    }
  }

  return { phone, fromMe };
}

/** Find matching pending disparos by phone suffix */
async function findDisparos(supabase: any, cleanedPhone: string) {
  const last8 = cleanedPhone.slice(-8);

  const { data, error } = await supabase.rpc("match_disparo_by_phone", { phone_suffix: last8 });

  if (!error && data && data.length > 0) return data;

  // Fallback: LIKE matching
  const phoneVariants = [
    cleanedPhone,
    `55${cleanedPhone}`,
    cleanedPhone.length === 11 ? cleanedPhone.substring(1) : null,
  ].filter(Boolean);

  const digitPatterns: string[] = [];
  for (const variant of phoneVariants) {
    const last = variant!.slice(-8);
    digitPatterns.push(`%${last.split("").join("%")}%`);
  }

  const { data: fallback } = await supabase
    .from("automacao_disparos")
    .select("id, telefone, resposta_cliente, observacao, historico_conversa")
    .eq("status", "enviado")
    .or(digitPatterns.map(p => `telefone.like.${p}`).join(","));

  return fallback || [];
}

/** Append a message entry to the raw conversation history */
function appendToHistory(existing: string | null, role: string, text: string): string {
  const timestamp = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const entry = `[${timestamp} - ${role}] ${text}`;
  if (existing && existing.trim()) {
    return `${existing}\n${entry}`;
  }
  return entry;
}

/** Call AI to summarize the conversation history */
async function summarizeConversation(history: string, supabaseUrl: string, supabaseKey: string): Promise<string | null> {
  // Try calling our own summarization edge function
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/summarize-conversa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ history }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.summary || null;
    }
    console.error("Summarization function failed:", response.status);
  } catch (err) {
    console.error("Summarization function error:", err);
  }

  // Fallback: extract last few messages as summary
  return fallbackSummary(history);
}

/** Simple fallback when AI is not available */
function fallbackSummary(history: string): string {
  const lines = history.trim().split("\n").filter(l => l.trim());
  const lastLines = lines.slice(-4);
  return lastLines.join(" | ").substring(0, 300);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook payload keys:", Object.keys(body));
    console.log("Webhook recebido:", JSON.stringify(body).substring(0, 2000));

    const { phone: senderPhone, fromMe } = detectMessage(body);

    if (!senderPhone) {
      console.log("Telefone do remetente não encontrado no payload");
      return new Response(JSON.stringify({ received: true, action: "no_phone" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageText = extractMessageText(body);
    if (!messageText) {
      console.log("Sem texto na mensagem, ignorando");
      return new Response(JSON.stringify({ received: true, action: "no_text" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanedPhone = cleanPhone(senderPhone);
    if (!cleanedPhone) {
      console.log("Telefone inválido:", senderPhone);
      return new Response(JSON.stringify({ received: true, action: "invalid_phone" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const role = fromMe === true ? "Vendedor" : "Cliente";
    console.log(`Mensagem de ${role} (${cleanedPhone}): ${messageText.substring(0, 100)}`);

    // Connect to Supabase
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find matching disparos
    const disparos = await findDisparos(supabase, cleanedPhone);

    if (!disparos || disparos.length === 0) {
      console.log(`Nenhum disparo encontrado para ${cleanedPhone}`);
      return new Response(JSON.stringify({ received: true, action: "no_match" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Encontrados ${disparos.length} disparo(s) para ${cleanedPhone}`);

    for (const disparo of disparos) {
      // Get current state
      const { data: current } = await supabase
        .from("automacao_disparos")
        .select("historico_conversa, observacao, resposta_cliente")
        .eq("id", disparo.id)
        .single();

      // Append to raw history
      const newHistory = appendToHistory(current?.historico_conversa || null, role, messageText);

      // Build update object
      const updateData: any = {
        historico_conversa: newHistory,
        updated_at: new Date().toISOString(),
      };

      // If incoming message from client, mark as responded
      if (fromMe !== true) {
        updateData.resposta_cliente = true;
      }

      // Generate AI summary of the conversation
      const summary = await summarizeConversation(newHistory);
      if (summary) {
        updateData.observacao = summary;
        console.log(`Resumo IA para disparo ${disparo.id}: ${summary}`);
      }

      await supabase
        .from("automacao_disparos")
        .update(updateData)
        .eq("id", disparo.id);
    }

    return new Response(
      JSON.stringify({ received: true, action: "processed", role, count: disparos.length }),
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
