-- B-028 (2026-11-24, baan LOKETTEN): ook de extra telefoonnummers van een klant gaan mee naar Mail-CRM.
-- Additief: een nieuwe sleutel extra_telefoons in het pakket; sync-projects versie 6 zet ze op de klantfiche.
CREATE OR REPLACE FUNCTION public.mailcrm_dossiers()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'extern_dossier_id', l.bouwflow_project_number,
    'naam', btrim(coalesce(l.voornaam, '') || ' ' || coalesce(l.achternaam, '')),
    'status', m.phase_title,
    'klant_id', l.customer_id,
    'klant_naam', btrim(coalesce(c.voornaam, l.voornaam, '') || ' ' || coalesce(c.achternaam, l.achternaam, '')),
    'email', nullif(btrim(coalesce(c.email, l.email, '')), ''),
    'telefoon', nullif(btrim(coalesce(c.telefoon, l.telefoon, '')), ''),
    'extra_emails', coalesce((select jsonb_agg(lower(btrim(k.waarde)) order by k.created_at)
                              from public.klant_contactgegevens k
                              where k.customer_id = l.customer_id and k.soort = 'email'), '[]'::jsonb),
    'extra_telefoons', coalesce((select jsonb_agg(btrim(k.waarde) order by k.created_at)
                              from public.klant_contactgegevens k
                              where k.customer_id = l.customer_id and k.soort = 'telefoon'), '[]'::jsonb)
  ) order by l.bouwflow_project_number), '[]'::jsonb)
  from public.leads l
  left join public.customers c on c.id = l.customer_id
  left join public.bouwflow_phase_category_map m on m.phase_id::text = l.bouwflow_phase
  where l.bouwflow_project_number is not null;
$function$;
