/**
 * combat.js
 * Simultaneous round-based combat resolution.
 */

import {
  state,
  getArmy,
  getProvince,
  captureProvince,
  moveArmy,
  removeArmy,
  addResources,
  getArmiesInProvince,
  getArmySupplyCap,
  addCombatReport,
  rollTreasure,
} from './game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { UNIT_MAP, getMilitiaUnitIdForFaction } from '../data/units-data.js';
import { BUILDING_MAP } from '../data/buildings-data.js';
import { getBiome } from '../data/biomes-data.js';
import {
  armyAttackStrength,
  armyDefenseStrength,
  armySize,
  armyWoundedCount,
  markArmyAttacked,
  transferActiveUnits,
  transferWoundedUnits,
  recalcArmyMoves,
} from '../models/army.js';
import { getLocationDefenseBonus } from '../models/location.js';
import { flashCombat, flashConquest } from '../ui/map-view.js';
import { logCapture, logMessage } from '../ui/event-log.js';
import { getEffectiveUnitStats } from './tech-effects.js';
import { playerCanSee } from './game-state.js';
import { MONSTER_UNITS, BIOME_DEN_ENCOUNTER } from '../data/monsters-data.js';

const WOUND_CHANCE = 0.45;

function _d6() { return Math.floor(Math.random() * 6) + 1; }
function _d8() { return Math.floor(Math.random() * 8) + 1; }
function _clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function _pickBestDefenderArmy(defArmies) {
  if (!defArmies || defArmies.length === 0) return null;
  return [...defArmies].sort((a, b) => {
    const byDef = armyDefenseStrength(b, UNIT_MAP) - armyDefenseStrength(a, UNIT_MAP);
    if (byDef !== 0) return byDef;
    return armySize(b) - armySize(a);
  })[0];
}

function _militiaPoolForProvince(province) {
  const count = Math.max(0, province.militia?.current ?? 0);
  const unitId = getMilitiaUnitIdForFaction(province.ownerId ?? 'neutral');
  const unitDef = UNIT_MAP[unitId] ?? UNIT_MAP.militia_neutral;
  const hp = Math.max(1, unitDef?.maxHp ?? 5);
  return {
    unitId,
    unitDef,
    hp: Array.from({ length: count }, () => hp),
  };
}

function _militiaCount(pool) {
  return pool?.hp?.length ?? 0;
}

function _militiaDefense(pool) {
  const n = _militiaCount(pool);
  if (n <= 0 || !pool?.unitDef) return 0;
  return n * (pool.unitDef.defense ?? 0);
}

function _ensureHpPools(army) {
  army.hp = army.hp ?? { active: {}, wounded: {} };
  army.hp.active = army.hp.active ?? {};
  army.hp.wounded = army.hp.wounded ?? {};
}

function _planDefenderBorrow(primaryArmy, allDefArmies, unitMap, supplyCap) {
  const slotsLeft = Math.max(0, supplyCap - (armySize(primaryArmy) + armyWoundedCount(primaryArmy)));
  if (slotsLeft <= 0) return [];

  const candidates = [];
  for (const donor of allDefArmies) {
    if (donor.id === primaryArmy.id) continue;
    for (const stack of donor.units) {
      const unit = unitMap[stack.typeId];
      if (!unit || stack.count <= 0) continue;
      candidates.push({
        fromArmyId: donor.id,
        typeId: stack.typeId,
        available: stack.count,
        unitDefense: unit.defense,
      });
    }
  }

  candidates.sort((a, b) => b.unitDefense - a.unitDefense);

  const plan = [];
  let need = slotsLeft;
  for (const c of candidates) {
    if (need <= 0) break;
    const take = Math.min(c.available, need);
    plan.push({ fromArmyId: c.fromArmyId, typeId: c.typeId, count: take, moved: 0 });
    need -= take;
  }
  return plan;
}

