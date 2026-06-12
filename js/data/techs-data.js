/**
 * techs-data.js
 *
 * Research technology definitions.
 *
 * Tech shape:
 *   id            — unique string
 *   name          — display name
 *   emoji         — icon
 *   era           — TECH_ERAS value ('stone'|'bronze'|'iron')
 *   baseCost      — research points before cost multiplier
 *   requires      — single tech id that must be unlocked first, or null (omit on replacement techs)
 *   quote         — lore quote shown in tooltip (Civ 4 style)
 *   description   — brief mechanical description
 *
 * Optional effect fields:
 *   effects[]                    — structured effect objects (FACTION or ARMY scope)
 *   unlockBuildings              — building ids (must match building techRequired)
 *   unlockUnits                  — unit ids (must match unit techRequired)
 *   obsoleteUnits                — unit ids that become unrecruitable (stay in armies)
 *   militiaBonus                 — flat addition to faction globalMilitiaBonus
 *   unlockReactions              — [{ reactionId: FACTION_REACTION_IDS.X, event: GAME_EVENTS.Y }]
 *                                  Registers a new EventBus reaction for the researching faction.
 *                                  Reaction handler must exist in faction-reactions.js.
 *
 * Optional display fields:
 *   img           — relative path to card image; defaults to assets/cards/techs/{id}.png
 *
 * Override fields (only on race/faction replacement techs):
 *   replacesId    — id of the base tech slot this replaces
 *   factionId     — faction-specific override (highest priority)
 *   raceId        — race-wide override (lower priority than faction)
 */

import { TECH_ERAS, UNIT_TYPES, BUILDING_CATEGORIES, RESOURCE_IDS, RACE_IDS, FACTION_IDS, EFFECT_SCOPES, EFFECT_TYPES } from './enums.js';
import { FACTION_MAP } from './factions-data.js';

// ─────────────────────────────────────────────────────────
// STONE AGE
// ─────────────────────────────────────────────────────────

const STONE_AGE = [
  {
    id: 'agriculture', name: 'Agriculture', emoji: '🌾', img: 'assets/cards/techs/agriculture.png',
    era: TECH_ERAS.STONE,
    baseCost: 10, requires: null,
    quote: '"Only those who toil in the soil understand that from the earth, all things flow."',
    description: 'Organised farming grants +1 gold/turn to all mercantile settlement buildings.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'mercantile_1', resourceId: RESOURCE_IDS.GOLD, amount: 1 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'mercantile_2', resourceId: RESOURCE_IDS.GOLD, amount: 1 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'mercantile_3', resourceId: RESOURCE_IDS.GOLD, amount: 1 },
    ],
  },
  {
    id: 'hunting', name: 'Hunting', emoji: '🏹', img: 'assets/cards/techs/hunting.png',
    era: TECH_ERAS.STONE,
    baseCost: 10, requires: null,
    quote: '"The greatest weapon is patience. The hunt teaches what armies cannot."',
    description: 'Mastery of ranged combat. Each faction may now recruit their tier-1 archer unit.',
    unlockUnits: ['dwarf_bone_shot', 'elf_ranger', 'lizard_skink', 'draig_bowman'],
  },
  {
    id: 'fishing', name: 'Fishing', emoji: '🎣', img: 'assets/cards/techs/fishing.png',
    era: TECH_ERAS.STONE,
    baseCost: 10, requires: null,
    quote: '"He who controls the river controls the kingdom\'s stomach."',
    description: 'Allows construction of Fishing Rafts at capital and mercantile locations (+3 gold/turn).',
    unlockBuildings: ['fishing_raft', 'poleis_azure_docks_1'],
  },
  {
    id: 'mysticism', name: 'Mysticism', emoji: '🌙', img: 'assets/cards/techs/mysticism.png',
    era: TECH_ERAS.STONE,
    baseCost: 10, requires: null,
    quote: '"In the silence between heartbeats, the divine whispers its secrets."',
    description: 'Sacred knowledge grants +0.5 research/turn to all religious main buildings.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'religious_1', resourceId: RESOURCE_IDS.RESEARCH, amount: 0.5 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'religious_2', resourceId: RESOURCE_IDS.RESEARCH, amount: 0.5 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'religious_3', resourceId: RESOURCE_IDS.RESEARCH, amount: 0.5 },
    ],
  },
  {
    id: 'mining', name: 'Mining', emoji: '⛏️', img: 'assets/cards/techs/mining.png',
    era: TECH_ERAS.STONE,
    baseCost: 10, requires: null,
    quote: '"Beneath every mountain sleeps a kingdom waiting to be unearthed."',
    description: 'Organised quarrying. Allows construction of Copper Mines in mercantile locations (+5 gold/turn).',
    unlockBuildings: ['copper_mine'],
  },

  {
    id: 'pottery', name: 'Pottery', emoji: '🏺',
    era: TECH_ERAS.STONE,
    baseCost: 20, requires: 'agriculture',
    quote: '"The clay remembers the hands that shaped it long after they have turned to dust."',
    description: 'Fired clay vessels allow food storage and trade. Hamlets can grow into Villages; Settlements can build the Grand Hall.',
    unlockBuildings: ['mercantile_2', 'town_hall_2'],
  },
  {
    id: 'animal_husbandry', name: 'Animal Husbandry', emoji: '🐄',
    era: TECH_ERAS.STONE,
    baseCost: 20, requires: 'hunting',
    quote: '"The tamed beast is worth ten wild ones — in labour, in milk, and in leather."',
    description: 'Domesticated livestock. Allows construction of Ranches (+2 gold, +1 primary resource/turn).',
    unlockBuildings: ['ranch'],
  },
  {
    id: 'boatbuilding', name: 'Boatbuilding', emoji: '🛶',
    era: TECH_ERAS.STONE,
    baseCost: 20, requires: 'fishing',
    quote: '"A plank, a rope, and a dream — all a man needs to cross any river."',
    description: 'Construction of simple river craft. Armies can embark and move through shallow coastal seas.',
    unlockActions: ['embark_shallow'],
  },
  {
    id: 'writing', name: 'Writing', emoji: '✍️',
    era: TECH_ERAS.STONE,
    baseCost: 20, requires: 'mysticism',
    quote: '"The spoken word dies with the speaker. The written word lives forever."',
    description: 'Records of knowledge enable formal scholarship. Unlocks Libraries and Monastic Schools.',
    unlockBuildings: ['library', 'monastic_school', 'poleis_academy_1'],
  },
  {
    id: 'worship', name: 'Worship', emoji: '🙏',
    era: TECH_ERAS.STONE,
    baseCost: 20, requires: 'mysticism',
    quote: '"Faith does not move mountains — it convinces others to move them for you."',
    description: 'Organised religious practice. Allows upgrade of shrines to tier 2 Temple.',
    unlockBuildings: ['religious_2'],
  },
  {
    id: 'warbands', name: 'Warbands', emoji: '🪓',
    era: TECH_ERAS.STONE,
    baseCost: 10, requires: null,
    quote: '"A man alone is a man afraid. A warband is something else entirely."',
    description: 'Organised raiding parties formalize into standing warbands. Unlocks the Mustering Field training building.',
    unlockBuildings: ['mustering_field', 'discipline_hall_1'],
  },
  {
    id: 'masonry', name: 'Masonry', emoji: '🪨',
    era: TECH_ERAS.STONE,
    baseCost: 20, requires: 'mining',
    quote: '"Stone endures. Stone remembers. Build in stone, and your name shall outlast your flesh."',
    description: 'Shaped stone allows permanent fortifications. Allows upgrade of forts to tier 2.',
    unlockBuildings: ['fortress_1'],
    clearsLocationTypes: ['rocky_ground'],
  },
  {
    id: 'smithing', name: 'Smithing', emoji: '🔨',
    era: TECH_ERAS.STONE,
    baseCost: 20, requires: 'mining',
    quote: '"Shape the metal while it glows. Hesitate, and it hardens against you."',
    description: 'Basic metalsmithing. Allows construction of a Smithy in settlements and forts.',
    unlockBuildings: ['forge_1'],
  },
];

