/**
 * army-status-data.js
 *
 * Definitions for army-scope status effects.
 * Same shape as province-status-data.js but applied to armies.
 *
 * Each definition:
 *   id              — string key used in army.statusEffects[].type
 *   label           — display name
 *   description     — tooltip text
 *   effects         — structured effect objects (scope:'army')
 *   consumedOnCombat — true = status is removed after the next combat
 *   onApply         — (army, gameState) => void | null
 *   onRemove        — (army, gameState) => void | null
 */

const ARMY_STATUSES = [
  {
    id: 'code_of_honor_stance',
    label: 'Code of Honor',
    description: 'The warriors have invoked the Dragon Code. +2 attack, -1 defense for this battle.',
    effects: [
      { scope: 'army', type: 'stat_modifier', attack: 2, defense: -1 },
    ],
    consumedOnCombat: true,   // removed after the next combat (win or lose)
    onApply: null,
    onRemove: null,
  },
  {
    id: 'airship_transit',
    label: 'Airship Transit',
    description: 'This army arrived by airship and cannot attack this turn.',
    effects: [],
    consumedOnCombat: false,
    turnsRemaining: 1,        // removed at end of turn
    onApply: null,
    onRemove: null,
  },
];

export const ARMY_STATUS_MAP = Object.fromEntries(ARMY_STATUSES.map(s => [s.id, s]));
