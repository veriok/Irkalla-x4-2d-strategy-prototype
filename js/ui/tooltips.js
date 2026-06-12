/**
 * tooltips.js
 *
 * Building tooltip system.
 * Shows a floating info card with building stats when hovering over a building card.
 * All keyword/bonus rendering is derived from the building definition data.
 */

import { FACTIONS, FACTION_MAP } from '../data/factions-data.js';
import { RESEARCH_RESOURCE, UNIT_TAGS, EFFECT_TYPES, EFFECT_SOURCES } from '../data/enums.js';
import { PROVINCE_STATUS_MAP } from '../data/province-status-data.js';
import { MONSTER_UNITS } from '../data/monsters-data.js';
import { BUILDING_MAP, LOCATION_MAIN_CHAIN } from '../data/buildings-data.js';
import { UNITS } from '../data/units-data.js';
import { LOCATION_TYPES } from '../models/location.js';
import { state } from '../engine/game-state.js';
import { TRAIT_MAP } from '../data/traits-data.js';
import { createNativePreviewCard } from './card-renderer.js';
import { TECH_MAP } from '../data/techs-data.js';
import { FACTION_ACTIONS } from '../data/faction-actions-data.js';
import { HERO_CLASS_MAP } from '../data/hero-classes-data.js';
import { HERO_SKILL_MAP, skillEffectsToText } from '../data/hero-skills-data.js';
import { heroGenderEmoji, xpForLevel, xpForNextLevel, MAX_HERO_LEVEL } from '../models/hero.js';
import { getHeroMaxMana } from '../engine/hero-engine.js';

// Build a flat map of all resource definitions for emoji / name lookups
const ALL_RES = {};
for (const f of FACTIONS) {
  ALL_RES[f.resources.gold.id] = f.resources.gold;
  for (const r of f.resources.advanced) ALL_RES[r.id] = r;
  ALL_RES[f.resources.research.id] = f.resources.research;
}

const tooltipEl = document.getElementById('building-tooltip');
const unitTooltipEl = document.getElementById('unit-tooltip');
const techTooltipEl = document.getElementById('tech-tooltip');

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

