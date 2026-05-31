/**
 * buildings-data.js
 *
 * Linear upgrade chains (no branching).
 * Each building has:
 *   id            — unique string
 *   name          — display name
 *   emoji         — icon
 *   factionId     — null = available to all; 'dwarves'|'elves'|'lizards'|'draig' = faction-specific
 *   allowedLocTypes — which location types can host this building
 *   tier          — 1,2,3 within a chain (for slot management)
 *   upgradeFromId — id of the building this replaces (null for tier-1)
 *   cost          — { [resourceId]: amount }
 *   buildTurns    — turns in production queue
 *   bonuses       — applied additively to faction resource income per turn:
 *                   { [resourceId]: amount, defense: flat_bonus, growthSlots: +N }
 *   prerequisites — building ids that must already be built somewhere in same location
 *   unlocksBuildings — building ids that become available in same location after built
 *   slotCost      — how many building slots this consumes (default 1)
 *   demolishable  — whether player can queue raze/demolish for this building (default true)
 *   description   — flavour text
 */

// ─────────────────────────────────────────────────────────
// GENERIC chains (all factions)
// ─────────────────────────────────────────────────────────

const GENERIC_CHAINS = [

  // ── Settlement Growth Chain (main_settlement only) ──────
  {
    id: 'town_hall_1', name: 'Town Hall', emoji: '🏛️',
    cardImg: 'assets/cards/buildings/town_hall_1.png',
    factionId: null,
    allowedLocTypes: ['main_settlement'],
    tier: 1, upgradeFromId: null,
    cost: { gold: 60 }, buildTurns: 3,
    bonuses: { gold: 5, growthSlots: 1 },
    prerequisites: [],
    unlocksBuildings: ['town_hall_2'],
    demolishable: false,
    militiaBonus: 1,
    description: 'A rudimentary seat of local governance. Enables further development.',
  },
  {
    id: 'town_hall_2', name: 'Grand Hall', emoji: '🏰',
    cardImg: 'assets/cards/buildings/town_hall_2.png',
    factionId: null,
    allowedLocTypes: ['main_settlement'],
    tier: 2, upgradeFromId: 'town_hall_1',
    cost: { gold: 120 }, buildTurns: 5,
    bonuses: { gold: 10, growthSlots: 1 },
    prerequisites: ['town_hall_1'],
    unlocksBuildings: ['town_hall_3'],
    demolishable: false,
    militiaBonus: 2,
    description: 'An imposing hall that marks this settlement as a regional center.',
  },
  {
    id: 'town_hall_3', name: 'Imperial Palace', emoji: '👑',
    cardImg: 'assets/cards/buildings/town_hall_3.png',
    factionId: null,
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'town_hall_2',
    cost: { gold: 240 }, buildTurns: 8,
    bonuses: { gold: 20, growthSlots: 2 },
    prerequisites: ['town_hall_2'],
    unlocksBuildings: [],
    demolishable: false,
    militiaBonus: 3,
    description: 'The seat of power. A symbol of dominance that inspires loyalty.',
  },

  // ── Market Chain (village / main_settlement) ────────────
  {
    id: 'market_1', name: 'Market', emoji: '🏪',
    cardImg: 'assets/cards/buildings/market_1.png',
    factionId: null,
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 1, upgradeFromId: null,
    cost: { gold: 50 }, buildTurns: 2,
    bonuses: { gold: 6 },
    prerequisites: [],
    unlocksBuildings: ['market_2'],
    description: 'A bustling trade post. Increases gold income.',
  },
  {
    id: 'market_2', name: 'Bazaar', emoji: '🛍️',
    cardImg: 'assets/cards/buildings/market_2.png',
    factionId: null,
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 2, upgradeFromId: 'market_1',
    cost: { gold: 110 }, buildTurns: 4,
    bonuses: { gold: 14 },
    prerequisites: ['market_1'],
    unlocksBuildings: ['market_3'],
    description: 'A great market drawing traders from afar.',
  },
  {
    id: 'market_3', name: 'Grand Emporium', emoji: '💰',
    cardImg: 'assets/cards/buildings/market_3.png',
    factionId: null,
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 3, upgradeFromId: 'market_2',
    cost: { gold: 220 }, buildTurns: 6,
    bonuses: { gold: 25 },
    prerequisites: ['market_2'],
    unlocksBuildings: [],
    description: 'A commercial powerhouse, the envy of rival factions.',
  },

  // ── Fort Chain (fort only) ──────────────────────────────
  {
    id: 'palisade', name: 'Palisade', emoji: '🪵',
    cardImg: 'assets/cards/buildings/palisade.png',
    factionId: null,
    allowedLocTypes: ['fort'],
    tier: 1, upgradeFromId: null,
    cost: { gold: 40 }, buildTurns: 2,
    bonuses: { defense: 0.10 },
    prerequisites: [],
    unlocksBuildings: ['fortress_1'],
    militiaBonus: 2,
    description: 'A sturdy wooden palisade. Provides basic defensive cover.',
  },
  {
    id: 'fortress_1', name: 'Stone Keep', emoji: '🏯',
    cardImg: 'assets/cards/buildings/fortress_1.png',
    factionId: null,
    allowedLocTypes: ['fort'],
    tier: 2, upgradeFromId: 'palisade',
    cost: { gold: 90 }, buildTurns: 4,
    bonuses: { defense: 0.20 },
    prerequisites: ['palisade'],
    unlocksBuildings: ['fortress_2'],
    militiaBonus: 3,
    description: 'A fortified stone keep. Significantly boosts province defense.',
  },
  {
    id: 'fortress_2', name: 'Citadel', emoji: '🏰',
    cardImg: 'assets/cards/buildings/fortress_2.png',
    factionId: null,
    allowedLocTypes: ['fort'],
    tier: 3, upgradeFromId: 'fortress_1',
    cost: { gold: 180 }, buildTurns: 6,
    bonuses: { defense: 0.35 },
    prerequisites: ['fortress_1'],
    unlocksBuildings: [],
    militiaBonus: 5,
    description: 'An impregnable stronghold. Near-impossible to take by direct assault.',
  },
];

