
CREATE OR REPLACE FUNCTION public.match_disparo_by_phone(phone_suffix text)
 RETURNS TABLE(id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT ad.id
  FROM automacao_disparos ad
  WHERE ad.status = 'enviado'
    AND ad.created_at > now() - interval '30 days'
    AND regexp_replace(ad.telefone, '\D', '', 'g') LIKE '%' || phone_suffix || '%';
$$;
