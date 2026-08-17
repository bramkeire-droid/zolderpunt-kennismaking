import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { sendMail } from './sendMail.ts';

// Bewaking van externe koppelingen.
//
// Aanleiding: de Bouwflow-koppeling lag zeven dagen stil zonder dat iets of
// iemand het merkte. De sync draaide niet automatisch, en toen ze wel draaide
// faalde ze in stilte. Een storing mag niet afhangen van iemand die toevallig
// het juiste scherm opent.
//
// Elke run schrijft hier haar uitkomst weg. Slaat ze om van goed naar fout,
// dan gaat er een mail uit — één keer, niet elk kwartier opnieuw.

/** Pas melden na twee opeenvolgende fouten: één hapering is geen storing. */
const DREMPEL = 2;
/** Niet vaker dan dit herinneren zolang de storing aanhoudt. */
const HERHAAL_NA_UUR = 12;

export interface Uitkomst {
  ok: boolean;
  melding: string;
}

export async function meldKoppelingsuitkomst(
  supabase: SupabaseClient,
  bron: string,
  uitkomst: Uitkomst,
): Promise<void> {
  try {
    const { data: vorige } = await supabase
      .from('koppeling_gezondheid')
      .select('*')
      .eq('bron', bron)
      .maybeSingle();

    const nu = new Date();
    const fouten = uitkomst.ok ? 0 : ((vorige?.opeenvolgende_fouten as number) ?? 0) + 1;
    const laatsteOk = uitkomst.ok ? nu.toISOString() : (vorige?.laatste_ok_op as string | null) ?? null;

    // Herstel is net zo belangrijk om te weten als een storing.
    const washerstel = uitkomst.ok && vorige && vorige.ok === false && (vorige.opeenvolgende_fouten as number) >= DREMPEL;

    const laatstGemeld = vorige?.laatst_gemeld_op as string | null;
    const langGeledenGemeld =
      !laatstGemeld || nu.getTime() - new Date(laatstGemeld).getTime() > HERHAAL_NA_UUR * 60 * 60 * 1000;
    const moetMelden = !uitkomst.ok && fouten >= DREMPEL && langGeledenGemeld;

    await supabase.from('koppeling_gezondheid').upsert({
      bron,
      ok: uitkomst.ok,
      melding: uitkomst.melding.slice(0, 2000),
      gecontroleerd_op: nu.toISOString(),
      laatste_ok_op: laatsteOk,
      opeenvolgende_fouten: fouten,
      laatst_gemeld_op: moetMelden ? nu.toISOString() : laatstGemeld,
    }, { onConflict: 'bron' });

    if (moetMelden) {
      const sinds = laatsteOk
        ? `Laatste geslaagde synchronisatie: ${new Date(laatsteOk).toLocaleString('nl-BE')}.`
        : 'Er is nog geen enkele geslaagde synchronisatie geregistreerd.';
      await sendMail({
        subject: `⚠ Koppeling ${bron} werkt niet — nieuwe leads komen niet binnen`,
        text:
          `De koppeling met ${bron} faalt nu ${fouten} keer op rij.\n\n` +
          `${sinds}\n\n` +
          `Foutmelding van de laatste poging:\n${uitkomst.melding}\n\n` +
          `Zolang dit duurt komen nieuwe leads en fasewijzigingen niet in Compass terecht.\n` +
          `Je ziet dit ook bovenaan het dossieroverzicht.\n\n` +
          `Je krijgt hierover hooguit één mail per ${HERHAAL_NA_UUR} uur.`,
      });
    }

    if (washerstel) {
      await sendMail({
        subject: `✅ Koppeling ${bron} werkt weer`,
        text: `De koppeling met ${bron} is hersteld en haalt weer op.`,
      });
    }
  } catch (e) {
    // De bewaking mag de sync zelf nooit laten omvallen.
    console.error('koppeling_gezondheid bijwerken mislukt', e);
  }
}
