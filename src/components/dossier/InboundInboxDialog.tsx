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

interface PendingGroup {
  groupId: string;
  source: 'wa' | 'mail';
  from_identifier: string;
  from_display: string;
  items: PendingItem[];
  storage_paths: string[];
  bodies: string[];
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

// Photos forwarded together (e.g. a batch of 15 WhatsApp photos) usually arrive
// as separate webhook calls seconds apart. Group same-sender items that land
// within this window into a single card so they can be linked in one action.
const GROUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function groupPending(items: PendingItem[]): PendingGroup[] {
  const sorted = [...items].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const groups: PendingGroup[] = [];
  for (const it of sorted) {
    const last = groups[groups.length - 1];
    const sameSender = last && last.source === it.source && last.from_identifier === it.from_identifier;
    const withinWindow = last &&
      new Date(it.created_at).getTime() - new Date(last.created_at).getTime() <= GROUP_WINDOW_MS;
    if (sameSender && withinWindow) {
      last.items.push(it);
      last.storage_paths.push(...it.storage_paths);
      if (it.body) last.bodies.push(it.body);
      if (!last.suggested_lead_id && it.suggested_lead_id) last.suggested_lead_id = it.suggested_lead_id;
      last.created_at = it.created_at; // extend window from most recent item
    } else {
      groups.push({
        groupId: it.id,
        source: it.source,
        from_identifier: it.from_identifier,
        from_display: it.from_display,
        items: [it],
        storage_paths: [...it.storage_paths],
        bodies: it.body ? [it.body] : [],
        suggested_lead_id: it.suggested_lead_id,
        match_reason: it.match_reason,
        created_at: it.created_at,
      });
    }
  }
  return groups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function InboundInboxDialog({ open, onOpenChange, onAssigned }: Props) {
  const [groups, setGroups] = useState<PendingGroup[]>([]);
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
    const grouped = groupPending(list);
    setGroups(grouped);

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

  const assign = async (group: PendingGroup) => {
    const leadId = selection[group.groupId] || group.suggested_lead_id;
    if (!leadId) { toast.error('Kies eerst een dossier'); return; }
    setBusy(group.groupId);
    try {
      // 1) copy every path from every item in the group to <lead_id>/inbox/
      const newPaths: string[] = [];
      for (const src of group.storage_paths) {
        const dst = `${leadId}/inbox/${src.split('/').pop()}`;
        const { error: copyErr } = await supabase.storage.from('lead-fotos').copy(src, dst);
        if (copyErr && !copyErr.message.includes('exists')) {
          console.error('copy fail', src, copyErr);
          continue;
        }
        newPaths.push(dst);
      }
      // 2) append to leads.fotos (one update for the whole batch)
      const { data: lead } = await supabase.from('leads').select('fotos').eq('id', leadId).single();
      const current = Array.isArray(lead?.fotos) ? (lead as any).fotos : [];
      const additions = newPaths.map((p) => ({
        path: p,
        bucket: 'lead-fotos',
        source: group.source === 'wa' ? 'whatsapp' : 'email',
        uploaded_at: new Date().toISOString(),
      }));
      await supabase.from('leads').update({ fotos: [...current, ...additions] }).eq('id', leadId);
      // 3) mark every pending row in the group as assigned
      await supabase.from('inbound_media_pending').update({
        status: 'assigned',
        assigned_lead_id: leadId,
        assigned_at: new Date().toISOString(),
      }).in('id', group.items.map((it) => it.id));
      toast.success(`${newPaths.length} foto('s) toegevoegd`);
      await load();
      onAssigned?.();
    } catch (e: any) {
      toast.error('Kon niet koppelen: ' + (e?.message || 'onbekend'));
    } finally {
      setBusy(null);
    }
  };

  const reject = async (group: PendingGroup) => {
    setBusy(group.groupId);
    await supabase.storage.from('lead-fotos').remove(group.storage_paths);
    await supabase.from('inbound_media_pending').update({ status: 'rejected' }).in('id', group.items.map((it) => it.id));
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

        {groups.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Alles gekoppeld. Nieuwe foto's uit WhatsApp of e-mail verschijnen hier automatisch.
          </div>
        )}

        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.groupId} className="border rounded-lg p-4 bg-card">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    {group.source === 'wa' ? <MessageCircle className="h-4 w-4 text-green-600" /> : <Mail className="h-4 w-4 text-blue-600" />}
                    {group.from_display || group.from_identifier}
                    <span className="text-muted-foreground font-normal">· {new Date(group.created_at).toLocaleString('nl-BE')}</span>
                  </div>
                  {group.bodies.length > 0 && (
                    <div className="text-muted-foreground mt-1 line-clamp-2">{group.bodies.join(' ')}</div>
                  )}
                  <div className="text-xs mt-2 text-muted-foreground italic">Matchpoging: {group.match_reason || '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                {group.storage_paths.map((p) => (
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
                  value={selection[group.groupId] || group.suggested_lead_id || ''}
                  onChange={(e) => setSelection((s) => ({ ...s, [group.groupId]: e.target.value }))}
                >
                  <option value="">— Kies dossier —</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
                <Button size="sm" onClick={() => assign(group)} disabled={busy === group.groupId} className="gap-1">
                  <Check className="h-4 w-4" /> Koppelen
                </Button>
                <Button size="sm" variant="outline" onClick={() => reject(group)} disabled={busy === group.groupId} className="gap-1">
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
