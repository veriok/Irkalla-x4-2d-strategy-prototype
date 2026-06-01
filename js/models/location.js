/**
 * location.js — Location factory
 * Locations are already created inside map-generator.js (attached to province).
 * This module provides helpers for working with locations.
 */

import { FACTION_MAP } from '../data/factions-data.js';

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
    name: 'Mercantile',
    emoji: '🏘️',
    isControllable: true,
    cardImg: 'assets/cards/locations/village.png',
    description: 'A mercantile settlement. Generates gold income and supports trade buildings.',
  },
  fort: {
    name: 'Military',
    emoji: '⚔️',
    isControllable: true,
    cardImg: 'assets/cards/locations/fort.png',
    description: 'A military garrison. Provides defense bonuses, militia, and martial buildings.',
  },
  ruins: {
    name: 'Ruins',
    emoji: '🏚️',
    isControllable: false,
    cardImg: 'assets/cards/locations/ruins.png',
    description: 'Crumbling remains of an old structure. Clear them to build something new.',
  },
  shrine: {
    name: 'Religious',
    emoji: '🛕',
    isControllable: true,
    cardImg: 'assets/cards/locations/shrine.png',
    description: 'A sacred district. Generates primary advanced resource and supports religious buildings.',
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
    description: 'Open land ready for development. Build a mercantile, military, or religious location here.',
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

/** Base building slots for each buildable location type (mandatory base building occupies 1) */
export const LOCATION_BASE_SLOTS = { village: 3, shrine: 3, fort: 3 };

/** The pre-placed mandatory base building for each buildable location type */
export const LOCATION_STARTING_BUILDING = {
  village: 'mercantile_1',
  fort:    'palisade',
  shrine:  'religious_1',
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
 * Resolves the special `faction_primary_adv` key to the faction's first advanced resource.
 * Returns { [resourceId]: totalAmount }
 * @param {Object} location
 * @param {Object} buildingMap
 * @param {string|null} factionId  — owner faction, used to resolve faction_primary_adv
 * @returns {Object}
 */
export function getLocationResourceBonuses(location, buildingMap, factionId = null) {
  const totals = {};
  for (const { buildingId } of location.buildings) {
    const def = buildingMap[buildingId];
    if (!def) continue;
    for (const [res, amt] of Object.entries(def.bonuses)) {
      if (res === 'defense' || res === 'growthSlots') continue;
      if (res === 'faction_primary_adv') {
        if (factionId) {
          const faction = FACTION_MAP[factionId];
          const advResId = faction?.resources?.advanced?.[0]?.id;
          if (advResId) totals[advResId] = (totals[advResId] ?? 0) + amt;
        }
        continue;
      }
      if (res === 'faction_secondary_adv') {
        if (factionId) {
          const faction = FACTION_MAP[factionId];
          const advResId = faction?.resources?.advanced?.[1]?.id;
          if (advResId) totals[advResId] = (totals[advResId] ?? 0) + amt;
        }
        continue;
      }
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


