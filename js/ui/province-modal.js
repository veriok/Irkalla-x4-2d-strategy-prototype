/**
 * province-modal.js
 *
 * Full-screen province management modal.
 * Handles: building, upgrading, demolishing, location clearing/building,
 * monster den combat, and unit recruitment.
 *
 * Layout:
 *   Header  — province name, income, effects placeholder, close button
 *   Body    — left: location cards + building slots
 *           — right: dynamic sidebar (actions based on selection)
 *   Queue   — horizontal 5-slot queue row at the bottom
 */

import {
  state,
  getProvince,
  getArmiesInProvince,
  canAfford,
  spendResources,
  addResources,
  computeMilitiaMax,
  getFaction,
} from '../engine/game-state.js';
import { FACTION_MAP, NEUTRAL } from '../data/factions-data.js';
import { getBiome } from '../data/biomes-data.js';
import {
  LOCATION_TYPES,
  LOCATION_BUILD_COSTS,
  LOCATION_BUILD_TURNS,
  LOCATION_BASE_SLOTS,
  LOCATION_CLEAR_COSTS,
  LOCATION_CLEAR_TECH_REQ,
  getInstalledBuildingIds,
  getAvailableBuildingSlots,
  getLocationResourceBonuses,
} from '../models/location.js';
import { enqueueProduction, dequeueProduction } from '../models/province.js';
import { BUILDING_MAP, getBuildingsForLocation, getBuildingsForFaction, LOCATION_MAIN_CHAIN } from '../data/buildings-data.js';
import { getRecruitableUnits, UNIT_MAP } from '../data/units-data.js';
import { MONSTER_UNITS } from '../data/monsters-data.js';
import { createCard } from './card-renderer.js';
import { renderResourceBar } from './resource-bar.js';
import {
  showBuildingTooltip, hideBuildingTooltip,
  showUnitTooltip, hideUnitTooltip,
  showLocationTooltip, hideLocationTooltip,
  showBiomeTooltip, hideBiomeTooltip,
  showIncomeBreakdownTooltip, hideIncomeBreakdownTooltip,
  showProvinceStatusTooltip, hideProvinceStatusTooltip,
} from './tooltips.js';
import { PROVINCE_STATUS_MAP } from '../data/province-status-data.js';
import { TECH_MAP } from '../data/techs-data.js';
import { getEffectiveUnitStats } from '../engine/tech-effects.js';
import { resolveMonsterDenCombat } from '../engine/combat.js';
import { renderArmyPanel } from './army-panel.js';
import { showResearchModalAndHighlight } from './research-modal.js';
import { showDenCombatReportModal } from './modal.js';

// ─── DOM refs ─────────────────────────────────────────────
const overlayEl      = document.getElementById('province-modal-overlay');
const nameEl         = document.getElementById('pmod-province-name');
const subEl          = document.getElementById('pmod-province-sub');
const incomeChipsEl  = document.getElementById('pmod-income-chips');
const statsRowEl     = document.getElementById('pmod-stats-row');
const effectsEl      = document.getElementById('pmod-effects');
const flagImgEl      = document.getElementById('pmod-flag-img');
const flagEmojiEl    = document.getElementById('pmod-flag-emoji');
const locCardsEl     = document.getElementById('pmod-loc-cards');
const buildSlotsEl   = document.getElementById('pmod-building-slots');
const sidebarActEl   = document.getElementById('pmod-sidebar-actions');
const queueSlotsEl   = document.getElementById('pmod-queue-slots');
const closeBtn       = document.getElementById('pmod-close');

// ─── State ────────────────────────────────────────────────
let _provinceId        = null;
let _selectedLocId     = null;   // which location card is selected
let _selectedSlotKey   = null;   // 'slot:<buildingId>' or 'empty:<slotIndex>'

// ─── Public API ───────────────────────────────────────────
export function showProvinceModal(provinceId) {
  _provinceId      = provinceId;
  _selectedLocId   = null;
  _selectedSlotKey = null;
  _render();
  overlayEl.hidden = false;
}

export function hideProvinceModal() {
  const closedId   = _provinceId;
  overlayEl.hidden = true;
  _provinceId      = null;
  _selectedLocId   = null;
  _selectedSlotKey = null;

  // Hide any lingering tooltips
  hideBuildingTooltip();
  hideUnitTooltip();
  hideLocationTooltip();
  hideBiomeTooltip();
  hideIncomeBreakdownTooltip();
  hideProvinceStatusTooltip();

  // Refresh the side panel so queue changes are reflected immediately
  if (closedId) {
    document.dispatchEvent(new CustomEvent('province-modal-closed', { detail: { provinceId: closedId } }));
  }
}

export function isModalOpen() {
  return !overlayEl.hidden;
}

// Refresh if currently showing this province (called after turn end, queue changes, etc.)
export function refreshProvinceModal() {
  if (!isModalOpen() || !_provinceId) return;
  _render();
}

// ─── Close button ─────────────────────────────────────────
closeBtn.addEventListener('click', hideProvinceModal);

// ─── Main render ──────────────────────────────────────────
function _render() {
  const prov = getProvince(_provinceId);
  if (!prov) { hideProvinceModal(); return; }

  _renderHeader(prov);
  _renderLocationRows(prov);
  _renderSidebar(prov);
  _renderQueue(prov);
}

