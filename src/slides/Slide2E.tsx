import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { useSession } from '@/contexts/SessionContext';
import { ALL_VRAGEN, getClusterForVraag, CLUSTER_COLORS } from '@/data/gespreksvragen';

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
        <h2 className="text-5xl lg:text-6xl font-headline font-bold text-foreground mb-10 leading-tight">
          Dit gaan we vandaag onderzoeken.
        </h2>

        {count === 0 ? (
          <div className="bg-muted rounded-3xl p-12 text-center">
            <p className="text-2xl font-headline text-foreground mb-3">
              Geen specifieke vragen geselecteerd.
            </p>
            <p className="text-lg text-muted-foreground font-body">
              We doorlopen het standaard gesprek en bespreken alles wat relevant is.
            </p>
          </div>
        ) : (
          <div className={`grid ${cols} gap-5 mx-auto`}>
            {selectedVragen.map(vraag => {
              const cluster = getClusterForVraag(vraag.id);
              if (!cluster) return null;
              const c = CLUSTER_COLORS[cluster.color];
              const VraagIcon = vraag.icon;
              return (
                <div
                  key={vraag.id}
                  className={`rounded-2xl p-6 bg-card border-2 ${c.border} ${c.shadow}`}
                >
                  <div className={`text-[11px] font-bold tracking-[1.6px] uppercase ${c.text} mb-3`}>
                    {cluster.ondertitel}
                  </div>
                  <div className="flex items-start gap-4">
                    <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${c.bgSolid}`}>
                      <VraagIcon className={`h-7 w-7 ${c.iconOnSolid}`} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl font-headline font-bold text-foreground mb-1 leading-tight">
                        {vraag.titel}
                      </div>
                      <div className="text-base text-muted-foreground font-body leading-snug">
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
