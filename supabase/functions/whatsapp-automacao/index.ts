import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ensureEvolutionWebhookConfigured } from "../_shared/evolution-webhook.ts";

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
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
  const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE");
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

    // Get active automations
    const { data: automacoes } = await supabase
      .from("automacoes")
      .select("*")
      .eq("status", "Ativa");

    if (!automacoes || automacoes.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma automação ativa" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    let totalProcessed = 0;
    let totalSent = 0;
    let totalErrors = 0;
    let evolutionWebhookChecked = false;

    for (const automacao of automacoes) {
      let clients: any[] = [];
      const existingDispatchKeys = new Set<string>();
      const useUazapi = automacao.instancia === "uazapi" || automacao.instancia === "uazapi_dnz";
      const uazapiToken = automacao.instancia === "uazapi_dnz"
        ? Deno.env.get("UAZAPI_TOKEN_DNZ")
        : UAZAPI_TOKEN;

      if (!useUazapi && !evolutionWebhookChecked && EVOLUTION_API_URL && EVOLUTION_API_KEY && EVOLUTION_INSTANCE) {
        try {
          await ensureEvolutionWebhookConfigured({
            evolutionApiUrl: EVOLUTION_API_URL,
            evolutionApiKey: EVOLUTION_API_KEY,
            instance: EVOLUTION_INSTANCE,
            webhookUrl: `${SUPABASE_URL}/functions/v1/whatsapp-webhook`,
          });
        } catch (webhookError) {
          console.error("Falha ao configurar webhook da Evolution:", webhookError);
        } finally {
          evolutionWebhookChecked = true;
        }
      }

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
        clients = (data || []).map(d => ({
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

        (existingDispatches || []).forEach((dispatch) => {
          existingDispatchKeys.add(normalizePatientKey(dispatch.nome_cliente, dispatch.telefone));
        });
      } else if (automacao.fonte === "perdidos") {
        const { data } = await supabase
          .from("leads")
          .select("*")
          .eq("status", "Perdido")
          .not("numero", "is", null);

        clients = (data || []).map(l => ({
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

        clients = (data || []).map(l => ({
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

          // Check if already dispatched
          const { data: existing } = await supabase
            .from("automacao_disparos")
            .select("id")
            .eq("automacao_id", automacao.id)
            .eq("lead_id", client.id)
            .limit(1);

          if (existing && existing.length > 0) continue;
        }

        const phone = cleanPhone(client.telefone);
        if (!phone) continue;

        const mensagem = automacao.mensagem
          .replace(/\{nome_cliente\}/g, client.nome || "Cliente")
          .replace(/\{data_compra\}/g, client.data_registro || "")
          .replace(/\{vendedor\}/g, client.vendedor || "")
          .replace(/\{medico\}/g, client.medico || "");

        totalProcessed++;

        let status = "pendente";
        let erro: string | null = null;

        if (useUazapi) {
          // --- UAZAPI ---
          if (!UAZAPI_URL || !UAZAPI_TOKEN) {
            status = "erro";
            erro = "UAZAPI não configurada";
            totalErrors++;
          } else {
            try {
              const textResponse = await sendUazapiRequest(UAZAPI_URL, UAZAPI_TOKEN, "/send/text", {
                number: `55${phone}`,
                text: mensagem,
              });

              if (!textResponse.ok) {
                const errBody = await textResponse.text();
                status = "erro";
                erro = `HTTP ${textResponse.status}: ${errBody.substring(0, 200)}`;
                totalErrors++;
              } else {
                status = "enviado";
                totalSent++;

                const audioUrl = (client.vendedor && automacao.audios_vendedor?.[client.vendedor]) || automacao.audios_vendedor?.["Thayssa"] || automacao.audio_url;
                if (audioUrl) {
                  try {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    const audioResponse = await sendUazapiRequest(UAZAPI_URL, UAZAPI_TOKEN, "/send/audio", {
                      number: `55${phone}`,
                      audio: audioUrl,
                    });
                    if (!audioResponse.ok) {
                      const errBody = await audioResponse.text();
                      console.error(`Audio send failed (uazapi) for ${client.nome}: ${errBody}`);
                    }
                  } catch (audioErr) {
                    console.error(`Audio send error (uazapi) for ${client.nome}:`, audioErr);
                  }
                }
              }
            } catch (e) {
              status = "erro";
              erro = e instanceof Error ? e.message : "Erro desconhecido";
              totalErrors++;
            }
          }
        } else {
          // --- EVOLUTION API (default) ---
          if (EVOLUTION_API_URL && EVOLUTION_API_KEY && EVOLUTION_INSTANCE) {
            try {
              const textResponse = await fetch(
                `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
                  body: JSON.stringify({ number: `55${phone}`, text: mensagem }),
                }
              );

              if (!textResponse.ok) {
                const errBody = await textResponse.text();
                status = "erro";
                erro = `HTTP ${textResponse.status}: ${errBody.substring(0, 200)}`;
                totalErrors++;
              } else {
                status = "enviado";
                totalSent++;

                const audioUrl = (client.vendedor && automacao.audios_vendedor?.[client.vendedor]) || automacao.audios_vendedor?.["Thayssa"] || automacao.audio_url;
                if (audioUrl) {
                  try {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    const audioResponse = await fetch(
                      `${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${EVOLUTION_INSTANCE}`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
                        body: JSON.stringify({ number: `55${phone}`, audio: audioUrl }),
                      }
                    );
                    if (!audioResponse.ok) {
                      const errBody = await audioResponse.text();
                      console.error(`Audio send failed for ${client.nome}: ${errBody}`);
                    }
                  } catch (audioErr) {
                    console.error(`Audio send error for ${client.nome}:`, audioErr);
                  }
                }
              }
            } catch (e) {
              status = "erro";
              erro = e instanceof Error ? e.message : "Erro desconhecido";
              totalErrors++;
            }
          } else {
            status = "erro";
            erro = "Evolution API não configurada";
            totalErrors++;
          }
        }

        if (automacao.fonte === "detalhado" || automacao.fonte === "detalhado_inativos") {
          const { error: ensureLeadError } = await supabase.from("leads").upsert(
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

          if (ensureLeadError) {
            console.error(`Erro ao preparar lead ${client.id} para disparo:`, ensureLeadError.message);
            totalErrors++;
            continue;
          }
        }

        const { error: insertDisparoError } = await supabase.from("automacao_disparos").insert({
          automacao_id: automacao.id,
          lead_id: client.id,
          nome_cliente: client.nome,
          telefone: client.telefone,
          mensagem_enviada: mensagem,
          status,
          data_envio: status === "enviado" ? new Date().toISOString() : null,
          data_programada: automacao.fonte === "detalhado_inativos" ? todayStr : targetStr,
          erro,
        });

        if (insertDisparoError) {
          console.error(`Erro ao salvar disparo ${client.id}:`, insertDisparoError.message);
          totalErrors++;
          continue;
        }

        if (automacao.fonte === "detalhado_inativos") {
          existingDispatchKeys.add(normalizePatientKey(client.nome, client.telefone));
        }

        if (status === "enviado") {
          await supabase
            .from("automacoes")
            .update({ total_envios: automacao.total_envios + 1 })
            .eq("id", automacao.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Processamento concluído",
        processados: totalProcessed,
        enviados: totalSent,
        erros: totalErrors,
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

      if (response.ok) {
        return response;
      }

      lastResponse = response;
      if (response.status !== 401 && response.status !== 403) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha ao conectar com UAZAPI");
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10) return null;
  if (cleaned.startsWith("55") && cleaned.length >= 12) {
    return cleaned.substring(2);
  }
  return cleaned;
}

function normalizePatientKey(nome: string | null, telefone: string | null): string {
  const normalizedPhone = cleanPhone(telefone);
  if (normalizedPhone) {
    return `phone:${normalizedPhone}`;
  }

  return `name:${(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()}`;
}

function buildLatestDetalhadoClients(records: Array<{ id: string; nome: string | null; telefone: string | null; data: string | null }> | null) {
  const latestMap = new Map<string, { id: string; nome: string | null; telefone: string | null; data_registro: string | null; vendedor: null; medico: null; parsedDate: Date }>();

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
