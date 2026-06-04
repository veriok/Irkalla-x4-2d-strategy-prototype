/**
 * races-data.js
 *
 * Race-level definitions shared across the 2 factions of each race.
 * Races establish the primary advanced resource (adv[0]) and recruitment restrictions.
 * Stat advantages are baked directly into unit definitions — not applied as runtime multipliers.
 */

import { RACE_IDS, UNIT_TYPES } from './enums.js';

export const RACES = [
  {
    id: RACE_IDS.DWARF,
    name: 'Dwarves',
    raceResource: 'runes',            // maps to faction.resources.advanced[0].id
    forbiddenUnitTypes: [UNIT_TYPES.CAVALRY, UNIT_TYPES.MONSTER],
    // Dwarf units have +1 buildTurns vs equivalents — baked into unit defs, not applied here
  },
  {
    id: RACE_IDS.HUMAN,
    name: 'Humans',
    raceResource: 'prestige',
    forbiddenUnitTypes: [],
    baseArmySupplyCapBonus: 1,        // +1 supply cap vs other races — applied in createFactionState
  },
  {
    id: RACE_IDS.ELF,
    name: 'Elves',
    raceResource: 'aether',
    forbiddenUnitTypes: [],
    // Elf unit movement values are baked higher in unit defs
    // Coastal province Aether income handled by elf-specific buildings
  },
  {
    id: RACE_IDS.LIZARD,
    name: 'Lizardmen',
    raceResource: 'ancient_lore',
    forbiddenUnitTypes: [],
    // Lizard units have +1 defense baked into unit defs
  },
];

export const RACE_MAP = Object.fromEntries(RACES.map(r => [r.id, r]));

/** Get the race definition for a faction by its raceId */
export function getRace(raceId) {
  return RACE_MAP[raceId] ?? null;
}
