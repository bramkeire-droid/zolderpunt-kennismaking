// Leesclient voor het mail-crm-loket (edge function `compass-loket` in het aparte
// mail-crm-Supabaseproject, ref ipnebgcuokehllepqwwm). Zie SPRINTPLAN-COMMUNICATIE.md.
//
// Auth: we sturen het access-token van de ingelogde Compass-gebruiker mee; het loket
// legt dat token zelf voor aan Compass' auth-endpoint en serveert daarna alleen-lezen
// data uit de mail-crm-database. Hier staan dus géén geheimen — het loket-adres is
// publiek en zonder geldige Compass-sessie antwoordt het 401.

import { supabase } from '@/integrations/supabase/client';

const LOKET_URL = 'https://ipnebgcuokehllepqwwm.supabase.co/functions/v1/compass-loket';

export type LoketMail = {
  id: string;
  datum: string | null;
  richting: 'in' | 'uit' | null;
  mailbox: string | null;
  onderwerp: string | null;
  samenvatting: string | null;
  koppel_status: string | null;
  bevat_beslissing: boolean | null;
  beslissing: string | null;
  van_contact_id: string | null;
  thread_id: string | null;
};

export type LoketCall = {
  id: string;
  datum: string | null;
  titel: string | null;
  duur_seconden: number | null;
  samenvatting: string | null;
  koppel_status: string | null;
  bevat_beslissing: boolean | null;
  beslissing: string | null;
};

export type LoketContact = { naam: string | null; email: string | null; rol: string | null };

export type CommunicatieData = {
  gevonden: boolean;
  project: { id: string; naam: string | null; status: string | null; extern_dossier_id: string | null } | null;
  /** Alleen gezet bij het terugvalpad via e-mailadres. */
  contact?: (LoketContact & { id: string }) | null;
  mails: LoketMail[];
  calls: LoketCall[];
  /** email_id → contact_id[] (cc'ers). */
  cc?: Record<string, string[]>;
  /** call_id → contact_id[] (deelnemers). */
  deelnemers?: Record<string, string[]>;
  /** contact_id → gegevens, dekt afzenders, cc'ers en deelnemers. */
  contacten?: Record<string, LoketContact>;
};

export type MailInhoud = {
  onderwerp: string | null;
  van: string | null;
  van_naam: string | null;
  aan: string[];
  cc: string[];
  datum: string | null;
  heeft_bijlagen: boolean;
  inhoud: string;
};

async function loketCall<T>(body: Record<string, unknown>): Promise<T> {
  const { data: sessie } = await supabase.auth.getSession();
  const token = sessie.session?.access_token;
  if (!token) throw new Error('Niet ingelogd.');

  const res = await fetch(LOKET_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((json as { error?: string } | null)?.error ?? `Mail-CRM-loket gaf HTTP ${res.status}`);
  }
  return json as T;
}

/** Alle communicatie van het dossier met dit ZL-nummer (mails + Leexi-calls). */
export const fetchCommunicatie = (zl: string) => loketCall<CommunicatieData>({ action: 'mails', zl });

/** Terugvalpad voor dossiers zonder ZL-nummer: alles van het contact met dit e-mailadres. */
export const fetchCommunicatieViaEmail = (email: string) =>
  loketCall<CommunicatieData>({ action: 'mails_via_email', email });

/** Volledige inhoud van één mail, live uit Exchange. Platte tekst — nooit als HTML renderen. */
export const fetchMailInhoud = (emailId: string) => loketCall<MailInhoud>({ action: 'mail_inhoud', email_id: emailId });

export function formatDatumTijd(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('nl-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function formatDuur(seconden: number | null | undefined): string {
  if (!seconden || seconden <= 0) return '';
  const min = Math.round(seconden / 60);
  return min < 1 ? '<1 min' : `${min} min`;
}
