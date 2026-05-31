/**
 * army.js — Army factory and helpers
 */

let _nextArmyId = 1;

/**
 * Create a new Army instance.
 * @param {string} factionId
 * @param {string} provinceId  - province where the army is located
 * @param {Array}  units       - [{ typeId: string, count: number }]
 * @returns {Object} army
 */
export function createArmy(factionId, provinceId, units = []) {
  return {
    id:         `army_${_nextArmyId++}`,
    factionId,
    provinceId,
    units:      units.map(u => ({ ...u })),
    movesLeft:  1,
    maxMoves:   1,
  };
}

/**
 * Reset army moves (called at start of each faction turn).
 * @param {Object} army
 */
export function resetMoves(army) {
  army.movesLeft = army.maxMoves;
}

/**
 * Total attack strength of an army (used by combat.js).
 * @param {Object} army
 * @param {Object} unitMap  UNIT_MAP from units-data.js
 * @returns {number}
 */
export function armyAttackStrength(army, unitMap) {
  let base = army.units.reduce((sum, { typeId, count }) => {
    const def = unitMap[typeId];
    return sum + (def ? def.attack * count : 0);
  }, 0);

  // Sun Priest special effect: +2 attack to all units in same army
  const hasSunPriest = army.units.some(u => u.typeId === 'lizard_sun_priest');
  if (hasSunPriest) {
    const otherCount = army.units
      .filter(u => u.typeId !== 'lizard_sun_priest')
      .reduce((s, u) => s + u.count, 0);
    base += otherCount * 2;
  }

  return base;
}

/**
 * Total defense strength of an army.
 * @param {Object} army
 * @param {Object} unitMap
 * @returns {number}
 */
export function armyDefenseStrength(army, unitMap) {
  return army.units.reduce((sum, { typeId, count }) => {
    const def = unitMap[typeId];
    return sum + (def ? def.defense * count : 0);
  }, 0);
}

/**
 * Total unit count in an army.
 * @param {Object} army
 * @returns {number}
 */
export function armySize(army) {
  return army.units.reduce((s, u) => s + u.count, 0);
}

/**
 * Apply proportional casualties to an army (removes units when count ≤ 0).
 * @param {Object} army
 * @param {number} lossFraction  - 0..1 fraction of total units to lose
 */
export function applyLosses(army, lossFraction) {
  const totalBefore = armySize(army);
  const toRemove = Math.round(totalBefore * lossFraction);
  let remaining = toRemove;

  // Remove proportionally from each stack
  for (const stack of army.units) {
    const remove = Math.min(stack.count, Math.round(stack.count * lossFraction));
    stack.count -= remove;
    remaining -= remove;
  }

  // Clean up empty stacks
  army.units = army.units.filter(u => u.count > 0);
}
