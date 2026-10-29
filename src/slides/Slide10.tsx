import { useState, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Mail } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import ReportDocument from '@/components/report/ReportDocument';
import type { ReportData, FeitjeItem } from '@/components/report/reportTypes';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchAndDownscaleToDataUrl } from '@/lib/imageCompression';
import { normalizeLeadMedia, imagesOnly, resignLeadFotos } from '@/lib/leadMedia';
import { formatDatum } from '@/components/report/reportConstants';
import { downloadBlob, openDownloadWindow } from '@/lib/downloadFile';
import { bewaarRapport, type RapportRij } from '@/lib/rapporten';
import RapportMailDialog from '@/components/dossier/RapportMailDialog';

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
    budget_excl: lead.budget_excl || 0,
    budget_min_excl: lead.budget_min_excl ?? null,
    budget_max_excl: lead.budget_max_excl ?? null,
    btw_percentage: lead.btw_percentage ?? 6,
    prijs_min_incl_btw: lead.prijs_min_incl_btw ?? 0,
    prijs_max_incl_btw: lead.prijs_max_incl_btw ?? 0,
    prijs_mw_min_incl_btw: lead.prijs_mw_min_incl_btw ?? 0,
    prijs_mw_max_incl_btw: lead.prijs_mw_max_incl_btw ?? 0,
    // Filtering on f.url alone silently dropped every inbound photo (those
    // carry `path`, not `url`). Video is excluded because react-pdf cannot
    // render it.
    fotos: imagesOnly(normalizeLeadMedia(lead.fotos)).map(m => m.url),
    fotos_met_path: imagesOnly(normalizeLeadMedia(lead.fotos)).map(m => ({
      url: m.url,
      storage_path: m.path,
    })),
    waarde_tekst_ai: lead.waarde_tekst_ai || 'Extra leefruimte gecreëerd uit ruimte die er al was.',
    inbegrepen_posten: posten,
    project_feiten: (lead.project_feiten || []).filter(
      (f): f is FeitjeItem => typeof f === 'object' && 'tekst' in f
    ),
  };
}

