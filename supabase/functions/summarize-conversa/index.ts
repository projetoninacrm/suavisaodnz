const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um assistente que resume conversas de WhatsApp entre um vendedor de uma ótica e um cliente.
Gere um resumo CURTO (1-2 frases) e objetivo da conversa, focando em:
- Se o cliente demonstrou interesse ou não
- Se fechou compra, valor, forma de pagamento
- Se vai voltar à loja e quando
- Qualquer informação relevante para follow-up
Responda APENAS com o resumo, sem prefixos ou explicações.`;

async function tryLovableAI(history: string): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  // Try multiple possible endpoints
  const endpoints = [
    "https://ai.gateway.lovable.dev/v1/chat/completions",
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Resuma esta conversa:\n\n${history}` },
          ],
          max_tokens: 200,
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.choices?.[0]?.message?.content?.trim() || null;
      }
      console.log(`Endpoint ${endpoint} returned ${response.status}`);
    } catch (err) {
      console.log(`Endpoint ${endpoint} failed: ${(err as Error).message}`);
    }
  }
  return null;
}

/** Keyword-based smart fallback summary */
function smartFallback(history: string): string {
  const lower = history.toLowerCase();
  const lines = history.trim().split("\n").filter(l => l.trim());
  const clientLines = lines.filter(l => l.includes("Cliente]"));
  
  const indicators: string[] = [];

  // Check for purchase/interest signals
  if (/fech|compr|quer|quero|sim|aceito|fechado|vou levar|vou comprar/i.test(lower)) {
    indicators.push("Cliente demonstrou interesse");
  }
  
  // Check for price/value mentions
  const priceMatch = lower.match(/r\$\s*[\d.,]+|(\d+)\s*(reais|real|pix|cart[aã]o)/);
  if (priceMatch) {
    indicators.push(`valor mencionado: ${priceMatch[0]}`);
  }

  // Check payment method
  if (/pix/i.test(lower)) indicators.push("pagamento via Pix");
  if (/cart[aã]o/i.test(lower)) indicators.push("pagamento via cartão");
  if (/parcela/i.test(lower)) indicators.push("parcelamento mencionado");

  // Check for return visit
  if (/voltar|passar|ir a[ií]|comparecer|visita/i.test(lower)) {
    indicators.push("mencionou visita à loja");
  }

  // Check for rejection signals
  if (/n[aã]o quero|caro|n[aã]o tenho|depois|n[aã]o posso|sem condi/i.test(lower)) {
    indicators.push("cliente mostrou resistência");
  }

  if (indicators.length > 0) {
    return indicators.join(". ") + ".";
  }

  // Last resort: show last client messages
  const lastClientMsgs = clientLines.slice(-3).map(l => {
    const match = l.match(/\] (.+)$/);
    return match ? match[1] : l;
  });
  
  return `Respostas: ${lastClientMsgs.join(" | ")}`.substring(0, 300);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { history } = await req.json();
    if (!history) {
      return new Response(JSON.stringify({ summary: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try AI first
    let summary = await tryLovableAI(history);
    
    // Fallback to smart keyword extraction
    if (!summary) {
      console.log("AI unavailable, using smart fallback");
      summary = smartFallback(history);
    }

    console.log("Generated summary:", summary);

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Summarization error:", err);
    return new Response(JSON.stringify({ summary: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