// ─── Header ───────────────────────────────────────────────
function _renderHeader(prov) {
  const biome   = getBiome(prov.biomeId);
  const faction = FACTION_MAP[prov.ownerId] ?? NEUTRAL;

  // Province name
  nameEl.textContent = prov.name;
  nameEl.style.color = faction.textColor ?? faction.color ?? '';

  // Biome + faction sub-line — biome portion is hoverable
  subEl.innerHTML = '';
  const biomeBtn = document.createElement('span');
  biomeBtn.className = 'pmod-biome-btn';
  biomeBtn.textContent = `${biome.emoji} ${biome.name}`;
  biomeBtn.addEventListener('mouseenter', () => showBiomeTooltip(biome, biomeBtn));
  biomeBtn.addEventListener('mouseleave', hideBiomeTooltip);
  subEl.appendChild(biomeBtn);
  subEl.appendChild(document.createTextNode(`  ·  ${faction.name}`));

  // Faction flag
  if (flagImgEl && flagEmojiEl) {
    if (faction.flagImg) {
      flagImgEl.hidden = true;
      flagEmojiEl.hidden = true;
      flagImgEl.onload = () => { flagImgEl.hidden = false; flagEmojiEl.hidden = true; };
      flagImgEl.onerror = () => { flagImgEl.hidden = true; flagEmojiEl.hidden = false; };
      if (flagImgEl.dataset.src !== faction.flagImg) {
        flagImgEl.dataset.src = faction.flagImg;
        flagImgEl.src = faction.flagImg;
      } else if (flagImgEl.complete && flagImgEl.naturalWidth > 0) {
        flagImgEl.hidden = false; flagEmojiEl.hidden = true;
      }
    } else {
      flagImgEl.hidden = true;
      flagImgEl.dataset.src = '';
      flagEmojiEl.textContent = faction.emoji ?? '';
      flagEmojiEl.hidden = false;
    }
  }

  // Income chips with breakdown tooltip
  incomeChipsEl.innerHTML = '';
  const playerFaction = FACTION_MAP[state.playerFactionId];
  if (playerFaction && prov.ownerId === state.playerFactionId) {
    const allResById = { [playerFaction.resources.basic.id]: playerFaction.resources.basic };
    for (const r of playerFaction.resources.advanced) allResById[r.id] = r;

    const breakdown = _computeProvinceBreakdown(prov, playerFaction);

    for (const [resId, info] of Object.entries(breakdown)) {
      if (info.total <= 0) continue;
      const resDef = allResById[resId];
      const chip = document.createElement('span');
      chip.className = 'pmod-res-chip';
      chip.innerHTML = `${resDef?.emoji ?? ''} <strong>+${parseFloat(info.total.toFixed(1))}</strong>/t`;
      chip.addEventListener('mouseenter', () =>
        showIncomeBreakdownTooltip(resDef?.name ?? resId, resDef?.emoji ?? '', info, chip)
      );
      chip.addEventListener('mouseleave', hideIncomeBreakdownTooltip);
      incomeChipsEl.appendChild(chip);
    }
  }

  // Stats row — defense + income modifier
  if (statsRowEl) {
    statsRowEl.innerHTML = '';

    const defStats = _computeDefenseStats(prov);
    const totalDefPct = Math.round(defStats.total * 100);
    const defChip = document.createElement('span');
    defChip.className = 'pmod-stat-chip';
    defChip.textContent = `🛡 Defense: +${totalDefPct}%`;
    defChip.title = [
      `Biome (${biome.name}): +${Math.round(defStats.biome * 100)}%`,
      defStats.buildings > 0 ? `Buildings: +${Math.round(defStats.buildings * 100)}%` : null,
    ].filter(Boolean).join('\n');
    statsRowEl.appendChild(defChip);

    // Status effects display
    if (effectsEl) {
      effectsEl.innerHTML = '';
      const visibleEffects = prov.visibility === 'visible' ? (prov.statusEffects ?? []) : [];
      if (visibleEffects.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.className = 'pmod-effect-icon';
        placeholder.title = 'No active effects';
        placeholder.style.opacity = '0.3';
        placeholder.textContent = '✨';
        effectsEl.appendChild(placeholder);
      } else {
        for (const effect of visibleEffects) {
          const def = PROVINCE_STATUS_MAP[effect.type];
          if (!def) continue;
          const chip = document.createElement('span');
          chip.className = 'pmod-effect-chip';
          chip.innerHTML = `<span class="pmod-effect-icon">${def.icon}</span><span class="pmod-effect-turns">${effect.turnsRemaining}t</span>`;
          chip.addEventListener('mouseenter', () => showProvinceStatusTooltip(effect, chip));
          chip.addEventListener('mouseleave', hideProvinceStatusTooltip);
          effectsEl.appendChild(chip);
        }
      }
    }

    // Core province badge
    if (prov.coreOf !== null && prov.visibility !== 'unexplored') {
      const coreFaction = FACTION_MAP[prov.coreOf];
      if (coreFaction) {
        const coreBadge = document.createElement('span');
        coreBadge.className = 'pmod-stat-chip pmod-core-badge';
        const isPlayerCore = prov.coreOf === state.playerFactionId;
        coreBadge.style.fontWeight = isPlayerCore ? 'bold' : 'normal';
        coreBadge.style.color = coreFaction.textColor ?? coreFaction.color ?? '';
        coreBadge.textContent = `Core: ${coreFaction.emoji ?? ''} ${coreFaction.name}`;
        statsRowEl.appendChild(coreBadge);
      }
    }

    if (prov.militia && prov.visibility === 'visible') {
      const max  = computeMilitiaMax(prov);
      const cur  = prov.militia.current;
      const pct  = max > 0 ? Math.round((cur / max) * 100) : 0;
      const barColor = pct > 66 ? '#4aaa77' : pct > 33 ? '#c8a030' : '#c04040';
      const replenishing = prov.militia.lastCombatTurn !== null && cur < max;

      const milChip = document.createElement('span');
      milChip.className = 'pmod-stat-chip';
      milChip.innerHTML =
        `⚔ Militia: ${cur}/${max} ` +
        `<span style="display:inline-block;width:36px;height:6px;background:var(--border);border-radius:3px;vertical-align:middle;">` +
        `<span style="display:block;width:${pct}%;height:100%;background:${barColor};border-radius:3px;"></span></span>`;
      milChip.title = replenishing ? 'Replenishing +1/turn' : cur >= max ? 'At full strength' : '';
      statsRowEl.appendChild(milChip);
    }
  }
}

