/**
 * province-panel.js
 *
 * Renders the right-side province detail panel when a province is selected.
 * Shows:
 *   - Province name, biome, owner
 *   - Province resource summary (player provinces only)
 *   - Location cards with building slot expansion
 *   - Recruit section (province-level)
 *   - Production queue (5-slot card grid)
 */

import {
  state,
  getProvince,
  canAfford,
  spendResources,
  addResources,
  computeMilitiaMax,
} from '../engine/game-state.js';
import { FACTION_MAP, NEUTRAL } from '../data/factions-data.js';
import { getBiome } from '../data/biomes-data.js';
import {
  LOCATION_TYPES,
  getInstalledBuildingIds,
  getAvailableBuildingSlots,
  getLocationResourceBonuses,
} from '../models/location.js';
import { enqueueProduction, dequeueProduction } from '../models/province.js';
import { BUILDING_MAP, getBuildingsForLocation } from '../data/buildings-data.js';
import { getRecruitableUnits, UNIT_MAP, getMilitiaUnitIdForFaction } from '../data/units-data.js';
import { renderResourceBar } from './resource-bar.js';
import { showBuildingTooltip, hideBuildingTooltip, showUnitTooltip, hideUnitTooltip } from './tooltips.js';
import { createCard } from './card-renderer.js';

const emptyEl = document.getElementById('province-panel-empty');
const contentEl = document.getElementById('province-panel-content');
const nameEl = document.getElementById('province-name');
const biomeIconEl = document.getElementById('province-biome-icon');
const biomeLabelEl = document.getElementById('province-biome-label');
const ownerBadgeEl = document.getElementById('province-owner-badge');
const locationListEl = document.getElementById('location-list');
const resourceSummaryEl = document.getElementById('province-resource-summary');
const recruitSectionEl = document.getElementById('recruit-section');
const recruitListEl = document.getElementById('recruit-list');
const queueSectionEl = document.getElementById('production-queue-section');
const queueListEl = document.getElementById('production-queue-list');
const militiaInfoEl = document.getElementById('province-militia-info');

let _expandedLocId = null;

export function showProvincePanel(provinceId) {
  const prov = getProvince(provinceId);
  if (!prov || prov.visibility === 'unexplored') {
    hideProvincePanel();
    return;
  }

  const biome = getBiome(prov.biomeId);
  const faction = FACTION_MAP[prov.ownerId] ?? NEUTRAL;

  emptyEl.hidden = true;
  contentEl.hidden = false;

  nameEl.textContent = prov.name;
  biomeIconEl.textContent = biome.emoji;
  biomeLabelEl.textContent = `${biome.name} · ${biome.description}`;
  ownerBadgeEl.textContent = faction.name;
  ownerBadgeEl.style.color = faction.textColor ?? faction.color;
  ownerBadgeEl.style.borderColor = faction.color;

  if (prov.visibility === 'visible' && prov.militia) {
    const max = computeMilitiaMax(prov);
    const cur = prov.militia.current;
    const pct = max > 0 ? Math.round((cur / max) * 100) : 0;
    const militiaCountEl = militiaInfoEl.querySelector('.militia-count');
    militiaCountEl.textContent = `${cur} / ${max} units`;
    const replenishing = prov.militia.lastCombatTurn !== null && cur < max;
    militiaInfoEl.querySelector('.militia-status').textContent = replenishing ? '(replenishing +1/turn)' : '';
    const fill = militiaInfoEl.querySelector('.militia-fill');
    fill.style.width = `${pct}%`;
    fill.style.background = pct > 66 ? '#4aaa77' : pct > 33 ? '#c8a030' : '#c04040';

    const militiaUnitId = getMilitiaUnitIdForFaction(prov.ownerId ?? 'neutral');
    const militiaDef = UNIT_MAP[militiaUnitId];
    militiaCountEl.onmouseenter = () => {
      if (!militiaDef) return;
      showUnitTooltip(militiaDef, faction, militiaCountEl);
    };
    militiaCountEl.onmouseleave = () => hideUnitTooltip();
    militiaCountEl.style.cursor = militiaDef ? 'help' : 'default';

    militiaInfoEl.hidden = false;
  } else {
    const militiaCountEl = militiaInfoEl.querySelector('.militia-count');
    militiaCountEl.onmouseenter = null;
    militiaCountEl.onmouseleave = null;
    militiaInfoEl.hidden = true;
  }

  const isPlayerProvince = prov.ownerId === state.playerFactionId;
  const isVisible = prov.visibility === 'visible';

  if (isPlayerProvince && isVisible) {
    renderResourceSummary(prov);
  } else {
    resourceSummaryEl.hidden = true;
  }

  renderLocations(prov);
  renderRecruitSection(prov);
  renderProductionQueue(prov);
}

