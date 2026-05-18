import { useState, useEffect } from 'react';
import { usePreIntake } from '@/contexts/PreIntakeContext';
import { usePreIntakeSave } from '@/hooks/usePreIntakeSave';
import { useCallTimer } from '@/hooks/useCallTimer';
import { supabase } from '@/integrations/supabase/client';
import ChipInput from '@/components/calling/ChipInput';
import CloseCallDialog from '@/components/calling/CloseCallDialog';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { ScenarioType } from '@/types/preIntake';

type CallingStep = 'select-lead' | 'calling' | 'wrap-up';

interface LiveCallingProps {
  onGoHome: () => void;
  onGoDossiers: () => void;
  onOpenValidation: (leadId: string, preIntakeId: string) => void;
}

/* ───────────────────────── STATIC CONTENT ───────────────────────── */

interface QCardProps {
  label: string;
  question: string;
  why?: string;
  toon?: string;
  variant?: string;
}

function QCard({ label, question, why, toon, variant }: QCardProps) {
  return (
    <div className="border border-[#DDD5C5] mb-2 overflow-hidden">
      <div className="bg-[#F8F3EB] text-[#2B6CA0] font-dm text-[9px] font-bold tracking-[0.13em] uppercase px-[9px] py-1 border-b border-[#DDD5C5]">
        {label}
      </div>
      <div className="bg-white px-[10px] py-[9px] border-l-[3px] border-l-[#008CFF] font-body italic font-medium text-[12.5px] leading-[1.35] text-[#0F1419]">
        {question}
      </div>
      {(why || toon) && (
        <div className="flex flex-col border-t border-[#DDD5C5]">
          {why && (
            <div className="grid grid-cols-[60px_1fr] text-[10.5px] leading-[1.4]">
              <div className="bg-[#E8F4FF] text-[#008CFF] font-dm text-[8.5px] font-bold tracking-[0.1em] uppercase px-2 py-[6px] flex items-center justify-center border-r border-[#DDD5C5]">Waarom</div>
              <div className="bg-white text-[#0F1419] px-[9px] py-[6px]">{why}</div>
            </div>
          )}
          {toon && (
            <div className={`grid grid-cols-[60px_1fr] text-[10.5px] leading-[1.4] ${why ? 'border-t border-dotted border-[#DDD5C5]' : ''}`}>
              <div className="bg-[#FFF6E5] text-[#A06010] font-dm text-[8.5px] font-bold tracking-[0.1em] uppercase px-2 py-[6px] flex items-center justify-center border-r border-[#DDD5C5]">Toon</div>
              <div className="bg-white text-[#0F1419] px-[9px] py-[6px]">{toon}</div>
            </div>
          )}
        </div>
      )}
      {variant && (
        <div className="bg-[#FAFAFA] px-[10px] py-[7px] border-t border-dashed border-[#DDD5C5] font-body italic text-[11.5px] text-[#0F1419] leading-[1.35]">
          <span className="not-italic font-dm text-[8.5px] font-bold tracking-[0.1em] text-[#5B6470] mr-1">OF</span>
          {variant}
        </div>
      )}
    </div>
  );
}

function TipCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="bg-[#E8F4FF] border border-[#B8DCFF] px-[10px] py-[7px] mb-2">
      <div className="font-dm text-[8.5px] font-bold tracking-[0.13em] uppercase text-[#008CFF] mb-[3px] flex items-center gap-[5px]">
        <span className="text-[11px]">💡</span> {label}
      </div>
      <div className="text-[11px] leading-[1.4] text-[#0F1419]" dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}

function DeliverableCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="bg-[#EAF5EC] border border-[#B8D4BC] px-[10px] py-[7px] mb-2">
      <div className="font-dm text-[8.5px] font-bold tracking-[0.13em] uppercase text-[#2E7D38] mb-[3px] flex items-center gap-[5px]">
        <span className="text-[11px]">📎</span> {label}
      </div>
      <div className="text-[11px] leading-[1.4] text-[#0F1419]" dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}

interface AnticipateCardProps {
  topic: string;
  klant: string;
  jij: string;
}

function AnticipateCard({ topic, klant, jij }: AnticipateCardProps) {
  return (
    <div className="p-[10px_12px_11px_12px] border-r border-b border-[#DDD5C5]">
      <div className="font-dm text-[9px] font-bold tracking-[0.14em] uppercase text-[#A06010] mb-[5px]">{topic}</div>
      <div className="mb-[5px] grid grid-cols-[38px_1fr] gap-[6px] items-start">
        <div className="font-dm text-[8.5px] font-bold tracking-[0.06em] uppercase bg-[#FFF6E5] text-[#A06010] px-1 py-[3px] text-center leading-none">Klant</div>
        <div className="text-[11px] leading-[1.35] text-[#0F1419] italic">{klant}</div>
      </div>
      <div className="grid grid-cols-[38px_1fr] gap-[6px] items-start">
        <div className="font-dm text-[8.5px] font-bold tracking-[0.06em] uppercase bg-[#E8F4FF] text-[#008CFF] px-1 py-[3px] text-center leading-none">Jij</div>
        <div className="text-[11px] leading-[1.35] text-[#0F1419] italic">{jij}</div>
      </div>
    </div>
  );
}