// ─────────────────────────────────────────────────────────
// BRONZE AGE
// ─────────────────────────────────────────────────────────

const BRONZE_AGE = [
  {
    id: 'crop_rotation', name: 'Crop Rotation', emoji: '🌱',
    era: TECH_ERAS.BRONZE,
    baseCost: 40, requires: 'pottery',
    quote: '"Let the field rest, and it will feed you twice as well come spring."',
    description: 'Improved farming technique. +10% to all faction gold income.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.INCOME_PERCENT, resourceId: RESOURCE_IDS.GOLD, percent: 10 },
    ],
  },
  {
    id: 'sailing', name: 'Sailing', emoji: '⛵',
    era: TECH_ERAS.BRONZE,
    baseCost: 40, requires: 'boatbuilding',
    quote: '"The sea is not an obstacle — it is a road waiting to be walked."',
    description: 'Deep-water navigation. All trade and exploration buildings yield +1 gold/turn. Unlocks the Azure Sea Raider.',
    unlockUnits: ['azure_sea_raider'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, category: BUILDING_CATEGORIES.TRADE,       resourceId: RESOURCE_IDS.GOLD, amount: 1 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, category: BUILDING_CATEGORIES.EXPLORATION, resourceId: RESOURCE_IDS.GOLD, amount: 1 },
    ],
  },
  {
    id: 'philosophy', name: 'Philosophy', emoji: '💡',
    era: TECH_ERAS.BRONZE,
    baseCost: 40, requires: 'writing',
    quote: '"I know that I know nothing — and that knowledge is the beginning of wisdom."',
    description: 'Formal inquiry into nature and reason. All scientific buildings yield +1 research/turn.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, category: BUILDING_CATEGORIES.SCIENTIFIC, resourceId: RESOURCE_IDS.RESEARCH, amount: 1 },
    ],
  },
  {
    id: 'fortification', name: 'Fortification', emoji: '🏰',
    era: TECH_ERAS.BRONZE,
    baseCost: 40, requires: 'masonry',
    quote: '"A wall is not just stone - it is the will of a people made solid."',
    description: 'Advanced defensive architecture. Defensive buildings yield +1 gold/turn. Militia +1.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, category: BUILDING_CATEGORIES.DEFENSIVE, resourceId: RESOURCE_IDS.GOLD, amount: 1 },
    ],
    militiaBonus: 1,
  },
  {
    id: 'bronze_working', name: 'Bronze Working', emoji: '🗡️',
    era: TECH_ERAS.BRONZE,
    baseCost: 40, requires: 'smithing',
    quote: '"Copper bends. Tin yields. Together they forge something neither can be alone."',
    description: 'Superior metal alloy. All infantry units gain +1 attack.',
    effects: [
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.INFANTRY, stat: 'attack', amount: 1 },
    ],
    clearsLocationTypes: ['dense_forest', 'dry_wastes'],
  },
  {
    id: 'clan_warfare', name: 'Clan Warfare', emoji: '⚔️',
    era: TECH_ERAS.BRONZE,
    baseCost: 40, requires: 'warbands',
    quote: '"War is the crucible of nations. Only those who master it earn the right to call themselves one."',
    description: 'Formalised battle doctrine and inter-clan rivalry sharpen warfare. Unlocks the Warrior Lodge. Armies can support +1 additional unit.',
    unlockBuildings: ['warrior_lodge', 'discipline_hall_2'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.ARMY_SUPPORT_LIMIT, amount: 1 },
    ],
  },
  {
    id: 'road_building', name: 'Road Building', emoji: '🛣️',
    era: TECH_ERAS.BRONZE,
    baseCost: 40, requires: 'masonry',
    quote: '"A road is a promise made to the future — that we intend to return."',
    description: 'Allows construction of Road Networks. Armies starting a turn in a province with roads gain +1 movement that turn.',
    unlockBuildings: ['roads'],
  },
  {
    id: 'taxation', name: 'Taxation', emoji: '📋',
    era: TECH_ERAS.BRONZE,
    baseCost: 50, requires: 'crop_rotation',
    quote: '"The empire is built not on conquest, but on the reliable collection of grain."',
    description: 'Organised record-keeping. Administration buildings yield +2 gold/turn.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, category: BUILDING_CATEGORIES.ADMINISTRATION, resourceId: RESOURCE_IDS.GOLD, amount: 2 },
    ],
  },
  {
    id: 'navigation', name: 'Navigation', emoji: '🧭',
    era: TECH_ERAS.BRONZE,
    baseCost: 50, requires: 'sailing',
    quote: '"Stars do not move - they merely wait for us to learn their language."',
    description: 'Celestial wayfinding. +5% to all faction gold income. Armies can venture into deep ocean provinces.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.INCOME_PERCENT, resourceId: RESOURCE_IDS.GOLD, percent: 5 },
    ],
    unlockActions: ['embark_deep'],
  },
  {
    id: 'mathematics', name: 'Mathematics', emoji: '📐',
    era: TECH_ERAS.BRONZE,
    baseCost: 50, requires: 'philosophy',
    quote: '"Numbers do not lie. It is only those who wield them that are capable of deception."',
    description: 'Geometry, accounting, and engineering. +10% to all faction research income.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.INCOME_PERCENT, resourceId: RESOURCE_IDS.RESEARCH, percent: 10 },
    ],
  },
  {
    id: 'castle_construction', name: 'Castle Construction', emoji: '🏯',
    era: TECH_ERAS.BRONZE,
    baseCost: 50, requires: 'fortification',
    quote: '"The castle is not a place of refuge — it is a declaration of permanence."',
    description: 'Massive stone fortresses. Allows upgrade of forts to tier 3 Castle. Militia +2.',
    unlockBuildings: ['fortress_2'],
    militiaBonus: 1,
  },
  {
    id: 'alloying', name: 'Alloying', emoji: '⚗️',
    era: TECH_ERAS.BRONZE,
    baseCost: 50, requires: 'bronze_working',
    quote: '"Heat it, strike it, quench it. Three acts that separate the craftsman from the fool."',
    description: 'Advanced metal refinement. Allows upgrade of Smithy to Foundry.',
    unlockBuildings: ['forge_2'],
  },
  {
    id: 'call_to_glory', name: 'Call to Glory', emoji: '🦸',
    era: TECH_ERAS.BRONZE,
    baseCost: 50, requires: 'worship',
    quote: '"Come forward, champion. The realm has need of you."',
    description: 'Legends spread of great champions willing to serve for coin and glory. Allows recruitment of 1 additional hero.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.HERO_COUNT_BONUS, amount: 1 },
    ],
  },
];

