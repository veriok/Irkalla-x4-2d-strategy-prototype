/**
 * hero-engine.js
 *
 * All hero game logic: assignment, recruitment, level-up, skill picks, mana,
 * stat bonus calculation, and wound/transit ticks.
 */

import { HERO_CLASS_MAP, getHeroClassesForFaction } from '../data/hero-classes-data.js';
import { HERO_SKILL_MAP, TIER_ORDER, tierIndex, nextTier } from '../data/hero-skills-data.js';
import { ARTIFACT_MAP } from '../data/artifacts-data.js';
import { createHero, heroMaxMana, XP_THRESHOLDS, MAX_HERO_LEVEL, MAX_HERO_SKILLS } from '../models/hero.js';
import { GAME_EVENTS, HERO_ATTRIBUTES } from '../data/enums.js';
import { HERO_SKILLS } from '../data/hero-skills-data.js';
import { emit } from './game-events.js';
import {
  state, getFaction, getProvince, computeHeroCount, getFactionHero, heroRecruitCost,
} from './game-state.js';

// ─── Active check ────────────────────────────────────────

/** True if a hero can contribute bonuses (not wounded, not in transit) */
export function isHeroActive(hero) {
  if (!hero) return false;
  if (hero.woundedFor > 0) return false;
  if (hero.assignment && hero.assignment.transitFor > 0) return false;
  return true;
}

// ─── Assignment ──────────────────────────────────────────

/**
 * Assign a hero to lead an army.
 * If the hero is already assigned somewhere, they enter transit (2 turns).
 * Returns false if hero is wounded.
 */
export function assignHeroToArmy(heroId, armyId, factionId) {
  const fs = getFaction(factionId);
  if (!fs) return false;
  const hero = fs.heroes.find(h => h.id === heroId);
  if (!hero) return false;
  if (hero.woundedFor > 0) return false;

  // Remove hero from any previous assignment target
  _clearPreviousAssignmentTarget(hero);

  hero.assignment = { type: 'army', id: armyId, transitFor: 2 };

  // Update army's heroId only when transit is done — we track it on the hero
  // During transit, the army shows the hero as "in transit"
  const army = state.armies.get(armyId);
  if (army) army.heroId = heroId;

  return true;
}

/**
 * Assign a hero to govern a province.
 * If already assigned, enters transit (2 turns).
 * Returns false if hero is wounded.
 */
export function assignHeroToProvince(heroId, provinceId, factionId) {
  const fs = getFaction(factionId);
  if (!fs) return false;
  const hero = fs.heroes.find(h => h.id === heroId);
  if (!hero) return false;
  if (hero.woundedFor > 0) return false;

  _clearPreviousAssignmentTarget(hero);

  hero.assignment = { type: 'province', id: provinceId, transitFor: 2 };
  const province = getProvince(provinceId);
  if (province) province.governorId = heroId;

  return true;
}

/** Remove a hero from any assignment without wounding them */
export function unassignHero(heroId, factionId) {
  const fs = getFaction(factionId);
  if (!fs) return;
  const hero = fs.heroes.find(h => h.id === heroId);
  if (!hero || !hero.assignment) return;
  _clearPreviousAssignmentTarget(hero);
  hero.assignment = null;
}

/** Clear the target entity's hero reference for the current assignment */
function _clearPreviousAssignmentTarget(hero) {
  if (!hero.assignment) return;
  if (hero.assignment.type === 'army') {
    const army = state.armies.get(hero.assignment.id);
    if (army && army.heroId === hero.id) army.heroId = null;
  } else if (hero.assignment.type === 'province') {
    const province = getProvince(hero.assignment.id);
    if (province && province.governorId === hero.id) province.governorId = null;
  }
}

/**
 * Wound a hero (army defeated). Hero is auto-unassigned and unavailable for N turns.
 */
export function woundHero(heroId, factionId) {
  const fs = getFaction(factionId);
  if (!fs) return;
  const hero = fs.heroes.find(h => h.id === heroId);
  if (!hero) return;
  _clearPreviousAssignmentTarget(hero);
  hero.assignment = null;
  const baseWound = 3 + Math.floor(Math.random() * 4); // 3-6 turns
  hero.woundedFor = Math.max(1, baseWound - _getHeroWoundReduction(hero));
  emit(GAME_EVENTS.HERO_WOUNDED, { factionId, hero });
}

