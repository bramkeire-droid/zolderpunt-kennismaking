ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS gespreksvragen jsonb NOT NULL DEFAULT '{"selected":[],"beantwoord":[]}'::jsonb;