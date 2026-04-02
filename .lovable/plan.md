

# Deploy drie portal edge functions

De drie edge functions (`get-portal-data`, `verify-portal-email`, `log-portal-event`) bestaan al in de repo. Ze worden aangeroepen zonder JWT (publieke portal-endpoints), dus ze hebben `verify_jwt = false` nodig in `supabase/config.toml`.

## Stappen

1. **Config bijwerken** — Voeg drie `[functions.*]` blokken toe aan `supabase/config.toml` met `verify_jwt = false`
2. **Deploy** — Gebruik de deploy tool om alle drie tegelijk te deployen

## Technisch detail

Toe te voegen aan `supabase/config.toml`:
```toml
[functions.get-portal-data]
verify_jwt = false

[functions.verify-portal-email]
verify_jwt = false

[functions.log-portal-event]
verify_jwt = false
```