/**
 * Permanently remove a hero from a faction (kick/dismiss).
 * Returns their artifacts to the faction pool.
 */
export function dismissHero(heroId, factionId) {
  const fs = getFaction(factionId);
  if (!fs) return false;
  const idx = fs.heroes.findIndex(h => h.id === heroId);
  if (idx < 0) return false;
  const hero = fs.heroes[idx];

  _clearPreviousAssignmentTarget(hero);

  // Return equipped artifacts to faction pool
  for (const slot of ['weapon', 'armor', 'accessory1', 'accessory2']) {
    const artId = hero.artifacts[slot];
    if (artId) fs.artifacts.push({ instanceId: `art_${Date.now()}_${slot}`, artifactId: artId });
  }

  fs.heroes.splice(idx, 1);
  return true;
}

// ─── Recruitment ─────────────────────────────────────────

/**
 * Recruit the faction's pending hero.
 * Spends gold and adds the hero to the faction's roster.
 * Returns false if cannot afford or heroCount is full.
 */
export function recruitPendingHero(factionId) {
  const fs = getFaction(factionId);
  if (!fs || !fs.pendingHero) return false;

  const maxHeroes = computeHeroCount(factionId);
  if (fs.heroes.length >= maxHeroes) return false;

  const cost = heroRecruitCost(factionId);
  if ((fs.resources.gold ?? 0) < cost) return false;

  fs.resources.gold -= cost;

  const hero = fs.pendingHero.hero;
  fs.heroes.push(hero);
  fs.pendingHero = null;

  return true;
}

/**
 * Give a hero their starting skill.
 * If the class defines startingSkill, that skill is always granted at novice.
 * Otherwise a single skill is picked via attribute-weighted random from the pool
 * (no required/spellbook gates — it's the very first skill).
 */
export function addRandomStartingSkill(hero, classDef) {
  if (classDef?.startingSkill) {
    hero.skills.push({ skillId: classDef.startingSkill, tier: 'novice' });
    return;
  }

  // Build attribute-weighted pool for martial heroes
  const pool = [];
  for (const skill of HERO_SKILLS) {
    if (skill.required) continue; // skip skills that need a prerequisite
    const weight = skill.attribute != null
      ? (classDef?.statWeights?.[skill.attribute] ?? 0)
      : 10;
    if (weight <= 0) continue;
    pool.push({ skillId: skill.id, weight });
  }

  if (pool.length === 0) return;

  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) { hero.skills.push({ skillId: p.skillId, tier: 'novice' }); return; }
  }
  hero.skills.push({ skillId: pool[0].skillId, tier: 'novice' }); // fallback
}

/**
 * Generate a new pending hero for a faction.
 * Picks randomly between the faction's two hero classes.
 * Called on game start and every 5 turns when the current one expires.
 */
export function rotatePendingHero(factionId, currentTurn) {
  const fs = getFaction(factionId);
  if (!fs) return;

  const classes = getHeroClassesForFaction(factionId);
  if (classes.length === 0) return;

  const classId = classes[Math.floor(Math.random() * classes.length)].id;
  const classDef = HERO_CLASS_MAP[classId];
  const hero = createHero(classId, factionId);
  addRandomStartingSkill(hero, classDef);

  const cost = heroRecruitCost(factionId);
  fs.pendingHero = {
    hero,
    cost: { gold: cost },
    expiresOn: currentTurn + 5,
  };
}

// ─── XP & Level-Up ───────────────────────────────────────

/**
 * Add XP to a hero. Sets pendingLevelUp if threshold crossed.
 * Returns true if level-up was triggered.
 */
export function addHeroExperience(hero, xp) {
  if (hero.level >= MAX_HERO_LEVEL) return false;
  hero.experience += xp;
  const threshold = XP_THRESHOLDS[hero.level]; // index = current level = XP needed for level+1
  if (hero.experience >= threshold) {
    if (!hero.pendingLevelUp) {
      hero.pendingLevelUp = true;
      emit(GAME_EVENTS.HERO_CAN_LEVEL, {
        factionId: hero.factionId,
        heroId:    hero.id,
        heroName:  hero.name,
        newLevel:  hero.level + 1,
      });
    }
    return true;
  }
  return false;
}

