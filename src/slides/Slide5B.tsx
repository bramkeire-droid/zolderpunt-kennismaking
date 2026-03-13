import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';

// ─── TARIEVEN ─────────────────────────────────────────────────────
const INDEX = 1.05;
const RATES = {
  binnenplaatafwerking: 230 * INDEX,
  binnenplaatAfgedekt: 115 * INDEX,
  dakisolatieSpantendak: 85 * INDEX,
  dakisolatieGordingendak: 100 * INDEX,
  vloer: 70 * INDEX,
  velux: 2250 * INDEX,
  trap: 6000 * INDEX,
  trapgatHout: 1750 * INDEX,
  trapgatBeton: 5500 * INDEX,
  algemeenAfwerking: 230 * INDEX,
  airco: { 1: 4000 * INDEX, 2: 6000 * INDEX, 3: 7500 * INDEX, 4: 10000 * INDEX, 5: 11000 * INDEX } as Record<number, number>,
  plamuur: (netto: number) => {
    if (netto < 40) return Math.round(3250 * INDEX);
    if (netto < 65) return Math.round(4500 * INDEX);
    if (netto < 85) return Math.round(5750 * INDEX);
    return Math.round(8000 * INDEX);
  },
  schilderwerken: (netto: number) => netto < 40 ? 2500 : 4000,
  bandbreedte: 0.15,
  btw6: 0.06,
  btw21: 0.21,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

type DakisolatieType = 'geen' | 'spantendak' | 'gordingendak';

export default function Slide5B() {
  const { lead, updateLead } = useSession();

  const [bruto, setBruto] = useState(String(lead.oppervlakte_m2 || ''));
  const [nettoStr, setNettoStr] = useState(String(lead.oppervlakte_m2 || ''));
  const [nettoManuallySet, setNettoManuallySet] = useState(false);
  const [dakBekleed, setDakBekleed] = useState(false);
  const [dakisolatieType, setDakisolatieType] = useState<DakisolatieType>('geen');
  const [vloer, setVloer] = useState(false);
  const [velux, setVelux] = useState(0);
  const [trap, setTrap] = useState(false);
  const [trapgat, setTrapgat] = useState<'hout' | 'beton' | 'geen'>('geen');
  const [airco, setAirco] = useState(0);
  const [schilderwerken, setSchilderwerken] = useState(false);

  // Sync bruto from lead.oppervlakte_m2
  useEffect(() => {
    if (lead.oppervlakte_m2) {
      setBruto(String(lead.oppervlakte_m2));
      if (!nettoManuallySet) {
        setNettoStr(String(lead.oppervlakte_m2));
      }
    }
  }, [lead.oppervlakte_m2, nettoManuallySet]);

  // When bruto changes and netto hasn't been manually set, sync netto to bruto
  const handleBrutoChange = (value: string) => {
    setBruto(value);
    if (!nettoManuallySet) {
      setNettoStr(value);
    }
  };

  const handleNettoChange = (value: string) => {
    setNettoStr(value);
    setNettoManuallySet(true);
  };

  const brutoNum = parseFloat(bruto) || 0;
  const nettoNum = parseFloat(nettoStr) || 0;

  const calc = useCallback(() => {
    if (brutoNum <= 0) return null;
    const items: { key: string; label: string; amount: number; fixed?: boolean }[] = [];
    const bpa = dakBekleed ? RATES.binnenplaatAfgedekt : RATES.binnenplaatafwerking;
    items.push({ key: 'bpa', label: 'Binnenplaatafwerking', amount: brutoNum * bpa, fixed: true });
    items.push({ key: 'alg', label: 'Algemene afwerking', amount: nettoNum * RATES.algemeenAfwerking, fixed: true });
    items.push({ key: 'pla', label: 'Plamuur & wandafwerking', amount: RATES.plamuur(nettoNum), fixed: true });
    if (dakisolatieType === 'spantendak') items.push({ key: 'iso', label: 'Dakisolatie spantendak', amount: brutoNum * RATES.dakisolatieSpantendak });
    if (dakisolatieType === 'gordingendak') items.push({ key: 'iso', label: 'Dakisolatie gordingendak', amount: brutoNum * RATES.dakisolatieGordingendak });
    if (vloer) items.push({ key: 'vl', label: 'Vloer (chape/uitpassen)', amount: nettoNum * RATES.vloer });
    if (velux > 0) items.push({ key: 'vx', label: `Velux dakramen (${velux}×)`, amount: velux * RATES.velux });
    if (trap) {
      items.push({ key: 'tr', label: 'Trap', amount: RATES.trap });
      if (trapgat !== 'geen') {
        items.push({ key: 'tg', label: `Trapgat (${trapgat})`, amount: trapgat === 'beton' ? RATES.trapgatBeton : RATES.trapgatHout });
      }
    }
    if (airco > 0) items.push({ key: 'ac', label: `Airco (${airco} toestel${airco > 1 ? 'len' : ''})`, amount: RATES.airco[Math.min(airco, 5)] });
    if (schilderwerken) items.push({ key: 'sw', label: 'Schilderwerken', amount: RATES.schilderwerken(nettoNum) });
    const excl = items.reduce((s, i) => s + i.amount, 0);
    return { items, excl, incl6: excl * 1.06, incl21: excl * 1.21, min: excl * 1.06 * 0.85, max: excl * 1.06 * 1.15 };
  }, [brutoNum, nettoNum, dakBekleed, dakisolatieType, vloer, velux, trap, trapgat, airco, schilderwerken]);

  const result = calc();

  const btwPercentage = lead.btw_percentage ?? 6;

  const setBtwPercentage = (nieuwTarief: 6 | 21) => {
    const multiplier = 1 + nieuwTarief / 100;
    const minExcl = result ? Math.round(result.excl * 0.85) : (lead.budget_min || 0);
    const maxExcl = result ? Math.round(result.excl * 1.15) : (lead.budget_max || 0);
    const mwMin = result ? Math.round(result.excl) : 0;
    const mwMax = mwMin; // single-point for now
    updateLead({
      btw_percentage: nieuwTarief,
      prijs_min_incl_btw: Math.round(minExcl * multiplier),
      prijs_max_incl_btw: Math.round(maxExcl * multiplier),
      prijs_mw_min_incl_btw: Math.round(mwMin * multiplier),
      prijs_mw_max_incl_btw: Math.round(mwMax * multiplier),
    });
  };

  const prevResultRef = useRef<string>('');

  useEffect(() => {
    if (result) {
      const key = `${result.min}-${result.max}-${result.incl6}-${result.incl21}-${result.items.length}-${btwPercentage}`;
      if (key === prevResultRef.current) return;
      prevResultRef.current = key;
      const multiplier = 1 + (btwPercentage) / 100;
      const berekendeMin = Math.round(result.min);
      const berekendeMax = Math.round(result.max);
      const mwMin = Math.round(result.excl);
      const mwMax = mwMin;
      updateLead({
        budget_min: berekendeMin,
        budget_max: berekendeMax,
        budget_incl6: Math.round(result.incl6),
        budget_incl21: Math.round(result.incl21),
        inbegrepen_posten: result.items.map(i => ({ post: i.label, bedrag: Math.round(i.amount) })),
        prijs_min_incl_btw: Math.round(berekendeMin * multiplier),
        prijs_max_incl_btw: Math.round(berekendeMax * multiplier),
        prijs_mw_min_incl_btw: Math.round(mwMin * multiplier),
        prijs_mw_max_incl_btw: Math.round(mwMax * multiplier),
      });
    }
  }, [result, updateLead, btwPercentage]);

  return (
    <SlideLayout variant="internal">
      <div className="max-w-[1060px] mx-auto w-full">
        <SlideLabel>CALCULATOR — INTERN</SlideLabel>
        <h2 className="text-3xl font-headline font-bold text-foreground mb-6">
          Prijsindicatie berekenen
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
          {/* Left: inputs */}
          <div className="space-y-4">
            {/* Oppervlakte card */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="label-style mb-4 flex items-center gap-2">
                <span>Oppervlakte</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-1.5 block">Bruto oppervlakte</label>
                  <div className="flex items-center border-2 border-border rounded-xl bg-background overflow-hidden focus-within:border-primary transition-colors">
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={bruto}
                      onChange={e => handleBrutoChange(e.target.value)}
                      className="flex-1 border-none bg-transparent px-3.5 py-3 text-2xl font-bold text-foreground outline-none w-full min-w-0 font-headline"
                    />
                    <span className="px-3.5 text-xs font-semibold text-muted-foreground">m²</span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted-foreground/70">Gebruikt voor: binnenplaat, isolatie</div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-1.5 block">Netto leefoppervlakte</label>
                  <div className="flex items-center border-2 border-border rounded-xl bg-background overflow-hidden focus-within:border-primary transition-colors">
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={nettoStr}
                      onChange={e => handleNettoChange(e.target.value)}
                      className="flex-1 border-none bg-transparent px-3.5 py-3 text-2xl font-bold text-foreground outline-none w-full min-w-0 font-headline"
                    />
                    <span className="px-3.5 text-xs font-semibold text-muted-foreground">m²</span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted-foreground/70">Gebruikt voor: afwerking, vloer, plamuur</div>
                </div>
              </div>

              {/* Dakbekleding */}
              <div className="mt-4">
                <div className="text-sm font-semibold text-muted-foreground mb-2">Dakbekleding aanwezig?</div>
                <div className="flex gap-1.5">
                  <button onClick={() => setDakBekleed(false)} className={`flex-1 px-2.5 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all font-body text-center ${!dakBekleed ? 'bg-secondary border-secondary text-secondary-foreground' : 'border-border text-muted-foreground hover:border-secondary hover:text-secondary'}`}>
                    Nog te bekleden<br /><span className="opacity-75">tarief €230/m²</span>
                  </button>
                  <button onClick={() => setDakBekleed(true)} className={`flex-1 px-2.5 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all font-body text-center ${dakBekleed ? 'bg-secondary border-secondary text-secondary-foreground' : 'border-border text-muted-foreground hover:border-secondary hover:text-secondary'}`}>
                    Al bekleed met platen<br /><span className="opacity-75">tarief €115/m²</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Options card */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="label-style mb-4 flex items-center gap-2">
                <span>Opties</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2">
                {/* Dakisolatie — twee aparte opties, radio-gedrag */}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`rounded-xl border-2 transition-all cursor-pointer ${dakisolatieType === 'spantendak' ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/30'}`}
                    onClick={() => setDakisolatieType(dakisolatieType === 'spantendak' ? 'geen' : 'spantendak')}
                  >
                    <div className="flex items-center gap-3 p-3.5">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${dakisolatieType === 'spantendak' ? 'bg-primary border-primary' : 'border-border bg-card'}`}>
                        {dakisolatieType === 'spantendak' && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground">Dakisolatie Spantendak</div>
                        <div className="text-xs text-muted-foreground">{brutoNum > 0 ? `${brutoNum} m² × €85` : '€85 per m² bruto'}</div>
                      </div>
                    </div>
                    {dakisolatieType === 'spantendak' && brutoNum > 0 && (
                      <div className="px-3.5 pb-3 text-sm font-bold text-primary text-right">{fmt(brutoNum * RATES.dakisolatieSpantendak)}</div>
                    )}
                  </div>
                  <div
                    className={`rounded-xl border-2 transition-all cursor-pointer ${dakisolatieType === 'gordingendak' ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/30'}`}
                    onClick={() => setDakisolatieType(dakisolatieType === 'gordingendak' ? 'geen' : 'gordingendak')}
                  >
                    <div className="flex items-center gap-3 p-3.5">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${dakisolatieType === 'gordingendak' ? 'bg-primary border-primary' : 'border-border bg-card'}`}>
                        {dakisolatieType === 'gordingendak' && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground">Dakisolatie Gordingendak</div>
                        <div className="text-xs text-muted-foreground">{brutoNum > 0 ? `${brutoNum} m² × €100` : '€100 per m² bruto'}</div>
                      </div>
                    </div>
                    {dakisolatieType === 'gordingendak' && brutoNum > 0 && (
                      <div className="px-3.5 pb-3 text-sm font-bold text-primary text-right">{fmt(brutoNum * RATES.dakisolatieGordingendak)}</div>
                    )}
                  </div>
                </div>

                <ToggleOption label="Vloer — chape of uitpassen" desc={nettoNum > 0 ? `${nettoNum} m² netto × €70` : '€70 per m² netto'} active={vloer} onToggle={() => setVloer(v => !v)} amount={vloer && nettoNum > 0 ? fmt(nettoNum * 70) : undefined} />

                {/* Velux */}
                <div className={`rounded-xl border-2 transition-all cursor-pointer ${velux > 0 ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/30'}`}>
                  <div className="flex items-center gap-3 p-3.5" onClick={() => velux === 0 && setVelux(1)}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${velux > 0 ? 'bg-primary border-primary' : 'border-border bg-card'}`}>
                      {velux > 0 && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">Dakramen (Velux)</div>
                      <div className="text-xs text-muted-foreground">{velux > 0 ? `${velux} × €2.250` : '€2.250 per dakraam'}</div>
                    </div>
                    {velux > 0 && <div className="text-sm font-bold text-primary">{fmt(velux * 2250)}</div>}
                  </div>
                  {velux > 0 && (
                    <div className="px-3.5 pb-3.5 pt-2 border-t border-primary/20" onClick={e => e.stopPropagation()}>
                      <div className="text-xs font-bold text-secondary mb-2">Aantal dakramen</div>
                      <div className="inline-flex items-center border-2 border-primary/30 rounded-lg overflow-hidden bg-card">
                        <button onClick={() => setVelux(Math.max(0, velux - 1))} className="w-9 h-9 flex items-center justify-center text-lg font-bold text-primary hover:bg-accent">−</button>
                        <span className="w-11 text-center text-lg font-bold">{velux}</span>
                        <button onClick={() => setVelux(Math.min(6, velux + 1))} className="w-9 h-9 flex items-center justify-center text-lg font-bold text-primary hover:bg-accent">+</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Trap */}
                <div className={`rounded-xl border-2 transition-all cursor-pointer ${trap ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/30'}`}>
                  <div className="flex items-center gap-3 p-3.5" onClick={() => setTrap(v => !v)}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${trap ? 'bg-primary border-primary' : 'border-border bg-card'}`}>
                      {trap && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">Trap</div>
                      <div className="text-xs text-muted-foreground">
                        {trap
                          ? trapgat === 'geen'
                            ? 'Trap €6.000 — geen trapgat'
                            : `Trap €6.000 + ${trapgat === 'beton' ? 'betonnen trapgat €5.500' : 'houten trapgat €1.750'}`
                          : 'Trap €6.000 + trapgat (optioneel)'}
                      </div>
                    </div>
                    {trap && (
                      <div className="text-sm font-bold text-primary">
                        {fmt(RATES.trap + (trapgat === 'beton' ? RATES.trapgatBeton : trapgat === 'hout' ? RATES.trapgatHout : 0))}
                      </div>
                    )}
                  </div>
                  {trap && (
                    <div className="px-3.5 pb-3.5 pt-2 border-t border-primary/20" onClick={e => e.stopPropagation()}>
                      <div className="text-xs font-bold text-secondary mb-2">Trapgat (optioneel)</div>
                      <div className="flex gap-1.5">
                        <button onClick={() => setTrapgat('geen')} className={`px-4 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${trapgat === 'geen' ? 'bg-secondary border-secondary text-secondary-foreground' : 'border-primary/30 text-secondary'}`}>Geen trapgat</button>
                        <button onClick={() => setTrapgat('hout')} className={`px-4 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${trapgat === 'hout' ? 'bg-secondary border-secondary text-secondary-foreground' : 'border-primary/30 text-secondary'}`}>Hout — €1.750</button>
                        <button onClick={() => setTrapgat('beton')} className={`px-4 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${trapgat === 'beton' ? 'bg-secondary border-secondary text-secondary-foreground' : 'border-primary/30 text-secondary'}`}>Beton — €5.500</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Airco */}
                <div className={`rounded-xl border-2 transition-all cursor-pointer ${airco > 0 ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/30'}`}>
                  <div className="flex items-center gap-3 p-3.5" onClick={() => airco === 0 && setAirco(1)}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${airco > 0 ? 'bg-primary border-primary' : 'border-border bg-card'}`}>
                      {airco > 0 && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">Airco</div>
                      <div className="text-xs text-muted-foreground">{airco > 0 ? `${airco} toestel${airco > 1 ? 'len' : ''} — staffelprijs` : '1→€4K · 2→€6K · 3→€7,5K · 4→€10K · 5→€11K'}</div>
                    </div>
                    {airco > 0 && <div className="text-sm font-bold text-primary">{fmt(RATES.airco[Math.min(airco, 5)])}</div>}
                  </div>
                  {airco > 0 && (
                    <div className="px-3.5 pb-3.5 pt-2 border-t border-primary/20" onClick={e => e.stopPropagation()}>
                      <div className="text-xs font-bold text-secondary mb-2">Aantal toestellen</div>
                      <div className="inline-flex items-center border-2 border-primary/30 rounded-lg overflow-hidden bg-card">
                        <button onClick={() => setAirco(Math.max(0, airco - 1))} className="w-9 h-9 flex items-center justify-center text-lg font-bold text-primary hover:bg-accent">−</button>
                        <span className="w-11 text-center text-lg font-bold">{airco}</span>
                        <button onClick={() => setAirco(Math.min(5, airco + 1))} className="w-9 h-9 flex items-center justify-center text-lg font-bold text-primary hover:bg-accent">+</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Schilderwerken */}
                <ToggleOption
                  label="Schilderwerken"
                  desc={nettoNum > 0 ? `Forfait: ${nettoNum < 40 ? '€2.500 (< 40m²)' : '€4.000 (≥ 40m²)'}` : '€2.500 (< 40m²) of €4.000 (≥ 40m²)'}
                  active={schilderwerken}
                  onToggle={() => setSchilderwerken(v => !v)}
                  amount={schilderwerken && nettoNum > 0 ? fmt(RATES.schilderwerken(nettoNum)) : undefined}
                />
              </div>
            </div>
          </div>

          {/* Right: Result panel */}
          <div className="lg:sticky lg:top-6 self-start">
            <div className="bg-foreground rounded-xl p-6 text-primary-foreground shadow-xl">
              <div className="text-xs font-bold tracking-[1.8px] uppercase text-primary-foreground/40 mb-5">Prijsindicatie</div>

              {result ? (
                <>
                  {/* BTW-toggle */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                    fontFamily: "'Rethink Sans', 'DM Sans', sans-serif",
                  }}>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.7)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}>
                      BTW-tarief:
                    </span>
                    <button
                      onClick={() => setBtwPercentage(6)}
                      style={{
                        padding: '4px 14px',
                        fontSize: '0.8rem',
                        fontWeight: btwPercentage === 6 ? '700' : '400',
                        fontFamily: "'Rethink Sans', 'DM Sans', sans-serif",
                        backgroundColor: btwPercentage === 6 ? 'white' : 'transparent',
                        color: btwPercentage === 6 ? '#008CFF' : 'rgba(255,255,255,0.7)',
                        border: btwPercentage === 6 ? 'none' : '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      6%
                    </button>
                    <button
                      onClick={() => setBtwPercentage(21)}
                      style={{
                        padding: '4px 14px',
                        fontSize: '0.8rem',
                        fontWeight: btwPercentage === 21 ? '700' : '400',
                        fontFamily: "'Rethink Sans', 'DM Sans', sans-serif",
                        backgroundColor: btwPercentage === 21 ? 'white' : 'transparent',
                        color: btwPercentage === 21 ? '#008CFF' : 'rgba(255,255,255,0.7)',
                        border: btwPercentage === 21 ? 'none' : '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      21%
                    </button>
                    <span style={{
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.5)',
                      marginLeft: '4px',
                    }}>
                      {btwPercentage === 6
                        ? '(woning ouder dan 10 jaar)'
                        : '(woning jonger dan 10 jaar)'}
                    </span>
                  </div>

                  {/* Price range */}
                  <div className="mb-5">
                    <div className="h-1.5 rounded-full bg-primary-foreground/10 mb-3.5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 w-full" />
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-1 items-end">
                      <div className="text-xs text-primary-foreground/40">
                        <span className="block text-base font-bold text-primary-foreground/60 mb-0.5">{fmt(result.min)}</span>minimum
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-primary-foreground/40 tracking-wider">INCL. 6% BTW</span>
                        <span className="block text-2xl font-bold text-primary tracking-tight">{fmt(result.incl6)}</span>
                      </div>
                      <div className="text-xs text-primary-foreground/40 text-right">
                        <span className="block text-base font-bold text-primary-foreground/60 mb-0.5">{fmt(result.max)}</span>maximum
                      </div>
                    </div>
                  </div>

                  {/* BTW boxes */}
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <div className="rounded-lg p-3 border border-primary-foreground/10 bg-primary-foreground/5">
                      <div className="text-xs font-bold text-primary-foreground/40 tracking-wider uppercase mb-1">Excl. BTW</div>
                      <div className="text-base font-bold text-primary-foreground/90">{fmt(result.excl)}</div>
                    </div>
                    <div className="rounded-lg p-3 border border-primary/30 bg-primary/10">
                      <div className="text-xs font-bold text-cyan-300 tracking-wider uppercase mb-1">Incl. 6% BTW</div>
                      <div className="text-base font-bold text-primary-foreground">{fmt(result.incl6)}</div>
                    </div>
                    <div className="col-span-2 rounded-lg p-3 border border-primary-foreground/10 bg-primary-foreground/5">
                      <div className="text-xs font-bold text-primary-foreground/40 tracking-wider uppercase mb-1">Incl. 21% BTW</div>
                      <div className="text-base font-bold text-primary-foreground/90">{fmt(result.incl21)}</div>
                      <div className="text-xs text-primary-foreground/30 mt-0.5">nieuwbouw of woning &lt; 10 jaar</div>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <hr className="border-primary-foreground/10 my-3" />
                  {result.items.map(item => (
                    <div key={item.key} className="flex justify-between items-baseline py-1">
                      <span className="text-xs text-primary-foreground/55">{item.label}</span>
                      <span className="text-xs text-primary-foreground/85 font-semibold">{fmt(item.amount)}</span>
                    </div>
                  ))}
                  <hr className="border-primary-foreground/10 my-3" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-primary-foreground/80 font-bold">Totaal excl. BTW</span>
                    <span className="text-sm text-primary-foreground font-bold">{fmt(result.excl)}</span>
                  </div>
                </>
              ) : (
                <div className="py-7 text-center text-primary-foreground/30 text-sm leading-relaxed">
                  <span className="block text-3xl mb-2.5 opacity-50">🏠</span>
                  Vul de bruto oppervlakte in om een prijsindicatie te berekenen.
                </div>
              )}
            </div>
            <div className="mt-3 text-xs text-muted-foreground leading-relaxed px-0.5">
              ⚠ Indicatieve raming op basis van gemiddelde tarieven. Definitieve prijs na plaatsbezoek en opmeting. Bandbreedte ±15%.
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}

function ToggleOption({ label, desc, active, onToggle, amount }: { label: string; desc: string; active: boolean; onToggle: () => void; amount?: string }) {
  return (
    <div className={`rounded-xl border-2 transition-all cursor-pointer ${active ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/30'}`} onClick={onToggle}>
      <div className="flex items-center gap-3 p-3.5">
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${active ? 'bg-primary border-primary' : 'border-border bg-card'}`}>
          {active && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        {amount && <div className="text-sm font-bold text-primary">{amount}</div>}
      </div>
    </div>
  );
}
