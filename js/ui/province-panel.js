/**
 * province-panel.js
 *
 * Renders the right-side province detail panel when a province is selected.
 * Shows:
 *   - Province name, biome, owner
 *   - Locations list with building slots
 *   - Production queue for the selected (controllable) location
 *   - Build / recruit buttons
 */

import { state, getProvince, getFaction, canAfford, spendResources,
         computeMilitiaMax } from '../engine/game-state.js';
import { FACTION_MAP, NEUTRAL } from '../data/factions-data.js';
import { getBiome } from '../data/biomes-data.js';
import { LOCATION_TYPES, getInstalledBuildingIds,
         getAvailableBuildingSlots, enqueueProduction, dequeueProduction } from '../models/location.js';
import { BUILDING_MAP, getBuildingsForLocation } from '../data/buildings-data.js';
import { getRecruitableUnits, UNIT_MAP } from '../data/units-data.js';
import { renderResourceBar } from './resource-bar.js';

const emptyEl   = document.getElementById('province-panel-empty');
const contentEl = document.getElementById('province-panel-content');
const nameEl    = document.getElementById('province-name');
const biomeIconEl  = document.getElementById('province-biome-icon');
const biomeLabelEl = document.getElementById('province-biome-label');
const ownerBadgeEl = document.getElementById('province-owner-badge');
const locationListEl = document.getElementById('location-list');
const queueSectionEl = document.getElementById('production-queue-section');
const queueListEl    = document.getElementById('production-queue-list');
const militiaInfoEl  = document.getElementById('province-militia-info');

// Track which location is expanded
let _expandedLocId = null;

/**
 * Show province info for the given province id.
 * @param {string} provinceId
 */
export function showProvincePanel(provinceId) {
  const prov = getProvince(provinceId);
  if (!prov || prov.visibility === 'unexplored') {
    hideProvincePanel();
    return;
  }

  const biome   = getBiome(prov.biomeId);
  const faction = FACTION_MAP[prov.ownerId] ?? NEUTRAL;

  emptyEl.hidden   = true;
  contentEl.hidden = false;

  nameEl.textContent          = prov.name;
  biomeIconEl.textContent     = biome.emoji;
  biomeLabelEl.textContent    = `${biome.name} · ${biome.description}`;
  ownerBadgeEl.textContent    = faction.name;
  ownerBadgeEl.style.color    = faction.textColor ?? faction.color;
  ownerBadgeEl.style.borderColor = faction.color;

  // Militia section
  if (prov.visibility === 'visible' && prov.militia) {
    const max = computeMilitiaMax(prov);
    const cur = prov.militia.current;
    const pct = max > 0 ? Math.round((cur / max) * 100) : 0;
    militiaInfoEl.querySelector('.militia-count').textContent = `${cur} / ${max} units`;
    const replenishing = prov.militia.lastCombatTurn !== null && cur < max;
    militiaInfoEl.querySelector('.militia-status').textContent = replenishing ? '(replenishing +1/turn)' : '';
    const fill = militiaInfoEl.querySelector('.militia-fill');
    fill.style.width      = `${pct}%`;
    fill.style.background = pct > 66 ? '#4aaa77' : pct > 33 ? '#c8a030' : '#c04040';
    militiaInfoEl.hidden = false;
  } else {
    militiaInfoEl.hidden = true;
  }

  renderLocations(prov);
}

export function hideProvincePanel() {
  emptyEl.hidden   = false;
  contentEl.hidden = true;
  _expandedLocId   = null;
}

// ─── Location list ────────────────────────────────────────

