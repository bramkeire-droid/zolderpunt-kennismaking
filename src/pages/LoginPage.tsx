import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoBlauw from '@/assets/logo-blauw.svg';
import DecorativeAngle from '@/components/DecorativeAngle';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: 'Inloggen mislukt', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email verstuurd', description: 'Controleer je inbox voor de reset-link.' });
      setMode('login');
    }
    setLoading(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background relative overflow-hidden">
      <DecorativeAngle position="top-right" size={400} />
      <DecorativeAngle position="bottom-left" color="secondary" size={250} />

      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <img src={logoBlauw} alt="Zolderpunt" className="h-14 mb-12" />

        <div className="w-full max-w-sm bg-card border border-border p-8">
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <h2 className="text-xl font-headline font-bold text-foreground text-center mb-2">Inloggen</h2>

              <div className="space-y-2">
                <Label className="font-body">E-mailadres</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="bram@zolderpunt.be"
                  className="bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="font-body">Wachtwoord</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-background"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full font-headline gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Inloggen
              </Button>

              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-sm text-primary hover:underline w-full text-center block"
              >
                Wachtwoord vergeten?
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-5">
              <h2 className="text-xl font-headline font-bold text-foreground text-center mb-2">Wachtwoord resetten</h2>

              <div className="space-y-2">
                <Label className="font-body">E-mailadres</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="bram@zolderpunt.be"
                  className="bg-background"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full font-headline gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verstuur reset-link
              </Button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sm text-primary hover:underline w-full text-center block"
              >
                Terug naar inloggen
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
