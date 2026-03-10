import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Textarea } from '@/components/ui/textarea';

const PROMPTS = [
  'Hoe ziet de zolder er nu uit?',
  'Wie gebruikt de ruimte en hoe?',
  'Wat was de aanleiding?',
  'Wat wil je bereiken — welke ruimte, welk gevoel?',
  'Is dit voor de korte of lange termijn?',
];

export default function Slide4() {
  const { lead, updateLead } = useSession();

  return (
    <SlideLayout>
      <div className="max-w-3xl mx-auto w-full">
        <SlideLabel>LUISTEREN — KLANT PRAAT</SlideLabel>
        <h2 className="text-3xl font-headline font-bold text-foreground mb-8">
          Vertel ons over jullie project
        </h2>

        {/* Conversation prompts - subtle internal card */}
        <div className="bg-muted/50 border border-border rounded-xl p-6 mb-8">
          <p className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-4">
            Gespreksvragen (geheugensteun)
          </p>
          <div className="space-y-2">
            {PROMPTS.map((prompt, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-primary font-bold">→</span>
                <span className="text-sm text-muted-foreground font-body">{prompt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground font-body">
            Aantekeningen
          </label>
          <Textarea
            value={lead.gesprek_notities}
            onChange={e => updateLead({ gesprek_notities: e.target.value })}
            placeholder="Noteer hier de kernpunten uit het gesprek..."
            className="bg-card min-h-[200px] text-base"
          />
        </div>
      </div>
    </SlideLayout>
  );
}
