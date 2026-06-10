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
 *
 * Army effects (getHeroArmyBonuses / _applySkillEffect):
 *   army_unit_type_bonus         — { unitType, stat: 'attack'|'defense', percent }
 *   army_unit_type_multi_bonus   — { unitType, bonuses: [{stat, percent}…] }
 *   army_anti_unit_type_bonus    — { targetUnitType, stat, percent }
 *   army_all_units_multi_bonus   — { bonuses: [{stat, percent}…] }
 *   reduce_fortification         — { percent }
 *   army_wound_chance            — { bonus } (decimal, e.g. 0.05 = +5% wound-instead-of-kill chance)
 *
 * Province effects (getHeroProvinceBonuses — governor only):
 *   province_income_bonus        — { percent }
 *   province_flat_gold           — { amount }
 *   province_build_discount      — { discountPercent, speedBonus }
 *   province_build_speed         — { amount }  (legacy; speed-only, no discount)
 *   province_defense_bonus       — { percent }
 *   province_militia_bonus       — { amount }
 *   province_research_bonus      — { percent }
 *   unit_cost_discount           — { percent }
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
    attribute: HERO_ATTRIBUTES.ATK,
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
    attribute: HERO_ATTRIBUTES.ATK,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '+10% archer attack. Archers gain +5% first strike chance.',
        effects: [
          { type: 'army_unit_type_bonus', unitType: UNIT_TYPES.ARCHER, stat: 'attack', percent: 10 },
          { type: 'army_unit_type_bonus', unitType: UNIT_TYPES.ARCHER, stat: 'firstStrikeChance', flat: 5 },
        ],
      },
      {
        tier: 'expert',
        description: '+15% archer attack, +10% archer defense. Archers gain +10% first strike chance.',
        effects: [
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.ARCHER, bonuses: [{ stat: 'attack', percent: 15 }, { stat: 'defense', percent: 10 }] },
          { type: 'army_unit_type_bonus', unitType: UNIT_TYPES.ARCHER, stat: 'firstStrikeChance', flat: 10 },
        ],
      },
      {
        tier: 'master',
        description: '+25% archer attack, +15% archer defense. Archers gain +15% first strike chance.',
        effects: [
          { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.ARCHER, bonuses: [{ stat: 'attack', percent: 25 }, { stat: 'defense', percent: 15 }] },
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
        description: '+10% construct attack.',
        effect: { type: 'army_unit_type_bonus', unitType: UNIT_TYPES.CONSTRUCT, stat: 'attack', percent: 10 },
      },
      {
        tier: 'expert',
        description: '+15% construct attack, +10% construct defense.',
        effect: { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CONSTRUCT, bonuses: [{ stat: 'attack', percent: 15 }, { stat: 'defense', percent: 10 }] },
      },
      {
        tier: 'master',
        description: '+25% construct attack, +15% construct defense.',
        effect: { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CONSTRUCT, bonuses: [{ stat: 'attack', percent: 25 }, { stat: 'defense', percent: 15 }] },
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
    id: HERO_SKILL_IDS.LOGISTICS,
    name: 'Logistics',
    category: 'combat',
    icon: '🗺️',
    attribute: HERO_ATTRIBUTES.TACTICS,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '25% chance to gain +1 movement at the start of each turn.',
        effect: { type: 'army_logistics', chance: 0.25 },
      },
      {
        tier: 'expert',
        description: '50% chance to gain +1 movement at the start of each turn.',
        effect: { type: 'army_logistics', chance: 0.50 },
      },
      {
        tier: 'master',
        description: '75% chance to gain +1 movement at the start of each turn.',
        effect: { type: 'army_logistics', chance: 0.75 },
      },
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
        description: '-10% unit recruit cost in governed province.',
        effect: { type: 'unit_cost_discount', percent: 10 },
      },
      {
        tier: 'expert',
        description: '-15% unit recruit cost and -1 recruit turn in governed province.',
        effect: { type: 'unit_cost_discount', percent: 15, recruitSpeedBonus: 1 },
      },
      {
        tier: 'master',
        description: '-20% unit recruit cost and -2 recruit turns in governed province.',
        effect: { type: 'unit_cost_discount', percent: 20, recruitSpeedBonus: 2 },
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
      {
        tier: 'novice',
        description: '+10% province defense bonus when governing.',
        effect: { type: 'province_defense_bonus', percent: 10 },
      },
      {
        tier: 'expert',
        description: '+20% province defense bonus when governing.',
        effect: { type: 'province_defense_bonus', percent: 20 },
      },
      {
        tier: 'master',
        description: '+30% province defense bonus when governing.',
        effect: { type: 'province_defense_bonus', percent: 30 },
      },
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
      {
        tier: 'novice',
        description: '+1 militia cap in governed province.',
        effect: { type: 'province_militia_bonus', amount: 1 },
      },
      {
        tier: 'expert',
        description: '+2 militia cap in governed province.',
        effect: { type: 'province_militia_bonus', amount: 2 },
      },
      {
        tier: 'master',
        description: '+3 militia cap in governed province.',
        effect: { type: 'province_militia_bonus', amount: 3 },
      },
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
      {
        tier: 'novice',
        description: '+5% chance for army units to be wounded instead of killed.',
        effect: { type: 'army_wound_chance', bonus: 0.05 },
      },
      {
        tier: 'expert',
        description: '+10% chance for army units to be wounded instead of killed.',
        effect: { type: 'army_wound_chance', bonus: 0.10 },
      },
      {
        tier: 'master',
        description: '+15% chance for army units to be wounded instead of killed.',
        effect: { type: 'army_wound_chance', bonus: 0.15 },
      },
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
      {
        tier: 'novice',
        description: 'Reduce wound recovery time by 1 turn (min 1).',
        effect: { type: 'hero_wound_reduction', amount: 1 },
      },
      {
        tier: 'expert',
        description: 'Reduce wound recovery time by 2 turns (min 1).',
        effect: { type: 'hero_wound_reduction', amount: 2 },
      },
      {
        tier: 'master',
        description: 'Reduce wound recovery time by 3 turns (min 1).',
        effect: { type: 'hero_wound_reduction', amount: 3 },
      },
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
      {
        tier: 'novice',
        description: '+8% income to governed province.',
        effect: { type: 'province_income_bonus', percent: 8 },
      },
      {
        tier: 'expert',
        description: '+16% income to governed province.',
        effect: { type: 'province_income_bonus', percent: 16 },
      },
      {
        tier: 'master',
        description: '+24% income to governed province.',
        effect: { type: 'province_income_bonus', percent: 24 },
      },
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
    attribute: HERO_ATTRIBUTES.GOVERNANCE,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '-5% building cost in governed province.',
        effect: { type: 'province_build_discount', discountPercent: 5, speedBonus: 0 },
      },
      {
        tier: 'expert',
        description: '-10% building cost and -1 build turn in governed province.',
        effect: { type: 'province_build_discount', discountPercent: 10, speedBonus: 1 },
      },
      {
        tier: 'master',
        description: '-20% building cost and -2 build turns in governed province.',
        effect: { type: 'province_build_discount', discountPercent: 20, speedBonus: 2 },
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
      {
        tier: 'novice',
        description: '+8% research output in governed province.',
        effect: { type: 'province_research_bonus', percent: 8 },
      },
      {
        tier: 'expert',
        description: '+16% research output in governed province.',
        effect: { type: 'province_research_bonus', percent: 16 },
      },
      {
        tier: 'master',
        description: '+24% research output in governed province.',
        effect: { type: 'province_research_bonus', percent: 24 },
      },
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
    attribute: HERO_ATTRIBUTES.KNOWLEDGE,
    required: null,
    spellbook: null,
    tiers: [
      {
        tier: 'novice',
        description: '+15 maximum mana.',
        effect: { type: 'hero_flat_mana', amount: 15 },
      },
      {
        tier: 'expert',
        description: '+30 maximum mana.',
        effect: { type: 'hero_flat_mana', amount: 30 },
      },
      {
        tier: 'master',
        description: '+45 maximum mana.',
        effect: { type: 'hero_flat_mana', amount: 45 },
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
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
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
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
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
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
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
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
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
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
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
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
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
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
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
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
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
    attribute: HERO_ATTRIBUTES.SPELLPOWER,
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
