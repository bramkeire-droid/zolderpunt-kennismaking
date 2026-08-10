import { Search, LayoutGrid, Rows3, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FASE_GROEPEN, GROEP_KLEUR, euro, type FaseGroepKey } from '@/lib/pipeline';

export interface KpiWaarden {
  actief: number;
  pipelinewaarde: number;
  waardeVanAantal: number;
  opvolgingNodig: number;
}

interface Props {
  kpi: KpiWaarden;
  groep: FaseGroepKey;
  onGroep: (g: FaseGroepKey) => void;
  aantalPerGroep: Record<string, number>;
  zoek: string;
  onZoek: (v: string) => void;
  viewMode: 'tabel' | 'kanban';
  onView: (v: 'tabel' | 'kanban') => void;
  toonLege: boolean;
  onToonLege: (v: boolean) => void;
  alleenAchterstallig: boolean;
  onAlleenAchterstallig: (v: boolean) => void;
}

// KPI-balk + fasegroepen + werkbalk in één blok, zodat zoeken, filteren en
// weergave bij elkaar staan in plaats van verspreid over de pagina.
export default function PipelineHeader({
  kpi, groep, onGroep, aantalPerGroep, zoek, onZoek, viewMode, onView,
  toonLege, onToonLege, alleenAchterstallig, onAlleenAchterstallig,
}: Props) {
  const filtersActief = Boolean(zoek.trim()) || alleenAchterstallig;

  return (
    <div className="space-y-3">
      {/* Alleen cijfers die uit bestaande data volgen. Een KPI als
          "goedgekeurd deze maand" ontbreekt bewust: Compass legt geen datum
          van fasewijziging vast, dus die zou verzonnen zijn. */}
      <div className="flex flex-wrap items-stretch gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
        <div className="flex-1 min-w-[150px] bg-white px-4 py-2.5">
          <p className="text-xs text-slate-500">Actieve dossiers</p>
          <p className="text-lg font-semibold text-slate-900 tabular-nums">{kpi.actief}</p>
        </div>
        <div className="flex-1 min-w-[170px] bg-white px-4 py-2.5">
          <p className="text-xs text-slate-500">Open pipelinewaarde</p>
          <p className="text-lg font-semibold text-slate-900 tabular-nums">
            {kpi.pipelinewaarde > 0 ? euro(kpi.pipelinewaarde) : '—'}
          </p>
          {kpi.pipelinewaarde > 0 && (
            <p className="text-[11px] text-slate-400">op basis van {kpi.waardeVanAantal} dossiers met bedrag</p>
          )}
        </div>
        <div className="flex-1 min-w-[150px] bg-white px-4 py-2.5">
          <p className="text-xs text-slate-500">Opvolging nodig</p>
          <p className={`text-lg font-semibold tabular-nums ${kpi.opvolgingNodig > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {kpi.opvolgingNodig}
          </p>
        </div>
      </div>

      {/* Fasegroepen: dagelijkse pipeline gescheiden van inactieve dossiers. */}
      <div className="flex flex-wrap items-center gap-1">
        {FASE_GROEPEN.map(g => {
          const actief = groep === g.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => onGroep(g.key)}
              aria-pressed={actief}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                actief ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {g.key !== 'alles' && (
                <span className={`h-2 w-2 rounded-full ${GROEP_KLEUR[g.key]} ${actief ? '' : 'opacity-70'}`} aria-hidden="true" />
              )}
              {g.label}
              {aantalPerGroep[g.key] !== undefined && (
                <span className={`tabular-nums text-xs ${actief ? 'text-white/70' : 'text-slate-400'}`}>
                  {aantalPerGroep[g.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sticky werkbalk: blijft bereikbaar tijdens het scrollen door het bord. */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 backdrop-blur">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={zoek}
            onChange={e => onZoek(e.target.value)}
            placeholder="Zoek op naam, adres, dossiernummer of e-mail…"
            className="h-9 pl-9"
            aria-label="Dossiers doorzoeken"
          />
        </div>

        <button
          type="button"
          onClick={() => onAlleenAchterstallig(!alleenAchterstallig)}
          aria-pressed={alleenAchterstallig}
          className={`h-9 rounded-lg border px-3 text-sm font-medium transition-colors ${
            alleenAchterstallig
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Achterstallig
        </button>

        <label className="flex h-9 cursor-pointer select-none items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50">
          <input
            type="checkbox"
            checked={toonLege}
            onChange={e => onToonLege(e.target.checked)}
            className="accent-primary"
          />
          Lege fases
        </label>

        {filtersActief && (
          <button
            type="button"
            onClick={() => { onZoek(''); onAlleenAchterstallig(false); }}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-slate-500 hover:text-slate-900"
          >
            <X className="h-3.5 w-3.5" /> Filters wissen
          </button>
        )}

        <div className="ml-auto inline-flex overflow-hidden rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => onView('kanban')}
            aria-pressed={viewMode === 'kanban'}
            title="Kanbanweergave"
            className={`flex h-9 items-center gap-1.5 px-3 text-sm font-medium transition-colors ${
              viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid className="h-4 w-4" /> Kanban
          </button>
          <button
            type="button"
            onClick={() => onView('tabel')}
            aria-pressed={viewMode === 'tabel'}
            title="Tabelweergave"
            className={`flex h-9 items-center gap-1.5 px-3 text-sm font-medium transition-colors ${
              viewMode === 'tabel' ? 'bg-primary text-primary-foreground' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Rows3 className="h-4 w-4" /> Tabel
          </button>
        </div>
      </div>
    </div>
  );
}
