import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchCommunicatie,
  fetchCommunicatieViaEmail,
  formatDatumTijd,
  formatDuur,
  type CommunicatieData,
  type LoketContact,
} from '@/lib/mailcrm';
import {
  fetchGesprekken, fetchLopendGesprek, fetchNotities, fetchProfielNamen, startGesprek,
  type Gesprek, type GesprekNotitie,
} from '@/lib/gesprekken';
import MailLezenSheet from '@/components/communicatie/MailLezenSheet';
import GesprekModus from '@/components/communicatie/GesprekModus';
import HistoriekKnop from '@/components/communicatie/HistoriekKnop';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowDownLeft, ArrowUpRight, Phone, Search, Gavel, Mail, RefreshCw, Info, Video, StickyNote, Star,
  ChevronDown, User, Truck, Users, Boxes,
} from 'lucide-react';

interface Props {
  leadId: string;
}

type LeadInfo = {
  id: string;
  voornaam: string | null;
  achternaam: string | null;
  email: string | null;
  bouwflow_project_number: string | null;
  bouwflow_phase: string | null;
};

/** Eén rij in de tijdlijn: mail, Leexi-call of Compass-gesprek, chronologisch samengevoegd. */
type TijdlijnItem =
  | { soort: 'mail'; id: string; datum: string | null; data: CommunicatieData['mails'][number] }
  | { soort: 'call'; id: string; datum: string | null; data: CommunicatieData['calls'][number] }
  | { soort: 'gesprek'; id: string; datum: string | null; data: Gesprek };

function rolBadge(rol: string | null | undefined) {
  if (rol === 'klant') return <Badge variant="outline" className="border-primary/40 text-primary text-[10px] px-1.5 py-0">klant</Badge>;
  if (rol === 'leverancier') return <Badge variant="outline" className="border-amber-500/50 text-amber-600 text-[10px] px-1.5 py-0">leverancier</Badge>;
  return null;
}

/** IDEE-3: de tijdlijn is opgesplitst in inklapbare categorieën i.p.v. losse rol-labels. */
type Categorie = 'klant' | 'beide' | 'leverancier' | 'varia';

const CATEGORIE_META: Record<Categorie, { titel: string; icon: typeof User; standaardOpen: boolean }> = {
  klant: { titel: 'Klant', icon: User, standaardOpen: true },
  beide: { titel: 'Klant + leverancier', icon: Users, standaardOpen: true },
  leverancier: { titel: 'Leveranciers', icon: Truck, standaardOpen: true },
  varia: { titel: 'Varia', icon: Boxes, standaardOpen: false },
};
const CATEGORIE_VOLGORDE: Categorie[] = ['klant', 'beide', 'leverancier', 'varia'];

/**
 * Categorie per tijdlijn-item, op basis van de betrokken rollen (afzender + cc'ers).
 * Eigen gesprekken en Leexi-calls met klantdeelnemers zijn klantcommunicatie; een mail
 * waar klant én leverancier in zitten (bv. leveranciersmail met de klant in cc) valt in
 * de gemengde groep. Alles zonder herkenbare rol is Varia.
 */
function categorieVoor(
  item: TijdlijnItem,
  contacten: Record<string, LoketContact>,
  cc: Record<string, string[]>,
  deelnemers: Record<string, string[]>,
): Categorie {
  if (item.soort === 'gesprek') return 'klant';

  const rollen = new Set<string>();
  if (item.soort === 'call') {
    for (const id of deelnemers[item.id] ?? []) {
      const rol = contacten[id]?.rol;
      if (rol) rollen.add(rol);
    }
    if (rollen.has('klant')) return 'klant';
    return rollen.has('leverancier') ? 'leverancier' : 'varia';
  }

  const m = item.data;
  const vanRol = m.van_contact_id ? contacten[m.van_contact_id]?.rol : null;
  if (vanRol) rollen.add(vanRol);
  for (const id of cc[item.id] ?? []) {
    const rol = contacten[id]?.rol;
    if (rol) rollen.add(rol);
  }
  const klant = rollen.has('klant');
  const leverancier = rollen.has('leverancier');
  if (klant && leverancier) return 'beide';
  if (klant) return 'klant';
  if (leverancier) return 'leverancier';
  return 'varia';
}

