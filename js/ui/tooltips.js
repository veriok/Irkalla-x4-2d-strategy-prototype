/**
 * tooltips.js
 *
 * Building tooltip system.
 * Shows a floating info card with building stats when hovering over a building card.
 * All keyword/bonus rendering is derived from the building definition data.
 */

import { FACTIONS } from '../data/factions-data.js';
import { createNativePreviewCard } from './card-renderer.js';

// Build a flat map of all resource definitions for emoji / name lookups
const ALL_RES = {};
for (const f of FACTIONS) {
  ALL_RES[f.resources.basic.id] = f.resources.basic;
  for (const r of f.resources.advanced) ALL_RES[r.id] = r;
}

const tooltipEl = document.getElementById('building-tooltip');
const unitTooltipEl = document.getElementById('unit-tooltip');

let _hideTimer = null;

export function showBuildingTooltip(bDef, anchorEl) {
  if (!tooltipEl || !bDef) return;

  clearTimeout(_hideTimer);
  tooltipEl.innerHTML = _buildHtml(bDef);
  tooltipEl.hidden = false;

  // Position after layout so offsetHeight is accurate
  requestAnimationFrame(() => {
    const rect = anchorEl.getBoundingClientRect();
    const tw   = 220;
    const th   = tooltipEl.offsetHeight;

    let left = rect.right + 8;
    let top  = rect.top;

    if (left + tw > window.innerWidth  - 8) left = rect.left - tw - 8;
    if (top  + th > window.innerHeight - 8) top  = window.innerHeight - th - 8;
    top = Math.max(8, top);

    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top  = `${top}px`;
    tooltipEl.classList.add('visible');
  });
}

export function hideBuildingTooltip() {
  if (!tooltipEl) return;
  tooltipEl.classList.remove('visible');
  // Short delay so moving between adjacent elements doesn't flicker
  _hideTimer = setTimeout(() => { tooltipEl.hidden = true; }, 80);
}

export function showUnitTooltip(uDef, factionDef, anchorEl) {
  if (!unitTooltipEl || !uDef || !anchorEl) return;

  clearTimeout(_hideTimer);
  unitTooltipEl.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'unit-tooltip__title';
  title.textContent = uDef.name ?? 'Unknown Unit';
  unitTooltipEl.appendChild(title);

  const preview = createNativePreviewCard({
    backgroundSrc: factionDef?.unitCardBgImg ?? null,
    foregroundSrc: uDef.cardSpriteImg ?? null,
    fallbackIcon: uDef.emoji ?? '⚔',
    fallbackName: uDef.name ?? 'Unknown Unit',
    fallbackSub: uDef ? `⚔${uDef.attack} 🛡${uDef.defense}` : '',
  });
  unitTooltipEl.appendChild(preview);

  const stats = document.createElement('div');
  stats.className = 'unit-tooltip__stats';

  const attack = document.createElement('div');
  attack.textContent = `Attack: ${uDef.attack ?? 0}`;
  const defense = document.createElement('div');
  defense.textContent = `Defense: ${uDef.defense ?? 0}`;
  stats.appendChild(attack);
  stats.appendChild(defense);

  const special = _formatSpecial(uDef.specialEffect);
  if (special) {
    const specialLine = document.createElement('div');
    specialLine.textContent = special;
    stats.appendChild(specialLine);
  }
  unitTooltipEl.appendChild(stats);

  const flavor = document.createElement('div');
  flavor.className = 'unit-tooltip__flavor';
  flavor.textContent = uDef.description ?? '';
  unitTooltipEl.appendChild(flavor);

  unitTooltipEl.hidden = false;
  requestAnimationFrame(() => {
    const rect = anchorEl.getBoundingClientRect();
    const tw = unitTooltipEl.offsetWidth;
    const th = unitTooltipEl.offsetHeight;

    let left = rect.right + 8;
    let top = rect.top;

    if (left + tw > window.innerWidth - 8) left = rect.left - tw - 8;
    if (top + th > window.innerHeight - 8) top = window.innerHeight - th - 8;
    top = Math.max(8, top);

    unitTooltipEl.style.left = `${left}px`;
    unitTooltipEl.style.top = `${top}px`;
    unitTooltipEl.classList.add('visible');
  });
}

export function hideUnitTooltip() {
  if (!unitTooltipEl) return;
  unitTooltipEl.classList.remove('visible');
  _hideTimer = setTimeout(() => { unitTooltipEl.hidden = true; }, 80);
}

// Hide on scroll anywhere in the page
window.addEventListener('scroll', () => {
  tooltipEl?.classList.remove('visible');
  if (tooltipEl) tooltipEl.hidden = true;
  unitTooltipEl?.classList.remove('visible');
  if (unitTooltipEl) unitTooltipEl.hidden = true;
}, true);

// ─── HTML builder ─────────────────────────────────────────

function _buildHtml(bDef) {
  // Cost line(s)
  const costParts = Object.entries(bDef.cost ?? {}).map(([res, amt]) => {
    const r = ALL_RES[res];
    return `${r?.emoji ?? ''} ${amt} ${r?.name ?? res}`;
  });

  // Bonus line(s)
  const bonusParts = [];
  for (const [key, val] of Object.entries(bDef.bonuses ?? {})) {
    if (key === 'defense') {
      bonusParts.push(`+${Math.round(val * 100)}% Province Defense`);
      continue;
    }
    if (key === 'growthSlots') {
      bonusParts.push(`+${val} Building Slot${val > 1 ? 's' : ''}`);
      continue;
    }
    const r = ALL_RES[key];
    if (r) {
      bonusParts.push(`${r.emoji} +${val}/turn ${r.name}`);
    }
  }
  if ((bDef.militiaBonus ?? 0) > 0) {
    bonusParts.push(`⚔ +${bDef.militiaBonus} Militia max`);
  }

  // Prerequisites
  const prereqParts = (bDef.prerequisites ?? [])
    .filter(Boolean)
    .map(id => `<em>${id}</em>`);

  // Faction restriction
  const factionTag = bDef.factionId
    ? `<span class="btt-faction">${bDef.factionId}</span>`
    : '';

  return `
    <div class="btt-header">${bDef.emoji ?? ''} ${bDef.name ?? ''}${factionTag}</div>
    ${bDef.tier ? `<div class="btt-tier">Tier ${bDef.tier}</div>` : ''}
    <div class="btt-desc">${bDef.description ?? ''}</div>
    <hr class="btt-hr">
    <div class="btt-section">
      <div class="btt-row">⏱ ${bDef.buildTurns} turn${bDef.buildTurns !== 1 ? 's' : ''} to build</div>
      ${costParts.map(c => `<div class="btt-row btt-cost">💸 ${c}</div>`).join('')}
    </div>
    ${bonusParts.length > 0 ? `
    <div class="btt-section">
      <div class="btt-label">Bonuses</div>
      ${bonusParts.map(b => `<div class="btt-row btt-bonus">▸ ${b}</div>`).join('')}
    </div>` : ''}
    ${prereqParts.length > 0 ? `
    <div class="btt-section btt-prereq">
      <div class="btt-label">Requires</div>
      <div class="btt-row">${prereqParts.join(', ')}</div>
    </div>` : ''}
  `.trim();
}

function _formatSpecial(specialEffect) {
  if (!specialEffect) return '';
  if (specialEffect.type === 'army_attack_bonus') {
    return `Special: +${specialEffect.amount} attack to other units in this army`;
  }
  return `Special: ${specialEffect.type}`;
}
