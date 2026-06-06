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

export const TRAITS = [
  {
    id: 'sun_priest_aura',
    name: 'Sun Priest Aura',
    description: 'Grants +1 attack to all other units in the same army.',
    effect: { scope: 'army', type: 'army_attack_bonus', amount: 1 },
  },
  {
    id: 'beast_bond_aura',
    name: 'Beast Bond',
    description: 'The beast\'s primal ferocity inspires nearby warriors: +1 attack to all non-monster units in this army.',
    effect: { scope: 'army', type: 'army_attack_bonus', amount: 1 },
  },
  {
    id: 'levy_boost_aura',
    name: 'Drill Master',
    description: 'Drills levy troops: levy units in this army gain +1 attack and +1 defense.',
    effect: { scope: 'army', type: 'army_levy_stat_bonus', attack: 1, defense: 1 },
  },
  {
    id: 'leaderless_construct',
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
    id: 'siege_expert',
    name: 'Siege Expert',
    description: 'Specialised in dismantling fortifications. Each Siege Engineer reduces the defender\'s fortification bonus by 10% (min 0%).',
    effect: { scope: 'army', type: 'reduce_defender_fortification', percentPerUnit: 10 },
  },
  {
    id: 'no_heal',
    name: 'No Retreat',
    description: 'This mercenary unit does not recover from wounds — when wounded, it is destroyed instead.',
    effect: { scope: 'army', type: 'no_heal' },
  },
  {
    id: 'anti_cavalry',
    name: 'Anti-Cavalry',
    description: 'Trained to counter mounted units. Gains +3 attack when fighting cavalry in combat.',
    effect: { scope: 'army', type: 'anti_cavalry_bonus', attackBonus: 3 },
  },
];

export const TRAIT_MAP = Object.fromEntries(TRAITS.map(t => [t.id, t]));
