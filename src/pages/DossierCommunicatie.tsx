import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchCommunicatie,
  fetchCommunicatieViaEmail,
  formatDatumTijd,
  formatDuur,
  type CommunicatieData,
  type LoketContact,
} from '@/lib/mailcrm';
import MailLezenSheet from '@/components/communicatie/MailLezenSheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowDownLeft, ArrowUpRight, Phone, Search, Gavel, Mail, RefreshCw, Info,
} from 'lucide-react';

interface Props {
  leadId: string;
}

type LeadInfo = {
  id: string;
  voornaam: string | null;
  achternaam: string | null;
  email: string | null;
  bouwflow_project_number: string | null;
};

/** Eén rij in de tijdlijn: mail of Leexi-call, chronologisch samengevoegd. */
type TijdlijnItem =
  | { soort: 'mail'; id: string; datum: string | null; data: CommunicatieData['mails'][number] }
  | { soort: 'call'; id: string; datum: string | null; data: CommunicatieData['calls'][number] };

function rolBadge(rol: string | null | undefined) {
  if (rol === 'klant') return <Badge variant="outline" className="border-primary/40 text-primary text-[10px] px-1.5 py-0">klant</Badge>;
  if (rol === 'leverancier') return <Badge variant="outline" className="border-amber-500/50 text-amber-600 text-[10px] px-1.5 py-0">leverancier</Badge>;
  return null;
}

/**
 * Communicatiepagina van een dossier (SPRINTPLAN-COMMUNICATIE, Sprint 1): alle mails en
 * telefoongesprekken die in Mail-CRM aan dit ZL-dossier hangen, live uit de bron gelezen
 * via het compass-loket. Met beslissingenregister, zoekveld en mail-lezen-zijpaneel.
 * Dossiers zonder ZL-nummer vallen terug op matching via het e-mailadres van de klant.
 */
