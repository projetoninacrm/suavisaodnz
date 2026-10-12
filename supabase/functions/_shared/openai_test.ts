import { generateOpenAIText, OpenAIError, parseOpenAIJSON } from "./openai.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const options = {
  modelEnv: "OPENAI_TEST_MODEL",
  input: "Conteúdo fictício",
  maxOutputTokens: 256,
};
const completed = (text: string) =>
  Response.json({
    status: "completed",
    output: [
      { type: "reasoning", summary: [] },
      { type: "message", content: [{ type: "output_text", text }] },
    ],
  });

async function withMock(
  fn: () => Promise<void>,
  fetchMock: typeof fetch,
  key: string | null = "synthetic-test-key",
) {
  const originalFetch = globalThis.fetch;
  const names = ["OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_TEST_MODEL"];
  const previous = names.map((name) => Deno.env.get(name));
  names.forEach((name) => Deno.env.delete(name));
  if (key) Deno.env.set("OPENAI_API_KEY", key);
  globalThis.fetch = fetchMock;
  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, i) =>
      previous[i] === undefined
        ? Deno.env.delete(name)
        : Deno.env.set(name, previous[i]!)
    );
  }
}

async function expectError(fn: () => Promise<unknown>, status: number) {
  try {
    await fn();
  } catch (error) {
    assert(
      error instanceof OpenAIError && error.status === status,
      "Expected a sanitized OpenAI error with the correct status",
    );
    return error;
  }
  throw new Error("Expected request to fail");
}

Deno.test("vision/PDF and strict JSON use Responses without storing data; output may follow reasoning", async () => {
  await withMock(async () => {
    Deno.env.set("OPENAI_MODEL", "global-model");
    Deno.env.set("OPENAI_TEST_MODEL", "task-model");
    const result = await generateOpenAIText({
      ...options,
      instructions: "Extraia apenas os dados fictícios.",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "Escala fictícia" },
          {
            type: "input_image",
            image_url: "data:image/png;base64,c3ludGhldGlj",
            detail: "high",
          },
          {
            type: "input_file",
            filename: "synthetic.pdf",
            file_data: "data:application/pdf;base64,c3ludGhldGlj",
          },
        ],
      }],
      schema: {
        name: "synthetic",
        schema: {
          type: "object",
          properties: { ok: { type: "boolean" } },
          required: ["ok"],
          additionalProperties: false,
        },
      },
    });
    assert(
      parseOpenAIJSON<{ ok: boolean }>(result).ok,
      "Structured result must be readable",
    );
  }, async (input, init) => {
    assert(
      input === "https://api.openai.com/v1/responses",
      "Wrong provider endpoint",
    );
    const body = JSON.parse(String(init?.body));
    assert(
      body.model === "task-model" && body.store === false &&
        body.max_output_tokens === 256,
      "Routing/storage/budget must be preserved",
    );
    assert(
      body.text.format.strict && body.text.format.type === "json_schema",
      "Schema must be strict",
    );
    assert(
      body.input[0].content[1].type === "input_image" &&
        body.input[0].content[2].type === "input_file",
      "Multimodal input must retain both file types",
    );
    return completed('{"ok":true}');
  });
});

Deno.test("missing server secret fails before any network request", async () => {
  await withMock(async () => {
    await expectError(() => generateOpenAIText(options), 503);
  }, () => {
    throw new Error("Network must not be called");
  }, null);
});

Deno.test("quota exhaustion is distinguished from temporary rate limiting and errors are redacted", async () => {
  for (
    const [code, status] of [["insufficient_quota", 402], [
      "rate_limit_exceeded",
      429,
    ]] as const
  ) {
    await withMock(
      async () => {
        const error = await expectError(
          () => generateOpenAIText(options),
          status,
        );
        assert(
          !error.message.includes("PRIVATE") &&
            !error.message.includes("synthetic-test-key"),
          "Upstream data must not leak",
        );
      },
      async () =>
        Response.json({
          error: { code, message: "PRIVATE body and synthetic-test-key" },
        }, { status: 429 }),
    );
  }
});

Deno.test("refused, incomplete, and empty responses are never accepted as successful extraction", async () => {
  for (
    const [body, status] of [
      [{
        status: "completed",
        output: [{
          type: "message",
          content: [{ type: "refusal", refusal: "PRIVATE" }],
        }],
      }, 422],
      [{
        status: "incomplete",
        output: [{
          type: "message",
          content: [{ type: "output_text", text: "partial" }],
        }],
      }, 502],
      [{ status: "completed", output: [] }, 502],
    ] as const
  ) {
    await withMock(async () => {
      await expectError(() => generateOpenAIText(options), status);
    }, async () => Response.json(body));
  }
});

Deno.test("timeouts are bounded and authentication failures are actionable", async () => {
  await withMock(async () => {
    await expectError(() => generateOpenAIText(options), 504);
  }, async () => {
    throw new DOMException("timeout", "TimeoutError");
  });
  await withMock(
    async () => {
      await expectError(() => generateOpenAIText(options), 503);
    },
    async () =>
      Response.json({ error: { message: "PRIVATE" } }, { status: 401 }),
  );
});

Deno.test("malformed structured output does not expose response content in parse errors", () => {
  try {
    parseOpenAIJSON("PRIVATE invalid JSON");
  } catch (error) {
    assert(
      error instanceof OpenAIError && !error.message.includes("PRIVATE"),
      "Invalid response must be redacted",
    );
    return;
  }
  throw new Error("Invalid JSON should fail");
});
