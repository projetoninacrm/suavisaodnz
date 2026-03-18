
CREATE OR REPLACE FUNCTION public.get_inactive_patients(dias_limite integer DEFAULT 730, dias_janela integer DEFAULT 30)
RETURNS TABLE(
  id uuid,
  nome text,
  telefone text,
  ultimo_atendimento text,
  dias_desde_ultimo integer
)
LANGUAGE sql
STABLE
AS $$
  WITH cleaned AS (
    SELECT
      d.id,
      d.nome,
      d.telefone,
      d.data,
      CASE
        WHEN d.data ~ '^\d{2}/\d{2}/\d{4}' THEN
          to_date(d.data, 'DD/MM/YYYY')
        ELSE
          NULL
      END AS parsed_date,
      -- normalize phone: strip non-digits, remove leading 55
      regexp_replace(d.telefone, '\D', '', 'g') AS phone_clean
    FROM detalhado d
    WHERE d.telefone IS NOT NULL
      AND d.data IS NOT NULL
  ),
  latest AS (
    SELECT DISTINCT ON (phone_clean)
      id,
      nome,
      telefone,
      data AS ultimo_atendimento,
      parsed_date
    FROM cleaned
    WHERE parsed_date IS NOT NULL
      AND phone_clean IS NOT NULL
      AND length(phone_clean) >= 10
    ORDER BY phone_clean, parsed_date DESC
  )
  SELECT
    l.id,
    COALESCE(l.nome, 'Sem nome') AS nome,
    l.telefone,
    l.ultimo_atendimento,
    (CURRENT_DATE - l.parsed_date)::integer AS dias_desde_ultimo
  FROM latest l
  WHERE (CURRENT_DATE - l.parsed_date)::integer >= (dias_limite - dias_janela)
  ORDER BY (CURRENT_DATE - l.parsed_date) DESC;
$$;
