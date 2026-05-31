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
import { BUILDING_MAP } from '../data/buildings-data.js';
import { UNIT_MAP } from '../data/units-data.js';
import { createProvince } from '../models/province.js';
import { createArmy } from '../models/army.js';

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

  factions:  new Map(),    // factionId → factionState
  provinces: new Map(),    // provinceId → province
  armies:    new Map(),    // armyId → army
};

// ─── Faction state factory ────────────────────────────────
function createFactionState(faction) {
  // Build starting resource object from faction definition
  const resources = { gold: 50 };   // everyone starts with 50 gold
  for (const adv of faction.resources.advanced) {
    resources[adv.id] = 20;
  }
  return {
    id:        faction.id,
    resources,
    isAI:      true,         // overridden for player faction during init
    isEliminated: false,
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
  for (const province of state.provinces.values()) {
    if (province.ownerId !== 'neutral' && !province.isCapital) {
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
      province.armyId = army.id;
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

  // Initialise militia for all provinces (after buildings are installed)
  for (const province of state.provinces.values()) {
    const max = computeMilitiaMax(province);
    province.militia = { current: max, lastCombatTurn: null };
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

/** Base militia per location type */
const MILITIA_BASE = {
  main_settlement: 2,
  village:         1,
  fort:            3,
  shrine:          1,
  ruins:           0,
  monster_den:     0,
};

/**
 * Compute maximum militia count for a province.
 * Sums location-type base + militiaBonus from installed buildings.
 */
export function computeMilitiaMax(province) {
  let total = 0;
  for (const loc of province.locations) {
    total += MILITIA_BASE[loc.type] ?? 0;
    for (const b of loc.buildings) {
      const bDef = BUILDING_MAP[b.buildingId];
      total += bDef?.militiaBonus ?? 0;
    }
  }
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
  province.ownerId = newOwnerId;
  // Clear queued production — the previous owner's builds/units should not
  // complete for the new owner.
  for (const loc of province.locations) {
    loc.productionQueue = [];
  }
}

// ─── Army placement ───────────────────────────────────────

/** Register a new army in state and link it to its province. */
export function placeArmy(army) {
  state.armies.set(army.id, army);
  const prov = getProvince(army.provinceId);
  if (prov) prov.armyId = army.id;
}

/** Remove an army from state (after it's destroyed or merged). */
export function removeArmy(armyId) {
  const army = state.armies.get(armyId);
  if (!army) return;
  const prov = getProvince(army.provinceId);
  if (prov && prov.armyId === armyId) prov.armyId = null;
  state.armies.delete(armyId);
}

/** Move army to a new province (no combat — pure relocation). */
export function moveArmy(armyId, targetProvinceId) {
  const army = state.armies.get(armyId);
  if (!army) return;

  // Unlink from old province
  const oldProv = getProvince(army.provinceId);
  if (oldProv && oldProv.armyId === armyId) oldProv.armyId = null;

  // Link to new province
  army.provinceId = targetProvinceId;
  army.movesLeft--;
  const newProv = getProvince(targetProvinceId);
  if (newProv) newProv.armyId = armyId;
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
