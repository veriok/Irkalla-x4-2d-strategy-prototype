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
 *   col           — 0-based column within the era (0 = root/left, 1 = advanced/right)
 *   row           — 0-based row within the era (0 = top, 4 = bottom)
 *                   Empty grid cells are supported — just leave that (col,row) unoccupied.
 *   baseCost      — research points before cost multiplier
 *   requires      — tech ids that must be unlocked first
 *   quote         — lore quote shown in tooltip (Civ 4 style)
 *   description   — brief mechanical description
 *
 * Optional effect fields:
 *   unlockBuildings          — building ids (must match building techRequired)
 *   buildingBonuses          — [{ buildingId, bonusKey, amount }]
 *   buildingCategoryBonuses  — [{ category, bonusKey, amount }]
 *   unitStatBonuses          — [{ unitId?, unitType?, stat, amount }]
 *   unlockUnits              — unit ids (must match unit techRequired)
 *   obsoleteUnits            — unit ids that become unrecruitable (stay in armies)
 *   resourceYieldPercentBonuses — [{ resourceId, percent }]
 *   militiaBonus             — flat addition to faction globalMilitiaBonus
 *
 * Optional display fields:
 *   img           — relative path to card image; defaults to assets/cards/techs/{id}.png
 *
 * Override fields (only on race/faction replacement techs):
 *   replacesId    — id of the base tech slot this replaces
 *   factionId     — faction-specific override (highest priority)
 *   raceId        — race-wide override (lower priority than faction)
 *
 * Layout convention:
 *   Each era renders as a 2-col × 5-row grid (more if needed).
 *   col 0 = "root" techs (no era prerequisite, or requiring previous era)
 *   col 1 = "advanced" techs (requiring col 0 from same era)
 *   Dependencies always point LEFT → RIGHT (same col or increasing col).
 *   Try to place dependents at the same row as their prerequisite for horizontal lines.
 */

import { TECH_ERAS, UNIT_TYPES, BUILDING_CATEGORIES, RESOURCE_IDS, RACE_IDS, FACTION_IDS } from './enums.js';
import { FACTION_MAP } from './factions-data.js';

// ─────────────────────────────────────────────────────────
// STONE AGE
// ─────────────────────────────────────────────────────────
//
// col 0 (root):   Agriculture, Hunting, Fishing, Mysticism, Mining
// col 1 (adv):    Pottery, Animal Husbandry, Writing, Worship, Masonry
//
// Connection map (col 0 → col 1, same or adjacent rows):
//   Agriculture (row 0) → Pottery        (row 0)  horizontal ✓
//   Hunting     (row 1) → Animal Husb.   (row 1)  horizontal ✓
//   Mysticism   (row 3) → Writing        (row 2)  1 row up
//   Mysticism   (row 3) → Worship        (row 3)  horizontal ✓
//   Mining      (row 4) → Masonry        (row 4)  horizontal ✓
//   Fishing     (row 2)   (leads to Bronze Sailing — no col 1 peer)
// ─────────────────────────────────────────────────────────

