// "Wacht op jouw ja": wat Zarvis voorstelt en pas uitvoert nadat jij zelf op Ja
// drukt. De knop roept de functie `zarvis-goedkeuren` aan; het taalmodel kan dat
// niet. Eén kaart tegelijk, de oudste eerst.
import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, ShieldQuestion, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Regel = { links?: string; tekst: string; rechts?: string };
type Sectie = { kop?: string; velden?: Array<{ label: string; waarde: string }>; lijst?: Regel[] };
type Voorstel = {
  id: string;
  created_at: string;
  na: { label?: string; detail?: string; bron?: { titel?: string; ondertitel?: string; secties?: Sectie[] } | null } | null;
};

// De tabel staat nog niet volledig in de gegenereerde types.
const tabel = () => supabase.from('zarvis_acties' as never) as unknown as {
  select: (k: string) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: Voorstel[] | null }> } } } };
};

/** De regels van een voorstel, plat: hoogstens zes, de rest als telling. */
function regelsVan(v: Voorstel): string[] {
  const uit: string[] = [];
  for (const s of v.na?.bron?.secties ?? []) {
    if (s.kop) uit.push(s.kop);
    for (const f of s.velden ?? []) uit.push(`${f.label}: ${f.waarde}`);
    for (const r of s.lijst ?? []) uit.push([r.links, r.tekst, r.rechts].filter(Boolean).join(' · '));
  }
  return uit.length > 6 ? [...uit.slice(0, 5), `en nog ${uit.length - 5}`] : uit;
}

export default function ZarvisWachtrij({ ververs }: { ververs: unknown }) {
  const [rij, zetRij] = useState<Voorstel[]>([]);
  const [bezig, zetBezig] = useState<'ja' | 'nee' | null>(null);
  const [uitslag, zetUitslag] = useState<{ goed: boolean; tekst: string } | null>(null);

  const haal = useCallback(async () => {
    const { data: sessie } = await supabase.auth.getUser();
    if (!sessie.user) return;
    try {
      const { data } = await tabel().select('id, created_at, na').eq('status', 'wacht_op_goedkeuring').eq('user_id', sessie.user.id)
        .order('created_at', { ascending: true }).limit(20);
      zetRij(data ?? []);
    } catch { /* geen verbinding: de kaart komt bij de volgende ronde */ }
  }, []);

  // Meteen na elk antwoord van Zarvis, en daarnaast om de tien seconden (een geplande taak kan ook iets voorstellen).
  useEffect(() => { void haal(); }, [haal, ververs]);
  useEffect(() => { const t = setInterval(() => void haal(), 10000); return () => clearInterval(t); }, [haal]);

  const beslis = async (besluit: 'ja' | 'nee') => {
    const v = rij[0];
    if (!v || bezig) return;
    zetBezig(besluit);
    zetUitslag(null);
    const { data, error } = await supabase.functions.invoke('zarvis-goedkeuren', { body: { actie_id: v.id, besluit } });
    const r = (data ?? {}) as { status?: string; uitleg?: string; detail?: string };
    if (error || r.status === 'mislukt') zetUitslag({ goed: false, tekst: r.uitleg ?? 'Dat lukte niet. Er is niets veranderd.' });
    else if (besluit === 'ja') zetUitslag({ goed: true, tekst: r.uitleg ?? `Gedaan${r.detail ? `: ${r.detail}` : '.'}` });
    zetBezig(null);
    await haal();
  };

  const v = rij[0];
  if (!v && !uitslag) return null;
  return (
    <section aria-label="Wacht op jouw ja" className="shrink-0 px-5 pb-2">
      {uitslag && (
        <p role="status" className={`mb-2 rounded-xl px-3 py-2 text-[13px] leading-snug ${uitslag.goed ? 'bg-[#12301F] text-[#B6F2CE]' : 'bg-[#3A1418] text-[#FFD9D9]'}`}>
          {uitslag.tekst}
        </p>
      )}
      {v && (
        <div className="rounded-2xl border border-[#FFB547]/40 bg-[#FFB547]/[0.08] px-4 py-3">
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#FFB547]">
            <ShieldQuestion aria-hidden className="h-3.5 w-3.5" /> Wacht op jouw ja{rij.length > 1 ? ` · 1 van ${rij.length}` : ''}
          </p>
          <p className="mt-1 font-headline text-[15px] font-semibold leading-snug">{v.na?.bron?.titel ?? v.na?.label ?? 'Voorstel'}</p>
          <ul className="mt-1.5 max-h-28 overflow-y-auto text-[13px] leading-snug text-[#C3CBDA]">
            {regelsVan(v).map((r, i) => <li key={i} className="break-words">{r}</li>)}
          </ul>
          {v.na?.bron?.ondertitel && <p className="mt-1.5 text-[12px] leading-snug text-[#8792A8]">{v.na.bron.ondertitel}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void beslis('ja')} disabled={!!bezig}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#2E8BFF] font-headline text-sm font-semibold text-white transition-colors hover:bg-[#4A9BFF] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {bezig === 'ja' ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Check aria-hidden className="h-4 w-4" />} Ja, doe het
            </button>
            <button
              onClick={() => void beslis('nee')} disabled={!!bezig}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white/[0.1] font-headline text-sm font-semibold transition-colors hover:bg-white/[0.18] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {bezig === 'nee' ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <X aria-hidden className="h-4 w-4" />} Nee
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
