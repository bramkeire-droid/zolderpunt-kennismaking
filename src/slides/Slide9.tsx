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
      const primarySource = lead.transcript?.trim() || lead.gesprek_notities?.trim() || '';

      const [valueRes, notesRes, highlightsRes] = await Promise.all([
        supabase.functions.invoke('generate-value-text', {
          body: {
            gewenst_resultaat: lead.gezocht_naar || 'extra leefruimte',
            oppervlakte_m2: lead.oppervlakte_m2 || 0,
          },
        }),
        primarySource
          ? supabase.functions.invoke('generate-value-text', {
              body: {
                type: 'summarize_notes',
                gewenst_resultaat: lead.gezocht_naar || 'extra leefruimte',
                oppervlakte_m2: lead.oppervlakte_m2 || 0,
                gesprek_notities: primarySource,
                transcript: lead.transcript || '',
              },
            })
          : Promise.resolve({ data: { text: '—' }, error: null }),
        primarySource
          ? supabase.functions.invoke('generate-value-text', {
              body: {
                type: 'extract_highlights',
                gewenst_resultaat: lead.gezocht_naar || 'extra leefruimte',
                oppervlakte_m2: lead.oppervlakte_m2 || 0,
                gesprek_notities: primarySource,
                transcript: lead.transcript || '',
              },
            })
          : Promise.resolve({ data: { text: '' }, error: null }),
      ]);

      if (valueRes.error) throw valueRes.error;

      const aiText = valueRes.data?.text || 'Extra leefruimte gecreëerd uit ruimte die er al was.';
      const notesSummary = notesRes.data?.text || lead.gesprek_notities || '—';

      let highlights = highlightsRes.data?.text || '';
      if (highlights.length > 300) {
        const truncated = highlights.substring(0, 300);
        const lastPeriod = truncated.lastIndexOf('.');
        highlights = lastPeriod > 200 ? truncated.substring(0, lastPeriod + 1) : truncated + '…';
      }

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
        `Samenvatting gesprek:`,
        notesSummary,
      ].join('\n');

      updateLead({
        rapport_tekst: rapport,
        waarde_tekst_ai: aiText,
        rapport_highlights: highlights,
      });
    } catch (e: any) {
      console.error('Rapport generation failed:', e);
      setError('Rapport kon niet automatisch worden gegenereerd. Je kunt het handmatig invullen.');
    } finally {
      setIsGenerating(false);
    }
  }, [lead.transcript, lead.gesprek_notities, lead.gezocht_naar, lead.oppervlakte_m2, lead.voornaam, lead.achternaam, lead.gesprek_datum, lead.adres, updateLead]);

  useEffect(() => {
    if (hasRapport || isGenerating) return;
    generate();
  }, [hasRapport, lead.transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegenerate = () => {
    updateLead({ rapport_tekst: '', rapport_highlights: '', waarde_tekst_ai: '' });
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