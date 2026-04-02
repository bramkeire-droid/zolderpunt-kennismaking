import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import type { PortalData } from '@/hooks/usePortal';
import vastgoedData from '@/data/vastgoedprijzen.json';

interface GemeenteData {
  nis: string;
  gemeente: string;
  jaar: number;
  mediaan_woning: number;
  m2_prijs: number;
}

const gemeenteLookup = new Map<string, GemeenteData>();
for (const g of vastgoedData as GemeenteData[]) {
  gemeenteLookup.set(g.gemeente.toUpperCase(), g);
}

function findGemeente(adres: string): GemeenteData | null {
  if (!adres) return null;
  const upper = adres.toUpperCase();
  for (const [key, val] of gemeenteLookup) {
    if (upper.includes(key)) return val;
  }
  const parts = adres.trim().split(/\s+/);
  const last = parts[parts.length - 1]?.toUpperCase();
  if (last && gemeenteLookup.has(last)) return gemeenteLookup.get(last)!;
  return null;
}

function calcCoefficient(oppervlakte: number, m2Prijs: number, investering: number): number {
  const BASE = 0.50;
  const MAX = 0.75;
  const STEP = 0.05;
  const meerwaardeAtBase = oppervlakte * m2Prijs * BASE;
  if (meerwaardeAtBase > investering) return BASE;
  const minCoeff = investering / (oppervlakte * m2Prijs) + 0.05;
  const rounded = Math.ceil(minCoeff / STEP) * STEP;
  return Math.min(rounded, MAX);
}

const fmt = (n: number) =>
  '€ ' + n.toLocaleString('nl-BE', { minimumFractionDigits: 0 });

interface Props {
  data: PortalData;
  onCalculate?: (meerwaarde: number) => void;
}

export default function PortalMeerwaarde({ data, onCalculate }: Props) {
  const [calculated, setCalculated] = useState(false);
  const [result, setResult] = useState<{
    meerwaarde: number;
    nettoWinst: number;
    gemeente: string;
    m2Prijs: number;
    coeff: number;
  } | null>(null);

  const gemeenteData = findGemeente(data.adres);
  const oppervlakte = data.oppervlakte_m2;
  const investering = data.budget_excl;

  // Don't show if we can't calculate
  if (!gemeenteData || !oppervlakte || oppervlakte <= 0) return null;

  const handleCalculate = useCallback(() => {
    const m2Prijs = gemeenteData!.m2_prijs;
    const coeff = calcCoefficient(oppervlakte!, m2Prijs, investering || 0);
    const meerwaarde = Math.round(oppervlakte! * m2Prijs * coeff);
    const nettoWinst = investering ? meerwaarde - investering : meerwaarde;

    setResult({ meerwaarde, nettoWinst, gemeente: gemeenteData!.gemeente, m2Prijs, coeff });
    setCalculated(true);
    onCalculate?.(meerwaarde);
  }, [gemeenteData, oppervlakte, investering, onCalculate]);

  return (
    <section className="max-w-4xl mx-auto px-6 py-10">
      <h2 className="font-headline text-xs text-[#008CFF] uppercase tracking-wider font-semibold mb-6">
        Geschatte meerwaarde
      </h2>

      <div className="bg-white p-6 border-l-4 border-[#008CFF]">
        {!calculated ? (
          /* Pre-calculation state — klant moet klikken */
          <div className="text-center py-4">
            <Calculator className="h-10 w-10 text-[#008CFF] mx-auto mb-4" />
            <h3 className="font-headline text-lg font-bold text-[#1A1A1A] mb-2">
              Wat levert deze renovatie u op?
            </h3>
            <p className="font-body text-sm text-[#555555] mb-6 max-w-sm mx-auto">
              Ontdek hoeveel uw woning waard stijgt door de zolderrenovatie, op basis van vastgoedprijzen in uw gemeente.
            </p>
            <Button
              onClick={handleCalculate}
              className="bg-[#008CFF] text-white hover:bg-[#0070CC] font-headline text-base px-8 py-5 gap-2"
            >
              <Calculator className="h-5 w-5" />
              Bereken mijn meerwaarde
            </Button>
          </div>
        ) : result ? (
          /* Resultaat */
          <div>
            <div className="mb-4">
              <p className="font-headline text-sm font-semibold text-[#1A1A1A]">
                {result.gemeente}
              </p>
              <p className="font-body text-xs text-[#888888] mt-0.5">
                Gemiddelde m²-prijs: {fmt(result.m2Prijs)} per m² woonoppervlakte
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-body text-[#555555]">Uw zolderoppervlakte</span>
                <span className="font-headline font-semibold">{oppervlakte} m²</span>
              </div>

              <div className="h-px bg-[#E2E8F0]" />

              <div className="flex justify-between items-baseline">
                <span className="font-body text-sm text-[#555555]">Geschatte meerwaarde woning</span>
                <span className="font-headline text-2xl font-bold text-[#008CFF]">
                  +{fmt(result.meerwaarde)}
                </span>
              </div>

              {investering && investering > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="font-body text-[#555555]">Uw investering</span>
                    <span className="font-headline font-semibold">{fmt(investering)}</span>
                  </div>
                  <div className="h-px bg-[#008CFF]/20" />
                  <div className="flex justify-between items-baseline">
                    <span className="font-body text-sm font-semibold text-[#1A1A1A]">Netto meerwaarde</span>
                    <span className="font-headline text-xl font-bold text-green-600">
                      +{fmt(result.nettoWinst)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <p className="font-body text-[0.6rem] text-[#999999] mt-4">
              Bron: Statbel · Indicatieve berekening op basis van mediaanprijzen per gemeente.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
