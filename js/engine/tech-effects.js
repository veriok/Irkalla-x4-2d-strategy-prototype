/**
 * tech-effects.js
 *
 * Stat resolution — the single place that computes effective unit stats.
 * Reads from all applicable effect sources:
 *   1. Faction's appliedTechEffects (unitStatBonuses)
 *   2. Unit definition's own effects[] (permanent or condition-gated)
 *   3. Army's statusEffects[] (rune bonuses, army-scope statuses)
 *   4. Trait effects (auras, conditions)
 */

import { getFaction, getProvince } from './game-state.js';
import { UNIT_TYPES } from '../data/enums.js';
import { TRAIT_MAP } from '../data/traits-data.js';
import { isHeroActive, getHeroArmyBonuses } from './hero-engine.js';

/**
 * Returns effective attack and defense for a unit type, with all bonuses applied.
 * @param {string}      typeId    — unit type id
 * @param {string|null} factionId — owning faction (null = no bonuses, e.g. monster dens)
 * @param {Object}      unitMap   — UNIT_MAP from units-data.js
 * @param {Object|null} army      — the army this unit belongs to (for condition checks)
 * @returns {{ attack: number, defense: number }}
 */
export function getEffectiveUnitStats(typeId, factionId, unitMap, army = null) {
  const base = unitMap[typeId];
  let attack  = base?.attack  ?? 0;
  let defense = base?.defense ?? 0;

  if (factionId) {
    // 1. Tech unit stat bonuses
    const techEffects = getFaction(factionId)?.appliedTechEffects ?? [];
    for (const eff of techEffects) {
      for (const b of (eff.unitStatBonuses ?? [])) {
        const matchesId   = b.unitId   === typeId;
        const matchesType = b.unitType && (b.unitType === UNIT_TYPES.ALL || base?.unitType === b.unitType);
        if (matchesId || matchesType) {
          if (b.stat === 'attack')  attack  += b.amount;
          if (b.stat === 'defense') defense += b.amount;
        }
      }
    }
  }

  // 2. Unit's own effects (permanent + conditional)
  for (const eff of (base?.effects ?? [])) {
    if (eff.type !== 'stat_modifier') continue;
    if (!_conditionMet(eff.condition, army)) continue;
    attack  += eff.attack  ?? 0;
    defense += eff.defense ?? 0;
  }

  // 3. Trait stat modifiers (e.g. leaderless_construct via trait reference)
  for (const traitId of (base?.traitIds ?? [])) {
    const trait = TRAIT_MAP[traitId];
    const eff = trait?.effect;
    if (!eff || eff.type !== 'stat_modifier') continue;
    if (!_conditionMet(eff.condition, army)) continue;
    attack  += eff.attack  ?? 0;
    defense += eff.defense ?? 0;
  }

  // 4. Hero bonuses from army leader (or province governor if army has no hero)
  {
    const fs = getFaction(factionId);
    let leader = null;
    if (army?.heroId && factionId) {
      leader = fs?.heroes?.find(h => h.id === army.heroId) ?? null;
    } else if (!army?.heroId && army?.provinceId && factionId) {
      // Fall back to province governor for armies defending a governed province
      const prov = getProvince(army.provinceId);
      if (prov?.governorId) {
        leader = fs?.heroes?.find(h => h.id === prov.governorId) ?? null;
      }
    }
    if (leader && isHeroActive(leader)) {
      const bonuses = getHeroArmyBonuses(leader);
      attack  += Math.round(attack  * bonuses.statAtk  * 0.02);
      defense += Math.round(defense * bonuses.statDef   * 0.02);
      const uDef = unitMap[typeId];
      for (const b of bonuses.unitTypeBonuses) {
        if (b.unitType === uDef?.unitType || b.unitType === UNIT_TYPES.ALL) {
          if (b.stat === 'attack')  attack  += Math.round(attack  * b.percent / 100);
          if (b.stat === 'defense') defense += Math.round(defense * b.percent / 100);
        }
      }
      for (const b of bonuses.allUnitsBonuses) {
        if (b.stat === 'attack')  attack  += Math.round(attack  * b.percent / 100);
        if (b.stat === 'defense') defense += Math.round(defense * b.percent / 100);
      }
    }
  }

  // 5. Army status effects targeting this specific unit type
  if (army) {
    for (const status of (army.statusEffects ?? [])) {
      if (status.type === 'unit_type_stat_bonus' && status.unitTypeId === typeId) {
        attack  += status.attack  ?? 0;
        defense += status.defense ?? 0;
      }
      // Army-wide stat modifiers (e.g. code_of_honor_stance)
      for (const eff of (status.effects ?? [])) {
        if (eff.type !== 'stat_modifier') continue;
        attack  += eff.attack  ?? 0;
        defense += eff.defense ?? 0;
      }
    }
  }

  return { attack, defense };
}

