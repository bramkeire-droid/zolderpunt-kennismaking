import { supabase } from '@/integrations/supabase/client';
import { downloadBlob } from '@/lib/downloadFile';

/**
 * Bewaarde rapporten per dossier.
 *
 * WAAROM DIT BESTAAT. De PDF werd in de browser gebouwd en meteen gedownload;
 * daarna bestond hij alleen nog op de schijf van wie hem maakte. Op het dossier
 * stond enkel `rapport_gegenereerd_op` — één timestamp, dus een tweede rapport
 * wiste het spoor van het eerste. En het transcript waarmee het rapport gemaakt
 * werd stond nergens: het is geen kolom op leads en useLeadSave schrijft het
 * niet weg, dus het verdween met het browsertabblad.
 *
 * Nu wordt bij elk gegenereerd rapport het bestand zelf bewaard, samen met de
 * invoer die het maakte. Opnieuw downloaden geeft exact hetzelfde bestand —
 * niet een nieuwe berekening met de cijfers van vandaag.
 */

export const DOCUMENTEN_BUCKET = 'dossier-documenten';

export type RapportBron = 'intake' | 'telefoon' | 'los';

export interface RapportRij {
  id: string;
  lead_id: string;
  bron: string;
  bestandsnaam: string;
  storage_path: string;
  bytes: number | null;
  transcript_bestandsnaam: string | null;
  transcript_path: string | null;
  transcript_bytes: number | null;
  gegenereerd_op: string;
  created_by: string | null;
  // Optioneel: pas aanwezig na migratie 20261029140000. Zonder die migratie
  // werkt het mailen gewoon, je mist enkel de regel "gemaild op ...".
  gemaild_op?: string | null;
  gemaild_naar?: string | null;
  mail_variant?: string | null;
}

/** Velden die samen de invoer van een rapport vormen. */
export interface RapportInvoer {
  transcript?: string | null;
  gesprek_notities?: string | null;
  project_feiten?: unknown;
  technisch?: unknown;
  inbegrepen_posten?: unknown;
  oppervlakte_m2?: number | null;
  gezocht_naar?: string | null;
}

const tijdstempel = () => new Date().toISOString().replace(/[:.]/g, '-');

/** Alleen tekens die een storage-pad veilig overleven. */
const veiligeNaam = (naam: string) =>
  naam.normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '_').slice(0, 120) || 'bestand';

const alsLijst = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * De invoer als leesbaar tekstbestand. Bram vroeg om "de transcriptfiles die
 * gebruikt werden om het rapport te genereren": dat is het transcript, maar het
 * rapport leunt ook op de notities, de vaststellingen en de technische keuzes.
 * Die staan er daarom onder, duidelijk gescheiden, in één bestand.
 */
export function maakInvoerTekst(invoer: RapportInvoer, kop: string): string {
  const regels: string[] = [kop, '='.repeat(kop.length), ''];

  const blok = (titel: string, inhoud: string) => {
    if (!inhoud.trim()) return;
    regels.push(`--- ${titel} ---`, '', inhoud.trim(), '');
  };

  blok('TRANSCRIPT', invoer.transcript || '');
  blok('GESPREKSNOTITIES', invoer.gesprek_notities || '');

  const feiten = alsLijst(invoer.project_feiten)
    .map((f: any, i) => `${f?.label_nummer ?? i + 1}. ${f?.tekst ?? ''}`.trim())
    .filter((r) => r.length > 3);
  blok('VASTSTELLINGEN', feiten.join('\n'));

  const technisch = invoer.technisch && typeof invoer.technisch === 'object'
    ? Object.entries(invoer.technisch as Record<string, unknown>)
        .filter(([, v]) => v === true)
        .map(([k]) => `- ${k}`)
    : [];
  blok('TECHNISCHE KEUZES', technisch.join('\n'));

  const posten = alsLijst(invoer.inbegrepen_posten)
    .map((p: any) => (typeof p === 'string' ? p : `${p?.post ?? ''}${p?.bedrag ? ` — € ${p.bedrag}` : ''}`))
    .filter((r) => r.trim());
  blok('INBEGREPEN POSTEN', posten.join('\n'));

  const project = [
    invoer.oppervlakte_m2 ? `Oppervlakte: ${invoer.oppervlakte_m2} m²` : '',
    invoer.gezocht_naar ? `Gewenst resultaat: ${invoer.gezocht_naar}` : '',
  ].filter(Boolean);
  blok('PROJECT', project.join('\n'));

  return regels.join('\n').trimEnd() + '\n';
}

/** Heeft deze invoer genoeg inhoud om als bestand te bewaren? */
export function heeftInvoer(invoer: RapportInvoer): boolean {
  return !!(
    (invoer.transcript || '').trim() ||
    (invoer.gesprek_notities || '').trim() ||
    alsLijst(invoer.project_feiten).length > 0
  );
}

interface BewaarArgs {
  leadId: string;
  bron: RapportBron;
  pdf: Blob;
  bestandsnaam: string;
  invoer: RapportInvoer;
  /** Kop bovenaan het invoerbestand, bv. "Intakegesprek Huub & Ama Jans — 28/10/2026". */
  invoerKop: string;
}

