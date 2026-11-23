// De brug voor het beheervenster: de toestand van het programma lezen en de
// paar instellingen zetten die alleen het programma kent. Niets anders.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zarvisBeheer', {
  toestand: () => ipcRenderer.invoke('beheer:toestand'),
  zet(sleutel, waarde) { ipcRenderer.send('beheer:zet', sleutel, waarde === true); },
  koppelWhatsApp() { ipcRenderer.send('beheer:whatsapp'); },
  klaar() { ipcRenderer.send('beheer:klaar'); },
});