export default function Slide10() {
  const { lead, updateLead } = useSession();
  const [loading, setLoading] = useState(false);
  // Het net bewaarde rapport, zodat het hier meteen gemaild kan worden zonder
  // eerst naar het dossier terug te moeten.
  const [bewaardRapport, setBewaardRapport] = useState<RapportRij | null>(null);
  const [mailOpen, setMailOpen] = useState(false);

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
          project_feiten: lead.project_feiten,
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
          `Datum: ${formatDatum(lead.gesprek_datum || new Date().toISOString().split('T')[0])}`,
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
    const filename = `Zolderpunt_${lead.achternaam || 'Klant'}_${lead.gesprek_datum ? formatDatum(lead.gesprek_datum).replace(/\//g, '-') : 'rapport'}.pdf`;
    const fallbackWindow = openDownloadWindow(filename);
    setLoading(true);
    try {
      // Generate AI summary if not yet available
      if (!hasAiSummary) {
        toast.info('AI-samenvatting wordt eerst gegenereerd…');
        const success = await generateAiSummary();
        if (!success) {
          if (fallbackWindow && !fallbackWindow.closed) fallbackWindow.close();
          toast.error('AI-samenvatting kon niet gegenereerd worden. Ga eerst naar de Rapport Preview slide.');
          setLoading(false);
          return;
        }
        // Wait briefly for state to propagate
        await new Promise(r => setTimeout(r, 500));
      }

      // lead-fotos is een privé-bucket: vers signeren vóór mapLeadToReportData
      // de foto's opneemt. fetchAndDownscaleToDataUrl hieronder haalt de bytes
      // meteen op, dus een kortlevende link volstaat ruimschoots.
      const fotosGesigneerd = await resignLeadFotos<typeof lead.fotos[number]>(lead.fotos);
      const reportData = mapLeadToReportData({ ...lead, fotos: fotosGesigneerd });

      // Pre-fetch + downscale all photos to base64 data-URLs.
      // Reden: @react-pdf/renderer faalt silent op grote remote JPEGs (4+ MB
      // iPhone-foto's). Door ze vooraf te downscalen naar ~1600 px JPEG q=0.82
      // krijgt react-pdf compacte base64 input die altijd inlined wordt.
      toast.info("Foto's worden geoptimaliseerd voor PDF...");
      const downscaledPairs = await Promise.all(
        reportData.fotos_met_path.map(async f => {
          const dataUrl = await fetchAndDownscaleToDataUrl(f.url);
          return { url: dataUrl ?? f.url, storage_path: f.storage_path };
        })
      );
      reportData.fotos_met_path = downscaledPairs;
      reportData.fotos = downscaledPairs.map(p => p.url);

      console.log('[PDF] Starting PDF generation with data:', JSON.stringify({
        voornaam: reportData.voornaam,
        achternaam: reportData.achternaam,
        fotos: reportData.fotos?.length ?? 0,
        prijs_min: reportData.prijs_min,
        prijs_max: reportData.prijs_max,
        hasSituatie: !!reportData.situatie,
      }));
      let blob: Blob;
      try {
        blob = await pdf(<ReportDocument data={reportData} />).toBlob();
      } catch (pdfErr: unknown) {
        const errMsg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
        const errStack = pdfErr instanceof Error ? pdfErr.stack : '';
        console.error('[PDF] toBlob() failed:', errMsg);
        console.error('[PDF] Stack:', errStack);
        toast.error(`PDF render mislukt: ${errMsg.slice(0, 120)}`);
        return;
      }

      await downloadBlob(blob, filename, fallbackWindow);

      // Markeer rapport als gegenereerd + promoveer dossier-status naar 'intake'
      if (lead.id) {
        const nowIso = new Date().toISOString();
        await supabase.from('leads').update({ rapport_gegenereerd_op: nowIso, status: 'intake' }).eq('id', lead.id);
        updateLead({ rapport_gegenereerd_op: nowIso, status: 'intake' });

        // Het bestand zelf bewaren, samen met de invoer die het maakte. Tot nu
        // bestond de PDF alleen op de schijf van wie hem downloadde, en het
        // transcript verdween met het tabblad. bewaarRapport gooit nooit: het
        // archief mag een geslaagde download niet alsnog laten mislukken.
        const naam = `${lead.voornaam ?? ''} ${lead.achternaam ?? ''}`.trim() || 'dossier';
        const bewaard = await bewaarRapport({
          leadId: lead.id,
          bron: 'intake',
          pdf: blob,
          bestandsnaam: filename,
          invoer: {
            transcript: lead.transcript,
            gesprek_notities: lead.gesprek_notities,
            project_feiten: lead.project_feiten,
            technisch: lead.technisch,
            inbegrepen_posten: lead.inbegrepen_posten,
            oppervlakte_m2: lead.oppervlakte_m2,
            gezocht_naar: lead.gezocht_naar,
          },
          invoerKop: `Intakegesprek ${naam} — ${formatDatum(lead.gesprek_datum)}`,
        });
        if (bewaard) {
          setBewaardRapport(bewaard);
        } else {
          toast.warning('PDF gedownload, maar niet bewaard in het dossier. Probeer later opnieuw te genereren.');
        }
      }

      toast.success('PDF succesvol gedownload of geopend!');
    } catch (err) {
      if (fallbackWindow && !fallbackWindow.closed) fallbackWindow.close();
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
          <SummaryRow label="Datum gesprek" value={formatDatum(lead.gesprek_datum)} />
          <SummaryRow
            label={`Budget indicatie (incl. ${lead.btw_percentage ?? 6}% btw)`}
            value={(() => {
              // De vork tegen het GEKOZEN tarief; de oude weergave toonde
              // ongelabelde incl-6%-bedragen, ook op een 21%-dossier.
              const min = (lead as any).prijs_min_incl_btw || lead.budget_min;
              const max = (lead as any).prijs_max_incl_btw || lead.budget_max;
              return min && max ? `${fmt(min)} — ${fmt(max)}` : '—';
            })()}
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

        {bewaardRapport && lead.id && (
          <Button
            variant="outline"
            onClick={() => setMailOpen(true)}
            className="w-full font-headline text-lg py-7 gap-3 mt-4"
          >
            <Mail className="h-5 w-5" />
            Rapport naar de klant mailen
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center mt-6">
          Bestandsnaam: Zolderpunt_{lead.achternaam || 'Klant'}_{lead.gesprek_datum ? formatDatum(lead.gesprek_datum).replace(/\//g, '-') : 'rapport'}.pdf
        </p>
      </div>

      {bewaardRapport && lead.id && (
        <RapportMailDialog
          open={mailOpen}
          onClose={() => setMailOpen(false)}
          leadId={lead.id}
          rapport={bewaardRapport}
        />
      )}
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