function _applyBorrowedUnits(leadArmy, plan) {
  if (!leadArmy) return;
  for (const b of plan) {
    const donor = getArmy(b.fromArmyId);
    if (!donor) continue;
    const ok = transferActiveUnits(donor, leadArmy, b.typeId, b.count, UNIT_MAP);
    if (ok) b.moved = b.count;
  }
}

function _returnBorrowedUnits(leadArmy, plan) {
  if (!leadArmy) return;
  for (const b of plan) {
    if (!b.moved || b.moved <= 0) continue;
    const donor = getArmy(b.fromArmyId);
    if (!donor) continue;

    let remainingToReturn = b.moved;
    const availableActive = leadArmy.units.find(u => u.typeId === b.typeId)?.count ?? 0;
    if (availableActive > 0) {
      const giveBackActive = Math.min(availableActive, remainingToReturn);
      transferActiveUnits(leadArmy, donor, b.typeId, giveBackActive, UNIT_MAP);
      remainingToReturn -= giveBackActive;
    }

    if (remainingToReturn <= 0) continue;

    const availableWounded = leadArmy.wounded.find(u => u.typeId === b.typeId)?.count ?? 0;
    if (availableWounded <= 0) continue;

    const giveBackWounded = Math.min(availableWounded, remainingToReturn);
    transferWoundedUnits(leadArmy, donor, b.typeId, giveBackWounded, UNIT_MAP);
  }
}

function _estimateBorrowedStrengthBonus(primaryArmy, allDefArmies, unitMap, supplyCap) {
  if (!primaryArmy || !allDefArmies || allDefArmies.length <= 1) return 0;
  const plan = _planDefenderBorrow(primaryArmy, allDefArmies, unitMap, supplyCap);
  let bonus = 0;
  for (const b of plan) {
    const uDef = unitMap[b.typeId];
    if (!uDef || b.count <= 0) continue;
    bonus += b.count * ((uDef.attack ?? 0) + (uDef.defense ?? 0));
  }
  return bonus;
}

function _collectArmyUnits(army, factionId = null) {
  if (!army) return [];
  _ensureHpPools(army);
  const out = [];
  for (const [typeId, arr] of Object.entries(army.hp.active)) {
    const def = UNIT_MAP[typeId];
    if (!def) continue;
    const { attack, defense } = getEffectiveUnitStats(typeId, factionId, UNIT_MAP);
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] <= 0) continue;
      out.push({
        key: `a:${typeId}:${i}`,
        pool: 'army',
        typeId,
        hp: arr[i],
        maxHp: Math.max(1, def.maxHp ?? 10),
        attack,
        defense,
      });
    }
  }
  return out;
}

function _collectMilitiaUnits(pool) {
  const out = [];
  if (!pool || !pool.unitDef) return out;
  for (let i = 0; i < (pool.hp?.length ?? 0); i++) {
    const hp = pool.hp[i];
    if (hp <= 0) continue;
    out.push({
      key: `m:${i}`,
      pool: 'militia',
      typeId: pool.unitId,
      hp,
      maxHp: Math.max(1, pool.unitDef.maxHp ?? 5),
      attack: pool.unitDef.attack ?? 0,
      defense: pool.unitDef.defense ?? 0,
    });
  }
  return out;
}

function _effectiveAttack(unit, includeRoll = true) {
  const lowHp = unit.hp < Math.ceil(unit.maxHp * 0.5);
  const mult = lowHp ? 0.66 : 1;
  const base = (unit.attack ?? 0) * mult;
  return includeRoll ? (base + _d8()) : base;
}

function _damageAgainst(attacker, target, targetIsDefender, defenderFlatBonus, includeRandom) {
  const atk = _effectiveAttack(attacker, includeRandom);
  const targetDef = (target.defense ?? 0) + (targetIsDefender ? defenderFlatBonus : 0);
  return Math.max(1, Math.round(atk - targetDef));
}

