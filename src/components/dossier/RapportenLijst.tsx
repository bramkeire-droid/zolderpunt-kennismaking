import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, Mail, ScrollText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  haalRapporten, downloadUitOpslag, verwijderRapport, type RapportRij,
} from '@/lib/rapporten';
import RapportMailDialog from '@/components/dossier/RapportMailDialog';

/**
 * De rapporten die op dit dossier gegenereerd zijn, met een downloadknop.
 *
 * Bewust een download van het BEWAARDE bestand, niet een nieuwe PDF-render:
 * een rapport van vorige maand hoort de cijfers van vorige maand te tonen, ook
 * als de calculator intussen gewijzigd is. Daarnaast staat het transcript dat
 * bij dat rapport hoorde — de invoer waarmee het gemaakt is.
 */

const BRON_LABEL: Record<string, string> = {
  intake: 'Intakegesprek',
  telefoon: 'Telefoongesprek',
  los: 'Los',
};

const datumTijd = (iso: string) =>
  new Date(iso).toLocaleString('nl-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const grootte = (bytes: number | null) =>
  bytes == null ? '' : bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} kB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

interface Props {
  leadId: string;
  /** Meeteller voor de kop; laat de kaart weg zolang er niets is. */
  onAantal?: (n: number) => void;
}

export default function RapportenLijst({ leadId, onAantal }: Props) {
  const [rijen, setRijen] = useState<RapportRij[]>([]);
  const [laden, setLaden] = useState(true);
  const [bezig, setBezig] = useState<string | null>(null);
  const [mailVoor, setMailVoor] = useState<RapportRij | null>(null);

  useEffect(() => {
    let weg = false;
    setLaden(true);
    void (async () => {
      const data = await haalRapporten(leadId);
      if (weg) return;
      setRijen(data);
      setLaden(false);
      onAantal?.(data.length);
    })();
    return () => { weg = true; };
    // onAantal bewust niet in de deps: een inline-functie van de ouder zou
    // anders bij elke render opnieuw laden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const haal = async (sleutel: string, pad: string, naam: string) => {
    setBezig(sleutel);
    try {
      await downloadUitOpslag(pad, naam);
    } catch (e) {
      toast.error(`Downloaden mislukt: ${(e as Error).message}`);
    } finally {
      setBezig(null);
    }
  };

  const wis = async (rij: RapportRij) => {
    if (!window.confirm(`"${rij.bestandsnaam}" definitief verwijderen uit dit dossier?`)) return;
    setBezig(rij.id);
    try {
      await verwijderRapport(rij);
      setRijen((v) => {
        const over = v.filter((r) => r.id !== rij.id);
        onAantal?.(over.length);
        return over;
      });
      toast.success('Rapport verwijderd');
    } catch (e) {
      toast.error(`Verwijderen mislukt: ${(e as Error).message}`);
    } finally {
      setBezig(null);
    }
  };

  if (laden) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Rapporten laden…</p>
      </section>
    );
  }

  if (rijen.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <FileText className="h-4 w-4 text-slate-300" aria-hidden="true" />
          <span>
            Nog geen rapport bewaard. Het rapport dat je op de laatste slide genereert komt hier
            te staan, samen met het transcript waarmee het gemaakt is.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-900">
          Gegenereerde rapporten ({rijen.length})
        </h2>
      </div>

      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {rijen.map((rij) => (
          <li key={rij.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{rij.bestandsnaam}</p>
              <p className="text-xs text-slate-500">
                {datumTijd(rij.gegenereerd_op)}
                {rij.bytes ? ` · ${grootte(rij.bytes)}` : ''}
                {BRON_LABEL[rij.bron] ? ` · ${BRON_LABEL[rij.bron]}` : ''}
              </p>
              {rij.gemaild_op ? (
                <p className="text-xs text-emerald-700">
                  Gemaild op {datumTijd(rij.gemaild_op)}
                  {rij.gemaild_naar ? ` naar ${rij.gemaild_naar}` : ''}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setMailVoor(rij)}
              title="Het bewaarde rapport naar de klant mailen"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Mail className="h-3.5 w-3.5" />
              Mailen
            </button>

            <button
              type="button"
              onClick={() => void haal(rij.id + '-pdf', rij.storage_path, rij.bestandsnaam)}
              disabled={bezig === rij.id + '-pdf'}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {bezig === rij.id + '-pdf'
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Download className="h-3.5 w-3.5" />}
              Rapport
            </button>

            {rij.transcript_path ? (
              <button
                type="button"
                onClick={() => void haal(
                  rij.id + '-txt',
                  rij.transcript_path!,
                  rij.transcript_bestandsnaam || 'transcript.txt',
                )}
                disabled={bezig === rij.id + '-txt'}
                title="Het transcript en de notities waarmee dit rapport gemaakt is"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {bezig === rij.id + '-txt'
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <ScrollText className="h-3.5 w-3.5" />}
                Transcript
              </button>
            ) : (
              <span className="text-xs text-slate-400" title="Bij dit rapport is geen transcript bewaard">
                geen transcript
              </span>
            )}

            <button
              type="button"
              onClick={() => void wis(rij)}
              disabled={bezig === rij.id}
              aria-label={`${rij.bestandsnaam} verwijderen`}
              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      {mailVoor && (
        <RapportMailDialog
          open
          onClose={() => setMailVoor(null)}
          leadId={leadId}
          rapport={mailVoor}
          onVerstuurd={(adres, variant) => setRijen((v) => v.map((r) => (
            r.id === mailVoor.id
              ? { ...r, gemaild_op: new Date().toISOString(), gemaild_naar: adres, mail_variant: variant }
              : r
          )))}
        />
      )}
    </section>
  );
}
