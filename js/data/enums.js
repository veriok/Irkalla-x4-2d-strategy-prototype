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

export const GOLD_RESOURCE = Object.freeze({
  id:          RESOURCE_IDS.GOLD,
  name:        'Gold',
  emoji:       '🪙',
  description: 'Universal currency.',
});

export const RESEARCH_RESOURCE = Object.freeze({
  id:          RESOURCE_IDS.RESEARCH,
  name:        'Research',
  emoji:       '📚',
  description: 'Accumulated knowledge. Spend to unlock technologies.',
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
  SILVER: 'silver',
  GOLD:   'gold',
  MITHRIL:'mithril',
});

export const GAME_EVENTS = Object.freeze({
  PROVINCE_CAPTURED: 'province_captured',
  ARMY_CASUALTIES:   'army_casualties',
  TECH_RESEARCHED:   'tech_researched',
});

export const FACTION_REACTION_IDS = Object.freeze({
  KUR_MARGAL_SOUL_HARVEST:        'kur_margal_soul_harvest',
  KUR_MARGAL_SOUL_RESURRECTION:   'kur_margal_soul_resurrection',
  DRAIG_GOCH_PRESTIGE_ON_CAPTURE: 'draig_goch_prestige_on_capture',
  CLANS_RAID_ON_CAPTURE:          'clans_raid_on_capture',
  SUTEKH_RA_MUMMY_SPAWN:          'sutekh_ra_mummy_spawn',
});