const STONE_AGE = [
  // ── col 0 — root ────────────────────────────────────────
  {
    id: 'agriculture', name: 'Agriculture', emoji: '🌾', img: 'assets/cards/techs/agriculture.png',
    era: TECH_ERAS.STONE, col: 0, row: 0,
    baseCost: 20, requires: [],
    quote: '"Only those who toil in the soil understand that from the earth, all things flow."',
    description: 'Organised farming grants +1 gold/turn to all mercantile settlement buildings.',
    buildingBonuses: [
      { buildingId: 'mercantile_1', bonusKey: RESOURCE_IDS.GOLD, amount: 1 },
      { buildingId: 'mercantile_2', bonusKey: RESOURCE_IDS.GOLD, amount: 1 },
      { buildingId: 'mercantile_3', bonusKey: RESOURCE_IDS.GOLD, amount: 1 },
    ],
  },
  {
    id: 'hunting', name: 'Hunting', emoji: '🏹', img: 'assets/cards/techs/hunting.png',
    era: TECH_ERAS.STONE, col: 0, row: 1,
    baseCost: 20, requires: [],
    quote: '"The greatest weapon is patience. The hunt teaches what armies cannot."',
    description: 'Mastery of ranged combat. Each faction may now recruit their tier-1 archer unit.',
    unlockUnits: ['dwarf_bone_shot', 'elf_ranger', 'lizard_skink', 'draig_bowman'],
  },
  {
    id: 'fishing', name: 'Fishing', emoji: '🎣', img: 'assets/cards/techs/fishing.png',
    era: TECH_ERAS.STONE, col: 0, row: 2,
    baseCost: 20, requires: [],
    quote: '"He who controls the river controls the kingdom\'s stomach."',
    description: 'Allows construction of Fishing Rafts at capital and mercantile locations (+3 gold/turn).',
    unlockBuildings: ['fishing_raft'],
  },
  {
    id: 'mysticism', name: 'Mysticism', emoji: '🌙', img: 'assets/cards/techs/mysticism.png',
    era: TECH_ERAS.STONE, col: 0, row: 3,
    baseCost: 20, requires: [],
    quote: '"In the silence between heartbeats, the divine whispers its secrets."',
    description: 'Sacred knowledge grants +1 research/turn to all religious main buildings.',
    buildingBonuses: [
      { buildingId: 'religious_1', bonusKey: RESOURCE_IDS.RESEARCH, amount: 1 },
      { buildingId: 'religious_2', bonusKey: RESOURCE_IDS.RESEARCH, amount: 1 },
      { buildingId: 'religious_3', bonusKey: RESOURCE_IDS.RESEARCH, amount: 1 },
    ],
  },
  {
    id: 'mining', name: 'Mining', emoji: '⛏️', img: 'assets/cards/techs/mining.png',
    era: TECH_ERAS.STONE, col: 0, row: 4,
    baseCost: 20, requires: [],
    quote: '"Beneath every mountain sleeps a kingdom waiting to be unearthed."',
    description: 'Organised quarrying. Allows construction of Copper Mines in mercantile locations (+5 gold/turn).',
    unlockBuildings: ['copper_mine'],
  },

  // ── col 1 — advanced ────────────────────────────────────
  {
    id: 'pottery', name: 'Pottery', emoji: '🏺',
    era: TECH_ERAS.STONE, col: 1, row: 0,
    baseCost: 30, requires: ['agriculture'],
    quote: '"The clay remembers the hands that shaped it long after they have turned to dust."',
    description: 'Fired clay vessels allow food storage and trade. Hamlets can grow into Villages; Settlements can build the Grand Hall.',
    unlockBuildings: ['mercantile_2', 'town_hall_2'],
  },
  {
    id: 'animal_husbandry', name: 'Animal Husbandry', emoji: '🐄',
    era: TECH_ERAS.STONE, col: 1, row: 1,
    baseCost: 30, requires: ['hunting'],
    quote: '"The tamed beast is worth ten wild ones — in labour, in milk, and in leather."',
    description: 'Domesticated livestock. Allows construction of Ranches (+2 gold, +1 primary resource/turn).',
    unlockBuildings: ['ranch'],
  },
  {
    id: 'boatbuilding', name: 'Boatbuilding', emoji: '🛶',
    era: TECH_ERAS.STONE, col: 1, row: 2,
    baseCost: 30, requires: ['fishing'],
    quote: '"A plank, a rope, and a dream — all a man needs to cross any river."',
    description: 'Construction of simple river craft. Enables deep-water sailing in the Bronze Age.',
  },
  {
    id: 'writing', name: 'Writing', emoji: '✍️',
    era: TECH_ERAS.STONE, col: 1, row: 3,
    baseCost: 30, requires: ['mysticism'],
    quote: '"The spoken word dies with the speaker. The written word lives forever."',
    description: 'Records of knowledge enable formal scholarship. Unlocks Libraries and Monastic Schools.',
    unlockBuildings: ['library', 'monastic_school'],
  },
  {
    id: 'worship', name: 'Worship', emoji: '🙏',
    era: TECH_ERAS.STONE, col: 1, row: 4,
    baseCost: 30, requires: ['mysticism'],
    quote: '"Faith does not move mountains — it convinces others to move them for you."',
    description: 'Organised religious practice. Allows upgrade of shrines to tier 2 Temple.',
    unlockBuildings: ['religious_2'],
  },
  {
    id: 'masonry', name: 'Masonry', emoji: '🪨',
    era: TECH_ERAS.STONE, col: 1, row: 5,
    baseCost: 30, requires: ['mining'],
    quote: '"Stone endures. Stone remembers. Build in stone, and your name shall outlast your flesh."',
    description: 'Shaped stone allows permanent fortifications. Allows upgrade of forts to tier 2.',
    unlockBuildings: ['fortress_1'],
    clearsLocationTypes: ['rocky_ground'],
  },
];

// ─────────────────────────────────────────────────────────
// BRONZE AGE
// ─────────────────────────────────────────────────────────
// row 0 empty. Rows 1-5 mirror Stone col1 rows 0-5 for clean horizontal connections.
//   row 1: Crop Rotation  ← Pottery(S1,r0)            1 row down
//   row 2: Sailing        ← Boatbuilding(S1,r2)        horizontal ✓
//   row 3: Philosophy     ← Writing(S1,r3)             horizontal ✓
//   row 4: Fortification  ← Worship(S1,r4)+Masonry(5)  horizontal + 1 row up
//   row 5: Bronze Working ← Masonry(S1,r5)             horizontal ✓
// ─────────────────────────────────────────────────────────

