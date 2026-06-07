/**
 * hero-spells-data.js
 *
 * Spell school and spell definitions.
 *
 * Spell shape:
 *   id           — unique SPELL_IDS value
 *   schoolId     — SPELL_SCHOOL_IDS value
 *   tier         — 1 | 2 | 3
 *   name         — display name
 *   icon         — emoji
 *   manaCost     — mana cost to cast
 *   extraCost    — optional { resourceId: amount }
 *   type         — 'combat' | 'province'
 *   targetType   — combat: 'all_enemies'|'random_enemy'|'all_allies'|'random_ally'
 *                  province: 'self'|'any_adjacent_enemy_province'|'any_friendly_province'|'any_adjacent_province'
 *   range        — province spell range in provinces (1 = adjacent only)
 *   effectType   — 'damage' | 'buff' | 'debuff' | 'special'
 *   damageType   — 'damage_all' | 'damage_random' (damage spells)
 *   baseDamage   — base damage (scaled: baseDamage + hero.attributes.spellpower)
 *   buffEffect   — { stat, amount } for buff/debuff spells
 *   provinceEffect — effect object for province spells
 *   craftsArtifact — true for Rune Forge
 *   factionOnly  — FACTION_IDS[] (restrict visibility)
 *   description  — shown in spellbook
 *   effects      — [unspecialized, novice, expert, master] effect objects.
 *                  Engine selects the active tier based on the hero's school skill level.
 *                  All four are identical for now; differentiate in a future pass.
 */

import { SPELL_IDS, SPELL_SCHOOL_IDS, FACTION_IDS } from './enums.js';

// ─── Spell Schools ────────────────────────────────────────

export const SPELL_SCHOOLS = [
  { id: SPELL_SCHOOL_IDS.FIRE,    name: 'Fire Magic',    icon: '🔥', color: '#c0392b' },
  { id: SPELL_SCHOOL_IDS.EARTH,   name: 'Earth Magic',   icon: '🪨', color: '#7d6608' },
  { id: SPELL_SCHOOL_IDS.AIR,     name: 'Air Magic',     icon: '🌪️', color: '#117a65' },
  { id: SPELL_SCHOOL_IDS.ARCANE,  name: 'Arcane Magic',  icon: '✨', color: '#6c3483' },
  { id: SPELL_SCHOOL_IDS.RUNE,    name: 'Rune Magic',    icon: '᚛',  color: '#5d6d7e' },
  { id: SPELL_SCHOOL_IDS.DEATH,   name: 'Death Magic',   icon: '💀', color: '#1c2833' },
  { id: SPELL_SCHOOL_IDS.NATURE,  name: 'Nature Magic',  icon: '🌿', color: '#1e8449' },
  { id: SPELL_SCHOOL_IDS.ANCIENT, name: 'Ancient Magic', icon: '🏺', color: '#935116' },
  { id: SPELL_SCHOOL_IDS.ORDER,   name: 'Order Magic',   icon: '⚖️', color: '#1a5276' },
  { id: SPELL_SCHOOL_IDS.LIGHT,   name: 'Light Magic',   icon: '☀️', color: '#d4ac0d' },
];

export const SPELL_SCHOOL_MAP = Object.fromEntries(SPELL_SCHOOLS.map(s => [s.id, s]));

// ─── Spells ───────────────────────────────────────────────