// ─────────────────────────────────────────────────────────
// DWARVES — Undead Babylonian Dwarves
// ─────────────────────────────────────────────────────────

const DWARVES_CHAINS = [

  // ── Necropolis Chain (main_settlement) ──────────────────
  {
    id: 'necropolis_1', name: 'Crypt Workshop', emoji: '⚙️',
    cardImg: 'assets/cards/buildings/necropolis_1.png',
    factionId: 'dwarves',
    allowedLocTypes: ['main_settlement'],
    tier: 1, upgradeFromId: null,
    cost: { gold: 60, forge_iron: 10 }, buildTurns: 3,
    bonuses: { soul_essence: 3, forge_iron: 2 },
    prerequisites: ['town_hall_1'],
    unlocksBuildings: ['necropolis_2'],
    description: 'A workshop where bodies are reanimated and bound to iron frames.',
  },
  {
    id: 'necropolis_2', name: 'Ziggurat Forge', emoji: '🔩',
    cardImg: 'assets/cards/buildings/necropolis_2.png',
    factionId: 'dwarves',
    allowedLocTypes: ['main_settlement'],
    tier: 2, upgradeFromId: 'necropolis_1',
    cost: { gold: 130, forge_iron: 25, soul_essence: 10 }, buildTurns: 5,
    bonuses: { soul_essence: 6, forge_iron: 5 },
    prerequisites: ['necropolis_1'],
    unlocksBuildings: ['necropolis_3'],
    description: 'A towering dark forge upon a stepped ziggurat. Produces powerful war-golems.',
  },
  {
    id: 'necropolis_3', name: 'Black Ziggurat', emoji: '🗿',
    cardImg: 'assets/cards/buildings/necropolis_3.png',
    factionId: 'dwarves',
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'necropolis_2',
    cost: { gold: 260, forge_iron: 50, soul_essence: 25 }, buildTurns: 8,
    bonuses: { soul_essence: 12, forge_iron: 10, defense: 0.15 },
    prerequisites: ['necropolis_2'],
    unlocksBuildings: [],
    description: 'The pinnacle of undead dwarven craft. An eternal monument to the Dark God.',
  },

  // ── Bone-mine Chain (village) ────────────────────────────
  {
    id: 'bone_mine_1', name: 'Bone Pit', emoji: '💀',
    cardImg: 'assets/cards/buildings/bone_mine_1.png',
    factionId: 'dwarves',
    allowedLocTypes: ['village'],
    tier: 1, upgradeFromId: null,
    cost: { gold: 40 }, buildTurns: 2,
    bonuses: { soul_essence: 4 },
    prerequisites: [],
    unlocksBuildings: ['bone_mine_2'],
    description: 'Mass graves worked by undead labour. Produces Soul Essence steadily.',
  },
  {
    id: 'bone_mine_2', name: 'Ossuary Complex', emoji: '🦴',
    cardImg: 'assets/cards/buildings/bone_mine_2.png',
    factionId: 'dwarves',
    allowedLocTypes: ['village'],
    tier: 2, upgradeFromId: 'bone_mine_1',
    cost: { gold: 90, soul_essence: 15 }, buildTurns: 4,
    bonuses: { soul_essence: 9 },
    prerequisites: ['bone_mine_1'],
    unlocksBuildings: [],
    description: 'A vast complex of catacombs churning out Soul Essence at scale.',
  },
];