// ─────────────────────────────────────────────────────────
// IRON AGE
// ─────────────────────────────────────────────────────────

const IRON_AGE = [
  {
    id: 'trade_networks', name: 'Trade Networks', emoji: '🤝',
    era: TECH_ERAS.IRON,
    baseCost: 80, requires: 'taxation',
    quote: '"Commerce is war by other means - and far more profitable."',
    description: 'Organised merchant leagues spanning provinces. +10% to all faction gold income.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.INCOME_PERCENT, resourceId: RESOURCE_IDS.GOLD, percent: 10 },
    ],
  },
  {
    id: 'scholarship', name: 'Scholarship', emoji: '🎓',
    era: TECH_ERAS.IRON,
    baseCost: 80, requires: 'mathematics',
    quote: '"The scholar who reads one book is dangerous. The one who reads all of them is unstoppable."',
    description: 'Formal academic institutions. Scientific buildings yield +2 research/turn.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, category: BUILDING_CATEGORIES.SCIENTIFIC, resourceId: RESOURCE_IDS.RESEARCH, amount: 2 },
    ],
  },
  {
    id: 'divine_law', name: 'Divine Law', emoji: '⚖️',
    era: TECH_ERAS.IRON,
    baseCost: 80, requires: 'castle_construction',
    quote: '"When the king speaks the law, and the priest speaks god — they must say the same thing."',
    description: 'Sacred legal authority. Administration buildings yield +2 gold/turn. Militia +1.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, category: BUILDING_CATEGORIES.ADMINISTRATION, resourceId: RESOURCE_IDS.GOLD, amount: 2 },
    ],
    militiaBonus: 1,
  },
  {
    id: 'iron_working', name: 'Iron Working', emoji: '⚒️',
    era: TECH_ERAS.IRON,
    baseCost: 80, requires: 'alloying',
    quote: '"Iron is patient. It waits in the earth for a thousand years, then rules the age."',
    description: 'Smelted iron surpasses bronze entirely. Increase infantry defense by +1 and industry building yield by +2 gold/turn.',
    effects: [
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.INFANTRY, stat: 'defense', amount: 1 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, category: BUILDING_CATEGORIES.INDUSTRIAL, resourceId: RESOURCE_IDS.GOLD, amount: 2 },
    ],
    clearsLocationTypes: ['dense_jungle', 'frozen_wastes'],
  },

  {
    id: 'guilds', name: 'Guilds', emoji: '🏪',
    era: TECH_ERAS.IRON,
    baseCost: 100, requires: 'trade_networks',
    quote: '"A craftsman who works alone makes a living. A craftsman who joins a guild makes history."',
    description: 'Organised merchant and craft associations. Trade buildings yield +2 gold/turn.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, category: BUILDING_CATEGORIES.TRADE, resourceId: RESOURCE_IDS.GOLD, amount: 2 },
    ],
  },
  {
    id: 'universities', name: 'Universities', emoji: '🏛️',
    era: TECH_ERAS.IRON,
    baseCost: 100, requires: 'scholarship',
    quote: '"The university is where knowledge comes to die — and be reborn as wisdom."',
    description: 'Grand institutions of higher learning. Unlocks the Academy (tier 3 science building). +10% research.',
    unlockBuildings: ['research_academy', 'poleis_academy_3'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.INCOME_PERCENT, resourceId: RESOURCE_IDS.RESEARCH, percent: 10 },
    ],
  },
  {
    id: 'monarchy', name: 'Monarchy', emoji: '👑',
    era: TECH_ERAS.IRON,
    baseCost: 100, requires: 'divine_law',
    quote: '"A king without a crown is just a man with enemies. A king with one has enemies and obligations."',
    description: 'Centralised rule. Unlocks the Imperial Palace (town hall tier 3). Grand Hall grants +3 gold/turn.',
    unlockBuildings: ['town_hall_3'],
    effects: [
    { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, category: BUILDING_CATEGORIES.ADMINISTRATION, resourceId: RESOURCE_IDS.GOLD, amount: 2 },
    ],
  },
  {
    id: 'battle_formations', name: 'Battle Formations', emoji: '🏴',
    era: TECH_ERAS.IRON,
    baseCost: 80, requires: 'clan_warfare',
    quote: '"A soldier fights for himself. A formation fights for everyone. That is why it wins."',
    description: 'Coordinated tactical doctrine enables professional soldiery. Unlocks the Barracks (tier 3 training building, +2 militia, further reduces recruit time).',
    unlockBuildings: ['barracks', 'discipline_hall_3'],
  },
  {
    id: 'metallurgy', name: 'Metallurgy', emoji: '🔩',
    era: TECH_ERAS.IRON,
    baseCost: 100, requires: 'iron_working',
    quote: '"The forge reveals the truth of all things - what is strong endures; what is weak, burns."',
    description: 'Advanced metalworking. All units gain +1 attack and +1 defense. Allows upgrade to Grand Arsenal and Grand Rune Forge.',
    unlockBuildings: ['forge_3', 'dwarf_forge_3'],
    effects: [
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.ALL, stat: 'attack',  amount: 1 },
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.ALL, stat: 'defense', amount: 1 },
    ],
  },
];