export const SPELLS = [

  // ═══ Fire Magic ═══════════════════════════════════════════

  {
    id: SPELL_IDS.EMBER_SHOT, schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 1,
    name: 'Ember Shot', icon: '🔥', manaCost: 3,
    type: 'combat', targetType: 'random_enemy',
    effectType: 'damage', damageType: 'damage_random',
    baseDamage: 18,
    description: 'Hurls a searing ember at a random enemy unit, dealing 18+SPW damage.',
    effects: [
      { baseDamage: 18 },
      { baseDamage: 18 },
      { baseDamage: 18 },
      { baseDamage: 18 },
    ],
  },
  {
    id: SPELL_IDS.FIREBALL, schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 2,
    name: 'Fireball', icon: '🔥', manaCost: 5,
    type: 'combat', targetType: 'all_enemies',
    effectType: 'damage', damageType: 'damage_all',
    baseDamage: 12,
    description: 'A roaring fireball engulfs all enemies, dealing 12+SPW damage each.',
    effects: [
      { baseDamage: 12 },
      { baseDamage: 12 },
      { baseDamage: 12 },
      { baseDamage: 12 },
    ],
  },
  {
    id: SPELL_IDS.INFERNO, schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 3,
    name: 'Inferno', icon: '🌋', manaCost: 9,
    type: 'combat', targetType: 'all_enemies',
    effectType: 'damage', damageType: 'damage_all',
    baseDamage: 25,
    description: 'A cataclysmic pillar of fire scorches all enemies for 25+SPW damage.',
    effects: [
      { baseDamage: 25 },
      { baseDamage: 25 },
      { baseDamage: 25 },
      { baseDamage: 25 },
    ],
  },

  // ═══ Earth Magic ══════════════════════════════════════════

  {
    id: SPELL_IDS.STONE_SKIN, schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 1,
    name: 'Stone Skin', icon: '🪨', manaCost: 3,
    type: 'combat', targetType: 'all_allies',
    effectType: 'buff',
    buffEffect: { stat: 'defense', amount: 6 },
    description: 'Hardens the skin of all allied units. Grants +6 defense until combat ends.',
    effects: [
      { stat: 'defense', amount: 6 },
      { stat: 'defense', amount: 6 },
      { stat: 'defense', amount: 6 },
      { stat: 'defense', amount: 6 },
    ],
  },
  {
    id: SPELL_IDS.TREMOR, schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 2,
    name: 'Tremor', icon: '🌊', manaCost: 5,
    type: 'province', targetType: 'any_adjacent_enemy_province', range: 1,
    effectType: 'special',
    provinceEffect: { type: 'income_percent', percent: -15, turnsRemaining: 2, resourceId: 'all' },
    description: 'Shakes the ground in a neighbouring enemy province. Disrupts income by -15% for 2 turns.',
    effects: [
      { type: 'income_percent', percent: -15, turnsRemaining: 2, resourceId: 'all' },
      { type: 'income_percent', percent: -15, turnsRemaining: 2, resourceId: 'all' },
      { type: 'income_percent', percent: -15, turnsRemaining: 2, resourceId: 'all' },
      { type: 'income_percent', percent: -15, turnsRemaining: 2, resourceId: 'all' },
    ],
  },
  {
    id: SPELL_IDS.EARTHQUAKE, schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 3,
    name: 'Earthquake', icon: '💥', manaCost: 9,
    type: 'province', targetType: 'any_adjacent_enemy_province', range: 1,
    effectType: 'special',
    provinceEffect: { type: 'income_percent', percent: -30, turnsRemaining: 3, resourceId: 'all' },
    description: 'A devastating earthquake ravages a neighbouring enemy province, reducing its income by -30% for 3 turns.',
    effects: [
      { type: 'income_percent', percent: -30, turnsRemaining: 3, resourceId: 'all' },
      { type: 'income_percent', percent: -30, turnsRemaining: 3, resourceId: 'all' },
      { type: 'income_percent', percent: -30, turnsRemaining: 3, resourceId: 'all' },
      { type: 'income_percent', percent: -30, turnsRemaining: 3, resourceId: 'all' },
    ],
  },

  // ═══ Air Magic ════════════════════════════════════════════

  {
    id: SPELL_IDS.GUST, schoolId: SPELL_SCHOOL_IDS.AIR, tier: 1,
    name: 'Gust', icon: '💨', manaCost: 3,
    type: 'combat', targetType: 'random_enemy',
    effectType: 'debuff',
    buffEffect: { stat: 'attack', amount: -6 },
    description: 'A cutting gust weakens a random enemy unit. -6 attack until combat ends.',
    effects: [
      { stat: 'attack', amount: -6 },
      { stat: 'attack', amount: -6 },
      { stat: 'attack', amount: -6 },
      { stat: 'attack', amount: -6 },
    ],
  },
  {
    id: SPELL_IDS.LIGHTNING_BOLT, schoolId: SPELL_SCHOOL_IDS.AIR, tier: 2,
    name: 'Lightning Bolt', icon: '⚡', manaCost: 5,
    type: 'combat', targetType: 'random_enemy',
    effectType: 'damage', damageType: 'damage_random',
    baseDamage: 35,
    description: 'A bolt of lightning strikes one random enemy for 35+SPW damage.',
    effects: [
      { baseDamage: 35 },
      { baseDamage: 35 },
      { baseDamage: 35 },
      { baseDamage: 35 },
    ],
  },
  {
    id: SPELL_IDS.CHAIN_LIGHTNING, schoolId: SPELL_SCHOOL_IDS.AIR, tier: 3,
    name: 'Chain Lightning', icon: '⚡', manaCost: 9,
    type: 'combat', targetType: 'random_enemy',
    effectType: 'damage', damageType: 'damage_random',
    baseDamage: 30,
    chains: 3,
    description: 'Lightning arcs between 3 random enemies, dealing 30+SPW to each.',
    effects: [
      { baseDamage: 30, chains: 3 },
      { baseDamage: 30, chains: 3 },
      { baseDamage: 30, chains: 3 },
      { baseDamage: 30, chains: 3 },
    ],
  },

  // ═══ Arcane Magic ═════════════════════════════════════════

  {
    id: SPELL_IDS.ARCANE_BOLT, schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 1,
    name: 'Arcane Bolt', icon: '✨', manaCost: 3,
    type: 'combat', targetType: 'random_enemy',
    effectType: 'damage', damageType: 'damage_random',
    baseDamage: 20,
    description: 'A focused arcane bolt hits a random enemy for 20+SPW damage.',
    effects: [
      { baseDamage: 20 },
      { baseDamage: 20 },
      { baseDamage: 20 },
      { baseDamage: 20 },
    ],
  },
  {
    id: SPELL_IDS.BLINK, schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 2,
    name: 'Blink', icon: '🔀', manaCost: 5,
    type: 'province', targetType: 'any_friendly_province', range: 3,
    effectType: 'special',
    provinceEffect: { type: 'teleport_army' },
    description: "Teleports the hero's army to any friendly province within 3 provinces.",
    effects: [
      { type: 'teleport_army', range: 3 },
      { type: 'teleport_army', range: 3 },
      { type: 'teleport_army', range: 3 },
      { type: 'teleport_army', range: 3 },
    ],
  },
  {
    id: SPELL_IDS.ARCANE_STORM, schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 3,
    name: 'Arcane Storm', icon: '🌌', manaCost: 9,
    type: 'combat', targetType: 'all_enemies',
    effectType: 'damage', damageType: 'damage_all',
    baseDamage: 18,
    description: 'An unstable arcane storm lashes all enemies for 18+SPW damage.',
    effects: [
      { baseDamage: 18 },
      { baseDamage: 18 },
      { baseDamage: 18 },
      { baseDamage: 18 },
    ],
  },

  // ═══ Rune Magic ═══════════════════════════════════════════

  {
    id: SPELL_IDS.RUNE_SHIELD, schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 1,
    name: 'Rune Shield', icon: '᚛', manaCost: 3,
    type: 'combat', targetType: 'all_allies',
    effectType: 'buff',
    buffEffect: { stat: 'defense', amount: 8 },
    description: 'Ancient runes bolster allied defenses. Grants +8 defense until combat ends.',
    effects: [
      { stat: 'defense', amount: 8 },
      { stat: 'defense', amount: 8 },
      { stat: 'defense', amount: 8 },
      { stat: 'defense', amount: 8 },
    ],
  },
  {
    id: SPELL_IDS.RUNE_FORGE, schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 2,
    name: 'Rune Forge', icon: '⚒️', manaCost: 8,
    extraCost: { runes: 25 },
    type: 'province', targetType: 'self',
    effectType: 'special',
    craftsArtifact: true,
    factionOnly: [FACTION_IDS.IRON_FREEHOLDS, FACTION_IDS.KUR_MARGAL],
    description: 'Expend mana and 25 Runes to forge a lesser artifact for the hero.',
    effects: [
      { craftsArtifact: true },
      { craftsArtifact: true },
      { craftsArtifact: true },
      { craftsArtifact: true },
    ],
  },
  {
    id: SPELL_IDS.RUNE_STORM, schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 3,
    name: 'Rune Storm', icon: '⚡', manaCost: 9,
    type: 'combat', targetType: 'all_enemies',
    effectType: 'damage', damageType: 'damage_all',
    baseDamage: 20,
    description: 'A tempest of runic energy hammers all enemies for 20+SPW damage.',
    effects: [
      { baseDamage: 20 },
      { baseDamage: 20 },
      { baseDamage: 20 },
      { baseDamage: 20 },
    ],
  },

  // ═══ Death Magic ══════════════════════════════════════════

  {
    id: SPELL_IDS.CORPSE_RISE, schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 1,
    name: 'Corpse Rise', icon: '💀', manaCost: 3,
    type: 'combat', targetType: 'random_ally',
    effectType: 'buff',
    buffEffect: { stat: 'attack', amount: 8 },
    description: 'Dark energy empowers a random allied unit. +8 attack until combat ends.',
    effects: [
      { stat: 'attack', amount: 8 },
      { stat: 'attack', amount: 8 },
      { stat: 'attack', amount: 8 },
      { stat: 'attack', amount: 8 },
    ],
  },
  {
    id: SPELL_IDS.DEATH_WAIL, schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 2,
    name: 'Death Wail', icon: '👻', manaCost: 5,
    type: 'combat', targetType: 'all_enemies',
    effectType: 'debuff',
    buffEffect: { stat: 'attack', amount: -8 },
    description: 'A spectral shriek terrifies all enemies. -8 attack until combat ends.',
    effects: [
      { stat: 'attack', amount: -8 },
      { stat: 'attack', amount: -8 },
      { stat: 'attack', amount: -8 },
      { stat: 'attack', amount: -8 },
    ],
  },
  {
    id: SPELL_IDS.PLAGUE, schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 3,
    name: 'Plague', icon: '🧟', manaCost: 9,
    type: 'province', targetType: 'any_adjacent_enemy_province', range: 1,
    effectType: 'special',
    provinceEffect: { type: 'income_percent', percent: -25, turnsRemaining: 4, resourceId: 'all' },
    description: 'Unleashes a deadly plague upon a neighbouring enemy province. -25% income for 4 turns.',
    effects: [
      { type: 'income_percent', percent: -25, turnsRemaining: 4, resourceId: 'all' },
      { type: 'income_percent', percent: -25, turnsRemaining: 4, resourceId: 'all' },
      { type: 'income_percent', percent: -25, turnsRemaining: 4, resourceId: 'all' },
      { type: 'income_percent', percent: -25, turnsRemaining: 4, resourceId: 'all' },
    ],
  },

  // ═══ Nature Magic ═════════════════════════════════════════

  {
    id: SPELL_IDS.ENTANGLE, schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 1,
    name: 'Entangle', icon: '🌿', manaCost: 3,
    type: 'combat', targetType: 'all_enemies',
    effectType: 'debuff',
    buffEffect: { stat: 'defense', amount: -5 },
    description: 'Roots and vines snare all enemies. -5 defense until combat ends.',
    effects: [
      { stat: 'defense', amount: -5 },
      { stat: 'defense', amount: -5 },
      { stat: 'defense', amount: -5 },
      { stat: 'defense', amount: -5 },
    ],
  },
  {
    id: SPELL_IDS.REGROWTH, schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 2,
    name: 'Regrowth', icon: '🌱', manaCost: 5,
    type: 'combat', targetType: 'all_allies',
    effectType: 'buff',
    buffEffect: { stat: 'maxHp', amount: 15 },
    description: 'Vital energy flows through allied units. +15 max HP until combat ends.',
    effects: [
      { stat: 'maxHp', amount: 15 },
      { stat: 'maxHp', amount: 15 },
      { stat: 'maxHp', amount: 15 },
      { stat: 'maxHp', amount: 15 },
    ],
  },
  {
    id: SPELL_IDS.CALL_OF_THE_WILD, schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 3,
    name: 'Call of the Wild', icon: '🦅', manaCost: 9,
    type: 'combat', targetType: 'all_allies',
    effectType: 'buff',
    buffEffect: { stat: 'attack', amount: 15 },
    description: 'Ancient wild spirits empower all allies. +15 attack until combat ends.',
    effects: [
      { stat: 'attack', amount: 15 },
      { stat: 'attack', amount: 15 },
      { stat: 'attack', amount: 15 },
      { stat: 'attack', amount: 15 },
    ],
  },

  // ═══ Ancient Magic ════════════════════════════════════════

  {
    id: SPELL_IDS.ANCIENT_CURSE, schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 1,
    name: 'Ancient Curse', icon: '🏺', manaCost: 3,
    type: 'combat', targetType: 'random_enemy',
    effectType: 'debuff',
    buffEffect: { stat: 'attack', amount: -10 },
    description: 'A primordial curse weakens a random enemy unit. -10 attack until combat ends.',
    effects: [
      { stat: 'attack', amount: -10 },
      { stat: 'attack', amount: -10 },
      { stat: 'attack', amount: -10 },
      { stat: 'attack', amount: -10 },
    ],
  },
  {
    id: SPELL_IDS.SANDSTORM, schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 2,
    name: 'Sandstorm', icon: '🌪️', manaCost: 5,
    type: 'combat', targetType: 'all_enemies',
    effectType: 'damage', damageType: 'damage_all',
    baseDamage: 10,
    description: 'A blinding sandstorm lashes all enemies for 10+SPW damage.',
    effects: [
      { baseDamage: 10 },
      { baseDamage: 10 },
      { baseDamage: 10 },
      { baseDamage: 10 },
    ],
  },
  {
    id: SPELL_IDS.ANCESTORS_MIGHT, schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 3,
    name: "Ancestors' Might", icon: '👁️', manaCost: 9,
    type: 'combat', targetType: 'all_allies',
    effectType: 'buff',
    buffEffect: { stat: 'attack', amount: 18 },
    description: "The ancestors' spirits surge through allied ranks. +18 attack until combat ends.",
    effects: [
      { stat: 'attack', amount: 18 },
      { stat: 'attack', amount: 18 },
      { stat: 'attack', amount: 18 },
      { stat: 'attack', amount: 18 },
    ],
  },

  // ═══ Order Magic ══════════════════════════════════════════

  {
    id: SPELL_IDS.RALLY, schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 1,
    name: 'Rally', icon: '⚖️', manaCost: 3,
    type: 'combat', targetType: 'all_allies',
    effectType: 'buff',
    buffEffect: { stat: 'defense', amount: 7 },
    description: 'A commanding shout rallies allies. +7 defense until combat ends.',
    effects: [
      { stat: 'defense', amount: 7 },
      { stat: 'defense', amount: 7 },
      { stat: 'defense', amount: 7 },
      { stat: 'defense', amount: 7 },
    ],
  },
  {
    id: SPELL_IDS.DIVINE_SHIELD, schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 2,
    name: 'Divine Shield', icon: '🛡️', manaCost: 5,
    type: 'combat', targetType: 'all_allies',
    effectType: 'buff',
    buffEffect: { stat: 'defense', amount: 15 },
    description: 'A divine barrier protects all allies. +15 defense until combat ends.',
    effects: [
      { stat: 'defense', amount: 15 },
      { stat: 'defense', amount: 15 },
      { stat: 'defense', amount: 15 },
      { stat: 'defense', amount: 15 },
    ],
  },
  {
    id: SPELL_IDS.HOLY_WRATH, schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 3,
    name: 'Holy Wrath', icon: '✝️', manaCost: 9,
    type: 'combat', targetType: 'all_enemies',
    effectType: 'damage', damageType: 'damage_all',
    baseDamage: 22,
    description: 'Divine judgement smites all enemies for 22+SPW damage.',
    effects: [
      { baseDamage: 22 },
      { baseDamage: 22 },
      { baseDamage: 22 },
      { baseDamage: 22 },
    ],
  },

  // ═══ Light Magic ══════════════════════════════════════════

  {
    id: SPELL_IDS.HEALING_LIGHT, schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 1,
    name: 'Healing Light', icon: '☀️', manaCost: 3,
    type: 'combat', targetType: 'random_ally',
    effectType: 'buff',
    buffEffect: { stat: 'maxHp', amount: 20 },
    description: 'Warm light heals a random ally. +20 max HP until combat ends.',
    effects: [
      { stat: 'maxHp', amount: 20 },
      { stat: 'maxHp', amount: 20 },
      { stat: 'maxHp', amount: 20 },
      { stat: 'maxHp', amount: 20 },
    ],
  },
  {
    id: SPELL_IDS.SMITE, schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 2,
    name: 'Smite', icon: '🌟', manaCost: 5,
    type: 'combat', targetType: 'random_enemy',
    effectType: 'damage', damageType: 'damage_random',
    baseDamage: 40,
    description: 'Holy fire smites a single enemy for 40+SPW damage.',
    effects: [
      { baseDamage: 40 },
      { baseDamage: 40 },
      { baseDamage: 40 },
      { baseDamage: 40 },
    ],
  },
  {
    id: SPELL_IDS.RADIANCE, schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 3,
    name: 'Radiance', icon: '🌞', manaCost: 9,
    type: 'province', targetType: 'self',
    effectType: 'special',
    provinceEffect: { type: 'defense_percent', amount: 20, turnsRemaining: 3 },
    description: 'A divine radiance fortifies the province. +20% defense for 3 turns.',
    effects: [
      { type: 'defense_percent', amount: 20, turnsRemaining: 3 },
      { type: 'defense_percent', amount: 20, turnsRemaining: 3 },
      { type: 'defense_percent', amount: 20, turnsRemaining: 3 },
      { type: 'defense_percent', amount: 20, turnsRemaining: 3 },
    ],
  },
];

export const SPELL_MAP = Object.fromEntries(SPELLS.map(s => [s.id, s]));

/** Get all spells belonging to a school */
export function getSpellsBySchool(schoolId) {
  return SPELLS.filter(s => s.schoolId === schoolId);
}

/** Get spells of a specific tier in a school */
export function getSpellsBySchoolAndTier(schoolId, tier) {
  return SPELLS.filter(s => s.schoolId === schoolId && s.tier === tier);
}
