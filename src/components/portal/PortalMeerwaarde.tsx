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

function findGemeente(adres: string): GemeenteData | null {
  if (!adres) return null;
  const postalMatch = adres.match(/\b(\d{4})\s+([A-Za-zÀ-ÿ][\w-]*(?:\s+[A-Za-zÀ-ÿ][\w-]*)*)\s*$/);
  if (postalMatch) {
    const city = postalMatch[2].toUpperCase();
    if (gemeenteLookup.has(city)) return gemeenteLookup.get(city)!;
    const firstWord = postalMatch[2].split(/\s+/)[0].toUpperCase();
    if (gemeenteLookup.has(firstWord)) return gemeenteLookup.get(firstWord)!;
  }
  const parts = adres.split(',').map(p => p.trim());
  for (const part of parts) {
    const partPostal = part.match(/\b(\d{4})\s+([A-Za-zÀ-ÿ][\w-]*(?:\s+[A-Za-zÀ-ÿ][\w-]*)*)/);
    if (partPostal) {
      const city = partPostal[2].toUpperCase();
      if (gemeenteLookup.has(city)) return gemeenteLookup.get(city)!;
    }
  }
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

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

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
          <div className="py-20 md:py-28 text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-white/10 mx-auto mb-6">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-white mb-4">
              Wat levert deze renovatie u op?
            </h2>
            <p className="font-body text-lg text-white/70 mb-10 max-w-lg mx-auto leading-relaxed">
              Op basis van de vastgoedprijzen in {titleCase(gemeenteData.gemeente)} berekenen we
              hoeveel uw woning waard stijgt door de zolderrenovatie.
            </p>
            <Button
              onClick={handleCalculate}
              className="bg-[#F8F3EB] text-[#2B6CA0] hover:bg-[#F8F3EB]/90 font-headline text-lg px-12 py-7 gap-3"
            >
              <Calculator className="h-6 w-6" />
              Bereken mijn meerwaarde
            </Button>
          </div>
        ) : result ? (
          <div className="py-14">
            <h2 className="font-headline text-xs text-white/50 uppercase tracking-wider font-semibold mb-10">
              Geschatte meerwaarde
            </h2>

            {/* Big result number */}
            <div className="text-center mb-10">
              <p className="font-body text-sm text-white/50 uppercase tracking-wider mb-3">
                Geschatte meerwaarde van uw woning
              </p>
              <p className="font-headline text-6xl md:text-7xl font-bold text-white">
                +{fmt(result.meerwaarde)}
              </p>
              {investering && investering > 0 && (
                <div className="flex items-center justify-center gap-6 mt-4">
                  <span className="font-body text-base text-white/50">
                    Investering: {fmt(investering)}
                  </span>
                  <span className="font-headline text-2xl font-bold text-[#F8F3EB]">
                    Netto: +{fmt(result.nettoWinst)}
                  </span>
                </div>
              )}
            </div>

            {/* Calculation breakdown */}
            <div className="bg-white/10 p-8">
              <h3 className="font-headline text-lg font-bold text-white mb-6">
                Hoe berekenen we dit?
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="font-body text-base text-white/70">Gemeente</span>
                  <span className="font-headline text-base font-semibold text-white">
                    {titleCase(result.gemeente)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="font-body text-base text-white/70">Gem. m²-prijs ({result.jaar})</span>
                  <span className="font-headline text-base font-semibold text-white">{fmt(result.m2Prijs)}/m²</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="font-body text-base text-white/70">Uw zolderoppervlakte</span>
                  <span className="font-headline text-base font-semibold text-white">{oppervlakte} m²</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="font-body text-base text-white/70">Waardecoëfficiënt</span>
                  <span className="font-headline text-base font-semibold text-white">{Math.round(result.coeff * 100)}%</span>
                </div>
              </div>

              <div className="mt-6 flex items-start gap-3">
                <Info className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                <div className="font-body text-sm text-white/50 leading-relaxed">
                  <p className="mb-2">
                    <strong className="text-white/70">Berekening:</strong> {oppervlakte} m² × {fmt(result.m2Prijs)}/m² × {Math.round(result.coeff * 100)}% = {fmt(result.meerwaarde)}
                  </p>
                  <p>
                    De waardecoëfficiënt ({Math.round(result.coeff * 100)}%) geeft aan welk deel van de m²-prijs
                    als meerwaarde meetelt. Een gerenoveerde zolder voegt woonoppervlakte toe, maar telt niet
                    voor 100% mee — rekening houdend met ligging, type ruimte en afwerking.
                    Bron: Statbel {result.jaar}.
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
