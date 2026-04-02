import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Eye, EyeOff, Send, ExternalLink, Copy, MessageCircle,
  Mail, Loader2, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { CONTACT_TELEFOON } from '@/components/report/reportConstants';

interface Props {
  open: boolean;
  onClose: () => void;
  lead: any;
  onUpdate: (leadId: string, updates: Record<string, any>) => void;
  onPreview?: (lead: any) => void;
}

const STATUS_CONFIG = {
  draft: { label: 'Concept', icon: Clock, color: 'text-[#888888]', bg: 'bg-[#E2E8F0]' },
  review: { label: 'In review', icon: Eye, color: 'text-[#F6AD55]', bg: 'bg-[#F6AD55]/10' },
  active: { label: 'Actief', icon: CheckCircle, color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/10' },
  closed: { label: 'Gesloten', icon: EyeOff, color: 'text-[#888888]', bg: 'bg-[#E2E8F0]' },
};

export default function PortalManageDialog({ open, onClose, lead, onUpdate, onPreview }: Props) {
  const [status, setStatus] = useState<string>(lead?.portal_status || 'draft');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const portalToken = lead?.portal_token;
  const portalUrl = portalToken
    ? `${window.location.origin}/portal/${portalToken}`
    : '';
  const naam = `${lead?.voornaam || ''} ${lead?.achternaam || ''}`.trim() || 'Klant';

  // Fetch events when dialog opens
  useEffect(() => {
    if (!open || !lead?.id) return;
    setStatus(lead.portal_status || 'draft');
    fetchEvents();
  }, [open, lead?.id]);

  const fetchEvents = async () => {
    if (!lead?.id) return;
    setEventsLoading(true);
    const { data } = await supabase
      .from('portal_events')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setEvents(data || []);
    setEventsLoading(false);
  };

  const updateStatus = async (newStatus: string) => {
    setLoading(true);
    const updates: Record<string, any> = { portal_status: newStatus };
    if (newStatus === 'active' && status !== 'active') {
      updates.portal_activated_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', lead.id);

    if (error) {
      toast.error('Status wijzigen mislukt');
    } else {
      setStatus(newStatus);
      onUpdate(lead.id, updates);
      toast.success(
        newStatus === 'active'
          ? 'Portaal is nu actief voor de klant'
          : `Status gewijzigd naar ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label}`
      );
    }
    setLoading(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    toast.success('Link gekopieerd');
  };

  const sendWhatsApp = () => {
    const message = encodeURIComponent(
      `Dag ${lead?.voornaam || ''},\n\nHierbij de link naar uw persoonlijk dossier bij Zolderpunt:\n${portalUrl}\n\nBekijk uw dossier met het e-mailadres waar deze link naartoe gestuurd werd.\n\nVragen? Bel gerust: ${CONTACT_TELEFOON}\n\nMet vriendelijke groet,\nBram — Zolderpunt`
    );
    const phone = (lead?.telefoon || '').replace(/[^0-9+]/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');

    // Update sent_via
    const sentVia = lead?.portal_sent_via === 'email' ? 'both' : 'whatsapp';
    supabase.from('leads').update({ portal_sent_via: sentVia }).eq('id', lead.id);
    onUpdate(lead.id, { portal_sent_via: sentVia });
  };

  const sendEmail = () => {
    const subject = encodeURIComponent(`Uw persoonlijk dossier — Zolderpunt`);
    const body = encodeURIComponent(
      `Dag ${lead?.voornaam || ''},\n\nHierbij de link naar uw persoonlijk dossier bij Zolderpunt:\n${portalUrl}\n\nBekijk uw dossier met het e-mailadres waar deze link naartoe gestuurd werd.\n\nVragen? Bel gerust: ${CONTACT_TELEFOON}\n\nMet vriendelijke groet,\nBram Keirsschieter\nZolderpunt`
    );
    window.open(`mailto:${lead?.email}?subject=${subject}&body=${body}`, '_blank');

    const sentVia = lead?.portal_sent_via === 'whatsapp' ? 'both' : 'email';
    supabase.from('leads').update({ portal_sent_via: sentVia }).eq('id', lead.id);
    onUpdate(lead.id, { portal_sent_via: sentVia });
  };

  const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const EVENT_LABELS: Record<string, string> = {
    email_verified: 'E-mail geverifieerd',
    portal_opened: 'Portaal geopend',
    fotos_viewed: "Foto's bekeken",
    price_viewed: 'Prijsindicatie bekeken',
    calculator_used: 'Meerwaarde berekend',
    shared: 'Dossier gedeeld',
    pdf_downloaded: 'PDF gedownload',
    time_spent: 'Tijd op portaal',
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">Portaal — {naam}</DialogTitle>
          <DialogDescription className="font-body text-sm">
            Beheer het klantenportaal voor dit dossier
          </DialogDescription>
        </DialogHeader>

        {/* Status */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 ${statusConfig.bg}`}>
            <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
            <span className={`font-headline text-sm font-semibold ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
          {status === 'active' && lead?.portal_activated_at && (
            <span className="font-body text-xs text-[#888888]">
              Actief sinds {new Date(lead.portal_activated_at).toLocaleDateString('nl-BE')}
            </span>
          )}
        </div>

        {/* Actions based on status */}
        <div className="space-y-3">
          {/* Preview button — always available */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 font-headline"
            onClick={() => {
              if (onPreview) {
                onPreview(lead);
              }
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Preview portaal bekijken
          </Button>

          {/* Status progression */}
          {status === 'draft' && (
            <Button
              className="w-full justify-start gap-3 bg-[#F6AD55] hover:bg-[#F6AD55]/90 text-white font-headline"
              onClick={() => updateStatus('review')}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Markeer als 'in review'
            </Button>
          )}

          {status === 'review' && (
            <>
              <Button
                className="w-full justify-start gap-3 bg-[#22C55E] hover:bg-[#22C55E]/90 text-white font-headline"
                onClick={() => updateStatus('active')}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Portaal open zetten voor klant
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 font-headline"
                onClick={() => updateStatus('draft')}
                disabled={loading}
              >
                <Clock className="h-4 w-4" />
                Terug naar concept
              </Button>
            </>
          )}

          {status === 'active' && (
            <>
              {/* Send links */}
              <div className="border border-[#E2E8F0] p-4">
                <p className="font-headline text-sm font-semibold mb-3">Link versturen</p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-[#25D366] hover:bg-[#25D366]/90 text-white font-headline gap-2"
                    onClick={sendWhatsApp}
                    disabled={!lead?.telefoon}
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    className="flex-1 bg-[#008CFF] hover:bg-[#0070CC] text-white font-headline gap-2"
                    onClick={sendEmail}
                    disabled={!lead?.email}
                  >
                    <Mail className="h-4 w-4" />
                    E-mail
                  </Button>
                </div>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 mt-3 text-xs text-[#888888] hover:text-[#008CFF] font-body transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  Link kopiëren
                </button>
              </div>

              {/* Pause option */}
              <Button
                variant="outline"
                className="w-full justify-start gap-3 font-headline text-[#888888]"
                onClick={() => updateStatus('review')}
                disabled={loading}
              >
                <EyeOff className="h-4 w-4" />
                Portaal pauzeren (terug naar review)
              </Button>
            </>
          )}

          {status === 'closed' && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 font-headline"
              onClick={() => updateStatus('review')}
              disabled={loading}
            >
              <Eye className="h-4 w-4" />
              Portaal heropenen
            </Button>
          )}
        </div>

        {/* Event log */}
        {status === 'active' && (
          <div className="mt-4 border-t border-[#E2E8F0] pt-4">
            <p className="font-headline text-sm font-semibold mb-3">Klantactiviteit</p>
            {eventsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 text-[#008CFF] animate-spin" />
              </div>
            ) : events.length === 0 ? (
              <p className="font-body text-xs text-[#888888] text-center py-4">
                Nog geen activiteit
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {events.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-[#008CFF] mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-[#1A1A1A]">
                        {EVENT_LABELS[ev.event_type] || ev.event_type}
                        {ev.event_type === 'calculator_used' && ev.metadata?.meerwaarde && (
                          <span className="text-[#008CFF] font-semibold ml-1">
                            (+€ {Number(ev.metadata.meerwaarde).toLocaleString('nl-BE')})
                          </span>
                        )}
                        {ev.event_type === 'time_spent' && ev.metadata?.seconds && (
                          <span className="text-[#888888] ml-1">
                            ({Math.round(ev.metadata.seconds / 60)} min)
                          </span>
                        )}
                      </p>
                      <p className="font-body text-xs text-[#888888]">
                        {new Date(ev.created_at).toLocaleString('nl-BE')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
