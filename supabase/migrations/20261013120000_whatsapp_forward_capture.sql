-- Capture only events produced after this migration; no historical import.
CREATE TABLE public.whatsapp_capture_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  started_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO public.whatsapp_capture_settings(singleton) VALUES (true);
ALTER TABLE public.whatsapp_capture_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read capture settings" ON public.whatsapp_capture_settings
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.whatsapp_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instance text NOT NULL DEFAULT 'dnz',
  message_id text NOT NULL,
  chat_id text NOT NULL,
  from_me boolean NOT NULL,
  body text NOT NULL,
  message_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(instance, message_id)
);
CREATE INDEX whatsapp_messages_chat_time ON public.whatsapp_messages(chat_id, message_at, id);
CREATE INDEX whatsapp_messages_period ON public.whatsapp_messages(message_at);
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read WhatsApp messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.whatsapp_messages FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_messages FROM authenticated;
REVOKE ALL ON public.whatsapp_capture_settings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_capture_settings FROM authenticated;
