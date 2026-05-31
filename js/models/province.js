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

    // militia (local defenders — initialised by game-state.initWorld)
    militia:         { current: 0, lastCombatTurn: null },

    // visibility (from player's perspective, updated by fog-of-war.js)
    // 'visible' | 'explored' | 'unexplored'
    visibility:      'unexplored',
  };
}
