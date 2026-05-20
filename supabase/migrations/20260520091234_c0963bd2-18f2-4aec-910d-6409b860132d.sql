UPDATE public.leads
SET status = 'intake'
WHERE status IN ('nieuw', 'telefoongesprek', 'intake_gepland')
  AND (
    rapport_gegenereerd_op IS NOT NULL
    OR COALESCE(rapport_situatie_ai, '') <> ''
    OR COALESCE(rapport_besproken_ai, '') <> ''
    OR COALESCE(rapport_verwachtingen_ai, '') <> ''
    OR COALESCE(rapport_aandachtspunten_ai, '') <> ''
    OR COALESCE(rapport_tekst, '') <> ''
    OR COALESCE(waarde_tekst_ai, '') <> ''
    OR jsonb_array_length(COALESCE(fotos, '[]'::jsonb)) > 0
    OR calculator_state IS NOT NULL
  );