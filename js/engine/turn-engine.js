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
         checkElimination, getFaction, computeMilitiaMax,
         getArmiesInProvince } from './game-state.js';
import { FACTIONS, FACTION_MAP } from '../data/factions-data.js';
import { BUILDING_MAP } from '../data/buildings-data.js';
import { UNIT_MAP } from '../data/units-data.js';
import { getLocationResourceBonuses, LOCATION_BASE_SLOTS, LOCATION_STARTING_BUILDING } from '../models/location.js';
import { getBiome } from '../data/biomes-data.js';
import { BIOME_DEN_ENCOUNTER, MONSTER_UNITS } from '../data/monsters-data.js';
import {
  resetMoves,
  createArmy,
  armyTotalCount,
  addArmyUnits,
  regenArmyHp,
  armyUpkeepGold,
  hasArmyMovedOrAttacked,
} from '../models/army.js';
import { placeArmy, getArmySupplyCap, playerCanSee } from './game-state.js';
import { logTurn, logBuild, logRecruit, logElimination } from '../ui/event-log.js';

// ─── Per-faction income calculation ──────────────────────

/**
 * Apply resourceYieldPercentBonuses from tech effects to an income object (mutates in place).
 * Each tech's percent bonus stacks additively before multiplying.
 */
function _applyTechPercentBonuses(income, techEffects) {
  const percentBonuses = {};
  for (const eff of techEffects) {
    for (const { resourceId, percent } of (eff.resourceYieldPercentBonuses ?? [])) {
      percentBonuses[resourceId] = (percentBonuses[resourceId] ?? 0) + percent;
    }
  }
  for (const [resId, pct] of Object.entries(percentBonuses)) {
    if (income[resId]) income[resId] = parseFloat((income[resId] * (1 + pct / 100)).toFixed(2));
  }
}

/**
 * Compute per-turn resource income for a faction.
 * Returns { [resourceId]: amount }
 */
export function computeIncome(factionId) {
  const income = { gold: 0 };
  const faction = FACTION_MAP[factionId];
  if (!faction) return income;

  const techEffects = getFaction(factionId)?.appliedTechEffects ?? [];

  // Base income: 3 gold per owned province
  const provinces = getProvincesByFaction(factionId);
  income.gold += provinces.length * 3;

  // Building bonuses (includes tech per-building and per-category bonuses)
  for (const prov of provinces) {
    const biome = getBiome(prov.biomeId);

    for (const loc of prov.locations) {
      if (!loc.isControllable) continue;
      const bonuses = getLocationResourceBonuses(loc, BUILDING_MAP, factionId, techEffects);
      for (const [res, amt] of Object.entries(bonuses)) {
        income[res] = (income[res] ?? 0) + Math.round(amt * biome.resourceMod);
      }
    }
  }

  // Tech percent yield bonuses applied to total income
  _applyTechPercentBonuses(income, techEffects);

  return income;
}

/**
 * Compute per-turn resource income breakdown for a faction.
 * Returns { [resourceId]: { total: number, sources: [{label, amount}] } }
 */
export function computeIncomeBreakdown(factionId) {
  const breakdown = {};
  const faction   = FACTION_MAP[factionId];
  if (!faction) return breakdown;

  const techEffects = getFaction(factionId)?.appliedTechEffects ?? [];

  function addSource(resId, label, amount) {
    if (!breakdown[resId]) breakdown[resId] = { total: 0, sources: [] };
    breakdown[resId].total  += amount;
    breakdown[resId].sources.push({ label, amount });
  }

  const provinces = getProvincesByFaction(factionId);

  for (const prov of provinces) {
    const biome = getBiome(prov.biomeId);
    const provTotals = { gold: 3 };

    for (const loc of prov.locations) {
      if (!loc.isControllable) continue;
      const bonuses = getLocationResourceBonuses(loc, BUILDING_MAP, factionId, techEffects);
      for (const [res, amt] of Object.entries(bonuses)) {
        const adjusted = parseFloat((amt * biome.resourceMod).toFixed(2));
        if (adjusted !== 0) {
          provTotals[res] = parseFloat(((provTotals[res] ?? 0) + adjusted).toFixed(2));
        }
      }
    }

    for (const [res, amt] of Object.entries(provTotals)) {
      if (amt !== 0) addSource(res, prov.name, amt);
    }
  }

  // Tech percent yield bonuses — add as a named source
  const percentBonuses = {};
  for (const eff of techEffects) {
    for (const { resourceId, percent } of (eff.resourceYieldPercentBonuses ?? [])) {
      percentBonuses[resourceId] = (percentBonuses[resourceId] ?? 0) + percent;
    }
  }
  for (const [resId, pct] of Object.entries(percentBonuses)) {
    const base = breakdown[resId]?.total ?? 0;
    if (base > 0) {
      const bonus = parseFloat((base * (pct / 100)).toFixed(2));
      if (bonus !== 0) addSource(resId, `Technology (+${pct}%)`, bonus);
    }
  }

  const upkeep = computeFactionUpkeep(factionId);
  if (upkeep > 0) addSource('gold', 'Unit upkeep', -upkeep);

  return breakdown;
}

