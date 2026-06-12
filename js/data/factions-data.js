/**
 * factions-data.js
 * Static definitions for all 8 playable factions (4 races × 2 factions each).
 *
 * resources.advanced[0] = race-wide primary resource (faction_primary_adv)
 * resources.advanced[1] = faction-specific secondary resource (faction_secondary_adv)
 *
 * onProvinceCapture: FACTION_REACTION_IDS[] — reactions fired on PROVINCE_CAPTURED
 * onArmyCasualties:       FACTION_REACTION_IDS[] — reactions fired on ARMY_CASUALTIES
 * Implementations live in js/engine/faction-reactions.js.
 */

import { RACE_IDS, FACTION_IDS, FACTION_REACTION_IDS, GOLD_RESOURCE, RESEARCH_RESOURCE, SPELL_SCHOOL_IDS, SPELL_IDS, EFFECT_SCOPES, EFFECT_TYPES } from './enums.js';

export const FACTIONS = [

  // ═══════════════════════════════════════════════════════
  // DWARVES
  // ═══════════════════════════════════════════════════════

  {
    id: FACTION_IDS.KUR_MARGAL,
    raceId: RACE_IDS.DWARF,
    name: 'Kur-Margal',
    shortName: 'Kur-Margal',
    fullName: 'The Undying Kingdom',
    description:
      'An ancient realm of undead dwarves ruled by the eternal Sorcerer-King. ' +
      'Awakened from their tomb-cities after millennia of silence, their bronze-clad legions march ' +
      'alongside soul-bound constructs powered by runic magicks.',
    emoji: '💀',
    flagImg: 'assets/flags/kur_margal_flag.png',
    factionImg: 'assets/diplomacy/kur_margal_diplo.png',
    unitCardBgImg: 'assets/cards/backgrounds/kur_margal-unit-bg.png',
    color: '#8B6914',
    borderColor: '#b08020',
    textColor: '#d4a030',
    resources: {
      gold: GOLD_RESOURCE,
      advanced: [
        { id: 'runes',  name: 'Runes',  emoji: '🔮', description: 'Ancient inscriptions empowering constructs and weapons. Sourced from forges and ancient ruins.' },
        { id: 'souls',  name: 'Souls',  emoji: '👻', description: 'Harvested from the slain. Needed to raise undead dwarves and sustain the kingdom\'s dark buildings.' },
      ],
      research: RESEARCH_RESOURCE,
    },
    startingResources: { gold: 50, research: 0, runes: 20, souls: 20 },
    unitEmoji: '💀',
    playstyle: [
      { text: 'Aggressive playstyle',                                             type: 'neutral' },
      { text: 'Soul Resurrection keeps fallen dwarves on the field indefinitely', type: 'boon'    },
      { text: 'Soul Harvest collects souls from every killed living enemy',       type: 'boon'    },
      { text: 'Spellcasters create lesser artifacts using runes and mana',        type: 'boon'    },
      { text: 'Souls required to recruit elite units and buildings',              type: 'penalty' },
      { text: 'Slow speed of units',                                              type: 'penalty' },
    ],
    biomePrefs: { primary: 'mountains', secondary: 'tundra' },
    startingUnits: [{ unitId: 'clay_golem', count: 2 }, { unitId: 'undead_levy', count: 1 }],
    startingSpellbooks: { [SPELL_SCHOOL_IDS.DEATH]: 3, [SPELL_SCHOOL_IDS.RUNE]: 3 },
    spellReplacements: [{ replaces: SPELL_IDS.RUNIC_MIGHT, with: SPELL_IDS.RUNE_FORGE }],
    onProvinceCapture: [FACTION_REACTION_IDS.KUR_MARGAL_SOUL_HARVEST],
    onArmyCasualties: [FACTION_REACTION_IDS.KUR_MARGAL_SOUL_RESURRECTION],
  },

  {
    id: FACTION_IDS.IRON_FREEHOLDS,
    raceId: RACE_IDS.DWARF,
    name: 'The Iron Freeholds',
    shortName: 'Freeholds',
    fullName: 'The Descendants of the Last Rebellion',
    description:
      'A confederation of fiercely independent dwarf clans who rejected eternal servitude and chose freedom over immortality. ' +
      'Inventors, traders, airship captains, and sea-raiders — they answer to no ruler beyond their own clan councils.',
    emoji: '⚙️',
    flagImg: 'assets/flags/freeholds_flag.png',
    factionImg: 'assets/diplomacy/unknown_diplo.png',
    unitCardBgImg: 'assets/cards/backgrounds/iron_freeholds-unit-bg.png',
    color: '#4A5568',
    borderColor: '#2D3748',
    textColor: '#A0AEC0',
    resources: {
      gold: GOLD_RESOURCE,
      advanced: [
        { id: 'runes',      name: 'Runes',      emoji: '🔮', description: 'Ancient dwarven inscriptions. Enhances weapons and armour.' },
        { id: 'schematics', name: 'Schematics', emoji: '📐', description: 'Engineering blueprints. Used to fortify provinces and develop advanced technology.' },
      ],
      research: RESEARCH_RESOURCE,
    },
    startingResources: { gold: 50, research: 0, runes: 20, schematics: 20 },
    unitEmoji: '⚙️',
    playstyle: [
      { text: 'Defensive playstyle',                                             type: 'neutral' },
      { text: 'Fortify Province available from the start',                       type: 'boon'    },
      { text: 'Strong siege units that excel in breaching defences',             type: 'boon'    },
      { text: 'Spellcasters create lesser artifacts using runes and mana',       type: 'boon'    },
      { text: 'Slow infantry without airship support',                           type: 'penalty' },
    ],
    biomePrefs: { primary: 'mountains', secondary: 'coastal' },
    startingUnits: [{ unitId: 'clan_fighter', count: 2 }, { unitId: 'clan_crossbowman', count: 1 }],
    startingSpellbooks: { [SPELL_SCHOOL_IDS.EARTH]: 3, [SPELL_SCHOOL_IDS.RUNE]: 3 },
    startingActions: ['fortify_province'],
    spellReplacements: [{ replaces: SPELL_IDS.RUNIC_MIGHT, with: SPELL_IDS.RUNE_FORGE }],
  },

  // ═══════════════════════════════════════════════════════
  // HUMANS
  // ═══════════════════════════════════════════════════════

  {
    id: FACTION_IDS.DRAIG_GOCH,
    raceId: RACE_IDS.HUMAN,
    name: 'Y Draig Goch',
    shortName: 'Y Draig Goch',
    fullName: 'The Crimson Dragon Dominion',
    description:
      'A rigid realm of dragon-worshipping warrior nobility where honor, lineage, and duty govern every aspect of life. ' +
      'From the northern forests, its disciplined warriors seek to embody the wisdom and might of the great dragons they revere.',
    emoji: '🐉',
    flagImg: 'assets/flags/y_draig_goch_flag.png',
    factionImg: 'assets/diplomacy/unknown_diplo.png',
    unitCardBgImg: 'assets/cards/backgrounds/draig_goch-unit-bg.png',
    color: '#7A1010',
    borderColor: '#601010',
    textColor: '#e04020',
    resources: {
      gold: GOLD_RESOURCE,
      advanced: [
        { id: 'prestige',       name: 'Prestige',       emoji: '👑', description: 'Noble reputation earned through great deeds. Enables elite units and high-tier buildings.' },
        { id: 'dragon_essence', name: 'Dragon Essence', emoji: '🔥', description: 'Sacred dragon fire. Powers draconic blessings and the mightiest warriors.' },
      ],
      research: RESEARCH_RESOURCE,
    },
    startingResources: { gold: 50, research: 0, prestige: 20, dragon_essence: 20 },
    unitEmoji: '🐉',
    playstyle: [
      { text: 'Aggressive playstyle',                                            type: 'neutral' },
      { text: 'Stronger and more heroes',                                        type: 'boon'    },
      { text: 'Prestige on capturing province',                                  type: 'boon'    },
      { text: 'Dragon Essence powers draconic blessings and elite warriors',     type: 'boon'    },
      { text: 'Elite units require both Prestige and Dragon Essence',            type: 'penalty' },
      { text: 'Weak magic access - only tier 2 spellbooks',                      type: 'penalty' },
    ],
    biomePrefs: { primary: 'tundra', secondary: 'forest' },
    startingUnits: [{ unitId: 'draig_warrior', count: 2 }, { unitId: 'draig_bowman', count: 1 }],
    startingSpellbooks: { [SPELL_SCHOOL_IDS.FIRE]: 2, [SPELL_SCHOOL_IDS.ORDER]: 2 },
    onProvinceCapture: [FACTION_REACTION_IDS.DRAIG_GOCH_PRESTIGE_ON_CAPTURE],
  },

  {
    id: FACTION_IDS.AURIC_EMPIRE,
    raceId: RACE_IDS.HUMAN,
    name: 'The Auric Empire',
    shortName: 'Empire',
    fullName: 'The Throne of Golden Sails',
    description:
      'A sprawling commercial empire where merchant dynasties wield influence behind the Imperial Throne. ' +
      'Masters of trade, diplomacy, and intrigue, they bind distant lands through coin and contracts, preferring negotiation to open war.',
    emoji: '💰',
    flagImg: 'assets/flags/auric_empire_flag.png',
    factionImg: 'assets/diplomacy/unknown_diplo.png',
    unitCardBgImg: 'assets/cards/backgrounds/auric_empire-unit-bg.png',
    color: '#B7791F',
    borderColor: '#975A16',
    textColor: '#F6E05E',
    resources: {
      gold: GOLD_RESOURCE,
      advanced: [
        { id: 'prestige',  name: 'Prestige',  emoji: '👑', description: 'Noble reputation. Enables elite access and high-tier construction.' },
        { id: 'contracts', name: 'Contracts', emoji: '📜', description: 'Trade agreements. Can rush production or hire mercenaries instantly.' },
      ],
      research: RESEARCH_RESOURCE,
    },
    startingResources: { gold: 50, research: 0, prestige: 20, contracts: 20 },
    unitEmoji: '💰',
    playstyle: [
      { text: 'Balanced playstyle',                                              type: 'neutral' },
      { text: 'Contracts can rush any production instantly',                     type: 'boon'    },
      { text: 'Hire mercenaries instantly with Contracts',                       type: 'boon'    },
      { text: 'Reduced conquest penalties - new territory integrates fast',      type: 'boon'    },
      { text: 'Advantages depend on maintaining steady resource income',         type: 'penalty' },
    ],
    biomePrefs: { primary: 'plains', secondary: 'coastal' },
    startingUnits: [{ unitId: 'imperial_levy', count: 2 }, { unitId: 'imperial_archer', count: 1 }],
    startingSpellbooks: { [SPELL_SCHOOL_IDS.ORDER]: 3, [SPELL_SCHOOL_IDS.AIR]: 3 },
  },

  // ═══════════════════════════════════════════════════════
  // ELVES
  // ═══════════════════════════════════════════════════════

  {
    id: FACTION_IDS.POLEIS_AETHERA,
    raceId: RACE_IDS.ELF,
    name: 'Poleis tou Aethera',
    shortName: 'Poleis',
    fullName: 'The League of Azure Towers',
    description:
      'A league of prosperous maritime city-states renowned for their philosophers, explorers, and sailors. ' +
      'They project an image of refinement and culture while pursuing each city-state\'s interests with sharp, calculating pragmatism.',
    emoji: '🌿',
    flagImg: 'assets/flags/aethera_flag.png',
    factionImg: 'assets/diplomacy/unknown_diplo.png',
    unitCardBgImg: 'assets/cards/backgrounds/poleis_aethera-unit-bg.png',
    color: '#1E6B5B',
    borderColor: '#204860',
    textColor: '#40c890',
    resources: {
      gold: GOLD_RESOURCE,
      advanced: [
        { id: 'aether',     name: 'Aether',     emoji: '✨', description: 'Arcane sea-mist harvested from coastal towers. Powers elven magic and advanced units.' },
        { id: 'philosophy', name: 'Philosophy', emoji: '📜', description: 'Accumulated knowledge from great academies. Reduces research costs and unlocks powerful bonuses.' },
      ],
      research: RESEARCH_RESOURCE,
    },
    startingResources: { gold: 50, research: 0, aether: 20, philosophy: 20 },
    unitEmoji: '🌿',
    playstyle: [
      { text: 'Balanced playstyle',                                              type: 'neutral' },
      { text: 'Fast movement and no naval attack penalities',                    type: 'boon'    },
      { text: 'Philosophy upgrades reduces all research costs',                  type: 'boon'    },
      { text: 'Strong archery units and support',                                type: 'boon'    },
      { text: 'Weak infantry',                                                   type: 'penalty' },
    ],
    biomePrefs: { primary: 'coastal', secondary: 'forest' },
    startingUnits: [{ unitId: 'aethera_hoplite', count: 2 }, { unitId: 'aethera_ranger', count: 1 }],
    startingSpellbooks: { [SPELL_SCHOOL_IDS.AIR]: 3, [SPELL_SCHOOL_IDS.ARCANE]: 3 },
    spellReplacements: [{ replaces: SPELL_IDS.TAILWIND, with: SPELL_IDS.GUIDED_PROJECTILES }],
  },

  {
    id: FACTION_IDS.ARCHONATE_GREYHAVEN,
    raceId: RACE_IDS.ELF,
    name: 'The Archonate of Greyhaven',
    shortName: 'Archonate',
    fullName: 'The Eternal Phalanx',
    description:
      'A militaristic elven state where discipline outweighs freedom and every citizen is raised to serve the realm. ' +
      'Governed by a warrior aristocracy that holds strength, sacrifice, and order as the only true foundations of civilization.',
    emoji: '🛡️',
    flagImg: 'assets/flags/greyhaven_flag.png',
    factionImg: 'assets/diplomacy/unknown_diplo.png',
    unitCardBgImg: 'assets/cards/backgrounds/archonate_greyhaven-unit-bg.png',
    color: '#2C5282',
    borderColor: '#1A365D',
    textColor: '#63B3ED',
    resources: {
      gold: GOLD_RESOURCE,
      advanced: [
        { id: 'aether',  name: 'Aether',  emoji: '✨', description: 'Arcane sea-mist. Powers elven constructions and advanced units.' },
        { id: 'tribute', name: 'Tribute', emoji: '⚖️', description: 'Taxation from subject provinces. Funds instant conscription and elite buildings.' },
      ],
      research: RESEARCH_RESOURCE,
    },
    startingResources: { gold: 50, research: 0, aether: 20, tribute: 20 },
    unitEmoji: '🛡️',
    playstyle: [
      { text: 'Aggressive playstyle',                                            type: 'neutral' },
      { text: 'Conscript Levies action available from the start',                type: 'boon'    },
      { text: 'Tribute Halls fund instant conscription on demand',               type: 'boon'    },
      { text: 'Strong, elite infantry mixed with cheap fodder',                  type: 'boon'    },
      { text: 'Weak archers and cavalry',                                        type: 'penalty' },
    ],
    biomePrefs: { primary: 'forest', secondary: 'coastal' },
    startingUnits: [{ unitId: 'archonate_levy', count: 2 }, { unitId: 'phalanx_soldier', count: 1 }],
    startingSpellbooks: { [SPELL_SCHOOL_IDS.ARCANE]: 3, [SPELL_SCHOOL_IDS.EARTH]: 3 },
    startingActions: ['conscript_levies'],
  },

  // ═══════════════════════════════════════════════════════
  // LIZARDMEN
  // ═══════════════════════════════════════════════════════

  {
    id: FACTION_IDS.SUTEKH_RA,
    raceId: RACE_IDS.LIZARD,
    name: 'The Dual Kingdom of Sutekh-Ra',
    shortName: 'Dual Kingdom',
    fullName: 'The Throne Beneath Sun and Moon',
    description:
      'An ancient lizardmen kingdom governed by rival priesthoods devoted to the celestial twins of sun and moon. ' +
      'The Pharaoh serves as sacred intermediary between gods and world, while the true struggle for power plays out behind temple walls.',
    emoji: '☀️',
    flagImg: 'assets/flags/dual_kingdom_flag.png',
    factionImg: 'assets/diplomacy/unknown_diplo.png',
    unitCardBgImg: 'assets/cards/backgrounds/sutekh_ra-unit-bg.png',
    color: '#C06020',
    borderColor: '#A04810',
    textColor: '#E08840',
    resources: {
      gold: GOLD_RESOURCE,
      advanced: [
        { id: 'ancient_lore', name: 'Ancient Lore', emoji: '📿', description: 'Ancestral knowledge from ancient ruins and temples. Enables powerful rituals and ancient units.' },
        { id: 'faith',        name: 'Faith',        emoji: '🌙', description: 'Devotion to the celestial twins. Powers blessings and moon priest resurrection.' },
      ],
      research: RESEARCH_RESOURCE,
    },
    startingResources: { gold: 50, research: 0, ancient_lore: 20, faith: 20 },
    unitEmoji: '☀️',
    playstyle: [
      { text: 'Balanced playstyle',                                              type: 'neutral' },
      { text: 'Strong divine units with special abilities',                      type: 'boon'    },
      { text: 'Religious buildings and locations are cheaper to build.',         type: 'boon'    },
      { text: 'Unremarkable non-divine troops',                                  type: 'penalty' },
      { text: 'Each province can only be dedicated to one of two cults',         type: 'penalty' },
    ],
    biomePrefs: { primary: 'desert', secondary: 'plains' },
    startingUnits: [{ unitId: 'river_skirmisher', count: 2 }, { unitId: 'sun_warrior', count: 1 }],
    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.LOCATION_COST_PERCENT,             target: 'shrine', percent: -10 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_IN_LOCATION_COST_PERCENT, target: 'shrine', percent: -10 }
    ],
    startingSpellbooks: { [SPELL_SCHOOL_IDS.DEATH]: 3, [SPELL_SCHOOL_IDS.FIRE]: 3 },
    onArmyCasualties: [FACTION_REACTION_IDS.SUTEKH_RA_MUMMY_SPAWN],
  },
  {
    id: FACTION_IDS.CLANS_FIRST_SCALE,
    raceId: RACE_IDS.LIZARD,
    name: 'The Clans of the First Scale',
    shortName: 'Clans',
    fullName: 'The Children of Fang and Thunder',
    description:
      'A loose confederation of warrior clans living by the law of strength and survival. ' +
      'Bound to the great beasts of their homelands, they raid and wage war alongside monstrous creatures, claiming by force what others cannot hold.',
    emoji: '🦎',
    flagImg: 'assets/flags/clans_flag.png',
    factionImg: 'assets/diplomacy/unknown_diplo.png',
    unitCardBgImg: 'assets/cards/backgrounds/clans_first_scale-unit-bg.png',
    color: '#276749',
    borderColor: '#22543D',
    textColor: '#68D391',
    resources: {
      gold: GOLD_RESOURCE,
      advanced: [
        { id: 'ancient_lore', name: 'Ancient Lore', emoji: '📿', description: 'Ancestral knowledge from ruins and beasts. Enables ancient rituals and creature bonds.' },
        { id: 'beasts',       name: 'Beasts',       emoji: '🦕', description: 'Bound war-creatures. Needed to recruit and sustain monster units in your armies.' },
      ],
      research: RESEARCH_RESOURCE,
    },
    startingResources: { gold: 50, research: 0, ancient_lore: 20, beasts: 20 },
    unitEmoji: '🦎',
    playstyle: [
      { text: 'Aggressive / raider playstyle',                                   type: 'neutral' },
      { text: 'Raiding captured provinces yields gold and damages buildings',    type: 'boon'    },
      { text: 'Beast Spawn fills army slots for free each turn',                 type: 'boon'    },
      { text: 'Nature & Ancient magic mastery',                                  type: 'boon'    },
      { text: 'All buildings cost 25–50% more to construct',                    type: 'penalty' },
      { text: 'All buildings take +1 turn longer to complete',                  type: 'penalty' },
    ],
    biomePrefs: { primary: 'forest', secondary: 'swamp' },
    startingUnits: [{ unitId: 'beast_tamer', count: 2 }, { unitId: 'clan_raider', count: 1 }],

    effects: [
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.LOCATION_COST_PERCENT,  target: 'all', percent: 25 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILDING_COST_PERCENT,  target: 'all', percent: 50 },
      { scope: EFFECT_SCOPES.FACTION, type: EFFECT_TYPES.BUILD_TIME_BONUS,       target: 'all', amount: 1 },
    ],

    startingSpellbooks: { [SPELL_SCHOOL_IDS.NATURE]: 3, [SPELL_SCHOOL_IDS.ANCIENT]: 3 },
    onProvinceCapture: [FACTION_REACTION_IDS.CLANS_RAID_ON_CAPTURE],
  },
];

/** Lookup by id */
export const FACTION_MAP = Object.fromEntries(FACTIONS.map(f => [f.id, f]));

/** The neutral/unclaimed "faction" (not a real faction — just a sentinel) */
export const NEUTRAL = {
  id: 'neutral',
  name: 'Unclaimed',
  emoji: '⬜',
  color: '#2a2a20',
  borderColor: '#3a3a28',
  textColor: '#888880',
  unitCardBgImg: 'assets/cards/backgrounds/neutral-unit-bg.png',
};
