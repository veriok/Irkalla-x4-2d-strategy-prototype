/**
 * map-view.js
 *
 * Renders province ownership colors, fog, unit icons on the SVG map.
 * Handles province click/hover event delegation.
 * Handles army icon rendering and army selection via click.
 */

import { state, getProvince, getArmy, selectProvince, selectArmy,
         startArmyMove, cancelArmyMove, moveArmy, computeMilitiaMax,
         getArmiesInProvince, mergeArmies } from '../engine/game-state.js';
import { FACTION_MAP, NEUTRAL } from '../data/factions-data.js';
import { getBiome } from '../data/biomes-data.js';
import { armySize } from '../models/army.js';
import { updateFogOfWar } from '../engine/fog-of-war.js';
import { confirmModal } from './modal.js';
import { renderArmyPanel } from './army-panel.js';
import { renderResourceBar } from './resource-bar.js';

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

    // Deep ocean is impassable — cancel the move order
    if (targetProv?.isOcean && targetProv.oceanType === 'deep') {
      cancelArmyMove();
      clearReachableHighlights();
      return;
    }

    if (army && targetProv && army.movesLeft > 0 &&
        army.provinceId !== provinceId &&
        getProvince(army.provinceId).adjacentIds.includes(provinceId)) {

      const targetIsHostile = targetProv.ownerId !== army.factionId && targetProv.ownerId !== 'neutral';
      const hasMilitia      = (targetProv.militia?.current ?? 0) > 0;
      const enemyArmies     = getArmiesInProvince(provinceId)
        .filter(a => a.factionId !== army.factionId);
      const friendlyArmies  = getArmiesInProvince(provinceId)
        .filter(a => a.factionId === army.factionId);

      const isHostileMove = targetIsHostile || hasMilitia || enemyArmies.length > 0;

      if (!isHostileMove && friendlyArmies.length > 0) {
        // Friendly army at destination — offer to merge
        const movingArmyId = state.movingArmyId;
        confirmModal(
          'Merge Armies?',
          `Combine your armies in ${targetProv.name}? The arriving force will be absorbed into the garrison.`,
          () => {
            const keepArmy = friendlyArmies[0];
            const merged = mergeArmies(keepArmy.id, movingArmyId);
            if (!merged) {
              // Over supply cap — just move normally
              import('../engine/combat.js').then(({ resolveCombat }) => {
                resolveCombat(movingArmyId, provinceId);
                const postMoveProvinceId = getArmy(movingArmyId)?.provinceId ?? provinceId;
                _afterMove(postMoveProvinceId);
              });
            } else {
              _afterMove(provinceId);
            }
          },
          () => {
            // Cancel — just move without merging
            import('../engine/combat.js').then(({ resolveCombat }) => {
              resolveCombat(movingArmyId, provinceId);
              const postMoveProvinceId = getArmy(movingArmyId)?.provinceId ?? provinceId;
              _afterMove(postMoveProvinceId);
            });
          }
        );
        return;
      }

      // Standard move/combat
      const movingArmyId = state.movingArmyId;
      import('../engine/combat.js').then(({ resolveCombat }) => {
        const combatResult = resolveCombat(movingArmyId, provinceId);
        const postMoveProvinceId = getArmy(movingArmyId)?.provinceId ?? provinceId;
        _afterMove(postMoveProvinceId);
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

  // Normal province selection — ocean opens a stripped panel (no militia/resources)
  selectProvince(provinceId);
  state.movingArmyId = null;
  renderAllProvinces();
  if (_onProvinceSelect) _onProvinceSelect(provinceId);
}

function _afterMove(provinceId) {
  cancelArmyMove();
  clearReachableHighlights();
  updateFogOfWar();
  renderAllProvinces();
  renderArmyIcons();
  renderArmyPanel();
  renderResourceBar(); // province count may have changed after conquest/loss
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
  if (_minimapCallback) _minimapCallback();
}

function renderProvince(prov, path) {
  // Ocean provinces: keep biome color, correct CSS class, reachable for shallow only
  if (prov.isOcean) {
    const biome = getBiome(prov.biomeId);
    path.style.setProperty('--prov-color', biome.color);
    path.className.baseVal = prov.oceanType === 'shallow' ? 'ocean-shallow' : 'ocean-deep';
    if (state.movingArmyId && prov.oceanType === 'shallow') {
      const movingArmy = getArmy(state.movingArmyId);
      if (movingArmy) {
        const fromProv = getProvince(movingArmy.provinceId);
        if (fromProv && fromProv.adjacentIds.includes(prov.id) &&
            movingArmy.movesLeft > 0 && movingArmy.provinceId !== prov.id) {
          path.classList.add('reachable');
        }
      }
    }
    return;
  }

  // Update --prov-color to faction color (or biome fallback for neutral/unexplored)
  const faction = FACTION_MAP[prov.ownerId] ?? NEUTRAL;
  const biome   = getBiome(prov.biomeId);

  // Don't reveal faction colors for provinces the player has never seen.
  // 'explored' keeps the last-known color (fog overlay greys it); 'unexplored' stays dark.
  let baseColor;
  if (prov.visibility === 'unexplored') {
    baseColor = '#2a2a2a';
  } else if (prov.ownerId === 'neutral') {
    baseColor = '#6b6b6b';
  } else {
    baseColor = faction.color;
  }
  path.style.setProperty('--prov-color', baseColor);

  // Ownership class
  path.className.baseVal = `owner-${prov.ownerId}` +
    (state.selectedProvinceId === prov.id ? ' selected' : '');

  // Bold label for player's core provinces
  const labelEl = document.getElementById(`label_${prov.id}`);
  if (labelEl) {
    labelEl.style.fontWeight = prov.coreOf === state.playerFactionId ? 'bold' : '';
  }

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
  if (_ttCombatInfo) _ttCombatInfo.hidden = true;
}

// ─── Province hover tooltip ───────────────────────────────

const _tooltip        = document.getElementById('province-tooltip');
const _ttName         = _tooltip.querySelector('.tooltip-name');
const _ttMilitia      = _tooltip.querySelector('.tooltip-militia');
const _ttMilitiaWrap  = _tooltip.querySelector('.militia-bar-wrap');
const _ttMilitiaFill  = _tooltip.querySelector('.militia-bar-fill');
const _ttCombatInfo   = _tooltip.querySelector('.tooltip-combat-info');
const _ttWinChance    = _tooltip.querySelector('.tooltip-win-chance');
const _ttDefBonus     = _tooltip.querySelector('.tooltip-def-bonus');
const _ttCasualties   = _tooltip.querySelector('.tooltip-casualties');

function showProvinceTooltip(provinceId, x, y) {
  const prov = getProvince(provinceId);
  if (!prov || prov.visibility === 'unexplored') { _tooltip.hidden = true; return; }

  // Ocean: show a minimal tooltip (name + type) and skip militia/combat info
  if (prov.isOcean) {
    _ttName.textContent = `${prov.name} \u2014 ${prov.oceanType === 'shallow' ? 'Shallow Sea' : 'Deep Ocean'}`;
    if (_ttMilitia)     _ttMilitia.hidden     = true;
    if (_ttMilitiaWrap) _ttMilitiaWrap.hidden = true;
    if (_ttCombatInfo)  _ttCombatInfo.hidden  = true;
    _tooltip.style.left = `${x + 14}px`;
    _tooltip.style.top  = `${y - 32}px`;
    _tooltip.hidden = false;
    return;
  }

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

  // ── Combat prediction (shown when army is in move mode targeting hostile) ──
  const movingArmyIdSnap = state.movingArmyId;  // snapshot before any async
  const movingArmy = movingArmyIdSnap ? getArmy(movingArmyIdSnap) : null;
  const isHostile  = movingArmy &&
    (prov.ownerId !== movingArmy.factionId || getArmiesInProvince(provinceId).some(a => a.factionId !== movingArmy.factionId));
  const isAdjacent = movingArmy && getProvince(movingArmy.provinceId)?.adjacentIds.includes(provinceId);

  if (movingArmy && isAdjacent && isHostile && _ttCombatInfo) {
    import('../engine/combat.js').then(({ estimateCombat }) => {
      // Discard if move mode was cancelled or army changed before this resolved
      if (state.movingArmyId !== movingArmyIdSnap) return;
      const est = estimateCombat(movingArmyIdSnap, provinceId);
      if (!est) return;

      const chanceColor = est.winChancePct >= 60 ? '#4aaa77' : est.winChancePct >= 40 ? '#c8a030' : '#c04040';
      const casColor    = est.casualtyLevel === 'Low' ? '#4aaa77'
                        : est.casualtyLevel === 'Medium' ? '#c8a030' : '#c04040';

      _ttWinChance.textContent  = `🎯 Win chance: ~${est.winChancePct}%`;
      _ttWinChance.style.color  = chanceColor;
      _ttDefBonus.textContent   = `🏔 Defense bonus: +${est.terrainBonus}%${est.fortBonus > 0 ? ` (+${est.fortBonus} fort)` : ''}`;
      _ttCasualties.textContent = `⚔ Casualties: ${est.casualtyLevel}`;
      _ttCasualties.style.color = casColor;
      _ttCombatInfo.hidden = false;
    });
  } else if (_ttCombatInfo) {
    _ttCombatInfo.hidden = true;
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
  if (_ttCombatInfo) _ttCombatInfo.hidden = true;
}

// ─── Army icon rendering ──────────────────────────────────

/**
 * Re-render all army emoji icons on the unit layer.
 * Multiple armies in one province are offset slightly.
 */
export function renderArmyIcons() {
  unitLayerG.innerHTML = '';

  // Group armies by province for offset rendering
  const byProvince = new Map();
  for (const army of state.armies.values()) {
    if (!byProvince.has(army.provinceId)) byProvince.set(army.provinceId, []);
    byProvince.get(army.provinceId).push(army);
  }

  for (const [provinceId, armies] of byProvince) {
    const prov = getProvince(provinceId);
    if (!prov) continue;

    const [cx, cy] = prov.centroid;
    const offsets = _armyOffsets(armies.length);

    armies.forEach((army, idx) => {
      const isPlayer = army.factionId === state.playerFactionId;
      if (!isPlayer && prov.visibility !== 'visible') return;

      const faction = FACTION_MAP[army.factionId];
      const [ox, oy] = offsets[idx];

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', cx + ox);
      text.setAttribute('y', cy + 14 + oy);
      text.setAttribute('id', `army_${army.id}`);
      text.setAttribute('data-army', army.id);
      text.classList.add('army-icon');
      if (army.id === state.selectedArmyId) text.classList.add('selected');
      text.textContent = faction?.emoji ?? '⚔';

      const sizeText = document.createElementNS(SVG_NS, 'text');
      sizeText.setAttribute('x', cx + ox + 10);
      sizeText.setAttribute('y', cy + 8 + oy);
      sizeText.style.fontSize = '8px';
      sizeText.style.fill = '#fff';
      sizeText.style.pointerEvents = 'none';
      sizeText.textContent = armySize(army);

      unitLayerG.appendChild(text);
      unitLayerG.appendChild(sizeText);

      text.addEventListener('click', e => {
        e.stopPropagation();
        handleArmyClick(army.id);
      });
    });
  }
  if (_minimapCallback) _minimapCallback();
}

/** Compute per-army [dx, dy] offsets so multiple armies in one province don't overlap. */
function _armyOffsets(count) {
  if (count === 1) return [[0, 0]];
  if (count === 2) return [[-8, 0], [8, 0]];
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return [Math.round(Math.cos(angle) * 10), Math.round(Math.sin(angle) * 10)];
  });
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

/** Cancel move mode and clear all move-related visual state (highlights + combat tooltip). */
export function cancelArmyMoveAndClear() {
  cancelArmyMove();
  clearReachableHighlights();  // also hides _ttCombatInfo
  renderAllProvinces();
}

// ─── Province combat flash ────────────────────────────────

export function flashCombat(provinceId) {
  const path = document.getElementById(provinceId);
  if (!path) return;
  path.classList.remove('combat-flash');
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

// ─── Minimap callback ─────────────────────────────────────
let _minimapCallback = null;
export function setMinimapCallback(fn) { _minimapCallback = fn; }

// Patch renderAllProvinces and renderArmyIcons to call minimap
const _origRenderAllProvinces = renderAllProvinces;
const _origRenderArmyIcons    = renderArmyIcons;

// Override exported functions in-place by wrapping the call site.
// We cannot re-assign exported `const` — instead we call callback at end of each.
// The patching happens via _minimapCallback checks already added below.

// ─── Camera / pan system ──────────────────────────────────
const VIEWPORT_W = 1000;
const VIEWPORT_H = 600;

let _camX  = 0;
let _camY  = 0;
let _mapW  = 1000;
let _mapH  = 600;
let _mapSvgEl = null;

/** Export live camera state for minimap. */
export function getCameraState() {
  return { x: _camX, y: _camY, vw: VIEWPORT_W, vh: VIEWPORT_H, mw: _mapW, mh: _mapH };
}

/** Teleport camera to (x, y) — used by minimap click. */
export function setCameraPosition(x, y) {
  _applyCamera(x, y);
  if (_minimapCallback) _minimapCallback();
}

function _applyCamera(x, y) {
  _camX = Math.max(0, Math.min(_mapW - VIEWPORT_W, x));
  _camY = Math.max(0, Math.min(_mapH - VIEWPORT_H, y));
  if (_mapSvgEl) {
    _mapSvgEl.setAttribute('viewBox', `${_camX} ${_camY} ${VIEWPORT_W} ${VIEWPORT_H}`);
  }
}

/**
 * Initialise drag-to-pan and edge-pan for the map SVG.
 * Call once after map generation with the map SVG element and its dimensions.
 */
export function initMapPan(svgEl, mapW, mapH) {
  _mapSvgEl = svgEl;
  _mapW  = mapW;
  _mapH  = mapH;
  _camX  = 0;
  _camY  = 0;
  _applyCamera(0, 0);

  // ── Drag to pan ──
  let _dragging     = false;
  let _startClientX = 0;
  let _startClientY = 0;
  let _startCamX    = 0;
  let _startCamY    = 0;
  let _didPan       = false;

  function onDragMove(e) {
    if (!_dragging) return;
    const dx = e.clientX - _startClientX;
    const dy = e.clientY - _startClientY;
    // Use true displacement so tiny jitter on normal clicks never triggers pan.
    if (Math.hypot(dx, dy) > 6) {
      _didPan = true;
      const rect  = svgEl.getBoundingClientRect();
      const svgDx = dx / rect.width  * VIEWPORT_W;
      const svgDy = dy / rect.height * VIEWPORT_H;
      _applyCamera(_startCamX - svgDx, _startCamY - svgDy);
      if (_minimapCallback) _minimapCallback();
    }
  }

  function onDragEnd() {
    if (!_dragging) return;
    _dragging = false;
    document.getElementById('map-section')?.classList.remove('panning');
    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup',   onDragEnd);
    document.removeEventListener('pointercancel', onDragEnd);
  }

  svgEl.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    _dragging     = true;
    _startClientX = e.clientX;
    _startClientY = e.clientY;
    _startCamX    = _camX;
    _startCamY    = _camY;
    _didPan       = false;
    document.getElementById('map-section')?.classList.add('panning');
    // Attach move/up to document (not svgEl) so drags outside the SVG still work,
    // and — crucially — we do NOT call setPointerCapture, which would redirect the
    // synthesised click event away from the province path and break click delegation.
    document.addEventListener('pointermove',   onDragMove);
    document.addEventListener('pointerup',     onDragEnd);
    document.addEventListener('pointercancel', onDragEnd);
  });

  // Suppress click events that were actually a drag (capture phase fires before province delegation).
  svgEl.addEventListener('click', e => {
    if (_didPan) {
      e.stopPropagation();
      _didPan = false;
    }
  }, true);

  // ── Edge pan via requestAnimationFrame ──
  // Track on document so position updates even when mouse moves over other UI panels.
  let _mouseClientX = -999;
  let _mouseClientY = -999;
  document.addEventListener('mousemove', e => {
    _mouseClientX = e.clientX;
    _mouseClientY = e.clientY;
  });

  function edgePanLoop() {
    if (_mapW > VIEWPORT_W || _mapH > VIEWPORT_H) {
      const rect  = svgEl.getBoundingClientRect();
      const EDGE  = 40;   // px from SVG edge
      const SPEED = 5;    // SVG units per frame

      let dx = 0;
      let dy = 0;

      if (_mouseClientX >= rect.left && _mouseClientX <= rect.right &&
          _mouseClientY >= rect.top  && _mouseClientY <= rect.bottom) {
        const relX = _mouseClientX - rect.left;
        const relY = _mouseClientY - rect.top;
        if (relX < EDGE)               dx = -SPEED;
        else if (relX > rect.width  - EDGE) dx = SPEED;
        if (relY < EDGE)               dy = -SPEED;
        else if (relY > rect.height - EDGE) dy = SPEED;
      }

      if (dx !== 0 || dy !== 0) {
        _applyCamera(_camX + dx, _camY + dy);
        if (_minimapCallback) _minimapCallback();
      }
    }
    requestAnimationFrame(edgePanLoop);
  }
  requestAnimationFrame(edgePanLoop);
}

