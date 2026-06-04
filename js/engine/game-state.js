/**
 * game-state.js
 *
 * Central mutable game state.
 * All other modules read from and write to this singleton.
 *
 * Structure:
 *   state.turn          — current turn number
 *   state.playerFactionId — which faction the human controls
 *   state.factions      — Map<factionId, factionState>
 *   state.provinces     — Map<provinceId, province>
 *   state.armies        — Map<armyId, army>
 *   state.phase         — 'player' | 'ai' | 'end'
 *   state.selectedProvinceId — currently selected province (UI)
 *   state.selectedArmyId     — currently selected army (UI)
 *   state.movingArmyId       — army awaiting destination click
 *   state.eliminated    — Set<factionId> of eliminated factions
 *   state.winner        — factionId or null
 */

import { FACTIONS, FACTION_MAP, NEUTRAL } from '../data/factions-data.js';
import { PROVINCE_STATUS_MAP } from '../data/province-status-data.js';
import { BUILDING_MAP } from '../data/buildings-data.js';
import { UNIT_MAP } from '../data/units-data.js';
import { TECH_MAP } from '../data/techs-data.js';
import { createProvince } from '../models/province.js';
import {
  createArmy,
  armyTotalCount,
  transferActiveUnits,
  transferWoundedUnits,
  recalcArmyMoves,
  markArmyMoved,
} from '../models/army.js';

// ─── State singleton ──────────────────────────────────────
export const state = {
  turn:               1,
  playerFactionId:    null,
  phase:              'player',   // 'player' | 'ai' | 'end'
  selectedProvinceId: null,
  selectedArmyId:     null,
  movingArmyId:       null,
  eliminated:         new Set(),
  winner:             null,

  factions:     new Map(),    // factionId → factionState
  provinces:    new Map(),    // provinceId → province
  armies:       new Map(),    // armyId → army
  combatReports: [],          // recent combat reports (newest first, capped at 50)
};

// ─── Faction state factory ────────────────────────────────
function createFactionState(faction) {
  // Build starting resource object from faction definition
  const resources = { gold: 50, research: 0 };
  for (const adv of faction.resources.advanced) {
    resources[adv.id] = 20;
  }
  return {
    id:                    faction.id,
    resources,
    isAI:                  true,         // overridden for player faction during init
    isEliminated:          false,
    armySupplyCap:         6,
    unlockedTechs:         [],           // string[] of unlocked tech ids
    researchCostMultiplier: 1.0,         // *= 1.03 per unlock
    appliedTechEffects:    [],           // effect objects from all unlocked techs
    globalMilitiaBonus:    0,            // cumulative militia bonus from techs
  };
}

// ─── World initialisation ─────────────────────────────────
/**
 * Initialise the game world from map-generator output.
 *
 * @param {Array}  provinceDataArr  - raw province descriptors from generateMap()
 * @param {string} playerFactionId
 */
export function initWorld(provinceDataArr, playerFactionId) {
  // Clear state
  state.factions.clear();
  state.provinces.clear();
  state.armies.clear();
  state.turn = 1;
  state.phase = 'player';
  state.selectedProvinceId = null;
  state.selectedArmyId = null;
  state.movingArmyId = null;
  state.eliminated.clear();
  state.winner = null;
  state.playerFactionId = playerFactionId;

  // Initialise faction states
  for (const faction of FACTIONS) {
    const fs = createFactionState(faction);
    fs.isAI = faction.id !== playerFactionId;
    state.factions.set(faction.id, fs);
  }

  // Build province map from raw data
  for (const raw of provinceDataArr) {
    const province = createProvince(raw);
    state.provinces.set(province.id, province);
  }

  // Only keep faction ownership for the single capital province; all others → neutral
  // Ocean provinces keep their 'ocean' ownerId and are never reassigned.
  for (const province of state.provinces.values()) {
    if (province.ownerId !== 'neutral' && province.ownerId !== 'ocean' && !province.isCapital) {
      province.ownerId = 'neutral';
    }
  }

  // Place starting armies (one per faction capital)
  for (const province of state.provinces.values()) {
    if (province.isCapital && province.ownerId !== 'neutral') {
      const faction = FACTION_MAP[province.ownerId];
      if (!faction) continue;

      // Starting army: 2 basic units for the faction
      const startingUnits = getStartingUnits(province.ownerId);
      const army = createArmy(province.ownerId, province.id, startingUnits);
      state.armies.set(army.id, army);
      province.armyIds.push(army.id);
    }
  }

  // Place initial town_hall_1 in each starting faction's capital main_settlement
  for (const province of state.provinces.values()) {
    if (province.isCapital && province.ownerId !== 'neutral') {
      const mainLoc = province.locations.find(l => l.type === 'main_settlement');
      if (mainLoc) {
        mainLoc.buildings.push({ slotIndex: 0, buildingId: 'town_hall_1' });
      }
    }
  }

  // Initialise militia for all land provinces (after buildings are installed)
  for (const province of state.provinces.values()) {
    if (province.isOcean) continue;
    const max = computeMilitiaMax(province);
    province.militia = { current: max, lastCombatTurn: null };
  }

  // Set core province for all starting faction territories
  for (const province of state.provinces.values()) {
    if (province.ownerId !== 'neutral' && province.ownerId !== 'ocean') {
      province.coreOf = province.ownerId;
    }
  }
}

