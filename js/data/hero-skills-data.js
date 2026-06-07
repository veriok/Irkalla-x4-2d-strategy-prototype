/**
 * hero-skills-data.js
 *
 * All hero skill definitions. Each skill has up to 3 tiers: novice, expert, master.
 *
 * Magic school skills (FIRE_MAGIC, EARTH_MAGIC, etc.) use tier to gate spell casting:
 *   novice → can cast tier 1 spells of that school
 *   expert → can cast tier 2 spells of that school
 *   master → can cast tier 3 spells of that school
 *
 * Effect shape (applied via hero-engine.js getHeroArmyBonuses / getHeroProvinceBonuses):
 *   type: 'army_unit_type_bonus'  — { unitType, stat: 'attack'|'defense', percent }
 *   type: 'army_all_units_bonus'  — { stat: 'attack'|'defense', percent }
 *   type: 'hero_stat_bonus'       — direct stat bonuses (e.g. for future use)
 *   type: 'province_income_bonus' — { percent } (all resources)
 *   type: 'hero_mana_regen'       — { amount } extra mana per turn
 *   type: 'hero_spell_school'     — { schoolId, tier } (gate for casting, no numeric bonus)
 *   type: 'army_movement_bonus'   — { amount }
 *   type: 'army_defense_percent'  — { percent } (province defense bonus for governor)
 */

import { HERO_SKILL_IDS, UNIT_TYPES, SPELL_SCHOOL_IDS } from './enums.js';

