// Wat Zarvis kan doen, naast lezen: iets plannen, een WhatsApp laten versturen,
// zichzelf een werkwijze aanleren, en noteren wat hij nog niet kan.
//
// Alles loopt met de verbinding van de ingelogde gebruiker; de RLS is de grens.
// Versturen gebeurt niet hier: een bericht komt in `whatsapp_uit` en het
// programma op de pc van de gebruiker verstuurt het via zijn eigen WhatsApp.

import type { Bron } from './gereedschap.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
type Uit = { resultaat: unknown; detail: string; bron?: Bron; wachtOpJa?: boolean };
type Def = { name: string; description: string; input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] } };

const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const moment = (iso: string) =>
  new Date(iso).toLocaleString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });

/**
 * Zet een kloktijd in België ("2026-11-24T20:00") om naar een moment. Het model
 * rekent zo niet zelf met zomer- en wintertijd.
 */
export function belgischMoment(lokaal: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(lokaal.trim());
  if (!m) return null;
  const [j, mnd, d, u, min] = m.slice(1).map(Number);
  const alsUtc = Date.UTC(j, mnd - 1, d, u, min);
  // Hoeveel loopt Brussel op dat moment voor op UTC?
  const deel = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(alsUtc)).reduce((o, p) => ({ ...o, [p.type]: p.value }), {} as Record<string, string>);
  const inBrussel = Date.UTC(+deel.year, +deel.month - 1, +deel.day, +deel.hour % 24, +deel.minute);
  return new Date(alsUtc - (inBrussel - alsUtc));
}

function wanneer(invoer: Record<string, unknown>, veldMinuten: string, veldOp: string): Date | null {
  const min = Number(invoer[veldMinuten]);
  if (Number.isFinite(min) && min > 0) return new Date(Date.now() + Math.round(min) * 60000);
  return typeof invoer[veldOp] === 'string' ? belgischMoment(invoer[veldOp] as string) : null;
}

/** Zoekt naar wie een WhatsApp gaat: de gebruiker zelf, of de klant van een dossier. */
async function bestemming(db: Db, invoer: Record<string, unknown>): Promise<{ telefoon: string | null; naam: string; lead_id: string | null } | string> {
  if (invoer.naar_mij === true) return { telefoon: null, naam: 'jezelf', lead_id: null };
  if (!isUuid(invoer.dossier_id)) return 'Geef een dossier_id (zoek het dossier eerst op) of zet naar_mij op true.';
  const { data: l, error } = await db.from('leads').select('id, voornaam, achternaam, telefoon').eq('id', invoer.dossier_id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!l) return 'Dat dossier bestaat niet of je hebt er geen toegang toe.';
  const naam = [l.voornaam, l.achternaam].filter(Boolean).join(' ') || 'de klant';
  if (!l.telefoon) return `Er staat geen telefoonnummer in het dossier van ${naam}.`;
  return { telefoon: String(l.telefoon), naam, lead_id: l.id };
}

