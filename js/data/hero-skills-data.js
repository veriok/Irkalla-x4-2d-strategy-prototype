/**
 * hero-skills-data.js
 *
 * All hero skill definitions. Each skill has up to 3 tiers: novice, expert, master.
 *
 * attribute:  links to HERO_ATTRIBUTES key; roll weight = class.statWeights[attribute].
 *             null = flat fallback weight of 10 while unset.
 * required:   skillId that must already be learned before this skill can roll.
 * spellbook:  SPELL_SCHOOL_IDS value — skill only rolls if faction.spellbooks[spellbook] >= 1.
 *
 * Effect types (applied via hero-engine.js getHeroArmyBonuses / getHeroProvinceBonuses):
 *   army_unit_type_bonus         — { unitType, stat: 'attack'|'defense', percent }
 *   army_unit_type_multi_bonus   — { unitType, bonuses: [{stat, percent}…] }
 *   army_anti_unit_type_bonus    — { targetUnitType, stat, percent }
 *   army_all_units_multi_bonus   — { bonuses: [{stat, percent}…] }
 *   province_income_bonus        — { percent }
 *   province_flat_gold           — { amount }
 *   province_build_speed         — { amount }
 *   hero_mana_regen              — { amount }
 *   hero_max_mana                — { percent }
 *   hero_channeling              — { tier } (gates spell casting by tier)
 *   hero_spell_school            — { schoolId, tier } (school-specific efficiency; future use)
 *   reduce_fortification         — { percent }
 */

import { HERO_SKILL_IDS, HERO_ATTRIBUTES, UNIT_TYPES, SPELL_SCHOOL_IDS } from './enums.js';

