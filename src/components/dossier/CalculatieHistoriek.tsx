import { useCallback, useEffect, useState } from 'react';
import { Calculator, Trash2, Phone, Bot, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import {
  BRON_LABEL,
  haalCalculaties,
  verwijderCalculatie,
  type CalculatieBron,
  type CalculatieRij,
} from '@/lib/calculaties';
import { CATEGORIE_MET_BEDRAG, fmtEuro, leesPosten } from '@/lib/prijscalculator';

// Alle berekeningen van dit dossier op één rij, met tijdstip en herkomst.
// Op leads staat alleen de laatste berekening; wie wil zien wat er tijdens het
// telefoongesprek gerekend werd en wat later tijdens de intake, heeft dit nodig.

const ICOON: Record<string, any> = { los: FolderOpen, intake: Bot, telefoon: Phone };

const tijdstip = (iso: string) =>
  new Date(iso).toLocaleString('nl-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export default function CalculatieHistoriek({ leadId }: { leadId: string | undefined }) {
  const [rijen, setRijen] = useState<CalculatieRij[]>([]);
  const [laden, setLaden] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const laad = useCallback(async () => {
    if (!leadId) { setLaden(false); return; }
    setLaden(true);
    setRijen(await haalCalculaties(leadId));
    setLaden(false);
  }, [leadId]);

  useEffect(() => { void laad(); }, [laad]);

  const wis = async (id: string) => {
    if (!window.confirm('Deze berekening uit de historiek verwijderen?')) return;
    try {
      await verwijderCalculatie(id);
      setRijen((r) => r.filter((x) => x.id !== id));
      toast.success('Berekening verwijderd');
    } catch {
      toast.error('Verwijderen mislukt');
    }
  };

  if (!leadId) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Calculator className="h-4 w-4 text-slate-400" aria-hidden="true" />
        Berekeningen
        {rijen.length > 0 && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 tabular-nums">
            {rijen.length}
          </span>
        )}
      </h3>

      {laden ? (
        <p className="py-4 text-center text-xs text-slate-500">Laden…</p>
      ) : rijen.length === 0 ? (
        <p className="rounded border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-500">
          Nog geen berekeningen bewaard. Open de calculator via de balk bovenaan, tijdens een
          telefoongesprek of in het intakegesprek — elke berekening komt hier automatisch bij.
        </p>
      ) : (
        <ul className="space-y-2">
          {rijen.map((r) => {
            const Icoon = ICOON[r.bron] ?? Calculator;
            const posten = leesPosten(r.inbegrepen_posten);
            const metBedrag = posten.filter((p) => CATEGORIE_MET_BEDRAG.includes(p.categorie));
            const isOpen = open === r.id;
            return (
              <li key={r.id} className="rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 px-3 py-2">
                  <Icoon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : r.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-slate-900">
                      {r.budget_excl != null ? fmtEuro(r.budget_excl) : 'geen bedrag'}
                      {r.budget_min_excl != null && r.budget_max_excl != null && (
                        <span className="ml-1.5 font-normal text-slate-500">
                          ({fmtEuro(r.budget_min_excl)} — {fmtEuro(r.budget_max_excl)})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {BRON_LABEL[r.bron as CalculatieBron] ?? r.bron} · {tijdstip(r.created_at)}
                      {r.updated_at !== r.created_at && ' · bijgewerkt'}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => wis(r.id)}
                    title="Verwijderen"
                    className="shrink-0 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 px-3 py-2">
                    {posten.length === 0 ? (
                      <p className="text-xs text-slate-500">Geen posten bewaard.</p>
                    ) : (
                      <ul className="space-y-1">
                        {posten.map((p, i) => (
                          <li key={i} className="flex justify-between gap-3 text-xs">
                            <span className="text-slate-700">{p.post}</span>
                            <span className="shrink-0 tabular-nums text-slate-500">
                              {metBedrag.includes(p)
                                ? p.min != null && p.max != null && p.min !== p.max
                                  ? `${fmtEuro(p.min)} — ${fmtEuro(p.max)}`
                                  : fmtEuro(p.bedrag)
                                : 'inbegrepen'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {r.btw_percentage != null && (
                      <p className="mt-2 text-[11px] text-slate-400">btw {r.btw_percentage}%</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
