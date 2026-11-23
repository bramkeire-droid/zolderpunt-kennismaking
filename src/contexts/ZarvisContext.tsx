import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { useAppNav } from '@/contexts/AppNavContext';
import { vraagZarvis, type ZarvisContextInfo } from '@/lib/zarvis/client';
import { maakBrowserStemIn, maakBrowserStemUit, type StemIn, type StemUit } from '@/lib/zarvis/stem';
import { nieuweZinnen, voorUitspraak } from '@/lib/zarvis/zinnen';

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
};

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

export function ZarvisProvider({ children }: { children: ReactNode }) {
  const nav = useAppNav();
  const [open, zetOpen] = useState(false);
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

    lopend.current?.abort();
    stemIn.current!.annuleer();
    stemUit.current!.zwijg();
    zetTussentijds('');
    zetMicMelding(null);

    const controller = new AbortController();
    lopend.current = controller;
    const hardop = gesproken && stemAanRef.current && stemUit.current!.beschikbaar;

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
        spreekWatKan(false);
      } else if (g.type === 'fout') {
        mislukt = true;
        werkLaatsteBij((b) => ({ ...b, tekst: g.bericht, fout: true }));
      }
    }
    if (controller.signal.aborted) return;
    lopend.current = null;

    if (!mislukt && !volledig) {
      mislukt = true;
      werkLaatsteBij((b) => ({ ...b, tekst: 'Ik kreeg geen antwoord terug. Probeer het opnieuw.', fout: true }));
    }
    if (mislukt || !hardop) {
      zetStatus('rust');
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
    zetTussentijds('');
    if (wasBezig) {
      werkLaatsteBij((b) =>
        b.tekst ? { ...b, onderbroken: true } : { ...b, tekst: 'Onderbroken.', onderbroken: true });
    }
    zetStatus('rust');
  }, []);

  const wisselMicrofoon = useCallback(() => {
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
    stemIn.current!.annuleer();
    stemUit.current!.zwijg();
    zetTussentijds('');
    zetStatus((s) => (s === 'luistert' || s === 'spreekt' ? (lopend.current ? 'denkt' : 'rust') : s));
  }, [open]);

  useEffect(() => () => {
    lopend.current?.abort();
    stemIn.current?.annuleer();
    stemUit.current?.zwijg();
  }, []);

  const waarden: ZarvisWaarden = {
    open, zetOpen, status, berichten, tussentijds, micMelding,
    kanLuisteren: stemIn.current.beschikbaar,
    kanSpreken: stemUit.current.beschikbaar,
    stemAan, zetStemAan, context, stuur, wisselMicrofoon, onderbreek, nieuwGesprek,
  };

  return <Ctx.Provider value={waarden}>{children}</Ctx.Provider>;
}

/** Null buiten de provider (bv. het klantportaal): daar bestaat Zarvis niet. */
export function useZarvis(): ZarvisWaarden | null {
  return useContext(Ctx);
}
