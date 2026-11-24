-- De stijl waarin Zarvis praat (IDEE-25 en 26): gewoon, familie of savage.
-- Additief: één kolom op de eigen tabel van Zarvis; de bestaande policies
-- (eigen rij, schrijven alleen voor beheerders) gelden ook hiervoor.
alter table public.zarvis_instellingen
  add column if not exists stijl text not null default 'gewoon'
  check (stijl in ('gewoon', 'familie', 'savage'));
