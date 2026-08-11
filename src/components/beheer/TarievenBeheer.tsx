import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { RotateCcw, Save, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { bewaarTarieven, useTarieven } from '@/hooks/useTarieven';
import {
  BADKAMER_ONDERDELEN,
  STANDAARD_TARIEVEN,
  effectieveTarieven,
  fmtEuro,
  staffelBedrag,
  type Staffel,
  type Tarieven,
} from '@/lib/prijscalculator';

// Beheerdersconsole voor alle calculatorprijzen.
//
// De basisbedragen staan hier ONGEÏNDEXEERD, precies zoals ze in de tarieven
// bewaard worden. Naast elk veld staat het effectieve bedrag (basis × index),
// zodat zichtbaar is wat de calculator er werkelijk mee rekent — anders is een
// indexatie van 5% een onzichtbare val.

const nummerUit = (v: string): number => {
  const n = Number(v.replace(',', '.'));
  return isFinite(n) ? n : 0;
};

const leegOfNummer = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return isFinite(n) ? n : null;
};

function Veld({
  label, waarde, onChange, suffix, effectief, breed = false,
}: {
  label: string;
  waarde: string;
  onChange: (v: string) => void;
  suffix?: string;
  effectief?: string;
  breed?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${breed ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <Input
          value={waarde}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          className="h-9 tabular-nums"
        />
        {suffix && <span className="shrink-0 text-xs text-slate-500">{suffix}</span>}
      </div>
      {effektiefRegel(effectief)}
    </label>
  );
}

const effektiefRegel = (effectief?: string) =>
  effectief ? <span className="text-[11px] tabular-nums text-slate-400">wordt {effectief}</span> : null;

function Sectie({ titel, uitleg, children }: { titel: string; uitleg?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{titel}</h3>
      {uitleg && <p className="mt-0.5 mb-3 text-xs text-slate-500">{uitleg}</p>}
      <div className={`grid gap-3 sm:grid-cols-2 ${uitleg ? '' : 'mt-3'}`}>{children}</div>
    </section>
  );
}

/** De tarieven als bewerkbare tekst: tijdens typen mag een veld even leeg zijn. */
type Concept = {
  index: string;
  bandbreedte: string;
  perM2: Record<string, string>;
  vast: Record<string, string>;
  airco: Record<string, string>;
  plamuur: { geindexeerd: boolean; treden: { tot: string; bedrag: string }[] };
  schilderwerken: { geindexeerd: boolean; treden: { tot: string; bedrag: string }[] };
  standaardBedragen: Record<string, { min: string; max: string }>;
};

const naarConcept = (t: Tarieven): Concept => ({
  index: String(t.index),
  bandbreedte: String(Math.round(t.bandbreedte * 100)),
  perM2: Object.fromEntries(Object.entries(t.perM2).map(([k, v]) => [k, String(v)])),
  vast: Object.fromEntries(Object.entries(t.vast).map(([k, v]) => [k, String(v)])),
  airco: Object.fromEntries(Object.entries(t.airco).map(([k, v]) => [k, String(v)])),
  plamuur: {
    geindexeerd: t.plamuur.geindexeerd,
    treden: t.plamuur.treden.map((s) => ({ tot: s.tot == null ? '' : String(s.tot), bedrag: String(s.bedrag) })),
  },
  schilderwerken: {
    geindexeerd: t.schilderwerken.geindexeerd,
    treden: t.schilderwerken.treden.map((s) => ({ tot: s.tot == null ? '' : String(s.tot), bedrag: String(s.bedrag) })),
  },
  standaardBedragen: Object.fromEntries(
    Object.entries(t.standaardBedragen).map(([k, v]) => [
      k,
      { min: v.min == null ? '' : String(v.min), max: v.max == null ? '' : String(v.max) },
    ]),
  ),
});

const naarTarieven = (c: Concept): Tarieven => {
  const treden = (lijst: { tot: string; bedrag: string }[]): Staffel[] =>
    lijst.map((s) => ({ tot: s.tot.trim() === '' ? null : nummerUit(s.tot), bedrag: nummerUit(s.bedrag) }));
  return {
    index: nummerUit(c.index) || 1,
    bandbreedte: nummerUit(c.bandbreedte) / 100,
    perM2: Object.fromEntries(Object.entries(c.perM2).map(([k, v]) => [k, nummerUit(v)])) as Tarieven['perM2'],
    vast: Object.fromEntries(Object.entries(c.vast).map(([k, v]) => [k, nummerUit(v)])) as Tarieven['vast'],
    airco: Object.fromEntries(Object.entries(c.airco).map(([k, v]) => [Number(k), nummerUit(v)])),
    plamuur: { geindexeerd: c.plamuur.geindexeerd, treden: treden(c.plamuur.treden) },
    schilderwerken: { geindexeerd: c.schilderwerken.geindexeerd, treden: treden(c.schilderwerken.treden) },
    standaardBedragen: Object.fromEntries(
      Object.entries(c.standaardBedragen).map(([k, v]) => [
        k,
        { min: leegOfNummer(v.min), max: leegOfNummer(v.max) },
      ]),
    ),
  };
};

const PER_M2_LABELS: Record<string, string> = {
  binnenplaatafwerking: 'Binnenplaatafwerking (dak niet bekleed)',
  binnenplaatAfgedekt: 'Binnenplaatafwerking (dak al bekleed)',
  dakisolatieSpantendak: 'Dakisolatie spantendak',
  dakisolatieGordingendak: 'Dakisolatie gordingendak',
  vloer: 'Vloer (chape/uitpassen)',
  algemeenAfwerking: 'Algemene afwerking',
};

const VAST_LABELS: Record<string, string> = {
  velux: 'Velux dakraam (per stuk)',
  trap: 'Trap',
  trapgatHout: 'Trapgat in hout',
  trapgatBeton: 'Trapgat in beton',
};

const EXTRA_LABELS: Record<string, string> = {
  ...Object.fromEntries(BADKAMER_ONDERDELEN.map((o) => [o.key, o.label])),
  maatwerk: 'Maatwerk',
};

export default function TarievenBeheer() {
  const { user } = useAuth();
  const { tarieven, geladen, herlaad } = useTarieven();
  const [concept, setConcept] = useState<Concept>(() => naarConcept(tarieven));
  const [bezig, setBezig] = useState(false);
  const [vuil, setVuil] = useState(false);

  // Pas overnemen wanneer de opgeslagen tarieven binnen zijn — anders
  // overschrijft de eerste render met standaardwaarden wat net geladen werd.
  useEffect(() => {
    if (geladen && !vuil) setConcept(naarConcept(tarieven));
  }, [geladen, tarieven, vuil]);

  const wijzig = (fn: (c: Concept) => Concept) => {
    setVuil(true);
    setConcept((c) => fn(c));
  };

  const voorbeeld = naarTarieven(concept);
  const eff = effectieveTarieven(voorbeeld);

  const opslaan = async () => {
    setBezig(true);
    try {
      await bewaarTarieven(naarTarieven(concept), user?.id ?? null);
      await herlaad();
      setVuil(false);
      toast.success('Tarieven bewaard — nieuwe berekeningen gebruiken ze meteen');
    } catch (e: any) {
      toast.error(
        e?.message?.includes('row-level security')
          ? 'Geen rechten om tarieven te wijzigen (alleen een beheerder mag dit).'
          : 'Bewaren mislukt: ' + (e?.message || 'onbekende fout'),
      );
    } finally {
      setBezig(false);
    }
  };

  const herstel = () => {
    setVuil(true);
    setConcept(naarConcept(STANDAARD_TARIEVEN));
    toast.info('Standaardwaarden ingevuld — nog niet bewaard');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-xl font-bold text-slate-900">Calculatorprijzen</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Deze bedragen gelden voor elke nieuwe berekening. Bestaande dossiers behouden hun
            opgeslagen bedragen tot je de calculator daar opnieuw opent.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={herstel} disabled={bezig} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Standaardwaarden
          </Button>
          <Button onClick={opslaan} disabled={bezig || !vuil} className="gap-2">
            <Save className="h-4 w-4" /> {bezig ? 'Bewaren…' : 'Bewaren'}
          </Button>
        </div>
      </div>

      <Sectie
        titel="Indexatie en bandbreedte"
        uitleg="De index wordt op alle basisbedragen toegepast. De bandbreedte bepaalt de vork rond het meest waarschijnlijke bedrag."
      >
        <Veld
          label="Indexatie"
          waarde={concept.index}
          onChange={(v) => wijzig((c) => ({ ...c, index: v }))}
          suffix="×"
          effectief={`${Math.round((nummerUit(concept.index) - 1) * 1000) / 10}% verhoging`}
        />
        <Veld
          label="Bandbreedte"
          waarde={concept.bandbreedte}
          onChange={(v) => wijzig((c) => ({ ...c, bandbreedte: v }))}
          suffix="%"
          effectief={`vork ${100 - nummerUit(concept.bandbreedte)}% – ${100 + nummerUit(concept.bandbreedte)}%`}
        />
      </Sectie>

      <Sectie titel="Tarieven per m²" uitleg="Basisbedrag per vierkante meter, vóór indexatie.">
        {Object.keys(concept.perM2).map((k) => (
          <Veld
            key={k}
            label={PER_M2_LABELS[k] ?? k}
            waarde={concept.perM2[k]}
            onChange={(v) => wijzig((c) => ({ ...c, perM2: { ...c.perM2, [k]: v } }))}
            suffix="€/m²"
            effectief={`${fmtEuro((eff as any)[k] ?? 0)}/m²`}
          />
        ))}
      </Sectie>

      <Sectie titel="Vaste bedragen" uitleg="Basisbedrag per stuk, vóór indexatie.">
        {Object.keys(concept.vast).map((k) => (
          <Veld
            key={k}
            label={VAST_LABELS[k] ?? k}
            waarde={concept.vast[k]}
            onChange={(v) => wijzig((c) => ({ ...c, vast: { ...c.vast, [k]: v } }))}
            suffix="€"
            effectief={fmtEuro((eff as any)[k] ?? 0)}
          />
        ))}
      </Sectie>

      <Sectie titel="Airco" uitleg="Totaalbedrag per aantal toestellen, vóór indexatie.">
        {Object.keys(concept.airco)
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => (
            <Veld
              key={k}
              label={`${k} toestel${Number(k) > 1 ? 'len' : ''}`}
              waarde={concept.airco[k]}
              onChange={(v) => wijzig((c) => ({ ...c, airco: { ...c.airco, [k]: v } }))}
              suffix="€"
              effectief={fmtEuro(eff.airco[Number(k)] ?? 0)}
            />
          ))}
      </Sectie>

      {(['plamuur', 'schilderwerken'] as const).map((groep) => (
        <Sectie
          key={groep}
          titel={groep === 'plamuur' ? 'Plamuur & wandafwerking' : 'Schilderwerken'}
          uitleg="Vast bedrag per schijf netto-oppervlakte. Laat het bovengrensveld leeg voor de laatste schijf: die vangt alles daarboven op."
        >
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={concept[groep].geindexeerd}
              onChange={(e) =>
                wijzig((c) => ({ ...c, [groep]: { ...c[groep], geindexeerd: e.target.checked } }) as Concept)
              }
              className="h-4 w-4"
            />
            <span className="text-xs text-slate-600">Indexatie toepassen op deze bedragen</span>
          </label>

          {concept[groep].treden.map((trede, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:col-span-2">
              <Veld
                label={trede.tot.trim() === '' ? 'Vanaf de vorige schijf' : 'Tot (kleiner dan)'}
                waarde={trede.tot}
                onChange={(v) =>
                  wijzig((c) => {
                    const treden = [...c[groep].treden];
                    treden[i] = { ...treden[i], tot: v };
                    return { ...c, [groep]: { ...c[groep], treden } } as Concept;
                  })
                }
                suffix="m²"
              />
              <Veld
                label="Bedrag"
                waarde={trede.bedrag}
                onChange={(v) =>
                  wijzig((c) => {
                    const treden = [...c[groep].treden];
                    treden[i] = { ...treden[i], bedrag: v };
                    return { ...c, [groep]: { ...c[groep], treden } } as Concept;
                  })
                }
                suffix="€"
                effectief={fmtEuro(
                  staffelBedrag(voorbeeld[groep], trede.tot.trim() === '' ? 1e6 : nummerUit(trede.tot) - 1, voorbeeld.index),
                )}
              />
            </div>
          ))}
        </Sectie>
      ))}

      <Sectie
        titel="Standaardbedragen badkamer en maatwerk"
        uitleg="Beginwaarden voor een nieuw aangevinkt element. Per dossier blijven ze aanpasbaar; leeg laten mag."
      >
        {Object.keys(concept.standaardBedragen).map((k) => (
          <div key={k} className="sm:col-span-2 grid grid-cols-2 gap-2">
            <Veld
              label={`${EXTRA_LABELS[k] ?? k} — minimum`}
              waarde={concept.standaardBedragen[k].min}
              onChange={(v) =>
                wijzig((c) => ({
                  ...c,
                  standaardBedragen: { ...c.standaardBedragen, [k]: { ...c.standaardBedragen[k], min: v } },
                }))
              }
              suffix="€"
            />
            <Veld
              label="maximum"
              waarde={concept.standaardBedragen[k].max}
              onChange={(v) =>
                wijzig((c) => ({
                  ...c,
                  standaardBedragen: { ...c.standaardBedragen, [k]: { ...c.standaardBedragen[k], max: v } },
                }))
              }
              suffix="€"
            />
          </div>
        ))}
      </Sectie>

      <p className="flex items-start gap-2 rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Een wijziging verandert nooit een reeds berekend dossier. Wil je een oud dossier
        herrekenen, open daar dan de calculator opnieuw.
      </p>
    </div>
  );
}
