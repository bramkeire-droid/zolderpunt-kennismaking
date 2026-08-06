import { Phone, Mail, Image as ImageIcon } from 'lucide-react';

// Kanban met dezelfde kolommen als BouwFlow, maar bewust NIET horizontaal
// scrollend: met 24 fases (Verkoop + Uitvoering samen) zou je de helft nooit
// zien. De kolommen wrappen daarom over meerdere rijen, zodat het hele bord
// in één oogopslag past.

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
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onDragOverColumn: (key: string | null) => void;
  onDropOnColumn: (key: string) => void;
  onOpenLead: (lead: any) => void;
  /** Lege kolommen tonen houdt het bord gelijk aan BouwFlow. */
  showEmpty: boolean;
}

// De border-l-* klasse van de tabelweergave omzetten naar een bovenrand,
// zodat de kolomkop dezelfde kleurcodering houdt.
const topAccent = (accent: string) => accent.replace('border-l-', 'border-t-');

export default function KanbanBoard({
  columns, grouped, draggingId, dragOverKey,
  onDragStart, onDragEnd, onDragOverColumn, onDropOnColumn, onOpenLead, showEmpty,
}: Props) {
  const visible = showEmpty ? columns : columns.filter(c => (grouped[c.key] ?? []).length > 0);

  return (
    // items-start: een lege kolom mag niet uitgerekt worden tot de hoogte van
    // de volste kolom in dezelfde rij.
    <div className="grid gap-3 items-start [grid-template-columns:repeat(auto-fill,minmax(175px,1fr))]">
      {visible.map(col => {
        const rows = grouped[col.key] ?? [];
        const isTarget = dragOverKey === col.key;
        return (
          <div
            key={col.key}
            onDragOver={(e) => { if (draggingId) { e.preventDefault(); onDragOverColumn(col.key); } }}
            onDragLeave={() => onDragOverColumn(null)}
            onDrop={(e) => { e.preventDefault(); onDropOnColumn(col.key); }}
            className={`flex flex-col bg-card border border-border border-t-4 ${topAccent(col.accent)} transition-colors ${
              isTarget ? 'ring-2 ring-primary/50 bg-primary/5' : ''
            }`}
          >
            <div className="px-2.5 py-2 border-b border-border">
              <div className="flex items-start justify-between gap-1.5">
                <span className="font-headline font-bold text-[0.7rem] leading-tight text-foreground">
                  {col.label}
                </span>
                <span className="shrink-0 text-[0.6rem] font-bold px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full tabular-nums">
                  {rows.length}
                </span>
              </div>
            </div>

            {/* Vaste maximumhoogte met eigen scroll: anders bepaalt één volle
                kolom (Geweigerd heeft er 24) de hoogte van het hele bord. */}
            <div className="p-1.5 space-y-1.5 min-h-[48px] max-h-[190px] overflow-y-auto">
              {rows.map(lead => {
                const naam = `${lead.voornaam ?? ''} ${lead.achternaam ?? ''}`.trim() || 'Naamloos';
                const heeftFotos = Array.isArray(lead.fotos) && lead.fotos.length > 0;
                return (
                  <button
                    key={lead.id}
                    type="button"
                    draggable
                    onDragStart={(e) => { onDragStart(lead.id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={onDragEnd}
                    onClick={() => onOpenLead(lead)}
                    className={`w-full text-left bg-background border border-border p-2 hover:border-primary/50 hover:bg-accent/40 transition-colors ${
                      draggingId === lead.id ? 'opacity-40' : ''
                    }`}
                  >
                    <p className="font-body text-[0.72rem] font-semibold leading-snug text-foreground break-words">
                      {naam}
                    </p>
                    {lead.bouwflow_project_number && (
                      <p className="font-mono text-[0.6rem] text-muted-foreground mt-0.5">
                        {lead.bouwflow_project_number}
                      </p>
                    )}
                    {(lead.budget_min != null || lead.offerte_bedrag_excl != null) && (
                      <p className="text-[0.62rem] text-muted-foreground mt-0.5 tabular-nums">
                        {new Intl.NumberFormat('nl-BE', {
                          style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
                        }).format(lead.offerte_bedrag_excl ?? lead.budget_min)}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                      {lead.telefoon && <Phone className="h-2.5 w-2.5" aria-label="telefoon bekend" />}
                      {lead.email && <Mail className="h-2.5 w-2.5" aria-label="e-mail bekend" />}
                      {heeftFotos && <ImageIcon className="h-2.5 w-2.5" aria-label="heeft foto's" />}
                      {lead.afwijs_reden && (
                        <span
                          className="text-[0.55rem] font-bold px-1 bg-red-100 text-red-800"
                          title={`Afgewezen: ${lead.afwijs_reden}`}
                        >
                          ?
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {rows.length === 0 && (
                <p className="text-[0.62rem] text-muted-foreground/50 text-center py-3">leeg</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