function _computeProvinceBreakdown(prov, playerFaction) {
  const biome     = getBiome(prov.biomeId);
  const advResId0 = playerFaction.resources.advanced?.[0]?.id;
  const advResId1 = playerFaction.resources.advanced?.[1]?.id;
  const factionResIds = new Set([
    'research',
    playerFaction.resources.basic.id,
    ...(advResId0 ? [advResId0] : []),
    ...(advResId1 ? [advResId1] : []),
  ]);

  // ── Flat sources (raw, no modifiers) ─────────────────────
  // Keyed by building name to group duplicates.
  const flatAcc = {}; // resId → Map<name, { amount, count }>
  function addFlat(resId, name, amount) {
    if (!factionResIds.has(resId)) return;
    if (!flatAcc[resId]) flatAcc[resId] = new Map();
    const entry = flatAcc[resId].get(name);
    if (entry) {
      entry.amount = parseFloat((entry.amount + amount).toFixed(2));
      entry.count += 1;
    } else {
      flatAcc[resId].set(name, { amount, count: 1 });
    }
  }

  addFlat('gold', 'Province base', 3);

  for (const loc of prov.locations) {
    if (!loc.isControllable) continue;
    for (const { buildingId } of loc.buildings) {
      const bDef = BUILDING_MAP[buildingId];
      if (!bDef) continue;
      for (const [key, val] of Object.entries(bDef.bonuses ?? {})) {
        if (key === 'defense' || key === 'growthSlots') continue;
        let resId = key;
        if (key === 'faction_primary_adv')   resId = advResId0;
        if (key === 'faction_secondary_adv') resId = advResId1;
        if (!resId) continue;
        if (val !== 0) addFlat(resId, bDef.name, parseFloat(val.toFixed(2)));
      }
    }
  }

  // ── Modifiers (biome + status effects) ───────────────────
  const allModifiers = [];
  const resModifiers = {};

  const biomePercent = Math.round((biome.resourceMod - 1) * 100);
  if (biomePercent !== 0) {
    allModifiers.push({ label: biome.name, percent: biomePercent });
  }

  for (const statusEffect of (prov.statusEffects ?? [])) {
    const def = PROVINCE_STATUS_MAP[statusEffect.type];
    for (const eff of (def?.effects ?? [])) {
      if (eff.type !== 'income_percent') continue;
      if (eff.resourceId === 'all') {
        allModifiers.push({ label: def.label, percent: eff.percent });
      } else {
        if (!resModifiers[eff.resourceId]) resModifiers[eff.resourceId] = [];
        resModifiers[eff.resourceId].push({ label: def.label, percent: eff.percent });
      }
    }
  }

  // ── Build result ─────────────────────────────────────────
  const breakdown = {};
  for (const [resId, byName] of Object.entries(flatAcc)) {
    const flat = Array.from(byName.entries()).map(([name, { amount, count }]) => ({
      label:  count > 1 ? `${name} ×${count}` : name,
      amount,
    }));
    const flatTotal   = parseFloat(flat.reduce((s, e) => s + e.amount, 0).toFixed(2));
    const modifiers   = [...allModifiers, ...(resModifiers[resId] ?? [])];
    const combinedPct = modifiers.reduce((s, m) => s + m.percent, 0);
    const factor      = Math.max(0, 1 + combinedPct / 100);
    const total       = parseFloat((flatTotal * factor).toFixed(2));

    breakdown[resId] = { flat, flatTotal, modifiers, total };
  }

  return breakdown;
}

function _computeDefenseStats(prov) {
  const biome = getBiome(prov.biomeId);
  let buildingDef = 0;
  for (const loc of prov.locations) {
    for (const { buildingId } of (loc.buildings ?? [])) {
      const bDef = BUILDING_MAP[buildingId];
      if (bDef?.bonuses?.defense) buildingDef += bDef.bonuses.defense;
    }
  }
  return { biome: biome.terrainDefBonus ?? 0, buildings: buildingDef, total: (biome.terrainDefBonus ?? 0) + buildingDef };
}

// ─── Location rows (all visible, slots inline) ────────────
function _renderLocationRows(prov) {
  locCardsEl.innerHTML = '';
  buildSlotsEl.hidden = true; // slots are now inline with each row

  const isPlayerProvince = prov.ownerId === state.playerFactionId;

  for (const loc of prov.locations) {
    const typeMeta   = LOCATION_TYPES[loc.type] ?? { name: loc.type, emoji: '?' };
    const isLocSel   = _selectedLocId === loc.id;

    const row = document.createElement('div');
    row.className = 'pmod-loc-row';

    // ── Location card ──────────────────────────────
    const locCard = createCard({
      variant: 'location',
      extraClass: isLocSel && !_selectedSlotKey ? 'selected' : '',
      compositeSrc: typeMeta.cardImg ?? null,
      fallbackIcon: typeMeta.emoji,
      fallbackName: loc.type === 'main_settlement' ? prov.name : typeMeta.name,
      fallbackSub: '',
    });
    locCard.addEventListener('mouseenter', () => showLocationTooltip(typeMeta, locCard, loc));
    locCard.addEventListener('mouseleave', hideLocationTooltip);
    locCard.addEventListener('click', () => {
      if (_selectedLocId === loc.id && !_selectedSlotKey) {
        _selectedLocId = null;
      } else {
        _selectedLocId   = loc.id;
        _selectedSlotKey = null;
      }
      _renderLocationRows(prov);
      _renderSidebar(prov);
    });
    row.appendChild(locCard);

    // ── Building slots (only for controllable locations owned by player) ──
    if (isPlayerProvince && LOCATION_TYPES[loc.type]?.isControllable) {
      const sep = document.createElement('div');
      sep.className = 'pmod-row-sep';
      row.appendChild(sep);

      const totalSlots   = getAvailableBuildingSlots(loc, BUILDING_MAP);
      const installedIds = getInstalledBuildingIds(loc);

      for (let slotIdx = 0; slotIdx < totalSlots; slotIdx++) {
        const buildingId = installedIds[slotIdx] ?? null;
        const slotKey    = buildingId ? `slot:${buildingId}:${slotIdx}` : `empty:${slotIdx}`;
        const isSlotSel  = isLocSel && _selectedSlotKey === slotKey;

        if (buildingId) {
          const bDef = BUILDING_MAP[buildingId];
          const card = createCard({
            variant: 'building',
            extraClass: isSlotSel ? 'selected' : '',
            compositeSrc: bDef?.cardImg ?? null,
            fallbackIcon: bDef?.emoji ?? '🏗',
            fallbackName: bDef?.name ?? buildingId,
            fallbackSub: '',
          });
          if (bDef) {
            card.addEventListener('mouseenter', () => showBuildingTooltip(bDef, card, { installed: true }));
            card.addEventListener('mouseleave', hideBuildingTooltip);
          }
          card.addEventListener('click', () => {
            if (isLocSel && _selectedSlotKey === slotKey) {
              _selectedSlotKey = null;
            } else {
              _selectedLocId   = loc.id;
              _selectedSlotKey = slotKey;
            }
            _renderLocationRows(prov);
            _renderSidebar(prov);
          });
          row.appendChild(card);
        } else {
          const emptyCard = document.createElement('div');
          emptyCard.className = `game-card game-card--empty${isSlotSel ? ' selected' : ''}`;
          emptyCard.innerHTML = '<div class="game-card__icon" style="font-size:20px;color:var(--text-muted)">+</div>';
          emptyCard.addEventListener('click', () => {
            if (isLocSel && _selectedSlotKey === slotKey) {
              _selectedSlotKey = null;
            } else {
              _selectedLocId   = loc.id;
              _selectedSlotKey = slotKey;
            }
            _renderLocationRows(prov);
            _renderSidebar(prov);
          });
          row.appendChild(emptyCard);
        }
      }
    }

    locCardsEl.appendChild(row);
  }
}

