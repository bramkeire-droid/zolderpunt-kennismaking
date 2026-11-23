-- Zarvis gaat van alleen lezen naar ook doen:
--   zarvis_taken        wat Zarvis later of herhaald moet doen (herinnering,
--                       controle, WhatsApp op een tijdstip)
--   zarvis_meldingen    wat Zarvis de gebruiker wil laten weten
--   whatsapp_uit        berichten die het programma op de pc verstuurt
--   zarvis_vaardigheden werkwijzen die Zarvis zichzelf aanleerde
--   zarvis_tekorten     wat gevraagd werd en nog niet kon (voedt de bouw)
--   zarvis_tik          eenmalige bewijzen waarmee de klok de uitvoerder wekt
--
-- Alles per gebruiker, alleen de eigen rijen. Additief: geen bestaande tabel,
-- policy of functie wordt aangeraakt.

create table if not exists public.zarvis_taken (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  soort text not null check (soort in ('herinnering', 'controle', 'whatsapp')),
  -- Herinnering: waaraan. Controle: wat nakijken. WhatsApp: de tekst.
  opdracht text not null,
  -- WhatsApp: naar wie ({"mij": true} of {"telefoon", "naam", "lead_id"}).
  doel jsonb,
  verwittig text not null default 'melding' check (verwittig in ('melding', 'whatsapp', 'beide')),
  volgende_op timestamptz not null,
  elke_minuten integer check (elke_minuten is null or elke_minuten >= 5),
  tot timestamptz,
  max_beurten integer not null default 24 check (max_beurten between 1 and 200),
  beurten integer not null default 0,
  status text not null default 'actief' check (status in ('actief', 'klaar', 'gestopt', 'mislukt')),
  laatste_resultaat text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists zarvis_taken_aan_de_beurt on public.zarvis_taken (volgende_op) where status = 'actief';

create table if not exists public.zarvis_meldingen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  tekst text not null,
  taak_id uuid references public.zarvis_taken(id) on delete set null,
  created_at timestamptz not null default now(),
  getoond_op timestamptz
);
create index if not exists zarvis_meldingen_nieuw on public.zarvis_meldingen (user_id, created_at) where getoond_op is null;

create table if not exists public.whatsapp_uit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  -- Leeg betekent: naar het eigen nummer van de gebruiker.
  telefoon text,
  naam text,
  tekst text not null check (length(tekst) between 1 and 4000),
  lead_id uuid references public.leads(id) on delete set null,
  taak_id uuid references public.zarvis_taken(id) on delete set null,
  status text not null default 'wacht' check (status in ('wacht', 'verstuurd', 'mislukt')),
  fout text,
  created_at timestamptz not null default now(),
  verstuurd_op timestamptz
);
create index if not exists whatsapp_uit_wacht on public.whatsapp_uit (user_id, created_at) where status = 'wacht';

create table if not exists public.zarvis_vaardigheden (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  naam text not null,
  wanneer text not null,
  stappen text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.zarvis_tekorten (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  vraag text not null,
  reden text,
  status text not null default 'open' check (status in ('open', 'gebouwd', 'afgewezen')),
  created_at timestamptz not null default now()
);

create table if not exists public.zarvis_tik (
  nonce uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['zarvis_taken', 'zarvis_meldingen', 'whatsapp_uit', 'zarvis_vaardigheden', 'zarvis_tekorten'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "eigen rijen lezen" on public.%I', t);
    execute format('create policy "eigen rijen lezen" on public.%I for select to authenticated using (user_id = auth.uid())', t);
    execute format('drop policy if exists "eigen rijen toevoegen" on public.%I', t);
    execute format($p$create policy "eigen rijen toevoegen" on public.%I for insert to authenticated with check (user_id = auth.uid() and (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'user'::app_role)))$p$, t);
    execute format('drop policy if exists "eigen rijen bijwerken" on public.%I', t);
    execute format($p$create policy "eigen rijen bijwerken" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'user'::app_role)))$p$, t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- De bewijzen van de klok: alleen de server zelf komt eraan.
alter table public.zarvis_tik enable row level security;
revoke all on public.zarvis_tik from anon, authenticated;

-- De klok: elke minuut, en alleen als er een taak aan de beurt is, wordt de
-- uitvoerder gewekt met een vers eenmalig bewijs. Er staat nergens een sleutel.
select cron.unschedule('zarvis-taken') where exists (select 1 from cron.job where jobname = 'zarvis-taken');
select cron.schedule('zarvis-taken', '* * * * *', $cron$
  with n as (
    insert into public.zarvis_tik (nonce)
    select gen_random_uuid()
    where exists (select 1 from public.zarvis_taken where status = 'actief' and volgende_op <= now())
    returning nonce
  )
  select net.http_post(
    url := (select value from public.internal_config where key = 'supabase_url') || '/functions/v1/zarvis-taken',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('tik', n.nonce)
  ) from n;
$cron$);
