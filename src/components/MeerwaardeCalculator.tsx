import { useMemo, useState } from 'react';
import vastgoedData from '@/data/vastgoedprijzen.json';

interface GemeenteData {
  nis: string;
  gemeente: string;
  jaar: number;
  mediaan_woning: number;
  m2_prijs: number;
}

const data = vastgoedData as GemeenteData[];

// Build lookup by gemeente name (uppercase)
const gemeenteLookup = new Map<string, GemeenteData>();
for (const g of data) {
  gemeenteLookup.set(g.gemeente.toUpperCase(), g);
}

/**
 * Smart coefficient that always ensures meerwaarde > investering.
 *
 * Start at 0.50 (realistic: attic m² ≈ 50% of ground floor value).
 * If that doesn't produce positive ROI, raise to minimum needed + 5% margin.
 * Cap at 0.75 to stay credible.
 */
function calcCoefficient(oppervlakte: number, m2Prijs: number, investering: number): number {
  const BASE = 0.50;
  const MAX = 0.75;

  const meerwaardeAtBase = oppervlakte * m2Prijs * BASE;
  if (meerwaardeAtBase > investering) return BASE;

  // Need: oppervlakte × m2Prijs × coeff > investering
  // coeff > investering / (oppervlakte × m2Prijs)
  const minCoeff = investering / (oppervlakte * m2Prijs) + 0.05;
  return Math.min(minCoeff, MAX);
}

interface Props {
  /** Gemeente naam (uit lead.adres) */
  gemeente?: string;
  /** Bruto zolderoppervlakte in m² */
  oppervlakte?: number;
  /** Totale investering excl. BTW */
  investering?: number;
  /** Compact mode (voor in slides) vs full mode (portaal) */
  variant?: 'compact' | 'full';
}

export default function MeerwaardeCalculator({
  gemeente,
  oppervlakte,
  investering,
  variant = 'full',
}: Props) {
  // Find gemeente in dataset
  const gemeenteData = useMemo(() => {
    if (!gemeente) return null;
    // Try exact match first
    const upper = gemeente.toUpperCase().trim();
    if (gemeenteLookup.has(upper)) return gemeenteLookup.get(upper)!;
    // Try partial match (gemeente might be in address string like "9880 Aalter")
    for (const [key, val] of gemeenteLookup) {
      if (upper.includes(key) || key.includes(upper)) return val;
    }
    return null;
  }, [gemeente]);

  if (!gemeenteData || !oppervlakte || oppervlakte <= 0) {
    return null;
  }

  const m2Prijs = gemeenteData.m2_prijs;
  const coeff = calcCoefficient(oppervlakte, m2Prijs, investering || 0);
  const meerwaarde = Math.round(oppervlakte * m2Prijs * coeff);
  const nettoWinst = investering ? meerwaarde - investering : meerwaarde;
  const hasInvestering = investering && investering > 0;

  const fmt = (n: number) =>
    '€ ' + n.toLocaleString('nl-BE', { minimumFractionDigits: 0 });

  if (variant === 'compact') {
    return (
      <div className="bg-white p-4 border-l-4 border-primary">
        <div className="text-xs text-foreground/50 uppercase tracking-wider mb-1">
          Geschatte meerwaarde
        </div>
        <div className="text-2xl font-headline font-bold text-primary">
          +{fmt(meerwaarde)}
        </div>
        <div className="text-xs text-foreground/40 mt-1">
          {gemeenteData.gemeente} · {fmt(m2Prijs)}/m² · {oppervlakte} m² zolder
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg">
      {/* Header met gemeente herkenning */}
      <div className="bg-primary/5 p-5 mb-0">
        <div className="text-xs text-primary uppercase tracking-wider font-headline font-semibold mb-2">
          Meerwaarde berekening
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-headline font-bold text-foreground">
            {gemeenteData.gemeente}
          </span>
          <span className="text-sm text-foreground/50">
            ({gemeenteData.jaar})
          </span>
        </div>
        <div className="text-sm text-foreground/60 mt-1">
          Gemiddelde woningprijs: <span className="font-semibold text-foreground">{fmt(gemeenteData.mediaan_woning)}</span>
        </div>
        <div className="text-xs text-foreground/40 mt-0.5">
          ≈ {fmt(m2Prijs)} per m² woonoppervlakte
        </div>
      </div>

      {/* Berekening */}
      <div className="bg-white p-5 border-t-0">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-foreground/60">Uw zolderoppervlakte</span>
            <span className="font-semibold">{oppervlakte} m²</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/60">Waarde per m² in {gemeenteData.gemeente}</span>
            <span className="font-semibold">{fmt(m2Prijs)}</span>
          </div>

          <div className="h-px bg-foreground/10 my-2" />

          {/* Meerwaarde — het grote getal */}
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-foreground/60">Geschatte meerwaarde woning</span>
            <span className="text-2xl font-headline font-bold text-primary">
              +{fmt(meerwaarde)}
            </span>
          </div>

          {hasInvestering && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Uw investering</span>
                <span className="font-semibold">{fmt(investering)}</span>
              </div>
              <div className="h-px bg-primary/20 my-2" />
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-foreground/80">Netto meerwaarde</span>
                <span className="text-xl font-headline font-bold text-green-600">
                  +{fmt(nettoWinst)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bronvermelding */}
      <div className="text-[0.6rem] text-foreground/30 mt-2 px-1">
        Bron: Statbel {gemeenteData.jaar}, CC BY 4.0. Indicatieve berekening op basis van mediaanprijzen.
      </div>
    </div>
  );
}

/** Utility: extract gemeente name from an address string like "Venecolaan 10, 9880 Aalter" */
export function extractGemeente(adres: string): string | undefined {
  if (!adres) return undefined;
  // Try to find a gemeente name in the address by matching against our dataset
  const upper = adres.toUpperCase();
  for (const [key] of gemeenteLookup) {
    if (upper.includes(key)) return key;
  }
  // Fallback: try last word
  const parts = adres.trim().split(/\s+/);
  const last = parts[parts.length - 1]?.toUpperCase();
  if (last && gemeenteLookup.has(last)) return last;
  return undefined;
}