export const HERO_SKILLS = [

  // ─── Combat Skills ────────────────────────────────────────

  {
    id: HERO_SKILL_IDS.INFANTRY_LEADER,
    name: 'Infantry Leader',
    category: 'combat',
    icon: '⚔️',
    attribute: null,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '+10% infantry attack.',
        effect: { type: 'army_unit_type_bonus', unitType: UNIT_TYPES.INFANTRY, stat: 'attack', percent: 10 },
      },
      {
        tier: 'expert',
        description: '+15% infantry attack, +10% infantry defense.',
        effect: { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.INFANTRY, bonuses: [{ stat: 'attack', percent: 15 }, { stat: 'defense', percent: 10 }] },
      },
      {
        tier: 'master',
        description: '+25% infantry attack, +15% infantry defense.',
        effect: { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.INFANTRY, bonuses: [{ stat: 'attack', percent: 25 }, { stat: 'defense', percent: 15 }] },
      },
    ],
  },

  {
    id: HERO_SKILL_IDS.CAVALRY_LEADER,
    name: 'Cavalry Leader',
    category: 'combat',
    icon: '🐎',
    attribute: null,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '+10% cavalry attack.',
        effect: { type: 'army_unit_type_bonus', unitType: UNIT_TYPES.CAVALRY, stat: 'attack', percent: 10 },
      },
      {
        tier: 'expert',
        description: '+15% cavalry attack, +10% cavalry defense.',
        effect: { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CAVALRY, bonuses: [{ stat: 'attack', percent: 15 }, { stat: 'defense', percent: 10 }] },
      },
      {
        tier: 'master',
        description: '+25% cavalry attack, +15% cavalry defense.',
        effect: { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CAVALRY, bonuses: [{ stat: 'attack', percent: 35 }, { stat: 'defense', percent: 20 }] },
      },
    ],
  },

  {
    id: HERO_SKILL_IDS.ARCHER_LEADER,
    name: 'Archer Leader',
    category: 'combat',
    icon: '🏹',
    attribute: null,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '+10% archer attack.',
        effect: { type: 'army_unit_type_bonus', unitType: UNIT_TYPES.ARCHER, stat: 'attack', percent: 10 },
      },
      {
        tier: 'expert',
        description: '+15% archer attack, +10% archer defense.',
        effect: { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.ARCHER, bonuses: [{ stat: 'attack', percent: 15 }, { stat: 'defense', percent: 10 }] },
      },
      {
        tier: 'master',
        description: '+25% archer attack, +15% archer defense.',
        effect: { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.ARCHER, bonuses: [{ stat: 'attack', percent: 25 }, { stat: 'defense', percent: 15 }] },
      },
    ],
  },

  {
    id: HERO_SKILL_IDS.SIEGE_EXPERT_SKILL,
    name: 'Siege Expert',
    category: 'combat',
    icon: '🏰',
    attribute: null,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '-10% enemy fortification bonus in battles.',
        effect: { type: 'reduce_fortification', percent: 10 },
      },
      {
        tier: 'expert',
        description: '-25% enemy fortification bonus in battles.',
        effect: { type: 'reduce_fortification', percent: 25 },
      },
      {
        tier: 'master',
        description: '-50% enemy fortification bonus in battles.',
        effect: { type: 'reduce_fortification', percent: 50 },
      },
    ],
  },

  {
    id: HERO_SKILL_IDS.BATTLE_HARDENED,
    name: 'Battle Hardened',
    category: 'combat',
    icon: '🛡️',
    attribute: null,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '+5% attack and defense to all units.',
        effect: { type: 'army_all_units_multi_bonus', bonuses: [{ stat: 'attack', percent: 5 }, { stat: 'defense', percent: 5 }] },
      },
      {
        tier: 'expert',
        description: '+10% attack and defense to all units.',
        effect: { type: 'army_all_units_multi_bonus', bonuses: [{ stat: 'attack', percent: 10 }, { stat: 'defense', percent: 10 }] },
      },
      {
        tier: 'master',
        description: '+15% attack and defense to all units.',
        effect: { type: 'army_all_units_multi_bonus', bonuses: [{ stat: 'attack', percent: 15 }, { stat: 'defense', percent: 15 }] },
      },
    ],
  },

  {
    id: HERO_SKILL_IDS.ANTI_CAVALRY_SKILL,
    name: 'Anti-Cavalry',
    category: 'combat',
    icon: '⚡',
    attribute: null,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '+15% attack against cavalry units.',
        effect: { type: 'army_anti_unit_type_bonus', targetUnitType: UNIT_TYPES.CAVALRY, stat: 'attack', percent: 15 },
      },
      {
        tier: 'expert',
        description: '+30% attack against cavalry units.',
        effect: { type: 'army_anti_unit_type_bonus', targetUnitType: UNIT_TYPES.CAVALRY, stat: 'attack', percent: 30 },
      },
      {
        tier: 'master',
        description: '+50% attack against cavalry units.',
        effect: { type: 'army_anti_unit_type_bonus', targetUnitType: UNIT_TYPES.CAVALRY, stat: 'attack', percent: 50 },
      },
    ],
  },

  // ─── Governance Skills ────────────────────────────────────

  {
    id: HERO_SKILL_IDS.ADMINISTRATOR,
    name: 'Administrator',
    category: 'governance',
    icon: '📜',
    attribute: null,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '+6% income to governed province.',
        effect: { type: 'province_income_bonus', percent: 6 },
      },
      {
        tier: 'expert',
        description: '+12% income to governed province.',
        effect: { type: 'province_income_bonus', percent: 12 },
      },
      {
        tier: 'master',
        description: '+20% income to governed province.',
        effect: { type: 'province_income_bonus', percent: 20 },
      },
    ],
  },

  {
    id: HERO_SKILL_IDS.TRADER,
    name: 'Trader',
    category: 'governance',
    icon: '💰',
    attribute: null,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '+5 gold/turn to governed province.',
        effect: { type: 'province_flat_gold', amount: 5 },
      },
      {
        tier: 'expert',
        description: '+10 gold/turn to governed province.',
        effect: { type: 'province_flat_gold', amount: 10 },
      },
      {
        tier: 'master',
        description: '+15 gold/turn to governed province.',
        effect: { type: 'province_flat_gold', amount: 15 },
      },
    ],
  },

  {
    id: HERO_SKILL_IDS.BUILDER,
    name: 'Builder',
    category: 'governance',
    icon: '🔨',
    attribute: null,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '-1 build turn for all constructions in governed province.',
        effect: { type: 'province_build_speed', amount: 1 },
      },
      {
        tier: 'expert',
        description: '-2 build turns for all constructions in governed province.',
        effect: { type: 'province_build_speed', amount: 2 },
      },
      {
        tier: 'master',
        description: '-3 build turns for all constructions in governed province.',
        effect: { type: 'province_build_speed', amount: 3 },
      },
    ],
  },

  // ─── Mana Skills ──────────────────────────────────────────

  {
    id: HERO_SKILL_IDS.MANA_MASTERY,
    name: 'Mana Mastery',
    category: 'magic',
    icon: '💧',
    attribute: null,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '+1 mana regen per turn.',
        effect: { type: 'hero_mana_regen', amount: 1 },
      },
      {
        tier: 'expert',
        description: '+2 mana regen per turn.',
        effect: { type: 'hero_mana_regen', amount: 2 },
      },
      {
        tier: 'master',
        description: '+3 mana regen per turn.',
        effect: { type: 'hero_mana_regen', amount: 3 },
      },
    ],
  },

  {
    id: HERO_SKILL_IDS.MANA_CAPACITY,
    name: 'Mana Capacity',
    category: 'magic',
    icon: '🔮',
    attribute: null,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '+10% maximum mana.',
        effect: { type: 'hero_max_mana', percent: 10 },
      },
      {
        tier: 'expert',
        description: '+20% maximum mana.',
        effect: { type: 'hero_max_mana', percent: 20 },
      },
      {
        tier: 'master',
        description: '+30% maximum mana.',
        effect: { type: 'hero_max_mana', percent: 30 },
      },
    ],
  },

  // ─── Channeling — universal magic prerequisite ─────────────

  {
    id: HERO_SKILL_IDS.CHANNELING,
    name: 'Channeling',
    category: 'magic',
    icon: '🌊',
    attribute: HERO_ATTRIBUTES.KNOWLEDGE,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: 'Can cast all tier 1 spells from schools your faction has spellbooks for.',
        effect: { type: 'hero_channeling', tier: 1 },
      },
      {
        tier: 'expert',
        description: 'Can also cast tier 2 spells from schools with 2+ spellbooks.',
        effect: { type: 'hero_channeling', tier: 2 },
      },
      {
        tier: 'master',
        description: 'Can cast all spell tiers from schools with 3 spellbooks.',
        effect: { type: 'hero_channeling', tier: 3 },
      },
    ],
  },

  // ─── Magic School Skills ──────────────────────────────────
  // Require CHANNELING. Only roll if faction has a spellbook for the school.
  // Boost the efficiency of spells in that school (effect tiers TBD by engine).

  {
    id: HERO_SKILL_IDS.FIRE_MAGIC,
    name: 'Fire Magic',
    category: 'magic',
    icon: '🔥',
    attribute: null,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.FIRE,
    tiers: [
      { tier: 'novice', description: 'Novice in Fire Magic. Boosts fire spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 1 } },
      { tier: 'expert', description: 'Expert in Fire Magic. Further boosts fire spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 2 } },
      { tier: 'master', description: 'Master of Fire Magic. Maximum fire spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.EARTH_MAGIC,
    name: 'Earth Magic',
    category: 'magic',
    icon: '🪨',
    attribute: null,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.EARTH,
    tiers: [
      { tier: 'novice', description: 'Novice in Earth Magic. Boosts earth spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 1 } },
      { tier: 'expert', description: 'Expert in Earth Magic. Further boosts earth spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 2 } },
      { tier: 'master', description: 'Master of Earth Magic. Maximum earth spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.AIR_MAGIC,
    name: 'Air Magic',
    category: 'magic',
    icon: '🌪️',
    attribute: null,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.AIR,
    tiers: [
      { tier: 'novice', description: 'Novice in Air Magic. Boosts air spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.AIR, tier: 1 } },
      { tier: 'expert', description: 'Expert in Air Magic. Further boosts air spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.AIR, tier: 2 } },
      { tier: 'master', description: 'Master of Air Magic. Maximum air spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.AIR, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.ARCANE_MAGIC,
    name: 'Arcane Magic',
    category: 'magic',
    icon: '✨',
    attribute: null,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.ARCANE,
    tiers: [
      { tier: 'novice', description: 'Novice in Arcane Magic. Boosts arcane spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 1 } },
      { tier: 'expert', description: 'Expert in Arcane Magic. Further boosts arcane spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 2 } },
      { tier: 'master', description: 'Master of Arcane Magic. Maximum arcane spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.RUNE_MAGIC,
    name: 'Rune Magic',
    category: 'magic',
    icon: '᚛',
    attribute: null,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.RUNE,
    tiers: [
      { tier: 'novice', description: 'Novice in Rune Magic. Boosts rune spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 1 } },
      { tier: 'expert', description: 'Expert in Rune Magic. Further boosts rune spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 2 } },
      { tier: 'master', description: 'Master of Rune Magic. Maximum rune spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.DEATH_MAGIC,
    name: 'Death Magic',
    category: 'magic',
    icon: '💀',
    attribute: null,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.DEATH,
    tiers: [
      { tier: 'novice', description: 'Novice in Death Magic. Boosts death spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 1 } },
      { tier: 'expert', description: 'Expert in Death Magic. Further boosts death spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 2 } },
      { tier: 'master', description: 'Master of Death Magic. Maximum death spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.NATURE_MAGIC,
    name: 'Nature Magic',
    category: 'magic',
    icon: '🌿',
    attribute: null,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.NATURE,
    tiers: [
      { tier: 'novice', description: 'Novice in Nature Magic. Boosts nature spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 1 } },
      { tier: 'expert', description: 'Expert in Nature Magic. Further boosts nature spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 2 } },
      { tier: 'master', description: 'Master of Nature Magic. Maximum nature spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.ANCIENT_MAGIC,
    name: 'Ancient Magic',
    category: 'magic',
    icon: '🏺',
    attribute: null,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.ANCIENT,
    tiers: [
      { tier: 'novice', description: 'Novice in Ancient Magic. Boosts ancient spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 1 } },
      { tier: 'expert', description: 'Expert in Ancient Magic. Further boosts ancient spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 2 } },
      { tier: 'master', description: 'Master of Ancient Magic. Maximum ancient spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.ORDER_MAGIC,
    name: 'Order Magic',
    category: 'magic',
    icon: '⚖️',
    attribute: null,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.ORDER,
    tiers: [
      { tier: 'novice', description: 'Novice in Order Magic. Boosts order spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 1 } },
      { tier: 'expert', description: 'Expert in Order Magic. Further boosts order spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 2 } },
      { tier: 'master', description: 'Master of Order Magic. Maximum order spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.LIGHT_MAGIC,
    name: 'Light Magic',
    category: 'magic',
    icon: '☀️',
    attribute: null,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.LIGHT,
    tiers: [
      { tier: 'novice', description: 'Novice in Light Magic. Boosts light spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 1 } },
      { tier: 'expert', description: 'Expert in Light Magic. Further boosts light spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 2 } },
      { tier: 'master', description: 'Master of Light Magic. Maximum light spell efficiency.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 3 } },
    ],
  },
];

export const HERO_SKILL_MAP = Object.fromEntries(HERO_SKILLS.map(s => [s.id, s]));

export const TIER_ORDER = ['novice', 'expert', 'master'];

/** Returns the index (0,1,2) for a tier name, or -1 if not found */
export function tierIndex(tier) { return TIER_ORDER.indexOf(tier); }

/** Returns the next tier name or null if already at master */
export function nextTier(tier) {
  const i = TIER_ORDER.indexOf(tier);
  return i >= 0 && i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : null;
}
