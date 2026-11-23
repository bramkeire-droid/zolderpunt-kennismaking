// De uitvoerder van Zarvis: doet wat gepland staat, ook als niemand kijkt.
//
// Wie mag dit aanroepen? Alleen de klok in de databank. Die legt elke minuut,
// als er een taak aan de beurt is, een eenmalig bewijs in `zarvis_tik` en
// stuurt het mee. Deze functie aanvaardt alleen een bewijs dat bestaat, vers is
// en nog niet gebruikt. Er staat nergens een sleutel in een geplande taak.
//
// Op de achtergrond is er geen ingelogde gebruiker. De uitvoerder werkt daarom
// met de sleutel van de server, en is om die reden strenger dan Zarvis zelf:
//   - alleen taken van een beheerder worden uitgevoerd (die mag al alles zien);
//   - een controle krijgt alleen leesgereedschap, nooit iets dat schrijft of
//     verstuurt;
//   - verwittigen en versturen gaat uitsluitend naar de eigenaar van de taak,
//     of naar wie hij bij het plannen zelf aanwees.

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@1';
import { LEES_GEREEDSCHAP, voerUit } from '../_shared/zarvis/gereedschap.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const BEWIJS_GELDIG_MS = 3 * 60 * 1000;
const PER_KEER = 8;
const MAX_RONDES = 5;

// Zelfde twee wegen naar het model als de functie `zarvis`.
function kiesModel(): { client: Anthropic; model: string } | null {
  const model = Deno.env.get('ZARVIS_MODEL') ?? 'claude-opus-5-5';
  const eigen = Deno.env.get('ANTHROPIC_API_KEY');
  if (eigen) return { client: new Anthropic({ apiKey: eigen }), model };
  const lovable = Deno.env.get('LOVABLE_API_KEY');
  if (lovable) {
    return {
      client: new Anthropic({ apiKey: lovable, baseURL: Deno.env.get('ZARVIS_TEST_GATEWAY') ?? 'https://ai.gateway.lovable.dev' }),
      model: model.startsWith('anthropic/') ? model : `anthropic/${model}`,
    };
  }
  return null;
}

type Taak = {
  id: string; user_id: string; soort: 'herinnering' | 'controle' | 'whatsapp'; opdracht: string;
  doel: { mij?: boolean; telefoon?: string; naam?: string; lead_id?: string } | null;
  verwittig: 'melding' | 'whatsapp' | 'beide'; volgende_op: string; elke_minuten: number | null;
  tot: string | null; max_beurten: number; beurten: number;
};

// deno-lint-ignore no-explicit-any
type Db = any;

