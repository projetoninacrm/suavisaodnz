// Endpoint contracts use synthetic inputs and intercepted fetch/Deno.serve only.
type Handler = (req: Request) => Response | Promise<Response>;
const handlers: Handler[] = [];
const originalServe = Deno.serve;
try {
  Deno.serve = ((handler: Handler) => {
    handlers.push(handler);
    return {};
  }) as unknown as typeof Deno.serve;
  await import("../import-schedule-image/index.ts");
  await import("../summarize-conversa/index.ts");
  await import("../chatlabs-analise/index.ts");
} finally {
  Deno.serve = originalServe;
}
const [schedule, summary, analysis] = handlers;

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function request(body: unknown) {
  return new Request("https://synthetic.test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}
function output(text: string) {
  return Response.json({
    status: "completed",
    output: [{ type: "message", content: [{ type: "output_text", text }] }],
  });
}
async function mocked(
  fn: () => Promise<void>,
  fetcher: typeof fetch,
  key: string | null = "synthetic-key",
) {
  const names = [
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "OPENAI_SCHEDULE_MODEL",
    "OPENAI_SUMMARY_MODEL",
    "OPENAI_ANALYSIS_MODEL",
  ];
  const old = names.map((n) => Deno.env.get(n));
  const oldFetch = globalThis.fetch;
  names.forEach((n) => Deno.env.delete(n));
  if (key) Deno.env.set("OPENAI_API_KEY", key);
  globalThis.fetch = fetcher;
  try {
    await fn();
  } finally {
    globalThis.fetch = oldFetch;
    names.forEach((n, i) =>
      old[i] === undefined ? Deno.env.delete(n) : Deno.env.set(n, old[i]!)
    );
  }
}

Deno.test("invalid or duplicate schedule extraction cannot reach database writes", async () => {
  let requests = 0;
  await mocked(async () => {
    const invalid = await schedule(
      request({
        fileBase64: "c3ludGhldGlj",
        mimeType: "application/pdf",
        month: 13,
        year: 2026,
      }),
    );
    assert(
      invalid.status === 400 && requests === 0,
      "Invalid month reached provider",
    );
    const duplicate = await schedule(
      request({
        fileBase64: "c3ludGhldGlj",
        mimeType: "application/pdf",
        month: 10,
        year: 2026,
      }),
    );
    assert(
      duplicate.status === 422 && Number(requests) === 1,
      "Duplicate extraction reached database",
    );
  }, async (url, init) => {
    assert(
      url === "https://api.openai.com/v1/responses",
      "Schedule must fail before database requests",
    );
    const body = JSON.parse(String(init?.body));
    assert(
      body.model === "gpt-4.1" &&
        body.input[0].content[1].type === "input_file",
      "PDF routing changed",
    );
    requests++;
    return output(
      '{"days":[{"day":1,"morning":"FICTICIO","afternoon":""},{"day":1,"morning":"FICTICIO","afternoon":""}]}',
    );
  });
});

Deno.test("WhatsApp summary distinguishes OpenAI from local fallback without failing webhook flow", async () => {
  await mocked(async () => {
    const response = await summary(
      request({ history: "[Cliente] Gostaria de visitar a loja." }),
    );
    const data = await response.json();
    assert(
      data.provider === "openai" &&
        data.summary === "Cliente deseja visitar a loja.",
      "OpenAI summary contract changed",
    );
  }, async () => output("Cliente deseja visitar a loja."));
  await mocked(async () => {
    const response = await summary(
      request({ history: "[Cliente] Quero visitar a loja." }),
    );
    const data = await response.json();
    assert(
      response.status === 200 && data.provider === "fallback" &&
        typeof data.summary === "string",
      "Fallback must remain available without key",
    );
  }, () => {
    throw new Error("Fallback must not call provider");
  }, null);
});

Deno.test("legacy analysis alias rejects unauthenticated access without calling ChatLabs", async () => {
  await mocked(async () => {
    const response = await analysis(
      new Request("https://synthetic.test?start=2026-10-01&end=2026-10-02"),
    );
    const data = await response.json();
    assert(
      response.status === 401 && typeof data.error === "string",
      "Analysis must require an authenticated user",
    );
  }, () => {
    throw new Error("Unauthenticated requests must not access any provider");
  });
});
