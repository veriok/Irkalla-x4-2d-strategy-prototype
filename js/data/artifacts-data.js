/**
 * artifacts-data.js
 *
 * ~20 artifact definitions across 4 equipment slots.
 *
 * Effect shapes (hero-engine.js resolves these):
 *   { type: 'hero_stat_bonus', stat: HERO_STATS key, amount }   — direct stat bonus
 *   { type: 'army_unit_type_bonus', unitType, stat, percent }    — bonus to a unit type
 *   { type: 'army_all_units_bonus', stat, percent }              — bonus to all units
 *   { type: 'province_income_bonus', percent }                   — income bonus when governing
 *   { type: 'hero_mana_bonus', amount }                          — flat max mana bonus
 */

import { ARTIFACT_IDS, ARTIFACT_SLOTS, ARTIFACT_RARITIES, HERO_STATS, UNIT_TYPES } from './enums.js';

export const ARTIFACTS = [

  // ─── Weapons ─────────────────────────────────────────────

  {
    id: ARTIFACT_IDS.SWORD_OF_IRON,
    slot: ARTIFACT_SLOTS.WEAPON,
    name: 'Sword of Iron',
    icon: '⚔️',
    rarity: ARTIFACT_RARITIES.COMMON,
    description: 'A well-forged blade that sharpens a hero\'s martial edge.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.ATK, amount: 2 },
    ],
  },
  {
    id: ARTIFACT_IDS.RUNIC_BLADE,
    slot: ARTIFACT_SLOTS.WEAPON,
    name: 'Runic Blade',
    icon: '🗡️',
    rarity: ARTIFACT_RARITIES.UNCOMMON,
    description: 'Inscribed with dwarven war-runes, it strikes with both iron and arcane force.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.ATK, amount: 3 },
      { type: 'hero_stat_bonus', stat: HERO_STATS.SPELLPOWER, amount: 1 },
    ],
  },
  {
    id: ARTIFACT_IDS.DRAGONBONE_SPEAR,
    slot: ARTIFACT_SLOTS.WEAPON,
    name: 'Dragonbone Spear',
    icon: '🐉',
    rarity: ARTIFACT_RARITIES.RARE,
    description: 'Carved from the bone of a slain elder dragon. Its power is unmistakable.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.ATK, amount: 4 },
      { type: 'army_unit_type_bonus', unitType: UNIT_TYPES.CAVALRY, stat: 'attack', percent: 10 },
    ],
  },
  {
    id: ARTIFACT_IDS.COMMANDERS_MACE,
    slot: ARTIFACT_SLOTS.WEAPON,
    name: "Commander's Mace",
    icon: '🔨',
    rarity: ARTIFACT_RARITIES.COMMON,
    description: 'A heavy mace symbolising authority, bolstering the morale of nearby infantry.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.ATK, amount: 1 },
      { type: 'army_unit_type_bonus', unitType: UNIT_TYPES.INFANTRY, stat: 'attack', percent: 5 },
    ],
  },
  {
    id: ARTIFACT_IDS.SPECTRAL_SCYTHE,
    slot: ARTIFACT_SLOTS.WEAPON,
    name: 'Spectral Scythe',
    icon: '💀',
    rarity: ARTIFACT_RARITIES.RARE,
    description: 'A blade that reaps souls as easily as flesh, channelling death magic.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.ATK, amount: 3 },
      { type: 'hero_stat_bonus', stat: HERO_STATS.SPELLPOWER, amount: 3 },
      { type: 'hero_stat_bonus', stat: HERO_STATS.KNOWLEDGE, amount: 1 },
    ],
  },

  // ─── Armor ───────────────────────────────────────────────

  {
    id: ARTIFACT_IDS.IRON_PLATE,
    slot: ARTIFACT_SLOTS.ARMOR,
    name: 'Iron Plate',
    icon: '🛡️',
    rarity: ARTIFACT_RARITIES.COMMON,
    description: 'Solid iron plate armour that turns aside common blows.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.DEF, amount: 2 },
    ],
  },
  {
    id: ARTIFACT_IDS.DRAGONSCALE_MAIL,
    slot: ARTIFACT_SLOTS.ARMOR,
    name: 'Dragonscale Mail',
    icon: '🐉',
    rarity: ARTIFACT_RARITIES.RARE,
    description: 'Scales from a fire dragon, flexible yet nigh-impenetrable, and granting commanding presence.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.DEF, amount: 4 },
      { type: 'hero_stat_bonus', stat: HERO_STATS.ATK, amount: 1 },
    ],
  },
  {
    id: ARTIFACT_IDS.ANCIENT_SHELL_ARMOR,
    slot: ARTIFACT_SLOTS.ARMOR,
    name: 'Ancient Shell Armour',
    icon: '🐢',
    rarity: ARTIFACT_RARITIES.UNCOMMON,
    description: 'Armour fashioned from the shell of a great sea creature. Sturdy and enduring.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.DEF, amount: 3 },
      { type: 'army_all_units_bonus', stat: 'defense', percent: 5 },
    ],
  },
  {
    id: ARTIFACT_IDS.MOONWEAVE_ROBE,
    slot: ARTIFACT_SLOTS.ARMOR,
    name: 'Moonweave Robe',
    icon: '🌙',
    rarity: ARTIFACT_RARITIES.UNCOMMON,
    description: 'A robe woven from moonlight-threaded silk, prized by scholars and mages.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.KNOWLEDGE, amount: 2 },
      { type: 'hero_stat_bonus', stat: HERO_STATS.SPELLPOWER, amount: 1 },
      { type: 'hero_mana_bonus', amount: 10 },
    ],
  },
  {
    id: ARTIFACT_IDS.WARDENS_SHIELD,
    slot: ARTIFACT_SLOTS.ARMOR,
    name: "Warden's Shield",
    icon: '🛡️',
    rarity: ARTIFACT_RARITIES.COMMON,
    description: 'A stout shield emblazoned with a guardian sigil, inspiring defensive discipline.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.DEF, amount: 2 },
      { type: 'army_unit_type_bonus', unitType: UNIT_TYPES.INFANTRY, stat: 'defense', percent: 5 },
    ],
  },

  // ─── Accessories ─────────────────────────────────────────

  {
    id: ARTIFACT_IDS.RING_OF_GOLD,
    slot: ARTIFACT_SLOTS.ACCESSORY1,
    name: 'Ring of Gold',
    icon: '💍',
    rarity: ARTIFACT_RARITIES.COMMON,
    description: 'A merchant\'s ring that draws gold to its wearer.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.GOVERNANCE, amount: 2 },
      { type: 'province_income_bonus', percent: 5 },
    ],
  },
  {
    id: ARTIFACT_IDS.TACTICIANS_PENDANT,
    slot: ARTIFACT_SLOTS.ACCESSORY1,
    name: "Tactician's Pendant",
    icon: '⚔️',
    rarity: ARTIFACT_RARITIES.UNCOMMON,
    description: 'An heirloom worn by brilliant generals, sharpening strategic instinct.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.TACTICS, amount: 3 },
    ],
  },
  {
    id: ARTIFACT_IDS.SCHOLARS_TOME,
    slot: ARTIFACT_SLOTS.ACCESSORY1,
    name: "Scholar's Tome",
    icon: '📚',
    rarity: ARTIFACT_RARITIES.UNCOMMON,
    description: 'An ancient tome filled with arcane formulae, expanding the mind and mana pool.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.KNOWLEDGE, amount: 2 },
      { type: 'hero_mana_bonus', amount: 15 },
    ],
  },
  {
    id: ARTIFACT_IDS.GOVERNORS_SEAL,
    slot: ARTIFACT_SLOTS.ACCESSORY1,
    name: "Governor's Seal",
    icon: '📜',
    rarity: ARTIFACT_RARITIES.COMMON,
    description: 'An official seal that commands loyalty and improves provincial administration.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.GOVERNANCE, amount: 3 },
    ],
  },
  {
    id: ARTIFACT_IDS.AMULET_OF_SWIFTNESS,
    slot: ARTIFACT_SLOTS.ACCESSORY2,
    name: 'Amulet of Swiftness',
    icon: '💨',
    rarity: ARTIFACT_RARITIES.UNCOMMON,
    description: 'A quickening charm that lends speed to the wearer\'s entire army.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.TACTICS, amount: 1 },
      { type: 'army_movement_bonus', amount: 1 },
    ],
  },
  {
    id: ARTIFACT_IDS.MANA_CRYSTAL,
    slot: ARTIFACT_SLOTS.ACCESSORY2,
    name: 'Mana Crystal',
    icon: '💎',
    rarity: ARTIFACT_RARITIES.UNCOMMON,
    description: 'A crystallised shard of pure magical energy, vastly expanding mana reserves.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.SPELLPOWER, amount: 2 },
      { type: 'hero_mana_bonus', amount: 20 },
    ],
  },
  {
    id: ARTIFACT_IDS.WARLORDS_BANNER,
    slot: ARTIFACT_SLOTS.ACCESSORY2,
    name: "Warlord's Banner",
    icon: '🚩',
    rarity: ARTIFACT_RARITIES.RARE,
    description: 'A legendary banner that inspires all troops to fight beyond their limits.',
    effects: [
      { type: 'army_all_units_bonus', stat: 'attack', percent: 8 },
      { type: 'army_all_units_bonus', stat: 'defense', percent: 8 },
    ],
  },
  {
    id: ARTIFACT_IDS.NATURE_CHARM,
    slot: ARTIFACT_SLOTS.ACCESSORY2,
    name: 'Nature Charm',
    icon: '🌿',
    rarity: ARTIFACT_RARITIES.COMMON,
    description: 'A spirit-carved charm tied to nature magic, boosting magical potency.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.SPELLPOWER, amount: 2 },
    ],
  },
  {
    id: ARTIFACT_IDS.RUNE_STONE,
    slot: ARTIFACT_SLOTS.ACCESSORY2,
    name: 'Rune Stone',
    icon: '᚛',
    rarity: ARTIFACT_RARITIES.COMMON,
    description: 'A smooth stone etched with runes of warding. Valued by dwarven commanders.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.DEF, amount: 1 },
      { type: 'hero_stat_bonus', stat: HERO_STATS.KNOWLEDGE, amount: 1 },
    ],
  },
  {
    id: ARTIFACT_IDS.DEATH_TALISMAN,
    slot: ARTIFACT_SLOTS.ACCESSORY2,
    name: 'Death Talisman',
    icon: '💀',
    rarity: ARTIFACT_RARITIES.RARE,
    description: 'A talisman linked to the realm of the dead, empowering those who command it.',
    effects: [
      { type: 'hero_stat_bonus', stat: HERO_STATS.SPELLPOWER, amount: 3 },
      { type: 'hero_stat_bonus', stat: HERO_STATS.ATK, amount: 2 },
      { type: 'hero_stat_bonus', stat: HERO_STATS.KNOWLEDGE, amount: 1 },
    ],
  },
];

