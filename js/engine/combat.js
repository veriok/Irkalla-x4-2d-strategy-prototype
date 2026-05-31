/**
 * combat.js
 * HP-based combat resolution with possible inconclusive outcomes.
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
  applyArmyDamage,
  markArmyAttacked,
  transferActiveUnits,
} from '../models/army.js';
import { getLocationDefenseBonus } from '../models/location.js';
import { flashCombat, flashConquest } from '../ui/map-view.js';
import { logCapture } from '../ui/event-log.js';

function _pickBestDefenderArmy(defArmies) {
  if (!defArmies || defArmies.length === 0) return null;
  return [...defArmies].sort((a, b) => {
    const byDef = armyDefenseStrength(b, UNIT_MAP) - armyDefenseStrength(a, UNIT_MAP);
    if (byDef !== 0) return byDef;
    return armySize(b) - armySize(a);
  })[0];
}

function _randRoll() {
  return Math.floor(Math.random() * 9) - 4; // -4..+4
}

function _militiaPoolForProvince(province) {
  const count = Math.max(0, province.militia?.current ?? 0);
  const unitId = getMilitiaUnitIdForFaction(province.ownerId ?? 'neutral');
  const unitDef = UNIT_MAP[unitId] ?? UNIT_MAP.militia_neutral;
  const hp = Math.max(1, unitDef?.maxHp ?? 18);
  return {
    unitId,
    unitDef,
    hp: Array.from({ length: count }, () => hp),
  };
}

function _militiaCount(pool) {
  return pool?.hp?.length ?? 0;
}

function _militiaStrength(pool) {
  const n = _militiaCount(pool);
  if (n <= 0 || !pool?.unitDef) return 0;
  return n * (pool.unitDef.attack + pool.unitDef.defense);
}

function _applyMilitiaDamage(pool, damage) {
  if (!pool || !Array.isArray(pool.hp) || pool.hp.length === 0 || damage <= 0) return 0;
  let remaining = Math.round(Math.max(0, damage));
  let killed = 0;

  while (remaining > 0 && pool.hp.length > 0) {
    const idx = Math.floor(Math.random() * pool.hp.length);
    const perHit = Math.min(remaining, Math.max(4, Math.round((pool.unitDef?.maxHp ?? 18) * 0.35)));
    pool.hp[idx] -= perHit;
    remaining -= perHit;
    if (pool.hp[idx] <= 0) {
      pool.hp.splice(idx, 1);
      killed++;
    }
  }

  return killed;
}

function _buildCombatNarrative(rounds) {
  return rounds.map((text, idx) => ({ round: idx + 1, text }));
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
    const available = leadArmy.units.find(u => u.typeId === b.typeId)?.count ?? 0;
    if (available <= 0) continue;
    const giveBack = Math.min(available, b.moved);
    transferActiveUnits(leadArmy, donor, b.typeId, giveBack, UNIT_MAP);
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

/**
 * Resolve combat when army moves into a province that has an enemy army or is enemy-owned.
 */
