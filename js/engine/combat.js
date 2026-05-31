/**
 * combat.js
 *
 * Auto-resolve combat between armies.
 *
 * Formula:
 *   atkStr = Σ(count × attack)  × terrain_mod × any special effects
 *   defStr = Σ(count × defense) × terrain_mod + fort_bonus
 *
 * Outcome:
 *   atkStr > defStr × 1.2  → decisive attacker win (defender 80% losses, attacker 20%)
 *   atkStr > defStr        → attacker wins narrowly (both ~40% losses)
 *   else                   → defender wins (attacker 60% losses, defender 10%, attacker retreats)
 *
 * Province capture: attacker wins → attacker moves into province, takes ownership.
 */

import { state, getArmy, getProvince, getFaction, captureProvince,
         moveArmy, removeArmy, checkElimination, addResources,
         getArmiesInProvince, addCombatReport, getArmySupplyCap } from './game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { UNIT_MAP } from '../data/units-data.js';
import { BUILDING_MAP } from '../data/buildings-data.js';
import { getBiome } from '../data/biomes-data.js';
import { armyAttackStrength, armyDefenseStrength, armySize, applyLosses,
         armyWoundedCount } from '../models/army.js';
import { getLocationDefenseBonus } from '../models/location.js';
import { flashCombat, flashConquest } from '../ui/map-view.js';
import { logCapture } from '../ui/event-log.js';

/**
 * Resolve combat when army moves into a province that has an enemy army or is enemy-owned.
 *
 * @param {string} attackerArmyId
 * @param {string} targetProvinceId
 * @returns {Object|null}  combat result object (for logging), or null if no combat
 */
