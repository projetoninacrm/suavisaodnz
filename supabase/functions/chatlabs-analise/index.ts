import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const BASE = "https://apimain3.chatlabs.com.br";
const SLUG_API = "suavisao";
const SLUG_REPORTS = "sua_visao";

async function fetchTimeline(token: string, beginDate: string, endDate: string) {
  const all: any[] = [];
  let cursor: string | null = null;
  let safety = 0;
  do {
    const url = new URL(`${BASE}/reports/concluded-chat-timeline-analytics`);
    url.searchParams.set("beginDate", beginDate);
    url.searchParams.set("endDate", endDate);
    url.searchParams.set("chatsPerPage", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "company-slug": SLUG_REPORTS } });
    if (!r.ok) throw new Error(`timeline ${r.status}: ${await r.text()}`);
    const j = await r.json();
    all.push(...(j.data ?? []));
    cursor = j?.paginationInfo?.cursor ?? null;
    safety++;
    if (safety > 100) break;
  } while (cursor);
  return all;
}

async function fetchChatMessages(token: string, chatId: string): Promise<any[]> {
  const candidates = [
    `${BASE}/api/chat/${chatId}/messages?perPage=200`,
    `${BASE}/api/chat/${chatId}/message?perPage=200`,
    `${BASE}/api/message?chatId=${chatId}&perPage=200`,
    `${BASE}/api/chat-message?chatId=${chatId}&perPage=200`,
  ];
  for (const url of candidates) {
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "company-slug": SLUG_API } });
      if (!r.ok) continue;
      const j = await r.json();
      const data = j?.data ?? j?.messages ?? j;
      if (Array.isArray(data) && data.length >= 0) return data;
    } catch (_) { /* keep trying */ }
  }
  return [];
}

function isOperatorMsg(m: any): boolean {
  const truthy = m.fromMe ?? m.isFromMe ?? m.sentByOperator ?? m.fromOperator;
  if (typeof truthy === "boolean") return truthy;
  if (m.author === "operator" || m.sender === "operator" || m.origin === "operator") return true;
  if (m.author === "client" || m.sender === "client" || m.origin === "client") return false;
  if (m.direction) return m.direction === "outbound" || m.direction === "out";
  if (m.operator || m.operatorId || m.userId || m.attendantId) return true;
  // Heuristic: chatlabs prefixes operator messages with _*Name*_
  const text = m.text ?? m.body ?? m.content ?? m.message ?? "";
  if (typeof text === "string" && /^_\*.+\*_/.test(text.trim())) return true;
  return false;
}

function cleanText(t: string): string {
  return t.replace(/^_\*[^*]+\*_\s*\n*/g, "").trim();
}

