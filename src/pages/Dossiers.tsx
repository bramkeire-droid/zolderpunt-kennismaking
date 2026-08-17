import { useSession } from '@/contexts/SessionContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, FolderOpen, Users, TrendingUp, DollarSign, Eye, RefreshCw, Trash2, CheckCircle, Globe, Phone, Bot, FileDown, MoreVertical, ArrowUp, ArrowDown, ArrowUpDown, FileText, Receipt, Hammer, ArrowRightLeft, ChevronDown, ChevronRight, GripVertical, Send, Euro } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { defaultTechnisch } from '@/contexts/SessionContext';
import type { LeadData } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import SalesAnalysis from '@/components/SalesAnalysis';
import PortalManageDialog from '@/components/portal/PortalManageDialog';
import PortalPreview from '@/components/portal/PortalPreview';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NEXT_STEP_PRESETS = [
  'Telefoongesprek inplannen',
  'Videocall',
  'Plaatsbezoek',
  'Offerte opmaken',
  'Project uitvoeren',
] as const;
const NEXT_STEP_OTHER = '__other__';
import { pdf } from '@react-pdf/renderer';
import ReportDocument from '@/components/report/ReportDocument';
import type { ReportData, FeitjeItem } from '@/components/report/reportTypes';
import OffertebijlageDialog from '@/components/dossier/OffertebijlageDialog';
import StabiliteitVoorbladDialog from '@/components/dossier/StabiliteitVoorbladDialog';
import GenericVoorbladDialog from '@/components/dossier/GenericVoorbladDialog';
import PhotoUploadDialog from '@/components/dossier/PhotoUploadDialog';
import InboundInboxDialog from '@/components/dossier/InboundInboxDialog';
import PushToBouwflowDialog from '@/components/dossier/PushToBouwflowDialog';
import MoveBouwflowPhaseDialog, { type PhaseOption } from '@/components/dossier/MoveBouwflowPhaseDialog';
import KanbanBoard from '@/components/dossier/KanbanBoard';
import PipelineHeader from '@/components/dossier/PipelineHeader';
import BouwflowSyncStatus from '@/components/dossier/BouwflowSyncStatus';
import { exclVorkVanLead } from '@/lib/prijscalculator';
import {
  FASE_GROEPEN, bepaalVolgendeActie, dossierWaarde, type FaseGroepKey,
} from '@/lib/pipeline';
import LeadActionBar from '@/components/dossier/LeadActionBar';
import KlantDossiers from '@/components/dossier/KlantDossiers';
import CalculatorDialog from '@/components/dossier/CalculatorDialog';
import PrijscalculatorDialog from '@/components/dossier/PrijscalculatorDialog';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { INBOUND_HINT_TEXT } from '@/components/dossier/InboundHint';
import { normalizeLeadMedia, imagesOnly } from '@/lib/leadMedia';
import { Image as ImageIcon, Inbox } from 'lucide-react';
import { formatDatum } from '@/components/report/reportConstants';
import { downloadBlob, openDownloadWindow } from '@/lib/downloadFile';

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  nieuw:            { label: 'Nieuw',            bg: 'bg-muted',          color: 'text-muted-foreground' },
  telefoongesprek:  { label: 'Telefoongesprek',  bg: 'bg-blue-100',       color: 'text-blue-700' },
  intake_gepland:   { label: 'Intake gepland',   bg: 'bg-amber-100',      color: 'text-amber-800' },
  intake:           { label: 'Intake gedaan',    bg: 'bg-primary/15',     color: 'text-primary' },
  plaatsbezoek:     { label: 'Plaatsbezoek',     bg: 'bg-indigo-100',     color: 'text-indigo-700' },
  offerte:          { label: 'Offerte',          bg: 'bg-purple-100',     color: 'text-purple-700' },
  uitvoering:       { label: 'Uitvoering',       bg: 'bg-orange-100',     color: 'text-orange-700' },
  afgesloten:       { label: 'Afgesloten',       bg: 'bg-green-100',      color: 'text-green-700' },
  verloren:         { label: 'Verloren',         bg: 'bg-red-100',        color: 'text-red-700' },
};

// De kolommen zijn EXACT die van Bouwflow's Verkoop-kanban: zelfde namen,
// zelfde volgorde, geladen uit `bouwflow_phase_category_map`. Bouwflow is de
// leidende waarheid, dus Compass verzint hier niets bij en klapt niets samen.
// Een sleutel is `phase:<bouwflow_phase_id>`, plus één vaste kolom voor
// dossiers die (nog) niet aan een Bouwflow-project hangen.
type CategoryKey = string;

const UNLINKED: CategoryKey = 'unlinked';
const phaseKey = (phaseId: number | string) => `phase:${phaseId}`;

export interface CategoryDef { key: CategoryKey; label: string; accent: string; phaseId: number | null }

// Verkoop loopt van grijs via blauw/paars naar groen, met amber voor opvolging
// en rood voor geweigerd. Uitvoering krijgt een eigen, warmere reeks zodat de
// twee pipelines in één lijst uit elkaar te houden zijn.
const ACCENTS_VERKOOP = [
  'border-l-slate-400', 'border-l-sky-500', 'border-l-blue-500', 'border-l-indigo-500',
  'border-l-violet-500', 'border-l-purple-500', 'border-l-fuchsia-500', 'border-l-pink-500',
  'border-l-green-500', 'border-l-emerald-600', 'border-l-amber-500', 'border-l-red-500',
];
const ACCENTS_UITVOERING = [
  'border-l-teal-500', 'border-l-cyan-600', 'border-l-orange-400', 'border-l-orange-500',
  'border-l-orange-600', 'border-l-amber-600', 'border-l-yellow-600', 'border-l-lime-600',
  'border-l-green-700', 'border-l-emerald-700', 'border-l-stone-500',
];

function buildCategories(phases: { phase_id: number; phase_title: string; pipeline_id?: number | null }[]): CategoryDef[] {
  let v = 0;
  let u = 0;
  const cols = phases.map((p) => {
    const isUitvoering = Number(p.pipeline_id) === 2;
    const accent = isUitvoering
      ? ACCENTS_UITVOERING[u++ % ACCENTS_UITVOERING.length]
      : ACCENTS_VERKOOP[v++ % ACCENTS_VERKOOP.length];
    return { key: phaseKey(p.phase_id), label: p.phase_title, accent, phaseId: p.phase_id };
  });
  // Dossiers zonder Bouwflow-koppeling horen in geen enkele Bouwflow-kolom;
  // ze apart tonen is eerlijker dan ze in een fase te duwen die niet bestaat.
  cols.push({ key: UNLINKED, label: 'Niet in Bouwflow', accent: 'border-l-neutral-300', phaseId: null });
  return cols;
}

// Voor een gekoppeld dossier bepaalt Bouwflow de kolom, punt. Compass' oude
// heuristiek (pre_intake, gesprek_datum, status) raadde de fase, wat per
// definitie kon afwijken van de waarheid in Bouwflow.
function resolveCategory(lead: any): CategoryKey {
  return lead.bouwflow_phase ? phaseKey(lead.bouwflow_phase) : UNLINKED;
}

