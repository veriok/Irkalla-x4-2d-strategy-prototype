/**
 * province-status-data.js
 *
 * Definitions for dynamic province status effects.
 * Same shape as techs-data.js / buildings-data.js:
 *   PROVINCE_STATUSES — named array with id fields
 *   PROVINCE_STATUS_MAP — id → definition lookup
 *
 * Each definition:
 *   id          — string key used in province.statusEffects[].type
 *   icon        — emoji shown in the effects chip
 *   label       — display name (tooltip title)
 *   description — short lore/context text shown in tooltip
 *   effects     — structured effect objects applied by the engine and parsed by tooltips
 *                 Supported types:
 *                   { type: 'income_percent', resourceId: 'all'|string, percent: number }
 *   onApply     — (province, state) => void | null — called when effect is added
 *   onRemove    — (province, state) => void | null — called on natural expiry (turnsRemaining → 0)
 *                 Province ownership is always updated BEFORE onRemove is called.
 */

const PROVINCE_STATUSES = [
  {
    id:          'new_conquest',
    icon:        '⚠️',
    label:       'New Conquest',
    description: 'Administrative and leadership challenges of integrating a newly conquered province.',
    effects: [
      { type: 'income_percent', resourceId: 'all', percent: -50 },
    ],
    onApply:  null,
    onRemove: (province) => { province.coreOf = province.ownerId; },
  },
];

export const PROVINCE_STATUS_MAP = Object.fromEntries(
  PROVINCE_STATUSES.map(s => [s.id, s])
);
