
CREATE OR REPLACE FUNCTION public.search_leads_fuzzy(q text)
RETURNS TABLE(id uuid, label text, score real)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id,
         (l.voornaam || ' ' || l.achternaam || ' - ' || l.adres) AS label,
         GREATEST(
           similarity(lower(q), lower(coalesce(l.voornaam,'') || ' ' || coalesce(l.achternaam,''))),
           similarity(lower(q), lower(coalesce(l.adres,'')))
         ) AS score
  FROM public.leads l
  WHERE (coalesce(l.voornaam,'') <> '' OR coalesce(l.achternaam,'') <> '' OR coalesce(l.adres,'') <> '')
    AND (
      lower(q) % lower(coalesce(l.voornaam,'') || ' ' || coalesce(l.achternaam,''))
      OR lower(q) % lower(coalesce(l.adres,''))
    )
  ORDER BY score DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.search_leads_fuzzy(text) TO authenticated, service_role;