/**
 * Generate 3 skill choices for a level-up pick.
 * Rules:
 *  - If hero has < 5 skills: can offer new skills OR upgrades to existing ones
 *  - If hero has 5 skills: can only offer upgrades to existing skills that aren't master yet
 *  - Weight per skill = class.statWeights[skill.attribute] (or 10 if attribute is null)
 *  - Skills in class.blockedSkills are never offered
 *  - Skills with a required prerequisite are only offered if the hero already has it
 *  - Magic school skills are only offered if the faction has ≥1 spellbook for that school
 *  - Deduplicates choices
 */
export function generateSkillChoices(hero) {
  const classDef = HERO_CLASS_MAP[hero.classId];
  if (!classDef) return [];

  const fs = getFaction(hero.factionId);
  const spellbooks = fs?.spellbooks ?? {};
  const blockedSkills = new Set(classDef.blockedSkills ?? []);
  const existingSkillMap = Object.fromEntries(hero.skills.map(s => [s.skillId, s.tier]));
  const learnedSkillIds = new Set(hero.skills.map(s => s.skillId));
  const skillsFull = hero.skills.length >= MAX_HERO_SKILLS;

  // Build weighted pool from all skills
  const pool = [];
  for (const skill of HERO_SKILLS) {
    const skillId = skill.id;

    if (blockedSkills.has(skillId)) continue;
    if (skill.required && !learnedSkillIds.has(skill.required)) continue;
    if (skill.spellbook && (spellbooks[skill.spellbook] ?? 0) < 1) continue;

    const weight = skill.attribute != null
      ? (classDef.statWeights[skill.attribute] ?? 0)
      : 10;
    if (weight <= 0) continue;

    const existing = existingSkillMap[skillId];
    if (existing) {
      if (existing !== 'master') {
        pool.push({ skillId, upgradeTier: nextTier(existing), isUpgrade: true, weight });
      }
    } else if (!skillsFull) {
      pool.push({ skillId, upgradeTier: 'novice', isUpgrade: false, weight });
    }
  }

  if (pool.length === 0) return [];

  const picks = [];
  const usedSkillIds = new Set();

  for (let attempt = 0; attempt < 20 && picks.length < 3; attempt++) {
    const choice = _weightedRandom(pool);
    if (!choice || usedSkillIds.has(choice.skillId)) continue;
    usedSkillIds.add(choice.skillId);
    picks.push(choice);
  }

  return picks;
}

/**
 * Pre-roll and store the stat gain for a pending level-up.
 * Call this when opening the level-up dialog so the stat can be shown to the player.
 * Returns the stat key (e.g. 'atk').
 */
export function previewLevelUpStat(hero) {
  const classDef = HERO_CLASS_MAP[hero.classId];
  if (!classDef) return null;
  if (!hero.pendingStatGain) {
    hero.pendingStatGain = _weightedRandomStat(classDef.statWeights) ?? null;
  }
  return hero.pendingStatGain;
}

/**
 * Apply a level-up: use pre-rolled stat (or roll fresh), apply skill choice.
 * Clears pendingLevelUp. Returns the stat key that was gained.
 */
export function applyLevelUp(hero, skillChoice) {
  const classDef = HERO_CLASS_MAP[hero.classId];
  if (!classDef) return null;

  // Use pre-rolled stat if available (shown to player in dialog), else roll fresh
  const statGainKey = hero.pendingStatGain ?? _weightedRandomStat(classDef.statWeights);
  hero.pendingStatGain = null;

  if (statGainKey && hero.attributes[statGainKey] !== undefined) {
    hero.attributes[statGainKey] += 1;
  }

  // Apply skill choice
  if (skillChoice) {
    const { skillId, upgradeTier, isUpgrade } = skillChoice;
    if (isUpgrade) {
      const existing = hero.skills.find(s => s.skillId === skillId);
      if (existing) existing.tier = upgradeTier;
    } else {
      hero.skills.push({ skillId, tier: 'novice' });
    }
  }

  hero.level = Math.min(MAX_HERO_LEVEL, hero.level + 1);
  hero.pendingLevelUp = false;
  hero.pendingSkillChoices = null;

  // Update mana max (knowledge may have increased)
  const newMax = heroMaxMana(hero);
  if (newMax > (hero.mana ?? 0)) hero.mana = newMax;

  emit(GAME_EVENTS.HERO_LEVELED, {
    factionId: hero.factionId,
    heroId:    hero.id,
    heroName:  hero.name,
    newLevel:  hero.level,
    statGained: statGainKey,
  });

  // If XP already meets the next threshold, queue another level-up immediately.
  if (hero.level < MAX_HERO_LEVEL && hero.experience >= XP_THRESHOLDS[hero.level]) {
    hero.pendingLevelUp = true;
    emit(GAME_EVENTS.HERO_CAN_LEVEL, {
      factionId: hero.factionId,
      heroId:    hero.id,
      heroName:  hero.name,
      newLevel:  hero.level + 1,
    });
  }

  return statGainKey;
}

