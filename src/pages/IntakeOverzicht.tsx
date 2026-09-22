import { useEffect, useState } from 'react';
import {
  Bot, ArrowRight, Calendar, Euro, FileText, ListChecks, Wrench, Ruler, PlayCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { useAppNav } from '@/contexts/AppNavContext';
import { euro } from '@/lib/pipeline';

/**
 * Terugkijken op het intakegesprek van dit dossier.
 *
 * WAAROM DIT BESTAAT. De knop "Intakegesprek" startte er altijd een: hij ging
 * rechtstreeks naar de briefing en daarna de slideshow. Wie wou zien wát er
 * besproken was op een dossier waar de intake al gebeurd was, kwam nergens uit
 * — de dossierpagina heeft kaarten voor klant, volgende stap, waarde, foto's en
 * communicatie, maar geen enkele voor de intake zelf. Bram: "ik vind de
 * intakegesprekken niet meer terug bij dossiers waar dat al gebeurd is".
 *
 * Gemeten op dat moment: 29 van de 114 dossiers hadden rapportinhoud, 28 hadden
 * feitjes en 33 een calculatie. Dat stond er dus wel degelijk, maar was
 * onbereikbaar geworden.
 *
 * De knop komt nu altijd hier uit: bij een afgerond gesprek zie je wat er
 * besproken is, bij een leeg dossier zie je dat het nog moet gebeuren. Eén
 * knop, één bestemming, en van hieruit start of hervat je het gesprek.
 *
 * Bewust GEEN pre_intake-rij aanmaken bij het bekijken. Dat deed de oude
 * doorverwijzing wel, waardoor er lege gespreksformulieren ontstonden louter
 * omdat iemand ging kijken.
 */

interface Props {
  leadId: string;
}

const datumTijd = (iso: string) =>
  new Date(iso).toLocaleString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const TECHNISCH_LABELS: Record<string, string> = {
  trap: 'Vaste trap',
  dakraam: 'Dakraam(en)',
  airco: 'Airco',
  draagmuur: 'Mogelijke draagmuur',
  badkamer: 'Badkamer',
  maatwerk_kasten: 'Maatwerk kasten',
  elektriciteit_uitgebreid: 'Uitgebreide elektriciteit',
  dakconstructie_twijfelachtig: 'Dakconstructie twijfelachtig',
};

function Kaart({ titel, icon: Icon, children }: {
  titel: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-900">{titel}</h2>
      </div>
      {children}
    </section>
  );
}

/** Een rapportblok toont alleen als er tekst in staat. */
function Blok({ titel, tekst }: { titel: string; tekst?: string | null }) {
  if (!tekst || !tekst.trim()) return null;
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{titel}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{tekst}</p>
    </div>
  );
}

