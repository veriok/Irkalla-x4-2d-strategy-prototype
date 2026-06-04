/**
 * province-status-data.js
 *
 * Definitions for dynamic province status effects.
 *
 * Each definition:
 *   id          — string key used in province.statusEffects[].type
 *   icon        — emoji shown in the effects chip
 *   label       — display name (tooltip title)
 *   description — short lore/context text shown in tooltip
 *   effects     — structured effect objects applied by the engine and parsed by tooltips
 *                 Supported types:
 *                   { type: 'income_percent', resourceId: 'all'|string, percent: number }
 *                   { type: 'defense_percent', amount: number }
 *                 All amounts/percents are per-stack; engine multiplies by se.stacks ?? 1.
 *   maxStacks   — how many times this status can stack on one province (default 1)
 *   onApply     — (province, state, existingInstance) => bool
 *                 Return false = mutated in place (don't push new entry).
 *                 Return true  = push new entry using _defaults.
 *   onRemove    — (province, state) => void | null — called on natural expiry
 *   _defaults   — fields merged onto new instances on first apply
 */

// Shared stacking onApply: increments stacks on existing instance (capped at maxStacks),
// extends turnsRemaining by turnsPerStack if the status is not permanent.
function _stackOnApply(maxStacks, turnsPerStack = 0) {
  return (_province, _state, existing) => {
    if (existing) {
      existing.stacks = Math.min((existing.stacks ?? 1) + 1, maxStacks);
      if (turnsPerStack > 0 && existing.turnsRemaining !== -1) {
        existing.turnsRemaining = (existing.turnsRemaining ?? 0) + turnsPerStack;
      }
      existing._updated = true;
      return false;
    }
    return true;
  };
}

const PROVINCE_STATUSES = [
  {
    id:          'new_conquest',
    icon:        '⚠️',
    label:       'New Conquest',
    description: 'Administrative and leadership challenges of integrating a newly conquered province.',
    effects: [
      { type: 'income_percent', resourceId: 'all', percent: -50 },
    ],
    maxStacks: 1,
    onApply:  null,
    onRemove: (province) => { province.coreOf = province.ownerId; },
  },

  {
    id:          'freehold_fortification',
    icon:        '🔧',
    label:       'Iron Fortification',
    description: 'Engineering works have reinforced this province\'s defences.',
    effects: [
      { type: 'defense_percent', amount: 10 },
    ],
    maxStacks: 3,
    onApply:  _stackOnApply(3),
    onRemove: null,
    _defaults: { stacks: 1, turnsRemaining: -1 },
  },

  {
    id:          'conscript_strain',
    icon:        '📣',
    label:       'Conscription Strain',
    description: 'Forced conscription has strained the province\'s resources.',
    effects: [
      { type: 'income_percent', resourceId: 'all', percent: -20 },
    ],
    maxStacks: 3,
    onApply:  _stackOnApply(3, 5),
    onRemove: null,
    _defaults: { stacks: 1, turnsRemaining: 5 },
  },
];

export const PROVINCE_STATUS_MAP = Object.fromEntries(
  PROVINCE_STATUSES.map(s => [s.id, s])
);
