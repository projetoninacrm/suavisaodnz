import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10) return null;
  if (cleaned.startsWith("55")) return cleaned;
  return "55" + cleaned;
}

async function fetchMessages(phone: string, instancia: string): Promise<string | null> {
  const UAZAPI_URL = Deno.env.get("UAZAPI_URL")!.replace(/\/+$/, "");
  const UAZAPI_TOKEN = (instancia === "uazapi_dnz"
    ? Deno.env.get("UAZAPI_TOKEN_DNZ")
    : Deno.env.get("UAZAPI_TOKEN"))!;

  if (!UAZAPI_URL || !UAZAPI_TOKEN) return null;

  const encodedToken = encodeURIComponent(UAZAPI_TOKEN);
  const chatid = `${phone}@s.whatsapp.net`;

  try {
    const res = await fetch(`${UAZAPI_URL}/message/find?token=${encodedToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
      body: JSON.stringify({ chatid, limit: 50 }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const messages = data.messages || [];
    if (messages.length === 0) return null;

    // Sort by timestamp ascending
    messages.sort((a: any, b: any) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0));

    const lines: string[] = [];
    for (const msg of messages) {
      const role = msg.fromMe ? "Vendedor" : "Cliente";
      let text = msg.text || msg.content?.text || msg.content?.conversation || "";
      
      if (!text) {
        if (msg.content?.mimetype?.includes("audio") || msg.messageType === "audioMessage") text = "[Áudio]";
        else if (msg.content?.mimetype?.includes("image") || msg.messageType === "imageMessage") text = "[Imagem]";
        else if (msg.content?.mimetype?.includes("video") || msg.messageType === "videoMessage") text = "[Vídeo]";
        else if (msg.messageType === "documentMessage") text = "[Documento]";
        else if (msg.messageType === "stickerMessage") text = "[Sticker]";
        else continue;
      }

      const ts = msg.messageTimestamp
        ? new Date(Number(msg.messageTimestamp)).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
        : "";

      lines.push(`[${ts} - ${role}] ${text}`);
    }

    return lines.length > 0 ? lines.join("\n") : null;
  } catch (err) {
    console.error(`Error fetching messages for ${phone}:`, err);
    return null;
  }
}

async function summarize(history: string, mensagemEnviada: string | null, supabaseUrl: string, supabaseKey: string): Promise<string | null> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/summarize-conversa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ history, mensagem_enviada: mensagemEnviada }),
    });
    if (response.ok) {
      const result = await response.json();
      return result.summary || null;
    }
  } catch (err) {
    console.error("Summarize error:", err);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all dispatches with response but no observacao
    const { data: disparos, error } = await supabase
      .from("automacao_disparos")
      .select("id, telefone, nome_cliente, mensagem_enviada, automacao_id, automacoes!inner(instancia)")
      .eq("status", "enviado")
      .eq("resposta_cliente", true)
      .or("observacao.is.null,observacao.eq.")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!disparos || disparos.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum disparo pendente", processed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processando ${disparos.length} disparos`);
    const results: { id: string; nome: string; status: string; observacao?: string }[] = [];

    for (const disparo of disparos) {
      const phone = cleanPhone(disparo.telefone);
      if (!phone) {
        results.push({ id: disparo.id, nome: disparo.nome_cliente || "?", status: "invalid_phone" });
        continue;
      }

      const instancia = (disparo as any).automacoes?.instancia || "uazapi";
      console.log(`Buscando: ${disparo.nome_cliente} (${phone}) via ${instancia}`);

      const history = await fetchMessages(phone, instancia);
      if (!history) {
        results.push({ id: disparo.id, nome: disparo.nome_cliente || "?", status: "no_messages" });
        continue;
      }

      const summary = await summarize(history, disparo.mensagem_enviada, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      if (!summary) {
        results.push({ id: disparo.id, nome: disparo.nome_cliente || "?", status: "summary_failed" });
        continue;
      }

      await supabase
        .from("automacao_disparos")
        .update({
          observacao: summary,
          historico_conversa: history,
          updated_at: new Date().toISOString(),
        })
        .eq("id", disparo.id);

      results.push({ id: disparo.id, nome: disparo.nome_cliente || "?", status: "ok", observacao: summary });
      console.log(`✅ ${disparo.nome_cliente}: ${summary}`);

      // Delay to avoid AI rate limits
      await new Promise(r => setTimeout(r, 2000));
    }

    const processed = results.filter(r => r.status === "ok").length;
    console.log(`Concluído: ${processed}/${disparos.length}`);

    return new Response(JSON.stringify({ processed, total: disparos.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Backfill error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
