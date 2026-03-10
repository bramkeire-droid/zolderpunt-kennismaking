import { useSession } from '@/contexts/SessionContext';
import { useEffect, useState } from 'react';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import beeldmerk from '@/assets/beeldmerk-blauw.svg';

export default function Slide9() {
  const { lead, updateLead } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRapport = !!lead.rapport_tekst;

  // Auto-generate rapport text when arriving at this slide without one
  useEffect(() => {
    if (hasRapport || isGenerating) return;

    const generate = async () => {
      setIsGenerating(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('generate-value-text', {
          body: {
            gewenst_resultaat: lead.gezocht_naar || 'extra leefruimte',
            oppervlakte_m2: lead.oppervlakte_m2 || 0,
          },
        });

        if (fnError) throw fnError;

        const aiText = data?.text || 'Extra leefruimte gecreëerd uit ruimte die er al was.';

        // Build a simple rapport summary
        const rapport = [
          `Rapport voor ${lead.voornaam || 'klant'} ${lead.achternaam || ''}`.trim(),
          `Datum: ${lead.gesprek_datum || new Date().toLocaleDateString('nl-BE')}`,
          '',
          `Situatie: ${lead.adres || '—'}`,
          `Gewenst resultaat: ${lead.gezocht_naar || '—'}`,
          `Oppervlakte: ${lead.oppervlakte_m2 || '?'} m²`,
          '',
          `Waarde: ${aiText}`,
          '',
          `Notities: ${lead.gesprek_notities || '—'}`,
        ].join('\n');

        updateLead({ rapport_tekst: rapport });
      } catch (e: any) {
        console.error('Rapport generation failed:', e);
        setError('Rapport kon niet automatisch worden gegenereerd. Je kunt het handmatig invullen.');
      } finally {
        setIsGenerating(false);
      }
    };

    generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SlideLayout>
      <div className="max-w-3xl mx-auto w-full">
        <SlideLabel>RAPPORT PREVIEW</SlideLabel>
        <h2 className="text-4xl font-headline font-bold text-foreground mb-8">
          Klantrapport
        </h2>

        {!hasRapport && isGenerating ? (
          <div className="flex flex-col items-center justify-center py-20">
            <img src={beeldmerk} alt="" className="h-16 animate-pulse mb-6" />
            <p className="text-lg text-muted-foreground font-body">
              Rapport wordt opgemaakt...
            </p>
          </div>
        ) : error && !hasRapport ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Textarea
              placeholder="Typ hier het rapport..."
              onChange={e => updateLead({ rapport_tekst: e.target.value })}
              className="min-h-[300px] text-base leading-relaxed"
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card border border-border p-8">
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