export function hideProvincePanel() {
  emptyEl.hidden = false;
  contentEl.hidden = true;
  _expandedLocId = null;
}

function renderResourceSummary(prov) {
  const biome = getBiome(prov.biomeId);
  const playerFaction = FACTION_MAP[state.playerFactionId];
  if (!playerFaction) {
    resourceSummaryEl.hidden = true;
    return;
  }

  const factionResIds = new Set([
    playerFaction.resources.basic.id,
    ...playerFaction.resources.advanced.map(r => r.id),
  ]);
  const allResById = {
    [playerFaction.resources.basic.id]: playerFaction.resources.basic,
  };
  for (const r of playerFaction.resources.advanced) allResById[r.id] = r;

  // Base income: every owned province contributes +3 gold
  const totals = { gold: 3 };
  for (const loc of prov.locations) {
    if (!loc.isControllable) continue;
    const bonuses = getLocationResourceBonuses(loc, BUILDING_MAP);
    for (const [res, amt] of Object.entries(bonuses)) {
      if (!factionResIds.has(res)) continue;
      totals[res] = (totals[res] ?? 0) + Math.round(amt * biome.resourceMod);
    }
  }

  const chips = Object.entries(totals).filter(([, amt]) => amt > 0);
  if (chips.length === 0) {
    resourceSummaryEl.hidden = true;
    return;
  }

  resourceSummaryEl.innerHTML = chips
    .map(([resId, amt]) => {
      const resDef = allResById[resId];
      return `<span class="province-res-chip">${resDef?.emoji ?? ''} <strong>+${amt}</strong>/t</span>`;
    })
    .join('');
  resourceSummaryEl.hidden = false;
}

function renderLocations(prov) {
  locationListEl.innerHTML = '';

  const isPlayerProvince = prov.ownerId === state.playerFactionId;
  const isVisible = prov.visibility === 'visible';

  const cardRow = document.createElement('div');
  cardRow.className = 'card-grid';

  for (const loc of prov.locations) {
    const typeMeta = LOCATION_TYPES[loc.type] ?? { name: loc.type, emoji: '?' };
    const isExpanded = _expandedLocId === loc.id;

    const card = createCard({
      variant: 'location',
      extraClass: isExpanded ? 'selected' : '',
      compositeSrc: typeMeta.cardImg ?? null,
      fallbackIcon: typeMeta.emoji,
      fallbackName: loc.type === 'main_settlement' ? prov.name : typeMeta.name,
      fallbackSub: '',
    });
    card.title = typeMeta.name;

    card.addEventListener('click', () => {
      _expandedLocId = isExpanded ? null : loc.id;
      showProvincePanel(prov.id);
    });

    cardRow.appendChild(card);
  }

  locationListEl.appendChild(cardRow);

  // Only expand building slots for provinces the player controls.
  // Visible enemy provinces show location cards but not their building details.
  if (_expandedLocId && isVisible && isPlayerProvince) {
    const loc = prov.locations.find(l => l.id === _expandedLocId);
    if (loc && LOCATION_TYPES[loc.type]?.isControllable) {
      const expansion = document.createElement('div');
      expansion.className = 'location-expansion';
      expansion.appendChild(renderBuildingSlots(prov, loc, isPlayerProvince));
      locationListEl.appendChild(expansion);
    }
  }
}

