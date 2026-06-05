/**
 * hotkeys.js
 *
 * Global keyboard shortcuts.
 *
 * ESC  — close province modal if open; else cancel army move mode
 * m    — enter move mode for the currently selected army
 */

import { state, startArmyMove } from '../engine/game-state.js';
import { renderAllProvinces, showReachableProvinces, cancelArmyMoveAndClear } from './map-view.js';
import { isModalOpen, hideProvinceModal } from './province-modal.js';
import { handleEndTurn } from './end-turn-btn.js';

export function initHotkeys() {
  document.addEventListener('keydown', (e) => {
    // Never fire when typing in an input or textarea
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    switch (e.key) {
      case 'Escape':
        if (isModalOpen()) {
          hideProvinceModal();
        } else if (state.movingArmyId) {
          cancelArmyMoveAndClear();
        }
        break;

      case 'm':
      case 'M':
        if (!isModalOpen() && state.selectedArmyId) {
          const army = state.armies.get(state.selectedArmyId);
          if (army && army.factionId === state.playerFactionId) {
            startArmyMove(state.selectedArmyId);
            showReachableProvinces(state.selectedArmyId);
          }
        }
        break;

      case 'e':
      case 'E':
      case ' ':
        if (!isModalOpen() && state.phase === 'player') {
          e.preventDefault();
          handleEndTurn();
        }
        break;
    }
  });
}
