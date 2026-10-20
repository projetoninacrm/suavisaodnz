-- Shared, explicitly managed categories for lead channels and Amigo service origins.
-- Existing text values remain untouched; recognized values are seeded for gradual migration.
CREATE TABLE IF NOT EXISTS public.category_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL CHECK (domain IN ('lead_channel', 'service_origin')),
  label text NOT NULL CHECK (length(btrim(label)) > 0),
  aliases text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS category_catalog_domain_label_normalized_unique
  ON public.category_catalog (
    domain,
    lower(regexp_replace(btrim(label), '[[:space:]]+', ' ', 'g'))
  );

CREATE INDEX IF NOT EXISTS category_catalog_domain_active_order_idx
  ON public.category_catalog (domain, is_active, sort_order, label);

ALTER TABLE public.category_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users manage category catalog" ON public.category_catalog;
CREATE POLICY "Authenticated users manage category catalog" ON public.category_catalog
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_category_catalog_updated_at ON public.category_catalog;
CREATE TRIGGER update_category_catalog_updated_at BEFORE UPDATE ON public.category_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.category_catalog (domain, label, sort_order)
VALUES
  ('lead_channel', 'Internet', 10),
  ('lead_channel', 'Sua Visão', 20),
  ('lead_channel', 'Loja', 30),
  ('lead_channel', 'Du Benefícios', 40),
  ('lead_channel', 'Indique e Ganhe', 50)
ON CONFLICT DO NOTHING;

-- Preserve every distinct existing lead-channel value. The seed does not infer aliases
-- or merge categories based on similarity; a manager can add an explicit alias later.
WITH raw_channels AS (
  SELECT btrim(canal) AS label
  FROM public.leads
  WHERE canal IS NOT NULL AND length(btrim(canal)) > 0
), distinct_channels AS (
  SELECT DISTINCT ON (lower(regexp_replace(label, '[[:space:]]+', ' ', 'g')))
    label,
    lower(regexp_replace(label, '[[:space:]]+', ' ', 'g')) AS label_key
  FROM raw_channels
  ORDER BY lower(regexp_replace(label, '[[:space:]]+', ' ', 'g')), label
)
INSERT INTO public.category_catalog (domain, label, sort_order)
SELECT 'lead_channel', label, 100
FROM distinct_channels
WHERE label_key NOT IN ('internet', 'sua visão', 'loja', 'du benefícios', 'indique e ganhe')
ON CONFLICT DO NOTHING;

WITH raw_origins AS (
  SELECT btrim(como_conheceu) AS label
  FROM public.detalhado
  WHERE como_conheceu IS NOT NULL AND length(btrim(como_conheceu)) > 0
), distinct_origins AS (
  SELECT DISTINCT ON (lower(regexp_replace(label, '[[:space:]]+', ' ', 'g')))
    label
  FROM raw_origins
  ORDER BY lower(regexp_replace(label, '[[:space:]]+', ' ', 'g')), label
)
INSERT INTO public.category_catalog (domain, label, sort_order)
SELECT 'service_origin', label, 10
FROM distinct_origins
ON CONFLICT DO NOTHING;

-- Category labels and aliases share one vocabulary inside each domain.
-- Serialize writes by domain so concurrent inserts cannot claim the same term.
CREATE OR REPLACE FUNCTION public.enforce_category_catalog_terms_unique()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  conflicting_term text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.domain, 0));

  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(NEW.aliases, ARRAY[]::text[])) AS alias(term)
    WHERE length(btrim(alias.term)) = 0
  ) THEN
    RAISE EXCEPTION 'Category aliases cannot be blank' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(ARRAY[NEW.label] || COALESCE(NEW.aliases, ARRAY[]::text[])) AS candidate(term)
    GROUP BY lower(regexp_replace(btrim(candidate.term), '[[:space:]]+', ' ', 'g'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Category labels and aliases must be unique within the category' USING ERRCODE = '23505';
  END IF;

  SELECT proposed.term
  INTO conflicting_term
  FROM unnest(ARRAY[NEW.label] || COALESCE(NEW.aliases, ARRAY[]::text[])) AS proposed(term)
  JOIN LATERAL (
    SELECT other.label AS term
    FROM public.category_catalog AS other
    WHERE other.domain = NEW.domain AND other.id <> NEW.id
    UNION ALL
    SELECT existing_alias.term
    FROM public.category_catalog AS other
    CROSS JOIN LATERAL unnest(other.aliases) AS existing_alias(term)
    WHERE other.domain = NEW.domain AND other.id <> NEW.id
  ) AS existing
    ON lower(regexp_replace(btrim(proposed.term), '[[:space:]]+', ' ', 'g'))
     = lower(regexp_replace(btrim(existing.term), '[[:space:]]+', ' ', 'g'))
  LIMIT 1;

  IF conflicting_term IS NOT NULL THEN
    RAISE EXCEPTION 'Category label or alias already exists in this domain: %', conflicting_term
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS category_catalog_terms_unique ON public.category_catalog;
CREATE TRIGGER category_catalog_terms_unique
  BEFORE INSERT OR UPDATE OF domain, label, aliases ON public.category_catalog
  FOR EACH ROW EXECUTE FUNCTION public.enforce_category_catalog_terms_unique();