function renderLocations(prov) {
  locationListEl.innerHTML = '';
  queueSectionEl.hidden    = true;

  const isPlayerProvince = prov.ownerId === state.playerFactionId;
  const isVisible        = prov.visibility === 'visible';

  for (const loc of prov.locations) {
    const typeMeta = LOCATION_TYPES[loc.type] ?? { name: loc.type, emoji: '❓' };
    const isExpanded = _expandedLocId === loc.id;

    const card = document.createElement('div');
    card.className = `location-card${isExpanded ? ' selected' : ''}`;

    // Header
    const header = document.createElement('div');
    header.className = 'location-header';
    header.innerHTML = `
      <span class="location-icon">${typeMeta.emoji}</span>
      <span class="location-name">${loc.type === 'main_settlement' ? prov.name : typeMeta.name}</span>
      <span class="location-type">${typeMeta.name}</span>
    `;
    header.addEventListener('click', () => {
      _expandedLocId = isExpanded ? null : loc.id;
      showProvincePanel(prov.id);
    });
    card.appendChild(header);

    // Building slots (only shown when expanded and visible)
    if (isExpanded && isVisible) {
      const slotsEl = renderBuildingSlots(prov, loc, isPlayerProvince);
      card.appendChild(slotsEl);
    }

    locationListEl.appendChild(card);
  }

  // Production queue (shown for expanded location if player-owned)
  if (_expandedLocId && isPlayerProvince && isVisible) {
    const loc = prov.locations.find(l => l.id === _expandedLocId);
    if (loc && LOCATION_TYPES[loc.type]?.isControllable) {
      renderProductionQueue(prov, loc);
    }
  }
}

// ─── Building slots ───────────────────────────────────────

function renderBuildingSlots(prov, loc, isPlayerProvince) {
  const slotsEl = document.createElement('div');
  slotsEl.className = 'building-slots';

  const totalSlots  = getAvailableBuildingSlots(loc, BUILDING_MAP);
  const installedIds = getInstalledBuildingIds(loc);

  // Show installed buildings
  for (let i = 0; i < installedIds.length; i++) {
    const bDef = BUILDING_MAP[installedIds[i]];
    const slotEl = document.createElement('div');
    slotEl.className = 'building-slot';
    slotEl.innerHTML = `
      <span class="slot-icon">${bDef?.emoji ?? '🏗'}</span>
      <span class="slot-name">${bDef?.name ?? installedIds[i]}</span>
    `;
    slotsEl.appendChild(slotEl);
  }

  // Empty slots
  const emptyCount = Math.max(0, totalSlots - installedIds.length);
  for (let i = 0; i < emptyCount; i++) {
    const slotEl = document.createElement('div');
    slotEl.className = 'building-slot';

    if (isPlayerProvince && LOCATION_TYPES[loc.type]?.isControllable) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn-secondary slot-btn';
      addBtn.textContent = '+ Build';
      addBtn.addEventListener('click', () => openBuildMenu(prov, loc, slotsEl));
      slotEl.innerHTML = `<span class="slot-icon">➕</span><span class="slot-name slot-empty">Empty slot</span>`;
      slotEl.appendChild(addBtn);
    } else {
      slotEl.innerHTML = `<span class="slot-icon">⬜</span><span class="slot-name slot-empty">Empty slot</span>`;
    }
    slotsEl.appendChild(slotEl);
  }

  return slotsEl;
}

// ─── Build menu (inline) ──────────────────────────────────