// ─── Sidebar ──────────────────────────────────────────────
function _renderSidebar(prov) {
  sidebarActEl.innerHTML = '';

  const isPlayerProvince = prov.ownerId === state.playerFactionId;

  // ── Building slot selected ────────────────────────────
  if (_selectedSlotKey && isPlayerProvince) {
    const loc = prov.locations.find(l => l.id === _selectedLocId);
    if (!loc) { _renderRecruit(prov); return; }

    if (_selectedSlotKey.startsWith('slot:')) {
      const [, buildingId] = _selectedSlotKey.split(':');
      _renderSlotActions(prov, loc, buildingId);
      return;
    }
    if (_selectedSlotKey.startsWith('empty:')) {
      _renderEmptySlotBuildMenu(prov, loc);
      return;
    }
  }

  // ── Location selected ─────────────────────────────────
  if (_selectedLocId) {
    const loc = prov.locations.find(l => l.id === _selectedLocId);
    if (!loc) { _renderRecruit(prov); return; }

    switch (loc.type) {
      case 'ruins':
      case 'dense_forest':
      case 'dense_jungle':
      case 'rocky_ground':
      case 'frozen_wastes':
      case 'dry_wastes':
      case 'cleared_monster_den': {
        const clearCost = LOCATION_CLEAR_COSTS[loc.type] ?? { gold: 120, turns: 3 };
        _renderClearAction(prov, loc, clearCost.gold, clearCost.turns, `Clear ${LOCATION_TYPES[loc.type]?.name ?? loc.type}`);
        return;
      }
      case 'empty':
        if (isPlayerProvince) _renderBuildLocationMenu(prov, loc);
        return;
      case 'monster_den':
        _renderMonsterDenSidebar(prov, loc);
        return;
      case 'main_settlement':
        _renderRecruit(prov);
        return;
      default:
        // Controllable types: show convert options
        if (isPlayerProvince && LOCATION_TYPES[loc.type]?.isControllable) {
          _renderConvertMenu(prov, loc);
          return;
        }
    }
  }

  // ── Default: Recruit ──────────────────────────────────
  _renderRecruit(prov);
}

// Returns the required-but-missing main building def if a building is blocked
// solely by its mainBuildingTier, null otherwise.
function _mainBuildingBlocker(bDef, locationType, installedIds) {
  if (bDef.mainBuildingTier == null) return null;
  const chain = LOCATION_MAIN_CHAIN[locationType];
  const reqId = chain?.[bDef.mainBuildingTier - 1];
  if (!reqId || installedIds.includes(reqId)) return null;
  return BUILDING_MAP[reqId] ?? null;
}

// ── Sidebar: occupied slot (upgrade + demolish) ───────────
function _renderSlotActions(prov, loc, buildingId) {
  const bDef       = BUILDING_MAP[buildingId];
  if (!bDef) { _renderRecruit(prov); return; }

  const installedIds = getInstalledBuildingIds(loc);
  const unlockedTechs = getFaction(state.playerFactionId)?.unlockedTechs ?? [];
  const allAvail   = getBuildingsForLocation(state.playerFactionId, loc.type, installedIds)
    .filter(b => !b.techRequired || unlockedTechs.includes(b.techRequired));
  const upgradeDef = allAvail.find(b => b.upgradeFromId === buildingId) ?? null;

  // Find upgrade blocked specifically by mainBuildingTier (all other requirements already met)
  let upgradeDefBlocked = null;
  let upgradeBlockedBy  = null;
  if (!upgradeDef) {
    const candidate = getBuildingsForFaction(state.playerFactionId)
      .find(b => b.allowedLocTypes.includes(loc.type) && b.upgradeFromId === buildingId);
    if (candidate) {
      upgradeBlockedBy = _mainBuildingBlocker(candidate, loc.type, installedIds);
      if (upgradeBlockedBy) upgradeDefBlocked = candidate;
    }
  }

  const queueFull  = (prov.productionQueue?.length ?? 0) >= 5;
  const faction    = FACTION_MAP[state.playerFactionId];
  const allRes     = faction ? [faction.resources.basic, ...faction.resources.advanced] : [];

  const header = document.createElement('div');
  header.className = 'pmod-section-header';
  header.textContent = `${bDef.emoji} ${bDef.name}`;
  sidebarActEl.appendChild(header);

  // ── Upgrade card row ────────────────────────────────
  if (upgradeDef) {
    const alreadyQueued = prov.productionQueue?.some(
      item => item.type === 'building' && item.id === upgradeDef.id
    );
    const costStr = _costStr(upgradeDef.cost, allRes);
    const affordable = canAfford(state.playerFactionId, upgradeDef.cost);

    const row = _makeActionRow({
      cardOpts: {
        variant: 'building',
        compositeSrc: upgradeDef.cardImg ?? null,
        fallbackIcon: upgradeDef.emoji ?? '🏗',
        fallbackName: upgradeDef.name,
        fallbackSub: '',
      },
      name: `↑ ${upgradeDef.name}`,
      costLabel: `${costStr} · ${upgradeDef.buildTurns}t`,
      hint: alreadyQueued ? 'Already queued' : queueFull ? 'Queue full' : !affordable ? "Can't afford" : '',
      disabled: alreadyQueued || queueFull || !affordable,
      affordable,
      onTooltip: (el) => { el.addEventListener('mouseenter', () => showBuildingTooltip(upgradeDef, el, { locationType: loc.type })); el.addEventListener('mouseleave', hideBuildingTooltip); },
      onClick: () => {
        if (!spendResources(state.playerFactionId, upgradeDef.cost)) return;
        enqueueProduction(prov, { type: 'building', id: upgradeDef.id, locationId: loc.id, turnsRemaining: upgradeDef.buildTurns });
        renderResourceBar();
        _render();
      },
    });
    sidebarActEl.appendChild(row);
  }

  // ── Blocked upgrade row ─────────────────────────────
  if (upgradeDefBlocked) {
    const row = _makeActionRow({
      cardOpts: {
        variant: 'building',
        compositeSrc: upgradeDefBlocked.cardImg ?? null,
        fallbackIcon: upgradeDefBlocked.emoji ?? '🏗',
        fallbackName: upgradeDefBlocked.name,
        fallbackSub: '',
      },
      name: `↑ ${upgradeDefBlocked.name}`,
      costLabel: `${_costStr(upgradeDefBlocked.cost, faction ? [faction.resources.basic, ...faction.resources.advanced] : [])} · ${upgradeDefBlocked.buildTurns}t`,
      hint: `Needs ${upgradeBlockedBy.name}`,
      disabled: true,
      affordable: false,
      onTooltip: (el) => { el.addEventListener('mouseenter', () => showBuildingTooltip(upgradeDefBlocked, el, { locationType: loc.type })); el.addEventListener('mouseleave', hideBuildingTooltip); },
    });
    sidebarActEl.appendChild(row);
  }

  // ── Demolish card row ───────────────────────────────
  if (bDef.demolishable !== false) {
    const alreadyQueued = prov.productionQueue?.some(
      item => item.type === 'demolish' && item.id === buildingId
    );
    const refund = Object.entries(bDef.cost ?? {})
      .map(([res, amt]) => {
        const r = allRes.find(r2 => r2.id === res);
        return `${r?.emoji ?? ''}+${Math.floor(amt / 2)}`;
      })
      .join(' ');

    const row = _makeActionRow({
      cardOpts: {
        variant: 'building',
        fallbackIcon: '🔨',
        fallbackName: 'Demolish',
        fallbackSub: '',
      },
      name: 'Demolish',
      costLabel: `${refund} refund · 1t`,
      hint: alreadyQueued ? 'Already queued' : queueFull ? 'Queue full' : '',
      disabled: alreadyQueued || queueFull,
      affordable: true,
      onTooltip: (el) => {
        el.title = `Remove ${bDef.name}. Refunds 50% of build cost.`;
      },
      onClick: () => {
        enqueueProduction(prov, { type: 'demolish', id: buildingId, locationId: loc.id, turnsRemaining: 1 });
        _render();
      },
    });
    sidebarActEl.appendChild(row);
  }
}

