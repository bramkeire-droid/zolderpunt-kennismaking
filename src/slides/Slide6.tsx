import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function Slide6() {
  const { lead } = useSession();
  const hasData = lead.budget_min && lead.budget_max;

  return (
    <SlideLayout variant="blue">
      <div className="flex flex-col items-center w-full max-w-3xl">
        <div className="label-style text-primary-foreground/60 mb-2">EERSTE INDICATIE</div>
        <h2 className="text-4xl font-headline font-bold text-primary-foreground mb-10">
          Wat mag je verwachten?
        </h2>

        {hasData ? (
          <>
            {/* Central price card */}
            <div className="bg-background rounded-2xl p-10 w-full max-w-lg text-center shadow-2xl">
              <div className="text-4xl lg:text-5xl font-headline font-bold text-foreground mb-2">
                {fmt(lead.budget_min!)} — {fmt(lead.budget_max!)}
              </div>
              <div className="text-sm text-muted-foreground mb-4">excl. BTW</div>
              <div className="text-lg font-bold text-primary font-headline">
                {fmt(lead.budget_incl6!)} incl. 6% BTW
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {fmt(lead.budget_incl21!)} incl. 21% BTW
              </div>
            </div>

            {/* Included items chips */}
            {lead.inbegrepen_posten.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-8">
                {lead.inbegrepen_posten.map((post, i) => (
                  <span key={i} className="bg-primary-foreground/10 text-primary-foreground px-4 py-2 rounded-full text-base font-medium backdrop-blur-sm">
                    ✓ {post.post} — {fmt(post.bedrag)}
                  </span>
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="flex gap-4 mt-8 w-full max-w-lg">
              <div className="flex-1 bg-primary-foreground/10 rounded-lg p-4 text-sm text-primary-foreground backdrop-blur-sm">
                ⚠ Schilderwerk niet inbegrepen
              </div>
              <div className="flex-1 bg-primary-foreground/10 rounded-lg p-4 text-sm text-primary-foreground backdrop-blur-sm">
                ℹ Airco apart vermeld
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-primary-foreground/50 text-xs mt-8 text-center">
              Indicatieve raming ±15%. Definitieve prijs na plaatsbezoek.
            </p>
          </>
        ) : (
          <div className="bg-primary-foreground/10 rounded-2xl p-10 text-center text-primary-foreground/60 backdrop-blur-sm">
            <p className="text-lg">Vul eerst de calculator in om de prijsindicatie te tonen.</p>
          </div>
        )}
      </div>
    </SlideLayout>
  );
}
