-- L5 (2026-11-24, baan LOKETTEN): Zarvis mag na Brams ja een notitie bij een dossier zetten.
-- Additief: een kolom die zegt waar een notitie vandaan komt. Bestaande notities blijven null (Compass zelf).
alter table public.gesprek_notities add column if not exists bron text;
comment on column public.gesprek_notities.bron is 'Waar de notitie vandaan komt: null = in Compass getypt, ''zarvis'' = door Zarvis na Brams ja.';
