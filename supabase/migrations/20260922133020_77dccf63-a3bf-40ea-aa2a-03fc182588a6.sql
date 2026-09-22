UPDATE public.leads SET canal = 'Internet' WHERE lower(trim(canal)) = 'internet' AND canal <> 'Internet';
UPDATE public.leads SET canal = 'Loja' WHERE lower(trim(canal)) = 'loja' AND canal <> 'Loja';
UPDATE public.leads SET canal = 'Sua Visão' WHERE lower(trim(canal)) IN ('sua visao','sua visão','suavisao') AND canal <> 'Sua Visão';
UPDATE public.leads SET canal = 'Du Benefícios' WHERE lower(trim(canal)) IN ('du beneficios','du benefícios') AND canal <> 'Du Benefícios';
UPDATE public.leads SET canal = NULL WHERE trim(coalesce(canal,'')) = '';