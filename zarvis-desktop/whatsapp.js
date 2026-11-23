// WhatsApp als gekoppeld toestel: meelezen, en versturen wat Zarvis klaarzet.
//
// Dit meldt het Zarvis-programma aan op het zakelijke WhatsApp-nummer, op
// dezelfde manier als WhatsApp Web: één keer een QR-code scannen met de gsm.
// Daarna komen de gesprekken hier binnen en gaan ze door naar Compass.
//
// De afspraken:
//   1. Versturen gebeurt alleen voor berichten die op de server in
//      `whatsapp_uit` klaarstaan voor deze gebruiker. Zarvis zet daar een
//      bericht aan een klant pas in nadat de gebruiker de tekst hoorde en ja
//      zei; berichten aan de gebruiker zelf (verwittigingen) mogen meteen.
//      Elk bericht vertrekt hoogstens één keer, met een pauze ertussen.
//   2. Je staat niet als "online" te boek door deze koppeling.
//   3. Groepen worden nooit doorgestuurd, en de server bewaart alleen
//      gesprekken met nummers die in een dossier staan.
//
// LET OP: dit gebruikt een bibliotheek die niet van WhatsApp is. Dat gaat in
// tegen hun voorwaarden; in het ergste geval blokkeren ze het nummer. Bram
// heeft dat risico op 2026-11-23 aanvaard voor lezen en op 2026-11-24 voor
// versturen ("natuurlijk moet Zarvis versturen").

const path = require('node:path');
const fs = require('node:fs');
const { vertaal } = require('./whatsapp-vertaal.js');

const FUNCTIE = 'https://xgrshvqteylncjbfsqbi.supabase.co/functions/v1/whatsapp-koppeling';
const PER_KEER = 150;
const UIT = 'https://xgrshvqteylncjbfsqbi.supabase.co/rest/v1/whatsapp_uit';
const UIT_ELKE_MS = 20000;
const UIT_PAUZE_MS = 2500;

