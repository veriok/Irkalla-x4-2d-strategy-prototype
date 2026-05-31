/**
 * turn-engine.js
 *
 * Manages the turn cycle:
 *   1. Income collection from buildings
 *   2. Production queue tick (buildings & units)
 *   3. Army move reset
 *   4. Elimination check
 *   5. Turn counter advance
 *
 * Also runs AI phases (one per non-eliminated AI faction) after the player ends their turn.
 */

import { state, addResources, getProvincesByFaction, getArmiesByFaction,
         checkElimination, getFaction, computeMilitiaMax } from './game-state.js';
import { FACTIONS, FACTION_MAP } from '../data/factions-data.js';
import { BUILDING_MAP } from '../data/buildings-data.js';
import { UNIT_MAP } from '../data/units-data.js';
import { getLocationResourceBonuses } from '../models/location.js';
import { getBiome } from '../data/biomes-data.js';
import { resetMoves, createArmy } from '../models/army.js';
import { placeArmy } from './game-state.js';
import { logTurn, logBuild, logRecruit, logElimination } from '../ui/event-log.js';

// ─── Per-faction income calculation ──────────────────────

/**
 * Compute per-turn resource income for a faction.
 * Returns { [resourceId]: amount }
 */
export function computeIncome(factionId) {
  const income = { gold: 0 };
  const faction = FACTION_MAP[factionId];
  if (!faction) return income;

  // Base income: 3 gold per owned province
  const provinces = getProvincesByFaction(factionId);
  income.gold += provinces.length * 3;

  // Building bonuses
  for (const prov of provinces) {
    const biome = getBiome(prov.biomeId);

    for (const loc of prov.locations) {
      if (!loc.isControllable) continue;
      const bonuses = getLocationResourceBonuses(loc, BUILDING_MAP);
      for (const [res, amt] of Object.entries(bonuses)) {
        income[res] = (income[res] ?? 0) + Math.round(amt * biome.resourceMod);
      }
    }
  }

  return income;
}

/**
 * Apply income for all factions.
 */
function collectIncome() {
  for (const faction of FACTIONS) {
    if (state.eliminated.has(faction.id)) continue;
    const income = computeIncome(faction.id);
    addResources(faction.id, income);
  }
}

// ─── Production queue tick ────────────────────────────────

/**
 * Tick production queues for all locations owned by a faction.
 * Completes items whose turnsRemaining reaches 0.
 */
function tickProductionQueues(factionId) {
  const provinces = getProvincesByFaction(factionId);
  const faction   = FACTION_MAP[factionId];

  for (const prov of provinces) {
    for (const loc of prov.locations) {
      if (!loc.isControllable || loc.productionQueue.length === 0) continue;

      // Only tick the first item (front of queue)
      const item = loc.productionQueue[0];
      item.turnsRemaining--;

      if (item.turnsRemaining <= 0) {
        // Complete the item
        loc.productionQueue.shift();

        if (item.type === 'building') {
          const bDef = BUILDING_MAP[item.id];
          if (bDef) {
            // Remove the upgraded-from building if this is an upgrade
            if (bDef.upgradeFromId) {
              const idx = loc.buildings.findIndex(b => b.buildingId === bDef.upgradeFromId);
              if (idx !== -1) loc.buildings.splice(idx, 1);
            }
            loc.buildings.push({ slotIndex: loc.buildings.length, buildingId: item.id });
            if (faction) logBuild(faction.name, bDef.name, prov.name);
          }
        } else if (item.type === 'unit') {
          const uDef = UNIT_MAP[item.id];
          if (uDef) {
            // Add units to the province's army; create army if none exists
            let army = prov.armyId ? state.armies.get(prov.armyId) : null;
            if (!army) {
              army = createArmy(factionId, prov.id, []);
              placeArmy(army);
            }
            const stack = army.units.find(u => u.typeId === item.id);
            if (stack) {
              stack.count += uDef.stackSize;
            } else {
              army.units.push({ typeId: item.id, count: uDef.stackSize });
            }
            if (faction) logRecruit(faction.name, uDef.name, uDef.stackSize, prov.name);
          }
        }
      }
    }
  }
}

// ─── Army move reset ──────────────────────────────────────

function resetArmyMoves(factionId) {
  for (const army of getArmiesByFaction(factionId)) {
    resetMoves(army);
  }
}

// ─── Full end-of-player-turn sequence ────────────────────

/**
 * Execute end-of-turn for all factions + AI phases.
 * Called when the player clicks End Turn.
 *
 * @param {Function} onComplete  callback invoked after all AI phases finish
 */
export async function endTurn(onComplete) {
  // ── Player turn resolution ──
  tickProductionQueues(state.playerFactionId);

  // ── AI phases ──
  for (const faction of FACTIONS) {
    if (faction.id === state.playerFactionId) continue;
    if (state.eliminated.has(faction.id)) continue;
    if (state.winner) break;

    const fs = getFaction(faction.id);
    if (!fs?.isAI) continue;

    tickProductionQueues(faction.id);
    resetArmyMoves(faction.id);

    // Run AI logic for this faction (imported lazily)
    const { runAI } = await import('./ai.js');
    await runAI(faction.id);
  }

  // ── Income (after all actions) ──
  collectIncome();

  // ── Advance turn ──
  state.turn++;
  logTurn(state.turn);

  // ── Replenish militia (+1 per province per turn, starting the turn after combat) ──
  for (const province of state.provinces.values()) {
    if (!province.militia) continue;
    const { current, lastCombatTurn } = province.militia;
    if (lastCombatTurn !== null && state.turn > lastCombatTurn) {
      const max = computeMilitiaMax(province);
      if (current < max) province.militia.current = current + 1;
    }
  }

  // ── Reset player army moves ──
  resetArmyMoves(state.playerFactionId);

  // ── Elimination check ──
  const eliminated = checkElimination();
  for (const fId of eliminated) {
    const f = FACTION_MAP[fId];
    if (f) logElimination(f.name);
  }

  if (onComplete) onComplete();
}
