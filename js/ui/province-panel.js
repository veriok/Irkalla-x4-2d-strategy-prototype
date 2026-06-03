/**
 * province-panel.js
 *
 * Right-side province detail panel — informative only.
 * Shows: province name, biome, owner, militia, per-turn resource income,
 *        location cards (display only), and production queue (cancel only).
 *
 * All management actions (building, recruiting, location changes) are
 * handled in province-modal.js, opened via the "Manage Province" button.
 */

import {
  state,
  getProvince,
  addResources,
  computeMilitiaMax,
} from '../engine/game-state.js';
import { FACTION_MAP, NEUTRAL } from '../data/factions-data.js';
import { getBiome } from '../data/biomes-data.js';
import {
  LOCATION_TYPES,
  getLocationResourceBonuses,
} from '../models/location.js';
import { dequeueProduction } from '../models/province.js';
import { BUILDING_MAP } from '../data/buildings-data.js';
import { UNIT_MAP, getMilitiaUnitIdForFaction } from '../data/units-data.js';
import { renderResourceBar } from './resource-bar.js';
import { showUnitTooltip, hideUnitTooltip, showLocationTooltip, hideLocationTooltip } from './tooltips.js';
import { createCard } from './card-renderer.js';
import { showProvinceModal } from './province-modal.js';

const emptyEl         = document.getElementById('province-panel-empty');
const contentEl       = document.getElementById('province-panel-content');
const nameEl          = document.getElementById('province-name');
const biomeIconEl     = document.getElementById('province-biome-icon');
const biomeLabelEl    = document.getElementById('province-biome-label');
const ownerBadgeEl    = document.getElementById('province-owner-badge');
const locationListEl  = document.getElementById('location-list');
const resourceSummaryEl = document.getElementById('province-resource-summary');
const recruitSectionEl  = document.getElementById('recruit-section');
const queueSectionEl    = document.getElementById('production-queue-section');
const queueListEl       = document.getElementById('production-queue-list');
const militiaInfoEl     = document.getElementById('province-militia-info');

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

  nameEl.textContent        = prov.name;
  biomeIconEl.textContent   = biome.emoji;
  biomeLabelEl.textContent  = `${biome.name} · ${biome.description}`;
  ownerBadgeEl.textContent  = faction.name;
  ownerBadgeEl.style.color       = faction.textColor ?? faction.color;
  ownerBadgeEl.style.borderColor = faction.color;

  // Ocean provinces: hide all gameplay sections
  if (prov.isOcean) {
    militiaInfoEl.hidden     = true;
    resourceSummaryEl.hidden = true;
    locationListEl.innerHTML = '';
    if (recruitSectionEl) recruitSectionEl.hidden = true;
    if (queueSectionEl)   queueSectionEl.hidden   = true;
    _removeManageBtn();
    return;
  }

  // Militia info
  if (prov.visibility === 'visible' && prov.militia) {
    const max = computeMilitiaMax(prov);
    const cur = prov.militia.current;
    const pct = max > 0 ? Math.round((cur / max) * 100) : 0;
    const militiaCountEl = militiaInfoEl.querySelector('.militia-count');
    militiaCountEl.textContent = `${cur} / ${max} units`;
    const replenishing = prov.militia.lastCombatTurn !== null && cur < max;
    militiaInfoEl.querySelector('.militia-status').textContent = replenishing ? '(replenishing +1/turn)' : '';
    const fill = militiaInfoEl.querySelector('.militia-fill');
    fill.style.width      = `${pct}%`;
    fill.style.background = pct > 66 ? '#4aaa77' : pct > 33 ? '#c8a030' : '#c04040';

    const militiaUnitId = getMilitiaUnitIdForFaction(prov.ownerId ?? 'neutral');
    const militiaDef    = UNIT_MAP[militiaUnitId];
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
  const isVisible        = prov.visibility === 'visible';

  // Resource summary chips
  if (isPlayerProvince && isVisible) {
    renderResourceSummary(prov);
  } else {
    resourceSummaryEl.hidden = true;
  }

  // Location cards (display-only)
  renderLocations(prov);

  // Recruit section hidden — all recruitment in modal
  if (recruitSectionEl) recruitSectionEl.hidden = true;

  // Production queue: cancel-only
  renderProductionQueue(prov);

  // "Manage Province" button
  if (isPlayerProvince && isVisible) {
    _ensureManageBtn(prov.id);
  } else {
    _removeManageBtn();
  }
}

export function hideProvincePanel() {
  emptyEl.hidden   = false;
  contentEl.hidden = true;
  _removeManageBtn();
}

// Refresh side panel when province modal closes
document.addEventListener('province-modal-closed', e => {
  showProvincePanel(e.detail.provinceId);
});

// ─── Resource summary ─────────────────────────────────────
function renderResourceSummary(prov) {
  const biome         = getBiome(prov.biomeId);
  const playerFaction = FACTION_MAP[state.playerFactionId];
  if (!playerFaction) { resourceSummaryEl.hidden = true; return; }

  const factionResIds = new Set([
    'research',
    playerFaction.resources.basic.id,
    ...playerFaction.resources.advanced.map(r => r.id),
  ]);
  const allResById = {
    research: { id: 'research', name: 'Research', emoji: '📚' },
    [playerFaction.resources.basic.id]: playerFaction.resources.basic,
  };
  for (const r of playerFaction.resources.advanced) allResById[r.id] = r;

  const totals = { gold: 3 };
  for (const loc of prov.locations) {
    if (!loc.isControllable) continue;
    const bonuses = getLocationResourceBonuses(loc, BUILDING_MAP, state.playerFactionId);
    for (const [res, amt] of Object.entries(bonuses)) {
      if (!factionResIds.has(res)) continue;
      totals[res] = (totals[res] ?? 0) + Math.round(amt * biome.resourceMod);
    }
  }

  const chips = Object.entries(totals).filter(([, amt]) => amt > 0);
  if (chips.length === 0) { resourceSummaryEl.hidden = true; return; }

  resourceSummaryEl.innerHTML = chips
    .map(([resId, amt]) => {
      const resDef = allResById[resId];
      return `<span class="province-res-chip">${resDef?.emoji ?? ''} <strong>+${amt}</strong>/t</span>`;
    })
    .join('');
  resourceSummaryEl.hidden = false;
}

