/**
 * hero-classes-data.js
 *
 * Two hero classes per faction: one general (isSpellcaster: false) and one spellcaster (isSpellcaster: true).
 *
 * statWeights: sum to 100. Used for weighted random stat gain on level-up AND for skill roll weights
 *              (each skill's roll weight = statWeights[skill.attribute]).
 * baseAttributes: starting attribute values for a freshly created hero (sum = 5, no single value > 2).
 * blockedSkills: skill IDs exempt from level-up rolls for this class.
 * startingSkill: if set, the hero begins with this skill at novice instead of a random pick.
 */

import { HERO_CLASS_IDS, HERO_SKILL_IDS, FACTION_IDS } from './enums.js';

export const HERO_CLASSES = [

  // ─── Kur Margal ───────────────────────────────────────────
  {
    id: HERO_CLASS_IDS.GALLU,
    factionId: FACTION_IDS.KUR_MARGAL,
    name: 'Gallû',
    isSpellcaster: false,
    cardImg: 'assets/cards/heroes/kur_margal_general.png',
    description: 'Reanimated commanders bound by the Sorcerer-King\'s soul-iron covenant, the Gallû are denied the mercy of death. Stripped of will but not of skill, they lead bronze-clad hosts ever onward.',
    statWeights: { atk: 28, def: 22, tactics: 20, governance: 15, knowledge: 8, spellpower: 7 },
    baseAttributes: { atk: 2, def: 1, tactics: 1, governance: 1, knowledge: 0, spellpower: 0 },
    blockedSkills: [],
    startingSkill: null,
  },
  {
    id: HERO_CLASS_IDS.NAPPAHU,
    factionId: FACTION_IDS.KUR_MARGAL,
    name: 'Nappāhu',
    isSpellcaster: true,
    cardImg: 'assets/cards/heroes/kur_margal_general.png',
    description: 'Priest-smiths consecrated to the Dark God of the Forge, the Nappāhu hammer incantations into bronze and chain the souls of the vanquished to the Sorcerer-King\'s eternal works.',
    statWeights: { atk: 5, def: 8, tactics: 10, governance: 12, knowledge: 38, spellpower: 27 },
    baseAttributes: { atk: 0, def: 0, tactics: 0, governance: 1, knowledge: 2, spellpower: 2 },
    blockedSkills: [],
    startingSkill: HERO_SKILL_IDS.CHANNELING,
  },

  // ─── Iron Freeholds ───────────────────────────────────────
  {
    id: HERO_CLASS_IDS.IRONLORD,
    factionId: FACTION_IDS.IRON_FREEHOLDS,
    name: 'Ironlord',
    isSpellcaster: false,
    cardImg: 'assets/cards/heroes/freeholds_general.png',
    description: 'Veterans of a hundred sieges, Ironlords lead their armies with methodical precision and an unbreakable shield wall.',
    statWeights: { atk: 25, def: 28, tactics: 20, governance: 15, knowledge: 6, spellpower: 6 },
    baseAttributes: { atk: 1, def: 2, tactics: 1, governance: 1, knowledge: 0, spellpower: 0 },
    blockedSkills: [],
    startingSkill: null,
  },
  {
    id: HERO_CLASS_IDS.RUNESMITH,
    factionId: FACTION_IDS.IRON_FREEHOLDS,
    name: 'Runesmith',
    isSpellcaster: true,
    cardImg: 'assets/cards/heroes/freeholds_general.png',
    description: 'Masters of runic inscription, Runesmiths etch power into iron and stone, crafting artifacts and turning the tide of battle through ancient dwarf sorcery.',
    statWeights: { atk: 6, def: 10, tactics: 10, governance: 12, knowledge: 35, spellpower: 27 },
    baseAttributes: { atk: 0, def: 0, tactics: 0, governance: 1, knowledge: 2, spellpower: 2 },
    blockedSkills: [],
    startingSkill: HERO_SKILL_IDS.CHANNELING,
  },

  // ─── Draig Goch ───────────────────────────────────────────
  {
    id: HERO_CLASS_IDS.DRAGONKNIGHT,
    factionId: FACTION_IDS.DRAIG_GOCH,
    name: 'Dragonknight',
    isSpellcaster: false,
    cardImg: 'assets/cards/heroes/draig_general.png',
    description: 'Bonded with draconic essence, Dragonknights are ferocious warriors who inspire their troops to fight with the fury of dragons.',
    statWeights: { atk: 32, def: 20, tactics: 20, governance: 13, knowledge: 8, spellpower: 7 },
    baseAttributes: { atk: 2, def: 1, tactics: 1, governance: 1, knowledge: 0, spellpower: 0 },
    blockedSkills: [],
    startingSkill: null,
  },
  {
    id: HERO_CLASS_IDS.FLAME_HERALD,
    factionId: FACTION_IDS.DRAIG_GOCH,
    name: 'Flame Herald',
    isSpellcaster: true,
    cardImg: 'assets/cards/heroes/draig_general.png',
    description: 'Scholars of dragonfire who have learned to channel raw elemental fury into devastating spells. They walk between worlds of flame and shadow.',
    statWeights: { atk: 6, def: 7, tactics: 12, governance: 10, knowledge: 35, spellpower: 30 },
    baseAttributes: { atk: 0, def: 0, tactics: 1, governance: 1, knowledge: 2, spellpower: 1 },
    blockedSkills: [],
    startingSkill: HERO_SKILL_IDS.CHANNELING,
  },

  // ─── Auric Empire ─────────────────────────────────────────
  {
    id: HERO_CLASS_IDS.LEGIONNAIRE,
    factionId: FACTION_IDS.AURIC_EMPIRE,
    name: 'Legionnaire',
    isSpellcaster: false,
    cardImg: 'assets/cards/heroes/empire_general.png',
    description: 'Elite commanders of the Auric legions, Legionnaires are masters of disciplined formation warfare and provincial governance.',
    statWeights: { atk: 22, def: 25, tactics: 25, governance: 18, knowledge: 5, spellpower: 5 },
    baseAttributes: { atk: 1, def: 1, tactics: 2, governance: 1, knowledge: 0, spellpower: 0 },
    blockedSkills: [],
    startingSkill: null,
  },
  {
    id: HERO_CLASS_IDS.INQUISITOR,
    factionId: FACTION_IDS.AURIC_EMPIRE,
    name: 'Inquisitor',
    isSpellcaster: true,
    cardImg: 'assets/cards/heroes/empire_general.png',
    description: 'Enforcers of the Auric faith, Inquisitors wield divine light to purify battlefields and bind provinces to unwavering loyalty.',
    statWeights: { atk: 6, def: 10, tactics: 12, governance: 15, knowledge: 30, spellpower: 27 },
    baseAttributes: { atk: 0, def: 1, tactics: 1, governance: 1, knowledge: 2, spellpower: 0 },
    blockedSkills: [],
    startingSkill: HERO_SKILL_IDS.CHANNELING,
  },

  // ─── Poleis Aethera ───────────────────────────────────────
  {
    id: HERO_CLASS_IDS.STAR_GUARDIAN,
    factionId: FACTION_IDS.POLEIS_AETHERA,
    name: 'Star Guardian',
    isSpellcaster: false,
    cardImg: 'assets/cards/heroes/poleis_general.png',
    description: 'Sworn protectors of the celestial order, Star Guardians fight with precision honed by studying the movements of stars and fate.',
    statWeights: { atk: 20, def: 22, tactics: 28, governance: 15, knowledge: 8, spellpower: 7 },
    baseAttributes: { atk: 1, def: 1, tactics: 2, governance: 1, knowledge: 0, spellpower: 0 },
    blockedSkills: [],
    startingSkill: null,
  },
  {
    id: HERO_CLASS_IDS.STARWEAVER,
    factionId: FACTION_IDS.POLEIS_AETHERA,
    name: 'Starweaver',
    isSpellcaster: true,
    cardImg: 'assets/cards/heroes/poleis_general.png',
    description: 'Channellers of celestial ley-lines, Starweavers weave spells of breathtaking power drawn from the light of ancient stars.',
    statWeights: { atk: 4, def: 7, tactics: 10, governance: 10, knowledge: 38, spellpower: 31 },
    baseAttributes: { atk: 0, def: 0, tactics: 0, governance: 1, knowledge: 2, spellpower: 2 },
    blockedSkills: [],
    startingSkill: HERO_SKILL_IDS.CHANNELING,
  },

  // ─── Archonate Greyhaven ──────────────────────────────────
  {
    id: HERO_CLASS_IDS.ARCANIST,
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN,
    name: 'Arcanist',
    isSpellcaster: false,
    cardImg: 'assets/cards/heroes/archonite_general.png',
    description: 'Scholar-warriors of the Greyhaven academies, Arcanists blend martial discipline with arcane augmentation to create devastating battlefield commanders.',
    statWeights: { atk: 20, def: 18, tactics: 22, governance: 15, knowledge: 15, spellpower: 10 },
    baseAttributes: { atk: 1, def: 1, tactics: 1, governance: 1, knowledge: 1, spellpower: 0 },
    blockedSkills: [],
    startingSkill: null,
  },
  {
    id: HERO_CLASS_IDS.GREY_SCHOLAR,
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN,
    name: 'Grey Scholar',
    isSpellcaster: true,
    cardImg: 'assets/cards/heroes/archonite_general.png',
    description: 'Archivists of forbidden lore, Grey Scholars have devoted their lives to deciphering the deepest mysteries of the arcane. They are the most learned of all heroes.',
    statWeights: { atk: 4, def: 6, tactics: 10, governance: 15, knowledge: 38, spellpower: 27 },
    baseAttributes: { atk: 0, def: 0, tactics: 0, governance: 2, knowledge: 2, spellpower: 1 },
    blockedSkills: [],
    startingSkill: HERO_SKILL_IDS.CHANNELING,
  },

  // ─── Sutekh-Ra ────────────────────────────────────────────
  {
    id: HERO_CLASS_IDS.TOMB_WARDEN,
    factionId: FACTION_IDS.SUTEKH_RA,
    name: 'Tomb Warden',
    isSpellcaster: false,
    cardImg: 'assets/cards/heroes/dual_kingdom_general.png',
    description: 'Ancient guardians of the sacred pyramids, Tomb Wardens fight with the relentless endurance of those who serve beyond death.',
    statWeights: { atk: 20, def: 28, tactics: 18, governance: 18, knowledge: 8, spellpower: 8 },
    baseAttributes: { atk: 1, def: 2, tactics: 1, governance: 1, knowledge: 0, spellpower: 0 },
    blockedSkills: [],
    startingSkill: null,
  },
  {
    id: HERO_CLASS_IDS.HIEROPHANT,
    factionId: FACTION_IDS.SUTEKH_RA,
    name: 'Hierophant',
    isSpellcaster: true,
    cardImg: 'assets/cards/heroes/dual_kingdom_general.png',
    description: 'High priests of the Old Gods who invoke ancient cosmic forces to smite enemies and bind the dead to eternal service.',
    statWeights: { atk: 5, def: 8, tactics: 10, governance: 15, knowledge: 35, spellpower: 27 },
    baseAttributes: { atk: 0, def: 0, tactics: 0, governance: 1, knowledge: 2, spellpower: 2 },
    blockedSkills: [],
    startingSkill: HERO_SKILL_IDS.CHANNELING,
  },

  // ─── Clans First Scale ────────────────────────────────────
  {
    id: HERO_CLASS_IDS.SCALELORD,
    factionId: FACTION_IDS.CLANS_FIRST_SCALE,
    name: 'Scalelord',
    isSpellcaster: false,
    cardImg: 'assets/cards/heroes/clans_general.png',
    description: 'Primal warlords who command the beast-riders of the clans. Scalelords fight with savage ferocity and bend the largest creatures to their will.',
    statWeights: { atk: 30, def: 20, tactics: 22, governance: 12, knowledge: 8, spellpower: 8 },
    baseAttributes: { atk: 2, def: 1, tactics: 1, governance: 1, knowledge: 0, spellpower: 0 },
    blockedSkills: [],
    startingSkill: null,
  },
  {
    id: HERO_CLASS_IDS.SPIRIT_CALLER,
    factionId: FACTION_IDS.CLANS_FIRST_SCALE,
    name: 'Spirit Caller',
    isSpellcaster: true,
    cardImg: 'assets/cards/heroes/clans_general.png',
    description: 'Shamanic seers who commune with the spirits of the land and ancestors, channelling their power to heal allies, curse enemies, and call ancient beasts.',
    statWeights: { atk: 5, def: 8, tactics: 12, governance: 12, knowledge: 33, spellpower: 30 },
    baseAttributes: { atk: 0, def: 0, tactics: 0, governance: 1, knowledge: 2, spellpower: 2 },
    blockedSkills: [],
    startingSkill: HERO_SKILL_IDS.CHANNELING,
  },
];

export const HERO_CLASS_MAP = Object.fromEntries(HERO_CLASSES.map(c => [c.id, c]));

/** Returns both classes for a given faction id */
export function getHeroClassesForFaction(factionId) {
  return HERO_CLASSES.filter(c => c.factionId === factionId);
}
