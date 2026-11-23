// Brug voor het eigen WhatsApp-venster van de schil (een lokaal bestand).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('zarvisWhatsApp', {
  start: () => ipcRenderer.send('whatsapp:start'),
  ontkoppel: () => ipcRenderer.send('whatsapp:ontkoppel'),
  vraagToestand: () => ipcRenderer.send('whatsapp:toestand'),
  opToestand: (cb) => ipcRenderer.on('whatsapp:toestand', (_e, t) => cb(t)),
});