// ── Sidebar: empty slot (build menu) ─────────────────────
function _renderEmptySlotBuildMenu(prov, loc) {
  const installedIds  = getInstalledBuildingIds(loc);
  const unlockedTechs = getFaction(state.playerFactionId)?.unlockedTechs ?? [];
  const available     = getBuildingsForLocation(state.playerFactionId, loc.type, installedIds)
    .filter(b => b.upgradeFromId === null && (!b.techRequired || unlockedTechs.includes(b.techRequired)));
  const availableIds = new Set(available.map(b => b.id));

  // Tier-1 buildings blocked only by mainBuildingTier (all other prerequisites met)
  const blocked = getBuildingsForFaction(state.playerFactionId)
    .filter(b =>
      b.allowedLocTypes.includes(loc.type) &&
      b.upgradeFromId === null &&
      !installedIds.includes(b.id) &&
      !availableIds.has(b.id) &&
      _mainBuildingBlocker(b, loc.type, installedIds) !== null
    );

  const queueFull    = (prov.productionQueue?.length ?? 0) >= 5;
  const faction      = FACTION_MAP[state.playerFactionId];
  const allRes       = faction ? [faction.resources.basic, ...faction.resources.advanced] : [];

  const header = document.createElement('div');
  header.className = 'pmod-section-header';
  header.textContent = 'Build';
  sidebarActEl.appendChild(header);

  if (available.length === 0 && blocked.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'pmod-empty-hint';
    hint.textContent = 'No buildings available for this location.';
    sidebarActEl.appendChild(hint);
    return;
  }

  for (const bDef of [...available, ...blocked]) {
    const isBlocked    = !availableIds.has(bDef.id);
    const blockedByDef = isBlocked ? _mainBuildingBlocker(bDef, loc.type, installedIds) : null;
    const affordable = canAfford(state.playerFactionId, bDef.cost);
    const costStr    = _costStr(bDef.cost, allRes);
    const alreadyQ   = prov.productionQueue?.some(i => i.type === 'building' && i.id === bDef.id);

    const row = _makeActionRow({
      cardOpts: { variant: 'building', compositeSrc: bDef.cardImg ?? null, fallbackIcon: bDef.emoji ?? '🏗', fallbackName: bDef.name, fallbackSub: '' },
      name: bDef.name,
      costLabel: `${costStr} · ${bDef.buildTurns}t`,
      hint: isBlocked
        ? `Needs ${blockedByDef?.name ?? '???'}`
        : alreadyQ ? 'Already queued' : queueFull ? 'Queue full' : !affordable ? "Can't afford" : '',
      disabled: isBlocked || alreadyQ || queueFull || !affordable,
      affordable: !isBlocked && affordable,
      onTooltip: (el) => { el.addEventListener('mouseenter', () => showBuildingTooltip(bDef, el, { locationType: loc.type })); el.addEventListener('mouseleave', hideBuildingTooltip); },
      onClick: !isBlocked ? () => {
        if (!spendResources(state.playerFactionId, bDef.cost)) return;
        enqueueProduction(prov, { type: 'building', id: bDef.id, locationId: loc.id, turnsRemaining: bDef.buildTurns });
        renderResourceBar();
        _selectedSlotKey = null;
        _render();
      } : null,
    });
    sidebarActEl.appendChild(row);
  }
}

