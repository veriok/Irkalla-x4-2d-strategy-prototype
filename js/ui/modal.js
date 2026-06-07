/**
 * modal.js
 *
 * Reusable modal dialog for game-over, confirm, combat reports, etc.
 */

import { state } from '../engine/game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { MONSTER_UNITS } from '../data/monsters-data.js';
import { createCard } from './card-renderer.js';
import { UNIT_MAP } from '../data/units-data.js';

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
 * Show a den assault report modal directly from a resolveMonsterDenCombat result.
 * @param {Object} result — return value of resolveMonsterDenCombat
 */
export function showDenCombatReportModal(result) {
  const { outcome, rounds, treasure, armyCasualties, armyWounded, enemyCasualties,
          startEnemyCount, monsterUnitId, provinceName, factionId, turn } = result;

  const monDef     = MONSTER_UNITS[monsterUnitId] ?? { name: monsterUnitId, emoji: '👹' };
  const factionDef = FACTION_MAP[factionId];
  const attName    = factionDef?.name ?? factionId;

  const won = outcome === 'attacker';

  const outcomeLabel = won ? '🏆 Den Cleared!' : '💀 Repelled!';
  const outcomeColor = won ? '#4caf50' : '#c06040';

  const treasureLabels = { gold: '💰 Gold', research: '📚 Ancient Scrolls' };
  const treasureHtml = (won && treasure)
    ? `<div class="cr-treasure">Treasure found: <strong>${
        Object.entries(treasure)
          .map(([r, a]) => `+${a} ${treasureLabels[r] ?? r}`)
          .join(', ')
      }</strong></div>`
    : won ? '<div class="cr-terrain">No treasure found.</div>'
    : '';

  const body = document.createElement('div');
  body.className = 'combat-report-body';

  body.innerHTML = `
    <div class="cr-header">
      <span class="cr-province">${provinceName}</span>
      <span class="cr-turn">Turn ${turn}</span>
    </div>
    <div class="cr-outcome" style="color:${outcomeColor}">${outcomeLabel}</div>
    <div class="cr-strengths">
      <span>⚔ ${attName}</span>
      <span>👹 ${startEnemyCount}× ${monDef.emoji} ${monDef.name}</span>
    </div>
    <hr class="cr-divider">
    <div class="cr-rounds-title">Assault Narrative</div>
    <ol class="cr-rounds">
      ${rounds.map(r => `<li>${r}</li>`).join('')}
    </ol>
    <hr class="cr-divider">
    <div class="cr-losses">
      <span>📉 ${attName}: <strong>${armyCasualties}</strong> lost, <strong>${armyWounded}</strong> wounded</span>
      <span>💀 Enemies slain: <strong>${enemyCasualties}</strong> / ${startEnemyCount}</span>
    </div>
    ${treasureHtml}
  `;

  showModal(`👹 Den Assault — ${provinceName}`, body, [
    { label: 'Close' },
  ]);
}

function _buildCasualtiesSide(label, unitCards, factionId) {
  const side = document.createElement('div');
  side.className = 'cr-casualties-side';

  const lbl = document.createElement('div');
  lbl.className = 'cr-casualties-label';
  lbl.textContent = label;
  side.appendChild(lbl);

  if (!unitCards || unitCards.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'cr-casualties-empty';
    empty.textContent = '—';
    side.appendChild(empty);
    return side;
  }

  const grid = document.createElement('div');
  grid.className = 'cr-casualties-grid';

  const factionDef = FACTION_MAP[factionId];
  const bgSrc = factionDef?.unitCardBgImg ?? null;

  for (const { typeId, status } of unitCards) {
    const unitDef = UNIT_MAP[typeId];
    const card = createCard({
      variant: 'unit',
      wounded: status === 'wounded',
      backgroundSrc: bgSrc,
      foregroundSrc: unitDef?.cardSpriteImg ?? null,
      fallbackIcon: unitDef?.emoji ?? '⚔',
      fallbackName: unitDef?.name ?? typeId,
    });

    const statusLabel = status === 'wounded' ? ' · Wounded' : status === 'killed' ? ' · Killed' : '';
    if (unitDef?.name) card.title = unitDef.name + statusLabel;

    if (status === 'killed') {
      card.classList.add('game-card--killed');
      const overlay = document.createElement('div');
      overlay.className = 'cr-card-overlay cr-card-overlay--killed';
      overlay.textContent = '❌';
      card.appendChild(overlay);
    } else if (status === 'wounded') {
      const overlay = document.createElement('div');
      overlay.className = 'cr-card-overlay cr-card-overlay--wounded';
      overlay.textContent = '🩸';
      card.appendChild(overlay);
    }
    grid.appendChild(card);
  }

  side.appendChild(grid);
  return side;
}

/**
 * Show a combat report modal for a given reportId.
 * @param {string} reportId
 */
export function showCombatReportModal(reportId) {
  const report = state.combatReports.find(r => r.reportId === reportId);
  if (!report) return;
  if (report.isDen) { showDenCombatReportModal(report); return; }

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
    ${report.defenseBonus > 0 ? `<div class="cr-terrain">🛡 Defender defense bonus: +${report.defenseBonus}%</div>` : ''}
    <hr class="cr-divider">
    <div class="cr-rounds-title">Battle Narrative</div>
    <ol class="cr-rounds">
      ${(report.rounds ?? []).map(r => `<li>${r.text}</li>`).join('')}
    </ol>
    <hr class="cr-divider">
  `;

  if (report.attUnitCards || report.defUnitCards) {
    const casualties = document.createElement('div');
    casualties.className = 'cr-casualties';
    const defCards = [...(report.defUnitCards ?? []), ...(report.militiaCards ?? [])];
    casualties.appendChild(_buildCasualtiesSide(attName, report.attUnitCards ?? [], report.attackerFactionId));
    casualties.appendChild(_buildCasualtiesSide(defName, defCards, report.defenderFactionId));
    body.appendChild(casualties);
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'cr-losses';
    fallback.innerHTML = `
      <span>📉 ${attName} losses: <strong>${report.attLostTotal ?? '?'}</strong></span>
      <span>📉 ${defName} losses: <strong>${report.defLostTotal ?? '?'}</strong></span>
    `;
    body.appendChild(fallback);
  }

  if (report.attHeroXp || report.defHeroXp) {
    const hr = document.createElement('hr');
    hr.className = 'cr-divider';
    body.appendChild(hr);
    const heroXp = document.createElement('div');
    heroXp.className = 'cr-hero-xp';
    heroXp.innerHTML = `
      ${report.attHeroXp ? `<span>🦸 ${report.attHeroName}: <strong>+${report.attHeroXp} XP</strong></span>` : ''}
      ${report.defHeroXp ? `<span class="cr-hero-xp__def">🦸 ${report.defHeroName}: <strong>+${report.defHeroXp} XP</strong></span>` : ''}
    `;
    body.appendChild(heroXp);
  }

  showModal(`⚔ Battle Report — ${report.provinceName}`, body, [
    { label: 'Close' },
  ]);
}
