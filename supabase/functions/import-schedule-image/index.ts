import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { generateOpenAIText, OpenAIError, parseOpenAIJSON, type OpenAIContent } from "../_shared/openai.ts";

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
    if (typeof fileBase64 !== "string" || !fileBase64 || !["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"].includes(mimeType)
      || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
      return new Response(JSON.stringify({ error: "Missing fileBase64, mimeType, month or year" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const monthName = MONTH_NAMES[month - 1];
    const dataUrl = `data:${mimeType};base64,${fileBase64}`;
    const isImage = mimeType.startsWith("image/");

    const userContent: OpenAIContent[] = [
      {
        type: "input_text",
        text: `Você está olhando uma escala de trabalho mensal de uma clínica.
Extraia EXATAMENTE como está na imagem/documento a escala do mês ${monthName.toUpperCase()}/${year}.

Para cada linha (cada dia) retorne:
- day: número do dia do mês (1 a 31)
- morning: nome do médico no turno da MANHÃ (8h-12h). Use string vazia se for "-", "—", em branco ou "FOLGA".
- afternoon: nome do médico no turno da TARDE (13h-18h). Mesma regra.

Regras:
- Copie o nome EXATAMENTE como aparece na imagem, caractere por caractere (incluindo sobrenome, abreviações, pontos e acentos). NÃO abrevie, NÃO corte para o primeiro nome, NÃO unifique nomes parecidos (ex.: "ANA" e "ANA PAULA" são pessoas diferentes e devem permanecer distintos). NÃO corrija ortografia.
- Ignore domingos (não inclua).
- Inclua TODOS os outros dias do mês mesmo que vazios.
- Se houver coluna única (um único nome para o dia inteiro), use o mesmo nome em morning e afternoon.
- NÃO invente dias que não existem no mês.

Responda APENAS com JSON válido, sem markdown, no formato:
{"days":[{"day":1,"morning":"ANA","afternoon":"ANA"}, ...]}`,
      },
    ];

    if (isImage) {
      userContent.push({ type: "input_image", image_url: dataUrl, detail: "high" });
    } else {
      userContent.push({ type: "input_file", filename: "escala.pdf", file_data: dataUrl });
    }

    const raw = await generateOpenAIText({
      modelEnv: "OPENAI_SCHEDULE_MODEL",
      defaultModel: "gpt-4.1",
      input: [{ role: "user", content: userContent }],
      maxOutputTokens: 4000,
      schema: {
        name: "monthly_schedule",
        schema: {
          type: "object", additionalProperties: false,
          properties: {
            days: {
              type: "array", minItems: 1, maxItems: 31,
              items: {
                type: "object", additionalProperties: false,
                properties: {
                  day: { type: "integer", minimum: 1, maximum: 31 },
                  morning: { type: "string" }, afternoon: { type: "string" },
                },
                required: ["day", "morning", "afternoon"],
              },
            },
          },
          required: ["days"],
        },
      },
    });
    const parsed = parseOpenAIJSON<{ days?: Array<{ day: number; morning?: string; afternoon?: string }> }>(raw);

    const days = Array.isArray(parsed?.days) ? parsed.days : [];
    if (days.length === 0) {
      return new Response(JSON.stringify({ error: "Não foi possível extrair a escala da imagem. Tente uma foto mais nítida." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    if (days.some(d => !Number.isInteger(d.day) || d.day < 1 || d.day > daysInMonth
      || typeof d.morning !== "string" || typeof d.afternoon !== "string")
      || new Set(days.map(d => d.day)).size !== days.length) {
      throw new OpenAIError("A escala extraída contém dias inválidos ou duplicados. Revise o arquivo.", 422);
    }
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
          morning_shift: (d.morning || "").trim(),
          afternoon_shift: (d.afternoon || "").trim(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) throw new OpenAIError("Não foram encontrados dias úteis na escala. Revise o arquivo.", 422);

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
      status: err instanceof OpenAIError ? err.status : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
