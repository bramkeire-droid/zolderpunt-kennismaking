import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import PrijsCalculatorPaneel from '@/components/calculator/PrijsCalculatorPaneel';
import { berekenPrijs } from '@/lib/prijscalculator';

// Een ouder dossier heeft wel bedragen maar geen bewaarde calculator-instellingen.
const geenBewaardeInstellingen = null;

const budgetSchrijfacties = (onChange: ReturnType<typeof vi.fn>) =>
  onChange.mock.calls.filter(([p]) => p && 'budget_excl' in p);

describe('PrijsCalculatorPaneel — openen mag niets overschrijven', () => {
  it('schrijft geen bedragen weg als het dossier al een berekening heeft', () => {
    const onChange = vi.fn();
    render(
      <PrijsCalculatorPaneel
        oppervlakteM2={60}
        calculatorState={geenBewaardeInstellingen}
        btwPercentage={6}
        opgeslagenBudgetExcl={48000}
        onChange={onChange}
      />,
    );
    expect(budgetSchrijfacties(onChange)).toHaveLength(0);
  });

  it('schrijft de basisberekening wel weg bij een dossier zonder bedragen', () => {
    const onChange = vi.fn();
    render(
      <PrijsCalculatorPaneel
        oppervlakteM2={60}
        calculatorState={geenBewaardeInstellingen}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={onChange}
      />,
    );
    expect(budgetSchrijfacties(onChange).length).toBeGreaterThan(0);
  });

  it('schrijft niets weg zonder oppervlakte', () => {
    const onChange = vi.fn();
    render(
      <PrijsCalculatorPaneel
        oppervlakteM2={null}
        calculatorState={geenBewaardeInstellingen}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={onChange}
      />,
    );
    expect(budgetSchrijfacties(onChange)).toHaveLength(0);
  });
});

describe('PrijsCalculatorPaneel - aparte posten zonder oppervlakte', () => {
  it('schrijft niets weg bij een aangevinkt maar nog leeg element', () => {
    // Anders zou een bestaand budget met nullen overschreven worden zodra
    // iemand zonder oppervlakte een vinkje zet.
    const onChange = vi.fn();
    render(
      <PrijsCalculatorPaneel
        oppervlakteM2={0}
        calculatorState={{
          badkamer: { actief: true, onderdelen: [{ key: 'bad', label: 'Bad', actief: true, min: null, max: null }] },
        }}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={onChange}
      />,
    );
    expect(budgetSchrijfacties(onChange)).toHaveLength(0);
  });

  it('schrijft de aparte post wel weg zonder oppervlakte', () => {
    // Een dossier waar de oppervlakte bewust op 0 staat, niet een dossier waar
    // ze nog niet ingevuld is - dat laatste rekent terecht niet.
    const onChange = vi.fn();
    render(
      <PrijsCalculatorPaneel
        oppervlakteM2={0}
        calculatorState={{ maatwerk: { actief: true, min: 4000, max: 7000 } }}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={onChange}
      />,
    );
    const acties = budgetSchrijfacties(onChange);
    expect(acties.length).toBeGreaterThan(0);
    expect(acties[acties.length - 1][0].budget_excl).toBe(5500);
  });
});

