import { useEffect, useState } from 'react';
import { FolderOpen, Phone, Bot, Image as ImageIcon, Globe, Calculator, FileText, Receipt, X, MessagesSquare, MessageCircle } from 'lucide-react';
import DossierChatPanel from '@/components/communicatie/DossierChatPanel';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import PhotoUploadDialog from '@/components/dossier/PhotoUploadDialog';
import PrijscalculatorDialog from '@/components/dossier/PrijscalculatorDialog';
import type { CalculatieBron } from '@/lib/calculaties';
import GenericVoorbladDialog from '@/components/dossier/GenericVoorbladDialog';
import OffertebijlageDialog from '@/components/dossier/OffertebijlageDialog';
import PortalManageDialog from '@/components/portal/PortalManageDialog';
import PortalPreview from '@/components/portal/PortalPreview';

type DialogKey = 'fotos' | 'portaal' | 'calculator' | 'voorblad' | 'offerte' | 'chat' | null;

interface Props {
  /** Dossier waarvoor de acties gelden. */
  leadId: string;
  /** Waar deze balk staat; bepaalt hoe een calculatie in de historiek heet. */
  bron?: CalculatieBron;
  /** Welk tabblad nu open staat, zodat je ziet waar je zit. */
  actief?: 'dossier' | 'communicatie' | 'calling' | 'intake';
  /** Terug naar de hoofdpagina van dit dossier. */
  onOpenDossier?: (leadId: string) => void;
  /** Telefoongesprek openen voor dit dossier. */
  onCall: (leadId: string) => void;
  /** Videocall-intake starten voor dit dossier. */
  onIntake: (leadId: string) => void;
  /** Communicatiepagina openen (mails, calls, beslissingen uit Mail-CRM). Optioneel
   *  zodat bestaande aanroepplekken zonder wijziging blijven werken. */
  onCommunicatie?: (leadId: string) => void;
  /** Het dossier sluiten (kruisje rechts). */
  onSluit: () => void;
}

/**
 * Vaste actiebalk bovenaan een geopend dossier: alles van dat dossier binnen
 * handbereik zonder de pagina te verlaten. Foto's, portaal, calculator,
 * voorblad en offerte openen als dialoog; gesprek en intake navigeren.
 */
export default function DossierActionsBar({ leadId, bron = 'los', actief, onOpenDossier, onCall, onIntake, onCommunicatie, onSluit }: Props) {

  const [lead, setLead] = useState<any | null>(null);
  const [dialog, setDialog] = useState<DialogKey>(null);
  const [portalPreview, setPortalPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from('leads').select('*').eq('id', leadId).maybeSingle();
      if (!cancelled) setLead(data ?? null);
    };
    void load();
    return () => { cancelled = true; };
  }, [leadId]);

  const patchLead = (_id: string, patch: Record<string, any>) =>
    setLead((prev: any) => (prev ? { ...prev, ...patch } : prev));

  const herlaadLead = async () => {
    const { data } = await supabase.from('leads').select('*').eq('id', leadId).maybeSingle();
    if (data) setLead(data);
  };

  if (!lead) return null;

  const naam = `${lead.voornaam ?? ''} ${lead.achternaam ?? ''}`.trim() || 'Naamloos dossier';

  const actions: { label: string; icon: any; onClick: () => void; tab?: Props['actief'] }[] = [
    ...(onCommunicatie
      ? [{ label: 'Communicatie', icon: MessagesSquare, onClick: () => onCommunicatie(leadId), tab: 'communicatie' as const }]
      : []),
    { label: "Foto's", icon: ImageIcon, onClick: () => setDialog('fotos') },
    { label: 'Telefoongesprek', icon: Phone, onClick: () => onCall(leadId), tab: 'calling' },
    { label: 'Intakegesprek', icon: Bot, onClick: () => onIntake(leadId), tab: 'intake' },
    { label: 'Portaal', icon: Globe, onClick: () => setDialog('portaal') },
    { label: 'Calculator', icon: Calculator, onClick: () => setDialog('calculator') },
    { label: 'Voorblad', icon: FileText, onClick: () => setDialog('voorblad') },
    { label: 'Offerte & bijlage', icon: Receipt, onClick: () => setDialog('offerte') },
  ];

  return (
    <>
      <div className="shrink-0 bg-card border-b border-border">
        <div className="flex items-center gap-3 flex-wrap px-4 py-2">
          {/* De naam is de weg terug: vanuit elk tabblad één klik naar de hoofdpagina. */}
          <button
            onClick={() => onOpenDossier?.(leadId)}
            disabled={!onOpenDossier}
            title="Naar de hoofdpagina van dit dossier"
            className={`flex items-center gap-2 min-w-0 mr-2 rounded px-2 py-1 -ml-2 text-left transition-colors ${
              actief === 'dossier' ? 'bg-primary/10' : onOpenDossier ? 'hover:bg-muted' : ''
            }`}
          >
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-headline font-bold text-sm text-foreground leading-tight truncate">{naam}</p>
              {(lead.adres || lead.bouwflow_project_number) && (
                <p className="text-[11px] text-muted-foreground truncate">
                  {lead.adres || 'geen adres'}
                  {lead.bouwflow_project_number ? ` · #${lead.bouwflow_project_number}` : ''}
                </p>
              )}
            </div>
          </button>

          {actions.map(a => (
            <Button
              key={a.label}
              size="sm"
              variant="outline"
              className={`gap-1.5 font-headline h-8 ${
                a.tab && a.tab === actief ? 'border-primary bg-primary/10 text-primary' : ''
              }`}
              onClick={a.onClick}
            >
              <a.icon className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs">{a.label}</span>
            </Button>
          ))}


          {/* Teamchat rechts uitgelijnd: intern werkoverleg over dit dossier (Sprint 3). */}
          <Button size="sm" variant="outline" className="gap-1.5 font-headline h-8 ml-auto" onClick={() => setDialog('chat')}>
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs">Teamchat</span>
          </Button>
          <button onClick={onSluit} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Dossier sluiten">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <DossierChatPanel
        leadId={leadId}
        dossierNaam={naam}
        open={dialog === 'chat'}
        onClose={() => setDialog(null)}
      />
      {dialog === 'fotos' && (
        <PhotoUploadDialog open onClose={() => setDialog(null)} lead={lead} onUpdate={patchLead} />
      )}
      {dialog === 'portaal' && (
        <PortalManageDialog
          open
          onClose={() => setDialog(null)}
          lead={lead}
          onUpdate={patchLead}
          onPreview={() => { setDialog(null); setPortalPreview(true); }}
        />
      )}
      {portalPreview && <PortalPreview lead={lead} onClose={() => setPortalPreview(false)} />}
      {dialog === 'calculator' && (
        <PrijscalculatorDialog
          lead={lead}
          bron={bron}
          onOpenChange={(open) => { if (!open) setDialog(null); }}
          onSaved={herlaadLead}
        />
      )}
      {dialog === 'voorblad' && (
        <GenericVoorbladDialog open onClose={() => setDialog(null)} lead={lead} />
      )}
      {dialog === 'offerte' && (
        <OffertebijlageDialog open onClose={() => setDialog(null)} lead={lead} onUpdate={patchLead} />
      )}
    </>
  );
}
