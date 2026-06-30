import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTH_NAMES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const DAY_NAMES = ["DOM","SEG","TER","QUA","QUI","SEX","SAB"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, mimeType, month, year, sheetName } = await req.json();
    if (!fileBase64 || !mimeType || typeof month !== "number" || typeof year !== "number") {
      return new Response(JSON.stringify({ error: "Missing fileBase64, mimeType, month or year" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const monthName = MONTH_NAMES[month - 1];
    const dataUrl = `data:${mimeType};base64,${fileBase64}`;
    const isImage = mimeType.startsWith("image/");

    const userContent: unknown[] = [
      {
        type: "text",
        text: `Você está olhando uma escala de trabalho mensal de uma clínica.
Extraia EXATAMENTE como está na imagem/documento a escala do mês ${monthName.toUpperCase()}/${year}.

Para cada linha (cada dia) retorne:
- day: número do dia do mês (1 a 31)
- morning: nome do médico no turno da MANHÃ (8h-12h). Use string vazia se for "-", "—", em branco ou "FOLGA".
- afternoon: nome do médico no turno da TARDE (13h-18h). Mesma regra.

Regras:
- Nomes sempre em MAIÚSCULAS, sem acentos extras, apenas o primeiro nome.
- Ignore domingos (não inclua).
- Inclua TODOS os outros dias do mês mesmo que vazios.
- Se houver coluna única (um único nome para o dia inteiro), use o mesmo nome em morning e afternoon.
- NÃO invente dias que não existem no mês.

Responda APENAS com JSON válido, sem markdown, no formato:
{"days":[{"day":1,"morning":"ANA","afternoon":"ANA"}, ...]}`,
      },
    ];

    if (isImage) {
      userContent.push({ type: "image_url", image_url: { url: dataUrl } });
    } else {
      userContent.push({ type: "file", file: { filename: `escala.${mimeType.split("/")[1] || "pdf"}`, file_data: dataUrl } });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "user", content: userContent }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI error", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { days?: Array<{ day: number; morning?: string; afternoon?: string }> };
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      const match = String(raw).match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { days: [] };
    }

    const days = Array.isArray(parsed?.days) ? parsed.days : [];
    if (days.length === 0) {
      return new Response(JSON.stringify({ error: "Não foi possível extrair a escala da imagem. Tente uma foto mais nítida." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const rows = days
      .filter((d) => Number.isInteger(d.day) && d.day >= 1 && d.day <= daysInMonth)
      .map((d) => {
        const dt = new Date(year, month - 1, d.day);
        if (dt.getDay() === 0) return null; // skip Sundays
        const iso = `${year}-${String(month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
        return {
          sheet_name: sheetName || "Escala",
          date: iso,
          day_of_week: DAY_NAMES[dt.getDay()],
          morning_shift: (d.morning || "").trim().toUpperCase(),
          afternoon_shift: (d.afternoon || "").trim().toUpperCase(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Replace existing rows for the same month + sheet
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;
    const { data: existing } = await supabase
      .from("schedules")
      .select("id,date")
      .eq("sheet_name", sheetName || "Escala");

    const toDelete = (existing || [])
      .filter((r: { date: string }) => {
        if (!r.date) return false;
        if (r.date.startsWith(monthPrefix)) return true;
        // Also clean DD/mes legacy format for same month
        const parts = r.date.split("/");
        return parts[1]?.toLowerCase().trim() === MONTH_NAMES[month - 1];
      })
      .map((r: { id: string }) => r.id);

    if (toDelete.length > 0) {
      await supabase.from("schedules").delete().in("id", toDelete);
    }

    const { error: insertErr } = await supabase.from("schedules").insert(rows);
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ inserted: rows.length, deleted: toDelete.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("import-schedule-image error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});