function _pickTarget(attacker, enemies, bestChance, targetIsDefender, defenderFlatBonus) {
  if (!enemies || enemies.length === 0) return null;
  const pickBest = Math.random() < bestChance;
  if (!pickBest) return enemies[Math.floor(Math.random() * enemies.length)];

  const sorted = [...enemies].sort((a, b) => {
    const da = _damageAgainst(attacker, a, targetIsDefender, defenderFlatBonus, false);
    const db = _damageAgainst(attacker, b, targetIsDefender, defenderFlatBonus, false);
    return db - da;
  });
  return sorted[0] ?? enemies[Math.floor(Math.random() * enemies.length)];
}

function _applyBatchDamageToArmy(army, damageMap, woundChance = WOUND_CHANCE) {
  if (!army) return { destroyed: 0, wounded: 0, hpLost: 0 };
  _ensureHpPools(army);

  let destroyed = 0;
  let wounded = 0;
  let hpLost = 0;

  const grouped = new Map();
  for (const [key, damage] of damageMap.entries()) {
    if (!key.startsWith('a:')) continue;
    const [, typeId, idxStr] = key.split(':');
    const idx = Number(idxStr);
    if (!grouped.has(typeId)) grouped.set(typeId, []);
    grouped.get(typeId).push({ idx, damage: Math.max(0, Math.round(damage)) });
  }

  for (const [typeId, hits] of grouped.entries()) {
    const arr = army.hp.active[typeId] ?? [];
    const maxHp = Math.max(1, UNIT_MAP[typeId]?.maxHp ?? 10);
    hits.sort((a, b) => b.idx - a.idx);
    for (const hit of hits) {
      if (hit.idx < 0 || hit.idx >= arr.length) continue;
      const before = arr[hit.idx];
      const after = before - hit.damage;
      hpLost += Math.max(0, Math.min(before, hit.damage));
      if (after <= 0) {
        arr.splice(hit.idx, 1);
        destroyed++;
        if (Math.random() < woundChance) {
          army.hp.wounded[typeId] = army.hp.wounded[typeId] ?? [];
          army.hp.wounded[typeId].push(Math.max(1, Math.round(maxHp * 0.15)));
          wounded++;
        }
      } else {
        arr[hit.idx] = after;
      }
    }

    if (arr.length === 0) delete army.hp.active[typeId];
  }

  for (const [typeId, arr] of Object.entries(army.hp.wounded)) {
    if (!arr || arr.length === 0) delete army.hp.wounded[typeId];
  }

  recalcArmyMoves(army, UNIT_MAP);
  return { destroyed, wounded, hpLost };
}

function _applyBatchDamageToMilitia(pool, damageMap) {
  if (!pool || !Array.isArray(pool.hp)) return { destroyed: 0, hpLost: 0 };
  let destroyed = 0;
  let hpLost = 0;

  const hits = [];
  for (const [key, damage] of damageMap.entries()) {
    if (!key.startsWith('m:')) continue;
    const [, idxStr] = key.split(':');
    hits.push({ idx: Number(idxStr), damage: Math.max(0, Math.round(damage)) });
  }

  hits.sort((a, b) => b.idx - a.idx);
  for (const hit of hits) {
    if (hit.idx < 0 || hit.idx >= pool.hp.length) continue;
    const before = pool.hp[hit.idx];
    const after = before - hit.damage;
    hpLost += Math.max(0, Math.min(before, hit.damage));
    if (after <= 0) {
      pool.hp.splice(hit.idx, 1);
      destroyed++;
    } else {
      pool.hp[hit.idx] = after;
    }
  }

  return { destroyed, hpLost };
}

function _sumDamage(map) {
  let sum = 0;
  for (const v of map.values()) sum += Math.max(0, Math.round(v));
  return sum;
}

function _phaseNarrative(roundNum, attTac, defTac, attDmg, defDmg, attDestroyed, defDestroyed) {
  let tone;
  if (attDmg > defDmg * 1.3) tone = 'Attackers gain clear momentum.';
  else if (defDmg > attDmg * 1.3) tone = 'Defenders seize the initiative.';
  else tone = 'Both sides trade heavy blows.';

  return `Round ${roundNum}: Tactics ${attTac} vs ${defTac}. Attackers dealt ${attDmg} damage (${defDestroyed} enemy destroyed), defenders dealt ${defDmg} damage (${attDestroyed} attacker destroyed). ${tone}`;
}

