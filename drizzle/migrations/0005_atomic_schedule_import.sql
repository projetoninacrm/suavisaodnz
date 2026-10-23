-- Replace one month of schedule data in a single transaction.
-- The Edge Function uses service_role after validating the selected professionals.
CREATE OR REPLACE FUNCTION public.replace_schedule_month(
  p_sheet_name text,
  p_year integer,
  p_month integer,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item jsonb;
  item_date date;
  professional_id uuid;
  month_short text;
  deleted_count integer := 0;
  inserted_count integer := 0;
BEGIN
  IF p_sheet_name IS NULL OR length(btrim(p_sheet_name)) = 0 OR length(p_sheet_name) > 100
     OR p_year IS NULL OR p_year < 2000 OR p_year > 2100
     OR p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Informe uma escala, mês e ano válidos.' USING ERRCODE = '22023';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'A prévia da escala é inválida.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_rows) < 1 OR jsonb_array_length(p_rows) > 31 THEN
    RAISE EXCEPTION 'A prévia deve conter de 1 a 31 dias.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS row_data(value)
    WHERE jsonb_typeof(row_data.value) <> 'object'
       OR COALESCE(row_data.value->>'date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  ) THEN
    RAISE EXCEPTION 'A prévia contém linhas ou datas inválidas.' USING ERRCODE = '22023';
  END IF;

  IF (
    SELECT count(DISTINCT row_data.value->>'date')
    FROM jsonb_array_elements(p_rows) AS row_data(value)
  ) <> jsonb_array_length(p_rows) THEN
    RAISE EXCEPTION 'A prévia contém dias duplicados.' USING ERRCODE = '23505';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_rows) AS row_data(value) LOOP
    item_date := (item->>'date')::date;
    IF extract(year FROM item_date)::integer <> p_year OR extract(month FROM item_date)::integer <> p_month
       OR extract(dow FROM item_date)::integer = 0 THEN
      RAISE EXCEPTION 'A data da prévia não corresponde ao mês ou contém domingo.' USING ERRCODE = '22023';
    END IF;

    IF item ? 'morning_shift_professional_id' AND jsonb_typeof(item->'morning_shift_professional_id') NOT IN ('null', 'string') THEN
      RAISE EXCEPTION 'O profissional da manhã é inválido.' USING ERRCODE = '22023';
    END IF;
    IF item ? 'afternoon_shift_professional_id' AND jsonb_typeof(item->'afternoon_shift_professional_id') NOT IN ('null', 'string') THEN
      RAISE EXCEPTION 'O profissional da tarde é inválido.' USING ERRCODE = '22023';
    END IF;

    professional_id := nullif(item->>'morning_shift_professional_id', '')::uuid;
    IF professional_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.professionals WHERE id = professional_id) THEN
      RAISE EXCEPTION 'O profissional da manhã não está cadastrado.' USING ERRCODE = '23503';
    END IF;
    professional_id := nullif(item->>'afternoon_shift_professional_id', '')::uuid;
    IF professional_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.professionals WHERE id = professional_id) THEN
      RAISE EXCEPTION 'O profissional da tarde não está cadastrado.' USING ERRCODE = '23503';
    END IF;
  END LOOP;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_sheet_name || '|' || p_year::text || '|' || p_month::text, 0));

  month_short := (ARRAY['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'])[p_month];
  DELETE FROM public.schedules
  WHERE sheet_name = p_sheet_name
    AND (
      date LIKE p_year::text || '-' || lpad(p_month::text, 2, '0') || '-%'
      OR (
        p_year = 2026
        AND date ~ '^[0-9]{1,2}/[[:alpha:]]{3}$'
        AND lower(split_part(date, '/', 2)) = month_short
      )
    );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  INSERT INTO public.schedules (
    sheet_name, date, day_of_week, morning_shift, afternoon_shift,
    morning_shift_professional_id, afternoon_shift_professional_id
  )
  SELECT
    p_sheet_name,
    row_data.value->>'date',
    (ARRAY['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'])[extract(dow FROM (row_data.value->>'date')::date)::integer + 1],
    COALESCE(morning.name, ''),
    COALESCE(afternoon.name, ''),
    nullif(row_data.value->>'morning_shift_professional_id', '')::uuid,
    nullif(row_data.value->>'afternoon_shift_professional_id', '')::uuid
  FROM jsonb_array_elements(p_rows) AS row_data(value)
  LEFT JOIN public.professionals AS morning
    ON morning.id = nullif(row_data.value->>'morning_shift_professional_id', '')::uuid
  LEFT JOIN public.professionals AS afternoon
    ON afternoon.id = nullif(row_data.value->>'afternoon_shift_professional_id', '')::uuid;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  RETURN jsonb_build_object('inserted', inserted_count, 'deleted', deleted_count);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_schedule_month(text, integer, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_schedule_month(text, integer, integer, jsonb) TO service_role;