// ─── Location cards (display-only) ────────────────────────
function renderLocations(prov) {
  locationListEl.innerHTML = '';

  const cardRow = document.createElement('div');
  cardRow.className = 'card-grid';

  for (const loc of prov.locations) {
    const typeMeta = LOCATION_TYPES[loc.type] ?? { name: loc.type, emoji: '?' };

    const card = createCard({
      variant: 'location',
      compositeSrc: typeMeta.cardImg ?? null,
      fallbackIcon: typeMeta.emoji,
      fallbackName: loc.type === 'main_settlement' ? prov.name : typeMeta.name,
      fallbackSub: '',
    });
    card.title = typeMeta.name;

    if (typeMeta.description) {
      card.addEventListener('mouseenter', () => showLocationTooltip(typeMeta, card));
      card.addEventListener('mouseleave', hideLocationTooltip);
    }

    cardRow.appendChild(card);
  }

  locationListEl.appendChild(cardRow);
}

// ─── Production queue (cancel-only) ───────────────────────
function renderProductionQueue(prov) {
  const isPlayerProvince = prov.ownerId === state.playerFactionId;
  const isVisible        = prov.visibility === 'visible';

  if (!isPlayerProvince || !isVisible) {
    queueSectionEl.hidden = true;
    return;
  }

  queueSectionEl.hidden = false;
  queueListEl.innerHTML = '';
  const faction = FACTION_MAP[state.playerFactionId];

  for (let i = 0; i < 5; i++) {
    const item = prov.productionQueue[i];
    const cwa  = document.createElement('div');
    cwa.className = 'card-with-action';

    if (item) {
      let cost = {};
      let card;

      if (item.type === 'building') {
        const bDef = BUILDING_MAP[item.id];
        cost = bDef?.cost ?? {};
        card = createCard({ variant: 'building', compositeSrc: bDef?.cardImg ?? null, fallbackIcon: bDef?.emoji ?? '🏗', fallbackName: '', fallbackSub: '' });
        card.title = bDef?.name ?? item.id;
      } else if (item.type === 'unit') {
        const uDef = UNIT_MAP[item.id];
        cost = uDef?.cost ?? {};
        card = createCard({ variant: 'unit', backgroundSrc: faction?.unitCardBgImg ?? null, foregroundSrc: uDef?.cardSpriteImg ?? null, fallbackIcon: uDef?.emoji ?? '⚔', fallbackName: '', fallbackSub: '' });
        card.title = uDef?.name ?? item.id;
      } else if (item.type === 'clear_location') {
        card = createCard({ variant: 'location', fallbackIcon: '🧹', fallbackName: '', fallbackSub: '' });
        card.title = 'Clearing location';
        cost = item.goldCost ? { gold: item.goldCost } : { gold: 0 };
      } else if (item.type === 'build_location') {
        const tMeta = LOCATION_TYPES[item.locationType];
        card = createCard({ variant: 'location', compositeSrc: tMeta?.cardImg ?? null, fallbackIcon: tMeta?.emoji ?? '🏗', fallbackName: '', fallbackSub: '' });
        card.title = `Building ${tMeta?.name ?? item.locationType}`;
        cost = {};
      } else {
        // demolish
        const bDef = BUILDING_MAP[item.id];
        card = createCard({ variant: 'building', fallbackIcon: '🔨', fallbackName: '', fallbackSub: '' });
        card.title = `Raze ${bDef?.name ?? item.id}`;
        cost = {};
      }

      const turnsEl = document.createElement('div');
      turnsEl.className   = 'game-card__queue-turns';
      turnsEl.textContent = `${item.turnsRemaining}t`;
      card.appendChild(turnsEl);
      cwa.appendChild(card);

      const btn = document.createElement('button');
      btn.className   = 'card-action-btn card-action-btn--cancel';
      btn.textContent = 'Cancel';
      btn.title = item.type === 'demolish' ? 'Cancel demolish (no refund)' : 'Cancel and refund cost';
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
      const emptyCard = document.createElement('div');
      emptyCard.className = 'game-card game-card--empty';
      cwa.appendChild(emptyCard);
    }

    queueListEl.appendChild(cwa);
  }
}

// ─── Manage Province button ────────────────────────────────
let _manageBtnEl = null;

function _ensureManageBtn(provinceId) {
  if (!_manageBtnEl) {
    _manageBtnEl = document.createElement('button');
    _manageBtnEl.className = 'btn-primary';
    _manageBtnEl.style.cssText = 'width:100%;margin-bottom:8px;';
    _manageBtnEl.textContent   = '🏛 Manage Province';
  }
  // Re-wire click so it uses the current province ID
  _manageBtnEl.onclick = () => showProvinceModal(provinceId);

  // Insert after province header if not already in DOM
  if (!_manageBtnEl.parentNode) {
    const header = document.getElementById('province-header');
    header?.insertAdjacentElement('afterend', _manageBtnEl);
  }
}

function _removeManageBtn() {
  if (_manageBtnEl?.parentNode) {
    _manageBtnEl.parentNode.removeChild(_manageBtnEl);
  }
}