export function showUnitTooltip(uDef, factionDef, anchorEl, currentHp = null, maxHpOverride = null, effectiveAtk = null, effectiveDef = null) {
  if (!unitTooltipEl || !uDef || !anchorEl) return;

  clearTimeout(_hideTimer);
  unitTooltipEl.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'unit-tooltip__title';
  const tierNum = uDef.isMilitia ? 0 : (uDef.tier ?? 1);
  title.innerHTML = `<span>${uDef.name ?? 'Unknown Unit'}</span><span class="unit-tooltip__tier">T${tierNum}</span>`;
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

  const baseAtk = uDef.attack ?? 0;
  const baseDef = uDef.defense ?? 0;
  const showAtk = effectiveAtk ?? baseAtk;
  const showDef = effectiveDef ?? baseDef;

  function _statEl(label, effective, base) {
    const el = document.createElement('div');
    if (effective === base) {
      el.textContent = `${label}: ${effective}`;
    } else {
      const color = effective > base ? '#4aaa77' : '#c04040';
      el.innerHTML = `${label}: <span style="color:${color};font-weight:bold">${effective}</span> <span style="color:var(--text-muted);font-size:0.85em">(base ${base})</span>`;
    }
    return el;
  }

  const attack  = _statEl('Attack',  showAtk, baseAtk);
  const defense = _statEl('Defense', showDef, baseDef);
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
  const tagIds = uDef.tagIds ?? [];
  if (tagIds.length > 0) {
    // Wrap stats + tag column side-by-side
    const statsRow = document.createElement('div');
    statsRow.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';
    stats.style.flex = '1';
    statsRow.appendChild(stats);

    const tagCol = document.createElement('div');
    tagCol.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:4px;padding-top:2px;';
    for (const tagId of tagIds) {
      const pill = document.createElement('span');
      pill.textContent = _tagLabel(tagId);
      pill.style.cssText = 'background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.22);border-radius:3px;padding:2px 7px;font-size:0.72em;color:var(--text-muted,#aaa);letter-spacing:0.05em;white-space:nowrap;';
      tagCol.appendChild(pill);
    }
    statsRow.appendChild(tagCol);
    unitTooltipEl.appendChild(statsRow);
  } else {
    unitTooltipEl.appendChild(stats);
  }

  const traits = _resolveTraits(uDef.traitIds ?? []);
  if (traits.length > 0) {
    const traitWrap = document.createElement('div');
    traitWrap.className = 'unit-tooltip__stats';
    const title = document.createElement('div');
    title.textContent = 'Traits:';
    traitWrap.appendChild(title);
    for (const trait of traits) {
      const line = document.createElement('div');
      line.innerHTML = `- <strong>${trait.name}</strong>: ${trait.description}`;
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

export const hideHeroTooltip = hideUnitTooltip;

export function showHeroTooltip(hero, factionDef, anchorEl) {
  if (!unitTooltipEl || !hero || !anchorEl) return;
  clearTimeout(_hideTimer);
  unitTooltipEl.innerHTML = '';

  const classDef = HERO_CLASS_MAP[hero.classId];

  // Title
  const title = document.createElement('div');
  title.className = 'unit-tooltip__title';
  title.textContent = `${hero.name} ${heroGenderEmoji(hero)}`;
  unitTooltipEl.appendChild(title);

  const subLine = document.createElement('div');
  subLine.className = 'hero-tooltip__sub';
  subLine.textContent = classDef?.name ?? hero.classId;
  unitTooltipEl.appendChild(subLine);

  // Hero card preview
  const preview = createNativePreviewCard({
    backgroundSrc: factionDef?.unitCardBgImg ?? null,
    foregroundSrc: classDef?.cardImg ?? null,
    fallbackIcon: classDef?.isSpellcaster ? '🧙' : '⚔',
    fallbackName: hero.name,
    fallbackSub: `Lv.${hero.level} ${classDef?.name ?? ''}`,
  });
  unitTooltipEl.appendChild(preview);

  // XP bar
  const maxMana = getHeroMaxMana(hero);
  if (hero.level < MAX_HERO_LEVEL) {
    const xpStart = xpForLevel(hero.level - 1);
    const xpEnd   = xpForNextLevel(hero.level);
    const pct     = Math.min(100, Math.round(((hero.experience - xpStart) / (xpEnd - xpStart)) * 100));
    const xpBar = document.createElement('div');
    xpBar.className = 'hero-tooltip__bar-row';
    xpBar.innerHTML = `<span class="hero-tooltip__bar-label">XP</span><div class="hero-tooltip__bar-track"><div class="hero-tooltip__bar-fill hero-tooltip__bar-fill--xp" style="width:${pct}%"></div></div><span class="hero-tooltip__bar-val">${hero.experience}/${xpEnd}</span>`;
    unitTooltipEl.appendChild(xpBar);
  }

  // Mana bar
  const manaPct = maxMana > 0 ? Math.round((hero.mana / maxMana) * 100) : 0;
  const manaBar = document.createElement('div');
  manaBar.className = 'hero-tooltip__bar-row';
  manaBar.innerHTML = `<span class="hero-tooltip__bar-label">MP</span><div class="hero-tooltip__bar-track"><div class="hero-tooltip__bar-fill hero-tooltip__bar-fill--mana" style="width:${manaPct}%"></div></div><span class="hero-tooltip__bar-val">${hero.mana}/${maxMana}</span>`;
  unitTooltipEl.appendChild(manaBar);

  // Stats — always show all 6, two rows of 3
  const stats = document.createElement('div');
  stats.className = 'hero-tooltip__stat-grid';
  const STAT_ROWS = [
    [['atk', '⚔ ATK'], ['def', '🛡 DEF'], ['tactics', '🎯 TAC']],
    [['governance', '🏛 GOV'], ['knowledge', '📚 KNO'], ['spellpower', '✨ SPW']],
  ];
  for (const row of STAT_ROWS) {
    const rowEl = document.createElement('div');
    rowEl.className = 'hero-tooltip__stat-row';
    for (const [key, label] of row) {
      const cell = document.createElement('div');
      cell.className = 'hero-tooltip__stat-cell';
      cell.innerHTML = `<span class="hero-tooltip__stat-label">${label}</span><span class="hero-tooltip__stat-val">${hero.attributes[key] ?? 0}</span>`;
      rowEl.appendChild(cell);
    }
    stats.appendChild(rowEl);
  }
  unitTooltipEl.appendChild(stats);

  // Skills — flex-wrap tag grid
  if (hero.skills.length > 0) {
    const skillBlock = document.createElement('div');
    skillBlock.className = 'unit-tooltip__stats';
    const skillTitle = document.createElement('div');
    skillTitle.style.cssText = 'font-size:10px;color:var(--text-muted);margin-bottom:3px;';
    skillTitle.textContent = 'Skills';
    skillBlock.appendChild(skillTitle);
    const tagRow = document.createElement('div');
    tagRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;';
    for (const { skillId, tier } of hero.skills) {
      const sk = HERO_SKILL_MAP[skillId];
      if (!sk) continue;
      const tag = document.createElement('span');
      tag.className = `hero-tooltip__skill-tag hero-tooltip__skill-tag--${tier}`;
      tag.textContent = `${sk.name} · ${tier.charAt(0).toUpperCase() + tier.slice(1)}`;
      tagRow.appendChild(tag);
    }
    skillBlock.appendChild(tagRow);
    unitTooltipEl.appendChild(skillBlock);
  }

  unitTooltipEl.hidden = false;
  requestAnimationFrame(() => {
    const rect = anchorEl.getBoundingClientRect();
    const tw = unitTooltipEl.offsetWidth;
    const th = unitTooltipEl.offsetHeight;
    let left = rect.right + 8;
    let top  = rect.top;
    if (left + tw > window.innerWidth  - 8) left = rect.left - tw - 8;
    if (top  + th > window.innerHeight - 8) top  = window.innerHeight - th - 8;
    top = Math.max(8, top);
    unitTooltipEl.style.left = `${left}px`;
    unitTooltipEl.style.top  = `${top}px`;
    unitTooltipEl.classList.add('visible');
  });
}

/**
 * Show a tooltip for a location type.
 * @param {Object}  locTypeMeta  — entry from LOCATION_TYPES
 * @param {Element} anchorEl
 * @param {Object}  [locData]    — actual location object (used for den enemy info)
 */
export function showLocationTooltip(locTypeMeta, anchorEl, locData = null) {
  if (!tooltipEl || !locTypeMeta) return;
  clearTimeout(_hideTimer);

  let denHtml = '';
  if (locData?.denEnemies) {
    const den     = locData.denEnemies;
    const monDef  = MONSTER_UNITS[den.unitId];
    const active  = den.hp.length;
    const total   = den.hp.length + den.woundedHp.length;
    const pct     = total > 0 ? Math.round((active / total) * 100) : 0;
    const barColor = pct > 66 ? '#c04040' : pct > 33 ? '#c8a030' : '#888';
    denHtml = `
      <hr class="btt-hr">
      <div class="btt-row">${active}/${total} ${monDef?.emoji ?? '👹'} ${monDef?.name ?? den.unitId}</div>
      <div class="btt-den-bar-wrap">
        <div class="btt-den-bar" style="width:${pct}%;background:${barColor};"></div>
      </div>`;
  }

  tooltipEl.innerHTML = `
    <div class="btt-header">${locTypeMeta.emoji ?? ''} ${locTypeMeta.name ?? ''}</div>
    <div class="btt-desc">${locTypeMeta.description ?? ''}</div>
    ${denHtml}
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
 * @param {{ flat: [{label,amount}], modifiers: [{label,percent}], total: number }} breakdown
 * @param {Element} anchorEl
 */
export function showIncomeBreakdownTooltip(resName, resEmoji, breakdown, anchorEl) {
  if (!tooltipEl) return;
  clearTimeout(_hideTimer);

  const { flat = [], modifiers = [], total = 0 } = breakdown ?? {};

  const flatLines = flat.map(s => {
    const display = parseFloat(Number(s.amount).toFixed(2));
    return `<div class="btt-row ${s.amount >= 0 ? 'btt-bonus' : 'btt-cost'}">▸ ${s.label}: ${s.amount >= 0 ? '+' : ''}${display}</div>`;
  }).join('');

  const modSection = modifiers.length > 0 ? `
    <hr class="btt-hr">
    <div class="btt-label" style="opacity:0.6">Modifiers</div>
    ${modifiers.map(m => {
      const sign = m.percent >= 0 ? '+' : '';
      return `<div class="btt-row ${m.percent >= 0 ? 'btt-bonus' : 'btt-cost'}">▸ ${m.label}: ${sign}${m.percent}%</div>`;
    }).join('')}` : '';

  const totalDisplay = parseFloat(Number(total).toFixed(1));
  tooltipEl.innerHTML = `
    <div class="btt-header">${resEmoji ?? ''} ${resName} Income</div>
    <div class="btt-section">${flatLines || '<div class="btt-row" style="color:var(--text-muted)">No sources</div>'}</div>
    ${modSection}
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

// ─── Tech tooltip ─────────────────────────────────────────

export function showTechTooltip(techDef, anchorEl) {
  if (!techTooltipEl || !techDef) return;
  clearTimeout(_hideTimer);

  techTooltipEl.innerHTML = _buildTechHtml(techDef);
  techTooltipEl.hidden = false;

  requestAnimationFrame(() => {
    const rect = anchorEl.getBoundingClientRect();
    const tw   = 220;
    const th   = techTooltipEl.offsetHeight;

    let left = rect.right + 8;
    let top  = rect.top;

    if (left + tw > window.innerWidth  - 8) left = rect.left - tw - 8;
    if (top  + th > window.innerHeight - 8) top  = window.innerHeight - th - 8;
    top = Math.max(8, top);

    techTooltipEl.style.left = `${left}px`;
    techTooltipEl.style.top  = `${top}px`;
    techTooltipEl.classList.add('visible');
  });
}

export function hideTechTooltip() {
  if (!techTooltipEl) return;
  techTooltipEl.classList.remove('visible');
  _hideTimer = setTimeout(() => { techTooltipEl.hidden = true; }, 80);
}

function _buildTechHtml(techDef) {
  const effectParts = [];

  for (const eff of (techDef.effects ?? [])) {
    if (eff.type !== EFFECT_TYPES.BUILDING_INCOME_BONUS) continue;
    const r = ALL_RES[eff.resourceId];
    if (!r) continue;
    if (eff.buildingId) {
      const b = BUILDING_MAP[eff.buildingId];
      if (b) effectParts.push(`${b.emoji} ${b.name}: ${r.emoji} +${eff.amount}/turn ${r.name}`);
    } else if (eff.category) {
      const catLabel = eff.category.charAt(0).toUpperCase() + eff.category.slice(1);
      effectParts.push(`🏗 ${catLabel} buildings: ${r.emoji} +${eff.amount}/turn ${r.name}`);
    }
  }

  for (const eff of (techDef.effects ?? [])) {
    if (eff.type !== EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE) continue;
    const subject = eff.unitId ? eff.unitId : (eff.unitType ? eff.unitType.charAt(0).toUpperCase() + eff.unitType.slice(1) : 'Units');
    effectParts.push(`⚔ ${subject}: +${eff.amount} ${eff.stat.charAt(0).toUpperCase() + eff.stat.slice(1)}`);
  }

  if ((techDef.unlockBuildings ?? []).length > 0) {
    const pFactionId = state.playerFactionId ?? null;
    const pRaceId = pFactionId ? (FACTION_MAP[pFactionId]?.raceId ?? null) : null;
    const names = techDef.unlockBuildings
      .filter(id => {
        const b = BUILDING_MAP[id];
        if (!b) return true;
        if (b.factionId && b.factionId !== pFactionId) return false;
        if (b.raceId && b.raceId !== pRaceId) return false;
        if (pFactionId && (b.disabledFactions ?? []).includes(pFactionId)) return false;
        return true;
      })
      .map(id => { const b = BUILDING_MAP[id]; return b ? `${b.emoji} ${b.name}` : id; })
      .join(', ');
    if (names) effectParts.push(`🔓 Unlocks: ${names}`);
  }

  for (const actionId of (techDef.unlockActions ?? [])) {
    const a = FACTION_ACTIONS[actionId];
    if (a) effectParts.push(`${a.icon} Unlocks action: ${a.label} — ${a.description}`);
  }

  for (const eff of (techDef.effects ?? [])) {
    if (eff.scope === 'faction' && eff.type === 'army_support_limit') {
      effectParts.push(`⚔ Army supply cap: +${eff.amount}`);
    }
    if (eff.scope === 'faction' && eff.type === 'hero_count_bonus') {
      effectParts.push(`🦸 Hero capacity: +${eff.amount ?? 1}`);
    }
    if (eff.type === EFFECT_TYPES.INCOME_PERCENT) {
      const r = eff.resourceId === 'all' ? null : ALL_RES[eff.resourceId];
      const label = eff.resourceId === 'all' ? 'All income' : (r ? `${r.emoji} ${r.name}` : eff.resourceId);
      effectParts.push(`📊 ${label}: +${eff.percent}% income`);
    }
    if (eff.type === EFFECT_TYPES.COASTAL_RESOURCE_BONUS) {
      const r = ALL_RES[eff.resourceId];
      effectParts.push(`🌊 Coastal income: ${r ? `${r.emoji} ` : ''}+${eff.amount ?? 0}/turn`);
    }
    if (eff.type === EFFECT_TYPES.RESEARCH_MULTIPLIER_REDUCTION) {
      const pct = ((eff.multiplier ?? 0) * 100).toFixed(0);
      effectParts.push(`📚 Research cost growth: +${pct}% per tech (base +3%)`);
    }
  }

  // First unit unlocked by this tech for the player's faction (capped at 1 to avoid clutter)
  const unlockedUnits = UNITS.filter(u =>
    u.techRequired === techDef.id &&
    !u.isMilitia &&
    u.factionId === state.playerFactionId
  ).slice(0, 1);

  if (techDef.militiaBonus) {
    effectParts.push(`⚔ Militia max: +${techDef.militiaBonus}`);
  }

  for (const locTypeId of (techDef.clearsLocationTypes ?? [])) {
    const loc = LOCATION_TYPES[locTypeId];
    if (loc) effectParts.push(`Allows clearing: ${loc.emoji} ${loc.name}`);
  }

  const effectSection = effectParts.length > 0
    ? `<div class="btt-section">${effectParts.map(e => `<div class="btt-row btt-bonus">▸ ${e}</div>`).join('')}</div>`
    : '';

  const unitMiniSection = unlockedUnits.length > 0
    ? `<div class="btt-section"><div class="btt-label">Unlocks Unit</div>${unlockedUnits.map(u => {
        const imgHtml = u.cardSpriteImg
          ? `<img src="${u.cardSpriteImg}" onerror="this.style.display='none'" style="width:32px;height:48px;object-fit:cover;border-radius:3px;flex-shrink:0;">`
          : `<span style="font-size:20px;width:32px;display:inline-block;text-align:center">${u.emoji ?? '⚔'}</span>`;
        return `<div class="btt-unit-mini">${imgHtml}<div class="btt-unit-mini-info"><div class="btt-unit-mini-name">${u.name}</div><div class="btt-unit-mini-stats">⚔${u.attack} 🛡${u.defense} ❤${u.maxHp} · ${u.unitType}</div></div></div>`;
      }).join('')}</div>`
    : '';

  const quoteSection = techDef.quote
    ? `<hr class="btt-hr"><div class="btt-lore">${techDef.quote}</div>`
    : '';

  return `
    <div class="btt-header">${techDef.emoji ?? ''} ${techDef.name ?? ''}</div>
    <div class="btt-desc">${techDef.description ?? ''}</div>
    ${effectSection}
    ${unitMiniSection}
    ${quoteSection}
  `.trim();
}

// ─── HTML builder ─────────────────────────────────────────

const CATEGORY_COLORS = {
  trade:          '#b8860b',
  administration: '#4a7abf',
  exploration:    '#2e8b7a',
  training:       '#b85c2a',
  defensive:      '#6a7080',
  worshipping:    '#7b52a8',
  scientific:     '#3a8050',
  industrial:     '#8b5c2a',
};

function _resolveCostKey(key) {
  if (key === 'faction_primary_adv') {
    const faction = FACTION_MAP[state?.playerFactionId];
    return faction?.resources?.advanced?.[0] ?? null;
  }
  if (key === 'faction_secondary_adv') {
    const faction = FACTION_MAP[state?.playerFactionId];
    return faction?.resources?.advanced?.[1] ?? null;
  }
  return ALL_RES[key] ?? null;
}

function _buildHtml(bDef, opts = {}) {
  // Use effective cost/turns when provided (accounts for faction multiplier + governor discount)
  const displayCost  = opts.effectiveCost  ?? bDef.cost ?? {};
  const displayTurns = opts.effectiveTurns ?? bDef.buildTurns;

  // Cost line(s)
  const costParts = Object.entries(displayCost).map(([res, amt]) => {
    const r = _resolveCostKey(res);
    return `${r?.emoji ?? ''} ${amt} ${r?.name ?? res}`;
  });

  // Bonus line(s)
  const bonusParts = [];
  for (const eff of (bDef.effects ?? [])) {
    if (eff.type === EFFECT_TYPES.INCOME_FLAT) {
      if (eff.resourceId === 'faction_primary_adv') {
        const faction = FACTION_MAP[state?.playerFactionId];
        const advRes = faction?.resources?.advanced?.[0];
        bonusParts.push(`${advRes?.emoji ?? '✨'} +${eff.amount}/turn ${advRes?.name ?? 'Primary Resource'}`);
      } else if (eff.resourceId === 'faction_secondary_adv') {
        const faction = FACTION_MAP[state?.playerFactionId];
        const advRes = faction?.resources?.advanced?.[1];
        bonusParts.push(`${advRes?.emoji ?? '🔮'} +${eff.amount}/turn ${advRes?.name ?? 'Secondary Resource'}`);
      } else {
        const r = ALL_RES[eff.resourceId];
        if (r) bonusParts.push(`${r.emoji} +${eff.amount}/turn ${r.name}`);
      }
    } else if (eff.type === EFFECT_TYPES.FORTIFICATION_BONUS) {
      bonusParts.push(`+${eff.amount}% Province Defense`);
    } else if (eff.type === EFFECT_TYPES.PROVINCE_GROWTH_SLOTS) {
      bonusParts.push(`+${eff.amount} Building Slot${eff.amount > 1 ? 's' : ''}`);
    } else if (eff.type === EFFECT_TYPES.MILITIA_BONUS) {
      bonusParts.push(`⚔ +${eff.amount} Militia max`);
    } else if (eff.type === EFFECT_TYPES.UNIT_RECRUIT_SPEED) {
      bonusParts.push(`⚡ -${eff.amount} recruit turn${eff.amount > 1 ? 's' : ''}`);
    } else if (eff.type === EFFECT_TYPES.HERO_COUNT_BONUS) {
      bonusParts.push(`🦸 +${eff.amount} Hero slot`);
    } else if (eff.type === EFFECT_TYPES.FORTIFICATION_FIRST_STRIKE_CHANCE) {
      bonusParts.push(`⚡ +${Math.round(eff.amount * 100)}% First Strike chance`);
    }
  }

  // Faction-level bonuses for this specific building (faction base + techs)
  const factionEffects = state.factions?.get(state.playerFactionId)?.factionEffects ?? [];
  for (const eff of factionEffects) {
    if (eff.type !== EFFECT_TYPES.BUILDING_INCOME_BONUS) continue;
    if (eff.buildingId !== bDef.id && eff.category !== bDef.category) continue;
    const r = ALL_RES[eff.resourceId];
    if (r) {
      const tag = eff.source === EFFECT_SOURCES.TECH ? ' <span class="btt-tech-tag">Tech</span>' : '';
      bonusParts.push(`${r.emoji} +${eff.amount}/turn ${r.name}${tag}`);
    }
  }

  // Units recruitable with this building (for player's faction, tech already unlocked or no tech needed)
  const _playerTechs = state.factions?.get(state.playerFactionId)?.unlockedTechs ?? [];
  const recruitableByBuilding = UNITS.filter(u => {
    if (u.isMilitia || u.factionId !== state.playerFactionId) return false;
    if (u.techRequired && !_playerTechs.includes(u.techRequired)) return false;
    const req = u.requiredBuilding;
    if (Array.isArray(req)) return req.includes(bDef.id);
    return req === bDef.id;
  });

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

  const catColor = bDef.category ? (CATEGORY_COLORS[bDef.category] ?? 'var(--text-dim)') : null;

  return `
    <div class="btt-header">${bDef.emoji ?? ''} ${bDef.name ?? ''}${factionTag}</div>
    ${bDef.tier ? `<div class="btt-tier">Tier ${bDef.tier}</div>` : ''}
    ${catColor ? `<div class="btt-category" style="color:${catColor}">◆ ${bDef.category.charAt(0).toUpperCase() + bDef.category.slice(1)}</div>` : ''}
    <div class="btt-desc">${bDef.description ?? ''}</div>
    <hr class="btt-hr">
    ${!opts.installed ? `
    <div class="btt-section">
      <div class="btt-row">⏱ ${displayTurns} turn${displayTurns !== 1 ? 's' : ''} to build</div>
      ${costParts.map(c => `<div class="btt-row btt-cost">💸 ${c}</div>`).join('')}
    </div>` : ''}
    ${bonusParts.length > 0 ? `
    <div class="btt-section">
      <div class="btt-label">Bonuses</div>
      ${bonusParts.map(b => `<div class="btt-row btt-bonus">▸ ${b}</div>`).join('')}
    </div>` : ''}
    ${recruitableByBuilding.length > 0 ? `
    <div class="btt-section">
      <div class="btt-label">Allows Recruitment</div>
      ${recruitableByBuilding.map(u => `<div class="btt-row btt-bonus">▸ ${u.emoji ?? '⚔'} ${u.name} (⚔${u.attack} 🛡${u.defense})</div>`).join('')}
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

const _TAG_LABELS = Object.fromEntries(
  Object.entries(UNIT_TAGS).map(([, v]) => [v, v.charAt(0).toUpperCase() + v.slice(1)])
);
function _tagLabel(tagId) {
  return _TAG_LABELS[tagId] ?? tagId;
}

// ─── Effect line renderer
/**
 * Convert a structured effects array into human-readable HTML strings.
 * Used by province status tooltips and can be reused for army/faction tooltips.
 * @param {Array} effects
 * @returns {string[]}
 */
export function renderEffectLines(effects = [], multiplier = 1) {
  return effects.map(eff => {
    if (eff.type === 'income_percent') {
      const total = (eff.percent ?? 0) * multiplier;
      const sign = total >= 0 ? '+' : '';
      if (eff.resourceId === 'all') {
        return `📊 All income: ${sign}${total}%`;
      }
      const r = ALL_RES[eff.resourceId];
      return `📊 ${r?.emoji ?? ''} ${r?.name ?? eff.resourceId}: ${sign}${total}%`;
    }
    if (eff.type === EFFECT_TYPES.FORTIFICATION_BONUS) {
      const total = (eff.amount ?? 0) * multiplier;
      return `🛡 Defense: +${total}%`;
    }
    if (eff.type === EFFECT_TYPES.DISABLE_MILITIA_REGEN) {
      return `⚔️ Militia regen: blocked this turn`;
    }
    return null;
  }).filter(Boolean);
}

// ─── Province status effect tooltip

/**
 * Show a tooltip for a province status effect chip.
 * @param {{ type: string, turnsRemaining: number }} effect
 * @param {Element} anchorEl
 */
export function showProvinceStatusTooltip(effect, anchorEl) {
  if (!tooltipEl) return;
  const def = PROVINCE_STATUS_MAP[effect.type];
  if (!def) return;
  clearTimeout(_hideTimer);

  const stacks = effect.stacks ?? 1;
  const stackLabel = stacks > 1 ? ` (×${stacks})` : '';
  const effectLines = renderEffectLines(def.effects ?? [], stacks);
  const effectSection = effectLines.length > 0
    ? `<hr class="btt-hr"><div class="btt-section">${effectLines.map(l => `<div class="btt-row btt-bonus">▸ ${l}</div>`).join('')}</div>`
    : '';

  tooltipEl.innerHTML = `
    <div class="btt-header">${def.icon} ${def.label}${stackLabel}</div>
    <div class="btt-desc">${def.description ?? ''}</div>
    ${effectSection}
    <hr class="btt-hr">
    <div class="btt-row" style="color:var(--text-muted)">${effect.turnsRemaining === -1 ? 'Permanent' : `${effect.turnsRemaining} turn${effect.turnsRemaining !== 1 ? 's' : ''} remaining`}</div>
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

export const hideProvinceStatusTooltip = hideBuildingTooltip;

// ─── Hero stat tooltip ─────────────────────────────────────────────────────────

const _STAT_DESCRIPTIONS = {
  atk:        ['⚔ Attack',      'Amplifies damage dealt by armies under this hero\'s command.'],
  def:        ['🛡 Defense',    'Reduces damage taken by armies under this hero\'s command.'],
  tactics:    ['🎯 Tactics',    'Improves combat initiative and grants tactical bonuses in battle.'],
  governance: ['🏛 Governance', 'Increases income from provinces this hero governs.'],
  knowledge:  ['📚 Knowledge',  'Determines maximum mana pool and capacity to learn spells.'],
  spellpower: ['✨ Spellpower', 'Amplifies damage, healing, and potency of all spells cast.'],
};

export function showStatTooltip(statKey, statValue, anchorEl, effectiveVal = null) {
  if (!tooltipEl) return;
  clearTimeout(_hideTimer);
  const [label, desc] = _STAT_DESCRIPTIONS[statKey] ?? [statKey, ''];
  const hasBonus = effectiveVal !== null && effectiveVal !== statValue;
  const valHtml = hasBonus
    ? `<span style="color:#4aaa77;font-weight:700">${effectiveVal}</span> <span style="color:var(--text-muted);font-size:10px">(base&nbsp;${statValue})</span>`
    : `${effectiveVal ?? statValue}`;
  tooltipEl.innerHTML = `
    <div class="btt-header">${label}: ${valHtml}</div>
    <div class="btt-desc">${desc}</div>
  `.trim();
  tooltipEl.hidden = false;
  requestAnimationFrame(() => {
    const rect = anchorEl.getBoundingClientRect();
    const tw = 200;
    const th = tooltipEl.offsetHeight;
    let left = rect.right + 8;
    let top = rect.top;
    if (left + tw > window.innerWidth - 8) left = rect.left - tw - 8;
    if (top + th > window.innerHeight - 8) top = window.innerHeight - th - 8;
    top = Math.max(8, top);
    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top  = `${top}px`;
    tooltipEl.classList.add('visible');
  });
}

export const hideStatTooltip = hideBuildingTooltip;

// ─── Hero skill tooltip ────────────────────────────────────────────────────────

export function showSkillTooltip(skillId, tier, anchorEl) {
  if (!tooltipEl) return;
  clearTimeout(_hideTimer);
  const skillDef = HERO_SKILL_MAP[skillId];
  if (!skillDef) return;
  const tierDef = skillDef.tiers.find(t => t.tier === tier);
  const tierLabel = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : '';
  tooltipEl.innerHTML = `
    <div class="btt-header">${skillDef.icon ?? ''} ${skillDef.name}</div>
    <div class="btt-section"><div class="btt-row btt-bonus">▸ ${tierLabel}</div></div>
    <div class="btt-desc">${skillEffectsToText(tierDef?.effects)}</div>
  `.trim();
  tooltipEl.hidden = false;
  requestAnimationFrame(() => {
    const rect = anchorEl.getBoundingClientRect();
    const tw = 200;
    const th = tooltipEl.offsetHeight;
    let left = rect.right + 8;
    let top = rect.top;
    if (left + tw > window.innerWidth - 8) left = rect.left - tw - 8;
    if (top + th > window.innerHeight - 8) top = window.innerHeight - th - 8;
    top = Math.max(8, top);
    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top  = `${top}px`;
    tooltipEl.classList.add('visible');
  });
}

export const hideSkillTooltip = hideBuildingTooltip;

// ─── Artifact tooltip ──────────────────────────────────────────────────────

const _ARTIFACT_RARITY_COLORS = {
  common:    '#888888',
  uncommon:  '#4488cc',
  rare:      '#c8a030',
  legendary: '#cc3030',
};

const _ARTIFACT_STAT_LABELS = {
  atk: 'ATK', def: 'DEF', tactics: 'TAC',
  governance: 'GOV', knowledge: 'KNO', spellpower: 'SPW',
};

export function showArtifactTooltip(artDef, anchorEl) {
  if (!tooltipEl || !artDef) return;
  clearTimeout(_hideTimer);

  const rarityColor = _ARTIFACT_RARITY_COLORS[artDef.rarity] ?? 'var(--text-muted)';
  const capRarity = artDef.rarity ? artDef.rarity.charAt(0).toUpperCase() + artDef.rarity.slice(1) : '';

  const effectLines = (artDef.effects ?? []).map(eff => {
    if (eff.type === 'hero_stat_bonus' && eff.stat) {
      return `<div class="btt-row btt-bonus">▸ ${_ARTIFACT_STAT_LABELS[eff.stat] ?? eff.stat}: +${eff.amount}</div>`;
    }
    if (eff.type === 'army_unit_type_multi_bonus') {
      return `<div class="btt-row btt-bonus">▸ ${eff.unitType} ${eff.stat}: +${eff.percent}%</div>`;
    }
    if (eff.type === 'army_all_units_multi_bonus') {
      return `<div class="btt-row btt-bonus">▸ All units ${eff.stat}: +${eff.percent}%</div>`;
    }
    if (eff.type === EFFECT_TYPES.INCOME_PERCENT) {
      return `<div class="btt-row btt-bonus">▸ Province income: +${eff.percent}%</div>`;
    }
    if (eff.type === 'hero_mana_bonus') {
      return `<div class="btt-row btt-bonus">▸ Max mana: +${eff.amount}</div>`;
    }
    if (eff.type === 'army_movement_bonus') {
      return `<div class="btt-row btt-bonus">▸ Army movement: +${eff.amount}</div>`;
    }
    return null;
  }).filter(Boolean).join('');

  tooltipEl.innerHTML = `
    <div class="btt-header" style="color:${rarityColor}">${artDef.name}</div>
    <div style="font-size:10px;color:${rarityColor};margin-bottom:4px">${capRarity}</div>
    <div class="btt-desc">${artDef.description ?? ''}</div>
    ${effectLines ? `<hr class="btt-hr"><div class="btt-section">${effectLines}</div>` : ''}
  `.trim();

  tooltipEl.hidden = false;
  requestAnimationFrame(() => {
    const rect = anchorEl.getBoundingClientRect();
    const tw = 210;
    const th = tooltipEl.offsetHeight;
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

export const hideArtifactTooltip = hideBuildingTooltip;

// ─── Faction action tooltip ────────────────────────────────────────────────

/**
 * Show a tooltip for a faction/army action button.
 * @param {import('../data/faction-actions-data.js').FACTION_ACTIONS[string]} actionDef
 * @param {{ type: 'faction'|'tech', id: string, name: string } | null} unlockSource
 * @param {Element} anchorEl
 */
export function showActionTooltip(actionDef, anchorEl) {
  if (!tooltipEl || !actionDef) return;
  clearTimeout(_hideTimer);

  tooltipEl.innerHTML = `
    <div class="btt-header">${actionDef.icon} ${actionDef.label}</div>
    <div class="btt-desc">${actionDef.description ?? ''}</div>
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

export const hideActionTooltip = hideBuildingTooltip;

// ─── Faction effects tooltip (faction banner hover) ────────────────────────

export function showFactionEffectsTooltip(anchorEl, mouseEvent = null) {
  if (!tooltipEl) return;
  const fs = state.factions?.get(state.playerFactionId);
  if (!fs) return;
  const html = _buildFactionEffectsHtml(fs.factionEffects ?? []);

  clearTimeout(_hideTimer);
  tooltipEl.innerHTML = html;
  tooltipEl.hidden = false;

  requestAnimationFrame(() => {
    const tw = 260;
    const th = tooltipEl.offsetHeight;
    const originX = mouseEvent?.clientX ?? anchorEl.getBoundingClientRect().right;
    const originY = mouseEvent?.clientY ?? anchorEl.getBoundingClientRect().top;
    let left = originX + 12;
    let top  = originY + 12;
    if (left + tw > window.innerWidth  - 8) left = originX - tw - 12;
    if (top  + th > window.innerHeight - 8) top  = window.innerHeight - th - 8;
    top = Math.max(8, top);
    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top  = `${top}px`;
    tooltipEl.classList.add('visible');
  });
}

export const hideFactionEffectsTooltip = hideBuildingTooltip;

function _buildFactionEffectsHtml(effects) {
  // Merge effects with identical type + discriminating fields so stacked techs collapse
  const merged = new Map();
  for (const eff of effects) {
    const key = [
      eff.type, eff.scope ?? '',
      eff.resourceId ?? '', eff.stat ?? '', eff.target ?? '',
      eff.unitId ?? '', eff.unitType ?? '',
      eff.buildingId ?? '', eff.category ?? '', eff.biome ?? '',
    ].join('|');
    if (merged.has(key)) {
      const ex = merged.get(key);
      if (eff.amount  != null) ex.amount  = (ex.amount  ?? 0) + eff.amount;
      if (eff.percent != null) ex.percent = (ex.percent ?? 0) + eff.percent;
    } else {
      merged.set(key, { ...eff });
    }
  }

  const lines = [];
  for (const eff of merged.values()) {
    const result = _factionEffectLabel(eff);
    if (result) lines.push(result);
  }

  const faction = FACTION_MAP[state.playerFactionId];
  const body = lines.length > 0
    ? `<div class="btt-section">${lines.map(({ label, negative }) => `<div class="btt-row ${negative ? 'btt-penalty' : 'btt-bonus'}">▸ ${label}</div>`).join('')}</div>`
    : `<div class="btt-desc">No outgoing faction effects.</div>`;
  return `
    <div class="btt-header">${faction?.emoji ?? ''} ${faction?.name ?? ''} Faction Effects</div>
    ${body}
  `.trim();
}

// Returns { label: string, negative: boolean } or null.
// negative=true → red (.btt-penalty); false → green (.btt-bonus)
// Rule: negative means "harmful to the player".
//   Cost/time increases are harmful even though their raw value is positive.
//   Reduction effects (displayed negated) are harmful only when the raw value is negative.
function _factionEffectLabel(eff) {
  const T = EFFECT_TYPES;
  const sp    = (n) => n >= 0 ? `+${n}` : `${n}`;
  const spPct = (n) => n >= 0 ? `+${n}%` : `${n}%`;
  const cap   = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const ok  = (label) => ({ label, negative: false });
  const bad = (label) => ({ label, negative: true  });
  const byAmt  = (label, amt)  => amt  < 0 ? bad(label) : ok(label);
  const byPct  = (label, pct)  => pct  < 0 ? bad(label) : ok(label);
  // For cost/time: higher value = worse for player
  const byCost = (label, val)  => val  > 0 ? bad(label) : ok(label);

  switch (eff.type) {
    case T.INCOME_FLAT: {
      const r = ALL_RES[eff.resourceId];
      if (!r) return null;
      return byAmt(`${r.emoji} ${r.name} income: ${sp(eff.amount)}/turn`, eff.amount ?? 0);
    }
    case T.INCOME_PERCENT: {
      const label = eff.resourceId === 'all'
        ? 'All income'
        : (ALL_RES[eff.resourceId] ? `${ALL_RES[eff.resourceId].emoji} ${ALL_RES[eff.resourceId].name} income` : 'Income');
      return byPct(`${label}: ${spPct(eff.percent)}`, eff.percent ?? 0);
    }
    case T.FORTIFICATION_BONUS: {
      const amt = eff.amount ?? 0;
      return byAmt(`Province defense: ${sp(amt)}%`, amt);
    }
    case T.RESEARCH_PERCENT:
      return byPct(`Research speed: ${spPct(eff.percent ?? 0)}`, eff.percent ?? 0);
    case T.BUILDING_COST_PERCENT: {
      const tgt = eff.target === 'all' ? 'all buildings' : `${eff.target ?? 'buildings'} buildings`;
      return byCost(`Build cost (${tgt}): ${spPct(eff.percent ?? 0)}`, eff.percent ?? 0);
    }
    case T.BUILDING_IN_LOCATION_COST_PERCENT: {
      const tgt = eff.target === 'all' ? 'all locations' : (eff.target ?? 'location');
      return byCost(`Building cost in ${tgt}: ${spPct(eff.percent ?? 0)}`, eff.percent ?? 0);
    }
    case T.LOCATION_COST_PERCENT: {
      const tgt = eff.target === 'all' ? 'all locations' : (eff.target ?? 'location');
      return byCost(`Location cost (${tgt}): ${spPct(eff.percent ?? 0)}`, eff.percent ?? 0);
    }
    case T.BUILD_TIME_BONUS: {
      const amt = eff.amount ?? 0;
      return byCost(`Build time: ${sp(amt)} turn${Math.abs(amt) !== 1 ? 's' : ''}`, amt);
    }
    case T.UNIT_COST_MULTI: {
      const amt = eff.amount ?? 1;
      return byCost(`Unit cost multiplier: ×${amt}`, amt - 1);
    }
    case T.UNIT_RECRUIT_SPEED: {
      const amt = eff.amount ?? 0;
      // positive amount = faster recruitment = good
      return byAmt(`Recruit time: ${sp(-amt)} turn${Math.abs(amt) !== 1 ? 's' : ''}`, amt);
    }
    case T.ARMY_SUPPORT_LIMIT:
      return byAmt(`⚔ Army supply cap: ${sp(eff.amount ?? 0)}`, eff.amount ?? 0);
    case T.HERO_COUNT_BONUS:
      return byAmt(`🦸 Hero capacity: ${sp(eff.amount ?? 0)}`, eff.amount ?? 0);
    case T.BUILDING_INCOME_BONUS: {
      const r = ALL_RES[eff.resourceId];
      if (!r) return null;
      const amt = eff.amount ?? 0;
      let label;
      if (eff.buildingId) {
        const b = BUILDING_MAP[eff.buildingId];
        label = `${b ? `${b.emoji} ${b.name}` : eff.buildingId} income: ${r.emoji} ${sp(amt)}/turn`;
      } else if (eff.category) {
        label = `${cap(eff.category)} buildings: ${r.emoji} ${sp(amt)}/turn`;
      } else {
        label = `Building income: ${r.emoji} ${sp(amt)}/turn`;
      }
      return byAmt(label, amt);
    }
    case T.CONQUEST_PENALTY_REDUCTION: {
      // positive raw value = conquest penalty goes down = good
      const raw = eff.percent ?? eff.amount ?? 0;
      return byAmt(`Conquest penalty: ${spPct(-raw)}`, raw);
    }
    case T.OCEAN_MOVEMENT_BONUS:
      return byAmt(`Ocean movement: ${sp(eff.amount ?? 0)}`, eff.amount ?? 0);
    case T.RUNE_UPKEEP_REDUCTION: {
      // positive raw = upkeep goes down = good
      const raw = eff.amount ?? 0;
      return byAmt(`Rune upkeep: ${sp(-raw)}`, raw);
    }
    case T.LORE_TECH_DISCOUNT: {
      const raw = eff.percent ?? 0;
      return byAmt(`Lore tech cost: ${spPct(-raw)}`, raw);
    }
    case T.VICTORY_SOUL_BONUS:
      return ok(`👻 Souls from victory: ${sp(eff.amount ?? 0)}`);
    case T.SOUL_RESURRECTION_CHANCE:
      return ok(`💀 Soul resurrection: +${Math.round((eff.amount ?? 0) * 100)}% chance`);
    case T.FORTIFY_COST_REDUCTION: {
      const raw = eff.percent ?? 0;
      return byAmt(`Fortify cost: ${spPct(-raw)}`, raw);
    }
    case T.COASTAL_RESOURCE_BONUS: {
      const r = ALL_RES[eff.resourceId];
      return byAmt(`Coastal income: ${r ? `${r.emoji} ` : ''}${sp(eff.amount ?? 0)}/turn`, eff.amount ?? 0);
    }
    case T.CLEAR_REWARD_MULTIPLIER: {
      const amt = eff.amount ?? 1;
      return byCost(`Clear rewards: ×${amt}`, 1 - amt); // <1 would be bad
    }
    case T.RESEARCH_MULTIPLIER_REDUCTION: {
      const pct = ((eff.multiplier ?? 0) * 100).toFixed(0);
      return byAmt(`Research cost growth: +${pct}% per tech (base +3%)`, 1);
    }
    case T.BIOME_INCOME_BONUS: {
      const biome = cap(eff.biome ?? eff.target ?? 'biome');
      const r = ALL_RES[eff.resourceId];
      return byAmt(`${biome} income: ${r ? `${r.emoji} ` : ''}${sp(eff.amount ?? 0)}/turn`, eff.amount ?? 0);
    }
    case T.BIOME_COMBAT_BONUS: {
      const biome = cap(eff.biome ?? eff.target ?? 'biome');
      return byAmt(`${biome} combat: ${spPct(eff.amount ?? 0)}`, eff.amount ?? 0);
    }
    case T.RUIN_CLEAR_BONUS: {
      const r = ALL_RES[eff.resourceId];
      return byAmt(`Ruin/den clear: ${r ? `${r.emoji} ` : ''}${sp(eff.amount ?? 0)}`, eff.amount ?? 0);
    }
    case T.CONSCRIPT_COST_REDUCTION: {
      const raw = eff.percent ?? 0;
      return byAmt(`Conscript cost: ${spPct(-raw)}`, raw);
    }
    case T.STAT_MODIFIER_ARMY: {
      const s = cap(eff.stat ?? 'stat');
      return byAmt(`⚔ Army ${s}: ${sp(eff.amount ?? 0)}`, eff.amount ?? 0);
    }
    case T.STAT_MODIFIER_UNIT_TYPE: {
      const s = cap(eff.stat ?? 'stat');
      const subj = eff.unitId ?? cap(eff.unitType ?? 'Units');
      return byAmt(`⚔ ${subj} ${s}: ${sp(eff.amount ?? 0)}`, eff.amount ?? 0);
    }
    case T.ARMY_MOVEMENT_BONUS:
      return byAmt(`Army movement: ${sp(eff.amount ?? 0)}`, eff.amount ?? 0);
    case T.ARMY_ALL_UNITS_MULTI_BONUS: {
      const s = cap(eff.stat ?? 'stat');
      return byAmt(`⚔ All units ${s}: ${spPct(eff.amount ?? 0)}`, eff.amount ?? 0);
    }
    case T.ARMY_UNIT_TYPE_MULTI_BONUS: {
      const s = cap(eff.stat ?? 'stat');
      const subj = cap(eff.unitType ?? 'Units');
      return byAmt(`⚔ ${subj} ${s}: ${spPct(eff.amount ?? 0)}`, eff.amount ?? 0);
    }
    default:
      return null;
  }
}
