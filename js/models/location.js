/**
 * location.js — Location factory
 * Locations are already created inside map-generator.js (attached to province).
 * This module provides helpers for working with locations.
 */

/** Location type metadata */
export const LOCATION_TYPES = {
  main_settlement: {
    name: 'Settlement',
    emoji: '🏛️',
    isControllable: true,
    cardImg: 'assets/cards/locations/main_settlement.png',
  },
  village: {
    name: 'Village',
    emoji: '🏘️',
    isControllable: true,
    cardImg: 'assets/cards/locations/village.png',
  },
  fort: {
    name: 'Fort',
    emoji: '🏯',
    isControllable: true,
    cardImg: 'assets/cards/locations/fort.png',
  },
  ruins: {
    name: 'Ruins',
    emoji: '🏚️',
    isControllable: false,
    cardImg: 'assets/cards/locations/ruins.png',
  },
  shrine: {
    name: 'Shrine',
    emoji: '🛕',
    isControllable: true,
    cardImg: 'assets/cards/locations/shrine.png',
  },
  monster_den: {
    name: 'Monster Den',
    emoji: '👹',
    isControllable: false,
    cardImg: 'assets/cards/locations/monster_den.png',
  },
};

/**
 * Get all building ids currently installed (completed) in a location.
 * @param {Object} location
 * @returns {string[]}
 */
export function getInstalledBuildingIds(location) {
  return location.buildings.map(b => b.buildingId);
}

/**
 * Get the defense bonus from all buildings in a location.
 * @param {Object} location
 * @param {Object} buildingMap  BUILDING_MAP from buildings-data.js
 * @returns {number}
 */
export function getLocationDefenseBonus(location, buildingMap) {
  return location.buildings.reduce((sum, b) => {
    const def = buildingMap[b.buildingId];
    return sum + (def?.bonuses?.defense ?? 0);
  }, 0);
}

/**
 * Get per-turn resource bonuses from all buildings in a location.
 * Returns { [resourceId]: totalAmount }
 * @param {Object} location
 * @param {Object} buildingMap
 * @returns {Object}
 */
export function getLocationResourceBonuses(location, buildingMap) {
  const totals = {};
  for (const { buildingId } of location.buildings) {
    const def = buildingMap[buildingId];
    if (!def) continue;
    for (const [res, amt] of Object.entries(def.bonuses)) {
      if (res === 'defense' || res === 'growthSlots') continue;
      totals[res] = (totals[res] ?? 0) + amt;
    }
  }
  return totals;
}

/**
 * Count how many building slots are unlocked in this location
 * (base slots + growthSlots bonuses from buildings).
 * @param {Object} location
 * @param {Object} buildingMap
 * @returns {number}
 */
export function getAvailableBuildingSlots(location, buildingMap) {
  const extraSlots = location.buildings.reduce((sum, b) => {
    const def = buildingMap[b.buildingId];
    return sum + (def?.bonuses?.growthSlots ?? 0);
  }, 0);
  return location.buildingSlots + extraSlots;
}


