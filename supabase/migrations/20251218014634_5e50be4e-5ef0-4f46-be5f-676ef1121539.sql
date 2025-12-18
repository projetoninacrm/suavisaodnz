-- Rename column year to data_registro for clarity
ALTER TABLE public.leads RENAME COLUMN year TO data_registro;

-- Update existing records with full dates
UPDATE public.leads SET data_registro = '01/12/2025' WHERE data_registro = '2025';