export const DOE_GEREEDSCHAP: Def[] = [
  {
    name: 'plan_taak',
    description:
      'Plant iets voor later of herhaald. soort "herinnering": herinner de gebruiker op een tijdstip aan iets. soort "controle": kijk op vaste tijden iets na in de gegevens waar je bij kan (dossiers, gesprekken, WhatsApp) en verwittig zodra het zo is; stopt vanzelf bij "tot". soort "whatsapp": verstuur op een tijdstip een WhatsApp (tekst in "opdracht"). Geef het moment als over_minuten, of als kloktijd in België in "op" (JJJJ-MM-DDTUU:MM). Een WhatsApp aan een klant wordt niet meteen gepland: er komt een kaart met Ja en Nee in het venster, en de gebruiker keurt de tekst zelf goed met de knop.',
    input_schema: {
      type: 'object',
      properties: {
        soort: { type: 'string', enum: ['herinnering', 'controle', 'whatsapp'] },
        opdracht: { type: 'string', description: 'Herinnering: waaraan. Controle: precies wat je moet nakijken en wanneer het "vervuld" is. WhatsApp: de volledige tekst van het bericht.' },
        over_minuten: { type: 'integer', description: 'Eerste keer over zoveel minuten.' },
        op: { type: 'string', description: 'Eerste keer op deze kloktijd in België, als JJJJ-MM-DDTUU:MM.' },
        elke_minuten: { type: 'integer', description: 'Herhaal om de zoveel minuten (minstens 5). Weglaten voor één keer.' },
        tot: { type: 'string', description: 'Herhalen stopt op deze kloktijd in België, als JJJJ-MM-DDTUU:MM. Verplicht bij herhalen.' },
        verwittig: { type: 'string', enum: ['melding', 'whatsapp', 'beide', 'bel'], description: 'Hoe de gebruiker verwittigd wordt: een melding op zijn pc, een WhatsApp naar zijn eigen nummer, beide, of "bel": Zarvis belt hem op zijn gsm en leest de boodschap voor. Kies bel alleen als de gebruiker erom vraagt of zegt dat het dringend is.' },
        dossier_id: { type: 'string', description: 'Alleen bij soort whatsapp aan een klant: het dossier van die klant.' },
        naar_mij: { type: 'boolean', description: 'Alleen bij soort whatsapp: stuur naar de gebruiker zelf.' },
      },
      required: ['soort', 'opdracht'],
    },
  },
  {
    name: 'toon_taken',
    description: 'Toont wat er gepland staat en wat onlangs afliep: herinneringen, controles en geplande berichten.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'stop_taak',
    description: 'Stopt een geplande taak. Het taak_id komt uit toon_taken.',
    input_schema: { type: 'object', properties: { taak_id: { type: 'string' } }, required: ['taak_id'] },
  },
  {
    name: 'stuur_whatsapp',
    description:
      'Verstuurt nu een WhatsApp via de WhatsApp van de gebruiker. Naar de gebruiker zelf (naar_mij true) mag meteen. Naar een klant vertrekt er niets meteen: er komt een kaart met Ja en Nee in het venster met de volledige tekst, en de gebruiker keurt zelf goed met de knop. Lees de tekst ook voor.',
    input_schema: {
      type: 'object',
      properties: {
        tekst: { type: 'string' },
        dossier_id: { type: 'string', description: 'Het dossier van de klant.' },
        naar_mij: { type: 'boolean' },
      },
      required: ['tekst'],
    },
  },
  {
    name: 'leer_vaardigheid',
    description:
      'Bewaart een werkwijze die je voortaan kent: iets dat je met je bestaande gereedschap kan, in vaste stappen. Gebruik dit wanneer de gebruiker je uitlegt hoe hij iets wil, of ja zegt op je voorstel om het aan te leren. Daarna staat de werkwijze bij elk gesprek in je geheugen.',
    input_schema: {
      type: 'object',
      properties: {
        naam: { type: 'string', description: 'Korte naam, bijvoorbeeld "weekoverzicht offertes".' },
        wanneer: { type: 'string', description: 'Wanneer je dit toepast: bij welke vraag of situatie.' },
        stappen: { type: 'string', description: 'Wat je dan doet, stap voor stap, met welk gereedschap.' },
      },
      required: ['naam', 'wanneer', 'stappen'],
    },
  },
  {
    name: 'meld_tekort',
    description:
      'Noteert iets wat de gebruiker vroeg en wat je met je huidige gereedschap niet kan, zodat het gebouwd wordt. Roep dit altijd aan voor je zegt dat je iets nog niet kan.',
    input_schema: {
      type: 'object',
      properties: {
        vraag: { type: 'string', description: 'Wat de gebruiker wilde, in zijn woorden.' },
        reden: { type: 'string', description: 'Wat je mist: welke toegang of welk gereedschap.' },
      },
      required: ['vraag'],
    },
  },
  {
    name: 'zet_stijl',
    description:
      'Zet de stijl waarin je praat: "gewoon", "familie" (de familiale komische modus, voor als het gezin erbij is) of "savage" (snoeihard en sarcastisch). Gebruik dit zodra de gebruiker om een modus vraagt of ze uitzet. De stijl blijft tot hij ze verandert.',
    input_schema: {
      type: 'object',
      properties: { stijl: { type: 'string', enum: ['gewoon', 'familie', 'savage'] } },
      required: ['stijl'],
    },
  },
];

