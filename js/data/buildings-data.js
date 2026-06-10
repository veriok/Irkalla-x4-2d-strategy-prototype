/**
 * buildings-data.js
 *
 * Linear upgrade chains (no branching).
 * Each building has:
 *   id            — unique string
 *   name          — display name
 *   emoji         — icon
 *   factionId     — null = available to all; faction id = faction-specific
 *   allowedLocTypes — which location types can host this building
 *   tier          — 1,2,3 within a chain (for slot management)
 *   upgradeFromId — id of the building this replaces (null for tier-1)
 *   category      — BUILDING_CATEGORIES value (used by tech bonuses)
 *   techRequired  — tech id that must be unlocked; null = always available
 *   cost          — { [resourceId]: amount }
 *   buildTurns    — turns in production queue
 *   bonuses       — applied additively to faction resource income per turn:
 *                   { [resourceId]: amount, defense: flat_bonus, growthSlots: +N }
 *                   Special keys: faction_primary_adv → advanced[0], faction_secondary_adv → advanced[1]
 *   prerequisites — building ids that must already be built in same location
 *   unlocksBuildings — building ids that become available after built
 *   militiaBonus  — flat militia strength bonus
 *   demolishable  — whether player can raze this building (default true)
 *   requiresCoastalProvince — true = only buildable in coastal provinces
 *   maxPerProvince — max instances of this building per province (default unlimited)
 *   description   — flavour text
 */

