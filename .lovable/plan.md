

# Deploy generate-coaching-tips edge function

## Stappen

1. **config.toml updaten** — De function `generate-coaching-tips` ontbreekt in `supabase/config.toml`. Moet toegevoegd worden met `verify_jwt = false` (zoals de andere functions).

2. **Secrets check** — `LOVABLE_API_KEY` is al geconfigureerd in de secrets. Geen actie nodig.

3. **Deploy** — Na de config-update wordt de function automatisch gedeployed door Lovable.

4. **Test** — De function testen met `{ "leads": [] }` via de test tool om te verifiëren dat het verwachte antwoord terugkomt.

## Wijzigingen

### `supabase/config.toml`
Toevoegen:
```toml
[functions.generate-coaching-tips]
verify_jwt = false
```

Geen andere bestanden worden gewijzigd.

