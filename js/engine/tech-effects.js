/**
 * tech-effects.js
 *
 * Helpers for applying tech bonuses to unit stats at the point of use.
 * Keeps combat code faction-aware without mutating shared UNIT_MAP data.
 */

import { getFaction } from './game-state.js';
import { UNIT_TYPES } from '../data/enums.js';
import { TRAIT_MAP } from '../data/traits-data.js';

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

/**
 * Total effective attack for an army — includes tech bonuses and trait aura bonuses.
 * @param {Object} army
 * @param {string|null} factionId
 * @param {Object} unitMap
 * @returns {number}
 */
export function getEffectiveArmyAttack(army, factionId, unitMap) {
  const units = army.units ?? [];
  let total = 0;
  for (const { typeId, count } of units) {
    const { attack } = getEffectiveUnitStats(typeId, factionId, unitMap);
    total += attack * count;
  }

  // Trait aura bonuses (e.g. Sun Priest grants +atk to all other units)
  const armyTotal = units.reduce((s, u) => s + u.count, 0);
  for (const { typeId, count } of units) {
    const uDef = unitMap[typeId];
    if (!uDef || count <= 0) continue;
    for (const traitId of (uDef.traitIds ?? [])) {
      const trait = TRAIT_MAP[traitId];
      const eff = trait?.effect;
      if (eff?.type === 'army_attack_bonus') {
        const others = Math.max(0, armyTotal - count);
        total += others * (eff.amount ?? 0);
      }
    }
  }

  return total;
}

/**
 * Total effective defense for an army — includes tech bonuses.
 * @param {Object} army
 * @param {string|null} factionId
 * @param {Object} unitMap
 * @returns {number}
 */
export function getEffectiveArmyDefense(army, factionId, unitMap) {
  const units = army.units ?? [];
  let total = 0;
  for (const { typeId, count } of units) {
    const { defense } = getEffectiveUnitStats(typeId, factionId, unitMap);
    total += defense * count;
  }
  return total;
}