/**
 * Hoe Zarvis praat per stijl. De tekst komt bij de instructie van elk gesprek.
 * Twee grenzen gelden in elke stijl en staan er daarom telkens bij: de feiten
 * blijven kloppen, en wat naar buiten gaat blijft professioneel.
 */
const GRENZEN = 'Wat niet verandert: je zegt alleen wat je gelezen hebt, en een bericht aan een klant of iemand anders blijft professioneel en lees je eerst voor.';
export const STIJLEN: Record<string, string> = {
  gewoon: '',
  familie: `Stijl: familiale komische modus. Het gezin luistert mee, ook kinderen. Wees warm, speels en grappig, met propere humor waar iedereen om kan lachen. Zeg geen bedragen, klantnamen of andere zakelijke of vertrouwelijke gegevens hardop, tenzij de gebruiker er op dat moment uitdrukkelijk om vraagt; zeg dan eerst kort dat het zakelijk is. ${GRENZEN}`,
  savage: `Stijl: savage modus. Wees snoeihard eerlijk, droog en sarcastisch, zonder omwegen en zonder complimenten, ook over de keuzes van de gebruiker zelf. Kort en raak. ${GRENZEN}`,
};

/** Bij welke connector dit gereedschap hoort (zie gereedschap.ts). */
export const DOE_CONNECTOR: Record<string, string> = { stuur_whatsapp: 'whatsapp' };

