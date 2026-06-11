import { TRAIT_IDS, EFFECT_SCOPES, EFFECT_TYPES } from './enums.js';

export const TRAITS = [
  {
    id: TRAIT_IDS.SUN_PRIEST_AURA,
    name: 'Sun Priest Aura',
    description: 'Grants +1 attack to all other units in the same army.',
    effects: [{ scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.ARMY_ATTACK_BONUS, amount: 1 }],
  },
  {
    id: TRAIT_IDS.BEAST_BOND_AURA,
    name: 'Beast Bond',
    description: 'The beast\'s primal ferocity inspires nearby warriors: +1 attack to all non-monster units in this army.',
    effects: [{ scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.ARMY_ATTACK_BONUS, amount: 1 }],
  },
  {
    id: TRAIT_IDS.LEVY_BOOST_AURA,
    name: 'Drill Master',
    description: 'Levy units in this army gain +1 attack and +1 defense.',
    effects: [{ scope: EFFECT_SCOPES.ARMY, type: EFFECT_TYPES.ARMY_LEVY_STAT_BONUS, attack: 1, defense: 1 }],
  },
  {
    id: TRAIT_IDS.LEADERLESS_CONSTRUCT,
    name: 'Leaderless Construct',
    description: 'Without a commander\'s direction, the construct operates at reduced effectiveness: -2 attack and -2 defense.',
    effects: [{
      scope: EFFECT_SCOPES.UNIT,
      type: EFFECT_TYPES.STAT_MODIFIER,
      attack: -2,
      defense: -2,
      condition: 'army_no_hero',
      timing: 'combat_only',
    }],
  },
  {
    id: TRAIT_IDS.SIEGE_EXPERT,
    name: 'Siege Expert',
    description: 'Reduces the defender\'s fortification bonus by 5.',
    effects: [{ scope: EFFECT_SCOPES.UNIT, type: EFFECT_TYPES.FORTIFICATION_BONUS, amount: -5 }],
  },
  {
    id: TRAIT_IDS.NO_HEAL,
    name: 'No Retreat',
    description: 'When wounded, it is destroyed instead.',
    effects: [{ scope: EFFECT_SCOPES.UNIT, type: EFFECT_TYPES.NO_HEAL }],
  },
  {
    id: TRAIT_IDS.ANTI_CAVALRY,
    name: 'Anti-Cavalry',
    description: 'Gains +3 attack when fighting cavalry in combat.',
    effects: [{ scope: EFFECT_SCOPES.UNIT, type: EFFECT_TYPES.ANTI_CAVALRY_BONUS, attackBonus: 3 }],
  },
  {
    id: TRAIT_IDS.FIRST_STRIKE,
    name: 'First Strike',
    description: 'May fire a volley before combat begins.',
    effects: [{ scope: EFFECT_SCOPES.UNIT, type: EFFECT_TYPES.FIRST_STRIKE }],
  },
  {
    id: TRAIT_IDS.SHIELD,
    name: 'Shield Wall',
    description: '+3 defense during the first-strike combat round.',
    effects: [{ scope: EFFECT_SCOPES.UNIT, type: EFFECT_TYPES.SHIELD_FIRST_STRIKE, defenseBonus: 3 }],
  },
];

export const TRAIT_MAP = Object.fromEntries(TRAITS.map(t => [t.id, t]));
