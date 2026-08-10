import { useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import PrijsCalculatorPaneel, { type CalcPatch } from '@/components/calculator/PrijsCalculatorPaneel';

// De calculator zelf staat in components/calculator/PrijsCalculatorPaneel,
// zodat de losse calculator op de dossierpagina exact hetzelfde rekent en
// dezelfde velden wegschrijft. Deze slide koppelt hem enkel aan de sessie.

export default function Slide5B() {
  const { lead, updateLead } = useSession();

  const onChange = useCallback((patch: CalcPatch) => updateLead(patch as never), [updateLead]);

  return (
    <SlideLayout variant="internal">
      <div className="mx-auto w-full max-w-[1060px]">
        <SlideLabel>CALCULATOR — INTERN</SlideLabel>
        <h2 className="mb-6 font-headline text-3xl font-bold text-foreground">
          Prijsindicatie berekenen
        </h2>

        <PrijsCalculatorPaneel
          oppervlakteM2={lead.oppervlakte_m2}
          calculatorState={lead.calculator_state}
          btwPercentage={lead.btw_percentage ?? 6}
          onChange={onChange}
        />
      </div>
    </SlideLayout>
  );
}
