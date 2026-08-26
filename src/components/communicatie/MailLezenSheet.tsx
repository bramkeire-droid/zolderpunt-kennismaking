import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Paperclip } from 'lucide-react';
import { fetchMailInhoud, formatDatumTijd, type MailInhoud } from '@/lib/mailcrm';

interface Props {
  /** emails.id in mail-crm; null = paneel dicht. */
  emailId: string | null;
  onClose: () => void;
}

/**
 * Zijpaneel met de volledige inhoud van één mail, live opgehaald uit Exchange via het
 * mail-crm-loket. De inhoud is PLATTE TEKST en wordt bewust ook zo gerenderd
 * (whitespace-pre-wrap) — mailinhoud is content van buiten en mag nooit als HTML in de
 * app belanden (XSS). Aparte laad-, fout- en datatakken: een lege of falende fetch mag
 * er nooit uitzien als "lege mail".
 */
export default function MailLezenSheet({ emailId, onClose }: Props) {
  const [inhoud, setInhoud] = useState<MailInhoud | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [laden, setLaden] = useState(false);

  useEffect(() => {
    if (!emailId) return;
    let cancelled = false;
    setLaden(true);
    setFout(null);
    setInhoud(null);
    fetchMailInhoud(emailId)
      .then((data) => { if (!cancelled) setInhoud(data); })
      .catch((e: Error) => { if (!cancelled) setFout(e.message); })
      .finally(() => { if (!cancelled) setLaden(false); });
    return () => { cancelled = true; };
  }, [emailId]);

  return (
    <Sheet open={!!emailId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-headline text-base leading-snug pr-6">
            {inhoud?.onderwerp ?? 'Mail lezen'}
          </SheetTitle>
        </SheetHeader>

        {laden && (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {!laden && fout && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Mail kon niet opgehaald worden: {fout}
          </div>
        )}

        {!laden && !fout && inhoud && (
          <div className="mt-4 space-y-4">
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-1">
              <p><span className="text-muted-foreground">Van:</span>{' '}
                {inhoud.van_naam ? `${inhoud.van_naam} <${inhoud.van ?? ''}>` : inhoud.van ?? '—'}</p>
              <p><span className="text-muted-foreground">Aan:</span> {inhoud.aan.join(', ') || '—'}</p>
              {inhoud.cc.length > 0 && (
                <p><span className="text-muted-foreground">Cc:</span> {inhoud.cc.join(', ')}</p>
              )}
              <p className="flex items-center gap-2">
                <span className="text-muted-foreground">Datum:</span> {formatDatumTijd(inhoud.datum)}
                {inhoud.heeft_bijlagen && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Paperclip className="h-3 w-3" /> bijlage(n) — enkel zichtbaar in Outlook
                  </span>
                )}
              </p>
            </div>
            {/* Platte tekst, bewust géén HTML-rendering. */}
            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground leading-relaxed">
              {inhoud.inhoud || '(lege inhoud)'}
            </pre>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
