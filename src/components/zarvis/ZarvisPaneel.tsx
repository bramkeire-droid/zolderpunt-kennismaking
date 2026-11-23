import { useEffect, useRef, useState } from 'react';
import { Mic, Square, SendHorizonal, Volume2, VolumeX, RotateCcw, X, FolderOpen, Video, VideoOff } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useZarvis, GEZICHT_VIDEO_ID, type ZarvisStatus } from '@/contexts/ZarvisContext';
import ZarvisOrb from './ZarvisOrb';

const STATUSTEKST: Record<ZarvisStatus, string> = {
  rust: 'Zeg het maar',
  luistert: 'Ik luister',
  denkt: 'Even denken',
  spreekt: 'Zarvis antwoordt',
};

// Enkel dingen die Zarvis vandaag al kan. Zolang hij de dossiers niet leest,
// stelt hij ook geen vragen voor die daarop steunen.
const AANZETTEN = [
  'Help me een antwoord formuleren op een klant die de prijs te hoog vindt',
  'Bereid met mij een moeilijk telefoongesprek voor',
  'Wat ga je binnenkort voor mij kunnen doen?',
];

const balkKnop =
  'h-11 w-11 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70';

/**
 * Het gesprek met Zarvis. Bovenaan de aanwezigheid (wat is hij aan het doen),
 * daaronder wat er gezegd is, onderaan spreken of typen. Op een gsm vult het
 * paneel het hele scherm; op een bureau schuift het rechts naast het werk.
 */