// ─────────────────────────────────────────────────────────
// ELVES — Elven Greek City States
// ─────────────────────────────────────────────────────────

const ELVES_CHAINS = [

  // ── Academy Chain (main_settlement) ─────────────────────
  {
    id: 'academy_1', name: 'Symposium', emoji: '📜',
    cardImg: 'assets/cards/buildings/academy_1.png',
    factionId: 'elves',
    allowedLocTypes: ['main_settlement'],
    tier: 1, upgradeFromId: null,
    cost: { gold: 55, philosophy: 5 }, buildTurns: 3,
    bonuses: { philosophy: 4, gold: 2 },
    prerequisites: ['town_hall_1'],
    unlocksBuildings: ['academy_2'],
    description: 'A gathering place for thinkers, poets, and philosophers.',
  },
  {
    id: 'academy_2', name: 'Academy', emoji: '🏛️',
    cardImg: 'assets/cards/buildings/academy_2.png',
    factionId: 'elves',
    allowedLocTypes: ['main_settlement'],
    tier: 2, upgradeFromId: 'academy_1',
    cost: { gold: 120, philosophy: 15 }, buildTurns: 5,
    bonuses: { philosophy: 9, gold: 4 },
    prerequisites: ['academy_1'],
    unlocksBuildings: ['academy_3'],
    description: 'A renowned school. Attracts scholars and improves all research.',
  },
  {
    id: 'academy_3', name: 'Great Library', emoji: '📚',
    cardImg: 'assets/cards/buildings/academy_3.png',
    factionId: 'elves',
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'academy_2',
    cost: { gold: 240, philosophy: 35 }, buildTurns: 7,
    bonuses: { philosophy: 18, gold: 8 },
    prerequisites: ['academy_2'],
    unlocksBuildings: [],
    description: 'The greatest repository of knowledge in the world.',
  },

  // ── Shipyard Chain (coastal village / coastal main_settlement) ──
  {
    id: 'shipyard_1', name: 'Boatyard', emoji: '⛵',
    cardImg: 'assets/cards/buildings/shipyard_1.png',
    factionId: 'elves',
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 1, upgradeFromId: null,
    cost: { gold: 50, timber: 8 }, buildTurns: 3,
    bonuses: { timber: 3, gold: 3 },
    prerequisites: [],
    unlocksBuildings: ['shipyard_2'],
    description: 'A basic shipyard. Provides timber income and trade access.',
  },
  {
    id: 'shipyard_2', name: 'Grand Shipyard', emoji: '🚢',
    cardImg: 'assets/cards/buildings/shipyard_2.png',
    factionId: 'elves',
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 2, upgradeFromId: 'shipyard_1',
    cost: { gold: 110, timber: 20 }, buildTurns: 5,
    bonuses: { timber: 7, gold: 6 },
    prerequisites: ['shipyard_1'],
    unlocksBuildings: [],
    description: 'A great naval yard producing fine elven warships.',
  },
];