export function resolveCombat(attackerArmyId, targetProvinceId) {
  const attArmy  = getArmy(attackerArmyId);
  const targetP  = getProvince(targetProvinceId);
  if (!attArmy || !targetP) return null;

  const isEnemy = targetP.ownerId !== attArmy.factionId && targetP.ownerId !== 'neutral';
  const defArmies = getArmiesInProvince(targetProvinceId)
    .filter(a => a.id !== attackerArmyId && a.factionId !== attArmy.factionId);
  const enemyDefArmy = _pickBestDefenderArmy(defArmies);

  // No combat for truly undefended neutral province — just occupy
  const hasMilitia = (targetP.militia?.current ?? 0) > 0;
  if (!isEnemy && !enemyDefArmy && !hasMilitia) {
    moveArmy(attackerArmyId, targetProvinceId);
    if (targetP.ownerId === 'neutral') {
      captureProvince(targetProvinceId, attArmy.factionId);
      const attFaction = FACTION_MAP[attArmy.factionId];
      logCapture(attFaction?.name ?? attArmy.factionId, targetP.name);
      flashConquest(targetProvinceId);
    }
    return null;
  }

  // ── Calculate strengths ──────────────────────────────────
  const biome      = getBiome(targetP.biomeId);
  const terrainMod = 1 + biome.terrainDefBonus;

  const atkStr = armyAttackStrength(attArmy, UNIT_MAP);

  // Use the strongest defending army, then temporarily borrow units from reserve armies
  // to fill its supply cap and avoid endless 1-unit defender splitting.
  let borrowedPlan = [];
  let borrowedDefenseBonus = 0;
  if (enemyDefArmy && defArmies.length > 1) {
    borrowedPlan = _planDefenderBorrow(enemyDefArmy, defArmies, UNIT_MAP, getArmySupplyCap(enemyDefArmy.factionId));
    borrowedDefenseBonus = _applyBorrowedUnits(enemyDefArmy, borrowedPlan);
  }

  // Fort bonus from defender's location buildings
  const fortBonus = targetP.locations.reduce((sum, loc) => {
    return sum + getLocationDefenseBonus(loc, BUILDING_MAP);
  }, 0);

  // Militia defense: each militia unit contributes 2 defense
  const militiaDef = (targetP.militia?.current ?? 0) * 2;

  let defStr;
  if (enemyDefArmy) {
    defStr = (armyDefenseStrength(enemyDefArmy, UNIT_MAP) + borrowedDefenseBonus) * terrainMod + fortBonus * 10 + militiaDef;
  } else {
    defStr = fortBonus * 10 + militiaDef;
  }

  flashCombat(targetProvinceId);

  // ── Determine outcome ────────────────────────────────────
  const attFaction = FACTION_MAP[attArmy.factionId];
  const defFaction = targetP.ownerId !== 'neutral'
    ? FACTION_MAP[targetP.ownerId]
    : null;

  let outcome;
  let attLossFraction = 0;
  let defLossFraction = 0;

  if (atkStr > defStr * 1.2) {
    outcome         = 'decisive_attacker';
    attLossFraction = 0.20;
    defLossFraction = 0.80;
  } else if (atkStr > defStr) {
    outcome         = 'attacker';
    attLossFraction = 0.40;
    defLossFraction = 0.40;
  } else {
    outcome         = 'defender';
    attLossFraction = 0.60;
    defLossFraction = 0.10;
  }

  // Record pre-loss sizes for the report
  const attSizeBefore = armySize(attArmy);
  const defSizeBefore = enemyDefArmy ? armySize(enemyDefArmy) : 0;

  // Apply losses (pass current turn so lastCombatTurn is stamped)
  applyLosses(attArmy, attLossFraction, state.turn);
  if (enemyDefArmy) applyLosses(enemyDefArmy, defLossFraction, state.turn);

  // Borrowed reserve units fight as part of the lead defender; if defenders hold,
  // surviving borrowed units return to their source armies. If defenders lose,
  // all borrowed units are considered destroyed.
  if (borrowedPlan.length > 0) {
    if (outcome === 'defender') {
      _returnBorrowedUnits(enemyDefArmy, borrowedPlan);
    }
    _removeBorrowedMarkerStacks(enemyDefArmy);
  }

  // Apply militia losses
  if (targetP.militia) {
    const militiaLost = Math.round(targetP.militia.current * defLossFraction);
    targetP.militia.current = Math.max(0, targetP.militia.current - militiaLost);
    targetP.militia.lastCombatTurn = state.turn;
  }

  const attLostTotal = attSizeBefore - armySize(attArmy);
  const defLostTotal = defSizeBefore - (enemyDefArmy ? armySize(enemyDefArmy) : 0);

  // ── Build rich combat report ─────────────────────────────
  const rounds = _buildCombatNarrative(
    outcome,
    attFaction?.name ?? attArmy.factionId,
    defFaction?.name ?? (targetP.ownerId !== 'neutral' ? targetP.ownerId : 'Militia'),
    targetP.name,
    attSizeBefore,
    defSizeBefore,
    attLostTotal,
    defLostTotal,
  );

  const summaries = {
    decisive_attacker: `⚔ ${attFaction?.name ?? 'Attacker'} crushes ${defFaction?.name ?? 'defenders'} at ${targetP.name}! Decisive victory.`,
    attacker:          `⚔ ${attFaction?.name ?? 'Attacker'} defeats ${defFaction?.name ?? 'defenders'} at ${targetP.name}. Hard-fought.`,
    defender:          `🛡 ${defFaction?.name ?? 'Defenders'} repel ${attFaction?.name ?? 'attacker'} at ${targetP.name}. Attacker retreats.`,
  };

  const hasDefenderReserves = enemyDefArmy && defArmies.some(a => a.id !== enemyDefArmy.id && armySize(a) > 0);
  const blockedByReserves = outcome !== 'defender' && !!hasDefenderReserves;
  if (blockedByReserves) {
    summaries[outcome] = `⚔ ${attFaction?.name ?? 'Attacker'} wins the clash at ${targetP.name}, but defending reserves prevent occupation. The attackers fall back.`;
  }

  const result = {
    outcome,
    attackerFactionId: attArmy.factionId,
    defenderFactionId: targetP.ownerId,
    provinceId:        targetProvinceId,
    provinceName:      targetP.name,
    summary:           summaries[outcome],
    attackerStrength:  Math.round(atkStr),
    defenderStrength:  Math.round(defStr),
    terrainBonus:      Math.round(biome.terrainDefBonus * 100),
    fortBonus:         fortBonus,
    blockedByReserves,
    attLostTotal,
    defLostTotal,
    rounds,
    turn:              state.turn,
  };

  // Store in state for click-to-view
  const reportId = addCombatReport(result);
  result.reportId = reportId;

  // ── Post-combat resolution ───────────────────────────────
  if (outcome !== 'defender') {
    if (armySize(attArmy) > 0) {
      if (enemyDefArmy) removeArmy(enemyDefArmy.id);
      if (targetP.militia) targetP.militia.current = 0;
      if (blockedByReserves) {
        // Attack consumed movement, but province cannot be occupied while reserve
        // defenders are still present.
        attArmy.movesLeft = Math.max(0, attArmy.movesLeft - 1);
      } else {
        const prevOwner = targetP.ownerId;
        captureProvince(targetProvinceId, attArmy.factionId);
        moveArmy(attackerArmyId, targetProvinceId);
        if (prevOwner !== attArmy.factionId) {
          flashConquest(targetProvinceId);
          logCapture(attFaction?.name ?? attArmy.factionId, targetP.name);
        }
      }
    } else {
      removeArmy(attackerArmyId);
    }
  } else {
    attArmy.movesLeft = 0;
    if (armySize(attArmy) === 0) removeArmy(attackerArmyId);
  }

  // ── Honor gain for Y Draig Goch from combat ──────────────
  if (outcome !== 'defender' && attArmy.factionId === 'draig') {
    addResources('draig', { honor: 5 });
  }

  // No army may persist with only wounded units.
  _removeIfNoHealthy(attackerArmyId);
  if (enemyDefArmy) _removeIfNoHealthy(enemyDefArmy.id);
  for (const d of defArmies) _removeIfNoHealthy(d.id);

  return result;
}

