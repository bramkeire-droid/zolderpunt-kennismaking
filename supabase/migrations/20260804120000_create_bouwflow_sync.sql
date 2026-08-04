-- Bouwflow↔Compass sync: fasen-cache tabel + backfill-kolommen op leads
-- voor de nieuwe pull-sync (sync-bouwflow-phases / pull-bouwflow-projects
-- edge functions). Raakt de bestaande push-to-bouwflow kolommen
-- (bouwflow_project_id/_number/_pushed_at/_phase) niet aan.

create table if not exists bouwflow_phases (
  id integer primary key,
  title_nl text,
  title_en text,
  title_fr text,
  sort_order integer,
  project_pipeline_id integer,
  final boolean,
  approved boolean,
  rejected boolean,
  synced_at timestamptz not null default now()
);

-- RLS: zelfde permissieve patroon als de leads-tabel
alter table bouwflow_phases enable row level security;

create policy "Allow all reads on bouwflow_phases"
  on bouwflow_phases for select
  using (true);

create policy "Allow all inserts on bouwflow_phases"
  on bouwflow_phases for insert
  with check (true);

create policy "Allow all updates on bouwflow_phases"
  on bouwflow_phases for update
  using (true);

create policy "Allow all deletes on bouwflow_phases"
  on bouwflow_phases for delete
  using (true);

-- Nieuwe, losstaande kolommen op leads voor de pull-sync.
-- bouwflow_project_pk_id = echte Bouwflow PROJECT row id (bv. 165),
-- te onderscheiden van het bestaande bouwflow_project_id (tekst) dat
-- in werkelijkheid een Bouwflow CUSTOMER id bevat (zie push-to-bouwflow).
alter table leads add column if not exists bouwflow_project_pk_id integer;
alter table leads add column if not exists bouwflow_pull_synced_at timestamptz;
