/**
 * army.js — Army factory and helpers
 */

import { UNIT_MAP } from '../data/units-data.js';
import { TRAIT_MAP } from '../data/traits-data.js';

let _nextArmyId = 1;

function _ensureHpPools(army) {
  army.hp = army.hp ?? { active: {}, wounded: {} };
  army.hp.active = army.hp.active ?? {};
  army.hp.wounded = army.hp.wounded ?? {};
}

function _maxHp(typeId, unitMap = UNIT_MAP) {
  return Math.max(1, unitMap[typeId]?.maxHp ?? 10);
}

function _arrayFor(pool, typeId) {
  pool[typeId] = pool[typeId] ?? [];
  return pool[typeId];
}

function _syncStacksFromHp(army) {
  _ensureHpPools(army);
  army.units = Object.entries(army.hp.active)
    .filter(([, arr]) => arr.length > 0)
    .map(([typeId, arr]) => ({ typeId, count: arr.length }));

  army.wounded = Object.entries(army.hp.wounded)
    .filter(([, arr]) => arr.length > 0)
    .map(([typeId, arr]) => ({ typeId, count: arr.length }));
}

function _clearEmptyHpArrays(army) {
  _ensureHpPools(army);
  for (const [typeId, arr] of Object.entries(army.hp.active)) {
    if (!arr || arr.length === 0) delete army.hp.active[typeId];
  }
  for (const [typeId, arr] of Object.entries(army.hp.wounded)) {
    if (!arr || arr.length === 0) delete army.hp.wounded[typeId];
  }
}

export function recalcArmyMoves(army, unitMap = UNIT_MAP) {
  _syncStacksFromHp(army);
  const allTypes = [...new Set([
    ...army.units.map(u => u.typeId),
    ...(army.wounded ?? []).map(u => u.typeId),
  ])];

  if (allTypes.length === 0) {
    army.maxMoves = 0;
    army.movesLeft = 0;
    return;
  }

  const minMove = allTypes.reduce((min, typeId) => {
    const unitMove = Math.max(1, unitMap[typeId]?.movement ?? 1);
    return Math.min(min, unitMove);
  }, Number.POSITIVE_INFINITY);

  const nextMax = Number.isFinite(minMove) ? minMove : 1;
  if (!Number.isFinite(army.maxMoves)) army.maxMoves = nextMax;
  if (army.maxMoves !== nextMax) {
    const wasFull = army.movesLeft >= army.maxMoves;
    army.maxMoves = nextMax;
    army.movesLeft = wasFull ? nextMax : Math.min(army.movesLeft, nextMax);
  } else {
    army.maxMoves = nextMax;
    army.movesLeft = Math.min(army.movesLeft, nextMax);
  }
}

/**
 * Create a new Army instance.
 * @param {string} factionId
 * @param {string} provinceId
 * @param {Array} units - [{ typeId: string, count: number }]
 * @returns {Object}
 */
export function createArmy(factionId, provinceId, units = []) {
  const army = {
    id: `army_${_nextArmyId++}`,
    factionId,
    provinceId,
    units: [],
    wounded: [],
    hp: { active: {}, wounded: {} },
    lastCombatTurn: null,
    movedThisTurn: false,
    attackedThisTurn: false,
    movesLeft: 1,
    maxMoves: 1,
    hasHero: false,          // placeholder for future hero system
    statusEffects: [],       // army-scope statuses (rune bonuses, code of honor, etc.)
  };

  for (const { typeId, count } of units) {
    addArmyUnits(army, typeId, count, UNIT_MAP, true);
  }

  _syncStacksFromHp(army);
  recalcArmyMoves(army, UNIT_MAP);
  army.movesLeft = army.maxMoves;
  return army;
}

export function resetMoves(army) {
  recalcArmyMoves(army, UNIT_MAP);
  army.movesLeft = army.maxMoves;
  army.movedThisTurn = false;
  army.attackedThisTurn = false;
}

export function markArmyMoved(army) {
  army.movedThisTurn = true;
}

export function markArmyAttacked(army) {
  army.attackedThisTurn = true;
}

export function addArmyUnits(army, typeId, count, unitMap = UNIT_MAP, skipRecalc = false) {
  if (!army || count <= 0) return;
  _ensureHpPools(army);
  const arr = _arrayFor(army.hp.active, typeId);
  const hp = _maxHp(typeId, unitMap);
  for (let i = 0; i < count; i++) arr.push(hp);
  _syncStacksFromHp(army);
  if (!skipRecalc) recalcArmyMoves(army, unitMap);
}