function openBuildMenu(prov, loc, slotsEl) {
  // Remove any existing build menu
  slotsEl.querySelectorAll('.build-menu').forEach(el => el.remove());

  const installedIds = getInstalledBuildingIds(loc);
  const available    = getBuildingsForLocation(state.playerFactionId, loc.type, installedIds);

  if (available.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'build-menu';
    msg.style.cssText = 'font-size:11px;color:var(--text-muted);padding:4px 0';
    msg.textContent = 'No buildings available for this location.';
    slotsEl.appendChild(msg);
    return;
  }

  const menuEl = document.createElement('div');
  menuEl.className = 'build-menu';
  menuEl.style.cssText = 'margin-top:6px;display:flex;flex-direction:column;gap:4px;';

  const fs      = getFaction(state.playerFactionId);
  const faction = FACTION_MAP[state.playerFactionId];

  for (const bDef of available) {
    const costStr = Object.entries(bDef.cost).map(([res, amt]) => {
      const resDef = [faction.resources.basic, ...faction.resources.advanced]
                      .find(r => r.id === res);
      return `${resDef?.emoji ?? ''}${amt}`;
    }).join(' ');

    const canBuild = canAfford(state.playerFactionId, bDef.cost) &&
                     loc.productionQueue.length < 5;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;';
    row.innerHTML = `
      <span>${bDef.emoji}</span>
      <span style="flex:1">${bDef.name}</span>
      <span style="color:var(--text-muted)">${costStr} · ${bDef.buildTurns}t</span>
    `;

    const btn = document.createElement('button');
    btn.className = 'btn-secondary slot-btn';
    btn.textContent = 'Queue';
    btn.disabled    = !canBuild;
    btn.title       = canBuild ? bDef.description : 'Cannot afford or queue full';
    btn.addEventListener('click', () => {
      if (!spendResources(state.playerFactionId, bDef.cost)) return;
      enqueueProduction(loc, {
        type:           'building',
        id:             bDef.id,
        turnsRemaining: bDef.buildTurns,
      });
      menuEl.remove();
      showProvincePanel(prov.id);
      renderResourceBar();
    });

    row.appendChild(btn);
    menuEl.appendChild(row);
  }

  // Also add recruit options (if location has required buildings)
  const recruitableUnits = getRecruitableUnits(state.playerFactionId, installedIds);
  if (recruitableUnits.length > 0) {
    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid var(--border);margin:4px 0;font-size:11px;color:var(--text-muted);padding-top:4px;';
    sep.textContent = 'Recruit units:';
    menuEl.appendChild(sep);

    for (const uDef of recruitableUnits) {
      const costStr = Object.entries(uDef.cost).map(([res, amt]) => {
        const resDef = [faction.resources.basic, ...faction.resources.advanced]
                        .find(r => r.id === res);
        return `${resDef?.emoji ?? ''}${amt}`;
      }).join(' ');

      const canRecruit = canAfford(state.playerFactionId, uDef.cost) &&
                         loc.productionQueue.length < 5;

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;';
      row.innerHTML = `
        <span>${uDef.emoji}</span>
        <span style="flex:1">${uDef.name} ×${uDef.stackSize}</span>
        <span style="color:var(--text-muted)">${costStr} · ${uDef.buildTurns}t</span>
      `;

      const btn = document.createElement('button');
      btn.className = 'btn-secondary slot-btn';
      btn.textContent = 'Recruit';
      btn.disabled    = !canRecruit;
      btn.addEventListener('click', () => {
        if (!spendResources(state.playerFactionId, uDef.cost)) return;
        enqueueProduction(loc, {
          type:           'unit',
          id:             uDef.id,
          turnsRemaining: uDef.buildTurns,
        });
        menuEl.remove();
        showProvincePanel(prov.id);
        renderResourceBar();
      });

      row.appendChild(btn);
      menuEl.appendChild(row);
    }
  }

  slotsEl.appendChild(menuEl);
}

// ─── Production queue ─────────────────────────────────────

function renderProductionQueue(prov, loc) {
  queueSectionEl.hidden = loc.productionQueue.length === 0;
  if (loc.productionQueue.length === 0) return;

  queueListEl.innerHTML = '';

  loc.productionQueue.forEach((item, idx) => {
    let name, emoji;
    if (item.type === 'building') {
      const bDef = BUILDING_MAP[item.id];
      name  = bDef?.name ?? item.id;
      emoji = bDef?.emoji ?? '🏗';
    } else {
      const uDef = UNIT_MAP[item.id];
      name  = uDef?.name ?? item.id;
      emoji = uDef?.emoji ?? '⚔';
    }

    const li = document.createElement('li');
    li.className = 'queue-item';
    li.innerHTML = `
      <span class="queue-item-icon">${emoji}</span>
      <span class="queue-item-name">${name}</span>
      <span class="queue-item-turns">${item.turnsRemaining}t</span>
      <span class="queue-item-cancel" title="Cancel" data-idx="${idx}">✕</span>
    `;
    li.querySelector('.queue-item-cancel').addEventListener('click', () => {
      dequeueProduction(loc, idx);
      showProvincePanel(prov.id);
    });

    queueListEl.appendChild(li);
  });

  queueSectionEl.hidden = false;
}
