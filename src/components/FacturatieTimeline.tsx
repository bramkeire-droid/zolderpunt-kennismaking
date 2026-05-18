import { useState } from 'react';
import { Minus, Plus, FileSignature, Hammer, CheckCircle2 } from 'lucide-react';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function FacturatieTimeline() {
  const [weken, setWeken] = useState(5);
  const [bedrag, setBedrag] = useState(30000);
  const minWeken = 1;
  const maxWeken = 12;
  const minBedrag = 5000;
  const maxBedrag = 200000;
  const stapBedrag = 5000;

  const tussenPct = 60;
  const perWeek = +(tussenPct / weken).toFixed(1);

  const voorschotBedrag = bedrag * 0.30;
  const uitvoeringBedrag = bedrag * 0.60;
  const opleveringBedrag = bedrag * 0.10;
  const perWeekBedrag = uitvoeringBedrag / weken;

  return (
    <div className="space-y-10">
      {/* PRIMAIRE FOCUS: invulkaders uit het gesprek */}
      <div>
        <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-3 text-center">
          In te vullen tijdens het gesprek
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bedrag invulkader */}
          <div className="bg-card border-2 border-primary rounded-2xl p-6 shadow-lg">
            <div className="text-sm font-semibold text-foreground/70 mb-4 text-center">
              Totaalbedrag project
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setBedrag(b => Math.max(minBedrag, b - stapBedrag))}
                disabled={bedrag <= minBedrag}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 shadow"
                aria-label="Lager bedrag"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="font-headline font-bold text-primary text-4xl md:text-5xl tabular-nums w-56 text-center">
                {fmtEur(bedrag)}
              </div>
              <button
                onClick={() => setBedrag(b => Math.min(maxBedrag, b + stapBedrag))}
                disabled={bedrag >= maxBedrag}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 shadow"
                aria-label="Hoger bedrag"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="text-xs text-foreground/50 text-center mt-3">Stappen van € 5.000</div>
          </div>

          {/* Weken invulkader */}
          <div className="bg-card border-2 border-primary rounded-2xl p-6 shadow-lg">
            <div className="text-sm font-semibold text-foreground/70 mb-4 text-center">
              Duur van de uitvoering
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setWeken(w => Math.max(minWeken, w - 1))}
                disabled={weken <= minWeken}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 shadow"
                aria-label="Minder weken"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="font-headline font-bold text-primary text-4xl md:text-5xl tabular-nums w-56 text-center">
                {weken} {weken === 1 ? 'week' : 'weken'}
              </div>
              <button
                onClick={() => setWeken(w => Math.min(maxWeken, w + 1))}
                disabled={weken >= maxWeken}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 shadow"
                aria-label="Meer weken"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="text-xs text-foreground/50 text-center mt-3">Wekelijkse factuur op vrijdag</div>
          </div>
        </div>
      </div>

      {/* SECUNDAIR: verdeling fases — compacter, ter info */}
      <div>
        <div className="text-xs uppercase tracking-widest text-foreground/50 font-medium mb-3 text-center">
          Verdeling facturatie
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* FASE 1 */}
          <div className="bg-muted/40 border border-border rounded-xl p-4 flex items-center gap-3">
            <FileSignature className="h-5 w-5 text-primary/70 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-foreground/50">Fase 1 · Voorschot</div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline font-bold text-primary text-lg">30%</span>
                <span className="font-headline font-semibold text-foreground text-base tabular-nums">
                  {fmtEur(voorschotBedrag)}
                </span>
              </div>
            </div>
          </div>

          {/* FASE 2 */}
          <div className="bg-muted/40 border border-border rounded-xl p-4 flex items-center gap-3">
            <Hammer className="h-5 w-5 text-primary/70 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-foreground/50">
                Fase 2 · Uitvoering — {weken}× {perWeek}%
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-headline font-bold text-primary text-lg">60%</span>
                <span className="font-headline font-semibold text-foreground text-base tabular-nums">
                  {fmtEur(uitvoeringBedrag)}
                </span>
                <span className="text-xs text-foreground/60 tabular-nums">
                  ≈ {fmtEur(perWeekBedrag)}/week
                </span>
              </div>
            </div>
          </div>

          {/* FASE 3 */}
          <div className="bg-muted/40 border border-border rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary/70 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-foreground/50">Fase 3 · Oplevering</div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline font-bold text-primary text-lg">10%</span>
                <span className="font-headline font-semibold text-foreground text-base tabular-nums">
                  {fmtEur(opleveringBedrag)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-foreground/40 text-center mt-4">
          Betalingstermijn 7 dagen · 6% btw bij woningen ouder dan 10 jaar, anders 21%
        </p>
      </div>
    </div>
  );
}
