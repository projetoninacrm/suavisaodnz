const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, instancia } = await req.json();
    const UAZAPI_URL = Deno.env.get("UAZAPI_URL")!.replace(/\/+$/, "");
    const UAZAPI_TOKEN = (instancia === "uazapi_dnz"
      ? Deno.env.get("UAZAPI_TOKEN_DNZ")
      : Deno.env.get("UAZAPI_TOKEN"))!;

    const encodedToken = encodeURIComponent(UAZAPI_TOKEN);
    const chatId = `${phone}@s.whatsapp.net`;

    // Test different body formats for /message/find
    const attempts = [
      { label: "chatId+limit", body: { chatId, limit: 20 } },
      { label: "chatid+limit", body: { chatid: chatId, limit: 20 } },
      { label: "number+limit", body: { number: phone, limit: 20 } },
      { label: "where.remoteJid", body: { where: { key: { remoteJid: chatId } }, limit: 20 } },
      { label: "jid+count", body: { jid: chatId, count: 20 } },
      { label: "empty", body: { limit: 5 } },
    ];

    const results: any[] = [];
    for (const a of attempts) {
      const res = await fetch(`${UAZAPI_URL}/message/find?token=${encodedToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
        body: JSON.stringify(a.body),
      });
      const data = await res.text();
      
      // Check if data contains messages from our phone
      const containsPhone = data.includes(phone) || data.includes(chatId);
      
      results.push({
        label: a.label,
        status: res.status,
        containsTargetPhone: containsPhone,
        preview: data.substring(0, 600),
      });
    }

    return new Response(JSON.stringify({ phone, chatId, results }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
