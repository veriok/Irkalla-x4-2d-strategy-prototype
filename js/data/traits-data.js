/**
 * traits-data.js
 * Shared trait catalog used by units and tooltip rendering.
 */

export const TRAITS = [
  {
    id: 'sun_priest_aura',
    name: 'Sun Priest Aura',
    description: 'Grants +1 attack to other active units in the same army.',
    effect: { type: 'army_attack_bonus', amount: 1 },
  },
];

export const TRAIT_MAP = Object.fromEntries(TRAITS.map(t => [t.id, t]));