function _weightedRandom(pool) {
  const totalWeight = pool.reduce((s, p) => s + p.weight, 0);
  if (totalWeight <= 0) return pool[0] ?? null;
  let r = Math.random() * totalWeight;
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return pool[pool.length - 1];
}

function _weightedRandomStat(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [stat, w] of entries) {
    r -= w;
    if (r <= 0) return stat;
  }
  return entries[entries.length - 1]?.[0] ?? null;
}

// ─── Bonus Calculations ───────────────────────────────────

/**
 * Get all army bonuses from a hero (stats + skills + artifacts).
 *
 * Returns:
 * {
 *   flatAtk: number,          — flat attack bonus (hero.attributes.atk * 2%)... applied as percent
 *   flatDef: number,
 *   unitTypeBonuses: [{ unitType, stat, percent }],
 *   allUnitsBonuses: [{ stat, percent }],
 *   movementBonus: number,
 *   fortificationReduction: number,  — percent to reduce enemy fort bonus
 * }
 */
export function getHeroArmyBonuses(hero) {
  if (!hero) return null;

  const result = {
    statAtk: hero.attributes.atk,         // each point → 2% bonus to all army attack
    statDef: hero.attributes.def,         // each point → 2% bonus to all army defense
    statTactics: hero.attributes.tactics,
    unitTypeBonuses: [],
    allUnitsBonuses: [],
    movementBonus: 0,
    fortificationReduction: 0,
    woundChanceBonus: 0,
  };

  for (const { skillId, tier } of hero.skills) {
    const skillDef = HERO_SKILL_MAP[skillId];
    if (!skillDef) continue;
    const tierDef = skillDef.tiers.find(t => t.tier === tier);
    if (!tierDef) continue;
    for (const eff of (tierDef.effects ?? [])) _applySkillEffect(eff, result);
  }

  // Process artifacts
  for (const slot of ['weapon', 'armor', 'accessory1', 'accessory2']) {
    const artId = hero.artifacts[slot];
    if (!artId) continue;
    const artDef = ARTIFACT_MAP[artId];
    if (!artDef) continue;
    for (const eff of (artDef.effects ?? [])) {
      if (eff.type === 'hero_stat_bonus') {
        if (eff.stat === HERO_ATTRIBUTES.ATK) result.statAtk += eff.amount;
        else if (eff.stat === HERO_ATTRIBUTES.DEF) result.statDef += eff.amount;
        else if (eff.stat === HERO_ATTRIBUTES.TACTICS) result.statTactics += eff.amount;
      } else if (eff.type === 'army_unit_type_multi_bonus') {
        result.unitTypeBonuses.push({ unitType: eff.unitType, stat: eff.stat, percent: eff.percent });
      } else if (eff.type === 'army_all_units_multi_bonus') {
        result.allUnitsBonuses.push({ stat: eff.stat, percent: eff.percent });
      } else if (eff.type === 'army_movement_bonus') {
        result.movementBonus += eff.amount;
      }
    }
  }

  return result;
}

function _applySkillEffect(effect, result) {
  switch (effect.type) {
    case 'army_unit_type_multi_bonus':
      result.unitTypeBonuses.push({ unitType: effect.unitType, stat: effect.stat, percent: effect.percent });
      break;
    case 'army_all_units_multi_bonus':
      result.allUnitsBonuses.push({ stat: effect.stat, percent: effect.percent });
      break;
    case 'reduce_fortification_multi':
      result.fortificationReduction += effect.percent;
      break;
    case 'army_movement_bonus':
      result.movementBonus += effect.amount;
      break;
    case 'army_wound_chance':
      result.woundChanceBonus += effect.bonus ?? 0;
      break;
  }
}