export default function IntakeOverzicht({ leadId }: Props) {
  const nav = useAppNav();
  const [lead, setLead] = useState<any | null>(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    let weg = false;
    setLaden(true);
    void (async () => {
      const { data } = await supabase.from('leads').select('*').eq('id', leadId).maybeSingle();
      if (weg) return;
      setLead(data ?? null);
      setLaden(false);
    })();
    return () => { weg = true; };
  }, [leadId]);

  const naam = `${lead?.voornaam ?? ''} ${lead?.achternaam ?? ''}`.trim() || 'Naamloos dossier';

  if (laden || !lead) {
    return (
      <AppShell titel="Intakegesprek" dossierId={leadId} actieveTab="intake">
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <p className="font-body text-muted-foreground">Laden…</p>
        </div>
      </AppShell>
    );
  }

  const feitjes: any[] = Array.isArray(lead.project_feiten) ? lead.project_feiten : [];
  const posten: any[] = Array.isArray(lead.inbegrepen_posten) ? lead.inbegrepen_posten : [];
  const technisch = (lead.technisch ?? {}) as Record<string, unknown>;
  const aangevinkt = Object.entries(TECHNISCH_LABELS).filter(([k]) => technisch[k] === true);

  const rapportTekst: string = lead.rapport_tekst ?? '';
  const heeftAiBlokken = !!(
    lead.rapport_situatie_ai?.trim() || lead.rapport_besproken_ai?.trim() ||
    lead.rapport_verwachtingen_ai?.trim() || lead.rapport_aandachtspunten_ai?.trim()
  );
  const heeftBudget = !!(lead.budget_min || lead.budget_max || lead.budget_incl6);

  // "Er is al een gesprek geweest" is breder dan alleen een gegenereerd rapport:
  // feitjes en een calculatie zijn er ook uit voortgekomen. Op de oude toets
  // (enkel rapport_gegenereerd_op) golden 12 dossiers met échte rapportinhoud
  // ten onrechte als "nog geen intake".
  const heeftInhoud = heeftAiBlokken || !!rapportTekst.trim() || feitjes.length > 0
    || heeftBudget || !!lead.calculator_state || aangevinkt.length > 0;

  const primair = {
    label: heeftInhoud ? 'Intakegesprek hervatten' : 'Intakegesprek starten',
    onClick: () => nav?.onStartVideocall(leadId),
    icon: heeftInhoud ? <PlayCircle className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />,
    iconPosition: heeftInhoud ? ('left' as const) : ('right' as const),
  };

  return (
    <AppShell titel="Intakegesprek" subtitel={naam} dossierId={leadId} actieveTab="intake" primair={primair}>
      <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-4">

          {!heeftInhoud && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
              <Bot className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="font-medium text-slate-900">Nog geen intakegesprek gevoerd</p>
              <p className="mt-1 text-sm text-slate-500">
                Zodra je er één voert, vind je hier terug wat er besproken is.
              </p>
              <Button className="mt-4 gap-2" onClick={() => nav?.onStartVideocall(leadId)}>
                <ArrowRight className="h-4 w-4" /> Intakegesprek starten
              </Button>
            </div>
          )}

          {heeftInhoud && (
            <>
              <Kaart titel="Wanneer" icon={Calendar}>
                <p className="text-sm text-slate-800">
                  {lead.rapport_gegenereerd_op
                    ? <>Rapport opgemaakt op <span className="font-medium">{datumTijd(lead.rapport_gegenereerd_op)}</span></>
                    : <span className="text-slate-500">Er is inhoud vastgelegd, maar nog geen rapport gegenereerd.</span>}
                </p>
              </Kaart>

              {(heeftAiBlokken || rapportTekst.trim()) && (
                <Kaart titel="Wat er besproken is" icon={FileText}>
                  {heeftAiBlokken ? (
                    <>
                      <Blok titel="Situatie" tekst={lead.rapport_situatie_ai} />
                      <Blok titel="Besproken" tekst={lead.rapport_besproken_ai} />
                      <Blok titel="Verwachtingen" tekst={lead.rapport_verwachtingen_ai} />
                      <Blok titel="Aandachtspunten" tekst={lead.rapport_aandachtspunten_ai} />
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{rapportTekst}</p>
                  )}
                </Kaart>
              )}

              {feitjes.length > 0 && (
                <Kaart titel={`Vaststellingen (${feitjes.length})`} icon={ListChecks}>
                  <ul className="space-y-2">
                    {feitjes.map((f, i) => (
                      <li key={f?.id ?? i} className="flex items-start gap-2 text-sm text-slate-800">
                        {f?.label_nummer != null && (
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center bg-primary text-xs font-bold text-white">
                            {f.label_nummer}
                          </span>
                        )}
                        <span className="break-words">{f?.tekst ?? ''}</span>
                      </li>
                    ))}
                  </ul>
                </Kaart>
              )}

              {aangevinkt.length > 0 && (
                <Kaart titel="Technische vaststellingen" icon={Wrench}>
                  <div className="flex flex-wrap gap-2">
                    {aangevinkt.map(([k, label]) => (
                      <span key={k} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {label}
                      </span>
                    ))}
                  </div>
                </Kaart>
              )}

              {(lead.oppervlakte_m2 || lead.project_type) && (
                <Kaart titel="Project" icon={Ruler}>
                  {lead.oppervlakte_m2 ? <p className="text-sm text-slate-800">Oppervlakte: <span className="font-medium">{lead.oppervlakte_m2} m²</span></p> : null}
                  {lead.project_type ? <p className="text-sm text-slate-800">Type: <span className="font-medium">{lead.project_type}</span></p> : null}
                </Kaart>
              )}

              {heeftBudget && (
                <Kaart titel="Prijsindicatie uit dit gesprek" icon={Euro}>
                  <p className="text-lg font-semibold text-slate-900">
                    {euro(lead.budget_min ?? 0)} — {euro(lead.budget_max ?? 0)}
                    <span className="ml-2 text-xs font-normal text-slate-500">excl. btw</span>
                  </p>
                  {lead.budget_incl6 ? (
                    <p className="text-sm text-slate-600">{euro(lead.budget_incl6)} incl. 6% btw</p>
                  ) : null}
                  {/* Vorm geverifieerd op echte dossiers: { post, bedrag, categorie }.
                      Niet 'naam' of 'label' — dat gaf lege blokjes. */}
                  {posten.length > 0 && (
                    <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                      {posten.map((p: any, i: number) => {
                        const label = typeof p === 'string' ? p : (p?.post ?? '');
                        if (!label) return null;
                        const bedrag = typeof p === 'object' && typeof p?.bedrag === 'number' ? p.bedrag : null;
                        return (
                          <li key={i} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                            <span className="text-slate-700">{label}</span>
                            {bedrag !== null && (
                              <span className="shrink-0 tabular-nums font-medium text-slate-900">{euro(bedrag)}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Kaart>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