function formatMessages(msgs: any[]): string {
  return msgs.map((m) => {
    const who = isOperatorMsg(m) ? "Atendente" : "Cliente";
    const raw = m.text ?? m.body ?? m.content ?? m.message ?? "";
    const text = cleanText(typeof raw === "string" ? raw : JSON.stringify(raw));
    if (!text || text.startsWith("Transferência de conversa")) return "";
    return `[${who}] ${text}`;
  }).filter((l) => l.length > 4).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const TOKEN = Deno.env.get("CHATLABS_TOKEN");
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!TOKEN) throw new Error("CHATLABS_TOKEN ausente");
    if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const url = new URL(req.url);
    const today = new Date();
    const start = url.searchParams.get("start") ?? new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const end = url.searchParams.get("end") ?? today.toISOString().slice(0, 10);
    const sampleSize = Number(url.searchParams.get("sample") ?? "20");
    const debug = url.searchParams.get("debug") === "1";

    const timeline = await fetchTimeline(TOKEN, start, end);

    const isAgendado = (s: string | null) => !!s && /agendad/i.test(s);
    const agendadas = timeline.filter((t) => isAgendado(t.serviceStatus));
    const naoAgendadas = timeline.filter((t) => t.serviceStatus && !isAgendado(t.serviceStatus));

    // Sort by most recent and sample
    const byDate = (a: any, b: any) => (b.endDateTime ?? "").localeCompare(a.endDateTime ?? "");
    const pickA = agendadas.sort(byDate).slice(0, sampleSize);
    const pickN = naoAgendadas.sort(byDate).slice(0, sampleSize);

    // Fetch messages
    const fetchAll = async (rows: any[]) => {
      const out: { chatId: string; status: string; text: string }[] = [];
      const CONC = 4;
      for (let i = 0; i < rows.length; i += CONC) {
        const batch = rows.slice(i, i + CONC);
        const res = await Promise.all(batch.map(async (r) => {
          const msgs = await fetchChatMessages(TOKEN, r.chatId);
          return { chatId: r.chatId, status: r.serviceStatus ?? "", text: formatMessages(msgs).slice(0, 2200) };
        }));
        out.push(...res);
      }
      return out;
    };

    const [convA, convN] = await Promise.all([fetchAll(pickA), fetchAll(pickN)]);

    if (debug) {
      return new Response(JSON.stringify({
        periodo: { start, end },
        totais: { timeline: timeline.length, agendadas: agendadas.length, naoAgendadas: naoAgendadas.length },
        amostra: { agendadas: convA.length, naoAgendadas: convN.length },
        primeiraAgendada: convA[0],
        primeiraNaoAgendada: convN[0],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const blocoA = convA.map((c, i) => `--- CONVERSA AGENDADA #${i + 1} (chatId ${c.chatId}, status: ${c.status}) ---\n${c.text || "(sem mensagens recuperadas)"}`).join("\n\n");
    const blocoN = convN.map((c, i) => `--- CONVERSA NÃO AGENDADA #${i + 1} (chatId ${c.chatId}, status: ${c.status}) ---\n${c.text || "(sem mensagens recuperadas)"}`).join("\n\n");

    const SYSTEM = `Você é um especialista em vendas consultivas no WhatsApp para uma clínica oftalmológica/ótica.
Vai receber dois grupos de conversas reais: AGENDADAS (cliente fechou consulta) e NÃO AGENDADAS (cliente não fechou).
Sua tarefa é produzir um relatório executivo em português brasileiro, MUITO ACIONÁVEL, com as seções:

1. RESUMO EXECUTIVO (3-5 bullets com o que mais explica a diferença entre agendar e não agendar)
2. PADRÕES DE SUCESSO (o que aparece nas AGENDADAS): tom, gatilhos, perguntas, abordagens, velocidade de resposta, uso de áudio, oferta de horários, etc.
3. PADRÕES DE PERDA (o que aparece nas NÃO AGENDADAS): objeções principais (preço, distância, convênio, tempo), falhas do atendente, momentos em que cliente parou de responder.
4. PONTOS CRUCIAIS DE VIRADA: as 3-5 ações específicas do atendente que mais correlacionam com o fechamento.
5. FRASES/SCRIPTS RECOMENDADOS: 5-8 frases prontas baseadas no que funcionou.
6. ALERTAS: 3-5 erros recorrentes a evitar.
7. RECOMENDAÇÕES DE TREINAMENTO: passos práticos para a equipe.

Seja específico, cite exemplos curtos entre aspas tirados das conversas. Não invente dados. Se as mensagens estiverem vazias, diga claramente.`;

    const user = `PERÍODO: ${start} a ${end}\nAMOSTRA: ${convA.length} agendadas e ${convN.length} não agendadas.\n\n=== AGENDADAS ===\n${blocoA}\n\n=== NÃO AGENDADAS ===\n${blocoN}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
        temperature: 0.4,
      }),
    });
    if (!aiRes.ok) throw new Error(`AI ${aiRes.status}: ${await aiRes.text()}`);
    const aiJ = await aiRes.json();
    const report = aiJ.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({
      periodo: { start, end },
      totais: { timeline: timeline.length, agendadas: agendadas.length, naoAgendadas: naoAgendadas.length },
      amostra: { agendadas: convA.length, naoAgendadas: convN.length },
      mensagensRecuperadas: {
        agendadasComMsg: convA.filter((c) => c.text).length,
        naoAgendadasComMsg: convN.filter((c) => c.text).length,
      },
      relatorio: report,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("chatlabs-analise error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});