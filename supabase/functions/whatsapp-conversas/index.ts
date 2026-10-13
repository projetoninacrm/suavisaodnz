import { loadForwardMessages, WhatsAppDataError, whatsappCors } from "../_shared/whatsapp-data.ts";
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: whatsappCors });
  try {
    const data = await loadForwardMessages(req);
    return Response.json({ fonte: "uazapi_supabase", periodo: { start: data.start, end: data.end }, capturaDesde: data.startedAt, mensagens: data.count, mensagensExaminadas: data.examined, conversasExaminadas: data.chatCount, recebidasExaminadas: data.incoming, enviadasExaminadas: data.outgoing, amostraLimitada: data.truncated }, { headers: whatsappCors });
  } catch (error) {
    return Response.json({ error: error instanceof WhatsAppDataError ? error.message : "Falha ao consultar mensagens." }, { status: error instanceof WhatsAppDataError ? error.status : 500, headers: whatsappCors });
  }
});
