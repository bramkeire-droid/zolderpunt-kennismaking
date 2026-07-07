ALTER TABLE public.pre_intake
  ADD COLUMN IF NOT EXISTS videocall_planned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plaatsbezoek_planned boolean NOT NULL DEFAULT false;