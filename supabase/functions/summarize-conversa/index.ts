const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um assistente que analisa conversas de WhatsApp entre um vendedor de uma ótica e um cliente.
Sua tarefa é resumir APENAS a resposta/posição do CLIENTE, ignorando completamente as mensagens do vendedor.
Foque em:
- O que o cliente respondeu sobre o assunto da mensagem enviada
- Se demonstrou interesse, recusou, pediu mais informações, agendou visita, etc.
- Se mencionou valores, formas de pagamento ou datas
Responda em 1-2 frases curtas, APENAS sobre a posição do cliente. Não mencione o que o vendedor disse.
Se o cliente não respondeu nada relevante, diga "Sem resposta relevante do cliente."`;

async function tryLovableAI(history: string, mensagemOriginal: string | null): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  const context = mensagemOriginal
    ? `A mensagem da automação enviada ao cliente foi:\n"${mensagemOriginal}"\n\nHistórico da conversa:\n${history}`
    : `Histórico da conversa:\n${history}`;

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
            { role: "user", content: `Resuma apenas a resposta do cliente:\n\n${context}` },
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

/** Keyword-based smart fallback - focuses only on client messages */
function smartFallback(history: string): string {
  const lines = history.trim().split("\n").filter(l => l.trim());
  const clientLines = lines.filter(l => l.includes("Cliente]"));
  
  if (clientLines.length === 0) {
    return "Sem resposta do cliente.";
  }

  // Extract just client message text
  const clientTexts = clientLines.map(l => {
    const match = l.match(/\] (.+)$/);
    return match ? match[1] : l;
  });

  const clientText = clientTexts.join(" ").toLowerCase();
  const indicators: string[] = [];

  if (/fech|compr|quer|quero|sim|aceito|fechado|vou levar|vou comprar/i.test(clientText)) {
    indicators.push("Cliente demonstrou interesse");
  }
  
  const priceMatch = clientText.match(/r\$\s*[\d.,]+|(\d+)\s*(reais|real|pix|cart[aã]o)/);
  if (priceMatch) {
    indicators.push(`valor mencionado: ${priceMatch[0]}`);
  }

  if (/pix/i.test(clientText)) indicators.push("pagamento via Pix");
  if (/cart[aã]o/i.test(clientText)) indicators.push("pagamento via cartão");
  if (/parcela/i.test(clientText)) indicators.push("parcelamento mencionado");

  if (/voltar|passar|ir a[ií]|comparecer|visita/i.test(clientText)) {
    indicators.push("mencionou visita à loja");
  }

  if (/n[aã]o quero|caro|n[aã]o tenho|depois|n[aã]o posso|sem condi/i.test(clientText)) {
    indicators.push("cliente mostrou resistência");
  }

  if (indicators.length > 0) {
    return indicators.join(". ") + ".";
  }

  // Last resort: show last client messages
  const lastClientMsgs = clientTexts.slice(-3);
  return `Cliente respondeu: ${lastClientMsgs.join(" | ")}`.substring(0, 300);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { history, mensagem_enviada } = await req.json();
    if (!history) {
      return new Response(JSON.stringify({ summary: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try AI first
    let summary = await tryLovableAI(history, mensagem_enviada || null);
    
    // Fallback to smart keyword extraction
    if (!summary) {
      console.log("AI unavailable, using smart fallback");
      summary = smartFallback(history);
    }

    console.log("Resumo de conversa gerado");

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