/** Starting unit composition per faction (2 basic units) */
function getStartingUnits(factionId) {
  const unitsByFaction = {
    dwarves: [{ typeId: 'dwarf_undead_levy', count: 3 }],
    elves:   [{ typeId: 'elf_hoplite',       count: 3 }],
    lizards: [{ typeId: 'lizard_skink',      count: 3 }],
    draig:   [{ typeId: 'draig_warrior',     count: 3 }],
  };
  return unitsByFaction[factionId] ?? [];
}

// ─── Province helpers ─────────────────────────────────────

export function getProvince(id)  { return state.provinces.get(id); }
export function getArmy(id)      { return state.armies.get(id); }
export function getFaction(id)   { return state.factions.get(id); }

/**
 * Returns true if the player can currently see the given province
 * (visibility === 'visible').
 * Used to suppress event-log entries for out-of-fog events.
 */
export function playerCanSee(provinceId) {
  const prov = state.provinces.get(provinceId);
  if (!prov) return false;
  return prov.visibility === 'visible';
}

/** All armies currently stationed in a province */
export function getArmiesInProvince(provinceId) {
  const prov = getProvince(provinceId);
  if (!prov) return [];
  return prov.armyIds.map(id => state.armies.get(id)).filter(Boolean);
}

/** Supply cap for a faction (hook for future research upgrades). */
export function getArmySupplyCap(factionId) {
  return state.factions.get(factionId)?.armySupplyCap ?? 6;
}

/** Add a combat report (newest first, capped at 50). */
let _nextReportId = 1;
export function addCombatReport(report) {
  report.reportId = `cr_${_nextReportId++}`;
  state.combatReports.unshift(report);
  if (state.combatReports.length > 50) state.combatReports.length = 50;
  return report.reportId;
}

/** All provinces owned by a faction */
export function getProvincesByFaction(factionId) {
  return [...state.provinces.values()].filter(p => p.ownerId === factionId);
}

/** Main settlement provinces for a faction */
export function getCapitals(factionId) {
  return getProvincesByFaction(factionId).filter(p => p.isCapital);
}

/** Armies belonging to a faction */
export function getArmiesByFaction(factionId) {
  return [...state.armies.values()].filter(a => a.factionId === factionId);
}

// ─── Militia helpers ─────────────────────────────────────

/**
 * Compute maximum militia count for a province.
 * Flat base of 3 + militiaBonus from all installed buildings + faction tech bonus.
 */
export function computeMilitiaMax(province) {
  if (province.isOcean) return 0;
  let total = 3;
  for (const loc of province.locations) {
    for (const b of loc.buildings) {
      const bDef = BUILDING_MAP[b.buildingId];
      total += bDef?.militiaBonus ?? 0;
    }
  }
  const fs = state.factions.get(province.ownerId);
  total += fs?.globalMilitiaBonus ?? 0;
  return total;
}

// ─── Resource helpers ─────────────────────────────────────

/**
 * Add resources to a faction. Pass negative amounts to deduct.
 * Clamps to 0 minimum.
 */
export function addResources(factionId, delta) {
  const fs = state.factions.get(factionId);
  if (!fs) return;
  for (const [res, amt] of Object.entries(delta)) {
    fs.resources[res] = Math.max(0, (fs.resources[res] ?? 0) + amt);
  }
}

/** Check if a faction can afford a cost object */
export function canAfford(factionId, cost) {
  const fs = state.factions.get(factionId);
  if (!fs) return false;
  return Object.entries(cost).every(([res, amt]) => (fs.resources[res] ?? 0) >= amt);
}

/**
 * Roll a random treasure reward:
 *   Always:  30–100 gold
 *   50%:     5–15 primary faction resource
 *   25%:     Ancient Scrolls — 20–50 research (hefty bonus)
 * Adds directly to faction resources and returns the gain object for display.
 */
export function rollTreasure(factionId, provinceId) {
  const gold = 30 + Math.floor(Math.random() * 71);
  const gain = { gold };
  if (Math.random() < 0.5) {
    const fDef = FACTION_MAP[factionId];
    if (fDef?.resources?.basic?.id) {
      gain[fDef.resources.basic.id] = 5 + Math.floor(Math.random() * 11);
    }
  }
  if (Math.random() < 0.25) {
    gain.research = 20 + Math.floor(Math.random() * 31);
  }
  addResources(factionId, gain);
  return gain;
}

