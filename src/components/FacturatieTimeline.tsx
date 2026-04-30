import { useState } from 'react';
import { Minus, Plus, FileSignature, Hammer, CheckCircle2, Calendar } from 'lucide-react';

export default function FacturatieTimeline() {
  const [weken, setWeken] = useState(5);
  const minWeken = 1;
  const maxWeken = 12;
  const tussenPct = 60;
  const perWeek = +(tussenPct / weken).toFixed(1);

  return (
    <div className="space-y-8 text-lg leading-relaxed">
      <p className="text-foreground/80">
        Een transparant en gespreid betalingsschema. Geen verrassingen, alles op voorhand duidelijk.
      </p>

      {/* Toggle aantal weken */}
      <div className="bg-muted p-5 rounded-2xl flex items-center justify-between gap-4">
        <div>
          <div className="font-headline font-semibold text-foreground">
            Hoe lang duurt het project?
          </div>
          <div className="text-sm text-foreground/60">
            De 60% tussen voorschot en oplevering wordt evenredig verdeeld over de werkweken.
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setWeken(w => Math.max(minWeken, w - 1))}
            disabled={weken <= minWeken}
            className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Minder weken"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="w-24 text-center">
            <div className="font-headline text-3xl font-bold text-primary leading-none">{weken}</div>
            <div className="text-xs uppercase tracking-wide text-foreground/60 mt-1">
              {weken === 1 ? 'week' : 'weken'}
            </div>
          </div>
          <button
            onClick={() => setWeken(w => Math.min(maxWeken, w + 1))}
            disabled={weken >= maxWeken}
            className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Meer weken"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Visuele tijdslijn */}
      <div className="bg-background border border-border rounded-2xl p-6">
        {/* Bovenste balk: 30 / 60 / 10 */}
        <div className="flex h-16 rounded-xl overflow-hidden border border-border">
          <div
            className="bg-primary text-primary-foreground flex items-center justify-center font-headline font-bold text-lg"
            style={{ width: '30%' }}
          >
            30%
          </div>
          <div
            className="bg-primary/20 flex items-stretch"
            style={{ width: '60%' }}
          >
            {Array.from({ length: weken }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-background/60 last:border-r-0 flex items-center justify-center text-primary font-semibold text-sm"
              >
                {weken <= 8 ? `${perWeek}%` : ''}
              </div>
            ))}
          </div>
          <div
            className="bg-secondary text-secondary-foreground flex items-center justify-center font-headline font-bold text-lg"
            style={{ width: '10%' }}
          >
            10%
          </div>
        </div>

        {/* Labels onder de balk */}
        <div className="flex mt-3 text-xs">
          <div style={{ width: '30%' }} className="text-center font-semibold text-foreground/70">
            Voorschot
          </div>
          <div style={{ width: '60%' }} className="text-center font-semibold text-foreground/70">
            {weken}× wekelijkse factuur · {perWeek}% per week
          </div>
          <div style={{ width: '10%' }} className="text-center font-semibold text-foreground/70">
            Oplevering
          </div>
        </div>

        {/* Mijlpaal-iconen */}
        <div className="flex items-center justify-between mt-6 px-2">
          <div className="flex flex-col items-center gap-1 w-24">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <FileSignature className="h-5 w-5" />
            </div>
            <span className="text-xs text-foreground/70 text-center">Bevestiging offerte</span>
          </div>
          <div className="flex-1 border-t border-dashed border-border mx-2" />
          <div className="flex flex-col items-center gap-1 w-24">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
              <Hammer className="h-5 w-5" />
            </div>
            <span className="text-xs text-foreground/70 text-center">Werken in uitvoering</span>
          </div>
          <div className="flex-1 border-t border-dashed border-border mx-2" />
          <div className="flex flex-col items-center gap-1 w-24">
            <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="text-xs text-foreground/70 text-center">Project volledig afgerond</span>
          </div>
        </div>
      </div>

      {/* Detail-uitleg */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-muted p-5 rounded-2xl">
          <div className="font-headline text-2xl font-bold text-primary mb-1">30%</div>
          <div className="font-headline font-semibold text-foreground">Voorschot</div>
          <div className="text-sm text-foreground/70 mt-1">
            Bevestiging offerte en aankoop materialen.
          </div>
        </div>
        <div className="bg-muted p-5 rounded-2xl">
          <div className="font-headline text-2xl font-bold text-primary mb-1">60%</div>
          <div className="font-headline font-semibold text-foreground">
            Tijdens de werken
          </div>
          <div className="text-sm text-foreground/70 mt-1">
            Verdeeld over {weken} {weken === 1 ? 'week' : 'weken'} — {perWeek}% per week.
          </div>
        </div>
        <div className="bg-muted p-5 rounded-2xl">
          <div className="font-headline text-2xl font-bold text-secondary mb-1">10%</div>
          <div className="font-headline font-semibold text-foreground">Oplevering</div>
          <div className="text-sm text-foreground/70 mt-1">
            Project volledig afgerond.
          </div>
        </div>
      </div>

      {/* Praktische info */}
      <div className="bg-primary/5 border-l-4 border-primary p-5 rounded-r-xl flex items-start gap-3">
        <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <div className="font-headline font-semibold text-foreground mb-1">
            Wekelijkse facturen op vrijdag
          </div>
          <p className="text-foreground/70 text-base">
            Elke vrijdag tijdens de werken ontvang je een factuur, met een betalingstermijn
            van 7 dagen. Btw: 6% voor woningen ouder dan 10 jaar, anders 21%.
          </p>
        </div>
      </div>
    </div>
  );
}
