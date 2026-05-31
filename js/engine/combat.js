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
         getArmiesInProvince, addCombatReport } from './game-state.js';
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
  const enemyDefArmy = defArmies[0] ?? null;

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

  // Fort bonus from defender's location buildings
  const fortBonus = targetP.locations.reduce((sum, loc) => {
    return sum + getLocationDefenseBonus(loc, BUILDING_MAP);
  }, 0);

  // Militia defense: each militia unit contributes 2 defense
  const militiaDef = (targetP.militia?.current ?? 0) * 2;

  let defStr;
  if (enemyDefArmy) {
    defStr = armyDefenseStrength(enemyDefArmy, UNIT_MAP) * terrainMod + fortBonus * 10 + militiaDef;
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
      const prevOwner = targetP.ownerId;
      captureProvince(targetProvinceId, attArmy.factionId);
      moveArmy(attackerArmyId, targetProvinceId);
      if (prevOwner !== attArmy.factionId) {
        flashConquest(targetProvinceId);
        logCapture(attFaction?.name ?? attArmy.factionId, targetP.name);
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
  const enemyDefArmy = defArmies[0] ?? null;

  let defStr;
  if (enemyDefArmy) {
    defStr = armyDefenseStrength(enemyDefArmy, UNIT_MAP) * terrainMod + fortBonus * 10 + militiaDef;
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
