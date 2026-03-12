import { useSession } from '@/contexts/SessionContext';
import { useEffect, useState, useCallback } from 'react';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import beeldmerk from '@/assets/beeldmerk-blauw.svg';
import { RefreshCw } from 'lucide-react';

export default function Slide9() {
  const { lead, updateLead } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRapport = !!lead.rapport_tekst;

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-rapport-summary', {
        body: {
          voornaam: lead.voornaam,
          achternaam: lead.achternaam,
          adres: lead.adres,
          oppervlakte_m2: lead.oppervlakte_m2,
          gezocht_naar: lead.gezocht_naar,
          gewenst_resultaat: lead.gezocht_naar,
          gesprek_notities: lead.gesprek_notities,
          transcript: lead.transcript,
          inbegrepen_posten: lead.inbegrepen_posten,
          technisch: lead.technisch,
          gesprek_datum: lead.gesprek_datum,
        },
      });

      if (fnError) throw fnError;

      if (data?.fallback) {
        // AI failed — build a basic rapport from available data
        const fallbackRapport = [
          `Rapport voor ${lead.voornaam || 'klant'} ${lead.achternaam || ''}`.trim(),
          `Datum: ${lead.gesprek_datum || new Date().toLocaleDateString('nl-BE')}`,
          '',
          `Situatie: ${lead.adres || '—'}`,
          `Gewenst resultaat: ${lead.gezocht_naar || '—'}`,
          `Oppervlakte: ${lead.oppervlakte_m2 || '?'} m²`,
        ].join('\n');

        updateLead({
          rapport_tekst: fallbackRapport,
          waarde_tekst_ai: 'Extra leefruimte gecreëerd uit ruimte die er al was.',
        });

        if (data?.error) {
          setError(data.error);
        }
        return;
      }

      // AI returned structured narrative texts
      const rapport = [
        `Rapport voor ${lead.voornaam || 'klant'} ${lead.achternaam || ''}`.trim(),
        `Datum: ${lead.gesprek_datum || new Date().toLocaleDateString('nl-BE')}`,
        '',
        '— Situatie —',
        data.situatie_tekst || '',
        '',
        '— Verwachtingen —',
        data.verwachtingen_tekst || '',
        '',
        '— Wat we bespraken —',
        data.besproken_tekst || '',
        '',
        '— Aandachtspunten —',
        data.aandachtspunten_tekst || '',
      ].join('\n');

      updateLead({
        rapport_tekst: rapport,
        waarde_tekst_ai: data.waarde_tekst || 'Extra leefruimte gecreëerd uit ruimte die er al was.',
        rapport_situatie_ai: data.situatie_tekst || '',
        rapport_verwachtingen_ai: data.verwachtingen_tekst || '',
        rapport_besproken_ai: data.besproken_tekst || '',
        rapport_aandachtspunten_ai: data.aandachtspunten_tekst || '',
        rapport_highlights: data.aandachtspunten_tekst || '',
      });
    } catch (e: any) {
      console.error('Rapport generation failed:', e);
      setError('Rapport kon niet automatisch worden gegenereerd. Je kunt het handmatig invullen.');
    } finally {
      setIsGenerating(false);
    }
  }, [lead.voornaam, lead.achternaam, lead.adres, lead.oppervlakte_m2, lead.gezocht_naar, lead.gesprek_notities, lead.transcript, lead.inbegrepen_posten, lead.technisch, lead.gesprek_datum, updateLead]);

  useEffect(() => {
    if (hasRapport || isGenerating) return;
    generate();
  }, [hasRapport, lead.transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegenerate = () => {
    updateLead({
      rapport_tekst: '',
      rapport_highlights: '',
      waarde_tekst_ai: '',
      rapport_situatie_ai: '',
      rapport_verwachtingen_ai: '',
      rapport_besproken_ai: '',
      rapport_aandachtspunten_ai: '',
    });
  };

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
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Opnieuw genereren
              </Button>
            </div>
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
