-- Tabela para armazenar configurações de metas por mês
CREATE TABLE public.metas_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes TEXT NOT NULL UNIQUE, -- jan, fev, mar, etc.
  periodos INTEGER DEFAULT 0,
  media_atendimentos NUMERIC DEFAULT 8,
  percentual_receita NUMERIC DEFAULT 60,
  percentual_comparecimento NUMERIC DEFAULT 50,
  percentual_conversao NUMERIC DEFAULT 66,
  meta_faturamento_mensal NUMERIC DEFAULT 60000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.metas_config ENABLE ROW LEVEL SECURITY;

-- Políticas restritas a usuários autenticados
CREATE POLICY "Allow authenticated read metas_config"
  ON public.metas_config
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert metas_config"
  ON public.metas_config
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update metas_config"
  ON public.metas_config
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated delete metas_config"
  ON public.metas_config
  FOR DELETE TO authenticated
  USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_metas_config_updated_at
  BEFORE UPDATE ON public.metas_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();