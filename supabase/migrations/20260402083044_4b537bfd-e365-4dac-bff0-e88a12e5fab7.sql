ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS portal_status text DEFAULT 'draft'
    CHECK (portal_status IN ('draft', 'review', 'active', 'closed')),
  ADD COLUMN IF NOT EXISTS portal_token uuid DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_sent_via text DEFAULT NULL
    CHECK (portal_sent_via IS NULL OR portal_sent_via IN ('email', 'whatsapp', 'both'));

CREATE INDEX IF NOT EXISTS idx_leads_portal_token ON leads (portal_token);

CREATE TABLE IF NOT EXISTS portal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_events_lead_id ON portal_events (lead_id);

ALTER TABLE portal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read portal events" ON portal_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can insert portal events" ON portal_events FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  session_token uuid DEFAULT gen_random_uuid() UNIQUE,
  email_verified text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_sessions_token ON portal_sessions (session_token);

ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage portal sessions" ON portal_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS portal_email_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_token uuid NOT NULL,
  ip_address text,
  attempted_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_email_attempts_token ON portal_email_attempts (portal_token, attempted_at DESC);

ALTER TABLE portal_email_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage email attempts" ON portal_email_attempts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);