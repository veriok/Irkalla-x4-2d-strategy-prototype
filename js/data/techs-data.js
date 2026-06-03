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

import { TECH_ERAS, UNIT_TYPES, BUILDING_CATEGORIES, RESOURCE_IDS } from './enums.js';
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
    id: 'agriculture', name: 'Agriculture', emoji: '🌾',
    era: TECH_ERAS.STONE, col: 0, row: 0,
    baseCost: 40, requires: [],
    quote: '"Only those who toil in the soil understand that from the earth, all things flow."',
    description: 'Organised farming grants +1 gold/turn to all mercantile settlement buildings.',
    buildingBonuses: [
      { buildingId: 'mercantile_1', bonusKey: RESOURCE_IDS.GOLD, amount: 1 },
      { buildingId: 'mercantile_2', bonusKey: RESOURCE_IDS.GOLD, amount: 1 },
      { buildingId: 'mercantile_3', bonusKey: RESOURCE_IDS.GOLD, amount: 1 },
    ],
  },
  {
    id: 'hunting', name: 'Hunting', emoji: '🏹',
    era: TECH_ERAS.STONE, col: 0, row: 1,
    baseCost: 40, requires: [],
    quote: '"The greatest weapon is patience. The hunt teaches what armies cannot."',
    description: 'Mastery of ranged combat. Each faction may now recruit their tier-1 archer unit.',
    unlockUnits: ['dwarf_bone_shot', 'elf_ranger', 'lizard_skink', 'draig_bowman'],
  },
  {
    id: 'fishing', name: 'Fishing', emoji: '🎣',
    era: TECH_ERAS.STONE, col: 0, row: 2,
    baseCost: 40, requires: [],
    quote: '"He who controls the river controls the kingdom\'s stomach."',
    description: 'Allows construction of Fishing Rafts at capital and mercantile locations (+3 gold/turn).',
    unlockBuildings: ['fishing_raft'],
  },
  {
    id: 'mysticism', name: 'Mysticism', emoji: '🌙',
    era: TECH_ERAS.STONE, col: 0, row: 3,
    baseCost: 40, requires: [],
    quote: '"In the silence between heartbeats, the divine whispers its secrets."',
    description: 'Sacred knowledge grants +1 research/turn to all religious main buildings.',
    buildingBonuses: [
      { buildingId: 'religious_1', bonusKey: RESOURCE_IDS.RESEARCH, amount: 1 },
      { buildingId: 'religious_2', bonusKey: RESOURCE_IDS.RESEARCH, amount: 1 },
      { buildingId: 'religious_3', bonusKey: RESOURCE_IDS.RESEARCH, amount: 1 },
    ],
  },
  {
    id: 'mining', name: 'Mining', emoji: '⛏️',
    era: TECH_ERAS.STONE, col: 0, row: 4,
    baseCost: 40, requires: [],
    quote: '"Beneath every mountain sleeps a kingdom waiting to be unearthed."',
    description: 'Organised quarrying. Allows construction of Copper Mines in mercantile locations (+5 gold/turn).',
    unlockBuildings: ['copper_mine'],
  },

  // ── col 1 — advanced ────────────────────────────────────
  {
    id: 'pottery', name: 'Pottery', emoji: '🏺',
    era: TECH_ERAS.STONE, col: 1, row: 0,
    baseCost: 60, requires: ['agriculture'],
    quote: '"The clay remembers the hands that shaped it long after they have turned to dust."',
    description: 'Fired clay vessels allow food storage and trade. Hamlets can grow into Villages.',
    unlockBuildings: ['mercantile_2'],
  },
  {
    id: 'animal_husbandry', name: 'Animal Husbandry', emoji: '🐄',
    era: TECH_ERAS.STONE, col: 1, row: 1,
    baseCost: 60, requires: ['hunting'],
    quote: '"The tamed beast is worth ten wild ones — in labour, in milk, and in leather."',
    description: 'Domesticated livestock. Allows construction of Ranches (+2 gold, +1 primary resource/turn).',
    unlockBuildings: ['ranch'],
  },
  {
    id: 'boatbuilding', name: 'Boatbuilding', emoji: '🛶',
    era: TECH_ERAS.STONE, col: 1, row: 2,
    baseCost: 60, requires: ['fishing'],
    quote: '"A plank, a rope, and a dream — all a man needs to cross any river."',
    description: 'Construction of simple river craft. Enables deep-water sailing in the Bronze Age.',
  },
  {
    id: 'writing', name: 'Writing', emoji: '✍️',
    era: TECH_ERAS.STONE, col: 1, row: 3,
    baseCost: 60, requires: ['mysticism'],
    quote: '"The spoken word dies with the speaker. The written word lives forever."',
    description: 'Records of knowledge enable formal scholarship. Unlocks Libraries and Monastic Schools.',
    unlockBuildings: ['library', 'monastic_school'],
  },
  {
    id: 'worship', name: 'Worship', emoji: '🙏',
    era: TECH_ERAS.STONE, col: 1, row: 4,
    baseCost: 60, requires: ['mysticism'],
    quote: '"Faith does not move mountains — it convinces others to move them for you."',
    description: 'Organised religious practice. Allows upgrade of shrines to tier 2 Temple.',
    unlockBuildings: ['religious_2'],
  },
  {
    id: 'masonry', name: 'Masonry', emoji: '🪨',
    era: TECH_ERAS.STONE, col: 1, row: 5,
    baseCost: 60, requires: ['mining'],
    quote: '"Stone endures. Stone remembers. Build in stone, and your name shall outlast your flesh."',
    description: 'Shaped stone allows permanent fortifications. Allows upgrade of forts to tier 2.',
    unlockBuildings: ['fortress_1'],
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
    baseCost: 90, requires: ['pottery'],
    quote: '"Let the field rest, and it will feed you twice as well come spring."',
    description: 'Improved farming technique. +10% to all faction gold income.',
    resourceYieldPercentBonuses: [{ resourceId: RESOURCE_IDS.GOLD, percent: 10 }],
  },
  {
    id: 'sailing', name: 'Sailing', emoji: '⛵',
    era: TECH_ERAS.BRONZE, col: 0, row: 2,
    baseCost: 90, requires: ['boatbuilding'],
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
    baseCost: 90, requires: ['writing'],
    quote: '"I know that I know nothing — and that knowledge is the beginning of wisdom."',
    description: 'Formal inquiry into nature and reason. All scientific buildings yield +1 research/turn.',
    buildingCategoryBonuses: [
      { category: BUILDING_CATEGORIES.SCIENTIFIC, bonusKey: RESOURCE_IDS.RESEARCH, amount: 1 },
    ],
  },
  {
    id: 'fortification', name: 'Fortification', emoji: '🏰',
    era: TECH_ERAS.BRONZE, col: 0, row: 4,
    baseCost: 90, requires: ['worship', 'masonry'],
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
    baseCost: 90, requires: ['masonry'],
    quote: '"Copper bends. Tin yields. Together they forge something neither can be alone."',
    description: 'Superior metal alloy. All infantry units gain +1 attack.',
    unitStatBonuses: [{ unitType: UNIT_TYPES.INFANTRY, stat: 'attack', amount: 1 }],
  },

  // ── col 1 — advanced ────────────────────────────────────
  // row 0 intentionally empty
  {
    id: 'taxation', name: 'Taxation', emoji: '📋',
    era: TECH_ERAS.BRONZE, col: 1, row: 1,
    baseCost: 110, requires: ['crop_rotation'],
    quote: '"The empire is built not on conquest, but on the reliable collection of grain."',
    description: 'Organised record-keeping. Administration buildings yield +2 gold/turn.',
    buildingCategoryBonuses: [
      { category: BUILDING_CATEGORIES.ADMINISTRATION, bonusKey: RESOURCE_IDS.GOLD, amount: 2 },
    ],
  },
  {
    id: 'navigation', name: 'Navigation', emoji: '🧭',
    era: TECH_ERAS.BRONZE, col: 1, row: 2,
    baseCost: 110, requires: ['sailing'],
    quote: '"Stars do not move — they merely wait for us to learn their language."',
    description: 'Celestial wayfinding. +10% to all faction gold income.',
    resourceYieldPercentBonuses: [{ resourceId: RESOURCE_IDS.GOLD, percent: 10 }],
  },
  {
    id: 'mathematics', name: 'Mathematics', emoji: '📐',
    era: TECH_ERAS.BRONZE, col: 1, row: 3,
    baseCost: 110, requires: ['philosophy'],
    quote: '"Numbers do not lie. It is only those who wield them that are capable of deception."',
    description: 'Geometry, accounting, and engineering. +10% to all faction research income.',
    resourceYieldPercentBonuses: [{ resourceId: RESOURCE_IDS.RESEARCH, percent: 10 }],
  },
  {
    id: 'castle_construction', name: 'Castle Construction', emoji: '🏯',
    era: TECH_ERAS.BRONZE, col: 1, row: 4,
    baseCost: 110, requires: ['fortification'],
    quote: '"The castle is not a place of refuge — it is a declaration of permanence."',
    description: 'Massive stone fortresses. Allows upgrade of forts to tier 3 Castle. Militia +2.',
    unlockBuildings: ['fortress_2'],
    militiaBonus: 2,
  },
  {
    id: 'steel', name: 'Steel', emoji: '⚔️',
    era: TECH_ERAS.BRONZE, col: 1, row: 5,
    baseCost: 110, requires: ['bronze_working'],
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
    baseCost: 160, requires: ['taxation', 'navigation'],
    quote: '"Commerce is war by other means — and far more profitable."',
    description: 'Organised merchant leagues spanning provinces. +15% to all faction gold income.',
    resourceYieldPercentBonuses: [{ resourceId: RESOURCE_IDS.GOLD, percent: 15 }],
  },
  {
    id: 'scholarship', name: 'Scholarship', emoji: '🎓',
    era: TECH_ERAS.IRON, col: 0, row: 3,
    baseCost: 160, requires: ['mathematics'],
    quote: '"The scholar who reads one book is dangerous. The one who reads all of them is unstoppable."',
    description: 'Formal academic institutions. Scientific buildings yield +2 research/turn.',
    buildingCategoryBonuses: [
      { category: BUILDING_CATEGORIES.SCIENTIFIC, bonusKey: RESOURCE_IDS.RESEARCH, amount: 2 },
    ],
  },
  {
    id: 'divine_law', name: 'Divine Law', emoji: '⚖️',
    era: TECH_ERAS.IRON, col: 0, row: 4,
    baseCost: 160, requires: ['castle_construction'],
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
    baseCost: 160, requires: ['steel'],
    quote: '"Iron is patient. It waits in the earth for a thousand years, then rules the age."',
    description: 'Smelted iron surpasses bronze entirely. Infantry gain +2 attack and +1 defense.',
    unitStatBonuses: [
      { unitType: UNIT_TYPES.INFANTRY, stat: 'attack',  amount: 2 },
      { unitType: UNIT_TYPES.INFANTRY, stat: 'defense', amount: 1 },
    ],
  },

  // ── col 1 — advanced ────────────────────────────────────
  // row 0 and row 2 intentionally empty
  {
    id: 'guilds', name: 'Guilds', emoji: '🏪',
    era: TECH_ERAS.IRON, col: 1, row: 1,
    baseCost: 190, requires: ['trade_networks'],
    quote: '"A craftsman who works alone makes a living. A craftsman who joins a guild makes history."',
    description: 'Organised merchant and craft associations. Trade buildings yield +2 gold/turn.',
    buildingCategoryBonuses: [
      { category: BUILDING_CATEGORIES.TRADE, bonusKey: RESOURCE_IDS.GOLD, amount: 2 },
    ],
  },
  {
    id: 'universities', name: 'Universities', emoji: '🏛️',
    era: TECH_ERAS.IRON, col: 1, row: 3,
    baseCost: 190, requires: ['scholarship'],
    quote: '"The university is where knowledge comes to die — and be reborn as wisdom."',
    description: 'Grand institutions of higher learning. Unlocks the Academy (tier 3 science building). +10% research.',
    unlockBuildings: ['research_academy'],
    resourceYieldPercentBonuses: [{ resourceId: RESOURCE_IDS.RESEARCH, percent: 10 }],
  },
  {
    id: 'monarchy', name: 'Monarchy', emoji: '👑',
    era: TECH_ERAS.IRON, col: 1, row: 4,
    baseCost: 190, requires: ['divine_law'],
    quote: '"A king without a crown is just a man with enemies. A king with one has enemies and obligations."',
    description: 'Centralised rule. Unlocks the Imperial Palace (town hall tier 3). Grand Hall grants +3 gold/turn.',
    unlockBuildings: ['town_hall_3'],
    buildingBonuses: [{ buildingId: 'town_hall_2', bonusKey: RESOURCE_IDS.GOLD, amount: 3 }],
  },
  {
    id: 'metallurgy', name: 'Metallurgy', emoji: '🔩',
    era: TECH_ERAS.IRON, col: 1, row: 5,
    baseCost: 190, requires: ['iron_working'],
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

export const TECHS = [
  ...STONE_AGE,
  ...BRONZE_AGE,
  ...IRON_AGE,
  // Race/faction override techs: add with replacesId + factionId or raceId
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
