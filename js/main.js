/**
 * main.js — Entry point
 *
 * Startup sequence:
 *   1. Generate map (Voronoi, inject SVG paths)
 *   2. Initialise game world (game-state)
 *   3. Update fog of war
 *   4. Render map, resource bar, army panel
 *   5. Wire up UI callbacks
 *   6. Log turn 1
 */

import { generateMap } from './engine/map-generator.js';
import { initWorld, state } from './engine/game-state.js';
import { updateFogOfWar } from './engine/fog-of-war.js';
import { renderAllProvinces, renderArmyIcons, initMapEvents,
         registerMapCallbacks } from './ui/map-view.js';
import { renderResourceBar }   from './ui/resource-bar.js';
import { renderArmyPanel, registerArmyPanelCallbacks } from './ui/army-panel.js';
import { showProvincePanel, hideProvincePanel } from './ui/province-panel.js';
import { initEndTurnButton }   from './ui/end-turn-btn.js';
import { logTurn, logMessage } from './ui/event-log.js';
import { FACTIONS, FACTION_MAP } from './data/factions-data.js';

// ─── Config ───────────────────────────────────────────────
const MAP_SEED = 42;   // fixed seed → deterministic map

// ─── Faction picker ───────────────────────────────────────

function buildFactionPickerEl(onPick) {
  const grid = document.createElement('div');
  grid.className = 'faction-picker';

  for (const f of FACTIONS) {
    const card = document.createElement('div');
    card.className = 'faction-card';
    card.style.setProperty('--fc', f.color);
    card.innerHTML = `
      <span class="faction-card-emoji">${f.emoji}</span>
      <div class="faction-card-name">${f.name}</div>
      <div class="faction-card-full">${f.fullName}</div>
      <div class="faction-card-desc">${f.description}</div>
      <div class="faction-card-play">📖 ${f.playstyle}</div>
    `;
    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.textContent = `Play as ${f.name}`;
    btn.addEventListener('click', () => onPick(f.id));
    card.appendChild(btn);
    grid.appendChild(card);
  }
  return grid;
}

function showFactionPicker() {
  return new Promise(resolve => {
    const overlay   = document.getElementById('modal-overlay');
    const titleEl   = document.getElementById('modal-title');
    const bodyEl    = document.getElementById('modal-body');
    const buttonsEl = document.getElementById('modal-buttons');
    const boxEl     = document.getElementById('modal-box');

    titleEl.textContent = 'Choose Your Faction';
    bodyEl.innerHTML    = '';
    buttonsEl.innerHTML = '';
    boxEl.classList.add('modal-wide');

    bodyEl.appendChild(buildFactionPickerEl(factionId => {
      overlay.hidden = true;
      boxEl.classList.remove('modal-wide');
      resolve(factionId);
    }));

    overlay.hidden = false;
  });
}

// ─── Startup ──────────────────────────────────────────────
async function init() {
  const svgEl = document.getElementById('map');

  // 1. Generate Voronoi map + inject SVG paths
  let provinceData;
  try {
    provinceData = generateMap(MAP_SEED, svgEl);
  } catch (err) {
    console.error('Map generation failed:', err);
    document.body.innerHTML = `<div style="color:#f00;padding:2rem">
      Map generation failed — check console.<br><pre>${err.message}</pre>
    </div>`;
    return;
  }

  // 2. Show faction picker — wait for choice
  const playerFaction = await showFactionPicker();

  // 3. Initialise game state
  initWorld(provinceData, playerFaction);

  // 4. Fog of war
  updateFogOfWar();

  // 5. Render map
  renderAllProvinces();
  renderArmyIcons();

  // 6. Resource bar
  renderResourceBar();

  // 7. Army panel
  renderArmyPanel();

  // 8. Map event callbacks
  registerMapCallbacks({
    onProvinceSelect: (provinceId) => {
      showProvincePanel(provinceId);
      renderArmyPanel();
    },
    onArmySelect: () => { renderArmyPanel(); },
  });
  initMapEvents();

  registerArmyPanelCallbacks({
    onArmySelect: () => { renderArmyIcons(); },
  });

  // 9. End Turn button
  initEndTurnButton();

  // 10. Hook end-turn completion to refresh UI panels
  patchEndTurnCallback();

  // 11. Initial log entry
  logTurn(1);
  const chosen = FACTION_MAP[playerFaction];
  logMessage(`Welcome to Irkallia. You lead ${chosen?.name ?? playerFaction}. Good luck.`);
}

/**
 * Wrap the end-turn button's onComplete to also refresh army panel + province panel.
 * (end-turn-btn.js handles map/resource/fog already; this catches the UI panel refreshes)
 */
function patchEndTurnCallback() {
  // Observe turn number changes by polling state after each turn
  // (simple approach — no event bus needed for prototype)
  let lastTurn = state.turn;
  const observer = setInterval(() => {
    if (state.turn !== lastTurn) {
      lastTurn = state.turn;
      renderArmyPanel();
      renderResourceBar();
      // Refresh province panel if a province is selected
      if (state.selectedProvinceId) {
        showProvincePanel(state.selectedProvinceId);
      }
    }
  }, 200);
}

// ─── Boot ─────────────────────────────────────────────────
init().catch(err => {
  console.error('Startup error:', err);
});
