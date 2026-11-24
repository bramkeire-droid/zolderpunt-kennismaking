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
  // In het venster van Zarvis hoort ook het inlogscherm bij Zarvis: donker en rustig.
  const zarvis = window.location.pathname.startsWith('/zarvis');
  const veld = zarvis ? 'rounded-xl bg-white/[0.06] border-white/10 text-[#F3F5FA] placeholder:text-[#8792A8]' : 'bg-background';
  const kop = `text-xl font-headline font-bold text-center mb-2 ${zarvis ? 'text-[#F3F5FA]' : 'text-foreground'}`;
  const label = `font-body ${zarvis ? 'text-[#C3CBDA]' : ''}`;
  const link = `text-sm hover:underline w-full text-center block ${zarvis ? 'text-[#8CCBFF]' : 'text-primary'}`;

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
    <div className={`h-screen flex flex-col relative overflow-hidden ${zarvis ? 'bg-[#07090F]' : 'bg-background'}`}>
      {!zarvis && <DecorativeAngle position="top-right" size={400} />}
      {!zarvis && <DecorativeAngle position="bottom-left" color="secondary" size={250} />}

      <div className={`flex-1 flex flex-col items-center justify-center relative z-10 ${zarvis ? 'px-4' : ''}`}>
        {zarvis
          ? <p className="mb-8 font-headline text-[26px] font-semibold tracking-[-0.02em] text-[#F3F5FA]">Zarvis</p>
          : <img src={logoBlauw} alt="Zolderpunt" className="h-14 mb-12" />}

        <div className={`w-full max-w-sm p-8 ${zarvis ? 'rounded-2xl bg-white/[0.05]' : 'bg-card border border-border'}`}>
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <h2 className={kop}>Inloggen</h2>

              <div className="space-y-2">
                <Label className={label}>E-mailadres</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="bram@zolderpunt.be"
                  className={veld}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className={label}>Wachtwoord</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={veld}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className={`w-full font-headline gap-2 ${zarvis ? 'rounded-full bg-[#2E8BFF] text-white hover:bg-[#4A9BFF]' : ''}`}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Inloggen
              </Button>

              <button
                type="button"
                onClick={() => setMode('forgot')}
                className={link}
              >
                Wachtwoord vergeten?
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-5">
              <h2 className={kop}>Wachtwoord resetten</h2>

              <div className="space-y-2">
                <Label className={label}>E-mailadres</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="bram@zolderpunt.be"
                  className={veld}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className={`w-full font-headline gap-2 ${zarvis ? 'rounded-full bg-[#2E8BFF] text-white hover:bg-[#4A9BFF]' : ''}`}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verstuur reset-link
              </Button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className={link}
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
