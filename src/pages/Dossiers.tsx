import { useSession } from '@/contexts/SessionContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useMemo } from 'react';
import { Search, FolderOpen, Users, TrendingUp, DollarSign, Eye, RefreshCw, Trash2, CheckCircle, Globe, Phone, Bot, FileDown, MoreVertical, ArrowUp, ArrowDown, ArrowUpDown, FileText, Receipt, Hammer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { defaultTechnisch } from '@/contexts/SessionContext';
import type { LeadData } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import SalesAnalysis from '@/components/SalesAnalysis';
import PortalManageDialog from '@/components/portal/PortalManageDialog';
import PortalPreview from '@/components/portal/PortalPreview';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { pdf } from '@react-pdf/renderer';
import ReportDocument from '@/components/report/ReportDocument';
import type { ReportData, FeitjeItem } from '@/components/report/reportTypes';
import OffertebijlageDialog from '@/components/dossier/OffertebijlageDialog';
import StabiliteitVoorbladDialog from '@/components/dossier/StabiliteitVoorbladDialog';
import GenericVoorbladDialog from '@/components/dossier/GenericVoorbladDialog';

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
  onOpenCall?: (leadId: string, step?: 'calling' | 'wrap-up') => void;
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
  const [preIntakeMap, setPreIntakeMap] = useState<Record<string, any>>({});
  const [analysisMap, setAnalysisMap] = useState<Record<string, boolean>>({});
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

  // Fetch pre-intake indicators
  useEffect(() => {
    const fetchPreIntakes = async () => {
      const { data: piRows } = await supabase
        .from('pre_intake' as any)
        .select('id, lead_id, locked_at, videocall_scheduled_at, google_meet_link, scenario_chosen');
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
    const base = !search.trim() ? leads : leads.filter(l =>
      `${l.voornaam} ${l.achternaam}`.toLowerCase().includes(search.toLowerCase()) ||
      (l.adres ?? '').toLowerCase().includes(search.toLowerCase())
    );
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
  }, [leads, search, sortKey, sortDir]);

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
        btw_percentage: lead.btw_percentage ?? 6,
        prijs_min_incl_btw: lead.prijs_min_incl_btw ?? 0,
        prijs_max_incl_btw: lead.prijs_max_incl_btw ?? 0,
        prijs_mw_min_incl_btw: lead.prijs_mw_min_incl_btw ?? 0,
        prijs_mw_max_incl_btw: lead.prijs_mw_max_incl_btw ?? 0,
        fotos: (lead.fotos || []).filter((f: any) => f.url).map((f: any) => f.url),
        fotos_met_path: (lead.fotos || []).filter((f: any) => f.url).map((f: any) => ({ url: f.url, storage_path: f.storage_path })),
        waarde_tekst_ai: lead.waarde_tekst_ai || 'Extra leefruimte gecreëerd uit ruimte die er al was.',
        inbegrepen_posten: lead.inbegrepen_posten || [],
        project_feiten: (lead.project_feiten || []).filter((f: any): f is FeitjeItem => typeof f === 'object' && 'tekst' in f),
      };
      const blob = await pdf(<ReportDocument data={reportData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Zolderpunt_${lead.achternaam || 'Klant'}_${lead.gesprek_datum || 'rapport'}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF gedownload', { id: t });
    } catch (err: any) {
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


  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-headline font-bold text-foreground">Dossiers</h1>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 font-headline">
                  <MoreVertical className="h-4 w-4" /> Bulkacties
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCleanEmpty}>Lege dossiers wissen</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGenericVoorblad({ lead: null })}>
                  <FileText className="h-4 w-4 mr-2 text-primary" /> Generiek voorblad maken
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOfferteLead({ __standalone: true })}>
                  <FileText className="h-4 w-4 mr-2 text-primary" /> Offerte & bijlage maken
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={fetchLeads} className="gap-2 font-headline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Vernieuwen
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overzicht">
          <TabsList className="mb-6">
            <TabsTrigger value="overzicht" className="font-headline">Overzicht</TabsTrigger>
            <TabsTrigger value="statistieken" className="font-headline">Statistieken</TabsTrigger>
            <TabsTrigger value="sales-analyse" className="font-headline">Sales Analyse</TabsTrigger>
          </TabsList>

          <TabsContent value="overzicht">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Zoeken op naam of adres..."
                  className="pl-9 bg-card"
                />
              </div>
            </div>

            {filtered.length > 0 ? (
              <div className="bg-card border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {filtered.map((lead: any) => (
                      <TableRow key={lead.id} className="cursor-pointer hover:bg-accent/50" onClick={() => handleOpen(lead)}>
                        <TableCell className="font-medium font-headline">
                          {lead.voornaam || lead.achternaam
                            ? `${lead.voornaam} ${lead.achternaam}`.trim()
                            : <span className="text-muted-foreground italic">Geen naam</span>
                          }
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
                          </div>
                        </TableCell>
                        <TableCell className="font-body">{lead.gesprek_datum || '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={lead.status} />
                            {lead.offerte_bedrag_excl != null && (
                              <OfferteCompareBadge
                                bedrag={Number(lead.offerte_bedrag_excl)}
                                min={Number(lead.budget_min) || 0}
                                max={Number(lead.budget_max) || 0}
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-body">
                          {lead.budget_min ? `${fmt(lead.budget_min)} — ${fmt(lead.budget_max)}` : '—'}
                        </TableCell>
                        <TableCell>
                          <PortalStatusBadge status={lead.portal_status || 'draft'} />
                        </TableCell>
                        <TableCell className="font-body">
                          {preIntakeMap[lead.id]?.videocall_scheduled_at ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold tracking-wider uppercase px-2 py-0.5 bg-primary/15 text-primary w-fit">
                                Video call
                              </span>
                              <span className="text-xs text-muted-foreground mt-0.5">
                                {new Date(preIntakeMap[lead.id].videocall_scheduled_at).toLocaleString('nl-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : (lead.volgende_stap || '—')}
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
                              <DropdownMenuItem onClick={() => onOpenCall?.(lead.id, preIntakeMap[lead.id] ? 'wrap-up' : 'calling')}>
                                <Phone className="h-4 w-4 mr-2 text-[#008CFF]" /> Telefoongesprek
                              </DropdownMenuItem>

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
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="bg-card border border-dashed border-border p-16 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-body">
                  {loading ? 'Dossiers laden...' : 'Nog geen dossiers. Start een nieuw intakegesprek om te beginnen.'}
                </p>
              </div>
            )}
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