describe('PrijsCalculatorPaneel - wat je op het scherm ziet bij 0 m2', () => {
  const toon = (calculatorState: any, oppervlakteM2: number | null = 0) =>
    render(
      <PrijsCalculatorPaneel
        oppervlakteM2={oppervlakteM2}
        calculatorState={calculatorState}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={vi.fn()}
      />,
    );

  it('toont de uitnodiging zolang er niets ingevuld is', () => {
    toon(null, null);
    expect(screen.getByText(/Vul een oppervlakte in, of voeg een aparte post toe/)).toBeTruthy();
  });

  it('toont de prijsindicatie zodra er een aparte post staat', () => {
    toon({ maatwerk: { actief: true, min: 4000, max: 7000 } });
    expect(screen.queryByText(/Vul een oppervlakte in, of voeg een aparte post toe/)).toBeNull();
    // De post zelf hoort in de rechterkolom te staan, niet alleen in de invoer.
    expect(screen.getAllByText('Maatwerk').length).toBeGreaterThan(0);
  });

  it('verbergt de marge-schuif als er geen tariefdeel is om te verschuiven', () => {
    // Slepen zou daar geen enkel bedrag veranderen: de marge werkt alleen op
    // het tariefdeel, en dat is nul.
    toon({ maatwerk: { actief: true, min: 4000, max: 7000 } });
    expect(screen.queryByLabelText('Minimum verschuiven')).toBeNull();
  });

  it('houdt de marge-schuif bij een gewoon dossier mET oppervlakte', () => {
    render(
      <PrijsCalculatorPaneel
        oppervlakteM2={60}
        calculatorState={null}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Minimum verschuiven')).toBeTruthy();
  });
});

describe('PrijsCalculatorPaneel - een zelf ingetypte 0 blijft staan', () => {
  // In de videocall intake geeft Slide5B geen schrijfOppervlakte mee, dus de 0
  // staat alleen lokaal terwijl lead.oppervlakte_m2 nog 80 is. nettoManuallySet
  // zit in de dependencies van de sync-effect: het nettoveld aanraken liet die
  // effect opnieuw lopen en zette bruto terug op 80. Alle tariefposten kwamen
  // dan terug en werden weggeschreven als budget - een geldfout.
  const velden = (c: HTMLElement) =>
    Array.from(c.querySelectorAll('input[type="number"]')) as HTMLInputElement[];

  it('zet bruto niet terug naar de dossierwaarde na het aanraken van netto', () => {
    const { container } = render(
      <PrijsCalculatorPaneel
        oppervlakteM2={80}
        calculatorState={null}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={vi.fn()}
      />,
    );
    const [bruto, netto] = velden(container);
    fireEvent.change(bruto, { target: { value: '0' } });
    expect(bruto.value).toBe('0');
    // Netto op een ANDERE waarde zetten dan wat er staat: fireEvent.change naar
    // dezelfde waarde laat React de handler overslaan, en dan flipt
    // nettoManuallySet niet - precies waardoor deze test eerst leeg was.
    fireEvent.change(netto, { target: { value: '45' } });
    expect(bruto.value).toBe('0');
  });

  it('laat een handmatige netto staan bij een getypte 0', () => {
    // Hier stond het omgekeerde: netto werd meegetrokken naar 0. Dat wiste de
    // bewaarde waarde zonder weg terug - gemeten gaf '0' gevolgd door '80'
    // +EUR 7.350, en '-5' gevolgd door '80' -EUR 19.215. Rekenkundig voegde het
    // niets toe, want berekenPrijs zet netto bij bruto 0 zelf al op nul.
    const { container } = render(
      <PrijsCalculatorPaneel
        oppervlakteM2={80}
        calculatorState={{ netto_m2: 55, netto_manually_set: true }}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={vi.fn()}
      />,
    );
    const [bruto, netto] = velden(container);
    expect(netto.value).toBe('55');
    fireEvent.change(bruto, { target: { value: '0' } });
    expect(netto.value).toBe('55');
  });

  it('laat bruto het dossier nog wel volgen zolang niemand iets wijzigde', () => {
    // De oorspronkelijke bedoeling van die effect: de oppervlakte komt
    // asynchroon binnen. Die moet blijven werken.
    const { container, rerender } = render(
      <PrijsCalculatorPaneel
        oppervlakteM2={null}
        calculatorState={null}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={vi.fn()}
      />,
    );
    expect(velden(container)[0].value).toBe('');
    rerender(
      <PrijsCalculatorPaneel
        oppervlakteM2={72}
        calculatorState={null}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={vi.fn()}
      />,
    );
    expect(velden(container)[0].value).toBe('72');
  });
});

describe('PrijsCalculatorPaneel - btw-knop mag geen nullen wegschrijven', () => {
  // Voor deze wijziging gaf berekenPrijs null bij 0 m2 en werden de btw-knoppen
  // niet eens gerenderd. Nu het paneel wel verschijnt is die knop bereikbaar
  // terwijl alle bedragen 0 zijn.
  const prijsActies = (onChange: ReturnType<typeof vi.fn>) =>
    onChange.mock.calls.filter(([p]) => p && 'prijs_min_incl_btw' in p);

  const velden = (c: HTMLElement) =>
    Array.from(c.querySelectorAll('input[type="number"]')) as HTMLInputElement[];

  it('schrijft geen prijsvelden na bruto 0 met een nog leeg element', () => {
    const onChange = vi.fn();
    const { container } = render(
      <PrijsCalculatorPaneel
        oppervlakteM2={80}
        calculatorState={{
          badkamer: { actief: true, onderdelen: [{ key: 'bad', label: 'Bad', actief: true, min: null, max: null }] },
        } as any}
        btwPercentage={6}
        opgeslagenBudgetExcl={41537}
        opgeslagenVorkExcl={{ min: 35307, max: 47768 }}
        onChange={onChange}
        schrijfOppervlakte
      />,
    );
    fireEvent.change(velden(container)[0], { target: { value: '0' } });
    fireEvent.click(screen.getByText('21%'));
    expect(prijsActies(onChange)).toHaveLength(0);
    // Het tarief zelf is een labelkeuze en mag wel bewaard worden.
    expect(onChange.mock.calls.some(([p]) => p && p.btw_percentage === 21)).toBe(true);
  });

  it('schrijft de prijsvelden wel zodra er een bedrag staat', () => {
    const onChange = vi.fn();
    const { container } = render(
      <PrijsCalculatorPaneel
        oppervlakteM2={80}
        calculatorState={{ maatwerk: { actief: true, min: 4000, max: 7000 } } as any}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={onChange}
        schrijfOppervlakte
      />,
    );
    fireEvent.change(velden(container)[0], { target: { value: '0' } });
    fireEvent.click(screen.getByText('21%'));
    const p = prijsActies(onChange);
    expect(p.length).toBeGreaterThan(0);
    expect(p[p.length - 1][0].prijs_min_incl_btw).toBe(Math.round(4000 * 1.21));
  });
});

describe('PrijsCalculatorPaneel - een bewaarde 0 blijft 0', () => {
  const velden = (c: HTMLElement) =>
    Array.from(c.querySelectorAll('input[type="number"]')) as HTMLInputElement[];

  it('toont een bewaarde oppervlakte van 0 als 0 en niet als leeg', () => {
    const { container } = render(
      <PrijsCalculatorPaneel
        oppervlakteM2={0}
        calculatorState={null}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={vi.fn()}
      />,
    );
    expect(velden(container)[0].value).toBe('0');
  });

  it('bewaart een ingetypte 0 als 0 in plaats van null', () => {
    // Met null was "bewust geen oppervlakte" niet te onderscheiden van "nog
    // niet ingevuld", en sprong het veld bij de volgende remount terug.
    const onChange = vi.fn();
    const { container } = render(
      <PrijsCalculatorPaneel
        oppervlakteM2={null}
        calculatorState={null}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={onChange}
        schrijfOppervlakte
      />,
    );
    fireEvent.change(velden(container)[0], { target: { value: '0' } });
    const opp = onChange.mock.calls.filter(([p]) => p && 'oppervlakte_m2' in p);
    expect(opp.length).toBeGreaterThan(0);
    expect(opp[opp.length - 1][0].oppervlakte_m2).toBe(0);
  });

  it('maakt er null van wanneer het veld leeggemaakt wordt', () => {
    const onChange = vi.fn();
    const { container } = render(
      <PrijsCalculatorPaneel
        oppervlakteM2={null}
        calculatorState={null}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={onChange}
        schrijfOppervlakte
      />,
    );
    // Eerst een getal, anders is leegmaken geen wijziging en slaat React de
    // handler over.
    fireEvent.change(velden(container)[0], { target: { value: '60' } });
    fireEvent.change(velden(container)[0], { target: { value: '' } });
    const opp = onChange.mock.calls.filter(([p]) => p && 'oppervlakte_m2' in p);
    expect(opp[opp.length - 1][0].oppervlakte_m2).toBeNull();
  });
});

describe('PrijsCalculatorPaneel - een leeg brutoveld mag geen budget afknippen', () => {
  // "Leeg" en "0" zijn niet hetzelfde. Een getalveld leegmaken om het opnieuw
  // te typen (select-all + backspace) is alledaags; dat mag nooit als "dit
  // dossier heeft geen oppervlakte" gelezen worden. Alleen een getypte 0 is
  // een uitspraak. Alle vier deze gevallen zijn gemeten voordat ze gefixt waren.
  const velden = (c: HTMLElement) =>
    Array.from(c.querySelectorAll('input[type="number"]')) as HTMLInputElement[];

  const opties = {
    dakisolatie_type: 'spantendak' as const, vloer: true, velux: 2,
    trap: true, trapgat: 'hout' as const, schilderwerken: true,
  };

  it('schrijft niets weg als het brutoveld leeggemaakt wordt', () => {
    // Gemeten zonder fix: budget_excl 49.537 -> 12.863, en binnenplaat,
    // algemene afwerking, plamuur, isolatie, vloer en schilderwerken
    // verdwenen uit inbegrepen_posten.
    const onChange = vi.fn();
    const { container } = render(
      <PrijsCalculatorPaneel
        oppervlakteM2={80}
        calculatorState={opties as any}
        btwPercentage={6}
        opgeslagenBudgetExcl={49537}
        onChange={onChange}
        schrijfOppervlakte
      />,
    );
    fireEvent.change(velden(container)[0], { target: { value: '' } });
    expect(budgetSchrijfacties(onChange)).toHaveLength(0);
  });

  it('schrijft niets weg bij leegmaken op een dossier met een aparte post', () => {
    // Gemeten zonder fix: 45.000 -> 4.000, postenlijst teruggebracht tot ['Bad'].
    const onChange = vi.fn();
    const { container } = render(
      <PrijsCalculatorPaneel
        oppervlakteM2={80}
        calculatorState={{
          badkamer: { actief: true, onderdelen: [{ key: 'bad', label: 'Bad', actief: true, min: 3000, max: 5000 }] },
        } as any}
        btwPercentage={6}
        opgeslagenBudgetExcl={45000}
        onChange={onChange}
        schrijfOppervlakte
      />,
    );
    fireEvent.change(velden(container)[0], { target: { value: '' } });
    expect(budgetSchrijfacties(onChange)).toHaveLength(0);
  });

  it('schrijft niets weg op een oud dossier zonder oppervlakte', () => {
    // Zulke dossiers bestaan: de intake schreef oppervlakte_m2 tot nu toe nooit
    // weg, dus er staat wel een budget maar geen oppervlakte. Gemeten zonder
    // fix: maatwerk aanvinken maakte van 45.000 ineens 5.500.
    const onChange = vi.fn();
    render(
      <PrijsCalculatorPaneel
        oppervlakteM2={null}
        calculatorState={{ maatwerk: { actief: false, min: 4000, max: 7000 } } as any}
        btwPercentage={6}
        opgeslagenBudgetExcl={45000}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Kasten en ander schrijnwerk op maat'));
    expect(budgetSchrijfacties(onChange)).toHaveLength(0);
  });

  it('laat een handmatige netto staan terwijl bruto gecorrigeerd wordt', () => {
    // Gemeten zonder fix: '80' -> '8' -> '' -> '9' -> '90' wiste netto 55,
    // waarna netto bruto volgde en het budget van 68.680 naar 83.380 sprong.
    const onChange = vi.fn();
    const { container } = render(
      <PrijsCalculatorPaneel
        oppervlakteM2={80}
        calculatorState={{ ...opties, netto_m2: 55, netto_manually_set: true } as any}
        btwPercentage={6}
        opgeslagenBudgetExcl={49537}
        onChange={onChange}
        schrijfOppervlakte
      />,
    );
    const [bruto, netto] = velden(container);
    for (const v of ['8', '', '9', '90']) fireEvent.change(bruto, { target: { value: v } });
    expect(netto.value).toBe('55');
  });

  it('een getypte 0 is wel een uitspraak en rekent opnieuw', () => {
    // Dit is precies wat Bram wil: oppervlakte bewust op nul, alleen de aparte
    // posten tellen nog mee.
    const onChange = vi.fn();
    const { container } = render(
      <PrijsCalculatorPaneel
        oppervlakteM2={80}
        calculatorState={{ maatwerk: { actief: true, min: 4000, max: 7000 } } as any}
        btwPercentage={6}
        opgeslagenBudgetExcl={45000}
        onChange={onChange}
        schrijfOppervlakte
      />,
    );
    fireEvent.change(velden(container)[0], { target: { value: '0' } });
    const acties = budgetSchrijfacties(onChange);
    expect(acties.length).toBeGreaterThan(0);
    expect(acties[acties.length - 1][0].budget_excl).toBe(5500);
  });
});

describe('PrijsCalculatorPaneel - levend dossier dat zijn eigen patches terugkrijgt', () => {
  // PrijscalculatorDialog schrijft elke patch meteen naar Supabase en voedt de
  // nieuwe toestand terug als prop. Zonder die terugkoppeling in de test blijft
  // calculator_state bevroren en meet je niets.
  function Harnas({ oppervlakteM2, start, opgeslagenBudgetExcl, onPatch }: any) {
    const [cs, setCs] = useState(start);
    const [opp, setOpp] = useState(oppervlakteM2);
    return (
      <PrijsCalculatorPaneel
        oppervlakteM2={opp}
        calculatorState={cs}
        btwPercentage={6}
        opgeslagenBudgetExcl={opgeslagenBudgetExcl}
        onChange={(p: any) => {
          onPatch(p);
          if (p.calculator_state) setCs(p.calculator_state);
          if ('oppervlakte_m2' in p) setOpp(p.oppervlakte_m2);
        }}
        schrijfOppervlakte
      />
    );
  }

  it('oud dossier zonder oppervlakte: maatwerk aanvinken raakt het budget niet', () => {
    // Zulke dossiers bestaan: de intake schreef oppervlakte_m2 tot nu toe nooit
    // weg, dus er staat wel een budget maar geen oppervlakte. Gemeten met de
    // vorige versie: 45.000 werd 5.500.
    const patches: any[] = [];
    render(
      <Harnas
        oppervlakteM2={null}
        start={{ maatwerk: { actief: false, min: 4000, max: 7000 } }}
        opgeslagenBudgetExcl={45000}
        onPatch={(p: any) => patches.push(p)}
      />,
    );
    fireEvent.click(screen.getByText('Kasten en ander schrijnwerk op maat'));
    expect(patches.some((p) => 'budget_excl' in p)).toBe(false);
    // De keuze zelf wordt wel bewaard, zodat het vinkje blijft staan.
    expect(patches.some((p) => p.calculator_state?.maatwerk?.actief)).toBe(true);
  });

  it('met een getypte 0 telt diezelfde maatwerkpost wel mee', () => {
    const patches: any[] = [];
    const { container } = render(
      <Harnas
        oppervlakteM2={null}
        start={{ maatwerk: { actief: true, min: 4000, max: 7000 } }}
        opgeslagenBudgetExcl={45000}
        onPatch={(p: any) => patches.push(p)}
      />,
    );
    const bruto = (container.querySelectorAll('input[type="number"]')[0]) as HTMLInputElement;
    fireEvent.change(bruto, { target: { value: '0' } });
    const budgetten = patches.filter((p) => 'budget_excl' in p);
    expect(budgetten.length).toBeGreaterThan(0);
    expect(budgetten[budgetten.length - 1].budget_excl).toBe(5500);
  });

  it('de oppervlakte blijft 0 na het terugkrijgen van de patch', () => {
    // Dit is wat er misging bij het wisselen van slide: bruto kwam opnieuw uit
    // lead.oppervlakte_m2 en sprong terug naar de waarde uit een eerdere slide.
    const patches: any[] = [];
    const { container } = render(
      <Harnas
        oppervlakteM2={80}
        start={{ maatwerk: { actief: true, min: 4000, max: 7000 } }}
        opgeslagenBudgetExcl={null}
        onPatch={(p: any) => patches.push(p)}
      />,
    );
    const velden = () => Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
    fireEvent.change(velden()[0], { target: { value: '0' } });
    expect(velden()[0].value).toBe('0');
    // De 0 zit in calculator_state; het dossierveld blijft 80, want dat is wat
    // de klant opgaf.
    const cs = patches.filter((p) => p.calculator_state);
    expect(cs[cs.length - 1].calculator_state.bruto_m2).toBe(0);
    expect(patches.filter((p) => 'oppervlakte_m2' in p)).toHaveLength(0);
  });
});

describe('PrijsCalculatorPaneel - de netto is net zo kostbaar als de bruto', () => {
  const velden = (c: HTMLElement) =>
    Array.from(c.querySelectorAll('input[type="number"]')) as HTMLInputElement[];

  const opties = {
    dakisolatie_type: 'spantendak' as const, vloer: true, velux: 2,
    trap: true, trapgat: 'hout' as const, schilderwerken: true,
    netto_m2: 55, netto_manually_set: true,
  };

  const dossier = (onChange: any) =>
    render(
      <PrijsCalculatorPaneel
        oppervlakteM2={80}
        calculatorState={opties as any}
        btwPercentage={6}
        opgeslagenBudgetExcl={37328}
        onChange={onChange}
        schrijfOppervlakte
      />,
    );

  // De twee uitkomsten moeten meetbaar verschillen, anders bewijst de test niets.
  const metNetto = (n: number) => Math.round(berekenPrijs({ ...opties, netto_m2: n }, 80)!.excl);

  it('de twee netto-waarden geven echt een ander bedrag', () => {
    expect(metNetto(55)).not.toBe(metNetto(80));
  });

  it("'0' typen en meteen corrigeren naar '80' houdt de netto van 55", () => {
    // Gemeten zonder fix: netto werd 0, daarna volgde hij bruto - het budget
    // sprong naar dat van netto 80 (bij de agent: 37.328 -> 44.678).
    const onChange = vi.fn();
    const { container } = dossier(onChange);
    const [bruto, netto] = velden(container);
    fireEvent.change(bruto, { target: { value: '0' } });
    fireEvent.change(bruto, { target: { value: '80' } });
    expect(netto.value).toBe('55');
    const b = budgetSchrijfacties(onChange);
    expect(b.length).toBeGreaterThan(0);
    expect(b[b.length - 1][0].budget_excl).toBe(metNetto(55));
  });

  it("'-5' typen en corrigeren naar '80' houdt de netto van 55", () => {
    // Gemeten zonder fix: netto werd -5 en bleef zo staan (-EUR 19.215).
    const onChange = vi.fn();
    const { container } = dossier(onChange);
    const [bruto, netto] = velden(container);
    fireEvent.change(bruto, { target: { value: '-5' } });
    fireEvent.change(bruto, { target: { value: '80' } });
    expect(netto.value).toBe('55');
    const b = budgetSchrijfacties(onChange);
    expect(b.length).toBeGreaterThan(0);
    expect(b[b.length - 1][0].budget_excl).toBe(metNetto(55));
  });

  it('het nettoveld leegmaken schrijft niets weg', () => {
    // Gemeten zonder fix: leegmaken gaf meteen 44.678, want een lege netto las
    // de kern als "netto = bruto". PrijscalculatorDialog stuurt elke patch
    // direct door, dus halverwege sluiten maakte dat definitief.
    const onChange = vi.fn();
    const { container } = dossier(onChange);
    fireEvent.change(velden(container)[1], { target: { value: '' } });
    expect(budgetSchrijfacties(onChange)).toHaveLength(0);
    expect(onChange.mock.calls.filter(([p]) => p && p.calculator_state)).toHaveLength(0);
  });

  it('een negatieve netto schrijft niets weg', () => {
    const onChange = vi.fn();
    const { container } = dossier(onChange);
    fireEvent.change(velden(container)[1], { target: { value: '-5' } });
    expect(budgetSchrijfacties(onChange)).toHaveLength(0);
  });

  it('een geldige netto schrijft wel gewoon weg', () => {
    const onChange = vi.fn();
    const { container } = dossier(onChange);
    fireEvent.change(velden(container)[1], { target: { value: '60' } });
    const cs = onChange.mock.calls.filter(([p]) => p && p.calculator_state);
    expect(cs[cs.length - 1][0].calculator_state.netto_m2).toBe(60);
  });
});

describe('PrijsCalculatorPaneel - de calculator heeft een eigen bruto', () => {
  // Bram: "het ingevoerde getal als input wijzigt niet, enkel in de calculator."
  // De bruto hier is een technisch getal; lead.oppervlakte_m2 is wat de klant
  // opgaf in de eerste slides. De calculator bewaart de zijne in
  // calculator_state.bruto_m2, naast de netto die daar al stond.
  const velden = (c: HTMLElement) =>
    Array.from(c.querySelectorAll('input[type="number"]')) as HTMLInputElement[];

  const intake = (props: any) =>
    render(
      <PrijsCalculatorPaneel
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        {...props}
      />,
    );

  it('raakt het dossierveld niet aan in de intake', () => {
    const onChange = vi.fn();
    const { container } = intake({ oppervlakteM2: 80, calculatorState: null, onChange });
    fireEvent.change(velden(container)[0], { target: { value: '0' } });
    expect(onChange.mock.calls.filter(([p]) => p && 'oppervlakte_m2' in p)).toHaveLength(0);
  });

  it('bewaart de ingetypte bruto wel in calculator_state', () => {
    const onChange = vi.fn();
    const { container } = intake({ oppervlakteM2: 80, calculatorState: null, onChange });
    fireEvent.change(velden(container)[0], { target: { value: '0' } });
    const cs = onChange.mock.calls.filter(([p]) => p && p.calculator_state);
    expect(cs[cs.length - 1][0].calculator_state.bruto_m2).toBe(0);
  });

  it('toont een bewaarde bruto van 0 na een remount, met 80 op het dossier', () => {
    // Dit is wat er misging bij het wisselen van slide: bruto kwam opnieuw uit
    // lead.oppervlakte_m2 en sprong terug naar de waarde uit een eerdere slide.
    const { container } = intake({
      oppervlakteM2: 80,
      calculatorState: { bruto_m2: 0, maatwerk: { actief: true, min: 4000, max: 7000 } },
      onChange: vi.fn(),
    });
    expect(velden(container)[0].value).toBe('0');
    expect(screen.queryByText(/Vul een oppervlakte in/)).toBeNull();
  });

  it('valt terug op het dossier zolang de calculator zelf niets bewaarde', () => {
    // Bestaande dossiers hebben geen bruto_m2 en moeten zich gedragen als vroeger.
    const { container } = intake({
      oppervlakteM2: 72,
      calculatorState: { vloer: true },
      onChange: vi.fn(),
    });
    expect(velden(container)[0].value).toBe('72');
  });

  it('laat een bewaarde bruto niet overschrijven door het dossier', () => {
    const { container, rerender } = intake({
      oppervlakteM2: null,
      calculatorState: { bruto_m2: 0, maatwerk: { actief: true, min: 4000, max: 7000 } },
      onChange: vi.fn(),
    });
    rerender(
      <PrijsCalculatorPaneel
        oppervlakteM2={95}
        calculatorState={{ bruto_m2: 0, maatwerk: { actief: true, min: 4000, max: 7000 } } as any}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={vi.fn()}
      />,
    );
    expect(velden(container)[0].value).toBe('0');
  });

  it('vult op de dossierpagina de oppervlakte aan als die nog ontbreekt', () => {
    // Daar bestaat schrijfOppervlakte voor: een dossier zonder intake-slide die
    // de oppervlakte al zette.
    const onChange = vi.fn();
    const { container } = intake({
      oppervlakteM2: null, calculatorState: null, onChange, schrijfOppervlakte: true,
    });
    fireEvent.change(velden(container)[0], { target: { value: '60' } });
    const opp = onChange.mock.calls.filter(([p]) => p && 'oppervlakte_m2' in p);
    expect(opp[opp.length - 1][0].oppervlakte_m2).toBe(60);
  });

  it('overschrijft een bestaande oppervlakte ook daar niet', () => {
    // Gemeten zonder fix: '0' typen in de dossiercalculator schreef 0 over de 80
    // die de klant opgaf, waarna de hele meerwaardesectie uit het portaal viel.
    const onChange = vi.fn();
    const { container } = intake({
      oppervlakteM2: 80, calculatorState: null, onChange, schrijfOppervlakte: true,
    });
    fireEvent.change(velden(container)[0], { target: { value: '0' } });
    expect(onChange.mock.calls.filter(([p]) => p && 'oppervlakte_m2' in p)).toHaveLength(0);
  });

  it('een optieklik bevriest de bruto niet', () => {
    // Gemeten zonder fix: zet() schreef bruto_m2 mee, waardoor de sync-poort
    // dichtviel en een correctie van de oppervlakte in slide 3 de prijs nooit
    // meer bereikte (rapport 120 m2, prijs van 80 m2).
    const onChange = vi.fn();
    intake({ oppervlakteM2: 80, calculatorState: null, onChange });
    fireEvent.click(screen.getByText('Kasten en ander schrijnwerk op maat'));
    const cs = onChange.mock.calls.filter(([p]) => p && p.calculator_state);
    expect(cs.length).toBeGreaterThan(0);
    expect(cs[cs.length - 1][0].calculator_state.bruto_m2).toBeUndefined();
  });
});
