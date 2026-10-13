type Handler = (req: Request) => Response | Promise<Response>;
let handler: Handler;
const originalServe = Deno.serve;
try {
  Deno.serve = ((fn: Handler) => { handler = fn; return {}; }) as unknown as typeof Deno.serve;
  await import("../whatsapp-webhook/index.ts");
} finally { Deno.serve = originalServe; }
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

async function scenario(token: string, insertStatus: number) {
  const names = ["UAZAPI_TOKEN_DNZ", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const values = names.map(n => Deno.env.get(n));
  const originalFetch = globalThis.fetch;
  const globals = globalThis as unknown as { EdgeRuntime?: { waitUntil(task: Promise<unknown>): void } };
  const originalRuntime = globals.EdgeRuntime;
  const background: Promise<unknown>[] = [];
  globals.EdgeRuntime = { waitUntil: task => { background.push(task); } };
  Deno.env.set(names[0], "synthetic-token"); Deno.env.set(names[1], "https://synthetic.supabase.test"); Deno.env.set(names[2], "synthetic-service-key");
  let requests = 0, inserted = 0;
  globalThis.fetch = async (url, init) => {
    requests++;
    assert(String(url).startsWith("https://synthetic.supabase.test/"), "No external provider calls in test");
    if (String(url).includes("whatsapp_capture_settings")) return Response.json({ started_at: new Date(Date.now() - 60_000).toISOString() });
    if (String(url).includes("whatsapp_messages")) {
      inserted++;
      const data = JSON.parse(String(init?.body));
      assert(data.message_id === "synthetic-id" && !("token" in data), "Only normalized message may be saved");
      return insertStatus === 201 ? new Response(null, { status: 201 }) : Response.json({ code: insertStatus === 409 ? "23505" : "XX000" }, { status: insertStatus });
    }
    if (String(url).includes("rpc/match_disparo_by_phone")) return Response.json([]);
    throw new Error("Unexpected database operation");
  };
  try {
    const result = await handler!(new Request("https://synthetic.test", { method: "POST", body: JSON.stringify({ EventType: "messages", token, message: { messageid: "synthetic-id", chatid: "5511000000000@s.whatsapp.net", text: "Mensagem fictícia", fromMe: false, messageTimestamp: Date.now() } }) }));
    const body = await result.json();
    await Promise.all(background);
    return { status: result.status, body, requests, inserted, background: background.length };
  } finally {
    globalThis.fetch = originalFetch;
    globals.EdgeRuntime = originalRuntime;
    names.forEach((n, i) => values[i] === undefined ? Deno.env.delete(n) : Deno.env.set(n, values[i]!));
  }
}
Deno.test("webhook rejects wrong instance before database access", async () => {
  const result = await scenario("wrong-token", 201);
  assert(result.status === 401 && result.requests === 0, "No unauthorized access");
});
Deno.test("new messages are durably captured even without matching an automation", async () => {
  const result = await scenario("synthetic-token", 201);
  assert(result.status === 200 && result.body.action === "captured" && result.inserted === 1 && result.background === 1, "Capture must be independent of automations");
});
Deno.test("retries are deduplicated; write failures request provider retry", async () => {
  const duplicate = await scenario("synthetic-token", 409);
  assert(duplicate.status === 200 && duplicate.body.action === "duplicate" && duplicate.background === 0, "Duplicate must not trigger AI");
  const failure = await scenario("synthetic-token", 500);
  assert(failure.status === 503 && failure.background === 0, "Failed writes must never be acknowledged as captured");
});
