/**
 * tooltips.js
 *
 * Building tooltip system.
 * Shows a floating info card with building stats when hovering over a building card.
 * All keyword/bonus rendering is derived from the building definition data.
 */

import { FACTIONS, FACTION_MAP } from '../data/factions-data.js';
import { BUILDING_MAP, LOCATION_MAIN_CHAIN } from '../data/buildings-data.js';
import { state } from '../engine/game-state.js';
import { TRAIT_MAP } from '../data/traits-data.js';
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

export function showBuildingTooltip(bDef, anchorEl, opts = {}) {
  if (!tooltipEl || !bDef) return;

  clearTimeout(_hideTimer);
  tooltipEl.innerHTML = _buildHtml(bDef, opts);
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

export function showUnitTooltip(uDef, factionDef, anchorEl, currentHp = null, maxHpOverride = null) {
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
  const type = document.createElement('div');
  type.textContent = `Type: ${uDef.unitType ?? 'infantry'}`;
  const hp = document.createElement('div');
  const maxHp = Math.max(1, maxHpOverride ?? uDef.maxHp ?? 10);
  const hpNow = Math.max(0, Math.min(maxHp, currentHp ?? maxHp));
  const hpPct = Math.round((hpNow / maxHp) * 100);
  const hpClass = hpPct < 30 ? 'unit-hp--low' : hpPct < 60 ? 'unit-hp--mid' : 'unit-hp--high';
  hp.innerHTML = `HP: <span class="${hpClass}">${hpNow}</span>/${maxHp}`;
  const movement = document.createElement('div');
  movement.textContent = `Movement: ${uDef.movement ?? 1}`;
  const upkeepGold = uDef.upkeepGold ?? 0;
  stats.appendChild(attack);
  stats.appendChild(defense);
  stats.appendChild(type);
  stats.appendChild(hp);
  stats.appendChild(movement);
  if (upkeepGold > 0) {
    const upkeep = document.createElement('div');
    upkeep.textContent = `Upkeep: ${upkeepGold} gold/turn`;
    stats.appendChild(upkeep);
  }
  unitTooltipEl.appendChild(stats);

  const traits = _resolveTraits(uDef.traitIds ?? []);
  if (traits.length > 0) {
    const traitWrap = document.createElement('div');
    traitWrap.className = 'unit-tooltip__stats';
    const title = document.createElement('div');
    title.textContent = 'Traits:';
    traitWrap.appendChild(title);
    for (const trait of traits) {
      const line = document.createElement('div');
      line.textContent = `- ${trait.name}: ${trait.description}`;
      traitWrap.appendChild(line);
    }
    unitTooltipEl.appendChild(traitWrap);
  }

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

/**
 * Show a tooltip for a location type.
 * @param {Object} locTypeMeta  — entry from LOCATION_TYPES
 * @param {Element} anchorEl
 */
export function showLocationTooltip(locTypeMeta, anchorEl) {
  if (!tooltipEl || !locTypeMeta) return;
  clearTimeout(_hideTimer);
  tooltipEl.innerHTML = `
    <div class="btt-header">${locTypeMeta.emoji ?? ''} ${locTypeMeta.name ?? ''}</div>
    <div class="btt-desc">${locTypeMeta.description ?? ''}</div>
  `.trim();
  tooltipEl.hidden = false;
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

export const hideLocationTooltip = hideBuildingTooltip;

/**
 * Show a tooltip for a biome — terrain defence bonus and resource modifier.
 * @param {Object} biome   — entry from BIOMES
 * @param {Element} anchorEl
 */
export function showBiomeTooltip(biome, anchorEl) {
  if (!tooltipEl || !biome) return;
  clearTimeout(_hideTimer);

  const defPct  = Math.round((biome.terrainDefBonus ?? 0) * 100);
  const resMod  = biome.resourceMod ?? 1;
  const resDiff = Math.round((resMod - 1) * 100);
  const resLine = resDiff > 0
    ? `<div class="btt-row btt-bonus">▸ +${resDiff}% income from buildings</div>`
    : resDiff < 0
      ? `<div class="btt-row btt-cost">▸ ${resDiff}% income from buildings</div>`
      : `<div class="btt-row" style="color:var(--text-muted)">▸ Normal income (×1.0)</div>`;

  tooltipEl.innerHTML = `
    <div class="btt-header">${biome.emoji ?? ''} ${biome.name ?? ''}</div>
    <div class="btt-desc">${biome.description ?? ''}</div>
    <hr class="btt-hr">
    <div class="btt-section">
      ${defPct > 0
        ? `<div class="btt-row btt-bonus">▸ +${defPct}% terrain defense</div>`
        : `<div class="btt-row" style="color:var(--text-muted)">▸ No terrain defense bonus</div>`}
      ${resLine}
    </div>
  `.trim();

  tooltipEl.hidden = false;
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

export const hideBiomeTooltip = hideBuildingTooltip;

/**
 * Show an income breakdown tooltip for a single resource.
 * @param {string}  resName   — display name e.g. "Gold"
 * @param {string}  resEmoji  — emoji
 * @param {{ label: string, amount: number }[]} sources
 * @param {number}  total
 * @param {Element} anchorEl
 */
export function showIncomeBreakdownTooltip(resName, resEmoji, sources, total, anchorEl) {
  if (!tooltipEl) return;
  clearTimeout(_hideTimer);

  const lines = sources.map(s => {
    const display = parseFloat(Number(s.amount).toFixed(2));
    return `<div class="btt-row ${s.amount >= 0 ? 'btt-bonus' : 'btt-cost'}">▸ ${s.label}: ${s.amount >= 0 ? '+' : ''}${display}</div>`;
  }).join('');

  const totalDisplay = parseFloat(Number(total).toFixed(2));
  tooltipEl.innerHTML = `
    <div class="btt-header">${resEmoji ?? ''} ${resName} Income</div>
    <div class="btt-section">${lines || '<div class="btt-row" style="color:var(--text-muted)">No sources</div>'}</div>
    <hr class="btt-hr">
    <div class="btt-row"><strong>Total: +${totalDisplay}/turn</strong></div>
  `.trim();

  tooltipEl.hidden = false;
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

export const hideIncomeBreakdownTooltip = hideBuildingTooltip;

// Hide on scroll anywhere in the page
window.addEventListener('scroll', () => {
  tooltipEl?.classList.remove('visible');
  if (tooltipEl) tooltipEl.hidden = true;
  unitTooltipEl?.classList.remove('visible');
  if (unitTooltipEl) unitTooltipEl.hidden = true;
}, true);

// ─── HTML builder ─────────────────────────────────────────

function _buildHtml(bDef, opts = {}) {
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
    if (key === 'faction_primary_adv') {
      const faction = FACTION_MAP[state?.playerFactionId];
      const advRes = faction?.resources?.advanced?.[0];
      const resName = advRes?.name ?? 'Primary Resource';
      const resEmoji = advRes?.emoji ?? '✨';
      bonusParts.push(`${resEmoji} +${val}/turn ${resName}`);
      continue;
    }
    if (key === 'faction_secondary_adv') {
      const faction = FACTION_MAP[state?.playerFactionId];
      const advRes = faction?.resources?.advanced?.[1];
      const resName = advRes?.name ?? 'Secondary Resource';
      const resEmoji = advRes?.emoji ?? '🔮';
      bonusParts.push(`${resEmoji} +${val}/turn ${resName}`);
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

  // Prerequisites (explicit ids + main-building tier gate)
  const prereqParts = (bDef.prerequisites ?? [])
    .filter(Boolean)
    .map(id => {
      const b = BUILDING_MAP[id];
      return b ? `<em>${b.emoji} ${b.name}</em>` : `<em>${id}</em>`;
    });

  if (bDef.mainBuildingTier != null) {
    const chain = LOCATION_MAIN_CHAIN[opts.locationType];
    const reqId = chain?.[bDef.mainBuildingTier - 1];
    const reqB  = reqId ? BUILDING_MAP[reqId] : null;
    prereqParts.push(reqB
      ? `<em>${reqB.emoji} ${reqB.name}</em>`
      : `<em>Main building Tier ${bDef.mainBuildingTier}</em>`
    );
  }

  // Faction restriction
  const factionTag = bDef.factionId
    ? `<span class="btt-faction">${bDef.factionId}</span>`
    : '';

  return `
    <div class="btt-header">${bDef.emoji ?? ''} ${bDef.name ?? ''}${factionTag}</div>
    ${bDef.tier ? `<div class="btt-tier">Tier ${bDef.tier}</div>` : ''}
    <div class="btt-desc">${bDef.description ?? ''}</div>
    <hr class="btt-hr">
    ${!opts.installed ? `
    <div class="btt-section">
      <div class="btt-row">⏱ ${bDef.buildTurns} turn${bDef.buildTurns !== 1 ? 's' : ''} to build</div>
      ${costParts.map(c => `<div class="btt-row btt-cost">💸 ${c}</div>`).join('')}
    </div>` : ''}
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

function _resolveTraits(traitIds) {
  return traitIds
    .map(id => TRAIT_MAP[id])
    .filter(Boolean);
}
