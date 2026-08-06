-- "tbc" on a WhatsApp message now defers any pending photos to the memo
-- mailbox instead of dossier-matching (see ingestMedia.ts: deferMediaToMemo).
-- 'rejected' can't be reused for this: the Inbox dialog's reject action
-- deletes the storage files, and a tbc'd photo must stay intact for later
-- reference in the mail. 'memo' is a new, non-destructive status that the
-- flush pass's `WHERE status = 'pending'` query naturally excludes.
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT con.conname INTO con_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
  WHERE ns.nspname = 'public'
    AND rel.relname = 'inbound_media_pending'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status%pending%assigned%rejected%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.inbound_media_pending DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.inbound_media_pending
  ADD CONSTRAINT inbound_media_pending_status_check
  CHECK (status IN ('pending','assigned','rejected','memo'));
