-- Stable, centrally managed identities for store employees and clinicians.
-- Keep the original lead text columns for existing automations and exports.
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'Vendedor',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS employees_name_normalized_unique
  ON public.employees (lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')));

CREATE TABLE IF NOT EXISTS public.professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  external_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS professionals_name_normalized_unique
  ON public.professionals (lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')));

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS vendedor_id uuid REFERENCES public.employees(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS medico_id uuid REFERENCES public.professionals(id) ON DELETE RESTRICT;

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS morning_shift_professional_id uuid REFERENCES public.professionals(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS afternoon_shift_professional_id uuid REFERENCES public.professionals(id) ON DELETE RESTRICT;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users manage employees" ON public.employees;
CREATE POLICY "Authenticated users manage employees" ON public.employees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users manage professionals" ON public.professionals;
CREATE POLICY "Authenticated users manage professionals" ON public.professionals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_professionals_updated_at ON public.professionals;
CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the directory from existing assignments and the names already offered
-- by the UI. This does not create or merge CRM leads.
INSERT INTO public.employees (name)
SELECT DISTINCT ON (lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))) btrim(name)
FROM (
  SELECT vendedor AS name FROM public.leads
  UNION ALL
  SELECT jsonb_object_keys(COALESCE(audios_vendedor::jsonb, '{}'::jsonb))
  FROM public.automacoes
  WHERE jsonb_typeof(audios_vendedor::jsonb) = 'object'
  UNION ALL SELECT 'Bernardo'
  UNION ALL SELECT 'Thayssa'
) AS existing_names
WHERE nullif(btrim(name), '') IS NOT NULL
ORDER BY lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')), btrim(name)
ON CONFLICT DO NOTHING;

INSERT INTO public.professionals (name)
SELECT DISTINCT ON (lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))) btrim(name)
FROM (
  SELECT medico AS name FROM public.leads
  UNION ALL SELECT morning_shift AS name FROM public.schedules
  UNION ALL SELECT afternoon_shift AS name FROM public.schedules
  UNION ALL SELECT unnest(ARRAY['Ana', 'Thabata', 'Carol', 'Larissa', 'Amanda', 'Cassio', 'Karollyne', 'Alice'])
) AS existing_names
WHERE nullif(btrim(name), '') IS NOT NULL
  AND lower(btrim(name)) NOT IN ('-', '—', 'folga', 'sem médico', 'sem medico', 's/ médico', 's/ medico', 'não informado', 'nao informado')
ORDER BY lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')), btrim(name)
ON CONFLICT DO NOTHING;

-- Keep legacy text fields readable for automations, and add stable foreign keys.
UPDATE public.leads AS lead
SET vendedor_id = employee.id
FROM public.employees AS employee
WHERE lead.vendedor_id IS NULL
  AND lower(regexp_replace(btrim(lead.vendedor), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(employee.name), '[[:space:]]+', ' ', 'g'));

UPDATE public.leads AS lead
SET medico_id = professional.id
FROM public.professionals AS professional
WHERE lead.medico_id IS NULL
  AND lower(regexp_replace(btrim(lead.medico), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(professional.name), '[[:space:]]+', ' ', 'g'));

UPDATE public.schedules AS schedule
SET morning_shift_professional_id = professional.id
FROM public.professionals AS professional
WHERE schedule.morning_shift_professional_id IS NULL
  AND lower(regexp_replace(btrim(schedule.morning_shift), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(professional.name), '[[:space:]]+', ' ', 'g'));

UPDATE public.schedules AS schedule
SET afternoon_shift_professional_id = professional.id
FROM public.professionals AS professional
WHERE schedule.afternoon_shift_professional_id IS NULL
  AND lower(regexp_replace(btrim(schedule.afternoon_shift), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(professional.name), '[[:space:]]+', ' ', 'g'));

CREATE INDEX IF NOT EXISTS leads_vendedor_id_idx ON public.leads(vendedor_id);
CREATE INDEX IF NOT EXISTS leads_medico_id_idx ON public.leads(medico_id);
CREATE INDEX IF NOT EXISTS schedules_morning_professional_id_idx ON public.schedules(morning_shift_professional_id);
CREATE INDEX IF NOT EXISTS schedules_afternoon_professional_id_idx ON public.schedules(afternoon_shift_professional_id);
