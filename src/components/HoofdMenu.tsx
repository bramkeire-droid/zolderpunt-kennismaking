import { useState } from 'react';
import {
  Menu, FilePlus2, Phone, Video, FolderOpen, Truck, Settings, LogOut, X, Home,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAppNav } from '@/contexts/AppNavContext';
import logoBlauw from '@/assets/logo-blauw.svg';

/**
 * Dé navigatieknop van de app. Alles wat vroeger als losse tab, dropdown of
 * chip in drie verschillende kopbalken stond, zit hier gegroepeerd.
 */
export default function HoofdMenu() {
  const [open, setOpen] = useState(false);
  const nav = useAppNav();
  const { signOut, user } = useAuth();
  const { isAdmin } = useIsAdmin();

  if (!nav) return null;

  const kies = (fn?: () => void) => () => { setOpen(false); fn?.(); };

  const groepTitel = (t: string) => (
    <p className="px-3 pt-4 pb-1 text-[11px] font-headline font-bold uppercase tracking-wider text-muted-foreground">
      {t}
    </p>
  );

  const item = (
    label: string,
    Icon: any,
    onClick: () => void,
    opts?: { hint?: string; actief?: boolean },
  ) => (
    <button
      key={label}
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
        opts?.actief ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
      }`}
    >
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${opts?.actief ? 'text-primary' : 'text-muted-foreground'}`} />
      <span className="min-w-0">
        <span className="block text-sm font-headline font-semibold truncate">{label}</span>
        {opts?.hint && <span className="block text-xs text-muted-foreground truncate">{opts.hint}</span>}
      </span>
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="flex items-center gap-2 px-2 py-2 -ml-2 text-foreground hover:bg-muted transition-colors"
          title="Menu"
          aria-label="Menu openen"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[320px] p-0 flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <img src={logoBlauw} alt="Zolderpunt" className="h-7 w-auto" />
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          {groepTitel('Nieuw')}
          {item('Leeg dossier', FilePlus2, kies(nav.onNewDossier), { hint: 'Enkel klantgegevens registreren' })}
          {item('Telefoongesprek', Phone, kies(nav.onNewCall), { hint: 'Bellen en meteen noteren' })}
          {item('Videocall intake', Video, kies(nav.onNewIntake), { hint: 'Volledig intakegesprek doorlopen' })}

          {groepTitel('Werken')}
          {item('Start', Home, kies(nav.onGoHome), { actief: nav.huidigeView === 'start' })}
          {item('Dossiers', FolderOpen, kies(nav.onGoDossiers), { actief: nav.huidigeView === 'dossiers' })}
          {item('Leveranciers', Truck, kies(nav.onGoLeveranciers), { actief: nav.huidigeView === 'leveranciers' })}
          {isAdmin && item('Beheer', Settings, kies(nav.onGoBeheer), { actief: nav.huidigeView === 'beheer' })}

          {nav.actiefDossier && (
            <>
              {groepTitel('Actief dossier')}
              {item(nav.actiefDossier.naam, FolderOpen, kies(nav.onGoActiefDossier), { hint: 'Terug naar dit dossier' })}
              {item('Dossier sluiten', X, kies(nav.onSluitDossier))}
            </>
          )}
        </div>

        <div className="border-t border-border px-3 py-3">
          {user?.email && (
            <p className="px-3 pb-2 text-xs text-muted-foreground truncate">{user.email}</p>
          )}
          {item('Uitloggen', LogOut, kies(() => void signOut()))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
