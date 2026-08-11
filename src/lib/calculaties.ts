import { supabase } from '@/integrations/supabase/client';

// Eén rij per calculatiesessie. De calculator slaat bij elke wijziging op, dus
// zonder deze samenvoeging zou één invulbeurt tientallen rijen opleveren.
// Daarom: de eerste wijziging maakt de rij, alle volgende werken ze bij.

export type CalculatieBron = 'los' | 'intake' | 'telefoon';

export const BRON_LABEL: Record<CalculatieBron, string> = {
  los: 'Losse calculator',
  intake: 'Intakegesprek',
  telefoon: 'Telefoongesprek',
};

export interface CalculatieRij {
  id: string;
  lead_id: string;
  bron: string;
  calculator_state: unknown;
  inbegrepen_posten: unknown;
  budget_excl: number | null;
  budget_min_excl: number | null;
  budget_max_excl: number | null;
  btw_percentage: number | null;
  created_at: string;
  updated_at: string;
}

export interface CalculatieVelden {
  calculator_state?: unknown;
  inbegrepen_posten?: unknown;
  budget_excl?: number;
  budget_min_excl?: number;
  budget_max_excl?: number;
  btw_percentage?: number;
}

/**
 * Houdt één sessie vast. `bewaar` maakt de rij bij de eerste aanroep en werkt
 * ze daarna bij. Fouten worden gelogd maar nooit doorgegeven: de historiek mag
 * het opslaan van het dossier zelf niet in de weg staan.
 */
export function maakCalculatieSessie(leadId: string, bron: CalculatieBron) {
  let rijId: string | null = null;
  let bezig: Promise<void> | null = null;

  const bewaar = async (velden: CalculatieVelden) => {
    // Achter elkaar houden: twee snelle wijzigingen mogen geen twee rijen maken.
    const vorige = bezig ?? Promise.resolve();
    bezig = vorige.then(async () => {
      try {
        if (rijId) {
          await supabase
            .from('calculaties' as any)
            .update({ ...velden, updated_at: new Date().toISOString() } as any)
            .eq('id', rijId);
          return;
        }
        const { data, error } = await supabase
          .from('calculaties' as any)
          .insert({
            lead_id: leadId,
            bron,
            // Wie de berekening maakte, hier opgehaald i.p.v. via React-context:
            // zo blijft de calculator los van de authenticatie-provider.
            created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
            ...velden,
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        rijId = (data as any)?.id ?? null;
      } catch (e) {
        console.error('calculatie bewaren mislukt', e);
      }
    });
    return bezig;
  };

  return { bewaar, get id() { return rijId; } };
}

export async function haalCalculaties(leadId: string): Promise<CalculatieRij[]> {
  const { data, error } = await supabase
    .from('calculaties' as any)
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) { console.error('calculaties laden mislukt', error); return []; }
  return (data ?? []) as unknown as CalculatieRij[];
}

export async function verwijderCalculatie(id: string) {
  const { error } = await supabase.from('calculaties' as any).delete().eq('id', id);
  if (error) throw error;
}