import { BUILDING_CATEGORIES, FACTION_IDS } from './enums.js';

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
    heroCountBonus: 1,
    description: 'A rudimentary seat of local governance. Enables further development. Allows recruitment of 1 hero.',
  },
  {
    id: 'town_hall_2', name: 'Grand Hall', emoji: '🏰',
    cardImg: 'assets/cards/buildings/town_hall_2.png',
    factionId: null,
    allowedLocTypes: ['main_settlement'],
    tier: 2, upgradeFromId: 'town_hall_1',
    category: BUILDING_CATEGORIES.ADMINISTRATION,
    techRequired: 'pottery',
    cost: { gold: 120, faction_primary_adv: 5 }, buildTurns: 5,
    bonuses: { gold: 10, faction_primary_adv: 2, growthSlots: 2, research: 2 },
    prerequisites: ['town_hall_1'],
    unlocksBuildings: ['town_hall_3'],
    demolishable: false,
    militiaBonus: 4,
    heroCountBonus: 1,
    description: 'An imposing hall that marks this settlement as a regional center. Allows recruitment of 1 hero.',
  },
  {
    id: 'town_hall_3', name: 'Imperial Palace', emoji: '👑',
    cardImg: 'assets/cards/buildings/town_hall_3.png',
    factionId: null,
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'town_hall_2',
    category: BUILDING_CATEGORIES.ADMINISTRATION,
    techRequired: 'monarchy',
    cost: { gold: 240, faction_primary_adv: 15 }, buildTurns: 8,
    bonuses: { gold: 20, faction_primary_adv: 2, growthSlots: 3, research: 2 },
    prerequisites: ['town_hall_2'],
    unlocksBuildings: [],
    demolishable: false,
    militiaBonus: 6,
    heroCountBonus: 1,
    description: 'The seat of power. A symbol of dominance that inspires loyalty. Allows recruitment of 1 hero.',
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
    techRequired: 'trade_networks',
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
    disabledFactions: [FACTION_IDS.KUR_MARGAL, FACTION_IDS.DRAIG_GOCH, FACTION_IDS.SUTEKH_RA],
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
    disabledFactions: [FACTION_IDS.KUR_MARGAL, FACTION_IDS.DRAIG_GOCH, FACTION_IDS.SUTEKH_RA],
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

  // ── Training Building Chain ─────────────────────────────
  {
    id: 'mustering_field', name: 'Mustering Field', emoji: '⛺',
    cardImg: 'assets/cards/buildings/mustering_field.png',
    factionId: null,
    allowedLocTypes: ['village', 'fort', 'main_settlement'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRAINING,
    techRequired: 'warbands',
    cost: { gold: 50 }, buildTurns: 2,
    bonuses: {},
    militiaBonus: 1,
    prerequisites: [],
    unlocksBuildings: ['warrior_lodge'],
    description: 'A basic mustering ground for clan warbands. Enables unit recruitment and bolsters local militia.',
  },
  {
    id: 'warrior_lodge', name: 'Warrior Lodge', emoji: '🏕️',
    cardImg: 'assets/cards/buildings/warrior_lodge.png',
    factionId: null,
    allowedLocTypes: ['fort', 'main_settlement'],
    tier: 2, upgradeFromId: 'mustering_field',
    category: BUILDING_CATEGORIES.TRAINING,
    techRequired: 'clan_warfare',
    cost: { gold: 100, faction_primary_adv: 5 }, buildTurns: 4,
    bonuses: { recruitSpeed: 1 },
    militiaBonus: 1,
    prerequisites: [],
    unlocksBuildings: ['barracks'],
    description: 'A martial lodge where seasoned warriors train recruits. Reduces all unit recruit time by 1 turn.',
  },
  {
    id: 'barracks', name: 'Barracks', emoji: '🛡️',
    cardImg: 'assets/cards/buildings/barracks.png',
    factionId: null,
    allowedLocTypes: ['fort', 'main_settlement'],
    tier: 3, upgradeFromId: 'warrior_lodge',
    category: BUILDING_CATEGORIES.TRAINING,
    techRequired: 'battle_formations',
    cost: { gold: 180, faction_primary_adv: 10 }, buildTurns: 5,
    bonuses: { recruitSpeed: 1 },
    militiaBonus: 2,
    prerequisites: [],
    unlocksBuildings: [],
    description: 'A professional garrison barracks with organised drill. Further reduces recruit time and greatly expands local militia.',
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
    bonuses: { gold: 3 },
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
    bonuses: { gold: 10 },
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
    bonuses: { gold: 20 },
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
    disabledFactions: [FACTION_IDS.KUR_MARGAL, FACTION_IDS.DRAIG_GOCH, FACTION_IDS.SUTEKH_RA],
    allowedLocTypes: ['shrine'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 80 }, buildTurns: 3,
    bonuses: { faction_secondary_adv: 1 },
    prerequisites: [],
    mainBuildingTier: 1,
    unlocksBuildings: [],
    description: 'A sacred vault housing holy relics. Generates +1 secondary advanced resource.',
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
    bonuses: { defense: 0.10, firstStrikeChance: 0.04 },
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
    cost: { gold: 90, faction_primary_adv: 5 }, buildTurns: 4,
    bonuses: { defense: 0.15, firstStrikeChance: 0.08 },
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
    cost: { gold: 180, faction_primary_adv: 15 }, buildTurns: 6,
    bonuses: { defense: 0.20, growthSlots: 1, firstStrikeChance: 0.12 },
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

  // ── Fishing Raft ─────────────────────────────────────────
  {
    id: 'fishing_raft', name: 'Fishing Raft', emoji: '🛶',
    cardImg: 'assets/cards/buildings/fishing_raft.png',
    factionId: null,
    allowedLocTypes: ['main_settlement', 'village'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: 'fishing',
    requiresCoastalProvince: true,
    cost: { gold: 30 }, buildTurns: 1,
    bonuses: { gold: 3 },
    prerequisites: [], unlocksBuildings: [], demolishable: true,
    description: 'A simple fishing platform that yields steady coastal bounty.',
  },

  // ── Copper Mine ──────────────────────────────────────────
  {
    id: 'copper_mine', name: 'Copper Mine', emoji: '⛏️',
    cardImg: 'assets/cards/buildings/copper_mine.png',
    factionId: null,
    allowedLocTypes: ['village'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: 'mining',
    requiresBiome: ['mountains', 'hills'],
    cost: { gold: 60 }, buildTurns: 2,
    bonuses: { gold: 5 },
    prerequisites: [], unlocksBuildings: [], demolishable: true,
    description: 'Open-cast copper extraction generating consistent metal income.',
  },

  // ── Ranch ────────────────────────────────────────────────
  {
    id: 'ranch', name: 'Ranch', emoji: '🐄',
    cardImg: 'assets/cards/buildings/ranch.png',
    factionId: null,
    allowedLocTypes: ['village'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: 'animal_husbandry',
    requiresBiome: ['hills', 'plains', 'forest'],
    cost: { gold: 60 }, buildTurns: 2,
    bonuses: { gold: 2, faction_primary_adv: 1 },
    prerequisites: [], unlocksBuildings: [], demolishable: true,
    description: 'Domesticated herds provide food, hides, and trade goods.',
  },

  // ── Monastic School ──────────────────────────────────────
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

  // ── Generic Forge Chain (main_settlement / fort — disabled for dwarf factions) ──
  {
    id: 'forge_1', name: 'Smithy', emoji: '🔨',
    cardImg: 'assets/cards/buildings/forge_1.png',
    factionId: null,
    disabledFactions: [FACTION_IDS.KUR_MARGAL, FACTION_IDS.IRON_FREEHOLDS],
    allowedLocTypes: ['main_settlement', 'fort'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.INDUSTRIAL,
    techRequired: 'bronze_working',
    cost: { gold: 60 }, buildTurns: 3,
    bonuses: { gold: 2 },
    prerequisites: [],
    unlocksBuildings: ['forge_2'],
    description: 'A basic smithy producing arms and armour. Required for heavier military units.',
  },
  {
    id: 'forge_2', name: 'Foundry', emoji: '⚒️',
    cardImg: 'assets/cards/buildings/forge_2.png',
    factionId: null,
    disabledFactions: [FACTION_IDS.KUR_MARGAL, FACTION_IDS.IRON_FREEHOLDS],
    allowedLocTypes: ['main_settlement', 'fort'],
    tier: 2, upgradeFromId: 'forge_1',
    category: BUILDING_CATEGORIES.INDUSTRIAL,
    techRequired: 'steel',
    cost: { gold: 130 }, buildTurns: 5,
    bonuses: { gold: 4 },
    prerequisites: ['forge_1'],
    unlocksBuildings: ['forge_3'],
    description: 'A proper foundry smelting steel at scale. Required for elite armoured units.',
  },
  {
    id: 'forge_3', name: 'Grand Arsenal', emoji: '🏭',
    cardImg: 'assets/cards/buildings/forge_3.png',
    factionId: null,
    disabledFactions: [FACTION_IDS.KUR_MARGAL, FACTION_IDS.IRON_FREEHOLDS],
    allowedLocTypes: ['main_settlement', 'fort'],
    tier: 3, upgradeFromId: 'forge_2',
    category: BUILDING_CATEGORIES.INDUSTRIAL,
    techRequired: 'iron_working',
    cost: { gold: 240 }, buildTurns: 7,
    bonuses: { gold: 6 },
    prerequisites: ['forge_2'],
    unlocksBuildings: [],
    description: 'A grand industrial arsenal equipping entire armies with iron-forged weaponry.',
  },

  // ── Infrastructure ──────────────────────────────────────
  {
    id: 'roads', name: 'Road Network', emoji: '🛣️',
    cardImg: 'assets/cards/buildings/roads.png',
    factionId: null,
    allowedLocTypes: ['main_settlement', 'village', 'fort', 'shrine'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.INFRASTRUCTURE,
    techRequired: 'road_building',
    cost: { gold: 80 }, buildTurns: 3,
    bonuses: {},
    maxPerProvince: 1,
    prerequisites: [],
    unlocksBuildings: [],
    description: 'Paved roads connecting the province. Armies that start their turn here gain +1 movement for that turn.',
  },
];

// ─────────────────────────────────────────────────────────
// KUR-MARGAL — Undead Dwarves
// ─────────────────────────────────────────────────────────

const KUR_MARGAL_CHAINS = [

  // ── Soul Temple Chain (main_settlement / shrine) ─────────
  {
    id: 'kur_temple_1', name: 'Bone Shrine', emoji: '🦴',
    cardImg: 'assets/cards/buildings/kur_temple_1.png',
    factionId: FACTION_IDS.KUR_MARGAL,
    allowedLocTypes: ['main_settlement', 'shrine'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 60, souls: 5 }, buildTurns: 3,
    bonuses: { souls: 0.5 },
    prerequisites: [],
    unlocksBuildings: ['kur_temple_2'],
    demolishable: false,
    description: 'A shrine of ancestral bones. Focuses the spiritual energies needed to raise undead dwarves.',
  },
  {
    id: 'kur_temple_2', name: 'Soul Temple', emoji: '💀',
    cardImg: 'assets/cards/buildings/kur_temple_2.png',
    factionId: FACTION_IDS.KUR_MARGAL,
    allowedLocTypes: ['main_settlement', 'shrine'],
    tier: 2, upgradeFromId: 'kur_temple_1',
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: 'runeforging',
    cost: { gold: 130, souls: 15 }, buildTurns: 5,
    bonuses: { souls: 1 },
    prerequisites: ['kur_temple_1'],
    mainBuildingTier: 2,
    unlocksBuildings: ['kur_temple_3'],
    demolishable: false,
    description: 'An expanded soul temple. Generates Soul income and enables undead levy and bone thrower recruitment.',
  },
  {
    id: 'kur_temple_3', name: 'Grand Ossuary', emoji: '🏚️',
    cardImg: 'assets/cards/buildings/kur_temple_3.png',
    factionId: FACTION_IDS.KUR_MARGAL,
    allowedLocTypes: ['main_settlement', 'shrine'],
    tier: 3, upgradeFromId: 'kur_temple_2',
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 260, souls: 35 }, buildTurns: 7,
    bonuses: { souls: 1.5 },
    prerequisites: ['kur_temple_2'],
    mainBuildingTier: 3,
    unlocksBuildings: [],
    demolishable: false,
    description: 'A vast ossuary of immense spiritual power. Enables Deathguard recruitment and amplifies soul production.',
  },
];

// ─────────────────────────────────────────────────────────
// IRON FREEHOLDS — Free Dwarf Clans
// ─────────────────────────────────────────────────────────

const IRON_FREEHOLDS_CHAINS = [

  // ── Workshop Chain (village) ─────────────────────────────
  {
    id: 'workshop_1', name: 'Tinker\'s Shop', emoji: '🔧',
    cardImg: 'assets/cards/buildings/workshop_1.png',
    factionId: FACTION_IDS.IRON_FREEHOLDS,
    allowedLocTypes: ['village'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.INDUSTRIAL,
    techRequired: null,
    cost: { gold: 55 }, buildTurns: 2,
    bonuses: { schematics: 1 },
    prerequisites: [],
    unlocksBuildings: ['workshop_2'],
    description: 'A cluttered workshop full of invention. Generates Schematics.',
  },
  {
    id: 'workshop_2', name: 'Engineering Works', emoji: '⚙️',
    cardImg: 'assets/cards/buildings/workshop_2.png',
    factionId: FACTION_IDS.IRON_FREEHOLDS,
    allowedLocTypes: ['village'],
    tier: 2, upgradeFromId: 'workshop_1',
    category: BUILDING_CATEGORIES.INDUSTRIAL,
    techRequired: null,
    cost: { gold: 120, schematics: 12 }, buildTurns: 4,
    bonuses: { schematics: 2 },
    prerequisites: ['workshop_1'],
    mainBuildingTier: 2,
    unlocksBuildings: ['workshop_3'],
    description: 'A full engineering complex. Schematics flow freely for the clan\'s next invention.',
  },
  {
    id: 'workshop_3', name: 'Grand Foundry', emoji: '🏭',
    cardImg: 'assets/cards/buildings/workshop_3.png',
    factionId: FACTION_IDS.IRON_FREEHOLDS,
    allowedLocTypes: ['village'],
    tier: 3, upgradeFromId: 'workshop_2',
    category: BUILDING_CATEGORIES.INDUSTRIAL,
    techRequired: null,
    cost: { gold: 240, schematics: 30, runes: 20 }, buildTurns: 7,
    bonuses: { schematics: 3 },
    prerequisites: ['workshop_2'],
    mainBuildingTier: 3,
    unlocksBuildings: [],
    description: 'The greatest foundry in the Freeholds. Mass-produces Schematics.',
  },

  // ── Trading Post Chain (village / main_settlement) ───────
  {
    id: 'trading_post_1', name: 'Trading Post', emoji: '🏪',
    cardImg: 'assets/cards/buildings/trading_post_1.png',
    factionId: FACTION_IDS.IRON_FREEHOLDS,
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: 'sailing',
    cost: { gold: 55 }, buildTurns: 2,
    bonuses: { gold: 4, schematics: 1 },
    prerequisites: [],
    unlocksBuildings: ['trading_post_2'],
    description: 'A freehold trading post exchanging goods for schematics and coin.',
  },
  {
    id: 'trading_post_2', name: 'Exchange Hall', emoji: '💱',
    cardImg: 'assets/cards/buildings/trading_post_2.png',
    factionId: FACTION_IDS.IRON_FREEHOLDS,
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 2, upgradeFromId: 'trading_post_1',
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: null,
    cost: { gold: 120, schematics: 10 }, buildTurns: 4,
    bonuses: { gold: 8, schematics: 2 },
    prerequisites: ['trading_post_1'],
    mainBuildingTier: 2,
    unlocksBuildings: [],
    description: 'A hub where clan delegates negotiate and exchange trade agreements.',
  },
];

// ─────────────────────────────────────────────────────────
// Y DRAIG GOCH — Dragon Warriors
// ─────────────────────────────────────────────────────────

const DRAIG_GOCH_CHAINS = [

  // ── Dragon Shrine Chain (main_settlement / shrine) ───────
  {
    id: 'dragon_shrine_1', name: 'Dragon Altar', emoji: '🔥',
    cardImg: 'assets/cards/buildings/dragon_shrine_1.png',
    factionId: FACTION_IDS.DRAIG_GOCH,
    allowedLocTypes: ['main_settlement', 'shrine'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 55, prestige: 5 }, buildTurns: 3,
    bonuses: { dragon_essence: 1 },
    prerequisites: [],
    unlocksBuildings: ['dragon_shrine_2'],
    description: 'A sacred altar where warriors offer tribute to the Red Dragon.',
  },
  {
    id: 'dragon_shrine_2', name: 'Dragon Shrine', emoji: '🐉',
    cardImg: 'assets/cards/buildings/dragon_shrine_2.png',
    factionId: FACTION_IDS.DRAIG_GOCH,
    allowedLocTypes: ['main_settlement', 'shrine'],
    tier: 2, upgradeFromId: 'dragon_shrine_1',
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 120, prestige: 15, dragon_essence: 10 }, buildTurns: 5,
    bonuses: { dragon_essence: 2 },
    prerequisites: ['dragon_shrine_1'],
    mainBuildingTier: 2,
    unlocksBuildings: ['dragon_shrine_3'],
    description: 'A grand shrine. Dragon Essence flows freely, strengthening the clan.',
  },
  {
    id: 'dragon_shrine_3', name: 'Dragon Sanctum', emoji: '🏮',
    cardImg: 'assets/cards/buildings/dragon_shrine_3.png',
    factionId: FACTION_IDS.DRAIG_GOCH,
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'dragon_shrine_2',
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 240, prestige: 35, dragon_essence: 25 }, buildTurns: 8,
    bonuses: { dragon_essence: 3 },
    prerequisites: ['dragon_shrine_2'],
    mainBuildingTier: 3,
    unlocksBuildings: [],
    description: 'The holiest sanctum of the Dragon Cult. Said to draw the eye of the Red Dragon itself.',
  },

  // ── Dojo Chain (fort / village) ──────────────────────────
  {
    id: 'dojo_1', name: 'Training Ground', emoji: '⚔️',
    cardImg: 'assets/cards/buildings/dojo_1.png',
    factionId: FACTION_IDS.DRAIG_GOCH,
    allowedLocTypes: ['fort', 'village'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRAINING,
    techRequired: null,
    cost: { gold: 50, prestige: 5 }, buildTurns: 2,
    bonuses: { defense: 0.05 },
    prerequisites: [],
    unlocksBuildings: ['dojo_2'],
    description: 'Warriors train relentlessly here. Discipline hardens the province\'s defenders.',
  },
  {
    id: 'dojo_2', name: 'Dojo', emoji: '🥋',
    cardImg: 'assets/cards/buildings/dojo_2.png',
    factionId: FACTION_IDS.DRAIG_GOCH,
    allowedLocTypes: ['fort', 'village'],
    tier: 2, upgradeFromId: 'dojo_1',
    category: BUILDING_CATEGORIES.TRAINING,
    techRequired: null,
    cost: { gold: 110, prestige: 15 }, buildTurns: 4,
    bonuses: { defense: 0.10 },
    prerequisites: ['dojo_1'],
    mainBuildingTier: 2,
    unlocksBuildings: [],
    description: 'A respected dojo. Elite warrior-monks defend the province with iron discipline.',
  },
];

// ─────────────────────────────────────────────────────────
// AURIC EMPIRE — Merchant Empire
// ─────────────────────────────────────────────────────────

const AURIC_EMPIRE_CHAINS = [

  // ── Harbor Chain (village / main_settlement, coastal) ────
  {
    id: 'harbor_1', name: 'Trade Wharf', emoji: '⚓',
    cardImg: 'assets/cards/buildings/harbor_1.png',
    factionId: FACTION_IDS.AURIC_EMPIRE,
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: 'sailing',
    cost: { gold: 55 }, buildTurns: 2,
    bonuses: { gold: 4, contracts: 1 },
    prerequisites: [],
    unlocksBuildings: ['harbor_2'],
    requiresCoastalProvince: true,
    description: 'A coastal wharf generating Contracts through overseas trade.',
  },
  {
    id: 'harbor_2', name: 'Grand Harbor', emoji: '🚢',
    cardImg: 'assets/cards/buildings/harbor_2.png',
    factionId: FACTION_IDS.AURIC_EMPIRE,
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 2, upgradeFromId: 'harbor_1',
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: null,
    cost: { gold: 130, contracts: 12 }, buildTurns: 4,
    bonuses: { gold: 8, contracts: 2 },
    prerequisites: ['harbor_1'],
    mainBuildingTier: 2,
    unlocksBuildings: [],
    requiresCoastalProvince: true,
    description: 'A grand harbor hosting merchant fleets from across the known world.',
  },

  // ── Counting House Chain (main_settlement / village) ─────
  {
    id: 'counting_house_1', name: 'Counting House', emoji: '📊',
    cardImg: 'assets/cards/buildings/counting_house_1.png',
    factionId: FACTION_IDS.AURIC_EMPIRE,
    allowedLocTypes: ['main_settlement', 'village'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.ADMINISTRATION,
    techRequired: 'taxation',
    cost: { gold: 60 }, buildTurns: 2,
    bonuses: { gold: 3, contracts: 1 },
    prerequisites: [],
    unlocksBuildings: ['counting_house_2'],
    description: 'Ledgers and accountants managing the flow of gold and contracts.',
  },
  {
    id: 'counting_house_2', name: 'Imperial Treasury', emoji: '🏦',
    cardImg: 'assets/cards/buildings/counting_house_2.png',
    factionId: FACTION_IDS.AURIC_EMPIRE,
    allowedLocTypes: ['main_settlement', 'village'],
    tier: 2, upgradeFromId: 'counting_house_1',
    category: BUILDING_CATEGORIES.ADMINISTRATION,
    techRequired: null,
    cost: { gold: 130, contracts: 10 }, buildTurns: 4,
    bonuses: { gold: 7, contracts: 2 },
    prerequisites: ['counting_house_1'],
    mainBuildingTier: 2,
    unlocksBuildings: [],
    description: 'The financial heart of the empire. Wealth begets more wealth.',
  },
];

// ─────────────────────────────────────────────────────────
// POLEIS TOU AETHERA — Maritime City-States
// ─────────────────────────────────────────────────────────

const POLEIS_AETHERA_CHAINS = [

  // ── Academy Chain (main_settlement) ─────────────────────
  {
    id: 'academy_1', name: 'Symposium', emoji: '📜',
    cardImg: 'assets/cards/buildings/academy_1.png',
    factionId: FACTION_IDS.POLEIS_AETHERA,
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
    factionId: FACTION_IDS.POLEIS_AETHERA,
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
    factionId: FACTION_IDS.POLEIS_AETHERA,
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

  // ── Azure Docks Chain (coastal village / main_settlement) ─
  {
    id: 'azure_docks_1', name: 'Azure Docks', emoji: '⛵',
    cardImg: 'assets/cards/buildings/azure_docks_1.png',
    factionId: FACTION_IDS.POLEIS_AETHERA,
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.EXPLORATION,
    techRequired: 'sailing',
    cost: { gold: 55, aether: 8 }, buildTurns: 3,
    bonuses: { aether: 1, gold: 3 },
    prerequisites: [],
    unlocksBuildings: ['azure_docks_2'],
    requiresCoastalProvince: true,
    description: 'Azure-sailed elven ships moored at a coastal dock. Aether drifts in from the sea.',
  },
  {
    id: 'azure_docks_2', name: 'Grand Azure Docks', emoji: '🚢',
    cardImg: 'assets/cards/buildings/azure_docks_2.png',
    factionId: FACTION_IDS.POLEIS_AETHERA,
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 2, upgradeFromId: 'azure_docks_1',
    category: BUILDING_CATEGORIES.EXPLORATION,
    techRequired: null,
    cost: { gold: 120, aether: 20 }, buildTurns: 5,
    bonuses: { aether: 2, gold: 6 },
    prerequisites: ['azure_docks_1'],
    mainBuildingTier: 2,
    unlocksBuildings: [],
    requiresCoastalProvince: true,
    description: 'A grand naval yard producing fine azure-sailed elven warships.',
  },
];

// ─────────────────────────────────────────────────────────
// ARCHONATE OF GREYHAVEN — Military Elven State
// ─────────────────────────────────────────────────────────

const ARCHONATE_GREYHAVEN_CHAINS = [

  // ── Tribute Hall (village / shrine / fort, max 1 per province) ─
  {
    id: 'tribute_hall', name: 'Tribute Hall', emoji: '⚖️',
    cardImg: 'assets/cards/buildings/tribute_hall.png',
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN,
    allowedLocTypes: ['village', 'shrine', 'fort'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.ADMINISTRATION,
    techRequired: null,
    cost: { gold: 45 }, buildTurns: 2,
    bonuses: { tribute: 1 },
    prerequisites: [],
    unlocksBuildings: [],
    maxPerProvince: 1,
    description: 'A hall collecting Tribute from subject populations. Only one may exist per province.',
  },

  // ── Discipline Hall Chain (fort) ─────────────────────────
  {
    id: 'discipline_hall_1', name: 'Training Grounds', emoji: '🏃',
    cardImg: 'assets/cards/buildings/discipline_hall_1.png',
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN,
    allowedLocTypes: ['fort'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRAINING,
    techRequired: null,
    cost: { gold: 55, tribute: 5 }, buildTurns: 2,
    bonuses: { tribute: 1 },
    militiaBonus: 1,
    prerequisites: [],
    unlocksBuildings: ['discipline_hall_2'],
    description: 'Harsh training grounds where subject levies become soldiers.',
  },
  {
    id: 'discipline_hall_2', name: 'Iron Barracks', emoji: '🏯',
    cardImg: 'assets/cards/buildings/discipline_hall_2.png',
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN,
    allowedLocTypes: ['fort'],
    tier: 2, upgradeFromId: 'discipline_hall_1',
    category: BUILDING_CATEGORIES.TRAINING,
    techRequired: 'iron_discipline',
    cost: { gold: 130, tribute: 20, aether: 10 }, buildTurns: 5,
    bonuses: { tribute: 2 },
    militiaBonus: 2,
    prerequisites: ['discipline_hall_1'],
    mainBuildingTier: 2,
    unlocksBuildings: [],
    description: 'Ironclad barracks producing disciplined phalanx warriors for the Archonate.',
  },
];

// ─────────────────────────────────────────────────────────
// DUAL KINGDOM OF SUTEKH-RA — River Kingdom Lizards
// ─────────────────────────────────────────────────────────

const SUTEKH_RA_CHAINS = [

  // ── Sun Temple Chain (main_settlement / shrine) ──────────
  {
    id: 'sun_temple_1', name: 'Sun Shrine', emoji: '☀️',
    cardImg: 'assets/cards/buildings/sun_temple_1.png',
    factionId: FACTION_IDS.SUTEKH_RA,
    allowedLocTypes: ['main_settlement', 'shrine'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: 'dual_temples',
    exclusiveWith: ['moon_temple_1', 'moon_temple_2', 'moon_temple_3'],
    cost: { gold: 50, faith: 5 }, buildTurns: 2,
    bonuses: { faith: 1, gold: 2 },
    prerequisites: [],
    unlocksBuildings: ['sun_temple_2'],
    description: 'A shrine of the Solar God. Generates Faith and blesses the community. Mutually exclusive with the Moon Temple.',
  },
  {
    id: 'sun_temple_2', name: 'Sun Temple', emoji: '🛕',
    cardImg: 'assets/cards/buildings/sun_temple_2.png',
    factionId: FACTION_IDS.SUTEKH_RA,
    allowedLocTypes: ['main_settlement', 'shrine'],
    tier: 2, upgradeFromId: 'sun_temple_1',
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 110, faith: 15, ancient_lore: 5 }, buildTurns: 4,
    bonuses: { faith: 2, gold: 4 },
    prerequisites: ['sun_temple_1'],
    mainBuildingTier: 2,
    unlocksBuildings: ['sun_temple_3'],
    description: 'A towering temple complex. Faith flows in abundance.',
  },
  {
    id: 'sun_temple_3', name: 'Great Pyramid', emoji: '🔺',
    cardImg: 'assets/cards/buildings/sun_temple_3.png',
    factionId: FACTION_IDS.SUTEKH_RA,
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'sun_temple_2',
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 220, faith: 35, ancient_lore: 20 }, buildTurns: 7,
    bonuses: { faith: 3, gold: 6, defense: 0.10 },
    prerequisites: ['sun_temple_2'],
    mainBuildingTier: 3,
    unlocksBuildings: [],
    description: 'An eternal pyramid monument. Inspires devotion and awe across the kingdom.',
  },

  // ── Moon Temple Chain (main_settlement / shrine) — mutually exclusive with sun_temple ──
  {
    id: 'moon_temple_1', name: 'Moon Shrine', emoji: '🌙',
    cardImg: 'assets/cards/buildings/moon_temple_1.png',
    factionId: FACTION_IDS.SUTEKH_RA,
    allowedLocTypes: ['main_settlement', 'shrine'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: 'dual_temples',
    exclusiveWith: ['sun_temple_1', 'sun_temple_2', 'sun_temple_3'],
    cost: { gold: 50, ancient_lore: 5 }, buildTurns: 2,
    bonuses: { ancient_lore: 1, gold: 1 },
    prerequisites: [],
    unlocksBuildings: ['moon_temple_2'],
    description: 'A shrine of the Lunar God. Generates Ancient Lore and gold. Mutually exclusive with the Sun Temple.',
  },
  {
    id: 'moon_temple_2', name: 'Moon Temple', emoji: '🌕',
    cardImg: 'assets/cards/buildings/moon_temple_2.png',
    factionId: FACTION_IDS.SUTEKH_RA,
    allowedLocTypes: ['main_settlement', 'shrine'],
    tier: 2, upgradeFromId: 'moon_temple_1',
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    exclusiveWith: ['sun_temple_1', 'sun_temple_2', 'sun_temple_3'],
    cost: { gold: 110, ancient_lore: 15, faith: 5 }, buildTurns: 4,
    bonuses: { ancient_lore: 2, gold: 2 },
    prerequisites: ['moon_temple_1'],
    mainBuildingTier: 2,
    unlocksBuildings: ['moon_temple_3'],
    description: 'A great temple of the Moon God. Ancient Lore flows freely. Enables Moon Zealot recruitment.',
  },
  {
    id: 'moon_temple_3', name: 'Grand Moon Temple', emoji: '🌑',
    cardImg: 'assets/cards/buildings/moon_temple_3.png',
    factionId: FACTION_IDS.SUTEKH_RA,
    allowedLocTypes: ['main_settlement'],
    tier: 3, upgradeFromId: 'moon_temple_2',
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    exclusiveWith: ['sun_temple_1', 'sun_temple_2', 'sun_temple_3'],
    cost: { gold: 220, ancient_lore: 35, faith: 15 }, buildTurns: 7,
    bonuses: { ancient_lore: 3, gold: 4 },
    prerequisites: ['moon_temple_2'],
    mainBuildingTier: 3,
    unlocksBuildings: [],
    description: 'The eternal monument to the Moon God. Death and rebirth are governed from this sacred place.',
  },

  // ── River Granary Chain (village / main_settlement) ──────
  {
    id: 'river_granary_1', name: 'River Granary', emoji: '🌾',
    cardImg: 'assets/cards/buildings/river_granary_1.png',
    factionId: FACTION_IDS.SUTEKH_RA,
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: null,
    cost: { gold: 45 }, buildTurns: 2,
    bonuses: { ancient_lore: 1, gold: 1 },
    prerequisites: [],
    unlocksBuildings: ['river_granary_2'],
    description: 'River-fed granaries preserving ancient knowledge alongside surplus food.',
  },
  {
    id: 'river_granary_2', name: 'Great Storehouse', emoji: '🏗️',
    cardImg: 'assets/cards/buildings/river_granary_2.png',
    factionId: FACTION_IDS.SUTEKH_RA,
    allowedLocTypes: ['village', 'main_settlement'],
    tier: 2, upgradeFromId: 'river_granary_1',
    category: BUILDING_CATEGORIES.TRADE,
    techRequired: null,
    cost: { gold: 100, ancient_lore: 15 }, buildTurns: 4,
    bonuses: { ancient_lore: 2, gold: 3 },
    prerequisites: ['river_granary_1'],
    mainBuildingTier: 2,
    unlocksBuildings: [],
    description: 'Massive storehouses containing the accumulated wisdom of river civilization.',
  },
];

// ─────────────────────────────────────────────────────────
// CLANS OF THE FIRST SCALE — Beast Clans
// ─────────────────────────────────────────────────────────

const CLANS_FIRST_SCALE_CHAINS = [

  // ── Beast Pen Chain (village / fort) ─────────────────────
  {
    id: 'beast_pen_1', name: 'Hunting Ground', emoji: '🌿',
    cardImg: 'assets/cards/buildings/beast_pen_1.png',
    factionId: FACTION_IDS.CLANS_FIRST_SCALE,
    allowedLocTypes: ['village', 'fort'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.TRAINING,
    techRequired: 'beast_taming',
    cost: { gold: 60, ancient_lore: 5 }, buildTurns: 2,
    bonuses: { beasts: 0.5 },
    prerequisites: [],
    unlocksBuildings: ['beast_pen_2'],
    description: 'Clan hunting grounds where wild beasts are captured and trained.',
  },
  {
    id: 'beast_pen_2', name: 'Beast Pen', emoji: '🦕',
    cardImg: 'assets/cards/buildings/beast_pen_2.png',
    factionId: FACTION_IDS.CLANS_FIRST_SCALE,
    allowedLocTypes: ['village', 'fort'],
    tier: 2, upgradeFromId: 'beast_pen_1',
    category: BUILDING_CATEGORIES.TRAINING,
    techRequired: null,
    cost: { gold: 130, beasts: 12, ancient_lore: 10 }, buildTurns: 4,
    bonuses: { beasts: 1 },
    prerequisites: ['beast_pen_1'],
    mainBuildingTier: 2,
    unlocksBuildings: ['beast_pen_3'],
    description: 'Enclosed pens for larger, more dangerous creatures. More Beasts generated.',
  },
  {
    id: 'beast_pen_3', name: 'Grand Menagerie', emoji: '🏟️',
    cardImg: 'assets/cards/buildings/beast_pen_3.png',
    factionId: FACTION_IDS.CLANS_FIRST_SCALE,
    allowedLocTypes: ['village', 'fort'],
    tier: 3, upgradeFromId: 'beast_pen_2',
    category: BUILDING_CATEGORIES.TRAINING,
    techRequired: null,
    cost: { gold: 260, beasts: 30, ancient_lore: 20 }, buildTurns: 7,
    bonuses: { beasts: 1.5 },
    prerequisites: ['beast_pen_2'],
    mainBuildingTier: 3,
    unlocksBuildings: [],
    description: 'A legendary collection of war-beasts. The apex of clan beast-mastery.',
  },

  // ── Clan Hall Chain (main_settlement) ────────────────────
  {
    id: 'clan_hall_1', name: 'Totem Circle', emoji: '🗿',
    cardImg: 'assets/cards/buildings/clan_hall_1.png',
    factionId: FACTION_IDS.CLANS_FIRST_SCALE,
    allowedLocTypes: ['main_settlement'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 55, ancient_lore: 5 }, buildTurns: 2,
    bonuses: { ancient_lore: 1 },
    prerequisites: [],
    mainBuildingTier: 1,
    unlocksBuildings: ['clan_hall_2'],
    description: 'Totem poles marking clan territory. Generates Ancient Lore.',
  },
  {
    id: 'clan_hall_2', name: 'Clan Longhouse', emoji: '🏕️',
    cardImg: 'assets/cards/buildings/clan_hall_2.png',
    factionId: FACTION_IDS.CLANS_FIRST_SCALE,
    allowedLocTypes: ['main_settlement'],
    tier: 2, upgradeFromId: 'clan_hall_1',
    category: BUILDING_CATEGORIES.WORSHIPPING,
    techRequired: null,
    cost: { gold: 120, ancient_lore: 15, beasts: 10 }, buildTurns: 4,
    bonuses: { ancient_lore: 2 },
    prerequisites: ['clan_hall_1'],
    mainBuildingTier: 2,
    unlocksBuildings: [],
    description: 'A great longhouse where clan elders commune with the spirits of ancient beasts.',
  },
];

// ─────────────────────────────────────────────────────────
// DWARF FORGE — Shared by both dwarf factions (gated by dwarf-only techs)
// ─────────────────────────────────────────────────────────

const DWARF_CHAINS = [

  // ── Dwarf Forge Chain (main_settlement / fort) ───────────
  {
    id: 'dwarf_forge_1', name: 'Runic Smithy', emoji: '🔨',
    cardImg: 'assets/cards/buildings/dwarf_forge_1.png',
    factionId: null,
    allowedLocTypes: ['main_settlement', 'fort'],
    tier: 1, upgradeFromId: null,
    category: BUILDING_CATEGORIES.INDUSTRIAL,
    techRequired: 'runeforging',
    cost: { gold: 70 }, buildTurns: 3,
    bonuses: { gold: 3, runes: 0.5 },
    prerequisites: [],
    unlocksBuildings: ['dwarf_forge_2'],
    description: 'A smithy where runes are etched into arms and armour. Required for heavy dwarven units.',
  },
  {
    id: 'dwarf_forge_2', name: 'Rune Foundry', emoji: '⚙️',
    cardImg: 'assets/cards/buildings/dwarf_forge_2.png',
    factionId: null,
    allowedLocTypes: ['main_settlement', 'fort'],
    tier: 2, upgradeFromId: 'dwarf_forge_1',
    category: BUILDING_CATEGORIES.INDUSTRIAL,
    techRequired: 'runescript',
    cost: { gold: 150, runes: 10 }, buildTurns: 5,
    bonuses: { gold: 6, runes: 1 },
    prerequisites: ['dwarf_forge_1'],
    unlocksBuildings: ['dwarf_forge_3'],
    description: 'A full rune foundry channelling ancient scripts into war-forged metal.',
  },
  {
    id: 'dwarf_forge_3', name: 'Grand Rune Forge', emoji: '🔩',
    cardImg: 'assets/cards/buildings/dwarf_forge_3.png',
    factionId: null,
    allowedLocTypes: ['main_settlement', 'fort'],
    tier: 3, upgradeFromId: 'dwarf_forge_2',
    category: BUILDING_CATEGORIES.INDUSTRIAL,
    techRequired: 'iron_working',
    cost: { gold: 280, runes: 20 }, buildTurns: 7,
    bonuses: { gold: 9, runes: 1.5 },
    prerequisites: ['dwarf_forge_2'],
    unlocksBuildings: [],
    description: 'The pinnacle of dwarven runic craftsmanship. Arms entire armies with runic iron.',
  },
];

// ─────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────

export const BUILDINGS = [
  ...GENERIC_CHAINS,
  ...DWARF_CHAINS,
  ...KUR_MARGAL_CHAINS,
  ...IRON_FREEHOLDS_CHAINS,
  ...DRAIG_GOCH_CHAINS,
  ...AURIC_EMPIRE_CHAINS,
  ...POLEIS_AETHERA_CHAINS,
  ...ARCHONATE_GREYHAVEN_CHAINS,
  ...SUTEKH_RA_CHAINS,
  ...CLANS_FIRST_SCALE_CHAINS,
];

/** Fast lookup by building id */
export const BUILDING_MAP = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

/**
 * The three-tier main building chain for each location type.
 */
export const LOCATION_MAIN_CHAIN = {
  main_settlement: ['town_hall_1',  'town_hall_2',  'town_hall_3'],
  village:         ['mercantile_1', 'mercantile_2', 'mercantile_3'],
  shrine:          ['religious_1',  'religious_2',  'religious_3'],
  fort:            ['palisade',     'fortress_1',   'fortress_2'],
};

/** Get all buildings available to a faction (generic + faction-specific) */
export function getBuildingsForFaction(factionId) {
  return BUILDINGS.filter(b =>
    (b.factionId === null || b.factionId === factionId) &&
    !b.disabledFactions?.includes(factionId)
  );
}

/**
 * Walk upgradeFromId links upward to find the chain-root building id (the tier-1 ancestor).
 * Single-tier buildings (no upgradeFromId) are their own root.
 */
function _getChainRoot(buildingId) {
  let cur = BUILDING_MAP[buildingId];
  while (cur?.upgradeFromId) cur = BUILDING_MAP[cur.upgradeFromId];
  return cur?.id ?? buildingId;
}

/**
 * Accumulate faction-scope build cost effects from faction effects + applied tech effects.
 * Returns { locationMultiplier, buildingMultiplier, timePenalty }
 * Used by province-modal and production queue when displaying/applying costs.
 *
 * @param {Array} factionEffects     — faction.effects from factions-data (may be undefined)
 * @param {Array} appliedTechEffects — factionState.appliedTechEffects
 */
export function accumulateBuildCostModifiers(factionEffects = [], appliedTechEffects = []) {
  let locationMult = 1;
  let buildingMult = 1;
  let timePenalty  = 0;

  const allEffects = [
    ...factionEffects,
    ...appliedTechEffects.flatMap(te => te.effects ?? []),
  ];

  for (const eff of allEffects) {
    if (eff.scope !== 'faction') continue;
    if (eff.type === 'build_cost_percent') {
      const mult = 1 + (eff.percent ?? 0) / 100;
      if (eff.target === 'location') locationMult *= mult;
      else if (eff.target === 'building') buildingMult *= mult;
      else if (eff.target === 'all') { locationMult *= mult; buildingMult *= mult; }
    } else if (eff.type === 'build_time_bonus') {
      timePenalty += (eff.amount ?? 0);
    }
  }

  return { locationMultiplier: locationMult, buildingMultiplier: buildingMult, timePenalty };
}

/**
 * Get all buildings that can be built at a given location type for a faction.
 * @param {string}   factionId
 * @param {string}   locationType
 * @param {string[]} existingBuildingIds    — buildings already installed at THIS location
 * @param {boolean}  isCoastal
 * @param {string[]} provinceInstalledIds   — all buildings installed anywhere in the province (for maxPerProvince checks)
 * @param {string|null} provinceBiome       — biome id of the province (null = skip biome check)
 */
export function getBuildingsForLocation(factionId, locationType, existingBuildingIds = [], isCoastal = false, provinceInstalledIds = [], provinceBiome = null) {
  const available = getBuildingsForFaction(factionId).filter(b => {
    if (!b.allowedLocTypes.includes(locationType)) return false;
    if (b.requiresCoastalProvince && !isCoastal) return false;
    if (b.requiresBiome && provinceBiome) {
      const allowed = Array.isArray(b.requiresBiome) ? b.requiresBiome : [b.requiresBiome];
      if (!allowed.includes(provinceBiome)) return false;
    }
    return true;
  });
  return available.filter(b => {
    if (existingBuildingIds.includes(b.id)) return false;
    // Province-level cap (e.g. roads: max 1 per province)
    if (b.maxPerProvince != null) {
      const count = provinceInstalledIds.filter(id => id === b.id).length;
      if (count >= b.maxPerProvince) return false;
    }
    // Block a chain-root (tier-1) building if any tier of the same chain is already installed.
    // This prevents rebuilding a lower tier after an upgrade has replaced it.
    if (b.upgradeFromId === null) {
      if (existingBuildingIds.some(eid => _getChainRoot(eid) === b.id)) return false;
    }
    if (b.upgradeFromId && !existingBuildingIds.includes(b.upgradeFromId)) return false;
    if (!b.prerequisites.every(pId => existingBuildingIds.includes(pId))) return false;
    if (b.exclusiveWith && b.exclusiveWith.some(id => existingBuildingIds.includes(id))) return false;
    if (b.mainBuildingTier != null) {
      const chain = LOCATION_MAIN_CHAIN[locationType];
      const reqId = chain?.[b.mainBuildingTier - 1];
      if (reqId && !existingBuildingIds.includes(reqId)) return false;
    }
    return true;
  });
}
