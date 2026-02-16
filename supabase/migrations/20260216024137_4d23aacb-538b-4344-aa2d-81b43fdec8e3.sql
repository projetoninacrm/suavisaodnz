
-- Tabela de automações cadastradas
CREATE TABLE public.automacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  dias_apos_venda INTEGER NOT NULL,
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Ativa',
  total_envios INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read automacoes" ON public.automacoes FOR SELECT USING (true);
CREATE POLICY "Allow public insert automacoes" ON public.automacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update automacoes" ON public.automacoes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete automacoes" ON public.automacoes FOR DELETE USING (true);

CREATE TRIGGER update_automacoes_updated_at
  BEFORE UPDATE ON public.automacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de histórico/log de disparos
CREATE TABLE public.automacao_disparos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automacao_id UUID NOT NULL REFERENCES public.automacoes(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  nome_cliente TEXT,
  telefone TEXT,
  mensagem_enviada TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_envio TIMESTAMP WITH TIME ZONE,
  data_programada DATE NOT NULL,
  erro TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automacao_disparos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read automacao_disparos" ON public.automacao_disparos FOR SELECT USING (true);
CREATE POLICY "Allow public insert automacao_disparos" ON public.automacao_disparos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update automacao_disparos" ON public.automacao_disparos FOR UPDATE USING (true);
CREATE POLICY "Allow public delete automacao_disparos" ON public.automacao_disparos FOR DELETE USING (true);

CREATE TRIGGER update_automacao_disparos_updated_at
  BEFORE UPDATE ON public.automacao_disparos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de configuração geral (pause global, etc)
CREATE TABLE public.automacoes_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pausado BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automacoes_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all automacoes_config" ON public.automacoes_config FOR ALL USING (true) WITH CHECK (true);

-- Inserir config padrão
INSERT INTO public.automacoes_config (pausado) VALUES (false);
