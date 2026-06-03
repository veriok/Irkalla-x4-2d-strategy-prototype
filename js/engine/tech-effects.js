/**
 * tech-effects.js
 *
 * Helpers for applying tech bonuses to unit stats at the point of use.
 * Keeps combat code faction-aware without mutating shared UNIT_MAP data.
 */

import { getFaction } from './game-state.js';
import { UNIT_TYPES } from '../data/enums.js';

/**
 * Returns effective attack and defense for a unit type, with tech bonuses applied.
 * @param {string}      typeId    — unit type id
 * @param {string|null} factionId — owning faction (null = no tech bonuses, e.g. monster den enemies)
 * @param {Object}      unitMap   — UNIT_MAP from units-data.js
 * @returns {{ attack: number, defense: number }}
 */
export function getEffectiveUnitStats(typeId, factionId, unitMap) {
  const base = unitMap[typeId];
  let attack  = base?.attack  ?? 0;
  let defense = base?.defense ?? 0;

  if (factionId) {
    const techEffects = getFaction(factionId)?.appliedTechEffects ?? [];
    for (const eff of techEffects) {
      for (const b of (eff.unitStatBonuses ?? [])) {
        const matchesId   = b.unitId   === typeId;
        const matchesType = b.unitType && (b.unitType === UNIT_TYPES.ALL || base?.unitType === b.unitType);
        if (matchesId || matchesType) {
          if (b.stat === 'attack')  attack  += b.amount;
          if (b.stat === 'defense') defense += b.amount;
        }
      }
    }
  }

  return { attack, defense };
}
