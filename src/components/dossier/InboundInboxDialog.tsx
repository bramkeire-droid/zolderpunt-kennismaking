import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Inbox, Mail, MessageCircle, Check, Trash2 } from 'lucide-react';

interface PendingItem {
  id: string;
  source: 'wa' | 'mail';
  from_identifier: string;
  from_display: string;
  subject: string;
  body: string;
  storage_paths: string[];
  suggested_lead_id: string | null;
  match_reason: string;
  created_at: string;
}

interface LeadOpt { id: string; label: string; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAssigned?: () => void;
}

export default function InboundInboxDialog({ open, onOpenChange, onAssigned }: Props) {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [leads, setLeads] = useState<LeadOpt[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);

  const load = async () => {
    const { data: pending } = await supabase
      .from('inbound_media_pending')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(100);
    const list = (pending || []) as unknown as PendingItem[];
    setItems(list);

    // signed URLs for previews
    const map: Record<string, string> = {};
    await Promise.all(list.flatMap((it) =>
      it.storage_paths.map(async (p) => {
        const { data } = await supabase.storage.from('lead-fotos').createSignedUrl(p, 3600);
        if (data?.signedUrl) map[p] = data.signedUrl;
      }),
    ));
    setSignedUrls(map);

    const { data: leadRows } = await supabase
      .from('leads')
      .select('id, voornaam, achternaam, adres, created_at')
      .order('created_at', { ascending: false })
      .limit(300);
    setLeads((leadRows || []).map((l: any) => ({
      id: l.id,
      label: `${l.voornaam || ''} ${l.achternaam || ''}`.trim() + (l.adres ? ` — ${l.adres}` : ''),
    })));
  };

  const assign = async (item: PendingItem) => {
    const leadId = selection[item.id] || item.suggested_lead_id;
    if (!leadId) { toast.error('Kies eerst een dossier'); return; }
    setBusy(item.id);
    try {
      // 1) copy each path to <lead_id>/inbox/
      const newPaths: string[] = [];
      for (const src of item.storage_paths) {
        const dst = `${leadId}/inbox/${src.split('/').pop()}`;
        const { error: copyErr } = await supabase.storage.from('lead-fotos').copy(src, dst);
        if (copyErr && !copyErr.message.includes('exists')) {
          console.error('copy fail', src, copyErr);
          continue;
        }
        newPaths.push(dst);
      }
      // 2) append to leads.fotos
      const { data: lead } = await supabase.from('leads').select('fotos').eq('id', leadId).single();
      const current = Array.isArray(lead?.fotos) ? (lead as any).fotos : [];
      const additions = newPaths.map((p) => ({
        path: p,
        bucket: 'lead-fotos',
        source: item.source === 'wa' ? 'whatsapp' : 'email',
        uploaded_at: new Date().toISOString(),
      }));
      await supabase.from('leads').update({ fotos: [...current, ...additions] }).eq('id', leadId);
      // 3) mark pending as assigned
      await supabase.from('inbound_media_pending').update({
        status: 'assigned',
        assigned_lead_id: leadId,
        assigned_at: new Date().toISOString(),
      }).eq('id', item.id);
      toast.success(`${newPaths.length} foto('s) toegevoegd`);
      await load();
      onAssigned?.();
    } catch (e: any) {
      toast.error('Kon niet koppelen: ' + (e?.message || 'onbekend'));
    } finally {
      setBusy(null);
    }
  };

  const reject = async (item: PendingItem) => {
    setBusy(item.id);
    await supabase.storage.from('lead-fotos').remove(item.storage_paths);
    await supabase.from('inbound_media_pending').update({ status: 'rejected' }).eq('id', item.id);
    await load();
    setBusy(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" /> Inbox — onbekende foto's
          </DialogTitle>
        </DialogHeader>

        {items.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Alles gekoppeld. Nieuwe foto's uit WhatsApp of e-mail verschijnen hier automatisch.
          </div>
        )}

        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="border rounded-lg p-4 bg-card">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    {it.source === 'wa' ? <MessageCircle className="h-4 w-4 text-green-600" /> : <Mail className="h-4 w-4 text-blue-600" />}
                    {it.from_display || it.from_identifier}
                    <span className="text-muted-foreground font-normal">· {new Date(it.created_at).toLocaleString('nl-BE')}</span>
                  </div>
                  {it.subject && <div className="text-muted-foreground mt-1">{it.subject}</div>}
                  {it.body && <div className="text-muted-foreground mt-1 line-clamp-2">{it.body}</div>}
                  <div className="text-xs mt-2 text-muted-foreground italic">Matchpoging: {it.match_reason || '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                {it.storage_paths.map((p) => (
                  <div key={p} className="aspect-square rounded overflow-hidden bg-muted">
                    {signedUrls[p]
                      ? <img src={signedUrls[p]} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full animate-pulse" />}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  className="flex-1 border rounded px-3 py-2 text-sm bg-background"
                  value={selection[it.id] || it.suggested_lead_id || ''}
                  onChange={(e) => setSelection((s) => ({ ...s, [it.id]: e.target.value }))}
                >
                  <option value="">— Kies dossier —</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
                <Button size="sm" onClick={() => assign(it)} disabled={busy === it.id} className="gap-1">
                  <Check className="h-4 w-4" /> Koppelen
                </Button>
                <Button size="sm" variant="outline" onClick={() => reject(it)} disabled={busy === it.id} className="gap-1">
                  <Trash2 className="h-4 w-4" /> Verwijderen
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
