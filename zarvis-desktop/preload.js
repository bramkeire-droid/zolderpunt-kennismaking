// De enige brug tussen de schil en de pagina: de sneltoets doorgeven, en het
// venster kunnen verbergen. De pagina krijgt verder niets van het systeem.
const { contextBridge, ipcRenderer } = require('electron');

const arg = process.argv.find((a) => a.startsWith('--zarvis-sneltoets='));

contextBridge.exposeInMainWorld('zarvisSchil', {
  sneltoets: arg ? arg.slice('--zarvis-sneltoets='.length) : undefined,
  opSneltoets(cb) {
    const luisteraar = () => cb();
    ipcRenderer.on('zarvis:sneltoets', luisteraar);
    return () => ipcRenderer.removeListener('zarvis:sneltoets', luisteraar);
  },
  verberg() { ipcRenderer.send('zarvis:verberg'); },
  /** De login doorgeven, zodat de schil WhatsApp-gesprekken onder deze gebruiker kan doorsturen. */
  zetSessie(sessie) { ipcRenderer.send('zarvis:sessie', sessie); },
});
