-- Historiek van gegenereerde rapporten per dossier, mét de invoer die ze maakte.
--
-- Vandaag wordt de PDF in de browser gebouwd (Slide10) en meteen gedownload;
-- daarna is hij weg. Op leads staat alleen rapport_gegenereerd_op: één
-- timestamp, dus een tweede rapport wist het spoor van het eerste. En het
-- transcript staat nergens — het is geen kolom op leads en useLeadSave schrijft
-- het niet weg, dus de tekst waarmee een rapport gemaakt is verdween met het
-- browsertabblad.
--
-- Eén rij per gegenereerd rapport, zelfde model als public.calculaties.
-- Het transcript staat op diezelfde rij in plaats van in een eigen tabel: een
-- transcript hoort bij hét rapport dat ermee gemaakt is, en kan dus niet
-- losraken van zijn rapport.

create table if not exists public.rapporten (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  -- Waar het rapport gemaakt is; zelfde woordenlijst als calculaties.bron.
  bron text not null default 'intake',
  bestandsnaam text not null,
  -- Pad in de bucket dossier-documenten: <leadId>/rapport/<ts>-<naam>.pdf
  storage_path text not null unique,
  bytes bigint,
  -- De invoer waarmee dit rapport gemaakt is, als leesbaar tekstbestand:
  -- <leadId>/transcript/<ts>-<naam>.txt. Leeg als er bij het genereren geen
  -- transcript of notities waren.
  transcript_bestandsnaam text,
  transcript_path text,
  transcript_bytes bigint,
  gegenereerd_op timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

comment on table public.rapporten is
  'Historiek van gegenereerde rapporten per dossier. Eén rij per PDF; het bestand zelf en het bijhorende transcript staan in de bucket dossier-documenten.';

create index if not exists rapporten_lead_idx on public.rapporten (lead_id, gegenereerd_op desc);

alter table public.rapporten enable row level security;

drop policy if exists "ingelogd leest rapporten" on public.rapporten;
create policy "ingelogd leest rapporten" on public.rapporten
  for select to authenticated using (true);

drop policy if exists "ingelogd schrijft rapporten" on public.rapporten;
create policy "ingelogd schrijft rapporten" on public.rapporten
  for all to authenticated using (true) with check (true);

-- Eigen privébucket. Niet in lead-fotos: dat is een fotobucket, en een
-- opruiming daarvan zou rapporten meesleuren. Meteen privé — lead-fotos stond
-- maanden publiek voor dat in 20260824070345 dichtging, die ronde slaan we over.
insert into storage.buckets (id, name, public, file_size_limit)
values ('dossier-documenten', 'dossier-documenten', false, 52428800)
on conflict (id) do nothing;

-- Zelfde afscherming als lead_fotos_pad_toegestaan: het eerste padsegment moet
-- een bestaand dossier zijn. Geen _inbox-uitzondering: documenten komen nooit
-- via de WhatsApp- of e-mailpijplijn binnen.
create or replace function public.dossier_document_pad_toegestaan(_name text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare v_prefix text; v_id uuid;
begin
  v_prefix := split_part(coalesce(_name, ''), '/', 1);
  if v_prefix = '' then return false; end if;
  begin
    v_id := v_prefix::uuid;
  exception when others then
    return false;
  end;
  return exists (select 1 from public.leads where id = v_id);
end;
$function$;

revoke execute on function public.dossier_document_pad_toegestaan(text) from public, anon;
grant execute on function public.dossier_document_pad_toegestaan(text) to authenticated, service_role;

drop policy if exists "ingelogd leest dossier-documenten" on storage.objects;
drop policy if exists "ingelogd uploadt dossier-documenten" on storage.objects;
drop policy if exists "ingelogd verwijdert dossier-documenten" on storage.objects;

create policy "ingelogd leest dossier-documenten" on storage.objects for select to authenticated
using (bucket_id = 'dossier-documenten' and public.dossier_document_pad_toegestaan(name));

create policy "ingelogd uploadt dossier-documenten" on storage.objects for insert to authenticated
with check (bucket_id = 'dossier-documenten' and public.dossier_document_pad_toegestaan(name));

create policy "ingelogd verwijdert dossier-documenten" on storage.objects for delete to authenticated
using (bucket_id = 'dossier-documenten' and public.dossier_document_pad_toegestaan(name));

-- Geen UPDATE-policy: een bewaard rapport hoort niet overschreven te worden.
-- Een nieuw rapport is een nieuwe rij met een nieuw pad.