/** Evaluate a named condition against the current army state */
function _conditionMet(condition, army) {
  if (!condition) return true;  // no condition = always active
  if (condition === 'army_no_hero') return !army?.heroId;
  return true;  // unknown conditions default to active
}

/**
 * Total effective attack for an army — includes all effect sources and trait auras.
 */
export function getEffectiveArmyAttack(army, factionId, unitMap) {
  const units = army.units ?? [];
  let total = 0;
  for (const { typeId, count } of units) {
    const { attack } = getEffectiveUnitStats(typeId, factionId, unitMap, army);
    total += attack * count;
  }

  // Trait aura bonuses (army_attack_bonus: Sun Priest, Beast Bond, etc.)
  const armyTotal = units.reduce((s, u) => s + u.count, 0);
  for (const { typeId, count } of units) {
    const uDef = unitMap[typeId];
    if (!uDef || count <= 0) continue;
    for (const traitId of (uDef.traitIds ?? [])) {
      const trait = TRAIT_MAP[traitId];
      const eff = trait?.effect;
      if (!eff) continue;
      if (eff.type === 'army_attack_bonus') {
        const others = Math.max(0, armyTotal - count);
        total += others * (eff.amount ?? 0);
      }
      if (eff.type === 'army_levy_stat_bonus') {
        // Grants +atk to levy units in same army (excludes self)
        const levyCount = units
          .filter(u => u.typeId !== typeId && unitMap[u.typeId]?.id?.includes('levy'))
          .reduce((s, u) => s + u.count, 0);
        total += levyCount * (eff.attack ?? 0);
      }
    }
  }

  return total;
}

/**
 * Total effective defense for an army — includes all effect sources and trait auras.
 */
export function getEffectiveArmyDefense(army, factionId, unitMap) {
  const units = army.units ?? [];
  let total = 0;
  for (const { typeId, count } of units) {
    const { defense } = getEffectiveUnitStats(typeId, factionId, unitMap, army);
    total += defense * count;
  }

  // Levy defense aura (drill_master levy_boost_aura)
  for (const { typeId, count } of units) {
    const uDef = unitMap[typeId];
    if (!uDef || count <= 0) continue;
    for (const traitId of (uDef.traitIds ?? [])) {
      const trait = TRAIT_MAP[traitId];
      const eff = trait?.effect;
      if (eff?.type === 'army_levy_stat_bonus') {
        const levyCount = units
          .filter(u => u.typeId !== typeId && unitMap[u.typeId]?.id?.includes('levy'))
          .reduce((s, u) => s + u.count, 0);
        total += levyCount * (eff.defense ?? 0);
      }
    }
  }

  return total;
}

/**
 * Compute the siege expert fortification reduction for an attacking army.
 * Returns a fraction [0, 1] representing how much to multiply defender's fort bonus.
 */
export function getSiegeExpertReduction(army, unitMap) {
  let totalReduction = 0;
  for (const { typeId, count } of (army.units ?? [])) {
    const uDef = unitMap[typeId];
    if (!uDef) continue;
    for (const traitId of (uDef.traitIds ?? [])) {
      const trait = TRAIT_MAP[traitId];
      if (trait?.effect?.type === 'reduce_defender_fortification') {
        totalReduction += (trait.effect.percentPerUnit ?? 0) * count;
      }
    }
  }
  // Returns multiplier: e.g. 20% reduction → 0.8
  return Math.max(0, 1 - totalReduction / 100);
}