// ─────────────────────────────────────────────────────────
// All base techs + override techs
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// RACE TECH OVERRIDES
// Each race replaces: worship (Stone), fortification (Bronze), alloying (Bronze)
// ─────────────────────────────────────────────────────────

const DWARF_RACE_TECHS = [
  {
    id: 'runeforging', name: 'Runeforging', emoji: '🔮',
    era: TECH_ERAS.STONE,
    raceId: RACE_IDS.DWARF, replacesId: 'worship',
    quote: '"A rune is not written — it is remembered, from before the world was young."',
    description: 'Ancient dwarven script is mastered. Unlocks the Rune Assignment panel in armies. All industrial buildings generate +0.5 Rune/turn.',
    unlockBuildings: ['dwarf_forge_1'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, category: BUILDING_CATEGORIES.INDUSTRIAL, resourceId: RESOURCE_IDS.RUNES, amount: 0.5 },
    ],
  },
  {
    id: 'ancient_masonry', name: 'Ancient Masonry', emoji: '🪨',
    era: TECH_ERAS.BRONZE,
    raceId: RACE_IDS.DWARF, replacesId: 'fortification',
    quote: '"Dwarf stone holds what no mortar can — stubborn memory."',
    description: 'Unlocks enhanced dwarf defensive buildings. Stone Fort and Stone Castle provide an additional +5% defense bonus for dwarf factions.',
  },
  {
    id: 'runescript', name: 'Runescript', emoji: '📿',
    era: TECH_ERAS.BRONZE,
    raceId: RACE_IDS.DWARF, replacesId: 'alloying',
    quote: '"A lighter hand on the chisel, yet the same power flows."',
    description: 'Refined runic technique reduces upkeep by 1 Rune per runed unit (minimum 0). Rune assignments become cheaper to maintain.',
    unlockBuildings: ['dwarf_forge_2'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.RUNE_UPKEEP_REDUCTION, amount: 1 },
    ],
  },
];

