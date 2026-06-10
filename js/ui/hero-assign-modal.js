/**
 * hero-assign-modal.js
 *
 * Small overlay modal for selecting a hero to assign to an army or province.
 * Opens when clicking the empty (or filled) hero slot in army-panel or province-modal.
 */

import { state, getFaction } from '../engine/game-state.js';
import { isHeroActive, assignHeroToArmy, assignHeroToProvince, unassignHero } from '../engine/hero-engine.js';
import { HERO_CLASS_MAP } from '../data/hero-classes-data.js';
import { heroGenderEmoji } from '../models/hero.js';
import { renderArmyPanel } from './army-panel.js';

let _overlay = null;
let _onAssigned = null;   // callback after assignment confirmed

function _getOrCreateOverlay() {
  if (_overlay) return _overlay;
  _overlay = document.getElementById('hero-assign-modal-overlay');
  return _overlay;
}

/**
 * Open the hero assignment selector.
 * @param {Object} opts
 *   targetType: 'army' | 'province'
 *   targetId:   army or province id
 *   onAssigned: callback() called after successful assignment
 */
export function openHeroAssignModal({ targetType, targetId, onAssigned }) {
  _onAssigned = onAssigned ?? null;
  const overlay = _getOrCreateOverlay();
  if (!overlay) return;

  const factionId = state.playerFactionId;
  const fs = getFaction(factionId);
  if (!fs) return;

  const box = overlay.querySelector('#ham-box');
  box.innerHTML = '';

  // Title
  const title = document.createElement('div');
  title.className = 'ham-title';
  title.textContent = targetType === 'army' ? 'Assign hero to army' : 'Assign governor to province';
  box.appendChild(title);

  if (fs.heroes.length === 0) {
    box.innerHTML += '<p style="color:var(--text-muted);padding:12px;font-style:italic">No heroes available. Recruit heroes from the Hero panel.</p>';
  } else {
    const list = document.createElement('div');
    list.className = 'ham-hero-list';

    for (const hero of fs.heroes) {
      const classDef = HERO_CLASS_MAP[hero.classId];
      const isWounded = hero.woundedFor > 0;
      const isTransit = hero.assignment && hero.assignment.transitFor > 0;
      const isSameTarget = hero.assignment?.id === targetId;
      const genderEmoji = heroGenderEmoji(hero);

      let statusText = '';
      let statusClass = '';
      if (isWounded) { statusText = `Wounded (${hero.woundedFor} turns)`; statusClass = 'ham-status--wounded'; }
      else if (isTransit) { statusText = `In transit (${hero.assignment.transitFor} turns)`; statusClass = 'ham-status--transit'; }
      else if (hero.assignment) {
        const assignTypeLabel = hero.assignment.type === 'army' ? 'Leading army' : 'Governing province';
        statusText = assignTypeLabel;
        statusClass = 'ham-status--assigned';
      } else {
        statusText = 'Available';
        statusClass = 'ham-status--available';
      }

      const isDisabled = isWounded || isSameTarget;
      const row = document.createElement('div');
      row.className = `ham-hero-row${isDisabled ? ' ham-hero-row--disabled' : ''}`;
      row.innerHTML = `
        <div class="ham-hero-info">
          <span class="ham-hero-name">${hero.name} ${genderEmoji}</span>
          <span class="ham-hero-class">${classDef?.name ?? hero.classId}</span>
          <span class="ham-hero-level">Lv.${hero.level}</span>
        </div>
        <div class="ham-status ${statusClass}">${statusText}</div>
        ${isSameTarget ? '<div class="ham-current-badge">Current</div>' : ''}
      `;

      if (!isDisabled) {
        row.addEventListener('click', () => {
          if (targetType === 'army') {
            assignHeroToArmy(hero.id, targetId, factionId);
          } else {
            assignHeroToProvince(hero.id, targetId, factionId);
          }
          closeHeroAssignModal();
          if (_onAssigned) _onAssigned();
          renderArmyPanel();
        });
      }

      list.appendChild(row);
    }

    // "None" option if current target has a hero
    const hasHero = targetType === 'army'
      ? !!state.armies.get(targetId)?.heroId
      : !!state.provinces.get(targetId)?.governorId;

    if (hasHero) {
      const noneRow = document.createElement('div');
      noneRow.className = 'ham-hero-row ham-none-row';
      noneRow.innerHTML = `<div class="ham-hero-info"><span class="ham-hero-name">— Remove hero</span></div>`;
      noneRow.addEventListener('click', () => {
        // Find which hero is assigned
        for (const hero of fs.heroes) {
          if (hero.assignment?.id === targetId) {
            unassignHero(hero.id, factionId);
            break;
          }
        }
        closeHeroAssignModal();
        if (_onAssigned) _onAssigned();
        renderArmyPanel();
      });
      list.appendChild(noneRow);
    }

    box.appendChild(list);
  }

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-secondary ham-close-btn';
  closeBtn.textContent = '✕ Cancel';
  closeBtn.addEventListener('click', closeHeroAssignModal);
  box.appendChild(closeBtn);

  overlay.removeAttribute('hidden');
}

export function closeHeroAssignModal() {
  const overlay = _getOrCreateOverlay();
  if (overlay) overlay.setAttribute('hidden', '');
}

/** Initialise click-outside-to-close behaviour */
export function initHeroAssignModal() {
  const overlay = document.getElementById('hero-assign-modal-overlay');
  if (!overlay) return;
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeHeroAssignModal();
  });
}
