import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { generateOpenAIText, OpenAIError, parseOpenAIJSON, type OpenAIContent } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTH_NAMES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const DAY_NAMES = ["DOM","SEG","TER","QUA","QUI","SEX","SAB"];
const LEGACY_SCHEDULE_YEAR = 2026;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, fileBase64, mimeType, month, year, sheetName, rows: submittedRows } = await req.json();
    if (!["preview", "confirm"].includes(action)
      || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
      return new Response(JSON.stringify({ error: "Informe uma ação válida, mês e ano." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const monthName = MONTH_NAMES[month - 1];
    const targetSheet = typeof sheetName === "string" && sheetName.trim() ? sheetName.trim() : "Escala";
    let rows: Array<{ sheet_name: string; date: string; day_of_week: string; morning_shift: string; afternoon_shift: string }>;

    if (action === "confirm") {
      if (!Array.isArray(submittedRows) || submittedRows.length === 0 || submittedRows.length > 31) {
        return new Response(JSON.stringify({ error: "A prévia da escala está vazia ou inválida." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const daysInMonth = new Date(year, month, 0).getDate();
      const days = submittedRows.map((row: Record<string, unknown>) => {
        const match = typeof row?.date === "string" ? row.date.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
        const day = match ? Number(match[3]) : NaN;
        if (!match || Number(match[1]) !== year || Number(match[2]) !== month || !Number.isInteger(day) || day < 1 || day > daysInMonth
          || typeof row.morning_shift !== "string" || typeof row.afternoon_shift !== "string"
          || row.morning_shift.length > 200 || row.afternoon_shift.length > 200) {
          throw new OpenAIError("A prévia contém datas ou nomes inválidos. Gere outra prévia.", 422);
        }
        const date = new Date(year, month - 1, day);
        if (date.getDay() === 0) throw new OpenAIError("A prévia contém domingo. Revise a escala.", 422);
        return {
          day,
          date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          day_of_week: DAY_NAMES[date.getDay()],
          morning_shift: row.morning_shift.trim(),
          afternoon_shift: row.afternoon_shift.trim(),
        };
      });
      if (new Set(days.map((day) => day.day)).size !== days.length) {
        throw new OpenAIError("A prévia contém dias duplicados. Gere outra prévia.", 422);
      }
      rows = days.map(({ day: _day, ...row }) => ({ sheet_name: targetSheet, ...row }));
    } else {
      if (typeof fileBase64 !== "string" || !fileBase64 || !["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"].includes(mimeType)) {
        return new Response(JSON.stringify({ error: "Selecione uma imagem ou PDF compatível." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
        || typeof d.morning !== "string" || typeof d.afternoon !== "string"
        || d.morning.length > 200 || d.afternoon.length > 200)
        || new Set(days.map(d => d.day)).size !== days.length) {
        throw new OpenAIError("A escala extraída contém dias inválidos ou duplicados. Revise o arquivo.", 422);
      }
      rows = days
        .map((d) => {
          const dt = new Date(year, month - 1, d.day);
          if (dt.getDay() === 0) return null; // skip Sundays
          const iso = `${year}-${String(month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
          return {
            sheet_name: targetSheet,
            date: iso,
            day_of_week: DAY_NAMES[dt.getDay()],
            morning_shift: (d.morning || "").trim(),
            afternoon_shift: (d.afternoon || "").trim(),
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
    }

    if (rows.length === 0) throw new OpenAIError("Não foram encontrados dias úteis na escala. Revise o arquivo.", 422);

    if (action === "preview") {
      return new Response(JSON.stringify({ preview: true, rows }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Replace existing rows for the same month + sheet
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;
    const { data: existing, error: existingErr } = await supabase
      .from("schedules")
      .select("id,date")
      .eq("sheet_name", targetSheet);
    if (existingErr) throw existingErr;

    const toDelete = (existing || [])
      .filter((r: { date: string }) => {
        if (!r.date) return false;
        if (r.date.startsWith(monthPrefix)) return true;
        // Also clean DD/mes legacy format for same month
        const parts = r.date.split("/");
        return year === LEGACY_SCHEDULE_YEAR && parts[1]?.toLowerCase().trim() === MONTH_NAMES[month - 1];
      })
      .map((r: { id: string }) => r.id);

    if (toDelete.length > 0) {
      const { error: deleteErr } = await supabase.from("schedules").delete().in("id", toDelete);
      if (deleteErr) throw deleteErr;
    }

    const { error: insertErr } = await supabase.from("schedules").insert(rows);
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ confirmed: true, inserted: rows.length, deleted: toDelete.length }), {
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
