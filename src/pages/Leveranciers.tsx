import { useEffect, useMemo, useState } from 'react';
import {
  fetchLeveranciers, fetchLeverancierMails, formatDatumTijd,
  type Leverancier, type CommunicatieData, type LoketContact,
} from '@/lib/mailcrm';
import MailLezenSheet from '@/components/communicatie/MailLezenSheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Truck, Search, Gavel, ArrowLeft, ArrowDownLeft, ArrowUpRight, Mail, RefreshCw, FolderOpen,
} from 'lucide-react';

type Detail = CommunicatieData & { bedrijf: { naam: string | null } | null; projecten: Record<string, string> };

/**
 * Leveranciersoverzicht (IDEE-7) — dossier-overstijgend: alle communicatie per leverancier,
 * over alle werven heen. Bestaat omdat het grootste deel van de leverancierscommunicatie aan
 * géén enkel dossier hangt (gemeten 2026-08-26: Liantis 96 mails, Verhelst 65, beide zonder
 * dossier). Binnen één dossier zie je die leverancier via de Communicatiepagina.
 */
export default function Leveranciers() {
  const [lijst, setLijst] = useState<Leverancier[]>([]);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [zoek, setZoek] = useState('');
  const [herlaad, setHerlaad] = useState(0);

  const [gekozen, setGekozen] = useState<Leverancier | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLaden, setDetailLaden] = useState(false);
  const [detailFout, setDetailFout] = useState<string | null>(null);
  const [leesMailId, setLeesMailId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLaden(true);
    setFout(null);
    fetchLeveranciers()
      .then((data) => { if (!cancelled) setLijst(data); })
      .catch((e: Error) => { if (!cancelled) setFout(e.message); })
      .finally(() => { if (!cancelled) setLaden(false); });
    return () => { cancelled = true; };
  }, [herlaad]);

  useEffect(() => {
    const ids = gekozen?.bedrijf_ids?.length ? gekozen.bedrijf_ids : gekozen?.bedrijf_id ? [gekozen.bedrijf_id] : [];
    if (ids.length === 0) { setDetail(null); return; }
    let cancelled = false;
    setDetailLaden(true);
    setDetailFout(null);
    setDetail(null);
    fetchLeverancierMails(ids)
      .then((d) => { if (!cancelled) setDetail(d as Detail); })
      .catch((e: Error) => { if (!cancelled) setDetailFout(e.message); })
      .finally(() => { if (!cancelled) setDetailLaden(false); });
    return () => { cancelled = true; };
  }, [gekozen]);

  const gefilterd = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    if (!term) return lijst;
    return lijst.filter(
      (l) =>
        l.naam.toLowerCase().includes(term) ||
        l.contacten.some((c) => c.toLowerCase().includes(term)) ||
        l.dossiers.some((d) => d.toLowerCase().includes(term)),
    );
  }, [lijst, zoek]);

  const totaalMails = useMemo(() => lijst.reduce((s, l) => s + l.mails, 0), [lijst]);

  if (gekozen) {
    return (
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-4xl px-4 py-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <Button size="sm" variant="ghost" className="gap-1.5 h-7 -ml-2 mb-1" onClick={() => setGekozen(null)}>
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="text-xs">Alle leveranciers</span>
              </Button>
              <h1 className="font-headline font-bold text-xl text-foreground flex items-center gap-2">
                <Truck className="h-5 w-5 text-amber-600" />
                {gekozen.naam}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {gekozen.mails} mail{gekozen.mails === 1 ? '' : 's'}
                {gekozen.beslissingen > 0 ? ` · ${gekozen.beslissingen} beslissing${gekozen.beslissingen === 1 ? '' : 'en'}` : ''}
                {gekozen.contacten.length > 0 ? ` · ${gekozen.contacten.join(', ')}` : ''}
              </p>
              {gekozen.dossiers.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                  <FolderOpen className="h-3 w-3" />
                  {gekozen.dossiers.map((d) => (
                    <Badge key={d} variant="outline" className="text-[10px] px-1.5 py-0">{d}</Badge>
                  ))}
                </p>
              )}
            </div>
          </div>

          {detailLaden && <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>}
          {!detailLaden && detailFout && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Mail kon niet geladen worden: {detailFout}
            </div>
          )}
          {!detailLaden && !detailFout && detail && (
            detail.mails.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                Geen mail gevonden voor deze leverancier.
              </div>
            ) : (
              <ul className="space-y-2">
                {detail.mails.map((m) => {
                  const contact = m.van_contact_id ? detail.contacten?.[m.van_contact_id] : undefined;
                  const inkomend = m.richting === 'in';
                  const projectId = (m as unknown as { project_id?: string }).project_id;
                  const dossier = projectId ? detail.projecten?.[projectId] : null;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setLeesMailId(m.id)}
                        className="w-full text-left rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {inkomend
                            ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            : <ArrowUpRight className="h-3.5 w-3.5 text-primary shrink-0" />}
                          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground">{formatDatumTijd(m.datum)}</span>
                          {contact && (
                            <span className="text-xs font-medium text-foreground">
                              {inkomend ? 'van' : 'aan'} {contact.naam || contact.email}
                            </span>
                          )}
                          {dossier && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{dossier}</Badge>}
                          <span className="text-[10px] text-muted-foreground ml-auto">{m.mailbox}</span>
                        </div>
                        <p className="font-headline font-semibold text-sm text-foreground mt-1 leading-snug">
                          {m.onderwerp || '(geen onderwerp)'}
                        </p>
                        {m.samenvatting && (
                          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{m.samenvatting}</p>
                        )}
                        {m.bevat_beslissing && m.beslissing && (
                          <p className="mt-1.5 inline-flex items-start gap-1.5 rounded bg-red-50 dark:bg-red-950/30 px-2 py-1 text-xs text-red-700 dark:text-red-400">
                            <Gavel className="h-3 w-3 mt-0.5 shrink-0" /> {m.beslissing}
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          )}
        </div>
        <MailLezenSheet emailId={leesMailId} onClose={() => setLeesMailId(null)} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-4xl px-4 py-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-headline font-bold text-xl text-foreground">Leveranciers</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Alle communicatie per leverancier, over alle dossiers heen · live uit Mail-CRM
              {lijst.length > 0 ? ` · ${lijst.length} leveranciers, ${totaalMails} mails` : ''}
            </p>
          </div>
          <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={() => setHerlaad((t) => t + 1)}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="text-xs">Vernieuwen</span>
          </Button>
        </div>

        {laden && <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>}

        {!laden && fout && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Leveranciers konden niet geladen worden: {fout}
          </div>
        )}

        {!laden && !fout && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder="Zoek op leverancier, contactpersoon of dossiernummer…"
                className="pl-9"
              />
            </div>

            {gefilterd.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                {lijst.length === 0 ? 'Nog geen leverancierscommunicatie in Mail-CRM.' : 'Niets gevonden voor deze zoekterm.'}
              </div>
            ) : (
              <ul className="space-y-2">
                {gefilterd.map((l) => (
                  <li key={l.bedrijf_id ?? l.naam}>
                    <button
                      type="button"
                      disabled={!l.bedrijf_id}
                      onClick={() => setGekozen(l)}
                      className="w-full text-left rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors disabled:opacity-60 disabled:hover:border-border"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Truck className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="font-headline font-semibold text-sm text-foreground">{l.naam}</span>
                        <span className="text-xs text-muted-foreground">
                          {l.mails} mail{l.mails === 1 ? '' : 's'}
                        </span>
                        {l.beslissingen > 0 && (
                          <Badge variant="outline" className="border-red-400/50 text-red-600 text-[10px] px-1.5 py-0">
                            {l.beslissingen} beslissing{l.beslissingen === 1 ? '' : 'en'}
                          </Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          laatst: {formatDatumTijd(l.laatste)}
                        </span>
                      </div>
                      {l.contacten.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">{l.contacten.join(', ')}</p>
                      )}
                      {l.dossiers.length > 0 && (
                        <p className="mt-1.5 flex items-center gap-1 flex-wrap">
                          {l.dossiers.slice(0, 8).map((d) => (
                            <Badge key={d} variant="outline" className="text-[10px] px-1.5 py-0">{d}</Badge>
                          ))}
                          {l.dossiers.length > 8 && (
                            <span className="text-[10px] text-muted-foreground">+{l.dossiers.length - 8}</span>
                          )}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