const HUMAN_RACE_TECHS = [
  {
    id: 'noble_lineage', name: 'Noble Lineage', emoji: '👑',
    era: TECH_ERAS.STONE,
    raceId: RACE_IDS.HUMAN, replacesId: 'worship',
    quote: '"Blood may thin over generations, but the name carries weight forever."',
    description: 'Noble houses claim legitimacy. Capital town halls generate +1 Prestige/turn.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'town_hall_1', resourceId: RESOURCE_IDS.PRESTIGE, amount: 1 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'town_hall_2', resourceId: RESOURCE_IDS.PRESTIGE, amount: 2 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'town_hall_3', resourceId: RESOURCE_IDS.PRESTIGE, amount: 3 },
    ],
  },
  {
    id: 'martial_tradition', name: 'Martial Tradition', emoji: '⚔️',
    era: TECH_ERAS.BRONZE,
    raceId: RACE_IDS.HUMAN, replacesId: 'fortification',
    quote: '"A blade in the hand is worth a dozen in the armoury."',
    description: 'Centuries of warfare refined. All INFANTRY and CAVALRY units gain +1 attack.',
    effects: [
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.INFANTRY, stat: 'attack', amount: 1 },
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.CAVALRY,  stat: 'attack', amount: 1 },
    ],
  },
];

const ELF_RACE_TECHS = [
  {
    id: 'sea_lore', name: 'Sea Lore', emoji: '🌊',
    era: TECH_ERAS.STONE,
    raceId: RACE_IDS.ELF, replacesId: 'worship',
    quote: '"The sea holds more secrets than any library — and unlike scholars, it never lies."',
    description: 'Elven mastery of oceanic patterns. Coastal provinces generate +1 Aether/turn.',
    unlockBuildings: ['religious_2'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.INCOME_PERCENT, resourceId: RESOURCE_IDS.AETHER, percent: 10 },
    ],
  },
  {
    id: 'aetheric_arts', name: 'Aetheric Arts', emoji: '✨',
    era: TECH_ERAS.BRONZE,
    raceId: RACE_IDS.ELF, replacesId: 'fortification',
    quote: '"The Aether is the language of creation. Learn it and the world bends."',
    description: 'Ancient elven aether manipulation. Allows construction of the Aetheric Tower, channelling ambient aether into scholarly insight.',
    unlockBuildings: ['aetheric_tower'],
  },
  {
    id: 'wayfarers_guild', name: 'Wayfarers\' Guild', emoji: '🧭',
    era: TECH_ERAS.IRON,
    raceId: RACE_IDS.ELF, replacesId: 'trade_networks',
    quote: '"Every horizon is the beginning of someone\'s home."',
    description: 'Elven mastery of ocean routes. +15% gold income. Armies starting a turn on ocean provinces gain +1 movement. Unlocks Grand Azure Docks.',
    unlockBuildings: ['poleis_azure_docks_2'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.INCOME_PERCENT,       resourceId: RESOURCE_IDS.GOLD, percent: 15 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.OCEAN_MOVEMENT_BONUS, biomes: ['shallow_ocean', 'deep_ocean'], movementBonus: 1 },
    ],
  },
];

const LIZARD_RACE_TECHS = [
  {
    id: 'ancient_memory', name: 'Ancient Memory', emoji: '📿',
    era: TECH_ERAS.STONE,
    raceId: RACE_IDS.LIZARD, replacesId: 'worship',
    quote: '"We remember what was before the gods put words to the sky."',
    description: 'The lore of ages past is alive in lizardmen memory. Clearing ruins grants +2 Ancient Lore.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.RUIN_CLEAR_BONUS, resourceId: RESOURCE_IDS.ANCIENT_LORE, amount: 2 },
    ],
  },
  {
    id: 'primordial_scales', name: 'Primordial Scales', emoji: '🦎',
    era: TECH_ERAS.BRONZE,
    raceId: RACE_IDS.LIZARD, replacesId: 'fortification',
    quote: '"Nature already built the perfect armour — on our ancestors."',
    description: 'Ancient lizardmen harden their scales with ritual baths. All lizard units gain +1 defense.',
    effects: [
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.ALL, stat: 'defense', amount: 1 },
    ],
  },
  {
    id: 'ancestral_rites', name: 'Ancestral Rites', emoji: '🌿',
    era: TECH_ERAS.BRONZE,
    raceId: RACE_IDS.LIZARD, replacesId: 'alloying',
    quote: '"The price of knowledge is always paid — sometimes in blood, sometimes in memory."',
    description: 'Deep ritual converts Ancient Lore into research insight. Spend 10 Ancient Lore for -20% on next tech cost.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.LORE_TECH_DISCOUNT, loreCost: 10, discountPercent: 20 },
    ],
  },
];

