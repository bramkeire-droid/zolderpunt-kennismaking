// Eén doorgestuurde batch = één item, overal in de app.
//
// WhatsApp levert elke foto als een aparte webhook-call aan, dus 42 doorgestuurde
// foto's worden 42 rijen in `inbound_media_pending`. Wie die rijen rechtstreeks
// toont, krijgt 42 losse meldingen voor wat voor de klant één bericht was.
// De Inbox groepeerde al op afzender + tijdvenster; de dossierpagina niet.
// Die logica staat daarom hier, zodat beide schermen hetzelfde groeperen.

export interface InboundRow {
  id: string;
  source: string;
  from_identifier: string | null;
  from_display: string | null;
  subject: string | null;
  body: string | null;
  storage_paths: unknown;
  created_at: string;
}

export interface InboundGroup<T extends InboundRow> {
  groupId: string;
  source: string;
  from_identifier: string | null;
  from_display: string | null;
  items: T[];
  storage_paths: string[];
  subjects: string[];
  bodies: string[];
  /** Tijdstip van het laatste bericht in de groep. */
  created_at: string;
}

// Foto's die samen doorgestuurd worden komen seconden na elkaar binnen, maar
// iemand die er tussendoor nog iets bijtypt mag niet in een tweede groep vallen.
export const GROUP_WINDOW_MS = 10 * 60 * 1000;

export const paden = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((p): p is string => typeof p === 'string') : [];

export function groupInbound<T extends InboundRow>(rows: T[]): InboundGroup<T>[] {
  const oplopend = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const groepen: InboundGroup<T>[] = [];
  for (const rij of oplopend) {
    const vorige = groepen[groepen.length - 1];
    const zelfdeAfzender =
      vorige && vorige.source === rij.source && vorige.from_identifier === rij.from_identifier;
    const binnenVenster =
      vorige &&
      new Date(rij.created_at).getTime() - new Date(vorige.created_at).getTime() <= GROUP_WINDOW_MS;

    if (zelfdeAfzender && binnenVenster) {
      vorige.items.push(rij);
      vorige.storage_paths.push(...paden(rij.storage_paths));
      if (rij.subject?.trim()) vorige.subjects.push(rij.subject.trim());
      if (rij.body?.trim()) vorige.bodies.push(rij.body.trim());
      // Venster meeschuiven met het laatste bericht, anders knipt een lange
      // reeks foto's alsnog in stukken.
      vorige.created_at = rij.created_at;
    } else {
      groepen.push({
        groupId: rij.id,
        source: rij.source,
        from_identifier: rij.from_identifier,
        from_display: rij.from_display,
        items: [rij],
        storage_paths: paden(rij.storage_paths),
        subjects: rij.subject?.trim() ? [rij.subject.trim()] : [],
        bodies: rij.body?.trim() ? [rij.body.trim()] : [],
        created_at: rij.created_at,
      });
    }
  }

  return groepen.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
