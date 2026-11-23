import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Lock } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { bewaarInstellingen, leesInstellingen } from '@/lib/zarvis/instellingen';

/**
 * De beheersectie van Zarvis: welke connectoren hij mag gebruiken. Het programma
 * toont deze pagina als inrichting bij de eerste start (`?eerste=1`) en later
 * via het systeemvak. Alleen voor beheerders.
 *
 * Eerlijk over wat bestaat: een connector die nog niet gebouwd is, staat er wel
 * bij, maar kan niet aangevinkt worden.
 */

/** Wat het programma aanbiedt; ontbreekt in een gewone browser. */
type Brug = {
  toestand: () => Promise<{
    versie: string; sneltoets: string; sneltoetsGelukt: boolean; bovenop: boolean; startMee: boolean;
    whatsapp: { gekoppeld: boolean; aan: boolean };
  }>;
  zet: (sleutel: 'bovenop' | 'startMee' | 'whatsappAan', waarde: boolean) => void;
  koppelWhatsApp: () => void;
  klaar: () => void;
};
const brug = (): Brug | undefined => (window as unknown as { zarvisBeheer?: Brug }).zarvisBeheer;

type Connector = {
  sleutel: string;
  naam: string;
  uitleg: string;
  /** vast: altijd aan. gebouwd: aan of uit te zetten. later: nog niet gebouwd. */
  soort: 'vast' | 'gebouwd' | 'later';
};

const CONNECTOREN: Connector[] = [
  { sleutel: 'compass', naam: 'Compass', uitleg: 'Dossiers, gesprekken, notities en calculaties. De basis van Zarvis; staat altijd aan.', soort: 'vast' },
  { sleutel: 'whatsapp', naam: 'WhatsApp', uitleg: 'Leest je gesprekken met klanten mee en verstuurt wat je Zarvis laat versturen. Een bericht aan een klant leest Zarvis je eerst voor. Alleen nummers uit je dossiers worden bewaard.', soort: 'gebouwd' },
  { sleutel: 'stem', naam: 'Vlaamse stem', uitleg: 'Luisteren en spreken in het Vlaams via Azure. Uit: de stem van je computer.', soort: 'gebouwd' },
  { sleutel: 'mail', naam: 'Mail', uitleg: 'Mails lezen en aan dossiers koppelen, zoals Maildude.', soort: 'later' },
  { sleutel: 'agenda', naam: 'Agenda en Calendly', uitleg: 'Afspraken lezen en plannen.', soort: 'later' },
  { sleutel: 'bouwflow', naam: 'Bouwflow', uitleg: 'Rechtstreeks in Bouwflow werken. Wat Compass al uit Bouwflow overneemt, leest Zarvis vandaag via Compass.', soort: 'later' },
  { sleutel: 'todoist', naam: 'Todoist', uitleg: 'Taken lezen en aanmaken.', soort: 'later' },
  { sleutel: 'marketing', naam: 'Marketing en Google Ads', uitleg: 'Website, marketingdashboard en advertenties.', soort: 'later' },
  { sleutel: 'werf', naam: 'Werf en lonen', uitleg: 'Arbeidsuren, tijdsnormen en loonadministratie.', soort: 'later' },
  { sleutel: 'financien', naam: 'Financiën', uitleg: 'Je cijfers, zoals in FINDASHBOARD.', soort: 'later' },
  { sleutel: 'inventaris', naam: 'Inventaris', uitleg: 'Je voorraad, zoals in INVENSYNC.', soort: 'later' },
];

const vak = 'h-6 w-6 shrink-0 rounded-md border flex items-center justify-center transition-colors';

