import { useEffect, useRef, useState } from 'react';
import ExtraElementen from './ExtraElementen';
import { ChevronDown, ChevronRight } from 'lucide-react';
import HandmatigBedrag, { HandmatigPotlood } from './HandmatigBedrag';
import MargeBalk from './MargeBalk';
import MargeRedenDialog from './MargeRedenDialog';
import {
  berekenPrijs,
  effectieveTarieven,
  fmtEuro as fmt,
  naarOpgeslagenPosten,
  normaliseerCalcState,
  type CalcState,
  type OverrideRegel,
  type MargeArgument,
  type DakisolatieType,
} from '@/lib/prijscalculator';
import { useTarieven } from '@/hooks/useTarieven';
import { maakCalculatieSessie, type CalculatieBron } from '@/lib/calculaties';

// De volledige prijscalculator, los van waar hij getoond wordt. Stond eerst
// helemaal in src/slides/Slide5B.tsx; nu gedeeld met de losse calculator op de
// dossierpagina, zodat beide identiek rekenen én dezelfde velden wegschrijven.

export interface CalcPatch {
  calculator_state?: CalcState;
  btw_percentage?: number;
  budget_excl?: number;
  budget_min?: number;
  budget_max?: number;
  budget_min_excl?: number;
  budget_max_excl?: number;
  budget_incl6?: number;
  budget_incl21?: number;
  inbegrepen_posten?: unknown;
  prijs_min_incl_btw?: number;
  prijs_max_incl_btw?: number;
  prijs_mw_min_incl_btw?: number;
  prijs_mw_max_incl_btw?: number;
  oppervlakte_m2?: number | null;
}

interface Props {
  oppervlakteM2: number | null | undefined;
  calculatorState: CalcState | null | undefined;
  btwPercentage: number;
  /** Wat er nu op het dossier staat. Beschermt tegen overschrijven bij openen. */
  opgeslagenBudgetExcl?: number | null;
  onChange: (patch: CalcPatch) => void;
  /** Ook oppervlakte_m2 op het dossier bijwerken als de bruto hier wijzigt. */
  schrijfOppervlakte?: boolean;
  /** Samen ingevuld: elke berekening komt ook in de historiek van dit dossier. */
  leadId?: string | null;
  bron?: CalculatieBron;
}

