
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.inbound_media_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('wa','mail')),
  from_identifier text NOT NULL,
  from_display text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  storage_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  match_reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','rejected')),
  assigned_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  assigned_by uuid,
  assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbound_media_pending TO authenticated;
GRANT ALL ON public.inbound_media_pending TO service_role;
ALTER TABLE public.inbound_media_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read inbound_media_pending" ON public.inbound_media_pending
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth update inbound_media_pending" ON public.inbound_media_pending
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete inbound_media_pending" ON public.inbound_media_pending
  FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_inbound_media_pending_status ON public.inbound_media_pending(status, created_at DESC);

CREATE TABLE public.inbound_conversation_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('wa','mail')),
  from_identifier text NOT NULL,
  last_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, from_identifier)
);

GRANT SELECT ON public.inbound_conversation_state TO authenticated;
GRANT ALL ON public.inbound_conversation_state TO service_role;
ALTER TABLE public.inbound_conversation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read inbound_conversation_state" ON public.inbound_conversation_state
  FOR SELECT TO authenticated USING (true);
