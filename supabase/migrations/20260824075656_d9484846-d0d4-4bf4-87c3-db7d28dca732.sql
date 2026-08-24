-- 1. search_path vastzetten
CREATE OR REPLACE FUNCTION public.update_pre_intake_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- 2. SECURITY DEFINER functies niet meer publiek uitvoerbaar
REVOKE EXECUTE ON FUNCTION public.claim_idle_inbound_groups(integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_inbound_window(text, text, uuid, text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.search_leads_fuzzy(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.customers_sync_naar_dossiers() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.leads_koppel_klant() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.leads_sync_naar_klant() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_pre_intake_updated_at() FROM anon, authenticated;

-- 3. portal_events: geen anonieme inserts meer (de portal logt via de edge function met service-role)
DROP POLICY IF EXISTS "Anyone can insert portal events" ON public.portal_events;
CREATE POLICY "Authenticated users can insert portal events"
ON public.portal_events FOR INSERT TO authenticated WITH CHECK (true);
REVOKE INSERT ON public.portal_events FROM anon;

-- 4. lead-fotos: paden moeten bij een bestaand dossier (of de inbox-map) horen
CREATE OR REPLACE FUNCTION public.lead_fotos_pad_toegestaan(_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_prefix text; v_id uuid;
BEGIN
  v_prefix := split_part(coalesce(_name, ''), '/', 1);
  IF v_prefix = '' THEN RETURN false; END IF;
  IF v_prefix = '_inbox' THEN RETURN true; END IF;
  BEGIN
    v_id := v_prefix::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  RETURN EXISTS (SELECT 1 FROM public.leads WHERE id = v_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.lead_fotos_pad_toegestaan(text) FROM anon;

DROP POLICY IF EXISTS "ingelogd leest lead-fotos" ON storage.objects;
DROP POLICY IF EXISTS "ingelogd uploadt lead-fotos" ON storage.objects;
DROP POLICY IF EXISTS "ingelogd wijzigt lead-fotos" ON storage.objects;
DROP POLICY IF EXISTS "ingelogd verwijdert lead-fotos" ON storage.objects;

CREATE POLICY "ingelogd leest lead-fotos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lead-fotos' AND public.lead_fotos_pad_toegestaan(name));
CREATE POLICY "ingelogd uploadt lead-fotos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lead-fotos' AND public.lead_fotos_pad_toegestaan(name));
CREATE POLICY "ingelogd wijzigt lead-fotos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lead-fotos' AND public.lead_fotos_pad_toegestaan(name))
WITH CHECK (bucket_id = 'lead-fotos' AND public.lead_fotos_pad_toegestaan(name));
CREATE POLICY "ingelogd verwijdert lead-fotos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lead-fotos' AND public.lead_fotos_pad_toegestaan(name));