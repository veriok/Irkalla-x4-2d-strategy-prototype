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
  INFRASTRUCTURE: 'infrastructure',
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
  HERO_WOUNDED:      'hero_wounded',
  ARTIFACT_ACQUIRED: 'artifact_acquired',
  HERO_CAN_LEVEL:    'hero_can_level',
  HERO_LEVELED:      'hero_leveled',
});

export const FACTION_REACTION_IDS = Object.freeze({
  KUR_MARGAL_SOUL_HARVEST:        'kur_margal_soul_harvest',
  KUR_MARGAL_SOUL_RESURRECTION:   'kur_margal_soul_resurrection',
  DRAIG_GOCH_PRESTIGE_ON_CAPTURE: 'draig_goch_prestige_on_capture',
  CLANS_RAID_ON_CAPTURE:          'clans_raid_on_capture',
  SUTEKH_RA_MUMMY_SPAWN:          'sutekh_ra_mummy_spawn',
});

// ─── Hero System Enums ────────────────────────────────────

export const HERO_CLASS_IDS = Object.freeze({
  // Kur Margal (Dwarf undead)
  DEATH_KNIGHT:     'death_knight',
  LICH:             'lich',
  // Iron Freeholds (Dwarf industrial)
  IRONLORD:         'ironlord',
  RUNESMITH:        'runesmith',
  // Draig Goch (Human dragon)
  DRAGONKNIGHT:     'dragonknight',
  FLAME_HERALD:     'flame_herald',
  // Auric Empire (Human imperial)
  LEGIONNAIRE:      'legionnaire',
  INQUISITOR:       'inquisitor',
  // Poleis Aethera (Elf celestial)
  STAR_GUARDIAN:    'star_guardian',
  STARWEAVER:       'starweaver',
  // Archonate Greyhaven (Elf arcane)
  ARCANIST:         'arcanist',
  GREY_SCHOLAR:     'grey_scholar',
  // Sutekh-Ra (Lizard Egyptian)
  TOMB_WARDEN:      'tomb_warden',
  HIEROPHANT:       'hierophant',
  // Clans First Scale (Lizard primal)
  SCALELORD:        'scalelord',
  SPIRIT_CALLER:    'spirit_caller',
});

export const HERO_SKILL_IDS = Object.freeze({
  // ATK — leader skills
  INFANTRY_LEADER:   'infantry_leader',
  CAVALRY_LEADER:    'cavalry_leader',
  ARCHER_LEADER:     'archer_leader',
  CONSTRUCT_LEADER:  'construct_leader',
  // TACTICS — tactical skills
  SIEGE_EXPERT_SKILL:'siege_expert_skill',
  MUSTERER:          'musterer',
  LOGISTICS:         'logistics',
  // DEF — defensive / militia skills
  STALWART:          'stalwart',
  CASTELLAN:         'castellan',
  FIRST_AID:         'first_aid',
  RESILIENT:         'resilient',
  // GOVERNANCE — building / income skills
  ADMINISTRATOR:     'administrator',
  TRADER:            'trader',
  BUILDER:           'builder',
  // KNOWLEDGE — mana / research skills + channeling prerequisite
  SAGE:              'sage',
  MANA_MASTERY:      'mana_mastery',
  MANA_CAPACITY:     'mana_capacity',
  CHANNELING:        'channeling',
  // SPELLPOWER — magic school skills (require CHANNELING)
  FIRE_MAGIC:        'fire_magic',
  EARTH_MAGIC:       'earth_magic',
  AIR_MAGIC:         'air_magic',
  ARCANE_MAGIC:      'arcane_magic',
  RUNE_MAGIC:        'rune_magic',
  DEATH_MAGIC:       'death_magic',
  NATURE_MAGIC:      'nature_magic',
  ANCIENT_MAGIC:     'ancient_magic',
  ORDER_MAGIC:       'order_magic',
  LIGHT_MAGIC:       'light_magic',
});

export const SPELL_SCHOOL_IDS = Object.freeze({
  FIRE:    'fire',
  EARTH:   'earth',
  AIR:     'air',
  ARCANE:  'arcane',
  RUNE:    'rune',
  DEATH:   'death',
  NATURE:  'nature',
  ANCIENT: 'ancient',
  ORDER:   'order',
  LIGHT:   'light',
});

