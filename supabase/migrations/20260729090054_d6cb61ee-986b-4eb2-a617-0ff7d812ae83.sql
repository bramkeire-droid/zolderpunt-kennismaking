CREATE TABLE public.inbound_webhook_dedup (
  message_sid text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.inbound_webhook_dedup TO service_role;
ALTER TABLE public.inbound_webhook_dedup ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_inbound_window(
  p_source text,
  p_from_identifier text,
  p_new_media_id uuid DEFAULT NULL,
  p_new_note text DEFAULT NULL,
  p_window_seconds int DEFAULT 600
) RETURNS TABLE(media_ids uuid[], notes text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_media uuid[];
  v_prev_notes text;
BEGIN
  INSERT INTO inbound_conversation_state (source, from_identifier, pending_media_ids, pending_notes, pending_expires_at, updated_at)
  VALUES (
    p_source, p_from_identifier,
    CASE WHEN p_new_media_id IS NOT NULL THEN ARRAY[p_new_media_id] ELSE '{}'::uuid[] END,
    COALESCE(p_new_note, ''),
    now() + make_interval(secs => p_window_seconds),
    now()
  )
  ON CONFLICT (source, from_identifier) DO UPDATE SET
    pending_media_ids = (
      CASE WHEN inbound_conversation_state.pending_expires_at > now()
        THEN inbound_conversation_state.pending_media_ids ELSE '{}'::uuid[] END
    ) || (
      CASE WHEN p_new_media_id IS NOT NULL AND NOT (p_new_media_id = ANY(
        CASE WHEN inbound_conversation_state.pending_expires_at > now()
          THEN inbound_conversation_state.pending_media_ids ELSE '{}'::uuid[] END
      )) THEN ARRAY[p_new_media_id] ELSE '{}'::uuid[] END
    ),
    pending_notes = trim(
      (CASE WHEN inbound_conversation_state.pending_expires_at > now()
        THEN inbound_conversation_state.pending_notes ELSE '' END)
      || CASE WHEN p_new_note IS NOT NULL THEN ' ' || p_new_note ELSE '' END
    ),
    pending_expires_at = now() + make_interval(secs => p_window_seconds),
    updated_at = now()
  RETURNING inbound_conversation_state.pending_media_ids, inbound_conversation_state.pending_notes
  INTO v_prev_media, v_prev_notes;

  media_ids := v_prev_media;
  notes := v_prev_notes;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_inbound_window(text, text, uuid, text, int) TO service_role;