export default function DossierCommunicatie({ leadId }: Props) {
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [data, setData] = useState<CommunicatieData | null>(null);
  const [bron, setBron] = useState<'zl' | 'email' | 'geen'>('geen');
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [zoek, setZoek] = useState('');
  const [leesMailId, setLeesMailId] = useState<string | null>(null);
  const [herlaadTeller, setHerlaadTeller] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLaden(true);
      setFout(null);
      try {
        const { data: rij, error } = await supabase
          .from('leads')
          .select('id, voornaam, achternaam, email, bouwflow_project_number')
          .eq('id', leadId)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!rij) throw new Error('Dossier niet gevonden.');
        if (cancelled) return;
        setLead(rij as LeadInfo);

        if (rij.bouwflow_project_number) {
          const resultaat = await fetchCommunicatie(rij.bouwflow_project_number);
          if (cancelled) return;
          setData(resultaat);
          setBron('zl');
        } else if (rij.email) {
          const resultaat = await fetchCommunicatieViaEmail(rij.email);
          if (cancelled) return;
          setData(resultaat);
          setBron('email');
        } else {
          setData(null);
          setBron('geen');
        }
      } catch (e) {
        if (!cancelled) setFout((e as Error).message);
      } finally {
        if (!cancelled) setLaden(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [leadId, herlaadTeller]);

  const contacten: Record<string, LoketContact> = data?.contacten ?? {};

  const tijdlijn: TijdlijnItem[] = useMemo(() => {
    if (!data) return [];
    const items: TijdlijnItem[] = [
      ...data.mails.map((m) => ({ soort: 'mail' as const, id: m.id, datum: m.datum, data: m })),
      ...data.calls.map((c) => ({ soort: 'call' as const, id: c.id, datum: c.datum, data: c })),
    ];
    return items.sort((a, b) => String(b.datum ?? '').localeCompare(String(a.datum ?? '')));
  }, [data]);

  const gefilterd = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    if (!term) return tijdlijn;
    return tijdlijn.filter((item) => {
      if (item.soort === 'mail') {
        const m = item.data;
        const contactNaam = m.van_contact_id ? contacten[m.van_contact_id]?.naam ?? '' : '';
        return [m.onderwerp, m.samenvatting, m.beslissing, contactNaam]
          .some((v) => (v ?? '').toLowerCase().includes(term));
      }
      const c = item.data;
      return [c.titel, c.samenvatting, c.beslissing].some((v) => (v ?? '').toLowerCase().includes(term));
    });
  }, [tijdlijn, zoek, contacten]);

  const beslissingen = useMemo(
    () => tijdlijn.filter((item) => item.data.bevat_beslissing && item.data.beslissing),
    [tijdlijn],
  );

  const scrollNaar = (item: TijdlijnItem) => {
    document.getElementById(`comm-${item.soort}-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const naam = lead ? `${lead.voornaam ?? ''} ${lead.achternaam ?? ''}`.trim() : '';

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-4xl px-4 py-5 space-y-4">

        {/* Kop: waar komt deze data vandaan? */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-headline font-bold text-xl text-foreground">Communicatie</h1>
            {bron === 'zl' && data?.project && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Dossier <span className="font-semibold">#{data.project.extern_dossier_id}</span>
                {' · '}Bouwflow-fase: {data.project.status ?? 'onbekend'}
                {' · '}live uit Mail-CRM
              </p>
            )}
            {bron === 'email' && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Dossier zonder ZL-nummer — gevonden via e-mailadres {lead?.email}
              </p>
            )}
          </div>
          <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={() => setHerlaadTeller((t) => t + 1)}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="text-xs">Vernieuwen</span>
          </Button>
        </div>

        {/* Laad-, fout- en lege takken bewust apart (les uit de Mail Hub-review). */}
        {laden && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {!laden && fout && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Communicatie kon niet geladen worden: {fout}
          </div>
        )}

        {!laden && !fout && bron === 'geen' && (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Dit dossier heeft nog geen ZL-nummer en geen e-mailadres — er valt nog niets te koppelen.
          </div>
        )}

        {!laden && !fout && data && !data.gevonden && (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            {bron === 'zl'
              ? `Dossier ${lead?.bouwflow_project_number} is (nog) niet bekend in Mail-CRM. De dossiersync draait elk kwartier — probeer zo opnieuw.`
              : `Geen mailcontact gevonden voor ${lead?.email}.`}
          </div>
        )}

        {!laden && !fout && data?.gevonden && (
          <>
            {/* Beslissingenregister */}
            <section className="rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                <Gavel className="h-4 w-4 text-primary" />
                <h2 className="font-headline font-semibold text-sm">Beslissingen</h2>
                <span className="text-xs text-muted-foreground">({beslissingen.length})</span>
              </div>
              {beslissingen.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Nog geen vastgelegde beslissingen in mails of gesprekken van dit dossier.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {beslissingen.map((item) => (
                    <li key={`besl-${item.soort}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => scrollNaar(item)}
                        className="w-full text-left px-4 py-2 hover:bg-muted/40 transition-colors"
                      >
                        <p className="text-sm text-foreground leading-snug">{item.data.beslissing}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.soort === 'mail' ? '📧 mail' : '📞 gesprek'} · {formatDatumTijd(item.datum)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Zoeken */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder="Zoek in onderwerp, samenvatting, beslissing of afzender…"
                className="pl-9"
              />
            </div>

            {/* Tijdlijn */}
            {gefilterd.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                {tijdlijn.length === 0
                  ? 'Nog geen mails of gesprekken gekoppeld aan dit dossier.'
                  : 'Niets gevonden voor deze zoekterm.'}
              </div>
            ) : (
              <ul className="space-y-2">
                {gefilterd.map((item) => (
                  <li key={`${item.soort}-${item.id}`} id={`comm-${item.soort}-${item.id}`}>
                    {item.soort === 'mail' ? (
                      <MailRij
                        mail={item.data}
                        contacten={contacten}
                        ccIds={data.cc?.[item.id] ?? []}
                        onLees={() => setLeesMailId(item.id)}
                      />
                    ) : (
                      <CallRij call={item.data} deelnemerIds={data.deelnemers?.[item.id] ?? []} contacten={contacten} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <MailLezenSheet emailId={leesMailId} onClose={() => setLeesMailId(null)} />
    </div>
  );
}

function MailRij({
  mail, contacten, ccIds, onLees,
}: {
  mail: CommunicatieData['mails'][number];
  contacten: Record<string, LoketContact>;
  ccIds: string[];
  onLees: () => void;
}) {
  const contact = mail.van_contact_id ? contacten[mail.van_contact_id] : undefined;
  const ccNamen = ccIds
    .map((id) => contacten[id]?.naam || contacten[id]?.email)
    .filter(Boolean);
  const inkomend = mail.richting === 'in';

  return (
    <button
      type="button"
      onClick={onLees}
      className="w-full text-left rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-center gap-2 flex-wrap">
        {inkomend
          ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          : <ArrowUpRight className="h-3.5 w-3.5 text-primary shrink-0" />}
        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">{formatDatumTijd(mail.datum)}</span>
        {contact && (
          <span className="text-xs font-medium text-foreground">
            {inkomend ? 'van' : 'aan'} {contact.naam || contact.email}
          </span>
        )}
        {rolBadge(contact?.rol)}
        <span className="text-[10px] text-muted-foreground ml-auto">{mail.mailbox}</span>
      </div>
      <p className="font-headline font-semibold text-sm text-foreground mt-1 leading-snug">
        {mail.onderwerp || '(geen onderwerp)'}
      </p>
      {mail.samenvatting && (
        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{mail.samenvatting}</p>
      )}
      {mail.bevat_beslissing && mail.beslissing && (
        <p className="mt-1.5 inline-flex items-start gap-1.5 rounded bg-red-50 dark:bg-red-950/30 px-2 py-1 text-xs text-red-700 dark:text-red-400">
          <Gavel className="h-3 w-3 mt-0.5 shrink-0" /> {mail.beslissing}
        </p>
      )}
      {ccNamen.length > 0 && (
        <p className="text-[11px] text-muted-foreground mt-1">Cc: {ccNamen.join(', ')}</p>
      )}
    </button>
  );
}

function CallRij({
  call, deelnemerIds, contacten,
}: {
  call: CommunicatieData['calls'][number];
  deelnemerIds: string[];
  contacten: Record<string, LoketContact>;
}) {
  const deelnemers = deelnemerIds
    .map((id) => contacten[id]?.naam || contacten[id]?.email)
    .filter(Boolean);

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground">{formatDatumTijd(call.datum)}</span>
        {call.duur_seconden ? (
          <span className="text-[11px] text-muted-foreground">· {formatDuur(call.duur_seconden)}</span>
        ) : null}
        {deelnemers.length > 0 && (
          <span className="text-xs font-medium text-foreground">met {deelnemers.join(', ')}</span>
        )}
      </div>
      <p className="font-headline font-semibold text-sm text-foreground mt-1 leading-snug">
        {call.titel || 'Telefoongesprek'}
      </p>
      {call.samenvatting && (
        <p className="text-sm text-muted-foreground mt-0.5 leading-snug whitespace-pre-line">
          {call.samenvatting.length > 400 ? `${call.samenvatting.slice(0, 400)}…` : call.samenvatting}
        </p>
      )}
      {call.bevat_beslissing && call.beslissing && (
        <p className="mt-1.5 inline-flex items-start gap-1.5 rounded bg-red-50 dark:bg-red-950/30 px-2 py-1 text-xs text-red-700 dark:text-red-400">
          <Gavel className="h-3 w-3 mt-0.5 shrink-0" /> {call.beslissing}
        </p>
      )}
    </div>
  );
}