/** Deduct resources. Returns false if cannot afford (does not deduct). */
export function spendResources(factionId, cost) {
  if (!canAfford(factionId, cost)) return false;
  addResources(factionId, Object.fromEntries(
    Object.entries(cost).map(([res, amt]) => [res, -amt])
  ));
  return true;
}

// ─── Province ownership ───────────────────────────────────

/** Transfer a province to a new owner. Clears all pending production queues. */
export function captureProvince(provinceId, newOwnerId) {
  const province = getProvince(provinceId);
  if (!province) return;
  if (province.isOcean) return;   // ocean cannot be captured

  // Set ownership first — lifecycle hooks read province.ownerId
  province.ownerId = newOwnerId;
  // Clear queued production — the previous owner's builds/units should not
  // complete for the new owner.
  province.productionQueue = [];

  // Discard all pending status effects — they belonged to the previous occupant.
  // onRemove is NOT called here; coreOf updates only happen when effects expire naturally
  // (via tickProvinceStatuses) to avoid incorrectly assigning coreOf mid-conquest.
  province.statusEffects = [];

  // Apply new_conquest penalty unless the new owner is re-taking their own core province
  if (province.coreOf !== newOwnerId) {
    const def = PROVINCE_STATUS_MAP['new_conquest'];
    const effect = { type: 'new_conquest', turnsRemaining: 10 };
    province.statusEffects.push(effect);
    def?.onApply?.(province, state);
  }
}

// ─── Army placement ───────────────────────────────────────

/** Register a new army in state and link it to its province. */
export function placeArmy(army) {
  state.armies.set(army.id, army);
  const prov = getProvince(army.provinceId);
  if (prov && !prov.armyIds.includes(army.id)) prov.armyIds.push(army.id);
}

/** Remove an army from state (after it's destroyed or merged). */
export function removeArmy(armyId) {
  const army = state.armies.get(armyId);
  if (!army) return;
  const prov = getProvince(army.provinceId);
  if (prov) prov.armyIds = prov.armyIds.filter(id => id !== armyId);
  state.armies.delete(armyId);
  if (state.selectedArmyId === armyId) state.selectedArmyId = null;
  if (state.movingArmyId  === armyId) state.movingArmyId   = null;
}

/** Move army to a new province (no combat — pure relocation). */
export function moveArmy(armyId, targetProvinceId) {
  const army = state.armies.get(armyId);
  if (!army) return;

  // Unlink from old province
  const oldProv = getProvince(army.provinceId);
  if (oldProv) oldProv.armyIds = oldProv.armyIds.filter(id => id !== armyId);

  // Link to new province
  army.provinceId = targetProvinceId;
  army.movesLeft = Math.max(0, army.movesLeft - 1);
  markArmyMoved(army);
  const newProv = getProvince(targetProvinceId);
  if (newProv && !newProv.armyIds.includes(armyId)) newProv.armyIds.push(armyId);
}

/**
 * Merge absorbArmy into keepArmy (same province required).
 * Returns false if combined unit count would exceed supply cap.
 */
export function mergeArmies(keepArmyId, absorbArmyId) {
  const keepArmy   = state.armies.get(keepArmyId);
  const absorbArmy = state.armies.get(absorbArmyId);
  if (!keepArmy || !absorbArmy) return false;
  if (keepArmy.provinceId !== absorbArmy.provinceId) return false;

  const cap = getArmySupplyCap(keepArmy.factionId);
  const combinedSize = armyTotalCount(keepArmy) + armyTotalCount(absorbArmy);
  if (combinedSize > cap) return false;

  for (const { typeId, count } of [...absorbArmy.units]) {
    if (count > 0) transferActiveUnits(absorbArmy, keepArmy, typeId, count, UNIT_MAP);
  }
  for (const { typeId, count } of [...(absorbArmy.wounded ?? [])]) {
    if (count > 0) transferWoundedUnits(absorbArmy, keepArmy, typeId, count, UNIT_MAP);
  }

  recalcArmyMoves(keepArmy, UNIT_MAP);

  removeArmy(absorbArmyId);
  return true;
}

/**
 * Split army: peel off splitUnits into a new army in the same province.
 * splitUnits is [{ typeId, count }] — must be ≤ available counts.
 * Returns the new army, or null on validation failure.
 */