module.exports = function maakWhatsApp(opties) {
  const { map, geefToken, opToestand } = opties;
  const authMap = path.join(map, 'whatsapp-sessie');
  const lidPad = path.join(map, 'whatsapp-lid.json');
  const wachtPad = path.join(map, 'whatsapp-wachtrij.json');

  let sock = null;
  let gestopt = false;
  let toestand = { status: 'uit', qr: null, melding: null, bewaard: 0, laatste: null };
  const zet = (w) => { toestand = { ...toestand, ...w }; opToestand(toestand); };

  // Anoniem id -> telefoonnummer, zoals WhatsApp het zelf doorgeeft.
  const lidNaarNummer = new Map();
  try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(lidPad, 'utf8')))) lidNaarNummer.set(k, v); } catch { /* nog geen */ }
  const bewaarLid = () => { try { fs.writeFileSync(lidPad, JSON.stringify(Object.fromEntries(lidNaarNummer))); } catch { /* comfort */ } };

  // Wat nog naar de server moet. Op schijf, zodat niets verloren gaat als de
  // pc uitgaat of er even geen verbinding of login is.
  let wachtrij = [];
  try { wachtrij = JSON.parse(fs.readFileSync(wachtPad, 'utf8')); } catch { /* leeg */ }
  const bewaarWachtrij = () => { try { fs.writeFileSync(wachtPad, JSON.stringify(wachtrij)); } catch { /* comfort */ } };

  let bezig = false;
  async function stuurDoor() {
    if (bezig || wachtrij.length === 0) return;
    const token = geefToken();
    if (!token) { zet({ melding: 'Log in bij Zarvis om de gesprekken door te sturen.' }); return; }
    bezig = true;
    try {
      while (wachtrij.length > 0) {
        const pak = wachtrij.slice(0, PER_KEER);
        const res = await fetch(FUNCTIE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: opties.publiekeSleutel || '' },
          body: JSON.stringify({ berichten: pak }),
        });
        if (!res.ok) {
          const fout = await res.json().catch(() => null);
          zet({ melding: res.status === 401 ? 'Log opnieuw in bij Zarvis om de gesprekken door te sturen.' : (fout && fout.error) || `De server gaf fout ${res.status}.` });
          break;
        }
        const uit = await res.json();
        wachtrij = wachtrij.slice(pak.length);
        bewaarWachtrij();
        zet({ bewaard: toestand.bewaard + (uit.bewaard || 0), laatste: new Date().toISOString(), melding: null });
      }
    } catch {
      zet({ melding: 'Geen verbinding met de server; de gesprekken worden later doorgestuurd.' });
    } finally {
      bezig = false;
    }
  }

  function neemOp(berichten) {
    let erbij = 0;
    for (const m of berichten || []) {
      const rij = vertaal(m, lidNaarNummer);
      if (rij) { wachtrij.push(rij); erbij++; }
    }
    if (erbij > 0) { bewaarWachtrij(); void stuurDoor(); }
  }

  function leerLid(paren) {
    let nieuw = false;
    for (const p of paren || []) {
      const lid = String(p.lid || '').split(':')[0].replace('@lid', '');
      const pn = String(p.pn || '').split(':')[0].replace(/[^\d]/g, '');
      if (lid && pn.length >= 9 && lidNaarNummer.get(lid) !== pn) { lidNaarNummer.set(lid, pn); nieuw = true; }
    }
    if (nieuw) bewaarLid();
  }

  // ── Versturen wat Zarvis klaarzette ───────────────────────────────────────
  /** Een Belgisch of internationaal nummer als WhatsApp-adres; null als het geen nummer is. */
  function adresVan(telefoon) {
    let n = String(telefoon).replace(/[^\d+]/g, '');
    if (n.startsWith('+')) n = n.slice(1);
    else if (n.startsWith('00')) n = n.slice(2);
    else if (n.startsWith('0')) n = '32' + n.slice(1);
    return /^\d{9,15}$/.test(n) ? `${n}@s.whatsapp.net` : null;
  }
  let verstuurt = false;
  async function verstuurWachtende() {
    if (verstuurt || gestopt || !sock || toestand.status !== 'gekoppeld') return;
    const token = geefToken();
    if (!token) return;
    verstuurt = true;
    const kop = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: opties.publiekeSleutel || '' };
    try {
      const res = await fetch(`${UIT}?status=eq.wacht&select=id,telefoon,tekst&order=created_at&limit=5`, { headers: kop });
      if (!res.ok) return;
      for (const rij of await res.json()) {
        // Eerst opeisen, dan versturen: valt de pc halverwege uit, dan vertrekt
        // een bericht liever niet dan twee keer.
        const eis = await fetch(`${UIT}?id=eq.${rij.id}&status=eq.wacht`, {
          method: 'PATCH', headers: { ...kop, Prefer: 'return=representation' },
          body: JSON.stringify({ status: 'verstuurd', verstuurd_op: new Date().toISOString() }),
        });
        if (!eis.ok || (await eis.json()).length === 0) continue;
        let fout = null;
        try {
          const eigen = sock.user && sock.user.id ? `${String(sock.user.id).split(':')[0].split('@')[0]}@s.whatsapp.net` : null;
          const adres = rij.telefoon ? adresVan(rij.telefoon) : eigen;
          if (!adres) fout = rij.telefoon ? 'Dit is geen geldig telefoonnummer.' : 'Je eigen nummer is niet bekend; koppel WhatsApp opnieuw.';
          else {
            if (rij.telefoon) {
              const [gevonden] = await sock.onWhatsApp(adres);
              if (!gevonden || !gevonden.exists) fout = 'Dit nummer zit niet op WhatsApp.';
            }
            if (!fout) await sock.sendMessage(adres, { text: String(rij.tekst) });
          }
        } catch (e) { fout = String((e && e.message) || e).slice(0, 300); }
        if (fout) {
          await fetch(`${UIT}?id=eq.${rij.id}`, { method: 'PATCH', headers: kop, body: JSON.stringify({ status: 'mislukt', fout, verstuurd_op: null }) }).catch(() => {});
        }
        await new Promise((k) => setTimeout(k, UIT_PAUZE_MS));
      }
    } catch { /* geen verbinding; volgende ronde opnieuw */ } finally {
      verstuurt = false;
    }
  }
  setInterval(() => { void verstuurWachtende(); }, UIT_ELKE_MS).unref();

  async function start() {
    if (sock || gestopt) return;
    zet({ status: 'verbindt', qr: null, melding: null });
    let baileys;
    try {
      baileys = await import('baileys');
    } catch (e) {
      zet({ status: 'fout', melding: 'De WhatsApp-koppeling kon niet geladen worden.' });
      console.error('whatsapp: laden mislukt', e);
      return;
    }
    const { default: maakSocket, useMultiFileAuthState, DisconnectReason, Browsers } = baileys;
    const pino = require('pino');

    const { state, saveCreds } = await useMultiFileAuthState(authMap);
    sock = maakSocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: Browsers.windows('Zarvis'),
      // Niet als online verschijnen: meldingen blijven op de gsm binnenkomen.
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messaging-history.set', ({ messages, lidPnMappings }) => { leerLid(lidPnMappings); neemOp(messages); });
    sock.ev.on('messages.upsert', ({ messages }) => {
      // Het adres met het echte nummer staat er soms alleen als tweede adres bij.
      for (const m of messages || []) {
        const k = m.key || {};
        if (typeof k.remoteJid === 'string' && k.remoteJid.endsWith('@lid') && typeof k.remoteJidAlt === 'string') {
          leerLid([{ lid: k.remoteJid, pn: k.remoteJidAlt }]);
        }
      }
      neemOp(messages);
    });
    sock.ev.on('connection.update', (u) => {
      if (u.qr) zet({ status: 'qr', qr: u.qr, melding: null });
      if (u.connection === 'open') { zet({ status: 'gekoppeld', qr: null, melding: null }); void stuurDoor(); }
      if (u.connection === 'close') {
        sock = null;
        const code = u.lastDisconnect && u.lastDisconnect.error && u.lastDisconnect.error.output && u.lastDisconnect.error.output.statusCode;
        if (code === DisconnectReason.loggedOut) {
          // Ontkoppeld vanaf de gsm: de sessie is waardeloos geworden.
          try { fs.rmSync(authMap, { recursive: true, force: true }); } catch { /* al weg */ }
          zet({ status: 'uit', qr: null, melding: 'De koppeling is verbroken vanaf je gsm. Koppel opnieuw om verder te lezen.' });
          return;
        }
        if (gestopt) return;
        zet({ status: 'verbindt', melding: 'Verbinding met WhatsApp weg; ik probeer opnieuw.' });
        setTimeout(() => { void start(); }, 5000);
      }
    });
  }

  return {
    toestand: () => toestand,
    isGekoppeld: () => fs.existsSync(path.join(authMap, 'creds.json')),
    start: () => { gestopt = false; return start(); },
    /** Stopt met lezen maar laat de koppeling bestaan. */
    pauzeer() { gestopt = true; try { sock && sock.end(undefined); } catch { /* al dicht */ } sock = null; zet({ status: 'uit', qr: null }); },
    /** Verbreekt de koppeling: dit toestel verdwijnt uit "Gekoppelde apparaten". */
    async ontkoppel() {
      gestopt = true;
      try { if (sock) await sock.logout(); } catch { /* al weg */ }
      sock = null;
      try { fs.rmSync(authMap, { recursive: true, force: true }); } catch { /* al weg */ }
      zet({ status: 'uit', qr: null, melding: 'Ontkoppeld.' });
    },
    stuurDoor,
    /** Alleen voor de test: berichten aanbieden zonder verbinding met WhatsApp. */
    _neemOp: neemOp,
  };
};
