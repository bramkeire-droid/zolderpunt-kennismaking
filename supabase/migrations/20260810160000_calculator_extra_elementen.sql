-- Prijsvork excl. btw apart bewaren.
--
-- Tot nu leidden alle weergaves de vork zelf af als budget_excl × 0.85 / 1.15.
-- Dat kan niet meer zodra elementen een eigen minimum en maximum hebben
-- (badkamer-onderdelen, maatwerk, vrij toegevoegde elementen): die marge is
-- bekend en mag niet nog eens met ±15% opgerekt worden.
--
-- NULL betekent "dossier van voor deze uitbreiding". Lezers vallen dan terug
-- op de oude afleiding, zodat bestaande dossiers exact hetzelfde tonen.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS budget_min_excl numeric,
  ADD COLUMN IF NOT EXISTS budget_max_excl numeric;

COMMENT ON COLUMN leads.budget_min_excl IS
  'Onderkant van de prijsvork excl. btw. Tariefposten krijgen -15%, elementen met een eigen minimum (badkamer, maatwerk, extra) tellen exact mee. NULL = dossier van voor die uitbreiding; lezers vallen dan terug op budget_excl * 0.85.';
COMMENT ON COLUMN leads.budget_max_excl IS
  'Bovenkant van de prijsvork excl. btw. Zie budget_min_excl. NULL = terugval op budget_excl * 1.15.';