// ─────────────────────────────────────────────────────────
// FACTION TECH OVERRIDES
// Each faction replaces: trade_networks (Iron), scholarship (Iron), guilds (Iron)
// ─────────────────────────────────────────────────────────

const KUR_MARGAL_TECHS = [
  {
    id: 'soul_harvest', name: 'Soul Harvest', emoji: '👻',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.KUR_MARGAL, replacesId: 'trade_networks',
    quote: '"Every enemy slain is another soldier for the kingdom."',
    description: 'Victory brings +2 extra Souls per province captured. Construct units gain +1 attack and +1 defense.',
    effects: [
      { scope: EFFECT_SCOPES.ARMY,    type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.CONSTRUCT, stat: 'attack',  amount: 1 },
      { scope: EFFECT_SCOPES.ARMY,    type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.CONSTRUCT, stat: 'defense', amount: 1 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.VICTORY_SOUL_BONUS, amount: 2 },
    ],
  },
  {
    id: 'undying_legion', name: 'Undying Legion', emoji: '💀',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.KUR_MARGAL, replacesId: 'scholarship',
    quote: '"They do not march to war — they march because war is all they know."',
    description: 'Undead Levy and Bone Thrower stack sizes increase by +1 when recruited.',
    effects: [
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STACK_SIZE_BONUS, unitId: 'undead_levy',  amount: 1 },
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STACK_SIZE_BONUS, unitId: 'bone_thrower', amount: 1 },
    ],
  },
  {
    id: 'eternal_binding', name: 'Eternal Binding', emoji: '🔗',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.KUR_MARGAL, replacesId: 'guilds',
    quote: '"Death is not an ending. It is merely a renegotiation."',
    description: 'Soul Resurrection now has a 50% chance to NOT consume a Soul when saving a dwarf unit.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.SOUL_RESURRECTION_CHANCE, noConsumeProbability: 0.5 },
    ],
  },
];

const IRON_FREEHOLDS_TECHS = [
  {
    id: 'merchant_clans', name: 'Merchant Clans', emoji: '🛍️',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.IRON_FREEHOLDS, replacesId: 'trade_networks',
    quote: '"No king commanded us to build this — we built it because it was profitable."',
    description: 'Each market building generates +1 Schematics/turn.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'market_1', resourceId: RESOURCE_IDS.SCHEMATICS, amount: 1 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'market_2', resourceId: RESOURCE_IDS.SCHEMATICS, amount: 1 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'market_3', resourceId: RESOURCE_IDS.SCHEMATICS, amount: 1 },
    ],
  },
  {
    id: 'airship_fleet', name: 'Airship Fleet', emoji: '🚁',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.IRON_FREEHOLDS, replacesId: 'scholarship',
    quote: '"The sky belongs to no king. We intend to keep it that way."',
    description: 'Unlocks the Sky Raider unit. Armies containing Sky Raiders gain +1 movement. Unlocks the Airship Teleport army action (spend Schematics to move up to 5 range).',
    unlockUnits: ['sky_raider'],
    unlockActions: ['airship_teleport'],
  },
  {
    id: 'engineering_mastery', name: 'Engineering Mastery', emoji: '🔧',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.IRON_FREEHOLDS, replacesId: 'guilds',
    quote: '"A dwarf with a blueprint is more dangerous than one with an axe."',
    description: 'Unlocks the Siege Engineer unit. Province Fortification now costs 2 Schematics instead of 3.',
    unlockUnits: ['siege_engineer'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.FORTIFY_COST_REDUCTION, amount: 1 },
    ],
  },
];

const DRAIG_GOCH_TECHS = [
  {
    id: 'oath_of_the_dragon', name: 'Oath of the Dragon', emoji: '🔥',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.DRAIG_GOCH, replacesId: 'trade_networks',
    quote: '"I swear on scales older than memory: I will not yield."',
    description: 'Unlocks the Dragonsworn unit. Combat victories grant +2 Dragon Essence.',
    unlockUnits: ['draig_dragonsworn'],
  },
  {
    id: 'code_of_honor', name: 'Code of Honor', emoji: '⚔️',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.DRAIG_GOCH, replacesId: 'scholarship',
    quote: '"Honor is not given — it is earned at the edge of a blade."',
    description: 'Unlocks the "Code of Honor" army action: activate to grant +2 attack / -1 defense for one battle. Single use per battle.',
    unlockActions: ['code_of_honor'],
  },
  {
    id: 'dragon_binding', name: 'Dragon Binding', emoji: '🐉',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.DRAIG_GOCH, replacesId: 'guilds',
    quote: '"The dragon does not serve. It chooses. And it has chosen us."',
    description: 'The Dragon Knight unit is unlocked. A warrior so bound to the Dragon that they can no longer truly die.',
  },
  {
    id: 'draconic_pact', name: 'Draconic Pact', emoji: '🐲',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.DRAIG_GOCH, replacesId: 'battle_formations',
    baseCost: 80,
    quote: '"The dragon and the man made a pact older than kingdoms: strength for loyalty, fury for faith."',
    description: 'Ancient blood-oaths with dragon-kin draw legendary champions to Draig Goch\'s banner. +1 hero capacity.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.HERO_COUNT_BONUS, amount: 1 },
    ],
  },
];