export function resolveCombat(attackerArmyId, targetProvinceId) {
  const attArmy = getArmy(attackerArmyId);
  const targetP = getProvince(targetProvinceId);
  if (!attArmy || !targetP) return null;

  const originProvinceId = attArmy.provinceId;
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
  const attSizeBefore = armySize(attArmy);
  const defSizeBefore = (enemyDefArmy ? armySize(enemyDefArmy) : 0) + _militiaCount(militiaPool);

  // Undefended neutral walk-in.
  if (!isEnemyProvince && !enemyDefArmy && !hasMilitia) {
    moveArmy(attackerArmyId, targetProvinceId);
    if (targetP.ownerId === 'neutral') {
      captureProvince(targetProvinceId, attArmy.factionId);
      const attFaction = FACTION_MAP[attArmy.factionId];
      logCapture(attFaction?.name ?? attArmy.factionId, targetP.name);
      flashConquest(targetProvinceId);
    }
    return null;
  }

  flashCombat(targetProvinceId);

  const biome = getBiome(targetP.biomeId);
  const terrainMod = 1 + (biome?.terrainDefBonus ?? 0);
  const fortBonus = targetP.locations.reduce((sum, loc) => sum + getLocationDefenseBonus(loc, BUILDING_MAP), 0);

  markArmyAttacked(attArmy);
  for (const d of enemyArmies) markArmyAttacked(d);

  const attFaction = FACTION_MAP[attArmy.factionId];
  const defFaction = targetP.ownerId !== 'neutral' ? FACTION_MAP[targetP.ownerId] : null;

  const rounds = [];
  let outcome = 'inconclusive';

  for (let r = 1; r <= 9; r++) {
    if (armySize(attArmy) <= 0) {
      outcome = 'defender';
      break;
    }

    const defendersAlive = (enemyDefArmy ? armySize(enemyDefArmy) : 0) + _militiaCount(militiaPool);
    if (defendersAlive <= 0) {
      outcome = 'attacker';
      break;
    }

    const attScore = armyAttackStrength(attArmy, UNIT_MAP)
      + armyDefenseStrength(attArmy, UNIT_MAP)
      + _randRoll();

    const defArmyScore = enemyDefArmy
      ? (armyAttackStrength(enemyDefArmy, UNIT_MAP) + armyDefenseStrength(enemyDefArmy, UNIT_MAP))
      : 0;
    const defMilitiaScore = _militiaStrength(militiaPool);
    const defScore = Math.round((defArmyScore + defMilitiaScore) * terrainMod + fortBonus * 8 + _randRoll());

    const diff = attScore - defScore;
    const damage = Math.max(14, Math.round(Math.abs(diff) * 2.2 + 6));

    if (diff > 2) {
      let dealtToArmy = 0;
      if (enemyDefArmy && armySize(enemyDefArmy) > 0) {
        const dealt = applyArmyDamage(enemyDefArmy, damage, UNIT_MAP, 0.45, state.turn);
        dealtToArmy = (dealt.killed + dealt.wounded);
      }
      const spill = Math.max(0, damage - dealtToArmy * 6);
      if (spill > 0 && _militiaCount(militiaPool) > 0) _applyMilitiaDamage(militiaPool, spill);
      rounds.push(`Round ${r}: Attackers press the line and inflict heavy losses.`);
    } else if (diff < -2) {
      applyArmyDamage(attArmy, damage, UNIT_MAP, 0.45, state.turn);
      rounds.push(`Round ${r}: Defenders absorb the assault and counter effectively.`);
    } else {
      applyArmyDamage(attArmy, Math.round(damage * 0.6), UNIT_MAP, 0.45, state.turn);
      if (enemyDefArmy && armySize(enemyDefArmy) > 0) {
        applyArmyDamage(enemyDefArmy, Math.round(damage * 0.6), UNIT_MAP, 0.45, state.turn);
      }
      _applyMilitiaDamage(militiaPool, Math.round(damage * 0.3));
      rounds.push(`Round ${r}: Brutal attrition with no decisive breakthrough.`);
    }
  }

  if (outcome === 'inconclusive') {
    if (armySize(attArmy) <= 0) outcome = 'defender';
    else if ((enemyDefArmy ? armySize(enemyDefArmy) : 0) + _militiaCount(militiaPool) <= 0) outcome = 'attacker';
    else {
      const attNow = armyAttackStrength(attArmy, UNIT_MAP) + armyDefenseStrength(attArmy, UNIT_MAP);
      const defNow = (enemyDefArmy ? armyAttackStrength(enemyDefArmy, UNIT_MAP) + armyDefenseStrength(enemyDefArmy, UNIT_MAP) : 0)
        + _militiaStrength(militiaPool);
      const ratio = defNow > 0 ? attNow / defNow : (attNow > 0 ? 2 : 0.5);
      if (ratio >= 1.15) outcome = 'attacker';
      else if (ratio <= 0.85) outcome = 'defender';
    }
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

  const attackerStrengthNow = armyAttackStrength(attArmy, UNIT_MAP) + armyDefenseStrength(attArmy, UNIT_MAP);
  const defenderStrengthNow = (enemyDefArmy ? armyAttackStrength(enemyDefArmy, UNIT_MAP) + armyDefenseStrength(enemyDefArmy, UNIT_MAP) : 0)
    + _militiaStrength(militiaPool);

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
    attackerStrength: Math.max(0, Math.round(attackerStrengthNow)),
    defenderStrength: Math.max(0, Math.round(defenderStrengthNow)),
    terrainBonus: Math.round((biome?.terrainDefBonus ?? 0) * 100),
    fortBonus,
    attLostTotal,
    defLostTotal,
    rounds: _buildCombatNarrative(rounds),
    turn: state.turn,
  };

  const reportId = addCombatReport(result);
  result.reportId = reportId;

  // Occupation and retreat logic.
  if (outcome === 'attacker' && getArmy(attackerArmyId)) {
    const stillEnemyArmies = getArmiesInProvince(targetProvinceId)
      .filter(a => a.factionId !== attArmy.factionId);
    if (stillEnemyArmies.length === 0) {
      const prevOwner = targetP.ownerId;
      captureProvince(targetProvinceId, attArmy.factionId);
      moveArmy(attackerArmyId, targetProvinceId);
      if (targetP.militia) targetP.militia.current = 0;
      if (prevOwner !== attArmy.factionId) {
        flashConquest(targetProvinceId);
        logCapture(attFaction?.name ?? attArmy.factionId, targetP.name);
      }
    } else {
      // Win against field force but cannot occupy; still counts as used movement.
      attArmy.movesLeft = Math.max(0, attArmy.movesLeft - 1);
      summary = `⚔ ${attFaction?.name ?? 'Attacker'} wins the clash at ${targetP.name}, but cannot occupy and falls back.`;
      result.summary = summary;
    }
  } else if (getArmy(attackerArmyId)) {
    // Defender win or inconclusive: attacker returns to origin and spends one move.
    const army = getArmy(attackerArmyId);
    if (army) {
      // Army is still in origin province because moveArmy() is only called on occupation.
      void originProvinceId;
      army.movesLeft = Math.max(0, army.movesLeft - 1);
    }
  }

  // Honor gain for Y Draig Goch from combat wins.
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

  const enemyArmies = getArmiesInProvince(targetProvinceId)
    .filter(a => a.factionId !== attArmy.factionId);
  const enemyDefArmy = _pickBestDefenderArmy(enemyArmies);
  const militiaPool = _militiaPoolForProvince(targetP);

  const attStr = armyAttackStrength(attArmy, UNIT_MAP) + armyDefenseStrength(attArmy, UNIT_MAP);
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
  const defStr = Math.round((defArmy + _militiaStrength(militiaPool)) * terrainMod + fortBonus * 8);

  const ratio = defStr > 0 ? attStr / defStr : (attStr > 0 ? 2 : 0.5);
  const winChancePct = Math.round(Math.min(99, Math.max(1, (ratio / (ratio + 1)) * 100)));

  let casualtyLevel = 'Medium';
  if (ratio >= 1.25) casualtyLevel = 'Low';
  else if (ratio < 1.25 && ratio >= 0.95) casualtyLevel = 'Medium';
  else if (ratio < 0.95 && ratio >= 0.7) casualtyLevel = 'Heavy';
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
