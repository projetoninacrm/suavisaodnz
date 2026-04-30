import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://apimain3.chatlabs.com.br";
const SLUG = "suavisao";

interface Chat {
  id: string;
  channel: string;
  clientId: string;
  client?: { id: string; name?: string | null };
  createdAt: string;
  closedAt: string | null;
  department?: { id: string; name: string } | null;
}

async function fetchAllChats(token: string, startISO: string, endISO: string): Promise<Chat[]> {
  const all: Chat[] = [];
  let cursor: string | null = null;
  let safety = 0;
  do {
    const url = new URL(`${BASE}/api/chat`);
    url.searchParams.set("perPage", "100");
    url.searchParams.set("createdAtStart", startISO);
    url.searchParams.set("createdAtEnd", endISO);
    if (cursor) url.searchParams.set("cursor", cursor);
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "company-slug": SLUG },
    });
    if (!r.ok) throw new Error(`Chatlabs /api/chat ${r.status}: ${await r.text()}`);
    const json = await r.json();
    all.push(...(json.data ?? []));
    cursor = json?.paginationInfo?.cursor ?? null;
    safety++;
    if (safety > 200) break; // hard stop ~20k chats
  } while (cursor);
  return all;
}

async function fetchClientTags(token: string, clientId: string): Promise<string[]> {
  const r = await fetch(`${BASE}/api/client/${clientId}`, {
    headers: { Authorization: `Bearer ${token}`, "company-slug": SLUG },
  });
  if (!r.ok) return [];
  const j = await r.json();
  const tags = Array.isArray(j?.tags) ? j.tags : [];
  return tags
    .map((t: any) => (typeof t === "string" ? t : t?.name ?? t?.tag ?? ""))
    .filter((s: string) => !!s);
}

function normalizeChannel(c: string): "Meta" | "Google" | "Outro" {
  // canal técnico não distingue Meta vs Google, então tudo cai em "Outro" por canal.
  // A separação Meta/Google/Outro real virá das tags do cliente.
  if (!c) return "Outro";
  const u = c.toUpperCase();
  if (u.includes("INSTAGRAM") || u.includes("FACEBOOK")) return "Meta";
  return "Outro";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const TOKEN = Deno.env.get("CHATLABS_TOKEN");
    if (!TOKEN) throw new Error("CHATLABS_TOKEN não configurado");

    const url = new URL(req.url);
    const start = url.searchParams.get("start"); // YYYY-MM-DD
    const end = url.searchParams.get("end");
    const includeTags = url.searchParams.get("includeTags") !== "false";

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const startISO = (start ? new Date(start + "T00:00:00.000Z") : firstDay).toISOString();
    const endDate = end ? new Date(end + "T23:59:59.999Z") : today;
    const endISO = endDate.toISOString();

    const chats = await fetchAllChats(TOKEN, startISO, endISO);

    // Origem por canal
    const porCanal: Record<string, number> = { Meta: 0, Google: 0, Outro: 0 };
    for (const c of chats) {
      const k = normalizeChannel(c.channel);
      porCanal[k] = (porCanal[k] ?? 0) + 1;
    }

    // Status (Kanban) baseado em tags do cliente
    // Para evitar 1 request por chat, agrupamos por clientId único
    const tagsPorChat: Record<string, string[]> = {};
    const porTag: Record<string, number> = {};
    let semTag = 0;

    if (includeTags) {
      const uniqueClients = Array.from(new Set(chats.map((c) => c.clientId).filter(Boolean)));
      // Limita para não explodir tempo de execução
      const MAX_CLIENTS = 500;
      const slice = uniqueClients.slice(0, MAX_CLIENTS);
      const clientTagsMap: Record<string, string[]> = {};

      const CONCURRENCY = 8;
      for (let i = 0; i < slice.length; i += CONCURRENCY) {
        const batch = slice.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map((id) => fetchClientTags(TOKEN, id).then((t) => [id, t] as const)));
        for (const [id, t] of results) clientTagsMap[id] = t;
      }

      for (const c of chats) {
        const tags = clientTagsMap[c.clientId] ?? [];
        tagsPorChat[c.id] = tags;
        if (tags.length === 0) {
          semTag++;
        } else {
          for (const t of tags) porTag[t] = (porTag[t] ?? 0) + 1;
        }
      }
    }

    // Origem real preferindo tags conhecidas
    const origemMeta = Object.entries(porTag)
      .filter(([k]) => /meta|facebook|instagram/i.test(k))
      .reduce((a, [, v]) => a + v, 0);
    const origemGoogle = Object.entries(porTag)
      .filter(([k]) => /google|adwords|search/i.test(k))
      .reduce((a, [, v]) => a + v, 0);
    const origemOutro = Math.max(0, chats.length - origemMeta - origemGoogle);

    return new Response(
      JSON.stringify({
        periodo: { start: startISO, end: endISO },
        recebidas: chats.length,
        encerrados: chats.filter((c) => !!c.closedAt).length,
        abertos: chats.filter((c) => !c.closedAt).length,
        porCanal,
        porTag,
        semTag,
        origem: { meta: origemMeta, google: origemGoogle, outro: origemOutro },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chatlabs-conversas error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