const AURIC_EMPIRE_TECHS = [
  {
    id: 'trade_empire', name: 'Trade Empire', emoji: '💰',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.AURIC_EMPIRE, replacesId: 'trade_networks',
    quote: '"A city\'s prosperity is measured not by its walls, but by its ledgers."',
    description: 'Each market building generates an additional +2 gold/turn.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'market_1', resourceId: RESOURCE_IDS.GOLD, amount: 2 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'market_2', resourceId: RESOURCE_IDS.GOLD, amount: 2 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'market_3', resourceId: RESOURCE_IDS.GOLD, amount: 2 },
    ],
  },
  {
    id: 'golden_sails', name: 'Golden Sails', emoji: '⛵',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.AURIC_EMPIRE, replacesId: 'scholarship',
    quote: '"A golden sail on the horizon means coin is coming."',
    description: 'Unlocks the Golden Lancer unit. Coastal provinces generate +0.25 Contracts/turn.',
    unlockUnits: ['golden_lancer'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.COASTAL_RESOURCE_BONUS, resourceId: RESOURCE_IDS.CONTRACTS, amount: 0.25 },
    ],
  },
  {
    id: 'mercenary_contracts', name: 'Mercenary Contracts', emoji: '📜',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.AURIC_EMPIRE, replacesId: 'guilds',
    quote: '"Why fight when you can pay someone else to do it — and better?"',
    description: 'Unlocks Mercenary Swords and Mercenary Crossbow units (build instantly). Conquest penalty reduced from 10 to 6 turns.',
    unlockUnits: ['mercenary_swords', 'mercenary_crossbow'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.CONQUEST_PENALTY_REDUCTION, turnsReduction: 4 },
    ],
  },
];

const POLEIS_AETHERA_TECHS = [
  {
    id: 'naval_league', name: 'Naval League', emoji: '⛵',
    era: TECH_ERAS.STONE,
    factionId: FACTION_IDS.POLEIS_AETHERA, replacesId: 'boatbuilding',
    quote: '"The sea gives as much as it takes — if you know how to ask."',
    description: 'Elven sea mastery. Armies can embark on shallow seas. Coastal provinces generate +1 gold/turn. Unlocks Azure Docks.',
    unlockActions: ['embark_shallow'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.COASTAL_RESOURCE_BONUS, resourceId: RESOURCE_IDS.GOLD, amount: 1 },
    ],
  },
  {
    id: 'philosophical_school', name: 'Philosophical Schools', emoji: '📜',
    era: TECH_ERAS.BRONZE,
    factionId: FACTION_IDS.POLEIS_AETHERA, replacesId: 'alloying',
    quote: '"A mind that questions is worth more than one that merely obeys."',
    description: 'The research cost multiplier grows at 1.02× per tech instead of the base 1.03×. Unlocks the Academy (tier 2 research building).',
    unlockBuildings: ['poleis_academy_2', 'forge_2'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.RESEARCH_MULTIPLIER_REDUCTION, multiplier: 0.02 },
    ],
  },
  {
    id: 'aether_infused_arrows', name: 'Aether-Infused Arrows', emoji: '🏹',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.POLEIS_AETHERA, replacesId: 'guilds',
    quote: '"A shaft of aether flies truer than any iron bolt."',
    description: 'Aetheric essence suffuses elven arrows. All ARCHER units gain +1 attack and +1 defense.',
    effects: [
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.ARCHER, stat: 'attack',  amount: 1 },
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.ARCHER, stat: 'defense', amount: 1 },
    ],
  },
];

const ARCHONATE_GREYHAVEN_TECHS = [
  {
    id: 'subject_taxation', name: 'Subject Taxation', emoji: '⚖️',
    era: TECH_ERAS.STONE,
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN, replacesId: 'writing',
    quote: '"The subject caste exists to serve. We exist to lead."',
    description: 'Tribute Hall buildings generate +0.25 additional Tribute/turn, and training category buildings yield +0.5 gold/turn.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, buildingId: 'tribute_hall',            resourceId: RESOURCE_IDS.TRIBUTE, amount: 0.25 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_INCOME_BONUS, category: BUILDING_CATEGORIES.TRAINING, resourceId: RESOURCE_IDS.GOLD,    amount: 0.5 },
    ],
  },
  {
    id: 'discipline', name: 'Discipline', emoji: '🏯',
    era: TECH_ERAS.BRONZE,
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN, replacesId: 'alloying',
    quote: '"Pain is weakness leaving the body. We have none of it left."',
    description: 'Unlocks the Phalanx Soldier unit. All INFANTRY units gain +1 defense.',
    unlockUnits: ['phalanx_soldier'],
    unlockBuildings: ['forge_2'],
    effects: [
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.INFANTRY, stat: 'defense', amount: 1 },
    ],
  },
  {
    id: 'eternal_phalanx', name: 'Eternal Phalanx', emoji: '🛡️',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN, replacesId: 'guilds',
    quote: '"We have held this line for a thousand years. We will hold it for a thousand more."',
    description: 'Unlocks the Iron Phalanx and Archonate Sentinel units. Reduces Conscript Levy cost from 10 to 7 tribute.',
    unlockUnits: ['iron_phalanx', 'archonate_sentinel'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.CONSCRIPT_COST_REDUCTION, costReduction: 3 },
    ],
  },
];

