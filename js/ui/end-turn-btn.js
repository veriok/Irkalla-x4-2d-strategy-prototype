/**
 * end-turn-btn.js
 *
 * Manages the End Turn button state and triggers the turn-engine cycle.
 */

import { state } from '../engine/game-state.js';
import { endTurn } from '../engine/turn-engine.js';
import { updateFogOfWar } from '../engine/fog-of-war.js';
import { renderAllProvinces, renderArmyIcons } from './map-view.js';
import { renderResourceBar } from './resource-bar.js';
import { showModal } from './modal.js';
import { FACTION_MAP } from '../data/factions-data.js';

const btn     = document.getElementById('end-turn-btn');
const topBar  = document.getElementById('top-bar');

export function initEndTurnButton() {
  btn.addEventListener('click', handleEndTurn);
}

async function handleEndTurn() {
  if (state.phase !== 'player') return;
  state.phase = 'ai';

  // Disable button + show spinner
  btn.disabled     = true;
  btn.innerHTML    = '<span class="spinner">⏳</span> AI thinking…';

  // Small delay so the UI updates before blocking work
  await new Promise(r => setTimeout(r, 30));

  await endTurn(() => {
    // All AI phases done — restore player turn
    state.phase = 'player';

    updateFogOfWar();
    renderAllProvinces();
    renderArmyIcons();
    renderResourceBar(/* TODO: pass income deltas */);

    // Turn flash on top bar
    topBar.classList.remove('turn-flash');
    void topBar.offsetWidth;
    topBar.classList.add('turn-flash');
    setTimeout(() => topBar.classList.remove('turn-flash'), 700);

    // Re-enable button
    btn.disabled  = false;
    btn.innerHTML = 'End Turn ⏭';

    // Check for win/loss
    const playerEliminated = state.eliminated.has(state.playerFactionId);
    if (state.winner || playerEliminated) {
      const isPlayer = state.winner === state.playerFactionId;
      const winner   = state.winner ? FACTION_MAP[state.winner] : null;
      btn.disabled = true;
      showModal(
        (isPlayer || !playerEliminated) ? '🏆 Victory!' : '💀 Defeat',
        isPlayer
          ? `${winner?.name ?? state.winner} has conquered Irkallia!`
          : playerEliminated
            ? winner
              ? `${winner.name} has conquered Irkallia. Your faction has fallen.`
              : `Your last capital has fallen. The war wages on without you.`
            : `${winner?.name ?? state.winner} has conquered Irkallia. Your faction has fallen.`,
        [{ label: 'New Game', onClick: () => location.reload() }]
      );
    }
  });
}

/** Disable the end-turn button externally (e.g., during army movement). */
export function setEndTurnEnabled(enabled) {
  if (!enabled && state.phase === 'player') {
    btn.disabled = true;
  } else if (state.phase === 'player') {
    btn.disabled = false;
  }
}