export default function ZarvisPaneel() {
  const zarvis = useZarvis();
  const [tekst, zetTekst] = useState('');
  const onderkant = useRef<HTMLDivElement>(null);
  const veld = useRef<HTMLTextAreaElement>(null);

  const aantal = zarvis?.berichten.length ?? 0;
  const laatsteTekst = zarvis?.berichten[aantal - 1]?.tekst ?? '';
  useEffect(() => {
    onderkant.current?.scrollIntoView({ block: 'end' });
  }, [aantal, laatsteTekst, zarvis?.tussentijds]);

  // Het tekstvak groeit mee tot een paar regels, daarna schuift het.
  useEffect(() => {
    const el = veld.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [tekst]);

  if (!zarvis) return null;
  const {
    open, zetOpen, status, berichten, tussentijds, micMelding, kanLuisteren, kanSpreken,
    stemAan, zetStemAan, gezicht, gezichtMelding, wisselGezicht,
    context, stuur, wisselMicrofoon, onderbreek, nieuwGesprek,
  } = zarvis;
  const metGezicht = gezicht !== 'uit';

  const bezig = status === 'denkt' || status === 'spreekt';
  const luistert = status === 'luistert';

  const verstuur = () => {
    if (!tekst.trim() || bezig) return;
    stuur(tekst);
    zetTekst('');
  };

  const laatsteVraag = [...berichten].reverse().find((b) => b.rol === 'gebruiker')?.tekst;

  return (
    <Sheet open={open} onOpenChange={zetOpen}>
      <SheetContent
        side="right"
        // De standaard sluitknop van het blad staat op een lichte achtergrond
        // gerekend; hier staat een eigen knop op de donkere kop.
        className="w-full sm:max-w-[440px] p-0 gap-0 flex flex-col border-l-0 bg-background [&>button.absolute]:hidden"
        onOpenAutoFocus={(e) => {
          // Op een gsm zou focus op het tekstvak meteen het toetsenbord openen
          // en de helft van het gesprek bedekken.
          e.preventDefault();
        }}
      >
        <SheetTitle className="sr-only">Zarvis</SheetTitle>
        <SheetDescription className="sr-only">
          Gesprek met Zarvis, de assistent van Compass. Spreek of typ je vraag.
        </SheetDescription>

        {/* ── Kop: de aanwezigheid ─────────────────────────────────────────── */}
        <div className="shrink-0 bg-foreground text-background">
          <div className="flex items-center pl-4">
            <span className="font-headline font-bold text-[13px] tracking-[0.18em] uppercase text-white/60">
              Zarvis
            </span>
            <div className="ml-auto flex">
              <button
                className={balkKnop}
                onClick={wisselGezicht}
                disabled={gezicht === 'verbindt'}
                aria-pressed={metGezicht}
                aria-label={metGezicht ? 'Gezicht uitzetten' : 'Gezicht aanzetten'}
                title={metGezicht ? 'Gezicht uitzetten' : 'Gezicht aanzetten (proef): Zarvis krijgt een gezicht en luistert mee'}
              >
                {metGezicht ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
              {kanSpreken && kanLuisteren && !metGezicht && (
                <button
                  className={balkKnop}
                  onClick={() => zetStemAan(!stemAan)}
                  aria-pressed={stemAan}
                  aria-label={stemAan ? 'Stem uitzetten' : 'Stem aanzetten'}
                  title={stemAan ? 'Zarvis antwoordt hardop als je spreekt' : 'Zarvis antwoordt enkel op het scherm'}
                >
                  {stemAan ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </button>
              )}
              {berichten.length > 0 && (
                <button className={balkKnop} onClick={nieuwGesprek} aria-label="Nieuw gesprek" title="Nieuw gesprek">
                  <RotateCcw className="h-5 w-5" />
                </button>
              )}
              <button className={balkKnop} onClick={() => zetOpen(false)} aria-label="Zarvis sluiten" title="Sluiten">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Het video-element staat er altijd, ook verborgen: de SDK zoekt
              het op id zodra de verbinding er is. */}
          <div className={metGezicht ? 'relative mx-5 mb-3 aspect-[4/3] max-h-[38vh] overflow-hidden bg-black' : 'hidden'}>
            <video
              id={GEZICHT_VIDEO_ID}
              autoPlay
              playsInline
              aria-label="Het gezicht van Zarvis"
              className="h-full w-full object-cover"
            />
            {gezicht === 'verbindt' && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                Het gezicht komt eraan…
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 px-5 pb-5 pt-1">
            <ZarvisOrb status={status} maat={metGezicht ? 40 : berichten.length > 0 ? 72 : 104} className="transition-[width,height] duration-300" />
            <div className="min-w-0 flex-1">
              <p role="status" className="font-headline font-semibold text-xl tracking-[-0.02em] text-white">
                {STATUSTEKST[status]}
              </p>
              {luistert && !metGezicht ? (
                <p className="mt-1 text-[15px] leading-snug text-white/80 line-clamp-3 min-h-[1.4em]">
                  {tussentijds || <span className="text-white/45">Spreek gerust, ik stop vanzelf als je zwijgt.</span>}
                </p>
              ) : (
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-white/60 min-w-0">
                  {context.dossier ? (
                    <>
                      <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">In dossier {context.dossier.naam}</span>
                    </>
                  ) : (
                    <span>Geen dossier open</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Het gesprek ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5" aria-live="polite">
          {berichten.length === 0 ? (
            <div className="h-full flex flex-col">
              <p className="font-body text-[15px] leading-relaxed text-foreground">
                Ik ben Zarvis. Praten kunnen we al{kanLuisteren ? ', met je stem of getypt' : ''}.
              </p>
              <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                Je dossiers lezen en er iets in aanpassen kan ik nog niet. Dat komt in de volgende stap.
              </p>
              <p className="mt-6 mb-2 text-[11px] font-headline font-bold uppercase tracking-wider text-muted-foreground">
                Probeer eens
              </p>
              <div className="flex flex-col gap-2">
                {AANZETTEN.map((a) => (
                  <button
                    key={a}
                    onClick={() => stuur(a)}
                    className="min-h-11 px-3.5 py-2.5 text-left text-sm font-body text-foreground bg-card border border-border hover:border-primary hover:text-primary transition-colors"
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {berichten.map((b, i) =>
                b.rol === 'gebruiker' ? (
                  <div key={b.id} className="self-end max-w-[88%] bg-muted px-3.5 py-2.5 text-[15px] font-body leading-relaxed text-foreground whitespace-pre-wrap break-words">
                    {b.tekst}
                  </div>
                ) : b.fout ? (
                  <div key={b.id} role="alert" className="border-l-2 border-destructive pl-3.5">
                    <p className="text-[15px] font-body leading-relaxed text-foreground">{b.tekst}</p>
                    {i === berichten.length - 1 && laatsteVraag && (
                      <button
                        onClick={() => stuur(laatsteVraag)}
                        className="mt-2 min-h-11 px-3.5 text-sm font-headline font-semibold text-primary border border-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        Opnieuw proberen
                      </button>
                    )}
                  </div>
                ) : (
                  <div key={b.id} className="border-l-2 border-primary pl-3.5">
                    {b.tekst ? (
                      <p className="text-[15px] font-body leading-relaxed text-foreground whitespace-pre-wrap break-words">
                        {b.tekst}
                      </p>
                    ) : (
                      <p className="text-[15px] font-body text-muted-foreground">…</p>
                    )}
                    {b.onderbroken && b.tekst !== 'Onderbroken.' && (
                      <p className="mt-1 text-xs font-body text-muted-foreground">Onderbroken.</p>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
          <div ref={onderkant} />
        </div>

        {/* ── Spreken of typen ─────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {micMelding && (
            <p role="alert" className="mb-2 text-sm font-body text-destructive">{micMelding}</p>
          )}
          {gezichtMelding && (
            <p role="alert" className="mb-2 text-sm font-body text-destructive">{gezichtMelding}</p>
          )}
          <div className="flex items-end gap-2">
            {kanLuisteren && !metGezicht && (
              <button
                onClick={wisselMicrofoon}
                aria-pressed={luistert}
                aria-label={luistert ? 'Klaar met spreken' : bezig ? 'Onderbreken en spreken' : 'Spreken'}
                className={`h-14 w-14 shrink-0 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  luistert
                    ? 'bg-foreground text-background ring-4 ring-primary/40'
                    : 'bg-primary text-primary-foreground hover:bg-secondary'
                }`}
              >
                {luistert ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-6 w-6" />}
              </button>
            )}
            <textarea
              ref={veld}
              rows={1}
              value={tekst}
              onChange={(e) => zetTekst(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  verstuur();
                }
              }}
              placeholder={metGezicht ? 'Spreek, of typ je vraag' : kanLuisteren ? 'Of typ je vraag' : 'Typ je vraag'}
              aria-label="Bericht aan Zarvis"
              className="flex-1 min-h-14 max-h-[132px] resize-none bg-background border border-input px-3.5 py-[15px] text-[15px] font-body leading-snug text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary"
            />
            {bezig ? (
              <button
                onClick={onderbreek}
                aria-label="Zarvis onderbreken"
                className="h-14 w-12 shrink-0 flex items-center justify-center bg-foreground text-background hover:bg-foreground/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={verstuur}
                disabled={!tekst.trim()}
                aria-label="Versturen"
                className="h-14 w-12 shrink-0 flex items-center justify-center bg-primary text-primary-foreground hover:bg-secondary disabled:bg-muted disabled:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <SendHorizonal className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
