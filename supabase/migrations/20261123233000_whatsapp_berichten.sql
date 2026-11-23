-- WhatsApp-gesprekken met klanten, binnengehaald door het Zarvis-programma dat
-- als gekoppeld toestel is aangemeld op het zakelijke nummer.
--
-- Bewaard wordt ALLEEN wat bij een bekend dossier hoort: de functie
-- `whatsapp-koppeling` gooit berichten van nummers die in geen enkel dossier
-- voorkomen weg. Privégesprekken op hetzelfde nummer komen hier dus niet in.
-- Groepsgesprekken worden nooit doorgestuurd.
--
-- Additief: geen bestaande tabel, policy of functie wordt aangeraakt.

create table if not exists public.whatsapp_berichten (
  id uuid primary key default gen_random_uuid(),
  -- Wie het toestel koppelde. Samen met wa_id uniek, zodat hetzelfde bericht
  -- nooit twee keer bewaard wordt, ook niet na opnieuw koppelen.
  user_id uuid not null default auth.uid(),
  wa_id text not null,
  lead_id uuid not null references public.leads(id) on delete cascade,
  -- Het nummer van de gesprekspartner, alleen cijfers, met landcode.
  telefoon text not null,
  van_mij boolean not null,
  verstuurd_op timestamptz not null,
  -- tekst | afbeelding | video | audio | document | sticker | locatie | contact | ander
  soort text not null default 'tekst',
  tekst text,
  created_at timestamptz not null default now(),
  unique (user_id, wa_id)
);
create index if not exists whatsapp_berichten_lead_idx
  on public.whatsapp_berichten (lead_id, verstuurd_op);

alter table public.whatsapp_berichten enable row level security;

-- Lezen: zoals de rest van een dossier, iedereen met een rol.
drop policy if exists "rol leest whatsapp_berichten" on public.whatsapp_berichten;
create policy "rol leest whatsapp_berichten" on public.whatsapp_berichten
  for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'user'::app_role));

-- Toevoegen: alleen als jezelf, met een rol. Geen update en geen delete: wat
-- binnenkwam blijft staan zoals het binnenkwam.
drop policy if exists "eigen whatsapp_berichten toevoegen" on public.whatsapp_berichten;
create policy "eigen whatsapp_berichten toevoegen" on public.whatsapp_berichten
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'user'::app_role))
  );

revoke all on public.whatsapp_berichten from anon;
