CREATE TABLE IF NOT EXISTS public.inbound_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'wa' CHECK (source IN ('wa','mail')),
  from_identifier text NOT NULL,
  from_display text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'memo' CHECK (kind IN ('memo','unmatched_media')),
  media_ids uuid[] NOT NULL DEFAULT '{}',
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  emailed_at timestamptz,
  email_attempts int NOT NULL DEFAULT 0,
  email_error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inbound_memos
  ADD COLUMN IF NOT EXISTS media_ids uuid[] NOT NULL DEFAULT '{}';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbound_memos TO authenticated;
GRANT ALL ON public.inbound_memos TO service_role;
ALTER TABLE public.inbound_memos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read inbound_memos" ON public.inbound_memos;
CREATE POLICY "auth read inbound_memos" ON public.inbound_memos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth update inbound_memos" ON public.inbound_memos;
CREATE POLICY "auth update inbound_memos" ON public.inbound_memos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth delete inbound_memos" ON public.inbound_memos;
CREATE POLICY "auth delete inbound_memos" ON public.inbound_memos
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_inbound_memos_unsent
  ON public.inbound_memos (created_at) WHERE emailed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inbound_memos_media_ids
  ON public.inbound_memos USING gin (media_ids);

CREATE OR REPLACE FUNCTION public.touch_inbound_window(
  p_source text,
  p_from_identifier text,
  p_new_media_id uuid DEFAULT NULL,
  p_new_note text DEFAULT NULL,
  p_window_seconds int DEFAULT 3600
) RETURNS TABLE(media_ids uuid[], notes text, had_photos_before boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_media uuid[];
  v_notes text;
  v_expires timestamptz;
  v_had_photos_before boolean;
BEGIN
  INSERT INTO inbound_conversation_state (source, from_identifier)
  VALUES (p_source, p_from_identifier)
  ON CONFLICT (source, from_identifier) DO NOTHING;

  SELECT pending_media_ids, pending_notes, pending_expires_at
    INTO v_media, v_notes, v_expires
    FROM inbound_conversation_state
    WHERE source = p_source AND from_identifier = p_from_identifier
    FOR UPDATE;

  IF v_expires IS NULL OR v_expires <= now() THEN
    v_media := '{}'::uuid[];
    v_notes := '';
  END IF;

  v_had_photos_before := coalesce(array_length(v_media, 1), 0) > 0;

  IF p_new_media_id IS NOT NULL AND NOT (p_new_media_id = ANY(v_media)) THEN
    v_media := v_media || ARRAY[p_new_media_id];
  END IF;
  IF p_new_note IS NOT NULL AND p_new_note <> '' THEN
    v_notes := trim(v_notes || ' ' || p_new_note);
  END IF;

  UPDATE inbound_conversation_state SET
    pending_media_ids = v_media,
    pending_notes = v_notes,
    pending_expires_at = now() + make_interval(secs => p_window_seconds),
    last_activity_at = now(),
    flush_state = 'collecting',
    updated_at = now()
  WHERE source = p_source AND from_identifier = p_from_identifier;

  media_ids := v_media;
  notes := v_notes;
  had_photos_before := v_had_photos_before;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_inbound_window(text, text, uuid, text, int) TO service_role;