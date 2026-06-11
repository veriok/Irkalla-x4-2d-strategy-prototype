/**
 * effect-resolver.js
 *
 * Central aggregator for passive game effects.
 *
 * collectEffectsForScope(scope, context) gathers every passive effect for
 * the requested scope from all active sources — faction base, techs, army
 * statuses, hero skills/artifacts, buildings, province statuses, governor.
 *
 * Callers compose multiple scope calls for top-down resolution:
 *   province income  → FACTION + PROVINCE
 *   unit stats       → FACTION + ARMY  (+ direct UNIT reads in tech-effects.js)
 *   hero stats/mana  → HERO
 *
 * @param {string} scope   — EFFECT_SCOPES value
 * @param {object} context — {
 *   factionState?  faction runtime state (has .id, .appliedTechEffects, .heroes)
 *   army?          army instance (has .heroId, .units, .statusEffects)
 *   province?      province instance (has .locations, .statusEffects, .governorId)
 *   hero?          hero instance (used for HERO scope)
 *   typeId?        unit type id (used for UNIT scope)
 * }
 * @returns {object[]}  array of effect objects matching the scope
 */

import { EFFECT_SCOPES } from '../data/enums.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { HERO_SKILL_MAP } from '../data/hero-skills-data.js';
import { ARTIFACT_MAP } from '../data/artifacts-data.js';
import { PROVINCE_STATUS_MAP } from '../data/province-status-data.js';
import { ARMY_STATUS_MAP } from '../data/army-status-data.js';
import { BUILDING_MAP } from '../data/buildings-data.js';
import { TRAIT_MAP } from '../data/traits-data.js';
import { UNIT_MAP } from '../data/units-data.js';

export function collectEffectsForScope(scope, context) {
  const out = [];
  const { factionState, army, province, hero, typeId } = context;

  // ── FACTION-level sources ──────────────────────────────────
  if (factionState) {
    // Faction definition base effects (e.g. CLANS_FIRST_SCALE build cost modifiers)
    const factionDef = FACTION_MAP[factionState.id];
    for (const eff of (factionDef?.effects ?? []))
      if (eff.scope === scope) out.push(eff);

    // Applied tech effects (all unlocked techs concatenated into one array)
    for (const techDef of (factionState.appliedTechEffects ?? []))
      for (const eff of (techDef.effects ?? []))
        if (eff.scope === scope) out.push(eff);
  }

  // ── ARMY-level sources ─────────────────────────────────────
  if (army) {
    // Army status effects (code_of_honor, rune buffs, etc.)
    for (const se of (army.statusEffects ?? [])) {
      const def = ARMY_STATUS_MAP[se.type];
      for (const eff of (def?.effects ?? []))
        if (eff.scope === scope) out.push(eff);
    }

    // Hero skills and artifacts (resolve via factionState to avoid stale references)
    const leader = factionState?.heroes?.find(h => h.id === army.heroId);
    if (leader) {
      for (const { skillId, tier } of (leader.skills ?? [])) {
        const tierDef = HERO_SKILL_MAP[skillId]?.tiers.find(t => t.tier === tier);
        for (const eff of (tierDef?.effects ?? []))
          if (eff.scope === scope) out.push(eff);
      }
      for (const artId of Object.values(leader.artifacts ?? {})) {
        if (!artId) continue;
        for (const eff of (ARTIFACT_MAP[artId]?.effects ?? []))
          if (eff.scope === scope) out.push(eff);
      }
    }

    // Unit aura effects — ARMY-scope effects declared on unit type definitions and their traits.
    // Deduplicated per unit type: multiple stacks of the same unit type produce one aura contribution.
    const seenAuraTypes = new Set();
    for (const { typeId: unitTypeId } of (army.units ?? [])) {
      if (seenAuraTypes.has(unitTypeId)) continue;
      seenAuraTypes.add(unitTypeId);
      for (const eff of (UNIT_MAP[unitTypeId]?.effects ?? []))
        if (eff.scope === scope) out.push(eff);
      for (const traitId of (UNIT_MAP[unitTypeId]?.traitIds ?? []))
        for (const eff of (TRAIT_MAP[traitId]?.effects ?? []))
          if (eff.scope === scope) out.push(eff);
    }
  }

  // ── PROVINCE-level sources ─────────────────────────────────
  if (province) {
    // Province status effects (stackable; push _stacks so callers can multiply)
    for (const se of (province.statusEffects ?? [])) {
      const def = PROVINCE_STATUS_MAP[se.type];
      const stacks = se.stacks ?? 1;
      for (const eff of (def?.effects ?? []))
        if (eff.scope === scope) out.push(stacks === 1 ? eff : { ...eff, _stacks: stacks });
    }

    // Buildings across all controllable locations
    for (const loc of (province.locations ?? []))
      for (const b of (loc.buildings ?? []))
        for (const eff of (BUILDING_MAP[b.buildingId]?.effects ?? []))
          if (eff.scope === scope) out.push(eff);

    // Governor hero: province-scoped effects from skills and artifacts.
    // Only active governors (not wounded, not in transit) contribute.
    if (province.governorId && factionState) {
      const gov = factionState.heroes?.find(h => h.id === province.governorId);
      if (gov && gov.woundedFor === 0 && (!gov.assignment || gov.assignment.transitFor === 0)) {
        for (const { skillId, tier } of (gov.skills ?? [])) {
          const tierDef = HERO_SKILL_MAP[skillId]?.tiers.find(t => t.tier === tier);
          for (const eff of (tierDef?.effects ?? []))
            if (eff.scope === scope) out.push(eff);
        }
        for (const artId of Object.values(gov.artifacts ?? {})) {
          if (!artId) continue;
          for (const eff of (ARTIFACT_MAP[artId]?.effects ?? []))
            if (eff.scope === scope) out.push(eff);
        }
      }
    }
  }

  // ── HERO-level sources ─────────────────────────────────────
  // Only active when scope === HERO; the hero entity is the target.
  if (hero && scope === EFFECT_SCOPES.HERO) {
    for (const { skillId, tier } of (hero.skills ?? [])) {
      const tierDef = HERO_SKILL_MAP[skillId]?.tiers.find(t => t.tier === tier);
      for (const eff of (tierDef?.effects ?? []))
        if (eff.scope === scope) out.push(eff);
    }
    for (const artId of Object.values(hero.artifacts ?? {})) {
      if (!artId) continue;
      for (const eff of (ARTIFACT_MAP[artId]?.effects ?? []))
        if (eff.scope === scope) out.push(eff);
    }
  }

  // ── UNIT-level sources ─────────────────────────────────────
  // Direct per-typeId lookup. Not the primary path — tech-effects.js reads
  // these directly with typeId context. Provided for explicit UNIT lookups.
  if (typeId && scope === EFFECT_SCOPES.UNIT) {
    for (const eff of (UNIT_MAP[typeId]?.effects ?? []))
      if (eff.scope === scope) out.push(eff);
    for (const traitId of (UNIT_MAP[typeId]?.traitIds ?? []))
      for (const eff of (TRAIT_MAP[traitId]?.effects ?? []))
        if (eff.scope === scope) out.push(eff);
  }

  return out;
}