/**
 * Get province income bonus percent from a hero's governance stat and skills.
 * Returns a percent value (e.g. 15 = +15%).
 */
export function getHeroProvinceBonuses(hero) {
  if (!hero) return {
    incomePercent: 0, flatGold: 0, buildSpeedBonus: 0,
    buildDiscountPercent: 0, researchPercent: 0,
    defensePercent: 0, militiaBonus: 0,
    unitCostDiscountPercent: 0, unitRecruitSpeedBonus: 0,
  };

  let incomePercent       = hero.attributes.governance * 3; // 3% per governance point
  let flatGold            = 0;
  let buildSpeedBonus     = 0;
  let buildDiscountPercent = 0;
  let researchPercent     = 0;
  let defensePercent      = 0;
  let militiaBonus        = 0;
  let unitCostDiscountPercent = 0;
  let unitRecruitSpeedBonus   = 0;

  for (const { skillId, tier } of hero.skills) {
    const skillDef = HERO_SKILL_MAP[skillId];
    if (!skillDef) continue;
    const tierDef = skillDef.tiers.find(t => t.tier === tier);
    if (!tierDef) continue;
    for (const eff of (tierDef.effects ?? [])) {
      switch (eff.type) {
        case 'province_income_multi':   incomePercent           += eff.percent;  break;
        case 'province_flat_gold':      flatGold                += eff.amount;   break;
        case 'province_build_speed':    buildSpeedBonus         += eff.amount;   break;
        case 'province_build_multi':    buildDiscountPercent    += eff.percent;  break;
        case 'province_research_multi': researchPercent         += eff.percent;  break;
        case 'province_defense_multi':  defensePercent          += eff.percent;  break;
        case 'province_militia_bonus':  militiaBonus            += eff.amount;   break;
        case 'unit_cost_multi':         unitCostDiscountPercent += eff.percent;  break;
        case 'unit_recruit_speed':      unitRecruitSpeedBonus   += eff.amount;   break;
      }
    }
  }

  // Artifact governance bonuses
  for (const slot of ['weapon', 'armor', 'accessory1', 'accessory2']) {
    const artId = hero.artifacts[slot];
    if (!artId) continue;
    const artDef = ARTIFACT_MAP[artId];
    if (!artDef) continue;
    for (const eff of (artDef.effects ?? [])) {
      if (eff.type === 'hero_stat_bonus' && eff.stat === HERO_ATTRIBUTES.GOVERNANCE) {
        incomePercent += eff.amount * 3;
      } else if (eff.type === 'province_income_multi') {
        incomePercent += eff.percent;
      }
    }
  }

  return {
    incomePercent, flatGold, buildSpeedBonus, buildDiscountPercent,
    researchPercent, defensePercent, militiaBonus,
    unitCostDiscountPercent, unitRecruitSpeedBonus,
  };
}

/**
 * Get the max mana for a hero (knowledge * 10 + artifact bonuses).
 */
export function getHeroMaxMana(hero) {
  if (!hero) return 0;
  let max = hero.attributes.knowledge * 10;
  for (const { skillId, tier } of hero.skills) {
    const skillDef = HERO_SKILL_MAP[skillId];
    if (!skillDef) continue;
    const tierDef = skillDef.tiers.find(t => t.tier === tier);
    for (const eff of (tierDef?.effects ?? [])) if (eff.type === 'hero_flat_mana') max += eff.amount;
  }
  for (const slot of ['weapon', 'armor', 'accessory1', 'accessory2']) {
    const artId = hero.artifacts[slot];
    if (!artId) continue;
    const artDef = ARTIFACT_MAP[artId];
    if (!artDef) continue;
    for (const eff of (artDef.effects ?? [])) {
      if (eff.type === 'hero_mana_bonus') max += eff.amount;
    }
  }
  return max;
}

/**
 * Get mana regen per turn for a hero.
 */
export function getHeroManaRegen(hero) {
  if (!hero) return 0;
  let regen = 2 + Math.floor(hero.attributes.knowledge / 10);
  for (const { skillId, tier } of hero.skills) {
    const skillDef = HERO_SKILL_MAP[skillId];
    if (!skillDef) continue;
    const tierDef = skillDef.tiers.find(t => t.tier === tier);
    for (const eff of (tierDef?.effects ?? [])) if (eff.type === 'hero_mana_regen') regen += eff.amount;
  }
  return regen;
}

