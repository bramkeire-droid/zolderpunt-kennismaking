import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import DossierCard from './DossierCard';
import { GROEP_KLEUR, groepVanFase, dossierWaarde, euroKort, type FaseGroepKey } from '@/lib/pipeline';

export interface KanbanColumn {
  key: string;
  label: string;
  accent: string;
  phaseId: number | null;
}

interface Props {
  columns: KanbanColumn[];
  grouped: Record<string, any[]>;
  preIntakeMap: Record<string, any>;
  draggingId: string | null;
  dragOverKey: string | null;
  activeLeadId?: string | null;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onDragOverColumn: (key: string | null) => void;
  onDropOnColumn: (key: string) => void;
  onOpenLead: (lead: any) => void;
  onSelectLead: (lead: any) => void;
}

// Eén horizontale rij die nooit afbreekt: kolommen naast elkaar in een vaste
// breedte, met de hele rij horizontaal scrollbaar. Wrappen over meerdere rijen
// maakt de pipeline-volgorde onleesbaar.
const KOLOM_BREEDTE = 300;

export default function KanbanBoard({
  columns, grouped, preIntakeMap, draggingId, dragOverKey, activeLeadId,
  onDragStart, onDragEnd, onDragOverColumn, onDropOnColumn, onOpenLead, onSelectLead,
}: Props) {
  const [ingeklapt, setIngeklapt] = useState<Record<string, boolean>>({});

  if (columns.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500">
        Geen fases in deze weergave.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 items-start">
        {columns.map(col => {
          const rows = grouped[col.key] ?? [];
          const isTarget = dragOverKey === col.key;
          const dicht = ingeklapt[col.key];
          const groep: FaseGroepKey | null = groepVanFase(col.phaseId);
          const totaal = rows.reduce((som, l) => som + (dossierWaarde(l) ?? 0), 0);

          return (
            <section
              key={col.key}
              onDragOver={(e) => { if (draggingId) { e.preventDefault(); onDragOverColumn(col.key); } }}
              onDragLeave={() => onDragOverColumn(null)}
              onDrop={(e) => { e.preventDefault(); onDropOnColumn(col.key); }}
              style={{ width: dicht ? 56 : KOLOM_BREEDTE, minWidth: dicht ? 56 : KOLOM_BREEDTE }}
              className={`shrink-0 rounded-lg border bg-slate-100/70 transition-colors ${
                isTarget ? 'border-primary ring-2 ring-primary/25 bg-primary/5' : 'border-slate-200'
              }`}
            >
              {/* Sticky kop: bij verticaal scrollen blijft zichtbaar in welke fase je kijkt. */}
              <header className="sticky top-0 z-10 rounded-t-lg bg-slate-100/95 backdrop-blur px-2.5 py-2 border-b border-slate-200">
                {dicht ? (
                  <button
                    type="button"
                    onClick={() => setIngeklapt(p => ({ ...p, [col.key]: false }))}
                    className="flex h-full w-full flex-col items-center gap-2 py-1 text-slate-600 hover:text-slate-900"
                    title={`${col.label} uitklappen`}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-xs font-semibold tabular-nums">{rows.length}</span>
                  </button>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      {groep && <span className={`h-2 w-2 shrink-0 rounded-full ${GROEP_KLEUR[groep]}`} aria-hidden="true" />}
                      <h3 className="flex-1 truncate text-sm font-semibold text-slate-900" title={col.label}>
                        {col.label}
                      </h3>
                      <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
                        {rows.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIngeklapt(p => ({ ...p, [col.key]: true }))}
                        aria-label={`${col.label} inklappen`}
                        title="Kolom inklappen"
                        className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {totaal > 0 && (
                      <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">{euroKort(totaal)}</p>
                    )}
                  </>
                )}
              </header>

              {!dicht && (
                <div className="space-y-2 p-2">
                  {rows.map(lead => (
                    <DossierCard
                      key={lead.id}
                      lead={lead}
                      preIntake={preIntakeMap[lead.id]}
                      isActief={activeLeadId === lead.id}
                      isDragging={draggingId === lead.id}
                      onOpen={() => onOpenLead(lead)}
                      onSelect={() => onSelectLead(lead)}
                      onDragStart={() => onDragStart(lead.id)}
                      onDragEnd={onDragEnd}
                    />
                  ))}
                  {rows.length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-400">Leeg</p>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
