ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS btw_percentage integer DEFAULT 6,
  ADD COLUMN IF NOT EXISTS prijs_min_incl_btw numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prijs_max_incl_btw numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prijs_mw_min_incl_btw numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prijs_mw_max_incl_btw numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_excl numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calculator_state jsonb;