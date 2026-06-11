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
import { UNIT_TYPES, UNIT_TAGS, EFFECT_TYPES, EFFECT_SCOPES } from '../data/enums.js';
import { TRAIT_MAP } from '../data/traits-data.js';
import { ARMY_STATUS_MAP } from '../data/army-status-data.js';
import { isHeroActive, getHeroArmyBonuses } from './hero-engine.js';
import { collectEffectsForScope } from './effect-resolver.js';

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
    // 1. Tech unit stat bonuses (STAT_MODIFIER_UNIT_TYPE at ARMY scope)
    const fs = getFaction(factionId);
    if (fs) {
      for (const eff of collectEffectsForScope(EFFECT_SCOPES.ARMY, { factionState: fs })) {
        if (eff.type !== EFFECT_TYPES.STAT_MODIFIER_UNIT_TYPE) continue;
        const matchesId   = eff.unitId   === typeId;
        const matchesType = eff.unitType && (eff.unitType === UNIT_TYPES.ALL || base?.unitType === eff.unitType);
        if (matchesId || matchesType) {
          if (eff.stat === 'attack')  attack  += eff.amount ?? 0;
          if (eff.stat === 'defense') defense += eff.amount ?? 0;
        }
      }
    }
  }

  // 2. Unit's own effects (permanent + conditional)
  for (const eff of (base?.effects ?? [])) {
    if (eff.type !== EFFECT_TYPES.STAT_MODIFIER) continue;
    if (!_conditionMet(eff.condition, army)) continue;
    attack  += eff.attack  ?? 0;
    defense += eff.defense ?? 0;
  }

  // 3. Trait stat modifiers on this unit type (e.g. leaderless_construct)
  for (const traitId of (base?.traitIds ?? [])) {
    const trait = TRAIT_MAP[traitId];
    for (const eff of (trait?.effects ?? [])) {
      if (eff.type !== EFFECT_TYPES.STAT_MODIFIER) continue;
      if (!_conditionMet(eff.condition, army)) continue;
      attack  += eff.attack  ?? 0;
      defense += eff.defense ?? 0;
    }
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

  // 5. Army status effects — STAT_MODIFIER_ARMY (e.g. code_of_honor_stance)
  if (army) {
    for (const status of (army.statusEffects ?? [])) {
      const def = ARMY_STATUS_MAP[status.type];
      for (const eff of (def?.effects ?? [])) {
        if (eff.type !== EFFECT_TYPES.STAT_MODIFIER_ARMY) continue;
        attack  += eff.attack  ?? 0;
        defense += eff.defense ?? 0;
      }
    }
  }

  // 6. Aura bonuses from other unit types present in the army.
  //    Iterates over unit types (not individual units) — a type contributes its aura once
  //    regardless of stack size, so 2× drill_masters == 1× drill_master.
  //    Non-stacking auras (e.g. levy boost) are deduplicated: first source wins.
  if (army) {
    const nonStackSeen = new Set();
    for (const { typeId: auraTypeId } of (army.units ?? [])) {
      if (auraTypeId === typeId) continue; // auras never self-apply
      const auraDef = unitMap[auraTypeId];
      for (const traitId of (auraDef?.traitIds ?? [])) {
        const trait = TRAIT_MAP[traitId];
        for (const eff of (trait?.effects ?? [])) {
          if (eff.type === EFFECT_TYPES.ARMY_ATTACK_BONUS) {
            attack += eff.amount ?? 0;
          } else if (eff.type === EFFECT_TYPES.ARMY_LEVY_STAT_BONUS && !nonStackSeen.has(EFFECT_TYPES.ARMY_LEVY_STAT_BONUS)) {
            if ((base?.tagIds ?? []).includes(UNIT_TAGS.LEVY)) {
              nonStackSeen.add(EFFECT_TYPES.ARMY_LEVY_STAT_BONUS);
              attack  += eff.attack  ?? 0;
              defense += eff.defense ?? 0;
            }
          }
        }
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
 * Total effective attack for an army.
 * Aura bonuses are included via getEffectiveUnitStats (step 6).
 */
export function getEffectiveArmyAttack(army, factionId, unitMap) {
  return (army.units ?? []).reduce((total, { typeId, count }) => {
    return total + getEffectiveUnitStats(typeId, factionId, unitMap, army).attack * count;
  }, 0);
}

/**
 * Total effective defense for an army.
 * Aura bonuses are included via getEffectiveUnitStats (step 6).
 */
export function getEffectiveArmyDefense(army, factionId, unitMap) {
  return (army.units ?? []).reduce((total, { typeId, count }) => {
    return total + getEffectiveUnitStats(typeId, factionId, unitMap, army).defense * count;
  }, 0);
}