function renderBuildingSlots(prov, loc, isPlayerProvince) {
  const wrap = document.createElement('div');
  wrap.className = 'building-slots-grid';

  const totalSlots = getAvailableBuildingSlots(loc, BUILDING_MAP);
  const installedIds = getInstalledBuildingIds(loc);
  const queueFull = (prov.productionQueue?.length ?? 0) >= 5;

  // Pre-compute all available buildings once for upgrade detection
  const availableForLoc = isPlayerProvince
    ? getBuildingsForLocation(state.playerFactionId, loc.type, installedIds)
    : [];

  for (const bId of installedIds) {
    const bDef = BUILDING_MAP[bId];
    const isQueuedForDemolish = prov.productionQueue?.some(
      item => item.type === 'demolish' && item.id === bId
    );

    // Find the direct upgrade for this building (if any is currently buildable)
    const upgradeDef = availableForLoc.find(b => b.upgradeFromId === bId) ?? null;
    const isQueuedForUpgrade = upgradeDef
      ? prov.productionQueue?.some(item => item.type === 'building' && item.id === upgradeDef.id)
      : false;

    const cwa = document.createElement('div');
    cwa.className = 'card-with-action';

    const artCard = createCard({
      variant: 'building',
      compositeSrc: bDef?.cardImg ?? null,
      fallbackIcon: bDef?.emoji ?? '🏗',
      fallbackName: bDef?.name ?? bId,
      fallbackSub: '',
    });

    if (bDef) {
      artCard.addEventListener('mouseenter', () => showBuildingTooltip(bDef, artCard));
      artCard.addEventListener('mouseleave', hideBuildingTooltip);
    }

    cwa.appendChild(artCard);

    // Upgrade button — shown when an upgrade exists for this building
    if (isPlayerProvince && upgradeDef) {
      const upgradeBtn = document.createElement('button');
      upgradeBtn.className = 'card-action-btn card-action-btn--upgrade';
      upgradeBtn.textContent = '↑ Upgrade';
      upgradeBtn.disabled = queueFull || isQueuedForUpgrade;
      upgradeBtn.title = isQueuedForUpgrade
        ? `${upgradeDef.name} already queued`
        : queueFull
          ? 'Queue full (max 5)'
          : `Upgrade to ${upgradeDef.name}`;
      upgradeBtn.addEventListener('click', () => openBuildMenu(prov, loc, wrap, bId));
      cwa.appendChild(upgradeBtn);
    }

    // Demolish button — only for demolishable buildings
    if (isPlayerProvince && bDef && bDef.demolishable !== false) {
      const btn = document.createElement('button');
      btn.className = 'card-action-btn card-action-btn--danger';
      btn.textContent = 'Demolish';
      btn.title = isQueuedForDemolish
        ? 'Already queued for demolition'
        : queueFull
          ? 'Queue full (max 5)'
          : `Demolish ${bDef.name} - 1 turn, refunds 50% cost`;
      btn.disabled = queueFull || isQueuedForDemolish;
      btn.addEventListener('click', () => {
        enqueueProduction(prov, {
          type: 'demolish',
          id: bId,
          locationId: loc.id,
          turnsRemaining: 1,
        });
        showProvincePanel(prov.id);
      });
      cwa.appendChild(btn);
    }

    wrap.appendChild(cwa);
  }

  const emptyCount = Math.max(0, totalSlots - installedIds.length);
  for (let i = 0; i < emptyCount; i++) {
    const cwa = document.createElement('div');
    cwa.className = 'card-with-action';

    const card = document.createElement('div');
    card.className = 'game-card game-card--empty';
    card.innerHTML = '<div class="game-card__icon" style="font-size:14px;color:var(--text-muted)">+</div>';
    cwa.appendChild(card);

    if (isPlayerProvince) {
      const btn = document.createElement('button');
      btn.className = 'card-action-btn';
      btn.textContent = '+ Build';
      btn.disabled = queueFull;
      btn.title = queueFull ? 'Queue full (max 5)' : 'Queue a building';
      btn.addEventListener('click', () => openBuildMenu(prov, loc, wrap));
      cwa.appendChild(btn);
    }

    wrap.appendChild(cwa);
  }

  return wrap;
}

/**
 * Open the build/upgrade popup.
 * @param {string|null} upgradeFromBuildingId  When set, only show the upgrade for that building.
 *                                             When null, only show base (non-upgrade) buildings.
 */
