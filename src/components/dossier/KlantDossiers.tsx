import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, ArrowRight } from 'lucide-react';

interface AnderDossier {
  id: string;
  voornaam: string | null;
  achternaam: string | null;
  bouwflow_project_number: string | null;
  bouwflow_phase: string | null;
  created_at: string;
  faseTitel?: string;
}

interface Props {
  leadId: string;
  customerId: string | null | undefined;
  onOpenDossier?: (leadId: string) => void;
}

// Toont de andere projecten van dezelfde klant. Zonder dit zag je niet dat
// bijvoorbeeld Meir Bank al een voltooid project had toen er een nieuwe
// offerte binnenkwam, of dat Kim De Braekeleir twee lopende projecten heeft.
export default function KlantDossiers({ leadId, customerId, onOpenDossier }: Props) {
  const [andere, setAndere] = useState<AnderDossier[]>([]);
  const [bezig, setBezig] = useState(true);

  useEffect(() => {
    let afgebroken = false;
    if (!customerId) { setAndere([]); setBezig(false); return; }

    (async () => {
      setBezig(true);
      const { data } = await supabase
        .from('leads')
        .select('id, voornaam, achternaam, bouwflow_project_number, bouwflow_phase, created_at')
        .eq('customer_id', customerId)
        .neq('id', leadId)
        .order('created_at', { ascending: false });

      if (afgebroken) return;

      const rijen = (data ?? []) as AnderDossier[];
      const faseIds = [...new Set(rijen.map(r => r.bouwflow_phase).filter(Boolean))];
      if (faseIds.length > 0) {
        const { data: fases } = await supabase
          .from('bouwflow_phase_category_map')
          .select('phase_id, phase_title')
          .in('phase_id', faseIds.map(Number));
        const titels = new Map((fases ?? []).map((f: any) => [String(f.phase_id), f.phase_title]));
        rijen.forEach(r => { r.faseTitel = r.bouwflow_phase ? titels.get(r.bouwflow_phase) : undefined; });
      }

      if (!afgebroken) { setAndere(rijen); setBezig(false); }
    })();

    return () => { afgebroken = true; };
  }, [leadId, customerId]);

  // Niets tonen als deze klant maar één dossier heeft: dan voegt het blok niets toe.
  if (bezig || andere.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Users className="h-4 w-4 text-slate-400" aria-hidden="true" />
        Andere dossiers van deze klant
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 tabular-nums">
          {andere.length}
        </span>
      </h3>

      <ul className="space-y-1.5">
        {andere.map(d => {
          const naam = `${d.voornaam ?? ''} ${d.achternaam ?? ''}`.trim() || 'Naamloos';
          const datum = new Date(d.created_at).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onOpenDossier?.(d.id)}
                className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:border-primary/50 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{naam}</p>
                  <p className="text-xs text-slate-500">
                    {d.bouwflow_project_number && <span className="font-mono">{d.bouwflow_project_number}</span>}
                    {d.bouwflow_project_number && d.faseTitel && ' · '}
                    {d.faseTitel ?? (d.bouwflow_project_number ? '' : 'Niet in Bouwflow')}
                    {' · '}{datum}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-primary" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
