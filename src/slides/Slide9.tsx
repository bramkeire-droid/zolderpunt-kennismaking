import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Textarea } from '@/components/ui/textarea';
import beeldmerk from '@/assets/beeldmerk-blauw.svg';

export default function Slide9() {
  const { lead, updateLead } = useSession();

  // Placeholder: rapport generation will use edge function with Lovable AI
  const hasRapport = !!lead.rapport_tekst;

  return (
    <SlideLayout>
      <div className="max-w-3xl mx-auto w-full">
        <SlideLabel>RAPPORT PREVIEW</SlideLabel>
        <h2 className="text-4xl font-headline font-bold text-foreground mb-8">
          Klantrapport
        </h2>

        {!hasRapport ? (
          <div className="flex flex-col items-center justify-center py-20">
            <img src={beeldmerk} alt="" className="h-16 animate-pulse mb-6" />
            <p className="text-lg text-muted-foreground font-body">
              Rapport wordt opgemaakt...
            </p>
            <p className="text-sm text-muted-foreground/60 mt-2">
              (AI-rapportgeneratie beschikbaar na Lovable Cloud setup)
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-8">
              <Textarea
                value={lead.rapport_tekst}
                onChange={e => updateLead({ rapport_tekst: e.target.value })}
                className="min-h-[400px] text-base leading-relaxed border-none bg-transparent resize-none focus-visible:ring-0 p-0"
              />
            </div>
          </div>
        )}
      </div>
    </SlideLayout>
  );
}
