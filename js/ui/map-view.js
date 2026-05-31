/**
 * map-view.js
 *
 * Renders province ownership colors, fog, unit icons on the SVG map.
 * Handles province click/hover event delegation.
 * Handles army icon rendering and army selection via click.
 */

import { state, getProvince, getArmy, selectProvince, selectArmy,
         startArmyMove, cancelArmyMove, moveArmy, computeMilitiaMax } from '../engine/game-state.js';
import { FACTION_MAP, NEUTRAL } from '../data/factions-data.js';
import { getBiome } from '../data/biomes-data.js';
import { armySize } from '../models/army.js';
import { updateFogOfWar } from '../engine/fog-of-war.js';

// ─── DOM references ───────────────────────────────────────
const provincesG = document.getElementById('provinces');
const unitLayerG  = document.getElementById('unit-layer');
const SVG_NS      = 'http://www.w3.org/2000/svg';

// ─── Events ───────────────────────────────────────────────
let _onProvinceSelect = null;
let _onArmySelect     = null;

/**
 * Register UI callbacks.
 * @param {{ onProvinceSelect, onArmySelect }} callbacks
 */
export function registerMapCallbacks({ onProvinceSelect, onArmySelect }) {
  _onProvinceSelect = onProvinceSelect;
  _onArmySelect     = onArmySelect;
}

// ─── Province event delegation ────────────────────────────
export function initMapEvents() {
  provincesG.addEventListener('click', e => {
    const path = e.target.closest('path[data-province]');
    if (!path) return;
    const provinceId = path.dataset.province;
    handleProvinceClick(provinceId);
  });

  // Hover
  provincesG.addEventListener('mouseover', e => {
    const path = e.target.closest('path[data-province]');
    if (!path) return;
    path.classList.add('hovered');
    showProvinceTooltip(path.dataset.province, e.pageX, e.pageY);
  });
  provincesG.addEventListener('mousemove', e => {
    const path = e.target.closest('path[data-province]');
    if (!path) return;
    moveProvinceTooltip(e.pageX, e.pageY);
  });
  provincesG.addEventListener('mouseout', e => {
    const path = e.target.closest('path[data-province]');
    if (!path) return;
    path.classList.remove('hovered');
    hideProvinceTooltip();
  });
}

function handleProvinceClick(provinceId) {
  // If an army is waiting to move → this is the destination
  if (state.movingArmyId) {
    const army = getArmy(state.movingArmyId);
    const targetProv = getProvince(provinceId);

    if (army && targetProv && army.movesLeft > 0 &&
        army.provinceId !== provinceId &&
        getProvince(army.provinceId).adjacentIds.includes(provinceId)) {

      // Import combat lazily to avoid circular deps
      import('../engine/combat.js').then(({ resolveCombat }) => {
        const combatResult = resolveCombat(state.movingArmyId, provinceId);
        cancelArmyMove();
        clearReachableHighlights();
        updateFogOfWar();
        renderAllProvinces();
        renderArmyIcons();
        if (_onProvinceSelect) _onProvinceSelect(provinceId);
        if (combatResult) {
          import('../ui/event-log.js').then(({ logCombat }) => logCombat(combatResult));
        }
      });
    } else {
      // Invalid target: cancel move
      cancelArmyMove();
      clearReachableHighlights();
    }
    return;
  }

  // Normal province selection
  selectProvince(provinceId);
  state.movingArmyId = null;
  renderAllProvinces();
  if (_onProvinceSelect) _onProvinceSelect(provinceId);
}

// ─── Province rendering ───────────────────────────────────

/**
 * Re-render all province fill colors and selection state.
 */
export function renderAllProvinces() {
  for (const prov of state.provinces.values()) {
    const path = document.getElementById(prov.id);
    if (!path) continue;
    renderProvince(prov, path);
  }
}

function renderProvince(prov, path) {
  // Update --prov-color to faction color (or biome fallback for neutral/unexplored)
  const faction = FACTION_MAP[prov.ownerId] ?? NEUTRAL;
  const biome   = getBiome(prov.biomeId);

  // For neutral owned provinces: use biome color
  // For faction owned: blend faction color over biome (use faction color directly)
  const baseColor = prov.ownerId === 'neutral' ? biome.color : faction.color;
  path.style.setProperty('--prov-color', baseColor);

  // Ownership class
  path.className.baseVal = `owner-${prov.ownerId}` +
    (state.selectedProvinceId === prov.id ? ' selected' : '');

  // Reachable highlight
  if (state.movingArmyId) {
    const movingArmy = getArmy(state.movingArmyId);
    if (movingArmy) {
      const fromProv = getProvince(movingArmy.provinceId);
      if (fromProv && fromProv.adjacentIds.includes(prov.id) &&
          movingArmy.movesLeft > 0 && movingArmy.provinceId !== prov.id) {
        path.classList.add('reachable');
      }
    }
  }
}

