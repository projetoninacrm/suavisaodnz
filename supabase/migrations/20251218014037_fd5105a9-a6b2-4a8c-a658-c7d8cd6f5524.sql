-- Create table for LEADS
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year TEXT DEFAULT '2025',
  canal TEXT,
  nome TEXT,
  numero TEXT,
  orcamento TEXT DEFAULT 'Não',
  venda TEXT DEFAULT 'Não',
  entrar_em_contato TEXT,
  medico TEXT,
  obs TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for INDICADORES
CREATE TABLE public.indicadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicador TEXT,
  valor TEXT,
  meta TEXT,
  periodo TEXT,
  obs TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for METAS
CREATE TABLE public.metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT,
  valor_meta TEXT,
  valor_atual TEXT,
  percentual TEXT,
  status TEXT,
  obs TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for DETALHADO
CREATE TABLE public.detalhado (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data TEXT,
  descricao TEXT,
  valor TEXT,
  categoria TEXT,
  responsavel TEXT,
  obs TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for MKT
CREATE TABLE public.mkt (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha TEXT,
  canal TEXT,
  investimento TEXT,
  retorno TEXT,
  leads_gerados TEXT,
  conversoes TEXT,
  obs TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalhado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mkt ENABLE ROW LEVEL SECURITY;

-- Create authenticated access policies for leads
CREATE POLICY "Allow authenticated read leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete leads" ON public.leads FOR DELETE TO authenticated USING (true);

-- Create authenticated access policies for indicadores
CREATE POLICY "Allow authenticated read indicadores" ON public.indicadores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert indicadores" ON public.indicadores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update indicadores" ON public.indicadores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete indicadores" ON public.indicadores FOR DELETE TO authenticated USING (true);

-- Create authenticated access policies for metas
CREATE POLICY "Allow authenticated read metas" ON public.metas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert metas" ON public.metas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update metas" ON public.metas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete metas" ON public.metas FOR DELETE TO authenticated USING (true);

-- Create authenticated access policies for detalhado
CREATE POLICY "Allow authenticated read detalhado" ON public.detalhado FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert detalhado" ON public.detalhado FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update detalhado" ON public.detalhado FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete detalhado" ON public.detalhado FOR DELETE TO authenticated USING (true);

-- Create authenticated access policies for mkt
CREATE POLICY "Allow authenticated read mkt" ON public.mkt FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert mkt" ON public.mkt FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update mkt" ON public.mkt FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete mkt" ON public.mkt FOR DELETE TO authenticated USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_indicadores_updated_at BEFORE UPDATE ON public.indicadores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON public.metas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_detalhado_updated_at BEFORE UPDATE ON public.detalhado FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mkt_updated_at BEFORE UPDATE ON public.mkt FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample LEADS data from the screenshot
-- Production migration intentionally creates an empty table; source contact rows stay out of the database.