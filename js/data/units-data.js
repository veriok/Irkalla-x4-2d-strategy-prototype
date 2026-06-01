/**
 * units-data.js
 *
 * Unit type definitions per faction.
 *
 * attack:      base attack power per individual unit
 * defense:     base defense power per individual unit
 * cost:        { [resourceId]: amount } — paid on recruitment
 * buildTurns:  turns in production queue
 * stackSize:   how many units are recruited per queue entry
 * factionId:   which faction can recruit this unit
 * tier:        combat/economy tier (1..3)
 * maxHp:       hit points per individual soldier
 * movement:    moves per turn (army uses slowest unit)
 * upkeepGold:  upkeep paid each turn after income
 * traitIds:    trait ids from traits-data.js
 * isMilitia:   true for province militia profiles (not recruitable)
 * emoji:       icon shown on army chip and map
 * requiredBuilding: building id that must exist in the location to recruit
 *                   (null = always available if you own the province)
 */

import { UNIT_TYPES } from './enums.js';

const UNIT_DEFAULTS = {
  movement: 1,
  upkeepGold: 0,
  cost: {},
  buildTurns: 1,
  stackSize: 1,
  requiredBuilding: null,
  traitIds: [],
  isMilitia: false,
  unitType: UNIT_TYPES.INFANTRY,
};

function _normalizeUnit(u) {
  const merged = {
    ...UNIT_DEFAULTS,
    ...u,
    cost: u.cost ?? UNIT_DEFAULTS.cost,
  };

  if (merged.isMilitia) {
    merged.upkeepGold = u.upkeepGold ?? 0;
    merged.cost = u.cost ?? {};
    merged.buildTurns = u.buildTurns ?? 0;
    merged.stackSize = u.stackSize ?? 1;
    merged.movement = u.movement ?? 1;
  }

  return merged;
}