function clearReachableHighlights() {
  provincesG.querySelectorAll('.reachable').forEach(el => el.classList.remove('reachable'));
}

// ─── Province hover tooltip ───────────────────────────────

const _tooltip       = document.getElementById('province-tooltip');
const _ttName        = _tooltip.querySelector('.tooltip-name');
const _ttMilitia     = _tooltip.querySelector('.tooltip-militia');
const _ttMilitiaWrap = _tooltip.querySelector('.militia-bar-wrap');
const _ttMilitiaFill = _tooltip.querySelector('.militia-bar-fill');

function showProvinceTooltip(provinceId, x, y) {
  const prov = getProvince(provinceId);
  if (!prov || prov.visibility === 'unexplored') { _tooltip.hidden = true; return; }

  _ttName.textContent = prov.name;

  if (prov.visibility === 'visible' && prov.militia) {
    const max = computeMilitiaMax(prov);
    const cur = prov.militia.current;
    const pct = max > 0 ? Math.round((cur / max) * 100) : 0;
    _ttMilitia.textContent     = `⚔ Militia: ${cur}/${max}`;
    _ttMilitiaFill.style.width = `${pct}%`;
    _ttMilitiaFill.style.background = pct > 66 ? '#4aaa77' : pct > 33 ? '#c8a030' : '#c04040';
    _ttMilitia.hidden     = false;
    _ttMilitiaWrap.hidden = false;
  } else {
    _ttMilitia.hidden     = true;
    _ttMilitiaWrap.hidden = true;
  }

  _tooltip.style.left = `${x + 14}px`;
  _tooltip.style.top  = `${y - 32}px`;
  _tooltip.hidden = false;
}

function moveProvinceTooltip(x, y) {
  if (!_tooltip.hidden) {
    _tooltip.style.left = `${x + 14}px`;
    _tooltip.style.top  = `${y - 32}px`;
  }
}

function hideProvinceTooltip() {
  _tooltip.hidden = true;
}

// ─── Army icon rendering ──────────────────────────────────

/**
 * Re-render all army emoji icons on the unit layer.
 */
export function renderArmyIcons() {
  unitLayerG.innerHTML = '';

  for (const army of state.armies.values()) {
    const prov = getProvince(army.provinceId);
    if (!prov) continue;

    // Only show player army icons; AI armies hidden in fog
    const isPlayer = army.factionId === state.playerFactionId;
    if (!isPlayer && prov.visibility !== 'visible') continue;

    const faction = FACTION_MAP[army.factionId];
    const [cx, cy] = prov.centroid;

    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', cx);
    text.setAttribute('y', cy + 14);  // slight offset below centroid to not overlap label
    text.setAttribute('id', `army_${army.id}`);
    text.setAttribute('data-army', army.id);
    text.classList.add('army-icon');
    if (army.id === state.selectedArmyId) text.classList.add('selected');
    text.textContent = faction?.emoji ?? '⚔';

    // Army size indicator
    const sizeText = document.createElementNS(SVG_NS, 'text');
    sizeText.setAttribute('x', cx + 10);
    sizeText.setAttribute('y', cy + 8);
    sizeText.style.fontSize = '8px';
    sizeText.style.fill = '#fff';
    sizeText.style.pointerEvents = 'none';
    sizeText.textContent = armySize(army);

    unitLayerG.appendChild(text);
    unitLayerG.appendChild(sizeText);

    // Click handler for army selection
    text.addEventListener('click', e => {
      e.stopPropagation();
      handleArmyClick(army.id);
    });
  }
}

function handleArmyClick(armyId) {
  const army = getArmy(armyId);
  if (!army) return;

  // Only interact with player armies
  if (army.factionId !== state.playerFactionId) return;

  if (state.movingArmyId === armyId) {
    // Deselect
    cancelArmyMove();
    clearReachableHighlights();
    renderAllProvinces();
    return;
  }

  selectArmy(armyId);
  renderArmyIcons();
  if (_onArmySelect) _onArmySelect(armyId);
}

// ─── Highlight reachable provinces for army movement ─────

/**
 * Show reachable province highlights for the given army.
 * Call after startArmyMove().
 */
export function showReachableProvinces(armyId) {
  renderAllProvinces();  // redraws with reachable class based on state.movingArmyId
}

// ─── Province combat flash ────────────────────────────────

export function flashCombat(provinceId) {
  const path = document.getElementById(provinceId);
  if (!path) return;
  path.classList.remove('combat-flash');
  // Force reflow to restart animation
  void path.offsetWidth;
  path.classList.add('combat-flash');
  setTimeout(() => path.classList.remove('combat-flash'), 600);
}

export function flashConquest(provinceId) {
  const path = document.getElementById(provinceId);
  if (!path) return;
  path.classList.remove('conquest-pulse');
  void path.offsetWidth;
  path.classList.add('conquest-pulse');
  setTimeout(() => path.classList.remove('conquest-pulse'), 900);
}
