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
const URL_BRON = `${OORSPRONG}/zarvis/bron`;
const URL_BEHEER = `${OORSPRONG}/zarvis/beheer`;
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
let bronVenster = null;
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

// ── Beheer: connectoren en programma-instellingen ───────────────────────────
// De inhoud is een pagina van de webapp; het programma geeft er alleen zijn
// eigen toestand aan door (WhatsApp, sneltoets, bovenop, starten met Windows).
let beheerVenster = null;
function toonBeheer(eerste, keuzes) {
  if (beheerVenster && !beheerVenster.isDestroyed()) { beheerVenster.show(); beheerVenster.focus(); return; }
  beheerVenster = new BrowserWindow({
    width: 520, height: 720, minWidth: 420, minHeight: 520, title: eerste ? 'Zarvis inrichten' : 'Zarvis · beheer',
    backgroundColor: '#07090F', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload-beheer.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  beheerVenster.on('page-title-updated', (e) => e.preventDefault());
  const vraag = new URLSearchParams();
  if (eerste) vraag.set('eerste', '1');
  if (keuzes && keuzes.whatsapp === false) vraag.set('whatsapp', '0');
  if (keuzes && keuzes.stem === false) vraag.set('stem', '0');
  if (keuzes && keuzes.maps === false) vraag.set('maps', '0');
  if (keuzes && keuzes.mail === false) vraag.set('mail', '0');
  beheerVenster.loadURL(URL_BEHEER + (vraag.size ? `?${vraag}` : ''));
  beheerVenster.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  beheerVenster.webContents.on('will-navigate', (e, url) => { try { if (new URL(url).origin !== OORSPRONG) e.preventDefault(); } catch { e.preventDefault(); } });
  beheerVenster.on('closed', () => { beheerVenster = null; });
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

// Waar het gegevensvenster komt: waar je het de vorige keer liet staan, en
// anders vlak naast Zarvis, aan de kant waar plaats is.
function plekVoorBron() {
  const b = leesInst().bron;
  const hoofd = venster.getBounds();
  const werk = screen.getDisplayMatching(hoofd).workArea;
  const breedte = (b && b.breedte) || 420;
  const hoogte = (b && b.hoogte) || Math.max(hoofd.height, 480);
  const binnen = (x, y) => x >= werk.x - 40 && y >= werk.y - 40 && x + breedte <= werk.x + werk.width + 40 && y + hoogte <= werk.y + werk.height + 40;
  if (b && typeof b.x === 'number' && binnen(b.x, b.y)) return { x: b.x, y: b.y, width: breedte, height: hoogte };
  const links = hoofd.x - breedte - 12;
  const rechts = hoofd.x + hoofd.width + 12;
  const x = links >= werk.x ? links : (rechts + breedte <= werk.x + werk.width ? rechts : werk.x);
  const y = Math.min(Math.max(hoofd.y + hoofd.height - hoogte, werk.y), werk.y + werk.height - hoogte);
  return { x, y, width: breedte, height: hoogte };
}

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
    // Eén uitzondering: het gegevensvenster van Zarvis zelf. Dat komt als
    // tweede klein venster naast het gesprek te staan, ook bovenop.
    if (url === URL_BRON) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          ...plekVoorBron(),
          minWidth: 320,
          minHeight: 320,
          frame: false,
          alwaysOnTop: leesInst().bovenop !== false,
          backgroundColor: '#07090F',
          title: 'Zarvis · gegevens',
          webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
        },
      };
    }
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  venster.webContents.on('did-create-window', (kind) => {
    bronVenster = kind;
    if (leesInst().bovenop !== false) kind.setAlwaysOnTop(true, 'floating');
    kind.on('page-title-updated', (e) => e.preventDefault());
    // Het gegevensvenster toont alleen gegevens: het opent niets en gaat nergens heen.
    kind.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    kind.webContents.on('will-navigate', (e, url) => { if (url !== URL_BRON) e.preventDefault(); });
    const onthoudBron = () => {
      if (kind.isDestroyed()) return;
      const b = kind.getBounds();
      bewaarInst({ bron: { x: b.x, y: b.y, breedte: b.width, hoogte: b.height } });
    };
    kind.on('moved', onthoudBron);
    kind.on('resized', onthoudBron);
    kind.on('closed', () => { if (bronVenster === kind) bronVenster = null; });
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
    if (bronVenster && !bronVenster.isDestroyed()) bronVenster.close();
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
      click: (item) => {
        bewaarInst({ bovenop: item.checked });
        if (venster) venster.setAlwaysOnTop(item.checked, 'floating');
        if (bronVenster && !bronVenster.isDestroyed()) bronVenster.setAlwaysOnTop(item.checked, 'floating');
      },
    },
    {
      label: 'Starten met de computer', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { label: 'Beheer…', click: () => toonBeheer(false) },
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
      antwoord(vanZarvis && (permissie === 'media' || permissie === 'audioCapture' || permissie === 'notifications'));
    });
    session.defaultSession.setPermissionCheckHandler((_wc, permissie, oorsprong) =>
      oorsprong === OORSPRONG && (permissie === 'media' || permissie === 'audioCapture' || permissie === 'notifications'));

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
    // Tenzij WhatsApp in de beheersectie uit staat.
    if (whatsapp.isGekoppeld() && leesInst().whatsappAan !== false) void whatsapp.start();

    const vanBeheer = (e) => beheerVenster && !beheerVenster.isDestroyed() && e.sender === beheerVenster.webContents;
    ipcMain.handle('beheer:toestand', (e) => {
      if (!vanBeheer(e)) return null;
      const inst = leesInst();
      return {
        versie: app.getVersion(),
        sneltoets: leesbaar(sneltoets()),
        sneltoetsGelukt,
        bovenop: inst.bovenop !== false,
        startMee: app.getLoginItemSettings().openAtLogin,
        whatsapp: { gekoppeld: whatsapp.isGekoppeld(), aan: inst.whatsappAan !== false },
      };
    });
    ipcMain.on('beheer:zet', (e, sleutel, waarde) => {
      if (!vanBeheer(e)) return;
      const aan = waarde === true;
      if (sleutel === 'bovenop') {
        bewaarInst({ bovenop: aan });
        if (venster) venster.setAlwaysOnTop(aan, 'floating');
        if (bronVenster && !bronVenster.isDestroyed()) bronVenster.setAlwaysOnTop(aan, 'floating');
      } else if (sleutel === 'startMee') {
        app.setLoginItemSettings({ openAtLogin: aan });
      } else if (sleutel === 'whatsappAan') {
        bewaarInst({ whatsappAan: aan });
        if (!aan) whatsapp.pauzeer(); else if (whatsapp.isGekoppeld()) void whatsapp.start();
      }
      // Het systeemvak toont dezelfde vinkjes.
      try { if (tray) { tray.destroy(); bouwTray(sneltoetsGelukt); } } catch { /* alleen comfort */ }
    });
    ipcMain.on('beheer:whatsapp', (e) => { if (vanBeheer(e)) toonWhatsApp(); });
    ipcMain.on('beheer:klaar', (e) => {
      if (!vanBeheer(e)) return;
      bewaarInst({ ingericht: true });
      beheerVenster.close();
      toon();
    });

    maakVenster();
    const gelukt = registreerSneltoets();
    sneltoetsGelukt = gelukt;
    try { bouwTray(gelukt); } catch (e) { console.error('systeemvak niet beschikbaar', e); }

    // Eerste start na de installatie: de inrichting met de connectoren.
    if (!leesInst().ingericht && !process.env.ZARVIS_ZELFTEST) {
      // Wat in het installatieprogramma aangevinkt is, staat hier al goed.
      let keuzes = null;
      try { keuzes = JSON.parse(fs.readFileSync(path.join(path.dirname(process.execPath), 'installatie.json'), 'utf8')); } catch { /* geen installatie, of oud */ }
      if (keuzes) {
        if (keuzes.startMee === true) app.setLoginItemSettings({ openAtLogin: true });
        if (keuzes.whatsapp === false) bewaarInst({ whatsappAan: false });
      }
      toonBeheer(true, keuzes);
    }

    if (process.env.ZARVIS_ZELFTEST) require('./zelftest.js')(venster, { gelukt, sneltoets: sneltoets() });
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
  // Venster dicht betekent verborgen, niet gestopt.
  app.on('window-all-closed', () => {});
  app.on('activate', toon);
}