function rowToLead(row: any): LeadData {
  return {
    id: row.id,
    voornaam: row.voornaam ?? '',
    partner_naam: row.partner_naam ?? '',
    achternaam: row.achternaam ?? '',
    email: row.email ?? '',
    telefoon: row.telefoon ?? '',
    gevonden_via: row.gevonden_via ?? '',
    gezocht_naar: row.gezocht_naar ?? '',
    notities_vooraf: row.notities_vooraf ?? '',
    adres: row.adres ?? '',
    adres_lat: row.adres_lat ?? null,
    adres_lng: row.adres_lng ?? null,
    oppervlakte_m2: row.oppervlakte_m2 ?? null,
    project_type: row.project_type ?? '',
    project_timing: row.project_timing ?? '',
    volgende_stap: row.volgende_stap ?? '',
    gesprek_notities: row.gesprek_notities ?? '',
    gesprek_datum: row.gesprek_datum ?? '',
    budget_min: row.budget_min ?? null,
    budget_max: row.budget_max ?? null,
    budget_incl6: row.budget_incl6 ?? null,
    budget_incl21: row.budget_incl21 ?? null,
    budget_excl: (row as any).budget_excl ?? null,
    budget_min_excl: (row as any).budget_min_excl ?? null,
    budget_max_excl: (row as any).budget_max_excl ?? null,
    btw_percentage: ((row as any).btw_percentage === 21 ? 21 : 6) as 6 | 21,
    calculator_state: (row as any).calculator_state ?? null,
    prijs_min_incl_btw: (row as any).prijs_min_incl_btw ?? 0,
    prijs_max_incl_btw: (row as any).prijs_max_incl_btw ?? 0,
    prijs_mw_min_incl_btw: (row as any).prijs_mw_min_incl_btw ?? 0,
    prijs_mw_max_incl_btw: (row as any).prijs_mw_max_incl_btw ?? 0,
    inbegrepen_posten: Array.isArray(row.inbegrepen_posten) ? row.inbegrepen_posten : [],
    rapport_tekst: row.rapport_tekst ?? '',
    rapport_highlights: '',
    waarde_tekst_ai: (row as any).waarde_tekst_ai ?? '',
    rapport_situatie_ai: (row as any).rapport_situatie_ai ?? '',
    rapport_verwachtingen_ai: (row as any).rapport_verwachtingen_ai ?? '',
    rapport_besproken_ai: (row as any).rapport_besproken_ai ?? '',
    rapport_aandachtspunten_ai: (row as any).rapport_aandachtspunten_ai ?? '',
    transcript: '',
    rapport_gegenereerd_op: row.rapport_gegenereerd_op ?? null,
    rapport_versies: Array.isArray(row.rapport_versies) ? row.rapport_versies : [],
    project_feiten: Array.isArray(row.project_feiten) ? row.project_feiten : [],
    status: row.status ?? 'nieuw',
    fotos: Array.isArray(row.fotos) ? row.fotos : [],
    technisch: row.technisch ? { ...defaultTechnisch, ...(row.technisch as any) } : { ...defaultTechnisch },
    gespreksvragen: (row as any).gespreksvragen && typeof (row as any).gespreksvragen === 'object'
      ? {
          selected: Array.isArray((row as any).gespreksvragen.selected) ? (row as any).gespreksvragen.selected : [],
          beantwoord: Array.isArray((row as any).gespreksvragen.beantwoord) ? (row as any).gespreksvragen.beantwoord : [],
        }
      : { selected: [], beantwoord: [] },
  };
}

interface DossiersProps {
  onOpenLead?: (lead: LeadData) => void;
  onOpenValidation?: (leadId: string, preIntakeId: string) => void;
  onOpenCall?: (leadId: string) => void;
}

