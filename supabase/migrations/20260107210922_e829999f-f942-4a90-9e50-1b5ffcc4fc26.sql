-- Adicionar coluna status na tabela leads para marcar cliente como perdido
ALTER TABLE public.leads ADD COLUMN status TEXT DEFAULT 'Ativo';