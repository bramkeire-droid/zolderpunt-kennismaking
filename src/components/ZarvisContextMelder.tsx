import { useEffect } from 'react';
import { useAppNav } from '@/contexts/AppNavContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Vertelt het nieuwe Zarvis welk scherm en welk dossier open staan: bij elke
 * wissel een upsert op `zarvis_context` (per gebruiker). Zarvis leest dat via
 * het loket (`zarvis-loket`, actie `context`). Toont niets.
 */
export default function ZarvisContextMelder() {
  const nav = useAppNav();
  // App.tsx maakt bij elke render een nieuw actiefDossier-object; daarom op de
  // waarden zelf letten, niet op het object.
  const view = nav?.huidigeView;
  const dossierId = nav?.actiefDossier?.id;
  const dossierNaam = nav?.actiefDossier?.naam;

  useEffect(() => {
    void (supabase.from('zarvis_context' as never) as unknown as {
      upsert: (rij: unknown, opties: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
    })
      .upsert(
        {
          lead_id: dossierId ?? null,
          dossier_naam: dossierId ? (dossierNaam ?? null) : null,
          view: view ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .then(({ error }) => { if (error) console.error('zarvis: context doorgeven mislukt', error.message); });
  }, [view, dossierId, dossierNaam]);

  return null;
}
