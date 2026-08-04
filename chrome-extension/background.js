// ================================================================
// background.js — zet de projectfase in Bouwflow
//
// WAAROM EEN EXTENSIE: Bouwflow's publieke API kan de fase van een
// BESTAAND project niet wijzigen. PATCH /public-api/projects/{id}
// accepteert enkel notes/name/start_date/end_date; project_phase_id is
// daar alleen schrijfbaar bij POST (aanmaken). Live getest: een PATCH met
// project_phase_id geeft HTTP 200 maar laat de fase ongemoeid. De UI doet
// het via Livewire (POST /livewire/update), met een server-gegenereerde
// snapshot + checksum + CSRF — van buitenaf niet betrouwbaar na te bootsen.
// Daarom bedient een echte, ingelogde browser gewoon de echte pagina.
//
// AANPAK: navigeer naar de projectenlijst gefilterd op het ZL-nummer
// (?search=ZL-0119), zodat er precies één rij overblijft, en zet daar de
// fase-select. Die select is een gewone <select> met de fase-id als
// option-value, aangestuurd door Alpine (x-model="state"). Alpine reageert
// niet op een simpele value-toewijzing, vandaar de native setter gevolgd
// door input- en change-events — hetzelfde patroon als de InvenSync-robot.
//
// Deze extensie bevestigt NIET zelf dat de wijziging is opgeslagen. Dat
// doet Compass daarna onafhankelijk via Bouwflow's API (die kan wel lezen).
// Zo kan een mislukte RPA nooit als succes in Compass belanden.
// ================================================================

const BOUWFLOW_ORIGIN = 'https://zolderpunt.bouwflow.be';
const PROJECTS_URL = `${BOUWFLOW_ORIGIN}/app/zolderpunt/projects`;
const NAV_TIMEOUT_MS = 20000;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'SET_PHASE') {
    handleSetPhase(msg).then(sendResponse).catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true; // async
  }
});

async function handleSetPhase({ projectNumber, phaseId }) {
  if (!projectNumber || !phaseId) {
    return { ok: false, error: 'projectNumber en phaseId zijn vereist' };
  }

  const tab = await ensureBouwflowTab(projectNumber);
  if (!tab) return { ok: false, error: 'Kon geen Bouwflow-tabblad openen' };

  const ready = await waitTabReady(tab.id, NAV_TIMEOUT_MS);
  if (!ready) return { ok: false, error: 'Bouwflow-pagina laadde niet op tijd' };

  let results;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: setPhaseInPage,
      args: [String(projectNumber), Number(phaseId)],
    });
  } catch (e) {
    return { ok: false, error: 'Kon de Bouwflow-pagina niet aansturen: ' + String((e && e.message) || e) };
  }

  const result = results && results[0] && results[0].result;
  if (!result) return { ok: false, error: 'Geen antwoord van de Bouwflow-pagina' };
  return result;
}

async function ensureBouwflowTab(projectNumber) {
  const targetUrl = `${PROJECTS_URL}?search=${encodeURIComponent(projectNumber)}`;
  const tabs = await chrome.tabs.query({ url: 'https://*.bouwflow.be/*' });

  if (tabs.length > 0) {
    // Hergebruik een bestaand tabblad: daar is de sessie al actief.
    return await chrome.tabs.update(tabs[0].id, { url: targetUrl, active: false });
  }
  // Geen Bouwflow-tab open: maak er zelf een, op de achtergrond zodat de
  // gebruiker niet uit Compass wordt weggetrokken.
  return await chrome.tabs.create({ url: targetUrl, active: false });
}

function waitTabReady(tabId, timeout) {
  return new Promise((resolve) => {
    const start = Date.now();
    const poll = async () => {
      let t;
      try {
        t = await chrome.tabs.get(tabId);
      } catch {
        resolve(false);
        return;
      }
      if (t.status === 'complete') {
        // Livewire/Alpine hebben na 'complete' nog even nodig om te hydrateren.
        setTimeout(() => resolve(true), 1200);
        return;
      }
      if (Date.now() - start > timeout) {
        resolve(false);
        return;
      }
      setTimeout(poll, 250);
    };
    poll();
  });
}

// --- draait IN de Bouwflow-pagina (MAIN world) --------------------------
async function setPhaseInPage(projectNumber, phaseId) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Ingelogd? De loginpagina heeft geen projectentabel.
  if (/\/app\/login/.test(location.pathname)) {
    return { ok: false, needsLogin: true, error: 'Niet ingelogd in Bouwflow' };
  }

  // Wacht tot de gefilterde tabel er staat.
  let phaseSelect = null;
  for (let i = 0; i < 40 && !phaseSelect; i++) {
    const rows = Array.from(document.querySelectorAll('tr')).filter((tr) => tr.innerText.includes(projectNumber));
    for (const row of rows) {
      const sel = Array.from(row.querySelectorAll('select')).find((s) =>
        Array.from(s.options).some((o) => o.text.trim() === 'Nieuwe Aanvraag')
      );
      if (sel) { phaseSelect = sel; break; }
    }
    if (!phaseSelect) await sleep(250);
  }

  if (!phaseSelect) {
    return { ok: false, error: `Project ${projectNumber} of de fasekolom niet gevonden op de projectenlijst` };
  }

  const target = String(phaseId);
  if (!Array.from(phaseSelect.options).some((o) => o.value === target)) {
    return { ok: false, error: `Fase ${phaseId} staat niet in de Bouwflow-keuzelijst` };
  }

  if (phaseSelect.value === target) {
    return { ok: true, alreadySet: true };
  }

  // Alpine (x-model) pikt een gewone value-toewijzing niet op: gebruik de
  // native setter en vuur input + change, net als de InvenSync-robot.
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  nativeSetter.call(phaseSelect, target);
  phaseSelect.dispatchEvent(new Event('input', { bubbles: true }));
  phaseSelect.dispatchEvent(new Event('change', { bubbles: true }));

  // Geef Livewire tijd om de wijziging te posten.
  await sleep(2500);

  return { ok: true, selectedValue: phaseSelect.value };
}
