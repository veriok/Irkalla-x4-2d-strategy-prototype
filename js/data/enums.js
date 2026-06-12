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

export const TRAIT_IDS = Object.freeze({
  SUN_PRIEST_AURA:      'sun_priest_aura',
  BEAST_BOND_AURA:      'beast_bond_aura',
  LEVY_BOOST_AURA:      'levy_boost_aura',
  LEADERLESS_CONSTRUCT: 'leaderless_construct',
  SIEGE_EXPERT:         'siege_expert',
  NO_HEAL:              'no_heal',
  ANTI_CAVALRY:         'anti_cavalry',
  FIRST_STRIKE:         'first_strike',
  SHIELD:               'shield',
});

export const UNIT_TAGS = Object.freeze({
  LEVY: 'levy',
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
  FACTION_ELIMINATED: 'faction_eliminated',
  // Diplomacy events
  FACTION_MET:                  'faction_met',
  WAR_DECLARED:                 'war_declared',
  PEACE_SIGNED:                 'peace_signed',
  DIPLOMATIC_PROPOSAL_RECEIVED: 'diplomatic_proposal_received',
  ALLIANCE_BROKEN:              'alliance_broken',
});

export const DIPLOMATIC_STATES = Object.freeze({
  PEACE:       'peace',
  TRUCE:       'truce',
  ALLIANCE:    'alliance',
  WAR_PENDING: 'war_pending',
  WAR:         'war',
});

