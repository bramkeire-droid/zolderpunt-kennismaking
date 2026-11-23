import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { useAppNav } from '@/contexts/AppNavContext';
import { vraagZarvis, type ZarvisContextInfo } from '@/lib/zarvis/client';
import { maakBrowserStemIn, maakBrowserStemUit, type StemIn, type StemUit } from '@/lib/zarvis/stem';
import { nieuweZinnen, voorUitspraak } from '@/lib/zarvis/zinnen';
import { startGezicht, type Gezicht } from '@/lib/zarvis/gezicht';
import { maakAzureStem } from '@/lib/zarvis/azureStem';
import { supabase } from '@/integrations/supabase/client';

/**
 * Waar Zarvis in het gesprek staat. Het paneel, de aanwezigheid en de knop in de
 * app-balk lezen allemaal deze ene toestand, zodat ze nooit iets anders tonen.
 */
export type ZarvisStatus = 'rust' | 'luistert' | 'denkt' | 'spreekt';

export type ZarvisBericht = {
  id: string;
  rol: 'gebruiker' | 'zarvis';
  tekst: string;
  /** Het antwoord is afgebroken door een fout; `tekst` is dan de melding. */
  fout?: boolean;
  /** De gebruiker onderbrak dit antwoord. */
  onderbroken?: boolean;
  /** Wat Zarvis opzocht om dit antwoord te geven, in volgorde. */
  stappen?: ZarvisStap[];
};

export type ZarvisStap = {
  id: string;
  label: string;
  status: 'bezig' | 'klaar' | 'mislukt';
  detail?: string;
};

/** Het gezicht (proef met Anam): uit, bezig met verbinden, of in beeld. */
export type GezichtStatus = 'uit' | 'verbindt' | 'aan';

/** Het video-element waarin het gezicht verschijnt; het paneel rendert het. */
export const GEZICHT_VIDEO_ID = 'zarvis-gezicht-video';

interface ZarvisWaarden {
  open: boolean;
  zetOpen: (open: boolean) => void;
  status: ZarvisStatus;
  berichten: ZarvisBericht[];
  /** Wat de microfoon tot nu toe verstond, tijdens het luisteren. */
  tussentijds: string;
  /** Melding van de microfoon (geblokkeerd, niets gehoord, ...). */
  micMelding: string | null;
  kanLuisteren: boolean;
  kanSpreken: boolean;
  /** Zarvis mag hardop antwoorden op een gesproken vraag. */
  stemAan: boolean;
  zetStemAan: (aan: boolean) => void;
  gezicht: GezichtStatus;
  /** Waarom het gezicht niet startte of stopte. */
  gezichtMelding: string | null;
  /** Zet het gezicht aan of uit. Aanzetten moet vanuit een klik gebeuren. */
  wisselGezicht: () => void;
  context: ZarvisContextInfo;
  stuur: (tekst: string) => void;
  /** Eén knop: start met luisteren, of rondt het luisteren af. */
  wisselMicrofoon: () => void;
  /** Stopt wat Zarvis aan het doen is: luisteren, denken of spreken. */
  onderbreek: () => void;
  nieuwGesprek: () => void;
}

const Ctx = createContext<ZarvisWaarden | null>(null);

const STEM_SLEUTEL = 'zarvis.stemAan';
let teller = 0;
const nieuwId = () => `z${Date.now().toString(36)}${(teller++).toString(36)}`;

