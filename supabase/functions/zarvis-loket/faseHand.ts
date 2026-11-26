// Sprint 2 van SPRINTPLAN-OVERAL (26 november, baan LOKETTEN): een dossier verplaatsen in Bouwflow zonder dat Compass
// op een pc openstaat. Een browser zonder scherm op de cloudserver (zarvis-server/bouwflow) doet wat de extensie doet;
// dit loket geeft hem de opdrachten en bevestigt achteraf via de API van Bouwflow, zoals push-bouwflow-phase.
// De hand komt binnen met een eigen sleutel (BOUWFLOW_HAND_SLEUTEL), alleen voor de drie acties hieronder.
// Zuiver; getest in faseHand_test.ts.

export const HAND_ACTIES = ['fase_opdracht_neem', 'fase_opdracht_bevestig', 'fase_opdracht_klaar'] as const;
export const MAX_WACHT_MS = 24 * 3600_000;      // zoals faseOpdracht.ts: een dag, daarna niet meer uitvoeren
export const VASTGELOPEN_MS = 10 * 60_000;      // een opdracht die zo lang 'bezig' staat, mag opnieuw genomen worden

/** Vergelijkt in vaste tijd. Een lege, korte of ontbrekende sleutel is nooit geldig, ook als de instelling leeg is. */
export function handSleutelGeldig(gegeven: string | null | undefined, echt: string | null | undefined): boolean {
  const a = (gegeven ?? '').trim(), b = (echt ?? '').trim();
  if (a.length < 32 || b.length < 32 || a.length !== b.length) return false;
  let v = 0;
  for (let i = 0; i < a.length; i++) v |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return v === 0;
}

export type Opdracht = { id: string; lead_id: string; project_nummer: string; naar_fase: number; naar_titel: string; status: string; gemaakt_op: string; poging_op: string | null; afwijs_reden_zetten: boolean; afwijs_reden_na: string | null };

/** Mag de hand deze opdracht nemen? Te oud: mislukt; anders wacht, of bezig maar vastgelopen. */
export function kanNemen(o: Opdracht, nu: number): 'neem' | 'te_oud' | 'niet' {
  if (nu - new Date(o.gemaakt_op).getTime() > MAX_WACHT_MS) return o.status === 'wacht' || o.status === 'bezig' ? 'te_oud' : 'niet';
  if (o.status === 'wacht') return 'neem';
  if (o.status === 'bezig' && (!o.poging_op || nu - new Date(o.poging_op).getTime() > VASTGELOPEN_MS)) return 'neem';
  return 'niet';
}

/** Wat de hand meldt als het in Bouwflow niet lukte. Niet aangemeld: de opdracht wacht weer (een pc kan ze nog doen). */
export function standNaHand(r: { ok: boolean; fout?: string; niet_aangemeld?: boolean }): { status: 'wacht' | 'mislukt'; melding: string } | null {
  if (r.ok) return null; // eerst bevestigen
  if (r.niet_aangemeld) return { status: 'wacht', melding: 'Bouwflow op de cloudserver is niet aangemeld; de opdracht wacht op een open Compass of op een nieuwe aanmelding.' };
  return { status: 'mislukt', melding: `Bouwflow niet gewijzigd: ${(r.fout ?? 'de browser op de server kon de fase niet zetten').slice(0, 300)}.` };
}

/** Na het teruglezen in Bouwflow: gedaan alleen als Bouwflow echt op de gevraagde fase staat. */
export function standNaBevestig(o: Opdracht, huidig: number | null): { status: 'gedaan' | 'mislukt'; melding: string } {
  return huidig === o.naar_fase
    ? { status: 'gedaan', melding: `${o.project_nummer} staat in Bouwflow en Compass op "${o.naar_titel}".` }
    : { status: 'mislukt', melding: `Niet bevestigd in Bouwflow, Compass onveranderd: Bouwflow staat op fase ${huidig ?? 'onbekend'} in plaats van ${o.naar_fase}.` };
}