const BRONZE_AGE = [
  // ── col 0 — root ────────────────────────────────────────
  // row 0 intentionally empty
  {
    id: 'crop_rotation', name: 'Crop Rotation', emoji: '🌱',
    era: TECH_ERAS.BRONZE, col: 0, row: 1,
    baseCost: 45, requires: ['pottery'],
    quote: '"Let the field rest, and it will feed you twice as well come spring."',
    description: 'Improved farming technique. +10% to all faction gold income.',
    resourceYieldPercentBonuses: [{ resourceId: RESOURCE_IDS.GOLD, percent: 10 }],
  },
  {
    id: 'sailing', name: 'Sailing', emoji: '⛵',
    era: TECH_ERAS.BRONZE, col: 0, row: 2,
    baseCost: 45, requires: ['boatbuilding'],
    quote: '"The sea is not an obstacle — it is a road waiting to be walked."',
    description: 'Deep-water navigation. All trade and exploration buildings yield +1 gold/turn.',
    buildingCategoryBonuses: [
      { category: BUILDING_CATEGORIES.TRADE,       bonusKey: RESOURCE_IDS.GOLD, amount: 1 },
      { category: BUILDING_CATEGORIES.EXPLORATION, bonusKey: RESOURCE_IDS.GOLD, amount: 1 },
    ],
  },
  {
    id: 'philosophy', name: 'Philosophy', emoji: '💡',
    era: TECH_ERAS.BRONZE, col: 0, row: 3,
    baseCost: 45, requires: ['writing'],
    quote: '"I know that I know nothing — and that knowledge is the beginning of wisdom."',
    description: 'Formal inquiry into nature and reason. All scientific buildings yield +1 research/turn.',
    buildingCategoryBonuses: [
      { category: BUILDING_CATEGORIES.SCIENTIFIC, bonusKey: RESOURCE_IDS.RESEARCH, amount: 1 },
    ],
  },
  {
    id: 'fortification', name: 'Fortification', emoji: '🏰',
    era: TECH_ERAS.BRONZE, col: 0, row: 4,
    baseCost: 45, requires: ['worship', 'masonry'],
    quote: '"A wall is not just stone — it is the will of a people made solid."',
    description: 'Advanced defensive architecture. Defensive buildings yield +1 gold/turn. Militia +1.',
    buildingCategoryBonuses: [
      { category: BUILDING_CATEGORIES.DEFENSIVE, bonusKey: RESOURCE_IDS.GOLD, amount: 1 },
    ],
    militiaBonus: 1,
  },
  {
    id: 'bronze_working', name: 'Bronze Working', emoji: '🗡️',
    era: TECH_ERAS.BRONZE, col: 0, row: 5,
    baseCost: 45, requires: ['masonry'],
    quote: '"Copper bends. Tin yields. Together they forge something neither can be alone."',
    description: 'Superior metal alloy. All infantry units gain +1 attack.',
    unitStatBonuses: [{ unitType: UNIT_TYPES.INFANTRY, stat: 'attack', amount: 1 }],
    clearsLocationTypes: ['dense_forest', 'dry_wastes'],
  },

  // ── col 1 — advanced ────────────────────────────────────
  // row 0 intentionally empty
  {
    id: 'taxation', name: 'Taxation', emoji: '📋',
    era: TECH_ERAS.BRONZE, col: 1, row: 1,
    baseCost: 60, requires: ['crop_rotation'],
    quote: '"The empire is built not on conquest, but on the reliable collection of grain."',
    description: 'Organised record-keeping. Administration buildings yield +2 gold/turn.',
    buildingCategoryBonuses: [
      { category: BUILDING_CATEGORIES.ADMINISTRATION, bonusKey: RESOURCE_IDS.GOLD, amount: 2 },
    ],
  },
  {
    id: 'navigation', name: 'Navigation', emoji: '🧭',
    era: TECH_ERAS.BRONZE, col: 1, row: 2,
    baseCost: 60, requires: ['sailing'],
    quote: '"Stars do not move — they merely wait for us to learn their language."',
    description: 'Celestial wayfinding. +10% to all faction gold income.',
    resourceYieldPercentBonuses: [{ resourceId: RESOURCE_IDS.GOLD, percent: 10 }],
  },
  {
    id: 'mathematics', name: 'Mathematics', emoji: '📐',
    era: TECH_ERAS.BRONZE, col: 1, row: 3,
    baseCost: 60, requires: ['philosophy'],
    quote: '"Numbers do not lie. It is only those who wield them that are capable of deception."',
    description: 'Geometry, accounting, and engineering. +10% to all faction research income.',
    resourceYieldPercentBonuses: [{ resourceId: RESOURCE_IDS.RESEARCH, percent: 10 }],
  },
  {
    id: 'castle_construction', name: 'Castle Construction', emoji: '🏯',
    era: TECH_ERAS.BRONZE, col: 1, row: 4,
    baseCost: 60, requires: ['fortification'],
    quote: '"The castle is not a place of refuge — it is a declaration of permanence."',
    description: 'Massive stone fortresses. Allows upgrade of forts to tier 3 Castle. Militia +2.',
    unlockBuildings: ['fortress_2'],
    militiaBonus: 2,
  },
  {
    id: 'steel', name: 'Steel', emoji: '⚔️',
    era: TECH_ERAS.BRONZE, col: 1, row: 5,
    baseCost: 60, requires: ['bronze_working'],
    quote: '"The edge that wins the battle is not the sharpest — it is the last one standing."',
    description: 'Refined alloy of exceptional strength. Infantry gain +1 attack and +1 defense.',
    unitStatBonuses: [
      { unitType: UNIT_TYPES.INFANTRY, stat: 'attack',  amount: 1 },
      { unitType: UNIT_TYPES.INFANTRY, stat: 'defense', amount: 1 },
    ],
  },
];

// ─────────────────────────────────────────────────────────
// IRON AGE
// ─────────────────────────────────────────────────────────
// row 0 empty. Rows 1-5 mirror Bronze col1 rows 1-5 for clean horizontal connections.
//   row 1: Trade Networks  ← Taxation(B1,r1) + Navigation(B1,r2)   horizontal + 1 row up
//   row 2: (empty)
//   row 3: Scholarship     ← Mathematics(B1,r3)                     horizontal ✓
//   row 4: Divine Law      ← Castle Construction(B1,r4)             horizontal ✓
//   row 5: Iron Working    ← Steel(B1,r5)                           horizontal ✓
// ─────────────────────────────────────────────────────────

