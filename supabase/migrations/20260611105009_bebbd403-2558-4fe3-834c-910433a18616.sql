ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS offerte_bedrag_excl numeric,
  ADD COLUMN IF NOT EXISTS offerte_datum date,
  ADD COLUMN IF NOT EXISTS offerte_bijlage_settings jsonb;