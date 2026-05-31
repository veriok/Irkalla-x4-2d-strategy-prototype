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
         moveArmy, removeArmy, checkElimination, addResources } from './game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { UNIT_MAP } from '../data/units-data.js';
import { BUILDING_MAP } from '../data/buildings-data.js';
import { getBiome } from '../data/biomes-data.js';
import { armyAttackStrength, armyDefenseStrength, armySize, applyLosses } from '../models/army.js';
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
  const hasDefendingArmy = targetP.armyId && targetP.armyId !== attackerArmyId;
  const defArmy = hasDefendingArmy ? getArmy(targetP.armyId) : null;
  const enemyDefArmy = defArmy && defArmy.factionId !== attArmy.factionId ? defArmy : null;

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
  const biome    = getBiome(targetP.biomeId);
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
    // Militia-only or fort-only defense
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
    outcome        = 'decisive_attacker';
    attLossFraction = 0.20;
    defLossFraction = 0.80;
  } else if (atkStr > defStr) {
    outcome        = 'attacker';
    attLossFraction = 0.40;
    defLossFraction = 0.40;
  } else {
    outcome        = 'defender';
    attLossFraction = 0.60;
    defLossFraction = 0.10;
  }

  // Apply losses
  applyLosses(attArmy, attLossFraction);
  if (enemyDefArmy) applyLosses(enemyDefArmy, defLossFraction);

  // Apply militia losses to defending province (both outcomes take militia casualties)
  if (targetP.militia) {
    const militiaLost = Math.round(targetP.militia.current * defLossFraction);
    targetP.militia.current = Math.max(0, targetP.militia.current - militiaLost);
    targetP.militia.lastCombatTurn = state.turn;
  }

  // Build summary
  const attSizeBefore = armySize(attArmy) + Math.round(armySize(attArmy) * attLossFraction / (1 - attLossFraction + 0.001));
  const defSizeBefore = enemyDefArmy
    ? armySize(enemyDefArmy) + Math.round(armySize(enemyDefArmy) * defLossFraction / (1 - defLossFraction + 0.001))
    : 0;

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
    summary:           summaries[outcome],
    attackerStrength:  Math.round(atkStr),
    defenderStrength:  Math.round(defStr),
  };

  // ── Post-combat resolution ───────────────────────────────
  if (outcome !== 'defender') {
    // Attacker wins → capture province
    if (armySize(attArmy) > 0) {
      // Always remove the defending army on province capture — routed regardless of survivors
      if (enemyDefArmy) {
        removeArmy(enemyDefArmy.id);
      }
      const prevOwner = targetP.ownerId;
      captureProvince(targetProvinceId, attArmy.factionId);
      moveArmy(attackerArmyId, targetProvinceId);

      if (prevOwner !== attArmy.factionId) {
        flashConquest(targetProvinceId);
        logCapture(attFaction?.name ?? attArmy.factionId, targetP.name);
      }
    } else {
      // Attacker army also destroyed despite winning (rare)
      removeArmy(attackerArmyId);
    }
  } else {
    // Defender wins → attacker retreats (army stays in place, just loses moves)
    attArmy.movesLeft = 0;
    if (armySize(attArmy) === 0) removeArmy(attackerArmyId);
  }

  // ── Honor gain for Y Draig Goch from combat ──────────────
  if (outcome !== 'defender' && attArmy.factionId === 'draig') {
    addResources('draig', { honor: 5 });
  }

  return result;
}