// ─────────────────────────────────────────────────────────
// LIZARDS — Desert Hegemony
// ─────────────────────────────────────────────────────────

const LIZARDS_CHAINS = [

  // ── Temple Chain (main_settlement / shrine) ──────────────
  {
    id: 'temple_1', name: 'Sun Shrine', emoji: '☀️',
    cardImg: 'assets/cards/buildings/temple_1.png',
    factionId: 'lizards',
    allowedLocTypes: ['main_settlement', 'shrine'],
    tier: 1, upgradeFromId: null,
    cost: { gold: 50, faith: 5 }, buildTurns: 2,
    bonuses: { faith: 4, gold: 2 },
    prerequisites: [],
    unlocksBuildings: ['temple_2'],
    description: 'A modest shrine to the Sun God. Generates Faith and blesses the community.',
  },
  {
    id: 'temple_2', name: 'Sun Temple', emoji: '🛕',
    cardImg: 'assets/cards/buildings/temple_2.png',
    factionId: 'lizards',
    allowedLocTypes: ['main_settlement', 'shrine'],
    tier: 2, upgradeFromId: 'temple_1',
    cost: { gold: 110, faith: 15 }, buildTurns: 4,
    bonuses: { faith: 9, gold: 4 },
    prerequisites: ['temple_1'],
    unlocksBuildings: ['temple_3'],
    description: 'A towering temple complex. Faith flows in abundance.',
  },
  {
    id: 'temple_3', name: 'Great Pyramid', emoji: '🔺',
    cardImg: 'assets/cards/buildings/temple_3.png',
    factionId: 'lizards',
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'temple_2',
    cost: { gold: 220, faith: 35, grain: 20 }, buildTurns: 7,
    bonuses: { faith: 18, gold: 6, defense: 0.10 },
    prerequisites: ['temple_2'],
    unlocksBuildings: [],
    description: 'An eternal pyramid monument. Inspires devotion and awe across the Hegemony.',
  },

  // ── Granary Chain (village / plains province) ────────────
  {
    id: 'granary_1', name: 'Granary', emoji: '🌾',
    cardImg: 'assets/cards/buildings/granary_1.png',
    factionId: 'lizards',
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 1, upgradeFromId: null,
    cost: { gold: 45 }, buildTurns: 2,
    bonuses: { grain: 4, gold: 1 },
    prerequisites: [],
    unlocksBuildings: ['granary_2'],
    description: 'A storehouse for surplus grain. Supports larger armies.',
  },
  {
    id: 'granary_2', name: 'Great Storehouse', emoji: '🏗️',
    cardImg: 'assets/cards/buildings/granary_2.png',
    factionId: 'lizards',
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 2, upgradeFromId: 'granary_1',
    cost: { gold: 100, grain: 15 }, buildTurns: 4,
    bonuses: { grain: 9, gold: 3 },
    prerequisites: ['granary_1'],
    unlocksBuildings: [],
    description: 'Massive food reserves enabling sustained military campaigns.',
  },
];

// ─────────────────────────────────────────────────────────
// DRAIG — Y Draig Goch
// ─────────────────────────────────────────────────────────

