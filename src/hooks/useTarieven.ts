import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STANDAARD_TARIEVEN, type Tarieven } from '@/lib/prijscalculator';

// De tarieven staan in één databaserij (calculator_tarieven). Zolang die er
// niet is, of niet gelezen kan worden, rekent de calculator verder met
// STANDAARD_TARIEVEN — een prijsberekening mag nooit stilvallen op een
// ontbrekende instelling.
//
// Ze worden één keer per sessie geladen en in de module bewaard: de calculator
// wordt op meerdere plekken geopend en zou anders bij elke opening opnieuw
// wachten op het netwerk.
let cache: Tarieven | null = null;
let lopend: Promise<Tarieven> | null = null;

/**
 * Vult ontbrekende takken aan met de standaardwaarden. Een tarievenrij die is
 * opgeslagen vóór een nieuw veld bestond, mag geen undefined opleveren midden
 * in een berekening.
 */
export function normaliseerTarieven(raw: unknown): Tarieven {
  const t = (raw ?? {}) as Partial<Tarieven>;
  const s = STANDAARD_TARIEVEN;
  const nummer = (v: unknown, terugval: number) =>
    typeof v === 'number' && isFinite(v) ? v : terugval;

  return {
    index: nummer(t.index, s.index),
    bandbreedte: nummer(t.bandbreedte, s.bandbreedte),
    perM2: { ...s.perM2, ...(t.perM2 ?? {}) },
    vast: { ...s.vast, ...(t.vast ?? {}) },
    airco: { ...s.airco, ...(t.airco ?? {}) },
    plamuur: t.plamuur?.treden?.length ? t.plamuur : s.plamuur,
    schilderwerken: t.schilderwerken?.treden?.length ? t.schilderwerken : s.schilderwerken,
    standaardBedragen: { ...s.standaardBedragen, ...(t.standaardBedragen ?? {}) },
  };
}

async function haalTarieven(): Promise<Tarieven> {
  if (cache) return cache;
  if (lopend) return lopend;

  lopend = (async () => {
    try {
      const { data, error } = await supabase
        .from('calculator_tarieven' as any)
        .select('tarieven')
        .maybeSingle();
      if (error) throw error;
      cache = normaliseerTarieven((data as any)?.tarieven);
    } catch (e) {
      // Bewust geen toast: dit draait ook op achtergrondschermen. Doorrekenen
      // met de standaardtarieven is beter dan een lege calculator.
      console.error('tarieven laden mislukt, standaardtarieven gebruikt', e);
      cache = STANDAARD_TARIEVEN;
    } finally {
      lopend = null;
    }
    return cache!;
  })();

  return lopend;
}

/** Leegt de cache zodat een bewaarde wijziging meteen doorwerkt. */
export function vergeetTarieven() {
  cache = null;
}

/**
 * `tarieven` is meteen bruikbaar (standaardwaarden) en wordt vervangen zodra
 * de opgeslagen tarieven binnen zijn. `geladen` zegt of dat al gebeurd is.
 */
export function useTarieven() {
  const [tarieven, setTarieven] = useState<Tarieven>(cache ?? STANDAARD_TARIEVEN);
  const [geladen, setGeladen] = useState(cache !== null);

  useEffect(() => {
    let actief = true;
    haalTarieven().then((t) => {
      if (!actief) return;
      setTarieven(t);
      setGeladen(true);
    });
    return () => { actief = false; };
  }, []);

  const herlaad = useCallback(async () => {
    vergeetTarieven();
    const t = await haalTarieven();
    setTarieven(t);
    return t;
  }, []);

  return { tarieven, geladen, herlaad };
}

/** Bewaart de tarieven. Faalt met een duidelijke fout als je geen admin bent. */
export async function bewaarTarieven(tarieven: Tarieven, userId: string | null) {
  const { error } = await supabase
    .from('calculator_tarieven' as any)
    .upsert(
      { id: true, tarieven: tarieven as any, updated_at: new Date().toISOString(), updated_by: userId },
      { onConflict: 'id' },
    );
  if (error) throw error;
  vergeetTarieven();
}
