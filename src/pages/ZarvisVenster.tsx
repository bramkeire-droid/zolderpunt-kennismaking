import { useEffect, useRef, useState } from 'react';
import { Mic, Square, SendHorizonal, RotateCcw, Keyboard, Check, Loader2, AlertTriangle, LogOut, PanelRightOpen, BellRing } from 'lucide-react';
import { useZarvis, type ZarvisStatus } from '@/contexts/ZarvisContext';
import { useAuth } from '@/contexts/AuthContext';
import ZarvisGat from '@/components/zarvis/ZarvisGat';
import { meetMicrofoon } from '@/lib/zarvis/niveau';
import { supabase } from '@/integrations/supabase/client';
import { BRON_PAD, bronnenVan, openBronKanaal } from '@/lib/zarvis/bronKanaal';

/**
 * Zarvis als eigen venster: klein, donker, bedoeld om open te laten staan boven
 * het andere werk. Compass zit hier niet omheen; Zarvis is ermee verbonden via
 * dezelfde login en hetzelfde gereedschap.
 *
 * De bureaubladschil (zarvis-desktop) laadt deze pagina, houdt het venster
 * bovenop en geeft de sneltoets door. In een gewoon browservenster werkt de
 * pagina ook, zonder die twee dingen.
 */

/** Wat de bureaubladschil aanbiedt; ontbreekt in een gewone browser. */
type Schil = {
  opSneltoets: (cb: () => void) => () => void;
  sneltoets?: string;
  verberg?: () => void;
  zetSessie?: (sessie: { token: string | null; sleutel: string }) => void;
};
const schil = (): Schil | undefined => (window as unknown as { zarvisSchil?: Schil }).zarvisSchil;

const STATUSTEKST: Record<ZarvisStatus, string> = {
  rust: 'Zeg het maar',
  luistert: 'Ik luister',
  denkt: 'Even denken',
  spreekt: 'Zarvis antwoordt',
};

// Sleepzone voor het vensterloze venster van de schil; knoppen erin zijn
// uitgezonderd, anders kan je ze niet aanklikken.
const sleep = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const geenSleep = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

const rondeKnop =
  'h-11 w-11 shrink-0 rounded-full flex items-center justify-center bg-white/[0.08] text-[#F3F5FA] hover:bg-white/[0.16] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF]';