// ── Sidebar: clear ruins / blockers / cleared den ────────
function _renderClearAction(prov, loc, goldCost, turns, label) {
  if (prov.ownerId !== state.playerFactionId) return;

  const clearTechId   = LOCATION_CLEAR_TECH_REQ[loc.type];
  const unlockedTechs = getFaction(state.playerFactionId)?.unlockedTechs ?? [];
  const hasTech       = !clearTechId || unlockedTechs.includes(clearTechId);

  const cost       = { gold: goldCost };
  const affordable = canAfford(state.playerFactionId, cost);
  const queueFull  = (prov.productionQueue?.length ?? 0) >= 5;
  const alreadyQ   = prov.productionQueue?.some(i => i.type === 'clear_location' && i.locationId === loc.id);
  const typeMeta   = LOCATION_TYPES[loc.type];

  const header = document.createElement('div');
  header.className = 'pmod-section-header';
  header.textContent = typeMeta?.name ?? loc.type;
  sidebarActEl.appendChild(header);

  // Build hint — tech missing gets a clickable span instead of plain text
  let hintText = '';
  let hintTechId = null;
  if (alreadyQ)       hintText = 'Already queued';
  else if (queueFull) hintText = 'Queue full';
  else if (!hasTech)  hintTechId = clearTechId;
  else if (!affordable) hintText = "Can't afford";

  const row = _makeActionRow({
    cardOpts: { variant: 'location', compositeSrc: typeMeta?.cardImg ?? null, fallbackIcon: '🧹', fallbackName: label, fallbackSub: '' },
    name: label,
    costLabel: `💰${goldCost} · ${turns}t`,
    hint: hintText,
    hintTechId,
    disabled: alreadyQ || queueFull || !hasTech || !affordable,
    affordable: hasTech && affordable,
    onTooltip: (el) => { if (typeMeta) { el.addEventListener('mouseenter', () => showLocationTooltip(typeMeta, el, loc)); el.addEventListener('mouseleave', hideLocationTooltip); } },
    onClick: () => {
      if (!hasTech || !spendResources(state.playerFactionId, cost)) return;
      enqueueProduction(prov, { type: 'clear_location', locationId: loc.id, turnsRemaining: turns, goldCost });
      renderResourceBar();
      _selectedLocId   = null;
      _selectedSlotKey = null;
      _render();
    },
  });
  sidebarActEl.appendChild(row);
}

// ── Sidebar: build on empty plot ─────────────────────────
function _renderBuildLocationMenu(prov, loc) {
  const queueFull = (prov.productionQueue?.length ?? 0) >= 5;

  const header = document.createElement('div');
  header.className = 'pmod-section-header';
  header.textContent = 'Build Location';
  sidebarActEl.appendChild(header);

  for (const [locType, cost] of Object.entries(LOCATION_BUILD_COSTS)) {
    const typeMeta   = LOCATION_TYPES[locType];
    const turns      = LOCATION_BUILD_TURNS[locType] ?? 2;
    const affordable = canAfford(state.playerFactionId, cost);
    const alreadyQ   = prov.productionQueue?.some(i => i.type === 'build_location' && i.locationId === loc.id);

    const row = _makeActionRow({
      cardOpts: { variant: 'location', compositeSrc: typeMeta?.cardImg ?? null, fallbackIcon: typeMeta?.emoji ?? '🏗', fallbackName: typeMeta?.name ?? locType, fallbackSub: '' },
      name: typeMeta?.name ?? locType,
      costLabel: `💰${cost.gold} · ${turns}t`,
      hint: alreadyQ ? 'Already queued' : queueFull ? 'Queue full' : !affordable ? "Can't afford" : '',
      disabled: alreadyQ || queueFull || !affordable,
      affordable,
      onTooltip: (el) => { if (typeMeta) { el.addEventListener('mouseenter', () => showLocationTooltip(typeMeta, el, loc)); el.addEventListener('mouseleave', hideLocationTooltip); } },
      onClick: () => {
        if (!spendResources(state.playerFactionId, cost)) return;
        enqueueProduction(prov, { type: 'build_location', locationId: loc.id, locationType: locType, turnsRemaining: turns });
        renderResourceBar();
        _selectedLocId   = null;
        _selectedSlotKey = null;
        _render();
      },
    });
    sidebarActEl.appendChild(row);
  }
}

// ── Sidebar: convert existing controllable location ───────
function _renderConvertMenu(prov, loc) {
  const queueFull  = (prov.productionQueue?.length ?? 0) >= 5;
  const currentType = loc.type;

  const header = document.createElement('div');
  header.className = 'pmod-section-header';
  header.textContent = `Convert ${LOCATION_TYPES[currentType]?.name ?? currentType}`;
  sidebarActEl.appendChild(header);

  const note = document.createElement('div');
  note.style.cssText = 'font-size:10px;color:var(--text-muted);margin-bottom:6px;';
  note.textContent = 'Converting clears all existing buildings.';
  sidebarActEl.appendChild(note);

  for (const [locType, cost] of Object.entries(LOCATION_BUILD_COSTS)) {
    if (locType === currentType) continue;
    const typeMeta   = LOCATION_TYPES[locType];
    const turns      = LOCATION_BUILD_TURNS[locType] ?? 2;
    const affordable = canAfford(state.playerFactionId, cost);
    const alreadyQ   = prov.productionQueue?.some(i => i.type === 'build_location' && i.locationId === loc.id);

    const row = _makeActionRow({
      cardOpts: { variant: 'location', compositeSrc: typeMeta?.cardImg ?? null, fallbackIcon: typeMeta?.emoji ?? '🏗', fallbackName: typeMeta?.name ?? locType, fallbackSub: '' },
      name: `→ ${typeMeta?.name ?? locType}`,
      costLabel: `💰${cost.gold} · ${turns}t`,
      hint: alreadyQ ? 'Already queued' : queueFull ? 'Queue full' : !affordable ? "Can't afford" : '',
      disabled: alreadyQ || queueFull || !affordable,
      affordable,
      onTooltip: (el) => { if (typeMeta) { el.addEventListener('mouseenter', () => showLocationTooltip(typeMeta, el, loc)); el.addEventListener('mouseleave', hideLocationTooltip); } },
      onClick: () => {
        if (!spendResources(state.playerFactionId, cost)) return;
        enqueueProduction(prov, { type: 'build_location', locationId: loc.id, locationType: locType, turnsRemaining: turns });
        renderResourceBar();
        _selectedLocId   = null;
        _selectedSlotKey = null;
        _render();
      },
    });
    sidebarActEl.appendChild(row);
  }
}

