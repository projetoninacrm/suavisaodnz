-- Create table for marketing ads metrics
CREATE TABLE public.anuncios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('DNZ', 'SV')),
  ano INTEGER NOT NULL,
  mes TEXT NOT NULL,
  plataforma TEXT NOT NULL,
  cliques INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  conversao NUMERIC(5,2) DEFAULT 0,
  investimento NUMERIC(12,2) DEFAULT 0,
  custo_por_lead NUMERIC(12,2) DEFAULT 0,
  pacientes INTEGER DEFAULT 0,
  percentual NUMERIC(5,2) DEFAULT 0,
  cac NUMERIC(12,2) DEFAULT 0,
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (no auth required)
CREATE POLICY "Allow all access to anuncios" 
ON public.anuncios 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_anuncios_updated_at
BEFORE UPDATE ON public.anuncios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();