export function splitArmy(armyId, splitUnits) {
  const army = state.armies.get(armyId);
  if (!army) return null;

  // Validate: enough active units available
  for (const { typeId, count } of splitUnits) {
    const stack = army.units.find(u => u.typeId === typeId);
    if (!stack || stack.count < count) return null;
  }
  // Validate: original army won't be left empty
  const totalSplit = splitUnits.reduce((s, u) => s + u.count, 0);
  const totalArmy  = army.units.reduce((s, u) => s + u.count, 0);
  if (totalSplit >= totalArmy) return null;
  if (totalSplit < 1) return null;

  // Create new army in the same province (can't move this turn)
  const newArmy = createArmy(army.factionId, army.provinceId, []);
  for (const { typeId, count } of splitUnits) {
    const ok = transferActiveUnits(army, newArmy, typeId, count, UNIT_MAP);
    if (!ok) return null;
  }
  newArmy.movesLeft = 0;
  placeArmy(newArmy);
  recalcArmyMoves(army, UNIT_MAP);
  recalcArmyMoves(newArmy, UNIT_MAP);
  return newArmy;
}

/**
 * Transfer `count` healthy units of `typeId` from one army to another in the same province.
 * Source army must retain at least 1 total unit.
 * Returns false on any validation failure.
 */
export function transferUnit(fromArmyId, toArmyId, typeId, count = 1) {
  const from = state.armies.get(fromArmyId);
  const to   = state.armies.get(toArmyId);
  if (!from || !to) return false;
  if (from.provinceId !== to.provinceId) return false;

  const fromStack = from.units.find(u => u.typeId === typeId);
  if (!fromStack || fromStack.count < count) return false;

  // Destination supply cap check
  const cap     = getArmySupplyCap(to.factionId);
  const totalTo = armyTotalCount(to);
  if (totalTo + count > cap) return false;

  // Transfer active units with HP preserved
  const ok = transferActiveUnits(from, to, typeId, count, UNIT_MAP);
  if (!ok) return false;

  // If the source army is now empty, remove it
  const remainingUnits = from.units.reduce((s, u) => s + u.count, 0)
                       + (from.wounded ?? []).reduce((s, u) => s + u.count, 0);
  if (remainingUnits === 0) removeArmy(fromArmyId);

  return true;
}

// ─── Research helpers ─────────────────────────────────────

/** Get the actual cost to unlock a tech for a faction (base * multiplier, rounded up). */
export function getEffectiveTechCost(factionId, baseCost) {
  const fs = state.factions.get(factionId);
  return Math.ceil(baseCost * (fs?.researchCostMultiplier ?? 1.0));
}

/**
 * Unlock a technology for a faction.
 * Spends research, updates faction tech state, and fires 'technology-researched' event.
 * Returns true on success, false if cannot afford or tech already unlocked.
 */
export function unlockTech(factionId, techId) {
  const techDef = TECH_MAP[techId];
  if (!techDef) return false;

  const fs = getFaction(factionId);
  if (!fs) return false;
  if (fs.unlockedTechs.includes(techId)) return false;

  const cost = getEffectiveTechCost(factionId, techDef.baseCost);
  if (!canAfford(factionId, { research: cost })) return false;

  spendResources(factionId, { research: cost });
  fs.unlockedTechs.push(techId);
  fs.researchCostMultiplier = parseFloat((fs.researchCostMultiplier * 1.03).toFixed(6));
  fs.appliedTechEffects.push(techDef);

  // Apply cached state immediately so event listeners get clean data
  if (techDef.militiaBonus) fs.globalMilitiaBonus += techDef.militiaBonus;

  document.dispatchEvent(new CustomEvent('technology-researched', {
    detail: { factionId, techId, techDef },
  }));
  return true;
}

// ─── Elimination check ────────────────────────────────────

/**
 * Check if any faction has been eliminated (lost all capitals).
 * Updates state.eliminated and state.winner.
 * Returns the newly eliminated faction ids (if any).
 */
export function checkElimination() {
  const newlyEliminated = [];

  for (const faction of FACTIONS) {
    if (state.eliminated.has(faction.id)) continue;
    const capitals = getCapitals(faction.id);
    if (capitals.length === 0) {
      state.eliminated.add(faction.id);
      const fs = state.factions.get(faction.id);
      if (fs) fs.isEliminated = true;
      newlyEliminated.push(faction.id);
    }
  }

  // Check for winner: only one non-eliminated faction remains
  const surviving = FACTIONS.filter(f => !state.eliminated.has(f.id));
  if (surviving.length === 1) {
    state.winner = surviving[0].id;
  }

  return newlyEliminated;
}

// ─── Selection helpers (UI) ───────────────────────────────

export function selectProvince(provinceId) {
  state.selectedProvinceId = provinceId;
  state.selectedArmyId = null;
}

export function selectArmy(armyId) {
  state.selectedArmyId = armyId;
}

export function clearSelection() {
  state.selectedProvinceId = null;
  state.selectedArmyId = null;
  state.movingArmyId = null;
}

export function startArmyMove(armyId) {
  state.movingArmyId = armyId;
}

export function cancelArmyMove() {
  state.movingArmyId = null;
}
