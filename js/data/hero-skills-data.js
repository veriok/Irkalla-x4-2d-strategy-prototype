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
 * Naming: _multi = percent multiplier; no _multi = flat additive value.
 *
 * Army effects (getHeroArmyBonuses / _applySkillEffect):
 *   army_unit_type_multi_bonus   — { unitType, stat: 'attack'|'defense', percent }
 *   army_unit_type_bonus         — { unitType, stat: 'firstStrikeChance', flat }
 *   army_anti_unit_type_multi_bonus — { targetUnitType, stat, percent }
 *   army_all_units_multi_bonus   — { stat, percent }
 *   reduce_fortification_multi   — { percent }
 *   army_wound_chance            — { bonus } (decimal, e.g. 0.05 = +5% wound-instead-of-kill chance)
 *
 * Province effects (getHeroProvinceBonuses — governor only):
 *   province_income_multi        — { percent }
 *   province_flat_gold           — { amount }
 *   province_build_multi         — { percent }
 *   province_build_speed         — { amount }
 *   province_defense_multi       — { percent }
 *   province_militia_bonus       — { amount }
 *   province_research_multi      — { percent }
 *   unit_cost_multi              — { percent }
 *   unit_recruit_speed           — { amount }
 *
 * Hero effects:
 *   hero_mana_regen              — { amount }
 *   hero_flat_mana               — { amount }  (flat addition to max mana)
 *   hero_channeling              — { tier } (gates spell casting by tier)
 *   hero_spell_school            — { schoolId, tier } (school-specific efficiency; future use)
 */

import { HERO_SKILL_IDS, HERO_ATTRIBUTES, UNIT_TYPES, SPELL_SCHOOL_IDS } from './enums.js';

