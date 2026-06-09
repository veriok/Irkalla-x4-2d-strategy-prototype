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
         getArmiesInProvince, getProvince } from './game-state.js';
import { isHeroActive, tickHeroesForFaction } from './hero-engine.js';
import { PROVINCE_STATUS_MAP } from '../data/province-status-data.js';
import { FACTIONS, FACTION_MAP } from '../data/factions-data.js';
import { BUILDING_MAP } from '../data/buildings-data.js';
import { UNIT_MAP } from '../data/units-data.js';
import { getLocationResourceBonuses, LOCATION_BASE_SLOTS, LOCATION_STARTING_BUILDING, getInstalledBuildingIds } from '../models/location.js';
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
 * Compute per-province income breakdown for a single province.
 *
 * Returns { [resId]: { flatTotal, modifiers: [{label, percent}], total } }
 *
 * - flatTotal:  province base (3 gold) + building bonuses with tech effects, RAW (no biome/status applied)
 * - modifiers:  biome % + active status effect income_percent entries, additive
 * - total:      flatTotal × max(0, 1 + sum(modifier percents) / 100)
 *
 * Filters to resources relevant to factionId.
 * Used by computeIncome, computeIncomeBreakdown, and province-panel income chips.
 */
export function computeProvinceIncomeBreakdown(province, factionId) {
  const faction = FACTION_MAP[factionId];
  if (!faction) return {};

  const techEffects = getFaction(factionId)?.appliedTechEffects ?? [];
  const biome = getBiome(province.biomeId);

  const factionResIds = new Set([
    faction.resources.gold.id,
    ...faction.resources.advanced.map(r => r.id),
    faction.resources.research.id,
  ]);

  // ── Flat income (province base + buildings, no modifiers) ──
  const flatTotals = { gold: 3 };
  for (const loc of province.locations) {
    if (!loc.isControllable) continue;
    const bonuses = getLocationResourceBonuses(loc, BUILDING_MAP, factionId, techEffects);
    for (const [res, amt] of Object.entries(bonuses)) {
      if (factionResIds.has(res) && amt !== 0) {
        flatTotals[res] = parseFloat(((flatTotals[res] ?? 0) + amt).toFixed(2));
      }
    }
  }

  // ── Modifiers (biome + status effects) ───────────────────
  const allModifiers = []; // apply to every resource
  const resModifiers = {}; // per specific resourceId

  const biomePercent = Math.round((biome.resourceMod - 1) * 100);
  if (biomePercent !== 0) {
    allModifiers.push({ label: biome.name, percent: biomePercent });
  }

  for (const se of (province.statusEffects ?? [])) {
    const def = PROVINCE_STATUS_MAP[se.type];
    if (!def) continue;
    const stacks = se.stacks ?? 1;
    for (const eff of (def.effects ?? [])) {
      if (eff.type !== 'income_percent') continue;
      const percent = (eff.percent ?? 0) * stacks;
      if (eff.resourceId === 'all') {
        allModifiers.push({ label: def.label, percent });
      } else {
        if (!resModifiers[eff.resourceId]) resModifiers[eff.resourceId] = [];
        resModifiers[eff.resourceId].push({ label: def.label, percent });
      }
    }
  }

  // ── Governor income bonus (governance * 3% all resources) ─
  if (province.governorId) {
    const fs = getFaction(factionId);
    const governor = fs?.heroes?.find(h => h.id === province.governorId) ?? null;
    if (governor && isHeroActive(governor) && governor.stats.governance > 0) {
      const govPercent = governor.stats.governance * 3;
      allModifiers.push({ label: `Governor (${governor.name})`, percent: govPercent });
    }
  }

  // ── Build result ─────────────────────────────────────────
  const result = {};
  for (const [resId, flatTotal] of Object.entries(flatTotals)) {
    if (!factionResIds.has(resId)) continue;
    if (flatTotal === 0) continue;

    const modifiers    = [...allModifiers, ...(resModifiers[resId] ?? [])];
    const combinedPct  = modifiers.reduce((s, m) => s + m.percent, 0);
    const factor       = Math.max(0, 1 + combinedPct / 100);
    const total        = parseFloat((flatTotal * factor).toFixed(2));

    result[resId] = { flatTotal, modifiers, total };
  }

  return result;
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
  const provinces   = getProvincesByFaction(factionId);

  for (const prov of provinces) {
    const pbd = computeProvinceIncomeBreakdown(prov, factionId);
    for (const [res, data] of Object.entries(pbd)) {
      income[res] = (income[res] ?? 0) + parseFloat(data.total.toFixed(1));
    }
  }

  _applyTechPercentBonuses(income, techEffects);

  return income;
}

