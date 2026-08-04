// ================================================================
// content.js — brug tussen de Compass-webapp en de extensie
//
// Draait op de Compass-pagina's. De webapp kan de extensie niet
// rechtstreeks aanspreken (ze kent het extensie-id niet), dus loopt alles
// via window.postMessage op het paginavenster.
//
// Protocol (webapp -> extensie):
//   { source: 'zp-compass', type: 'PING', requestId }
//   { source: 'zp-compass', type: 'SET_PHASE', requestId,
//     projectNumber: 'ZL-0119', phaseId: 20, phaseTitle: 'Opvolging lange termijn' }
//
// Antwoord (extensie -> webapp), altijd met dezelfde requestId:
//   { source: 'zp-compass-ext', type: 'PONG', requestId, version }
//   { source: 'zp-compass-ext', type: 'SET_PHASE_RESULT', requestId,
//     ok: boolean, error?: string, needsLogin?: boolean }
// ================================================================

const EXT_SOURCE = 'zp-compass-ext';
const APP_SOURCE = 'zp-compass';

window.addEventListener('message', (event) => {
  // Enkel berichten van de pagina zelf, niet uit iframes van derden.
  if (event.source !== window) return;

  const msg = event.data;
  if (!msg || typeof msg !== 'object' || msg.source !== APP_SOURCE) return;
  if (!msg.requestId) return;

  if (msg.type === 'PING') {
    window.postMessage(
      { source: EXT_SOURCE, type: 'PONG', requestId: msg.requestId, version: chrome.runtime.getManifest().version },
      window.location.origin
    );
    return;
  }

  if (msg.type === 'SET_PHASE') {
    chrome.runtime.sendMessage(
      {
        type: 'SET_PHASE',
        projectNumber: msg.projectNumber,
        phaseId: msg.phaseId,
        phaseTitle: msg.phaseTitle,
      },
      (response) => {
        const err = chrome.runtime.lastError;
        window.postMessage(
          {
            source: EXT_SOURCE,
            type: 'SET_PHASE_RESULT',
            requestId: msg.requestId,
            ok: !err && response && response.ok === true,
            error: err ? err.message : response && response.error,
            needsLogin: response && response.needsLogin === true,
          },
          window.location.origin
        );
      }
    );
  }
});

// Laat de webapp weten dat de brug er is, ook als ze eerder klaar was dan wij.
window.postMessage(
  { source: EXT_SOURCE, type: 'READY', version: chrome.runtime.getManifest().version },
  window.location.origin
);
