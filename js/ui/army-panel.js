/**
 * army-panel.js
 *
 * Renders the left panel with the player's armies.
 * Handles army selection and initiating movement.
 */

import { state, getProvince, getArmiesByFaction, selectArmy, startArmyMove,
         cancelArmyMove } from '../engine/game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { UNIT_MAP } from '../data/units-data.js';
import { armySize } from '../models/army.js';
import { showReachableProvinces, renderArmyIcons, renderAllProvinces } from './map-view.js';

const armyListEl = document.getElementById('army-list');

let _onArmySelect = null;

export function registerArmyPanelCallbacks({ onArmySelect }) {
  _onArmySelect = onArmySelect;
}

/**
 * Re-render the army list panel.
 */
export function renderArmyPanel() {
  armyListEl.innerHTML = '';

  const playerFactionId = state.playerFactionId;
  const armies          = getArmiesByFaction(playerFactionId);

  if (armies.length === 0) {
    armyListEl.innerHTML = '<p style="color:var(--text-muted);font-size:12px;font-style:italic">No armies.</p>';
    return;
  }

  for (const army of armies) {
    const prov    = getProvince(army.provinceId);
    const faction = FACTION_MAP[army.factionId];
    const isSelected = state.selectedArmyId === army.id;

    const card = document.createElement('div');
    card.className = `army-card${isSelected ? ' selected' : ''}`;

    // Header
    const header = document.createElement('div');
    header.className = 'army-card-header';
    header.innerHTML = `
      <span class="army-faction-icon">${faction?.emoji ?? '⚔'}</span>
      <span style="font-weight:600;font-size:13px;color:var(--text-bright)">Army</span>
      <span class="army-location">${prov?.name ?? army.provinceId}</span>
    `;
    card.appendChild(header);

    // Unit chips
    const unitsEl = document.createElement('div');
    unitsEl.className = 'army-units';
    for (const { typeId, count } of army.units) {
      const uDef = UNIT_MAP[typeId];
      const chip = document.createElement('span');
      chip.className = 'unit-chip';
      chip.textContent = `${uDef?.emoji ?? '⚔'} ${uDef?.name ?? typeId} ×${count}`;
      chip.title = uDef?.description ?? '';
      unitsEl.appendChild(chip);
    }
    card.appendChild(unitsEl);

    // Move button
    if (army.movesLeft > 0) {
      const moveBtn = document.createElement('button');
      moveBtn.className = 'btn-secondary army-move-btn';
      moveBtn.textContent = state.movingArmyId === army.id
        ? '✕ Cancel Move'
        : `Move (${army.movesLeft} move left)`;

      moveBtn.addEventListener('click', () => {
        if (state.movingArmyId === army.id) {
          cancelArmyMove();
          renderArmyPanel();
          renderAllProvinces();
        } else {
          selectArmy(army.id);
          startArmyMove(army.id);
          renderArmyPanel();
          showReachableProvinces(army.id);
          renderAllProvinces();
        }
      });
      card.appendChild(moveBtn);
    } else {
      const exhaustedEl = document.createElement('p');
      exhaustedEl.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:4px;font-style:italic';
      exhaustedEl.textContent = 'No moves remaining.';
      card.appendChild(exhaustedEl);
    }

    // Click card to select
    card.addEventListener('click', () => {
      selectArmy(army.id);
      renderArmyPanel();
      renderArmyIcons();
      if (_onArmySelect) _onArmySelect(army.id);
    });

    armyListEl.appendChild(card);
  }
}
