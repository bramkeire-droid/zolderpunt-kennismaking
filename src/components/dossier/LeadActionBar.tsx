import { X, FolderOpen, Phone, Bot, Image as ImageIcon, Globe, Calculator, FileText, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  lead: any;
  onClose: () => void;
  onOpenDossier: () => void;
  onCall: () => void;
  onIntake: () => void;
  onPhotos: () => void;
  onPortal: () => void;
  onCalculator: () => void;
  onVoorblad: () => void;
  onOfferte: () => void;
}

/**
 * Actiebalk bovenaan het bord: wie op een kaart klikt krijgt hier meteen
 * alles van dat dossier, zonder het bord te verlaten.
 */
export default function LeadActionBar({
  lead, onClose, onOpenDossier, onCall, onIntake, onPhotos, onPortal, onCalculator, onVoorblad, onOfferte,
}: Props) {
  const naam = `${lead.voornaam ?? ''} ${lead.achternaam ?? ''}`.trim() || 'Naamloos dossier';

  const actions = [
    { label: 'Dossier openen', icon: FolderOpen, onClick: onOpenDossier },
    { label: "Foto's", icon: ImageIcon, onClick: onPhotos },
    { label: 'Telefoongesprek', icon: Phone, onClick: onCall },
    { label: 'Intakegesprek', icon: Bot, onClick: onIntake },
    { label: 'Portaal', icon: Globe, onClick: onPortal },
    { label: 'Calculator', icon: Calculator, onClick: onCalculator },
    { label: 'Voorblad', icon: FileText, onClick: onVoorblad },
    { label: 'Offerte & bijlage', icon: Receipt, onClick: onOfferte },
  ];

  return (
    <div className="sticky top-0 z-30 mb-4 bg-card border border-border border-t-4 border-t-primary shadow-sm">
      <div className="flex items-start justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="font-headline font-bold text-foreground leading-tight truncate">{naam}</p>
          <p className="text-xs text-muted-foreground truncate">
            {lead.adres || 'geen adres'}
            {lead.bouwflow_project_number ? ` · #${lead.bouwflow_project_number}` : ''}
          </p>
        </div>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground shrink-0" title="Sluiten">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2 px-4 pb-3">
        {actions.map(a => (
          <Button key={a.label} size="sm" variant="outline" className="gap-1.5 font-headline h-8" onClick={a.onClick}>
            <a.icon className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs">{a.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
