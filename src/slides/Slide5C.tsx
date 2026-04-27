import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { useSession } from '@/contexts/SessionContext';
import { ALL_VRAGEN, getClusterForVraag, CLUSTER_COLORS } from '@/data/gespreksvragen';
import { Check } from 'lucide-react';

export default function Slide5C() {
  const { lead, updateLead } = useSession();
  const selectedIds = lead.gespreksvragen?.selected ?? [];
  const beantwoord = lead.gespreksvragen?.beantwoord ?? [];

  const selectedVragen = ALL_VRAGEN.filter(v => selectedIds.includes(v.id));

  const toggleBeantwoord = (id: string) => {
    const next = beantwoord.includes(id)
      ? beantwoord.filter(x => x !== id)
      : [...beantwoord, id];
    updateLead({
      gespreksvragen: {
        selected: selectedIds,
        beantwoord: next,
      },
    });
  };

  const count = selectedVragen.length;
  const cols =
    count <= 2 ? 'grid-cols-1 max-w-3xl' :
    count <= 4 ? 'grid-cols-2 max-w-5xl' :
    'grid-cols-3 max-w-7xl';

  const aantalBeantwoord = selectedVragen.filter(v => beantwoord.includes(v.id)).length;

  return (
    <SlideLayout showSave>
      <div className="max-w-7xl mx-auto w-full">
        <SlideLabel>RECAP</SlideLabel>
        <h2 className="text-5xl lg:text-6xl font-headline font-bold text-foreground mb-3 leading-tight">
          Is alles duidelijk?
        </h2>
        <p className="text-xl text-muted-foreground font-body mb-8">
          Vink aan wat we al besproken hebben. Niet aangevinkt? Dan pakken we het nu nog op.
        </p>

        {count === 0 ? (
          <div className="bg-muted rounded-3xl p-12 text-center">
            <p className="text-2xl font-headline text-foreground mb-3">
              Geen specifieke vragen om te overlopen.
            </p>
            <p className="text-lg text-muted-foreground font-body">
              Er zijn vooraan in het gesprek geen specifieke vragen geselecteerd.
            </p>
          </div>
        ) : (
          <>
            <div className={`grid ${cols} gap-4 mx-auto`}>
              {selectedVragen.map(vraag => {
                const cluster = getClusterForVraag(vraag.id);
                if (!cluster) return null;
                const c = CLUSTER_COLORS[cluster.color];
                const VraagIcon = vraag.icon;
                const isDone = beantwoord.includes(vraag.id);
                return (
                  <button
                    key={vraag.id}
                    onClick={() => toggleBeantwoord(vraag.id)}
                    className={`relative text-left p-5 rounded-2xl border-2 bg-card transition-all duration-200
                      ${isDone
                        ? `${c.border} ${c.shadow}`
                        : 'border-border hover:border-foreground/20 hover:shadow-sm'
                      }`}
                  >
                    {isDone && (
                      <div
                        className={`absolute -top-2 -right-2 w-7 h-7 rounded-full ${c.bgSolid} flex items-center justify-center shadow-sm`}
                      >
                        <Check className={`h-4 w-4 ${c.iconOnSolid}`} strokeWidth={3} />
                      </div>
                    )}

                    <div className={`text-[11px] font-bold tracking-[1.6px] uppercase ${c.text} mb-2`}>
                      {cluster.ondertitel}
                    </div>
                    <div className="flex items-start gap-3">
                      <div
                        className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                          ${isDone ? c.bgSolid : c.bgSoft}`}
                      >
                        <VraagIcon
                          className={`h-6 w-6 ${isDone ? c.iconOnSolid : c.iconText}`}
                          strokeWidth={2.2}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xl font-headline font-bold text-foreground leading-tight mb-0.5">
                          {vraag.titel}
                        </div>
                        <div className="text-sm text-muted-foreground font-body leading-snug">
                          {vraag.ondertekst}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-base text-muted-foreground font-body mt-8 text-center">
              {aantalBeantwoord} van {count} besproken.
            </p>
          </>
        )}
      </div>
    </SlideLayout>
  );
}