// ── Sidebar: monster den ──────────────────────────────────
function _renderMonsterDenSidebar(prov, loc) {
  const den = loc.denEnemies;

  const header = document.createElement('div');
  header.className = 'pmod-section-header';
  header.textContent = 'Monster Den';
  sidebarActEl.appendChild(header);

  // Enemy composition
  if (den) {
    const monDef     = MONSTER_UNITS[den.unitId];
    const activeCount  = den.hp.length;
    const woundedCount = den.woundedHp.length;
    const total        = activeCount + woundedCount;

    const denInfo = document.createElement('div');
    denInfo.className = 'pmod-den-header';

    if (monDef) {
      const monCard = createCard({
        variant: 'unit',
        backgroundSrc: NEUTRAL.unitCardBgImg ?? null,
        foregroundSrc: monDef.cardSpriteImg ?? null,
        fallbackIcon: monDef.emoji,
        fallbackName: monDef.name,
        fallbackSub: `⚔${monDef.attack} 🛡${monDef.defense}`,
      });
      monCard.addEventListener('mouseenter', () =>
        showUnitTooltip(monDef, NEUTRAL, monCard)
      );
      monCard.addEventListener('mouseleave', hideUnitTooltip);
      denInfo.appendChild(monCard);

      const infoText = document.createElement('div');
      infoText.style.cssText = 'font-size:12px;color:var(--text);';
      infoText.innerHTML = `<strong>${total}× ${monDef.name}</strong><br>
        <span style="color:var(--text-muted);font-size:10px">${activeCount} active, ${woundedCount} wounded</span>`;
      denInfo.appendChild(infoText);
    }

    sidebarActEl.appendChild(denInfo);
  }

  // Armies in province
  const armies = getArmiesInProvince(prov.id)
    .filter(a => a.factionId === state.playerFactionId);

  const armyHeader = document.createElement('div');
  armyHeader.style.cssText = 'font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:8px 0 4px;';
  armyHeader.textContent   = 'Select Army to Fight';
  sidebarActEl.appendChild(armyHeader);

  if (armies.length === 0) {
    const noArmy = document.createElement('div');
    noArmy.className   = 'pmod-no-armies';
    noArmy.textContent = 'No armies in this province.';
    sidebarActEl.appendChild(noArmy);
    return;
  }

  for (const army of armies) {
    const unitCount = army.units?.reduce((s, u) => s + (u.count ?? 0), 0) ?? 0;

    const row = document.createElement('div');
    row.className = 'pmod-army-row';
    row.innerHTML  = `<span>${army.name ?? 'Army'} (${unitCount} units)</span>`;

    const fightBtn = document.createElement('button');
    fightBtn.className   = 'btn-primary';
    fightBtn.textContent = '⚔ Fight';
    fightBtn.addEventListener('click', () => {
      const result = resolveMonsterDenCombat(army.id, loc.id, prov.id);
      if (!result) return;

      // Freeze army after combat so it can't also move this turn
      army.attackedThisTurn = true;

      renderResourceBar();
      renderArmyPanel();
      hideProvinceModal();
      showDenCombatReportModal(result);
    });
    row.appendChild(fightBtn);
    sidebarActEl.appendChild(row);
  }
}

// ── Sidebar: recruit ──────────────────────────────────────
function _renderRecruit(prov) {
  if (prov.ownerId !== state.playerFactionId || prov.visibility !== 'visible') return;

  const queueFull = (prov.productionQueue?.length ?? 0) >= 5;
  const faction   = FACTION_MAP[state.playerFactionId];
  const allRes    = faction ? [faction.resources.basic, ...faction.resources.advanced] : [];

  const fs = getFaction(state.playerFactionId);
  const unlockedTechs = fs?.unlockedTechs ?? [];
  const obsoletedUnits = new Set(
    (fs?.appliedTechEffects ?? []).flatMap(e => e.obsoleteUnits ?? [])
  );

  const seen  = new Set();
  const units = [];
  for (const loc of prov.locations) {
    if (!loc.isControllable) continue;
    const installedIds = getInstalledBuildingIds(loc);
    for (const uDef of getRecruitableUnits(state.playerFactionId, installedIds, loc.type)) {
      if (seen.has(uDef.id)) continue;
      if (uDef.techRequired && !unlockedTechs.includes(uDef.techRequired)) continue;
      if (obsoletedUnits.has(uDef.id)) continue;
      seen.add(uDef.id);
      units.push({ uDef, locationId: loc.id });
    }
  }

  if (units.length === 0) {
    const hint = document.createElement('div');
    hint.className   = 'pmod-empty-hint';
    hint.textContent = 'No units available to recruit.';
    sidebarActEl.appendChild(hint);
    return;
  }

  const header = document.createElement('div');
  header.className   = 'pmod-section-header';
  header.textContent = 'Recruit Units';
  sidebarActEl.appendChild(header);

  for (const { uDef, locationId } of units) {
    const affordable  = canAfford(state.playerFactionId, uDef.cost) && !queueFull;
    const stackSize   = uDef.stackSize ?? 1;
    const displayName = stackSize > 1 ? `${stackSize}× ${uDef.name}` : uDef.name;
    const costStr     = _costStr(uDef.cost, allRes);

    const row = document.createElement('div');
    row.className = 'pmod-recruit-row';

    const { attack: effAtk, defense: effDef } = getEffectiveUnitStats(uDef.id, state.playerFactionId, UNIT_MAP);
    const card = createCard({
      variant: 'unit',
      backgroundSrc: faction?.unitCardBgImg ?? null,
      foregroundSrc: uDef.cardSpriteImg ?? null,
      fallbackIcon: uDef.emoji ?? '⚔',
      fallbackName: uDef.name,
      fallbackSub: `⚔${effAtk} 🛡${effDef}`,
    });
    card.addEventListener('mouseenter', () => showUnitTooltip(uDef, faction, card, null, null, effAtk, effDef));
    card.addEventListener('mouseleave', hideUnitTooltip);
    row.appendChild(card);

    const info = document.createElement('div');
    info.className = 'pmod-recruit-info';
    info.innerHTML = `
      <span class="pmod-recruit-name">${displayName}</span>
      <span class="pmod-recruit-stats">⚔${uDef.attack} 🛡${uDef.defense} ❤${uDef.maxHp ?? 10}</span>
      <span style="font-size:10px;color:var(--text-muted)">${costStr} · ${uDef.buildTurns}t</span>
    `;
    row.appendChild(info);

    const btn = document.createElement('button');
    btn.className   = 'card-action-btn';
    btn.textContent = 'Recruit';
    btn.disabled    = !affordable;
    btn.title       = !affordable ? (queueFull ? 'Queue full' : "Can't afford") : `Recruit ×${stackSize}`;
    btn.addEventListener('click', () => {
      if (!spendResources(state.playerFactionId, uDef.cost)) return;
      enqueueProduction(prov, { type: 'unit', id: uDef.id, locationId, turnsRemaining: uDef.buildTurns });
      renderResourceBar();
      _render();
    });
    row.appendChild(btn);

    sidebarActEl.appendChild(row);
  }
}

