import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Video, StickyNote, Gavel, Star, CircleStop } from 'lucide-react';
import {
  beeindigGesprek, voegNotitieToe,
  type Gesprek, type GesprekNotitie, type NotitieSoort,
} from '@/lib/gesprekken';

interface Props {
  gesprek: Gesprek;
  notities: GesprekNotitie[];
  /** Nieuw aangemaakte notitie doorgeven zodat de pagina zijn lijsten bijwerkt. */
  onNotitie: (notitie: GesprekNotitie) => void;
  onBeeindigd: () => void;
}

const SOORT_META: Record<NotitieSoort, { label: string; icon: typeof StickyNote; klasse: string }> = {
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

/**
 * Actieve-gespreksmodus (Sprint 2): tijdens een lopend telefoongesprek of videocall in
 * één tik post-its vastleggen (notitie / beslissing / onthouden). Elke post-it krijgt
 * automatisch tijdstip en auteur. Schrijft uitsluitend naar de nieuwe tabellen — nooit
 * naar leads.gesprek_datum of pre_intake.
 */
export default function GesprekModus({ gesprek, notities, onNotitie, onBeeindigd }: Props) {
  const [tekst, setTekst] = useState('');
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [nu, setNu] = useState(Date.now());
  const invoerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNu(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const eigenNotities = notities.filter((n) => n.gesprek_id === gesprek.id);

  const bewaar = async (soort: NotitieSoort) => {
    const schoon = tekst.trim();
    if (!schoon || bezig) return;
    setBezig(true);
    setFout(null);
    try {
      const notitie = await voegNotitieToe(gesprek.lead_id, gesprek.id, soort, schoon);
      onNotitie(notitie);
      setTekst('');
      invoerRef.current?.focus();
    } catch (e) {
      setFout((e as Error).message);
    } finally {
      setBezig(false);
    }
  };

  const stop = async () => {
    if (bezig) return;
    setBezig(true);
    setFout(null);
    try {
      await beeindigGesprek(gesprek.id);
      onBeeindigd();
    } catch (e) {
      setFout((e as Error).message);
      setBezig(false);
    }
  };

  const TypeIcon = gesprek.type === 'telefoon' ? Phone : Video;

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
        <Button size="sm" variant="destructive" className="ml-auto h-7 gap-1.5" onClick={stop} disabled={bezig}>
          <CircleStop className="h-3.5 w-3.5" />
          <span className="text-xs">Gesprek beëindigen</span>
        </Button>
      </div>

      <div className="p-4 space-y-3">
        <Textarea
          ref={invoerRef}
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          placeholder="Typ wat gezegd of beslist wordt… en kies hieronder het soort post-it."
          className="min-h-[70px] text-sm"
          onKeyDown={(e) => {
            // Enter = snelste pad: gewone notitie. Shift+Enter = nieuwe regel.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void bewaar('notitie');
            }
          }}
        />
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(SOORT_META) as NotitieSoort[]).map((soort) => {
            const meta = SOORT_META[soort];
            return (
              <Button
                key={soort}
                size="sm"
                variant="outline"
                className="gap-1.5 h-8"
                disabled={bezig || !tekst.trim()}
                onClick={() => bewaar(soort)}
              >
                <meta.icon className="h-3.5 w-3.5" />
                <span className="text-xs">{meta.label}</span>
              </Button>
            );
          })}
        </div>

        {fout && (
          <p className="text-xs text-destructive">Bewaren mislukte: {fout}</p>
        )}

        {eigenNotities.length > 0 && (
          <ul className="space-y-1.5 pt-1">
            {eigenNotities.slice().reverse().map((n) => {
              const meta = SOORT_META[n.soort];
              return (
                <li key={n.id} className={`rounded border px-2.5 py-1.5 text-sm flex items-start gap-2 ${meta.klasse}`}>
                  <meta.icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="flex-1">{n.tekst}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {new Date(n.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