export const ARTIFACT_MAP = Object.fromEntries(ARTIFACTS.map(a => [a.id, a]));

/** Artifacts grouped by rarity for drop tables */
export const ARTIFACTS_BY_RARITY = {
  [ARTIFACT_RARITIES.COMMON]:   ARTIFACTS.filter(a => a.rarity === ARTIFACT_RARITIES.COMMON),
  [ARTIFACT_RARITIES.UNCOMMON]: ARTIFACTS.filter(a => a.rarity === ARTIFACT_RARITIES.UNCOMMON),
  [ARTIFACT_RARITIES.RARE]:     ARTIFACTS.filter(a => a.rarity === ARTIFACT_RARITIES.RARE),
};

/** Pick a random artifact from a given rarity pool */
export function rollArtifact(rarity) {
  const pool = ARTIFACTS_BY_RARITY[rarity];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Roll an artifact with weighted rarity: 60% common, 30% uncommon, 10% rare */
export function rollRandomArtifact() {
  const r = Math.random();
  if (r < 0.60) return rollArtifact(ARTIFACT_RARITIES.COMMON);
  if (r < 0.90) return rollArtifact(ARTIFACT_RARITIES.UNCOMMON);
  return rollArtifact(ARTIFACT_RARITIES.RARE);
}

/** Roll with bias toward common/uncommon (no rare) — for crafting */
export function rollCraftedArtifact() {
  return Math.random() < 0.65
    ? rollArtifact(ARTIFACT_RARITIES.COMMON)
    : rollArtifact(ARTIFACT_RARITIES.UNCOMMON);
}
