import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, Info } from 'lucide-react';
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

/**
 * Find gemeente from address string.
 * Strategy: extract the city name from patterns like "8750 Wingene" or the last word(s).
 * NEVER do substring matching on the full address — "straat" contains "AAT".
 */
function findGemeente(adres: string): GemeenteData | null {
  if (!adres) return null;

  // 1. Try "postcode Gemeente" pattern: "8750 Wingene" or "8750 Sint-Niklaas"
  const postalMatch = adres.match(/\b(\d{4})\s+([A-Za-zÀ-ÿ][\w-]*(?:\s+[A-Za-zÀ-ÿ][\w-]*)*)\s*$/);
  if (postalMatch) {
    const city = postalMatch[2].toUpperCase();
    if (gemeenteLookup.has(city)) return gemeenteLookup.get(city)!;
    // Try first word after postcode (for "8750 Wingene extra")
    const firstWord = postalMatch[2].split(/\s+/)[0].toUpperCase();
    if (gemeenteLookup.has(firstWord)) return gemeenteLookup.get(firstWord)!;
  }

  // 2. Try comma-separated parts: "Looierijstraat 2, 8750 Wingene"
  const parts = adres.split(',').map(p => p.trim());
  for (const part of parts) {
    const partPostal = part.match(/\b(\d{4})\s+([A-Za-zÀ-ÿ][\w-]*(?:\s+[A-Za-zÀ-ÿ][\w-]*)*)/);
    if (partPostal) {
      const city = partPostal[2].toUpperCase();
      if (gemeenteLookup.has(city)) return gemeenteLookup.get(city)!;
    }
  }

  // 3. Last resort: try last word of the full address
  const words = adres.trim().split(/\s+/);
  const last = words[words.length - 1]?.toUpperCase();
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
    jaar: number;
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

    setResult({
      meerwaarde,
      nettoWinst,
      gemeente: gemeenteData!.gemeente,
      m2Prijs,
      coeff,
      jaar: gemeenteData!.jaar,
    });
    setCalculated(true);
    onCalculate?.(meerwaarde);
  }, [gemeenteData, oppervlakte, investering, onCalculate]);

  return (
    <section className="bg-[#2B6CA0] text-white">
      <div className="max-w-4xl mx-auto px-6">
        {!calculated ? (
          /* Pre-calculation — full-width activerend moment */
          <div className="py-20 md:py-28 text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-white/10 mx-auto mb-6">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-white mb-4">
              Wat levert deze renovatie u op?
            </h2>
            <p className="font-body text-base text-white/70 mb-10 max-w-lg mx-auto leading-relaxed">
              Op basis van de vastgoedprijzen in {gemeenteData.gemeente.charAt(0) + gemeenteData.gemeente.slice(1).toLowerCase()} berekenen we
              hoeveel uw woning waard stijgt door de zolderrenovatie.
            </p>
            <Button
              onClick={handleCalculate}
              className="bg-white text-[#2B6CA0] hover:bg-white/90 font-headline text-lg px-12 py-7 gap-3"
            >
              <Calculator className="h-6 w-6" />
              Bereken mijn meerwaarde
            </Button>
          </div>
        ) : result ? (
          /* Resultaat */
          <div className="py-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 flex items-center justify-center bg-white/10 flex-shrink-0">
                <TrendingUp className="h-4.5 w-4.5 text-white" />
              </div>
              <h2 className="font-headline text-xs text-white/70 uppercase tracking-wider font-semibold">
                Geschatte meerwaarde
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: big number */}
              <div className="bg-white/10 p-8 flex flex-col items-center justify-center text-center">
                <p className="font-body text-xs text-white/50 uppercase tracking-wider mb-2">
                  Geschatte meerwaarde woning
                </p>
                <p className="font-headline text-5xl font-bold text-white mb-2">
                  +{fmt(result.meerwaarde)}
                </p>
                {investering && investering > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/20 w-full">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-body text-white/60">Uw investering</span>
                      <span className="font-headline font-semibold text-white/80">{fmt(investering)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="font-body text-sm font-semibold text-white/80">Netto meerwaarde</span>
                      <span className="font-headline text-2xl font-bold text-[#22C55E]">
                        +{fmt(result.nettoWinst)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: explanation */}
              <div className="flex flex-col justify-center space-y-5">
                <h3 className="font-headline text-lg font-bold text-white">
                  Hoe berekenen we dit?
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="font-body text-sm text-white/70">Gemeente</span>
                    <span className="font-headline text-sm font-semibold text-white">
                      {result.gemeente.charAt(0) + result.gemeente.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="font-body text-sm text-white/70">Gem. m²-prijs ({result.jaar})</span>
                    <span className="font-headline text-sm font-semibold text-white">{fmt(result.m2Prijs)}/m²</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="font-body text-sm text-white/70">Uw zolderoppervlakte</span>
                    <span className="font-headline text-sm font-semibold text-white">{oppervlakte} m²</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="font-body text-sm text-white/70">Waardecoëfficiënt</span>
                    <span className="font-headline text-sm font-semibold text-white">{Math.round(result.coeff * 100)}%</span>
                  </div>
                </div>

                <div className="bg-white/5 p-4 flex items-start gap-3">
                  <Info className="h-4 w-4 text-white/50 flex-shrink-0 mt-0.5" />
                  <p className="font-body text-xs text-white/50 leading-relaxed">
                    Berekend op basis van de gemiddelde m²-prijs voor woningen in{' '}
                    {result.gemeente.charAt(0) + result.gemeente.slice(1).toLowerCase()} (bron: Statbel {result.jaar}).
                    Een gerenoveerde zolder telt mee als extra woonoppervlakte.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