const SUTEKH_RA_TECHS = [
  {
    id: 'dual_temples', name: 'Dual Temples', emoji: '⛩️',
    era: TECH_ERAS.STONE,
    factionId: FACTION_IDS.SUTEKH_RA, replacesId: 'worship',
    baseCost: 30,
    quote: '"The Sun rises to judge the living; the Moon descends to guide the dead. Both are holy."',
    description: 'Sacred architecture of the twin gods. Unlocks the Sun Shrine and Moon Shrine — each province chooses one path, for they are mutually exclusive.',
    unlockBuildings: ['sun_temple_1', 'moon_temple_1'],
  },
  {
    id: 'sun_blessing', name: 'Sun Blessing', emoji: '☀️',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.SUTEKH_RA, replacesId: 'trade_networks',
    quote: '"The Sun does not ask permission to rise."',
    description: 'Unlocks the Sun Priest unit. Combat in desert or plains biomes grants all units +1 attack.',
    unlockUnits: ['sun_priest'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BIOME_COMBAT_BONUS, biomes: ['desert', 'plains'], stat: 'attack', amount: 1 },
    ],
  },
  {
    id: 'desert_dominion', name: 'Desert Dominion', emoji: '🌵',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.SUTEKH_RA, replacesId: 'scholarship',
    quote: '"The desert is not a wasteland — it is a treasury, waiting for the worthy."',
    description: 'Desert provinces generate +1 gold and +0.125 Faith per turn.',
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BIOME_INCOME_BONUS, biome: 'desert', bonuses: { gold: 1, faith: 0.125 } },
    ],
  },
  {
    id: 'necromantic_arts', name: 'Necromantic Arts', emoji: '🌙',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.SUTEKH_RA, replacesId: 'guilds',
    quote: '"Death is not the end — it is the Moon\'s beginning."',
    description: 'Unlocks the Moon Zealot unit. All units gain +5% chance to be wounded instead of destroyed in combat.',
    unlockUnits: ['moon_zealot'],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.ARMY_WOUND_CHANCE, amount: 0.05 },
    ],
  },
];

const CLANS_FIRST_SCALE_TECHS = [
  {
    id: 'beast_taming', name: 'Beast Taming', emoji: '🦕',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.CLANS_FIRST_SCALE, replacesId: 'trade_networks',
    quote: '"You do not own a beast. You convince it you are the greater predator."',
    description: 'Unlocks the Raptor Pack unit and Beast Pen building chain.',
    unlockUnits: ['raptor_pack'],
    unlockBuildings: ['beast_pen_1'],
  },
  {
    id: 'pack_hunting', name: 'Pack Hunting', emoji: '🐆',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.CLANS_FIRST_SCALE, replacesId: 'scholarship',
    quote: '"A lone predator hunts. A pack rules."',
    description: 'All MONSTER units gain +1 attack and +1 defense.',
    effects: [
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.MONSTER, stat: 'attack',  amount: 1 },
      { scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE, unitType: UNIT_TYPES.MONSTER, stat: 'defense', amount: 1 },
    ],
  },
  {
    id: 'apex_predator', name: 'Apex Predator', emoji: '🦣',
    era: TECH_ERAS.IRON,
    factionId: FACTION_IDS.CLANS_FIRST_SCALE, replacesId: 'guilds',
    quote: '"Nothing hunts the Thunder Lizard. That is why we ride them."',
    description: 'Unlocks the Salamander Beast and Thunder Lizard units.',
    unlockUnits: ['salamander_beast', 'thunder_lizard'],
  },
];

export const TECHS = [
  ...STONE_AGE,
  ...BRONZE_AGE,
  ...IRON_AGE,
  // Race overrides
  ...DWARF_RACE_TECHS,
  ...HUMAN_RACE_TECHS,
  ...ELF_RACE_TECHS,
  ...LIZARD_RACE_TECHS,
  // Faction overrides
  ...KUR_MARGAL_TECHS,
  ...IRON_FREEHOLDS_TECHS,
  ...DRAIG_GOCH_TECHS,
  ...AURIC_EMPIRE_TECHS,
  ...POLEIS_AETHERA_TECHS,
  ...ARCHONATE_GREYHAVEN_TECHS,
  ...SUTEKH_RA_TECHS,
  ...CLANS_FIRST_SCALE_TECHS,
];

/** Fast lookup by tech id */
export const TECH_MAP = Object.fromEntries(TECHS.map(t => [t.id, t]));

/**
 * Build the resolved tech tree for a given faction.
 * Returns Map<baseSlotId, resolvedTechDef>.
 * Faction override > race override > default.
 */
/** Resolve baseCost for a tech, falling back to the replaced tech's cost for replacement techs. */
export function resolveTechBaseCost(techDef) {
  return techDef.baseCost ?? TECH_MAP[techDef.replacesId]?.baseCost;
}

export function buildFactionTechTree(factionId) {
  const factionDef = FACTION_MAP[factionId];
  const raceId = factionDef?.raceId;

  const base      = TECHS.filter(t => !t.replacesId);
  const overrides = TECHS.filter(t =>  t.replacesId);

  return new Map(base.map(t => {
    const fo = overrides.find(o => o.replacesId === t.id && o.factionId === factionId);
    if (fo) return [t.id, fo];
    const ro = overrides.find(o => o.replacesId === t.id && o.raceId === raceId);
    if (ro) return [t.id, ro];
    return [t.id, t];
  }));
}
