import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { parseIncomingMessage, validInstanceToken, type IncomingMessage } from "../_shared/whatsapp-event.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
declare const EdgeRuntime: { waitUntil(task: Promise<unknown>): void };

async function updateAutomationSummary(db: SupabaseClient, message: IncomingMessage) {
  // LID identifiers are not phone numbers; retain them in the inbox without guessing a lead.
  if (!message.chat_id.endsWith("@s.whatsapp.net")) return;
  const phone = message.chat_id.split("@")[0];
  const { data: disparos, error } = await db.rpc("match_disparo_by_phone", { phone_suffix: phone.slice(-8) });
  if (error || !disparos?.length) return;
  const { data: messages, error: readError } = await db.from("whatsapp_messages")
    .select("body,from_me,message_at").eq("chat_id", message.chat_id)
    .order("message_at", { ascending: false }).order("id", { ascending: false }).limit(50);
  if (readError) throw new Error("Falha ao consultar mensagens novas");
  const history = (messages || []).reverse().map(m => "[" + (m.from_me ? "Vendedor" : "Cliente") + "] " + m.body).join("\n");
  let summary: string | null = null;
  const response = await fetch(Deno.env.get("SUPABASE_URL") + "/functions/v1/summarize-conversa", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") },
    body: JSON.stringify({ history }),
    signal: AbortSignal.timeout(20_000),
  });
  if (response.ok) summary = (await response.json()).summary || null;
  // Historical imported content is preserved in the UI, but never sent to OpenAI here.
  const entry = "[" + new Date(message.message_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) + " - " + (message.from_me ? "Vendedor" : "Cliente") + "] " + message.body;
  for (const disparo of disparos) {
    const { data: current, error: currentError } = await db.from("automacao_disparos").select("historico_conversa").eq("id", disparo.id).single();
    if (currentError) continue;
    const { error: updateError } = await db.from("automacao_disparos").update({
      historico_conversa: current?.historico_conversa ? current.historico_conversa + "\n" + entry : entry,
      ...(!message.from_me ? { resposta_cliente: true } : {}),
      ...(summary ? { observacao: summary } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", disparo.id);
    if (updateError) throw new Error("Falha ao atualizar observação da automação");
  }
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Use POST" }, { status: 405, headers: corsHeaders });
  try {
    const payload = await req.json();
    const expectedToken = Deno.env.get("UAZAPI_TOKEN_DNZ");
    if (!expectedToken) return Response.json({ error: "Instância DNZ não configurada" }, { status: 503, headers: corsHeaders });
    if (!validInstanceToken(payload.token, expectedToken)) return Response.json({ error: "Webhook não autorizado" }, { status: 401, headers: corsHeaders });
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: capture, error: configError } = await db.from("whatsapp_capture_settings").select("started_at").eq("singleton", true).single();
    if (configError || !capture) throw new Error("Captura não configurada");
    const message = parseIncomingMessage(payload, capture.started_at);
    if (!message) return Response.json({ received: true, action: "ignored_event" }, { headers: corsHeaders });
    const { error } = await db.from("whatsapp_messages").insert(message);
    if (error?.code === "23505") return Response.json({ received: true, action: "duplicate" }, { headers: corsHeaders });
    if (error) throw new Error("Falha ao persistir mensagem");
    // Persist first; the expensive AI work never delays acknowledgement to UAZAPI.
    EdgeRuntime.waitUntil(updateAutomationSummary(db, message).catch(() => console.error("Falha na atualização de resumo; mensagem preservada na caixa de entrada")));
    return Response.json({ received: true, action: "captured" }, { headers: corsHeaders });
  } catch {
    // A failed write receives 503 so the provider can retry. No payload/token in logs.
    console.error("Falha ao registrar evento de WhatsApp");
    return Response.json({ error: "Não foi possível registrar a mensagem. Tente novamente." }, { status: 503, headers: corsHeaders });
  }
});
