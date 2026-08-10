import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Mail, Paperclip, Inbox } from 'lucide-react';
import { INBOUND_EMAIL, INBOUND_WHATSAPP } from './InboundHint';

// Wat de klant zelf heeft doorgestuurd, per dossier op één tijdlijn.
// De inbound-verwerking (WhatsApp en e-mail) bestond al en zet berichten met
// bijlagen in `inbound_media_pending`; wat ontbrak was een plek waar je per
// dossier ziet wát er binnenkwam. Foto's blijven bij de dossierfoto's staan —
// dit overzicht toont de begeleidende tekst en wanneer het kwam.

interface Item {
  id: string;
  source: string;
  from_display: string | null;
  from_identifier: string | null;
  subject: string | null;
  body: string | null;
  storage_paths: unknown;
  created_at: string;
}

const aantalBijlagen = (paths: unknown) => (Array.isArray(paths) ? paths.length : 0);

export default function AangeleverdDoorKlant({
  leadId, compact = false,
}: { leadId: string | undefined; compact?: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    if (!leadId) { setLaden(false); return; }
    let actief = true;
    supabase
      .from('inbound_media_pending')
      .select('id, source, from_display, from_identifier, subject, body, storage_paths, created_at')
      .eq('assigned_lead_id', leadId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!actief) return;
        setItems((data as Item[]) ?? []);
        setLaden(false);
      });
    return () => { actief = false; };
  }, [leadId]);

  if (!leadId) return null;

  return (
    <div className={compact ? '' : 'bg-card border border-border p-4'}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-headline font-bold text-primary tracking-wider uppercase">
            Aangeleverd door de klant
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Doorsturen naar {INBOUND_EMAIL} of WhatsApp {INBOUND_WHATSAPP}
          </p>
        </div>
        {items.length > 0 && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
            {items.length}
          </span>
        )}
      </div>

      {laden ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Laden…</p>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2 rounded border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
          <Inbox className="h-4 w-4 shrink-0" />
          Nog niets ontvangen. Stuur een mail of foto's door en wijs ze toe via de Inbox.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(item => {
            const isMail = item.source === 'email';
            const bijlagen = aantalBijlagen(item.storage_paths);
            const datum = new Date(item.created_at).toLocaleString('nl-BE', {
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
            });
            return (
              <li key={item.id} className="rounded border border-border bg-background p-2.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isMail ? <Mail className="h-3.5 w-3.5 shrink-0" /> : <MessageCircle className="h-3.5 w-3.5 shrink-0" />}
                  <span className="font-medium text-foreground">
                    {item.from_display || item.from_identifier || (isMail ? 'E-mail' : 'WhatsApp')}
                  </span>
                  <span className="ml-auto tabular-nums">{datum}</span>
                </div>

                {item.subject && (
                  <p className="mt-1 text-xs font-semibold text-foreground">{item.subject}</p>
                )}
                {item.body && (
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                )}
                {bijlagen > 0 && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    {bijlagen} {bijlagen === 1 ? 'bijlage' : 'bijlagen'} — staan bij de foto's van dit dossier
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
