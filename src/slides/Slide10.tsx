import { useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import ReportDocument from '@/components/report/ReportDocument';
import type { ReportData } from '@/components/report/reportTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const FALLBACK_AI_TEXT = 'Extra leefruimte gecreëerd uit ruimte die er al was.';

function mapLeadToReportData(lead: ReturnType<typeof useSession>['lead'], aiText: string): ReportData {
  const posten = (lead.inbegrepen_posten || []) as { post: string; bedrag: number }[];
  const postenLabels = posten.map(p => p.post).join(', ');
  const t = lead.technisch;

  return {
    voornaam: lead.voornaam,
    achternaam: lead.achternaam,
    datum_gesprek: lead.gesprek_datum || new Date().toISOString().split('T')[0],
    situatie: lead.adres && lead.oppervlakte_m2
      ? `Zolder van ±${lead.oppervlakte_m2}m² in ${lead.adres}.`
      : lead.adres || `Zolder van ±${lead.oppervlakte_m2 || '?'}m².`,
    gewenst_resultaat: lead.gezocht_naar || '—',
    besproken_opties: postenLabels || lead.gezocht_naar || '—',
    aandachtspunten: lead.gesprek_notities || '',
    oppervlakte_m2: lead.oppervlakte_m2 || 0,
    prijs_min: lead.budget_min || 0,
    prijs_max: lead.budget_max || 0,
    prijs_incl6: lead.budget_incl6 || 0,
    prijs_incl21: lead.budget_incl21 || 0,
    opties: {
      isolatie: posten.some(p => p.post.toLowerCase().includes('isolatie')),
      binnenafwerking: posten.some(p => p.post.toLowerCase().includes('binnenplaat') || p.post.toLowerCase().includes('afwerking')),
      vloer: posten.some(p => p.post.toLowerCase().includes('vloer')),
      velux: t.dakraam,
      trap: t.trap,
      elektriciteit: t.elektriciteit_uitgebreid,
      airco: t.airco,
      schilderwerk: false, // always excluded
    },
    fotos: (lead.fotos || []).filter(f => f.url).map(f => f.url!),
    waarde_tekst_ai: aiText,
    inbegrepen_posten: posten,
  };
}

export default function Slide10() {
  const { lead } = useSession();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      // 1. Get AI text for value module
      let aiText = FALLBACK_AI_TEXT;
      try {
        const { data, error } = await supabase.functions.invoke('generate-value-text', {
          body: {
            gewenst_resultaat: lead.gezocht_naar,
            oppervlakte_m2: lead.oppervlakte_m2,
          },
        });
        if (!error && data?.text) {
          aiText = data.text;
        }
      } catch {
        console.warn('AI value text failed, using fallback');
      }

      // 2. Map lead data to report format
      const reportData = mapLeadToReportData(lead, aiText);

      // 3. Generate PDF
      const blob = await pdf(<ReportDocument data={reportData} />).toBlob();

      // 4. Download
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

        {/* Summary card */}
        <div className="bg-card rounded-xl border border-border p-8 mb-8 space-y-4">
          <SummaryRow label="Klant" value={`${lead.voornaam} ${lead.achternaam}`.trim() || '—'} />
          <SummaryRow label="Adres" value={lead.adres || '—'} />
          <SummaryRow label="Datum gesprek" value={lead.gesprek_datum || '—'} />
          <SummaryRow
            label="Budget indicatie"
            value={lead.budget_min && lead.budget_max ? `${fmt(lead.budget_min)} — ${fmt(lead.budget_max)}` : '—'}
          />
        </div>

        <Button
          onClick={handleDownload}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground hover:bg-secondary font-headline text-lg py-7 gap-3"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              PDF wordt opgemaakt...
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
