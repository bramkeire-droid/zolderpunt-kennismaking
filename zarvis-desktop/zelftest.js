// Zelftest van de schil (alleen met ZARVIS_ZELFTEST=1): controleert het venster,
// de brug naar de pagina en de afscherming, schrijft een schermafdruk en stopt.
const { app, globalShortcut } = require('electron');
const fs = require('node:fs');

module.exports = (venster, info) => {
  const uit = {};
  const klaar = async () => {
    try {
      uit.titel = venster.getTitle();
      uit.url = venster.webContents.getURL();
      uit.bovenop = venster.isAlwaysOnTop();
      uit.afmeting = venster.getBounds();
      uit.sneltoetsGeregistreerd = info.gelukt && globalShortcut.isRegistered(info.sneltoets);
      uit.brug = await venster.webContents.executeJavaScript(
        `({ bestaat: typeof window.zarvisSchil === 'object', sneltoets: window.zarvisSchil && window.zarvisSchil.sneltoets, node: typeof require, proces: typeof process })`);
      // De sneltoets moet bij de pagina aankomen.
      await venster.webContents.executeJavaScript(`window.__geteld = 0; window.zarvisSchil.opSneltoets(() => { window.__geteld++; }); true`);
      venster.webContents.send('zarvis:sneltoets');
      await new Promise((k) => setTimeout(k, 300));
      uit.sneltoetsKomtAan = await venster.webContents.executeJavaScript('window.__geteld');
      // Het gegevensvenster: mag open als tweede venster, naast Zarvis en bovenop.
      const { BrowserWindow } = require('electron');
      await venster.webContents.executeJavaScript(`window.__bron = window.open('/zarvis/bron', 'zarvis-bron', 'popup=yes'); window.open('https://example.com/', 'vreemd'); true`, true);
      await new Promise((k) => setTimeout(k, 1500));
      const andere = BrowserWindow.getAllWindows().filter((w) => w !== venster);
      uit.bron = andere.map((w) => ({ url: w.webContents.getURL(), bovenop: w.isAlwaysOnTop(), plek: w.getBounds(), overlapt: !(w.getBounds().x + w.getBounds().width <= venster.getBounds().x || w.getBounds().x >= venster.getBounds().x + venster.getBounds().width) }));
      if (andere[0]) {
        const binnen = (belofte) => Promise.race([belofte, new Promise((k) => setTimeout(() => k(null), 4000))]);
        uit.bronNode = await binnen(andere[0].webContents.executeJavaScript('typeof require + "/" + typeof window.zarvisSchil'));
        const b = await binnen(andere[0].webContents.capturePage());
        if (b) fs.writeFileSync(process.env.ZARVIS_ZELFTEST.replace('.png', '-bron.png'), b.toPNG());
        uit.bronBeeld = !!b;
      }
      // Weg-navigeren naar een vreemd adres moet geweigerd worden.
      await venster.webContents.executeJavaScript(`window.location.href = 'https://example.com/'; true`);
      await new Promise((k) => setTimeout(k, 800));
      uit.naVreemdAdres = venster.webContents.getURL();
      // De login-brug bestaat, en de WhatsApp-module laadt zonder te verbinden.
      uit.sessieBrug = await venster.webContents.executeJavaScript(`typeof window.zarvisSchil.zetSessie`);
      try {
        const b = await import('baileys');
        uit.whatsappBibliotheek = typeof b.default === 'function' && typeof b.useMultiFileAuthState === 'function' && !!b.Browsers && !!b.DisconnectReason;
      } catch (e) { uit.whatsappBibliotheek = String(e).slice(0, 200); }
      const beeld = await venster.webContents.capturePage();
      fs.writeFileSync(process.env.ZARVIS_ZELFTEST, beeld.toPNG());
    } catch (e) {
      uit.fout = String(e);
    }
    console.log('ZELFTEST ' + JSON.stringify(uit));
    app.exit(0);
  };
  venster.webContents.once('did-finish-load', () => setTimeout(klaar, 2500));
  // Loopt er iets vast, dan toch een uitslag in plaats van een hangend proces.
  setTimeout(() => { console.log('ZELFTEST-VAST ' + JSON.stringify(uit)); app.exit(1); }, 40000);
};
