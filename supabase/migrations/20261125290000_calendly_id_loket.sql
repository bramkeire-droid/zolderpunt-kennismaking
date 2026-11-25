-- Calendly-id per afspraak (baan LOKETTEN, 2026-11-25). Zarvis ontdubbelt Compass tegen Brams Google-agenda
-- op het Google-id van de afspraak (calendar_event.external_id in Calendly) in plaats van op het uur.
-- Alleen bijkomende, lege kolommen: wat er is, blijft werken zoals nu.
alter table public.pre_intake
  add column if not exists videocall_calendly_uri text,
  add column if not exists videocall_google_event_id text,
  add column if not exists plaatsbezoek_calendly_uri text,
  add column if not exists plaatsbezoek_google_event_id text;
