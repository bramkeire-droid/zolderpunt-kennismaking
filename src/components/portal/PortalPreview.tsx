import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PortalHeader from './PortalHeader';
import PortalSamenvatting from './PortalSamenvatting';
import PortalFotos from './PortalFotos';
import PortalInvestering from './PortalInvestering';
import PortalMeerwaarde from './PortalMeerwaarde';
import PortalWerkwijze from './PortalWerkwijze';
import PortalGaranties from './PortalGaranties';
import PortalReviews from './PortalReviews';
import PortalContact from './PortalContact';
import type { PortalData } from '@/hooks/usePortal';

interface Props {
  lead: any;
  onClose: () => void;
}

function leadToPortalData(lead: any): PortalData {
  return {
    voornaam: lead.voornaam ?? '',
    achternaam: lead.achternaam ?? '',
    adres: lead.adres ?? '',
    gesprek_datum: lead.gesprek_datum ?? '',
    oppervlakte_m2: lead.oppervlakte_m2 ?? null,
    rapport_situatie_ai: lead.rapport_situatie_ai ?? '',
    rapport_verwachtingen_ai: lead.rapport_verwachtingen_ai ?? '',
    rapport_besproken_ai: lead.rapport_besproken_ai ?? '',
    rapport_aandachtspunten_ai: lead.rapport_aandachtspunten_ai ?? '',
    waarde_tekst_ai: lead.waarde_tekst_ai ?? '',
    budget_excl: lead.budget_excl ?? null,
    btw_percentage: lead.btw_percentage ?? 6,
    prijs_min_incl_btw: lead.prijs_min_incl_btw ?? 0,
    prijs_max_incl_btw: lead.prijs_max_incl_btw ?? 0,
    prijs_mw_min_incl_btw: lead.prijs_mw_min_incl_btw ?? 0,
    prijs_mw_max_incl_btw: lead.prijs_mw_max_incl_btw ?? 0,
    fotos: Array.isArray(lead.fotos) ? lead.fotos : [],
    project_feiten: Array.isArray(lead.project_feiten) ? lead.project_feiten : [],
    inbegrepen_posten: Array.isArray(lead.inbegrepen_posten) ? lead.inbegrepen_posten : [],
    technisch: lead.technisch ?? {},
  };
}

export default function PortalPreview({ lead, onClose }: Props) {
  const data = leadToPortalData(lead);

  return (
    <div className="fixed inset-0 z-50 bg-[#F8F3EB] overflow-y-auto">
      {/* Close bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0] px-4 py-2 flex items-center justify-between">
        <span className="font-headline text-sm font-semibold text-[#008CFF]">
          Preview modus — zo ziet de klant het portaal
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="font-headline gap-1.5"
        >
          <X className="h-4 w-4" />
          Sluiten
        </Button>
      </div>

      {/* Portal content */}
      <PortalHeader data={data} />
      <PortalSamenvatting data={data} />
      <PortalFotos data={data} />
      <PortalInvestering data={data} />
      <PortalMeerwaarde data={data} />
      <PortalWerkwijze />
      <PortalGaranties />
      <PortalReviews />
      <PortalContact />
    </div>
  );
}