export default function Dossiers({ onOpenLead, onOpenValidation, onOpenCall }: DossiersProps) {
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLead, setPortalLead] = useState<any>(null);
  const [previewLead, setPreviewLead] = useState<any>(null);
  const [offerteLead, setOfferteLead] = useState<any>(null);
  const [stabLead, setStabLead] = useState<any>(null);
  const [genericVoorblad, setGenericVoorblad] = useState<{ lead: any } | null>(null);
  const [photoLead, setPhotoLead] = useState<any>(null);
  const [calcLead, setCalcLead] = useState<any>(null);
  const [prijsCalcLead, setPrijsCalcLead] = useState<any>(null);
  // Kaart aangeklikt in kanban: dossier-actiebalk bovenaan tonen.
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [bouwflowLead, setBouwflowLead] = useState<any>(null);
  const [preIntakeMap, setPreIntakeMap] = useState<Record<string, any>>({});
  const [analysisMap, setAnalysisMap] = useState<Record<string, boolean>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCat, setDragOverCat] = useState<CategoryKey | null>(null);
  const [collapsed, setCollapsed] = useState<Record<CategoryKey, boolean>>({} as any);
  // De browser herstelt bij terugkeer of verversen de vorige scrollpositie,
  // waardoor je halverwege de lijst landt. Altijd bovenaan beginnen.
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollHersteld = useRef(false);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, []);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const [bouwflowSyncing, setBouwflowSyncing] = useState(false);
  const [phaseOptions, setPhaseOptions] = useState<PhaseOption[]>([]);
  const [moveDialog, setMoveDialog] = useState<{ lead: any; cat: CategoryKey } | null>(null);
  // Keuze onthouden: wie in kanban werkt wil daar bij de volgende keer weer staan.
  const [viewMode, setViewMode] = useState<'tabel' | 'kanban'>(
    () => (localStorage.getItem('dossiers_view') === 'kanban' ? 'kanban' : 'tabel')
  );
  // Lege fases nemen standaard geen ruimte in; ze zijn zichtbaar te maken.
  const [toonLegeKolommen, setToonLegeKolommen] = useState(false);
  const [alleenAchterstallig, setAlleenAchterstallig] = useState(false);
  // Open de fasegroep waar de gebruiker het laatst werkte.
  const [faseGroep, setFaseGroep] = useState<FaseGroepKey>(
    () => (localStorage.getItem('dossiers_groep') as FaseGroepKey) || 'intake'
  );
  const kiesGroep = (g: FaseGroepKey) => { setFaseGroep(g); localStorage.setItem('dossiers_groep', g); };
  const [laatsteSync, setLaatsteSync] = useState<string | null>(null);
  const kiesView = (v: 'tabel' | 'kanban') => { setViewMode(v); localStorage.setItem('dossiers_view', v); };
  const toggleCollapse = (k: CategoryKey) => setCollapsed(p => ({ ...p, [k]: !p[k] }));

  // De kolomindeling komt uit Bouwflow, in Bouwflow's eigen volgorde.
  useEffect(() => {
    supabase
      .from('bouwflow_phase_category_map')
      .select('phase_id, phase_title, compass_category, sort_order, pipeline_id')
      .order('sort_order')
      .then(({ data }) => { if (data) setPhaseOptions(data as PhaseOption[]); });
  }, []);

  const CATEGORIES = useMemo(() => buildCategories(phaseOptions), [phaseOptions]);

  // Met 25 fases is een volledig uitgeklapte lijst niet te overzien. De eerste
  // zes (de actieve verkoopfases) staan open, de rest ingeklapt. Alleen de
  // eerste keer instellen, zodat wat de gebruiker daarna open- of dichtklapt
  // blijft staan.
  const defaultsGezet = useRef(false);
  useEffect(() => {
    // Wachten tot de fases geladen zijn: buildCategories geeft altijd al de
    // kolom "Niet in Bouwflow" terug, dus CATEGORIES is nooit leeg en een
    // check daarop zou de defaults op één kolom zetten.
    if (defaultsGezet.current || phaseOptions.length === 0) return;
    defaultsGezet.current = true;
    const start: Record<CategoryKey, boolean> = {};
    CATEGORIES.forEach((c, i) => { start[c.key] = i >= 6; });
    setCollapsed(start);
  }, [CATEGORIES, phaseOptions]);

  const refreshInboxCount = async () => {
    const { count } = await supabase
      .from('inbound_media_pending')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    setInboxCount(count ?? 0);
  };
  useEffect(() => {
    void refreshInboxCount();
    const ch = supabase
      .channel('inbound_media_pending_dossiers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbound_media_pending' }, () => refreshInboxCount())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);


  // Een dossier verplaatsen = de fase in Bouwflow wijzigen. Er is geen
  // Compass-eigen categorie meer die daar los van kan staan.
  const requestMove = (lead: any, cat: CategoryDef) => {
    if (cat.phaseId === null) {
      toast.info('"Niet in Bouwflow" is geen fase; ontkoppelen kan hier niet.');
      return;
    }
    if (!lead.bouwflow_project_pk_id) {
      toast.error('Dit dossier staat nog niet in Bouwflow. Gebruik eerst "Naar Bouwflow pushen".');
      return;
    }
    setMoveDialog({ lead, cat: cat.key });
  };

  const updateNextStep = async (leadId: string, value: string) => {
    const prev = leads.find(l => l.id === leadId);
    setLeads(ls => ls.map(l => l.id === leadId ? { ...l, volgende_stap: value } : l));
    const { error } = await supabase.from('leads').update({ volgende_stap: value }).eq('id', leadId);
    if (error) {
      toast.error('Opslaan mislukt');
      setLeads(ls => ls.map(l => l.id === leadId ? { ...l, volgende_stap: prev?.volgende_stap ?? '' } : l));
    }
  };
  type SortKey = 'naam' | 'gesprek_datum' | 'status' | 'budget' | 'portal' | 'volgende_stap';
  const [sortKey, setSortKey] = useState<SortKey>('gesprek_datum');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const SortIcon = ({ k }: { k: SortKey }) => sortKey !== k
    ? <ArrowUpDown className="h-3 w-3 inline ml-1 opacity-40" />
    : (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />);

  const handlePortalUpdate = (leadId: string, updates: Record<string, any>) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));
  };

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('updated_at', { ascending: false });
    if (!error && data) setLeads(data);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  // De browser herstelt zijn scrollpositie pas zodra de lijst gevuld is, dus
  // één keer opnieuw naar boven zodra de eerste dossiers binnen zijn.
  useEffect(() => {
    if (scrollHersteld.current || leads.length === 0) return;
    scrollHersteld.current = true;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }));
  }, [leads]);

  // Fetch pre-intake indicators
  useEffect(() => {
    const fetchPreIntakes = async () => {
      const { data: piRows } = await supabase
        .from('pre_intake' as any)
        .select('id, lead_id, locked_at, videocall_scheduled_at, plaatsbezoek_scheduled_at, google_meet_link, scenario_chosen');
      if (piRows) {
        const map: Record<string, any> = {};
        (piRows as any[]).forEach(row => { map[row.lead_id] = row; });
        setPreIntakeMap(map);
      }
      const { data: taRows } = await supabase
        .from('transcript_analyses' as any)
        .select('lead_id');
      if (taRows) {
        const aMap: Record<string, boolean> = {};
        (taRows as any[]).forEach(row => { aMap[row.lead_id] = true; });
        setAnalysisMap(aMap);
      }
    };
    fetchPreIntakes();
  }, [leads]);

  const filtered = useMemo(() => {
    // Zoeken over naam, adres, dossiernummer en e-mail.
    const q = search.trim().toLowerCase();
    let base = !q ? leads : leads.filter(l =>
      `${l.voornaam ?? ''} ${l.achternaam ?? ''}`.toLowerCase().includes(q) ||
      (l.adres ?? '').toLowerCase().includes(q) ||
      (l.email ?? '').toLowerCase().includes(q) ||
      (l.bouwflow_project_number ?? '').toLowerCase().includes(q)
    );

    if (alleenAchterstallig) {
      base = base.filter(l => {
        const a = bepaalVolgendeActie(l, preIntakeMap[l.id]);
        return a.niveau === 'te_laat' || a.niveau === 'geen_actie';
      });
    }
    const getVal = (l: any): string | number => {
      switch (sortKey) {
        case 'naam': return `${l.voornaam ?? ''} ${l.achternaam ?? ''}`.trim().toLowerCase();
        case 'gesprek_datum': return l.gesprek_datum || '';
        case 'status': return l.status || '';
        case 'budget': return l.budget_min ?? -1;
        case 'portal': return l.portal_status || 'draft';
        case 'volgende_stap': return (l.volgende_stap || '').toLowerCase();
      }
    };
    const sorted = [...base].sort((a, b) => {
      const va = getVal(a), vb = getVal(b);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [leads, search, sortKey, sortDir, alleenAchterstallig, preIntakeMap]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<CategoryKey, any[]> = {};
    CATEGORIES.forEach(c => { groups[c.key] = []; });
    filtered.forEach(l => {
      const cat = resolveCategory(l);
      // Fase die (nog) niet in de mapping staat: niet stilzwijgend laten
      // verdwijnen uit de lijst.
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(l);
    });
    return groups;
  }, [filtered, CATEGORIES]);

  // Alleen de kolommen van de gekozen fasegroep, en lege fases enkel op verzoek.
  const zoekActief = search.trim().length > 0;

  const zichtbareKolommen = useMemo(() => {
    const groepDef = FASE_GROEPEN.find(g => g.key === faseGroep);
    const inGroep = (c: CategoryDef) =>
      // "Niet in Bouwflow" hoort in elke fasegroep zichtbaar te blijven. Die
      // kolom heeft per definitie geen fase-id, waardoor ze anders uit elke
      // groep met een fasefilter viel — inclusief de standaardweergave, zodat
      // een net aangemaakt dossier nergens te zien was.
      c.phaseId === null
        ? true
        : !groepDef || groepDef.phaseIds.length === 0
          ? true
          : groepDef.phaseIds.includes(c.phaseId);

    const uitCategorieen = CATEGORIES
      // Bij een actieve zoekopdracht doorzoeken we alle dossiers, niet enkel
      // de kolommen van de gekozen fasegroep — anders lijkt een treffer in
      // een andere fase onterecht "niet gevonden".
      .filter(c => (zoekActief || faseGroep === 'alles') ? true : inGroep(c))
      .filter(c => toonLegeKolommen || (groupedByCategory[c.key] ?? []).length > 0);

    // Een fase die Bouwflow kent maar de mappingtabel niet, leverde wel een
    // bak met dossiers op maar geen kolom om ze in te tekenen: die dossiers
    // verdwenen spoorloos uit zowel de tabel als de kanban. Daarom hier een
    // restkolom per onbekende fase, altijd zichtbaar — ze is per definitie
    // niet leeg, en een dossier dat nergens staat is erger dan een kolom met
    // een lelijke naam.
    const bekend = new Set(uitCategorieen.map(c => c.key));
    const restkolommen: CategoryDef[] = Object.entries(groupedByCategory)
      .filter(([key, rijen]) =>
        rijen.length > 0 && !bekend.has(key) && !CATEGORIES.some(c => c.key === key))
      .map(([key]) => {
        const faseId = Number(key.slice('phase:'.length));
        const titel = phaseOptions.find(p => String(p.phase_id) === String(faseId))?.phase_title;
        return {
          key,
          label: titel ? `${titel} (niet ingedeeld)` : `Onbekende Bouwflow-fase ${faseId}`,
          accent: 'border-l-rose-400',
          phaseId: Number.isFinite(faseId) ? faseId : null,
        } as CategoryDef;
      });

    return [...uitCategorieen, ...restkolommen];
  }, [CATEGORIES, faseGroep, toonLegeKolommen, groupedByCategory, zoekActief, phaseOptions]);

  const aantalPerGroep = useMemo(() => {
    const uit: Record<string, number> = {};
    FASE_GROEPEN.forEach(g => {
      uit[g.key] = leads.filter(l => {
        const fase = l.bouwflow_phase ? Number(l.bouwflow_phase) : null;
        if (g.phaseIds.length === 0) return true;
        return fase !== null && g.phaseIds.includes(fase);
      }).length;
    });
    return uit;
  }, [leads]);

  // Uitsluitend cijfers die uit bestaande velden volgen. "Goedgekeurd deze
  // maand" ontbreekt bewust: er is geen datum van fasewijziging in Compass.
  const kpi = useMemo(() => {
    const inactieveFases = FASE_GROEPEN.find(g => g.key === 'inactief')?.phaseIds ?? [];
    const actieveDossiers = leads.filter(l => {
      const fase = l.bouwflow_phase ? Number(l.bouwflow_phase) : null;
      return fase === null || !inactieveFases.includes(fase);
    });
    const metWaarde = actieveDossiers.filter(l => dossierWaarde(l) != null);
    return {
      actief: actieveDossiers.length,
      pipelinewaarde: metWaarde.reduce((s, l) => s + (dossierWaarde(l) ?? 0), 0),
      waardeVanAantal: metWaarde.length,
      opvolgingNodig: actieveDossiers.filter(l => {
        const a = bepaalVolgendeActie(l, preIntakeMap[l.id]);
        return a.niveau === 'te_laat' || a.niveau === 'geen_actie';
      }).length,
    };
  }, [leads, preIntakeMap]);


  const stats = useMemo(() => {
    const total = leads.length;
    const withBudget = leads.filter(l => l.budget_min != null);
    const avgBudget = withBudget.length
      ? withBudget.reduce((s, l) => s + ((l.budget_min || 0) + (l.budget_max || 0)) / 2, 0) / withBudget.length
      : 0;
    const channels = leads.reduce((acc: Record<string, number>, l) => {
      if (l.gevonden_via) acc[l.gevonden_via] = (acc[l.gevonden_via] || 0) + 1;
      return acc;
    }, {});
    const topChannel = Object.entries(channels).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || '—';
    const converted = leads.filter(l => ['offerte', 'uitvoering', 'afgesloten'].includes(l.status)).length;
    const ratio = total > 0 ? `${Math.round((converted / total) * 100)}%` : '—';
    return { total: String(total), avgBudget: avgBudget ? fmt(avgBudget) : '—', topChannel, ratio };
  }, [leads]);

  const handleOpen = (row: any) => {
    const leadData = rowToLead(row);
    onOpenLead?.(leadData);
  };

  const handleDelete = async (e: React.MouseEvent, lead: any) => {
    e.stopPropagation();
    const naam = `${lead.voornaam} ${lead.achternaam}`.trim() || 'dit dossier';
    if (!window.confirm(`Weet je zeker dat je "${naam}" wilt verwijderen?`)) return;
    const { error } = await supabase.from('leads').delete().eq('id', lead.id);
    if (error) toast.error('Verwijderen mislukt');
    else { toast.success('Dossier verwijderd'); setLeads(prev => prev.filter(l => l.id !== lead.id)); }
  };

  const handleConvert = async (e: React.MouseEvent, lead: any) => {
    e.stopPropagation();
    const naam = `${lead.voornaam} ${lead.achternaam}`.trim() || 'dit dossier';
    if (!window.confirm(`"${naam}" markeren als uitgevoerd (afgesloten)?`)) return;
    const { error } = await supabase.from('leads').update({ status: 'afgesloten' }).eq('id', lead.id);
    if (error) toast.error('Status wijzigen mislukt');
    else { toast.success('Dossier gemarkeerd als afgesloten'); setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'afgesloten' } : l)); }
  };

  const handleDownloadPdf = async (e: React.MouseEvent, lead: any) => {
    e.stopPropagation();
    const filename = `Zolderpunt_${lead.achternaam || 'Klant'}_${lead.gesprek_datum ? formatDatum(lead.gesprek_datum).replace(/\//g, '-') : 'rapport'}.pdf`;
    const fallbackWindow = openDownloadWindow(filename);
    const t = toast.loading('PDF wordt opgemaakt...');
    try {
      const reportData: ReportData = {
        voornaam: lead.voornaam || '', achternaam: lead.achternaam || '',
        adres: lead.adres || '',
        datum_gesprek: lead.gesprek_datum || new Date().toISOString().split('T')[0],
        situatie: lead.rapport_situatie_ai || '',
        verwachtingen: lead.rapport_verwachtingen_ai || '',
        besproken: lead.rapport_besproken_ai || '',
        aandachtspunten: lead.rapport_aandachtspunten_ai || '',
        gewenst_resultaat: lead.gezocht_naar || '—',
        oppervlakte_m2: lead.oppervlakte_m2 || 0,
        prijs_min: lead.budget_min || 0, prijs_max: lead.budget_max || 0,
        prijs_incl6: lead.budget_incl6 || 0, prijs_incl21: lead.budget_incl21 || 0,
        budget_excl: lead.budget_excl || 0,
        budget_min_excl: lead.budget_min_excl ?? null,
        budget_max_excl: lead.budget_max_excl ?? null,
        btw_percentage: lead.btw_percentage ?? 6,
        prijs_min_incl_btw: lead.prijs_min_incl_btw ?? 0,
        prijs_max_incl_btw: lead.prijs_max_incl_btw ?? 0,
        prijs_mw_min_incl_btw: lead.prijs_mw_min_incl_btw ?? 0,
        prijs_mw_max_incl_btw: lead.prijs_mw_max_incl_btw ?? 0,
        // Same as Slide10: inbound photos carry `path` (not `url`) and would
        // otherwise be missing from the report; video is left out entirely.
        fotos: imagesOnly(normalizeLeadMedia(lead.fotos)).map((m) => m.url),
        fotos_met_path: imagesOnly(normalizeLeadMedia(lead.fotos)).map((m) => ({ url: m.url, storage_path: m.path })),
        waarde_tekst_ai: lead.waarde_tekst_ai || 'Extra leefruimte gecreëerd uit ruimte die er al was.',
        inbegrepen_posten: lead.inbegrepen_posten || [],
        project_feiten: (lead.project_feiten || []).filter((f: any): f is FeitjeItem => typeof f === 'object' && 'tekst' in f),
      };
      const blob = await pdf(<ReportDocument data={reportData} />).toBlob();
      await downloadBlob(blob, filename, fallbackWindow);
      toast.success('PDF gedownload of geopend', { id: t });
    } catch (err: any) {
      if (fallbackWindow && !fallbackWindow.closed) fallbackWindow.close();
      console.error(err);
      toast.error('PDF mislukt', { id: t });
    }
  };

  const slugFn = (s: string) => (s || '').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'Klant';


  const handleCleanEmpty = async () => {
    const { data: candidates, error } = await supabase.from('leads').select('id, created_at')
      .eq('voornaam', '').eq('achternaam', '').eq('email', '').eq('telefoon', '')
      .eq('adres', '').is('oppervlakte_m2', null)
      .eq('gezocht_naar', '').eq('gesprek_notities', '').eq('notities_vooraf', '')
      .is('budget_min', null).eq('rapport_situatie_ai', '').eq('rapport_tekst', '');
    if (error) { toast.error('Selectie mislukt'); return; }
    const count = candidates?.length ?? 0;
    if (count === 0) { toast.info('Geen lege dossiers gevonden'); return; }
    if (!window.confirm(`${count} volledig leeg dossier(s) gevonden. Definitief verwijderen?`)) return;
    const ids = candidates!.map((c: any) => c.id);
    const { error: delErr } = await supabase.from('leads').delete().in('id', ids);
    if (delErr) toast.error('Verwijderen mislukt');
    else { toast.success(`${count} leeg dossier(s) verwijderd`); fetchLeads(); }
  };
  const handleBouwflowSync = async () => {
    setBouwflowSyncing(true);
    try {
      const { data: phasesData, error: phasesError } = await supabase.functions.invoke('sync-bouwflow-phases', { body: {} });
      if (phasesError) throw new Error(phasesError.message || 'Synchroniseren van Bouwflow-fasen mislukt');
      if (phasesData?.error) throw new Error(String(phasesData.error));

      // Echte run: de knop deed eerder enkel een dry-run, waardoor er nooit
      // iets gekoppeld of aangemaakt werd en nieuwe Bouwflow-projecten
      // onzichtbaar bleven in Compass. Matchen gebeurt nu ook op telefoon en
      // e-mail, dus een website-lead die los in beide systemen staat wordt
      // gekoppeld in plaats van gedupliceerd.
      const { data: pullData, error: pullError } = await supabase.functions.invoke('pull-bouwflow-projects', {
        body: { dry_run: false },
      });
      if (pullError) throw new Error(pullError.message || 'Bouwflow-sync mislukt');
      if (pullData?.error) throw new Error(String(pullData.error));

      const fasesCount = phasesData?.count ?? 0;
      const matched = pullData?.matched ?? 0;
      const created = pullData?.created ?? 0;

      toast.success(
        `${fasesCount} fases bijgewerkt · ${matched} dossiers gekoppeld · ${created} nieuw aangemaakt`,
      );
      setLaatsteSync(
        new Date().toLocaleString('nl-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      );
      await fetchLeads();
    } catch (err: any) {
      toast.error(err?.message || 'Synchroniseren met Bouwflow mislukt');
    } finally {
      setBouwflowSyncing(false);
    }
  };


  const handleStartVideocall = async (lead: any) => {
    let pi = preIntakeMap[lead.id];
    if (!pi?.id) {
      const { data, error } = await supabase
        .from('pre_intake')
        .insert({ lead_id: lead.id, videocall_planned: true } as any)
        .select()
        .single();
      if (error || !data) { toast.error('Videocall intake kon niet gestart worden'); return; }
      pi = data;
      setPreIntakeMap(prev => ({ ...prev, [lead.id]: data }));
    }
    // Het intakegesprek is de slidesflow (voorbereiding, gesprek, rapport), niet
    // het belscherm. Dit riep onOpenCall aan en kwam dus uit bij het
    // telefoongesprek.
    handleOpen(lead);
  };


  return (
    // Volle breedte met een smalle marge: de pipeline heeft alle ruimte nodig,
    // en een neutraal grijs laat de witte kaarten en werkbalk uitkomen.
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-headline font-bold text-foreground">Dossiers</h1>
          <div className="flex gap-2">
            <Button
              variant={inboxCount > 0 ? 'default' : 'outline'}
              onClick={() => setInboxOpen(true)}
              className="gap-2 font-headline relative"
              title={INBOUND_HINT_TEXT}
            >
              <Inbox className="h-4 w-4" /> Inbox
              {inboxCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                  {inboxCount}
                </span>
              )}
            </Button>
            {/* Geen eigen "Nieuwe lead"-knop meer: de navigatiebalk heeft
                "Nieuw dossier", en twee knoppen voor hetzelfde is verwarrend. */}
            {/* Vernieuwen is een klein icoon; zeldzame acties zitten onder
                "Meer", zodat er maar één opvallende actie overblijft. */}
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchLeads}
              disabled={loading}
              title="Lijst vernieuwen"
              aria-label="Lijst vernieuwen"
              className="h-9 w-9"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 font-headline">
                  <MoreVertical className="h-4 w-4" /> Meer
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={handleBouwflowSync} disabled={bouwflowSyncing}>
                  <ArrowRightLeft className={`h-4 w-4 mr-2 text-primary ${bouwflowSyncing ? 'animate-pulse' : ''}`} />
                  <div className="flex flex-col">
                    <span>Synchroniseren met Bouwflow</span>
                    <span className="text-xs text-muted-foreground">
                      {laatsteSync ? `Laatst: ${laatsteSync}` : 'Nog niet gesynchroniseerd'}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setGenericVoorblad({ lead: null })}>
                  <FileText className="h-4 w-4 mr-2 text-primary" /> Generiek voorblad maken
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOfferteLead({ __standalone: true })}>
                  <FileText className="h-4 w-4 mr-2 text-primary" /> Offerte &amp; bijlage maken
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCleanEmpty}>Lege dossiers wissen</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>


        <Tabs defaultValue="overzicht">
          <TabsList className="mb-6">
            <TabsTrigger value="overzicht" className="font-headline">Overzicht</TabsTrigger>
            <TabsTrigger value="statistieken" className="font-headline">Statistieken</TabsTrigger>
            <TabsTrigger value="sales-analyse" className="font-headline">Sales Analyse</TabsTrigger>
          </TabsList>

          <TabsContent value="overzicht">
            {/* Staat bewust bovenaan: een kapotte Bouwflow-koppeling moet je
                zien zonder ernaar te zoeken. */}
            <BouwflowSyncStatus onSynced={fetchLeads} />

            <div className="mb-4">
              <PipelineHeader
                kpi={kpi}
                groep={faseGroep}
                onGroep={kiesGroep}
                aantalPerGroep={aantalPerGroep}
                zoek={search}
                onZoek={setSearch}
                viewMode={viewMode}
                onView={kiesView}
                toonLege={toonLegeKolommen}
                onToonLege={setToonLegeKolommen}
                alleenAchterstallig={alleenAchterstallig}
                onAlleenAchterstallig={setAlleenAchterstallig}
              />
            </div>

            {loading && leads.length === 0 ? (
              <div className="bg-card border border-dashed border-border p-16 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-body">Dossiers laden...</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="bg-card border border-dashed border-border p-16 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-body">Nog geen dossiers. Start een nieuw intakegesprek om te beginnen.</p>
              </div>
            ) : (() => {
              const activeLead = leads.find(l => l.id === activeLeadId) ?? null;
              const actionBar = activeLead ? (
                <div className="space-y-3">
                  <LeadActionBar
                    lead={activeLead}
                    onClose={() => setActiveLeadId(null)}
                    onOpenDossier={() => handleOpen(activeLead)}
                    onCall={() => onOpenCall?.(activeLead.id)}
                    onIntake={() => handleStartVideocall(activeLead)}
                    onPhotos={() => setPhotoLead(activeLead)}
                    onPortal={() => setPortalLead(activeLead)}
                    onCalculator={() => setCalcLead(activeLead)}
                    onPrijscalculator={() => setPrijsCalcLead(activeLead)}
                    onVoorblad={() => setGenericVoorblad({ lead: activeLead })}
                    onOfferte={() => setOfferteLead(activeLead)}
                  />
                  {/* Verschijnt alleen als deze klant meer dan één project heeft. */}
                  <KlantDossiers
                    leadId={activeLead.id}
                    customerId={activeLead.customer_id}
                    onOpenDossier={(id) => setActiveLeadId(id)}
                  />
                </div>
              ) : null;

              const renderRow = (lead: any) => (
                <TableRow
                  key={lead.id}
                  draggable
                  onDragStart={(e) => { setDraggingId(lead.id); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragEnd={() => { setDraggingId(null); setDragOverCat(null); }}
                  className={`cursor-pointer hover:bg-accent/50 ${draggingId === lead.id ? 'opacity-40' : ''}`}
                  onClick={() => handleOpen(lead)}
                >
                  <TableCell className="w-6 pr-0 text-muted-foreground/40" onClick={(e) => e.stopPropagation()}>
                    <GripVertical className="h-4 w-4 cursor-grab active:cursor-grabbing" />
                  </TableCell>
                  <TableCell className="font-medium font-headline">
                    {lead.voornaam || lead.achternaam
                      ? `${lead.voornaam} ${lead.achternaam}`.trim()
                      : <span className="text-muted-foreground italic">Geen naam</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {preIntakeMap[lead.id] && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onOpenValidation?.(lead.id, preIntakeMap[lead.id].id); }}
                          className="inline-flex items-center gap-1 text-[0.6rem] font-bold tracking-wider uppercase px-1.5 py-0.5 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Open transcript validatie"
                        >
                          <Phone className="h-3 w-3" />
                        </button>
                      )}
                      {analysisMap[lead.id] && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onOpenValidation?.(lead.id, preIntakeMap[lead.id]?.id); }}
                          className="inline-flex items-center gap-1 text-[0.6rem] font-bold tracking-wider uppercase px-1.5 py-0.5 bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                          title="Bekijk transcript analyse"
                        >
                          <Bot className="h-3 w-3" />
                        </button>
                      )}
                      {lead.afwijs_reden && (
                        <span
                          className="inline-flex items-center text-[0.6rem] font-bold tracking-wider uppercase px-1.5 py-0.5 bg-red-100 text-red-800"
                          title={`Afgewezen: ${lead.afwijs_reden}`}
                        >
                          ?
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-body">{formatDatum(lead.gesprek_datum)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={lead.status} />
                      {lead.offerte_bedrag_excl != null && (
                        // Excl tegen excl: budget_min/budget_max zijn incl. 6%
                        // en kleurden een te hoge offerte ten onrechte groen.
                        <OfferteCompareBadge
                          bedrag={Number(lead.offerte_bedrag_excl)}
                          min={exclVorkVanLead(lead)?.min ?? 0}
                          max={exclVorkVanLead(lead)?.max ?? 0}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-body">
                    {(() => {
                      // Zelfde eenheid als de pipelinewaarde: excl. btw, en dat
                      // staat erbij — ongelabelde incl-6%-bedragen lazen als
                      // "de prijs", wat bij een 21%-dossier dubbel misleidde.
                      const vork = exclVorkVanLead(lead);
                      return vork
                        ? <>{fmt(vork.min)} — {fmt(vork.max)} <span className="text-xs text-muted-foreground">excl.</span></>
                        : '—';
                    })()}
                  </TableCell>
                  <TableCell>
                    <PortalStatusBadge status={lead.portal_status || 'draft'} />
                  </TableCell>
                  <TableCell className="font-body" onClick={(e) => e.stopPropagation()}>
                    <NextStepCell
                      value={lead.volgende_stap || ''}
                      preIntake={preIntakeMap[lead.id]}
                      onChange={(v) => updateNextStep(lead.id, v)}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1 h-8">
                          <span className="text-xs font-headline">Acties</span>
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Dossier</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpen(lead)}>
                          <FolderOpen className="h-4 w-4 mr-2" /> Dossier openen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOpenCall?.(lead.id)}>
                          <Phone className="h-4 w-4 mr-2 text-[#008CFF]" /> Telefoongesprek
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStartVideocall(lead)}>
                          <Bot className="h-4 w-4 mr-2 text-primary" /> Videocall intake
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPhotoLead(lead)}>
                          <ImageIcon className="h-4 w-4 mr-2 text-primary" /> Foto's
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPrijsCalcLead(lead)}>
                          <Euro className="h-4 w-4 mr-2 text-primary" /> Prijscalculator
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Bouwflow</DropdownMenuLabel>
                        {/* Het PROJECTnummer bepaalt of dit dossier al in
                            BouwFlow staat; bouwflow_project_id bevat een
                            CUSTOMER-id en is leeg bij dossiers die via de sync
                            gekoppeld werden. */}
                        {(lead.bouwflow_project_number || lead.bouwflow_project_pk_id || lead.bouwflow_project_id) ? (
                          <DropdownMenuItem
                            disabled
                            className="opacity-100 cursor-default text-green-700 focus:bg-transparent focus:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Al in Bouwflow{lead.bouwflow_project_number ? ` · #${lead.bouwflow_project_number}` : ''}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setBouwflowLead(lead)}>
                            <Send className="h-4 w-4 mr-2 text-primary" /> Naar Bouwflow pushen
                          </DropdownMenuItem>
                        )}


                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <ArrowRightLeft className="h-4 w-4 mr-2 text-primary" /> Verplaatsen naar…
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-64">
                            {/* Zelfde weg als slepen: bevestigen, dan moet Bouwflow
                                het doorvoeren voor de kaart verspringt. */}
                            {CATEGORIES.filter(c => c.phaseId !== null).map(c => (
                              <DropdownMenuItem
                                key={c.key}
                                disabled={resolveCategory(lead) === c.key}
                                onClick={() => requestMove(lead, c)}
                              >
                                {c.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Offerte & rapport</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setOfferteLead(lead)}>
                          <Receipt className="h-4 w-4 mr-2 text-primary" /> Offerte & bijlage
                        </DropdownMenuItem>
                        {lead.rapport_gegenereerd_op && (
                          <DropdownMenuItem onClick={(e) => handleDownloadPdf(e as any, lead)}>
                            <FileDown className="h-4 w-4 mr-2 text-[#2E7D38]" /> PDF rapport downloaden
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setStabLead(lead); }}>
                          <Hammer className="h-4 w-4 mr-2 text-primary" /> Stabiliteitsstudie (voorblad + merge)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setGenericVoorblad({ lead }); }}>
                          <FileText className="h-4 w-4 mr-2 text-primary" /> Generiek voorblad
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Portaal & status</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setPortalLead(lead)}>
                          <Globe className="h-4 w-4 mr-2 text-[#008CFF]" /> Portaal beheren
                        </DropdownMenuItem>
                        {lead.status !== 'afgesloten' && (
                          <DropdownMenuItem onClick={(e) => handleConvert(e as any, lead)}>
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> Markeer afgesloten
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => handleDelete(e as any, lead)} className="text-destructive focus:text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Dossier verwijderen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );

              if (viewMode === 'kanban') {
                return (
                  <>
                  {actionBar}

                  <KanbanBoard
                    columns={zichtbareKolommen}
                    grouped={groupedByCategory}
                    zoekActief={zoekActief}
                    preIntakeMap={preIntakeMap}
                    draggingId={draggingId}
                    dragOverKey={dragOverCat}
                    activeLeadId={activeLeadId}
                    onDragStart={setDraggingId}
                    onDragEnd={() => { setDraggingId(null); setDragOverCat(null); }}
                    onDragOverColumn={setDragOverCat}
                    onDropOnColumn={(key) => {
                      if (draggingId) {
                        const current = leads.find(l => l.id === draggingId);
                        const cat = CATEGORIES.find(c => c.key === key);
                        // Zelfde weg als de tabel: bevestigen, en Bouwflow moet de
                        // fase doorvoeren voor de kaart verspringt.
                        if (current && cat && resolveCategory(current) !== key) requestMove(current, cat);
                      }
                      setDraggingId(null);
                      setDragOverCat(null);
                    }}
                    // Klikken op een kaart opent het dossier, net als een rij in
                    // de tabel. Enkel de actiebalk tonen liet de kaart dood aanvoelen.
                    onOpenLead={(l) => handleOpen(l)}
                    onSelectLead={(l) => setActiveLeadId(l.id)}
                  />
                  </>
                );
              }

              return (
                <div className="space-y-4">


                  {/* Zelfde fasegroep en lege-fases-instelling als de kanban,
                      anders tonen de twee weergaven iets anders. */}
                  {zichtbareKolommen.map(cat => {
                    const rows = groupedByCategory[cat.key];
                    // Tijdens zoeken altijd open: een treffer in een ingeklapte
                    // categorie mag niet verborgen blijven achter de toggle.
                    const isOpen = !collapsed[cat.key] || zoekActief;
                    const isDragTarget = dragOverCat === cat.key;
                    return (
                      <div
                        key={cat.key}
                        onDragOver={(e) => { if (draggingId) { e.preventDefault(); setDragOverCat(cat.key); } }}
                        onDragLeave={() => setDragOverCat(prev => prev === cat.key ? null : prev)}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggingId) {
                            const current = leads.find(l => l.id === draggingId);
                            // Niet meteen verplaatsen: eerst bevestigen, en Bouwflow
                            // moet de fase doorvoeren voor de kaart verspringt.
                            if (current && resolveCategory(current) !== cat.key) requestMove(current, cat);
                          }
                          setDraggingId(null);
                          setDragOverCat(null);
                        }}
                        className={`bg-card border border-border border-l-4 ${cat.accent} overflow-hidden transition-colors ${isDragTarget ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleCollapse(cat.key)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="font-headline font-bold text-foreground">{cat.label}</span>
                            <span className="text-xs font-bold px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                              {rows.length}
                            </span>
                          </div>
                        </button>
                        {isOpen && (
                          rows.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-6"></TableHead>
                                  <TableHead onClick={() => toggleSort('naam')} className="cursor-pointer select-none">Naam<SortIcon k="naam" /></TableHead>
                                  <TableHead></TableHead>
                                  <TableHead onClick={() => toggleSort('gesprek_datum')} className="cursor-pointer select-none">Datum<SortIcon k="gesprek_datum" /></TableHead>
                                  <TableHead onClick={() => toggleSort('status')} className="cursor-pointer select-none">Status<SortIcon k="status" /></TableHead>
                                  <TableHead onClick={() => toggleSort('budget')} className="cursor-pointer select-none">Budget<SortIcon k="budget" /></TableHead>
                                  <TableHead onClick={() => toggleSort('portal')} className="cursor-pointer select-none">Portaal<SortIcon k="portal" /></TableHead>
                                  <TableHead onClick={() => toggleSort('volgende_stap')} className="cursor-pointer select-none">Volgende stap<SortIcon k="volgende_stap" /></TableHead>
                                  <TableHead>Acties</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rows.map(renderRow)}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="px-4 py-6 text-center text-xs text-muted-foreground/70 italic border-t border-border/50">
                              Geen dossiers in deze categorie{draggingId ? ' — sleep hier om te verplaatsen' : ''}.
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>


          <TabsContent value="statistieken">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Users} label="Totaal leads" value={stats.total} />
              <StatCard icon={TrendingUp} label="Conversieratio" value={stats.ratio} />
              <StatCard icon={DollarSign} label="Gem. budget" value={stats.avgBudget} />
              <StatCard icon={Eye} label="Top kanaal" value={stats.topChannel} />
            </div>
          </TabsContent>

          <TabsContent value="sales-analyse">
            <SalesAnalysis />
          </TabsContent>
        </Tabs>
      </div>

      {portalLead && (
        <PortalManageDialog
          open={!!portalLead}
          onClose={() => setPortalLead(null)}
          lead={portalLead}
          onUpdate={handlePortalUpdate}
          onPreview={(lead) => { setPortalLead(null); setPreviewLead(lead); }}
        />
      )}

      {previewLead && (
        <PortalPreview lead={previewLead} onClose={() => setPreviewLead(null)} />
      )}

      {offerteLead && (
        <OffertebijlageDialog
          open={!!offerteLead}
          onClose={() => setOfferteLead(null)}
          lead={offerteLead}
          onUpdate={(leadId, patch) => {
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...patch } : l));
            setOfferteLead((prev: any) => prev ? { ...prev, ...patch } : prev);
          }}
        />
      )}

      {stabLead && (
        <StabiliteitVoorbladDialog
          open={!!stabLead}
          onClose={() => setStabLead(null)}
          lead={stabLead}
        />
      )}

      {genericVoorblad && (
        <GenericVoorbladDialog
          open={!!genericVoorblad}
          onClose={() => setGenericVoorblad(null)}
          lead={genericVoorblad.lead}
        />
      )}

      {photoLead && (
        <PhotoUploadDialog
          open={!!photoLead}
          onClose={() => setPhotoLead(null)}
          lead={photoLead}
          onUpdate={(leadId, patch) => {
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...patch } : l));
            setPhotoLead((prev: any) => prev ? { ...prev, ...patch } : prev);
          }}
        />
      )}
      {calcLead && (
        <CalculatorDialog
          lead={calcLead}
          onClose={() => setCalcLead(null)}
          onUpdate={(leadId, patch) => setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...patch } : l))}
        />
      )}
      <PrijscalculatorDialog
        lead={prijsCalcLead}
        onOpenChange={(open) => { if (!open) setPrijsCalcLead(null); }}
        onSaved={() => { void fetchLeads(); }}
      />

      <InboundInboxDialog
        open={inboxOpen}
        onOpenChange={setInboxOpen}
        onAssigned={() => { void fetchLeads(); void refreshInboxCount(); }}
      />

      {bouwflowLead && (
        <PushToBouwflowDialog
          open={!!bouwflowLead}
          onClose={() => setBouwflowLead(null)}
          lead={bouwflowLead}
          onPushed={(leadId, patch) => {
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...patch } : l));
            setBouwflowLead(null);
          }}
        />
      )}

      <MoveBouwflowPhaseDialog
        open={!!moveDialog}
        onOpenChange={(v) => { if (!v) setMoveDialog(null); }}
        lead={moveDialog?.lead ?? null}
        targetPhase={phaseOptions.find(p => phaseKey(p.phase_id) === moveDialog?.cat) ?? null}
        onConfirmed={(phase, reden) => {
          // Bouwflow is bevestigd bijgewerkt; de edge function heeft de rij al
          // aangepast. Hier enkel de lokale weergave gelijkzetten.
          if (moveDialog) {
            const leadId = moveDialog.lead.id;
            setLeads(prev => prev.map(l => l.id === leadId
              ? { ...l, bouwflow_phase: String(phase.phase_id), ...(reden ? { afwijs_reden: reden } : {}) }
              : l));
            toast.success(`Verplaatst — Bouwflow staat nu op "${phase.phase_title}"`);
          }
          setMoveDialog(null);
        }}
      />
    </div>
  );
}

function OfferteCompareBadge({ bedrag, min, max }: { bedrag: number; min: number; max: number }) {
  if (!min || !max) {
    return (
      <span className="inline-block text-[0.6rem] font-bold tracking-wider uppercase px-2 py-0.5 bg-primary/10 text-primary w-fit">
        Offerte: {new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(bedrag)}
      </span>
    );
  }
  let cls = 'bg-green-100 text-green-700';
  let label = 'Offerte binnen intake';
  if (bedrag < min) {
    const pct = Math.round(((min - bedrag) / min) * 100);
    cls = 'bg-blue-100 text-blue-700';
    label = `Offerte −${pct}% < min`;
  } else if (bedrag > max) {
    const pct = Math.round(((bedrag - max) / max) * 100);
    cls = 'bg-red-100 text-red-700';
    label = `Offerte +${pct}% > max`;
  }
  return (
    <span className={`inline-block text-[0.6rem] font-bold tracking-wider uppercase px-2 py-0.5 w-fit ${cls}`}>
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-card border border-border p-5">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="h-5 w-5 text-primary" />
        <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-headline font-bold text-foreground">{value}</div>
    </div>
  );
}

const PORTAL_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Concept', color: 'text-[#888888]', bg: 'bg-[#E2E8F0]' },
  review: { label: 'Review', color: 'text-[#F6AD55]', bg: 'bg-[#F6AD55]/10' },
  active: { label: 'Actief', color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/10' },
  closed: { label: 'Gesloten', color: 'text-[#888888]', bg: 'bg-[#E2E8F0]' },
};

function PortalStatusBadge({ status }: { status: string }) {
  const config = PORTAL_STATUS_CONFIG[status] || PORTAL_STATUS_CONFIG.draft;
  return (
    <span className={`inline-block text-[0.65rem] font-bold tracking-wider uppercase px-2 py-0.5 ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status || '—', bg: 'bg-muted', color: 'text-muted-foreground' };
  return (
    <span className={`inline-block text-[0.7rem] font-bold tracking-wider uppercase px-2.5 py-1 ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}

function NextStepCell({ value, preIntake, onChange }: { value: string; preIntake: any; onChange: (v: string) => void }) {
  const now = Date.now();
  const pb = preIntake?.plaatsbezoek_scheduled_at ? new Date(preIntake.plaatsbezoek_scheduled_at) : null;
  const vc = preIntake?.videocall_scheduled_at ? new Date(preIntake.videocall_scheduled_at) : null;
  const autoDetected: string | null =
    pb && pb.getTime() >= now ? 'Plaatsbezoek'
    : vc && vc.getTime() >= now ? 'Videocall'
    : null;

  const effective = value || autoDetected || '';
  const isPreset = (NEXT_STEP_PRESETS as readonly string[]).includes(effective);
  const isOther = !!effective && !isPreset;

  const [editingOther, setEditingOther] = useState(isOther);
  const [otherText, setOtherText] = useState(isOther ? effective : '');

  useEffect(() => {
    if (isOther) { setEditingOther(true); setOtherText(effective); }
  }, [effective, isOther]);

  const selectValue = editingOther ? NEXT_STEP_OTHER : (isPreset ? effective : '');

  const scheduleBadge = autoDetected === 'Videocall' && vc ? (
    <span className="text-[0.65rem] text-muted-foreground mt-1">
      {formatDatum(vc.toISOString())} · {vc.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
    </span>
  ) : autoDetected === 'Plaatsbezoek' && pb ? (
    <span className="text-[0.65rem] text-muted-foreground mt-1">
      {formatDatum(pb.toISOString())} · {pb.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
    </span>
  ) : null;

  return (
    <div className="flex flex-col min-w-[170px]">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === NEXT_STEP_OTHER) {
            setEditingOther(true);
            setOtherText('');
          } else {
            setEditingOther(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={autoDetected ? autoDetected : 'Kies volgende stap…'} />
        </SelectTrigger>
        <SelectContent>
          {NEXT_STEP_PRESETS.map(p => (
            <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
          ))}
          <SelectItem value={NEXT_STEP_OTHER} className="text-xs">Andere…</SelectItem>
        </SelectContent>
      </Select>
      {editingOther && (
        <Input
          autoFocus
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          onBlur={() => { const t = otherText.trim(); if (t) onChange(t); else setEditingOther(false); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { const t = otherText.trim(); if (t) onChange(t); (e.target as HTMLInputElement).blur(); }
            if (e.key === 'Escape') { setEditingOther(false); setOtherText(''); }
          }}
          placeholder="Beschrijf de volgende stap…"
          className="h-7 mt-1 text-xs"
        />
      )}
      {scheduleBadge}
    </div>
  );
}