function openBuildMenu(prov, loc, slotsWrap, upgradeFromBuildingId = null) {
  slotsWrap.querySelectorAll('.build-menu-popup').forEach(el => el.remove());

  const installedIds = getInstalledBuildingIds(loc);
  const allAvailable = getBuildingsForLocation(state.playerFactionId, loc.type, installedIds);

  // Upgrades are surfaced via the Upgrade button on installed cards;
  // the empty-slot Build menu only offers brand-new (non-upgrade) buildings.
  const available = upgradeFromBuildingId
    ? allAvailable.filter(b => b.upgradeFromId === upgradeFromBuildingId)
    : allAvailable.filter(b => b.upgradeFromId === null);

  const faction = FACTION_MAP[state.playerFactionId];

  const menuEl = document.createElement('div');
  menuEl.className = 'build-menu-popup';

  if (available.length === 0) {
    menuEl.innerHTML = '<p style="font-size:11px;color:var(--text-muted)">No buildings available.</p>';
  } else {
    for (const bDef of available) {
      const queueFull = prov.productionQueue.length >= 5;
      const canBuild = canAfford(state.playerFactionId, bDef.cost) && !queueFull;
      const allRes = faction ? [faction.resources.basic, ...faction.resources.advanced] : [];
      const costStr = Object.entries(bDef.cost)
        .map(([res, amt]) => {
          const r = allRes.find(r2 => r2.id === res);
          return `${r?.emoji ?? ''}${amt}`;
        })
        .join(' ');

      const row = document.createElement('div');
      row.className = 'build-menu-row';
      row.innerHTML = `
        <span class="bm-icon">${bDef.emoji}</span>
        <span class="bm-name">${bDef.name}</span>
        <span class="bm-cost">${costStr} · ${bDef.buildTurns}t</span>
      `;

      const nameEl2 = row.querySelector('.bm-name');
      nameEl2.addEventListener('mouseenter', () => showBuildingTooltip(bDef, nameEl2));
      nameEl2.addEventListener('mouseleave', hideBuildingTooltip);

      const btn = document.createElement('button');
      btn.className = 'card-action-btn';
      btn.textContent = 'Queue';
      btn.disabled = !canBuild;
      btn.title = !canBuild ? (queueFull ? 'Queue full' : 'Cannot afford') : bDef.description;
      btn.addEventListener('click', () => {
        if (!spendResources(state.playerFactionId, bDef.cost)) return;
        enqueueProduction(prov, {
          type: 'building',
          id: bDef.id,
          locationId: loc.id,
          turnsRemaining: bDef.buildTurns,
        });
        menuEl.remove();
        showProvincePanel(prov.id);
        renderResourceBar();
      });

      row.appendChild(btn);
      menuEl.appendChild(row);
    }
  }

  slotsWrap.appendChild(menuEl);
}

function renderRecruitSection(prov) {
  const isPlayerProvince = prov.ownerId === state.playerFactionId;
  const isVisible = prov.visibility === 'visible';

  if (!isPlayerProvince || !isVisible) {
    recruitSectionEl.hidden = true;
    return;
  }

  const queueFull = prov.productionQueue.length >= 5;

  const seen = new Set();
  const units = [];
  for (const loc of prov.locations) {
    if (!loc.isControllable) continue;
    const installedIds = getInstalledBuildingIds(loc);
    for (const uDef of getRecruitableUnits(state.playerFactionId, installedIds)) {
      if (!seen.has(uDef.id)) {
        seen.add(uDef.id);
        units.push({ uDef, locationId: loc.id });
      }
    }
  }

  if (units.length === 0) {
    recruitSectionEl.hidden = true;
    return;
  }

  const faction = FACTION_MAP[state.playerFactionId];
  const allRes = faction
    ? [faction.resources.basic, ...faction.resources.advanced]
    : [];

  recruitListEl.className = 'recruit-menu';
  recruitListEl.innerHTML = '';

  for (const { uDef, locationId } of units) {
    const canRecruit = canAfford(state.playerFactionId, uDef.cost) && !queueFull;
    const stackSize = uDef.stackSize ?? 1;
    const displayName = stackSize > 1 ? `${stackSize}x ${uDef.name}` : uDef.name;

    const costStr = Object.entries(uDef.cost)
      .map(([res, amt]) => {
        const r = allRes.find(r2 => r2.id === res);
        return `${r?.emoji ?? ''}${amt}`;
      })
      .join(' ');

    const row = document.createElement('div');
    row.className = 'build-menu-row recruit-row';
    row.innerHTML = `
      <span class="bm-icon">${uDef.emoji}</span>
      <span class="recruit-row__main">
        <span class="bm-name">${displayName}</span>
        <span class="bm-meta">
          <span class="bm-stats">⚔${uDef.attack} 🛡${uDef.defense} ❤${uDef.maxHp ?? 10} 🐎${uDef.movement ?? 1}</span>
          <span class="bm-cost">💰-${uDef.upkeepGold ?? 0}/t · ${costStr} · ${uDef.buildTurns}t</span>
        </span>
      </span>
    `;

    const nameEl2 = row.querySelector('.bm-name');
    nameEl2.addEventListener('mouseenter', () => showUnitTooltip(uDef, faction, nameEl2));
    nameEl2.addEventListener('mouseleave', hideUnitTooltip);

    const btn = document.createElement('button');
    btn.className = 'card-action-btn';
    btn.textContent = 'Recruit';
    btn.disabled = !canRecruit;
    btn.title = !canRecruit
      ? (queueFull ? 'Queue full (max 5)' : 'Cannot afford')
      : `Recruit ×${uDef.stackSize ?? 1} (${uDef.buildTurns}t)`;
    btn.addEventListener('click', () => {
      if (!spendResources(state.playerFactionId, uDef.cost)) return;
      enqueueProduction(prov, {
        type: 'unit',
        id: uDef.id,
        locationId,
        turnsRemaining: uDef.buildTurns,
      });
      showProvincePanel(prov.id);
      renderResourceBar();
    });

    row.appendChild(btn);
    recruitListEl.appendChild(row);
  }

  recruitSectionEl.hidden = false;
}

