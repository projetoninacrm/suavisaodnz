-- Add vendedor column to leads table
ALTER TABLE public.leads 
ADD COLUMN vendedor text DEFAULT NULL;