import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { useSession } from '@/contexts/SessionContext';
import { CLUSTERS, CLUSTER_COLORS } from '@/data/gespreksvragen';
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
        <h2 className="text-5xl lg:text-6xl font-headline font-bold text-foreground mb-3 leading-tight">
          Wat willen jullie vandaag te weten komen?
        </h2>
        <p className="text-xl text-muted-foreground font-body mb-10 max-w-2xl">
          Kies vrij wat voor jullie belangrijk is — geen verkeerd antwoord.
        </p>

        <div className="grid grid-cols-3 gap-5">
          {CLUSTERS.map(cluster => {
            const c = CLUSTER_COLORS[cluster.color];
            const ClusterIcon = cluster.icon;
            return (
              <div
                key={cluster.id}
                className={`rounded-3xl p-5 ${c.bgSoft}/60`}
              >
                {/* Cluster header */}
                <div className="flex items-center gap-3 mb-5 px-1">
                  <div
                    className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${c.bgSolid}`}
                  >
                    <ClusterIcon className={`h-6 w-6 ${c.iconOnSolid}`} strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[11px] font-bold tracking-[1.6px] uppercase ${c.text}`}>
                      {cluster.ondertitel}
                    </div>
                    <h3 className="text-xl font-headline font-bold text-foreground leading-tight">
                      {cluster.titel}
                    </h3>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-3">
                  {cluster.vragen.map(vraag => {
                    const isSelected = selected.includes(vraag.id);
                    const VraagIcon = vraag.icon;
                    return (
                      <button
                        key={vraag.id}
                        onClick={() => toggle(vraag.id)}
                        className={`relative text-left p-4 rounded-2xl border-2 bg-card transition-all duration-200
                          ${isSelected
                            ? `${c.border} ${c.shadow} -translate-y-0.5`
                            : `border-transparent hover:-translate-y-0.5 hover:shadow-md ${c.borderSoft}`
                          }`}
                      >
                        {/* Selected check badge */}
                        {isSelected && (
                          <div
                            className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${c.bgSolid} flex items-center justify-center shadow-sm`}
                          >
                            <Check className={`h-4 w-4 ${c.iconOnSolid}`} strokeWidth={3} />
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div
                            className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors
                              ${isSelected ? c.bgSolid : c.bgSoft}`}
                          >
                            <VraagIcon
                              className={`h-5 w-5 ${isSelected ? c.iconOnSolid : c.iconText}`}
                              strokeWidth={2.2}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-lg font-headline font-bold text-foreground leading-tight mb-0.5">
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
              </div>
            );
          })}
        </div>

        <p className="text-base text-muted-foreground font-body mt-8 text-center">
          {selected.length === 0
            ? 'Tik gerust de onderwerpen aan die jullie bezighouden — alles mag.'
            : `${selected.length} ${selected.length === 1 ? 'onderwerp' : 'onderwerpen'} gekozen — top, hierop focussen we vandaag.`}
        </p>
      </div>
    </SlideLayout>
  );
}
