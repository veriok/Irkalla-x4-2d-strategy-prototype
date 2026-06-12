/**
 * hero-spells-data.js
 *
 * Spell school and spell definitions.
 *
 * Spell shape:
 *   id           — unique SPELL_IDS value
 *   schoolId     — SPELL_SCHOOL_IDS value
 *   tier         — 0 | 1 | 2 | 3  (0 = cantrip, bypasses channeling requirement)
 *   name         — display name
 *   icon         — emoji
 *   manaCost     — mana cost to cast
 *   extraCost    — optional { resourceId: amount }
 *   type         — 'combat' | 'province'
 *   targetType   — default target type for the spell:
 *                  combat:   'all_enemies'|'random_enemy'|'all_allies'|'random_ally'|'lowest_hp_ally'
 *                  province: 'self'|'any_adjacent_enemy_province'|'any_friendly_province'
 *   description  — shown in spellbook
 *
 *   effects      — [no_skill, novice, expert, master] — index = getHeroSchoolTier()
 *                  Simple spell:       plain object  { effectType, baseDamage, stat, amount, chains, ... }
 *                  Multi-effect spell: Array         [{ effectType, targetType, ... }, ...]
 *
 * effectType values:
 *   combat:   'damage'  { baseDamage, chains? }
 *             'buff'    { stat|stats, amount, chains? }  — stats: [{stat,amount}] for multi-stat
 *             'debuff'  { stat, amount, chains? }
 *             'heal'    { amount, canRevive?, chains? }  — canRevive=true targets wounded pool
 *
 *   province: 'army_damage'     { baseDamage }
 *             'army_heal'       { amount }
 *             'army_buff'       { turnsRemaining, effects?:[{type,attack?,defense?}], movementBonus?, woundChanceBonus? }
 *             'income_percent'  { percent, turnsRemaining, resourceId }
 *             'defense_percent' { defensePercent, turnsRemaining }
 *             'research_percent'{ percent, turnsRemaining }
 *             'recruit_penalty' { timeIncrease, turnsRemaining }
 *             'summon'          { unitId|biomeDependent, count }
 *             'teleport'        { range }
 *             'building_damage' { buildingDowngradeChance }
 *             'artifact'        { }
 *
 * Spellpower scaling: Math.floor(value × (1 + spellpower × 0.05))
 *   Applied to: baseDamage, buff/debuff amount (and each stat.amount in stats[])
 *   NOT applied to: chains, turnsRemaining (except province/army_buff duration IS scaled)
 *   Province/army_buff turnsRemaining: scaled at cast time
 *
 * Duplicate-target prevention: keyed on spell.id — a unit cannot be targeted by the same spell twice.
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

// ─── Biome → Summon Animal Mapping ────────────────────────
// Nature T1 Summon Animal resolves to a unit based on province biome.

// Keys match biome IDs from biomes-data.js
export const BIOME_SUMMON_MAP = {
  plains:        'plains_hawk',
  forest:        'forest_wolf',
  mountains:     'mountain_bear',
  hills:         'hill_boar',
  desert:        'desert_scorpion',
  tundra:        'tundra_wolf',
  swamp:         'swamp_serpent',
  coastal:       'coastal_crab',
  // ocean biomes don't host armies; fall back to plains_hawk
  shallow_ocean: 'plains_hawk',
  deep_ocean:    'plains_hawk',
};

// ─── Spells ───────────────────────────────────────────────

export const SPELLS = [

  // ═══ Fire Magic ═══════════════════════════════════════════

  {
    id: SPELL_IDS.SPARK, schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 0,
    name: 'Spark', icon: '✴️', manaCost: 2,
    type: 'combat', targetType: 'random_enemy',
    description: 'Flings a hot spark at a random enemy. Simple but reliable.',
    effects: [
      { effectType: 'damage', baseDamage: 5 },
      { effectType: 'damage', baseDamage: 5 },
      { effectType: 'damage', baseDamage: 6 },
      { effectType: 'damage', baseDamage: 7 },
    ],
  },

  {
    id: SPELL_IDS.EMBER_SHOT, schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 1,
    name: 'Ember Shot', icon: '🔥', manaCost: 5,
    type: 'combat', targetType: 'random_enemy',
    description: 'A focused bolt of fire strikes a random enemy unit.',
    effects: [
      { effectType: 'damage', baseDamage: 8 },
      { effectType: 'damage', baseDamage: 9 },
      { effectType: 'damage', baseDamage: 10 },
      { effectType: 'damage', baseDamage: 11 },
    ],
  },

  {
    id: SPELL_IDS.SCORCHED_EARTH, schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 2,
    name: 'Scorched Earth', icon: '🌋', manaCost: 12,
    type: 'province', targetType: 'any_adjacent_enemy_province',
    description: 'Burns an adjacent enemy province, damaging all armies stationed there.',
    effects: [
      { effectType: 'army_damage', baseDamage: 5 },
      { effectType: 'army_damage', baseDamage: 6 },
      { effectType: 'army_damage', baseDamage: 7 },
      { effectType: 'army_damage', baseDamage: 8 },
    ],
  },

  {
    id: SPELL_IDS.INFERNO, schoolId: SPELL_SCHOOL_IDS.FIRE, tier: 3,
    name: 'Inferno', icon: '🔥', manaCost: 16,
    type: 'combat', targetType: 'all_enemies',
    description: 'A pillar of roaring fire engulfs all enemy units.',
    effects: [
      { effectType: 'damage', baseDamage: 11 },
      { effectType: 'damage', baseDamage: 12 },
      { effectType: 'damage', baseDamage: 13 },
      { effectType: 'damage', baseDamage: 14 },
    ],
  },

  // ═══ Earth Magic ══════════════════════════════════════════

  {
    id: SPELL_IDS.EARTH_MISSILE, schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 0,
    name: 'Earth Missile', icon: '🪨', manaCost: 2,
    type: 'combat', targetType: 'random_enemy',
    description: 'Hurls a chunk of rock at a random enemy.',
    effects: [
      { effectType: 'damage', baseDamage: 5 },
      { effectType: 'damage', baseDamage: 5 },
      { effectType: 'damage', baseDamage: 6 },
      { effectType: 'damage', baseDamage: 7 },
    ],
  },

  {
    id: SPELL_IDS.STONE_SKIN, schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 1,
    name: 'Stone Skin', icon: '🪨', manaCost: 5,
    type: 'combat', targetType: 'random_ally',
    description: 'Hardens the skin of a random ally. Chains to a second unit.',
    effects: [
      { effectType: 'buff', stat: 'defense', amount: 2, chains: 2 },
      { effectType: 'buff', stat: 'defense', amount: 3, chains: 2 },
      { effectType: 'buff', stat: 'defense', amount: 4, chains: 2 },
      { effectType: 'buff', stat: 'defense', amount: 4, chains: 2 },
    ],
  },

  {
    id: SPELL_IDS.EARTHEN_WALL, schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 2,
    name: 'Earthen Wall', icon: '🏔️', manaCost: 9,
    type: 'province', targetType: 'self',
    description: 'Raises earthen fortifications around your province. Boosts defense for 2 turns.',
    effects: [
      { effectType: 'defense_percent', defensePercent: 10, turnsRemaining: 2 },
      { effectType: 'defense_percent', defensePercent: 15, turnsRemaining: 2 },
      { effectType: 'defense_percent', defensePercent: 20, turnsRemaining: 2 },
      { effectType: 'defense_percent', defensePercent: 25, turnsRemaining: 2 },
    ],
  },

  {
    id: SPELL_IDS.EARTHQUAKE, schoolId: SPELL_SCHOOL_IDS.EARTH, tier: 3,
    name: 'Earthquake', icon: '💥', manaCost: 16,
    type: 'province', targetType: 'any_adjacent_enemy_province',
    description: 'A devastating earthquake strikes an adjacent enemy province. Damages all armies and may downgrade buildings.',
    effects: [
      [
        { effectType: 'army_damage', baseDamage: 2 },
        { effectType: 'building_damage', buildingDowngradeChance: 0.05 },
      ],
      [
        { effectType: 'army_damage', baseDamage: 3 },
        { effectType: 'building_damage', buildingDowngradeChance: 0.06 },
      ],
      [
        { effectType: 'army_damage', baseDamage: 4 },
        { effectType: 'building_damage', buildingDowngradeChance: 0.07 },
      ],
      [
        { effectType: 'army_damage', baseDamage: 5 },
        { effectType: 'building_damage', buildingDowngradeChance: 0.08 },
      ],
    ],
  },

  // ═══ Air Magic ════════════════════════════════════════════

  {
    id: SPELL_IDS.WIND_STRIKE, schoolId: SPELL_SCHOOL_IDS.AIR, tier: 0,
    name: 'Wind Strike', icon: '💨', manaCost: 2,
    type: 'combat', targetType: 'random_enemy',
    reach: true,
    description: 'A cutting blast of wind strikes a random enemy.',
    effects: [
      { effectType: 'damage', baseDamage: 4 },
      { effectType: 'damage', baseDamage: 4 },
      { effectType: 'damage', baseDamage: 5 },
      { effectType: 'damage', baseDamage: 6 },
    ],
  },

  {
    id: SPELL_IDS.GUST, schoolId: SPELL_SCHOOL_IDS.AIR, tier: 1,
    name: 'Gust', icon: '💨', manaCost: 5,
    type: 'combat', targetType: 'random_enemy',
    description: 'A biting gust reduces a random enemy\'s attack. Chains to a second at master.',
    effects: [
      { effectType: 'debuff', stat: 'attack', amount: -2, chains: 1 },
      { effectType: 'debuff', stat: 'attack', amount: -3, chains: 1 },
      { effectType: 'debuff', stat: 'attack', amount: -4, chains: 1 },
      { effectType: 'debuff', stat: 'attack', amount: -5, chains: 2 },
    ],
  },

  {
    id: SPELL_IDS.TAILWIND, schoolId: SPELL_SCHOOL_IDS.AIR, tier: 2,
    name: 'Tailwind', icon: '🌬️', manaCost: 9,
    type: 'province', targetType: 'self',
    description: 'Calls a swift tailwind. The army gains +1 movement for 2 turns.',
    effects: [
      { effectType: 'army_buff', movementBonus: 1, turnsRemaining: 2 },
      { effectType: 'army_buff', movementBonus: 1, turnsRemaining: 2 },
      { effectType: 'army_buff', movementBonus: 1, turnsRemaining: 2 },
      { effectType: 'army_buff', movementBonus: 1, turnsRemaining: 3 },
    ],
  },

  {
    id: SPELL_IDS.GUIDED_PROJECTILES, schoolId: SPELL_SCHOOL_IDS.AIR, tier: 2,
    name: 'Guided Projectiles', icon: '🎯', manaCost: 9,
    type: 'province', targetType: 'self',
    replacesSpell: SPELL_IDS.TAILWIND,
    description: 'Enchants the army\'s ranged attacks. Archers gain increased first strike chance for 2 turns.',
    effects: [
      { effectType: 'army_buff', firstStrikeChanceBonus: 0.10, turnsRemaining: 2 },
      { effectType: 'army_buff', firstStrikeChanceBonus: 0.12, turnsRemaining: 2 },
      { effectType: 'army_buff', firstStrikeChanceBonus: 0.15, turnsRemaining: 2 },
      { effectType: 'army_buff', firstStrikeChanceBonus: 0.20, turnsRemaining: 3 },
    ],
  },

  {
    id: SPELL_IDS.CHAIN_LIGHTNING, schoolId: SPELL_SCHOOL_IDS.AIR, tier: 3,
    name: 'Chain Lightning', icon: '⚡', manaCost: 16,
    type: 'combat', targetType: 'random_enemy',
    reach: true,
    description: 'Lightning arcs between multiple random enemies.',
    effects: [
      { effectType: 'damage', baseDamage: 13, chains: 2 },
      { effectType: 'damage', baseDamage: 14, chains: 3 },
      { effectType: 'damage', baseDamage: 15, chains: 4 },
      { effectType: 'damage', baseDamage: 16, chains: 5 },
    ],
  },

  // ═══ Arcane Magic ═════════════════════════════════════════

  {
    id: SPELL_IDS.ARCANE_BOLT, schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 0,
    name: 'Arcane Bolt', icon: '✨', manaCost: 2,
    type: 'combat', targetType: 'random_enemy',
    description: 'A raw burst of arcane energy hits a random enemy.',
    effects: [
      { effectType: 'damage', baseDamage: 5 },
      { effectType: 'damage', baseDamage: 5 },
      { effectType: 'damage', baseDamage: 6 },
      { effectType: 'damage', baseDamage: 7 },
    ],
  },

  {
    id: SPELL_IDS.WISDOM, schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 1,
    name: 'Wisdom', icon: '📜', manaCost: 6,
    type: 'province', targetType: 'self',
    description: 'Arcane insight accelerates your research for 3 turns.',
    effects: [
      { effectType: 'research_percent', percent: 5, turnsRemaining: 3 },
      { effectType: 'research_percent', percent: 8, turnsRemaining: 3 },
      { effectType: 'research_percent', percent: 12, turnsRemaining: 3 },
      { effectType: 'research_percent', percent: 16, turnsRemaining: 3 },
    ],
  },

  {
    id: SPELL_IDS.CONJURE_FAMILIAR, schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 2,
    name: 'Conjure Familiar', icon: '🔮', manaCost: 20,
    type: 'province', targetType: 'self',
    description: 'Conjures an Arcane Familiar to join your army permanently.',
    effects: [
      { effectType: 'summon', unitId: 'arcane_familiar', count: 1 },
      { effectType: 'summon', unitId: 'arcane_familiar', count: 1 },
      { effectType: 'summon', unitId: 'arcane_familiar', count: 1 },
      { effectType: 'summon', unitId: 'arcane_familiar', count: 2 },
    ],
  },

  {
    id: SPELL_IDS.TELEPORT, schoolId: SPELL_SCHOOL_IDS.ARCANE, tier: 3,
    name: 'Teleport', icon: '🔀', manaCost: 14,
    type: 'province', targetType: 'any_friendly_province',
    description: 'Teleports the army to a friendly province within range.',
    effects: [
      { effectType: 'teleport', range: 2 },
      { effectType: 'teleport', range: 2 },
      { effectType: 'teleport', range: 3 },
      { effectType: 'teleport', range: 4 },
    ],
  },

  // ═══ Rune Magic ═══════════════════════════════════════════

  {
    id: SPELL_IDS.RUNIC_STRIKE, schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 0,
    name: 'Runic Strike', icon: '᚛', manaCost: 3,
    type: 'combat', targetType: 'random_enemy',
    description: 'A focused runic bolt strikes a random enemy.',
    effects: [
      { effectType: 'damage', baseDamage: 5 },
      { effectType: 'damage', baseDamage: 6 },
      { effectType: 'damage', baseDamage: 7 },
      { effectType: 'damage', baseDamage: 8 },
    ],
  },

  {
    id: SPELL_IDS.RUNE_SHIELD, schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 1,
    name: 'Rune Shield', icon: '᚛', manaCost: 5,
    type: 'combat', targetType: 'random_ally',
    description: 'Ancient runes bolster an ally\'s defense. Chains to more at higher skill.',
    effects: [
      { effectType: 'buff', stat: 'defense', amount: 1, chains: 1 },
      { effectType: 'buff', stat: 'defense', amount: 1, chains: 2 },
      { effectType: 'buff', stat: 'defense', amount: 2, chains: 2 },
      { effectType: 'buff', stat: 'defense', amount: 2, chains: 3 },
    ],
  },

  {
    id: SPELL_IDS.RUNIC_MIGHT, schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 2,
    name: 'Runic Might', icon: '᚛', manaCost: 10,
    type: 'combat', targetType: 'random_enemy',
    description: 'Runic energy chains through 3 random enemies, dealing heavy damage.',
    effects: [
      { effectType: 'damage', baseDamage: 7, chains: 3 },
      { effectType: 'damage', baseDamage: 8, chains: 3 },
      { effectType: 'damage', baseDamage: 9, chains: 3 },
      { effectType: 'damage', baseDamage: 10, chains: 3 },
    ],
  },

  {
    id: SPELL_IDS.RUNE_FORGE, schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 2,
    name: 'Rune Forge', icon: '⚒️', manaCost: 10,
    extraCost: { runes: 20 },
    type: 'province', targetType: 'self',
    replacesSpell: SPELL_IDS.RUNIC_MIGHT,
    description: 'Expend mana and 20 Runes to forge a lesser artifact for the hero.',
    effects: [
      { effectType: 'artifact' },
      { effectType: 'artifact' },
      { effectType: 'artifact' },
      { effectType: 'artifact' },
    ],
  },

  {
    id: SPELL_IDS.ELDRITCH_WEAPONS, schoolId: SPELL_SCHOOL_IDS.RUNE, tier: 3,
    name: 'Eldritch Weapons', icon: '⚡', manaCost: 14,
    type: 'combat', targetType: 'all_allies',
    description: 'Runes flare across all allied weapons, increasing their attack.',
    effects: [
      { effectType: 'buff', stat: 'attack', amount: 2 },
      { effectType: 'buff', stat: 'attack', amount: 2 },
      { effectType: 'buff', stat: 'attack', amount: 3 },
      { effectType: 'buff', stat: 'attack', amount: 4 },
    ],
  },

  // ═══ Death Magic ══════════════════════════════════════════

  {
    id: SPELL_IDS.BONE_CHILL, schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 0,
    name: 'Bone Chill', icon: '💀', manaCost: 2,
    type: 'combat', targetType: 'random_enemy',
    description: 'A cold touch of death reduces a random enemy\'s defense.',
    effects: [
      { effectType: 'debuff', stat: 'defense', amount: -2 },
      { effectType: 'debuff', stat: 'defense', amount: -2 },
      { effectType: 'debuff', stat: 'defense', amount: -3 },
      { effectType: 'debuff', stat: 'defense', amount: -3 },
    ],
  },

  {
    id: SPELL_IDS.DEATH_WAIL, schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 1,
    name: 'Death Wail', icon: '👻', manaCost: 5,
    type: 'combat', targetType: 'random_enemy',
    description: 'A spectral shriek tears through enemy ranks, chaining to multiple foes.',
    effects: [
      { effectType: 'damage', baseDamage: 5, chains: 2 },
      { effectType: 'damage', baseDamage: 6, chains: 3 },
      { effectType: 'damage', baseDamage: 7, chains: 3 },
      { effectType: 'damage', baseDamage: 8, chains: 4 },
    ],
  },

  {
    id: SPELL_IDS.CORPSE_RAISE, schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 2,
    name: 'Corpse Raise', icon: '🧟', manaCost: 20,
    type: 'province', targetType: 'self',
    description: 'Raises Cadavers from the dead to join your army permanently.',
    effects: [
      { effectType: 'summon', unitId: 'cadaver', count: 1 },
      { effectType: 'summon', unitId: 'cadaver', count: 1 },
      { effectType: 'summon', unitId: 'cadaver', count: 2 },
      { effectType: 'summon', unitId: 'cadaver', count: 2 },
    ],
  },

  {
    id: SPELL_IDS.PLAGUE, schoolId: SPELL_SCHOOL_IDS.DEATH, tier: 3,
    name: 'Plague', icon: '☣️', manaCost: 16,
    type: 'province', targetType: 'any_adjacent_enemy_province',
    description: 'Spreads a devastating plague to an adjacent enemy province. Reduces income and slows recruitment.',
    effects: [
      [
        { effectType: 'income_percent', percent: -40, turnsRemaining: 3, resourceId: 'all' },
        { effectType: 'recruit_penalty', timeIncrease: 1, turnsRemaining: 3 },
      ],
      [
        { effectType: 'income_percent', percent: -50, turnsRemaining: 3, resourceId: 'all' },
        { effectType: 'recruit_penalty', timeIncrease: 1, turnsRemaining: 3 },
      ],
      [
        { effectType: 'income_percent', percent: -60, turnsRemaining: 3, resourceId: 'all' },
        { effectType: 'recruit_penalty', timeIncrease: 2, turnsRemaining: 3 },
      ],
      [
        { effectType: 'income_percent', percent: -75, turnsRemaining: 3, resourceId: 'all' },
        { effectType: 'recruit_penalty', timeIncrease: 2, turnsRemaining: 3 },
      ],
    ],
  },

  // ═══ Nature Magic ═════════════════════════════════════════

  {
    id: SPELL_IDS.ENTANGLE, schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 0,
    name: 'Entangle', icon: '🌿', manaCost: 2,
    type: 'combat', targetType: 'random_enemy',
    description: 'Vines snag a random enemy, reducing their defense.',
    effects: [
      { effectType: 'debuff', stat: 'defense', amount: -1, chains: 1 },
      { effectType: 'debuff', stat: 'defense', amount: -1, chains: 1 },
      { effectType: 'debuff', stat: 'defense', amount: -2, chains: 1 },
      { effectType: 'debuff', stat: 'defense', amount: -2, chains: 1 },
    ],
  },

  {
    id: SPELL_IDS.SUMMON_ANIMAL, schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 1,
    name: 'Summon Animal', icon: '🐺', manaCost: 15,
    type: 'province', targetType: 'self',
    description: 'Calls forth a wild animal native to the province\'s biome to join your army permanently.',
    effects: [
      { effectType: 'summon', biomeDependent: true, count: 1 },
      { effectType: 'summon', biomeDependent: true, count: 1 },
      { effectType: 'summon', biomeDependent: true, count: 1 },
      { effectType: 'summon', biomeDependent: true, count: 2 },
    ],
  },

  {
    id: SPELL_IDS.REGROWTH, schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 2,
    name: 'Regrowth', icon: '🌱', manaCost: 9,
    type: 'combat', targetType: 'lowest_hp_ally',
    description: 'Vital energy surges into the most wounded ally, expanding their max HP. Chains at master.',
    effects: [
      { effectType: 'buff', stat: 'maxHp', amount: 4, chains: 1 },
      { effectType: 'buff', stat: 'maxHp', amount: 6, chains: 1 },
      { effectType: 'buff', stat: 'maxHp', amount: 8, chains: 1 },
      { effectType: 'buff', stat: 'maxHp', amount: 12, chains: 2 },
    ],
  },

  {
    id: SPELL_IDS.CALL_OF_THE_WILD, schoolId: SPELL_SCHOOL_IDS.NATURE, tier: 3,
    name: 'Call of the Wild', icon: '🦅', manaCost: 15,
    type: 'province', targetType: 'self',
    description: 'Ancient wild spirits empower your entire army with atk and def for 2 turns.',
    effects: [
      { effectType: 'army_buff', turnsRemaining: 2, effects: [{ type: 'stat_modifier', attack: 1, defense: 1 }] },
      { effectType: 'army_buff', turnsRemaining: 2, effects: [{ type: 'stat_modifier', attack: 2, defense: 2 }] },
      { effectType: 'army_buff', turnsRemaining: 2, effects: [{ type: 'stat_modifier', attack: 3, defense: 3 }] },
      { effectType: 'army_buff', turnsRemaining: 2, effects: [{ type: 'stat_modifier', attack: 4, defense: 4 }] },
    ],
  },

  // ═══ Ancient Magic ════════════════════════════════════════

  {
    id: SPELL_IDS.HUNTERS_MARK, schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 0,
    name: "Hunter's Mark", icon: '🏺', manaCost: 2,
    type: 'combat', targetType: 'random_enemy',
    description: 'Marks a random enemy, reducing their defense. Chains at master.',
    effects: [
      { effectType: 'debuff', stat: 'defense', amount: -2, chains: 1 },
      { effectType: 'debuff', stat: 'defense', amount: -3, chains: 1 },
      { effectType: 'debuff', stat: 'defense', amount: -4, chains: 1 },
      { effectType: 'debuff', stat: 'defense', amount: -4, chains: 2 },
    ],
  },

  {
    id: SPELL_IDS.BLOODRITE, schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 1,
    name: 'Bloodrite', icon: '🩸', manaCost: 5,
    type: 'combat', targetType: 'random_enemy',
    description: 'A primal rite — strikes a random enemy AND channels the blood into the most wounded ally.',
    effects: [
      [
        { effectType: 'damage', targetType: 'random_enemy', baseDamage: 3 },
        { effectType: 'buff',   targetType: 'lowest_hp_ally', stat: 'maxHp', amount: 1 },
      ],
      [
        { effectType: 'damage', targetType: 'random_enemy', baseDamage: 4 },
        { effectType: 'buff',   targetType: 'lowest_hp_ally', stat: 'maxHp', amount: 2 },
      ],
      [
        { effectType: 'damage', targetType: 'random_enemy', baseDamage: 5 },
        { effectType: 'buff',   targetType: 'lowest_hp_ally', stat: 'maxHp', amount: 3 },
      ],
      [
        { effectType: 'damage', targetType: 'random_enemy', baseDamage: 6 },
        { effectType: 'buff',   targetType: 'lowest_hp_ally', stat: 'maxHp', amount: 4 },
      ],
    ],
  },

  {
    id: SPELL_IDS.SANDSTORM, schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 2,
    name: 'Sandstorm', icon: '🌪️', manaCost: 10,
    type: 'province', targetType: 'any_adjacent_enemy_province',
    description: 'A blinding sandstorm reduces an adjacent enemy province\'s defensive bonus.',
    effects: [
      { effectType: 'defense_percent', defensePercent: -15, turnsRemaining: 2 },
      { effectType: 'defense_percent', defensePercent: -15, turnsRemaining: 2 },
      { effectType: 'defense_percent', defensePercent: -20, turnsRemaining: 2 },
      { effectType: 'defense_percent', defensePercent: -20, turnsRemaining: 3 },
    ],
  },

  {
    id: SPELL_IDS.ANCESTORS_MIGHT, schoolId: SPELL_SCHOOL_IDS.ANCIENT, tier: 3,
    name: "Ancestors' Might", icon: '👁️', manaCost: 15,
    type: 'province', targetType: 'self',
    description: 'The ancestors\' spirits surge through your army, increasing attack for 2 turns.',
    effects: [
      { effectType: 'army_buff', turnsRemaining: 2, effects: [{ type: 'stat_modifier', attack: 4 }] },
      { effectType: 'army_buff', turnsRemaining: 2, effects: [{ type: 'stat_modifier', attack: 4 }] },
      { effectType: 'army_buff', turnsRemaining: 2, effects: [{ type: 'stat_modifier', attack: 5 }] },
      { effectType: 'army_buff', turnsRemaining: 3, effects: [{ type: 'stat_modifier', attack: 6 }] },
    ],
  },

  // ═══ Order Magic ══════════════════════════════════════════

  {
    id: SPELL_IDS.WAR_SHOUT, schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 0,
    name: 'War Shout', icon: '⚖️', manaCost: 2,
    type: 'combat', targetType: 'random_ally',
    description: 'A commanding shout bolsters a random ally\'s attack. Chains at higher skill.',
    effects: [
      { effectType: 'buff', stat: 'attack', amount: 1, chains: 1 },
      { effectType: 'buff', stat: 'attack', amount: 1, chains: 2 },
      { effectType: 'buff', stat: 'attack', amount: 2, chains: 2 },
      { effectType: 'buff', stat: 'attack', amount: 2, chains: 3 },
    ],
  },

  {
    id: SPELL_IDS.SMITE, schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 1,
    name: 'Smite', icon: '🌟', manaCost: 5,
    type: 'combat', targetType: 'random_enemy',
    description: 'Divine energy smites a single random enemy with holy force.',
    effects: [
      { effectType: 'damage', baseDamage: 6 },
      { effectType: 'damage', baseDamage: 8 },
      { effectType: 'damage', baseDamage: 10 },
      { effectType: 'damage', baseDamage: 12 },
    ],
  },

  {
    id: SPELL_IDS.PROTECTION, schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 2,
    name: 'Protection', icon: '🛡️', manaCost: 10,
    type: 'combat', targetType: 'all_allies',
    description: 'A divine ward strengthens the defense of all allied units.',
    effects: [
      { effectType: 'buff', stat: 'defense', amount: 2 },
      { effectType: 'buff', stat: 'defense', amount: 2 },
      { effectType: 'buff', stat: 'defense', amount: 3 },
      { effectType: 'buff', stat: 'defense', amount: 4 },
    ],
  },

  {
    id: SPELL_IDS.HOLY_WRATH, schoolId: SPELL_SCHOOL_IDS.ORDER, tier: 3,
    name: 'Holy Wrath', icon: '✝️', manaCost: 16,
    type: 'combat', targetType: 'all_enemies',
    description: 'Divine judgement rains down upon all enemies.',
    effects: [
      { effectType: 'damage', baseDamage: 12 },
      { effectType: 'damage', baseDamage: 12 },
      { effectType: 'damage', baseDamage: 14 },
      { effectType: 'damage', baseDamage: 16 },
    ],
  },

  // ═══ Light Magic ══════════════════════════════════════════

  {
    id: SPELL_IDS.HEALING_LIGHT, schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 0,
    name: 'Healing Light', icon: '☀️', manaCost: 2,
    type: 'combat', targetType: 'lowest_hp_ally',
    description: 'Warm light heals the most wounded ally. Can revive units from the wounded pool.',
    effects: [
      { effectType: 'heal', amount: 1, canRevive: true },
      { effectType: 'heal', amount: 2, canRevive: true },
      { effectType: 'heal', amount: 3, canRevive: true },
      { effectType: 'heal', amount: 4, canRevive: true },
    ],
  },

  {
    id: SPELL_IDS.BLESS, schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 1,
    name: 'Bless', icon: '✨', manaCost: 5,
    type: 'combat', targetType: 'random_ally',
    description: 'Blesses a random ally with increased attack and defense. Chains at higher skill.',
    effects: [
      { effectType: 'buff', stats: [{ stat: 'attack', amount: 1 }, { stat: 'defense', amount: 1 }], chains: 1 },
      { effectType: 'buff', stats: [{ stat: 'attack', amount: 1 }, { stat: 'defense', amount: 1 }], chains: 2 },
      { effectType: 'buff', stats: [{ stat: 'attack', amount: 2 }, { stat: 'defense', amount: 2 }], chains: 2 },
      { effectType: 'buff', stats: [{ stat: 'attack', amount: 2 }, { stat: 'defense', amount: 2 }], chains: 3 },
    ],
  },

  {
    id: SPELL_IDS.MEND, schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 2,
    name: 'Mend', icon: '💚', manaCost: 10,
    type: 'province', targetType: 'self',
    description: 'Heals all units in your army. Wounded units may recover fully and return to active duty.',
    effects: [
      { effectType: 'army_heal', amount: 4 },
      { effectType: 'army_heal', amount: 5 },
      { effectType: 'army_heal', amount: 6 },
      { effectType: 'army_heal', amount: 7 },
    ],
  },

  {
    id: SPELL_IDS.GRACE, schoolId: SPELL_SCHOOL_IDS.LIGHT, tier: 3,
    name: 'Grace', icon: '🕊️', manaCost: 15,
    type: 'province', targetType: 'self',
    description: 'Divine grace blesses the army, greatly increasing the chance units survive lethal hits for 2 turns.',
    effects: [
      { effectType: 'army_buff', woundChanceBonus: 0.20, turnsRemaining: 2 },
      { effectType: 'army_buff', woundChanceBonus: 0.30, turnsRemaining: 2 },
      { effectType: 'army_buff', woundChanceBonus: 0.40, turnsRemaining: 2 },
      { effectType: 'army_buff', woundChanceBonus: 0.50, turnsRemaining: 2 },
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
