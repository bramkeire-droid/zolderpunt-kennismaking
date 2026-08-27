import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Video, StickyNote, Gavel, Star, CircleStop, Plus, X } from 'lucide-react';
import {
  beeindigGesprek, voegNotitieToe,
  type Gesprek, type GesprekNotitie, type NotitieSoort,
} from '@/lib/gesprekken';
import PostItRij from './PostItRij';

interface Props {
  gesprek: Gesprek;
  notities: GesprekNotitie[];
  /** Nieuw aangemaakte notitie doorgeven zodat de pagina zijn lijsten bijwerkt. */
  onNotitie: (notitie: GesprekNotitie) => void;
  /** Gewijzigde of verwijderde notitie doorgeven (null = verwijderd). */
  onNotitieGewijzigd: (id: string, notitie: GesprekNotitie | null) => void;
  onBeeindigd: () => void;
}

export const SOORT_META: Record<NotitieSoort, { label: string; icon: typeof StickyNote; klasse: string }> = {
  notitie: { label: 'Notitie', icon: StickyNote, klasse: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900' },
  beslissing: { label: 'Beslissing', icon: Gavel, klasse: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900' },
  onthouden: { label: 'Onthouden', icon: Star, klasse: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900' },
};

function verstreken(vanaf: string, nu: number): string {
  const sec = Math.max(0, Math.floor((nu - new Date(vanaf).getTime()) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Eén onopgeslagen kladje. `sleutel` is puur voor React, niet voor de database. */
type Kladje = { sleutel: string; tekst: string };

const nieuwKladje = (): Kladje => ({ sleutel: `k${Date.now()}${Math.random().toString(36).slice(2, 7)}`, tekst: '' });

/**
 * Actieve-gespreksmodus (Sprint 2, uitgebreid 2026-08-27 na Brams test): tijdens een lopend
 * gesprek post-its vastleggen.
 *
 * TWEE DINGEN DIE UIT DAT TESTGESPREK KWAMEN:
 *  1. MEERDERE KLADJES TEGELIJK. Er was één invoerveld, dus je moest je halve gedachte
 *     opslaan voordat je aan de volgende kon beginnen. Nu staan er zoveel kladjes open als
 *     je wil; elk heeft zijn eigen soort-knoppen en verdwijnt pas als je hem bewaart.
 *  2. Onopgeslagen kladjes overleven een refresh (localStorage per gesprek). Tijdens een
 *     telefoongesprek is een per ongeluk gewiste gedachte niet meer terug te halen.
 */
export default function GesprekModus({ gesprek, notities, onNotitie, onNotitieGewijzigd, onBeeindigd }: Props) {
  const opslagSleutel = `compass:kladjes:${gesprek.id}`;

  const [kladjes, setKladjes] = useState<Kladje[]>(() => {
    try {
      const bewaard = localStorage.getItem(`compass:kladjes:${gesprek.id}`);
      const gelezen = bewaard ? (JSON.parse(bewaard) as Kladje[]) : [];
      if (Array.isArray(gelezen) && gelezen.length > 0) return gelezen;
    } catch {
      // kapotte of geblokkeerde opslag mag de gespreksmodus nooit breken
    }
    return [nieuwKladje()];
  });
  const [bezig, setBezig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [nu, setNu] = useState(Date.now());
  const laatsteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNu(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Kladjes bewaren zodat een refresh of per ongeluk wegklikken niets kost.
  useEffect(() => {
    try {
      const metInhoud = kladjes.filter((k) => k.tekst.trim());
      if (metInhoud.length > 0) localStorage.setItem(opslagSleutel, JSON.stringify(metInhoud));
      else localStorage.removeItem(opslagSleutel);
    } catch {
      // opslag geblokkeerd (privémodus) — geen ramp, gewoon geen herstel na refresh
    }
  }, [kladjes, opslagSleutel]);

  const eigenNotities = notities.filter((n) => n.gesprek_id === gesprek.id);

  const zetTekst = (sleutel: string, tekst: string) =>
    setKladjes((lijst) => lijst.map((k) => (k.sleutel === sleutel ? { ...k, tekst } : k)));

  const voegKladjeToe = () => {
    const nieuw = nieuwKladje();
    setKladjes((lijst) => [...lijst, nieuw]);
    // focus verschuift naar het verse veld zodra het gerenderd is
    setTimeout(() => laatsteRef.current?.focus(), 0);
  };

  const sluitKladje = (sleutel: string) =>
    setKladjes((lijst) => {
      const rest = lijst.filter((k) => k.sleutel !== sleutel);
      return rest.length > 0 ? rest : [nieuwKladje()];
    });

  const bewaar = async (kladje: Kladje, soort: NotitieSoort) => {
    const schoon = kladje.tekst.trim();
    if (!schoon || bezig) return;
    setBezig(kladje.sleutel);
    setFout(null);
    try {
      const notitie = await voegNotitieToe(gesprek.lead_id, gesprek.id, soort, schoon);
      onNotitie(notitie);
      sluitKladje(kladje.sleutel);
    } catch (e) {
      setFout((e as Error).message);
    } finally {
      setBezig(null);
    }
  };

  const stop = async () => {
    if (bezig) return;
    setBezig('stop');
    setFout(null);
    try {
      await beeindigGesprek(gesprek.id);
      try { localStorage.removeItem(opslagSleutel); } catch { /* niet kritiek */ }
      onBeeindigd();
    } catch (e) {
      setFout((e as Error).message);
      setBezig(null);
    }
  };

  const TypeIcon = gesprek.type === 'telefoon' ? Phone : Video;
  const onopgeslagen = kladjes.filter((k) => k.tekst.trim()).length;

  return (
    <section className="rounded-lg border-2 border-primary/50 bg-card shadow-sm">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
        <TypeIcon className="h-4 w-4 text-primary" />
        <h2 className="font-headline font-semibold text-sm">
          {gesprek.type === 'telefoon' ? 'Telefoongesprek' : 'Videocall'} bezig
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">{verstreken(gesprek.gestart_op, nu)}</span>
        {onopgeslagen > 0 && (
          <span className="text-[11px] text-amber-700 dark:text-amber-500">
            {onopgeslagen} niet bewaard
          </span>
        )}
        <Button size="sm" variant="destructive" className="ml-auto h-7 gap-1.5" onClick={stop} disabled={!!bezig}>
          <CircleStop className="h-3.5 w-3.5" />
          <span className="text-xs">Gesprek beëindigen</span>
        </Button>
      </div>

      <div className="p-4 space-y-3">
        {kladjes.map((kladje, i) => (
          <div key={kladje.sleutel} className="space-y-2">
            <div className="relative">
              <Textarea
                ref={i === kladjes.length - 1 ? laatsteRef : undefined}
                value={kladje.tekst}
                onChange={(e) => zetTekst(kladje.sleutel, e.target.value)}
                placeholder={
                  i === 0
                    ? 'Typ wat gezegd of beslist wordt… en kies hieronder het soort post-it.'
                    : 'Nog iets…'
                }
                className="min-h-[70px] text-sm pr-8"
                onKeyDown={(e) => {
                  // Enter = snelste pad: gewone notitie. Shift+Enter = nieuwe regel.
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void bewaar(kladje, 'notitie');
                  }
                }}
              />
              {kladjes.length > 1 && (
                <button
                  type="button"
                  onClick={() => sluitKladje(kladje.sleutel)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  aria-label="Dit kladje weggooien"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {(Object.keys(SOORT_META) as NotitieSoort[]).map((soort) => {
                const meta = SOORT_META[soort];
                return (
                  <Button
                    key={soort}
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8"
                    disabled={!!bezig || !kladje.tekst.trim()}
                    onClick={() => bewaar(kladje, soort)}
                  >
                    <meta.icon className="h-3.5 w-3.5" />
                    <span className="text-xs">{meta.label}</span>
                  </Button>
                );
              })}
              {i === kladjes.length - 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 h-8 text-muted-foreground"
                  onClick={voegKladjeToe}
                  disabled={!!bezig}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="text-xs">Nog een notitie</span>
                </Button>
              )}
            </div>
          </div>
        ))}

        {fout && <p className="text-xs text-destructive">Bewaren mislukte: {fout}</p>}

        {eigenNotities.length > 0 && (
          <ul className="space-y-1.5 pt-1">
            {eigenNotities.slice().reverse().map((n) => (
              <li key={n.id}>
                <PostItRij notitie={n} onGewijzigd={onNotitieGewijzigd} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
