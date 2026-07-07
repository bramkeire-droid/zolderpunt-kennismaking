import { useState, useEffect } from 'react';
import { usePreIntake } from '@/contexts/PreIntakeContext';
import { usePreIntakeSave } from '@/hooks/usePreIntakeSave';
import { useCallTimer } from '@/hooks/useCallTimer';
import { supabase } from '@/integrations/supabase/client';
import ChipInput from '@/components/calling/ChipInput';
import CloseCallDialog from '@/components/calling/CloseCallDialog';
import { ArrowLeft, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';


type CallingStep = 'select-lead' | 'calling' | 'wrap-up';

interface LiveCallingProps {
  onGoHome: () => void;
  onGoDossiers: () => void;
  onOpenValidation: (leadId: string, preIntakeId: string) => void;
  initialLeadId?: string | null;
  initialStep?: CallingStep;
}




/* ───────────────────────── MAIN COMPONENT ───────────────────────── */

export default function LiveCalling({ onGoHome, onGoDossiers, onOpenValidation, initialLeadId, initialStep }: LiveCallingProps) {
  const [step, setStep] = useState<CallingStep>(initialStep ?? 'select-lead');
  const { signOut } = useAuth();
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
      const { data: pi } = await supabase.from('pre_intake' as any).select('*').eq('lead_id', initialLeadId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
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
    const endedAt = new Date().toISOString();
    const duration = timer.elapsed;
    update({ call_ended_at: endedAt, call_duration_seconds: duration });
    timer.pause();
    const leadId = await ensureLeadRow();
    // Belangrijk: lead_id + tijden meegeven zodat de pre_intake-row meteen wegschrijft,
    // zonder te wachten op een React re-render.
    await flushSave({
      lead_id: leadId ?? data.lead_id,
      call_ended_at: endedAt,
      call_duration_seconds: duration,
    });
    setShowCloseDialog(false);
    setStep('wrap-up');
  };

  const handleFinishWrapUp = async () => {
    const leadId = await ensureLeadRow();
    // Wrap-up afronden = telefoongesprek is gevoerd → status 'telefoongesprek'
    if (leadId) {
      await supabase.from('leads').update({ status: 'telefoongesprek' }).eq('id', leadId);
    }
    const lockedAt = new Date().toISOString();
    update({ locked_at: lockedAt });
    await flushSave({ lead_id: leadId ?? data.lead_id, locked_at: lockedAt });
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
    const leadId = await ensureLeadRow();
    await flushSave({ lead_id: leadId ?? data.lead_id });
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
          <button onClick={signOut} className="ml-auto p-2 text-[#5B6470] hover:text-[#0F1419] transition-colors" title="Uitloggen">
            <LogOut className="h-4 w-4" />
          </button>
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
        <div className="shrink-0 bg-white border-b border-[#DDD5C5] px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-dm font-extrabold text-[18px] text-[#008CFF] tracking-[-0.02em]">zolderpunt.</span>
            <div className="w-px h-5 bg-[#DDD5C5]" />
            <h1 className="font-dm font-bold text-[14px] text-[#0F1419]">Gesprek afwerken</h1>
            <span className="text-[12px] font-body text-[#5B6470]">
              {leadVoornaam} {leadAchternaam} — {Math.floor((data.call_duration_seconds || 0) / 60)} min
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleBackToDossiers}
              className="h-11 bg-white text-[#0F1419] border-2 border-[#DDD5C5] px-5 font-dm font-semibold text-[14px] tracking-[0.02em] cursor-pointer hover:border-[#0F1419] transition-colors flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Naar dossiers
            </button>
            <button onClick={() => setStep('calling')}
              className="h-11 bg-[#008CFF] text-white border-none px-6 font-dm font-semibold text-[14px] tracking-[0.02em] cursor-pointer hover:bg-[#0070CC] transition-colors flex items-center gap-1.5"
              title="Terug naar live invulscherm">
              <ArrowLeft className="h-4 w-4" /> Terug naar gesprek
            </button>
            <button onClick={signOut} className="p-2 text-[#5B6470] hover:text-[#0F1419] transition-colors" title="Uitloggen">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
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
          <span className="font-dm font-extrabold text-[18px] text-[#008CFF] tracking-[-0.02em]">zolderpunt.</span>
          <div className="w-px h-5 bg-[#DDD5C5]" />
          <span className="font-dm text-[14px] text-[#5B6470] font-semibold tabular-nums">⏱ {timer.formatted}</span>
          <span className="text-[12px] text-[#5B6470] font-dm">Opgeslagen ·</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleBackToDossiers}
            className="h-11 bg-white text-[#0F1419] border-2 border-[#DDD5C5] px-5 font-dm font-semibold text-[14px] tracking-[0.02em] cursor-pointer hover:border-[#0F1419] transition-colors flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Naar dossiers
          </button>
          <button onClick={handleCloseCall}
            className="h-11 bg-[#008CFF] text-white border-none px-6 font-dm font-semibold text-[14px] tracking-[0.02em] cursor-pointer hover:bg-[#0070CC] transition-colors flex items-center gap-1.5">
            Afwerken <ArrowRight className="h-4 w-4" />
          </button>
          <button onClick={signOut} className="p-2 text-[#5B6470] hover:text-[#0F1419] transition-colors" title="Uitloggen">
            <LogOut className="h-4 w-4" />
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
                  <input type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} placeholder="E-mailadres"
                    className="h-[clamp(36px,4.5vh,56px)] px-3 bg-white border-2 border-[#DDD5C5] text-[clamp(13px,1.7vh,20px)] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
                  <input type="text" value={leadTelefoon} onChange={e => setLeadTelefoon(e.target.value)} placeholder="Telefoon"
                    className="h-[clamp(36px,4.5vh,56px)] px-3 bg-white border-2 border-[#DDD5C5] text-[clamp(13px,1.7vh,20px)] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
                  <input type="text" value={leadPartnerNaam} onChange={e => setLeadPartnerNaam(e.target.value)} placeholder="Partner"
                    className="h-[clamp(36px,4.5vh,56px)] px-3 bg-white border-2 border-[#DDD5C5] text-[clamp(13px,1.7vh,20px)] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
                  <input type="text" value={leadAdres} onChange={e => setLeadAdres(e.target.value)} placeholder="Adres"
                    className="h-[clamp(36px,4.5vh,56px)] px-3 bg-white border-2 border-[#DDD5C5] text-[clamp(13px,1.7vh,20px)] font-body font-medium text-[#0F1419] placeholder:text-[#B0A898] focus:outline-none focus:border-[#008CFF]" />
                </div>
              </FieldBlock>

              {/* Planningsknoppen */}
              {(() => {
                const fullName = `${leadVoornaam} ${leadAchternaam}`.trim();
                const params = new URLSearchParams();
                if (fullName) params.set('name', fullName);
                if (leadEmail.trim()) params.set('email', leadEmail.trim());
                const qs = params.toString();
                const videocallUrl = `https://calendly.com/belhouse/zolderpunt-kennismaking-met-jouw-project${qs ? `?${qs}` : ''}`;
                const plaatsbezoekUrl = `https://calendly.com/belhouse/plaatsbezoek-zolderpunt${qs ? `?${qs}` : ''}`;
                const btnCls = "w-full h-[clamp(44px,6vh,64px)] flex items-center justify-center gap-2 bg-[#008CFF] text-white font-dm font-extrabold text-[clamp(12px,1.6vh,18px)] tracking-[0.04em] uppercase hover:bg-[#0070CC] transition-colors";
                return (
                  <div className="grid grid-cols-2 gap-2">
                    <a href={videocallUrl} target="_blank" rel="noopener noreferrer" className={btnCls}>
                      📅 Videocall — Plannen
                    </a>
                    <a href={plaatsbezoekUrl} target="_blank" rel="noopener noreferrer" className={btnCls}>
                      🏠 Plaatsbezoek — Plannen
                    </a>
                  </div>
                );
              })()}

              {/* Vier grote vraagkaders */}
              <div className="grid grid-rows-4 gap-2 flex-1 min-h-0">
                <BigQuestionBox n={1} label="WAT?" placeholder="Wat wil de klant precies? Type ruimte, functie, gewenst resultaat…"
                  value={data.general_impression} onChange={v => update({ general_impression: v })} onEnterFlush={() => flushSave()} />
                <BigQuestionBox n={2} label="WELKE AANNEMER?" placeholder="Wie hebben ze al gecontacteerd? Offertes ontvangen? Ervaringen?"
                  value={data.buying_committee} onChange={v => update({ buying_committee: v })} onEnterFlush={() => flushSave()} />
                <BigQuestionBox n={3} label="WAAROM NU?" placeholder="Trigger: waarom komt dit vandaag op tafel? Deadline, gezin, verhuis…"
                  value={data.trigger_text} onChange={v => update({ trigger_text: v })} onEnterFlush={() => flushSave()} />
                <BigQuestionBox n={4} label="WELK BUDGET?" placeholder="Verwachting? Range? Al iets berekend? Financiering rond?"
                  value={data.quick_notes} onChange={v => update({ quick_notes: v })} onEnterFlush={() => flushSave()} />
              </div>

            </div>
          </div>
        </div>

        {/* ─────── RIGHT: STATISCHE SPIEKKAART — 5 fases, geen scroll ─────── */}
        <div className="bg-[#0F1419] h-full flex flex-col overflow-hidden">
          {[
            {
              n: 1, titel: 'Motivatie blootleggen',
              tekst: 'Laat de klant zelf vertellen wat hem vandaag doet bellen.',
              extra: 'Open vraag: "Waar liep je tegenaan waardoor je dacht: nu is het tijd?" Warm en nieuwsgierig — herhaal sleutelwoorden zacht en zwijg.',
            },
            {
              n: 2, titel: 'Doorvragen op de pijn',
              tekst: 'Laat de klant de urgentie van zijn eigen probleem voelen.',
              extra: 'Vraag naar duur, impact op het dagelijks leven en wat de oplossing zou betekenen. Noteer letterlijk citaten en zorgen.',
            },
            {
              n: 3, titel: 'Videocall framen',
              tekst: 'Positioneer Bram als expert en vraag foto\u2019s en oppervlakte.',
              extra: 'Videocall = bespaart hun tijd, geen verkooppraatje. Foto\u2019s van de huidige toestand (niet opruimen) + ruwe m\u00B2. Vlecht gemeente / eigenaar / type woning terloops door.',
            },
            {
              n: 4, titel: 'Inplannen + afsluiten',
              tekst: 'Zet de afspraak in de agenda en stel daarna de guard-down vraag.',
              extra: 'Prik nu een moment — "verzetten kan altijd". Na het prikken: "Wat wilden jij en je partner zeker nog doornemen?" Daar komt het echte bezwaar.',
            },
            {
              n: 5, titel: 'Bij weerstand',
              tekst: 'Verwijs alles over prijs, timing of haalbaarheid naar de videocall.',
              amber: true,
              extra: '"Logische vraag — daar geeft Bram in de call concreet antwoord op." Geen cijfers of data aan de telefoon. Bevestig de zorg, parkeer ze naar de call.',
            },
          ].map((f, i) => (
            <div
              key={f.n}
              className={`flex-1 min-h-0 flex items-center gap-5 px-7 ${i > 0 ? 'border-t border-white/10' : ''} ${f.amber ? 'bg-[#3a2a10]' : ''}`}
            >
              <div
                className={`font-dm font-extrabold tabular-nums leading-none shrink-0 text-[clamp(44px,8vh,100px)] ${f.amber ? 'text-[#E89F3D]' : 'text-[#008CFF]'}`}
              >
                {f.n}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-dm font-extrabold text-white text-[clamp(18px,2.6vh,32px)] leading-[1.1] tracking-[-0.01em]">
                  {f.titel}
                </div>
                <div className="font-body text-white text-[clamp(13px,1.7vh,20px)] leading-[1.3] mt-[6px]">
                  {f.tekst}
                </div>
                <div className="font-body text-white/65 text-[clamp(11px,1.45vh,17px)] leading-[1.35] mt-[6px]">
                  {f.extra}
                </div>
              </div>
            </div>
          ))}

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



