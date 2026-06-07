/**
 * hero-classes-data.js
 *
 * Two hero classes per faction: one general (isSpellcaster: false) and one spellcaster (isSpellcaster: true).
 *
 * statWeights: sum to 100. Used for weighted random stat gain on level-up.
 * skillWeights: higher = more likely to appear as a skill pick. Should sum to ~100.
 * spellSchools: the spell school IDs this class has access to (from SPELL_SCHOOL_IDS).
 * baseStats: starting stat values for a freshly created hero of this class.
 */

import { HERO_CLASS_IDS, HERO_SKILL_IDS, SPELL_SCHOOL_IDS, FACTION_IDS } from './enums.js';

export const HERO_CLASSES = [

  // ─── Kur Margal ───────────────────────────────────────────
  {
    id: HERO_CLASS_IDS.DEATH_KNIGHT,
    factionId: FACTION_IDS.KUR_MARGAL,
    name: 'Death Knight',
    isSpellcaster: false,
    description: 'Reborn through dark pacts, Death Knights command armies with iron will and an aura of dread that weakens enemy resolve.',
    statWeights: { atk: 28, def: 22, tactics: 20, governance: 15, knowledge: 8, spellpower: 7 },
    skillWeights: {
      [HERO_SKILL_IDS.INFANTRY_LEADER]:    20,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:    18,
      [HERO_SKILL_IDS.ANTI_CAVALRY_SKILL]: 12,
      [HERO_SKILL_IDS.ADMINISTRATOR]:      10,
      [HERO_SKILL_IDS.DEATH_MAGIC]:        15,
      [HERO_SKILL_IDS.MANA_MASTERY]:        8,
      [HERO_SKILL_IDS.TRADER]:              7,
      [HERO_SKILL_IDS.SIEGE_EXPERT_SKILL]: 10,
    },
    spellSchools: [SPELL_SCHOOL_IDS.DEATH, SPELL_SCHOOL_IDS.EARTH],
    baseStats: { atk: 2, def: 1, tactics: 1, governance: 1, knowledge: 0, spellpower: 0 },
  },
  {
    id: HERO_CLASS_IDS.LICH,
    factionId: FACTION_IDS.KUR_MARGAL,
    name: 'Lich',
    isSpellcaster: true,
    description: 'Ancient sorcerers who traded mortality for mastery of the arcane. Liches command the darkest magics and can unravel the boundary between life and death.',
    statWeights: { atk: 5, def: 8, tactics: 10, governance: 12, knowledge: 38, spellpower: 27 },
    skillWeights: {
      [HERO_SKILL_IDS.DEATH_MAGIC]:        30,
      [HERO_SKILL_IDS.EARTH_MAGIC]:        20,
      [HERO_SKILL_IDS.MANA_MASTERY]:       20,
      [HERO_SKILL_IDS.ADMINISTRATOR]:      10,
      [HERO_SKILL_IDS.INFANTRY_LEADER]:     8,
      [HERO_SKILL_IDS.TRADER]:              7,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:     5,
    },
    spellSchools: [SPELL_SCHOOL_IDS.DEATH, SPELL_SCHOOL_IDS.EARTH],
    baseStats: { atk: 0, def: 0, tactics: 0, governance: 1, knowledge: 2, spellpower: 2 },
  },

  // ─── Iron Freeholds ───────────────────────────────────────
  {
    id: HERO_CLASS_IDS.IRONLORD,
    factionId: FACTION_IDS.IRON_FREEHOLDS,
    name: 'Ironlord',
    isSpellcaster: false,
    description: 'Veterans of a hundred sieges, Ironlords lead their armies with methodical precision and an unbreakable shield wall.',
    statWeights: { atk: 25, def: 28, tactics: 20, governance: 15, knowledge: 6, spellpower: 6 },
    skillWeights: {
      [HERO_SKILL_IDS.INFANTRY_LEADER]:    22,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:    20,
      [HERO_SKILL_IDS.SIEGE_EXPERT_SKILL]: 15,
      [HERO_SKILL_IDS.ADMINISTRATOR]:      12,
      [HERO_SKILL_IDS.EARTH_MAGIC]:        10,
      [HERO_SKILL_IDS.TRADER]:              8,
      [HERO_SKILL_IDS.MANA_MASTERY]:        7,
      [HERO_SKILL_IDS.BUILDER]:             6,
    },
    spellSchools: [SPELL_SCHOOL_IDS.EARTH, SPELL_SCHOOL_IDS.RUNE],
    baseStats: { atk: 1, def: 2, tactics: 1, governance: 1, knowledge: 0, spellpower: 0 },
  },
  {
    id: HERO_CLASS_IDS.RUNESMITH,
    factionId: FACTION_IDS.IRON_FREEHOLDS,
    name: 'Runesmith',
    isSpellcaster: true,
    description: 'Masters of runic inscription, Runesmiths etch power into iron and stone, crafting artifacts and turning the tide of battle through ancient dwarf sorcery.',
    statWeights: { atk: 6, def: 10, tactics: 10, governance: 12, knowledge: 35, spellpower: 27 },
    skillWeights: {
      [HERO_SKILL_IDS.RUNE_MAGIC]:         30,
      [HERO_SKILL_IDS.EARTH_MAGIC]:        22,
      [HERO_SKILL_IDS.MANA_MASTERY]:       18,
      [HERO_SKILL_IDS.BUILDER]:            12,
      [HERO_SKILL_IDS.ADMINISTRATOR]:       8,
      [HERO_SKILL_IDS.SIEGE_EXPERT_SKILL]:  6,
      [HERO_SKILL_IDS.TRADER]:              4,
    },
    spellSchools: [SPELL_SCHOOL_IDS.RUNE, SPELL_SCHOOL_IDS.EARTH],
    baseStats: { atk: 0, def: 0, tactics: 0, governance: 1, knowledge: 2, spellpower: 2 },
  },

  // ─── Draig Goch ───────────────────────────────────────────
  {
    id: HERO_CLASS_IDS.DRAGONKNIGHT,
    factionId: FACTION_IDS.DRAIG_GOCH,
    name: 'Dragonknight',
    isSpellcaster: false,
    description: 'Bonded with draconic essence, Dragonknights are ferocious warriors who inspire their troops to fight with the fury of dragons.',
    statWeights: { atk: 32, def: 20, tactics: 20, governance: 13, knowledge: 8, spellpower: 7 },
    skillWeights: {
      [HERO_SKILL_IDS.INFANTRY_LEADER]:    20,
      [HERO_SKILL_IDS.CAVALRY_LEADER]:     15,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:    18,
      [HERO_SKILL_IDS.ANTI_CAVALRY_SKILL]: 10,
      [HERO_SKILL_IDS.FIRE_MAGIC]:         12,
      [HERO_SKILL_IDS.ADMINISTRATOR]:       8,
      [HERO_SKILL_IDS.MANA_MASTERY]:        8,
      [HERO_SKILL_IDS.TRADER]:              9,
    },
    spellSchools: [SPELL_SCHOOL_IDS.FIRE, SPELL_SCHOOL_IDS.ORDER],
    baseStats: { atk: 2, def: 1, tactics: 1, governance: 1, knowledge: 0, spellpower: 0 },
  },
  {
    id: HERO_CLASS_IDS.FLAME_HERALD,
    factionId: FACTION_IDS.DRAIG_GOCH,
    name: 'Flame Herald',
    isSpellcaster: true,
    description: 'Scholars of dragonfire who have learned to channel raw elemental fury into devastating spells. They walk between worlds of flame and shadow.',
    statWeights: { atk: 6, def: 7, tactics: 12, governance: 10, knowledge: 35, spellpower: 30 },
    skillWeights: {
      [HERO_SKILL_IDS.FIRE_MAGIC]:         32,
      [HERO_SKILL_IDS.ORDER_MAGIC]:        20,
      [HERO_SKILL_IDS.MANA_MASTERY]:       18,
      [HERO_SKILL_IDS.ADMINISTRATOR]:       8,
      [HERO_SKILL_IDS.TRADER]:              8,
      [HERO_SKILL_IDS.INFANTRY_LEADER]:     8,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:     6,
    },
    spellSchools: [SPELL_SCHOOL_IDS.FIRE, SPELL_SCHOOL_IDS.ORDER],
    baseStats: { atk: 0, def: 0, tactics: 1, governance: 1, knowledge: 2, spellpower: 1 },
  },

  // ─── Auric Empire ─────────────────────────────────────────
  {
    id: HERO_CLASS_IDS.LEGIONNAIRE,
    factionId: FACTION_IDS.AURIC_EMPIRE,
    name: 'Legionnaire',
    isSpellcaster: false,
    description: 'Elite commanders of the Auric legions, Legionnaires are masters of disciplined formation warfare and provincial governance.',
    statWeights: { atk: 22, def: 25, tactics: 25, governance: 18, knowledge: 5, spellpower: 5 },
    skillWeights: {
      [HERO_SKILL_IDS.INFANTRY_LEADER]:    22,
      [HERO_SKILL_IDS.SIEGE_EXPERT_SKILL]: 15,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:    15,
      [HERO_SKILL_IDS.ADMINISTRATOR]:      18,
      [HERO_SKILL_IDS.BUILDER]:            10,
      [HERO_SKILL_IDS.ORDER_MAGIC]:         8,
      [HERO_SKILL_IDS.TRADER]:              7,
      [HERO_SKILL_IDS.MANA_MASTERY]:        5,
    },
    spellSchools: [SPELL_SCHOOL_IDS.ORDER, SPELL_SCHOOL_IDS.LIGHT],
    baseStats: { atk: 1, def: 1, tactics: 2, governance: 1, knowledge: 0, spellpower: 0 },
  },
  {
    id: HERO_CLASS_IDS.INQUISITOR,
    factionId: FACTION_IDS.AURIC_EMPIRE,
    name: 'Inquisitor',
    isSpellcaster: true,
    description: 'Enforcers of the Auric faith, Inquisitors wield divine light to purify battlefields and bind provinces to unwavering loyalty.',
    statWeights: { atk: 6, def: 10, tactics: 12, governance: 15, knowledge: 30, spellpower: 27 },
    skillWeights: {
      [HERO_SKILL_IDS.LIGHT_MAGIC]:        30,
      [HERO_SKILL_IDS.ORDER_MAGIC]:        22,
      [HERO_SKILL_IDS.MANA_MASTERY]:       18,
      [HERO_SKILL_IDS.ADMINISTRATOR]:      12,
      [HERO_SKILL_IDS.BUILDER]:             8,
      [HERO_SKILL_IDS.TRADER]:              6,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:     4,
    },
    spellSchools: [SPELL_SCHOOL_IDS.LIGHT, SPELL_SCHOOL_IDS.ORDER],
    baseStats: { atk: 0, def: 1, tactics: 1, governance: 1, knowledge: 2, spellpower: 0 },
  },

  // ─── Poleis Aethera ───────────────────────────────────────
  {
    id: HERO_CLASS_IDS.STAR_GUARDIAN,
    factionId: FACTION_IDS.POLEIS_AETHERA,
    name: 'Star Guardian',
    isSpellcaster: false,
    description: 'Sworn protectors of the celestial order, Star Guardians fight with precision honed by studying the movements of stars and fate.',
    statWeights: { atk: 20, def: 22, tactics: 28, governance: 15, knowledge: 8, spellpower: 7 },
    skillWeights: {
      [HERO_SKILL_IDS.ARCHER_LEADER]:      22,
      [HERO_SKILL_IDS.CAVALRY_LEADER]:     15,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:    12,
      [HERO_SKILL_IDS.ADMINISTRATOR]:      15,
      [HERO_SKILL_IDS.AIR_MAGIC]:          12,
      [HERO_SKILL_IDS.TRADER]:              8,
      [HERO_SKILL_IDS.MANA_MASTERY]:        8,
      [HERO_SKILL_IDS.BUILDER]:             8,
    },
    spellSchools: [SPELL_SCHOOL_IDS.AIR, SPELL_SCHOOL_IDS.ARCANE],
    baseStats: { atk: 1, def: 1, tactics: 2, governance: 1, knowledge: 0, spellpower: 0 },
  },
  {
    id: HERO_CLASS_IDS.STARWEAVER,
    factionId: FACTION_IDS.POLEIS_AETHERA,
    name: 'Starweaver',
    isSpellcaster: true,
    description: 'Channellers of celestial ley-lines, Starweavers weave spells of breathtaking power drawn from the light of ancient stars.',
    statWeights: { atk: 4, def: 7, tactics: 10, governance: 10, knowledge: 38, spellpower: 31 },
    skillWeights: {
      [HERO_SKILL_IDS.AIR_MAGIC]:          28,
      [HERO_SKILL_IDS.ARCANE_MAGIC]:       25,
      [HERO_SKILL_IDS.MANA_MASTERY]:       20,
      [HERO_SKILL_IDS.ADMINISTRATOR]:       8,
      [HERO_SKILL_IDS.TRADER]:              8,
      [HERO_SKILL_IDS.ARCHER_LEADER]:       7,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:     4,
    },
    spellSchools: [SPELL_SCHOOL_IDS.AIR, SPELL_SCHOOL_IDS.ARCANE],
    baseStats: { atk: 0, def: 0, tactics: 1, governance: 1, knowledge: 2, spellpower: 2 },
  },

  // ─── Archonate Greyhaven ──────────────────────────────────
  {
    id: HERO_CLASS_IDS.ARCANIST,
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN,
    name: 'Arcanist',
    isSpellcaster: false,
    description: 'Scholar-warriors of the Greyhaven academies, Arcanists blend martial discipline with arcane augmentation to create devastating battlefield commanders.',
    statWeights: { atk: 20, def: 18, tactics: 22, governance: 15, knowledge: 15, spellpower: 10 },
    skillWeights: {
      [HERO_SKILL_IDS.INFANTRY_LEADER]:    16,
      [HERO_SKILL_IDS.ARCHER_LEADER]:      14,
      [HERO_SKILL_IDS.ARCANE_MAGIC]:       18,
      [HERO_SKILL_IDS.ADMINISTRATOR]:      14,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:    12,
      [HERO_SKILL_IDS.MANA_MASTERY]:       12,
      [HERO_SKILL_IDS.TRADER]:              8,
      [HERO_SKILL_IDS.NATURE_MAGIC]:        6,
    },
    spellSchools: [SPELL_SCHOOL_IDS.ARCANE, SPELL_SCHOOL_IDS.NATURE],
    baseStats: { atk: 1, def: 1, tactics: 1, governance: 1, knowledge: 1, spellpower: 0 },
  },
  {
    id: HERO_CLASS_IDS.GREY_SCHOLAR,
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN,
    name: 'Grey Scholar',
    isSpellcaster: true,
    description: 'Archivists of forbidden lore, Grey Scholars have devoted their lives to deciphering the deepest mysteries of the arcane. They are the most learned of all heroes.',
    statWeights: { atk: 4, def: 6, tactics: 10, governance: 15, knowledge: 38, spellpower: 27 },
    skillWeights: {
      [HERO_SKILL_IDS.ARCANE_MAGIC]:       28,
      [HERO_SKILL_IDS.NATURE_MAGIC]:       22,
      [HERO_SKILL_IDS.MANA_MASTERY]:       20,
      [HERO_SKILL_IDS.ADMINISTRATOR]:      12,
      [HERO_SKILL_IDS.TRADER]:              8,
      [HERO_SKILL_IDS.BUILDER]:             6,
      [HERO_SKILL_IDS.ARCHER_LEADER]:       4,
    },
    spellSchools: [SPELL_SCHOOL_IDS.ARCANE, SPELL_SCHOOL_IDS.NATURE],
    baseStats: { atk: 0, def: 0, tactics: 0, governance: 2, knowledge: 3, spellpower: 1 },
  },

  // ─── Sutekh-Ra ────────────────────────────────────────────
  {
    id: HERO_CLASS_IDS.TOMB_WARDEN,
    factionId: FACTION_IDS.SUTEKH_RA,
    name: 'Tomb Warden',
    isSpellcaster: false,
    description: 'Ancient guardians of the sacred pyramids, Tomb Wardens fight with the relentless endurance of those who serve beyond death.',
    statWeights: { atk: 20, def: 28, tactics: 18, governance: 18, knowledge: 8, spellpower: 8 },
    skillWeights: {
      [HERO_SKILL_IDS.INFANTRY_LEADER]:    20,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:    18,
      [HERO_SKILL_IDS.SIEGE_EXPERT_SKILL]: 12,
      [HERO_SKILL_IDS.ADMINISTRATOR]:      16,
      [HERO_SKILL_IDS.DEATH_MAGIC]:        12,
      [HERO_SKILL_IDS.ANCIENT_MAGIC]:      10,
      [HERO_SKILL_IDS.TRADER]:              7,
      [HERO_SKILL_IDS.MANA_MASTERY]:        5,
    },
    spellSchools: [SPELL_SCHOOL_IDS.DEATH, SPELL_SCHOOL_IDS.ANCIENT],
    baseStats: { atk: 1, def: 2, tactics: 1, governance: 1, knowledge: 0, spellpower: 0 },
  },
  {
    id: HERO_CLASS_IDS.HIEROPHANT,
    factionId: FACTION_IDS.SUTEKH_RA,
    name: 'Hierophant',
    isSpellcaster: true,
    description: 'High priests of the Old Gods who invoke ancient cosmic forces to smite enemies and bind the dead to eternal service.',
    statWeights: { atk: 5, def: 8, tactics: 10, governance: 15, knowledge: 35, spellpower: 27 },
    skillWeights: {
      [HERO_SKILL_IDS.ANCIENT_MAGIC]:      28,
      [HERO_SKILL_IDS.DEATH_MAGIC]:        25,
      [HERO_SKILL_IDS.MANA_MASTERY]:       18,
      [HERO_SKILL_IDS.ADMINISTRATOR]:      12,
      [HERO_SKILL_IDS.TRADER]:              8,
      [HERO_SKILL_IDS.INFANTRY_LEADER]:     5,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:     4,
    },
    spellSchools: [SPELL_SCHOOL_IDS.ANCIENT, SPELL_SCHOOL_IDS.DEATH],
    baseStats: { atk: 0, def: 0, tactics: 0, governance: 2, knowledge: 2, spellpower: 2 },
  },

  // ─── Clans First Scale ────────────────────────────────────
  {
    id: HERO_CLASS_IDS.SCALELORD,
    factionId: FACTION_IDS.CLANS_FIRST_SCALE,
    name: 'Scalelord',
    isSpellcaster: false,
    description: 'Primal warlords who command the beast-riders of the clans. Scalelords fight with savage ferocity and bend the largest creatures to their will.',
    statWeights: { atk: 30, def: 20, tactics: 22, governance: 12, knowledge: 8, spellpower: 8 },
    skillWeights: {
      [HERO_SKILL_IDS.CAVALRY_LEADER]:     22,
      [HERO_SKILL_IDS.INFANTRY_LEADER]:    15,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:    18,
      [HERO_SKILL_IDS.ANTI_CAVALRY_SKILL]: 10,
      [HERO_SKILL_IDS.NATURE_MAGIC]:       12,
      [HERO_SKILL_IDS.ADMINISTRATOR]:       8,
      [HERO_SKILL_IDS.MANA_MASTERY]:        8,
      [HERO_SKILL_IDS.TRADER]:              7,
    },
    spellSchools: [SPELL_SCHOOL_IDS.NATURE, SPELL_SCHOOL_IDS.ANCIENT],
    baseStats: { atk: 2, def: 1, tactics: 1, governance: 1, knowledge: 0, spellpower: 0 },
  },
  {
    id: HERO_CLASS_IDS.SPIRIT_CALLER,
    factionId: FACTION_IDS.CLANS_FIRST_SCALE,
    name: 'Spirit Caller',
    isSpellcaster: true,
    description: 'Shamanic seers who commune with the spirits of the land and ancestors, channelling their power to heal allies, curse enemies, and call ancient beasts.',
    statWeights: { atk: 5, def: 8, tactics: 12, governance: 12, knowledge: 33, spellpower: 30 },
    skillWeights: {
      [HERO_SKILL_IDS.NATURE_MAGIC]:       30,
      [HERO_SKILL_IDS.ANCIENT_MAGIC]:      25,
      [HERO_SKILL_IDS.MANA_MASTERY]:       18,
      [HERO_SKILL_IDS.ADMINISTRATOR]:       8,
      [HERO_SKILL_IDS.TRADER]:              8,
      [HERO_SKILL_IDS.CAVALRY_LEADER]:      7,
      [HERO_SKILL_IDS.BATTLE_HARDENED]:     4,
    },
    spellSchools: [SPELL_SCHOOL_IDS.NATURE, SPELL_SCHOOL_IDS.ANCIENT],
    baseStats: { atk: 0, def: 0, tactics: 1, governance: 1, knowledge: 2, spellpower: 2 },
  },
];

export const HERO_CLASS_MAP = Object.fromEntries(HERO_CLASSES.map(c => [c.id, c]));

/** Returns both classes for a given faction id */
export function getHeroClassesForFaction(factionId) {
  return HERO_CLASSES.filter(c => c.factionId === factionId);
}
