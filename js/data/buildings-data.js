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
 *   category      — BUILDING_CATEGORIES value (used by tech bonuses)
 *   techRequired  — tech id that must be unlocked before this building appears; null = always available
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

import { BUILDING_CATEGORIES } from './enums.js';

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
    category: BUILDING_CATEGORIES.ADMINISTRATION,
    techRequired: null,
    cost: { gold: 60 }, buildTurns: 3,
    bonuses: { gold: 5, faction_primary_adv: 1, growthSlots: 1, research: 2 },
    prerequisites: [],
    unlocksBuildings: ['town_hall_2'],
    demolishable: false,
    militiaBonus: 3,
    description: 'A rudimentary seat of local governance. Enables further development.',
  },
  {
    id: 'town_hall_2', name: 'Grand Hall', emoji: '🏰',
    cardImg: 'assets/cards/buildings/town_hall_2.png',
    factionId: null,
    allowedLocTypes: ['main_settlement'],
    tier: 2, upgradeFromId: 'town_hall_1',
    category: BUILDING_CATEGORIES.ADMINISTRATION,
    techRequired: 'pottery',
    cost: { gold: 120 }, buildTurns: 5,
    bonuses: { gold: 10, faction_primary_adv: 2, growthSlots: 2, research: 2 },
    prerequisites: ['town_hall_1'],
    unlocksBuildings: ['town_hall_3'],
    demolishable: false,
    militiaBonus: 4,
    description: 'An imposing hall that marks this settlement as a regional center.',
  },
  {
    id: 'town_hall_3', name: 'Imperial Palace', emoji: '👑',
    cardImg: 'assets/cards/buildings/town_hall_3.png',
    factionId: null,
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'town_hall_2',
    category: BUILDING_CATEGORIES.ADMINISTRATION,
    techRequired: 'monarchy',
    cost: { gold: 240 }, buildTurns: 8,
    bonuses: { gold: 20, faction_primary_adv: 2, growthSlots: 3, research: 2 },
    prerequisites: ['town_hall_2'],
    unlocksBuildings: [],
    demolishable: false,
    militiaBonus: 6,
    description: 'The seat of power. A symbol of dominance that inspires loyalty.',
  },

  // ── Mercantile Base Chain (village only, pre-placed) ────
  {
    id: 'mercantile_1', name: 'Hamlet', emoji: '🏘️',
    cardImg: 'assets/cards/buildings/mercantile_1.png',
    factionId: null,
    allowedLocTypes: ['village'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: null,
    cost: { gold: 0 }, buildTurns: 1,
    bonuses: { gold: 2 },
    prerequisites: [],
    unlocksBuildings: ['mercantile_2'],
    demolishable: false,
    description: 'A small farming hamlet. Generates modest income.',
  },
  {
    id: 'mercantile_2', name: 'Village', emoji: '🏡',
    cardImg: 'assets/cards/buildings/mercantile_2.png',
    factionId: null,
    allowedLocTypes: ['village'],
    tier: 2, upgradeFromId: 'mercantile_1',
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: 'pottery',
    cost: { gold: 120 }, buildTurns: 3,
    bonuses: { gold: 4, growthSlots: 1 },
    prerequisites: ['mercantile_1'],
    unlocksBuildings: ['mercantile_3'],
    demolishable: false,
    description: 'A prosperous village with organised trade. Unlocks an extra building slot.',
  },
  {
    id: 'mercantile_3', name: 'Town', emoji: '🏙️',
    cardImg: 'assets/cards/buildings/mercantile_3.png',
    factionId: null,
    allowedLocTypes: ['village'],
    tier: 3, upgradeFromId: 'mercantile_2',
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: null,
    cost: { gold: 250 }, buildTurns: 5,
    bonuses: { gold: 10, growthSlots: 2 },
    prerequisites: ['mercantile_2'],
    unlocksBuildings: [],
    demolishable: false,
    description: 'A thriving town and economic hub. Opens two additional building slots.',
  },

  // ── Religious Base Chain (shrine only, pre-placed) ──────
  {
    id: 'religious_1', name: 'Shrine', emoji: '🛕',
    cardImg: 'assets/cards/buildings/religious_1.png',
    factionId: null,
    allowedLocTypes: ['shrine'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 0 }, buildTurns: 1,
    bonuses: { faction_primary_adv: 1 },
    prerequisites: [],
    unlocksBuildings: ['religious_2'],
    demolishable: false,
    description: 'A modest place of worship. Channels the primary resource of your people.',
  },
  {
    id: 'religious_2', name: 'Temple', emoji: '⛪',
    cardImg: 'assets/cards/buildings/religious_2.png',
    factionId: null,
    allowedLocTypes: ['shrine'],
    tier: 2, upgradeFromId: 'religious_1',
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: 'worship',
    cost: { gold: 140 }, buildTurns: 4,
    bonuses: { faction_primary_adv: 2 },
    prerequisites: ['religious_1'],
    unlocksBuildings: ['religious_3'],
    demolishable: false,
    description: 'A revered temple drawing devoted followers. Doubles primary resource output.',
  },
  {
    id: 'religious_3', name: 'Cathedral', emoji: '🕌',
    cardImg: 'assets/cards/buildings/religious_3.png',
    factionId: null,
    allowedLocTypes: ['shrine'],
    tier: 3, upgradeFromId: 'religious_2',
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 300 }, buildTurns: 6,
    bonuses: { faction_primary_adv: 3, growthSlots: 1 },
    prerequisites: ['religious_2'],
    unlocksBuildings: [],
    demolishable: false,
    description: 'A grand cathedral of devotion. Major primary resource output and expands the sacred district.',
  },

  // ── Barracks — enables tier-1 unit recruitment + +1 militia ──
  {
    id: 'barracks', name: 'Barracks', emoji: '🛡️',
    cardImg: 'assets/cards/buildings/barracks.png',
    factionId: null,
    allowedLocTypes: ['village', 'fort', 'main_settlement'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRAINING,
    techRequired: null,
    cost: { gold: 50 }, buildTurns: 2,
    bonuses: {},
    militiaBonus: 1,
    prerequisites: [],
    unlocksBuildings: [],
    description: 'A garrison barracks. Expands local militia and enables basic unit recruitment from this fort.',
  },

  // ── Market Chain (village / main_settlement) ────────────
  {
    id: 'market_1', name: 'Market', emoji: '🏪',
    cardImg: 'assets/cards/buildings/market_1.png',
    factionId: null,
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: null,
    cost: { gold: 50 }, buildTurns: 2,
    bonuses: { gold: 5 },
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
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: null,
    cost: { gold: 110 }, buildTurns: 4,
    bonuses: { gold: 12 },
    prerequisites: ['market_1'],
    mainBuildingTier: 2,
    unlocksBuildings: ['market_3'],
    description: 'A great market drawing traders from afar.',
  },
  {
    id: 'market_3', name: 'Grand Emporium', emoji: '💰',
    cardImg: 'assets/cards/buildings/market_3.png',
    factionId: null,
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 3, upgradeFromId: 'market_2',
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: null,
    cost: { gold: 220 }, buildTurns: 6,
    bonuses: { gold: 24 },
    prerequisites: ['market_2'],
    mainBuildingTier: 3,
    unlocksBuildings: [],
    description: 'A commercial powerhouse, the envy of rival factions.',
  },

  // ── Reliquary (shrine) — produces secondary adv resource ─
  {
    id: 'reliquary', name: 'Reliquary', emoji: '✨',
    cardImg: 'assets/cards/buildings/reliquary.png',
    factionId: null,
    allowedLocTypes: ['shrine'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 80 }, buildTurns: 3,
    bonuses: { faction_secondary_adv: 1 },
    prerequisites: [],
    mainBuildingTier: 1,
    unlocksBuildings: [],
    description: 'A sacred vault housing holy relics. Channels the deeper mysteries of your faction for +1 secondary advanced resource.',
  },

  // ── Military Base Chain (fort only, pre-placed) ─────────
  {
    id: 'palisade', name: 'Hill Fort', emoji: '⛺',
    cardImg: 'assets/cards/buildings/palisade.png',
    factionId: null,
    allowedLocTypes: ['fort'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.DEFENSIVE,
    techRequired: null,
    cost: { gold: 0 }, buildTurns: 1,
    bonuses: { defense: 0.10 },
    prerequisites: [],
    unlocksBuildings: ['fortress_1'],
    demolishable: false,
    militiaBonus: 2,
    description: 'A fortified hill position providing basic defensive cover and local militia.',
  },
  {
    id: 'fortress_1', name: 'Stone Fort', emoji: '🏯',
    cardImg: 'assets/cards/buildings/fortress_1.png',
    factionId: null,
    allowedLocTypes: ['fort'],
    tier: 2, upgradeFromId: 'palisade',
    category: BUILDING_CATEGORIES.DEFENSIVE,
    techRequired: 'masonry',
    cost: { gold: 90 }, buildTurns: 4,
    bonuses: { defense: 0.15 },
    prerequisites: ['palisade'],
    unlocksBuildings: ['fortress_2'],
    demolishable: false,
    militiaBonus: 3,
    description: 'Stone fortifications significantly bolstering the province against assault.',
  },
  {
    id: 'fortress_2', name: 'Stone Castle', emoji: '🏰',
    cardImg: 'assets/cards/buildings/fortress_2.png',
    factionId: null,
    allowedLocTypes: ['fort'],
    tier: 3, upgradeFromId: 'fortress_1',
    category: BUILDING_CATEGORIES.DEFENSIVE,
    techRequired: 'castle_construction',
    cost: { gold: 180 }, buildTurns: 6,
    bonuses: { defense: 0.20, growthSlots: 1 },
    prerequisites: ['fortress_1'],
    unlocksBuildings: [],
    demolishable: false,
    militiaBonus: 4,
    description: 'A formidable castle. Near-impregnable, supports expanded military development.',
  },

  // ── Research Chain (main_settlement) ────────────────────
  {
    id: 'library', name: 'Library', emoji: '📖',
    cardImg: 'assets/cards/buildings/library.png',
    factionId: null,
    allowedLocTypes: ['main_settlement'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.SCIENTIFIC,
    techRequired: 'writing',
    cost: { gold: 60 }, buildTurns: 2,
    bonuses: { research: 1 },
    prerequisites: [],
    unlocksBuildings: ['scriptorium'],
    demolishable: true,
    description: 'A place of learning that generates basic research each turn.',
  },
  {
    id: 'scriptorium', name: 'Scriptorium', emoji: '📜',
    cardImg: 'assets/cards/buildings/scriptorium.png',
    factionId: null,
    allowedLocTypes: ['main_settlement'],
    tier: 2, upgradeFromId: 'library',
    category: BUILDING_CATEGORIES.SCIENTIFIC,
    techRequired: null,
    cost: { gold: 100 }, buildTurns: 3,
    bonuses: { research: 2 },
    prerequisites: ['library'],
    unlocksBuildings: ['research_academy'],
    demolishable: true,
    description: 'Scholars copy and expand knowledge, increasing research output.',
  },
  {
    id: 'research_academy', name: 'Academy', emoji: '🏛️',
    cardImg: 'assets/cards/buildings/research_academy.png',
    factionId: null,
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'scriptorium',
    category: BUILDING_CATEGORIES.SCIENTIFIC,
    techRequired: 'universities',
    cost: { gold: 160 }, buildTurns: 4,
    bonuses: { research: 3 },
    prerequisites: ['scriptorium'],
    unlocksBuildings: [],
    demolishable: true,
    description: 'The pinnacle of scholarly achievement, producing research rapidly each turn.',
  },

  // ── Fishing Raft (capital + mercantile — unlocked by Fishing) ──
  {
    id: 'fishing_raft', name: 'Fishing Raft', emoji: '🛶',
    cardImg: 'assets/cards/buildings/fishing_raft.png',
    factionId: null,
    allowedLocTypes: ['main_settlement', 'village'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: 'fishing',
    cost: { gold: 30 }, buildTurns: 1,
    bonuses: { gold: 3 },
    prerequisites: [], unlocksBuildings: [], demolishable: true,
    description: 'A simple fishing platform that yields steady coastal bounty.',
  },

  // ── Copper Mine (mercantile — unlocked by Mining) ───────
  {
    id: 'copper_mine', name: 'Copper Mine', emoji: '⛏️',
    cardImg: 'assets/cards/buildings/copper_mine.png',
    factionId: null,
    allowedLocTypes: ['village'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: 'mining',
    cost: { gold: 60 }, buildTurns: 2,
    bonuses: { gold: 5 },
    prerequisites: [], unlocksBuildings: [], demolishable: true,
    description: 'Open-cast copper extraction generating consistent metal income.',
  },

  // ── Ranch (mercantile — unlocked by Animal Husbandry) ───
  {
    id: 'ranch', name: 'Ranch', emoji: '🐄',
    cardImg: 'assets/cards/buildings/ranch.png',
    factionId: null,
    allowedLocTypes: ['village'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: 'animal_husbandry',
    cost: { gold: 60 }, buildTurns: 2,
    bonuses: { gold: 2, faction_primary_adv: 1 },
    prerequisites: [], unlocksBuildings: [], demolishable: true,
    description: 'Domesticated herds provide food, hides, and trade goods.',
  },

  // ── Monastic School (shrine) ─────────────────────────────
  {
    id: 'monastic_school', name: 'Monastic School', emoji: '🕍',
    cardImg: 'assets/cards/buildings/monastic_school.png',
    factionId: null,
    allowedLocTypes: ['shrine'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.SCIENTIFIC,
    techRequired: 'writing',
    cost: { gold: 60 }, buildTurns: 2,
    bonuses: { research: 1 },
    prerequisites: [],
    unlocksBuildings: [],
    demolishable: true,
    description: 'Monks preserve ancient texts, slowly generating research each turn.',
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
    category: BUILDING_CATEGORIES.SCIENTIFIC,
    techRequired: null,
    cost: { gold: 60, forge_iron: 10 }, buildTurns: 3,
    bonuses: { soul_essence: 1, forge_iron: 1 },
    prerequisites: [],
    mainBuildingTier: 1,
    unlocksBuildings: ['necropolis_2'],
    description: 'A workshop where bodies are reanimated and bound to iron frames.',
  },
  {
    id: 'necropolis_2', name: 'Ziggurat Forge', emoji: '🔩',
    cardImg: 'assets/cards/buildings/necropolis_2.png',
    factionId: 'dwarves',
    allowedLocTypes: ['main_settlement'],
    tier: 2, upgradeFromId: 'necropolis_1',
    category: BUILDING_CATEGORIES.SCIENTIFIC,
    techRequired: null,
    cost: { gold: 130, forge_iron: 25, soul_essence: 10 }, buildTurns: 5,
    bonuses: { soul_essence: 2, forge_iron: 1 },
    prerequisites: ['necropolis_1'],
    mainBuildingTier: 2,
    unlocksBuildings: ['necropolis_3'],
    description: 'A towering dark forge upon a stepped ziggurat. Produces powerful war-golems.',
  },
  {
    id: 'necropolis_3', name: 'Black Ziggurat', emoji: '🗿',
    cardImg: 'assets/cards/buildings/necropolis_3.png',
    factionId: 'dwarves',
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'necropolis_2',
    category: BUILDING_CATEGORIES.SCIENTIFIC,
    techRequired: null,
    cost: { gold: 260, forge_iron: 50, soul_essence: 25 }, buildTurns: 8,
    bonuses: { soul_essence: 3, forge_iron: 2, defense: 0.15 },
    prerequisites: ['necropolis_2'],
    mainBuildingTier: 3,
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
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: null,
    cost: { gold: 40 }, buildTurns: 2,
    bonuses: { soul_essence: 1 },
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
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: null,
    cost: { gold: 90, soul_essence: 15 }, buildTurns: 4,
    bonuses: { soul_essence: 2 },
    prerequisites: ['bone_mine_1'],
    mainBuildingTier: 2,
    unlocksBuildings: [],
    description: 'A vast complex of catacombs churning out Soul Essence at scale.',
  },
];

// ─────────────────────────────────────────────────────────
// ELVES — Elven City States
// ─────────────────────────────────────────────────────────

const ELVES_CHAINS = [

  // ── Academy Chain (main_settlement) ─────────────────────
  {
    id: 'academy_1', name: 'Symposium', emoji: '📜',
    cardImg: 'assets/cards/buildings/academy_1.png',
    factionId: 'elves',
    allowedLocTypes: ['main_settlement'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.SCIENTIFIC,
    techRequired: null,
    cost: { gold: 55, philosophy: 5 }, buildTurns: 3,
    bonuses: { philosophy: 1, gold: 2 },
    prerequisites: [],
    mainBuildingTier: 1,
    unlocksBuildings: ['academy_2'],
    description: 'A gathering place for thinkers, poets, and philosophers.',
  },
  {
    id: 'academy_2', name: 'Academy', emoji: '🏛️',
    cardImg: 'assets/cards/buildings/academy_2.png',
    factionId: 'elves',
    allowedLocTypes: ['main_settlement'],
    tier: 2, upgradeFromId: 'academy_1',
    category: BUILDING_CATEGORIES.SCIENTIFIC,
    techRequired: null,
    cost: { gold: 120, philosophy: 15 }, buildTurns: 5,
    bonuses: { philosophy: 2, gold: 4 },
    prerequisites: ['academy_1'],
    mainBuildingTier: 2,
    unlocksBuildings: ['academy_3'],
    description: 'A renowned school. Attracts scholars and improves all research.',
  },
  {
    id: 'academy_3', name: 'Great Library', emoji: '📚',
    cardImg: 'assets/cards/buildings/academy_3.png',
    factionId: 'elves',
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'academy_2',
    category: BUILDING_CATEGORIES.SCIENTIFIC,
    techRequired: null,
    cost: { gold: 240, philosophy: 35 }, buildTurns: 7,
    bonuses: { philosophy: 3, gold: 8 },
    prerequisites: ['academy_2'],
    mainBuildingTier: 3,
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
    category: BUILDING_CATEGORIES.EXPLORATION,
    techRequired: null,
    cost: { gold: 50, timber: 8 }, buildTurns: 3,
    bonuses: { timber: 1, gold: 3 },
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
    category: BUILDING_CATEGORIES.EXPLORATION,
    techRequired: null,
    cost: { gold: 110, timber: 20 }, buildTurns: 5,
    bonuses: { timber: 2, gold: 6 },
    prerequisites: ['shipyard_1'],
    mainBuildingTier: 2,
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
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 50, faith: 5 }, buildTurns: 2,
    bonuses: { faith: 1, gold: 2 },
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
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 110, faith: 15 }, buildTurns: 4,
    bonuses: { faith: 2, gold: 4 },
    prerequisites: ['temple_1'],
    mainBuildingTier: 2,
    unlocksBuildings: ['temple_3'],
    description: 'A towering temple complex. Faith flows in abundance.',
  },
  {
    id: 'temple_3', name: 'Great Pyramid', emoji: '🔺',
    cardImg: 'assets/cards/buildings/temple_3.png',
    factionId: 'lizards',
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'temple_2',
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 220, faith: 35, grain: 20 }, buildTurns: 7,
    bonuses: { faith: 3, gold: 6, defense: 0.10 },
    prerequisites: ['temple_2'],
    mainBuildingTier: 3,
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
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: null,
    cost: { gold: 45 }, buildTurns: 2,
    bonuses: { grain: 1, gold: 1 },
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
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: null,
    cost: { gold: 100, grain: 15 }, buildTurns: 4,
    bonuses: { grain: 2, gold: 3 },
    prerequisites: ['granary_1'],
    mainBuildingTier: 2,
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
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 55, honor: 5 }, buildTurns: 3,
    bonuses: { dragon_essence: 1, honor: 1 },
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
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 120, honor: 15, dragon_essence: 10 }, buildTurns: 5,
    bonuses: { dragon_essence: 2, honor: 1 },
    prerequisites: ['dragon_shrine_1'],
    mainBuildingTier: 2,
    unlocksBuildings: ['dragon_shrine_3'],
    description: 'A grand shrine. Dragon Essence flows freely, strengthening the clan.',
  },
  {
    id: 'dragon_shrine_3', name: 'Dragon Sanctum', emoji: '🏮',
    cardImg: 'assets/cards/buildings/dragon_shrine_3.png',
    factionId: 'draig',
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'dragon_shrine_2',
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 240, honor: 35, dragon_essence: 25 }, buildTurns: 8,
    bonuses: { dragon_essence: 3, honor: 2, defense: 0.12 },
    prerequisites: ['dragon_shrine_2'],
    mainBuildingTier: 3,
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
    category: BUILDING_CATEGORIES.TRAINING,
    techRequired: null,
    cost: { gold: 50, honor: 5 }, buildTurns: 2,
    bonuses: { honor: 1 },
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
    category: BUILDING_CATEGORIES.TRAINING,
    techRequired: null,
    cost: { gold: 110, honor: 20 }, buildTurns: 4,
    bonuses: { honor: 2 },
    prerequisites: ['dojo_1'],
    mainBuildingTier: 2,
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

/**
 * The three-tier main building chain for each location type.
 * Used to gate secondary chain upgrades: a building with mainBuildingTier:N
 * requires LOCATION_MAIN_CHAIN[locationType][N-1] to be installed first.
 */
export const LOCATION_MAIN_CHAIN = {
  main_settlement: ['town_hall_1',  'town_hall_2',  'town_hall_3'],
  village:         ['mercantile_1', 'mercantile_2', 'mercantile_3'],
  shrine:          ['religious_1',  'religious_2',  'religious_3'],
  fort:            ['palisade',     'fortress_1',   'fortress_2'],
};

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
    // Require the location's main building to be at or above the specified tier
    // (upgrading replaces the lower-tier building, so tier 2 satisfies a tier-1 requirement)
    if (b.mainBuildingTier != null) {
      const chain = LOCATION_MAIN_CHAIN[locationType];
      const satisfied = chain?.slice(b.mainBuildingTier - 1).some(id => existingBuildingIds.includes(id));
      if (!satisfied) return false;
    }
    // Hide buildings that have been superseded (a higher tier is already installed)
    const isSuperseded = BUILDINGS.some(
      other => other.upgradeFromId === b.id && existingBuildingIds.includes(other.id)
    );
    if (isSuperseded) return false;
    return true;
  });
}