/** Laat het model de controle doen. Antwoord: is het zo, en wat zeggen we? */
async function controleer(db: Db, opdracht: string): Promise<{ vervuld: boolean; melding: string }> {
  const route = kiesModel();
  if (!route) throw new Error('geen sleutel voor het taalmodel');
  const nu = new Date().toLocaleString('nl-BE', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Brussels' });
  // deno-lint-ignore no-explicit-any
  const messages: any[] = [{ role: 'user', content: `Controle: ${opdracht}` }];
  for (let ronde = 0; ronde < MAX_RONDES; ronde++) {
    const antwoord = await route.client.messages.create({
      model: route.model,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      system: `Je bent Zarvis en voert op de achtergrond een geplande controle uit voor de zaakvoerder van Zolderpunt. Het is nu ${nu} in België. Kijk met je gereedschap na of het gevraagde zo is. Baseer je alleen op wat je leest. Sluit af met precies één regel JSON en niets anders: {"vervuld": true of false, "melding": "één of twee zinnen voor de zaakvoerder, in gewoon Vlaams"}. Is het niet zo, dan is vervuld false en zegt de melding kort wat je wel zag.`,
      tools: LEES_GEREEDSCHAP,
      messages,
      // deno-lint-ignore no-explicit-any
    } as any);
    if (antwoord.stop_reason !== 'tool_use') {
      const tekst = antwoord.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
      const m = /\{[\s\S]*\}/.exec(tekst);
      try {
        const j = JSON.parse(m ? m[0] : '');
        return { vervuld: j.vervuld === true, melding: String(j.melding ?? '').slice(0, 600) || 'Geen uitleg.' };
      } catch {
        return { vervuld: false, melding: tekst.slice(0, 400) || 'De controle gaf geen bruikbaar antwoord.' };
      }
    }
    messages.push({ role: 'assistant', content: antwoord.content });
    const resultaten = [];
    for (const blok of antwoord.content) {
      if (blok.type !== 'tool_use') continue;
      const mag = LEES_GEREEDSCHAP.some((g) => g.name === blok.name);
      const r = mag ? await voerUit(db, blok.name, blok.input) : { ok: false, tekst: 'Dit gereedschap is op de achtergrond niet toegestaan.' };
      resultaten.push({ type: 'tool_result', tool_use_id: blok.id, content: r.tekst, is_error: !r.ok });
    }
    messages.push({ role: 'user', content: resultaten });
  }
  return { vervuld: false, melding: 'De controle raakte niet rond binnen het toegestane aantal stappen.' };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const body = await req.json().catch(() => null) as { tik?: unknown } | null;
  if (!isUuid(body?.tik)) return json({ error: 'Geen toegang' }, 401);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Het bewijs wordt opgebruikt: één keer geldig.
  const { data: bewijs } = await db.from('zarvis_tik').delete().eq('nonce', body!.tik)
    .gte('created_at', new Date(Date.now() - BEWIJS_GELDIG_MS).toISOString()).select('nonce');
  if (!bewijs?.length) return json({ error: 'Geen toegang' }, 401);
  await db.from('zarvis_tik').delete().lt('created_at', new Date(Date.now() - 3600_000).toISOString());

  const { data: taken, error } = await db.from('zarvis_taken').select('*')
    .eq('status', 'actief').lte('volgende_op', new Date().toISOString()).order('volgende_op').limit(PER_KEER);
  if (error) { console.error('zarvis-taken: lezen mislukt', error); return json({ error: 'Lezen mislukt' }, 500); }

  const uitslag: Array<{ id: string; status: string }> = [];
  for (const taak of (taken ?? []) as Taak[]) {
    const verwittig = async (tekst: string) => {
      if (taak.verwittig !== 'whatsapp') await db.from('zarvis_meldingen').insert({ user_id: taak.user_id, tekst, taak_id: taak.id });
      if (taak.verwittig !== 'melding') await db.from('whatsapp_uit').insert({ user_id: taak.user_id, telefoon: null, naam: 'jezelf', tekst: `Zarvis: ${tekst}`, taak_id: taak.id });
    };
    // Eerst verzetten of afsluiten, dan pas uitvoeren: een taak die halverwege
    // faalt, mag niet elke minuut opnieuw beginnen.
    const beurten = taak.beurten + 1;
    const volgende = taak.elke_minuten ? new Date(Date.now() + taak.elke_minuten * 60000) : null;
    const verder = !!volgende && beurten < taak.max_beurten && (!taak.tot || volgende.getTime() <= new Date(taak.tot).getTime());
    const zet = (w: Record<string, unknown>) =>
      db.from('zarvis_taken').update({ ...w, updated_at: new Date().toISOString() }).eq('id', taak.id);
    await zet({ beurten, status: verder ? 'actief' : 'klaar', ...(verder ? { volgende_op: volgende!.toISOString() } : {}) });

    try {
      const { data: beheerder } = await db.rpc('has_role', { _user_id: taak.user_id, _role: 'admin' });
      if (beheerder !== true) {
        await zet({ status: 'mislukt', laatste_resultaat: 'Taken op de achtergrond zijn voorlopig alleen voor beheerders.' });
        uitslag.push({ id: taak.id, status: 'geweigerd' });
        continue;
      }
      if (taak.soort === 'herinnering') {
        await verwittig(`Herinnering: ${taak.opdracht}`);
        await zet({ laatste_resultaat: 'Herinnerd.' });
      } else if (taak.soort === 'whatsapp') {
        const naarZelf = !taak.doel?.telefoon;
        await db.from('whatsapp_uit').insert({
          user_id: taak.user_id, telefoon: naarZelf ? null : taak.doel!.telefoon, naam: naarZelf ? 'jezelf' : (taak.doel!.naam ?? null),
          tekst: taak.opdracht, lead_id: taak.doel?.lead_id ?? null, taak_id: taak.id,
        });
        if (!naarZelf) await db.from('zarvis_meldingen').insert({ user_id: taak.user_id, tekst: `Het geplande WhatsApp-bericht aan ${taak.doel!.naam ?? 'de klant'} is vertrokken.`, taak_id: taak.id });
        await zet({ laatste_resultaat: 'Bericht klaargezet om te versturen.' });
      } else {
        const r = await controleer(db, taak.opdracht);
        if (r.vervuld) {
          await verwittig(r.melding);
          await zet({ status: 'klaar', laatste_resultaat: `Vervuld: ${r.melding}` });
        } else if (!verder) {
          await verwittig(`Mijn controle is afgelopen zonder resultaat. ${r.melding}`);
          await zet({ laatste_resultaat: `Afgelopen zonder resultaat: ${r.melding}` });
        } else {
          await zet({ laatste_resultaat: `Nog niet: ${r.melding}` });
        }
      }
      uitslag.push({ id: taak.id, status: 'gedaan' });
    } catch (e) {
      console.error('zarvis-taken: taak mislukt', taak.id, e);
      await zet({ laatste_resultaat: `Mislukt: ${String((e as Error).message ?? e).slice(0, 300)}` });
      uitslag.push({ id: taak.id, status: 'mislukt' });
    }
  }
  return json({ uitgevoerd: uitslag });
});
