import { parseIncomingMessage, validInstanceToken } from "./whatsapp-event.ts";
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const start = new Date(Date.now() - 60_000).toISOString();
const event = () => ({ EventType: "messages", token: "synthetic", message: { messageid: "synthetic-message-id", chatid: "5511000000000@s.whatsapp.net", fromMe: false, text: "Mensagem fictícia", messageTimestamp: Date.now() } });
Deno.test("new direct messages retain direction and stable deduplication ID without token", () => {
  const parsed = parseIncomingMessage(event(), start);
  assert(parsed?.message_id === "synthetic-message-id" && parsed.from_me === false, "New client message must be captured");
  assert(!("token" in parsed), "Credential must never be persisted");
  const outgoing = event(); outgoing.message.fromMe = true;
  assert(parseIncomingMessage(outgoing, start)?.from_me === true, "Outgoing direction must be retained");
  const lid = event(); lid.message.chatid = "100000000000000@lid";
  assert(parseIncomingMessage(lid, start)?.chat_id.endsWith("@lid"), "LID is an opaque conversation ID, not a phone");
});
Deno.test("historical sync, old timestamps, groups, unknown direction and invalid dates are ignored", () => {
  assert(!parseIncomingMessage({ ...event(), request_id: "history-sync" }, start), "No historical sync");
  const old = event(); old.message.messageTimestamp = Date.parse(start) - 1;
  assert(!parseIncomingMessage(old, start), "No old messages");
  const group = event(); group.message.chatid = "123@g.us";
  assert(!parseIncomingMessage(group, start), "No group capture");
  const unknown = event(); delete (unknown.message as Partial<typeof unknown.message>).fromMe;
  assert(!parseIncomingMessage(unknown, start), "Unknown direction must not become client");
  const invalid = event(); invalid.message.messageTimestamp = NaN;
  assert(!parseIncomingMessage(invalid, start), "Invalid timestamp rejected");
});
Deno.test("instance authentication requires the configured secret and exact token", () => {
  assert(validInstanceToken("synthetic-token", "synthetic-token"), "Matching instance is accepted");
  assert(!validInstanceToken("synthetic-other", "synthetic-token") && !validInstanceToken(undefined, "synthetic-token") && !validInstanceToken("anything", undefined), "Missing/wrong credentials are rejected");
});
