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

-- Policies for public access
CREATE POLICY "Allow public read acompanhamento_diario" 
ON public.acompanhamento_diario 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert acompanhamento_diario" 
ON public.acompanhamento_diario 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update acompanhamento_diario" 
ON public.acompanhamento_diario 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete acompanhamento_diario" 
ON public.acompanhamento_diario 
FOR DELETE 
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_acompanhamento_diario_updated_at
BEFORE UPDATE ON public.acompanhamento_diario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();