/**
 * Communicatiepagina van een dossier (SPRINTPLAN-COMMUNICATIE, Sprint 1+2): alle mails en
 * Leexi-calls uit Mail-CRM (live via het compass-loket) plus de eigen gesprekken met
 * post-it-notities, in één tijdlijn met beslissingenregister en zoekveld. Dossiers zonder
 * ZL-nummer vallen terug op matching via het e-mailadres van de klant.
 */
export default function DossierCommunicatie({ leadId }: Props) {
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [data, setData] = useState<CommunicatieData | null>(null);
  const [bron, setBron] = useState<'zl' | 'email' | 'geen'>('geen');
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [zoek, setZoek] = useState('');
  const [leesMailId, setLeesMailId] = useState<string | null>(null);
  const [herlaadTeller, setHerlaadTeller] = useState(0);
  const [openCategorieen, setOpenCategorieen] = useState<Record<Categorie, boolean>>({
    klant: CATEGORIE_META.klant.standaardOpen,
    beide: CATEGORIE_META.beide.standaardOpen,
    leverancier: CATEGORIE_META.leverancier.standaardOpen,
    varia: CATEGORIE_META.varia.standaardOpen,
  });

  // Compass-eigen gespreksdata (Sprint 2) — los van het loket, eigen foutafhandeling:
  // een haperend Mail-CRM mag de gespreksflow nooit blokkeren, en omgekeerd.
  const [gesprekken, setGesprekken] = useState<Gesprek[]>([]);
  const [notities, setNotities] = useState<GesprekNotitie[]>([]);
  const [lopend, setLopend] = useState<Gesprek | null>(null);
  const [namen, setNamen] = useState<Record<string, string>>({});
  const [gesprekFout, setGesprekFout] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLaden(true);
      setFout(null);
      try {
        const { data: rij, error } = await supabase
          .from('leads')
          .select('id, voornaam, achternaam, email, bouwflow_project_number, bouwflow_phase')
          .eq('id', leadId)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!rij) throw new Error('Dossier niet gevonden.');
        if (cancelled) return;
        setLead(rij as LeadInfo);

        if (rij.bouwflow_project_number) {
          const resultaat = await fetchCommunicatie(rij.bouwflow_project_number);
          if (cancelled) return;
          setData(resultaat);
          setBron('zl');
        } else if (rij.email) {
          const resultaat = await fetchCommunicatieViaEmail(rij.email);
          if (cancelled) return;
          setData(resultaat);
          setBron('email');
        } else {
          setData(null);
          setBron('geen');
        }
      } catch (e) {
        if (!cancelled) setFout((e as Error).message);
      } finally {
        if (!cancelled) setLaden(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [leadId, herlaadTeller]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setGesprekFout(null);
      try {
        const [g, n, lopendG, profielen] = await Promise.all([
          fetchGesprekken(leadId),
          fetchNotities(leadId),
          fetchLopendGesprek(leadId),
          fetchProfielNamen(),
        ]);
        if (cancelled) return;
        setGesprekken(g);
        setNotities(n);
        setLopend(lopendG);
        setNamen(profielen);
      } catch (e) {
        if (!cancelled) setGesprekFout((e as Error).message);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [leadId, herlaadTeller]);

  const contacten: Record<string, LoketContact> = data?.contacten ?? {};

  const tijdlijn: TijdlijnItem[] = useMemo(() => {
    const items: TijdlijnItem[] = [
      ...(data?.mails ?? []).map((m) => ({ soort: 'mail' as const, id: m.id, datum: m.datum, data: m })),
      ...(data?.calls ?? []).map((c) => ({ soort: 'call' as const, id: c.id, datum: c.datum, data: c })),
      ...gesprekken.map((g) => ({ soort: 'gesprek' as const, id: g.id, datum: g.gestart_op, data: g })),
    ];
    return items.sort((a, b) => String(b.datum ?? '').localeCompare(String(a.datum ?? '')));
  }, [data, gesprekken]);

  const notitiesPerGesprek = useMemo(() => {
    const map = new Map<string, GesprekNotitie[]>();
    for (const n of notities) {
      const sleutel = n.gesprek_id ?? 'los';
      const lijst = map.get(sleutel) ?? [];
      lijst.push(n);
      map.set(sleutel, lijst);
    }
    return map;
  }, [notities]);

  const gefilterd = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    if (!term) return tijdlijn;
    return tijdlijn.filter((item) => {
      if (item.soort === 'mail') {
        const m = item.data;
        const contactNaam = m.van_contact_id ? contacten[m.van_contact_id]?.naam ?? '' : '';
        return [m.onderwerp, m.samenvatting, m.beslissing, contactNaam]
          .some((v) => (v ?? '').toLowerCase().includes(term));
      }
      if (item.soort === 'call') {
        const c = item.data;
        return [c.titel, c.samenvatting, c.beslissing].some((v) => (v ?? '').toLowerCase().includes(term));
      }
      const eigen = notitiesPerGesprek.get(item.id) ?? [];
      return eigen.some((n) => n.tekst.toLowerCase().includes(term));
    });
  }, [tijdlijn, zoek, contacten, notitiesPerGesprek]);

  /** Beslissingenregister: mails + calls (Mail-CRM) én post-its van soort 'beslissing'. */
  const beslissingen = useMemo(() => {
    const uitMailCrm = tijdlijn
      .filter((item) => item.soort !== 'gesprek' && item.data.bevat_beslissing && item.data.beslissing)
      .map((item) => ({
        sleutel: `${item.soort}-${item.id}`,
        tekst: (item.data as { beslissing: string }).beslissing,
        datum: item.datum,
        bron: item.soort === 'mail' ? ('mail' as const) : ('call' as const),
        doelId: `comm-${item.soort}-${item.id}`,
        categorie: categorieVoor(item, contacten, data?.cc ?? {}, data?.deelnemers ?? {}),
      }));
    const uitNotities = notities
      .filter((n) => n.soort === 'beslissing')
      .map((n) => ({
        sleutel: `notitie-${n.id}`,
        tekst: n.tekst,
        datum: n.created_at,
        bron: 'gesprek' as const,
        doelId: n.gesprek_id ? `comm-gesprek-${n.gesprek_id}` : null,
        categorie: 'klant' as Categorie,
      }));
    return [...uitMailCrm, ...uitNotities]
      .sort((a, b) => String(b.datum ?? '').localeCompare(String(a.datum ?? '')));
  }, [tijdlijn, notities, contacten, data]);

  const scrollNaarId = (doelId: string | null, categorie: Categorie) => {
    if (!doelId) return;
    // De categorie kan dichtgeklapt staan; eerst openen, dan pas scrollen.
    setOpenCategorieen((prev) => (prev[categorie] ? prev : { ...prev, [categorie]: true }));
    setTimeout(() => {
      document.getElementById(doelId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const nieuwGesprek = async (type: 'telefoon' | 'videocall') => {
    try {
      const gesprek = await startGesprek(leadId, type);
      setLopend(gesprek);
      setGesprekken((prev) => [gesprek, ...prev]);
    } catch (e) {
      setGesprekFout((e as Error).message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-4xl px-4 py-5 space-y-4">

        {/* Kop: waar komt deze data vandaan + gesprek starten */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-headline font-bold text-xl text-foreground">Communicatie</h1>
            {bron === 'zl' && data?.project && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Dossier <span className="font-semibold">#{data.project.extern_dossier_id}</span>
                {' · '}Bouwflow-fase: {data.project.status ?? 'onbekend'}
                {' · '}live uit Mail-CRM
              </p>
            )}
            {/* Historiek aanvullen staat op ELK dossier met ZL-nummer en e-mailadres:
                Bram kiest zelf welke projecten hij bijwerkt (2026-08-26, IDEE-5). De
                kostenbescherming zit in de knop zelf — eerst een gratis telling met
                kostenindicatie, pas na een tweede klik draait de AI. */}
            {bron === 'zl' && data?.gevonden && lead?.bouwflow_project_number && lead?.email && (
              <div className="mt-1.5">
                <HistoriekKnop
                  zl={lead.bouwflow_project_number}
                  klantEmail={lead.email}
                  onKlaar={() => setHerlaadTeller((t) => t + 1)}
                />
              </div>
            )}
            {bron === 'email' && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Dossier zonder ZL-nummer — gevonden via e-mailadres {lead?.email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!lopend && (
              <>
                <Button size="sm" variant="default" className="gap-1.5 h-8" onClick={() => void nieuwGesprek('telefoon')}>
                  <Phone className="h-3.5 w-3.5" />
                  <span className="text-xs">Gesprek starten</span>
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => void nieuwGesprek('videocall')}>
                  <Video className="h-3.5 w-3.5" />
                  <span className="text-xs">Videocall starten</span>
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={() => setHerlaadTeller((t) => t + 1)}>
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="text-xs">Vernieuwen</span>
            </Button>
          </div>
        </div>

        {gesprekFout && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            Gespreksdata: {gesprekFout}
          </div>
        )}

        {/* Actief gesprek: post-its maken terwijl je belt of in call zit. */}
        {lopend && (
          <GesprekModus
            gesprek={lopend}
            notities={notities}
            onNotitie={(n) => setNotities((prev) => [...prev, n])}
            onBeeindigd={() => {
              setLopend(null);
              setGesprekken((prev) =>
                prev.map((g) => (g.id === lopend.id ? { ...g, beeindigd_op: new Date().toISOString() } : g)),
              );
            }}
          />
        )}

        {/* Laad-, fout- en lege takken bewust apart (les uit de Mail Hub-review). */}
        {laden && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {!laden && fout && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Mail-CRM-communicatie kon niet geladen worden: {fout}
          </div>
        )}

        {!laden && !fout && bron === 'geen' && (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Dit dossier heeft nog geen ZL-nummer en geen e-mailadres — mails kunnen nog niet gekoppeld worden.
          </div>
        )}

        {!laden && !fout && data && !data.gevonden && (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            {bron === 'zl'
              ? `Dossier ${lead?.bouwflow_project_number} is (nog) niet bekend in Mail-CRM. De dossiersync draait elk kwartier — probeer zo opnieuw.`
              : `Geen mailcontact gevonden voor ${lead?.email}.`}
          </div>
        )}

        {!laden && (
          <>
            {/* Beslissingenregister */}
            <section className="rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                <Gavel className="h-4 w-4 text-primary" />
                <h2 className="font-headline font-semibold text-sm">Beslissingen</h2>
                <span className="text-xs text-muted-foreground">({beslissingen.length})</span>
              </div>
              {beslissingen.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Nog geen vastgelegde beslissingen in mails, calls of gesprekken van dit dossier.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {beslissingen.map((b) => (
                    <li key={b.sleutel}>
                      <button
                        type="button"
                        onClick={() => scrollNaarId(b.doelId, b.categorie)}
                        className="w-full text-left px-4 py-2 hover:bg-muted/40 transition-colors"
                      >
                        <p className="text-sm text-foreground leading-snug">{b.tekst}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {b.bron === 'mail' ? '📧 mail' : b.bron === 'call' ? '📞 call' : '🗒️ gesprek (Compass)'}
                          {' · '}{formatDatumTijd(b.datum)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Zoeken */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder="Zoek in onderwerp, samenvatting, beslissing, afzender of notities…"
                className="pl-9"
              />
            </div>

            {/* Tijdlijn, opgesplitst in inklapbare categorieën (IDEE-3). Bij een actieve
                zoekterm staan alle groepen met treffers open — zoeken mag nooit iets verbergen. */}
            {gefilterd.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                {tijdlijn.length === 0
                  ? 'Nog geen communicatie in dit dossier. Start een gesprek of wacht op de eerste gekoppelde mail.'
                  : 'Niets gevonden voor deze zoekterm.'}
              </div>
            ) : (
              CATEGORIE_VOLGORDE.map((cat) => {
                const items = gefilterd.filter(
                  (item) => categorieVoor(item, contacten, data?.cc ?? {}, data?.deelnemers ?? {}) === cat,
                );
                if (items.length === 0) return null;
                const meta = CATEGORIE_META[cat];
                const open = zoek.trim() ? true : openCategorieen[cat];

                const regel = (item: TijdlijnItem) => (
                  <li key={`${item.soort}-${item.id}`} id={`comm-${item.soort}-${item.id}`}>
                    {item.soort === 'mail' ? (
                      <MailRij
                        mail={item.data}
                        contacten={contacten}
                        ccIds={data?.cc?.[item.id] ?? []}
                        toonRol={cat === 'beide' || cat === 'varia'}
                        onLees={() => setLeesMailId(item.id)}
                      />
                    ) : item.soort === 'call' ? (
                      <CallRij call={item.data} deelnemerIds={data?.deelnemers?.[item.id] ?? []} contacten={contacten} />
                    ) : (
                      <GesprekRij
                        gesprek={item.data}
                        notities={notitiesPerGesprek.get(item.id) ?? []}
                        naam={item.data.door_user ? namen[item.data.door_user] : undefined}
                      />
                    )}
                  </li>
                );

                // IDEE-7: binnen "Leveranciers" nog een niveau per bedrijf, zodat alle mail
                // met bv. Trappen Smet bij elkaar staat. Alleen zinvol vanaf 2 bedrijven.
                const perBedrijf = cat === 'leverancier' ? groepeerPerBedrijf(items, contacten) : null;

                return (
                  <Collapsible
                    key={cat}
                    open={open}
                    onOpenChange={(o) => setOpenCategorieen((prev) => ({ ...prev, [cat]: o }))}
                    className="rounded-lg border border-border bg-card"
                  >
                    <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                      <meta.icon className="h-4 w-4 text-primary" />
                      <span className="font-headline font-semibold text-sm">{meta.titel}</span>
                      <span className="text-xs text-muted-foreground">
                        ({items.length}{perBedrijf && perBedrijf.length > 1 ? ` · ${perBedrijf.length} leveranciers` : ''})
                      </span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {perBedrijf && perBedrijf.length > 1 ? (
                        <div className="px-3 pb-3 space-y-2">
                          {perBedrijf.map(({ naam, items: bedrijfItems }) => (
                            <LeverancierGroep
                              key={naam}
                              naam={naam}
                              aantal={bedrijfItems.length}
                              standaardOpen={!!zoek.trim() || perBedrijf.length <= 3}
                            >
                              <ul className="space-y-2 pt-2">{bedrijfItems.map(regel)}</ul>
                            </LeverancierGroep>
                          ))}
                        </div>
                      ) : (
                        <ul className="space-y-2 px-3 pb-3">{items.map(regel)}</ul>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </>
        )}
      </div>

      <MailLezenSheet emailId={leesMailId} onClose={() => setLeesMailId(null)} />
    </div>
  );
}

/**
 * IDEE-7: groepeert tijdlijn-items per leveranciersbedrijf. Valt terug op de contactnaam
 * wanneer een contact (nog) geen bedrijf heeft. Meest recente groep eerst, zodat de volgorde
 * van de tijdlijn behouden blijft.
 */
function groepeerPerBedrijf(
  items: TijdlijnItem[],
  contacten: Record<string, LoketContact>,
): { naam: string; items: TijdlijnItem[] }[] {
  const groepen = new Map<string, TijdlijnItem[]>();
  for (const item of items) {
    const contactId = item.soort === 'mail' ? item.data.van_contact_id : null;
    const contact = contactId ? contacten[contactId] : undefined;
    const naam = contact?.bedrijf || contact?.naam || contact?.email || 'Onbekende leverancier';
    const lijst = groepen.get(naam) ?? [];
    lijst.push(item);
    groepen.set(naam, lijst);
  }
  return [...groepen.entries()]
    .map(([naam, lijst]) => ({ naam, items: lijst }))
    .sort((a, b) => String(b.items[0]?.datum ?? '').localeCompare(String(a.items[0]?.datum ?? '')));
}

function LeverancierGroep({
  naam, aantal, standaardOpen, children,
}: {
  naam: string;
  aantal: number;
  standaardOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(standaardOpen);
  useEffect(() => { if (standaardOpen) setOpen(true); }, [standaardOpen]);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border border-border/70 bg-muted/20">
      <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors">
        <Truck className="h-3.5 w-3.5 text-amber-600" />
        <span className="font-medium text-sm text-foreground">{naam}</span>
        <span className="text-xs text-muted-foreground">({aantal})</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function MailRij({
  mail, contacten, ccIds, toonRol = true, onLees,
}: {
  mail: CommunicatieData['mails'][number];
  contacten: Record<string, LoketContact>;
  ccIds: string[];
  /** In de zuivere groepen (Klant, Leveranciers) is de rol al duidelijk uit de kop. */
  toonRol?: boolean;
  onLees: () => void;
}) {
  const contact = mail.van_contact_id ? contacten[mail.van_contact_id] : undefined;
  const ccNamen = ccIds
    .map((id) => contacten[id]?.naam || contacten[id]?.email)
    .filter(Boolean);
  const inkomend = mail.richting === 'in';

  return (
    <button
      type="button"
      onClick={onLees}
      className="w-full text-left rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-center gap-2 flex-wrap">
        {inkomend
          ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          : <ArrowUpRight className="h-3.5 w-3.5 text-primary shrink-0" />}
        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">{formatDatumTijd(mail.datum)}</span>
        {contact && (
          <span className="text-xs font-medium text-foreground">
            {inkomend ? 'van' : 'aan'} {contact.naam || contact.email}
          </span>
        )}
        {toonRol && rolBadge(contact?.rol)}
        <span className="text-[10px] text-muted-foreground ml-auto">{mail.mailbox}</span>
      </div>
      <p className="font-headline font-semibold text-sm text-foreground mt-1 leading-snug">
        {mail.onderwerp || '(geen onderwerp)'}
      </p>
      {mail.samenvatting && (
        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{mail.samenvatting}</p>
      )}
      {mail.bevat_beslissing && mail.beslissing && (
        <p className="mt-1.5 inline-flex items-start gap-1.5 rounded bg-red-50 dark:bg-red-950/30 px-2 py-1 text-xs text-red-700 dark:text-red-400">
          <Gavel className="h-3 w-3 mt-0.5 shrink-0" /> {mail.beslissing}
        </p>
      )}
      {ccNamen.length > 0 && (
        <p className="text-[11px] text-muted-foreground mt-1">Cc: {ccNamen.join(', ')}</p>
      )}
    </button>
  );
}

function CallRij({
  call, deelnemerIds, contacten,
}: {
  call: CommunicatieData['calls'][number];
  deelnemerIds: string[];
  contacten: Record<string, LoketContact>;
}) {
  const deelnemers = deelnemerIds
    .map((id) => contacten[id]?.naam || contacten[id]?.email)
    .filter(Boolean);

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground">{formatDatumTijd(call.datum)}</span>
        {call.duur_seconden ? (
          <span className="text-[11px] text-muted-foreground">· {formatDuur(call.duur_seconden)}</span>
        ) : null}
        {deelnemers.length > 0 && (
          <span className="text-xs font-medium text-foreground">met {deelnemers.join(', ')}</span>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">Leexi</span>
      </div>
      <p className="font-headline font-semibold text-sm text-foreground mt-1 leading-snug">
        {call.titel || 'Telefoongesprek'}
      </p>
      {call.samenvatting && (
        <p className="text-sm text-muted-foreground mt-0.5 leading-snug whitespace-pre-line">
          {call.samenvatting.length > 400 ? `${call.samenvatting.slice(0, 400)}…` : call.samenvatting}
        </p>
      )}
      {call.bevat_beslissing && call.beslissing && (
        <p className="mt-1.5 inline-flex items-start gap-1.5 rounded bg-red-50 dark:bg-red-950/30 px-2 py-1 text-xs text-red-700 dark:text-red-400">
          <Gavel className="h-3 w-3 mt-0.5 shrink-0" /> {call.beslissing}
        </p>
      )}
    </div>
  );
}

const NOTITIE_ICONEN = { notitie: StickyNote, beslissing: Gavel, onthouden: Star } as const;
const NOTITIE_KLEUREN = {
  notitie: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
  beslissing: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
  onthouden: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900',
} as const;

function GesprekRij({
  gesprek, notities, naam,
}: {
  gesprek: Gesprek;
  notities: GesprekNotitie[];
  naam?: string;
}) {
  const TypeIcon = gesprek.type === 'telefoon' ? Phone : Video;
  const duurSec = gesprek.beeindigd_op
    ? Math.round((new Date(gesprek.beeindigd_op).getTime() - new Date(gesprek.gestart_op).getTime()) / 1000)
    : null;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <TypeIcon className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground">{formatDatumTijd(gesprek.gestart_op)}</span>
        {duurSec !== null && duurSec > 0 && (
          <span className="text-[11px] text-muted-foreground">· {formatDuur(duurSec)}</span>
        )}
        {!gesprek.beeindigd_op && (
          <Badge variant="outline" className="border-red-400 text-red-600 text-[10px] px-1.5 py-0">bezig</Badge>
        )}
        {naam && <span className="text-xs font-medium text-foreground">door {naam}</span>}
        <span className="text-[10px] text-muted-foreground ml-auto">Compass</span>
      </div>
      <p className="font-headline font-semibold text-sm text-foreground mt-1 leading-snug">
        {gesprek.type === 'telefoon' ? 'Telefoongesprek' : 'Videocall'}
        {notities.length > 0 ? ` · ${notities.length} notitie${notities.length === 1 ? '' : 's'}` : ''}
      </p>
      {notities.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-0.5">Geen notities gemaakt.</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {notities.map((n) => {
            const Icoon = NOTITIE_ICONEN[n.soort];
            return (
              <li key={n.id} className={`rounded border px-2.5 py-1.5 text-sm flex items-start gap-2 ${NOTITIE_KLEUREN[n.soort]}`}>
                <Icoon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="flex-1">{n.tekst}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                  {new Date(n.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
