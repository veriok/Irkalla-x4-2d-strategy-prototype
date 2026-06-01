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
    description: 'The heart of the province. Cannot be converted or razed.',
  },
  village: {
    name: 'Village',
    emoji: '🏘️',
    isControllable: true,
    cardImg: 'assets/cards/locations/village.png',
    description: 'A farming community. Generates gold and supports basic buildings.',
  },
  fort: {
    name: 'Fort',
    emoji: '🏯',
    isControllable: true,
    cardImg: 'assets/cards/locations/fort.png',
    description: 'A military garrison. Provides strong defense bonuses and militia.',
  },
  ruins: {
    name: 'Ruins',
    emoji: '🏚️',
    isControllable: false,
    cardImg: 'assets/cards/locations/ruins.png',
    description: 'Crumbling remains of an old structure. Clear them to build something new.',
  },
  shrine: {
    name: 'Shrine',
    emoji: '🛕',
    isControllable: true,
    cardImg: 'assets/cards/locations/shrine.png',
    description: 'A place of worship. Unlocks faith-based buildings and resource bonuses.',
  },
  monster_den: {
    name: 'Monster Den',
    emoji: '👹',
    isControllable: false,
    cardImg: 'assets/cards/locations/monster_den.png',
    description: 'A lair of dangerous creatures. Send an army to clear it out.',
  },
  cleared_monster_den: {
    name: 'Cleared Den',
    emoji: '💀',
    isControllable: false,
    cardImg: 'assets/cards/locations/cleared_monster_den.png',
    description: 'The creatures have been driven out. Clear the remaining debris to build here.',
  },
  empty: {
    name: 'Empty Plot',
    emoji: '🌿',
    isControllable: false,
    cardImg: 'assets/cards/locations/empty.png',
    description: 'Open land ready for development. Build a village, fort, or shrine here.',
  },
};

/** Costs to build a new location on an empty plot (or convert an existing one) */
export const LOCATION_BUILD_COSTS = {
  village: { gold: 400 },
  shrine:  { gold: 600 },
  fort:    { gold: 800 },
};

/** Turns required to build/convert a location */
export const LOCATION_BUILD_TURNS = { village: 2, shrine: 3, fort: 5 };

/** Base building slots for each buildable location type */
export const LOCATION_BASE_SLOTS = { village: 2, shrine: 1, fort: 1 };

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


