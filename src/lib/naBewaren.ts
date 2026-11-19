// Na het bewaren van klantgegevens: wat houdt de databank écht? (19/11/2026)
//
// De klantfiche-triggers passen een dossier ná het schrijven nog aan: een
// leeggemaakt e-mailadres of telefoonnummer zet de klantfiche terug, en een
// nieuw dossier van een bestaande klant neemt diens naam en telefoon over
// (live bevestigd: UPDATE … RETURNING gaf "", de rij hield het oude adres).
// Een scherm dat na het bewaren zijn eigen invoer blijft tonen, toont dan iets
// dat niet bestaat, en de volgende autosave stuurt het opnieuw.

import { supabase } from '@/integrations/supabase/client';

export const KLANTVELDEN = ['voornaam', 'achternaam', 'partner_naam', 'email', 'telefoon'] as const;
export type Klantveld = (typeof KLANTVELDEN)[number];
export type Afwijkingen = Partial<Record<Klantveld, string>>;

const LABEL: Record<Klantveld, string> = {
  voornaam: 'voornaam', achternaam: 'achternaam', partner_naam: 'partner', email: 'e-mail', telefoon: 'telefoon',
};

/**
 * Leest de klantvelden apart terug en geeft alleen die terug die de databank
 * anders hield dan verstuurd. Null als teruglezen mislukt: het schrijven zelf
 * is dan wel gelukt, dus dat mag geen bewaarfout worden.
 */
export async function klantveldenNaBewaren(
  leadId: string,
  verzonden: Partial<Record<Klantveld, unknown>>,
): Promise<Afwijkingen | null> {
  const { data, error } = await supabase.from('leads').select(KLANTVELDEN.join(', ')).eq('id', leadId).single();
  if (error || !data) {
    console.error('Klantvelden teruglezen na bewaren mislukt', error);
    return null;
  }
  const afwijkend: Afwijkingen = {};
  for (const k of KLANTVELDEN) {
    const inDb = String((data as any)[k] ?? '');
    if (k in verzonden && inDb !== String(verzonden[k] ?? '')) afwijkend[k] = inDb;
  }
  return afwijkend;
}

/**
 * Neemt de databankwaarde over, maar alleen voor een veld waar nog staat wat
 * verstuurd werd: wie intussen verder typte, verliest niets.
 */
export function neemOver<T extends object>(huidig: T, verzonden: object, afwijkend: Afwijkingen): T {
  const nu = huidig as Record<string, unknown>;
  const toen = verzonden as Record<string, unknown>;
  const volgende: Record<string, unknown> = { ...nu };
  for (const [k, v] of Object.entries(afwijkend)) {
    if (String(nu[k] ?? '') === String(toen[k] ?? '')) volgende[k] = v;
  }
  return volgende as T;
}

export const meldingNietOvergenomen = (afwijkend: Afwijkingen) =>
  `Niet overgenomen: ${(Object.keys(afwijkend) as Klantveld[]).map(k => LABEL[k]).join(', ')}. ` +
  'De klantfiche hield de bestaande waarde; die staat nu weer in beeld.';
