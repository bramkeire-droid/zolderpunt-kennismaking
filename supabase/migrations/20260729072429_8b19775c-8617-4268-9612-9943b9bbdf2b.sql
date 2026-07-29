ALTER TABLE public.inbound_conversation_state
  ADD COLUMN pending_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN pending_media_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN pending_expires_at timestamptz;