export const MEMORY_TYPES = Object.freeze({
  WAR_DECLARED_BY_US:  'war_declared_by_us',
  WAR_DECLARED_ON_US:  'war_declared_on_us',
  SURPRISE_WAR_BY_US:  'surprise_war_by_us',
  SURPRISE_WAR_ON_US:  'surprise_war_on_us',
  TRUCE_BETRAYAL:      'truce_betrayal',
  ALLIANCE_FORMED:     'alliance_formed',
  ALLIANCE_BROKEN:     'alliance_broken',
  GOLD_GIFT:           'gold_gift',
  PEACE_SIGNED:        'peace_signed',
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
  // Kur Margal (Babylonian undead dwarves)
  GALLU:            'gallu',
  NAPPAHU:          'nappahu',
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
  TAILWIND:             'tailwind',             // T2 army_buff movement
  GUIDED_PROJECTILES:   'guided_projectiles',   // T2 army_buff first_strike (Aethera replacement)
  CHAIN_LIGHTNING:      'chain_lightning',      // T3
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

// ─── Effects System ───────────────────────────────────────

export const EFFECT_SOURCES = Object.freeze({
  FACTION: 'faction',
  TECH:    'tech',
  OTHER:   'other',
});

export const EFFECT_SCOPES = Object.freeze({
  UNIT:    'unit',      // effect bound to a single unit type (traits, unit definition effects)
  ARMY:    'army',      // effect applies across an army (army-status, hero aura skills, tech army bonuses)
  PROVINCE:'province',  // effect bound to a single province (province-status, buildings, hero-as-governor skills)
  FACTION: 'faction',   // effect applies faction-wide from a faction-level source (techs, faction base effects)
  HERO:    'hero',      // effect bound to a hero entity (mana, spell schools, hero stats)
  WORLD:   'world',     // global (future)
});

export const EFFECT_TYPES = Object.freeze({
  // Scope encodes the SOURCE BREADTH — where the rule comes from and how broadly it applies:
  //   FACTION  = universally active across all provinces/armies for this faction (comes from a tech or faction def)
  //   PROVINCE = active only for the specific province it is attached to (status effect, building, governor skill)
  //   ARMY     = active only for the specific army it is attached to
  //   UNIT     = active only for the specific unit type that carries it
  //   HERO     = active only for the hero that owns it
  // A single data source (artifact, tech) can emit effects at multiple scopes.
  // Callers aggregate from multiple scopes and apply them together.

  // --- Income ---
  INCOME_FLAT:                    'income_flat',             // flat resource output; needs resourceId
  INCOME_PERCENT:                 'income_percent',          // % modifier; needs resourceId or 'all'

  // --- Fortification (signed flat)
  // ARMY scope = attacker siege reduction (negative); PROVINCE/FACTION = defender bonus (positive)
  // Combat: net = sum(PROVINCE+FACTION defender) + sum(ARMY+UNIT attacker), clamped ≥ 0
  //         defender_unit_def *= (1 + net / 100)
  FORTIFICATION_BONUS:            'fortification_bonus',

  // --- Research & build ---
  RESEARCH_PERCENT:               'research_percent',
  BUILDING_COST_PERCENT:             'building_cost_percent',              // target: building id | 'all'
  BUILDING_IN_LOCATION_COST_PERCENT: 'building_in_location_cost_percent',  // target: location type id | 'all'
  LOCATION_COST_PERCENT:             'location_cost_percent',              // target: location type id | 'all'
  BUILD_TIME_BONUS:               'build_time_bonus',        // flat turn reduction to build time

  // --- Recruitment ---
  UNIT_COST_MULTI:                'unit_cost_multi',
  UNIT_RECRUIT_SPEED:             'unit_recruit_speed',
  RECRUIT_TIME_PENALTY:           'recruit_time_penalty',    // province status (turn count, not %)

  // --- Province utility ---
  MILITIA_BONUS:                  'militia_bonus',
  DISABLE_MILITIA_REGEN:          'disable_militia_regen',   // province status: suppresses militia regeneration this turn
  PROVINCE_GROWTH_SLOTS:          'province_growth_slots',           // extra building slots
  FORTIFICATION_FIRST_STRIKE_CHANCE: 'fortification_first_strike_chance', // garrison fires first probability

  // --- Army-wide stat modifiers (flow through aggregator; no typeId needed) ---
  STAT_MODIFIER_ARMY:             'stat_modifier_army',      // army-status → flat atk/def to all units
  STAT_MODIFIER_UNIT_TYPE:        'stat_modifier_unit_type', // was unitStatBonuses[]; filter by unitId/unitType
  ARMY_ATTACK_BONUS:              'army_attack_bonus',       // aura from another unit type → add atk to all
  ARMY_LEVY_STAT_BONUS:           'army_levy_stat_bonus',    // aura for levy units only (dedup per source type)
  ARMY_UNIT_TYPE_MULTI_BONUS:     'army_unit_type_multi_bonus', // % bonus to unit type stat
  ARMY_UNIT_TYPE_BONUS:           'army_unit_type_bonus',    // flat bonus to unit type stat (e.g. firstStrikeChance)
  ARMY_ALL_UNITS_MULTI_BONUS:     'army_all_units_multi_bonus',
  ARMY_MOVEMENT_BONUS:            'army_movement_bonus',
  ARMY_WOUND_CHANCE:              'army_wound_chance',
  ARMY_LOGISTICS:                 'army_logistics',          // probabilistic +1 movement/turn (Logistics skill)
  STACK_SIZE_BONUS:               'stack_size_bonus',

  // --- Unit-personal effects (UNIT scope; NOT routed through aggregator) ---
  // Read directly per typeId in tech-effects.js.
  STAT_MODIFIER:                  'stat_modifier',           // flat atk/def this unit only
  NO_HEAL:                        'no_heal',
  ANTI_CAVALRY_BONUS:             'anti_cavalry_bonus',
  FIRST_STRIKE:                   'first_strike',
  SHIELD_FIRST_STRIKE:            'shield_first_strike',
  // FORTIFICATION_BONUS also appears at UNIT scope (siege trait: negative flat)

  // --- Faction-wide mechanics (FACTION scope only) ---
  ARMY_SUPPORT_LIMIT:             'army_support_limit',
  HERO_COUNT_BONUS:               'hero_count_bonus',
  BUILDING_INCOME_BONUS:          'building_income_bonus',  // tech effect: per-building or per-category flat income
  CONQUEST_PENALTY_REDUCTION:     'conquest_penalty_reduction',
  OCEAN_MOVEMENT_BONUS:           'ocean_movement_bonus',
  RUNE_UPKEEP_REDUCTION:          'rune_upkeep_reduction',
  LORE_TECH_DISCOUNT:             'lore_tech_discount',
  VICTORY_SOUL_BONUS:             'victory_soul_bonus',
  SOUL_RESURRECTION_CHANCE:       'soul_resurrection_chance',
  FORTIFY_COST_REDUCTION:         'fortify_cost_reduction',
  COASTAL_RESOURCE_BONUS:         'coastal_resource_bonus',
  CLEAR_REWARD_MULTIPLIER:        'clear_reward_multiplier',
  RESEARCH_MULTIPLIER_REDUCTION:  'research_multiplier_reduction',
  BIOME_INCOME_BONUS:             'biome_income_bonus',
  BIOME_COMBAT_BONUS:             'biome_combat_bonus',
  RUIN_CLEAR_BONUS:               'ruin_clear_bonus',       // extra resource per ruin/den cleared
  CONSCRIPT_COST_REDUCTION:       'conscript_cost_reduction', // reduce conscript levy resource cost

  // --- Hero-entity effects (HERO scope only) ---
  HERO_STAT_BONUS:                'hero_stat_bonus',
  HERO_MANA_BONUS:                'hero_mana_bonus',
  HERO_FLAT_MANA:                 'hero_flat_mana',
  HERO_MANA_REGEN:                'hero_mana_regen',
  HERO_CHANNELING:                'hero_channeling',
  HERO_SPELL_SCHOOL:              'hero_spell_school',
  HERO_WOUND_REDUCTION:           'hero_wound_reduction',
});
