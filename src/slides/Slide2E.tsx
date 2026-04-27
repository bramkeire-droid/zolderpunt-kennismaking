import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { useSession } from '@/contexts/SessionContext';
import { ALL_VRAGEN, getClusterForVraag } from '@/data/gespreksvragen';

export default function Slide2E() {
  const { lead } = useSession();
  const selectedIds = lead.gespreksvragen?.selected ?? [];

  // Preserve original cluster order
  const selectedVragen = ALL_VRAGEN.filter(v => selectedIds.includes(v.id));

  const count = selectedVragen.length;
  const cols =
    count <= 2 ? 'grid-cols-1 max-w-3xl' :
    count <= 4 ? 'grid-cols-2 max-w-5xl' :
    'grid-cols-3 max-w-7xl';

  return (
    <SlideLayout>
      <div className="max-w-7xl mx-auto w-full">
        <SlideLabel>ONZE FOCUS VANDAAG</SlideLabel>
        <h2 className="text-5xl lg:text-6xl font-headline font-bold text-foreground mb-10">
          Dit gaan we vandaag onderzoeken.
        </h2>

        {count === 0 ? (
          <div className="bg-muted border border-border p-12 text-center">
            <p className="text-2xl font-headline text-foreground mb-3">
              Geen specifieke vragen geselecteerd.
            </p>
            <p className="text-lg text-muted-foreground font-body">
              We doorlopen het standaard gesprek en bespreken alles wat relevant is.
            </p>
          </div>
        ) : (
          <div className={`grid ${cols} gap-6 mx-auto`}>
            {selectedVragen.map(vraag => {
              const cluster = getClusterForVraag(vraag.id);
              return (
                <div
                  key={vraag.id}
                  className="border-2 border-primary bg-primary/5 p-6 shadow-md"
                >
                  <div className="text-xs font-bold tracking-widest text-primary mb-3">
                    {cluster?.titel.toUpperCase()}
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 flex items-center justify-center font-headline font-bold text-xl bg-primary text-primary-foreground">
                      {vraag.nummer}
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-headline font-bold text-foreground mb-2 leading-tight">
                        {vraag.titel}
                      </div>
                      <div className="text-lg text-muted-foreground font-body leading-snug">
                        {vraag.ondertekst}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SlideLayout>
  );
}
