export interface IncomingMessage {
  message_id: string;
  chat_id: string;
  from_me: boolean;
  body: string;
  message_at: string;
}

/** UAZAPI normalized events only. Never persist the envelope/token. */
export function parseIncomingMessage(payload: unknown, startedAt: string): IncomingMessage | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (p.EventType !== "messages" || p.request_id) return null;
  const m = p.message as Record<string, unknown> | undefined;
  if (!m || m.isGroup === true || m.request_id || typeof m.fromMe !== "boolean") return null;
  const chat = typeof m.chatid === "string" ? m.chatid : "";
  if (!/^\d+@(s\.whatsapp\.net|lid)$/.test(chat)) return null;
  const id = m.messageid ?? m.id;
  const timestamp = Number(m.messageTimestamp);
  if (typeof id !== "string" || !id || !Number.isFinite(timestamp)
    || timestamp < Date.parse(startedAt) || timestamp > Date.now() + 300_000) return null;
  const text = typeof m.text === "string" && m.text.trim() ? m.text
    : typeof m.content === "string" && m.content.trim() ? m.content
    : typeof (m.content as { text?: unknown })?.text === "string" ? (m.content as { text: string }).text
    : /audio|image|video|document/i.test(String(m.messageType))
      ? `[${m.messageType}]` : "";
  if (!text) return null;
  return { message_id: id, chat_id: chat, from_me: m.fromMe, body: text.slice(0, 20_000), message_at: new Date(timestamp).toISOString() };
}

export function validInstanceToken(actual: unknown, expected: string | undefined): boolean {
  if (typeof actual !== "string" || !expected || actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
