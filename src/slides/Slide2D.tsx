import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { useSession } from '@/contexts/SessionContext';
import { CLUSTERS } from '@/data/gespreksvragen';
import { Check } from 'lucide-react';

export default function Slide2D() {
  const { lead, updateLead } = useSession();
  const selected = lead.gespreksvragen?.selected ?? [];

  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter(x => x !== id)
      : [...selected, id];
    updateLead({
      gespreksvragen: {
        selected: next,
        beantwoord: lead.gespreksvragen?.beantwoord ?? [],
      },
    });
  };

  return (
    <SlideLayout showSave>
      <div className="max-w-7xl mx-auto w-full">
        <SlideLabel>JULLIE VRAGEN</SlideLabel>
        <h2 className="text-5xl lg:text-6xl font-headline font-bold text-foreground mb-4">
          Wat willen wij vandaag te weten komen?
        </h2>
        <p className="text-xl text-muted-foreground font-body mb-10">
          Klik de vragen aan die voor jullie belangrijk zijn. We focussen het gesprek hierop.
        </p>

        <div className="grid grid-cols-3 gap-6">
          {CLUSTERS.map((cluster, ci) => (
            <div key={cluster.id} className="flex flex-col">
              <div className="mb-4">
                <div className="text-sm font-bold tracking-widest text-primary mb-2">
                  CLUSTER {ci + 1}
                </div>
                <h3 className="text-2xl font-headline font-bold text-foreground leading-tight">
                  {cluster.titel}
                </h3>
                <div className="h-1 w-12 bg-primary mt-3" />
              </div>

              <div className="flex flex-col gap-3 flex-1">
                {cluster.vragen.map(vraag => {
                  const isSelected = selected.includes(vraag.id);
                  return (
                    <button
                      key={vraag.id}
                      onClick={() => toggle(vraag.id)}
                      className={`text-left p-5 border-2 transition-all relative group ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`shrink-0 w-10 h-10 flex items-center justify-center font-headline font-bold text-lg transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isSelected ? <Check className="h-5 w-5" /> : vraag.nummer}
                        </div>
                        <div className="flex-1">
                          <div className="text-xl font-headline font-bold text-foreground mb-1 leading-tight">
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
            </div>
          ))}
        </div>

        <p className="text-base text-muted-foreground font-body mt-8 text-center">
          {selected.length === 0
            ? 'Nog geen vragen geselecteerd — klik er één of meerdere aan.'
            : `${selected.length} ${selected.length === 1 ? 'vraag' : 'vragen'} geselecteerd.`}
        </p>
      </div>
    </SlideLayout>
  );
}