export function computeFactionUpkeep(factionId) {
  let total = 0;
  for (const army of getArmiesByFaction(factionId)) {
    total += armyUpkeepGold(army, UNIT_MAP);
  }
  return total;
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

function collectUpkeep() {
  for (const faction of FACTIONS) {
    if (state.eliminated.has(faction.id)) continue;
    const upkeep = computeFactionUpkeep(faction.id);
    if (upkeep > 0) addResources(faction.id, { gold: -upkeep });
  }
}

// ─── Production queue tick ────────────────────────────────

/**
 * Tick production queues for all provinces owned by a faction.
 * Only the first item in the queue is ticked each turn.
 */
function tickProductionQueues(factionId) {
  const provinces = getProvincesByFaction(factionId);
  const faction   = FACTION_MAP[factionId];

  for (const prov of provinces) {
    if (!prov.productionQueue || prov.productionQueue.length === 0) continue;

    // Only tick the first item (front of queue)
    const item = prov.productionQueue[0];
    item.turnsRemaining--;

    if (item.turnsRemaining <= 0) {
      prov.productionQueue.shift();

      // Find the target location for this item
      const loc = prov.locations.find(l => l.id === item.locationId);

      if (item.type === 'building') {
        const bDef = BUILDING_MAP[item.id];
        if (bDef && loc) {
          // Replace upgraded-from building in-place; otherwise append
          if (bDef.upgradeFromId) {
            const idx = loc.buildings.findIndex(b => b.buildingId === bDef.upgradeFromId);
            if (idx !== -1) {
              loc.buildings.splice(idx, 1, { slotIndex: idx, buildingId: item.id });
            } else {
              loc.buildings.push({ slotIndex: loc.buildings.length, buildingId: item.id });
            }
          } else {
            loc.buildings.push({ slotIndex: loc.buildings.length, buildingId: item.id });
          }
          if (faction && playerCanSee(prov.id)) logBuild(faction.name, bDef.name, prov.name);
        }

      } else if (item.type === 'unit') {
        const uDef = UNIT_MAP[item.id];
        if (uDef) {
          // Add units to the province's army (same faction); create army if none exists
          let army = getArmiesInProvince(prov.id).find(a => a.factionId === factionId) ?? null;
          if (!army) {
            army = createArmy(factionId, prov.id, []);
            placeArmy(army);
          }
          const cap       = getArmySupplyCap(factionId);
          const available = cap - armyTotalCount(army);
          const toAdd     = Math.min(uDef.stackSize, Math.max(0, available));
          const overflow  = uDef.stackSize - toAdd;

          if (toAdd > 0) {
            addArmyUnits(army, item.id, toAdd, UNIT_MAP);
          }

          // Overflow units go into a new army at the same province
          if (overflow > 0) {
            const overflowArmy = createArmy(factionId, prov.id, [{ typeId: item.id, count: overflow }]);
            placeArmy(overflowArmy);
          }

          if (faction && playerCanSee(prov.id)) logRecruit(faction.name, uDef.name, uDef.stackSize, prov.name);
        }

      } else if (item.type === 'demolish') {
        const bDef = BUILDING_MAP[item.id];
        if (bDef && loc) {
          const idx = loc.buildings.findIndex(b => b.buildingId === item.id);
          if (idx !== -1) loc.buildings.splice(idx, 1);
          // Refund 50% of build cost
          const refund = Object.fromEntries(
            Object.entries(bDef.cost).map(([r, v]) => [r, Math.floor(v / 2)])
          );
          addResources(factionId, refund);
          if (faction && playerCanSee(prov.id)) logBuild(faction.name, `Razed ${bDef.name}`, prov.name);
        }

      } else if (item.type === 'clear_location') {
        if (loc) {
          loc.type = 'empty';
          loc.buildings = [];
          loc.buildingSlots = 0;
          delete loc.denEnemies;
          if (faction && playerCanSee(prov.id)) logBuild(faction.name, 'Cleared location', prov.name);
        }

      } else if (item.type === 'build_location') {
        if (loc) {
          loc.type = item.locationType;
          loc.isControllable = true;
          loc.buildingSlots = LOCATION_BASE_SLOTS[item.locationType] ?? 1;
          const startingBldg = LOCATION_STARTING_BUILDING[item.locationType];
          loc.buildings = startingBldg ? [{ buildingId: startingBldg }] : [];
          if (faction && playerCanSee(prov.id)) logBuild(faction.name, `Built ${item.locationType}`, prov.name);
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
  collectUpkeep();

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

  // ── Regenerate monster den enemies (heal wounded, respawn 1 killed/turn) ──
  for (const province of state.provinces.values()) {
    for (const loc of province.locations) {
      if (loc.type !== 'monster_den' || !loc.denEnemies) continue;
      const enc = BIOME_DEN_ENCOUNTER[province.biomeId] ?? BIOME_DEN_ENCOUNTER.default;
      const monDef = MONSTER_UNITS[enc.unitId];
      if (!monDef) continue;
      const maxCount = enc.count;

      // Heal wounded (20% maxHp per turn); rejoin active when >= 50% maxHp
      const stillWounded = [];
      for (const wHp of loc.denEnemies.woundedHp) {
        const healed = Math.min(wHp + monDef.maxHp * 0.2, monDef.maxHp);
        if (healed >= monDef.maxHp * 0.5) {
          loc.denEnemies.hp.push(healed);
        } else {
          stillWounded.push(healed);
        }
      }
      loc.denEnemies.woundedHp = stillWounded;

      // Respawn one killed unit per turn (enters as wounded at 15% hp)
      const total = loc.denEnemies.hp.length + loc.denEnemies.woundedHp.length;
      if (total < maxCount) {
        loc.denEnemies.woundedHp.push(Math.max(1, Math.round(monDef.maxHp * 0.15)));
      }
    }
  }

  // ── Replenish HP for idle armies in friendly territory ──
  for (const army of state.armies.values()) {
    // Must be in own territory and must not have moved or attacked this turn
    const prov = state.provinces.get(army.provinceId);
    if (!prov || prov.ownerId !== army.factionId) continue;
    if (hasArmyMovedOrAttacked(army)) continue;
    regenArmyHp(army, UNIT_MAP, 0.2);
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
