import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Zichtbare gezondheid van de Bouwflow-koppeling.
//
// Dit bestaat omdat de sync stil kon stoppen: toen de Bouwflow-API onze
// inloggegevens weigerde (invalid_client) bleef de app er gezond uitzien en
// werd pas dagen later gemerkt dat er geen leads meer binnenkwamen. Een sync
// die faalt hoort meteen zichtbaar te zijn, niet pas als iemand iets mist.
//
// De controle draait echt: dry_run raakt de volledige keten (onze functie ->
// website-proxy -> Bouwflow OAuth -> projecten) zonder iets weg te schrijven.

const UUR = 60 * 60 * 1000;
/** Boven deze leeftijd is "het draait nog" niet meer geloofwaardig. */
const VEROUDERD_NA = 24 * UUR;

type Stand =
  | { staat: 'laden' }
  | { staat: 'ok'; gezien: number; nieuw: number; laatste: Date | null }
  | { staat: 'stuk'; melding: string; laatste: Date | null };

const geleden = (d: Date | null) => {
  if (!d) return 'nog nooit';
  const ms = Date.now() - d.getTime();
  if (ms < UUR) return `${Math.max(1, Math.round(ms / 60000))} min geleden`;
  if (ms < 48 * UUR) return `${Math.round(ms / UUR)} uur geleden`;
  return `${Math.round(ms / (24 * UUR))} dagen geleden`;
};

export default function BouwflowSyncStatus({ onSynced }: { onSynced?: () => void }) {
  const [stand, setStand] = useState<Stand>({ staat: 'laden' });
  const [bezig, setBezig] = useState(false);

  /** Wanneer slaagde de sync voor het laatst? Staat op de dossiers zelf. */
  const laatsteSync = useCallback(async (): Promise<Date | null> => {
    const { data } = await supabase
      .from('leads')
      .select('bouwflow_pull_synced_at')
      .not('bouwflow_pull_synced_at', 'is', null)
      .order('bouwflow_pull_synced_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const v = (data as { bouwflow_pull_synced_at?: string } | null)?.bouwflow_pull_synced_at;
    return v ? new Date(v) : null;
  }, []);

  const controleer = useCallback(async () => {
    const laatste = await laatsteSync();
    try {
      const { data, error } = await supabase.functions.invoke('pull-bouwflow-projects', {
        body: { dry_run: true },
      });
      // functions.invoke geeft bij een 5xx een FunctionsHttpError terug; de
      // echte oorzaak zit in de body, dus die halen we er expliciet uit.
      const melding = (error as { context?: { error?: string } } | null)?.context?.error
        ?? (data as { error?: string } | null)?.error
        ?? (error ? error.message : null);
      if (melding) { setStand({ staat: 'stuk', melding, laatste }); return; }

      setStand({
        staat: 'ok',
        gezien: (data as { total_seen?: number })?.total_seen ?? 0,
        nieuw: (data as { would_create?: number })?.would_create ?? 0,
        laatste,
      });
    } catch (e: unknown) {
      setStand({ staat: 'stuk', melding: e instanceof Error ? e.message : 'onbekende fout', laatste });
    }
  }, [laatsteSync]);

  useEffect(() => { void controleer(); }, [controleer]);

  const synchroniseer = async () => {
    setBezig(true);
    try {
      await supabase.functions.invoke('sync-bouwflow-phases', { body: {} });
      await supabase.functions.invoke('pull-bouwflow-projects', { body: { dry_run: false } });
      onSynced?.();
    } finally {
      setBezig(false);
      await controleer();
    }
  };

  if (stand.staat === 'laden') return null;

  if (stand.staat === 'stuk') {
    return (
      <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-900">
              De Bouwflow-koppeling werkt niet — nieuwe leads en fasewijzigingen komen niet binnen
            </p>
            <p className="mt-0.5 text-xs text-red-700">
              Laatste geslaagde synchronisatie: {geleden(stand.laatste)}.
            </p>
            <p className="mt-1 break-words rounded bg-red-100 px-2 py-1 font-mono text-[11px] text-red-800">
              {stand.melding}
            </p>
            {/invalid_client|401|unauthor/i.test(stand.melding) && (
              <p className="mt-1.5 text-xs text-red-700">
                Bouwflow weigert onze inloggegevens. Vernieuw <strong>BOUWFLOW_OAUTH_CLIENT_ID</strong> en{' '}
                <strong>BOUWFLOW_OAUTH_CLIENT_SECRET</strong> bij de Zolderpunt-website (Supabase-secrets).
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={controleer}
            className="shrink-0 rounded p-1 text-red-500 hover:bg-red-100"
            title="Opnieuw controleren"
            aria-label="Opnieuw controleren"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const verouderd = !stand.laatste || Date.now() - stand.laatste.getTime() > VEROUDERD_NA;

  return (
    <div
      className={`mb-3 flex flex-wrap items-center gap-2 rounded-lg border px-4 py-2 text-xs ${
        verouderd ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600'
      }`}
    >
      {verouderd
        ? <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        : <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />}
      <span>
        Bouwflow bereikbaar — {stand.gezien} projecten
        {stand.nieuw > 0 && <strong className="text-slate-900"> · {stand.nieuw} nog niet in Compass</strong>}
      </span>
      <span className={verouderd ? 'font-semibold' : 'text-slate-400'}>
        laatste synchronisatie {geleden(stand.laatste)}
      </span>
      <button
        type="button"
        onClick={synchroniseer}
        disabled={bezig}
        className="ml-auto rounded border border-current px-2 py-1 font-semibold hover:bg-black/5 disabled:opacity-50"
      >
        {bezig ? 'Bezig…' : stand.nieuw > 0 ? `${stand.nieuw} ophalen` : 'Nu synchroniseren'}
      </button>
    </div>
  );
}
