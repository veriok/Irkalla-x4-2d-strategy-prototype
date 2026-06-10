/**
 * spawn-units.js
 *
 * Helper for placing one or more units into the best available army.
 *
 * Priority order:
 *   1. preferredArmy (e.g. the casting hero's army)
 *   2. Other faction armies already in the province, in discovery order
 *   3. A newly created army (only when all existing armies are full)
 *
 * Each unit is evaluated independently so N units may be distributed across
 * multiple armies (or overflow armies) rather than all going to one.
 */

import { addArmyUnits, armyTotalCount, createArmy } from '../models/army.js';
import { getArmiesInProvince, getArmySupplyCap, placeArmy } from './game-state.js';

/**
 * Spawn `count` units of `typeId` into the best available armies.
 *
 * @param {string}      typeId        — unit type to add
 * @param {number}      count         — how many units to place
 * @param {string}      factionId
 * @param {string}      provinceId
 * @param {Object|null} preferredArmy — army to fill first (e.g. hero's army); may be null
 */
export function spawnUnitsIntoArmies(typeId, count, factionId, provinceId, preferredArmy = null) {
  if (count <= 0) return;

  const cap = getArmySupplyCap(factionId);

  // Build ordered candidate list: preferred → others in province
  const inProvince = getArmiesInProvince(provinceId).filter(a => a.factionId === factionId);
  const candidates = preferredArmy
    ? [preferredArmy, ...inProvince.filter(a => a.id !== preferredArmy.id)]
    : [...inProvince];

  for (let i = 0; i < count; i++) {
    // Re-query armyTotalCount each iteration — previous placements may have filled a slot
    const target = candidates.find(a => armyTotalCount(a) < cap);
    if (target) {
      addArmyUnits(target, typeId, 1);
    } else {
      const newArmy = createArmy(factionId, provinceId, []);
      placeArmy(newArmy);
      addArmyUnits(newArmy, typeId, 1);
      candidates.push(newArmy);
    }
  }
}
