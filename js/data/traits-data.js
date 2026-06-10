/**
 * traits-data.js
 * Shared trait catalog used by units.
 *
 * effect shape mirrors province-status-data.js effects:
 *   { scope, type, ...params }
 *
 * Special effect types:
 *   army_attack_bonus         — grants +amount atk to ALL OTHER units in same army
 *   army_levy_attack_bonus    — grants +amount atk/def to levy units in same army
 *   stat_modifier             — modifies own unit stats (supports condition + timing fields)
 *   reduce_defender_fortification — percentPerUnit reduction to defender fort/terrain bonus
 *   no_heal                   — wounded unit is destroyed instead of recovering
 */

import { TRAIT_IDS } from './enums.js';

export const TRAITS = [
  {
    id: TRAIT_IDS.SUN_PRIEST_AURA,
    name: 'Sun Priest Aura',
    description: 'Grants +1 attack to all other units in the same army.',
    effect: { scope: 'army', type: 'army_attack_bonus', amount: 1 },
  },
  {
    id: TRAIT_IDS.BEAST_BOND_AURA,
    name: 'Beast Bond',
    description: 'The beast\'s primal ferocity inspires nearby warriors: +1 attack to all non-monster units in this army.',
    effect: { scope: 'army', type: 'army_attack_bonus', amount: 1 },
  },
  {
    id: TRAIT_IDS.LEVY_BOOST_AURA,
    name: 'Drill Master',
    description: 'Drills levy troops: levy units in this army gain +1 attack and +1 defense.',
    effect: { scope: 'army', type: 'army_levy_stat_bonus', attack: 1, defense: 1 },
  },
  {
    id: TRAIT_IDS.LEADERLESS_CONSTRUCT,
    name: 'Leaderless Construct',
    description: 'Without a commander\'s direction, the construct operates at reduced effectiveness: -2 attack and -2 defense.',
    effect: {
      scope: 'army',
      type: 'stat_modifier',
      attack: -2,
      defense: -2,
      condition: 'army_no_hero',
      timing: 'combat_only',
    },
  },
  {
    id: TRAIT_IDS.SIEGE_EXPERT,
    name: 'Siege Expert',
    description: 'Reduces the defender\'s fortification bonus by 10% (min 0%).',
    effect: { scope: 'army', type: 'reduce_defender_fortification', percentPerUnit: 10 },
  },
  {
    id: TRAIT_IDS.NO_HEAL,
    name: 'No Retreat',
    description: 'When wounded, it is destroyed instead.',
    effect: { scope: 'army', type: 'no_heal' },
  },
  {
    id: TRAIT_IDS.ANTI_CAVALRY,
    name: 'Anti-Cavalry',
    description: 'Gains +3 attack when fighting cavalry in combat.',
    effect: { scope: 'army', type: 'anti_cavalry_bonus', attackBonus: 3 },
  },
  {
    id: TRAIT_IDS.FIRST_STRIKE,
    name: 'First Strike',
    description: 'May fire a volley before combat begins.',
    effect: { scope: 'army', type: 'first_strike' },
  },
];

export const TRAIT_MAP = Object.fromEntries(TRAITS.map(t => [t.id, t]));