const IRON_AGE = [
  // ── col 0 — root ────────────────────────────────────────
  // row 0 and row 2 intentionally empty
  {
    id: 'trade_networks', name: 'Trade Networks', emoji: '🤝',
    era: TECH_ERAS.IRON, col: 0, row: 1,
    baseCost: 80, requires: ['taxation', 'navigation'],
    quote: '"Commerce is war by other means — and far more profitable."',
    description: 'Organised merchant leagues spanning provinces. +15% to all faction gold income.',
    resourceYieldPercentBonuses: [{ resourceId: RESOURCE_IDS.GOLD, percent: 15 }],
  },
  {
    id: 'scholarship', name: 'Scholarship', emoji: '🎓',
    era: TECH_ERAS.IRON, col: 0, row: 3,
    baseCost: 80, requires: ['mathematics'],
    quote: '"The scholar who reads one book is dangerous. The one who reads all of them is unstoppable."',
    description: 'Formal academic institutions. Scientific buildings yield +2 research/turn.',
    buildingCategoryBonuses: [
      { category: BUILDING_CATEGORIES.SCIENTIFIC, bonusKey: RESOURCE_IDS.RESEARCH, amount: 2 },
    ],
  },
  {
    id: 'divine_law', name: 'Divine Law', emoji: '⚖️',
    era: TECH_ERAS.IRON, col: 0, row: 4,
    baseCost: 80, requires: ['castle_construction'],
    quote: '"When the king speaks the law, and the priest speaks god — they must say the same thing."',
    description: 'Sacred legal authority. Administration buildings yield +2 gold/turn. Militia +2.',
    buildingCategoryBonuses: [
      { category: BUILDING_CATEGORIES.ADMINISTRATION, bonusKey: RESOURCE_IDS.GOLD, amount: 2 },
    ],
    militiaBonus: 2,
  },
  {
    id: 'iron_working', name: 'Iron Working', emoji: '⚒️',
    era: TECH_ERAS.IRON, col: 0, row: 5,
    baseCost: 80, requires: ['steel'],
    quote: '"Iron is patient. It waits in the earth for a thousand years, then rules the age."',
    description: 'Smelted iron surpasses bronze entirely. Infantry gain +2 attack and +1 defense.',
    unitStatBonuses: [
      { unitType: UNIT_TYPES.INFANTRY, stat: 'attack',  amount: 2 },
      { unitType: UNIT_TYPES.INFANTRY, stat: 'defense', amount: 1 },
    ],
    clearsLocationTypes: ['dense_jungle', 'frozen_wastes'],
  },

  // ── col 1 — advanced ────────────────────────────────────
  // row 0 and row 2 intentionally empty
  {
    id: 'guilds', name: 'Guilds', emoji: '🏪',
    era: TECH_ERAS.IRON, col: 1, row: 1,
    baseCost: 100, requires: ['trade_networks'],
    quote: '"A craftsman who works alone makes a living. A craftsman who joins a guild makes history."',
    description: 'Organised merchant and craft associations. Trade buildings yield +2 gold/turn.',
    buildingCategoryBonuses: [
      { category: BUILDING_CATEGORIES.TRADE, bonusKey: RESOURCE_IDS.GOLD, amount: 2 },
    ],
  },
  {
    id: 'universities', name: 'Universities', emoji: '🏛️',
    era: TECH_ERAS.IRON, col: 1, row: 3,
    baseCost: 100, requires: ['scholarship'],
    quote: '"The university is where knowledge comes to die — and be reborn as wisdom."',
    description: 'Grand institutions of higher learning. Unlocks the Academy (tier 3 science building). +10% research.',
    unlockBuildings: ['research_academy'],
    resourceYieldPercentBonuses: [{ resourceId: RESOURCE_IDS.RESEARCH, percent: 10 }],
  },
  {
    id: 'monarchy', name: 'Monarchy', emoji: '👑',
    era: TECH_ERAS.IRON, col: 1, row: 4,
    baseCost: 100, requires: ['divine_law'],
    quote: '"A king without a crown is just a man with enemies. A king with one has enemies and obligations."',
    description: 'Centralised rule. Unlocks the Imperial Palace (town hall tier 3). Grand Hall grants +3 gold/turn.',
    unlockBuildings: ['town_hall_3'],
    buildingBonuses: [{ buildingId: 'town_hall_2', bonusKey: RESOURCE_IDS.GOLD, amount: 3 }],
  },
  {
    id: 'metallurgy', name: 'Metallurgy', emoji: '🔩',
    era: TECH_ERAS.IRON, col: 1, row: 5,
    baseCost: 100, requires: ['iron_working'],
    quote: '"The forge reveals the truth of all things — what is strong endures; what is weak, burns."',
    description: 'Advanced metalworking. All units gain +1 attack and +1 defense.',
    unitStatBonuses: [
      { unitType: UNIT_TYPES.ALL, stat: 'attack',  amount: 1 },
      { unitType: UNIT_TYPES.ALL, stat: 'defense', amount: 1 },
    ],
  },
];

// ─────────────────────────────────────────────────────────
// All base techs + override techs
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// RACE TECH OVERRIDES
// Each race replaces: worship (Stone), fortification (Bronze), steel (Bronze)
// ─────────────────────────────────────────────────────────

const DWARF_RACE_TECHS = [
  {
    id: 'runeforging', name: 'Runeforging', emoji: '🔮',
    era: TECH_ERAS.STONE, col: 1, row: 3,
    raceId: RACE_IDS.DWARF, replacesId: 'worship',
    baseCost: 30, requires: ['mysticism'],
    quote: '"A rune is not written — it is remembered, from before the world was young."',
    description: 'Ancient dwarven script is mastered. Unlocks the Rune Assignment panel in armies. Forge chain buildings generate +1 Rune/turn.',
    buildingBonuses: [
      { buildingId: 'necropolis_1', bonusKey: RESOURCE_IDS.RUNES, amount: 1 },
      { buildingId: 'workshop_1',   bonusKey: RESOURCE_IDS.RUNES, amount: 1 },
      { buildingId: 'workshop_2',   bonusKey: RESOURCE_IDS.RUNES, amount: 1 },
      { buildingId: 'workshop_3',   bonusKey: RESOURCE_IDS.RUNES, amount: 1 },
    ],
  },
  {
    id: 'ancient_masonry', name: 'Ancient Masonry', emoji: '🪨',
    era: TECH_ERAS.BRONZE, col: 0, row: 3,
    raceId: RACE_IDS.DWARF, replacesId: 'fortification',
    baseCost: 45, requires: ['masonry'],
    quote: '"Dwarf stone holds what no mortar can — stubborn memory."',
    description: 'Unlocks enhanced dwarf defensive buildings. Stone Fort and Stone Castle provide an additional +5% defense bonus for dwarf factions.',
    buildingBonuses: [
      { buildingId: 'fortress_1', bonusKey: 'defense', amount: 0.05 },
      { buildingId: 'fortress_2', bonusKey: 'defense', amount: 0.05 },
    ],
  },
  {
    id: 'runescript', name: 'Runescript', emoji: '📿',
    era: TECH_ERAS.BRONZE, col: 1, row: 4,
    raceId: RACE_IDS.DWARF, replacesId: 'steel',
    baseCost: 60, requires: ['runeforging'],
    quote: '"A lighter hand on the chisel, yet the same power flows."',
    description: 'Refined runic technique reduces upkeep by 1 Rune per runed unit (minimum 0). Rune assignments become cheaper to maintain.',
    effects: [{ scope: 'faction', type: 'rune_upkeep_reduction', amount: 1 }],
  },
];

