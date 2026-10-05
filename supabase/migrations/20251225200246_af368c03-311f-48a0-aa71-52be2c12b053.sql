-- Tabela para acompanhamento diário de metas
CREATE TABLE public.acompanhamento_diario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data TEXT NOT NULL,
  vendas_realizadas NUMERIC DEFAULT 0,
  faturamento_realizado NUMERIC DEFAULT 0,
  obs TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT acompanhamento_diario_data_unique UNIQUE (data)
);

-- Enable Row Level Security
ALTER TABLE public.acompanhamento_diario ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated access
CREATE POLICY "Allow authenticated read acompanhamento_diario"
ON public.acompanhamento_diario
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert acompanhamento_diario"
ON public.acompanhamento_diario
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update acompanhamento_diario"
ON public.acompanhamento_diario
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Allow authenticated delete acompanhamento_diario"
ON public.acompanhamento_diario
FOR DELETE TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_acompanhamento_diario_updated_at
BEFORE UPDATE ON public.acompanhamento_diario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();