const UNIT_DEFS = [

  // ─────────────────────────────────────────────────────────
  // DWARVES — Undead Babylonian Dwarves
  // ─────────────────────────────────────────────────────────
  {
    id: 'dwarf_undead_levy',
    factionId: 'dwarves',
    name: 'Undead Levy',
    emoji: '💀',
    cardSpriteImg: 'assets/cards/units/dwarf_undead_levy.png',
    description: 'Shambling undead conscripts. Expendable but numerous.',
    attack: 5,
    defense: 5,
    tier: 1,
    maxHp: 10,
    movement: 1,
    upkeepGold: 1,
    unitType: UNIT_TYPES.INFANTRY,
    cost: { gold: 45, soul_essence: 8 },
    buildTurns: 1,
    stackSize: 2,
    requiredBuilding: null,
  },
  {
    id: 'dwarf_iron_golem',
    factionId: 'dwarves',
    name: 'Iron Golem',
    emoji: '🤖',
    cardSpriteImg: 'assets/cards/units/dwarf_iron_golem.png',
    description: 'A powerful war-golem forged in the ziggurat fires. Slow but devastating.',
    attack: 7,
    defense: 11,
    tier: 3,
    maxHp: 20,
    movement: 1,
    upkeepGold: 3,
    unitType: UNIT_TYPES.CONSTRUCT,
    cost: { gold: 50, forge_iron: 16, soul_essence: 10 },
    buildTurns: 3,
    stackSize: 1,
    requiredBuilding: 'necropolis_1',
  },
  {
    id: 'dwarf_deathguard',
    factionId: 'dwarves',
    name: 'Deathguard',
    emoji: '⚔️',
    cardSpriteImg: 'assets/cards/units/dwarf_deathguard.png',
    description: 'Elite undead warriors clad in dark iron plate. The personal guard of the Forge-King.',
    attack: 6,
    defense: 8,
    tier: 2,
    maxHp: 14,
    movement: 1,
    upkeepGold: 2,
    unitType: UNIT_TYPES.INFANTRY,
    cost: { gold: 40, forge_iron: 8, soul_essence: 6 },
    buildTurns: 2,
    stackSize: 1,
    requiredBuilding: 'necropolis_2',
  },

  // ─────────────────────────────────────────────────────────
  // ELVES — Elven City States
  // ─────────────────────────────────────────────────────────
  {
    id: 'elf_hoplite',
    factionId: 'elves',
    name: 'Elven Hoplite',
    emoji: '🛡️',
    cardSpriteImg: 'assets/cards/units/elf_hoplite.png',
    description: 'Disciplined spear-and-shield infantry. The backbone of elven city-state armies.',
    attack: 4,
    defense: 6,
    tier: 1,
    maxHp: 10,
    movement: 1,
    upkeepGold: 1,
    unitType: UNIT_TYPES.INFANTRY,
    cost: { gold: 30, timber: 4 },
    buildTurns: 1,
    stackSize: 1,
    requiredBuilding: null,
  },
  {
    id: 'elf_sea_raider',
    factionId: 'elves',
    name: 'Elven Sea Raider',
    emoji: '⚡',
    cardSpriteImg: 'assets/cards/units/elf_sea_raider.png',
    description: 'Swift elven marines. Fast movers on coastal provinces.',
    attack: 8,
    defense: 4,
    tier: 2,
    maxHp: 14,
    movement: 2,
    upkeepGold: 2,
    unitType: UNIT_TYPES.CAVALRY,
    cost: { gold: 40, timber: 6 },
    buildTurns: 1,
    stackSize: 1,
    requiredBuilding: 'shipyard_1',
  },
  {
    id: 'elf_philosopher_guard',
    factionId: 'elves',
    name: 'Elven Philosopher Guard',
    emoji: '🌿',
    cardSpriteImg: 'assets/cards/units/elf_philosopher_guard.png',
    description: 'Warrior-scholars imbued with arcane knowledge. High attack and defense.',
    attack: 9,
    defense: 9,
    tier: 3,
    maxHp: 18,
    movement: 1,
    upkeepGold: 3,
    unitType: UNIT_TYPES.INFANTRY,
    cost: { gold: 50, philosophy: 12 },
    buildTurns: 2,
    stackSize: 1,
    requiredBuilding: 'academy_2',
  },

  // ─────────────────────────────────────────────────────────
  // LIZARDS — Desert Hegemony
  // ─────────────────────────────────────────────────────────
  {
    id: 'lizard_skink',
    factionId: 'lizards',
    name: 'Skink Skirmisher',
    emoji: '🦎',
    cardSpriteImg: 'assets/cards/units/lizard_skink.png',
    description: 'Light lizardmen skirmishers. Fast and cheap.',
    attack: 6,
    defense: 4,
    tier: 1,
    maxHp: 10,
    movement: 1,
    upkeepGold: 1,
    unitType: UNIT_TYPES.ARCHER,
    cost: { gold: 30, grain: 4 },
    buildTurns: 1,
    stackSize: 1,
    requiredBuilding: null,
  },
  {
    id: 'lizard_crocodile',
    factionId: 'lizards',
    name: 'Crocodile Guard',
    emoji: '🐊',
    cardSpriteImg: 'assets/cards/units/lizard_crocodile.png',
    description: 'Elite heavy infantry clad in crocodile-hide armour. Feared throughout the Hegemony.',
    attack: 7,
    defense: 7,
    tier: 2,
    maxHp: 14,
    movement: 1,
    upkeepGold: 2,
    unitType: UNIT_TYPES.INFANTRY,
    cost: { gold: 40, grain: 8, faith: 4 },
    buildTurns: 2,
    stackSize: 1,
    requiredBuilding: 'granary_1',
  },
  {
    id: 'lizard_sun_priest',
    factionId: 'lizards',
    name: 'Sun Priest',
    emoji: '☀️',
    cardSpriteImg: 'assets/cards/units/lizard_sun_priest.png',
    description: 'Battle priests who channel solar energy. Boosts army attack significantly.',
    attack: 8,
    defense: 7,
    tier: 3,
    maxHp: 16,
    movement: 1,
    upkeepGold: 3,
    traitIds: ['sun_priest_aura'],
    unitType: UNIT_TYPES.INFANTRY,
    cost: { gold: 50, faith: 12 },
    buildTurns: 2,
    stackSize: 1,
    requiredBuilding: 'temple_1',
  },

  // ─────────────────────────────────────────────────────────
  // HUMANS — Y Draig Goch
  // ─────────────────────────────────────────────────────────
  {
    id: 'draig_warrior',
    factionId: 'draig',
    name: 'Clan Warrior',
    emoji: '🐉',
    cardSpriteImg: 'assets/cards/units/draig_warrior.png',
    description: 'Honor-bound clan warriors. Die before surrendering.',
    attack: 5,
    defense: 5,
    tier: 1,
    maxHp: 10,
    movement: 1,
    upkeepGold: 1,
    unitType: UNIT_TYPES.INFANTRY,
    cost: { gold: 30, honor: 4 },
    buildTurns: 1,
    stackSize: 1,
    requiredBuilding: null,
  },
  {
    id: 'draig_dragonsworn',
    factionId: 'draig',
    name: 'Dragonsworn',
    emoji: '🔥',
    cardSpriteImg: 'assets/cards/units/draig_dragonsworn.png',
    description: 'Warriors who have taken the Dragon Oath. Incredibly powerful in assault.',
    attack: 10,
    defense: 6,
    tier: 3,
    maxHp: 18,
    movement: 2,
    upkeepGold: 3,
    unitType: UNIT_TYPES.CAVALRY,
    cost: { gold: 50, honor: 14, dragon_essence: 8 },
    buildTurns: 3,
    stackSize: 1,
    requiredBuilding: 'dragon_shrine_1',
  },
  {
    id: 'draig_monk',
    factionId: 'draig',
    name: 'Dragon Monk',
    emoji: '⚔️',
    cardSpriteImg: 'assets/cards/units/draig_monk.png',
    description: 'Ascetic warrior-monks trained in the dojo arts. Balanced fighters.',
    attack: 8,
    defense: 6,
    tier: 2,
    maxHp: 14,
    movement: 1,
    upkeepGold: 2,
    unitType: UNIT_TYPES.INFANTRY,
    cost: { gold: 40, honor: 8 },
    buildTurns: 2,
    stackSize: 1,
    requiredBuilding: 'dojo_1',
  },

  // ─────────────────────────────────────────────────────────
  // MILITIA PROFILES (non-recruitable)
  // ─────────────────────────────────────────────────────────
  {
    id: 'militia_dwarves',
    factionId: 'dwarves',
    name: 'Dwarven Militia',
    emoji: '🪓',
    cardSpriteImg: null,
    description: 'Local defenders mustered from workshops and watchposts.',
    attack: 2,
    defense: 4,
    tier: 1,
    maxHp: 5,
    isMilitia: true,
    unitType: UNIT_TYPES.INFANTRY,
  },
  {
    id: 'militia_elves',
    factionId: 'elves',
    name: 'Elven Militia',
    emoji: '🏹',
    cardSpriteImg: null,
    description: 'Citizen defenders drilled for border emergencies.',
    attack: 3,
    defense: 3,
    tier: 1,
    maxHp: 5,
    isMilitia: true,
    unitType: UNIT_TYPES.ARCHER,
  },
  {
    id: 'militia_lizards',
    factionId: 'lizards',
    name: 'Lizard Militia',
    emoji: '🗡️',
    cardSpriteImg: null,
    description: 'Temple levy and patrol crews raised to defend local lands.',
    attack: 3,
    defense: 3,
    tier: 1,
    maxHp: 5,
    isMilitia: true,
    unitType: UNIT_TYPES.INFANTRY,
  },
  {
    id: 'militia_draig',
    factionId: 'draig',
    name: 'Draig Militia',
    emoji: '🛡',
    cardSpriteImg: null,
    description: 'Clan reserve units sworn to hold local ground.',
    attack: 4,
    defense: 2,
    tier: 1,
    maxHp: 5,
    isMilitia: true,
    unitType: UNIT_TYPES.INFANTRY,
  },
  {
    id: 'militia_neutral',
    factionId: 'neutral',
    name: 'Local Militia',
    emoji: '⚔',
    cardSpriteImg: null,
    description: 'Unaligned local defenders with basic military training.',
    attack: 3,
    defense: 3,
    tier: 1,
    maxHp: 5,
    isMilitia: true,
    unitType: UNIT_TYPES.INFANTRY,
  },
];

export const UNITS = UNIT_DEFS.map(_normalizeUnit);

/** Fast lookup by unit id */
export const UNIT_MAP = Object.fromEntries(UNITS.map(u => [u.id, u]));

/** Get unit types for a faction */
export function getUnitsForFaction(factionId, includeMilitia = false) {
  return UNITS.filter(u => u.factionId === factionId && (includeMilitia || !u.isMilitia));
}

/** Get units recruiteable at a location given its existing buildings */
export function getRecruitableUnits(factionId, existingBuildingIds) {
  return getUnitsForFaction(factionId).filter(u =>
    u.requiredBuilding === null || existingBuildingIds.includes(u.requiredBuilding)
  );
}

export function getMilitiaUnitIdForFaction(factionId) {
  const map = {
    dwarves: 'militia_dwarves',
    elves: 'militia_elves',
    lizards: 'militia_lizards',
    draig: 'militia_draig',
    neutral: 'militia_neutral',
  };
  return map[factionId] ?? 'militia_neutral';
}
