ALTER TABLE public.inbound_conversation_state
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS flush_state text NOT NULL DEFAULT 'idle';

CREATE TABLE IF NOT EXISTS public.internal_config (
  key text PRIMARY KEY,
  value text NOT NULL
);
GRANT ALL ON public.internal_config TO service_role;
ALTER TABLE public.internal_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_config(key, value)
VALUES ('flush_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;