export const DOE_UITVOERDERS: Record<string, { label: (i: Record<string, unknown>) => string; voer: (db: Db, i: Record<string, unknown>) => Promise<Uit> }> = {
  plan_taak: {
    label: (i) => (i.soort === 'herinnering' ? 'Herinnering plannen' : i.soort === 'whatsapp' ? 'WhatsApp plannen' : 'Controle plannen'),
    async voer(db, invoer) {
      const soort = String(invoer.soort);
      const opdracht = String(invoer.opdracht ?? '').trim().slice(0, 2000);
      if (!['herinnering', 'controle', 'whatsapp'].includes(soort) || !opdracht) return { resultaat: { fout: 'Geef een soort en een opdracht.' }, detail: 'onvolledig' };
      const eerst = wanneer(invoer, 'over_minuten', 'op');
      if (!eerst) return { resultaat: { fout: 'Geef het moment: over_minuten, of "op" als JJJJ-MM-DDTUU:MM.' }, detail: 'geen moment' };
      if (eerst.getTime() < Date.now() - 60000) return { resultaat: { fout: 'Dat moment ligt in het verleden.' }, detail: 'verleden' };
      const elke = Number.isFinite(Number(invoer.elke_minuten)) && Number(invoer.elke_minuten) > 0 ? Math.max(5, Math.round(Number(invoer.elke_minuten))) : null;
      const tot = typeof invoer.tot === 'string' ? belgischMoment(invoer.tot) : null;
      if (elke && !tot) return { resultaat: { fout: 'Herhalen vraagt een einde. Vraag de gebruiker tot wanneer.' }, detail: 'geen einde' };

      let doel: Record<string, unknown> | null = null;
      if (soort === 'whatsapp') {
        const b = await bestemming(db, invoer);
        if (typeof b === 'string') return { resultaat: { fout: b }, detail: 'geen bestemming' };
        if (b.telefoon && invoer.bevestigd !== true) {
          return { resultaat: { niet_gepland: true, naar: b.naam, tekst: opdracht, eerste_keer: eerst.toISOString() }, wachtOpJa: true, detail: `aan ${b.naam}, wacht op ja`, bron: { titel: `Voorstel: WhatsApp aan ${b.naam} plannen`, ondertitel: `Nog niet gepland. Vertrekt ${moment(eerst.toISOString())} na jouw ja.`, secties: [{ lijst: [{ links: 'wij', tekst: opdracht }] }] } };
        }
        doel = b.telefoon ? b : { mij: true };
      }
      const verwittig = ['melding', 'whatsapp', 'beide', 'bel'].includes(String(invoer.verwittig)) ? String(invoer.verwittig) : 'melding';
      const { data, error } = await db.from('zarvis_taken').insert({
        soort, opdracht, doel, verwittig, volgende_op: eerst.toISOString(), elke_minuten: elke, tot: tot?.toISOString() ?? null,
        max_beurten: elke && tot ? Math.min(200, Math.max(1, Math.ceil((tot.getTime() - eerst.getTime()) / (elke * 60000)) + 1)) : 1,
      }).select('id').single();
      if (error) throw new Error(error.message);
      const zin = `${moment(eerst.toISOString())}${elke ? `, daarna om de ${elke} minuten tot ${moment(tot!.toISOString())}` : ''}`;
      return {
        resultaat: { gepland: true, taak_id: data.id, eerste_keer: zin, verwittig },
        detail: moment(eerst.toISOString()),
        bron: { titel: 'Gepland', secties: [{ velden: [
          { label: 'Wat', waarde: soort === 'herinnering' ? 'Herinnering' : soort === 'whatsapp' ? `WhatsApp aan ${(doel as { naam?: string } | null)?.naam ?? 'jezelf'}` : 'Controle' },
          { label: 'Wanneer', waarde: zin },
          { label: soort === 'whatsapp' ? 'Bericht' : 'Opdracht', waarde: opdracht },
          ...(soort === 'whatsapp' ? [] : [{ label: 'Verwittigen', waarde: verwittig === 'beide' ? 'melding en WhatsApp' : verwittig === 'bel' ? 'telefoonoproep' : verwittig }]),
        ] }] },
      };
    },
  },

  toon_taken: {
    label: () => 'Geplande taken bekijken',
    async voer(db) {
      const { data, error } = await db.from('zarvis_taken')
        .select('id, soort, opdracht, doel, status, volgende_op, elke_minuten, tot, beurten, laatste_resultaat, updated_at')
        .order('status', { ascending: true }).order('volgende_op', { ascending: true }).limit(30);
      if (error) throw new Error(error.message);
      const rijen = data ?? [];
      const actief = rijen.filter((t: { status: string }) => t.status === 'actief');
      // deno-lint-ignore no-explicit-any
      const regel = (t: any) => ({
        links: t.soort,
        tekst: t.opdracht.slice(0, 200) + (t.laatste_resultaat ? `\n${t.laatste_resultaat.slice(0, 200)}` : ''),
        rechts: t.status === 'actief' ? moment(t.volgende_op) : t.status,
        nadruk: t.status === 'actief',
      });
      return {
        resultaat: { actief: actief.length, taken: rijen },
        detail: actief.length === 1 ? '1 actief' : `${actief.length} actief`,
        bron: { titel: 'Geplande taken', secties: [
          { kop: 'Loopt', lijst: actief.map(regel), leeg: 'Er staat niets gepland.' },
          ...(rijen.length > actief.length ? [{ kop: 'Afgelopen', lijst: rijen.filter((t: { status: string }) => t.status !== 'actief').slice(0, 10).map(regel) }] : []),
        ] },
      };
    },
  },

  stop_taak: {
    label: () => 'Taak stoppen',
    async voer(db, invoer) {
      if (!isUuid(invoer.taak_id)) return { resultaat: { fout: 'Geef het taak_id uit toon_taken.' }, detail: 'geen id' };
      const { data, error } = await db.from('zarvis_taken').update({ status: 'gestopt', updated_at: new Date().toISOString() })
        .eq('id', invoer.taak_id).eq('status', 'actief').select('id, opdracht');
      if (error) throw new Error(error.message);
      if (!data?.length) return { resultaat: { fout: 'Die taak liep niet (meer).' }, detail: 'liep niet' };
      return { resultaat: { gestopt: true, opdracht: data[0].opdracht }, detail: 'gestopt' };
    },
  },

  stuur_whatsapp: {
    label: (i) => (i.naar_mij === true ? 'WhatsApp naar jezelf' : 'WhatsApp versturen'),
    async voer(db, invoer) {
      const tekst = String(invoer.tekst ?? '').trim().slice(0, 4000);
      if (!tekst) return { resultaat: { fout: 'Er is geen tekst.' }, detail: 'geen tekst' };
      const b = await bestemming(db, invoer);
      if (typeof b === 'string') return { resultaat: { fout: b }, detail: 'geen bestemming' };
      if (b.telefoon && invoer.bevestigd !== true) {
        return { resultaat: { niet_verstuurd: true, naar: b.naam, tekst }, wachtOpJa: true, detail: `aan ${b.naam}, wacht op ja`, bron: { titel: `Voorstel: WhatsApp aan ${b.naam}`, ondertitel: 'Nog niet verstuurd. Wacht op jouw ja.', secties: [{ lijst: [{ links: 'wij', tekst }] }] } };
      }
      const { error } = await db.from('whatsapp_uit').insert({ telefoon: b.telefoon, naam: b.naam, tekst, lead_id: b.lead_id });
      if (error) throw new Error(error.message);
      return {
        resultaat: { klaargezet: true, naar: b.naam, uitleg: 'Het programma op de pc van de gebruiker verstuurt dit binnen een halve minuut via zijn WhatsApp. Staat de pc uit of is WhatsApp niet gekoppeld, dan vertrekt het zodra dat weer zo is.' },
        detail: `naar ${b.naam}`,
        bron: { titel: `WhatsApp aan ${b.naam}`, secties: [{ lijst: [{ links: 'wij', tekst }] }] },
      };
    },
  },

  leer_vaardigheid: {
    label: (i) => `Aanleren: ${String(i.naam ?? '').slice(0, 40)}`,
    async voer(db, invoer) {
      const naam = String(invoer.naam ?? '').trim().slice(0, 80);
      const wanneerTekst = String(invoer.wanneer ?? '').trim().slice(0, 400);
      const stappen = String(invoer.stappen ?? '').trim().slice(0, 3000);
      if (!naam || !wanneerTekst || !stappen) return { resultaat: { fout: 'Geef naam, wanneer en stappen.' }, detail: 'onvolledig' };
      const { error } = await db.from('zarvis_vaardigheden').insert({ naam, wanneer: wanneerTekst, stappen });
      if (error) throw new Error(error.message);
      return { resultaat: { aangeleerd: true, naam }, detail: 'aangeleerd', bron: { titel: `Aangeleerd: ${naam}`, secties: [{ velden: [{ label: 'Wanneer', waarde: wanneerTekst }, { label: 'Stappen', waarde: stappen }] }] } };
    },
  },

  zet_stijl: {
    label: (i) => `Stijl: ${String(i.stijl ?? '').slice(0, 20)}`,
    async voer(db, invoer) {
      const stijl = String(invoer.stijl ?? '');
      if (!(stijl in STIJLEN)) return { resultaat: { fout: 'Kies gewoon, familie of savage.' }, detail: 'onbekende stijl' };
      // user_id vult de databank zelf in (auth.uid()); de RLS laat alleen een beheerder schrijven.
      const { error } = await db.from('zarvis_instellingen').upsert({ stijl, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) return { resultaat: { fout: 'De stijl bewaren lukte niet. Alleen een beheerder kan de stijl veranderen.' }, detail: 'niet bewaard' };
      return { resultaat: { stijl, vanaf_nu: STIJLEN[stijl] || 'Praat weer gewoon, zoals in je basisinstructie.' }, detail: stijl };
    },
  },

  meld_tekort: {
    label: () => 'Noteren wat nog niet kan',
    async voer(db, invoer) {
      const vraag = String(invoer.vraag ?? '').trim().slice(0, 1000);
      if (!vraag) return { resultaat: { fout: 'Geef de vraag.' }, detail: 'leeg' };
      const { error } = await db.from('zarvis_tekorten').insert({ vraag, reden: String(invoer.reden ?? '').trim().slice(0, 1000) || null });
      if (error) throw new Error(error.message);
      return { resultaat: { genoteerd: true, uitleg: 'Dit staat nu op de bouwlijst. De bouwer pakt de lijst elke nacht op.' }, detail: 'genoteerd' };
    },
  },
};
