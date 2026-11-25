// IDEE-83 (2026-11-25, baan LOKETTEN): alle foto's en documenten van een dossier, per stuk met de bron (WhatsApp, mail,
// upload in de app), wanneer het binnenkwam en van wie (als dat bewaard werd), met bladeren. Zuiver, zodat
// beelden_test.ts het nakijkt zonder opslag.

export type Bron = 'whatsapp' | 'mail' | 'upload' | 'onbekend';
export type Beeld = { soort: 'foto' | 'document'; naam: string; bron: Bron; ontvangen_op: string | null; van: string | null; bucket: string; pad: string };

/** "1764081234567-wa-IMG_1.jpg" geeft het tijdstip en de bron uit de naam die de inname gaf (ingestMedia.uploadAttachments). */
function uitNaam(pad: string): { ms: number | null; bron: Bron | null; naam: string } {
  const laatste = pad.split('/').pop() ?? pad;
  const m = /^(\d{13})-(wa|mail)-(.+)$/.exec(laatste);
  if (m) return { ms: Number(m[1]), bron: m[2] === 'wa' ? 'whatsapp' : 'mail', naam: m[3] };
  return { ms: null, bron: null, naam: laatste };
}

/** De foto's uit leads.fotos: van de inname ({ path, source, uploaded_at, van?, ontvangen_op? }) of van een upload in de app ({ bestandsnaam, storage_path }). */
export function fotosUit(fotos: unknown): Beeld[] {
  return (Array.isArray(fotos) ? fotos : []).flatMap((f): Beeld[] => {
    const o = (f ?? {}) as Record<string, unknown>;
    const pad = String(o.storage_path ?? o.path ?? '');
    if (!pad) return [];
    const n = uitNaam(pad);
    const bron: Bron = o.source === 'whatsapp' ? 'whatsapp' : o.source === 'email' ? 'mail' : n.bron ?? (o.bestandsnaam || o.storage_path ? 'upload' : 'onbekend');
    const tijd = typeof o.ontvangen_op === 'string' ? o.ontvangen_op : typeof o.uploaded_at === 'string' ? o.uploaded_at : n.ms ? new Date(n.ms).toISOString() : null;
    return [{ soort: 'foto', naam: typeof o.bestandsnaam === 'string' && o.bestandsnaam ? o.bestandsnaam : n.naam, bron, ontvangen_op: tijd, van: typeof o.van === 'string' && o.van ? o.van : null, bucket: typeof o.bucket === 'string' ? o.bucket : 'lead-fotos', pad }];
  });
}

/** De documenten in de opslag van het dossier (geüpload in de app): met het tijdstip van de opslag. */
export function documentenUit(objecten: { pad: string; created_at?: string | null }[]): Beeld[] {
  return objecten.map((x) => {
    const n = uitNaam(x.pad);
    return { soort: 'document' as const, naam: n.naam, bron: n.bron ?? 'upload', ontvangen_op: x.created_at ?? (n.ms ? new Date(n.ms).toISOString() : null), van: null, bucket: 'dossier-documenten', pad: x.pad };
  });
}

/** Nieuwste eerst (zonder datum achteraan), een bladzijde van `aantal` vanaf `vanaf`, met de tellingen per bron. */
export function blad(alle: Beeld[], vanaf = 0, aantal = 20) {
  const rij = [...alle].sort((a, b) => (b.ontvangen_op ?? '').localeCompare(a.ontvangen_op ?? ''));
  const per_bron = rij.reduce((t, b) => ({ ...t, [b.bron]: (t[b.bron] ?? 0) + 1 }), {} as Record<string, number>);
  const v = Math.max(0, Math.floor(vanaf) || 0), n = Math.min(50, Math.max(1, Math.floor(aantal) || 20));
  return { totaal: rij.length, per_bron, vanaf: v, items: rij.slice(v, v + n), volgende: v + n < rij.length ? v + n : null };
}
