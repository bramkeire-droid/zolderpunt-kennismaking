// "Klant & werf" bewerken op de dossierpagina (19/11/2026).
//
// leads.adres is één tekstveld. De rest van de app leest het als
// "Straat nr, postcode gemeente" (AddressAutocomplete, BouwFlow-sync,
// extractGemeente, PortalMeerwaarde), dus het formulier toont vier vakjes en
// bouwt daaruit precies die vorm terug.
//
// Wat de databank zelf doet (triggers, zie migratie 20261119120000):
//   - telefoon en e-mail horen bij de klant en gaan naar al zijn dossiers;
//   - het adres is het werfadres van dít dossier en blijft daar.

import { supabase } from '@/integrations/supabase/client';

export const GEVONDEN_VIA = [
  'Google zoekresultaten',
  'Google advertentie',
  'Facebook of Instagram',
  'Via AI-tool zoals ChatGPT',
  'Via offerte- of vergelijkingsplatform',
  'Via vrienden of familie',
  'Via gevelreclame of werfbord',
  'Via bedrijfswagen',
  'Telefonisch contact',
  'Anders',
];

/** Na een bewaring: wie hetzelfde dossier toont (de dossierbalk), haalt het opnieuw op. */
export const DOSSIER_BIJGEWERKT = 'dossier-bijgewerkt';

export interface AdresDelen {
  straat: string;
  nummer: string;
  postcode: string;
  gemeente: string;
}

const PLAATS = /^(\d{4})(?:\s+(.+))?$/;
const STRAAT_NR = /^(.+?)\s+(\d+[a-z]?(?:\s*bus\s*\S+)?)(?:\s+(.+))?$/i;

/**
 * Best effort: oude adressen staan in allerlei vormen ("9400", "Straat 5",
 * "Straat 5 9400 Ninove"). Een verkeerde opsplitsing kost niets, want het
 * adres wordt alleen herschreven als je een vakje wijzigt.
 */
export function splitsAdres(adres: string | null | undefined): AdresDelen {
  const d: AdresDelen = { straat: '', nummer: '', postcode: '', gemeente: '' };
  const a = (adres ?? '').replace(/\s+/g, ' ').trim();
  if (!a) return d;

  const komma = a.indexOf(',');
  let links = komma >= 0 ? a.slice(0, komma).trim() : a;
  let rest = komma >= 0 ? a.slice(komma + 1).trim() : '';
  if (komma < 0 && PLAATS.test(links)) { rest = links; links = ''; }

  const s = links.match(STRAAT_NR);
  if (s && !(s[3] && rest)) {
    d.straat = s[1];
    d.nummer = s[2];
    rest = s[3] ?? rest;
  } else {
    d.straat = links;
  }

  const p = rest.match(PLAATS);
  if (p) { d.postcode = p[1]; d.gemeente = p[2] ?? ''; } else d.gemeente = rest;
  return d;
}

export function bouwAdres(d: AdresDelen): string {
  const lijn1 = [d.straat, d.nummer].map(x => x.trim()).filter(Boolean).join(' ');
  const lijn2 = [d.postcode, d.gemeente].map(x => x.trim()).filter(Boolean).join(' ');
  return [lijn1, lijn2].filter(Boolean).join(', ');
}

export interface KlantWerfLead {
  id: string;
  customer_id?: string | null;
  adres?: string | null;
  telefoon?: string | null;
  email?: string | null;
  gevonden_via?: string | null;
}

export interface KlantWerfVelden {
  telefoon: string;
  email: string;
  gevonden_via: string;
}

/** Alleen wat echt verandert. Leeg object = niets te bewaren. */
export function bepaalWijzigingen(lead: KlantWerfLead, delen: AdresDelen, velden: KlantWerfVelden) {
  const patch: Record<string, string | null> = {};
  const oud = splitsAdres(lead.adres);
  if ((Object.keys(oud) as (keyof AdresDelen)[]).some(k => delen[k].trim() !== oud[k])) {
    patch.adres = bouwAdres(delen);
    // De coördinaten horen bij het oude adres. Leeg = de kaart in het
    // intakegesprek zoekt het nieuwe adres zelf op.
    patch.adres_lat = null;
    patch.adres_lng = null;
  }
  for (const k of ['telefoon', 'email', 'gevonden_via'] as const) {
    const nieuw = velden[k].trim();
    if (nieuw !== (lead[k] ?? '').trim()) patch[k] = nieuw;
  }
  return patch;
}

/** Zelfde sleutel als de databankfunctie leads_koppel_klant. */
export function klantSleutel(email: string, telefoon: string): string | null {
  const e = email.trim().toLowerCase();
  if (e) return e;
  return telefoon.replace(/[^0-9]/g, '').slice(-9) || null;
}

const LABEL: Record<string, string> = { adres: 'adres', telefoon: 'telefoon', email: 'e-mail', gevonden_via: 'gevonden via' };

/**
 * Bewaart en geeft de rij terug zoals ze NU in de databank staat, plus welke
 * velden de databank anders hield dan gevraagd (bv. een leeggemaakt e-mailadres
 * dat de klantfiche terugzet). Zo toont het scherm nooit iets dat niet bewaard is.
 */
export async function bewaarKlantWerf(lead: KlantWerfLead, patch: Record<string, string | null>) {
  if ('email' in patch || 'telefoon' in patch) {
    const email = String(patch.email ?? lead.email ?? '');
    const sleutel = klantSleutel(email, String(patch.telefoon ?? lead.telefoon ?? ''));
    if (sleutel) {
      const { data: ander, error } = await supabase
        .from('customers').select('id, voornaam, achternaam').eq('klant_sleutel', sleutel).maybeSingle();
      if (error) throw new Error(error.message);
      // Zou het dossier stil aan een andere klant hangen en diens naam en
      // telefoon overnemen. Klanten samenvoegen is een aparte beslissing.
      if (ander && ander.id !== lead.customer_id) {
        const naam = `${ander.voornaam ?? ''} ${ander.achternaam ?? ''}`.trim() || 'een andere klant';
        throw new Error(`Dit ${email.trim() ? 'e-mailadres' : 'telefoonnummer'} hoort al bij ${naam}. Niets bewaard.`);
      }
    }
  }

  // Twee stappen, niet update().select(): die geeft de rij van vóór de
  // AFTER-triggers, en net die zetten bv. een leeggemaakt e-mailadres terug.
  const { data: geraakt, error: schrijfFout } = await supabase
    .from('leads').update(patch as any).eq('id', lead.id).select('id');
  if (schrijfFout) throw new Error(schrijfFout.message);
  if (!geraakt?.length) throw new Error('Niets bewaard: geen schrijfrechten op dit dossier.');
  const { data, error } = await supabase.from('leads').select('*').eq('id', lead.id).single();
  if (error) throw new Error(error.message);

  const nietOvergenomen = Object.keys(patch)
    .filter(k => k in LABEL && ((data as any)[k] ?? '') !== patch[k])
    .map(k => LABEL[k]);
  return { rij: data as any, nietOvergenomen };
}
