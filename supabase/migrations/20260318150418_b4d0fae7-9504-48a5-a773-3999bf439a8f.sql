
CREATE OR REPLACE FUNCTION public.get_return_rate_patients(
  data_inicio text DEFAULT '01/01/2023',
  data_fim text DEFAULT '31/12/2023'
)
RETURNS TABLE(
  id uuid,
  nome text,
  telefone text,
  primeiro_atendimento text,
  total_atendimentos integer,
  retornou boolean,
  atendimentos_no_periodo integer,
  atendimentos_apos_periodo integer
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
      regexp_replace(d.telefone, '\D', '', 'g') AS phone_clean
    FROM detalhado d
    WHERE d.telefone IS NOT NULL
      AND d.data IS NOT NULL
  ),
  -- All patients seen in the selected period
  patients_in_period AS (
    SELECT DISTINCT phone_clean
    FROM cleaned
    WHERE parsed_date IS NOT NULL
      AND phone_clean IS NOT NULL
      AND length(phone_clean) >= 10
      AND parsed_date >= to_date(data_inicio, 'DD/MM/YYYY')
      AND parsed_date <= to_date(data_fim, 'DD/MM/YYYY')
  ),
  -- For each patient in period, get stats
  patient_stats AS (
    SELECT
      p.phone_clean,
      -- first visit in period
      MIN(CASE WHEN c.parsed_date >= to_date(data_inicio, 'DD/MM/YYYY') AND c.parsed_date <= to_date(data_fim, 'DD/MM/YYYY') THEN c.parsed_date END) AS first_visit_in_period,
      -- total all-time visits
      COUNT(DISTINCT c.parsed_date) AS total_visits,
      -- visits in period
      COUNT(DISTINCT CASE WHEN c.parsed_date >= to_date(data_inicio, 'DD/MM/YYYY') AND c.parsed_date <= to_date(data_fim, 'DD/MM/YYYY') THEN c.parsed_date END) AS visits_in_period,
      -- visits after period
      COUNT(DISTINCT CASE WHEN c.parsed_date > to_date(data_fim, 'DD/MM/YYYY') THEN c.parsed_date END) AS visits_after_period
    FROM patients_in_period p
    JOIN cleaned c ON c.phone_clean = p.phone_clean AND c.parsed_date IS NOT NULL
    GROUP BY p.phone_clean
  ),
  -- Get representative row for each patient
  patient_info AS (
    SELECT DISTINCT ON (c.phone_clean)
      c.id,
      c.nome,
      c.telefone,
      c.phone_clean
    FROM cleaned c
    JOIN patients_in_period p ON p.phone_clean = c.phone_clean
    WHERE c.parsed_date IS NOT NULL
    ORDER BY c.phone_clean, c.parsed_date DESC
  )
  SELECT
    pi.id,
    COALESCE(pi.nome, 'Sem nome') AS nome,
    pi.telefone,
    to_char(ps.first_visit_in_period, 'DD/MM/YYYY') AS primeiro_atendimento,
    ps.total_visits::integer AS total_atendimentos,
    (ps.visits_after_period > 0) AS retornou,
    ps.visits_in_period::integer AS atendimentos_no_periodo,
    ps.visits_after_period::integer AS atendimentos_apos_periodo
  FROM patient_info pi
  JOIN patient_stats ps ON ps.phone_clean = pi.phone_clean
  ORDER BY ps.first_visit_in_period;
$$;
