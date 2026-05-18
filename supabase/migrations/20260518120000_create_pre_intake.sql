-- Pre-intake: psychologisch dossier per telefoongesprek
create table if not exists pre_intake (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,

  -- gesprek metadata
  call_started_at timestamptz,
  call_ended_at timestamptz,
  call_duration_seconds integer,

  -- de 5 psychologische velden
  trigger_text text default '',
  emotional_keywords jsonb default '[]'::jsonb,
  fomu_concerns jsonb default '[]'::jsonb,
  buying_committee text default '',
  general_impression text default '',
  impression_tags text[] default '{}',

  -- 8 klantvragen
  questions_raised jsonb default '{}'::jsonb,

  -- harde kwalificatie
  qual_in_region boolean,
  qual_real_attic boolean,
  qual_is_owner boolean,
  qual_is_decision_maker boolean,
  region_gemeente text default '',

  -- deliverables
  photos_promised boolean default false,
  measurement_promised boolean default false,
  deliverables_due_date date,

  -- inplan-scenario
  scenario_chosen text check (scenario_chosen in ('A','B','C','D')),
  videocall_scheduled_at timestamptz,

  -- extra notities
  quick_notes text default '',

  -- meta
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  locked_at timestamptz
);

-- Auto-update updated_at
create or replace function update_pre_intake_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger pre_intake_updated_at
  before update on pre_intake
  for each row execute function update_pre_intake_updated_at();

-- Index for fast lookups by lead
create index idx_pre_intake_lead_id on pre_intake(lead_id);

-- RLS: follow same permissive pattern as leads
alter table pre_intake enable row level security;

create policy "Allow all reads on pre_intake"
  on pre_intake for select
  using (true);

create policy "Allow all inserts on pre_intake"
  on pre_intake for insert
  with check (true);

create policy "Allow all updates on pre_intake"
  on pre_intake for update
  using (true);

create policy "Allow admin deletes on pre_intake"
  on pre_intake for delete
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  );