export default function ZarvisBeheer() {
  const eerste = new URLSearchParams(window.location.search).get('eerste') === '1';
  const { isAdmin, geladen: rolGeladen } = useIsAdmin();
  const [stap, zetStap] = useState(eerste ? 0 : 1);
  const [aan, zetAan] = useState<Record<string, boolean>>({});
  const [geladen, zetGeladen] = useState(false);
  const [bezig, zetBezig] = useState(false);
  const [melding, zetMelding] = useState<string | null>(null);
  const [bewaard, zetBewaard] = useState(false);
  const [stemBeschikbaar, zetStemBeschikbaar] = useState<boolean | null>(null);
  const [programma, zetProgramma] = useState<Awaited<ReturnType<Brug['toestand']>> | null>(null);

  useEffect(() => { document.title = 'Zarvis · beheer'; }, []);

  const leesProgramma = useCallback(async () => {
    const b = brug();
    if (b) zetProgramma(await b.toestand());
  }, []);

  useEffect(() => {
    void leesInstellingen().then((i) => {
      // Bij de eerste start gelden de keuzes uit het installatieprogramma.
      const vraag = new URLSearchParams(window.location.search);
      const uitInstallatie = Object.fromEntries(['whatsapp', 'stem'].filter((s) => vraag.get(s) === '0').map((s) => [s, false]));
      zetAan({ ...i.connectoren, ...uitInstallatie });
      zetGeladen(true);
    });
    // Is de Vlaamse stem ingesteld op de server? Zonder sleutel antwoordt die met 503.
    void supabase.functions.invoke('zarvis-stem', { body: { actie: 'bewijs' } })
      .then(({ error }) => zetStemBeschikbaar(!error)).catch(() => zetStemBeschikbaar(false));
    void leesProgramma();
    // WhatsApp koppelen gebeurt in een ander venster; bij terugkeer opnieuw kijken.
    window.addEventListener('focus', leesProgramma);
    return () => window.removeEventListener('focus', leesProgramma);
  }, [leesProgramma]);

  const staatAan = (c: Connector) => c.soort === 'vast' || (c.soort === 'gebouwd' && aan[c.sleutel] !== false);

  const wissel = (c: Connector) => {
    if (c.soort !== 'gebouwd') return;
    const nieuw = !staatAan(c);
    zetAan((v) => ({ ...v, [c.sleutel]: nieuw }));
    zetBewaard(false);
    if (c.sleutel === 'whatsapp') brug()?.zet('whatsappAan', nieuw);
  };

  const toestandVan = (c: Connector): { tekst: string; kleur: string } => {
    if (c.soort === 'later') return { tekst: 'Nog niet gebouwd', kleur: 'text-[#8792A8]' };
    if (c.sleutel === 'compass') return { tekst: 'Verbonden', kleur: 'text-[#5BE49B]' };
    if (c.sleutel === 'whatsapp') {
      if (!brug()) return { tekst: 'Koppelen kan alleen in het programma op je computer', kleur: 'text-[#A9B4C8]' };
      if (!programma) return { tekst: '…', kleur: 'text-[#A9B4C8]' };
      return programma.whatsapp.gekoppeld
        ? { tekst: 'Gekoppeld', kleur: 'text-[#5BE49B]' }
        : { tekst: 'Nog niet gekoppeld', kleur: 'text-[#FFB547]' };
    }
    if (c.sleutel === 'stem') {
      if (stemBeschikbaar === null) return { tekst: '…', kleur: 'text-[#A9B4C8]' };
      return stemBeschikbaar
        ? { tekst: 'Klaar voor gebruik', kleur: 'text-[#5BE49B]' }
        : { tekst: 'Sleutel ontbreekt op de server; Zarvis gebruikt de stem van je computer', kleur: 'text-[#FFB547]' };
    }
    return { tekst: '', kleur: '' };
  };

  const bewaar = async (afronden: boolean) => {
    zetBezig(true);
    zetMelding(null);
    const gekozen = Object.fromEntries(CONNECTOREN.filter((c) => c.soort === 'gebouwd').map((c) => [c.sleutel, staatAan(c)]));
    const fout = await bewaarInstellingen(gekozen, afronden);
    zetBezig(false);
    if (fout) { zetMelding(fout); return; }
    zetBewaard(true);
    if (afronden) { if (brug()) brug()!.klaar(); else zetStap(3); }
  };

  const kader = 'min-h-screen bg-[#07090F] text-[#F3F5FA] font-body';
  if (!rolGeladen || !geladen) {
    return <div className={`${kader} flex items-center justify-center`}><Loader2 aria-label="Laden" className="h-6 w-6 animate-spin text-[#8CCBFF]" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className={`${kader} flex flex-col justify-center px-8`}>
        <Lock aria-hidden className="h-6 w-6 text-[#FFB547]" />
        <h1 className="mt-3 font-headline font-semibold text-[22px] tracking-[-0.015em]">Alleen voor beheerders</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#A9B4C8]">Welke connectoren Zarvis gebruikt, stelt een beheerder in. Vraag het aan Bram.</p>
      </div>
    );
  }

  const stappen = ['Welkom', 'Connectoren', 'Programma'];

  return (
    <div className={`${kader} flex flex-col`}>
      <header className="shrink-0 px-7 pt-6 pb-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8CCBFF]">{eerste ? 'Zarvis inrichten' : 'Beheer'}</p>
        {eerste && stap < 3 && (
          <ol className="mt-3 flex gap-2" aria-label="Stappen">
            {stappen.map((s, i) => (
              <li key={s} aria-current={stap === i ? 'step' : undefined} className="flex-1">
                <span className={`block h-1 rounded-full ${i <= stap ? 'bg-[#2E8BFF]' : 'bg-white/[0.12]'}`} />
                <span className={`mt-1.5 block text-[12px] ${stap === i ? 'text-[#F3F5FA] font-semibold' : 'text-[#8792A8]'}`}>{s}</span>
              </li>
            ))}
          </ol>
        )}
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto px-7 pb-4">
        {stap === 0 && (
          <div>
            <h1 className="font-headline font-semibold text-[26px] leading-tight tracking-[-0.02em]">Zarvis staat op je computer.</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#C3CBDA]">
              In twee stappen kies je wat Zarvis mag gebruiken en hoe het programma zich gedraagt. Alles is later aan te passen via het icoon van Zarvis rechtsonder in je taakbalk, onder Beheer.
            </p>
          </div>
        )}

        {stap === 1 && (
          <div>
            <h1 className="font-headline font-semibold text-[22px] leading-tight tracking-[-0.015em]">Wat mag Zarvis gebruiken?</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[#A9B4C8]">Wat uit staat, kan Zarvis niet raadplegen, ook niet als je ernaar vraagt.</p>
            <ul className="mt-4 flex flex-col gap-2">
              {CONNECTOREN.map((c) => {
                const t = toestandVan(c);
                const actief = staatAan(c);
                const id = `connector-${c.sleutel}`;
                return (
                  <li key={c.sleutel} className={`rounded-2xl bg-white/[0.05] ${c.soort === 'later' ? 'opacity-60' : ''}`}>
                    <label htmlFor={id} className={`flex min-h-[56px] items-start gap-3.5 px-4 py-3.5 ${c.soort === 'gebouwd' ? 'cursor-pointer' : ''}`}>
                      <input
                        id={id} type="checkbox" className="peer sr-only"
                        checked={actief} disabled={c.soort !== 'gebouwd'} onChange={() => wissel(c)}
                      />
                      <span aria-hidden className={`${vak} mt-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#8CCBFF] ${actief ? 'border-[#2E8BFF] bg-[#2E8BFF]' : 'border-white/30 bg-transparent'}`}>
                        {actief && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-headline font-semibold text-[15px]">{c.naam}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-[#A9B4C8]">{c.uitleg}</span>
                        {t.tekst && <span className={`mt-1 block text-[13px] ${t.kleur}`}>{t.tekst}</span>}
                      </span>
                    </label>
                    {c.sleutel === 'whatsapp' && brug() && actief && programma && !programma.whatsapp.gekoppeld && (
                      <div className="px-4 pb-3.5 pl-[54px]">
                        <button onClick={() => brug()!.koppelWhatsApp()} className="h-11 rounded-full bg-white/[0.1] px-4 text-sm font-headline font-semibold hover:bg-white/[0.18] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF]">
                          WhatsApp koppelen
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {stap === 2 && (
          <div>
            <h1 className="font-headline font-semibold text-[22px] leading-tight tracking-[-0.015em]">Het programma</h1>
            {programma ? (
              <ul className="mt-4 flex flex-col gap-2">
                {([['bovenop', 'Altijd bovenop', 'Het venster blijft boven je andere werk staan.'], ['startMee', 'Starten met de computer', 'Zarvis staat klaar zodra je inlogt op Windows.']] as const).map(([sleutel, naam, uitleg]) => (
                  <li key={sleutel} className="rounded-2xl bg-white/[0.05]">
                    <label htmlFor={`prog-${sleutel}`} className="flex min-h-[56px] cursor-pointer items-start gap-3.5 px-4 py-3.5">
                      <input
                        id={`prog-${sleutel}`} type="checkbox" className="peer sr-only" checked={programma[sleutel]}
                        onChange={() => { brug()!.zet(sleutel, !programma[sleutel]); zetProgramma({ ...programma, [sleutel]: !programma[sleutel] }); }}
                      />
                      <span aria-hidden className={`${vak} mt-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#8CCBFF] ${programma[sleutel] ? 'border-[#2E8BFF] bg-[#2E8BFF]' : 'border-white/30'}`}>
                        {programma[sleutel] && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-headline font-semibold text-[15px]">{naam}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-[#A9B4C8]">{uitleg}</span>
                      </span>
                    </label>
                  </li>
                ))}
                <li className="rounded-2xl bg-white/[0.05] px-4 py-3.5">
                  <span className="block font-headline font-semibold text-[15px]">Sneltoets: {programma.sneltoets}</span>
                  <span className={`mt-0.5 block text-[13px] leading-snug ${programma.sneltoetsGelukt ? 'text-[#A9B4C8]' : 'text-[#FFB547]'}`}>
                    {programma.sneltoetsGelukt ? 'Druk erop om Zarvis te tonen en meteen te spreken, waar je ook mee bezig bent.' : 'Een ander programma gebruikt deze combinatie al. Zarvis toon je dan via het icoon in de taakbalk.'}
                  </span>
                </li>
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-[#A9B4C8]">Deze instellingen bestaan alleen in het programma op je computer.</p>
            )}
            {programma && <p className="mt-4 text-[12px] text-[#8792A8]">Zarvis {programma.versie}</p>}
          </div>
        )}

        {stap === 3 && (
          <div>
            <h1 className="font-headline font-semibold text-[22px] tracking-[-0.015em]">Bewaard.</h1>
            <p className="mt-2 text-sm text-[#A9B4C8]">Je mag dit venster sluiten.</p>
          </div>
        )}
      </main>

      {stap < 3 && (
        <footer className="shrink-0 border-t border-white/[0.08] px-7 py-4">
          {melding && <p role="alert" className="mb-3 text-sm text-[#FFB547]">{melding}</p>}
          <div className="flex items-center gap-3">
            {eerste && stap > 0 && (
              <button onClick={() => zetStap(stap - 1)} className="h-12 rounded-full bg-white/[0.08] px-5 text-sm font-headline font-semibold hover:bg-white/[0.16] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF]">Terug</button>
            )}
            {!eerste && (
              <div className="flex gap-2" role="tablist" aria-label="Onderdeel">
                {[1, 2].map((s) => (
                  <button key={s} role="tab" aria-selected={stap === s} onClick={() => zetStap(s)} className={`h-12 rounded-full px-5 text-sm font-headline font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF] ${stap === s ? 'bg-white/[0.16]' : 'bg-white/[0.06] text-[#A9B4C8] hover:bg-white/[0.12]'}`}>{stappen[s]}</button>
                ))}
              </div>
            )}
            <span className="flex-1" />
            {!eerste && bewaard && <span role="status" className="text-sm text-[#5BE49B]">Bewaard</span>}
            <button
              disabled={bezig}
              onClick={() => { if (!eerste) void bewaar(false); else if (stap < 2) zetStap(stap + 1); else void bewaar(true); }}
              className="h-12 rounded-full bg-[#2E8BFF] px-6 text-sm font-headline font-semibold text-white hover:bg-[#4A9BFF] disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF]"
            >
              {bezig ? 'Bewaren…' : !eerste ? 'Bewaren' : stap < 2 ? 'Verder' : 'Klaar'}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