function renderProductionQueue(prov) {
  const isPlayerProvince = prov.ownerId === state.playerFactionId;
  const isVisible = prov.visibility === 'visible';

  if (!isPlayerProvince || !isVisible) {
    queueSectionEl.hidden = true;
    return;
  }

  queueSectionEl.hidden = false;
  queueListEl.innerHTML = '';
  const faction = FACTION_MAP[state.playerFactionId];

  for (let i = 0; i < 5; i++) {
    const item = prov.productionQueue[i];
    const cwa = document.createElement('div');
    cwa.className = 'card-with-action';

    if (item) {
      let name;
      let emoji;
      let cost;
      let card;
      if (item.type === 'building') {
        const bDef = BUILDING_MAP[item.id];
        name = bDef?.name ?? item.id;
        emoji = bDef?.emoji ?? '🏗';
        cost = bDef?.cost ?? {};
        card = createCard({
          variant: 'building',
          compositeSrc: bDef?.cardImg ?? null,
          fallbackIcon: emoji,
          fallbackName: '',
          fallbackSub: '',
        });
      } else if (item.type === 'unit') {
        const uDef = UNIT_MAP[item.id];
        name = uDef?.name ?? item.id;
        emoji = uDef?.emoji ?? '⚔';
        cost = uDef?.cost ?? {};
        card = createCard({
          variant: 'unit',
          backgroundSrc: faction?.unitCardBgImg ?? null,
          foregroundSrc: uDef?.cardSpriteImg ?? null,
          fallbackIcon: emoji,
          fallbackName: '',
          fallbackSub: '',
        });
      } else {
        const bDef = BUILDING_MAP[item.id];
        name = `Raze ${bDef?.name ?? item.id}`;
        emoji = '🔨';
        cost = {};
        card = createCard({
          variant: 'building',
          fallbackIcon: emoji,
          fallbackName: '',
          fallbackSub: '',
        });
      }

      card.title = name;
      const turnsEl = document.createElement('div');
      turnsEl.className = 'game-card__queue-turns';
      turnsEl.textContent = `${item.turnsRemaining}t`;
      card.appendChild(turnsEl);
      cwa.appendChild(card);

      const btn = document.createElement('button');
      btn.className = 'card-action-btn card-action-btn--cancel';
      btn.textContent = 'Cancel';
      btn.title = item.type === 'demolish'
        ? 'Cancel demolish (no refund)'
        : 'Cancel and refund cost';
      btn.addEventListener('click', () => {
        dequeueProduction(prov, i);
        if (item.type !== 'demolish' && Object.keys(cost).length > 0) {
          addResources(state.playerFactionId, cost);
        }
        showProvincePanel(prov.id);
        renderResourceBar();
      });
      cwa.appendChild(btn);
    } else {
      const card = document.createElement('div');
      card.className = 'game-card game-card--empty';
      cwa.appendChild(card);
    }

    queueListEl.appendChild(cwa);
  }
}