export const HERO_SKILLS = [

  // ─── ATK: Leader Skills ───────────────────────────────────

  {
    id: HERO_SKILL_IDS.INFANTRY_LEADER,
    name: 'Infantry Leader',
    category: 'combat',
    icon: '⚔️',
    attribute: HERO_ATTRIBUTES.ATK,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        effects: [{ type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.INFANTRY, stat: 'attack', percent: 10 }],
      },
      {
        tier: 'expert',
        effects: [
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.INFANTRY, stat: 'attack', percent: 15 },
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.INFANTRY, stat: 'defense', percent: 10 },
        ],
      },
      {
        tier: 'master',
        effects: [
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.INFANTRY, stat: 'attack', percent: 25 },
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.INFANTRY, stat: 'defense', percent: 15 },
        ],
      },
    ],
  },

  {
    id: HERO_SKILL_IDS.CAVALRY_LEADER,
    name: 'Cavalry Leader',
    category: 'combat',
    icon: '🐎',
    attribute: HERO_ATTRIBUTES.ATK,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        effects: [{ type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CAVALRY, stat: 'attack', percent: 10 }],
      },
      {
        tier: 'expert',
        effects: [
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CAVALRY, stat: 'attack', percent: 15 },
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CAVALRY, stat: 'defense', percent: 10 },
        ],
      },
      {
        tier: 'master',
        effects: [
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CAVALRY, stat: 'attack', percent: 35 },
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CAVALRY, stat: 'defense', percent: 20 },
        ],
      },
    ],
  },

  {
    id: HERO_SKILL_IDS.ARCHER_LEADER,
    name: 'Archer Leader',
    category: 'combat',
    icon: '🏹',
    attribute: HERO_ATTRIBUTES.ATK,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        effects: [
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.ARCHER, stat: 'attack', percent: 10 },
          { type: 'army_unit_type_bonus', unitType: UNIT_TYPES.ARCHER, stat: 'firstStrikeChance', flat: 5 },
        ],
      },
      {
        tier: 'expert',
        effects: [
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.ARCHER, stat: 'attack', percent: 15 },
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.ARCHER, stat: 'defense', percent: 10 },
          { type: 'army_unit_type_bonus', unitType: UNIT_TYPES.ARCHER, stat: 'firstStrikeChance', flat: 10 },
        ],
      },
      {
        tier: 'master',
        effects: [
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.ARCHER, stat: 'attack', percent: 25 },
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.ARCHER, stat: 'defense', percent: 15 },
          { type: 'army_unit_type_bonus', unitType: UNIT_TYPES.ARCHER, stat: 'firstStrikeChance', flat: 15 },
        ],
      },
    ],
  },

  {
    id: HERO_SKILL_IDS.CONSTRUCT_LEADER,
    name: 'Construct Leader',
    category: 'combat',
    icon: '⚙️',
    attribute: HERO_ATTRIBUTES.ATK,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        effects: [{ type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CONSTRUCT, stat: 'attack', percent: 10 }],
      },
      {
        tier: 'expert',
        effects: [
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CONSTRUCT, stat: 'attack', percent: 15 },
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CONSTRUCT, stat: 'defense', percent: 10 },
        ],
      },
      {
        tier: 'master',
        effects: [
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CONSTRUCT, stat: 'attack', percent: 25 },
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CONSTRUCT, stat: 'defense', percent: 15 },
        ],
      },
    ],
  },

  // ─── TACTICS: Tactical Skills ─────────────────────────────

  {
    id: HERO_SKILL_IDS.SIEGE_EXPERT_SKILL,
    name: 'Siege Expert',
    category: 'combat',
    icon: '🏰',
    attribute: HERO_ATTRIBUTES.TACTICS,
    required: null,
    spellbook: null,
    tiers: [
      { tier: 'novice', effects: [{ type: 'reduce_fortification_multi', percent: 10 }] },
      { tier: 'expert', effects: [{ type: 'reduce_fortification_multi', percent: 25 }] },
      { tier: 'master', effects: [{ type: 'reduce_fortification_multi', percent: 50 }] },
    ],
  },

  {
    id: HERO_SKILL_IDS.LOGISTICS,
    name: 'Logistics',
    category: 'combat',
    icon: '🗺️',
    attribute: HERO_ATTRIBUTES.TACTICS,
    required: null,
    spellbook: null,
    tiers: [
      { tier: 'novice', effects: [{ type: 'army_logistics', chance: 0.25 }] },
      { tier: 'expert', effects: [{ type: 'army_logistics', chance: 0.50 }] },
      { tier: 'master', effects: [{ type: 'army_logistics', chance: 0.75 }] },
    ],
  },

  {
    id: HERO_SKILL_IDS.MUSTERER,
    name: 'Musterer',
    category: 'combat',
    icon: '📯',
    attribute: HERO_ATTRIBUTES.TACTICS,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        effects: [{ type: 'unit_cost_multi', percent: 10 }],
      },
      {
        tier: 'expert',
        effects: [
          { type: 'unit_cost_multi', percent: 15 },
          { type: 'unit_recruit_speed', amount: 1 },
        ],
      },
      {
        tier: 'master',
        effects: [
          { type: 'unit_cost_multi', percent: 20 },
          { type: 'unit_recruit_speed', amount: 2 },
        ],
      },
    ],
  },

  // ─── DEF: Defensive / Militia Skills ─────────────────────

  {
    id: HERO_SKILL_IDS.STALWART,
    name: 'Stalwart',
    category: 'defense',
    icon: '🛡️',
    attribute: HERO_ATTRIBUTES.DEF,
    required: null,
    spellbook: null,
    tiers: [
      { tier: 'novice', effects: [{ type: 'province_defense_multi', percent: 10 }] },
      { tier: 'expert', effects: [{ type: 'province_defense_multi', percent: 20 }] },
      { tier: 'master', effects: [{ type: 'province_defense_multi', percent: 30 }] },
    ],
  },

  {
    id: HERO_SKILL_IDS.CASTELLAN,
    name: 'Castellan',
    category: 'defense',
    icon: '🏯',
    attribute: HERO_ATTRIBUTES.DEF,
    required: null,
    spellbook: null,
    tiers: [
      { tier: 'novice', effects: [{ type: 'province_militia_bonus', amount: 1 }] },
      { tier: 'expert', effects: [{ type: 'province_militia_bonus', amount: 2 }] },
      { tier: 'master', effects: [{ type: 'province_militia_bonus', amount: 3 }] },
    ],
  },

  {
    id: HERO_SKILL_IDS.FIRST_AID,
    name: 'First Aid',
    category: 'defense',
    icon: '⚕️',
    attribute: HERO_ATTRIBUTES.DEF,
    required: null,
    spellbook: null,
    tiers: [
      { tier: 'novice', effects: [{ type: 'army_wound_chance', bonus: 0.05 }] },
      { tier: 'expert', effects: [{ type: 'army_wound_chance', bonus: 0.10 }] },
      { tier: 'master', effects: [{ type: 'army_wound_chance', bonus: 0.15 }] },
    ],
  },

  {
    id: HERO_SKILL_IDS.RESILIENT,
    name: 'Resilient',
    category: 'defense',
    icon: '💪',
    attribute: HERO_ATTRIBUTES.DEF,
    required: null,
    spellbook: null,
    tiers: [
      { tier: 'novice', effects: [{ type: 'hero_wound_reduction', amount: 1 }] },
      { tier: 'expert', effects: [{ type: 'hero_wound_reduction', amount: 2 }] },
      { tier: 'master', effects: [{ type: 'hero_wound_reduction', amount: 3 }] },
    ],
  },

  // ─── GOVERNANCE: Building / Income Skills ─────────────────

  {
    id: HERO_SKILL_IDS.ADMINISTRATOR,
    name: 'Administrator',
    category: 'governance',
    icon: '📜',
    attribute: HERO_ATTRIBUTES.GOVERNANCE,
    required: null,
    spellbook: null,
    tiers: [
      { tier: 'novice', effects: [{ type: 'province_income_multi', percent: 8 }] },
      { tier: 'expert', effects: [{ type: 'province_income_multi', percent: 16 }] },
      { tier: 'master', effects: [{ type: 'province_income_multi', percent: 24 }] },
    ],
  },

  {
    id: HERO_SKILL_IDS.TRADER,
    name: 'Trader',
    category: 'governance',
    icon: '💰',
    attribute: HERO_ATTRIBUTES.GOVERNANCE,
    required: null,
    spellbook: null,
    tiers: [
      { tier: 'novice', effects: [{ type: 'province_flat_gold', amount: 5 }] },
      { tier: 'expert', effects: [{ type: 'province_flat_gold', amount: 10 }] },
      { tier: 'master', effects: [{ type: 'province_flat_gold', amount: 15 }] },
    ],
  },

  {
    id: HERO_SKILL_IDS.BUILDER,
    name: 'Builder',
    category: 'governance',
    icon: '🔨',
    attribute: HERO_ATTRIBUTES.GOVERNANCE,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        effects: [{ type: 'province_build_multi', percent: 5 }],
      },
      {
        tier: 'expert',
        effects: [
          { type: 'province_build_multi', percent: 10 },
          { type: 'province_build_speed', amount: 1 },
        ],
      },
      {
        tier: 'master',
        effects: [
          { type: 'province_build_multi', percent: 20 },
          { type: 'province_build_speed', amount: 2 },
        ],
      },
    ],
  },

  // ─── KNOWLEDGE: Mana / Research / Channeling ──────────────

  {
    id: HERO_SKILL_IDS.SAGE,
    name: 'Sage',
    category: 'magic',
    icon: '📚',
    attribute: HERO_ATTRIBUTES.KNOWLEDGE,
    required: null,
    spellbook: null,
    tiers: [
      { tier: 'novice', effects: [{ type: 'province_research_multi', percent: 8 }] },
      { tier: 'expert', effects: [{ type: 'province_research_multi', percent: 16 }] },
      { tier: 'master', effects: [{ type: 'province_research_multi', percent: 24 }] },
    ],
  },

  {
    id: HERO_SKILL_IDS.MANA_MASTERY,
    name: 'Mana Mastery',
    category: 'magic',
    icon: '💧',
    attribute: HERO_ATTRIBUTES.KNOWLEDGE,
    required: null,
    spellbook: null,
    tiers: [
      { tier: 'novice', effects: [{ type: 'hero_mana_regen', amount: 1 }] },
      { tier: 'expert', effects: [{ type: 'hero_mana_regen', amount: 2 }] },
      { tier: 'master', effects: [{ type: 'hero_mana_regen', amount: 3 }] },
    ],
  },

  {
    id: HERO_SKILL_IDS.MANA_CAPACITY,
    name: 'Mana Capacity',
    category: 'magic',
    icon: '🔮',
    attribute: HERO_ATTRIBUTES.KNOWLEDGE,
    required: null,
    spellbook: null,
    tiers: [
      { tier: 'novice', effects: [{ type: 'hero_flat_mana', amount: 15 }] },
      { tier: 'expert', effects: [{ type: 'hero_flat_mana', amount: 30 }] },
      { tier: 'master', effects: [{ type: 'hero_flat_mana', amount: 45 }] },
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
      { tier: 'novice', effects: [{ type: 'hero_channeling', tier: 1 }] },
      { tier: 'expert', effects: [{ type: 'hero_channeling', tier: 2 }] },
      { tier: 'master', effects: [{ type: 'hero_channeling', tier: 3 }] },
    ],
  },

  // ─── SPELLPOWER: Magic School Skills ─────────────────────
  // Require CHANNELING. Only roll if faction has a spellbook for the school.

  {
    id: HERO_SKILL_IDS.FIRE_MAGIC,
    name: 'Fire Magic',
    category: 'magic',
    icon: '🔥',
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.FIRE,
    tiers: [
      { tier: 'novice', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 1 }] },
      { tier: 'expert', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 2 }] },
      { tier: 'master', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 3 }] },
    ],
  },
  {
    id: HERO_SKILL_IDS.EARTH_MAGIC,
    name: 'Earth Magic',
    category: 'magic',
    icon: '🪨',
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.EARTH,
    tiers: [
      { tier: 'novice', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 1 }] },
      { tier: 'expert', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 2 }] },
      { tier: 'master', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 3 }] },
    ],
  },
  {
    id: HERO_SKILL_IDS.AIR_MAGIC,
    name: 'Air Magic',
    category: 'magic',
    icon: '🌪️',
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.AIR,
    tiers: [
      { tier: 'novice', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.AIR, tier: 1 }] },
      { tier: 'expert', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.AIR, tier: 2 }] },
      { tier: 'master', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.AIR, tier: 3 }] },
    ],
  },
  {
    id: HERO_SKILL_IDS.ARCANE_MAGIC,
    name: 'Arcane Magic',
    category: 'magic',
    icon: '✨',
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.ARCANE,
    tiers: [
      { tier: 'novice', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 1 }] },
      { tier: 'expert', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 2 }] },
      { tier: 'master', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 3 }] },
    ],
  },
  {
    id: HERO_SKILL_IDS.RUNE_MAGIC,
    name: 'Rune Magic',
    category: 'magic',
    icon: '᚛',
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.RUNE,
    tiers: [
      { tier: 'novice', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 1 }] },
      { tier: 'expert', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 2 }] },
      { tier: 'master', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 3 }] },
    ],
  },
  {
    id: HERO_SKILL_IDS.DEATH_MAGIC,
    name: 'Death Magic',
    category: 'magic',
    icon: '💀',
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.DEATH,
    tiers: [
      { tier: 'novice', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 1 }] },
      { tier: 'expert', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 2 }] },
      { tier: 'master', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 3 }] },
    ],
  },
  {
    id: HERO_SKILL_IDS.NATURE_MAGIC,
    name: 'Nature Magic',
    category: 'magic',
    icon: '🌿',
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.NATURE,
    tiers: [
      { tier: 'novice', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 1 }] },
      { tier: 'expert', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 2 }] },
      { tier: 'master', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 3 }] },
    ],
  },
  {
    id: HERO_SKILL_IDS.ANCIENT_MAGIC,
    name: 'Ancient Magic',
    category: 'magic',
    icon: '🏺',
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.ANCIENT,
    tiers: [
      { tier: 'novice', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 1 }] },
      { tier: 'expert', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 2 }] },
      { tier: 'master', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 3 }] },
    ],
  },
  {
    id: HERO_SKILL_IDS.ORDER_MAGIC,
    name: 'Order Magic',
    category: 'magic',
    icon: '⚖️',
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.ORDER,
    tiers: [
      { tier: 'novice', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 1 }] },
      { tier: 'expert', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 2 }] },
      { tier: 'master', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 3 }] },
    ],
  },
  {
    id: HERO_SKILL_IDS.LIGHT_MAGIC,
    name: 'Light Magic',
    category: 'magic',
    icon: '☀️',
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
    required: HERO_SKILL_IDS.CHANNELING,
    spellbook: SPELL_SCHOOL_IDS.LIGHT,
    tiers: [
      { tier: 'novice', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 1 }] },
      { tier: 'expert', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 2 }] },
      { tier: 'master', effects: [{ type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 3 }] },
    ],
  },
];

