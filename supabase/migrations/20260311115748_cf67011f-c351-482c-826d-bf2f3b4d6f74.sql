ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS rapport_situatie_ai text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rapport_verwachtingen_ai text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rapport_besproken_ai text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rapport_aandachtspunten_ai text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS waarde_tekst_ai text NOT NULL DEFAULT '';