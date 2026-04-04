import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
  const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check global pause
    const { data: config } = await supabase
      .from("automacoes_config")
      .select("pausado")
      .limit(1)
      .single();

    if (config?.pausado) {
      return new Response(JSON.stringify({ message: "Automações pausadas globalmente" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === PHASE 1: Queue eligible clients as "agendado" ===
    const queuedCount = await queueEligibleDispatches(supabase);

    // === PHASE 2: Send ONE "agendado" dispatch ===
    const sendResult = await sendNextAgendado(supabase, UAZAPI_URL, UAZAPI_TOKEN);

    return new Response(
      JSON.stringify({
        message: "Processamento concluído",
        enfileirados: queuedCount,
        ...sendResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no processamento:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── PHASE 1: Queue ──────────────────────────────────────────────────────────

async function queueEligibleDispatches(supabase: any): Promise<number> {
  const { data: automacoes } = await supabase
    .from("automacoes")
    .select("*")
    .eq("status", "Ativa");

  if (!automacoes || automacoes.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  let totalQueued = 0;

  for (const automacao of automacoes) {
    let clients: any[] = [];
    const existingDispatchKeys = new Set<string>();

    if (automacao.fonte === "detalhado") {
      let query = supabase
        .from("detalhado")
        .select("*")
        .not("telefone", "is", null)
        .or("receita.eq.Sim,receita.eq.sim,receita.eq.SIM")
        .or("visitou_loja.eq.Não,visitou_loja.eq.não,visitou_loja.eq.NAO,visitou_loja.is.null");

      if (automacao.filtro_como_conheceu && automacao.filtro_como_conheceu.length > 0) {
        query = query.in("como_conheceu", automacao.filtro_como_conheceu);
      }

      const { data } = await query;
      clients = (data || []).map((d: any) => ({
        id: d.id,
        nome: d.nome,
        telefone: d.telefone,
        data_registro: d.data,
        vendedor: null,
        medico: null,
      }));
    } else if (automacao.fonte === "detalhado_inativos") {
      const { data: detalhadoData } = await supabase
        .from("detalhado")
        .select("id, nome, telefone, data")
        .not("telefone", "is", null)
        .not("data", "is", null);

      clients = buildLatestDetalhadoClients(detalhadoData);

      const { data: existingDispatches } = await supabase
        .from("automacao_disparos")
        .select("nome_cliente, telefone")
        .eq("automacao_id", automacao.id);

      (existingDispatches || []).forEach((dispatch: any) => {
        existingDispatchKeys.add(normalizePatientKey(dispatch.nome_cliente, dispatch.telefone));
      });
    } else if (automacao.fonte === "perdidos") {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("status", "Perdido")
        .not("numero", "is", null);

      clients = (data || []).map((l: any) => ({
        id: l.id,
        nome: l.nome,
        telefone: l.numero,
        data_registro: l.updated_at ? new Date(l.updated_at).toLocaleDateString("pt-BR") : null,
        vendedor: l.vendedor,
        medico: l.medico,
      }));
    } else {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("venda", "Sim")
        .not("numero", "is", null);

      clients = (data || []).map((l: any) => ({
        id: l.id,
        nome: l.nome,
        telefone: l.numero,
        data_registro: l.data_registro,
        vendedor: l.vendedor,
        medico: l.medico,
      }));
    }

    if (clients.length === 0) continue;

    for (const client of clients) {
      const dataVenda = parseDate(client.data_registro);
      if (!dataVenda) continue;

      const targetDate = new Date(dataVenda);
      targetDate.setDate(targetDate.getDate() + automacao.dias_apos_venda);
      const targetStr = targetDate.toISOString().split("T")[0];

      if (automacao.fonte === "detalhado_inativos") {
        if (targetDate > today) continue;
        const patientKey = normalizePatientKey(client.nome, client.telefone);
        if (existingDispatchKeys.has(patientKey)) continue;
      } else {
        if (targetStr !== todayStr) continue;
      }

      // Check if already dispatched (any status)
      const { data: existing } = await supabase
        .from("automacao_disparos")
        .select("id")
        .eq("automacao_id", automacao.id)
        .eq("lead_id", client.id)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const phone = cleanPhone(client.telefone);
      if (!phone) continue;

      const mensagem = automacao.mensagem
        .replace(/\{nome_cliente\}/g, client.nome || "Cliente")
        .replace(/\{data_compra\}/g, client.data_registro || "")
        .replace(/\{vendedor\}/g, client.vendedor || "")
        .replace(/\{medico\}/g, client.medico || "");

      // Ensure lead exists for detalhado sources
      if (automacao.fonte === "detalhado" || automacao.fonte === "detalhado_inativos") {
        await supabase.from("leads").upsert(
          {
            id: client.id,
            nome: client.nome,
            numero: client.telefone,
            venda: "Não",
            status: "Ativo",
            data_registro: client.data_registro || null,
          },
          { onConflict: "id" }
        );
      }

      // Insert as "agendado"
      const { error: insertError } = await supabase.from("automacao_disparos").insert({
        automacao_id: automacao.id,
        lead_id: client.id,
        nome_cliente: client.nome,
        telefone: client.telefone,
        mensagem_enviada: mensagem,
        status: "agendado",
        data_programada: automacao.fonte === "detalhado_inativos" ? todayStr : targetStr,
        erro: null,
      });

      if (!insertError) {
        totalQueued++;
        if (automacao.fonte === "detalhado_inativos") {
          existingDispatchKeys.add(normalizePatientKey(client.nome, client.telefone));
        }
      }
    }
  }

  return totalQueued;
}

// ─── PHASE 2: Send next agendado ─────────────────────────────────────────────

async function sendNextAgendado(
  supabase: any,
  UAZAPI_URL: string | undefined,
  UAZAPI_TOKEN: string | undefined,
): Promise<{ enviado: boolean; erro?: string }> {
  // Get the oldest "agendado" dispatch with its automation info
  const { data: pendentes } = await supabase
    .from("automacao_disparos")
    .select("*, automacoes!automacao_disparos_automacao_id_fkey(*)")
    .eq("status", "agendado")
    .order("created_at", { ascending: true })
    .limit(10);

  if (!pendentes || pendentes.length === 0) {
    return { enviado: false };
  }

  // Check daily limit for Sua Visão instance (max 2 per day)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: suavisaoAutomacoes } = await supabase
    .from("automacoes")
    .select("id")
    .neq("instancia", "uazapi_dnz");

  const suavisaoIds = (suavisaoAutomacoes || []).map((a: any) => a.id);
  let suavisaoLimitReached = false;

  if (suavisaoIds.length > 0) {
    const { count: todaySuavisaoCount } = await supabase
      .from("automacao_disparos")
      .select("id", { count: "exact", head: true })
      .eq("status", "enviado")
      .gte("data_envio", todayStart.toISOString())
      .in("automacao_id", suavisaoIds);

    suavisaoLimitReached = (todaySuavisaoCount || 0) >= 2;
  }

  // Find first eligible dispatch
  let disparo: any = null;
  let automacao: any = null;

  for (const candidate of pendentes) {
    const candidateAutomacao = candidate.automacoes;
    if (!candidateAutomacao) {
      await supabase
        .from("automacao_disparos")
        .update({ status: "erro", erro: "Automação não encontrada" })
        .eq("id", candidate.id);
      continue;
    }

    // Skip Sua Visão dispatches if daily limit reached
    if (candidateAutomacao.instancia !== "uazapi_dnz" && suavisaoLimitReached) {
      console.log("Limite diário de 2 disparos atingido para Sua Visão, pulando");
      continue;
    }

    disparo = candidate;
    automacao = candidateAutomacao;
    break;
  }

  if (!disparo || !automacao) {
    if (suavisaoLimitReached) {
      return { enviado: false, erro: "Limite diário Sua Visão atingido (2/2)" };
    }
    return { enviado: false };
  }

  const uazapiToken = automacao.instancia === "uazapi_dnz"
    ? Deno.env.get("UAZAPI_TOKEN_DNZ")
    : UAZAPI_TOKEN;

  const phone = cleanPhone(disparo.telefone);
  if (!phone) {
    await supabase
      .from("automacao_disparos")
      .update({ status: "erro", erro: "Telefone inválido" })
      .eq("id", disparo.id);
    return { enviado: false, erro: "Telefone inválido" };
  }

  if (!UAZAPI_URL || !uazapiToken) {
    await supabase
      .from("automacao_disparos")
      .update({ status: "erro", erro: "UAZAPI não configurada" })
      .eq("id", disparo.id);
    return { enviado: false, erro: "UAZAPI não configurada" };
  }

  try {
    const textResponse = await sendUazapiRequest(UAZAPI_URL, uazapiToken, "/send/text", {
      number: `55${phone}`,
      text: disparo.mensagem_enviada,
    });

    if (!textResponse.ok) {
      const errBody = await textResponse.text();
      const erro = `HTTP ${textResponse.status}: ${errBody.substring(0, 200)}`;
      await supabase
        .from("automacao_disparos")
        .update({ status: "erro", erro })
        .eq("id", disparo.id);
      return { enviado: false, erro };
    }

    // Text sent successfully — now try audio
    const client = {
      nome: disparo.nome_cliente,
      vendedor: null as string | null,
    };

    // Try to get vendedor from lead
    const { data: leadData } = await supabase
      .from("leads")
      .select("vendedor")
      .eq("id", disparo.lead_id)
      .limit(1)
      .single();

    if (leadData) client.vendedor = leadData.vendedor;

    const audioUrl =
      (client.vendedor && automacao.audios_vendedor?.[client.vendedor]) ||
      automacao.audios_vendedor?.["Thayssa"] ||
      automacao.audio_url;

    if (audioUrl) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await sendUazapiRequest(UAZAPI_URL, uazapiToken, "/send/media", {
          number: `55${phone}`,
          file: audioUrl,
          type: "audio",
          ptt: true,
        });
      } catch (audioErr) {
        console.error(`Audio send error for ${disparo.nome_cliente}:`, audioErr);
      }
    }

    // Mark as sent
    await supabase
      .from("automacao_disparos")
      .update({ status: "enviado", data_envio: new Date().toISOString() })
      .eq("id", disparo.id);

    await supabase
      .from("automacoes")
      .update({ total_envios: automacao.total_envios + 1 })
      .eq("id", automacao.id);

    // Send notification to admin via DNZ instance (always available)
    const NOTIFY_PHONE = "5531971759662";
    const notifyMsg = `✅ *Automação disparada*\n\n📋 *Automação:* ${automacao.nome}\n👤 *Cliente:* ${disparo.nome_cliente || "N/A"}\n📱 *Telefone:* ${disparo.telefone || "N/A"}\n🕐 *Horário:* ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;
    const notifyToken = Deno.env.get("UAZAPI_TOKEN_DNZ") || uazapiToken;
    try {
      await sendUazapiRequest(UAZAPI_URL!, notifyToken, "/send/text", {
        number: NOTIFY_PHONE,
        text: notifyMsg,
      });
    } catch (notifyErr) {
      console.error("Erro ao enviar notificação admin:", notifyErr);
    }

    return { enviado: true };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Erro desconhecido";
    await supabase
      .from("automacao_disparos")
      .update({ status: "erro", erro })
      .eq("id", disparo.id);
    return { enviado: false, erro };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sendUazapiRequest(
  baseUrl: string,
  token: string,
  path: string,
  payload: unknown,
): Promise<Response> {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const requestBody = JSON.stringify(payload);
  const encodedToken = encodeURIComponent(token);

  const attempts: Array<{ url: string; headers: Record<string, string> }> = [
    {
      url: `${normalizedBase}${path}`,
      headers: { "Content-Type": "application/json", token },
    },
    {
      url: `${normalizedBase}${path}`,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    },
    {
      url: `${normalizedBase}${path}?token=${encodedToken}`,
      headers: { "Content-Type": "application/json" },
    },
    {
      url: `${normalizedBase}${path}?admintoken=${encodedToken}&token=${encodedToken}`,
      headers: { "Content-Type": "application/json" },
    },
  ];

  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: "POST",
        headers: attempt.headers,
        body: requestBody,
      });

      if (response.ok) return response;
      lastResponse = response;
      if (response.status !== 401 && response.status !== 403) return response;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error("Falha ao conectar com UAZAPI");
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10) return null;
  if (cleaned.startsWith("55") && cleaned.length >= 12) return cleaned.substring(2);
  return cleaned;
}

function normalizePatientKey(nome: string | null, telefone: string | null): string {
  const normalizedPhone = cleanPhone(telefone);
  if (normalizedPhone) return `phone:${normalizedPhone}`;
  return `name:${(nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()}`;
}

function buildLatestDetalhadoClients(
  records: Array<{ id: string; nome: string | null; telefone: string | null; data: string | null }> | null,
) {
  const latestMap = new Map<
    string,
    { id: string; nome: string | null; telefone: string | null; data_registro: string | null; vendedor: null; medico: null; parsedDate: Date }
  >();

  for (const record of records || []) {
    const parsedDate = parseDate(record.data);
    if (!parsedDate || !record.telefone) continue;

    const key = normalizePatientKey(record.nome, record.telefone);
    const existing = latestMap.get(key);

    if (!existing || parsedDate > existing.parsedDate) {
      latestMap.set(key, {
        id: record.id,
        nome: record.nome,
        telefone: record.telefone,
        data_registro: record.data,
        vendedor: null,
        medico: null,
        parsedDate,
      });
    }
  }

  return Array.from(latestMap.values()).map(({ parsedDate, ...client }) => client);
}