const SCENARIOS: { type: ScenarioType; tag: string; text: string; sub: string }[] = [
  { type: 'A', tag: 'A', text: '"Deze week lukt"', sub: '→ call volgende week' },
  { type: 'B', tag: 'B', text: '"Enkel weekend"', sub: '→ 2-3 wd ná weekend' },
  { type: 'C', tag: 'C', text: '"Pas over X weken"', sub: '→ toch direct prikken' },
  { type: 'D', tag: 'D', text: '"Moeilijk te zeggen"', sub: '→ veilige datum verder' },
];

/* ───────────────────────── MAIN COMPONENT ───────────────────────── */

export default function LiveCalling({ onGoHome, onGoDossiers, onOpenValidation }: LiveCallingProps) {
  const [step, setStep] = useState<CallingStep>('select-lead');
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [leadVoornaam, setLeadVoornaam] = useState('');
  const [leadAchternaam, setLeadAchternaam] = useState('');
  const [leadTelefoon, setLeadTelefoon] = useState('');
  const [leadAdres, setLeadAdres] = useState('');
  const [leadPartnerNaam, setLeadPartnerNaam] = useState('');
  const [leadEmail, setLeadEmail] = useState('');

  const {
    data, update, resetPreIntake,
    addEmotionalKeyword, removeEmotionalKeyword,
    addFomuConcern, removeFomuConcern,
    toggleImpressionTag, toggleQuestion,
  } = usePreIntake();
  const { flushSave } = usePreIntakeSave();
  const timer = useCallTimer();

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase.from('leads').select('id, voornaam, achternaam, email, telefoon, adres, partner_naam').order('updated_at', { ascending: false }).limit(50);
      if (rows) setLeads(rows);
    })();
  }, []);

  const filteredLeads = search.trim()
    ? leads.filter(l => `${l.voornaam} ${l.achternaam} ${l.email} ${l.telefoon}`.toLowerCase().includes(search.toLowerCase()))
    : leads;

  const startCall = (lead: any) => {
    setSelectedLead(lead);
    setLeadVoornaam(lead.voornaam || '');
    setLeadAchternaam(lead.achternaam || '');
    setLeadTelefoon(lead.telefoon || '');
    setLeadAdres(lead.adres || '');
    setLeadPartnerNaam(lead.partner_naam || '');
    setLeadEmail(lead.email || '');
    resetPreIntake(lead.id);
    update({ call_started_at: new Date().toISOString() });
    timer.start();
    setStep('calling');
  };

  const handleNewLead = async () => {
    const { data: newLead, error } = await supabase.from('leads').insert({ voornaam: '', achternaam: '', status: 'intake' }).select('id, voornaam, achternaam, email, telefoon, adres').single();
    if (error) { toast.error('Fout bij aanmaken lead'); return; }
    startCall(newLead);
  };

  const handleCloseCall = async () => {
    update({ call_ended_at: new Date().toISOString(), call_duration_seconds: timer.elapsed });
    timer.pause();
    if (selectedLead?.id) {
      await supabase.from('leads').update({ voornaam: leadVoornaam, achternaam: leadAchternaam, telefoon: leadTelefoon, adres: leadAdres, partner_naam: leadPartnerNaam, email: leadEmail }).eq('id', selectedLead.id);
    }
    await flushSave();
    setShowCloseDialog(false);
    setStep('wrap-up');
  };

  const handleFinishWrapUp = async () => {
    if (selectedLead?.id) {
      await supabase.from('leads').update({ voornaam: leadVoornaam, achternaam: leadAchternaam, telefoon: leadTelefoon, adres: leadAdres, partner_naam: leadPartnerNaam, email: leadEmail }).eq('id', selectedLead.id);
    }
    update({ locked_at: new Date().toISOString() });
    await flushSave();
    toast.success('Dossier opgeslagen');
    if (selectedLead?.id && data.id) {
      onOpenValidation(selectedLead.id, data.id);
    } else {
      onGoDossiers();
    }
  };

  /* ─── LEAD SELECTION ─── */
  if (step === 'select-lead') {
    return (
      <div className="h-screen flex flex-col bg-[#F8F3EB]">
        <div className="h-14 bg-white border-b border-[#DDD5C5] flex items-center px-6 gap-4 shrink-0">
          <button onClick={onGoHome} className="flex items-center gap-2 text-sm font-dm text-[#5B6470] hover:text-[#0F1419]">
            <ArrowLeft className="h-4 w-4" /> Terug
          </button>
          <h1 className="text-base font-dm font-bold text-[#0F1419]">Nieuw telefoongesprek</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className="max-w-xl mx-auto space-y-6">
            <Button onClick={handleNewLead} className="w-full bg-[#008CFF] text-white hover:bg-[#0070CC] font-dm text-base py-6">Nieuwe lead + bellen</Button>
            <div className="text-center text-sm font-body text-[#5B6470]">of kies een bestaande lead</div>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek op naam, telefoon of email..." className="bg-white border-[#DDD5C5]" />
            <div className="space-y-1">
              {filteredLeads.map(lead => (
                <button key={lead.id} onClick={() => startCall(lead)} className="w-full text-left p-3 bg-white border border-[#DDD5C5] hover:border-[#008CFF]/50 hover:bg-[#008CFF]/5 transition-colors">
                  <span className="font-dm font-semibold text-[#0F1419]">{lead.voornaam || lead.achternaam ? `${lead.voornaam} ${lead.achternaam}`.trim() : 'Geen naam'}</span>
                  <span className="text-xs font-body text-[#5B6470] ml-3">{lead.telefoon || lead.email || ''}</span>
                </button>
              ))}
              {filteredLeads.length === 0 && <p className="text-sm font-body text-[#5B6470] text-center py-8">Geen leads gevonden.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── WRAP-UP SCREEN ─── */
  if (step === 'wrap-up') {
    const CALLING_QUESTIONS = [
      { key: 'budget' as const, label: 'Budget' },
      { key: 'start_timing' as const, label: 'Starttiming' },
      { key: 'duration' as const, label: 'Doorlooptijd' },
      { key: 'daily_impact' as const, label: 'Impact dagelijks leven' },
      { key: 'overlast' as const, label: 'Overlast' },
      { key: 'feasibility_idea' as const, label: 'Haalbaarheid idee' },
      { key: 'attic_condition' as const, label: 'Staat zolder' },
      { key: 'company_approach' as const, label: 'Werkwijze bedrijf' },
    ];

    return (
      <div className="h-screen flex flex-col bg-[#F8F3EB]">
        <div className="h-14 bg-white border-b border-[#DDD5C5] flex items-center px-6 shrink-0">
          <h1 className="text-base font-dm font-bold text-[#0F1419]">Gesprek afwerken</h1>
          <span className="text-xs font-body text-[#5B6470] ml-3">
            {leadVoornaam} {leadAchternaam} — {Math.floor((data.call_duration_seconds || 0) / 60)} min
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-8 space-y-5">

            {/* Klantgegevens — compact grid, inputs prominent */}
            <section className="space-y-3">
              <h2 className="font-dm text-[9px] font-bold text-[#5B6470] uppercase tracking-[0.14em]">Klantgegevens</h2>
              <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-3">
                <input type="text" value={leadVoornaam} onChange={e => setLeadVoornaam(e.target.value)} placeholder="Voornaam"
                  className="h-12 px-4 bg-white border-2 border-[#DDD5C5] text-[15px] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
                <input type="text" value={leadAchternaam} onChange={e => setLeadAchternaam(e.target.value)} placeholder="Achternaam"
                  className="h-12 px-4 bg-white border-2 border-[#DDD5C5] text-[15px] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
                <input type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} placeholder="E-mailadres"
                  className="h-12 px-4 bg-white border-2 border-[#DDD5C5] text-[15px] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
              </div>
              <input type="text" value={leadAdres} onChange={e => setLeadAdres(e.target.value)} placeholder="Volledig adres — bv. Kerkstraat 12, 9000 Gent"
                className="w-full h-12 px-4 bg-white border-2 border-[#DDD5C5] text-[15px] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={leadPartnerNaam} onChange={e => setLeadPartnerNaam(e.target.value)} placeholder="Naam partner"
                  className="h-12 px-4 bg-white border-2 border-[#DDD5C5] text-[15px] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
                <input type="text" value={data.region_gemeente} onChange={e => update({ region_gemeente: e.target.value })} placeholder="Gemeente"
                  className="h-12 px-4 bg-white border-2 border-[#DDD5C5] text-[15px] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
              </div>
            </section>

            {/* Videocall plannen — inputs first, labels minimal */}
            <section className="space-y-3">
              <h2 className="font-dm text-[9px] font-bold text-[#5B6470] uppercase tracking-[0.14em]">Videocall plannen</h2>
              <div className="grid grid-cols-[1fr_1fr_2fr] gap-3">
                <input type="date" value={data.videocall_scheduled_at ? data.videocall_scheduled_at.split('T')[0] : ''}
                  onChange={e => {
                    const time = data.videocall_scheduled_at ? data.videocall_scheduled_at.split('T')[1] || '10:00' : '10:00';
                    update({ videocall_scheduled_at: e.target.value ? `${e.target.value}T${time}` : null });
                  }}
                  className="h-12 px-4 bg-white border-2 border-[#DDD5C5] text-[15px] font-body font-medium text-[#0F1419] focus:outline-none focus:border-[#008CFF]" />
                <input type="time" value={data.videocall_scheduled_at ? data.videocall_scheduled_at.split('T')[1]?.substring(0, 5) || '10:00' : ''}
                  onChange={e => {
                    const date = data.videocall_scheduled_at ? data.videocall_scheduled_at.split('T')[0] : new Date().toISOString().split('T')[0];
                    update({ videocall_scheduled_at: `${date}T${e.target.value}` });
                  }}
                  className="h-12 px-4 bg-white border-2 border-[#DDD5C5] text-[15px] font-body font-medium text-[#0F1419] focus:outline-none focus:border-[#008CFF]" />
                <input type="url" value={data.google_meet_link} onChange={e => update({ google_meet_link: e.target.value })} placeholder="Google Meet link"
                  className="h-12 px-4 bg-white border-2 border-[#DDD5C5] text-[15px] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
              </div>
              {data.videocall_scheduled_at && leadEmail && (
                <button type="button" onClick={() => {
                  const dt = new Date(data.videocall_scheduled_at!);
                  const dag = dt.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
                  const uur = dt.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
                  const meetLine = data.google_meet_link ? `\n${data.google_meet_link}\n` : '';
                  const body = `Hi ${leadVoornaam},\n\nBij deze bevestig ik graag onze afspraak in de vorm van een videocall op ${dag} om ${uur}.${meetLine}\nAls u mij op voorhand kan meegeven:\n• Enkele foto's die de huidige toestand van de zolder goed weergeven\n• Enkele foto's van de ruimte waar de nieuwe vaste trap kan komen\n• Een inschatting van de oppervlakte van de zolder\n\nIk kijk ernaar uit om meer te weten te komen over jullie project. Tot dan!\n\nPositieve groeten,\n\nBram Keirsschieter\n+32 492 400 954\n\nZaakvoerder\nZolderpunt.be`;
                  window.open(`mailto:${leadEmail}?subject=${encodeURIComponent(`Bevestiging videocall ${dag} om ${uur} — Zolderpunt`)}&body=${encodeURIComponent(body)}`);
                }}
                  className="w-full h-12 bg-[#2E7D38] text-white font-dm font-bold text-[14px] hover:bg-[#256B2E] transition-colors">
                  Open bevestigingsmail
                </button>
              )}
              {data.videocall_scheduled_at && !leadEmail && (
                <p className="text-xs font-body text-[#E89F3D] italic">Vul een e-mailadres in om de bevestigingsmail te openen.</p>
              )}
            </section>

            {/* Klantvragen — toggle chips */}
            <section className="space-y-3">
              <h2 className="font-dm text-[9px] font-bold text-[#5B6470] uppercase tracking-[0.14em]">Welke klantvragen kwamen aan bod?</h2>
              <div className="flex flex-wrap gap-2">
                {CALLING_QUESTIONS.map(q => {
                  const raised = data.questions_raised[q.key]?.raised;
                  return (
                    <button key={q.key} type="button" onClick={() => toggleQuestion(q.key)}
                      className={`h-10 px-4 text-[14px] font-body font-medium transition-colors ${raised ? 'bg-[#008CFF] text-white border-2 border-[#008CFF]' : 'bg-white text-[#5B6470] border-2 border-[#DDD5C5] hover:border-[#008CFF]/50'}`}>
                      {q.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Validatie — compact inline */}
            <section className="flex flex-wrap items-center gap-x-5 gap-y-1 py-3 border-t border-[#DDD5C5]">
              {[
                { label: 'Citaat', ok: data.emotional_keywords.length > 0 },
                { label: 'Buying committee', ok: !!data.buying_committee.trim() },
                { label: 'Scenario', ok: !!data.scenario_chosen },
                { label: 'Videocall', ok: !!data.videocall_scheduled_at },
                { label: 'Adres', ok: !!leadAdres.trim() },
              ].map((c, i) => (
                <span key={i} className={`text-[12px] font-body ${c.ok ? 'text-[#2E7D38]' : 'text-[#B0A898]'}`}>
                  {c.ok ? '✓' : '○'} {c.label}
                </span>
              ))}
            </section>

            <button onClick={handleFinishWrapUp} className="w-full h-14 bg-[#008CFF] text-white font-dm font-bold text-[16px] hover:bg-[#0070CC] transition-colors">
              Vergrendel dossier
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── LIVE CALLING — single scrollable pinboard ─── */
  return (
    <div className="min-h-screen bg-[#F8F3EB] text-[13px] leading-[1.4] font-body text-[#0F1419]">

      {/* ═══ TOPBAR ═══ */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#DDD5C5] px-5 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-dm font-extrabold text-[15px] text-[#008CFF] tracking-[-0.02em]">zolderpunt.</span>
          <div className="flex gap-[6px]">
            <input type="text" value={leadVoornaam} onChange={e => setLeadVoornaam(e.target.value)} placeholder="Voornaam"
              className="border border-[#DDD5C5] bg-[#F8F3EB] font-body text-[12px] text-[#0F1419] px-2 py-[5px] w-[100px] focus:outline-none focus:border-[#008CFF] focus:bg-white" />
            <input type="text" value={leadAchternaam} onChange={e => setLeadAchternaam(e.target.value)} placeholder="Achternaam"
              className="border border-[#DDD5C5] bg-[#F8F3EB] font-body text-[12px] text-[#0F1419] px-2 py-[5px] w-[100px] focus:outline-none focus:border-[#008CFF] focus:bg-white" />
            <input type="text" value={leadTelefoon} onChange={e => setLeadTelefoon(e.target.value)} placeholder="Telefoon"
              className="border border-[#DDD5C5] bg-[#F8F3EB] font-body text-[12px] text-[#0F1419] px-2 py-[5px] w-[100px] focus:outline-none focus:border-[#008CFF] focus:bg-white" />
            <input type="text" value={leadAdres} onChange={e => setLeadAdres(e.target.value)} placeholder="Adres"
              className="border border-[#DDD5C5] bg-[#F8F3EB] font-body text-[12px] text-[#0F1419] px-2 py-[5px] w-[160px] focus:outline-none focus:border-[#008CFF] focus:bg-white" />
            <input type="text" value={leadPartnerNaam} onChange={e => setLeadPartnerNaam(e.target.value)} placeholder="Partner"
              className="border border-[#DDD5C5] bg-[#F8F3EB] font-body text-[12px] text-[#0F1419] px-2 py-[5px] w-[100px] focus:outline-none focus:border-[#008CFF] focus:bg-white" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-dm text-[12px] text-[#5B6470] font-semibold tabular-nums">⏱ {timer.formatted}</span>
          <span className="text-[10px] text-[#5B6470] font-dm">Opgeslagen ·</span>
          <button onClick={() => setShowCloseDialog(true)}
            className="bg-[#008CFF] text-white border-none px-[14px] py-[7px] font-dm font-semibold text-[11px] tracking-[0.03em] cursor-pointer hover:bg-[#0070CC] transition-colors">
            Sluit gesprek af →
          </button>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-5 pt-[14px] pb-6">

        {/* ═══ SCRIPT GRID — 4 FASE COLUMNS ═══ */}
        <div className="grid grid-cols-4 gap-[10px]">

          {/* ── FASE 1: Motivatie ── */}
          <div className="bg-white border border-[#DDD5C5] flex flex-col">
            <div className="bg-[#008CFF] text-white px-3 py-[10px]">
              <div className="flex items-baseline justify-between mb-[3px]">
                <span className="font-dm text-[9.5px] font-bold tracking-[0.16em] uppercase opacity-85">Fase 1</span>
                <span className="font-dm text-[9.5px] font-medium opacity-85">1–2 min</span>
              </div>
              <div className="font-dm text-[15px] font-bold leading-[1.15] tracking-[-0.01em]">Motivatie blootleggen</div>
            </div>
            <div className="bg-[#2B6CA0] text-white px-3 py-[7px] text-[11px] leading-[1.35]">
              <div className="font-dm text-[8.5px] font-bold tracking-[0.16em] uppercase opacity-70 mb-[1px]">Doel</div>
              Ontdek waarom de klant <em>vandaag</em> belt.
            </div>
            <div className="p-[10px] flex-1">
              <QCard
                label="Openingsvraag"
                question={`"Waar liep je in huis precies tegenaan waardoor je dacht: 'nu is het tijd om die zolder aan te pakken'?"`}
                why="Open vraag laat de klant zélf het probleem benoemen — niet jij."
                toon="Warm, nieuwsgierig. Geen Amerikaans enthousiasme."
                variant={`"Mag ik vragen wat je precies hoopt te bereiken met die extra ruimte?"`}
              />
              <TipCard label="Tip · Mirroring" text={`Klant zegt <em>"frustrerend"</em>. Jij zacht: <em>"frustrerend...?"</em> en zwijg. De klant vertelt vanzelf meer.`} />
              <TipCard label="Tip · 80/20-regel" text="Klant praat 90% van de tijd. Jij stelt vragen en luistert. Hoe minder jij praat, hoe meer vertrouwen." />
            </div>
          </div>

          {/* ── FASE 2: Doorvragen op de pijn ── */}
          <div className="bg-white border border-[#DDD5C5] flex flex-col">
            <div className="bg-[#008CFF] text-white px-3 py-[10px]">
              <div className="flex items-baseline justify-between mb-[3px]">
                <span className="font-dm text-[9.5px] font-bold tracking-[0.16em] uppercase opacity-85">Fase 2</span>
                <span className="font-dm text-[9.5px] font-medium opacity-85">2–3 min</span>
              </div>
              <div className="font-dm text-[15px] font-bold leading-[1.15] tracking-[-0.01em]">Doorvragen op de pijn</div>
            </div>
            <div className="bg-[#2B6CA0] text-white px-3 py-[7px] text-[11px] leading-[1.35]">
              <div className="font-dm text-[8.5px] font-bold tracking-[0.16em] uppercase opacity-70 mb-[1px]">Doel</div>
              Laat de klant onbewust de urgentie van eigen probleem voelen.
            </div>
            <div className="p-[10px] flex-1">
              <QCard label="Duur-vraag" question={`"Hoe lang speelt dat eigenlijk al?"`} why="De klant beseft zelf hoe lang ze rondlopen met de frustratie." />
              <QCard label="Impact-vraag" question={`"Heeft dat veel impact op hoe jullie het huis nu kunnen gebruiken?"`} toon="Rustig, lichtbezorgd. Laat een pauze vallen na de vraag." />
              <QCard label="Verduidelijking" question={`"Op welke manier bedoel je dat precies? Kan je een voorbeeld geven?"`} why="Onder vage antwoorden zit de échte motivatie." />
              <QCard label="Resultaat-vraag" question={`"Stel dat we dit helemaal naar wens kunnen oplossen — wat zou die ruimte voor jullie betekenen?"`} why="Verlegt focus van prijs naar waarde." />
              <QCard label="Echte zorgen" question={`"Wat zijn jullie grootste vragen of bezorgdheden rond zo'n zolderrenovatie?"`} why={`Detecteert hun angst om "gepakt" te worden. Noteer letterlijk.`} />
            </div>
          </div>

          {/* ── FASE 3: Videocall framen + deliverables ── */}
          <div className="bg-white border border-[#DDD5C5] flex flex-col">
            <div className="bg-[#008CFF] text-white px-3 py-[10px]">
              <div className="flex items-baseline justify-between mb-[3px]">
                <span className="font-dm text-[9.5px] font-bold tracking-[0.16em] uppercase opacity-85">Fase 3</span>
                <span className="font-dm text-[9.5px] font-medium opacity-85">2–3 min</span>
              </div>
              <div className="font-dm text-[15px] font-bold leading-[1.15] tracking-[-0.01em]">Videocall framen + deliverables</div>
            </div>
            <div className="bg-[#2B6CA0] text-white px-3 py-[7px] text-[11px] leading-[1.35]">
              <div className="font-dm text-[8.5px] font-bold tracking-[0.16em] uppercase opacity-70 mb-[1px]">Doel</div>
              Videocall als voordeel positioneren. Foto's + oppervlakte vragen. Tijdsvraag stellen.
            </div>
            <div className="p-[10px] flex-1">
              <QCard
                label="Framing van de videocall"
                question={`"Om jullie concrete antwoorden te geven op budget, timing, duur en haalbaarheid, plannen we eerst een korte videocall in met Bram, onze zolderexpert. Hij kan via video vaak al meteen inschatten of jullie wensen haalbaar zijn — zo hoeven jullie geen halve dag verlof te nemen voor een plaatsbezoek."`}
                why="Positioneer Bram als expert. Videocall bespaart hún tijd."
              />
              <DeliverableCard label="Deliverable 1 · Foto's" text={`Bram maakt tijdens de call een eerste kostenraming. Foto's van de zolder zoals ze er nu bij ligt — <em>niet opruimen</em>, hoe realistischer hoe beter. Bij vaste trap: ook foto's van de verdieping eronder.`} />
              <DeliverableCard label="Deliverable 2 · Oppervlakte" text="Een ruwe oppervlakte van de vloer — zelf opmeten volstaat. Of een foto van een plan als ze dat hebben liggen." />
              <QCard
                label="De tijdsvraag · bepaalt videocall-datum"
                question={`"Wanneer denken jullie dat realistisch te kunnen doen? Hebben jullie deze week makkelijk toegang tot de zolder, of is dat moeilijker te plannen?"`}
                why={`"Realistisch" geeft toestemming om eerlijk te zijn. Videocall pas ná dit moment plannen.`}
              />
              <TipCard label="Tip · Verstop kwalificatie hierin" text="Stel terloops: gemeente? Echte zolderrenovatie of ook dakwerken? Eigenaar of in aankoop? Type woning? Geen checklist — gewoon doorvlechten." />
            </div>
          </div>

          {/* ── FASE 4: Inplannen + afsluiten ── */}
          <div className="bg-white border border-[#DDD5C5] flex flex-col">
            <div className="bg-[#008CFF] text-white px-3 py-[10px]">
              <div className="flex items-baseline justify-between mb-[3px]">
                <span className="font-dm text-[9.5px] font-bold tracking-[0.16em] uppercase opacity-85">Fase 4</span>
                <span className="font-dm text-[9.5px] font-medium opacity-85">1–2 min</span>
              </div>
              <div className="font-dm text-[15px] font-bold leading-[1.15] tracking-[-0.01em]">Inplannen + afsluiten</div>
            </div>
            <div className="bg-[#2B6CA0] text-white px-3 py-[7px] text-[11px] leading-[1.35]">
              <div className="font-dm text-[8.5px] font-bold tracking-[0.16em] uppercase opacity-70 mb-[1px]">Doel</div>
              Videocall in agenda. Guard-Down vraag. Warm afsluiten — geen open einde.
            </div>
            <div className="p-[10px] flex-1">
              {/* Scenario mini-grid */}
              <div className="border border-[#DDD5C5] mb-2 overflow-hidden">
                <div className="bg-[#F8F3EB] text-[#2B6CA0] font-dm text-[9px] font-bold tracking-[0.13em] uppercase px-[9px] py-1 border-b border-[#DDD5C5]">
                  Inplan-scenario
                </div>
                <div className="grid grid-cols-2">
                  {SCENARIOS.map((s, i) => (
                    <button key={s.type} type="button" onClick={() => update({ scenario_chosen: s.type })}
                      className={`p-[6px_8px] text-[10.5px] text-left leading-[1.3] bg-white cursor-pointer transition-colors
                        ${i % 2 === 0 ? 'border-r border-[#DDD5C5]' : ''}
                        ${i < 2 ? 'border-b border-[#DDD5C5]' : ''}
                        ${data.scenario_chosen === s.type ? 'bg-[#E8F4FF] !border-[#008CFF]' : 'hover:bg-[#E8F4FF]'}
                      `}>
                      <span className="font-dm text-[11px] font-extrabold text-[#008CFF] mr-1">{s.tag}</span>{s.text}
                      <span className="block mt-[1px] text-[10.5px]"><em className="text-[#5B6470] not-italic text-[10px]">{s.sub}</em></span>
                    </button>
                  ))}
                </div>
              </div>

              <QCard
                label={`Als de klant "ik bel u nog terug" zegt`}
                question={`"Mijn ervaring leert dat zo'n terugbel-afspraak vaak verloren gaat. Veel handiger als we nu een moment in de agenda zetten — verzetten kan altijd."`}
                why={`"Verzetten kan altijd" verlaagt de drempel om nu te committen.`}
              />
              <QCard
                label="Guard-Down vraag · pas NÁ het prikken"
                question={`"Helemaal goed, de videocall staat. Nog even voor ik je laat gaan: wat wilden jij en je partner zeker nog doornemen, zodat ik dat aan Bram kan doorgeven?"`}
                why="Afspraak staat, verdediging zakt. Hier komt het echte bezwaar. Noteer letterlijk."
              />
              <QCard
                label="Warme afsluiter"
                question={`"Super, dan zorg ik dat Bram perfect voorbereid is. Je krijgt zo de uitnodiging in je mailbox, en het nummer voor de foto's krijg je daar ook bij. Fijne dag nog!"`}
              />
            </div>
          </div>

        </div>

        {/* ═══ ANTICIPATIE-STROOK ═══ */}
        <div className="mt-3 bg-white border border-[#DDD5C5]">
          <div className="bg-[#E89F3D] text-white px-[14px] py-[7px] flex items-center gap-2">
            <span className="text-[14px]">⚠️</span>
            <span className="font-dm text-[11px] font-bold tracking-[0.12em] uppercase">Anticipatie · wat als de klant deze vragen stelt?</span>
          </div>
          <div className="grid grid-cols-3">
            <AnticipateCard topic="Wat kost het ongeveer?" klant={`"Wat kost zo'n zolderrenovatie?"`} jij={`"Logische vraag. Een prijs hangt af van oppervlakte, toestand, indeling, vaste trap... Daarom rekent Bram dit in de videocall voor jullie uit op basis van jullie situatie. Klinkt dat eerlijk?"`} />
            <AnticipateCard topic="Wanneer kunnen jullie starten?" klant={`"Wanneer kan dat starten en hoe lang duurt het?"`} jij={`"Heel logisch — een van de eerste dingen die Bram met jullie doorneemt. Concrete data noemen aan de telefoon doen we bewust niet, want dan zit je later met cijfers die niet kloppen."`} />
            <AnticipateCard topic="Hoeveel overlast?" klant={`"Hoeveel overlast brengt dat mee?"`} jij={`"Veel mensen bezighoudt, heel terecht. Bram bespreekt standaard hoe het verloop er praktisch uitziet — zodat je vooraf weet waar je aan toe bent."`} />
            <AnticipateCard topic="Is ons idee haalbaar?" klant={`"Kan onze indeling wel?"`} jij={`"Daar gaat Bram in de call concreet antwoord op geven. Op basis van de foto's en oppervlakte kan hij meestal al inschatten wat haalbaar is. Precies daarvoor is die call."`} />
            <AnticipateCard topic="Kan er niet gewoon iemand langskomen?" klant={`"Stuur gewoon iemand langs."`} jij={`"Begrijp ik, dat is hoe het vroeger ging. We starten via video om te vermijden dat we jullie tijd verspillen als wensen niet aansluiten. Wat was de belangrijkste reden dat je liefst direct iemand wou?"`} />
            <AnticipateCard topic="Eerst met partner overleggen" klant={`"Ik moet het eerst met mijn vrouw/man bespreken."`} jij={`"Groot gelijk, jullie moeten er allebei achter staan. Wat dacht je ervan als we de videocall juist plannen op een moment dat jullie allebei thuis zijn?"`} />
          </div>
        </div>

        {/* ═══ NOTITIEBLOK ═══ */}
        <div className="mt-3 bg-white border border-[#DDD5C5]">
          <div className="bg-[#0F1419] text-white px-[14px] py-2 flex items-center justify-between">
            <div className="font-dm text-[11px] font-bold tracking-[0.12em] uppercase flex items-center gap-2">
              <span className="text-[13px]">📝</span> Notitieblok · wat onthou ik uit dit gesprek?
            </div>
            <div className="text-[10.5px] text-white/70 italic">Niet gelinkt aan een fase. De essentie om naar Bram door te geven.</div>
          </div>
          <div className="grid grid-cols-[1.1fr_1.4fr_1.4fr_1fr_1fr]">

            {/* Trigger */}
            <div className="p-[10px_12px_12px_12px] border-r border-[#DDD5C5]">
              <label className="font-dm text-[9.5px] font-bold tracking-[0.12em] uppercase text-[#0F1419] block mb-[3px]">De trigger</label>
              <div className="text-[10px] text-[#5B6470] italic mb-[6px] leading-[1.3]">Waarom belt de klant nu?</div>
              <input type="text" value={data.trigger_text} onChange={e => update({ trigger_text: e.target.value })}
                placeholder="bv. oudste naar middelbaar in september"
                className="w-full border border-[#DDD5C5] bg-[#F8F3EB] px-2 py-[6px] font-body text-[11.5px] text-[#0F1419] focus:outline-none focus:border-[#008CFF] focus:bg-white" />
            </div>

            {/* Citaten */}
            <div className="p-[10px_12px_12px_12px] border-r border-[#DDD5C5]">
              <label className="font-dm text-[9.5px] font-bold tracking-[0.12em] uppercase text-[#0F1419] block mb-[3px]">Letterlijke citaten</label>
              <div className="text-[10px] text-[#5B6470] italic mb-[6px] leading-[1.3]">Exacte woorden — tussen aanhalingstekens</div>
              <ChipInput chips={data.emotional_keywords} onAdd={addEmotionalKeyword} onRemove={removeEmotionalKeyword}
                placeholder="typ en druk op +" accentColor="bg-[#F8F3EB] text-[#0F1419] border-[#DDD5C5] italic text-[10.5px]" />
            </div>

            {/* Twijfels */}
            <div className="p-[10px_12px_12px_12px] border-r border-[#DDD5C5]">
              <label className="font-dm text-[9.5px] font-bold tracking-[0.12em] uppercase text-[#0F1419] block mb-[3px]">Twijfels en zorgen</label>
              <div className="text-[10px] text-[#5B6470] italic mb-[6px] leading-[1.3]">Angsten, slechte ervaringen — ook letterlijk</div>
              <ChipInput chips={data.fomu_concerns} onAdd={addFomuConcern} onRemove={removeFomuConcern}
                placeholder="typ en druk op +" accentColor="bg-[#FFF6E5] text-[#0F1419] border-[#E89F3D] italic text-[10.5px]" />
            </div>

            {/* Buying committee */}
            <div className="p-[10px_12px_12px_12px] border-r border-[#DDD5C5]">
              <label className="font-dm text-[9.5px] font-bold tracking-[0.12em] uppercase text-[#0F1419] block mb-[3px]">Wie beslist mee?</label>
              <div className="text-[10px] text-[#5B6470] italic mb-[6px] leading-[1.3]">Partner, ouders, familie?</div>
              <textarea value={data.buying_committee} onChange={e => update({ buying_committee: e.target.value })}
                placeholder="bv. Joris belt — An moet 100% akkoord zijn over budget"
                className="w-full border border-[#DDD5C5] bg-[#F8F3EB] px-2 py-[6px] font-body text-[11.5px] text-[#0F1419] resize-none min-h-[50px] focus:outline-none focus:border-[#008CFF] focus:bg-white" />
            </div>

            {/* Indruk */}
            <div className="p-[10px_12px_12px_12px]">
              <label className="font-dm text-[9.5px] font-bold tracking-[0.12em] uppercase text-[#0F1419] block mb-[3px]">Algemene indruk</label>
              <div className="text-[10px] text-[#5B6470] italic mb-[6px] leading-[1.3]">Gehaast, rustig, sceptisch, enthousiast?</div>
              <textarea value={data.general_impression} onChange={e => update({ general_impression: e.target.value })}
                placeholder="bv. klonk gehaast, lijkt veel op het bord te hebben"
                className="w-full border border-[#DDD5C5] bg-[#F8F3EB] px-2 py-[6px] font-body text-[11.5px] text-[#0F1419] resize-none min-h-[50px] focus:outline-none focus:border-[#008CFF] focus:bg-white" />
            </div>

          </div>
        </div>

      </div>

      <CloseCallDialog open={showCloseDialog} onClose={() => setShowCloseDialog(false)} onConfirm={handleCloseCall} />
    </div>
  );
}
