/**
 * location.js — Location factory
 * Locations are already created inside map-generator.js (attached to province).
 * This module provides helpers for working with locations.
 */

import { FACTION_MAP } from '../data/factions-data.js';

/** Location type metadata */
export const LOCATION_TYPES = {
  main_settlement: {
    name: 'Capital',
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
  dense_forest: {
    name: 'Dense Forest',
    emoji: '🌳',
    isControllable: false,
    cardImg: 'assets/cards/locations/dense_forest.png',
    description: 'A thick tangle of ancient trees. Requires Bronze Working to clear.',
  },
  dense_jungle: {
    name: 'Dense Jungle',
    emoji: '🌿',
    isControllable: false,
    cardImg: 'assets/cards/locations/dense_jungle.png',
    description: 'An impenetrable jungle growth. Requires Iron Working to clear.',
  },
  rocky_ground: {
    name: 'Rocky Ground',
    emoji: '🪨',
    isControllable: false,
    cardImg: 'assets/cards/locations/rocky_ground.png',
    description: 'Difficult terrain riddled with boulders. Requires Masonry to clear.',
  },
  frozen_wastes: {
    name: 'Frozen Wastes',
    emoji: '🧊',
    isControllable: false,
    cardImg: 'assets/cards/locations/frozen_wastes.png',
    description: 'Permafrost and ice-locked ground. Requires Iron Working to clear.',
  },
  dry_wastes: {
    name: 'Dry Wastes',
    emoji: '🏜️',
    isControllable: false,
    cardImg: 'assets/cards/locations/dry_wastes.png',
    description: 'Arid, cracked earth unsuitable for development. Requires Bronze Working to clear.',
  },
  empty: {
    name: 'Empty Plot',
    emoji: '🌿',
    isControllable: false,
    cardImg: 'assets/cards/locations/empty_plot.png',
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

/** Gold cost and turn count to clear each clearable location type */
export const LOCATION_CLEAR_COSTS = {
  ruins:               { gold: 120, turns: 3 },
  dense_forest:        { gold: 80,  turns: 2 },
  dense_jungle:        { gold: 120, turns: 3 },
  rocky_ground:        { gold: 80,  turns: 2 },
  frozen_wastes:       { gold: 100, turns: 3 },
  dry_wastes:          { gold: 80,  turns: 2 },
  cleared_monster_den: { gold: 20,  turns: 1 },
};

/** Tech ID required to be researched before the Clear action is available */
export const LOCATION_CLEAR_TECH_REQ = {
  dense_forest:  'bronze_working',
  dense_jungle:  'iron_working',
  rocky_ground:  'masonry',
  frozen_wastes: 'iron_working',
  dry_wastes:    'bronze_working',
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
 * Also applies tech effect bonuses (per-building and per-category).
 * Returns { [resourceId]: totalAmount }
 * @param {Object}   location
 * @param {Object}   buildingMap
 * @param {string|null} factionId  — owner faction, used to resolve faction_primary_adv
 * @param {Array}    techEffects   — appliedTechEffects from faction state
 * @returns {Object}
 */
export function getLocationResourceBonuses(location, buildingMap, factionId = null, techEffects = []) {
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

  // Apply tech effect bonuses (per-building-id and per-building-category)
  for (const eff of techEffects) {
    for (const { buildingId, bonusKey, amount } of (eff.buildingBonuses ?? [])) {
      if (location.buildings.some(b => b.buildingId === buildingId)) {
        totals[bonusKey] = (totals[bonusKey] ?? 0) + amount;
      }
    }
    for (const { category, bonusKey, amount } of (eff.buildingCategoryBonuses ?? [])) {
      if (location.buildings.some(b => buildingMap[b.buildingId]?.category === category)) {
        totals[bonusKey] = (totals[bonusKey] ?? 0) + amount;
      }
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