export function transferActiveUnits(fromArmy, toArmy, typeId, count, unitMap = UNIT_MAP) {
  if (!fromArmy || !toArmy || count <= 0) return false;
  _ensureHpPools(fromArmy);
  _ensureHpPools(toArmy);

  const source = _arrayFor(fromArmy.hp.active, typeId);
  if (source.length < count) return false;

  const moved = source.splice(source.length - count, count);
  const dest = _arrayFor(toArmy.hp.active, typeId);
  dest.push(...moved);

  _clearEmptyHpArrays(fromArmy);
  _clearEmptyHpArrays(toArmy);
  _syncStacksFromHp(fromArmy);
  _syncStacksFromHp(toArmy);
  recalcArmyMoves(fromArmy, unitMap);
  recalcArmyMoves(toArmy, unitMap);
  return true;
}

export function transferWoundedUnits(fromArmy, toArmy, typeId, count, unitMap = UNIT_MAP) {
  if (!fromArmy || !toArmy || count <= 0) return false;
  _ensureHpPools(fromArmy);
  _ensureHpPools(toArmy);

  const source = _arrayFor(fromArmy.hp.wounded, typeId);
  if (source.length < count) return false;

  const moved = source.splice(source.length - count, count);
  const dest = _arrayFor(toArmy.hp.wounded, typeId);
  dest.push(...moved);

  _clearEmptyHpArrays(fromArmy);
  _clearEmptyHpArrays(toArmy);
  _syncStacksFromHp(fromArmy);
  _syncStacksFromHp(toArmy);
  recalcArmyMoves(fromArmy, unitMap);
  recalcArmyMoves(toArmy, unitMap);
  return true;
}

export function armyAttackStrength(army, unitMap = UNIT_MAP) {
  _syncStacksFromHp(army);

  let base = 0;
  for (const { typeId, count } of army.units) {
    const def = unitMap[typeId];
    if (!def) continue;
    base += def.attack * count;
  }

  // Trait-based aura bonuses (e.g. Sun Priest)
  let auraBonus = 0;
  for (const { typeId, count } of army.units) {
    const uDef = unitMap[typeId];
    if (!uDef || count <= 0) continue;
    for (const traitId of (uDef.traitIds ?? [])) {
      const trait = TRAIT_MAP[traitId];
      const eff = trait?.effect;
      if (eff?.type === 'army_attack_bonus') {
        const others = Math.max(0, armySize(army) - count);
        auraBonus += others * (eff.amount ?? 0);
      }
    }
  }

  return base + auraBonus;
}

export function armyDefenseStrength(army, unitMap = UNIT_MAP) {
  _syncStacksFromHp(army);
  return army.units.reduce((sum, { typeId, count }) => {
    const def = unitMap[typeId];
    return sum + (def ? def.defense * count : 0);
  }, 0);
}

export function armySize(army) {
  _syncStacksFromHp(army);
  return army.units.reduce((s, u) => s + u.count, 0);
}

export function armyWoundedCount(army) {
  _syncStacksFromHp(army);
  return (army.wounded ?? []).reduce((s, u) => s + u.count, 0);
}

export function armyTotalCount(army) {
  return armySize(army) + armyWoundedCount(army);
}

export function hasArmyMovedOrAttacked(army) {
  return !!army?.movedThisTurn || !!army?.attackedThisTurn;
}

/**
 * Apply direct HP damage to active soldiers.
 * On lethal damage, each unit has a woundChance to move into wounded pool.
 */
