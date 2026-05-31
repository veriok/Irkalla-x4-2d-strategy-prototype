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
 * emoji:       icon shown on army chip and map
 * requiredBuilding: building id that must exist in the location to recruit
 *                   (null = always available if you own the province)
 */

export const UNITS = [

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
    attack: 4,
    defense: 3,
    cost: { gold: 20, soul_essence: 5 },
    buildTurns: 1,
    stackSize: 3,
    requiredBuilding: null,
  },
  {
    id: 'dwarf_iron_golem',
    factionId: 'dwarves',
    name: 'Iron Golem',
    emoji: '🤖',
    cardSpriteImg: 'assets/cards/units/dwarf_iron_golem.png',
    description: 'A powerful war-golem forged in the ziggurat fires. Slow but devastating.',
    attack: 12,
    defense: 10,
    cost: { gold: 60, forge_iron: 15, soul_essence: 10 },
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
    attack: 9,
    defense: 12,
    cost: { gold: 50, forge_iron: 10, soul_essence: 8 },
    buildTurns: 2,
    stackSize: 2,
    requiredBuilding: 'necropolis_2',
  },

  // ─────────────────────────────────────────────────────────
  // ELVES — Elven Greek City States
  // ─────────────────────────────────────────────────────────
  {
    id: 'elf_hoplite',
    factionId: 'elves',
    name: 'Hoplite',
    emoji: '🛡️',
    cardSpriteImg: 'assets/cards/units/elf_hoplite.png',
    description: 'Disciplined spear-and-shield infantry. The backbone of elven city-state armies.',
    attack: 6,
    defense: 8,
    cost: { gold: 30, timber: 3 },
    buildTurns: 1,
    stackSize: 2,
    requiredBuilding: null,
  },
  {
    id: 'elf_sea_raider',
    factionId: 'elves',
    name: 'Sea Raider',
    emoji: '⚡',
    cardSpriteImg: 'assets/cards/units/elf_sea_raider.png',
    description: 'Swift elven marines. Fast movers on coastal provinces.',
    attack: 8,
    defense: 4,
    cost: { gold: 35, timber: 5 },
    buildTurns: 1,
    stackSize: 2,
    requiredBuilding: 'shipyard_1',
  },
  {
    id: 'elf_philosopher_guard',
    factionId: 'elves',
    name: 'Philosopher Guard',
    emoji: '🌿',
    cardSpriteImg: 'assets/cards/units/elf_philosopher_guard.png',
    description: 'Warrior-scholars imbued with arcane knowledge. High attack and defense.',
    attack: 10,
    defense: 9,
    cost: { gold: 60, philosophy: 12 },
    buildTurns: 2,
    stackSize: 2,
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
    attack: 4,
    defense: 3,
    cost: { gold: 20, grain: 3 },
    buildTurns: 1,
    stackSize: 3,
    requiredBuilding: null,
  },
  {
    id: 'lizard_crocodile',
    factionId: 'lizards',
    name: 'Crocodile Guard',
    emoji: '🐊',
    cardSpriteImg: 'assets/cards/units/lizard_crocodile.png',
    description: 'Elite heavy infantry clad in crocodile-hide armour. Feared throughout the Hegemony.',
    attack: 11,
    defense: 10,
    cost: { gold: 55, grain: 8, faith: 5 },
    buildTurns: 2,
    stackSize: 2,
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
    defense: 6,
    cost: { gold: 50, faith: 15 },
    buildTurns: 2,
    stackSize: 1,
    requiredBuilding: 'temple_1',
    // Special: Sun Priest grants +2 attack to all other units in same army (handled in combat.js)
    specialEffect: { type: 'army_attack_bonus', amount: 2 },
  },

  // ─────────────────────────────────────────────────────────
  // DRAIG — Y Draig Goch
  // ─────────────────────────────────────────────────────────
  {
    id: 'draig_warrior',
    factionId: 'draig',
    name: 'Clan Warrior',
    emoji: '🐉',
    cardSpriteImg: 'assets/cards/units/draig_warrior.png',
    description: 'Honor-bound clan warriors. Die before surrendering.',
    attack: 6,
    defense: 5,
    cost: { gold: 25, honor: 3 },
    buildTurns: 1,
    stackSize: 2,
    requiredBuilding: null,
  },
  {
    id: 'draig_dragonsworn',
    factionId: 'draig',
    name: 'Dragonsworn',
    emoji: '🔥',
    cardSpriteImg: 'assets/cards/units/draig_dragonsworn.png',
    description: 'Warriors who have taken the Dragon Oath. Incredibly powerful in assault.',
    attack: 14,
    defense: 7,
    cost: { gold: 65, honor: 15, dragon_essence: 10 },
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
    attack: 9,
    defense: 10,
    cost: { gold: 45, honor: 10 },
    buildTurns: 2,
    stackSize: 2,
    requiredBuilding: 'dojo_1',
  },
];

/** Fast lookup by unit id */
export const UNIT_MAP = Object.fromEntries(UNITS.map(u => [u.id, u]));

/** Get unit types for a faction */
export function getUnitsForFaction(factionId) {
  return UNITS.filter(u => u.factionId === factionId);
}

/** Get units recruiteable at a location given its existing buildings */
export function getRecruitableUnits(factionId, existingBuildingIds) {
  return getUnitsForFaction(factionId).filter(u =>
    u.requiredBuilding === null || existingBuildingIds.includes(u.requiredBuilding)
  );
}
