// "Wat we weten" bewerken op de dossierpagina (19/11/2026, op vraag van Bram).
//
// De gegevens komen uit het telefoongesprek: pre_intake.box_notes (vier lijstjes
// notities) en pre_intake.questions_raised (welke vragen de klant stelde, met
// een notitie). Het telefoongesprek bewaart telkens de volledige kolom. Daarom
// wordt hier vlak voor het bewaren de VERSE stand gelezen en worden alleen de
// vakken en vragen die echt gewijzigd zijn daarop gelegd: een notitie die
// intussen in een lopend gesprek is toegevoegd, blijft zo staan.

import { supabase } from '@/integrations/supabase/client';
import { CALLING_QUESTIONS } from '@/data/callingQuestions';

export const VAKKEN = [
  { key: 'wat', titel: 'Wat?' },
  { key: 'aannemer', titel: 'Welke aannemer?' },
  { key: 'waarom', titel: 'Waarom nu?' },
  { key: 'budget', titel: 'Welk budget?' },
] as const;

export type VakSleutel = (typeof VAKKEN)[number]['key'];
export type Vraag = { raised: boolean; note: string };
export interface WatWeWeten {
  vakken: Record<VakSleutel, string[]>;
  vragen: Record<string, Vraag>;
}

export function leesWatWeWeten(pi: any): WatWeWeten {
  const box = pi?.box_notes ?? {};
  const qr = pi?.questions_raised ?? {};
  return {
    vakken: Object.fromEntries(
      VAKKEN.map(v => [v.key, Array.isArray(box[v.key]) ? box[v.key].map(String) : []]),
    ) as Record<VakSleutel, string[]>,
    vragen: Object.fromEntries(
      CALLING_QUESTIONS.map(q => [q.key, { raised: !!qr[q.key]?.raised, note: String(qr[q.key]?.note ?? '') }]),
    ),
  };
}

const schoon = (rijen: string[]) => rijen.map(r => r.trim()).filter(Boolean);
const gelijk = (a: string[], b: string[]) => JSON.stringify(schoon(a)) === JSON.stringify(schoon(b));

/** Alleen wat Bram wijzigde, gelegd op de verse databankstand. Leeg object = niets te bewaren. */
export function voegSamen(vers: any, origineel: WatWeWeten, nieuw: WatWeWeten) {
  const patch: Record<string, unknown> = {};

  const box = { ...(vers?.box_notes ?? {}) };
  const vakkenGewijzigd = VAKKEN.filter(({ key }) => !gelijk(nieuw.vakken[key], origineel.vakken[key]));
  vakkenGewijzigd.forEach(({ key }) => { box[key] = schoon(nieuw.vakken[key]); });
  if (vakkenGewijzigd.length > 0) patch.box_notes = box;

  const qr = { ...(vers?.questions_raised ?? {}) };
  const vragenGewijzigd = Object.keys(nieuw.vragen).filter(k =>
    nieuw.vragen[k].raised !== origineel.vragen[k]?.raised
    || nieuw.vragen[k].note.trim() !== (origineel.vragen[k]?.note ?? '').trim());
  vragenGewijzigd.forEach(k => {
    qr[k] = { ...(qr[k] ?? {}), raised: nieuw.vragen[k].raised, note: nieuw.vragen[k].note.trim() };
  });
  if (vragenGewijzigd.length > 0) patch.questions_raised = qr;

  return patch;
}

/** Geeft de rij terug zoals ze nu in de databank staat, of null als er niets te bewaren was. */
export async function bewaarWatWeWeten(preIntakeId: string, origineel: WatWeWeten, nieuw: WatWeWeten) {
  const tabel = () => supabase.from('pre_intake' as any);
  const { data: vers, error: leesFout } = await tabel()
    .select('box_notes, questions_raised').eq('id', preIntakeId).single();
  if (leesFout) throw new Error(leesFout.message);

  const patch = voegSamen(vers, origineel, nieuw);
  if (Object.keys(patch).length === 0) return null;

  const { data, error } = await tabel().update(patch as any).eq('id', preIntakeId).select('*').single();
  if (error) throw new Error(error.message);
  return data as any;
}