// ─── Queue row (bottom) ───────────────────────────────────
function _renderQueue(prov) {
  queueSlotsEl.innerHTML = '';

  const faction = FACTION_MAP[state.playerFactionId];
  const isPlayer = prov.ownerId === state.playerFactionId && prov.visibility === 'visible';

  for (let i = 0; i < 5; i++) {
    const item = isPlayer ? (prov.productionQueue[i] ?? null) : null;

    const slot = document.createElement('div');
    slot.className = 'pmod-queue-slot';

    if (item) {
      let bDef, uDef, card, refundCost;

      if (item.type === 'building') {
        bDef = BUILDING_MAP[item.id];
        card = createCard({ variant: 'building', compositeSrc: bDef?.cardImg ?? null, fallbackIcon: bDef?.emoji ?? '🏗', fallbackName: '', fallbackSub: '' });
        refundCost = bDef?.cost ?? {};
        if (bDef) { card.addEventListener('mouseenter', () => showBuildingTooltip(bDef, card)); card.addEventListener('mouseleave', hideBuildingTooltip); }
      } else if (item.type === 'unit') {
        uDef = UNIT_MAP[item.id];
        card = createCard({ variant: 'unit', backgroundSrc: faction?.unitCardBgImg ?? null, foregroundSrc: uDef?.cardSpriteImg ?? null, fallbackIcon: uDef?.emoji ?? '⚔', fallbackName: '', fallbackSub: '' });
        refundCost = uDef?.cost ?? {};
        if (uDef) { card.addEventListener('mouseenter', () => showUnitTooltip(uDef, faction, card)); card.addEventListener('mouseleave', hideUnitTooltip); }
      } else if (item.type === 'clear_location') {
        card = createCard({ variant: 'location', fallbackIcon: '🧹', fallbackName: 'Clearing', fallbackSub: '' });
        refundCost = item.goldCost ? { gold: item.goldCost } : {};
      } else if (item.type === 'build_location') {
        const tMeta = LOCATION_TYPES[item.locationType];
        card = createCard({ variant: 'location', compositeSrc: tMeta?.cardImg ?? null, fallbackIcon: tMeta?.emoji ?? '🏗', fallbackName: '', fallbackSub: '' });
        refundCost = LOCATION_BUILD_COSTS[item.locationType] ?? {};
      } else {
        // demolish
        bDef = BUILDING_MAP[item.id];
        card = createCard({ variant: 'building', fallbackIcon: '🔨', fallbackName: '', fallbackSub: '' });
        refundCost = {};
        if (bDef) { card.title = `Raze ${bDef.name}`; }
      }

      const turnsEl = document.createElement('div');
      turnsEl.className   = 'game-card__queue-turns';
      turnsEl.textContent = `${item.turnsRemaining}t`;
      card.appendChild(turnsEl);
      slot.appendChild(card);

      const cancelBtn = document.createElement('button');
      cancelBtn.className   = 'card-action-btn card-action-btn--cancel';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.title = item.type === 'demolish' ? 'Cancel (no refund)' : 'Cancel & refund';
      cancelBtn.addEventListener('click', () => {
        dequeueProduction(prov, i);
        if (item.type !== 'demolish' && Object.keys(refundCost).length > 0) {
          addResources(state.playerFactionId, refundCost);
        }
        renderResourceBar();
        _render();
      });
      slot.appendChild(cancelBtn);
    } else {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'game-card game-card--empty';
      slot.appendChild(emptyCard);
    }

    queueSlotsEl.appendChild(slot);
  }
}

// ─── Helpers ──────────────────────────────────────────────

function _costStr(cost, allRes) {
  return Object.entries(cost ?? {})
    .map(([res, amt]) => {
      const r = allRes.find(r2 => r2.id === res);
      return `${r?.emoji ?? ''}${amt}`;
    })
    .join(' ');
}

/**
 * Create a standardised action card row for the sidebar.
 * @param {{ cardOpts, name, costLabel, hint, hintTechId, disabled, affordable, onTooltip, onClick }} opts
 */
function _makeActionRow(opts) {
  const { cardOpts, name, costLabel, hint, hintTechId, disabled, affordable, onTooltip, onClick } = opts;

  const row = document.createElement('div');
  row.className = `pmod-action-row${disabled ? ' disabled' : ''}${!disabled ? (affordable ? ' can-afford' : ' cannot-afford') : ''}`;

  const cardWrap = document.createElement('div');
  cardWrap.className = 'pmod-action-card-wrap';

  const card = createCard(cardOpts);
  if (onTooltip) onTooltip(card);
  cardWrap.appendChild(card);
  row.appendChild(cardWrap);

  const info = document.createElement('div');
  info.className = 'pmod-action-info';

  const nameEl = document.createElement('div');
  nameEl.className   = 'pmod-action-name';
  nameEl.textContent = name;
  info.appendChild(nameEl);

  if (costLabel) {
    const costEl = document.createElement('div');
    costEl.className   = 'pmod-action-cost';
    costEl.textContent = costLabel;
    info.appendChild(costEl);
  }

  if (hint) {
    const hintEl = document.createElement('div');
    hintEl.className   = 'pmod-action-hint';
    hintEl.textContent = hint;
    info.appendChild(hintEl);
  }

  if (hintTechId) {
    const hintEl = document.createElement('div');
    hintEl.className = 'pmod-action-hint';
    hintEl.append('Needs: ');
    const techLink = document.createElement('span');
    techLink.className   = 'pmod-action-hint-link';
    techLink.textContent = TECH_MAP[hintTechId]?.name ?? hintTechId;
    techLink.addEventListener('click', (e) => {
      e.stopPropagation();
      showResearchModalAndHighlight(hintTechId);
    });
    hintEl.appendChild(techLink);
    info.appendChild(hintEl);
  }

  row.appendChild(info);

  if (!disabled && onClick) {
    row.addEventListener('click', onClick);
  }

  return row;
}
