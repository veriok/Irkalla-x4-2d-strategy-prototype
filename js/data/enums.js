/**
 * enums.js
 * Shared frozen enums.
 */

export const UNIT_TYPES = Object.freeze({
  INFANTRY:  'infantry',
  ARCHER:    'archer',
  CAVALRY:   'cavalry',
  CONSTRUCT: 'construct',
  MONSTER:   'monster',
  ALL:       'all units',
});

export const RACE_IDS = Object.freeze({
  DWARF:  'dwarf',
  ELF:    'elf',
  LIZARD: 'lizard',
  HUMAN:  'human',
});

export const FACTION_IDS = Object.freeze({
  KUR_MARGAL:          'kur_margal',
  IRON_FREEHOLDS:      'iron_freeholds',
  DRAIG_GOCH:          'draig_goch',
  AURIC_EMPIRE:        'auric_empire',
  POLEIS_AETHERA:      'poleis_aethera',
  ARCHONATE_GREYHAVEN: 'archonate_greyhaven',
  SUTEKH_RA:           'sutekh_ra',
  CLANS_FIRST_SCALE:   'clans_first_scale',
});

export const RESOURCE_IDS = Object.freeze({
  GOLD:           'gold',
  RESEARCH:       'research',
  // Dwarf race + factions
  RUNES:          'runes',
  SOULS:          'souls',
  SCHEMATICS:     'schematics',
  // Human race + factions
  PRESTIGE:       'prestige',
  DRAGON_ESSENCE: 'dragon_essence',
  CONTRACTS:      'contracts',
  // Elf race + factions
  AETHER:         'aether',
  PHILOSOPHY:     'philosophy',
  TRIBUTE:        'tribute',
  // Lizard race + factions
  ANCIENT_LORE:   'ancient_lore',
  FAITH:          'faith',
  BEASTS:         'beasts',
});

export const BUILDING_CATEGORIES = Object.freeze({
  TRADE:          'trade',
  ADMINISTRATION: 'administration',
  EXPLORATION:    'exploration',
  TRAINING:       'training',
  DEFENSIVE:      'defensive',
  WORSHIPPING:    'worshipping',
  SCIENTIFIC:     'scientific',
  INDUSTRIAL:     'industrial',
});

export const TECH_ERAS = Object.freeze({
  STONE:  'stone',
  BRONZE: 'bronze',
  IRON:   'iron',
});
