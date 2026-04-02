import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2 } from 'lucide-react';
import logoBlauw from '@/assets/logo-blauw.svg';

interface Props {
  loading: boolean;
  error: string | null;
  onVerify: (email: string) => Promise<boolean>;
}

export default function PortalEmailGate({ loading, error, onVerify }: Props) {
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim()) {
      setLocalError('Vul een e-mailadres in');
      return;
    }
    const ok = await onVerify(email.trim());
    if (!ok && !error) {
      setLocalError('Verificatie mislukt. Controleer uw e-mailadres.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F3EB] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <img src={logoBlauw} alt="Zolderpunt" className="h-10" />
        </div>

        <div className="bg-white p-8">
          <h1 className="font-headline text-xl font-bold text-[#1A1A1A] mb-2">
            Welkom bij uw persoonlijk dossier
          </h1>
          <p className="text-sm text-[#555555] font-body mb-6">
            Vul hieronder het e-mailadres in waar deze link naartoe gestuurd werd om verder te gaan.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="uw@email.be"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#F8F3EB] border-0 font-body text-base py-5"
              autoFocus
              disabled={loading}
            />

            {(error || localError) && (
              <p className="text-sm text-red-600 font-body">
                {error || localError}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#008CFF] text-white hover:bg-[#0070CC] font-headline text-base py-5 gap-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Bekijk mijn dossier
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-xs text-[#999999] font-body text-center mt-4">
          Geen toegang? Neem contact op met uw adviseur.
        </p>
      </div>
    </div>
  );
}