export const HERO_SKILLS = [

  // ─── Combat Skills ────────────────────────────────────────

  {
    id: HERO_SKILL_IDS.INFANTRY_LEADER,
    name: 'Infantry Leader',
    category: 'combat',
    icon: '⚔️',
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
        effect: { type: 'army_unit_type_multi_bonus', unitType: UNIT_TYPES.CAVALRY, bonuses: [{ stat: 'attack', percent: 35 }, { stat: 'defense', percent: 20 }]},
      },
    ],
  },

  {
    id: HERO_SKILL_IDS.ARCHER_LEADER,
    name: 'Archer Leader',
    category: 'combat',
    icon: '🏹',
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

  // increase wound chance by 5% per tier, so less losses! Rename field medicine?
  {
    id: HERO_SKILL_IDS.BATTLE_HARDENED,
    name: 'Battle Hardened',
    category: 'combat',
    icon: '🛡️',
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

  // Construct buff that applies to construct units (for kur-margal)
  {
    id: HERO_SKILL_IDS.ANTI_CAVALRY_SKILL,
    name: 'Anti-Cavalry',
    category: 'combat',
    icon: '⚡',
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

  // This is redundant with governor bonus, change it into province cost reduction 8/16/24%
  {
    id: HERO_SKILL_IDS.ADMINISTRATOR,
    name: 'Administrator',
    category: 'governance',
    icon: '📜',
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

  // ─── Mana Skill ───────────────────────────────────────────

  // A skill that increase offensive spell damage by 10/20/30%
  {
    id: HERO_SKILL_IDS.OFFENSIVE_SPELL_POWER,
    name: 'Offensive Spell Power',
    category: 'magic',
    icon: '🔥',
    tiers: [
      {
        tier: 'novice',
        description: '+10% offensive spell damage.',
        effect: { type: 'hero_offensive_spell_power', percent: 10 },
      },
      {
        tier: 'expert',
        description: '+20% offensive spell damage.',
        effect: { type: 'hero_offensive_spell_power', percent: 20 },
      },
      {
        tier: 'master',
        description: '+30% offensive spell damage.',
        effect: { type: 'hero_offensive_spell_power', percent: 30 },
      },
    ],
  },

  // A skill that increase boons (buffs) spellpower by 10/20/30%
  {
    id: HERO_SKILL_IDS.BOON_SPELL_POWER,
    name: 'Boon Spell Power',
    category: 'magic',
    icon: '✨',
    tiers: [
      {
        tier: 'novice',
        description: '+10% boon spell power.',
        effect: { type: 'hero_boon_spell_power', percent: 10 },
      },
      {
        tier: 'expert',
        description: '+20% boon spell power.',
        effect: { type: 'hero_boon_spell_power', percent: 20 },
      },
      {
        tier: 'master',
        description: '+30% boon spell power.',
        effect: { type: 'hero_boon_spell_power', percent: 30 },
      },
    ],
  },

  {
    id: HERO_SKILL_IDS.MANA_MASTERY,
    name: 'Mana Mastery',
    category: 'magic',
    icon: '💧',
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

  // Add skill that increase max mana by 10/20/30%
  {
    id: HERO_SKILL_IDS.MANA_CAPACITY,
    name: 'Mana Capacity',
    category: 'magic',
    icon: '🔮',
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

  // ─── Magic School Skills ──────────────────────────────────
  // These gate spell casting by tier. No numerical combat effect.

  {
    id: HERO_SKILL_IDS.FIRE_MAGIC,
    name: 'Fire Magic',
    category: 'magic',
    icon: '🔥',
    tiers: [
      { tier: 'novice', description: 'Unlocks Fire Magic tier 1 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 1 } },
      { tier: 'expert', description: 'Unlocks Fire Magic tier 2 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 2 } },
      { tier: 'master', description: 'Unlocks Fire Magic tier 3 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.EARTH_MAGIC,
    name: 'Earth Magic',
    category: 'magic',
    icon: '🪨',
    tiers: [
      { tier: 'novice', description: 'Unlocks Earth Magic tier 1 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 1 } },
      { tier: 'expert', description: 'Unlocks Earth Magic tier 2 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 2 } },
      { tier: 'master', description: 'Unlocks Earth Magic tier 3 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.AIR_MAGIC,
    name: 'Air Magic',
    category: 'magic',
    icon: '🌪️',
    tiers: [
      { tier: 'novice', description: 'Unlocks Air Magic tier 1 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.AIR, tier: 1 } },
      { tier: 'expert', description: 'Unlocks Air Magic tier 2 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.AIR, tier: 2 } },
      { tier: 'master', description: 'Unlocks Air Magic tier 3 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.AIR, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.ARCANE_MAGIC,
    name: 'Arcane Magic',
    category: 'magic',
    icon: '✨',
    tiers: [
      { tier: 'novice', description: 'Unlocks Arcane Magic tier 1 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 1 } },
      { tier: 'expert', description: 'Unlocks Arcane Magic tier 2 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 2 } },
      { tier: 'master', description: 'Unlocks Arcane Magic tier 3 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.RUNE_MAGIC,
    name: 'Rune Magic',
    category: 'magic',
    icon: '᚛',
    tiers: [
      { tier: 'novice', description: 'Unlocks Rune Magic tier 1 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 1 } },
      { tier: 'expert', description: 'Unlocks Rune Magic tier 2 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 2 } },
      { tier: 'master', description: 'Unlocks Rune Magic tier 3 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.DEATH_MAGIC,
    name: 'Death Magic',
    category: 'magic',
    icon: '💀',
    tiers: [
      { tier: 'novice', description: 'Unlocks Death Magic tier 1 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 1 } },
      { tier: 'expert', description: 'Unlocks Death Magic tier 2 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 2 } },
      { tier: 'master', description: 'Unlocks Death Magic tier 3 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.NATURE_MAGIC,
    name: 'Nature Magic',
    category: 'magic',
    icon: '🌿',
    tiers: [
      { tier: 'novice', description: 'Unlocks Nature Magic tier 1 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 1 } },
      { tier: 'expert', description: 'Unlocks Nature Magic tier 2 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 2 } },
      { tier: 'master', description: 'Unlocks Nature Magic tier 3 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.ANCIENT_MAGIC,
    name: 'Ancient Magic',
    category: 'magic',
    icon: '🏺',
    tiers: [
      { tier: 'novice', description: 'Unlocks Ancient Magic tier 1 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 1 } },
      { tier: 'expert', description: 'Unlocks Ancient Magic tier 2 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 2 } },
      { tier: 'master', description: 'Unlocks Ancient Magic tier 3 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.ORDER_MAGIC,
    name: 'Order Magic',
    category: 'magic',
    icon: '⚖️',
    tiers: [
      { tier: 'novice', description: 'Unlocks Order Magic tier 1 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 1 } },
      { tier: 'expert', description: 'Unlocks Order Magic tier 2 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 2 } },
      { tier: 'master', description: 'Unlocks Order Magic tier 3 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 3 } },
    ],
  },
  {
    id: HERO_SKILL_IDS.LIGHT_MAGIC,
    name: 'Light Magic',
    category: 'magic',
    icon: '☀️',
    tiers: [
      { tier: 'novice', description: 'Unlocks Light Magic tier 1 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 1 } },
      { tier: 'expert', description: 'Unlocks Light Magic tier 2 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 2 } },
      { tier: 'master', description: 'Unlocks Light Magic tier 3 spells.', effect: { type: 'hero_spell_school', schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 3 } },
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