/**
 * Build a 3-round narrative array for the combat report modal.
 */
function _buildCombatNarrative(outcome, attName, defName, provinceName,
                                attSize, defSize, attLost, defLost) {
  const rounds = [];

  if (outcome === 'decisive_attacker') {
    rounds.push({ round: 1, text: `${attName}'s forces advance on ${provinceName}. Initial skirmishes heavily favour the attackers.` });
    rounds.push({ round: 2, text: `${defName} attempts to hold the line but is overwhelmed — casualties mount rapidly.` });
    rounds.push({ round: 3, text: `The defenders break. ${attName} secures ${provinceName}. Losses: ${attLost} attacker / ${defLost} defender.` });
  } else if (outcome === 'attacker') {
    rounds.push({ round: 1, text: `Fierce fighting erupts at ${provinceName}. Both sides take early losses.` });
    rounds.push({ round: 2, text: `${attName} pushes through the defenders at great cost. Momentum shifts.` });
    rounds.push({ round: 3, text: `${defName} yields the province after a hard-fought engagement. Losses: ${attLost} attacker / ${defLost} defender.` });
  } else {
    rounds.push({ round: 1, text: `${attName} launches an assault on ${provinceName}. Defenders hold their positions.` });
    rounds.push({ round: 2, text: `${defName}'s fortified position blunts the attack. The assaulting force suffers heavily.` });
    rounds.push({ round: 3, text: `${attName} is repelled and retreats. Losses: ${attLost} attacker / ${defLost} defender.` });
  }

  return rounds;
}

/**
 * Pure, side-effect-free combat estimate.
 * Returns likelihood and projected casualty tier without modifying any state.
 *
 * @param {string} attackerArmyId
 * @param {string} targetProvinceId
 * @returns {{ atkStr, defStr, winChancePct, terrainBonus, fortBonus, casualtyLevel } | null}
 */
export function estimateCombat(attackerArmyId, targetProvinceId) {
  const attArmy = getArmy(attackerArmyId);
  const targetP = getProvince(targetProvinceId);
  if (!attArmy || !targetP) return null;

  const biome      = getBiome(targetP.biomeId);
  const terrainMod = 1 + biome.terrainDefBonus;
  const atkStr     = armyAttackStrength(attArmy, UNIT_MAP);

  const fortBonus = targetP.locations.reduce((sum, loc) => {
    return sum + getLocationDefenseBonus(loc, BUILDING_MAP);
  }, 0);
  const militiaDef = (targetP.militia?.current ?? 0) * 2;

  const defArmies = getArmiesInProvince(targetProvinceId)
    .filter(a => a.factionId !== attArmy.factionId);
  const enemyDefArmy = _pickBestDefenderArmy(defArmies);

  let borrowedDefenseBonus = 0;
  if (enemyDefArmy && defArmies.length > 1) {
    const supplyCap = getArmySupplyCap(enemyDefArmy.factionId);
    let slotsLeft = Math.max(0, supplyCap - (armySize(enemyDefArmy) + armyWoundedCount(enemyDefArmy)));
    const candidates = [];
    for (const donor of defArmies) {
      if (donor.id === enemyDefArmy.id) continue;
      for (const stack of donor.units) {
        const unit = UNIT_MAP[stack.typeId];
        if (!unit || stack.count <= 0) continue;
        candidates.push({ defense: unit.defense, count: stack.count, unitDefense: unit.defense });
      }
    }
    candidates.sort((a, b) => b.defense - a.defense);
    for (const c of candidates) {
      if (slotsLeft <= 0) break;
      const take = Math.min(c.count, slotsLeft);
      borrowedDefenseBonus += take * c.unitDefense;
      slotsLeft -= take;
    }
  }

  let defStr;
  if (enemyDefArmy) {
    defStr = (armyDefenseStrength(enemyDefArmy, UNIT_MAP) + borrowedDefenseBonus) * terrainMod + fortBonus * 10 + militiaDef;
  } else {
    defStr = fortBonus * 10 + militiaDef;
  }

  // Win chance: clamp ratio to 0–100%
  const ratio = defStr > 0 ? atkStr / defStr : (atkStr > 0 ? 2 : 0.5);
  const winChancePct = Math.round(Math.min(99, Math.max(1, (ratio / (ratio + 1)) * 100)));

  // Casualty tier
  let casualtyLevel;
  if (atkStr > defStr * 1.2) {
    casualtyLevel = 'Low';       // decisive win — attacker takes few losses
  } else if (atkStr > defStr) {
    casualtyLevel = 'Medium';    // hard-fought win
  } else if (atkStr > defStr * 0.7) {
    casualtyLevel = 'Heavy';     // losing attack
  } else {
    casualtyLevel = 'Catastrophic';
  }

  return {
    atkStr:        Math.round(atkStr),
    defStr:        Math.round(defStr),
    winChancePct,
    terrainBonus:  Math.round(biome.terrainDefBonus * 100),
    fortBonus,
    casualtyLevel,
  };
}

