// Wat Zarvis mag gebruiken: per connector aan of uit. Bewaard per gebruiker in
// `zarvis_instellingen`; de functie `zarvis` leest dezelfde rij.

import { supabase } from '@/integrations/supabase/client';

export type ZarvisInstellingen = {
  /** Per connector true of false; wat ontbreekt, geldt als aan. */
  connectoren: Record<string, boolean>;
  ingerichtOp: string | null;
};

type Rij = { connectoren: Record<string, boolean> | null; ingericht_op: string | null };
// De tabel staat nog niet in de gegenereerde types.
const tabel = () => supabase.from('zarvis_instellingen' as never) as unknown as {
  select: (k: string) => { maybeSingle: () => Promise<{ data: Rij | null }> };
  upsert: (rij: Record<string, unknown>, opties: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
};

export async function leesInstellingen(): Promise<ZarvisInstellingen> {
  try {
    const { data } = await tabel().select('connectoren, ingericht_op').maybeSingle();
    return { connectoren: data?.connectoren ?? {}, ingerichtOp: data?.ingericht_op ?? null };
  } catch {
    return { connectoren: {}, ingerichtOp: null };
  }
}

/** Bewaart de instellingen; geeft een foutmelding terug als dat niet lukt. */
export async function bewaarInstellingen(connectoren: Record<string, boolean>, ingericht: boolean): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return 'Je bent niet meer ingelogd.';
  const rij: Record<string, unknown> = { user_id: data.user.id, connectoren, updated_at: new Date().toISOString() };
  if (ingericht) rij.ingericht_op = new Date().toISOString();
  const { error } = await tabel().upsert(rij, { onConflict: 'user_id' });
  return error ? 'Bewaren lukte niet. Probeer opnieuw.' : null;
}