/**
 * Get the hero's effective spellpower (stat + artifact bonuses).
 */
export function getHeroSpellpower(hero) {
  if (!hero) return 0;
  let sp = hero.attributes.spellpower;
  for (const slot of ['weapon', 'armor', 'accessory1', 'accessory2']) {
    const artId = hero.artifacts[slot];
    if (!artId) continue;
    const artDef = ARTIFACT_MAP[artId];
    if (!artDef) continue;
    for (const eff of (artDef.effects ?? [])) {
      if (eff.type === 'hero_stat_bonus' && eff.stat === HERO_ATTRIBUTES.SPELLPOWER) sp += eff.amount;
    }
  }
  return sp;
}

/**
 * Returns the highest spell school tier a hero has for a given school.
 * Returns 0 if they have no skill in that school.
 */
export function getHeroSchoolTier(hero, schoolId) {
  for (const { skillId, tier } of hero.skills) {
    const skillDef = HERO_SKILL_MAP[skillId];
    if (!skillDef) continue;
    const tierDef = skillDef.tiers.find(t => t.tier === tier);
    for (const eff of (tierDef?.effects ?? [])) {
      if (eff.type === 'hero_spell_school' && eff.schoolId === schoolId) return eff.tier;
    }
  }
  return 0;
}

/**
 * Get all spells a hero can currently cast.
 * Casting requires:
 *  1. The spell is in fs.unlockedSpells (researched).
 *  2. The hero has CHANNELING at a tier >= the spell's tier.
 *  3. The faction has enough spellbooks for the spell's school tier.
 */
export function getHeroCastableSpells(hero, factionId, SPELL_MAP) {
  if (!hero || !SPELL_MAP) return [];
  const fs = getFaction(factionId);
  if (!fs) return [];

  const channelingTier = _getHeroChannelingTier(hero);
  const spellbooks = fs.spellbooks ?? {};

  return Object.values(SPELL_MAP).filter(spell => {
    if (!fs.unlockedSpells.includes(spell.id)) return false;
    if (spell.factionOnly && !spell.factionOnly.includes(factionId)) return false;
    // Tier 0 cantrips bypass channeling requirement entirely
    if (spell.tier === 0) return true;
    if (channelingTier < spell.tier) return false;
    if ((spellbooks[spell.schoolId] ?? 0) < spell.tier) return false;
    return true;
  });
}

/** Returns the casting tier granted by the hero's CHANNELING skill (0 if none). */
function _getHeroChannelingTier(hero) {
  for (const { skillId, tier } of hero.skills) {
    const skillDef = HERO_SKILL_MAP[skillId];
    if (!skillDef) continue;
    const tierDef = skillDef.tiers.find(t => t.tier === tier);
    for (const eff of (tierDef?.effects ?? [])) if (eff.type === 'hero_channeling') return eff.tier;
  }
  return 0;
}

// ─── Artifact equipping ───────────────────────────────────

export function equipArtifact(heroId, slot, artifactInstanceId, factionId) {
  const fs = getFaction(factionId);
  if (!fs) return false;
  const hero = fs.heroes.find(h => h.id === heroId);
  if (!hero) return false;

  const instIdx = fs.artifacts.findIndex(a => a.instanceId === artifactInstanceId);
  if (instIdx < 0) return false;

  const inst = fs.artifacts[instIdx];

  // Return old artifact to pool if slot occupied
  const old = hero.artifacts[slot];
  if (old) fs.artifacts.push({ instanceId: `art_${Date.now()}`, artifactId: old });

  hero.artifacts[slot] = inst.artifactId;
  fs.artifacts.splice(instIdx, 1);
  return true;
}

export function unequipArtifact(heroId, slot, factionId) {
  const fs = getFaction(factionId);
  if (!fs) return false;
  const hero = fs.heroes.find(h => h.id === heroId);
  if (!hero) return false;
  const artId = hero.artifacts[slot];
  if (!artId) return false;

  hero.artifacts[slot] = null;
  fs.artifacts.push({ instanceId: `art_${Date.now()}`, artifactId: artId });
  return true;
}

// ─── Turn ticks ───────────────────────────────────────────

