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
    const chatid = `${phone}@s.whatsapp.net`;

    const res = await fetch(`${UAZAPI_URL}/message/find?token=${encodedToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
      body: JSON.stringify({ chatid, limit: 10 }),
    });
    const data = await res.json();
    
    // Return full structure of first 3 messages for analysis
    const messages = (data.messages || []).slice(0, 3).map((m: any) => ({
      chatid: m.chatid,
      fromme: m.fromme,
      fromMe: m.fromMe,
      type: m.type,
      timestamp: m.timestamp,
      messageTimestamp: m.messageTimestamp,
      content: m.content,
      text: m.text,
      body: m.body,
      message: m.message,
      // show all keys
      _keys: Object.keys(m),
    }));

    return new Response(JSON.stringify({ total: data.messages?.length, messages }, null, 2), {
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
