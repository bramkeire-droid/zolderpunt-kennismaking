import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchProfielNamen } from '@/lib/gesprekken';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizonal } from 'lucide-react';

type ChatBericht = {
  id: string;
  lead_id: string;
  user_id: string;
  bericht: string;
  created_at: string;
};

interface Props {
  leadId: string;
  dossierNaam: string;
  open: boolean;
  onClose: () => void;
}

const chatTabel = () => supabase.from('dossier_chat' as any);

/**
 * Interne chat per dossier (SPRINTPLAN-COMMUNICATIE, Sprint 3): korte werkberichten
 * tussen medewerkers, rechts als zijpaneel, realtime via Supabase Realtime. Alleen per
 * dossier (besluit Bram), alleen intern — het klantportaal leest deze tabel nergens.
 */
export default function DossierChatPanel({ leadId, dossierNaam, open, onClose }: Props) {
  const [berichten, setBerichten] = useState<ChatBericht[]>([]);
  const [namen, setNamen] = useState<Record<string, string>>({});
  const [eigenId, setEigenId] = useState<string | null>(null);
  const [tekst, setTekst] = useState('');
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const onderkantRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setLaden(true);
      setFout(null);
      try {
        const [{ data: rijen, error }, profielen, { data: sessie }] = await Promise.all([
          chatTabel()
            .select('id, lead_id, user_id, bericht, created_at')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: true })
            .limit(500),
          fetchProfielNamen(),
          supabase.auth.getSession(),
        ]);
        if (error) throw new Error(error.message);
        if (cancelled) return;
        setBerichten((rijen ?? []) as unknown as ChatBericht[]);
        setNamen(profielen);
        setEigenId(sessie.session?.user.id ?? null);
      } catch (e) {
        if (!cancelled) setFout((e as Error).message);
      } finally {
        if (!cancelled) setLaden(false);
      }
    };
    void load();

    // Realtime: berichten van collega's verschijnen zonder verversen.
    const kanaal = supabase
      .channel(`dossier-chat-${leadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dossier_chat', filter: `lead_id=eq.${leadId}` },
        (payload) => {
          const nieuw = payload.new as ChatBericht;
          // Eigen optimistisch toegevoegde berichten niet dupliceren.
          setBerichten((prev) => (prev.some((b) => b.id === nieuw.id) ? prev : [...prev, nieuw]));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(kanaal);
    };
  }, [leadId, open]);

  useEffect(() => {
    onderkantRef.current?.scrollIntoView({ block: 'end' });
  }, [berichten, open]);

  const verstuur = async () => {
    const schoon = tekst.trim();
    if (!schoon || bezig) return;
    setBezig(true);
    setFout(null);
    try {
      const { data, error } = await chatTabel()
        .insert({ lead_id: leadId, bericht: schoon } as any)
        .select('id, lead_id, user_id, bericht, created_at')
        .single();
      if (error) throw new Error(error.message);
      const rij = data as unknown as ChatBericht;
      setBerichten((prev) => (prev.some((b) => b.id === rij.id) ? prev : [...prev, rij]));
      setTekst('');
    } catch (e) {
      setFout((e as Error).message);
    } finally {
      setBezig(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="font-headline text-base">
            Teamchat · {dossierNaam}
          </SheetTitle>
          <p className="text-[11px] text-muted-foreground">
            Intern werkoverleg over dit dossier — onzichtbaar voor de klant.
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {laden && <p className="text-sm text-muted-foreground">Laden…</p>}
          {!laden && fout && (
            <p className="text-sm text-destructive">Chat kon niet geladen worden: {fout}</p>
          )}
          {!laden && !fout && berichten.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nog geen berichten. Schrijf het eerste — je collega ziet het meteen.
            </p>
          )}
          {berichten.map((b) => {
            const eigen = b.user_id === eigenId;
            return (
              <div key={b.id} className={`flex ${eigen ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  eigen ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{b.bericht}</p>
                  <p className={`text-[10px] mt-0.5 ${eigen ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {namen[b.user_id] ?? 'Onbekend'} · {new Date(b.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={onderkantRef} />
        </div>

        <div className="border-t border-border p-3 space-y-2">
          <Textarea
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            placeholder="Kort bericht voor je collega's… (Enter = versturen)"
            className="min-h-[60px] text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void verstuur();
              }
            }}
          />
          <Button size="sm" className="w-full gap-1.5" onClick={() => void verstuur()} disabled={bezig || !tekst.trim()}>
            <SendHorizonal className="h-3.5 w-3.5" />
            <span className="text-xs">Versturen</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