export function ZarvisProvider({ children, zelfstandig = false }: {
  children: ReactNode;
  /** Het losse Zarvis-venster: altijd open, geen paneel om te sluiten. */
  zelfstandig?: boolean;
}) {
  const nav = useAppNav();
  const [open, zetOpen] = useState(zelfstandig);
  const [status, zetStatus] = useState<ZarvisStatus>('rust');
  const [berichten, zetBerichten] = useState<ZarvisBericht[]>([]);
  const [tussentijds, zetTussentijds] = useState('');
  const [micMelding, zetMicMelding] = useState<string | null>(null);
  const [stemAan, zetStemAanState] = useState(() => {
    try { return localStorage.getItem(STEM_SLEUTEL) !== '0'; } catch { return true; }
  });

  const stemIn = useRef<StemIn>();
  const stemUit = useRef<StemUit>();
  if (!stemIn.current) stemIn.current = maakBrowserStemIn();
  if (!stemUit.current) stemUit.current = maakBrowserStemUit();

  // De eerste keer dat het paneel opengaat: kijken of de Vlaamse stem (Azure)
  // beschikbaar is. Zo ja, neemt die het over van de browserstem; zo nee blijft
  // alles zoals het was. De teller dwingt een nieuwe weergave af, want
  // "kan luisteren" kan hierdoor veranderen (bv. in Firefox of Safari).
  const [, zetStemVersie] = useState(0);
  const azureGevraagd = useRef(false);
  useEffect(() => {
    if (!open || azureGevraagd.current) return;
    azureGevraagd.current = true;
    void maakAzureStem().then((azure) => {
      if (!azure) return;
      stemIn.current!.annuleer();
      stemUit.current!.zwijg();
      stemIn.current = azure.stemIn;
      stemUit.current = azure.stemUit;
      zetStemVersie((v) => v + 1);
    });
  }, [open]);

  const [gezicht, zetGezicht] = useState<GezichtStatus>('uit');
  const [gezichtMelding, zetGezichtMelding] = useState<string | null>(null);
  const gezichtRef = useRef<Gezicht | null>(null);
  // Met het gezicht aan staat de microfoon van Anam open: "rust" bestaat dan
  // niet, Zarvis luistert.
  const rust = (): ZarvisStatus => (gezichtRef.current ? 'luistert' : 'rust');

  const gesprekId = useRef<string | null>(null);
  const lopend = useRef<AbortController | null>(null);
  const stemAanRef = useRef(stemAan);
  stemAanRef.current = stemAan;
  const openRef = useRef(open);
  openRef.current = open;

  // App.tsx maakt bij elke render een nieuw actiefDossier-object; daarom op de
  // waarden zelf letten, niet op het object.
  const huidigeView = nav?.huidigeView;
  const dossierId = nav?.actiefDossier?.id;
  const dossierNaam = nav?.actiefDossier?.naam;
  const context = useMemo<ZarvisContextInfo>(
    () => ({ view: huidigeView ?? 'onbekend', dossier: dossierId ? { id: dossierId, naam: dossierNaam ?? '' } : null }),
    [huidigeView, dossierId, dossierNaam],
  );
  const contextRef = useRef(context);
  contextRef.current = context;

  // Zarvis leeft in een eigen venster. Compass vertelt hier waar de gebruiker
  // mee bezig is, zodat een vraag in dat venster zonder naam over het open
  // dossier kan gaan. Het losse venster zelf schrijft niets: het heeft geen
  // dossier open.
  useEffect(() => {
    if (zelfstandig) return;
    void (supabase.from('zarvis_context' as never) as unknown as {
      upsert: (rij: unknown, opties: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
    })
      .upsert(
        {
          lead_id: dossierId ?? null,
          dossier_naam: dossierId ? (dossierNaam ?? null) : null,
          view: huidigeView ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .then(({ error }) => { if (error) console.error('zarvis: context doorgeven mislukt', error.message); });
  }, [zelfstandig, huidigeView, dossierId, dossierNaam]);

  const werkLaatsteBij = (fn: (b: ZarvisBericht) => ZarvisBericht) =>
    zetBerichten((lijst) => {
      const i = lijst.length - 1;
      if (i < 0 || lijst[i].rol !== 'zarvis') return lijst;
      const kopie = lijst.slice();
      kopie[i] = fn(kopie[i]);
      return kopie;
    });

  // Verwijst naar de nieuwste versie, zodat stuur() en luister() elkaar kunnen
  // aanroepen zonder dat een oude versie blijft hangen.
  const luisterRef = useRef<(stil: boolean) => void>(() => {});

  const stuurIntern = useCallback(async (ruw: string, gesproken: boolean) => {
    const tekst = ruw.trim();
    if (!tekst) return;

    // Een nieuwe vraag terwijl het gezicht nog aan het antwoorden is: eerst zwijgen.
    if (lopend.current) gezichtRef.current?.zwijg();
    lopend.current?.abort();
    stemIn.current!.annuleer();
    stemUit.current!.zwijg();
    zetTussentijds('');
    zetMicMelding(null);

    const controller = new AbortController();
    lopend.current = controller;
    // Met het gezicht aan spreekt het gezicht elk antwoord uit, ook op een
    // getypte vraag; de browserstem zwijgt dan.
    const uitspraak = gezichtRef.current?.begin() ?? null;
    const hardop = !uitspraak && gesproken && stemAanRef.current && stemUit.current!.beschikbaar;

    zetBerichten((lijst) => [
      ...lijst,
      { id: nieuwId(), rol: 'gebruiker', tekst },
      { id: nieuwId(), rol: 'zarvis', tekst: '' },
    ]);
    zetStatus('denkt');

    let volledig = '';
    let uitgesprokenTot = 0;
    let mislukt = false;

    const spreekWatKan = (klaar: boolean) => {
      // Paneel dicht = zwijgen; er mag dan niets meer in de wachtrij komen.
      if (!hardop || !openRef.current) return;
      const { zinnen, tot } = nieuweZinnen(volledig, uitgesprokenTot, klaar);
      uitgesprokenTot = tot;
      zinnen.map(voorUitspraak).filter(Boolean).forEach((z) => stemUit.current!.zeg(z));
    };

    for await (const g of vraagZarvis(
      { bericht: tekst, gesprekId: gesprekId.current, context: contextRef.current },
      controller.signal,
    )) {
      if (controller.signal.aborted) return;
      if (g.type === 'start') {
        gesprekId.current = g.gesprek_id;
      } else if (g.type === 'tekst') {
        volledig += g.delta;
        zetStatus('spreekt');
        werkLaatsteBij((b) => ({ ...b, tekst: volledig }));
        uitspraak?.zeg(g.delta);
        spreekWatKan(false);
      } else if (g.type === 'stap') {
        const stap: ZarvisStap = { id: g.id, label: g.label, status: g.status, detail: g.detail };
        werkLaatsteBij((b) => {
          const lijst = b.stappen ?? [];
          const i = lijst.findIndex((x) => x.id === stap.id);
          return { ...b, stappen: i < 0 ? [...lijst, stap] : lijst.map((x, j) => (j === i ? stap : x)) };
        });
        // Opzoeken is denken: de aanwezigheid toont dat, de regel eronder zegt wat.
        if (stap.status === 'bezig') zetStatus('denkt');
      } else if (g.type === 'fout') {
        mislukt = true;
        werkLaatsteBij((b) => ({ ...b, tekst: g.bericht, fout: true }));
      }
    }
    if (controller.signal.aborted) return;
    lopend.current = null;
    uitspraak?.klaar();

    if (!mislukt && !volledig) {
      mislukt = true;
      werkLaatsteBij((b) => ({ ...b, tekst: 'Ik kreeg geen antwoord terug. Probeer het opnieuw.', fout: true }));
    }
    if (mislukt || !hardop) {
      zetStatus(rust());
      return;
    }

    spreekWatKan(true);
    stemUit.current!.opLeeg(() => {
      if (controller.signal.aborted) return;
      // Het gesprek blijft open: na een gesproken antwoord luistert Zarvis
      // meteen verder, zodat je handsfree kan doorvragen.
      if (openRef.current && stemIn.current!.beschikbaar) luisterRef.current(true);
      else zetStatus('rust');
    });
  }, []);

  /** `stil`: Zarvis begon zelf te luisteren; niets horen is dan geen fout. */
  const luister = useCallback((stil: boolean) => {
    if (!stemIn.current!.beschikbaar) return;
    zetMicMelding(null);
    zetTussentijds('');
    zetStatus('luistert');
    stemIn.current!.start({
      opTussentijds: zetTussentijds,
      opKlaar: (tekst) => {
        zetTussentijds('');
        if (tekst) void stuurIntern(tekst, true);
        else zetStatus('rust');
      },
      opFout: (reden) => {
        zetTussentijds('');
        zetStatus('rust');
        if (!stil) zetMicMelding(reden);
      },
    });
  }, [stuurIntern]);
  luisterRef.current = luister;

  const onderbreek = useCallback(() => {
    const wasBezig = lopend.current !== null;
    lopend.current?.abort();
    lopend.current = null;
    stemIn.current!.annuleer();
    stemUit.current!.zwijg();
    gezichtRef.current?.zwijg();
    zetTussentijds('');
    if (wasBezig) {
      werkLaatsteBij((b) =>
        b.tekst ? { ...b, onderbroken: true } : { ...b, tekst: 'Onderbroken.', onderbroken: true });
    }
    zetStatus(rust());
  }, []);

  const stopGezicht = useCallback(() => {
    const g = gezichtRef.current;
    gezichtRef.current = null;
    zetGezicht('uit');
    zetStatus((s) => (s === 'luistert' ? 'rust' : s));
    void g?.stop();
  }, []);

  const gezichtBezig = useRef(false);
  const wisselGezicht = useCallback(() => {
    if (gezichtBezig.current) return;
    if (gezichtRef.current) {
      stopGezicht();
      return;
    }
    gezichtBezig.current = true;
    zetGezichtMelding(null);
    zetGezicht('verbindt');
    // Twee stemmen door elkaar wil niemand: de browserstem maakt plaats.
    stemIn.current!.annuleer();
    stemUit.current!.zwijg();

    startGezicht(GEZICHT_VIDEO_ID, {
      opGebruikerZei: (tekst) => void stuurIntern(tekst, true),
      opOnderbroken: () => {
        // Anam heeft het gezicht al laten zwijgen; hier stopt enkel het
        // antwoord dat nog onderweg was.
        if (!lopend.current) return;
        lopend.current.abort();
        lopend.current = null;
        werkLaatsteBij((b) => (b.tekst ? { ...b, onderbroken: true } : b));
        zetStatus(rust());
      },
      opGesloten: () => {
        gezichtRef.current = null;
        zetGezicht('uit');
        zetGezichtMelding('Het gezicht is gestopt. Een sessie duurt hoogstens vijf minuten; zet het opnieuw aan om verder te gaan.');
        zetStatus((s) => (s === 'luistert' ? 'rust' : s));
      },
    })
      .then((g) => {
        // Het paneel ging dicht terwijl de verbinding nog opkwam.
        if (!openRef.current) {
          void g.stop();
          zetGezicht('uit');
          return;
        }
        gezichtRef.current = g;
        zetGezicht('aan');
        zetStatus((s) => (s === 'rust' ? 'luistert' : s));
      })
      .catch((e: Error) => {
        zetGezicht('uit');
        zetGezichtMelding(e.message);
      })
      .finally(() => { gezichtBezig.current = false; });
  }, [stopGezicht, stuurIntern]);

  const wisselMicrofoon = useCallback(() => {
    // Met het gezicht aan luistert Anam; de microfoonknop is dan verborgen.
    if (gezichtRef.current) return;
    if (status === 'luistert') {
      stemIn.current!.stop();
      return;
    }
    // Tijdens denken of spreken: de gebruiker neemt het woord.
    if (status !== 'rust') onderbreek();
    luister(false);
  }, [status, onderbreek, luister]);

  const stuur = useCallback((tekst: string) => void stuurIntern(tekst, false), [stuurIntern]);

  const nieuwGesprek = useCallback(() => {
    onderbreek();
    gesprekId.current = null;
    zetBerichten([]);
    zetMicMelding(null);
  }, [onderbreek]);

  const zetStemAan = useCallback((aan: boolean) => {
    zetStemAanState(aan);
    try { localStorage.setItem(STEM_SLEUTEL, aan ? '1' : '0'); } catch { /* privévenster */ }
    if (!aan) stemUit.current!.zwijg();
  }, []);

  // Paneel dicht = Zarvis zwijgt en luistert niet meer. Een open microfoon
  // achter een gesloten paneel zou niemand verwachten.
  useEffect(() => {
    if (open) return;
    if (gezichtRef.current) stopGezicht();
    stemIn.current!.annuleer();
    stemUit.current!.zwijg();
    zetTussentijds('');
    zetStatus((s) => (s === 'luistert' || s === 'spreekt' ? (lopend.current ? 'denkt' : 'rust') : s));
  }, [open, stopGezicht]);

  useEffect(() => () => {
    void gezichtRef.current?.stop();
    lopend.current?.abort();
    stemIn.current?.annuleer();
    stemUit.current?.zwijg();
  }, []);

  const waarden: ZarvisWaarden = {
    open, zetOpen, status, berichten, tussentijds, micMelding,
    kanLuisteren: stemIn.current.beschikbaar,
    kanSpreken: stemUit.current.beschikbaar,
    stemAan, zetStemAan, gezicht, gezichtMelding, wisselGezicht,
    context, stuur, wisselMicrofoon, onderbreek, nieuwGesprek,
  };

  return <Ctx.Provider value={waarden}>{children}</Ctx.Provider>;
}

/** Null buiten de provider (bv. het klantportaal): daar bestaat Zarvis niet. */
export function useZarvis(): ZarvisWaarden | null {
  return useContext(Ctx);
}
