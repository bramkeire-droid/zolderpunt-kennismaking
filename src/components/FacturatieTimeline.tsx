import { useState } from 'react';
import { Minus, Plus, FileSignature, Hammer, CheckCircle2 } from 'lucide-react';

export default function FacturatieTimeline() {
  const [weken, setWeken] = useState(5);
  const minWeken = 1;
  const maxWeken = 12;
  const tussenPct = 60;
  const perWeek = +(tussenPct / weken).toFixed(1);

  return (
    <div className="space-y-10">
      {/* HOOFDFOCUS: drie gescheiden fases */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_2fr_auto_1fr] gap-4 md:gap-6 items-stretch">
        {/* FASE 1 — Voorschot */}
        <div className="bg-primary text-primary-foreground rounded-3xl p-8 flex flex-col items-center text-center shadow-lg">
          <div className="text-xs uppercase tracking-widest opacity-70 mb-2">Fase 1</div>
          <FileSignature className="h-8 w-8 mb-3 opacity-90" />
          <div className="font-headline text-6xl font-bold leading-none mb-3">30%</div>
          <div className="font-headline text-xl font-semibold mb-2">Voorschot</div>
          <div className="text-sm opacity-80">
            Bevestiging offerte<br />en aankoop materialen
          </div>
        </div>

        {/* spacer */}
        <div className="hidden md:block w-px bg-border self-stretch" />

        {/* FASE 2 — Uitvoering */}
        <div className="bg-primary/10 border-2 border-primary/20 rounded-3xl p-8 flex flex-col text-center">
          <div className="text-xs uppercase tracking-widest text-primary/70 mb-2">Fase 2</div>
          <Hammer className="h-8 w-8 mb-3 mx-auto text-primary" />
          <div className="font-headline text-6xl font-bold leading-none mb-3 text-primary">60%</div>
          <div className="font-headline text-xl font-semibold mb-4 text-foreground">Uitvoering</div>

          {/* Week-balk */}
          <div className="flex h-12 rounded-xl overflow-hidden border border-primary/30 mb-2">
            {Array.from({ length: weken }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/30 border-r border-background/60 last:border-r-0 flex items-center justify-center text-primary font-semibold text-xs"
              >
                {weken <= 8 ? `${perWeek}%` : ''}
              </div>
            ))}
          </div>
          <div className="text-sm text-foreground/70">
            {weken}× wekelijkse factuur · <span className="font-semibold text-primary">{perWeek}% per week</span>
          </div>
        </div>

        {/* spacer */}
        <div className="hidden md:block w-px bg-border self-stretch" />

        {/* FASE 3 — Oplevering */}
        <div className="bg-secondary text-secondary-foreground rounded-3xl p-8 flex flex-col items-center text-center shadow-lg">
          <div className="text-xs uppercase tracking-widest opacity-70 mb-2">Fase 3</div>
          <CheckCircle2 className="h-8 w-8 mb-3 opacity-90" />
          <div className="font-headline text-6xl font-bold leading-none mb-3">10%</div>
          <div className="font-headline text-xl font-semibold mb-2">Oplevering</div>
          <div className="text-sm opacity-80">
            Project volledig<br />afgerond
          </div>
        </div>
      </div>

      {/* SECUNDAIR: compacte toggle + voetnoot */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="text-sm text-foreground/60">Duur project:</span>
          <button
            onClick={() => setWeken(w => Math.max(minWeken, w - 1))}
            disabled={weken <= minWeken}
            className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors disabled:opacity-40"
            aria-label="Minder weken"
          >
            <Minus className="h-3 w-3" />
          </button>
          <div className="font-headline font-bold text-foreground w-16 text-center text-sm">
            {weken} {weken === 1 ? 'week' : 'weken'}
          </div>
          <button
            onClick={() => setWeken(w => Math.min(maxWeken, w + 1))}
            disabled={weken >= maxWeken}
            className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors disabled:opacity-40"
            aria-label="Meer weken"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <p className="text-xs text-foreground/50 text-center md:text-right">
          Wekelijkse facturen op vrijdag · betalingstermijn 7 dagen · 6% btw bij woningen ouder dan 10 jaar, anders 21%
        </p>
      </div>
    </div>
  );
}
