/**
 * modal.js
 *
 * Reusable modal dialog for game-over, confirm, combat reports, etc.
 */

import { state } from '../engine/game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';

const overlayEl  = document.getElementById('modal-overlay');
const titleEl    = document.getElementById('modal-title');
const bodyEl     = document.getElementById('modal-body');
const buttonsEl  = document.getElementById('modal-buttons');

/**
 * Show a modal dialog.
 * @param {string} title
 * @param {string|Node} body
 * @param {Array<{label:string, primary?:boolean, danger?:boolean, keepOpen?:boolean, onClick:Function}>} buttons
 */
export function showModal(title, body, buttons = []) {
  titleEl.textContent = title;
  bodyEl.innerHTML = '';
  if (body instanceof Node) {
    bodyEl.appendChild(body);
  } else {
    bodyEl.textContent = body;
  }
  buttonsEl.innerHTML = '';

  for (const btn of buttons) {
    const el = document.createElement('button');
    el.className = btn.danger ? 'btn-danger' : 'btn-primary';
    el.textContent = btn.label;
    el.addEventListener('click', () => {
      if (!btn.keepOpen) overlayEl.hidden = true;
      if (btn.onClick) btn.onClick();
    });
    buttonsEl.appendChild(el);
  }

  overlayEl.hidden = false;
}

/**
 * Show a confirmation modal.
 * @param {string} title
 * @param {string} body
 * @param {Function} onConfirm
 * @param {Function} [onCancel]
 */
export function confirmModal(title, body, onConfirm, onCancel) {
  showModal(title, body, [
    { label: 'Confirm', primary: true, onClick: onConfirm },
    { label: 'Cancel', danger: false, onClick: onCancel ?? (() => {}) },
  ]);
}

/** Hide the modal. */
export function hideModal() {
  overlayEl.hidden = true;
}

// Close on overlay click (outside box)
overlayEl.addEventListener('click', e => {
  if (e.target === overlayEl) hideModal();
});

/**
 * Show a combat report modal for a given reportId.
 * @param {string} reportId
 */
export function showCombatReportModal(reportId) {
  const report = state.combatReports.find(r => r.reportId === reportId);
  if (!report) return;

  const attFaction = FACTION_MAP[report.attackerFactionId];
  const defFaction = FACTION_MAP[report.defenderFactionId];
  const attName    = attFaction?.name ?? report.attackerFactionId;
  const defName    = defFaction?.name ?? report.defenderFactionId;

  const outcomeLabel = {
    decisive_attacker: '⚔ Decisive Attacker Victory',
    attacker:          '⚔ Attacker Victory',
    defender:          '🛡 Defender Victory',
    inconclusive:      '⚖ Inconclusive Battle',
  }[report.outcome] ?? report.outcome;

  const outcomeColor = report.outcome === 'defender'
    ? '#5090a0'
    : report.outcome === 'inconclusive'
      ? '#c8a030'
      : '#c06040';

  const body = document.createElement('div');
  body.className = 'combat-report-body';

  body.innerHTML = `
    <div class="cr-header">
      <span class="cr-province">${report.provinceName}</span>
      <span class="cr-turn">Turn ${report.turn}</span>
    </div>
    <div class="cr-outcome" style="color:${outcomeColor}">${outcomeLabel}</div>
    <div class="cr-strengths">
      <span>⚔ ${attName}: <strong>${report.attackerStrength}</strong></span>
      <span>🛡 ${defName}: <strong>${report.defenderStrength}</strong></span>
    </div>
    ${report.terrainBonus > 0 ? `<div class="cr-terrain">🏔 Terrain defense bonus: +${report.terrainBonus}%</div>` : ''}
    <hr class="cr-divider">
    <div class="cr-rounds-title">Battle Narrative</div>
    <ol class="cr-rounds">
      ${(report.rounds ?? []).map(r => `<li>${r.text}</li>`).join('')}
    </ol>
    <hr class="cr-divider">
    <div class="cr-losses">
      <span>📉 ${attName} losses: <strong>${report.attLostTotal ?? '?'}</strong></span>
      <span>📉 ${defName} losses: <strong>${report.defLostTotal ?? '?'}</strong></span>
    </div>
  `;

  showModal(`⚔ Battle Report — ${report.provinceName}`, body, [
    { label: 'Close' },
  ]);
}
