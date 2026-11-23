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
};
