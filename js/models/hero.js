/**
 * hero.js — Hero factory and helpers
 */

import { HERO_CLASS_MAP } from '../data/hero-classes-data.js';

let _nextHeroId = 1;

// XP required to reach each level (index = level - 1, so index 0 = level 1 start)
export const XP_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250, 3850, 4500, 5200, 6000];
export const MAX_HERO_LEVEL = 15;
export const MAX_HERO_SKILLS = 5;

// Name pools by gender
const MALE_NAMES   = ['Grimbold', 'Aldric', 'Varen', 'Torvald', 'Edric', 'Hakon', 'Soren', 'Brennan', 'Caelan', 'Dagan', 'Eron', 'Falkor', 'Gavrin', 'Holt', 'Ivar'];
const FEMALE_NAMES = ['Aelith', 'Brienna', 'Caela', 'Drysi', 'Elara', 'Fyria', 'Gara', 'Helith', 'Isara', 'Jorana', 'Kessa', 'Lyra', 'Myra', 'Nira', 'Oria'];
const NEUTRAL_NAMES = ['Ashveil', 'Brinok', 'Corvus', 'Draleth', 'Eryx', 'Fenix', 'Grael', 'Hex', 'Ixal', 'Jax'];

/** Compute max mana for a hero based on knowledge attribute */
export function heroMaxMana(hero) {
  return hero.attributes.knowledge * 10;
}

/** Compute mana regen per turn (base + knowledge scaling + skill bonus) */
export function heroManaRegen(hero) {
  let regen = 2 + Math.floor(hero.attributes.knowledge / 10);
  for (const skill of hero.skills) {
    if (skill.effectType === 'hero_mana_regen') {
      regen += skill.effectAmount ?? 0;
    }
  }
  return regen;
}

/** XP needed to reach the next level (or Infinity if already max) */
export function xpForNextLevel(level) {
  if (level >= MAX_HERO_LEVEL) return Infinity;
  return XP_THRESHOLDS[level];  // XP_THRESHOLDS[level] is the threshold for level+1
}

/** Total XP accumulated to reach a given level */
export function xpForLevel(level) {
  return XP_THRESHOLDS[Math.max(0, Math.min(level - 1, XP_THRESHOLDS.length - 1))];
}

/**
 * Create a new Hero instance from a class definition.
 * @param {string} classId   - HERO_CLASS_IDS value
 * @param {string} factionId - owning faction
 * @param {object} [opts]    - optional overrides { name, gender }
 */
export function createHero(classId, factionId, opts = {}) {
  const classDef = HERO_CLASS_MAP[classId];
  if (!classDef) throw new Error(`Unknown hero class: ${classId}`);

  const gender = opts.gender ?? _randomGender();
  const name   = opts.name   ?? _randomName(gender);

  const hero = {
    id:         `hero_${_nextHeroId++}`,
    name,
    gender,
    classId,
    factionId,
    level:              1,
    experience:         0,
    attributes:         { ...classDef.baseAttributes },
    skills:             [],           // [{ skillId, tier: 'novice'|'expert'|'master' }]
    artifacts:          { weapon: null, armor: null, accessory1: null, accessory2: null },
    mana:               classDef.baseAttributes.knowledge * 10,
    woundedFor:         0,
    assignment:         null,         // { type: 'army'|'province', id, transitFor }
    pendingLevelUp:     false,
    pendingSkillChoices: null,        // [{ skillId, upgradeTier|null }] — 3 choices
    combatSpellQueue:   [],           // [{ spellId, condition: 'always'|'if_not_weaker' }]
    spellCondition:     'always',     // global condition fallback
    spriteKey:          `${classId}_1`,
  };

  // Set initial mana to max
  hero.mana = heroMaxMana(hero);

  return hero;
}

function _randomGender() {
  const r = Math.random();
  if (r < 0.48) return 'male';
  if (r < 0.96) return 'female';
  return 'unknown';
}

function _randomName(gender) {
  let pool;
  if (gender === 'male')    pool = MALE_NAMES;
  else if (gender === 'female') pool = FEMALE_NAMES;
  else                      pool = NEUTRAL_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Gender display emoji */
export function heroGenderEmoji(hero) {
  if (hero.gender === 'male')   return '♂';
  if (hero.gender === 'female') return '♀';
  return '⚬';
}