const HUMAN_RACE_TECHS = [
  {
    id: 'noble_lineage', name: 'Noble Lineage', emoji: '👑',
    era: TECH_ERAS.STONE, col: 1, row: 3,
    raceId: RACE_IDS.HUMAN, replacesId: 'worship',
    baseCost: 30, requires: ['mysticism'],
    quote: '"Blood may thin over generations, but the name carries weight forever."',
    description: 'Noble houses claim legitimacy. Capital town halls generate +1 Prestige/turn.',
    buildingBonuses: [
      { buildingId: 'town_hall_1', bonusKey: RESOURCE_IDS.PRESTIGE, amount: 1 },
      { buildingId: 'town_hall_2', bonusKey: RESOURCE_IDS.PRESTIGE, amount: 2 },
      { buildingId: 'town_hall_3', bonusKey: RESOURCE_IDS.PRESTIGE, amount: 3 },
    ],
  },
  {
    id: 'martial_tradition', name: 'Martial Tradition', emoji: '⚔️',
    era: TECH_ERAS.BRONZE, col: 0, row: 3,
    raceId: RACE_IDS.HUMAN, replacesId: 'fortification',
    baseCost: 45, requires: ['masonry'],
    quote: '"A blade in the hand is worth a dozen in the armoury."',
    description: 'Centuries of warfare refined. All INFANTRY and CAVALRY units gain +1 attack.',
    unitStatBonuses: [
      { unitType: UNIT_TYPES.INFANTRY, stat: 'attack', amount: 1 },
      { unitType: UNIT_TYPES.CAVALRY,  stat: 'attack', amount: 1 },
    ],
  },
  {
    id: 'imperial_roads', name: 'Imperial Roads', emoji: '🛣️',
    era: TECH_ERAS.BRONZE, col: 1, row: 4,
    raceId: RACE_IDS.HUMAN, replacesId: 'steel',
    baseCost: 60, requires: ['noble_lineage'],
    quote: '"Roads are the sinews of empire — cut them and the body falls."',
    description: 'Paved road networks grant all human armies +1 movement.',
    unitStatBonuses: [
      { unitType: UNIT_TYPES.ALL, stat: 'movement', amount: 1 },
    ],
  },
];

const ELF_RACE_TECHS = [
  {
    id: 'sea_lore', name: 'Sea Lore', emoji: '🌊',
    era: TECH_ERAS.STONE, col: 1, row: 3,
    raceId: RACE_IDS.ELF, replacesId: 'worship',
    baseCost: 30, requires: ['mysticism'],
    quote: '"The sea holds more secrets than any library — and unlike scholars, it never lies."',
    description: 'Elven mastery of oceanic patterns. Coastal provinces generate +1 Aether/turn.',
    buildingBonuses: [],   // handled by biome income (coastal aether is in azure_docks buildings)
    resourceYieldPercentBonuses: [{ resourceId: RESOURCE_IDS.AETHER, percent: 15 }],
  },
  {
    id: 'aetheric_arts', name: 'Aetheric Arts', emoji: '✨',
    era: TECH_ERAS.BRONZE, col: 0, row: 3,
    raceId: RACE_IDS.ELF, replacesId: 'fortification',
    baseCost: 45, requires: ['masonry'],
    quote: '"The Aether is the language of creation. Learn it and the world bends."',
    description: 'Elves may spend 5 Aether to reduce the cost of the next technology by 10%.',
    effects: [{ scope: 'faction', type: 'aether_tech_discount', aetherCost: 5, discountPercent: 10 }],
  },
  {
    id: 'wayfarers_guild', name: 'Wayfarers\' Guild', emoji: '🧭',
    era: TECH_ERAS.BRONZE, col: 1, row: 4,
    raceId: RACE_IDS.ELF, replacesId: 'steel',
    baseCost: 60, requires: ['sea_lore'],
    quote: '"Every horizon is the beginning of someone\'s home."',
    description: 'Expert navigators and explorers. Province clearing costs -1 turn (minimum 1).',
    clearsLocationTypes: [],   // reduces clear time — handled by checking this tech in turn-engine
    effects: [{ scope: 'faction', type: 'clear_time_reduction', amount: 1 }],
  },
];