export const HERO_SKILL_MAP = Object.fromEntries(HERO_SKILLS.map(s => [s.id, s]));

/** Converts a skill tier's effects array into a human-readable multi-line HTML string. */
export function skillEffectsToText(effects) {
  const _cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  return (effects ?? []).map(eff => {
    switch (eff.type) {
      case 'army_unit_type_multi_bonus':  return `+${eff.percent}% ${eff.unitType} ${eff.stat === 'firstStrikeChance' ? 'first strike' : eff.stat}`;
      case 'army_unit_type_bonus':        return `+${eff.flat}% ${eff.unitType} first strike`;
      case 'army_all_units_multi_bonus':  return `+${eff.percent}% all units ${eff.stat}`;
      case 'reduce_fortification_multi':  return `-${eff.percent}% enemy fortification`;
      case 'army_wound_chance':           return `+${Math.round(eff.bonus * 100)}% wound chance`;
      case 'army_logistics':              return `${Math.round(eff.chance * 100)}% chance: +1 movement/turn`;
      case 'province_income_multi':       return `+${eff.percent}% province income`;
      case 'province_flat_gold':          return `+${eff.amount} gold/turn`;
      case 'province_build_multi':        return `-${eff.percent}% build cost`;
      case 'province_build_speed':        return `-${eff.amount} build turn${eff.amount !== 1 ? 's' : ''}`;
      case 'province_defense_multi':      return `+${eff.percent}% province defense`;
      case 'province_militia_bonus':      return `+${eff.amount} militia cap`;
      case 'province_research_multi':     return `+${eff.percent}% research output`;
      case 'unit_cost_multi':             return `-${eff.percent}% recruit cost`;
      case 'unit_recruit_speed':          return `-${eff.amount} recruit turn${eff.amount !== 1 ? 's' : ''}`;
      case 'hero_mana_regen':             return `+${eff.amount} mana regen/turn`;
      case 'hero_flat_mana':              return `+${eff.amount} max mana`;
      case 'hero_channeling':             return `Cast tier ${eff.tier} spells`;
      case 'hero_spell_school':           return `${_cap(eff.schoolId)} Magic: tier ${eff.tier}`;
      case 'hero_wound_reduction':        return `-${eff.amount} wound recovery turn${eff.amount !== 1 ? 's' : ''}`;
      default:                            return null;
    }
  }).filter(Boolean).join('<br>');
}

export const TIER_ORDER = ['novice', 'expert', 'master'];

/** Returns the index (0,1,2) for a tier name, or -1 if not found */
export function tierIndex(tier) { return TIER_ORDER.indexOf(tier); }

/** Returns the next tier name or null if already at master */
export function nextTier(tier) {
  const i = TIER_ORDER.indexOf(tier);
  return i >= 0 && i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : null;
}
