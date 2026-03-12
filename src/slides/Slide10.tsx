import { useState, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import ReportDocument from '@/components/report/ReportDocument';
import type { ReportData } from '@/components/report/reportTypes';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

function mapLeadToReportData(lead: ReturnType<typeof useSession>['lead']): ReportData {
  const posten = (lead.inbegrepen_posten || []) as { post: string; bedrag: number }[];

  return {
    voornaam: lead.voornaam,
    achternaam: lead.achternaam,
    adres: lead.adres || '',
    datum_gesprek: lead.gesprek_datum || new Date().toISOString().split('T')[0],
    situatie: lead.rapport_situatie_ai || '',
    verwachtingen: lead.rapport_verwachtingen_ai || '',
    besproken: lead.rapport_besproken_ai || '',
    aandachtspunten: lead.rapport_aandachtspunten_ai || '',
    gewenst_resultaat: lead.gezocht_naar || '—',
    oppervlakte_m2: lead.oppervlakte_m2 || 0,
    prijs_min: lead.budget_min || 0,
    prijs_max: lead.budget_max || 0,
    prijs_incl6: lead.budget_incl6 || 0,
    prijs_incl21: lead.budget_incl21 || 0,
    fotos: (lead.fotos || []).filter(f => f.url).map(f => f.url!),
    waarde_tekst_ai: lead.waarde_tekst_ai || 'Extra leefruimte gecreëerd uit ruimte die er al was.',
    inbegrepen_posten: posten,
  };
}

export default function Slide10() {
  const { lead, updateLead } = useSession();
  const [loading, setLoading] = useState(false);

  const hasAiSummary = !!(lead.rapport_situatie_ai && lead.rapport_verwachtingen_ai && lead.rapport_besproken_ai);

  const generateAiSummary = useCallback(async (): Promise<boolean> => {
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
        if (data?.error) toast.error(data.error);
        return false;
      }

      updateLead({
        rapport_situatie_ai: data.situatie_tekst || '',
        rapport_verwachtingen_ai: data.verwachtingen_tekst || '',
        rapport_besproken_ai: data.besproken_tekst || '',
        rapport_aandachtspunten_ai: data.aandachtspunten_tekst || '',
        waarde_tekst_ai: data.waarde_tekst || 'Extra leefruimte gecreëerd uit ruimte die er al was.',
        rapport_tekst: [
          `Rapport voor ${lead.voornaam || 'klant'} ${lead.achternaam || ''}`.trim(),
          `Datum: ${lead.gesprek_datum || new Date().toLocaleDateString('nl-BE')}`,
          '', '— Situatie —', data.situatie_tekst || '',
          '', '— Verwachtingen —', data.verwachtingen_tekst || '',
          '', '— Wat we bespraken —', data.besproken_tekst || '',
          '', '— Aandachtspunten —', data.aandachtspunten_tekst || '',
        ].join('\n'),
      });
      return true;
    } catch (e) {
      console.error('AI summary generation failed:', e);
      return false;
    }
  }, [lead, updateLead]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Generate AI summary if not yet available
      if (!hasAiSummary) {
        toast.info('AI-samenvatting wordt eerst gegenereerd…');
        const success = await generateAiSummary();
        if (!success) {
          toast.error('AI-samenvatting kon niet gegenereerd worden. Ga eerst naar de Rapport Preview slide.');
          setLoading(false);
          return;
        }
        // Wait briefly for state to propagate
        await new Promise(r => setTimeout(r, 500));
      }

      const reportData = mapLeadToReportData(lead);

      console.log('[PDF] Starting PDF generation');
      let blob: Blob;
      try {
        blob = await pdf(<ReportDocument data={reportData} />).toBlob();
      } catch (pdfErr) {
        console.error('[PDF] toBlob() failed:', pdfErr);
        toast.error('PDF render mislukt — controleer de console voor details.');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Zolderpunt_${lead.achternaam || 'Klant'}_${lead.gesprek_datum || 'rapport'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('PDF succesvol gedownload!');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('PDF generatie mislukt. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SlideLayout>
      <div className="max-w-2xl mx-auto w-full">
        <SlideLabel>DOSSIER EXPORTEREN</SlideLabel>
        <h2 className="text-4xl font-headline font-bold text-foreground mb-8">
          Dossier exporteren
        </h2>

        {/* AI status indicator */}
        {!hasAiSummary && (
          <div className="bg-accent/30 border border-border p-4 mb-6 text-sm text-muted-foreground font-body">
            ℹ️ De AI-samenvatting is nog niet gegenereerd. Bij het downloaden wordt deze automatisch aangemaakt.
          </div>
        )}

        {/* Summary card */}
        <div className="bg-card border border-border p-8 mb-8 space-y-4">
          <SummaryRow label="Klant" value={`${lead.voornaam} ${lead.achternaam}`.trim() || '—'} />
          <SummaryRow label="Adres" value={lead.adres || '—'} />
          <SummaryRow label="Datum gesprek" value={lead.gesprek_datum || '—'} />
          <SummaryRow
            label="Budget indicatie"
            value={lead.budget_min && lead.budget_max ? `${fmt(lead.budget_min)} — ${fmt(lead.budget_max)}` : '—'}
          />
          <SummaryRow label="AI samenvatting" value={hasAiSummary ? '✓ Gereed' : '○ Nog niet gegenereerd'} />
        </div>

        <Button
          onClick={handleDownload}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground hover:bg-secondary font-headline text-lg py-7 gap-3"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {hasAiSummary ? 'PDF wordt opgemaakt...' : 'AI-samenvatting + PDF worden opgemaakt...'}
            </>
          ) : (
            <>
              <FileDown className="h-5 w-5" />
              PDF downloaden
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Bestandsnaam: Zolderpunt_{lead.achternaam || 'Klant'}_{lead.gesprek_datum}.pdf
        </p>
      </div>
    </SlideLayout>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-base text-muted-foreground font-body">{label}</span>
      <span className="text-base font-semibold text-foreground font-headline">{value}</span>
    </div>
  );
}