function _ensureMinNarrative(rounds, outcome, provinceName) {
  const out = [...rounds];
  if (out.length >= 2) return out;

  if (outcome === 'attacker') {
    while (out.length < 2) out.push(`Attackers consolidate control around ${provinceName}.`);
  } else if (outcome === 'defender') {
    while (out.length < 2) out.push(`Defenders secure ${provinceName} after repelling the assault.`);
  } else {
    while (out.length < 2) out.push(`Both forces disengage around ${provinceName} without a decisive result.`);
  }
  return out;
}

function _buildCombatNarrative(rounds) {
  return rounds.map((text, idx) => ({ round: idx + 1, text }));
}

export function resolveCombat(attackerArmyId, targetProvinceId) {
  const attArmy = getArmy(attackerArmyId);
  const targetP = getProvince(targetProvinceId);
  if (!attArmy || !targetP) return null;

  // Moving into your own province — just relocate, never fight your own militia
  if (targetP.ownerId === attArmy.factionId) {
    moveArmy(attackerArmyId, targetProvinceId);
    return null;
  }

  const isEnemyProvince = targetP.ownerId !== attArmy.factionId && targetP.ownerId !== 'neutral';
  const enemyArmies = getArmiesInProvince(targetProvinceId)
    .filter(a => a.id !== attackerArmyId && a.factionId !== attArmy.factionId);
  const enemyDefArmy = _pickBestDefenderArmy(enemyArmies);

  let borrowedPlan = [];
  if (enemyDefArmy && enemyArmies.length > 1) {
    borrowedPlan = _planDefenderBorrow(
      enemyDefArmy,
      enemyArmies,
      UNIT_MAP,
      getArmySupplyCap(enemyDefArmy.factionId),
    );
    _applyBorrowedUnits(enemyDefArmy, borrowedPlan);
  }

  const militiaPool = _militiaPoolForProvince(targetP);
  const hasMilitia = _militiaCount(militiaPool) > 0;

  if (!isEnemyProvince && !enemyDefArmy && !hasMilitia) {
    moveArmy(attackerArmyId, targetProvinceId);
    if (targetP.ownerId === 'neutral') {
      captureProvince(targetProvinceId, attArmy.factionId);
      const attFaction = FACTION_MAP[attArmy.factionId];
      if (playerCanSee(targetProvinceId)) 
      {
        logCapture(attFaction?.name ?? attArmy.factionId, targetP.name);
        flashConquest(targetProvinceId);
      }
    }
    return null;
  }

  flashCombat(targetProvinceId);

  const biome = getBiome(targetP.biomeId);
  const terrainMod = 1 + (biome?.terrainDefBonus ?? 0);
  const fortBonus = targetP.locations.reduce((sum, loc) => sum + getLocationDefenseBonus(loc, BUILDING_MAP), 0);
  const defenderFlatBonus = Math.max(0, Math.round((biome?.terrainDefBonus ?? 0) * 10 + fortBonus * 12));

  // Sea attack penalty: -20% when attacking FROM shallow ocean
  const attackerOriginProv = getProvince(attArmy.provinceId);
  const isSeaAttack = !!(attackerOriginProv?.isOcean && attackerOriginProv?.oceanType === 'shallow');
  const seaPenalty  = isSeaAttack ? 0.8 : 1.0;

  const attackerStrengthPre = Math.round(armyAttackStrength(attArmy, UNIT_MAP) * seaPenalty);
  const defenderArmyDefensePre = enemyDefArmy ? armyDefenseStrength(enemyDefArmy, UNIT_MAP) : 0;
  const defenderMilitiaDefensePre = _militiaDefense(militiaPool);
  const defenderStrengthPre = Math.round((defenderArmyDefensePre + defenderMilitiaDefensePre) * terrainMod + fortBonus * 10);

  markArmyAttacked(attArmy);
  if (enemyDefArmy) markArmyAttacked(enemyDefArmy);

  const attFaction = FACTION_MAP[attArmy.factionId];
  const defFaction = targetP.ownerId !== 'neutral' ? FACTION_MAP[targetP.ownerId] : null;

  const attSizeBefore = armySize(attArmy);
  const defSizeBefore = (enemyDefArmy ? armySize(enemyDefArmy) : 0) + _militiaCount(militiaPool);

  const rounds = [];
  let outcome = 'inconclusive';

  const totalRounds = 2 + ((attArmy.maxMoves ?? 1) === 2 ? 1 : 0);

  for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
    const attackers = _collectArmyUnits(attArmy, attArmy.factionId);
    const defenders = [
      ..._collectArmyUnits(enemyDefArmy, enemyDefArmy?.factionId ?? null),
      ..._collectMilitiaUnits(militiaPool),
    ];

    if (attackers.length === 0) {
      outcome = 'defender';
      rounds.push(`Round ${roundNum}: Attacking force collapses and can no longer fight.`);
      break;
    }
    if (defenders.length === 0) {
      outcome = 'attacker';
      rounds.push(`Round ${roundNum}: Defending force is shattered.`);
      break;
    }

    const attTac = _d6();
    const defTac = _d6();
    const diff = attTac - defTac;
    const attBestChance = _clamp(0.5 + diff * 0.1, 0, 1);
    const defBestChance = _clamp(0.5 - diff * 0.1, 0, 1);

    const damageToDef = new Map();
    const damageToAtt = new Map();

    for (const unit of attackers) {
      const target = _pickTarget(unit, defenders, attBestChance, true, defenderFlatBonus);
      if (!target) continue;
      const dmg = Math.round(_damageAgainst(unit, target, true, defenderFlatBonus, true) * seaPenalty);
      damageToDef.set(target.key, (damageToDef.get(target.key) ?? 0) + dmg);
    }

    for (const unit of defenders) {
      const target = _pickTarget(unit, attackers, defBestChance, false, defenderFlatBonus);
      if (!target) continue;
      const dmg = _damageAgainst(unit, target, false, defenderFlatBonus, true);
      damageToAtt.set(target.key, (damageToAtt.get(target.key) ?? 0) + dmg);
    }

    const attDamage = _sumDamage(damageToDef);
    const defDamage = _sumDamage(damageToAtt);

    const attApply = _applyBatchDamageToArmy(attArmy, damageToAtt, WOUND_CHANCE);
    const defArmyApply = _applyBatchDamageToArmy(enemyDefArmy, damageToDef, WOUND_CHANCE);
    const defMilitiaApply = _applyBatchDamageToMilitia(militiaPool, damageToDef);

    const attDestroyed = attApply.destroyed;
    const defDestroyed = defArmyApply.destroyed + defMilitiaApply.destroyed;

    rounds.push(_phaseNarrative(
      roundNum,
      attTac,
      defTac,
      attDamage,
      defDamage,
      attDestroyed,
      defDestroyed,
    ));

    const attAlive = armySize(attArmy);
    const defAlive = (enemyDefArmy ? armySize(enemyDefArmy) : 0) + _militiaCount(militiaPool);

    if (attAlive <= 0) {
      outcome = 'defender';
      rounds.push(`Round ${roundNum}: Attacking army is destroyed.`);
      break;
    }
    if (defAlive <= 0) {
      outcome = 'attacker';
      rounds.push(`Round ${roundNum}: Defending force is destroyed.`);
      break;
    }
  }

  if (outcome === 'inconclusive') {
    const attNow = armyAttackStrength(attArmy, UNIT_MAP) + armyDefenseStrength(attArmy, UNIT_MAP);
    const defNow = (enemyDefArmy ? armyAttackStrength(enemyDefArmy, UNIT_MAP) + armyDefenseStrength(enemyDefArmy, UNIT_MAP) : 0)
      + _militiaDefense(militiaPool);
    const ratio = defNow > 0 ? attNow / defNow : (attNow > 0 ? 2 : 0.5);
    if (ratio >= 1.1) outcome = 'attacker';
    else if (ratio <= 0.9) outcome = 'defender';
  }

  if (borrowedPlan.length > 0 && outcome !== 'attacker') {
    _returnBorrowedUnits(enemyDefArmy, borrowedPlan);
  }

  if (targetP.militia) {
    targetP.militia.current = _militiaCount(militiaPool);
    targetP.militia.lastCombatTurn = state.turn;
  }

  const attSizeAfter = armySize(attArmy);
  const defSizeAfter = (enemyDefArmy ? armySize(enemyDefArmy) : 0) + _militiaCount(militiaPool);
  const attLostTotal = Math.max(0, attSizeBefore - attSizeAfter);
  const defLostTotal = Math.max(0, defSizeBefore - defSizeAfter);

  if (enemyDefArmy && armySize(enemyDefArmy) <= 0) removeArmy(enemyDefArmy.id);
  if (armySize(attArmy) <= 0) removeArmy(attArmy.id);

  let summary = '';
  if (outcome === 'attacker') {
    summary = `⚔ ${attFaction?.name ?? 'Attacker'} defeats defenders at ${targetP.name}.`;
  } else if (outcome === 'defender') {
    summary = `🛡 ${defFaction?.name ?? 'Defenders'} repel the assault at ${targetP.name}.`;
  } else {
    summary = `⚖ ${attFaction?.name ?? 'Attacker'} and defenders clash at ${targetP.name}; battle remains inconclusive.`;
  }

  const result = {
    outcome,
    attackerFactionId: attArmy.factionId,
    defenderFactionId: targetP.ownerId,
    provinceId: targetProvinceId,
    provinceName: targetP.name,
    summary,
    attackerStrength: Math.max(0, attackerStrengthPre),
    defenderStrength: Math.max(0, defenderStrengthPre),
    terrainBonus: Math.round((biome?.terrainDefBonus ?? 0) * 100),
    fortBonus,
    seaAttack: isSeaAttack,
    attLostTotal,
    defLostTotal,
    rounds: _buildCombatNarrative(_ensureMinNarrative(rounds, outcome, targetP.name)),
    turn: state.turn,
  };

  const reportId = addCombatReport(result);
  result.reportId = reportId;

  if (outcome === 'attacker' && getArmy(attackerArmyId)) {
    const stillEnemyArmies = getArmiesInProvince(targetProvinceId)
      .filter(a => a.factionId !== attArmy.factionId);
    if (stillEnemyArmies.length === 0) {
      if (!targetP.isOcean) {
        const prevOwner = targetP.ownerId;
        captureProvince(targetProvinceId, attArmy.factionId);
        if (targetP.militia) targetP.militia.current = 0;
        if (prevOwner !== attArmy.factionId) {
    
          if (playerCanSee(targetProvinceId)) logCapture(attFaction?.name ?? attArmy.factionId, targetP.name);
        }
      }
      moveArmy(attackerArmyId, targetProvinceId);
    } else {
      attArmy.movesLeft = Math.max(0, attArmy.movesLeft - 1);
      result.summary = `⚔ ${attFaction?.name ?? 'Attacker'} wins the clash at ${targetP.name}, but cannot occupy and falls back.`;
    }
  } else if (getArmy(attackerArmyId)) {
    const army = getArmy(attackerArmyId);
    if (army) army.movesLeft = Math.max(0, army.movesLeft - 1);
  }

  if (outcome === 'attacker' && attArmy.factionId === 'draig') {
    addResources('draig', { honor: 5 });
  }

  return result;
}

