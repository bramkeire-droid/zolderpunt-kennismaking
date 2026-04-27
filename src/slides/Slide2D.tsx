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

        <div className="grid grid-cols-3 gap-10">
          {CLUSTERS.map(cluster => {
            const c = CLUSTER_COLORS[cluster.color];
            const ClusterIcon = cluster.icon;
            return (
              <div
                key={cluster.id}
                className={`rounded-3xl p-6 ${c.bgSoft}/60`}
              >
                {/* Cluster header */}
                <div className="flex items-center gap-4 mb-6 px-1">
                  <div
                    className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${c.bgSolid}`}
                  >
                    <ClusterIcon className={`h-7 w-7 ${c.iconOnSolid}`} strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-bold tracking-[1.6px] uppercase ${c.text}`}>
                      {cluster.ondertitel}
                    </div>
                    <h3 className="text-2xl font-headline font-bold text-foreground leading-tight [text-wrap:balance] hyphens-none">
                      {cluster.titel}
                    </h3>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-4">
                  {cluster.vragen.map(vraag => {
                    const isSelected = selected.includes(vraag.id);
                    const VraagIcon = vraag.icon;
                    return (
                      <button
                        key={vraag.id}
                        onClick={() => toggle(vraag.id)}
                        className={`relative text-left p-5 rounded-2xl border-2 bg-card transition-all duration-200
                          ${isSelected
                            ? `${c.border} ${c.shadow} -translate-y-0.5`
                            : `border-transparent hover:-translate-y-0.5 hover:shadow-md ${c.borderSoft}`
                          }`}
                      >
                        {/* Selected check badge */}
                        {isSelected && (
                          <div
                            className={`absolute -top-2 -right-2 w-7 h-7 rounded-full ${c.bgSolid} flex items-center justify-center shadow-sm`}
                          >
                            <Check className={`h-4 w-4 ${c.iconOnSolid}`} strokeWidth={3} />
                          </div>
                        )}

                        <div className="flex items-start gap-4">
                          <div
                            className={`shrink-0 w-[3.3rem] h-[3.3rem] rounded-xl flex items-center justify-center transition-colors
                              ${isSelected ? c.bgSolid : c.bgSoft}`}
                          >
                            <VraagIcon
                              className={`h-6 w-6 ${isSelected ? c.iconOnSolid : c.iconText}`}
                              strokeWidth={2.2}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-xl font-headline font-bold text-foreground leading-tight mb-1.5 [text-wrap:balance] hyphens-none"
                            >
                              {vraag.titel}
                            </div>
                            <div className="text-[15px] text-muted-foreground font-body leading-relaxed [text-wrap:pretty] hyphens-none">
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