const LIZARD_RACE_TECHS = [
  {
    id: 'ancient_memory', name: 'Ancient Memory', emoji: '📿',
    era: TECH_ERAS.STONE, col: 1, row: 3,
    raceId: RACE_IDS.LIZARD, replacesId: 'worship',
    baseCost: 30, requires: ['mysticism'],
    quote: '"We remember what was before the gods put words to the sky."',
    description: 'The lore of ages past is alive in lizardmen memory. Clearing ruins grants +2 Ancient Lore.',
    effects: [{ scope: 'faction', type: 'ruin_clear_bonus', resourceId: RESOURCE_IDS.ANCIENT_LORE, amount: 2 }],
  },
  {
    id: 'primordial_scales', name: 'Primordial Scales', emoji: '🦎',
    era: TECH_ERAS.BRONZE, col: 0, row: 3,
    raceId: RACE_IDS.LIZARD, replacesId: 'fortification',
    baseCost: 45, requires: ['masonry'],
    quote: '"Nature already built the perfect armour — on our ancestors."',
    description: 'Ancient lizardmen harden their scales with ritual baths. All lizard units gain +1 defense.',
    unitStatBonuses: [
      { unitType: UNIT_TYPES.ALL, stat: 'defense', amount: 1 },
    ],
  },
  {
    id: 'ancestral_rites', name: 'Ancestral Rites', emoji: '🌿',
    era: TECH_ERAS.BRONZE, col: 1, row: 4,
    raceId: RACE_IDS.LIZARD, replacesId: 'steel',
    baseCost: 60, requires: ['ancient_memory'],
    quote: '"The price of knowledge is always paid — sometimes in blood, sometimes in memory."',
    description: 'Deep ritual converts Ancient Lore into research insight. Spend 10 Ancient Lore for -20% on next tech cost.',
    effects: [{ scope: 'faction', type: 'lore_tech_discount', loreCost: 10, discountPercent: 20 }],
  },
];

// ─────────────────────────────────────────────────────────
// FACTION TECH OVERRIDES
// Each faction replaces: trade_networks (Iron col-0 row-0), scholarship (Iron col-0 row-1), guilds (Iron col-0 row-4)
// ─────────────────────────────────────────────────────────

const KUR_MARGAL_TECHS = [
  {
    id: 'soul_harvest', name: 'Soul Harvest', emoji: '👻',
    era: TECH_ERAS.IRON, col: 0, row: 0,
    factionId: FACTION_IDS.KUR_MARGAL, replacesId: 'trade_networks',
    baseCost: 80, requires: [],
    quote: '"Every enemy slain is another soldier for the kingdom."',
    description: 'Victory brings +2 extra Souls per province captured. Construct units gain +1 attack and +1 defense.',
    unitStatBonuses: [
      { unitType: UNIT_TYPES.CONSTRUCT, stat: 'attack',  amount: 1 },
      { unitType: UNIT_TYPES.CONSTRUCT, stat: 'defense', amount: 1 },
    ],
    effects: [{ scope: 'faction', type: 'victory_soul_bonus', amount: 2 }],
  },
  {
    id: 'undying_legion', name: 'Undying Legion', emoji: '💀',
    era: TECH_ERAS.IRON, col: 0, row: 1,
    factionId: FACTION_IDS.KUR_MARGAL, replacesId: 'scholarship',
    baseCost: 80, requires: ['soul_harvest'],
    quote: '"They do not march to war — they march because war is all they know."',
    description: 'Undead Levy and Bone Thrower stack sizes increase by +1 when recruited.',
    stackSizeBonuses: [
      { unitId: 'undead_levy',  amount: 1 },
      { unitId: 'bone_thrower', amount: 1 },
    ],
  },
  {
    id: 'eternal_binding', name: 'Eternal Binding', emoji: '🔗',
    era: TECH_ERAS.IRON, col: 0, row: 4,
    factionId: FACTION_IDS.KUR_MARGAL, replacesId: 'guilds',
    baseCost: 80, requires: ['undying_legion'],
    quote: '"Death is not an ending. It is merely a renegotiation."',
    description: 'Soul Resurrection now has a 50% chance to NOT consume a Soul when saving a dwarf unit.',
    effects: [{ scope: 'faction', type: 'soul_resurrection_chance', noConsumeProbability: 0.5 }],
  },
];

const IRON_FREEHOLDS_TECHS = [
  {
    id: 'merchant_clans', name: 'Merchant Clans', emoji: '🛍️',
    era: TECH_ERAS.IRON, col: 0, row: 0,
    factionId: FACTION_IDS.IRON_FREEHOLDS, replacesId: 'trade_networks',
    baseCost: 80, requires: [],
    quote: '"No king commanded us to build this — we built it because it was profitable."',
    description: 'Each market building generates +1 Schematics/turn.',
    buildingBonuses: [
      { buildingId: 'market_1', bonusKey: RESOURCE_IDS.SCHEMATICS, amount: 1 },
      { buildingId: 'market_2', bonusKey: RESOURCE_IDS.SCHEMATICS, amount: 1 },
      { buildingId: 'market_3', bonusKey: RESOURCE_IDS.SCHEMATICS, amount: 1 },
    ],
  },
  {
    id: 'airship_fleet', name: 'Airship Fleet', emoji: '🚁',
    era: TECH_ERAS.IRON, col: 0, row: 1,
    factionId: FACTION_IDS.IRON_FREEHOLDS, replacesId: 'scholarship',
    baseCost: 80, requires: ['merchant_clans'],
    quote: '"The sky belongs to no king. We intend to keep it that way."',
    description: 'Unlocks the Sky Raider unit. Armies containing Sky Raiders gain +1 movement. Unlocks the Airship Teleport army action (spend Schematics to move up to 5 range).',
    unlockUnits: ['sky_raider'],
  },
  {
    id: 'engineering_mastery', name: 'Engineering Mastery', emoji: '🔧',
    era: TECH_ERAS.IRON, col: 0, row: 4,
    factionId: FACTION_IDS.IRON_FREEHOLDS, replacesId: 'guilds',
    baseCost: 80, requires: ['airship_fleet'],
    quote: '"A dwarf with a blueprint is more dangerous than one with an axe."',
    description: 'Unlocks the Siege Engineer unit. Province Fortification now costs 2 Schematics instead of 3.',
    unlockUnits: ['siege_engineer'],
    effects: [{ scope: 'faction', type: 'fortify_cost_reduction', amount: 1 }],
  },
];

