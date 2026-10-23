CREATE OR REPLACE FUNCTION public.update_employee_directory_person(
  p_employee_id uuid,
  p_name text,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_current_name text;
  v_clean_name text := regexp_replace(btrim(COALESCE(p_name, '')), '[[:space:]]+', ' ', 'g');
  v_clean_role text := nullif(regexp_replace(btrim(COALESCE(p_role, '')), '[[:space:]]+', ' ', 'g'), '');
  v_old_key text;
  v_new_key text;
  v_accents text := 'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ';
  v_replacements text := 'aaaaaaeeeeiiiiooooouuuucnyy';
BEGIN
  IF v_clean_name = '' THEN
    RAISE EXCEPTION 'Employee name cannot be blank' USING ERRCODE = '23514';
  END IF;

  IF v_clean_role IS NULL OR v_clean_role NOT IN ('Vendedor', 'Gerente', 'Operação') THEN
    RAISE EXCEPTION 'Employee role is invalid' USING ERRCODE = '23514';
  END IF;

  SELECT name INTO v_current_name
  FROM public.employees
  WHERE id = p_employee_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found' USING ERRCODE = 'P0002';
  END IF;

  v_old_key := translate(
    lower(regexp_replace(btrim(v_current_name), '[[:space:]]+', ' ', 'g')),
    v_accents,
    v_replacements
  );
  v_new_key := translate(
    lower(regexp_replace(btrim(v_clean_name), '[[:space:]]+', ' ', 'g')),
    v_accents,
    v_replacements
  );

  UPDATE public.employees
  SET name = v_clean_name, role = v_clean_role
  WHERE id = p_employee_id;

  UPDATE public.leads
  SET vendedor = v_clean_name
  WHERE vendedor_id = p_employee_id
    AND vendedor IS DISTINCT FROM v_clean_name;

  IF v_old_key <> v_new_key THEN
    WITH automation_audio AS (
      SELECT automation.id, old_audio.value AS audio_url
      FROM public.automacoes AS automation
      CROSS JOIN LATERAL (
        SELECT entry.value
        FROM jsonb_each(
          CASE
            WHEN jsonb_typeof(automation.audios_vendedor) = 'object' THEN automation.audios_vendedor
            ELSE '{}'::jsonb
          END
        ) AS entry(key, value)
        WHERE translate(
          lower(regexp_replace(btrim(entry.key), '[[:space:]]+', ' ', 'g')),
          v_accents,
          v_replacements
        ) = v_old_key
          AND jsonb_typeof(entry.value) = 'string'
        ORDER BY CASE WHEN entry.key = v_current_name THEN 0 ELSE 1 END, entry.key
        LIMIT 1
      ) AS old_audio
      WHERE jsonb_typeof(automation.audios_vendedor) = 'object'
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_each(
            CASE
              WHEN jsonb_typeof(automation.audios_vendedor) = 'object' THEN automation.audios_vendedor
              ELSE '{}'::jsonb
            END
          ) AS entry(key, value)
          WHERE translate(
            lower(regexp_replace(btrim(entry.key), '[[:space:]]+', ' ', 'g')),
            v_accents,
            v_replacements
          ) = v_new_key
        )
    )
    UPDATE public.automacoes AS automation
    SET audios_vendedor = COALESCE(automation.audios_vendedor, '{}'::jsonb)
      || jsonb_build_object(v_clean_name, automation_audio.audio_url)
    FROM automation_audio
    WHERE automation.id = automation_audio.id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_employee_directory_person(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_employee_directory_person(uuid, text, text) TO authenticated;