/**
 * Bewaart een net gegenereerd rapport.
 *
 * Gooit NOOIT: het bewaren mag het downloaden niet in de weg staan. Lukt het
 * niet, dan wordt dat gelogd en krijgt de aanroeper null terug, zodat die zelf
 * kan beslissen of hij de gebruiker waarschuwt.
 */
export async function bewaarRapport(args: BewaarArgs): Promise<RapportRij | null> {
  const { leadId, bron, pdf, bestandsnaam, invoer, invoerKop } = args;
  if (!leadId || !(pdf instanceof Blob) || pdf.size === 0) return null;

  const ts = tijdstempel();
  const pdfPad = `${leadId}/rapport/${ts}-${veiligeNaam(bestandsnaam)}`;

  try {
    const { error: pdfFout } = await supabase.storage
      .from(DOCUMENTEN_BUCKET)
      .upload(pdfPad, pdf, { contentType: 'application/pdf', upsert: false });
    if (pdfFout) throw pdfFout;

    // Het invoerbestand is bijzaak: lukt dat niet, dan hoort het rapport zelf
    // nog altijd bewaard te worden.
    let transcriptPad: string | null = null;
    let transcriptNaam: string | null = null;
    let transcriptBytes: number | null = null;
    if (heeftInvoer(invoer)) {
      const tekst = maakInvoerTekst(invoer, invoerKop);
      const blob = new Blob([tekst], { type: 'text/plain;charset=utf-8' });
      transcriptNaam = veiligeNaam(bestandsnaam.replace(/\.pdf$/i, '')) + '_transcript.txt';
      const pad = `${leadId}/transcript/${ts}-${transcriptNaam}`;
      const { error } = await supabase.storage
        .from(DOCUMENTEN_BUCKET)
        .upload(pad, blob, { contentType: 'text/plain;charset=utf-8', upsert: false });
      if (error) {
        console.error('transcript bewaren mislukt', error);
      } else {
        transcriptPad = pad;
        transcriptBytes = blob.size;
      }
    }

    const { data, error } = await supabase
      .from('rapporten' as any)
      .insert({
        lead_id: leadId,
        bron,
        bestandsnaam,
        storage_path: pdfPad,
        bytes: pdf.size,
        transcript_bestandsnaam: transcriptPad ? transcriptNaam : null,
        transcript_path: transcriptPad,
        transcript_bytes: transcriptPad ? transcriptBytes : null,
        created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      } as any)
      .select('*')
      .single();
    if (error) throw error;
    return data as unknown as RapportRij;
  } catch (e) {
    console.error('rapport bewaren mislukt', e);
    return null;
  }
}

export async function haalRapporten(leadId: string): Promise<RapportRij[]> {
  if (!leadId) return [];
  const { data, error } = await supabase
    .from('rapporten' as any)
    .select('*')
    .eq('lead_id', leadId)
    .order('gegenereerd_op', { ascending: false });
  if (error) { console.error('rapporten laden mislukt', error); return []; }
  return (data ?? []) as unknown as RapportRij[];
}

/**
 * Haalt een bewaard bestand op en biedt het als download aan.
 *
 * Bewust via een ondertekende URL en dan downloadBlob: de bucket is privé, en
 * een <a href> naar een ondertekende URL opent een PDF in de viewer in plaats
 * van hem op te slaan.
 */
export async function downloadUitOpslag(pad: string, bestandsnaam: string): Promise<void> {
  const { data, error } = await supabase.storage.from(DOCUMENTEN_BUCKET).download(pad);
  if (error || !data) throw new Error(error?.message || 'Bestand niet gevonden in de opslag.');
  await downloadBlob(data, bestandsnaam);
}

/**
 * Mailt een bewaard rapport naar de klant, met de PDF als bijlage.
 *
 * Bewust fetch en niet supabase.functions.invoke: die verpakt elke non-2xx in
 * "Edge Function returned a non-2xx status code" en gooit net de melding weg
 * waar het hier om gaat — een niet-geverifieerde afzender bij Postmark of een
 * te zware bijlage moet leesbaar in de toast belanden. Zelfde reden als in
 * BouwflowSyncStatus; fetch stuurt de sessie-JWT niet vanzelf mee.
 */
export async function verstuurRapport(args: {
  rapportId: string;
  to: string;
  variant: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-rapport-mail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionData.session ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
    },
    body: JSON.stringify(args),
  });
  const data = await res.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!res.ok || data?.error) throw new Error(data?.error || `HTTP ${res.status}`);
}

export async function verwijderRapport(rij: RapportRij): Promise<void> {
  const paden = [rij.storage_path, rij.transcript_path].filter(Boolean) as string[];
  if (paden.length) {
    const { error } = await supabase.storage.from(DOCUMENTEN_BUCKET).remove(paden);
    // Een verweesd bestand is vervelend maar mag het verwijderen van de rij
    // niet blokkeren — anders blijft het rapport zichtbaar in de lijst.
    if (error) console.error('bestanden verwijderen mislukt', error);
  }
  const { error } = await supabase.from('rapporten' as any).delete().eq('id', rij.id);
  if (error) throw error;
}
