-- Preserve the live Lovable schema when importing existing automations.
ALTER TABLE public.automacoes
  ADD COLUMN IF NOT EXISTS instancia text NOT NULL DEFAULT 'suavisao';
