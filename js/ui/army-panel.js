/**
 * army-panel.js
 *
 * Renders the left panel with the player's armies.
 * Handles army selection, movement, split.
 */

import { state, getProvince, getArmiesByFaction, selectArmy, startArmyMove,
         cancelArmyMove, splitArmy, getArmySupplyCap } from '../engine/game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { UNIT_MAP } from '../data/units-data.js';
import { armySize, armyWoundedCount, armyAttackStrength, armyDefenseStrength } from '../models/army.js';
import { showReachableProvinces, renderArmyIcons, renderAllProvinces } from './map-view.js';
import { showModal, hideModal } from './modal.js';

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

    // ── Stats row: ATK / DEF / Supply ───────────────────────
    const healthy  = armySize(army);
    const wounded  = armyWoundedCount(army);
    const cap      = getArmySupplyCap(army.factionId);
    const atk      = Math.round(armyAttackStrength(army, UNIT_MAP));
    const def      = Math.round(armyDefenseStrength(army, UNIT_MAP));
    const supplyUsed = healthy + wounded;

    const statsRow = document.createElement('div');
    statsRow.className = 'army-stats-row';
    statsRow.innerHTML =
      `<span title="Attack strength">⚔ ${atk}</span>` +
      `<span title="Defense strength">🛡 ${def}</span>` +
      `<span title="Supply: units / cap" class="${supplyUsed >= cap ? 'supply-full' : ''}">📦 ${supplyUsed}/${cap}</span>`;
    card.appendChild(statsRow);

    // ── HP bar (green = healthy, orange = wounded) ───────────
    const total = healthy + wounded;
    if (total > 0) {
      const healthyPct = Math.round((healthy / cap) * 100);
      const woundedPct = Math.round((wounded / cap) * 100);

      const hpWrap = document.createElement('div');
      hpWrap.className = 'army-hp-wrap';
      hpWrap.title = `Healthy: ${healthy}  Wounded: ${wounded}  Cap: ${cap}`;

      const hpBar = document.createElement('div');
      hpBar.className = 'army-hp-bar';

      const healthySeg = document.createElement('div');
      healthySeg.className = 'army-hp-healthy';
      healthySeg.style.width = `${healthyPct}%`;

      const woundedSeg = document.createElement('div');
      woundedSeg.className = 'army-hp-wounded';
      woundedSeg.style.width = `${woundedPct}%`;

      hpBar.appendChild(healthySeg);
      hpBar.appendChild(woundedSeg);
      hpWrap.appendChild(hpBar);
      card.appendChild(hpWrap);
    }

    // ── Move button ──────────────────────────────────────────
    if (army.movesLeft > 0) {
      const moveBtn = document.createElement('button');
      moveBtn.className = 'btn-secondary army-move-btn';
      moveBtn.textContent = state.movingArmyId === army.id
        ? '✕ Cancel Move'
        : `Move (${army.movesLeft} move left)`;

      moveBtn.addEventListener('click', e => {
        e.stopPropagation();
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

    // ── Split button ─────────────────────────────────────────
    const canSplit = army.units.length >= 2 ||
                     (army.units.length === 1 && army.units[0].count >= 2);
    if (canSplit) {
      const splitBtn = document.createElement('button');
      splitBtn.className = 'btn-secondary army-move-btn';
      splitBtn.style.marginTop = '4px';
      splitBtn.textContent = '✂ Split Army';
      splitBtn.addEventListener('click', e => {
        e.stopPropagation();
        showSplitModal(army);
      });
      card.appendChild(splitBtn);
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

// ── Split Army Modal ─────────────────────────────────────────

function showSplitModal(army) {
  const cap = getArmySupplyCap(army.factionId);
  const body = document.createElement('div');
  body.style.cssText = 'text-align:left;';

  const intro = document.createElement('p');
  intro.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:10px;';
  intro.textContent = 'Select how many units to split off into a new army. Both armies must have at least 1 unit.';
  body.appendChild(intro);

  const inputs = [];

  for (const { typeId, count } of army.units) {
    const uDef = UNIT_MAP[typeId];
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';

    const label = document.createElement('span');
    label.style.cssText = 'flex:1;font-size:12px;';
    label.textContent = `${uDef?.emoji ?? '⚔'} ${uDef?.name ?? typeId} (×${count})`;

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(count);
    input.value = '0';
    input.style.cssText = 'width:56px;background:var(--bg-dark);border:1px solid var(--border);color:var(--text-bright);border-radius:4px;padding:3px 6px;font-size:13px;';

    row.appendChild(label);
    row.appendChild(input);
    body.appendChild(row);
    inputs.push({ typeId, input, maxCount: count });
  }

  const errorEl = document.createElement('p');
  errorEl.style.cssText = 'font-size:11px;color:var(--danger);min-height:16px;margin-top:4px;';
  body.appendChild(errorEl);

  showModal('✂ Split Army', body, [
    {
      label: 'Split',
      primary: true,
      keepOpen: true,
      onClick: () => {
        const splitUnits = inputs
          .map(({ typeId, input }) => ({ typeId, count: parseInt(input.value, 10) || 0 }))
          .filter(u => u.count > 0);

        const totalSplit = splitUnits.reduce((s, u) => s + u.count, 0);
        const totalArmy  = armySize(army);

        if (totalSplit < 1) { errorEl.textContent = 'Select at least 1 unit to split off.'; return; }
        if (totalSplit >= totalArmy) { errorEl.textContent = 'Original army must keep at least 1 unit.'; return; }

        for (const { typeId, input, maxCount } of inputs) {
          const v = parseInt(input.value, 10) || 0;
          if (v > maxCount) { errorEl.textContent = `Cannot split more ${typeId} than available.`; return; }
        }

        const newArmy = splitArmy(army.id, splitUnits);
        if (!newArmy) { errorEl.textContent = 'Split failed — check counts.'; return; }

        hideModal();
        renderArmyPanel();
        renderArmyIcons();
      },
    },
    { label: 'Cancel' },
  ]);
}
