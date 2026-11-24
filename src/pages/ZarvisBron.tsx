import { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { openBronKanaal, type BronBericht } from '@/lib/zarvis/bronKanaal';
import type { ZarvisBron as Bron } from '@/lib/zarvis/client';

/**
 * Het gegevensvenster: een tweede klein venster naast Zarvis dat toont waarop
 * een antwoord steunt, zodat je kan nalezen zonder het gesprek te verliezen.
 * Het krijgt alles van het Zarvis-venster en haalt zelf niets op.
 */

const sleep = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const geenSleep = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

type Toestand = Extract<BronBericht, { soort: 'toon' }>;

export default function ZarvisBron() {
  const [toestand, zetToestand] = useState<Toestand | null>(null);
  const [gekozen, zetGekozen] = useState(0);
  const blokken = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => { document.title = 'Zarvis · gegevens'; }, []);

  useEffect(() => {
    const kanaal = openBronKanaal((b) => {
      if (b.soort !== 'toon') return;
      zetToestand((vorige) => {
        // Een nieuw onderwerp begint bovenaan; aanvullingen laten je staan waar je leest.
        if (!vorige || vorige.vraag !== b.vraag) zetGekozen(0);
        return b;
      });
    });
    kanaal.stuur({ soort: 'hallo' });
    return kanaal.sluit;
  }, []);

  const bronnen = toestand?.bronnen ?? [];

  const naar = (i: number) => {
    zetGekozen(i);
    blokken.current[i]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  return (
    <div className="zarvis-donker h-screen flex flex-col bg-[#07090F] text-[#F3F5FA] font-body overflow-hidden">
      <header style={sleep} className="shrink-0 flex items-start gap-3 px-5 pt-4 pb-3 select-none">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8CCBFF]">Gegevens</p>
          <p className="mt-0.5 text-[13px] leading-snug text-[#A9B4C8] line-clamp-2">
            {toestand?.vraag ? `Bij: ${toestand.vraag}` : 'Waarop het antwoord van Zarvis steunt'}
          </p>
        </div>
        <button
          style={geenSleep}
          onClick={() => window.close()}
          aria-label="Gegevens sluiten"
          className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center bg-white/[0.08] hover:bg-white/[0.16] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF]"
        >
          <X aria-hidden className="h-[18px] w-[18px]" />
        </button>
      </header>

      {bronnen.length > 1 && (
        <nav aria-label="Opgezochte gegevens" className="shrink-0 flex gap-2 overflow-x-auto px-5 pb-3">
          {bronnen.map((b, i) => (
            <button
              key={i}
              onClick={() => naar(i)}
              aria-current={gekozen === i}
              className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF] ${
                gekozen === i ? 'bg-[#F3F5FA] text-[#07090F] font-semibold' : 'bg-white/[0.08] text-[#D6DDEA] hover:bg-white/[0.16]'
              }`}
            >
              {b.titel}
            </button>
          ))}
        </nav>
      )}

      <main className="flex-1 min-h-0 overflow-y-auto px-5 pb-5" aria-live="polite">
        {bronnen.length === 0 ? (
          <div className="h-full flex flex-col justify-center">
            {toestand?.bezig ? (
              <p className="flex items-center gap-2 text-sm text-[#A9B4C8]">
                <Loader2 aria-hidden className="h-4 w-4 animate-spin text-[#8CCBFF]" /> Zarvis zoekt het op
              </p>
            ) : (
              <>
                <p className="font-headline font-medium text-[20px] leading-snug tracking-[-0.012em]">Nog niets opgezocht.</p>
                <p className="mt-2 text-sm leading-relaxed text-[#A9B4C8]">
                  Stel Zarvis een vraag over een dossier. De gegevens waarop het antwoord steunt, verschijnen hier.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-7">
            {bronnen.map((b, i) => (
              <BronBlok key={i} bron={b} zetRef={(el) => { blokken.current[i] = el; }} />
            ))}
            {toestand?.bezig && (
              <p className="flex items-center gap-2 text-[13px] text-[#A9B4C8]">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin text-[#8CCBFF]" /> Zarvis zoekt nog verder
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function BronBlok({ bron, zetRef }: { bron: Bron; zetRef: (el: HTMLElement | null) => void }) {
  return (
    <section ref={zetRef} className="scroll-mt-2">
      <h2 className="font-headline font-semibold text-[19px] leading-tight tracking-[-0.012em]">{bron.titel}</h2>
      {bron.ondertitel && <p className="mt-0.5 text-[13px] text-[#A9B4C8]">{bron.ondertitel}</p>}
      <div className="mt-3 flex flex-col gap-4">
        {bron.secties.map((s, i) => {
          const leeg = (s.velden?.length ?? 0) === 0 && (s.lijst?.length ?? 0) === 0;
          return (
            <div key={i}>
              {s.kop && <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8792A8]">{s.kop}</h3>}
              {leeg && <p className="text-sm text-[#A9B4C8]">{s.leeg ?? 'Niets gevonden.'}</p>}
              {s.velden && s.velden.length > 0 && (
                <dl className="rounded-2xl bg-white/[0.05] px-4 py-1">
                  {s.velden.map((v, j) => (
                    <div key={j} className={`flex items-baseline gap-4 py-2.5 ${j > 0 ? 'border-t border-white/[0.07]' : ''}`}>
                      <dt className="w-[38%] shrink-0 text-[13px] text-[#A9B4C8]">{v.label}</dt>
                      <dd className="min-w-0 flex-1 text-right text-[14px] font-medium break-words select-text">{v.waarde}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {s.lijst && s.lijst.length > 0 && (
                <ul className="rounded-2xl bg-white/[0.05] px-4 py-1">
                  {s.lijst.map((r, j) => (
                    <li key={j} className={`py-2.5 ${j > 0 ? 'border-t border-white/[0.07]' : ''}`}>
                      {(r.links || r.rechts) && (
                        <p className="mb-0.5 flex items-baseline justify-between gap-3 text-[12px] text-[#8792A8]">
                          <span className={r.nadruk ? 'font-semibold text-[#8CCBFF]' : ''}>{r.links}</span>
                          <span className="shrink-0">{r.rechts}</span>
                        </p>
                      )}
                      <p className={`text-[14px] leading-snug whitespace-pre-wrap break-words select-text ${r.nadruk ? 'text-[#F3F5FA]' : 'text-[#D6DDEA]'}`}>{r.tekst}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