/**
 * Compute per-turn resource income breakdown for a faction.
 * Returns { [resourceId]: { total: number, sources: [{label, amount}] } }
 *
 * Each province appears as a single post-modifier entry.
 * Tech percent bonuses and upkeep are added as faction-level entries.
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

  for (const prov of getProvincesByFaction(factionId)) {
    const pbd = computeProvinceIncomeBreakdown(prov, factionId);
    for (const [res, data] of Object.entries(pbd)) {
      const rounded = parseFloat(data.total.toFixed(2));
      if (rounded !== 0) addSource(res, prov.name, rounded);
    }
  }

  // Tech percent yield bonuses — applied to faction total
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
  for (const factionId of state.factions.keys()) {
    if (state.eliminated.has(factionId)) continue;
    const income = computeIncome(factionId);
    addResources(factionId, income);
  }
}

function collectUpkeep() {
  for (const factionId of state.factions.keys()) {
    if (state.eliminated.has(factionId)) continue;
    const upkeep = computeFactionUpkeep(factionId);
    if (upkeep > 0) addResources(factionId, { gold: -upkeep });

    // Army statusEffect upkeep (rune bonuses, beast upkeep)
    _collectArmyStatusUpkeep(factionId);
  }
}

/** Deduct per-turn upkeep for army-scope statusEffects with an upkeep field */
function _collectArmyStatusUpkeep(factionId) {
  const fs = state.factions.get(factionId);
  if (!fs) return;

  for (const army of getArmiesByFaction(factionId)) {
    const toRemove = [];
    for (const status of (army.statusEffects ?? [])) {
      if (!status.upkeep) continue;
      const { resourceId, amount } = status.upkeep;
      if ((fs.resources[resourceId] ?? 0) >= amount) {
        fs.resources[resourceId] = Math.max(0, (fs.resources[resourceId] ?? 0) - amount);
      } else {
        // Cannot afford upkeep — remove the status
        toRemove.push(status);
      }
    }
    if (toRemove.length > 0) {
      army.statusEffects = army.statusEffects.filter(s => !toRemove.includes(s));
    }

    // Beast upkeep: MONSTER units cost upkeepBeasts/turn
    let beastUpkeep = 0;
    for (const { typeId, count } of (army.units ?? [])) {
      const uDef = UNIT_MAP[typeId];
      if (!uDef) continue;
      beastUpkeep += (uDef.upkeepBeasts ?? 0) * count;
    }
    if (beastUpkeep > 0) {
      addResources(factionId, { beasts: -beastUpkeep });
    }

    // Tick army statusEffects with turnsRemaining
    if (army.statusEffects) {
      army.statusEffects = army.statusEffects.filter(s => {
        if (s.turnsRemaining === undefined) return true;  // permanent
        s.turnsRemaining--;
        return s.turnsRemaining > 0;
      });
    }
  }
}

/**
 * Get effective stack size for a unit, including stackSizeBonuses from techs.
 */
function _getEffectiveStackSize(unitId, factionId) {
  const uDef = UNIT_MAP[unitId];
  let size = uDef?.stackSize ?? 1;
  const techEffects = getFaction(factionId)?.appliedTechEffects ?? [];
  for (const eff of techEffects) {
    for (const bonus of (eff.stackSizeBonuses ?? [])) {
      if (bonus.unitId === unitId) size += bonus.amount;
    }
  }
  return Math.max(1, size);
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
          const effectiveStackSize = _getEffectiveStackSize(item.id, factionId);
          const cap       = getArmySupplyCap(factionId);
          const available = cap - armyTotalCount(army);
          const toAdd     = Math.min(effectiveStackSize, Math.max(0, available));
          const overflow  = effectiveStackSize - toAdd;

          if (toAdd > 0) {
            addArmyUnits(army, item.id, toAdd, UNIT_MAP);
          }

          // Overflow units go into a new army at the same province
          if (overflow > 0) {
            const overflowArmy = createArmy(factionId, prov.id, [{ typeId: item.id, count: overflow }]);
            placeArmy(overflowArmy);
          }

          if (faction && playerCanSee(prov.id)) logRecruit(faction.name, uDef.name, effectiveStackSize, prov.name);
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

// ─── Province status effect tick 
/**
 * Decrement all province status effects by 1 turn.
 * Effects that reach 0 are removed and their onRemove hook is fired.
 */
function tickProvinceStatuses() {
  for (const province of state.provinces.values()) {
    if (province.isOcean || !province.statusEffects?.length) continue;
    province.statusEffects = province.statusEffects.filter(effect => {
      if (effect.turnsRemaining === -1) return true;  // permanent
      effect.turnsRemaining--;
      if (effect.turnsRemaining <= 0) {
        PROVINCE_STATUS_MAP[effect.type]?.onRemove?.(province, state);
        return false;
      }
      return true;
    });
  }
}

// ─── Army move reset ──────────────────────────────────────

function resetArmyMoves(factionId) {
  for (const army of getArmiesByFaction(factionId)) {
    // Refresh roads_movement status: remove stale, re-apply if province has roads
    army.statusEffects = (army.statusEffects ?? []).filter(s => s.type !== 'roads_movement');
    const prov = getProvince(army.provinceId);
    const hasRoads = prov?.locations.some(loc => getInstalledBuildingIds(loc).includes('roads'));
    if (hasRoads) army.statusEffects.push({ type: 'roads_movement', movementBonus: 1 });
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
  for (const factionId of state.factions.keys()) {
    if (factionId === state.playerFactionId) continue;
    if (state.eliminated.has(factionId)) continue;
    if (state.winner) break;

    const fs = getFaction(factionId);
    if (!fs?.isAI) continue;

    tickProductionQueues(factionId);
    resetArmyMoves(factionId);

    // Run AI logic for this faction (imported lazily)
    const { runAI } = await import('./ai.js');
    await runAI(factionId);
  }

  // ── Income (after all actions) ──
  collectIncome();
  collectUpkeep();

  // ── Advance turn ──
  state.turn++;
  logTurn(state.turn);

  // ── Tick province status effects
  tickProvinceStatuses();

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

  // ── Hero ticks: wounds, transit, mana regen, governor XP, rotation ──
  for (const factionId of state.factions.keys()) {
    if (state.eliminated.has(factionId)) continue;
    tickHeroesForFaction(factionId, state.turn);
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
