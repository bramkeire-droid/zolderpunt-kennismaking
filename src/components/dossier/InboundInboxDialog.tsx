import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Inbox, Mail, MessageCircle, Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { isVideoPath } from '@/lib/leadMedia';
import InboundHint from '@/components/dossier/InboundHint';
import { cn } from '@/lib/utils';
import { groupInbound, paden, type InboundGroup, type InboundRow } from '@/lib/inboundGroups';

interface PendingItem extends InboundRow {
  source: 'wa' | 'mail';
  from_identifier: string;
  from_display: string;
  subject: string;
  body: string;
  suggested_lead_id: string | null;
  match_reason: string;
}

// Groeperen gebeurt via de gedeelde helper (zie lib/inboundGroups), zodat de
// Inbox en de dossierpagina één doorgestuurde reeks foto's identiek bundelen.
type PendingGroup = InboundGroup<PendingItem> & {
  suggested_lead_id: string | null;
  match_reason: string;
};

interface LeadOpt { id: string; label: string; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAssigned?: () => void;
}

function groupPending(items: PendingItem[]): PendingGroup[] {
  return groupInbound(items).map(groep => ({
    ...groep,
    // Eerste bruikbare suggestie/reden uit de groep: die hoort bij dezelfde
    // doorgestuurde reeks, dus één keuze geldt voor de hele kaart.
    suggested_lead_id: groep.items.find(it => it.suggested_lead_id)?.suggested_lead_id ?? null,
    match_reason: groep.items.find(it => it.match_reason)?.match_reason ?? '',
  }));
}

export default function InboundInboxDialog({ open, onOpenChange, onAssigned }: Props) {
  const [groups, setGroups] = useState<PendingGroup[]>([]);
  const [leads, setLeads] = useState<LeadOpt[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  // groupId van de kaart waarvan de dossier-zoeker net open staat, of null.
  const [comboOpen, setComboOpen] = useState<string | null>(null);

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
      // storage_paths komt als jsonb binnen; paden() maakt er een echte
      // stringlijst van, net als de groepering doet.
      paden(it.storage_paths).map(async (p) => {
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
            <Inbox className="h-5 w-5 text-primary" /> Inbox — nog te koppelen
          </DialogTitle>
        </DialogHeader>

        <InboundHint />

        {groups.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Alles gekoppeld. Nieuwe foto's en video's uit WhatsApp of e-mail verschijnen hier automatisch.
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
                  <div key={p} className="aspect-square rounded overflow-hidden bg-muted relative">
                    {!signedUrls[p] ? (
                      <div className="w-full h-full animate-pulse" />
                    ) : isVideoPath(p) ? (
                      <a href={signedUrls[p]} target="_blank" rel="noreferrer" className="block w-full h-full">
                        <video
                          src={`${signedUrls[p]}#t=0.1`}
                          preload="metadata"
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white text-xs font-medium">
                          ▶ video
                        </span>
                      </a>
                    ) : (
                      <img src={signedUrls[p]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {(() => {
                  const gekozenId = selection[group.groupId] || group.suggested_lead_id || '';
                  const gekozenLabel = leads.find((l) => l.id === gekozenId)?.label;
                  return (
                    <Popover
                      open={comboOpen === group.groupId}
                      onOpenChange={(open) => setComboOpen(open ? group.groupId : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={comboOpen === group.groupId}
                          className="flex-1 justify-between font-normal"
                        >
                          <span className="truncate">{gekozenLabel || '— Kies dossier —'}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[420px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Zoek op naam of adres..." />
                          <CommandList>
                            <CommandEmpty>Geen dossier gevonden.</CommandEmpty>
                            <CommandGroup>
                              {leads.map((l) => (
                                <CommandItem
                                  key={l.id}
                                  value={l.label}
                                  onSelect={() => {
                                    setSelection((s) => ({ ...s, [group.groupId]: l.id }));
                                    setComboOpen(null);
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', gekozenId === l.id ? 'opacity-100' : 'opacity-0')} />
                                  {l.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  );
                })()}
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
