CREATE OR REPLACE FUNCTION public.match_disparo_by_phone(phone_suffix text)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ad.id
  FROM automacao_disparos ad
  WHERE ad.status = 'enviado'
    AND ad.resposta_cliente = false
    AND regexp_replace(ad.telefone, '\D', '', 'g') LIKE '%' || phone_suffix || '%';
$$;

REVOKE ALL ON FUNCTION public.match_disparo_by_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_disparo_by_phone(text) TO service_role;
