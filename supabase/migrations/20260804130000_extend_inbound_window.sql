-- touch_inbound_window() reset its 10-minute pending window to empty whenever
-- a new message arrived after expiry — including a customer's own follow-up
-- name/address reply. A batch of photos flushed once with "we don't know
-- which customer yet" (no confident match) leaves the window's expiry
-- untouched; if the reply took longer than 10 minutes, the wipe silently
-- dropped the link between that reply and the earlier photos. The photos
-- stayed safe in inbound_media_pending, just orphaned from the match.
-- Extending to 1 hour gives someone on-site realistic time to reply.
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
