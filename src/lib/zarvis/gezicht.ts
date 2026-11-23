// Het gezicht van Zarvis: een Anam-persona die het antwoord uitspreekt en naar
// de gebruiker luistert. PROEF (SPRINTPLAN-ZARVIS 8.3).
//
// Rolverdeling: Anam doet beeld, stem en luisteren; het brein blijft de functie
// `zarvis`. Wat de gebruiker zegt komt hier binnen als tekst, het antwoord gaat
// hierlangs terug als tekst die het gezicht uitspreekt.
//
// De SDK wordt pas geladen als iemand het gezicht aanzet, zodat de rest van de
// app er niet zwaarder van wordt.

import { supabase } from '@/integrations/supabase/client';

const GEZICHT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zarvis-gezicht`;

export interface Uitspraak {
  /** Stuurt een volgend stukje tekst door om uit te spreken. */
  zeg(stuk: string): void;
  /** Het antwoord is volledig. */
  klaar(): void;
}

export interface Gezicht {
  /** Naam van de stem die Anam koos, als die bekend is. */
  stem: string | null;
  /** Begint een nieuw antwoord uit te spreken. */
  begin(): Uitspraak;
  /** Laat het gezicht meteen zwijgen. */
  zwijg(): void;
  /** Beëindigt de sessie; daarna telt er geen tijd meer. */
  stop(): Promise<void>;
}

export interface GezichtHandlers {
  /** De gebruiker heeft iets gezegd en is uitgesproken. */
  opGebruikerZei: (tekst: string) => void;
  /** De gebruiker praatte door het antwoord heen. */
  opOnderbroken: () => void;
  /** De sessie is voorbij (tijdslimiet, verbinding weg, of gestopt). */
  opGesloten: (reden: string) => void;
}

async function haalSessiebewijs(): Promise<{ sessionToken: string; stem: string | null }> {
  const { data: sessie } = await supabase.auth.getSession();
  const token = sessie.session?.access_token;
  if (!token) throw new Error('Je bent niet meer ingelogd. Log opnieuw in.');

  let res: Response;
  try {
    res = await fetch(GEZICHT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: '{}',
    });
  } catch {
    throw new Error('Ik raak niet tot bij de server. Controleer je verbinding.');
  }
  const json = await res.json().catch(() => null) as
    | { sessionToken?: string; stem?: string | null; error?: string }
    | null;
  if (!res.ok || !json?.sessionToken) {
    throw new Error(
      json?.error ??
        (res.status === 404
          ? 'Het gezicht staat nog niet aan op de server.'
          : `De server antwoordde met fout ${res.status}.`),
    );
  }
  return { sessionToken: json.sessionToken, stem: json.stem ?? null };
}

/**
 * Start een sessie en toont het gezicht in het video-element met dit id.
 * Moet vanuit een klik aangeroepen worden: browsers geven de microfoon en
 * geluid alleen na een handeling van de gebruiker.
 */
export async function startGezicht(videoElementId: string, h: GezichtHandlers): Promise<Gezicht> {
  const [{ sessionToken, stem }, sdk] = await Promise.all([
    haalSessiebewijs(),
    import('@anam-ai/js-sdk'),
  ]);
  const { createClient, AnamEvent, MessageRole } = sdk;
  let client: ReturnType<typeof createClient>;
  try {
    client = createClient(sessionToken);
  } catch {
    throw new Error('Het gezicht kon niet starten: de server gaf een ongeldig sessiebewijs.');
  }

  let gestopt = false;
  // Elke beurt van de gebruiker komt telkens opnieuw mee in de geschiedenis;
  // dit houdt bij welke al doorgegeven is.
  let laatstGemeld: string | null = null;

  client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, (berichten) => {
    const laatste = berichten[berichten.length - 1];
    if (!laatste || laatste.role !== MessageRole.USER) return;
    if (laatste.id === laatstGemeld) return;
    laatstGemeld = laatste.id;
    const tekst = laatste.content.trim();
    if (tekst) h.opGebruikerZei(tekst);
  });
  client.addListener(AnamEvent.TALK_STREAM_INTERRUPTED, () => h.opOnderbroken());
  client.addListener(AnamEvent.CONNECTION_CLOSED, (reden) => {
    if (gestopt) return;
    gestopt = true;
    h.opGesloten(String(reden ?? ''));
  });

  try {
    await client.streamToVideoElement(videoElementId);
  } catch (e) {
    gestopt = true;
    await client.stopStreaming().catch(() => {});
    const naam = (e as Error)?.name ?? '';
    throw new Error(
      naam === 'NotAllowedError' || /permission|denied/i.test(String((e as Error)?.message))
        ? 'De microfoon is geblokkeerd. Geef toestemming in de adresbalk van je browser.'
        : 'Het gezicht kon niet starten. Probeer het opnieuw.',
    );
  }

  return {
    stem,
    begin() {
      const stroom = client.createTalkMessageStream();
      return {
        zeg(stuk) {
          // Een onderbroken of mislukte stroom weigert verdere stukken; de
          // tekst staat intussen wel op het scherm.
          if (stuk && stroom.isActive()) void stroom.streamMessageChunk(stuk, false).catch(() => {});
        },
        klaar() {
          if (stroom.isActive()) void stroom.endMessage().catch(() => {});
        },
      };
    },
    zwijg() {
      try { client.interruptPersona(); } catch { /* sessie al weg */ }
    },
    async stop() {
      if (gestopt) return;
      gestopt = true;
      await client.stopStreaming().catch(() => {});
    },
  };
}
