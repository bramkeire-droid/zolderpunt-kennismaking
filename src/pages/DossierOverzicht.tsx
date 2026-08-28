import { useEffect, useMemo, useState } from 'react';
import {
  User, MapPin, Phone, Mail, Calendar, ArrowRight, Globe, Image as ImageIcon,
  MessagesSquare, Euro, Bot, ExternalLink, FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { useAppNav } from '@/contexts/AppNavContext';
import { useSignedLeadFotos } from '@/hooks/useSignedLeadFotos';
import MediaThumb from '@/components/MediaThumb';
import KlantDossiers from '@/components/dossier/KlantDossiers';
import CalculatieHistoriek from '@/components/dossier/CalculatieHistoriek';
import AangeleverdDoorKlant from '@/components/dossier/AangeleverdDoorKlant';
import { bepaalVolgendeActie, dossierWaarde, euro, URGENTIE_STIJL } from '@/lib/pipeline';

interface Props {
  leadId: string;
  /** Een ander dossier van dezelfde klant openen. */
  onOpenDossier?: (leadId: string) => void;
}

const BOX_LABELS: { key: 'wat' | 'aannemer' | 'waarom' | 'budget'; titel: string }[] = [
  { key: 'wat', titel: 'Wat?' },
  { key: 'aannemer', titel: 'Welke aannemer?' },
  { key: 'waarom', titel: 'Waarom nu?' },
  { key: 'budget', titel: 'Welk budget?' },
];

const datumTijd = (iso: string) =>
  new Date(iso).toLocaleString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Eén kader. Bewust rustig: deze pagina vat samen en verwijst door. */
function Kaart({ titel, icon: Icon, actie, children }: {
  titel: string; icon: any; actie?: { label: string; onClick: () => void }; children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-900">{titel}</h2>
        {actie && (
          <button
            onClick={actie.onClick}
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {actie.label}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

const Regel = ({ icon: Icon, label, waarde }: { icon: any; label: string; waarde?: string | null }) =>
  waarde ? (
    <div className="flex items-start gap-2 py-1 text-sm">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 break-words font-medium text-slate-900">{waarde}</span>
    </div>
  ) : null;

/**
 * De hoofdpagina van een dossier: alles van dit dossier in één blik, met per
 * blok één doorverwijzing naar het tabblad waar je verder werkt. Zonder deze
 * pagina landde je bij het openen van een dossier op de briefing van het
 * intakegesprek — één werkmoment, geen overzicht.
 */
export default function DossierOverzicht({ leadId, onOpenDossier }: Props) {
  const nav = useAppNav();
  const [lead, setLead] = useState<any | null>(null);
  const [preIntake, setPreIntake] = useState<any | null>(null);
  const [analyse, setAnalyse] = useState<any | null>(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    let weg = false;
    setLaden(true);
    void (async () => {
      const [{ data: l }, { data: pi }, { data: ta }] = await Promise.all([
        supabase.from('leads').select('*').eq('id', leadId).maybeSingle(),
        supabase.from('pre_intake' as any).select('*').eq('lead_id', leadId).maybeSingle(),
        supabase.from('transcript_analyses' as any).select('*').eq('lead_id', leadId)
          .order('analyzed_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (weg) return;
      setLead(l ?? null);
      setPreIntake(pi ?? null);
      setAnalyse(ta ?? null);
      setLaden(false);
    })();
    return () => { weg = true; };
  }, [leadId]);

  const media = useSignedLeadFotos(lead?.fotos);

  const naam = `${lead?.voornaam ?? ''} ${lead?.achternaam ?? ''}`.trim() || 'Naamloos dossier';

  const actie = useMemo(
    () => (lead ? bepaalVolgendeActie(lead, preIntake) : null),
    [lead, preIntake],
  );

  if (laden || !lead) {
    return (
      <AppShell titel="Dossier" dossierId={leadId} actieveTab="dossier">
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <p className="font-body text-muted-foreground">Dossier laden…</p>
        </div>
      </AppShell>
    );
  }

  const heeftTelefoongesprek = !!preIntake;
  const heeftIntake = !!analyse || !!lead.rapport_gegenereerd_op;

  // Eén primaire actie, afhankelijk van hoe ver het dossier staat.
  const primair = !heeftTelefoongesprek
    ? { label: 'Telefoongesprek starten', onClick: () => nav?.onOpenCall(leadId), icon: <Phone className="h-4 w-4" /> }
    : !heeftIntake
      ? { label: 'Start intakegesprek', onClick: () => nav?.onStartVideocall(leadId), icon: <ArrowRight className="h-4 w-4" />, iconPosition: 'right' as const }
      : { label: 'Communicatie', onClick: () => nav?.onOpenCommunicatie(leadId), icon: <MessagesSquare className="h-4 w-4" /> };

  const waarde = dossierWaarde(lead);
  const boxNotes = (preIntake?.box_notes ?? {}) as Record<string, string[]>;
  const heeftBoxNotes = BOX_LABELS.some(b => (boxNotes[b.key] ?? []).length > 0);
  const vragenKlant: [string, any][] = preIntake?.questions_raised
    ? Object.entries(preIntake.questions_raised as Record<string, any>).filter(([, v]) => v?.raised)
    : [];

  const afspraken = [
    preIntake?.videocall_scheduled_at && { label: 'Videocall', wanneer: preIntake.videocall_scheduled_at, link: preIntake.videocall_link },
    preIntake?.plaatsbezoek_scheduled_at && { label: 'Plaatsbezoek', wanneer: preIntake.plaatsbezoek_scheduled_at, link: null },
  ].filter(Boolean) as { label: string; wanneer: string; link: string | null }[];

  return (
    <AppShell titel="Dossier" subtitel={naam} dossierId={leadId} actieveTab="dossier" primair={primair}>
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-6">
          {/* Kop */}
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Dossier</p>
              <h1 className="font-headline text-3xl font-bold text-slate-900">{naam}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {lead.adres || 'geen adres'}
                {lead.bouwflow_project_number ? ` · #${lead.bouwflow_project_number}` : ''}
                {lead.created_at ? ` · aangemaakt ${new Date(lead.created_at).toLocaleDateString('nl-BE')}` : ''}
              </p>
            </div>
            {actie && (
              <span className={`rounded border px-2 py-1 text-xs font-medium ${URGENTIE_STIJL[actie.niveau]}`}>
                {actie.label}{actie.datum ? ` · ${actie.datum}` : ''}
              </span>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Klant & werf */}
            <Kaart titel="Klant & werf" icon={User}>
              <Regel icon={Phone} label="Telefoon" waarde={lead.telefoon} />
              <Regel icon={Mail} label="E-mail" waarde={lead.email} />
              <Regel icon={MapPin} label="Adres" waarde={lead.adres} />
              <Regel icon={User} label="Gevonden via" waarde={lead.gevonden_via} />
              <Regel icon={FileText} label="Zoekt" waarde={lead.gezocht_naar} />
              {(lead.website_omschrijving ?? '').trim() && (
                <div className="mt-3 rounded border border-primary/20 bg-primary/5 p-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary">Aanvraag via website</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{lead.website_omschrijving}</p>
                </div>
              )}
            </Kaart>

            {/* Volgende stap */}
            <Kaart titel="Volgende stap" icon={Calendar}>
              {afspraken.length === 0 && !(lead.volgende_stap ?? '').trim() && (
                <p className="text-sm text-slate-500">Niets gepland. Plan een videocall of plaatsbezoek in het telefoongesprek.</p>
              )}
              {afspraken.map(a => (
                <div key={a.label} className="mb-2 rounded border border-slate-200 p-2.5">
                  <p className="text-sm font-medium text-slate-900">{a.label}</p>
                  <p className="text-xs text-slate-500">{datumTijd(a.wanneer)}</p>
                  {a.link && (
                    <a href={a.link} target="_blank" rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      Afspraak openen <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
              {(lead.volgende_stap ?? '').trim() && (
                <p className="text-sm text-slate-700">{lead.volgende_stap}</p>
              )}
              <Button variant="outline" size="sm" className="mt-3 gap-1.5"
                onClick={() => nav?.onOpenCall(leadId)}>
                <Phone className="h-3.5 w-3.5 text-primary" /> Naar telefoongesprek
              </Button>
            </Kaart>

            {/* Waarde */}
            <Kaart titel="Waarde" icon={Euro}>
              {waarde != null ? (
                <p className="text-2xl font-semibold tabular-nums text-slate-900">{euro(waarde)}</p>
              ) : (
                <p className="text-sm text-slate-500">Nog geen richtprijs of offertebedrag.</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {lead.offerte_bedrag_excl != null ? 'Offertebedrag (excl. btw)' : 'Raming uit calculator (excl. btw)'}
                {lead.offerte_datum ? ` · ${new Date(lead.offerte_datum).toLocaleDateString('nl-BE')}` : ''}
              </p>
              {lead.portal_status && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  Portaal: <span className="font-medium text-slate-900">{lead.portal_status}</span>
                </p>
              )}
              {lead.bouwflow_phase && (
                <p className="mt-1 text-xs text-slate-600">Bouwflow-fase: <span className="font-medium text-slate-900">{lead.bouwflow_phase}</span></p>
              )}
            </Kaart>

            {/* Wat we weten */}
            {(heeftBoxNotes || vragenKlant.length > 0) && (
              <Kaart
                titel="Wat we weten"
                icon={Bot}
                actie={heeftTelefoongesprek ? { label: 'Briefing', onClick: () => nav?.onStartVideocall(leadId) } : undefined}
              >
                <div className="space-y-3">
                  {BOX_LABELS.map(b => {
                    const rijen = boxNotes[b.key] ?? [];
                    if (rijen.length === 0) return null;
                    return (
                      <div key={b.key}>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{b.titel}</p>
                        <ul className="mt-0.5 space-y-0.5">
                          {rijen.map((r, i) => (
                            <li key={i} className="border-l-2 border-primary/40 pl-2 text-sm text-slate-700">{r}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {vragenKlant.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vragen van de klant</p>
                      <ul className="mt-0.5 space-y-0.5">
                        {vragenKlant.map(([k, v]) => (
                          <li key={k} className="text-sm text-slate-700">{v?.note?.trim() || k}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Kaart>
            )}

            {/* Media */}
            {media.length > 0 && (
              <Kaart titel={`Foto's & video's (${media.length})`} icon={ImageIcon}>
                <div className="grid grid-cols-3 gap-1.5">
                  {media.slice(0, 6).map((m, i) => (
                    <MediaThumb key={i} item={m} className="h-20 w-full rounded" />
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">Open “Foto's” in de dossierbalk om te beheren.</p>
              </Kaart>
            )}

            {/* Communicatie-doorverwijzing */}
            <Kaart
              titel="Communicatie"
              icon={MessagesSquare}
              actie={{ label: 'Alles bekijken', onClick: () => nav?.onOpenCommunicatie(leadId) }}
            >
              <p className="text-sm text-slate-500">
                Mails, telefoongesprekken en beslissingen van dit dossier staan samen op de communicatiepagina.
              </p>
            </Kaart>

            <div className="lg:col-span-2">
              <AangeleverdDoorKlant leadId={leadId} compact />
            </div>
            <CalculatieHistoriek leadId={leadId} />
            <div className="lg:col-span-3">
              <KlantDossiers leadId={leadId} customerId={lead.customer_id} onOpenDossier={onOpenDossier} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
