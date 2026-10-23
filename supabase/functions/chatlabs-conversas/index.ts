const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://apimain3.chatlabs.com.br";
const SLUG_API = "suavisao";       // /api/* endpoints
const SLUG_REPORTS = "sua_visao";  // /reports/* endpoints

interface Chat {
  id: string;
  channel: string;
  clientId: string;
  createdAt: string;
  closedAt: string | null;
  lastClientMessageAt?: string | null;
}

interface TimelineRow {
  chatId: string;
  startDateTime: string;
  endDateTime: string;
  serviceStatus: string | null;
  conclusionStatus: string | null;
  origin: string | null;
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
      headers: { Authorization: `Bearer ${token}`, "company-slug": SLUG_API },
    });
    if (!r.ok) throw new Error(`Chatlabs /api/chat ${r.status}: ${await r.text()}`);
    const json = await r.json();
    all.push(...(json.data ?? []));
    cursor = json?.paginationInfo?.cursor ?? null;
    safety++;
    if (safety > 200) break;
  } while (cursor);
  return all;
}

async function fetchAllTimeline(token: string, beginDate: string, endDate: string): Promise<TimelineRow[]> {
  const all: TimelineRow[] = [];
  let cursor: string | null = null;
  let safety = 0;
  do {
    const url = new URL(`${BASE}/reports/concluded-chat-timeline-analytics`);
    url.searchParams.set("beginDate", beginDate);
    url.searchParams.set("endDate", endDate);
    url.searchParams.set("chatsPerPage", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "company-slug": SLUG_REPORTS },
    });
    if (!r.ok) throw new Error(`Chatlabs /reports timeline ${r.status}: ${await r.text()}`);
    const json = await r.json();
    all.push(...(json.data ?? []));
    cursor = json?.paginationInfo?.cursor ?? null;
    safety++;
    if (safety > 200) break;
  } while (cursor);
  return all;
}

async function fetchClientTags(token: string, clientId: string): Promise<string[]> {
  const r = await fetch(`${BASE}/api/client/${clientId}`, {
    headers: { Authorization: `Bearer ${token}`, "company-slug": SLUG_API },
  });
  if (!r.ok) return [];
  const j = await r.json();
  const tags = Array.isArray(j?.tags) ? j.tags : [];
  return tags
    .map((t: any) => (typeof t === "string" ? t : t?.name ?? t?.tag ?? ""))
    .filter((s: string) => !!s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const TOKEN = Deno.env.get("CHATLABS_TOKEN");
    if (!TOKEN) throw new Error("CHATLABS_TOKEN não configurado");

    const url = new URL(req.url);
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");
    const includeTags = url.searchParams.get("includeTags") !== "false";

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const startISO = (start ? new Date(start + "T00:00:00.000Z") : firstDay).toISOString();
    const endDate = end ? new Date(end + "T23:59:59.999Z") : today;
    const endISO = endDate.toISOString();
    const startYMD = startISO.slice(0, 10);
    const endYMD = endISO.slice(0, 10);

    const [chats, timeline] = await Promise.all([
      fetchAllChats(TOKEN, startISO, endISO),
      fetchAllTimeline(TOKEN, startYMD, endYMD),
    ]);

    // Status fixos esperados (mesma lista do relatório oficial do Chatlabs)
    const STATUS_FIXOS = [
      "Agendado",
      "Parou de Responder",
      "Achou longe",
      "Achou Caro",
      "Outros",
      "Cirurgia",
      "Exames",
      "Confirmação de agendamento",
      "Cancelamento/Falta",
      "Não atendemos o Convênio",
    ];
    const norm = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
    const fixosNorm = new Map(STATUS_FIXOS.map((s) => [norm(s), s]));

    // Lógica "igual ao CSV": conta CADA segmento da timeline por serviceStatus
    // (não deduplica por cliente nem por chat).
    const porStatus: Record<string, number> = {};
    for (const s of STATUS_FIXOS) porStatus[s] = 0;
    let semStatus = 0;
    let totalSegmentos = 0;
    for (const row of timeline) {
      totalSegmentos++;
      const st = (row.serviceStatus ?? "").trim();
      if (!st) {
        semStatus++;
        continue;
      }
      const canon = fixosNorm.get(norm(st));
      if (canon) porStatus[canon] = (porStatus[canon] ?? 0) + 1;
      else porStatus[st] = (porStatus[st] ?? 0) + 1; // status fora da lista padrão
    }

    // Chats com mensagem do cliente (apenas para origem por tag)
    const chatsComMsgCliente = chats.filter((c) => !!c.lastClientMessageAt);
    const clientesUnicosMap = new Map<string, Chat>();
    for (const c of chatsComMsgCliente) {
      if (!clientesUnicosMap.has(c.clientId)) clientesUnicosMap.set(c.clientId, c);
    }
    const clientesUnicos = Array.from(clientesUnicosMap.values());

    // Origem (tags Google/Meta/Outro do cliente)
    const porTag: Record<string, number> = {};
    let semTag = 0;
    if (includeTags) {
      const ids = Array.from(clientesUnicosMap.keys()).slice(0, 500);
      const tagsMap: Record<string, string[]> = {};
      const CONC = 8;
      for (let i = 0; i < ids.length; i += CONC) {
        const batch = ids.slice(i, i + CONC);
        const results = await Promise.all(
          batch.map((id) => fetchClientTags(TOKEN, id).then((t) => [id, t] as const))
        );
        for (const [id, t] of results) tagsMap[id] = t;
      }
      for (const c of clientesUnicos) {
        const tags = tagsMap[c.clientId] ?? [];
        if (tags.length === 0) semTag++;
        else for (const t of tags) porTag[t] = (porTag[t] ?? 0) + 1;
      }
    }

    const origemMeta = Object.entries(porTag)
      .filter(([k]) => /meta|facebook|instagram/i.test(k))
      .reduce((a, [, v]) => a + v, 0);
    const origemGoogle = Object.entries(porTag)
      .filter(([k]) => /google|adwords|search/i.test(k))
      .reduce((a, [, v]) => a + v, 0);
    const origemOutro = Math.max(0, clientesUnicos.length - origemMeta - origemGoogle);

    return new Response(
      JSON.stringify({
        periodo: { start: startISO, end: endISO },
        // "recebidas" agora = total de atendimentos (segmentos), batendo com o CSV
        recebidas: totalSegmentos,
        totalChats: chats.length,
        chatsComCliente: chatsComMsgCliente.length,
        clientesUnicos: clientesUnicos.length,
        encerrados: chats.filter((c) => !!c.closedAt).length,
        abertos: chats.filter((c) => !c.closedAt).length,
        porStatus,
        semStatus,
        statusFixos: STATUS_FIXOS,
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
