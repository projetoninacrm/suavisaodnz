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

    const endpoints = [
      // findMessages (Evolution API pattern)
      { method: "POST", url: `${UAZAPI_URL}/chat/findMessages?token=${encodedToken}`, body: { where: { key: { remoteJid: chatId } }, limit: 20 } },
      // findMessages with just chatId
      { method: "POST", url: `${UAZAPI_URL}/chat/findMessages?token=${encodedToken}`, body: { chatId, count: 20 } },
      // GET messages
      { method: "GET", url: `${UAZAPI_URL}/chat/messages/${chatId}?token=${encodedToken}&count=20`, body: null },
      // GET messages with number
      { method: "GET", url: `${UAZAPI_URL}/chat/messages?token=${encodedToken}&number=${phone}&limit=20`, body: null },
      // POST chat/find with number filter
      { method: "POST", url: `${UAZAPI_URL}/chat/find?token=${encodedToken}`, body: { operator: "AND", filter: [{ field: "wa_chatid", operator: "eq", value: chatId }], limit: 1 } },
      // message/find
      { method: "POST", url: `${UAZAPI_URL}/message/find?token=${encodedToken}`, body: { chatId, limit: 20 } },
      // message/search
      { method: "POST", url: `${UAZAPI_URL}/message/search?token=${encodedToken}`, body: { chatId, limit: 20 } },
      // chat/fetchMessages
      { method: "GET", url: `${UAZAPI_URL}/chat/fetchMessages/${chatId}?token=${encodedToken}&count=20`, body: null },
      // message/list
      { method: "POST", url: `${UAZAPI_URL}/message/list?token=${encodedToken}`, body: { chatId, limit: 20 } },
      // message/history
      { method: "POST", url: `${UAZAPI_URL}/message/history?token=${encodedToken}`, body: { chatId, count: 20 } },
    ];

    const results: any[] = [];
    for (const ep of endpoints) {
      try {
        const opts: RequestInit = {
          method: ep.method,
          headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
        };
        if (ep.body && ep.method !== "GET") opts.body = JSON.stringify(ep.body);

        const res = await fetch(ep.url, opts);
        const body = await res.text();
        const isInteresting = res.status !== 404 && res.status !== 405;
        results.push({ 
          url: ep.url.replace(encodedToken, "***").replace(UAZAPI_TOKEN, "***"), 
          method: ep.method,
          status: res.status, 
          interesting: isInteresting,
          body: body.substring(0, 400) 
        });
      } catch (e) {
        results.push({ url: ep.url.replace(encodedToken, "***"), error: (e as Error).message });
      }
    }

    return new Response(JSON.stringify({ results }, null, 2), {
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
