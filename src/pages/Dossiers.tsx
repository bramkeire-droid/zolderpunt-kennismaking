import { useSession } from '@/contexts/SessionContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useMemo } from 'react';
import { Search, FolderOpen, Users, TrendingUp, DollarSign, Eye, RefreshCw, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { defaultTechnisch } from '@/contexts/SessionContext';
import type { LeadData } from '@/contexts/SessionContext';
import { toast } from 'sonner';

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const STATUS_LABELS: Record<string, string> = {
  intake: 'Intake',
  plaatsbezoek: 'Plaatsbezoek',
  offerte: 'Offerte',
  uitvoering: 'Uitvoering',
  afgesloten: 'Afgesloten',
  verloren: 'Verloren',
};

function rowToLead(row: any): LeadData {
  return {
    id: row.id,
    voornaam: row.voornaam ?? '',
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
    status: row.status ?? 'intake',
    fotos: Array.isArray(row.fotos) ? row.fotos : [],
    technisch: row.technisch ? { ...defaultTechnisch, ...(row.technisch as any) } : { ...defaultTechnisch },
  };
}

interface DossiersProps {
  onOpenLead?: (lead: LeadData) => void;
}

export default function Dossiers({ onOpenLead }: DossiersProps) {
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      `${l.voornaam} ${l.achternaam}`.toLowerCase().includes(q) ||
      (l.adres ?? '').toLowerCase().includes(q)
    );
  }, [leads, search]);

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
    if (error) {
      toast.error('Verwijderen mislukt');
    } else {
      toast.success('Dossier verwijderd');
      setLeads(prev => prev.filter(l => l.id !== lead.id));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-headline font-bold text-foreground">Dossiers</h1>
          <Button variant="outline" onClick={fetchLeads} className="gap-2 font-headline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Vernieuwen
          </Button>
        </div>

        <Tabs defaultValue="overzicht">
          <TabsList className="mb-6">
            <TabsTrigger value="overzicht" className="font-headline">Overzicht</TabsTrigger>
            <TabsTrigger value="statistieken" className="font-headline">Statistieken</TabsTrigger>
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
                      <TableHead>Naam</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Volgende stap</TableHead>
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
                        <TableCell className="font-body">{lead.gesprek_datum || '—'}</TableCell>
                        <TableCell>
                          <span className="text-xs font-bold tracking-wider uppercase text-primary">
                            {STATUS_LABELS[lead.status] || lead.status}
                          </span>
                        </TableCell>
                        <TableCell className="font-body">
                          {lead.budget_min ? `${fmt(lead.budget_min)} — ${fmt(lead.budget_max)}` : '—'}
                        </TableCell>
                        <TableCell className="font-body">{lead.volgende_stap || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpen(lead); }}>
                              <FolderOpen className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={(e) => handleDelete(e, lead)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
        </Tabs>
      </div>
    </div>
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