/**
 * Pure combat estimate for UI preview.
 */
export function estimateCombat(attackerArmyId, targetProvinceId) {
  const attArmy = getArmy(attackerArmyId);
  const targetP = getProvince(targetProvinceId);
  if (!attArmy || !targetP) return null;

  const biome = getBiome(targetP.biomeId);
  const terrainMod = 1 + (biome?.terrainDefBonus ?? 0);
  const fortBonus = targetP.locations.reduce((sum, loc) => sum + getLocationDefenseBonus(loc, BUILDING_MAP), 0);

  // Sea attack penalty: -20% when attacking FROM shallow ocean
  const attackerOriginProv = getProvince(attArmy.provinceId);
  const isSeaAttack = !!(attackerOriginProv?.isOcean && attackerOriginProv?.oceanType === 'shallow');
  const seaPenalty  = isSeaAttack ? 0.8 : 1.0;

  const enemyArmies = getArmiesInProvince(targetProvinceId)
    .filter(a => a.factionId !== attArmy.factionId);
  const enemyDefArmy = _pickBestDefenderArmy(enemyArmies);
  const militiaPool = _militiaPoolForProvince(targetP);

  const attStr = armyAttackStrength(attArmy, UNIT_MAP) * seaPenalty
    + armyDefenseStrength(attArmy, UNIT_MAP);
  let borrowedStrengthBonus = 0;
  if (enemyDefArmy && enemyArmies.length > 1) {
    borrowedStrengthBonus = _estimateBorrowedStrengthBonus(
      enemyDefArmy,
      enemyArmies,
      UNIT_MAP,
      getArmySupplyCap(enemyDefArmy.factionId),
    );
  }

  const defArmy = enemyDefArmy
    ? armyAttackStrength(enemyDefArmy, UNIT_MAP) + armyDefenseStrength(enemyDefArmy, UNIT_MAP) + borrowedStrengthBonus
    : 0;
  const defStr = Math.round((defArmy + _militiaDefense(militiaPool)) * terrainMod + fortBonus * 10);

  const ratio = defStr > 0 ? attStr / defStr : (attStr > 0 ? 2 : 0.5);
  const winChancePct = Math.round(Math.min(99, Math.max(1, (ratio / (ratio + 1)) * 100)));

  let casualtyLevel = 'Medium';
  if (ratio >= 1.25) casualtyLevel = 'Low';
  else if (ratio >= 0.95) casualtyLevel = 'Medium';
  else if (ratio >= 0.7) casualtyLevel = 'Heavy';
  else casualtyLevel = 'Catastrophic';

  return {
    atkStr: Math.round(attStr),
    defStr: Math.round(defStr),
    winChancePct,
    terrainBonus: Math.round((biome?.terrainDefBonus ?? 0) * 100),
    fortBonus,
    casualtyLevel,
  };
}

