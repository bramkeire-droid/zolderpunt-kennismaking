import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Mail, Paperclip, Inbox } from 'lucide-react';
import { INBOUND_EMAIL, INBOUND_WHATSAPP } from './InboundHint';
import { groupInbound, type InboundGroup, type InboundRow } from '@/lib/inboundGroups';

// Wat de klant zelf heeft doorgestuurd, per dossier op één tijdlijn.
// De inbound-verwerking (WhatsApp en e-mail) zet berichten met bijlagen in
// `inbound_media_pending`; dit is de plek waar je per dossier ziet wát er
// binnenkwam. Foto's blijven bij de dossierfoto's staan — dit overzicht toont
// de begeleidende tekst, hoeveel er meekwam en wanneer.
//
// Groeperen gebeurt via de gedeelde helper: WhatsApp levert elke foto als een
// eigen record aan, dus zonder groepering wordt één doorgestuurde reeks van 42
// foto's hier 42 aparte meldingen.

type Item = InboundRow;

export default function AangeleverdDoorKlant({
  leadId, compact = false,
}: { leadId: string | undefined; compact?: boolean }) {
  const [groepen, setGroepen] = useState<InboundGroup<Item>[]>([]);
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
        setGroepen(groupInbound((data as Item[]) ?? []));
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
        {groepen.length > 0 && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
            {groepen.length}
          </span>
        )}
      </div>

      {laden ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Laden…</p>
      ) : groepen.length === 0 ? (
        <div className="flex items-center gap-2 rounded border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
          <Inbox className="h-4 w-4 shrink-0" />
          Nog niets ontvangen. Stuur een mail of foto's door en wijs ze toe via de Inbox.
        </div>
      ) : (
        <ul className="space-y-2">
          {groepen.map(groep => {
            const isMail = groep.source === 'mail';
            const bijlagen = groep.storage_paths.length;
            const datum = new Date(groep.created_at).toLocaleString('nl-BE', {
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
            });
            const onderwerp = groep.subjects[0];
            const tekst = groep.bodies.join('\n\n');
            return (
              <li key={groep.groupId} className="rounded border border-border bg-background p-2.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isMail ? <Mail className="h-3.5 w-3.5 shrink-0" /> : <MessageCircle className="h-3.5 w-3.5 shrink-0" />}
                  <span className="font-medium text-foreground">
                    {groep.from_display || groep.from_identifier || (isMail ? 'E-mail' : 'WhatsApp')}
                  </span>
                  <span className="ml-auto tabular-nums">{datum}</span>
                </div>

                {onderwerp && (
                  <p className="mt-1 text-xs font-semibold text-foreground">{onderwerp}</p>
                )}
                {tekst && (
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {tekst}
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