export default function ZarvisVenster() {
  const zarvis = useZarvis();
  const { signOut } = useAuth();
  const [typen, zetTypen] = useState(false);
  const [tekst, zetTekst] = useState('');
  const veld = useRef<HTMLInputElement>(null);
  const onderkant = useRef<HTMLDivElement>(null);

  const wissel = zarvis?.wisselMicrofoon;
  const wisselRef = useRef(wissel);
  wisselRef.current = wissel;

  // De sneltoets van de schil doet hetzelfde als de microfoonknop.
  useEffect(() => schil()?.opSneltoets(() => wisselRef.current?.()), []);

  useEffect(() => { document.title = 'Zarvis'; }, []);

  // De schil stuurt WhatsApp-gesprekken door onder deze login; ze krijgt
  // daarvoor het toegangsbewijs, en een nieuw telkens het vernieuwd wordt.
  useEffect(() => {
    const zet = schil()?.zetSessie;
    if (!zet) return;
    const sleutel = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    void supabase.auth.getSession().then(({ data }) => zet({ token: data.session?.access_token ?? null, sleutel }));
    const { data: abonnement } = supabase.auth.onAuthStateChange((_gebeurtenis, sessie) =>
      zet({ token: sessie?.access_token ?? null, sleutel }));
    return () => abonnement.subscription.unsubscribe();
  }, []);

  // Welk dossier in Compass open staat. Compass schrijft dat weg; dit venster
  // kijkt bij het openen, telkens het de aandacht krijgt, en verder af en toe.
  const [compassDossier, zetCompassDossier] = useState<string | null>(null);
  useEffect(() => {
    let weg = false;
    const kijk = async () => {
      const { data } = await (supabase.from('zarvis_context' as never) as unknown as {
        select: (k: string) => { maybeSingle: () => Promise<{ data: { lead_id: string | null; dossier_naam: string | null; updated_at: string } | null }> };
      }).select('lead_id, dossier_naam, updated_at').maybeSingle();
      if (weg) return;
      const vers = data && Date.now() - new Date(data.updated_at).getTime() < 4 * 60 * 60 * 1000;
      zetCompassDossier(vers && data.lead_id ? (data.dossier_naam || 'dossier zonder naam') : null);
    };
    void kijk();
    const tik = window.setInterval(() => { if (!document.hidden) void kijk(); }, 15000);
    window.addEventListener('focus', kijk);
    return () => { weg = true; window.clearInterval(tik); window.removeEventListener('focus', kijk); };
  }, []);
  useEffect(() => { if (typen) veld.current?.focus(); }, [typen]);

  const aantal = zarvis?.berichten.length ?? 0;
  const laatste = zarvis?.berichten[aantal - 1];
  useEffect(() => {
    onderkant.current?.scrollIntoView({ block: 'end' });
  }, [aantal, laatste?.tekst, laatste?.stappen?.length]);

  // ── Het gegevensvenster ────────────────────────────────────────────────
  // Standaard toont het de gegevens van het laatste antwoord dat iets opzocht;
  // met de knop bij een ouder antwoord kies je dat antwoord.
  const [gekozenId, zetGekozenId] = useState<string | null>(null);
  const alle = zarvis?.berichten ?? [];
  const bronIndex = (() => {
    if (gekozenId) {
      const i = alle.findIndex((b) => b.id === gekozenId);
      if (i >= 0) return i;
    }
    for (let i = alle.length - 1; i >= 0; i--) if (bronnenVan(alle[i].stappen).length > 0) return i;
    return -1;
  })();
  const bronBericht = bronIndex >= 0 ? alle[bronIndex] : null;
  const bronToestand = {
    soort: 'toon' as const,
    vraag: bronIndex > 0 && alle[bronIndex - 1].rol === 'gebruiker' ? alle[bronIndex - 1].tekst : null,
    bronnen: bronnenVan(bronBericht?.stappen),
    bezig: !!bronBericht?.stappen?.some((s) => s.status === 'bezig'),
  };
  const bronSleutel = JSON.stringify(bronToestand);
  const bronRef = useRef(bronToestand);
  bronRef.current = bronToestand;

  const kanaal = useRef<ReturnType<typeof openBronKanaal> | null>(null);
  useEffect(() => {
    const k = openBronKanaal((b) => { if (b.soort === 'hallo') k.stuur(bronRef.current); });
    kanaal.current = k;
    return () => { k.sluit(); kanaal.current = null; };
  }, []);
  useEffect(() => { kanaal.current?.stuur(bronRef.current); }, [bronSleutel]);

  const bronVenster = useRef<Window | null>(null);
  const openBron = () => {
    if (bronVenster.current && !bronVenster.current.closed) { bronVenster.current.focus(); return; }
    bronVenster.current = window.open(BRON_PAD, 'zarvis-bron', 'popup=yes,width=420,height=560');
  };
  // Zodra een nieuw antwoord gegevens heeft, gaat het venster vanzelf open.
  // Eén keer per antwoord: sluit je het, dan blijft het dicht tot de volgende
  // vraag. In een gewone browser houdt de pop-upblokkering dit tegen; daar
  // dient de knop bij het antwoord.
  const geopendVoor = useRef<string | null>(null);
  const nieuwsteMetBron = [...alle].reverse().find((b) => bronnenVan(b.stappen).length > 0)?.id ?? null;
  useEffect(() => {
    if (!nieuwsteMetBron || geopendVoor.current === nieuwsteMetBron) return;
    const eerste = geopendVoor.current === null && alle[alle.length - 1]?.id !== nieuwsteMetBron;
    geopendVoor.current = nieuwsteMetBron;
    zetGekozenId(null);
    // Een oud gesprek dat herladen wordt, opent niets uit zichzelf.
    if (!eerste && schil()) openBron();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nieuwsteMetBron]);

  // ── De microfoonknop toont jouw stem ───────────────────────────────────
  const ringBuiten = useRef<HTMLSpanElement>(null);
  const ringBinnen = useRef<HTMLSpanElement>(null);
  const [micGemeten, zetMicGemeten] = useState(false);
  const luistertNu = zarvis?.status === 'luistert';
  useEffect(() => {
    if (!luistertNu) return;
    let weg = false, beeld = 0, stop: (() => void) | null = null;
    void meetMicrofoon().then((m) => {
      if (!m) return;
      if (weg) { m.stop(); return; }
      stop = m.stop;
      zetMicGemeten(true);
      let zacht = 0;
      const tik = () => {
        beeld = requestAnimationFrame(tik);
        const n = m.niveau();
        zacht += (n - zacht) * (n > zacht ? 0.5 : 0.12);
        if (ringBinnen.current) ringBinnen.current.style.transform = `scale(${1.08 + zacht * 0.45})`;
        if (ringBuiten.current) ringBuiten.current.style.transform = `scale(${1.15 + zacht * 1.0})`;
      };
      tik();
    });
    return () => { weg = true; cancelAnimationFrame(beeld); stop?.(); zetMicGemeten(false); };
  }, [luistertNu]);

  if (!zarvis) return null;
  const {
    status, berichten, tussentijds, micMelding, kanLuisteren,
    stuur, wisselMicrofoon, onderbreek, nieuwGesprek,
  } = zarvis;

  const bezig = status === 'denkt' || status === 'spreekt';
  const luistert = status === 'luistert';
  const bezigeStap = laatste?.stappen?.find((x) => x.status === 'bezig');
  const sneltoets = schil()?.sneltoets;
  const laatsteVraag = [...berichten].reverse().find((b) => b.rol === 'gebruiker')?.tekst;

  const verstuur = () => {
    if (!tekst.trim() || bezig) return;
    stuur(tekst);
    zetTekst('');
  };

  return (
    <div className="zarvis-donker h-screen flex flex-col bg-[#07090F] text-[#F3F5FA] font-body overflow-hidden select-none">
      {/* ── Zarvis zelf: het zwarte gat, met de toestand in woorden eronder.
          Tegelijk het handvat om het venster te verslepen. ── */}
      <header style={sleep} className="relative shrink-0 h-[196px]">
        <ZarvisGat status={status} className="absolute inset-0 h-full w-full" />
        <div style={geenSleep} className="absolute right-3 top-3 flex gap-1.5">
          {berichten.length > 0 && (
            <button className={rondeKnop} onClick={nieuwGesprek} aria-label="Nieuw gesprek" title="Nieuw gesprek">
              <RotateCcw aria-hidden className="h-[18px] w-[18px]" />
            </button>
          )}
          <button className={rondeKnop} onClick={() => void signOut()} aria-label="Uitloggen" title="Uitloggen">
            <LogOut aria-hidden className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 px-5 text-center">
          <p role="status" className="font-headline font-semibold text-[16px] leading-tight tracking-[-0.01em]">
            {STATUSTEKST[status]}
          </p>
          <p className="mt-0.5 text-[13px] text-[#A9B4C8] truncate">
            {bezigeStap ? `${bezigeStap.label}…`
              : luistert ? (tussentijds || 'Spreek gerust')
              : compassDossier ? `In Compass: ${compassDossier}`
              : sneltoets ? `Sneltoets ${sneltoets}`
              : 'Verbonden met Compass'}
          </p>
        </div>
      </header>

      {/* ── Het gesprek: het laatste antwoord groot, wat eraan voorafging klein ── */}
      <main className="flex-1 min-h-0 overflow-y-auto px-5 py-3 select-text" aria-live="polite">
        {berichten.length === 0 ? (
          <div className="h-full flex flex-col justify-end pb-2">
            <p className="font-headline font-medium text-[22px] leading-snug tracking-[-0.015em]">
              Vraag me iets over je dossiers.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#A9B4C8]">
              Ik lees dossiers, gesprekken en calculaties, herinner je op een tijdstip, kijk iets op vaste tijden na en verstuur een WhatsApp.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {berichten.map((b, i) => {
              const isLaatste = i === berichten.length - 1;
              if (b.rol === 'gebruiker') {
                return (
                  <p key={b.id} className="self-end max-w-[86%] text-right text-sm leading-snug text-[#A9B4C8] whitespace-pre-wrap break-words">
                    {b.tekst}
                  </p>
                );
              }
              if (b.fout) {
                return (
                  <div key={b.id} role="alert" className="rounded-2xl bg-[#3A1418] px-4 py-3">
                    <p className="text-sm leading-relaxed text-[#FFD9D9]">{b.tekst}</p>
                    {isLaatste && laatsteVraag && (
                      <button
                        onClick={() => stuur(laatsteVraag)}
                        className="mt-2 h-11 px-4 rounded-full bg-white/[0.12] text-sm font-headline font-semibold hover:bg-white/[0.2] transition-colors"
                      >
                        Opnieuw proberen
                      </button>
                    )}
                  </div>
                );
              }
              if (b.melding) {
                return (
                  <div key={b.id} className="rounded-2xl border border-[#2E8BFF]/40 bg-[#2E8BFF]/10 px-4 py-3">
                    <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8CCBFF]">
                      <BellRing aria-hidden className="h-3.5 w-3.5" /> Zarvis meldt
                    </p>
                    <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap break-words">{b.tekst}</p>
                  </div>
                );
              }
              return (
                <div key={b.id}>
                  {b.stappen && b.stappen.length > 0 && (
                    <ul className="mb-2 flex flex-col gap-1" aria-label="Wat Zarvis opzocht">
                      {b.stappen.map((st) => (
                        <li key={st.id} className="flex items-center gap-2 text-[13px] text-[#A9B4C8]">
                          {st.status === 'bezig' ? (
                            <Loader2 aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin text-[#8CCBFF]" />
                          ) : st.status === 'klaar' ? (
                            <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#5BE49B]" />
                          ) : (
                            <AlertTriangle aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#FFB547]" />
                          )}
                          <span className="truncate">{st.label}</span>
                          {st.detail && st.status !== 'bezig' && <span className="shrink-0 text-[#8792A8]">· {st.detail}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {bronnenVan(b.stappen).length > 0 && (
                    <button
                      onClick={() => { zetGekozenId(b.id); openBron(); }}
                      className="mb-2.5 inline-flex h-9 items-center gap-2 rounded-full bg-white/[0.08] px-3.5 text-[13px] text-[#D6DDEA] hover:bg-white/[0.16] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF]"
                    >
                      <PanelRightOpen aria-hidden className="h-4 w-4" />
                      Toon de gegevens
                    </button>
                  )}
                  <p
                    className={`whitespace-pre-wrap break-words ${
                      isLaatste
                        ? 'font-headline font-medium text-[20px] leading-[1.32] tracking-[-0.012em] text-[#F3F5FA]'
                        : 'text-[15px] leading-relaxed text-[#C3CBDA]'
                    }`}
                  >
                    {b.tekst || '…'}
                  </p>
                  {b.onderbroken && b.tekst !== 'Onderbroken.' && (
                    <p className="mt-1 text-xs text-[#8792A8]">Onderbroken.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div ref={onderkant} />
      </main>

      {/* ── Eén zwevende balk: spreken, typen, onderbreken ── */}
      <footer className="shrink-0 px-3 pb-3 pt-1">
        {micMelding && (
          <p role="alert" className="mb-2 px-2 text-[13px] text-[#FFB547]">{micMelding}</p>
        )}
        <div className="flex items-center gap-2 rounded-[32px] border border-white/[0.12] bg-white/[0.07] p-1.5 pl-2">
          {typen || !kanLuisteren ? (
            <>
              <input
                ref={veld}
                value={tekst}
                onChange={(e) => zetTekst(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); verstuur(); }
                  if (e.key === 'Escape' && kanLuisteren) zetTypen(false);
                }}
                placeholder="Typ je vraag"
                aria-label="Bericht aan Zarvis"
                className="flex-1 min-w-0 h-12 bg-transparent px-3 text-[15px] text-[#F3F5FA] placeholder:text-[#8792A8] focus:outline-none select-text"
              />
              {kanLuisteren && (
                <button className={rondeKnop} onClick={() => zetTypen(false)} aria-label="Spreken in plaats van typen">
                  <Mic aria-hidden className="h-5 w-5" />
                </button>
              )}
            </>
          ) : (
            <>
              <span className="flex-1 min-w-0 px-3 text-sm text-[#A9B4C8] truncate">
                {luistert ? (tussentijds || 'Jij spreekt. Ik stop vanzelf als je zwijgt.') : bezig ? 'Praat er gerust doorheen' : 'Tik op de microfoon of gebruik de sneltoets'}
              </span>
              <button className={rondeKnop} onClick={() => zetTypen(true)} aria-label="Typen in plaats van spreken">
                <Keyboard aria-hidden className="h-5 w-5" />
              </button>
            </>
          )}
          {bezig ? (
            <button
              onClick={onderbreek}
              aria-label="Zarvis onderbreken"
              className="h-12 w-12 shrink-0 rounded-full flex items-center justify-center bg-[#F3F5FA] text-[#07090F] hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF]"
            >
              <Square aria-hidden className="h-4 w-4 fill-current" />
            </button>
          ) : typen || !kanLuisteren ? (
            <button
              onClick={verstuur}
              disabled={!tekst.trim()}
              aria-label="Versturen"
              className="h-12 w-12 shrink-0 rounded-full flex items-center justify-center bg-[#2E8BFF] text-white disabled:bg-white/[0.08] disabled:text-[#8792A8] hover:bg-[#4A9BFF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF]"
            >
              <SendHorizonal aria-hidden className="h-5 w-5" />
            </button>
          ) : (
            <span className="relative h-14 w-14 shrink-0">
              {/* Jouw stem: twee ringen die uitzetten met het volume van de microfoon. */}
              {luistert && (
                <>
                  <span ref={ringBuiten} aria-hidden className={`absolute inset-0 scale-[1.25] rounded-full bg-[#2E8BFF]/20 ${micGemeten ? '' : 'animate-ping'}`} />
                  <span ref={ringBinnen} aria-hidden className="absolute inset-0 scale-[1.12] rounded-full bg-[#2E8BFF]/35" />
                </>
              )}
              <button
                onClick={wisselMicrofoon}
                aria-pressed={luistert}
                aria-label={luistert ? 'Klaar met spreken' : 'Spreken'}
                className={`relative h-14 w-14 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF] ${
                  luistert ? 'bg-[#2E8BFF] text-white' : 'bg-[#F3F5FA] text-[#07090F] hover:bg-white'
                }`}
              >
                <Mic aria-hidden className="h-6 w-6" />
              </button>
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
