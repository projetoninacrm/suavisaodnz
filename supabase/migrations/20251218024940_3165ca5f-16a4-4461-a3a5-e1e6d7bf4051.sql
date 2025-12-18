-- Drop existing columns and add new ones for the detalhado table
ALTER TABLE public.detalhado 
DROP COLUMN IF EXISTS categoria,
DROP COLUMN IF EXISTS descricao,
DROP COLUMN IF EXISTS responsavel,
DROP COLUMN IF EXISTS valor;

-- Add new columns matching the spreadsheet
ALTER TABLE public.detalhado 
ADD COLUMN IF NOT EXISTS nome text,
ADD COLUMN IF NOT EXISTS telefone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS como_conheceu text,
ADD COLUMN IF NOT EXISTS receita text,
ADD COLUMN IF NOT EXISTS visitou_loja text;

-- Ensure data column exists (it should already)
-- ALTER TABLE public.detalhado ADD COLUMN IF NOT EXISTS data text;