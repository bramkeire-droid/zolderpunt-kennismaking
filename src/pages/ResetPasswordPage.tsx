import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoBlauw from '@/assets/logo-blauw.svg';
import DecorativeAngle from '@/components/DecorativeAngle';
import { Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setReady(true);
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Te kort', description: 'Wachtwoord moet minstens 6 tekens bevatten.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Wachtwoord gewijzigd', description: 'Je kunt nu inloggen met je nieuwe wachtwoord.' });
      window.location.href = '/';
    }
    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-body">Ongeldige of verlopen reset-link.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background relative overflow-hidden">
      <DecorativeAngle position="top-right" size={400} />
      <DecorativeAngle position="bottom-left" color="secondary" size={250} />

      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <img src={logoBlauw} alt="Zolderpunt" className="h-14 mb-12" />

        <div className="w-full max-w-sm bg-card border border-border p-8">
          <form onSubmit={handleReset} className="space-y-5">
            <h2 className="text-xl font-headline font-bold text-foreground text-center mb-2">Nieuw wachtwoord</h2>

            <div className="space-y-2">
              <Label className="font-body">Nieuw wachtwoord</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minstens 6 tekens"
                className="bg-background"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full font-headline gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Wachtwoord wijzigen
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
