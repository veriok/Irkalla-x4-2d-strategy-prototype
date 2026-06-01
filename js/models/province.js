/**
 * province.js — Province factory
 */

/**
 * Creates a Province instance from raw map-generator data + game ownership.
 *
 * @param {Object} raw  - descriptor from map-generator.js
 * @returns {Object} province
 */
export function createProvince(raw) {
  return {
    id:              raw.id,
    name:            raw.name,
    biomeId:         raw.biomeId,
    centroid:        raw.centroid,     // [x, y]
    adjacentIds:     raw.adjacentIds,
    svgPath:         raw.svgPath,
    isCapital:       raw.isCapital,

    // ownership — set during world-init
    ownerId:         raw.startingFactionId,

    // locations — already constructed by map-generator
    locations:       raw.locations,

    // armies in this province (array of armyIds)
    armyIds:         [],

    // single province-level production queue (max 6 items)
    // each item: { type: 'building'|'unit'|'demolish', id, locationId, turnsRemaining }
    productionQueue: [],

    // militia (local defenders — initialised by game-state.initWorld)
    militia:         { current: 0, lastCombatTurn: null },

    // visibility (from player's perspective, updated by fog-of-war.js)
    // 'visible' | 'explored' | 'unexplored'
    visibility:      'unexplored',

    // ocean flags (set by map-generator for water provinces)
    isOcean:         raw.isOcean   ?? false,
    oceanType:       raw.oceanType ?? null,    // 'shallow' | 'deep' | null
    isCoastal:       raw.isCoastal ?? false,
  };
}

/**
 * Add an item to the province's production queue if not full (max 6).
 * Returns true if added, false if queue full.
 *
 * @param {Object} province
 * @param {{ type: 'building'|'unit'|'demolish', id: string, locationId: string, turnsRemaining: number }} item
 * @returns {boolean}
 */
export function enqueueProduction(province, item) {
  if (province.productionQueue.length >= 6) return false;
  province.productionQueue.push({ ...item });
  return true;
}

/**
 * Remove item at index from the province production queue.
 * @param {Object} province
 * @param {number} index
 */
export function dequeueProduction(province, index) {
  province.productionQueue.splice(index, 1);
}
