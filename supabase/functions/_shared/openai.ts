export class OpenAIError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "OpenAIError";
  }
}

export function parseOpenAIJSON<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new OpenAIError("Resposta estruturada inválida da OpenAI.");
  }
}

export type OpenAIContent =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail: "high" | "auto" | "low" }
  | { type: "input_file"; filename: string; file_data: string };

interface OpenAIOptions {
  modelEnv: string;
  defaultModel?: string;
  instructions?: string;
  input: string | Array<{ role: "user"; content: OpenAIContent[] }>;
  maxOutputTokens: number;
  timeoutMs?: number;
  schema?: { name: string; schema: Record<string, unknown> };
}

/** Server-side only. Never log prompts, files, responses, or credentials. */
export async function generateOpenAIText(
  options: OpenAIOptions,
): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!apiKey) {
    throw new OpenAIError(
      "OPENAI_API_KEY não configurada nos secrets do Supabase.",
      503,
    );
  }

  const model = Deno.env.get(options.modelEnv)?.trim() ||
    Deno.env.get("OPENAI_MODEL")?.trim() ||
    options.defaultModel ||
    "gpt-4.1-mini";

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? 45_000),
      body: JSON.stringify({
        model,
        instructions: options.instructions,
        input: options.input,
        max_output_tokens: options.maxOutputTokens,
        store: false,
        ...(options.schema
          ? {
            text: {
              format: { type: "json_schema", strict: true, ...options.schema },
            },
          }
          : {}),
      }),
    });
  } catch (error) {
    const timeout = error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name);
    throw new OpenAIError(
      timeout
        ? "A OpenAI demorou para responder. Tente novamente."
        : "Não foi possível conectar à OpenAI. Tente novamente.",
      timeout ? 504 : 502,
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code = body?.error?.code;
    console.warn("OpenAI request failed", {
      status: response.status,
      requestId: response.headers.get("x-request-id"),
    });
    if (response.status === 429 && code === "insufficient_quota") {
      throw new OpenAIError(
        "Créditos ou cota da API OpenAI esgotados. Verifique o faturamento da API.",
        402,
      );
    }
    if (response.status === 429) {
      throw new OpenAIError(
        "Limite de requisições da OpenAI atingido. Tente novamente em instantes.",
        429,
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new OpenAIError(
        "A chave OpenAI não tem acesso à API ou ao modelo configurado.",
        503,
      );
    }
    throw new OpenAIError(
      "A OpenAI não conseguiu processar a solicitação. Confira o arquivo e o modelo configurado.",
    );
  }

  const result = await response.json().catch(() => {
    throw new OpenAIError("Resposta inválida da OpenAI.");
  });
  if (result.status !== "completed") {
    throw new OpenAIError(
      "A resposta da OpenAI ficou incompleta. Tente novamente.",
    );
  }
  const messages = (Array.isArray(result.output) ? result.output : [])
    .filter((item: { type?: string }) => item.type === "message");
  const content = messages.flatMap((item: { content?: unknown[] }) =>
    Array.isArray(item.content) ? item.content : []
  ) as Array<{ type?: string; text?: string }>;
  if (content.some((item) => item.type === "refusal")) {
    throw new OpenAIError(
      "A OpenAI não conseguiu analisar este conteúdo. Revise o arquivo ou a mensagem.",
      422,
    );
  }
  const text = content.filter((item) =>
    item.type === "output_text" && typeof item.text === "string"
  )
    .map((item) => item.text).join("\n").trim();
  if (!text) {
    throw new OpenAIError(
      "A OpenAI não retornou conteúdo para esta solicitação.",
    );
  }
  return text;
}