export default function PrijsCalculatorPaneel({
  oppervlakteM2, calculatorState, btwPercentage, opgeslagenBudgetExcl, onChange, schrijfOppervlakte = false,
  leadId, bron,
}: Props) {
  const cs = normaliseerCalcState(calculatorState);

  const [bruto, setBruto] = useState(String(oppervlakteM2 || ''));
  const [nettoStr, setNettoStr] = useState(
    cs.netto_m2 != null ? String(cs.netto_m2) : String(oppervlakteM2 || ''),
  );
  const [nettoManuallySet, setNettoManuallySet] = useState(cs.netto_manually_set ?? false);

  const brutoNum = parseFloat(bruto) || 0;
  const nettoNum = parseFloat(nettoStr) || 0;

  // Eén bron van waarheid voor de opties: alles zit in calculator_state, zodat
  // een patch vanuit ExtraElementen en een klik op een optie hetzelfde pad volgen.
  const zet = (patch: Partial<CalcState>) =>
    onChange({ calculator_state: { ...cs, ...patch, netto_m2: nettoNum || null, netto_manually_set: nettoManuallySet } });

  const dakBekleed = cs.dak_bekleed ?? false;
  const dakisolatieType: DakisolatieType = cs.dakisolatie_type ?? 'geen';
  const vloer = cs.vloer ?? false;
  const velux = cs.velux ?? 0;
  const trap = cs.trap ?? false;
  const trapgat = cs.trapgat ?? 'geen';
  const airco = cs.airco ?? 0;
  const schilderwerken = cs.schilderwerken ?? false;

  const handleBrutoChange = (value: string) => {
    setBruto(value);
    if (!nettoManuallySet) setNettoStr(value);
    if (schrijfOppervlakte) onChange({ oppervlakte_m2: parseFloat(value) || null });
  };

  const handleNettoChange = (value: string) => {
    setNettoStr(value);
    setNettoManuallySet(true);
    onChange({ calculator_state: { ...cs, netto_m2: parseFloat(value) || null, netto_manually_set: true } });
  };

  // Bruto volgt het dossier zolang niemand netto handmatig heeft gezet.
  useEffect(() => {
    if (oppervlakteM2) {
      setBruto(String(oppervlakteM2));
      if (!nettoManuallySet) setNettoStr(String(oppervlakteM2));
    }
  }, [oppervlakteM2, nettoManuallySet]);

  // Prijzen komen uit de beheerdersconsole; zolang die niet geladen zijn wordt
  // met de standaardtarieven gerekend, zodat het paneel nooit leeg staat.
  const { tarieven } = useTarieven();
  const RATES = effectieveTarieven(tarieven);

  const result = berekenPrijs({ ...cs, netto_m2: nettoNum || null }, brutoNum, tarieven);

  const zetOverride = (key: string, regels: OverrideRegel[] | null) => {
    const huidig = { ...(cs.overrides ?? {}) };
    if (regels === null) delete huidig[key];
    else huidig[key] = { regels };
    zet({ overrides: huidig });
  };

  // Welke optie staat open in de handmatige-bedrageditor.
  const [bewerkt, setBewerkt] = useState<string | null>(null);

  // Inklappen van een optie met een subkeuze. Los van aanvinken: dichtklappen
  // laat het bedrag gewoon meetellen en raakt de gekozen waarden niet.
  const [dicht, setDicht] = useState<Record<string, boolean>>({});
  const klapper = (sleutel: string) => (
    <button
      type="button"
      onClick={(ev) => { ev.stopPropagation(); setDicht((v) => ({ ...v, [sleutel]: !v[sleutel] })); }}
      title={dicht[sleutel] ? 'Uitklappen' : 'Inklappen — de keuze blijft staan'}
      aria-label={dicht[sleutel] ? 'Uitklappen' : 'Inklappen'}
      aria-expanded={!dicht[sleutel]}
      className="shrink-0 rounded p-1 text-muted-foreground/60 hover:bg-muted hover:text-foreground"
    >
      {dicht[sleutel] ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );

  // Na het loslaten van een handvat: welke kant is versleept, en wat stond er
  // vóór het slepen — zodat "Marge terugzetten" echt terugzet.
  const [margeVraag, setMargeVraag] = useState<'min' | 'max' | null>(null);
  const margeVoor = useRef<CalcState['marge']>(undefined);
  if (!margeVraag && !margeVoor.current) margeVoor.current = cs.marge;

  /** Potlood naast het bedrag van een optie. */
  const potlood = (key: string, label: string, tariefBedrag: number) => (
    <HandmatigPotlood
      label={label}
      actief={!!cs.overrides?.[key]}
      onClick={() => {
        // Begin bij het huidige bedrag: aanpassen is meestal corrigeren.
        if (!cs.overrides?.[key]) zetOverride(key, [[Math.round(tariefBedrag), null, 1]]);
        setBewerkt((b) => (b === key ? null : key));
      }}
    />
  );

  /** Het rekenpaneel, onder de optie waar het bij hoort. */
  const editor = (key: string) =>
    bewerkt === key ? (
      <div className="px-3.5 pb-3">
        <HandmatigBedrag
          override={cs.overrides?.[key]}
          onZet={(regels) => zetOverride(key, regels)}
          onSluit={() => setBewerkt(null)}
        />
      </div>
    ) : null;

  const setBtwPercentage = (nieuwTarief: 6 | 21) => {
    const multiplier = 1 + nieuwTarief / 100;
    const exclMin = result?.exclMin ?? 0;
    const exclMax = result?.exclMax ?? 0;
    const excl = result?.excl ?? 0;
    onChange({
      btw_percentage: nieuwTarief,
      prijs_min_incl_btw: Math.round(exclMin * multiplier),
      prijs_max_incl_btw: Math.round(exclMax * multiplier),
      prijs_mw_min_incl_btw: Math.round(excl * multiplier),
      prijs_mw_max_incl_btw: Math.round(excl * multiplier),
    });
  };

  // Wegschrijven alleen als er iets wezenlijk veranderd is. De sleutel bevat
  // nu ook de band en de posten: een extra element dat het gemiddelde niet
  // verandert, moet tóch bewaard worden.
  // Eén sessie per keer dat de calculator openstaat; die rij wordt bijgewerkt
  // in plaats van dat elke toetsaanslag een nieuwe regel in de historiek zet.
  const sessie = useRef<ReturnType<typeof maakCalculatieSessie> | null>(null);
  if (leadId && bron && !sessie.current) sessie.current = maakCalculatieSessie(leadId, bron);

  const vorigeSleutel = useRef<string>('');
  const eersteRonde = useRef(true);
  useEffect(() => {
    if (!result) return;
    const posten = naarOpgeslagenPosten(result.items);
    const sleutel = JSON.stringify([
      Math.round(result.excl), Math.round(result.exclMin), Math.round(result.exclMax), btwPercentage, posten,
    ]);
    if (sleutel === vorigeSleutel.current) return;

    // Bij het openen niets overschrijven zolang er al een berekening op het
    // dossier staat. Een ouder dossier kan bedragen hebben zonder bewaarde
    // calculator-instellingen; die zouden hier anders meteen vervangen worden
    // door een lege herberekening, enkel door de calculator te openen.
    if (eersteRonde.current) {
      eersteRonde.current = false;
      vorigeSleutel.current = sleutel;
      if ((opgeslagenBudgetExcl ?? 0) > 0) return;
    }
    vorigeSleutel.current = sleutel;
    const multiplier = 1 + btwPercentage / 100;
    onChange({
      budget_excl: Math.round(result.excl),
      budget_min: Math.round(result.min),
      budget_max: Math.round(result.max),
      budget_min_excl: Math.round(result.exclMin),
      budget_max_excl: Math.round(result.exclMax),
      budget_incl6: Math.round(result.incl6),
      budget_incl21: Math.round(result.incl21),
      inbegrepen_posten: posten,
      prijs_min_incl_btw: Math.round(result.exclMin * multiplier),
      prijs_max_incl_btw: Math.round(result.exclMax * multiplier),
      prijs_mw_min_incl_btw: Math.round(result.excl * multiplier),
      prijs_mw_max_incl_btw: Math.round(result.excl * multiplier),
    });

    void sessie.current?.bewaar({
      calculator_state: { ...cs, netto_m2: nettoNum || null },
      inbegrepen_posten: posten,
      budget_excl: Math.round(result.excl),
      budget_min_excl: Math.round(result.exclMin),
      budget_max_excl: Math.round(result.exclMax),
      btw_percentage: btwPercentage,
    });
  }, [result, btwPercentage, onChange]);

  // Op de aanwezigheid van zulke posten checken, niet op een verschil tussen
  // twee kommagetallen — dat laatste is afrondingsgevoelig.
  const heeftEigenBand = !!result?.items.some((i) => i.categorie !== 'standaard');

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
      {/* Links: invoer */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="label-style mb-4 flex items-center gap-2">
            <span>Oppervlakte</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">Bruto oppervlakte</label>
              <div className="flex items-center overflow-hidden rounded-xl border-2 border-border bg-background transition-colors focus-within:border-primary">
                <input type="number" min="0" placeholder="0" value={bruto} onChange={(e) => handleBrutoChange(e.target.value)}
                  className="w-full min-w-0 flex-1 border-none bg-transparent px-3.5 py-3 font-headline text-2xl font-bold text-foreground outline-none" />
                <span className="px-3.5 text-xs font-semibold text-muted-foreground">m²</span>
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground/70">Gebruikt voor: binnenplaat, isolatie</div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">Netto leefoppervlakte</label>
              <div className="flex items-center overflow-hidden rounded-xl border-2 border-border bg-background transition-colors focus-within:border-primary">
                <input type="number" min="0" placeholder="0" value={nettoStr} onChange={(e) => handleNettoChange(e.target.value)}
                  className="w-full min-w-0 flex-1 border-none bg-transparent px-3.5 py-3 font-headline text-2xl font-bold text-foreground outline-none" />
                <span className="px-3.5 text-xs font-semibold text-muted-foreground">m²</span>
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground/70">Gebruikt voor: afwerking, vloer, plamuur</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-sm font-semibold text-muted-foreground">Dakbekleding aanwezig?</div>
            <div className="flex gap-1.5">
              <button onClick={() => zet({ dak_bekleed: false })} className={`flex-1 rounded-lg border-2 px-2.5 py-2.5 text-center font-body text-sm font-semibold transition-all ${!dakBekleed ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border text-muted-foreground hover:border-secondary hover:text-secondary'}`}>
                Nog te bekleden<br /><span className="opacity-75">tarief €230/m²</span>
              </button>
              <button onClick={() => zet({ dak_bekleed: true })} className={`flex-1 rounded-lg border-2 px-2.5 py-2.5 text-center font-body text-sm font-semibold transition-all ${dakBekleed ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border text-muted-foreground hover:border-secondary hover:text-secondary'}`}>
                Al bekleed met platen<br /><span className="opacity-75">tarief €115/m²</span>
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="label-style mb-4 flex items-center gap-2">
            <span>Opties</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {(['spantendak', 'gordingendak'] as const).map((soort) => {
                const actief = dakisolatieType === soort;
                const tarief = soort === 'spantendak' ? RATES.dakisolatieSpantendak : RATES.dakisolatieGordingendak;
                const perM2 = soort === 'spantendak' ? 85 : 100;
                return (
                  <div key={soort}
                    className={`cursor-pointer rounded-xl border-2 transition-all ${actief ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/30'}`}
                    onClick={() => zet({ dakisolatie_type: actief ? 'geen' : soort })}>
                    <div className="flex items-center gap-3 p-3.5">
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${actief ? 'border-primary bg-primary' : 'border-border bg-card'}`}>
                        {actief && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground">Dakisolatie {soort === 'spantendak' ? 'Spantendak' : 'Gordingendak'}</div>
                        <div className="text-xs text-muted-foreground">{brutoNum > 0 ? `${brutoNum} m² × €${perM2}` : `€${perM2} per m² bruto`}</div>
                      </div>
                    </div>
                    {actief && brutoNum > 0 && (
                      <div className="px-3.5 pb-3">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-sm font-bold text-primary">{fmt(brutoNum * tarief)}</span>
                          {potlood('iso', 'Dakisolatie', brutoNum * tarief)}
                        </div>
                      </div>
                    )}
                    {actief && editor('iso')}
                  </div>
                );
              })}
            </div>

            <ToggleOption label="Vloer — chape of uitpassen" desc={nettoNum > 0 ? `${nettoNum} m² netto × €70` : '€70 per m² netto'}
              active={vloer} onToggle={() => zet({ vloer: !vloer })} amount={vloer && nettoNum > 0 ? fmt(nettoNum * RATES.vloer) : undefined}
              extra={vloer && nettoNum > 0 ? potlood('vl', 'Vloer', nettoNum * RATES.vloer) : undefined}
              onder={editor('vl')} />

            <TellerOptie label="Dakramen (Velux)"
              desc={velux > 0 ? `${velux} × €2.250` : '€2.250 per dakraam'}
              waarde={velux} max={6} onWaarde={(v) => zet({ velux: v })}
              bedrag={velux > 0 ? fmt(velux * RATES.velux) : undefined} tellerLabel="Aantal dakramen"
              extra={velux > 0 ? potlood('vx', 'Dakramen', velux * RATES.velux) : undefined}
              onder={editor('vx')} />

            <div className={`cursor-pointer rounded-xl border-2 transition-all ${trap ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/30'}`}>
              <div className="flex items-center gap-3 p-3.5" onClick={() => zet({ trap: !trap })}>
                <Vink aan={trap} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">Trap</div>
                  <div className="text-xs text-muted-foreground">
                    {trap
                      ? trapgat === 'geen' ? 'Trap €6.000 — geen trapgat'
                        : `Trap €6.000 + ${trapgat === 'beton' ? 'betonnen trapgat €5.500' : 'houten trapgat €1.750'}`
                      : 'Trap €6.000 + trapgat (optioneel)'}
                  </div>
                </div>
                {trap && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-primary">{fmt(RATES.trap + (trapgat === 'beton' ? RATES.trapgatBeton : trapgat === 'hout' ? RATES.trapgatHout : 0))}</span>
                    {potlood('tr', 'Trap', RATES.trap)}
                    {klapper('trap')}
                  </div>
                )}
              </div>
              {trap && editor('tr')}
              {trap && !dicht.trap && (
                <div className="border-t border-primary/20 px-3.5 pb-3.5 pt-2" onClick={(e) => e.stopPropagation()}>
                  <div className="mb-2 text-xs font-bold text-secondary">Trapgat (optioneel)</div>
                  <div className="flex gap-1.5">
                    {([['geen', 'Geen trapgat'], ['hout', 'Hout — €1.750'], ['beton', 'Beton — €5.500']] as const).map(([k, l]) => (
                      <button key={k} onClick={() => zet({ trapgat: k })}
                        className={`rounded-lg border-2 px-4 py-1.5 text-xs font-semibold transition-all ${trapgat === k ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-primary/30 text-secondary'}`}>{l}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <TellerOptie label="Airco"
              desc={airco > 0 ? `${airco} toestel${airco > 1 ? 'len' : ''} — staffelprijs` : '1→€4K · 2→€6K · 3→€7,5K · 4→€10K · 5→€11K'}
              waarde={airco} max={5} onWaarde={(v) => zet({ airco: v })}
              bedrag={airco > 0 ? fmt(RATES.airco[Math.min(airco, 5)]) : undefined} tellerLabel="Aantal toestellen"
              extra={airco > 0 ? potlood('ac', 'Airco', RATES.airco[Math.min(airco, 5)]) : undefined}
              onder={editor('ac')} />

            <ToggleOption label="Schilderwerken"
              desc={nettoNum > 0 ? `Forfait: ${nettoNum < 40 ? '€2.500 (< 40m²)' : '€4.000 (≥ 40m²)'}` : '€2.500 (< 40m²) of €4.000 (≥ 40m²)'}
              active={schilderwerken} onToggle={() => zet({ schilderwerken: !schilderwerken })}
              amount={schilderwerken && nettoNum > 0 ? fmt(RATES.schilderwerken(nettoNum)) : undefined}
              extra={schilderwerken && nettoNum > 0 ? potlood('sw', 'Schilderwerken', RATES.schilderwerken(nettoNum)) : undefined}
              onder={editor('sw')} />
          </div>
        </div>

        <ExtraElementen state={{ ...cs, netto_m2: nettoNum || null }} onChange={zet} />

      {margeVraag && result && (
        <MargeRedenDialog
          open
          kant={margeVraag}
          items={result.items}
          bedrag={margeVraag === 'min' ? result.min : result.max}
          argumenten={cs.marge?.argumenten ?? []}
          onOpslaan={(argumenten: MargeArgument[]) => {
            if (cs.marge) zet({ marge: { ...cs.marge, argumenten } });
            margeVoor.current = undefined;
            setMargeVraag(null);
          }}
          onAnnuleer={() => {
            // Geen onderbouwing? Dan gaat de marge terug zoals ze was.
            zet({ marge: margeVoor.current });
            margeVoor.current = undefined;
            setMargeVraag(null);
          }}
        />
      )}
      </div>

      {/* Rechts: resultaat */}
      <div className="self-start lg:sticky lg:top-6">
        <div className="rounded-xl bg-foreground p-6 text-primary-foreground shadow-xl">
          <div className="mb-5 text-xs font-bold uppercase tracking-[1.8px] text-primary-foreground/40">Prijsindicatie</div>
          {result ? (
            <>
              <div className="mb-4 flex items-center gap-2 font-body">
                <span className="text-xs uppercase tracking-wider text-primary-foreground/70">BTW-tarief:</span>
                {([6, 21] as const).map((t) => (
                  <button key={t} onClick={() => setBtwPercentage(t)}
                    className={`px-3.5 py-1 text-xs transition-all ${btwPercentage === t ? 'bg-white font-bold text-primary' : 'border border-white/30 text-primary-foreground/70'}`}>{t}%</button>
                ))}
                <span className="ml-1 text-[0.7rem] text-primary-foreground/50">
                  {btwPercentage === 6 ? '(woning ouder dan 10 jaar)' : '(woning jonger dan 10 jaar)'}
                </span>
              </div>

              <div className="mb-1 text-center">
                <span className="text-xs tracking-wider text-primary-foreground/40">INCL. 6% BTW</span>
                <span className="block text-2xl font-bold tracking-tight text-primary">{fmt(result.incl6)}</span>
              </div>

              <MargeBalk
                min={result.min}
                max={result.max}
                factorMin={result.factorMin}
                factorMax={result.factorMax}
                verschoven={result.margeVerschoven}
                onSleep={(fMin, fMax) => zet({ marge: { min: fMin, max: fMax, argumenten: cs.marge?.argumenten ?? [] } })}
                onLos={(kant) => setMargeVraag(kant)}
                onHerstel={() => zet({ marge: undefined })}
              />

              <div className="mb-5 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 p-3">
                  <div className="mb-1 text-xs font-bold uppercase tracking-wider text-primary-foreground/40">Excl. BTW</div>
                  <div className="text-base font-bold text-primary-foreground/90">{fmt(result.excl)}</div>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                  <div className="mb-1 text-xs font-bold uppercase tracking-wider text-cyan-300">Incl. 6% BTW</div>
                  <div className="text-base font-bold text-primary-foreground">{fmt(result.incl6)}</div>
                </div>
                <div className="col-span-2 rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 p-3">
                  <div className="mb-1 text-xs font-bold uppercase tracking-wider text-primary-foreground/40">Incl. 21% BTW</div>
                  <div className="text-base font-bold text-primary-foreground/90">{fmt(result.incl21)}</div>
                  <div className="mt-0.5 text-xs text-primary-foreground/30">nieuwbouw of woning &lt; 10 jaar</div>
                </div>
              </div>

              <hr className="my-3 border-primary-foreground/10" />
              {result.items.map((item) => (
                <div key={item.key} className="flex items-baseline justify-between py-1">
                  <span className="text-xs text-primary-foreground/55">
                    {item.label}
                    {item.categorie !== 'standaard' && <span className="ml-1 text-[10px] uppercase text-cyan-300/70">eigen bereik</span>}
                    {/* Aanpassen gebeurt links bij de optie zelf; hier alleen tonen
                        dat dit bedrag niet uit het tarief komt. */}
                    {item.handmatig && <span className="ml-1 text-[10px] uppercase text-amber-300/80">handmatig</span>}
                  </span>
                  <span className="text-xs font-semibold text-primary-foreground/85">
                    {item.min != null && item.max != null && item.min !== item.max
                      ? `${fmt(item.min)} — ${fmt(item.max)}`
                      : fmt(item.amount)}
                  </span>
                </div>
              ))}
              <hr className="my-3 border-primary-foreground/10" />
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-primary-foreground/80">Totaal excl. BTW</span>
                <span className="text-sm font-bold text-primary-foreground">{fmt(result.excl)}</span>
              </div>
            </>
          ) : (
            <div className="py-7 text-center text-sm leading-relaxed text-primary-foreground/30">
              <span className="mb-2.5 block text-3xl opacity-50">🏠</span>
              Vul de bruto oppervlakte in om een prijsindicatie te berekenen.
            </div>
          )}
        </div>
        <div className="mt-3 px-0.5 text-xs leading-relaxed text-muted-foreground">
          ⚠ Indicatieve raming. Definitieve prijs na plaatsbezoek en opmeting. Bandbreedte ±15% op de tariefposten
          {heeftEigenBand && '; elementen met een eigen minimum en maximum tellen exact mee zoals ingevuld'}.
        </div>
      </div>
    </div>
  );
}

function Vink({ aan }: { aan: boolean }) {
  return (
    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${aan ? 'border-primary bg-primary' : 'border-border bg-card'}`}>
      {aan && <span className="text-[10px] font-bold text-primary-foreground">✓</span>}
    </div>
  );
}

// `extra` is de plek voor het potlood waarmee het bedrag handmatig gezet wordt.
// Het staat buiten de klikbare zone, anders zou aanpassen de optie uitvinken.
function ToggleOption({ label, desc, active, onToggle, amount, extra, onder }: {
  label: string; desc: string; active: boolean; onToggle: () => void; amount?: string; extra?: React.ReactNode; onder?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border-2 transition-all ${active ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/30'}`}>
      <div className="flex cursor-pointer items-center gap-3 p-3.5" onClick={onToggle}>
        <Vink aan={active} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        {amount && <div className="text-sm font-bold text-primary">{amount}</div>}
        {extra}
      </div>
      {onder}
    </div>
  );
}

function TellerOptie({ label, desc, waarde, max, onWaarde, bedrag, tellerLabel, extra, onder }: {
  label: string; desc: string; waarde: number; max: number; onWaarde: (v: number) => void; bedrag?: string; tellerLabel: string; extra?: React.ReactNode; onder?: React.ReactNode;
}) {
  return (
    <div className={`cursor-pointer rounded-xl border-2 transition-all ${waarde > 0 ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/30'}`}>
      <div className="flex items-center gap-3 p-3.5" onClick={() => waarde === 0 && onWaarde(1)}>
        <Vink aan={waarde > 0} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        {bedrag && <div className="text-sm font-bold text-primary">{bedrag}</div>}
        {extra}
      </div>
      {waarde > 0 && (
        <div className="border-t border-primary/20 px-3.5 pb-3.5 pt-2" onClick={(e) => e.stopPropagation()}>
          <div className="mb-2 text-xs font-bold text-secondary">{tellerLabel}</div>
          <div className="inline-flex items-center overflow-hidden rounded-lg border-2 border-primary/30 bg-card">
            <button onClick={() => onWaarde(Math.max(0, waarde - 1))} className="flex h-9 w-9 items-center justify-center text-lg font-bold text-primary hover:bg-accent">−</button>
            <span className="w-11 text-center text-lg font-bold">{waarde}</span>
            <button onClick={() => onWaarde(Math.min(max, waarde + 1))} className="flex h-9 w-9 items-center justify-center text-lg font-bold text-primary hover:bg-accent">+</button>
          </div>
          {onder}
        </div>
      )}
    </div>
  );
}