/** Tick all hero wound/transit timers and mana regen for a faction. */
export function tickHeroesForFaction(factionId, currentTurn) {
  const fs = getFaction(factionId);
  if (!fs) return;

  for (const hero of fs.heroes) {
    // Wound tick
    if (hero.woundedFor > 0) {
      hero.woundedFor--;
    }

    // Transit tick — when reaches 0, hero "arrives"
    if (hero.assignment && hero.assignment.transitFor > 0) {
      hero.assignment.transitFor--;
    }

    // Mana regen
    const maxMana = getHeroMaxMana(hero);
    if (hero.mana < maxMana) {
      hero.mana = Math.min(maxMana, hero.mana + getHeroManaRegen(hero));
    }

    // Governor XP (active province assignment only)
    if (hero.assignment?.type === 'province' && hero.assignment.transitFor === 0 && hero.woundedFor === 0) {
      addHeroExperience(hero, 5);
    }
  }

  // Pending hero rotation
  if (fs.pendingHero && fs.pendingHero.expiresOn <= currentTurn) {
    rotatePendingHero(factionId, currentTurn);
  } else if (!fs.pendingHero) {
    rotatePendingHero(factionId, currentTurn);
  }
}

// ─── Game-start hero grant ────────────────────────────────

/**
 * Create a starting hero for a faction and immediately assign them to their starting army
 * (no transit — active from turn 1). Bypasses recruitment cost.
 * Call once per faction after initWorld.
 */
export function grantStartingHero(factionId) {
  const fs = getFaction(factionId);
  if (!fs) return null;

  const classes = getHeroClassesForFaction(factionId);
  if (classes.length === 0) return null;

  const classId = classes[Math.floor(Math.random() * classes.length)].id;
  const classDef = HERO_CLASS_MAP[classId];
  const hero = createHero(classId, factionId);
  addRandomStartingSkill(hero, classDef);

  fs.heroes.push(hero);

  // Find the faction's starting army (the one on their capital)
  const startingArmy = [...state.armies.values()].find(a => a.factionId === factionId);
  if (startingArmy) {
    hero.assignment = { type: 'army', id: startingArmy.id, transitFor: 0 };
    startingArmy.heroId = hero.id;
  }

  return hero;
}

// ─── Wound reduction (Resilient skill) ───────────────────

function _getHeroWoundReduction(hero) {
  let reduction = 0;
  for (const { skillId, tier } of hero.skills) {
    const tierDef = HERO_SKILL_MAP[skillId]?.tiers.find(t => t.tier === tier);
    for (const eff of (tierDef?.effects ?? [])) if (eff.type === 'hero_wound_reduction') reduction += eff.amount;
  }
  return reduction;
}

// ─── Logistics chance (army movement at turn start) ───────

/** Returns the logistics movement chance (0–1) for an army's hero, or 0 if none. */
export function getHeroLogisticsChance(army) {
  if (!army?.heroId) return 0;
  const fs = getFaction(army.factionId);
  const hero = fs?.heroes.find(h => h.id === army.heroId);
  if (!hero || !isHeroActive(hero)) return 0;
  let chance = 0;
  for (const { skillId, tier } of hero.skills) {
    const tierDef = HERO_SKILL_MAP[skillId]?.tiers.find(t => t.tier === tier);
    for (const eff of (tierDef?.effects ?? [])) if (eff.type === 'army_logistics') chance += eff.chance ?? 0;
  }
  return Math.min(1, chance);
}

// ─── Wound chance bonus ───────────────────────────────────

/** Get the wound-instead-of-kill chance bonus (decimal) from the army's hero (First Aid skill). */
export function getHeroWoundChanceBonus(army) {
  if (!army?.heroId) return 0;
  const fs = getFaction(army.factionId);
  const hero = fs?.heroes.find(h => h.id === army.heroId);
  if (!hero || !isHeroActive(hero)) return 0;
  return getHeroArmyBonuses(hero)?.woundChanceBonus ?? 0;
}

// ─── Fortification reduction ──────────────────────────────

/** Get the total fortification reduction percent from the army's hero */
export function getHeroFortificationReduction(army) {
  if (!army?.heroId) return 0;
  const factionId = army.factionId;
  const fs = getFaction(factionId);
  const hero = fs?.heroes.find(h => h.id === army.heroId);
  if (!hero || !isHeroActive(hero)) return 0;
  const bonuses = getHeroArmyBonuses(hero);
  return bonuses?.fortificationReduction ?? 0;
}
