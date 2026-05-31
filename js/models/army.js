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
    id:             `army_${_nextArmyId++}`,
    factionId,
    provinceId,
    units:          units.map(u => ({ ...u })),
    wounded:        [],   // [{ typeId, count }] — injured units that can replenish
    lastCombatTurn: null, // turn number of last combat (null = never fought)
    movesLeft:      1,
    maxMoves:       1,
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
 * Total healthy unit count in an army (excludes wounded).
 * @param {Object} army
 * @returns {number}
 */
export function armySize(army) {
  return army.units.reduce((s, u) => s + u.count, 0);
}

/**
 * Total wounded unit count in an army.
 * @param {Object} army
 * @returns {number}
 */
export function armyWoundedCount(army) {
  return (army.wounded ?? []).reduce((s, u) => s + u.count, 0);
}

/**
 * Total capacity used (healthy + wounded).
 * @param {Object} army
 * @returns {number}
 */
export function armyTotalCount(army) {
  return armySize(army) + armyWoundedCount(army);
}

/**
 * Apply proportional casualties to an army.
 * ~50% of losses go to wounded (can recover), ~50% are killed outright.
 * @param {Object} army
 * @param {number} lossFraction  - 0..1 fraction of healthy units to lose
 * @param {number} currentTurn
 */
export function applyLosses(army, lossFraction, currentTurn) {
  const toRemove = Math.round(armySize(army) * lossFraction);
  let remaining = toRemove;

  army.wounded = army.wounded ?? [];

  // Remove proportionally from each stack; half go to wounded
  for (const stack of army.units) {
    if (remaining <= 0) break;
    const remove = Math.min(stack.count, Math.round(stack.count * lossFraction));
    const wounded = Math.round(remove * 0.5);
    const killed  = remove - wounded;

    stack.count -= remove;
    remaining   -= remove;

    if (wounded > 0) {
      const wStack = army.wounded.find(w => w.typeId === stack.typeId);
      if (wStack) wStack.count += wounded;
      else army.wounded.push({ typeId: stack.typeId, count: wounded });
    }
    // killed units are simply removed (stack.count already reduced)
    void killed;
  }

  // Clean up empty stacks
  army.units = army.units.filter(u => u.count > 0);

  // Record combat turn for replenishment cooldown
  if (currentTurn !== undefined) army.lastCombatTurn = currentTurn;
}