function _pickBestDefenderArmy(defArmies) {
  if (!defArmies || defArmies.length === 0) return null;
  return [...defArmies].sort((a, b) => {
    const defDiff = armyDefenseStrength(b, UNIT_MAP) - armyDefenseStrength(a, UNIT_MAP);
    if (defDiff !== 0) return defDiff;
    return armySize(b) - armySize(a);
  })[0];
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
    plan.push({ fromArmyId: c.fromArmyId, typeId: c.typeId, count: take, unitDefense: c.unitDefense });
    need -= take;
  }
  return plan;
}

function _applyBorrowedUnits(leadArmy, plan) {
  let borrowedDefenseBonus = 0;
  if (!leadArmy) return borrowedDefenseBonus;

  for (const b of plan) {
    const donor = getArmy(b.fromArmyId);
    if (!donor || b.count <= 0) continue;

    const donorStack = donor.units.find(u => u.typeId === b.typeId);
    if (!donorStack || donorStack.count <= 0) continue;

    const taken = Math.min(donorStack.count, b.count);
    donorStack.count -= taken;
    donor.units = donor.units.filter(u => u.count > 0);
    b.count = taken;

    borrowedDefenseBonus += taken * b.unitDefense;
  }

  for (const b of plan) {
    if (b.count <= 0) continue;
    const borrowedStack = { typeId: b.typeId, count: b.count, _borrowedFromArmyId: b.fromArmyId };
    b._initialLeadCount = b.count;
    b._leadStackRef = borrowedStack;
    leadArmy.units.push(borrowedStack);
  }

  return borrowedDefenseBonus;
}

function _returnBorrowedUnits(leadDefArmy, plan) {
  if (!leadDefArmy) return;

  for (const b of plan) {
    const stack = b._leadStackRef;
    if (!stack) continue;

    const donor = getArmy(b.fromArmyId);
    if (donor && stack.count > 0) {
      const donorStack = donor.units.find(u => u.typeId === stack.typeId);
      if (donorStack) donorStack.count += stack.count;
      else donor.units.push({ typeId: stack.typeId, count: stack.count });
    }

    const borrowedLost = Math.max(0, (b._initialLeadCount ?? 0) - stack.count);
    const borrowedWounded = Math.round(borrowedLost * 0.5);
    if (borrowedWounded > 0 && leadDefArmy.wounded?.length) {
      const wStack = leadDefArmy.wounded.find(w => w.typeId === stack.typeId);
      if (wStack) {
        wStack.count = Math.max(0, wStack.count - borrowedWounded);
        leadDefArmy.wounded = leadDefArmy.wounded.filter(w => w.count > 0);
      }
    }
  }
}

function _removeBorrowedMarkerStacks(leadDefArmy) {
  if (!leadDefArmy) return;
  leadDefArmy.units = leadDefArmy.units.filter(s => !s._borrowedFromArmyId);
}

function _removeIfNoHealthy(armyId) {
  const army = getArmy(armyId);
  if (!army) return;
  if (armySize(army) <= 0) removeArmy(army.id);
}