const DRAIG_CHAINS = [

  // ── Dragon Shrine Chain (main_settlement / shrine) ───────
  {
    id: 'dragon_shrine_1', name: 'Dragon Altar', emoji: '🔥',
    cardImg: 'assets/cards/buildings/dragon_shrine_1.png',
    factionId: 'draig',
    allowedLocTypes: ['main_settlement', 'shrine'],
    tier: 1, upgradeFromId: null,
    cost: { gold: 55, honor: 5 }, buildTurns: 3,
    bonuses: { dragon_essence: 3, honor: 2 },
    prerequisites: [],
    unlocksBuildings: ['dragon_shrine_2'],
    description: 'A sacred altar where warriors offer tribute to the Red Dragon.',
  },
  {
    id: 'dragon_shrine_2', name: 'Dragon Shrine', emoji: '🐉',
    cardImg: 'assets/cards/buildings/dragon_shrine_2.png',
    factionId: 'draig',
    allowedLocTypes: ['main_settlement', 'shrine'],
    tier: 2, upgradeFromId: 'dragon_shrine_1',
    cost: { gold: 120, honor: 15, dragon_essence: 10 }, buildTurns: 5,
    bonuses: { dragon_essence: 7, honor: 4 },
    prerequisites: ['dragon_shrine_1'],
    unlocksBuildings: ['dragon_shrine_3'],
    description: 'A grand shrine. Dragon Essence flows freely, strengthening the clan.',
  },
  {
    id: 'dragon_shrine_3', name: 'Dragon Sanctum', emoji: '🏮',
    cardImg: 'assets/cards/buildings/dragon_shrine_3.png',
    factionId: 'draig',
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'dragon_shrine_2',
    cost: { gold: 240, honor: 35, dragon_essence: 25 }, buildTurns: 8,
    bonuses: { dragon_essence: 15, honor: 8, defense: 0.12 },
    prerequisites: ['dragon_shrine_2'],
    unlocksBuildings: [],
    description: 'The holiest sanctum of the Dragon Cult. Said to draw the eye of the Red Dragon itself.',
  },

  // ── Dojo Chain (fort / village) ──────────────────────────
  {
    id: 'dojo_1', name: 'Training Ground', emoji: '⚔️',
    cardImg: 'assets/cards/buildings/dojo_1.png',
    factionId: 'draig',
    allowedLocTypes: ['fort', 'village'],
    tier: 1, upgradeFromId: null,
    cost: { gold: 50, honor: 5 }, buildTurns: 2,
    bonuses: { honor: 3 },
    prerequisites: [],
    unlocksBuildings: ['dojo_2'],
    description: 'Warriors train relentlessly here. Honor flows from discipline.',
  },
  {
    id: 'dojo_2', name: 'Dojo', emoji: '🥋',
    cardImg: 'assets/cards/buildings/dojo_2.png',
    factionId: 'draig',
    allowedLocTypes: ['fort', 'village'],
    tier: 2, upgradeFromId: 'dojo_1',
    cost: { gold: 110, honor: 20 }, buildTurns: 4,
    bonuses: { honor: 7 },
    prerequisites: ['dojo_1'],
    unlocksBuildings: [],
    description: 'A respected dojo. Produces elite warrior-monks bound by the dragon code.',
  },
];

// ─────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────

export const BUILDINGS = [
  ...GENERIC_CHAINS,
  ...DWARVES_CHAINS,
  ...ELVES_CHAINS,
  ...LIZARDS_CHAINS,
  ...DRAIG_CHAINS,
];

/** Fast lookup by building id */
export const BUILDING_MAP = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

/** Get all buildings available to a faction (generic + faction-specific) */
export function getBuildingsForFaction(factionId) {
  return BUILDINGS.filter(b => b.factionId === null || b.factionId === factionId);
}

/** Get all buildings that can be built at a given location type for a faction */
export function getBuildingsForLocation(factionId, locationType, existingBuildingIds = []) {
  const available = getBuildingsForFaction(factionId).filter(b =>
    b.allowedLocTypes.includes(locationType)
  );
  // Filter to buildings whose prerequisites are met and not already built
  return available.filter(b => {
    if (existingBuildingIds.includes(b.id)) return false;
    if (b.upgradeFromId && !existingBuildingIds.includes(b.upgradeFromId)) return false;
    if (!b.prerequisites.every(pId => existingBuildingIds.includes(pId))) return false;
    // Hide buildings that have been superseded (a higher tier is already installed)
    const isSuperseded = BUILDINGS.some(
      other => other.upgradeFromId === b.id && existingBuildingIds.includes(other.id)
    );
    if (isSuperseded) return false;
    return true;
  });
}
