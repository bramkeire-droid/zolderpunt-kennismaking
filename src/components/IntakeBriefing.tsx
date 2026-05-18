import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Phone, Bot, MapPin, User, Calendar, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { LeadData } from '@/contexts/SessionContext';

const QUESTION_LABELS: Record<string, string> = {
  budget: 'Budget',
  start_timing: 'Wanneer kunnen jullie starten?',
  duration: 'Hoe lang gaat het duren?',
  daily_impact: 'Impact op dagelijks leven',
  overlast: 'Overlast / stof / lawaai',
  feasibility_idea: 'Is mijn idee haalbaar?',
  attic_condition: 'Toestand van de zolder',
  company_approach: 'Hoe werken jullie?',
};

const IMPRESSION_LABELS: Record<string, string> = {
  gehaast: 'Gehaast',
  rustig: 'Rustig',
  sceptisch: 'Sceptisch',
  enthousiast: 'Enthousiast',
  overweldigd: 'Overweldigd',
};

interface Props {
  lead: LeadData;
  onStart: () => void;
  onBack: () => void;
}

export default function IntakeBriefing({ lead, onStart, onBack }: Props) {
  const [preIntake, setPreIntake] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!lead.id) { setLoading(false); return; }
      const [{ data: pi }, { data: ta }] = await Promise.all([
        supabase.from('pre_intake' as any).select('*').eq('lead_id', lead.id).maybeSingle(),
        supabase.from('transcript_analyses' as any).select('*').eq('lead_id', lead.id).order('analyzed_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      setPreIntake(pi);
      setAnalysis(ta);
      setLoading(false);
    })();
  }, [lead.id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-body">Briefing laden…</p>
      </div>
    );
  }

  const naam = `${lead.voornaam} ${lead.achternaam}`.trim() || 'Naamloos dossier';
  const heeftPreIntake = !!preIntake;
  const heeftAnalyse = !!analysis;

  const raisedQuestions = preIntake?.questions_raised
    ? Object.entries(preIntake.questions_raised as Record<string, { raised: boolean; note: string }>)
        .filter(([, v]) => v?.raised)
    : [];

  const qualBadge = (label: string, val: boolean | null) => {
    if (val === null || val === undefined) return null;
    const Icon = val ? CheckCircle2 : XCircle;
    return (
      <div className={`flex items-center gap-2 px-3 py-2 text-sm font-body ${val ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        <Icon className="h-4 w-4" />
        {label}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto p-8 lg:p-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={onBack} className="text-sm font-body text-muted-foreground hover:text-foreground flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Dossiers
          </button>
          <div className="flex gap-2">
            {heeftPreIntake && (
              <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold tracking-wider uppercase px-2 py-1 bg-primary/10 text-primary">
                <Phone className="h-3 w-3" /> Telefoongesprek
              </span>
            )}
            {heeftAnalyse && (
              <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold tracking-wider uppercase px-2 py-1 bg-purple-100 text-purple-700">
                <Bot className="h-3 w-3" /> AI-analyse
              </span>
            )}
          </div>
        </div>

        <div className="mb-1 text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground font-body">
          Briefing intakegesprek
        </div>
        <h1 className="text-4xl font-headline font-bold text-foreground mb-2">{naam}</h1>
        <p className="text-base font-body text-muted-foreground mb-8">
          Alles wat we al weten uit het telefoongesprek. Lees door, start dan het intakegesprek.
        </p>

        {!heeftPreIntake && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-body text-sm text-amber-900">
                Geen telefoongesprek-data gevonden voor dit dossier. Start het intakegesprek met een blanco vragenlijst.
              </p>
            </div>
          </div>
        )}

        {/* Klantkaart */}
        <Section title="Klant">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm font-body">
            <Field icon={User} label="Naam" value={naam} />
            <Field icon={Phone} label="Telefoon" value={lead.telefoon} />
            <Field icon={MapPin} label="Adres" value={lead.adres} />
            <Field icon={User} label="E-mail" value={lead.email} />
            {preIntake?.region_gemeente && <Field icon={MapPin} label="Gemeente" value={preIntake.region_gemeente} />}
            {lead.gevonden_via && <Field icon={User} label="Gevonden via" value={lead.gevonden_via} />}
          </div>
        </Section>

        {heeftPreIntake && (
          <>
            {/* Trigger & emoties */}
            {(preIntake.trigger_text || preIntake.emotional_keywords?.length || preIntake.impression_tags?.length) && (
              <Section title="Trigger & sfeer">
                {preIntake.trigger_text && (
                  <p className="text-base font-body text-foreground italic mb-4">"{preIntake.trigger_text}"</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {preIntake.emotional_keywords?.map((k: any, i: number) => (
                    <Chip key={`ek-${i}`} variant="emotional">{k.text}</Chip>
                  ))}
                  {preIntake.impression_tags?.map((t: string) => (
                    <Chip key={`it-${t}`} variant="tag">{IMPRESSION_LABELS[t] || t}</Chip>
                  ))}
                </div>
                {preIntake.general_impression && (
                  <p className="mt-4 text-sm font-body text-muted-foreground">{preIntake.general_impression}</p>
                )}
              </Section>
            )}

            {/* FOMU */}
            {preIntake.fomu_concerns?.length > 0 && (
              <Section title="Zorgen van de klant (FOMU)">
                <div className="flex flex-wrap gap-2">
                  {preIntake.fomu_concerns.map((c: any, i: number) => (
                    <Chip key={i} variant="warning">{c.text}</Chip>
                  ))}
                </div>
              </Section>
            )}

            {/* Vragen gesteld */}
            {raisedQuestions.length > 0 && (
              <Section title="Vragen die de klant zelf opbracht">
                <ul className="space-y-3">
                  {raisedQuestions.map(([key, val]) => (
                    <li key={key} className="border-l-2 border-primary pl-4">
                      <div className="text-sm font-bold font-body text-foreground">{QUESTION_LABELS[key] || key}</div>
                      {val.note && <div className="text-sm font-body text-muted-foreground mt-1">{val.note}</div>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Kwalificatie */}
            {(preIntake.qual_in_region !== null || preIntake.qual_real_attic !== null || preIntake.qual_is_owner !== null || preIntake.qual_is_decision_maker !== null) && (
              <Section title="Kwalificatie">
                <div className="grid grid-cols-2 gap-2">
                  {qualBadge('In ons werkgebied', preIntake.qual_in_region)}
                  {qualBadge('Echte zolder', preIntake.qual_real_attic)}
                  {qualBadge('Eigenaar', preIntake.qual_is_owner)}
                  {qualBadge('Beslisser', preIntake.qual_is_decision_maker)}
                </div>
              </Section>
            )}

            {/* Beloofd door klant */}
            {(preIntake.photos_promised || preIntake.measurement_promised || preIntake.deliverables_due_date) && (
              <Section title="Beloofd door de klant">
                <div className="space-y-2 text-sm font-body">
                  {preIntake.photos_promised && <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Stuurt foto's door</div>}
                  {preIntake.measurement_promised && <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Meet zelf op</div>}
                  {preIntake.deliverables_due_date && <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Tegen {preIntake.deliverables_due_date}</div>}
                </div>
              </Section>
            )}

            {/* Scenario & afspraak */}
            {(preIntake.scenario_chosen || preIntake.videocall_scheduled_at) && (
              <Section title="Scenario & afspraak">
                <div className="space-y-2 text-sm font-body">
                  {preIntake.scenario_chosen && <div>Scenario: <strong>{preIntake.scenario_chosen}</strong></div>}
                  {preIntake.videocall_scheduled_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(preIntake.videocall_scheduled_at).toLocaleString('nl-BE')}
                    </div>
                  )}
                  {preIntake.google_meet_link && (
                    <a href={preIntake.google_meet_link} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                      {preIntake.google_meet_link}
                    </a>
                  )}
                </div>
              </Section>
            )}

            {/* Notities */}
            {preIntake.quick_notes && (
              <Section title="Quick notes">
                <p className="text-sm font-body whitespace-pre-wrap text-foreground">{preIntake.quick_notes}</p>
              </Section>
            )}
          </>
        )}

        {/* AI-analyse */}
        {heeftAnalyse && analysis.ai_analysis && (
          <Section title="AI-analyse van transcript">
            <pre className="text-xs font-body whitespace-pre-wrap bg-muted/40 p-4 rounded text-foreground max-h-72 overflow-y-auto">
              {typeof analysis.ai_analysis === 'string' ? analysis.ai_analysis : JSON.stringify(analysis.ai_analysis, null, 2)}
            </pre>
            {analysis.coaching_feedback && (
              <div className="mt-4">
                <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground font-body mb-2">Coaching</div>
                <p className="text-sm font-body whitespace-pre-wrap">{analysis.coaching_feedback}</p>
              </div>
            )}
          </Section>
        )}

        {/* CTA */}
        <div className="sticky bottom-0 bg-background pt-6 pb-2 mt-8 flex justify-between gap-3 border-t border-border">
          <Button variant="outline" onClick={onBack} className="font-headline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Terug
          </Button>
          <Button onClick={onStart} className="font-headline bg-primary text-primary-foreground hover:bg-secondary gap-2">
            Start intakegesprek
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground font-body mb-3">{title}</h2>
      <div className="bg-card border border-border p-5">{children}</div>
    </section>
  );
}

function Field({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <span className="text-xs text-muted-foreground">{label}: </span>
        <span className="text-foreground">{value}</span>
      </div>
    </div>
  );
}

function Chip({ children, variant }: { children: React.ReactNode; variant: 'emotional' | 'warning' | 'tag' }) {
  const cls = variant === 'emotional'
    ? 'bg-blue-50 text-blue-700'
    : variant === 'warning'
    ? 'bg-amber-50 text-amber-800'
    : 'bg-muted text-foreground';
  return <span className={`inline-block text-xs font-body px-2.5 py-1 ${cls}`}>{children}</span>;
}
