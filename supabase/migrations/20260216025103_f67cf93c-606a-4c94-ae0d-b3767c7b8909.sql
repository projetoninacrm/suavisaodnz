
-- Add source and filter columns to automacoes
ALTER TABLE public.automacoes 
  ADD COLUMN fonte text NOT NULL DEFAULT 'leads',
  ADD COLUMN filtro_como_conheceu text[] DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.automacoes.fonte IS 'Source table: leads or detalhado';
COMMENT ON COLUMN public.automacoes.filtro_como_conheceu IS 'Array of como_conheceu values to filter detalhado records';
