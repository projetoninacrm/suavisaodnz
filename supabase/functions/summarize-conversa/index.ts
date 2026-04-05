const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not available");
      return new Response(JSON.stringify({ summary: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Você é um assistente que resume conversas de WhatsApp entre um vendedor de uma ótica e um cliente.
Gere um resumo CURTO (1-2 frases) e objetivo da conversa, focando em:
- Se o cliente demonstrou interesse ou não
- Se fechou compra, valor, forma de pagamento
- Se vai voltar à loja e quando
- Qualquer informação relevante para follow-up
Responda APENAS com o resumo, sem prefixos ou explicações.
Exemplos:
"Cliente demonstrou interesse, fechou compra de R$500 no Pix."
"Cliente perguntou sobre preço mas achou caro, não quis fechar."
"Cliente quer voltar na loja sexta-feira para experimentar armações."`,
          },
          {
            role: "user",
            content: `Resuma esta conversa:\n\n${history}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("AI summarization failed:", response.status, await response.text());
      return new Response(JSON.stringify({ summary: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const summary = result.choices?.[0]?.message?.content?.trim() || null;

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