export function applyArmyDamage(army, damage, unitMap = UNIT_MAP, woundChance = 0.45, currentTurn = null) {
  if (!army || damage <= 0 || armySize(army) <= 0) return { killed: 0, wounded: 0 };
  _ensureHpPools(army);

  let remaining = Math.max(0, Math.round(damage));
  let killed = 0;
  let wounded = 0;

  while (remaining > 0 && armySize(army) > 0) {
    const candidates = Object.entries(army.hp.active).filter(([, arr]) => arr.length > 0);
    if (candidates.length === 0) break;

    const total = candidates.reduce((s, [, arr]) => s + arr.length, 0);
    let pick = Math.floor(Math.random() * total);

    let chosenType = null;
    let chosenArr = null;
    for (const [typeId, arr] of candidates) {
      if (pick < arr.length) {
        chosenType = typeId;
        chosenArr = arr;
        break;
      }
      pick -= arr.length;
    }
    if (!chosenArr || !chosenType) break;

    const idx = Math.floor(Math.random() * chosenArr.length);
    const perHit = Math.min(remaining, Math.max(4, Math.round(_maxHp(chosenType, unitMap) * 0.35)));
    chosenArr[idx] -= perHit;
    remaining -= perHit;

    if (chosenArr[idx] <= 0) {
      chosenArr.splice(idx, 1);
      const becameWounded = Math.random() < woundChance;
      if (becameWounded) {
        const wPool = _arrayFor(army.hp.wounded, chosenType);
        wPool.push(Math.max(1, Math.round(_maxHp(chosenType, unitMap) * 0.15)));
        wounded++;
      } else {
        killed++;
      }
    }
  }

  _clearEmptyHpArrays(army);
  _syncStacksFromHp(army);
  recalcArmyMoves(army, unitMap);
  if (currentTurn !== null && currentTurn !== undefined) army.lastCombatTurn = currentTurn;
  return { killed, wounded };
}

/**
 * Compatibility wrapper for legacy loss-fraction callers.
 */
export function applyLosses(army, lossFraction, currentTurn) {
  const totalHp = army.units.reduce((sum, u) => {
    const hp = _maxHp(u.typeId, UNIT_MAP);
    return sum + (u.count * hp);
  }, 0);
  const damage = Math.round(totalHp * Math.max(0, Math.min(1, lossFraction)));
  applyArmyDamage(army, damage, UNIT_MAP, 0.5, currentTurn);
}

/**
 * Regenerate HP for idle armies.
 * Wounded units rejoin active pool only after reaching >=50% max HP.
 */
export function regenArmyHp(army, unitMap = UNIT_MAP, pct = 0.2) {
  if (!army) return;
  _ensureHpPools(army);

  const gainByType = new Map();

  for (const [typeId, arr] of Object.entries(army.hp.active)) {
    const maxHp = _maxHp(typeId, unitMap);
    const gain = Math.max(1, Math.round(maxHp * pct));
    for (let i = 0; i < arr.length; i++) arr[i] = Math.min(maxHp, arr[i] + gain);
  }

  for (const [typeId, arr] of Object.entries(army.hp.wounded)) {
    const maxHp = _maxHp(typeId, unitMap);
    const halfHp = Math.ceil(maxHp * 0.5);
    const gain = Math.max(1, Math.round(maxHp * pct));
    const unitDef = unitMap[typeId];
    // no_heal trait: wounded mercenaries don't recover — they are destroyed
    const hasNoHeal = (unitDef?.traitIds ?? []).some(t => t === 'no_heal');
    if (hasNoHeal) {
      army.hp.wounded[typeId] = []; // purge all wounded (they perish)
      continue;
    }
    const survivors = [];
    let promoted = 0;
    for (let i = 0; i < arr.length; i++) {
      const healed = Math.min(maxHp, arr[i] + gain);
      if (healed >= halfHp) {
        promoted++;
      } else {
        survivors.push(healed);
      }
    }
    army.hp.wounded[typeId] = survivors;
    if (promoted > 0) gainByType.set(typeId, promoted);
  }

  for (const [typeId, promoted] of gainByType.entries()) {
    const maxHp = _maxHp(typeId, unitMap);
    const active = _arrayFor(army.hp.active, typeId);
    for (let i = 0; i < promoted; i++) active.push(Math.ceil(maxHp * 0.5));
  }

  _clearEmptyHpArrays(army);
  _syncStacksFromHp(army);
  recalcArmyMoves(army, unitMap);
}

/**
 * Total upkeep for non-militia units in this army.
 */
export function armyUpkeepGold(army, unitMap = UNIT_MAP) {
  _syncStacksFromHp(army);
  let total = 0;
  for (const { typeId, count } of army.units) {
    const uDef = unitMap[typeId];
    if (!uDef || uDef.isMilitia) continue;
    total += (uDef.upkeepGold ?? 0) * count;
  }
  for (const { typeId, count } of (army.wounded ?? [])) {
    const uDef = unitMap[typeId];
    if (!uDef || uDef.isMilitia) continue;
    total += (uDef.upkeepGold ?? 0) * count;
  }
  return total;
}
