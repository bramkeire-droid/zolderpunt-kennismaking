import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Gavel, Star, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { wijzigNotitie, verwijderNotitie, type GesprekNotitie, type NotitieSoort } from '@/lib/gesprekken';

const SOORT_META: Record<NotitieSoort, { label: string; icon: typeof StickyNote; klasse: string; rand: string; tekst: string }> = {
  notitie: {
    label: 'Notitie',
    icon: StickyNote,
    klasse: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
    rand: 'border-amber-300 dark:border-amber-800',
    tekst: 'text-amber-700 dark:text-amber-400',
  },
  beslissing: {
    label: 'Beslissing',
    icon: Gavel,
    klasse: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
    rand: 'border-red-400 dark:border-red-800',
    tekst: 'text-red-700 dark:text-red-400',
  },
  onthouden: {
    label: 'Onthouden',
    icon: Star,
    klasse: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900',
    rand: 'border-sky-400 dark:border-sky-800',
    tekst: 'text-sky-700 dark:text-sky-400',
  },
};


interface Props {
  notitie: GesprekNotitie;
  /** null als tweede argument = verwijderd. */
  onGewijzigd: (id: string, notitie: GesprekNotitie | null) => void;
  /** Auteursnaam tonen (in de tijdlijn nuttig, tijdens het eigen gesprek overbodig). */
  auteur?: string;
}

/**
 * Eén post-it, bewerkbaar (2026-08-27, na Brams test van de gespreksmodus). Tijdens een
 * gesprek typ je snel en half; achteraf moet je dat kunnen rechtzetten. Je kan de tekst
 * aanpassen, het soort omzetten (een notitie blijkt tóch een beslissing) en de post-it
 * verwijderen.
 *
 * Verwijderen vraagt eerst een bevestiging in de rij zelf — geen browser-dialoog, want die
 * onderbreekt een lopend telefoongesprek.
 */
export default function PostItRij({ notitie, onGewijzigd, auteur }: Props) {
  const [bewerken, setBewerken] = useState(false);
  const [tekst, setTekst] = useState(notitie.tekst);
  const [soort, setSoort] = useState<NotitieSoort>(notitie.soort);
  const [bezig, setBezig] = useState(false);
  const [bevestigWeg, setBevestigWeg] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const meta = SOORT_META[notitie.soort];
  const tijd = new Date(notitie.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });

  const bewaar = async () => {
    const schoon = tekst.trim();
    if (!schoon || bezig) return;
    if (schoon === notitie.tekst && soort === notitie.soort) { setBewerken(false); return; }
    setBezig(true);
    setFout(null);
    try {
      const bijgewerkt = await wijzigNotitie(notitie.id, { tekst: schoon, soort });
      onGewijzigd(notitie.id, bijgewerkt);
      setBewerken(false);
    } catch (e) {
      setFout((e as Error).message);
    } finally {
      setBezig(false);
    }
  };

  const gooiWeg = async () => {
    setBezig(true);
    setFout(null);
    try {
      await verwijderNotitie(notitie.id);
      onGewijzigd(notitie.id, null);
    } catch (e) {
      setFout((e as Error).message);
      setBezig(false);
      setBevestigWeg(false);
    }
  };

  if (bewerken) {
    return (
      <div className={`border-l-[3px] px-3 py-2 space-y-2 bg-muted/20 ${SOORT_META[soort].rand}`}>
        <Textarea
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          className="min-h-[60px] text-sm bg-background/70"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void bewaar(); }
            if (e.key === 'Escape') { setTekst(notitie.tekst); setSoort(notitie.soort); setBewerken(false); }
          }}
        />
        <div className="flex gap-1.5 flex-wrap items-center">
          {(Object.keys(SOORT_META) as NotitieSoort[]).map((s) => {
            const m = SOORT_META[s];
            return (
              <Button
                key={s}
                size="sm"
                variant={s === soort ? 'default' : 'outline'}
                className="gap-1 h-7"
                onClick={() => setSoort(s)}
                disabled={bezig}
              >
                <m.icon className="h-3 w-3" />
                <span className="text-[11px]">{m.label}</span>
              </Button>
            );
          })}
          <span className="ml-auto flex gap-1.5">
            <Button size="sm" className="gap-1 h-7" onClick={() => void bewaar()} disabled={bezig || !tekst.trim()}>
              {bezig ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              <span className="text-[11px]">Bewaren</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={() => { setTekst(notitie.tekst); setSoort(notitie.soort); setBewerken(false); }}
              disabled={bezig}
            >
              <span className="text-[11px]">Annuleren</span>
            </Button>
          </span>
        </div>
        {fout && <p className="text-[11px] text-destructive">Bewaren mislukte: {fout}</p>}
      </div>
    );
  }

  return (
    <div className={`group border-l-[3px] px-3 py-2 text-[13px] leading-5 flex items-start gap-2 ${meta.rand}`}>
      <meta.icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${meta.tekst}`} />
      <span className="flex-1 whitespace-pre-wrap text-foreground">{notitie.tekst}</span>


      {bevestigWeg ? (
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-muted-foreground">Weggooien?</span>
          <Button size="sm" variant="destructive" className="h-6 px-2" onClick={() => void gooiWeg()} disabled={bezig}>
            <span className="text-[11px]">Ja</span>
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setBevestigWeg(false)} disabled={bezig}>
            <span className="text-[11px]">Nee</span>
          </Button>
        </span>
      ) : (
        <>
          <span className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => setBewerken(true)}
              className="p-1 text-muted-foreground hover:text-foreground"
              aria-label="Notitie wijzigen"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setBevestigWeg(true)}
              className="p-1 text-muted-foreground hover:text-destructive"
              aria-label="Notitie verwijderen"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
            {auteur ? `${auteur} · ` : ''}{tijd}
          </span>
        </>
      )}
      {fout && <span className="text-[11px] text-destructive shrink-0">{fout}</span>}
    </div>
  );
}
