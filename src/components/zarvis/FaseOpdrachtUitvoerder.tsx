import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { askExtension } from '@/components/dossier/MoveBouwflowPhaseDialog';
import { voerUit, type FaseOpdracht } from '@/lib/faseOpdracht';

// Voert de fase-opdrachten van Zarvis uit zolang Compass open staat in een browser met de Bouwflow-extensie
// (2026-11-25, baan LOKETTEN). Zie src/lib/faseOpdracht.ts. Eén opdracht tegelijk; een opdracht wordt eerst
// "geclaimd" (wacht -> bezig), zodat twee open tabbladen ze nooit allebei uitvoeren. Toont niets zolang er niets is.

const ELKE_MS = 30_000;
const VAST_MS = 10 * 60_000; // een opdracht die zo lang "bezig" staat (tabblad gesloten), mag opnieuw
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabel = () => (supabase as any).from('zarvis_fase_opdrachten');

async function ronde() {
  const vast = new Date(Date.now() - VAST_MS).toISOString();
  const { data } = await tabel()
    .select('id, lead_id, project_nummer, naar_fase, naar_titel, afwijs_reden_zetten, afwijs_reden_na, gemaakt_op')
    .or(`status.eq.wacht,and(status.eq.bezig,poging_op.lt.${vast})`)
    .order('gemaakt_op').limit(1);
  const o = (data ?? [])[0] as FaseOpdracht | undefined;
  if (!o) return;
  // Zonder extensie niets claimen: de opdracht blijft voor een pagina die het wel kan.
  if (!(await askExtension({ type: 'PING' }, 'PONG', 1500))) return;
  const { data: geclaimd } = await tabel().update({ status: 'bezig', poging_op: new Date().toISOString() })
    .eq('id', o.id).or(`status.eq.wacht,and(status.eq.bezig,poging_op.lt.${vast})`).select('id');
  if (!geclaimd?.length) return;

  const stand = await voerUit(o, {
    extensie: async () => true,
    zetInBouwflow: async (x) => {
      const r = await askExtension<{ ok: boolean; error?: string; needsLogin?: boolean }>(
        { type: 'SET_PHASE', projectNumber: x.project_nummer, phaseId: x.naar_fase, phaseTitle: x.naar_titel }, 'SET_PHASE_RESULT', 60_000);
      return !r ? { ok: false, fout: 'de extensie reageerde niet op tijd' }
        : r.needsLogin ? { ok: false, fout: 'niet ingelogd in Bouwflow' } : { ok: r.ok, fout: r.error };
    },
    controleer: async (x) => {
      const { data: d, error } = await supabase.functions.invoke('push-bouwflow-phase', { body: { lead_id: x.lead_id, phase_id: x.naar_fase } });
      return error ? { ok: false, fout: error.message } : d?.success && d?.applied === true ? { ok: true } : { ok: false, fout: d?.message };
    },
    zetReden: async (x) => {
      const { error } = await supabase.from('leads')
        .update({ afwijs_reden: x.afwijs_reden_na, afgewezen_op: x.afwijs_reden_na ? new Date().toISOString() : null } as never)
        .eq('id', x.lead_id);
      return error ? error.message : null;
    },
  });
  await tabel().update({ status: stand.status, melding: stand.melding, ...(stand.status === 'wacht' ? {} : { uitgevoerd_op: new Date().toISOString() }) }).eq('id', o.id);
  if (stand.status === 'gedaan') toast.success(`Zarvis: ${stand.melding}`);
  else if (stand.status === 'mislukt') toast.error(`Zarvis kon de fase niet wijzigen. ${stand.melding}`);
}

export default function FaseOpdrachtUitvoerder() {
  useEffect(() => {
    let bezig = false;
    const tik = () => {
      if (bezig) return;
      bezig = true;
      void ronde().catch(() => undefined).finally(() => { bezig = false; });
    };
    tik();
    const t = setInterval(tik, ELKE_MS);
    return () => clearInterval(t);
  }, []);
  return null;
}
