import { useSession } from '@/contexts/SessionContext';
import SlideLabel from '@/components/SlideLabel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Search, FileDown, FolderOpen, Users, TrendingUp, DollarSign, Eye } from 'lucide-react';

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

export default function Dossiers() {
  const [search, setSearch] = useState('');

  // Placeholder data — will come from Supabase
  const leads: any[] = [];

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-background">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-8">Dossiers</h1>

        <Tabs defaultValue="overzicht">
          <TabsList className="mb-6">
            <TabsTrigger value="overzicht" className="font-headline">Overzicht</TabsTrigger>
            <TabsTrigger value="statistieken" className="font-headline">Statistieken</TabsTrigger>
          </TabsList>

          <TabsContent value="overzicht">
            {/* Filter bar */}
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

            {leads.length > 0 ? (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
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
                    {leads.map((lead: any) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.voornaam} {lead.achternaam}</TableCell>
                        <TableCell>{lead.gesprek_datum}</TableCell>
                        <TableCell>{STATUS_LABELS[lead.status] || lead.status}</TableCell>
                        <TableCell>{lead.budget_min ? `${fmt(lead.budget_min)} — ${fmt(lead.budget_max)}` : '—'}</TableCell>
                        <TableCell>{lead.volgende_stap || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost"><FolderOpen className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost"><FileDown className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-dashed border-border p-16 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-body">
                  Nog geen dossiers. Start een nieuw intakegesprek om te beginnen.
                </p>
                <p className="text-xs text-muted-foreground/50 mt-2">
                  (Dossiers worden geladen na Lovable Cloud setup)
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="statistieken">
            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Users} label="Totaal leads" value="0" />
              <StatCard icon={TrendingUp} label="Conversieratio" value="—" />
              <StatCard icon={DollarSign} label="Gem. budget" value="—" />
              <StatCard icon={Eye} label="Top kanaal" value="—" />
            </div>

            <div className="bg-card rounded-xl border border-dashed border-border p-16 text-center">
              <p className="text-muted-foreground font-body">
                Statistieken worden beschikbaar zodra er dossiers zijn.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="h-5 w-5 text-primary" />
        <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-headline font-bold text-foreground">{value}</div>
    </div>
  );
}
