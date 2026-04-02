import { useEffect, useRef, useCallback } from 'react';
import { usePortal } from '@/hooks/usePortal';
import PortalEmailGate from '@/pages/PortalEmailGate';
import PortalHeader from '@/components/portal/PortalHeader';
import PortalSamenvatting from '@/components/portal/PortalSamenvatting';
import PortalFotos from '@/components/portal/PortalFotos';
import PortalInvestering from '@/components/portal/PortalInvestering';
import PortalMeerwaarde from '@/components/portal/PortalMeerwaarde';
import PortalWerkwijze from '@/components/portal/PortalWerkwijze';
import PortalGaranties from '@/components/portal/PortalGaranties';
import PortalReviews from '@/components/portal/PortalReviews';
import PortalContact from '@/components/portal/PortalContact';
import PortalShareBar from '@/components/portal/PortalShareBar';
import logoBlauw from '@/assets/logo-blauw.svg';
import { Loader2 } from 'lucide-react';

interface Props {
  token: string;
}

export default function Portal({ token }: Props) {
  const {
    data,
    loading,
    error,
    needsVerification,
    verifyEmail,
    fetchData,
    logEvent,
  } = usePortal(token);

  const hasLoggedOpen = useRef(false);
  const startTime = useRef(Date.now());

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Log portal_opened event once data loads
  useEffect(() => {
    if (data && !hasLoggedOpen.current) {
      hasLoggedOpen.current = true;
      logEvent('portal_opened');
    }
  }, [data, logEvent]);

  // Log time spent on unload
  useEffect(() => {
    if (!data) return;
    const handleUnload = () => {
      const seconds = Math.round((Date.now() - startTime.current) / 1000);
      // Use sendBeacon for best-effort
      logEvent('time_spent', { seconds });
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [data, logEvent]);

  const handleVerify = useCallback(async (email: string) => {
    const ok = await verifyEmail(email);
    if (ok) {
      fetchData();
    }
    return ok;
  }, [verifyEmail, fetchData]);

  const handleFotoView = useCallback(() => {
    logEvent('fotos_viewed');
  }, [logEvent]);

  const handlePriceView = useCallback(() => {
    logEvent('price_viewed');
  }, [logEvent]);

  const handleCalculate = useCallback((meerwaarde: number) => {
    logEvent('calculator_used', { meerwaarde });
  }, [logEvent]);

  const handleShare = useCallback(() => {
    logEvent('shared');
  }, [logEvent]);

  const handleDownloadPdf = useCallback(() => {
    logEvent('pdf_downloaded');
    // PDF download could be implemented via edge function or pre-generated URL
  }, [logEvent]);

  // Email verification gate
  if (needsVerification) {
    return (
      <PortalEmailGate
        loading={loading}
        error={error}
        onVerify={handleVerify}
      />
    );
  }

  // Loading state
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#F8F3EB] flex flex-col items-center justify-center">
        <img src={logoBlauw} alt="Zolderpunt" className="h-10 mb-6" />
        <Loader2 className="h-8 w-8 text-[#008CFF] animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F3EB] flex flex-col items-center justify-center px-4">
        <img src={logoBlauw} alt="Zolderpunt" className="h-10 mb-6" />
        <div className="bg-white p-8 max-w-md text-center">
          <p className="font-headline text-lg font-bold text-[#1A1A1A] mb-2">
            Portaal niet beschikbaar
          </p>
          <p className="font-body text-sm text-[#555555]">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const clientName = `${data.voornaam} ${data.achternaam}`.trim();

  return (
    <div className="min-h-screen bg-[#F8F3EB] pb-16">
      <PortalHeader data={data} />
      <PortalSamenvatting data={data} />
      <PortalFotos data={data} onView={handleFotoView} />
      <PortalInvestering data={data} onView={handlePriceView} />
      <PortalMeerwaarde data={data} onCalculate={handleCalculate} />
      <PortalWerkwijze />
      <PortalGaranties />
      <PortalReviews />
      <PortalContact />
      <PortalShareBar
        clientName={clientName}
        onShare={handleShare}
        onDownloadPdf={handleDownloadPdf}
      />
    </div>
  );
}
