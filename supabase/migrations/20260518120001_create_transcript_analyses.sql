-- Transcript analyses: AI-analyse + coaching per gesprek
create table if not exists transcript_analyses (
  id uuid primary key default gen_random_uuid(),
  pre_intake_id uuid references pre_intake(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,

  ai_analysis jsonb not null,
  coaching_feedback text,
  coaching_scores jsonb,
  match_scores jsonb,

  -- welke AI-bevindingen zijn geaccepteerd
  accepted_fields jsonb default '[]'::jsonb,

  analyzed_at timestamptz default now(),
  analyzed_by uuid
);

-- Index for fast lookups
create index idx_transcript_analyses_lead_id on transcript_analyses(lead_id);
create index idx_transcript_analyses_pre_intake_id on transcript_analyses(pre_intake_id);

-- RLS: same pattern
alter table transcript_analyses enable row level security;

create policy "Allow all reads on transcript_analyses"
  on transcript_analyses for select
  using (true);

create policy "Allow all inserts on transcript_analyses"
  on transcript_analyses for insert
  with check (true);

create policy "Allow all updates on transcript_analyses"
  on transcript_analyses for update
  using (true);

create policy "Allow admin deletes on transcript_analyses"
  on transcript_analyses for delete
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  );
