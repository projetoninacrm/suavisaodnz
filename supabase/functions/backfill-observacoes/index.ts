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
    
    // Try different phone formats
    const phoneClean = phone.replace(/\D/g, "");
    const variants = [
      phoneClean,
      phoneClean.startsWith("55") ? phoneClean : `55${phoneClean}`,
      phoneClean.startsWith("55") ? phoneClean.substring(2) : phoneClean,
    ];

    const results: any[] = [];

    // First, get a sample of recent messages to see the chatid format
    const sampleRes = await fetch(`${UAZAPI_URL}/message/find?token=${encodedToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
      body: JSON.stringify({ limit: 3 }),
    });
    const sampleData = await sampleRes.json();
    const sampleChatIds = sampleData.messages?.map((m: any) => m.chatid).filter(Boolean) || [];
    results.push({ label: "sample_chatids", chatids: [...new Set(sampleChatIds)] });

    // Try each phone variant
    for (const variant of variants) {
      const chatid = `${variant}@s.whatsapp.net`;
      const res = await fetch(`${UAZAPI_URL}/message/find?token=${encodedToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
        body: JSON.stringify({ chatid, limit: 5 }),
      });
      const data = await res.json();
      const msgCount = data.messages?.length || 0;
      const firstMsg = data.messages?.[0];
      results.push({
        label: `chatid=${chatid}`,
        status: res.status,
        msgCount,
        hasMore: data.hasMore,
        firstMsgPreview: firstMsg ? {
          chatid: firstMsg.chatid,
          fromme: firstMsg.fromme,
          type: firstMsg.type,
          content: typeof firstMsg.content === "string" ? firstMsg.content?.substring(0, 100) : 
            (firstMsg.content?.text || firstMsg.content?.conversation || JSON.stringify(firstMsg.content)?.substring(0, 100)),
          timestamp: firstMsg.timestamp,
        } : null,
      });
    }

    return new Response(JSON.stringify({ phone, variants, results }, null, 2), {
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
