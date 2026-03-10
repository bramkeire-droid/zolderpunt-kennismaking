import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function Slide10() {
  const { lead } = useSession();

  const handleDownload = () => {
    // TODO: PDF generation with @react-pdf/renderer
    alert('PDF generatie wordt beschikbaar na volledige setup.');
  };

  return (
    <SlideLayout>
      <div className="max-w-2xl mx-auto w-full">
        <SlideLabel>DOSSIER EXPORTEREN</SlideLabel>
        <h2 className="text-3xl font-headline font-bold text-foreground mb-8">
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
          className="w-full bg-primary text-primary-foreground hover:bg-secondary font-headline text-lg py-7 gap-3"
        >
          <FileDown className="h-5 w-5" />
          PDF downloaden
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
      <span className="text-sm text-muted-foreground font-body">{label}</span>
      <span className="text-sm font-semibold text-foreground font-headline">{value}</span>
    </div>
  );
}
