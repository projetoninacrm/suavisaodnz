-- Preserve the second notes field present in the Lovable leads table.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS obs2 text;
