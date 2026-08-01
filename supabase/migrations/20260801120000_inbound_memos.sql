-- Berichten die per WhatsApp worden doorgestuurd om later op te volgen, en
-- foto-batches waarvoor geen enkel dossier gevonden werd. Ze worden per e-mail
-- verstuurd, maar eerst hier bewaard: een mislukte verzending mag de notitie
-- niet wegwerpen, en de flush-pass kan er dan opnieuw over.

CREATE TABLE public.inbound_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'wa' CHECK (source IN ('wa','mail')),
  from_identifier text NOT NULL,
  from_display text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'memo' CHECK (kind IN ('memo','unmatched_media')),
  -- Nu ongebruikt; de haak voor de latere koppeling aan een dossier.
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  emailed_at timestamptz,
  email_attempts int NOT NULL DEFAULT 0,
  email_error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbound_memos TO authenticated;
GRANT ALL ON public.inbound_memos TO service_role;
ALTER TABLE public.inbound_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read inbound_memos" ON public.inbound_memos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth update inbound_memos" ON public.inbound_memos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete inbound_memos" ON public.inbound_memos
  FOR DELETE TO authenticated USING (true);

-- De retry-pass draait elke 30 seconden en zoekt telkens alleen de rijen die
-- nog niet vertrokken zijn, dus partieel in plaats van over de hele tabel.
CREATE INDEX idx_inbound_memos_unsent
  ON public.inbound_memos (created_at) WHERE emailed_at IS NULL;
