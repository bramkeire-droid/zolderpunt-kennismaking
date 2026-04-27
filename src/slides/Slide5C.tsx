import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { useSession } from '@/contexts/SessionContext';
import { ALL_VRAGEN, getClusterForVraag } from '@/data/gespreksvragen';
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
        <h2 className="text-5xl lg:text-6xl font-headline font-bold text-foreground mb-3">
          Is alles duidelijk?
        </h2>
        <p className="text-xl text-muted-foreground font-body mb-8">
          Vink aan wat we al besproken hebben. Niet aangevinkt? Dan pakken we het nu nog even op.
        </p>

        {count === 0 ? (
          <div className="bg-muted border border-border p-12 text-center">
            <p className="text-2xl font-headline text-foreground mb-3">
              Geen specifieke vragen om te overlopen.
            </p>
            <p className="text-lg text-muted-foreground font-body">
              Er zijn vooraan in het gesprek geen specifieke vragen geselecteerd.
            </p>
          </div>
        ) : (
          <>
            <div className={`grid ${cols} gap-5 mx-auto`}>
              {selectedVragen.map(vraag => {
                const cluster = getClusterForVraag(vraag.id);
                const isDone = beantwoord.includes(vraag.id);
                return (
                  <button
                    key={vraag.id}
                    onClick={() => toggleBeantwoord(vraag.id)}
                    className={`text-left p-5 border-2 transition-all ${
                      isDone
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <div className="text-xs font-bold tracking-widest text-primary mb-2">
                      {cluster?.titel.toUpperCase()}
                    </div>
                    <div className="flex items-start gap-4">
                      <div
                        className={`shrink-0 w-11 h-11 flex items-center justify-center font-headline font-bold transition-all border-2 ${
                          isDone
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-muted-foreground border-border'
                        }`}
                      >
                        {isDone ? <Check className="h-5 w-5" /> : vraag.nummer}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`text-xl font-headline font-bold mb-1 leading-tight ${
                            isDone ? 'text-foreground' : 'text-foreground'
                          }`}
                        >
                          {vraag.titel}
                        </div>
                        <div className="text-base text-muted-foreground font-body leading-snug">
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
