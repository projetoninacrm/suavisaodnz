CREATE TABLE public.disparos_perdidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  nome_cliente text,
  telefone text,
  mensagem_enviada text,
  media_url text,
  media_type text,
  status text NOT NULL DEFAULT 'enviado',
  erro text,
  data_envio timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.disparos_perdidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated all disparos_perdidos" ON public.disparos_perdidos FOR ALL TO authenticated USING (true) WITH CHECK (true);