/**
 * Resolve a monster den combat between a player army and the den's occupants.
 * Runs 3 rounds of simplified simultaneous combat.
 * On attacker win: den converts to cleared_monster_den and treasure is rolled.
 * On defender win: army takes casualties, den HP is updated but type unchanged.
 *
 * @param {string} armyId
 * @param {string} locationId   - id of the monster_den location
 * @param {string} provinceId
 * @returns {{ outcome: 'attacker'|'defender', rounds: string[], casualties: number, treasure: Object|null }}
 */
export function resolveMonsterDenCombat(armyId, locationId, provinceId) {
  const army = getArmy(armyId);
  const prov = getProvince(provinceId);
  if (!army || !prov) return null;

  const loc = prov.locations.find(l => l.id === locationId);
  if (!loc || loc.type !== 'monster_den' || !loc.denEnemies) return null;

  const monDef = MONSTER_UNITS[loc.denEnemies.unitId];
  if (!monDef) return null;

  _ensureHpPools(army);

  const rounds = [];
  const ROUNDS = 3;

  for (let r = 1; r <= ROUNDS; r++) {
    const armyUnits = _collectArmyUnits(army, army.factionId);
    const aliveEnemies = loc.denEnemies.hp.length;

    if (armyUnits.length === 0 || aliveEnemies === 0) break;

    // ── Army attacks den ──────────────────────────────────────
    let denDmgDealt = 0;
    let denDestroyed = 0;
    const denDmgMap = new Map();

    for (const u of armyUnits) {
      if (loc.denEnemies.hp.length === 0) break;
      const targetIdx = Math.floor(Math.random() * loc.denEnemies.hp.length);
      const dmg = Math.max(1, Math.round((u.attack ?? 0) + _d8() - (monDef.defense ?? 0)));
      denDmgMap.set(targetIdx, (denDmgMap.get(targetIdx) ?? 0) + dmg);
      denDmgDealt += dmg;
    }

    // Apply damage to den hp (sort descending index for safe splice)
    const denHitIdxs = [...denDmgMap.keys()].sort((a, b) => b - a);
    for (const idx of denHitIdxs) {
      if (idx >= loc.denEnemies.hp.length) continue;
      const dmg = denDmgMap.get(idx);
      loc.denEnemies.hp[idx] -= dmg;
      if (loc.denEnemies.hp[idx] <= 0) {
        loc.denEnemies.hp.splice(idx, 1);
        denDestroyed++;
        // Wound chance: 45% join wounded pool
        if (Math.random() < WOUND_CHANCE) {
          loc.denEnemies.woundedHp.push(Math.max(1, Math.round(monDef.maxHp * 0.15)));
        }
      }
    }

    // ── Den attacks army ─────────────────────────────────────
    const armyUnitsFresh = _collectArmyUnits(army);
    let armyDmgDealt = 0;
    let armyDestroyed = 0;
    const armyDmgMap = new Map();

    const aliveEnemiesNow = loc.denEnemies.hp.length;
    for (let e = 0; e < aliveEnemiesNow; e++) {
      if (armyUnitsFresh.length === 0) break;
      const target = armyUnitsFresh[Math.floor(Math.random() * armyUnitsFresh.length)];
      const dmg = Math.max(1, Math.round((monDef.attack ?? 0) + _d8() - (target.defense ?? 0)));
      armyDmgMap.set(target.key, (armyDmgMap.get(target.key) ?? 0) + dmg);
      armyDmgDealt += dmg;
    }

    const result = _applyBatchDamageToArmy(army, armyDmgMap);
    armyDestroyed = result.destroyed;

    rounds.push(`Round ${r}: Your forces dealt ${denDmgDealt} damage (${denDestroyed} enemies slain). Monsters struck back for ${armyDmgDealt} damage (${armyDestroyed} of your units lost).`);
  }

  // ── Determine outcome ─────────────────────────────────────
  const enemiesRemaining = loc.denEnemies.hp.length + loc.denEnemies.woundedHp.length;
  const armyRemaining    = _collectArmyUnits(army).length;

  const enc = BIOME_DEN_ENCOUNTER[prov.biomeId] ?? BIOME_DEN_ENCOUNTER.default;
  const startCount = enc.count;
  const outcome = enemiesRemaining === 0 ? 'attacker'
    : armyRemaining === 0 ? 'defender'
    : loc.denEnemies.hp.length < Math.ceil(startCount / 2) ? 'attacker'
    : 'defender';

  let treasure = null;
  if (outcome === 'attacker') {
    loc.type = 'cleared_monster_den';
    if (Math.random() < 0.65) {
      treasure = rollTreasure(army.factionId, provinceId);
    }
    const factionDef = FACTION_MAP[army.factionId];
    const treasureStr = treasure
      ? ` Found treasure: ${Object.entries(treasure).map(([r, a]) => `+${a} ${r}`).join(', ')}.`
      : '';
    logMessage(`⚔ ${factionDef?.name ?? army.factionId} cleared the monster den in ${prov.name}!${treasureStr}`);
  } else {
    const factionDef = FACTION_MAP[army.factionId];
    logMessage(`⚔ ${factionDef?.name ?? army.factionId} failed to clear the monster den in ${prov.name}.`);
  }

  return { outcome, rounds, treasure };
}
