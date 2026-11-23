// Zarvis op het bureaublad.
//
// Een dunne schil: ze opent één klein venster dat boven alles blijft staan,
// laadt daarin het Zarvis-venster van de webapp, en geeft één systeembrede
// sneltoets door. Alles wat Zarvis kan, zit in de webapp en op de server;
// een verbetering daar is meteen hier zichtbaar, zonder nieuwe installatie.
//
// Instelbaar met omgevingsvariabelen (handig om te testen):
//   ZARVIS_URL        het adres van het Zarvis-venster
//   ZARVIS_SNELTOETS  de toetsencombinatie, in Electron-notatie

const { app, BrowserWindow, globalShortcut, Tray, Menu, shell, screen, session, nativeImage, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const URL_ZARVIS = process.env.ZARVIS_URL || 'https://zolderpunt-kennismaking.lovable.app/zarvis';
const OORSPRONG = new URL(URL_ZARVIS).origin;
const STANDAARD_SNELTOETS = 'Control+Shift+Space';

// ── Instellingen die een herstart overleven ─────────────────────────────────
const instPad = () => path.join(app.getPath('userData'), 'instellingen.json');
function leesInst() {
  try { return JSON.parse(fs.readFileSync(instPad(), 'utf8')); } catch { return {}; }
}
function bewaarInst(wijziging) {
  const alles = { ...leesInst(), ...wijziging };
  try { fs.writeFileSync(instPad(), JSON.stringify(alles, null, 2)); } catch { /* alleen comfort */ }
  return alles;
}

let venster = null;
let tray = null;
let stopt = false;

// ── WhatsApp (gekoppeld toestel, alleen lezen; zie whatsapp.js) ─────────────
let whatsapp = null;
let waVenster = null;
// De login van de gebruiker, doorgegeven door de Zarvis-pagina. Alleen in het
// geheugen: bij het afsluiten is ze weg.
let sessie = { token: null, sleutel: null };
let sneltoetsGelukt = false;

async function stuurWaToestand() {
  if (!waVenster || waVenster.isDestroyed() || !whatsapp) return;
  const t = whatsapp.toestand();
  let qrBeeld = null;
  if (t.qr) {
    try { qrBeeld = await require('qrcode').toDataURL(t.qr, { margin: 1, width: 448 }); } catch { /* geen code */ }
  }
  if (waVenster && !waVenster.isDestroyed()) {
    waVenster.webContents.send('whatsapp:toestand', { ...t, qr: undefined, qrBeeld, gekoppeld: whatsapp.isGekoppeld() });
  }
}

function toonWhatsApp() {
  if (waVenster && !waVenster.isDestroyed()) { waVenster.show(); waVenster.focus(); return; }
  waVenster = new BrowserWindow({
    width: 380, height: 640, resizable: false, title: 'WhatsApp koppelen', backgroundColor: '#07090F',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload-whatsapp.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  waVenster.loadFile(path.join(__dirname, 'whatsapp.html'));
  waVenster.on('closed', () => { waVenster = null; });
}

const sneltoets = () => process.env.ZARVIS_SNELTOETS || leesInst().sneltoets || STANDAARD_SNELTOETS;
const leesbaar = (s) => s.replace('Control', 'Ctrl').replace('CommandOrControl', 'Ctrl').replace(/\+/g, ' + ').replace('Space', 'Spatie');

function maakVenster() {
  const inst = leesInst();
  const werk = screen.getPrimaryDisplay().workArea;
  const breedte = inst.breedte || 380;
  const hoogte = inst.hoogte || 560;

  venster = new BrowserWindow({
    width: breedte,
    height: hoogte,
    // Standaard rechtsonder, uit de weg van het werk.
    x: inst.x ?? werk.x + werk.width - breedte - 24,
    y: inst.y ?? werk.y + werk.height - hoogte - 24,
    minWidth: 320,
    minHeight: 360,
    frame: false,
    alwaysOnTop: inst.bovenop !== false,
    skipTaskbar: false,
    backgroundColor: '#07090F',
    title: 'Zarvis',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--zarvis-sneltoets=${leesbaar(sneltoets())}`],
    },
  });
  // Boven schermvullende vensters blijven, zoals een videogesprek.
  if (inst.bovenop !== false) venster.setAlwaysOnTop(true, 'floating');

  // Het venster heet Zarvis, wat de pagina erin ook als titel zet.
  venster.on('page-title-updated', (e) => e.preventDefault());
  venster.once('ready-to-show', () => venster.show());
  venster.loadURL(URL_ZARVIS).catch(() => venster.loadFile(path.join(__dirname, 'offline.html')));
  venster.webContents.on('did-fail-load', (_e, _code, _oms, _url, hoofd) => {
    if (hoofd) venster.loadFile(path.join(__dirname, 'offline.html'));
  });

  // Het venster toont alleen Zarvis. Elke andere link gaat naar de gewone browser.
  const magHier = (url) => { try { return new URL(url).origin === OORSPRONG || url.startsWith('file:'); } catch { return false; } };
  venster.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  venster.webContents.on('will-navigate', (e, url) => {
    if (!magHier(url)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); }
  });

  const onthoud = () => {
    if (!venster || venster.isDestroyed()) return;
    const b = venster.getBounds();
    bewaarInst({ x: b.x, y: b.y, breedte: b.width, hoogte: b.height });
  };
  venster.on('moved', onthoud);
  venster.on('resized', onthoud);

  // Sluiten verbergt: Zarvis blijft klaarstaan achter de sneltoets en het
  // icoon in het systeemvak. Echt stoppen kan via dat icoon.
  venster.on('close', (e) => {
    if (stopt) return;
    e.preventDefault();
    venster.hide();
  });
}

function toon() {
  if (!venster || venster.isDestroyed()) maakVenster();
  if (venster.isMinimized()) venster.restore();
  venster.show();
  venster.focus();
}

function registreerSneltoets() {
  globalShortcut.unregisterAll();
  const gelukt = globalShortcut.register(sneltoets(), () => {
    toon();
    venster.webContents.send('zarvis:sneltoets');
  });
  // Mislukt als een ander programma de combinatie al bezet.
  return gelukt;
}

function bouwTray(sneltoetsGelukt) {
  // Een eenvoudig blauw bolletje als icoon, zonder apart bestand.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="12" fill="#2E8BFF"/><circle cx="12" cy="12" r="4" fill="#BFE0FF"/></svg>`;
  const icoon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
  tray = new Tray(icoon.isEmpty() ? nativeImage.createEmpty() : icoon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Zarvis');
  const inst = leesInst();
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Zarvis tonen', click: toon },
    { label: 'Verbergen', click: () => venster && venster.hide() },
    { type: 'separator' },
    {
      label: 'Altijd bovenop', type: 'checkbox', checked: inst.bovenop !== false,
      click: (item) => { bewaarInst({ bovenop: item.checked }); if (venster) venster.setAlwaysOnTop(item.checked, 'floating'); },
    },
    {
      label: 'Starten met de computer', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { label: 'WhatsApp koppelen…', click: toonWhatsApp },
    { label: sneltoetsGelukt ? `Sneltoets: ${leesbaar(sneltoets())}` : `Sneltoets ${leesbaar(sneltoets())} is bezet door een ander programma`, enabled: false },
    { type: 'separator' },
    { label: 'Zarvis afsluiten', click: () => { stopt = true; app.quit(); } },
  ]));
  tray.on('click', toon);
}

// Eén Zarvis tegelijk: een tweede start toont gewoon het bestaande venster.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', toon);

  app.whenReady().then(() => {
    // De microfoon mag alleen door Zarvis zelf gebruikt worden, niets anders.
    session.defaultSession.setPermissionRequestHandler((wc, permissie, antwoord, details) => {
      let vanZarvis = false;
      try { vanZarvis = new URL(details.requestingUrl || wc.getURL()).origin === OORSPRONG; } catch { /* nee */ }
      antwoord(vanZarvis && (permissie === 'media' || permissie === 'audioCapture'));
    });
    session.defaultSession.setPermissionCheckHandler((_wc, permissie, oorsprong) =>
      oorsprong === OORSPRONG && (permissie === 'media' || permissie === 'audioCapture'));

    ipcMain.on('zarvis:verberg', () => venster && venster.hide());

    // De Zarvis-pagina geeft de login door, zodat WhatsApp-gesprekken onder
    // die gebruiker naar de server gaan. Alleen van het Zarvis-venster zelf.
    ipcMain.on('zarvis:sessie', (e, s) => {
      if (!venster || e.sender !== venster.webContents) return;
      sessie = { token: s && typeof s.token === 'string' ? s.token : null, sleutel: s && typeof s.sleutel === 'string' ? s.sleutel : null };
      if (sessie.token && whatsapp) void whatsapp.stuurDoor();
    });

    whatsapp = require('./whatsapp.js')({
      map: app.getPath('userData'),
      geefToken: () => sessie.token,
      get publiekeSleutel() { return sessie.sleutel; },
      opToestand: () => { void stuurWaToestand(); },
    });
    const vanWaVenster = (e) => waVenster && !waVenster.isDestroyed() && e.sender === waVenster.webContents;
    ipcMain.on('whatsapp:toestand', (e) => { if (vanWaVenster(e)) void stuurWaToestand(); });
    ipcMain.on('whatsapp:start', (e) => { if (vanWaVenster(e)) void whatsapp.start(); });
    ipcMain.on('whatsapp:ontkoppel', (e) => { if (vanWaVenster(e)) void whatsapp.ontkoppel(); });
    // Was er al gekoppeld, dan leest Zarvis vanzelf verder bij het opstarten.
    if (whatsapp.isGekoppeld()) void whatsapp.start();

    maakVenster();
    const gelukt = registreerSneltoets();
    sneltoetsGelukt = gelukt;
    try { bouwTray(gelukt); } catch (e) { console.error('systeemvak niet beschikbaar', e); }

    if (process.env.ZARVIS_ZELFTEST) require('./zelftest.js')(venster, { gelukt, sneltoets: sneltoets() });
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
  // Venster dicht betekent verborgen, niet gestopt.
  app.on('window-all-closed', () => {});
  app.on('activate', toon);
}
