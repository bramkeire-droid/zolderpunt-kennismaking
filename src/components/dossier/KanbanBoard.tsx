import { Phone, Mail, Image as ImageIcon, MoreHorizontal } from 'lucide-react';

// Kanban met dezelfde kolommen als BouwFlow, maar bewust NIET horizontaal
// scrollend: met 24 fases (Verkoop + Uitvoering samen) zou je de helft nooit
// zien. De kolommen wrappen daarom over meerdere rijen.

export interface KanbanColumn {
  key: string;
  label: string;
  accent: string;
  phaseId: number | null;
}

interface Props {
  columns: KanbanColumn[];
  grouped: Record<string, any[]>;
  draggingId: string | null;
  dragOverKey: string | null;
  activeLeadId?: string | null;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onDragOverColumn: (key: string | null) => void;
  onDropOnColumn: (key: string) => void;
  /** Kaart aanklikken: dossier openen. */
  onOpenLead: (lead: any) => void;
  /** Actieknopje op de kaart: enkel selecteren, dossier blijft dicht. */
  onSelectLead?: (lead: any) => void;
  showEmpty: boolean;
}

// De border-l-* klasse hergebruiken als gekleurde balk in de kolomkop.
const accentToBg = (accent: string) => accent.replace('border-l-', 'bg-');

const euro = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function KanbanBoard({
  columns, grouped, draggingId, dragOverKey, activeLeadId,
  onDragStart, onDragEnd, onDragOverColumn, onDropOnColumn, onOpenLead, onSelectLead, showEmpty,
}: Props) {
  const visible = showEmpty ? columns : columns.filter(c => (grouped[c.key] ?? []).length > 0);

  return (
    <div className="grid gap-4 items-start [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      {visible.map(col => {
        const rows = grouped[col.key] ?? [];
        const isTarget = dragOverKey === col.key;
        return (
          <section
            key={col.key}
            onDragOver={(e) => { if (draggingId) { e.preventDefault(); onDragOverColumn(col.key); } }}
            onDragLeave={() => onDragOverColumn(null)}
            onDrop={(e) => { e.preventDefault(); onDropOnColumn(col.key); }}
            className={`flex flex-col rounded-lg bg-muted/40 border transition-colors ${
              isTarget ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border'
            }`}
          >
            {/* Kop: kleurbalk als fase-herkenning, titel op één regel leesbaar */}
            <header className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/70">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${accentToBg(col.accent)}`} aria-hidden="true" />
              <h3 className="flex-1 font-headline font-bold text-sm leading-tight text-foreground">
                {col.label}
              </h3>
              <span className="shrink-0 text-xs font-bold px-2 py-0.5 bg-background text-muted-foreground rounded-full tabular-nums">
                {rows.length}
              </span>
            </header>

            {/* Vaste maximumhoogte met eigen scroll: anders bepaalt één volle
                kolom (Geweigerd heeft er 24) de hoogte van het hele bord. */}
            <div className="p-2 space-y-2 min-h-[56px] max-h-[340px] overflow-y-auto">
              {rows.map(lead => {
                const naam = `${lead.voornaam ?? ''} ${lead.achternaam ?? ''}`.trim() || 'Naamloos';
                const heeftFotos = Array.isArray(lead.fotos) && lead.fotos.length > 0;
                const bedrag = lead.offerte_bedrag_excl ?? lead.budget_min;
                const isActief = activeLeadId === lead.id;
                return (
                  <article
                    key={lead.id}
                    draggable
                    onDragStart={(e) => { onDragStart(lead.id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={onDragEnd}
                    onClick={() => onOpenLead(lead)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenLead(lead); } }}
                    className={`group cursor-pointer rounded-md bg-card border p-2.5 shadow-sm hover:shadow-md hover:border-primary/60 transition-all ${
                      draggingId === lead.id ? 'opacity-40' : ''
                    } ${isActief ? 'border-primary ring-1 ring-primary/40' : 'border-border'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-body text-sm font-semibold leading-snug text-foreground break-words">
                        {naam}
                      </p>
                      {onSelectLead && (
                        <button
                          type="button"
                          aria-label="Acties tonen"
                          onClick={(e) => { e.stopPropagation(); onSelectLead(lead); }}
                          className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {bedrag != null && (
                      <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">{euro(bedrag)}</p>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-mono text-[0.68rem] text-muted-foreground">
                        {lead.bouwflow_project_number || '—'}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {lead.telefoon && <Phone className="h-3 w-3" aria-label="telefoon bekend" />}
                        {lead.email && <Mail className="h-3 w-3" aria-label="e-mail bekend" />}
                        {heeftFotos && <ImageIcon className="h-3 w-3" aria-label="heeft foto's" />}
                      </span>
                    </div>

                    {lead.afwijs_reden && (
                      <p
                        className="mt-1.5 text-[0.68rem] text-red-800 bg-red-50 rounded px-1.5 py-0.5 line-clamp-2"
                        title={lead.afwijs_reden}
                      >
                        {lead.afwijs_reden}
                      </p>
                    )}
                  </article>
                );
              })}
              {rows.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-4">Geen dossiers</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