const DRAIG_GOCH_TECHS = [
  {
    id: 'oath_of_the_dragon', name: 'Oath of the Dragon', emoji: '🔥',
    era: TECH_ERAS.IRON, col: 0, row: 0,
    factionId: FACTION_IDS.DRAIG_GOCH, replacesId: 'trade_networks',
    baseCost: 80, requires: [],
    quote: '"I swear on scales older than memory: I will not yield."',
    description: 'Unlocks the Dragonsworn unit. Combat victories grant +2 Dragon Essence.',
    unlockUnits: ['draig_dragonsworn'],
  },
  {
    id: 'code_of_honor', name: 'Code of Honor', emoji: '⚔️',
    era: TECH_ERAS.IRON, col: 0, row: 1,
    factionId: FACTION_IDS.DRAIG_GOCH, replacesId: 'scholarship',
    baseCost: 80, requires: ['oath_of_the_dragon'],
    quote: '"Honor is not given — it is earned at the edge of a blade."',
    description: 'Unlocks the "Code of Honor" army action: activate to grant +2 attack / -1 defense for one battle. Single use per battle.',
  },
  {
    id: 'dragon_binding', name: 'Dragon Binding', emoji: '🐉',
    era: TECH_ERAS.IRON, col: 0, row: 4,
    factionId: FACTION_IDS.DRAIG_GOCH, replacesId: 'guilds',
    baseCost: 80, requires: ['code_of_honor'],
    quote: '"The dragon does not serve. It chooses. And it has chosen us."',
    description: 'The Dragon Knight unit is unlocked. A warrior so bound to the Dragon that they can no longer truly die.',
  },
];

const AURIC_EMPIRE_TECHS = [
  {
    id: 'trade_empire', name: 'Trade Empire', emoji: '💰',
    era: TECH_ERAS.IRON, col: 0, row: 0,
    factionId: FACTION_IDS.AURIC_EMPIRE, replacesId: 'trade_networks',
    baseCost: 80, requires: [],
    quote: '"A city\'s prosperity is measured not by its walls, but by its ledgers."',
    description: 'Each market building generates an additional +2 gold/turn.',
    buildingBonuses: [
      { buildingId: 'market_1', bonusKey: RESOURCE_IDS.GOLD, amount: 2 },
      { buildingId: 'market_2', bonusKey: RESOURCE_IDS.GOLD, amount: 2 },
      { buildingId: 'market_3', bonusKey: RESOURCE_IDS.GOLD, amount: 2 },
    ],
  },
  {
    id: 'golden_sails', name: 'Golden Sails', emoji: '⛵',
    era: TECH_ERAS.IRON, col: 0, row: 1,
    factionId: FACTION_IDS.AURIC_EMPIRE, replacesId: 'scholarship',
    baseCost: 80, requires: ['trade_empire'],
    quote: '"A golden sail on the horizon means coin is coming."',
    description: 'Unlocks the Golden Lancer unit. Coastal provinces generate +1 Contracts/turn.',
    unlockUnits: ['golden_lancer'],
    buildingCategoryBonuses: [],
    effects: [{ scope: 'faction', type: 'coastal_resource_bonus', resourceId: RESOURCE_IDS.CONTRACTS, amount: 1 }],
  },
  {
    id: 'mercenary_contracts', name: 'Mercenary Contracts', emoji: '📜',
    era: TECH_ERAS.IRON, col: 0, row: 4,
    factionId: FACTION_IDS.AURIC_EMPIRE, replacesId: 'guilds',
    baseCost: 80, requires: ['golden_sails'],
    quote: '"Why fight when you can pay someone else to do it — and better?"',
    description: 'Unlocks Mercenary Swords and Mercenary Crossbow units (build instantly). Conquest penalty reduced from 10 to 6 turns.',
    unlockUnits: ['mercenary_swords', 'mercenary_crossbow'],
    effects: [{ scope: 'faction', type: 'conquest_penalty_reduction', turnsReduction: 4 }],
  },
];

const POLEIS_AETHERA_TECHS = [
  {
    id: 'great_voyage', name: 'Great Voyage', emoji: '🗺️',
    era: TECH_ERAS.IRON, col: 0, row: 0,
    factionId: FACTION_IDS.POLEIS_AETHERA, replacesId: 'trade_networks',
    baseCost: 80, requires: [],
    quote: '"The greatest explorer is not she who sees the most — but she who returns to tell about it."',
    description: 'Clearing ruins or monster dens awards +100% of the base gold/research reward.',
    effects: [{ scope: 'faction', type: 'clear_reward_multiplier', multiplier: 1.0 }],
  },
  {
    id: 'philosophical_school', name: 'Philosophical School', emoji: '📜',
    era: TECH_ERAS.IRON, col: 0, row: 1,
    factionId: FACTION_IDS.POLEIS_AETHERA, replacesId: 'scholarship',
    baseCost: 80, requires: ['great_voyage'],
    quote: '"A mind that questions is worth more than one that merely obeys."',
    description: 'The research cost multiplier grows at 1.024× per tech instead of the base 1.03×.',
    effects: [{ scope: 'faction', type: 'research_multiplier_reduction', multiplier: 0.024 }],
  },
  {
    id: 'naval_league', name: 'Naval League', emoji: '🌊',
    era: TECH_ERAS.IRON, col: 0, row: 4,
    factionId: FACTION_IDS.POLEIS_AETHERA, replacesId: 'guilds',
    baseCost: 80, requires: ['philosophical_school'],
    quote: '"The sea gives as much as it takes — if you know how to ask."',
    description: 'Unlocks the Azure Sea Raider. Coastal provinces generate +1 Aether/turn.',
    unlockUnits: ['azure_sea_raider'],
    effects: [{ scope: 'faction', type: 'coastal_resource_bonus', resourceId: RESOURCE_IDS.AETHER, amount: 1 }],
  },
];

