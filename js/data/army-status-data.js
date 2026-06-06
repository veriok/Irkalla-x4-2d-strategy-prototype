/**
 * army-status-data.js
 *
 * Definitions for army-scope status effects.
 * Same shape as province-status-data.js but applied to armies.
 *
 * Each definition:
 *   id              — string key used in army.statusEffects[].type
 *   label           — display name
 *   icon            — emoji shown on the army card status chip
 *   description     — tooltip text
 *   effects         — structured effect objects (scope:'army')
 *   movementBonus   — flat bonus added to army maxMoves each turn (applied in recalcArmyMoves)
 *   onApply         — (army, gameState) => void | null
 *   onRemove        — (army, gameState) => void | null
 */

const ARMY_STATUSES = [
  {
    id: 'code_of_honor_stance',
    label: 'Code of Honor',
    icon: '⚔️',
    description: 'The warriors have invoked the Dragon Code. +3 attack, -2 defense until next turn.',
    effects: [
      { scope: 'army', type: 'stat_modifier', attack: 3, defense: -2 },
    ],
    turnsRemaining: 1,
    onApply: null,
    onRemove: null,
  },
  {
    id: 'airship_transit',
    label: 'Airship Transit',
    icon: '🚀',
    description: 'This army arrived by airship and cannot attack this turn.',
    effects: [],
    turnsRemaining: 1,
    onApply: null,
    onRemove: null,
  },
  {
    id: 'roads_movement',
    label: 'Road Network',
    icon: '🛣️',
    description: '+1 movement this turn from the provincial road network.',
    effects: [],
    movementBonus: 1,
    onApply: null,
    onRemove: null,
  },
];

export const ARMY_STATUS_MAP = Object.fromEntries(ARMY_STATUSES.map(s => [s.id, s]));
