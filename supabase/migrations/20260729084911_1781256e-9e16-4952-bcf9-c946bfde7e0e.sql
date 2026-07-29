ALTER TABLE public.inbound_conversation_state
  ADD COLUMN pending_notes text NOT NULL DEFAULT '';