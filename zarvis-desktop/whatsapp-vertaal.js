// Vertaalt een bericht zoals WhatsApp het aanlevert naar de rij die naar de
// server gaat. Zuiver rekenwerk, zonder verbinding, zodat het los te testen is.
//
// Wat hier NIET doorkomt: groepsgesprekken, statusupdates, kanalen, berichten
// zonder herkenbaar telefoonnummer en systeemmeldingen zonder inhoud.

const PN = '@s.whatsapp.net';

/** Het telefoonnummer (alleen cijfers) uit een adres als 32478123456:12@s.whatsapp.net. */
function nummerUit(jid) {
  if (typeof jid !== 'string' || !jid.endsWith(PN)) return null;
  const cijfers = jid.slice(0, -PN.length).split(':')[0].replace(/[^\d]/g, '');
  return cijfers.length >= 9 ? cijfers : null;
}

/**
 * WhatsApp adresseert gesprekken soms met een anoniem id (@lid) in plaats van
 * het nummer. `lidNaarNummer` is de tabel die het programma daarvoor bijhoudt.
 */
function nummerVanGesprek(key, lidNaarNummer) {
  for (const jid of [key.remoteJid, key.remoteJidAlt]) {
    const n = nummerUit(jid);
    if (n) return n;
  }
  for (const jid of [key.remoteJid, key.remoteJidAlt]) {
    if (typeof jid === 'string' && jid.endsWith('@lid')) {
      const n = lidNaarNummer && lidNaarNummer.get(jid.split(':')[0].replace('@lid', ''));
      if (n) return n;
    }
  }
  return null;
}

/** Pelt de verpakkingen weg die WhatsApp rond de eigenlijke inhoud legt. */
function inhoudVan(message) {
  let m = message;
  for (let i = 0; i < 5 && m; i++) {
    const binnen =
      m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message ||
      m.viewOnceMessageV2Extension?.message || m.documentWithCaptionMessage?.message || m.editedMessage?.message;
    if (!binnen) break;
    m = binnen;
  }
  return m;
}

function soortEnTekst(message) {
  const m = inhoudVan(message);
  if (!m) return null;
  if (typeof m.conversation === 'string' && m.conversation) return { soort: 'tekst', tekst: m.conversation };
  if (m.extendedTextMessage?.text) return { soort: 'tekst', tekst: m.extendedTextMessage.text };
  if (m.imageMessage) return { soort: 'afbeelding', tekst: m.imageMessage.caption || null };
  if (m.videoMessage) return { soort: 'video', tekst: m.videoMessage.caption || null };
  if (m.audioMessage) return { soort: 'audio', tekst: null };
  if (m.documentMessage) return { soort: 'document', tekst: m.documentMessage.caption || m.documentMessage.fileName || null };
  if (m.stickerMessage) return { soort: 'sticker', tekst: null };
  if (m.locationMessage || m.liveLocationMessage) return { soort: 'locatie', tekst: null };
  if (m.contactMessage || m.contactsArrayMessage) return { soort: 'contact', tekst: null };
  // Reacties, leesbevestigingen, sleutelwissels en dergelijke: geen gesprek.
  return null;
}

/** Geeft de rij voor de server, of null als dit bericht niet doorgestuurd wordt. */
function vertaal(msg, lidNaarNummer) {
  const key = msg && msg.key;
  if (!key || !key.id || typeof key.remoteJid !== 'string') return null;
  const jid = key.remoteJid;
  if (jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid.endsWith('@newsletter') || jid === 'status@broadcast') return null;

  const telefoon = nummerVanGesprek(key, lidNaarNummer);
  if (!telefoon) return null;

  const inhoud = soortEnTekst(msg.message);
  if (!inhoud) return null;

  const t = msg.messageTimestamp;
  const seconden = typeof t === 'number' ? t : t && typeof t.toNumber === 'function' ? t.toNumber() : Number(t);
  if (!Number.isFinite(seconden) || seconden <= 0) return null;

  return {
    wa_id: String(key.id),
    telefoon,
    van_mij: key.fromMe === true,
    verstuurd_op: new Date(seconden * 1000).toISOString(),
    soort: inhoud.soort,
    tekst: inhoud.tekst,
  };
}

module.exports = { vertaal, nummerUit };
