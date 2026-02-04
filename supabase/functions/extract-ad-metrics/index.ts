import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdMetrics {
  plataforma: string;
  cliques: number;
  leads: number;
  conversao: number;
  investimento: number;
  custo_por_lead: number;
  pacientes: number;
  percentual: number;
  cac: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this marketing metrics screenshot and extract the data for each platform (META, GOOGLE, etc.).

Return ONLY a JSON array with objects containing these fields for each platform row found:
- plataforma: string (e.g., "META", "GOOGLE")
- cliques: number (clicks)
- leads: number
- conversao: number (conversion percentage as decimal, e.g., 6% = 6)
- investimento: number (investment amount in BRL, without R$ symbol)
- custo_por_lead: number (cost per lead in BRL)
- pacientes: number (patients count, if available, otherwise 0)
- percentual: number (percentage, if available, otherwise 0)
- cac: number (customer acquisition cost in BRL, if available, otherwise 0)

Example response:
[
  {"plataforma": "META", "cliques": 780, "leads": 43, "conversao": 6, "investimento": 1496.02, "custo_por_lead": 34.79, "pacientes": 0, "percentual": 0, "cac": 0},
  {"plataforma": "GOOGLE", "cliques": 1757, "leads": 453, "conversao": 26, "investimento": 1758.77, "custo_por_lead": 3.88, "pacientes": 176, "percentual": 35, "cac": 1}
]

Return ONLY the JSON array, no other text.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("AI Response:", content);

    // Try to parse JSON from the response
    let metrics: AdMetrics[] = [];
    try {
      // Extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        metrics = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
    }

    return new Response(
      JSON.stringify({ success: true, metrics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
