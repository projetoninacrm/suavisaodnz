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

-- Create public access policies for leads
CREATE POLICY "Allow public read leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Allow public insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update leads" ON public.leads FOR UPDATE USING (true);
CREATE POLICY "Allow public delete leads" ON public.leads FOR DELETE USING (true);

-- Create public access policies for indicadores
CREATE POLICY "Allow public read indicadores" ON public.indicadores FOR SELECT USING (true);
CREATE POLICY "Allow public insert indicadores" ON public.indicadores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update indicadores" ON public.indicadores FOR UPDATE USING (true);
CREATE POLICY "Allow public delete indicadores" ON public.indicadores FOR DELETE USING (true);

-- Create public access policies for metas
CREATE POLICY "Allow public read metas" ON public.metas FOR SELECT USING (true);
CREATE POLICY "Allow public insert metas" ON public.metas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update metas" ON public.metas FOR UPDATE USING (true);
CREATE POLICY "Allow public delete metas" ON public.metas FOR DELETE USING (true);

-- Create public access policies for detalhado
CREATE POLICY "Allow public read detalhado" ON public.detalhado FOR SELECT USING (true);
CREATE POLICY "Allow public insert detalhado" ON public.detalhado FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update detalhado" ON public.detalhado FOR UPDATE USING (true);
CREATE POLICY "Allow public delete detalhado" ON public.detalhado FOR DELETE USING (true);

-- Create public access policies for mkt
CREATE POLICY "Allow public read mkt" ON public.mkt FOR SELECT USING (true);
CREATE POLICY "Allow public insert mkt" ON public.mkt FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update mkt" ON public.mkt FOR UPDATE USING (true);
CREATE POLICY "Allow public delete mkt" ON public.mkt FOR DELETE USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_indicadores_updated_at BEFORE UPDATE ON public.indicadores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON public.metas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_detalhado_updated_at BEFORE UPDATE ON public.detalhado FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mkt_updated_at BEFORE UPDATE ON public.mkt FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample LEADS data from the screenshot
INSERT INTO public.leads (year, canal, nome, numero, orcamento, venda, entrar_em_contato, medico, obs) VALUES
('2025', 'Internet', 'Silvia de Oliveira Santos', '31983257024', 'Não', 'Não', '12/12', '', 'perdido'),
('2025', 'Internet', 'Marly Cardoso de Oliveira', '31998747790', 'Não', 'Não', '15/12/2025', '', 'consulta marcada dia 18/12'),
('2025', 'Internet', 'Washington Fagundes', '31993841210', 'Não', 'Não', '18/12/2025', '', 'Marcar consulta'),
('2025', 'Internet', 'Marcelo Antonio de Assumpção Freire', '31985699587', 'Não', 'Não', '18/12/2025', '', 'perdido'),
('2025', 'Internet', 'Ivanete Pereira Soares', '31985342435', 'Não', 'Não', '16/12/2025', '', 'perdido'),
('2025', 'Internet', 'Fábio Simão Barbosa', '31987345427', 'Não', 'Não', '16/12/2025', '', 'aguardando vir até a loja'),
('2025', 'Sua Visão', 'Sara Andrade', '(31) 98809-2136', 'Sim', 'Não', '16/12/2025', 'Thabata', 'lentes com filtro azul'),
('2025', 'Sua Visão', 'José de Souza', '(31) 99492-5030', 'Sim', 'Sim', '', 'Thabata', 'Entrar em contato pos venda'),
('2025', 'Sua Visão', 'Alessandra Aparecida', '', 'Sim', 'Sim', '', 'Thabata', 'Entrar em contato pos venda'),
('2025', 'Internet', 'David', '(31) 99380-4390', 'Sim', 'Não', '', '', 'lente de contato'),
('2025', 'Sua Visão', 'Kenia Laura de Oliveira', '(31) 99577-1631', 'Sim', 'Sim', '', 'Carol', 'Paciente sua visão'),
('2025', 'Sua Visão', 'Oderval', '(31) 98712-8125', 'Sim', 'Não', '11/12/2025', 'Carol', 'não quis deixar contato'),
('2025', 'Sua Visão', 'Paulo Nilton', '(31) 98208-3044', 'Sim', 'Sim', '25/11/2025', 'Carol', 'Entrar em contato pos venda'),
('2025', 'Sua Visão', 'Lucimara Araújo', '(31) 9345-7869', 'Sim', 'Sim', '25/12/2025', 'Ana', 'Entrar em contato pos venda'),
('2025', 'Sua Visão', 'Leny', '(31) 97557-9733', 'Sim', 'Não', '16/12/2025', 'Larissa', 'lentes filtro azul negociando valor'),
('2025', 'Internet', 'Wania Da Silva', '(31) 99959-8519', 'Não', 'Não', '16/12/2025', '', 'virá a loja, lentes multifocais'),
('2025', 'Internet', 'Daiane Pitangueira', '(31) 99369-5301', 'Não', 'Não', '16/12/2025', '', 'Duvida Lentes de contato'),
('2025', 'Internet', 'Nancely', '(31) 98966-3417', 'Não', 'Não', '', '', 'oculos para a irmã. comprou em outro lugar'),
('2025', 'Internet', 'Alexandra Ribeiro', '(31) 98786-1215', 'Não', 'Não', '16/12/2025', '', 'marcar consulta'),
('2025', 'Sua Visão', 'Augusto Julio', '(31) 99180-7862', 'Sim', 'Sim', '01/01/2026', 'Ana', 'Compra realizada com sucesso');