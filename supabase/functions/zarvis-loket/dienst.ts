// Sprint 1 van SPRINTPLAN-OVERAL (26 november, baan LOKETTEN): WhatsApp verhuist naar een cloudserver zonder Brams
// aanmelding. De dienstfunctie van SPRAAK (zarvis-whatsapp-dienst, in Zarvis) vraagt hier welk dossier bij een
// telefoonnummer hoort, met een eigen sleutel (COMPASS_DIENST_SLEUTEL, header x-compass-dienst-sleutel).
// Die sleutel mag ALLEEN de actie 'nummers': nummer -> dossier-id, geen namen of inhoud. Zuiver; getest in dienst_test.ts.

export const DIENST_ACTIES = ['nummers'] as const;

/** Vergelijkt in vaste tijd. Een lege, korte of ontbrekende sleutel is nooit geldig, ook als de instelling leeg is. */
export function dienstSleutelGeldig(gegeven: string | null | undefined, echt: string | null | undefined): boolean {
  const a = (gegeven ?? '').trim(), b = (echt ?? '').trim();
  if (a.length < 32 || b.length < 32 || a.length !== b.length) return false;
  let v = 0;
  for (let i = 0; i < a.length; i++) v |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return v === 0;
}

/** De laatste 9 cijfers van een nummer (zoals whatsapp-koppeling), of ''. */
export const nummerSleutel = (t: unknown) => { const c = typeof t === 'string' ? t.replace(/[^\d]/g, '') : ''; return c.length >= 9 ? c.slice(-9) : ''; };

/** Welk dossier hoort bij welk nummer: nieuwste dossier eerst; ook via het telefoonnummer van de klant. Zuiver. */
export function koppelNummers(gevraagd: Set<string>, dossiers: { id: string; telefoon: string | null; customer_id: string | null }[], klanten: { id: string; telefoon: string | null }[]): Record<string, string> {
  const vanKlant = new Map<string, string>();
  for (const k of klanten) { const x = nummerSleutel(k.telefoon); if (x) vanKlant.set(k.id, x); }
  const koppeling: Record<string, string> = {};
  for (const l of dossiers) {
    for (const x of [nummerSleutel(l.telefoon), l.customer_id ? vanKlant.get(l.customer_id) ?? '' : '']) {
      if (x && gevraagd.has(x) && !koppeling[x]) koppeling[x] = l.id;
    }
  }
  return koppeling;
}

/** De gevraagde sleutels: alleen 9 cijfers, hoogstens 400. */
export const gevraagdeNummers = (sleutels: unknown) => new Set((Array.isArray(sleutels) ? sleutels : []).filter((x): x is string => typeof x === 'string' && /^\d{9}$/.test(x)).slice(0, 400));
