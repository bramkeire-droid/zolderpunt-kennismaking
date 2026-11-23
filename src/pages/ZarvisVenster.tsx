import { useEffect, useRef, useState } from 'react';
import { Mic, Square, SendHorizonal, RotateCcw, Keyboard, Check, Loader2, AlertTriangle, LogOut } from 'lucide-react';
import { useZarvis, type ZarvisStatus } from '@/contexts/ZarvisContext';
import { useAuth } from '@/contexts/AuthContext';
import ZarvisOrb from '@/components/zarvis/ZarvisOrb';
import { supabase } from '@/integrations/supabase/client';

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
    <div className="h-screen flex flex-col bg-[#07090F] text-[#F3F5FA] font-body overflow-hidden select-none">
      {/* ── Kop: aanwezigheid en status; tegelijk het handvat om te slepen ── */}
      <header style={sleep} className="shrink-0 flex items-center gap-3 px-4 pt-3 pb-2">
        <ZarvisOrb status={status} maat={44} />
        <div className="min-w-0 flex-1">
          <p role="status" className="font-headline font-semibold text-[17px] leading-tight tracking-[-0.01em]">
            {STATUSTEKST[status]}
          </p>
          <p className="text-[13px] text-[#A9B4C8] truncate">
            {bezigeStap ? `${bezigeStap.label}…`
              : luistert ? (tussentijds || 'Spreek gerust')
              : compassDossier ? `In Compass: ${compassDossier}`
              : sneltoets ? `Sneltoets ${sneltoets}`
              : 'Verbonden met Compass'}
          </p>
        </div>
        <div style={geenSleep} className="flex gap-1.5">
          {berichten.length > 0 && (
            <button className={rondeKnop} onClick={nieuwGesprek} aria-label="Nieuw gesprek" title="Nieuw gesprek">
              <RotateCcw aria-hidden className="h-[18px] w-[18px]" />
            </button>
          )}
          <button className={rondeKnop} onClick={() => void signOut()} aria-label="Uitloggen" title="Uitloggen">
            <LogOut aria-hidden className="h-[18px] w-[18px]" />
          </button>
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
              Ik lees gegevens, gesprekken, notities en calculaties. Aanpassen of versturen kan ik nog niet.
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
                {luistert ? 'Ik stop vanzelf als je zwijgt' : bezig ? 'Praat er gerust doorheen' : 'Tik op de microfoon of gebruik de sneltoets'}
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
            <button
              onClick={wisselMicrofoon}
              aria-pressed={luistert}
              aria-label={luistert ? 'Klaar met spreken' : 'Spreken'}
              className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF] ${
                luistert ? 'bg-[#F3F5FA] text-[#07090F] ring-4 ring-[#2E8BFF]/40' : 'bg-[#2E8BFF] text-white hover:bg-[#4A9BFF]'
              }`}
            >
              {luistert ? <Square aria-hidden className="h-4 w-4 fill-current" /> : <Mic aria-hidden className="h-5 w-5" />}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
