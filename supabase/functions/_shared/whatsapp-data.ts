import { createClient } from "jsr:@supabase/supabase-js@2";

export const whatsappCors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
export class WhatsAppDataError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function loadForwardMessages(req: Request) {
  const authorization = req.headers.get("authorization");
  if (!authorization) throw new WhatsAppDataError("Entre na plataforma para consultar as conversas.", 401);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await db.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (authError || !auth.user) throw new WhatsAppDataError("Sessão inválida.", 401);
  const url = new URL(req.url);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const start = url.searchParams.get("start") || today.slice(0, 8) + "01";
  const end = url.searchParams.get("end") || today;
  for (const date of [start, end]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date) throw new WhatsAppDataError("Período inválido.", 400);
  }
  if (start > end) throw new WhatsAppDataError("O início deve ser anterior ao fim.", 400);
  const sample = Number(url.searchParams.get("sample") || 20);
  if (!Number.isInteger(sample) || sample < 1 || sample > 50) throw new WhatsAppDataError("A amostra deve conter de 1 a 50 conversas.", 400);
  const { data: capture, error: captureError } = await db.from("whatsapp_capture_settings").select("started_at").eq("singleton", true).single();
  if (captureError || !capture) throw new WhatsAppDataError("A captura de novas mensagens ainda não foi configurada.", 503);
  const startAt = new Date(Math.max(Date.parse(start + "T00:00:00-03:00"), Date.parse(capture.started_at))).toISOString();
  const endAt = new Date(end + "T23:59:59.999-03:00").toISOString();
  const { data, error, count } = await db.from("whatsapp_messages").select("chat_id,from_me,body,message_at,id", { count: "exact" }).gte("message_at", startAt).lte("message_at", endAt).order("message_at", { ascending: false }).order("id", { ascending: false }).limit(1000);
  if (error) throw new WhatsAppDataError("Não foi possível consultar as novas mensagens.", 503);
  const chats = new Map<string, Array<{ from_me: boolean; body: string }>>();
  for (const message of data || []) {
    const rows = chats.get(message.chat_id) || [];
    if (rows.length < 50) rows.push(message);
    chats.set(message.chat_id, rows);
  }
  const sampleChats = [...chats.values()].slice(0, sample).map((rows, index) => ({
    id: index,
    text: rows.reverse().map(m => `[${m.from_me ? "Atendente" : "Cliente"}] ${m.body}`).join("\n").slice(-6000),
  }));
  return { start, end, startedAt: capture.started_at, count: count ?? 0, examined: data?.length || 0, truncated: (count || 0) > (data?.length || 0), chatCount: chats.size, incoming: (data || []).filter(m => !m.from_me).length, outgoing: (data || []).filter(m => m.from_me).length, sampleChats };
}
