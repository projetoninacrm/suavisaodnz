-- Adicionar coluna venda na tabela detalhado
ALTER TABLE public.detalhado 
ADD COLUMN IF NOT EXISTS venda text;