const ARCHONATE_GREYHAVEN_TECHS = [
  {
    id: 'iron_discipline', name: 'Iron Discipline', emoji: '🏯',
    era: TECH_ERAS.IRON, col: 0, row: 0,
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN, replacesId: 'trade_networks',
    baseCost: 80, requires: [],
    quote: '"Pain is weakness leaving the body. We have none of it left."',
    description: 'Unlocks the Phalanx Soldier unit. INFANTRY tier 2+ units gain +1 defense.',
    unlockUnits: ['phalanx_soldier'],
    unitStatBonuses: [
      { unitType: UNIT_TYPES.INFANTRY, stat: 'defense', amount: 1 },
    ],
  },
  {
    id: 'subject_taxation', name: 'Subject Taxation', emoji: '⚖️',
    era: TECH_ERAS.IRON, col: 0, row: 1,
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN, replacesId: 'scholarship',
    baseCost: 80, requires: ['iron_discipline'],
    quote: '"The subject caste exists to serve. We exist to lead."',
    description: 'Tribute Hall buildings generate +1 additional Tribute/turn (total 2).',
    buildingBonuses: [
      { buildingId: 'tribute_hall', bonusKey: RESOURCE_IDS.TRIBUTE, amount: 1 },
    ],
  },
  {
    id: 'eternal_phalanx', name: 'Eternal Phalanx', emoji: '🛡️',
    era: TECH_ERAS.IRON, col: 0, row: 4,
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN, replacesId: 'guilds',
    baseCost: 80, requires: ['subject_taxation'],
    quote: '"We have held this line for a thousand years. We will hold it for a thousand more."',
    description: 'Unlocks the Iron Phalanx and Archonate Sentinel units. Conscript Levy costs 2 Tribute (reduced from 3) and adds 3 levies instead of 2.',
    unlockUnits: ['iron_phalanx', 'archonate_sentinel'],
    effects: [{ scope: 'faction', type: 'conscript_cost_reduction', costReduction: 1, bonusLevies: 1 }],
  },
];

const SUTEKH_RA_TECHS = [
  {
    id: 'sun_blessing', name: 'Sun Blessing', emoji: '☀️',
    era: TECH_ERAS.IRON, col: 0, row: 0,
    factionId: FACTION_IDS.SUTEKH_RA, replacesId: 'trade_networks',
    baseCost: 80, requires: [],
    quote: '"The Sun does not ask permission to rise."',
    description: 'Unlocks the Sun Priest unit. Combat in desert or plains biomes grants all units +1 attack.',
    unlockUnits: ['sun_priest'],
    effects: [{ scope: 'faction', type: 'biome_combat_bonus', biomes: ['desert', 'plains'], stat: 'attack', amount: 1 }],
  },
  {
    id: 'desert_dominion', name: 'Desert Dominion', emoji: '🌵',
    era: TECH_ERAS.IRON, col: 0, row: 1,
    factionId: FACTION_IDS.SUTEKH_RA, replacesId: 'scholarship',
    baseCost: 80, requires: ['sun_blessing'],
    quote: '"The desert is not a wasteland — it is a treasury, waiting for the worthy."',
    description: 'Desert provinces generate +1 gold and +1 Faith per turn.',
    effects: [{ scope: 'faction', type: 'biome_income_bonus', biome: 'desert', bonuses: { gold: 1, faith: 1 } }],
  },
  {
    id: 'necromantic_arts', name: 'Necromantic Arts', emoji: '🌙',
    era: TECH_ERAS.IRON, col: 0, row: 4,
    factionId: FACTION_IDS.SUTEKH_RA, replacesId: 'guilds',
    baseCost: 80, requires: ['desert_dominion'],
    quote: '"Death is not the end — it is the Moon\'s beginning."',
    description: 'Unlocks the Moon Zealot unit. All units gain +5% chance to be wounded instead of destroyed in combat.',
    unlockUnits: ['moon_zealot'],
    woundChanceBonus: 0.05,
  },
];

const CLANS_FIRST_SCALE_TECHS = [
  {
    id: 'beast_taming', name: 'Beast Taming', emoji: '🦕',
    era: TECH_ERAS.IRON, col: 0, row: 0,
    factionId: FACTION_IDS.CLANS_FIRST_SCALE, replacesId: 'trade_networks',
    baseCost: 80, requires: [],
    quote: '"You do not own a beast. You convince it you are the greater predator."',
    description: 'Unlocks the Raptor Pack unit and Beast Pen building chain.',
    unlockUnits: ['raptor_pack'],
    unlockBuildings: ['beast_pen_1'],
  },
  {
    id: 'pack_hunting', name: 'Pack Hunting', emoji: '🐆',
    era: TECH_ERAS.IRON, col: 0, row: 1,
    factionId: FACTION_IDS.CLANS_FIRST_SCALE, replacesId: 'scholarship',
    baseCost: 80, requires: ['beast_taming'],
    quote: '"A lone predator hunts. A pack rules."',
    description: 'All MONSTER units gain +1 attack and +1 defense.',
    unitStatBonuses: [
      { unitType: UNIT_TYPES.MONSTER, stat: 'attack',  amount: 1 },
      { unitType: UNIT_TYPES.MONSTER, stat: 'defense', amount: 1 },
    ],
  },
  {
    id: 'apex_predator', name: 'Apex Predator', emoji: '🦣',
    era: TECH_ERAS.IRON, col: 0, row: 4,
    factionId: FACTION_IDS.CLANS_FIRST_SCALE, replacesId: 'guilds',
    baseCost: 80, requires: ['pack_hunting'],
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
