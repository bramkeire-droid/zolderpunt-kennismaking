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
  initialLeadId?: string | null;
  initialStep?: CallingStep;
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

export default function LiveCalling({ onGoHome, onGoDossiers, onOpenValidation, initialLeadId, initialStep }: LiveCallingProps) {
  const [step, setStep] = useState<CallingStep>(initialStep ?? 'select-lead');
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [leadVoornaam, setLeadVoornaam] = useState('');
  const [leadAchternaam, setLeadAchternaam] = useState('');
  const [leadTelefoon, setLeadTelefoon] = useState('');
  const [leadAdres, setLeadAdres] = useState('');
  const [leadPartnerNaam, setLeadPartnerNaam] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [followupType, setFollowupType] = useState<'videocall' | 'klant_terug' | null>(null);
  const [klantTerugNotitie, setKlantTerugNotitie] = useState('');

  const {
    data, update, resetPreIntake, loadPreIntake,
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

  // Open direct uit dossierlijst: laad lead + bestaande pre_intake
  useEffect(() => {
    if (!initialLeadId) return;
    (async () => {
      const { data: lead } = await supabase.from('leads').select('*').eq('id', initialLeadId).maybeSingle();
      if (!lead) return;
      setSelectedLead(lead);
      setLeadVoornaam(lead.voornaam || '');
      setLeadAchternaam(lead.achternaam || '');
      setLeadTelefoon(lead.telefoon || '');
      setLeadAdres(lead.adres || '');
      setLeadPartnerNaam(lead.partner_naam || '');
      setLeadEmail(lead.email || '');
      const { data: pi } = await supabase.from('pre_intake' as any).select('*').eq('lead_id', initialLeadId).maybeSingle();
      if (pi) {
        loadPreIntake(pi as any);
        if (initialStep === 'wrap-up' || (pi as any).locked_at) setStep('wrap-up');
        else setStep('calling');
      } else {
        resetPreIntake(initialLeadId);
        setStep(initialStep ?? 'calling');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLeadId]);

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

  // Nieuwe lead aanmaken: GEEN insert meer — pas later inserten wanneer naam ingevuld is.
  const handleNewLead = async () => {
    const tempLead = { id: undefined, voornaam: '', achternaam: '', email: '', telefoon: '', adres: '', partner_naam: '' };
    setSelectedLead(tempLead);
    setLeadVoornaam('');
    setLeadAchternaam('');
    setLeadTelefoon('');
    setLeadAdres('');
    setLeadPartnerNaam('');
    setLeadEmail('');
    resetPreIntake(undefined);
    update({ call_started_at: new Date().toISOString() });
    timer.start();
    setStep('calling');
  };

  /** Zorg dat er een lead-row bestaat (insert indien nodig met dubbel-detectie). Retourneert lead id of null. */
  const ensureLeadRow = async (): Promise<string | null> => {
    if (selectedLead?.id) {
      // Update bestaande
      await supabase.from('leads').update({ voornaam: leadVoornaam, achternaam: leadAchternaam, telefoon: leadTelefoon, adres: leadAdres, partner_naam: leadPartnerNaam, email: leadEmail }).eq('id', selectedLead.id);
      return selectedLead.id;
    }
    if (!leadVoornaam.trim() && !leadAchternaam.trim() && !leadEmail.trim() && !leadTelefoon.trim()) {
      return null; // niets om op te slaan
    }
    // Dubbel-detectie op email/telefoon
    const orParts: string[] = [];
    if (leadEmail.trim()) orParts.push(`email.eq.${leadEmail.trim()}`);
    if (leadTelefoon.trim()) orParts.push(`telefoon.eq.${leadTelefoon.trim()}`);
    let existingId: string | null = null;
    if (orParts.length > 0) {
      const { data: existing } = await supabase.from('leads').select('id').or(orParts.join(',')).limit(1).maybeSingle();
      if (existing?.id) existingId = existing.id;
    }
    if (existingId) {
      const ok = window.confirm('Er bestaat al een dossier met dit e-mailadres of telefoonnummer. Bestaand dossier overschrijven en samenvoegen?');
      if (ok) {
        await supabase.from('leads').update({ voornaam: leadVoornaam, achternaam: leadAchternaam, telefoon: leadTelefoon, adres: leadAdres, partner_naam: leadPartnerNaam, email: leadEmail }).eq('id', existingId);
        setSelectedLead((prev: any) => ({ ...prev, id: existingId }));
        update({ lead_id: existingId });
        return existingId;
      }
    }
    const { data: newRow, error } = await supabase.from('leads').insert({
      voornaam: leadVoornaam, achternaam: leadAchternaam, telefoon: leadTelefoon, adres: leadAdres, partner_naam: leadPartnerNaam, email: leadEmail, status: 'nieuw',
    }).select('id').single();
    if (error || !newRow) { toast.error('Aanmaken dossier mislukt'); return null; }
    setSelectedLead((prev: any) => ({ ...prev, id: newRow.id }));
    update({ lead_id: newRow.id });
    return newRow.id;
  };

  const handleCloseCall = async () => {
    update({ call_ended_at: new Date().toISOString(), call_duration_seconds: timer.elapsed });
    timer.pause();
    await ensureLeadRow();
    await flushSave();
    setShowCloseDialog(false);
    setStep('wrap-up');
  };

  const handleFinishWrapUp = async () => {
    const leadId = await ensureLeadRow();
    // Wrap-up afronden = telefoongesprek is gevoerd → status 'telefoongesprek'
    if (leadId) {
      await supabase.from('leads').update({ status: 'telefoongesprek' }).eq('id', leadId);
    }
    update({ locked_at: new Date().toISOString() });
    await flushSave();
    toast.success('Dossier opgeslagen');
    if (leadId && data.id) {
      onOpenValidation(leadId, data.id);
    } else {
      onGoDossiers();
    }
  };

  /** Terug-knop: bij ingevulde naam+email vraag om op te slaan, anders direct terug zonder lege rij. */
  const handleBackToDossiers = async () => {
    const heeftMinimum = !!(leadVoornaam.trim() || leadAchternaam.trim()) && !!leadEmail.trim();
    if (heeftMinimum) {
      setShowBackConfirm(true);
    } else {
      // niets noemenswaardig ingevuld — gewoon weg, géén lege rij achterlaten
      onGoDossiers();
    }
  };

  const confirmBackSave = async () => {
    await ensureLeadRow();
    await flushSave();
    toast.success('Dossier bewaard');
    setShowBackConfirm(false);
    onGoDossiers();
  };

  const confirmBackDiscard = () => {
    setShowBackConfirm(false);
    onGoDossiers();
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
        <div className="h-14 bg-white border-b border-[#DDD5C5] flex items-center px-6 shrink-0 gap-3">
          <button onClick={handleBackToDossiers} className="flex items-center gap-2 text-sm font-dm text-[#5B6470] hover:text-[#0F1419]">
            <ArrowLeft className="h-4 w-4" /> Naar dossiers
          </button>
          <div className="w-px h-5 bg-[#DDD5C5]" />
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

            {/* Opvolging — kies scenario */}
            <section className="space-y-3">
              <h2 className="font-dm text-[9px] font-bold text-[#5B6470] uppercase tracking-[0.14em]">Opvolging</h2>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setFollowupType('videocall')}
                  className={`h-14 px-4 border-2 font-dm font-bold text-[14px] transition-colors ${followupType === 'videocall' ? 'bg-[#008CFF] text-white border-[#008CFF]' : 'bg-white text-[#0F1419] border-[#DDD5C5] hover:border-[#008CFF]/50'}`}>
                  📅 Videocall ingepland
                </button>
                <button type="button" onClick={() => { setFollowupType('klant_terug'); update({ videocall_scheduled_at: null }); }}
                  className={`h-14 px-4 border-2 font-dm font-bold text-[14px] transition-colors ${followupType === 'klant_terug' ? 'bg-[#E89F3D] text-white border-[#E89F3D]' : 'bg-white text-[#0F1419] border-[#DDD5C5] hover:border-[#E89F3D]/50'}`}>
                  📞 Klant neemt zelf contact op
                </button>
              </div>

              {followupType === 'videocall' && (
                <div className="space-y-3 pt-2">
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
                  {data.videocall_scheduled_at && leadEmail && (() => {
                    const dt = new Date(data.videocall_scheduled_at!);
                    const dag = dt.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
                    const uur = dt.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
                    const meetLine = data.google_meet_link ? `\n${data.google_meet_link}\n` : '';
                    const naam = leadPartnerNaam.trim() ? `${leadVoornaam} en ${leadPartnerNaam}` : leadVoornaam;
                    const subject = `Bevestiging videocall ${dag} om ${uur} — Zolderpunt`;
                    const body = `Hi ${naam},\n\nBij deze bevestig ik graag onze videocall op ${dag} om ${uur}.${meetLine}\nOm ons gesprek goed te kunnen voorbereiden, mogen jullie mij vooraf gerust al even volgende zaken bezorgen:\n\n• Enkele foto's die de huidige toestand van de zolder goed weergeven\n• Een ruwe inschatting van de oppervlakte van de zolder\n• Indien er een nieuwe vaste trap naar de zolder nodig is: graag ook enkele foto's of een korte toelichting van de verdieping onder de zolder. Zo krijgen we een beter beeld van waar jullie de trap eventueel zien komen, via welke ruimte dit zou gebeuren en welke ruimte daarvoor mogelijk opgeofferd wordt.\n\nDe foto's en informatie mogen eenvoudig doorgestuurd worden via WhatsApp of mail, afhankelijk van wat voor jullie het gemakkelijkst werkt.\n+32 492 400 954\n\nIk kijk ernaar uit om jullie project verder samen te bekijken. Tot dan!\n\nPositieve groeten,`;
                    const mailto = `mailto:${leadEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    return (
                      <a href={mailto} onClick={(e) => { e.preventDefault(); window.location.href = mailto; }}
                        className="w-full h-12 flex items-center justify-center bg-[#2E7D38] text-white font-dm font-bold text-[14px] hover:bg-[#256B2E] transition-colors">
                        Open bevestigingsmail
                      </a>
                    );
                  })()}
                  {data.videocall_scheduled_at && !leadEmail && (
                    <p className="text-xs font-body text-[#E89F3D] italic">Vul een e-mailadres in om de bevestigingsmail te openen.</p>
                  )}
                </div>
              )}

              {followupType === 'klant_terug' && (
                <textarea value={klantTerugNotitie} onChange={e => { setKlantTerugNotitie(e.target.value); update({ quick_notes: e.target.value }); }}
                  placeholder="Wanneer + context — bv. klant belt volgende week vrijdag na overleg met partner"
                  className="w-full h-24 px-4 py-3 bg-white border-2 border-[#DDD5C5] text-[14px] font-body text-[#0F1419] placeholder:text-[#B0A898] resize-none focus:outline-none focus:border-[#E89F3D]" />
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
        <BackConfirmDialog open={showBackConfirm} onCancel={() => setShowBackConfirm(false)} onDiscard={confirmBackDiscard} onSave={confirmBackSave} />
      </div>
    );
  }

  /* ─── LIVE CALLING — workspace-first layout ─── */
  return (
    <div className="h-screen flex flex-col bg-[#F8F3EB] text-[13px] leading-[1.4] font-body text-[#0F1419] overflow-hidden">

      {/* ═══ TOPBAR ═══ */}
      <div className="shrink-0 bg-white border-b border-[#DDD5C5] px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={handleBackToDossiers} className="flex items-center gap-1.5 text-[13px] font-dm text-[#5B6470] hover:text-[#0F1419]">
            <ArrowLeft className="h-4 w-4" /> Naar dossiers
          </button>
          <div className="w-px h-5 bg-[#DDD5C5]" />
          <span className="font-dm font-extrabold text-[18px] text-[#008CFF] tracking-[-0.02em]">zolderpunt.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-dm text-[14px] text-[#5B6470] font-semibold tabular-nums">⏱ {timer.formatted}</span>
          <span className="text-[12px] text-[#5B6470] font-dm">Opgeslagen ·</span>
          <button onClick={() => setShowCloseDialog(true)}
            className="h-11 bg-[#008CFF] text-white border-none px-6 font-dm font-semibold text-[14px] tracking-[0.02em] cursor-pointer hover:bg-[#0070CC] transition-colors">
            Sluit gesprek af →
          </button>
        </div>
      </div>

      {/* ═══ TWO-COLUMN WORKSPACE ═══ */}
      <div className="flex-1 grid grid-cols-[1.85fr_1fr] min-h-0">

        {/* ─────── LEFT: NOTITIEBLOK (hoofdwerkvlak) — past binnen viewport ─────── */}
        <div className="overflow-hidden bg-[#FFFCF5] border-r-2 border-[#DDD5C5] min-h-0">
          <div className="px-6 py-4 max-w-[1100px] mx-auto h-full flex flex-col min-h-0">

            <div className="flex items-baseline gap-3 mb-1 shrink-0">
              <span className="text-[clamp(14px,1.8vh,22px)]">📝</span>
              <h2 className="font-dm text-[clamp(16px,2.4vh,28px)] font-bold text-[#0F1419] tracking-[-0.01em]">Notitieblok</h2>
              <span className="text-[clamp(11px,1.4vh,16px)] text-[#5B6470] italic">Wat onthou ik uit dit gesprek?</span>
            </div>
            <p className="text-[clamp(11px,1.3vh,15px)] text-[#5B6470] mb-3 shrink-0">De essentie om straks naar Bram door te geven. <strong>Hier ligt je focus tijdens het gesprek.</strong></p>

            <div className="flex flex-col gap-3 flex-1 min-h-0">

              {/* Klantgegevens */}
              <FieldBlock label="Klantgegevens" hint="Vul aan tijdens of vlak na het gesprek">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={leadVoornaam} onChange={e => setLeadVoornaam(e.target.value)} placeholder="Voornaam"
                    className="h-[clamp(36px,4.5vh,56px)] px-3 bg-white border-2 border-[#DDD5C5] text-[clamp(13px,1.7vh,20px)] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
                  <input type="text" value={leadAchternaam} onChange={e => setLeadAchternaam(e.target.value)} placeholder="Achternaam"
                    className="h-[clamp(36px,4.5vh,56px)] px-3 bg-white border-2 border-[#DDD5C5] text-[clamp(13px,1.7vh,20px)] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
                  <input type="text" value={leadTelefoon} onChange={e => setLeadTelefoon(e.target.value)} placeholder="Telefoon"
                    className="h-[clamp(36px,4.5vh,56px)] px-3 bg-white border-2 border-[#DDD5C5] text-[clamp(13px,1.7vh,20px)] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
                  <input type="text" value={leadPartnerNaam} onChange={e => setLeadPartnerNaam(e.target.value)} placeholder="Partner"
                    className="h-[clamp(36px,4.5vh,56px)] px-3 bg-white border-2 border-[#DDD5C5] text-[clamp(13px,1.7vh,20px)] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
                </div>
                <input type="text" value={leadAdres} onChange={e => setLeadAdres(e.target.value)} placeholder="Adres"
                  className="w-full h-[clamp(36px,4.5vh,56px)] px-3 mt-2 bg-white border-2 border-[#DDD5C5] text-[clamp(13px,1.7vh,20px)] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
              </FieldBlock>

              {/* Trigger */}
              <FieldBlock label="De trigger" hint="Waarom belt de klant nu?">
                <input type="text" value={data.trigger_text} onChange={e => update({ trigger_text: e.target.value })}
                  placeholder="bv. oudste naar middelbaar in september"
                  className="w-full h-[clamp(40px,5vh,60px)] px-4 bg-white border-2 border-[#DDD5C5] text-[clamp(14px,1.8vh,22px)] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
              </FieldBlock>

              {/* Citaten */}
              <FieldBlock label="Letterlijke citaten" hint="Exacte woorden — tussen aanhalingstekens">
                <div className="bg-white border-2 border-[#DDD5C5] p-3 min-h-[clamp(56px,7vh,90px)] focus-within:border-[#008CFF]">
                  <ChipInput chips={data.emotional_keywords} onAdd={addEmotionalKeyword} onRemove={removeEmotionalKeyword}
                    placeholder="typ een citaat en druk op +"
                    accentColor="bg-[#F8F3EB] text-[#0F1419] border-[#DDD5C5] italic text-[clamp(12px,1.5vh,16px)]" />
                </div>
              </FieldBlock>

              {/* Twijfels */}
              <FieldBlock label="Twijfels en zorgen" hint="Angsten, slechte ervaringen — ook letterlijk">
                <div className="bg-white border-2 border-[#DDD5C5] p-3 min-h-[clamp(56px,7vh,90px)] focus-within:border-[#008CFF]">
                  <ChipInput chips={data.fomu_concerns} onAdd={addFomuConcern} onRemove={removeFomuConcern}
                    placeholder="typ een zorg en druk op +"
                    accentColor="bg-[#FFF6E5] text-[#0F1419] border-[#E89F3D] italic text-[clamp(12px,1.5vh,16px)]" />
                </div>
              </FieldBlock>

              {/* Buying committee */}
              <FieldBlock label="Wie beslist mee?" hint="Partner, ouders, familie?">
                <textarea value={data.buying_committee} onChange={e => update({ buying_committee: e.target.value })}
                  placeholder="bv. Joris belt — An moet 100% akkoord zijn over budget"
                  className="w-full px-4 py-2 bg-white border-2 border-[#DDD5C5] text-[clamp(13px,1.6vh,20px)] font-body text-[#0F1419] placeholder:text-[#B0A898] resize-none h-[clamp(60px,8vh,110px)] focus:outline-none focus:border-[#008CFF]" />
              </FieldBlock>

              {/* Indruk — vult resterende ruimte */}
              <div className="flex flex-col flex-1 min-h-0">
                <label className="font-dm text-[clamp(13px,1.6vh,20px)] font-semibold text-[#0F1419] block mb-[2px]">Algemene indruk</label>
                <div className="text-[clamp(11px,1.3vh,15px)] text-[#5B6470] italic mb-1">Gehaast, rustig, sceptisch, enthousiast?</div>
                <textarea value={data.general_impression} onChange={e => update({ general_impression: e.target.value })}
                  placeholder="bv. klonk gehaast, lijkt veel op het bord te hebben"
                  className="w-full flex-1 min-h-0 px-4 py-2 bg-white border-2 border-[#DDD5C5] text-[clamp(13px,1.6vh,20px)] font-body text-[#0F1419] placeholder:text-[#B0A898] resize-none focus:outline-none focus:border-[#008CFF]" />
              </div>

            </div>
          </div>
        </div>

        {/* ─────── RIGHT: SCRIPT RAIL ─────── */}
        <div className="overflow-y-auto bg-[#F8F3EB]">
          <div className="p-4 space-y-2">

            <div className="px-1 pb-2 flex items-center gap-2">
              <span className="font-dm text-[10px] font-bold tracking-[0.14em] uppercase text-[#5B6470]">Gespreksgids</span>
              <span className="text-[10.5px] text-[#B0A898] italic">— referentie, klik om te openen</span>
            </div>

            {/* FASE 1 */}
            <ScriptPhase fase="Fase 1" tijd="1–2 min" titel="Motivatie blootleggen" doel="Ontdek waarom de klant vandaag belt." defaultOpen>
              <QCard
                label="Openingsvraag"
                question={`"Waar liep je in huis precies tegenaan waardoor je dacht: 'nu is het tijd om die zolder aan te pakken'?"`}
                why="Open vraag laat de klant zélf het probleem benoemen — niet jij."
                toon="Warm, nieuwsgierig. Geen Amerikaans enthousiasme."
                variant={`"Mag ik vragen wat je precies hoopt te bereiken met die extra ruimte?"`}
              />
              <TipCard label="Tip · Mirroring" text={`Klant zegt <em>"frustrerend"</em>. Jij zacht: <em>"frustrerend...?"</em> en zwijg. De klant vertelt vanzelf meer.`} />
              <TipCard label="Tip · 80/20-regel" text="Klant praat 90% van de tijd. Jij stelt vragen en luistert." />
            </ScriptPhase>

            {/* FASE 2 */}
            <ScriptPhase fase="Fase 2" tijd="2–3 min" titel="Doorvragen op de pijn" doel="Laat de klant onbewust de urgentie van eigen probleem voelen.">
              <QCard label="Duur-vraag" question={`"Hoe lang speelt dat eigenlijk al?"`} why="De klant beseft zelf hoe lang ze rondlopen met de frustratie." />
              <QCard label="Impact-vraag" question={`"Heeft dat veel impact op hoe jullie het huis nu kunnen gebruiken?"`} toon="Rustig, lichtbezorgd. Laat een pauze vallen na de vraag." />
              <QCard label="Verduidelijking" question={`"Op welke manier bedoel je dat precies? Kan je een voorbeeld geven?"`} why="Onder vage antwoorden zit de échte motivatie." />
              <QCard label="Resultaat-vraag" question={`"Stel dat we dit helemaal naar wens kunnen oplossen — wat zou die ruimte voor jullie betekenen?"`} why="Verlegt focus van prijs naar waarde." />
              <QCard label="Echte zorgen" question={`"Wat zijn jullie grootste vragen of bezorgdheden rond zo'n zolderrenovatie?"`} why={`Detecteert hun angst om "gepakt" te worden. Noteer letterlijk.`} />
            </ScriptPhase>

            {/* FASE 3 */}
            <ScriptPhase fase="Fase 3" tijd="2–3 min" titel="Videocall framen + deliverables" doel="Videocall als voordeel positioneren. Foto's + oppervlakte vragen.">
              <QCard
                label="Framing van de videocall"
                question={`"Om jullie concrete antwoorden te geven op budget, timing, duur en haalbaarheid, plannen we eerst een korte videocall in met Bram, onze zolderexpert."`}
                why="Positioneer Bram als expert. Videocall bespaart hún tijd."
              />
              <DeliverableCard label="Deliverable 1 · Foto's" text={`Bram maakt tijdens de call een eerste kostenraming. Foto's van de zolder zoals ze er nu bij ligt — <em>niet opruimen</em>.`} />
              <DeliverableCard label="Deliverable 2 · Oppervlakte" text="Een ruwe oppervlakte van de vloer — zelf opmeten volstaat." />
              <QCard
                label="De tijdsvraag · bepaalt videocall-datum"
                question={`"Wanneer denken jullie dat realistisch te kunnen doen?"`}
                why={`"Realistisch" geeft toestemming om eerlijk te zijn.`}
              />
              <TipCard label="Tip · Verstop kwalificatie hierin" text="Stel terloops: gemeente? Eigenaar of in aankoop? Type woning? Geen checklist — gewoon doorvlechten." />
            </ScriptPhase>

            {/* FASE 4 */}
            <ScriptPhase fase="Fase 4" tijd="1–2 min" titel="Inplannen + afsluiten" doel="Videocall in agenda. Guard-Down vraag. Warm afsluiten.">
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
              <QCard label={`Als de klant "ik bel u nog terug" zegt`} question={`"Mijn ervaring leert dat zo'n terugbel-afspraak vaak verloren gaat. Veel handiger als we nu een moment in de agenda zetten — verzetten kan altijd."`} />
              <QCard label="Guard-Down vraag · pas NÁ het prikken" question={`"Helemaal goed, de videocall staat. Nog even voor ik je laat gaan: wat wilden jij en je partner zeker nog doornemen?"`} why="Afspraak staat, verdediging zakt. Hier komt het echte bezwaar." />
              <QCard label="Warme afsluiter" question={`"Super, dan zorg ik dat Bram perfect voorbereid is. Fijne dag nog!"`} />
            </ScriptPhase>

            {/* ANTICIPATIE */}
            <ScriptPhase fase="⚠ Anticipatie" tijd="" titel="Wat als de klant deze vragen stelt?" doel="Snelle antwoorden bij weerstand." accent="amber">
              <div className="space-y-2">
                <AnticipateCard topic="Wat kost het ongeveer?" klant={`"Wat kost zo'n zolderrenovatie?"`} jij={`"Logische vraag. Een prijs hangt af van oppervlakte, toestand, indeling... Daarom rekent Bram dit in de videocall voor jullie uit."`} />
                <AnticipateCard topic="Wanneer kunnen jullie starten?" klant={`"Wanneer kan dat starten?"`} jij={`"Heel logisch — een van de eerste dingen die Bram met jullie doorneemt. Concrete data noemen aan de telefoon doen we bewust niet."`} />
                <AnticipateCard topic="Hoeveel overlast?" klant={`"Hoeveel overlast brengt dat mee?"`} jij={`"Bram bespreekt standaard hoe het verloop er praktisch uitziet — zodat je vooraf weet waar je aan toe bent."`} />
                <AnticipateCard topic="Is ons idee haalbaar?" klant={`"Kan onze indeling wel?"`} jij={`"Daar gaat Bram in de call concreet antwoord op geven. Op basis van de foto's en oppervlakte kan hij al inschatten wat haalbaar is."`} />
                <AnticipateCard topic="Stuur iemand langs" klant={`"Stuur gewoon iemand langs."`} jij={`"Begrijp ik. We starten via video om te vermijden dat we jullie tijd verspillen als wensen niet aansluiten."`} />
                <AnticipateCard topic="Eerst met partner overleggen" klant={`"Ik moet het eerst met mijn vrouw/man bespreken."`} jij={`"Groot gelijk. Wat dacht je ervan als we de videocall juist plannen op een moment dat jullie allebei thuis zijn?"`} />
              </div>
            </ScriptPhase>

          </div>
        </div>
      </div>

      <CloseCallDialog open={showCloseDialog} onClose={() => setShowCloseDialog(false)} onConfirm={handleCloseCall} />
      <BackConfirmDialog open={showBackConfirm} onCancel={() => setShowBackConfirm(false)} onDiscard={confirmBackDiscard} onSave={confirmBackSave} />
    </div>
  );
}

function BackConfirmDialog({ open, onCancel, onDiscard, onSave }: { open: boolean; onCancel: () => void; onDiscard: () => void; onSave: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-[#DDD5C5] shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-headline font-bold text-[#0F1419] mb-2">Dossier opslaan?</h3>
        <p className="text-sm font-body text-[#5B6470] mb-5">Je hebt al gegevens ingevuld. Wil je dit dossier opslaan voordat je terug gaat?</p>
        <div className="flex flex-col gap-2">
          <button onClick={onSave} className="h-11 px-4 bg-[#008CFF] text-white font-headline font-semibold text-sm hover:bg-[#0070CC]">Opslaan en terug</button>
          <button onClick={onDiscard} className="h-11 px-4 bg-white text-[#0F1419] border border-[#DDD5C5] font-headline font-semibold text-sm hover:bg-[#F8F3EB]">Niet opslaan, terug</button>
          <button onClick={onCancel} className="h-9 text-[12px] font-body text-[#5B6470] hover:text-[#0F1419]">Annuleer</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── HELPER COMPONENTS ───────────────────────── */

function FieldBlock({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-dm text-[clamp(13px,1.6vh,20px)] font-semibold text-[#0F1419] block mb-[2px]">{label}</label>
      <div className="text-[clamp(11px,1.3vh,15px)] text-[#5B6470] italic mb-1">{hint}</div>
      {children}
    </div>
  );
}

function ScriptPhase({
  fase, tijd, titel, doel, children, defaultOpen = false, accent = 'blue',
}: {
  fase: string; tijd: string; titel: string; doel: string;
  children: React.ReactNode; defaultOpen?: boolean; accent?: 'blue' | 'amber';
}) {
  const headerBg = accent === 'amber' ? 'bg-[#E89F3D]' : 'bg-white';
  const headerText = accent === 'amber' ? 'text-white' : 'text-[#0F1419]';
  const stripe = accent === 'amber' ? 'border-l-[#E89F3D]' : 'border-l-[#008CFF]';
  const tag = accent === 'amber' ? 'text-white/85' : 'text-[#008CFF]';
  return (
    <details open={defaultOpen} className={`group bg-white border border-[#DDD5C5] border-l-[3px] ${stripe} open:shadow-sm`}>
      <summary className={`${headerBg} ${headerText} list-none cursor-pointer px-3 py-[10px] flex items-center justify-between gap-3 select-none`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`font-dm text-[9.5px] font-bold tracking-[0.14em] uppercase ${tag}`}>{fase}</span>
            {tijd && <span className="font-dm text-[9.5px] font-medium opacity-70">{tijd}</span>}
          </div>
          <div className="font-dm text-[13.5px] font-bold leading-[1.2] tracking-[-0.01em] truncate">{titel}</div>
          <div className={`text-[10.5px] mt-[1px] truncate ${accent === 'amber' ? 'text-white/85' : 'text-[#5B6470]'}`}>{doel}</div>
        </div>
        <svg className="w-4 h-4 shrink-0 transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor"><path d="M7 5l6 5-6 5V5z" /></svg>
      </summary>
      <div className="p-[10px] border-t border-[#DDD5C5]">
        {children}
      </div>
    </details>
  );
}