export const SPELL_IDS = Object.freeze({
  // ── Fire ─────────────────────────────────────────────────
  SPARK:              'spark',              // T0
  EMBER_SHOT:         'ember_shot',         // T1
  SCORCHED_EARTH:     'scorched_earth',     // T2 province army_damage
  INFERNO:            'inferno',            // T3
  // ── Earth ────────────────────────────────────────────────
  EARTH_MISSILE:      'earth_missile',      // T0
  STONE_SKIN:         'stone_skin',         // T1
  EARTHEN_WALL:       'earthen_wall',       // T2 province defense buff
  EARTHQUAKE:         'earthquake',         // T3 province army_damage + building
  // ── Air ──────────────────────────────────────────────────
  WIND_STRIKE:        'wind_strike',        // T0
  GUST:               'gust',               // T1
  TAILWIND:           'tailwind',           // T2 army_buff movement
  CHAIN_LIGHTNING:    'chain_lightning',    // T3
  // ── Arcane ───────────────────────────────────────────────
  ARCANE_BOLT:        'arcane_bolt',        // T0
  WISDOM:             'wisdom',             // T1 province research buff
  CONJURE_FAMILIAR:   'conjure_familiar',   // T2 summon
  TELEPORT:           'teleport',           // T3 province teleport
  // ── Rune ─────────────────────────────────────────────────
  RUNIC_STRIKE:       'runic_strike',       // T0
  RUNE_SHIELD:        'rune_shield',        // T1
  RUNIC_MIGHT:        'runic_might',        // T2 combat chains (generic)
  RUNE_FORGE:         'rune_forge',         // T2 artifact (IRON_FREEHOLDS only)
  ELDRITCH_WEAPONS:   'eldritch_weapons',   // T3 combat buff all_allies
  // ── Death ────────────────────────────────────────────────
  BONE_CHILL:         'bone_chill',         // T0
  DEATH_WAIL:         'death_wail',         // T1
  CORPSE_RAISE:       'corpse_raise',       // T2 summon
  PLAGUE:             'plague',             // T3 province multi-effect
  // ── Nature ───────────────────────────────────────────────
  ENTANGLE:           'entangle',           // T0 (weaker)
  SUMMON_ANIMAL:      'summon_animal',      // T1 province summon biome animal
  REGROWTH:           'regrowth',           // T2
  CALL_OF_THE_WILD:   'call_of_the_wild',  // T3 army_buff
  // ── Ancient ──────────────────────────────────────────────
  HUNTERS_MARK:       'hunters_mark',       // T0
  BLOODRITE:          'bloodrite',          // T1 multi-effect
  SANDSTORM:          'sandstorm',          // T2 province defense debuff
  ANCESTORS_MIGHT:    'ancestors_might',    // T3 army_buff
  // ── Order ────────────────────────────────────────────────
  WAR_SHOUT:          'war_shout',          // T0
  SMITE:              'smite',              // T1
  PROTECTION:         'protection',         // T2 combat buff all_allies
  HOLY_WRATH:         'holy_wrath',         // T3
  // ── Light ────────────────────────────────────────────────
  HEALING_LIGHT:      'healing_light',      // T0 heal+revive
  BLESS:              'bless',              // T1 multi-stat buff
  MEND:               'mend',              // T2 province army_heal
  GRACE:              'grace',             // T3 army_buff wound chance
});

export const ARTIFACT_SLOTS = Object.freeze({
  WEAPON:     'weapon',
  ARMOR:      'armor',
  ACCESSORY1: 'accessory1',
  ACCESSORY2: 'accessory2',
});

export const ARTIFACT_IDS = Object.freeze({
  // Weapons
  SWORD_OF_IRON:       'sword_of_iron',
  RUNIC_BLADE:         'runic_blade',
  DRAGONBONE_SPEAR:    'dragonbone_spear',
  COMMANDERS_MACE:     'commanders_mace',
  SPECTRAL_SCYTHE:     'spectral_scythe',
  // Armor
  IRON_PLATE:          'iron_plate',
  DRAGONSCALE_MAIL:    'dragonscale_mail',
  ANCIENT_SHELL_ARMOR: 'ancient_shell_armor',
  MOONWEAVE_ROBE:      'moonweave_robe',
  WARDENS_SHIELD:      'wardens_shield',
  // Accessories
  RING_OF_GOLD:        'ring_of_gold',
  TACTICIANS_PENDANT:  'tacticians_pendant',
  SCHOLARS_TOME:       'scholars_tome',
  GOVERNORS_SEAL:      'governors_seal',
  AMULET_OF_SWIFTNESS: 'amulet_of_swiftness',
  MANA_CRYSTAL:        'mana_crystal',
  WARLORDS_BANNER:     'warlords_banner',
  NATURE_CHARM:        'nature_charm',
  RUNE_STONE:          'rune_stone',
  DEATH_TALISMAN:      'death_talisman',
});

export const HERO_ATTRIBUTES = Object.freeze({
  ATK:        'atk',
  DEF:        'def',
  TACTICS:    'tactics',
  GOVERNANCE: 'governance',
  KNOWLEDGE:  'knowledge',
  SPELLPOWER: 'spellpower',
});

export const ARTIFACT_RARITIES = Object.freeze({
  COMMON:    'common',
  UNCOMMON:  'uncommon',
  RARE:      'rare',
  LEGENDARY: 'legendary',
});
