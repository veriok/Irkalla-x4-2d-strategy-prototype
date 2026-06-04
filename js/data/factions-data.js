/**
 * factions-data.js
 * Static definitions for all 8 playable factions (4 races × 2 factions each).
 *
 * resources.advanced[0] = race-wide primary resource (faction_primary_adv)
 * resources.advanced[1] = faction-specific secondary resource (faction_secondary_adv)
 *
 * onProvinceCapture(battleResult, province, gameState) — optional reactive callback
 * onUnitDeath(unit, province, army, gameState)         — optional reactive callback
 */

import { RACE_IDS, FACTION_IDS } from './enums.js';

export const FACTIONS = [

  // ═══════════════════════════════════════════════════════
  // DWARVES
  // ═══════════════════════════════════════════════════════

  {
    id: FACTION_IDS.KUR_MARGAL,
    raceId: RACE_IDS.DWARF,
    name: 'Kur-Margal',
    fullName: 'The Undying Kingdom',
    description:
      'An ancient realm of undead dwarves ruled by the Eternal Sorcerer-King. ' +
      'Awakened from their tomb-cities after millennia of silence, their bronze-clad legions march ' +
      'alongside soul-bound constructs powered by the spirits of a civilization sacrificed for immortality.',
    emoji: '💀',
    flagImg: 'assets/flags/kur_margal.png',
    unitCardBgImg: 'assets/cards/backgrounds/kur_margal-unit-bg.png',
    backgroundImg: 'assets/backgrounds/kur_margal.jpg',
    color: '#8B6914',
    borderColor: '#b08020',
    textColor: '#d4a030',
    resources: {
      basic: { id: 'gold', name: 'Gold', emoji: '🪙', description: 'Universal currency.' },
      advanced: [
        { id: 'runes',  name: 'Runes',  emoji: '🔮', description: 'Ancient inscriptions empowering constructs and weapons. Sourced from forges and ancient ruins.' },
        { id: 'souls',  name: 'Souls',  emoji: '👻', description: 'Harvested from the slain. Needed to raise undead dwarves and sustain the kingdom\'s dark buildings.' },
      ],
    },
    startingResources: { gold: 50, research: 0, runes: 20, souls: 20 },
    unitEmoji: '💀',
    loreTag: 'Undying',
    playstyle: 'Defensive. Construct vanguard holds the line while undead elites ramp slowly. Soul resurrection makes dwarf units nearly unkillable when souls are plentiful.',
    biomePrefs: { primary: 'mountains', secondary: 'tundra' },
    startingUnits: [{ unitId: 'clay_golem', count: 2 }, { unitId: 'undead_levy', count: 1 }],

    // Reactive events
    onProvinceCapture(battleResult, province, gameState) {
      const fs = gameState.factions.get(FACTION_IDS.KUR_MARGAL);
      if (!fs) return;
      const gained = battleResult?.defeatedUnitCount ?? 0;
      if (gained > 0) {
        fs.resources.souls = (fs.resources.souls ?? 0) + gained;
      }
    },

    onUnitDeath(unit, province, army, gameState) {
      if (unit.raceId !== RACE_IDS.DWARF) return;
      if (unit.unitType === 'construct') return;
      const fs = gameState.factions.get(FACTION_IDS.KUR_MARGAL);
      if (!fs || (fs.resources.souls ?? 0) < 1) return;

      const eternalBinding = fs.unlockedTechs.includes('eternal_binding');
      if (eternalBinding && Math.random() < 0.5) return; // no soul consumed, no action either — resurrection still happens below

      fs.resources.souls -= 1;
      // Signal resurrection to combat resolver via a flag on the unit object
      unit._resurrect = true;
    },
  },

  {
    id: FACTION_IDS.IRON_FREEHOLDS,
    raceId: RACE_IDS.DWARF,
    name: 'The Iron Freeholds',
    fullName: 'The Descendants of the Last Rebellion',
    description:
      'A confederation of fiercely independent dwarf clans who rejected eternal servitude and chose freedom over immortality. ' +
      'Inventors, traders, explorers, airship captains, and sea-raiders — they answer to no ruler beyond their own clan councils.',
    emoji: '⚙️',
    flagImg: 'assets/flags/iron_freeholds.png',
    unitCardBgImg: 'assets/cards/backgrounds/iron_freeholds-unit-bg.png',
    backgroundImg: 'assets/backgrounds/iron_freeholds.jpg',
    color: '#4A5568',
    borderColor: '#2D3748',
    textColor: '#A0AEC0',
    resources: {
      basic: { id: 'gold', name: 'Gold', emoji: '🪙', description: 'Universal currency.' },
      advanced: [
        { id: 'runes',      name: 'Runes',      emoji: '🔮', description: 'Ancient dwarven inscriptions. Enhances weapons and armour.' },
        { id: 'schematics', name: 'Schematics', emoji: '📐', description: 'Engineering blueprints. Used to fortify provinces and develop advanced technology.' },
      ],
    },
    startingResources: { gold: 50, research: 0, runes: 20, schematics: 20 },
    unitEmoji: '⚙️',
    loreTag: 'Free',
    playstyle: 'Balanced. Economically flexible with strong siege capability and province fortification. Airship mobility counters slow dwarf movement.',
    biomePrefs: { primary: 'mountains', secondary: 'coastal' },
    startingUnits: [{ unitId: 'clan_fighter', count: 2 }, { unitId: 'clan_crossbowman', count: 1 }],
  },

  // ═══════════════════════════════════════════════════════
  // HUMANS
  // ═══════════════════════════════════════════════════════

  {
    id: FACTION_IDS.DRAIG_GOCH,
    raceId: RACE_IDS.HUMAN,
    name: 'Y Draig Goch',
    fullName: 'The Crimson Dragon Dominion',
    description:
      'A rigid realm of dragon-worshipping warrior nobility where honor, lineage, and duty define every aspect of life. ' +
      'From the forests of the north, its disciplined warriors seek to embody the wisdom and might of the great dragons they revere.',
    emoji: '🐉',
    flagImg: 'assets/flags/draig_goch.png',
    unitCardBgImg: 'assets/cards/backgrounds/draig_goch-unit-bg.png',
    backgroundImg: 'assets/backgrounds/draig_goch.jpg',
    color: '#7A1010',
    borderColor: '#601010',
    textColor: '#e04020',
    resources: {
      basic: { id: 'gold', name: 'Gold', emoji: '🪙', description: 'Universal currency.' },
      advanced: [
        { id: 'prestige',       name: 'Prestige',       emoji: '👑', description: 'Noble reputation earned through great deeds. Enables elite units and high-tier buildings.' },
        { id: 'dragon_essence', name: 'Dragon Essence', emoji: '🔥', description: 'Sacred dragon fire. Powers draconic blessings and the mightiest warriors.' },
      ],
    },
    startingResources: { gold: 50, research: 0, prestige: 20, dragon_essence: 20 },
    unitEmoji: '🐉',
    loreTag: 'Honorbound',
    playstyle: 'Aggressive. Honor-driven combat unlocks elite dragon warriors. Code of Honor army ability provides burst combat power.',
    biomePrefs: { primary: 'tundra', secondary: 'forest' },
    startingUnits: [{ unitId: 'draig_warrior', count: 2 }, { unitId: 'draig_bowman', count: 1 }],

    onProvinceCapture(battleResult, province, gameState) {
      const fs = gameState.factions.get(FACTION_IDS.DRAIG_GOCH);
      if (!fs) return;
      // Base victory prestige
      fs.resources.prestige = (fs.resources.prestige ?? 0) + 1;
      // Oath of the Dragon tech bonus
      if (fs.unlockedTechs.includes('oath_of_the_dragon')) {
        fs.resources.dragon_essence = (fs.resources.dragon_essence ?? 0) + 2;
      }
    },
  },

  {
    id: FACTION_IDS.AURIC_EMPIRE,
    raceId: RACE_IDS.HUMAN,
    name: 'The Auric Empire',
    fullName: 'The Throne of Golden Sails',
    description:
      'A sprawling commercial empire where merchant dynasties wield influence behind the Imperial Throne. ' +
      'Masters of trade, diplomacy, and intrigue, they bind distant lands together through contracts, coin, and commerce, preferring wealth and negotiation to open war.',
    emoji: '💰',
    flagImg: 'assets/flags/auric_empire.png',
    unitCardBgImg: 'assets/cards/backgrounds/auric_empire-unit-bg.png',
    backgroundImg: 'assets/backgrounds/auric_empire.jpg',
    color: '#B7791F',
    borderColor: '#975A16',
    textColor: '#F6E05E',
    resources: {
      basic: { id: 'gold', name: 'Gold', emoji: '🪙', description: 'Universal currency.' },
      advanced: [
        { id: 'prestige',  name: 'Prestige',  emoji: '👑', description: 'Noble reputation. Enables elite access and high-tier construction.' },
        { id: 'contracts', name: 'Contracts', emoji: '📜', description: 'Trade agreements. Can rush production or hire mercenaries instantly.' },
      ],
    },
    startingResources: { gold: 50, research: 0, prestige: 20, contracts: 20 },
    unitEmoji: '💰',
    loreTag: 'Imperial',
    playstyle: 'Economic. Rush production with Contracts, hire instant mercenaries, and use reduced conquest penalties to rapidly integrate captured territory.',
    biomePrefs: { primary: 'plains', secondary: 'coastal' },
    startingUnits: [{ unitId: 'imperial_levy', count: 2 }, { unitId: 'imperial_archer', count: 1 }],
  },

  // ═══════════════════════════════════════════════════════
  // ELVES
  // ═══════════════════════════════════════════════════════

  {
    id: FACTION_IDS.POLEIS_AETHERA,
    raceId: RACE_IDS.ELF,
    name: 'Poleis tou Aethera',
    fullName: 'The League of Azure Towers',
    description:
      'A league of prosperous maritime city-states renowned for their philosophers, explorers, artists, and sailors. ' +
      'Admirers of beauty and knowledge, they cultivate an image of refinement while pursuing the interests of their cities with unwavering pragmatism.',
    emoji: '🌿',
    flagImg: 'assets/flags/poleis_aethera.png',
    unitCardBgImg: 'assets/cards/backgrounds/poleis_aethera-unit-bg.png',
    backgroundImg: 'assets/backgrounds/poleis_aethera.jpg',
    color: '#1E6B5B',
    borderColor: '#204860',
    textColor: '#40c890',
    resources: {
      basic: { id: 'gold', name: 'Gold', emoji: '🪙', description: 'Universal currency.' },
      advanced: [
        { id: 'aether',     name: 'Aether',     emoji: '✨', description: 'Arcane sea-mist harvested from coastal towers. Powers elven magic and advanced units.' },
        { id: 'philosophy', name: 'Philosophy', emoji: '📜', description: 'Accumulated knowledge from great academies. Reduces research costs and unlocks powerful bonuses.' },
      ],
    },
    startingResources: { gold: 50, research: 0, aether: 20, philosophy: 20 },
    unitEmoji: '🌿',
    loreTag: 'Enlightened',
    playstyle: 'Wide. Naval expansion and fast movement. Clearing ruins/dens yields double rewards. Philosophy reduces research cost spiral.',
    biomePrefs: { primary: 'coastal', secondary: 'forest' },
    startingUnits: [{ unitId: 'aethera_hoplite', count: 2 }, { unitId: 'aethera_ranger', count: 1 }],
  },

  {
    id: FACTION_IDS.ARCHONATE_GREYHAVEN,
    raceId: RACE_IDS.ELF,
    name: 'The Archonate of Greyhaven',
    fullName: 'The Eternal Phalanx',
    description:
      'A militaristic elven state where discipline outweighs freedom and every citizen is raised to serve the realm. ' +
      'Sustained by vast subject castes and governed by a warrior aristocracy, it believes that strength, sacrifice, and order are the foundations of civilization.',
    emoji: '🛡️',
    flagImg: 'assets/flags/archonate_greyhaven.png',
    unitCardBgImg: 'assets/cards/backgrounds/archonate_greyhaven-unit-bg.png',
    backgroundImg: 'assets/backgrounds/archonate_greyhaven.jpg',
    color: '#2C5282',
    borderColor: '#1A365D',
    textColor: '#63B3ED',
    resources: {
      basic: { id: 'gold', name: 'Gold', emoji: '🪙', description: 'Universal currency.' },
      advanced: [
        { id: 'aether',  name: 'Aether',  emoji: '✨', description: 'Arcane sea-mist. Powers elven constructions and advanced units.' },
        { id: 'tribute', name: 'Tribute', emoji: '⚖️', description: 'Taxation from subject provinces. Funds instant conscription and elite buildings.' },
      ],
    },
    startingResources: { gold: 50, research: 0, aether: 20, tribute: 20 },
    unitEmoji: '🛡️',
    loreTag: 'Disciplined',
    playstyle: 'Tall defensive. Tribute from Tribute Halls enables instant conscription. Phalanx formations are nearly unbreakable when stacked.',
    biomePrefs: { primary: 'forest', secondary: 'coastal' },
    startingUnits: [{ unitId: 'archonate_levy', count: 2 }, { unitId: 'phalanx_soldier', count: 1 }],
  },

  // ═══════════════════════════════════════════════════════
  // LIZARDMEN
  // ═══════════════════════════════════════════════════════

  {
    id: FACTION_IDS.SUTEKH_RA,
    raceId: RACE_IDS.LIZARD,
    name: 'The Dual Kingdom of Sutekh-Ra',
    fullName: 'The Throne Beneath Sun and Moon',
    description:
      'An ancient river kingdom governed by rival priesthoods devoted to the celestial twins of day and night. ' +
      'While the Pharaoh serves as sacred intermediary between the gods and the world, the true struggle for power unfolds behind temple walls.',
    emoji: '☀️',
    flagImg: 'assets/flags/sutekh_ra.png',
    unitCardBgImg: 'assets/cards/backgrounds/sutekh_ra-unit-bg.png',
    backgroundImg: 'assets/backgrounds/sutekh_ra.jpg',
    color: '#C06020',
    borderColor: '#A04810',
    textColor: '#E08840',
    resources: {
      basic: { id: 'gold', name: 'Gold', emoji: '🪙', description: 'Universal currency.' },
      advanced: [
        { id: 'ancient_lore', name: 'Ancient Lore', emoji: '📿', description: 'Ancestral knowledge from ancient ruins and temples. Enables powerful rituals and ancient units.' },
        { id: 'faith',        name: 'Faith',        emoji: '🌙', description: 'Devotion to the celestial twins. Powers blessings and moon priest resurrection.' },
      ],
    },
    startingResources: { gold: 50, research: 0, ancient_lore: 20, faith: 20 },
    unitEmoji: '☀️',
    loreTag: 'Divine',
    playstyle: 'Balanced. Sun Priest auras buff armies. Moon Zealots have a 25% chance to return as undead mummies when slain. Celestial Blessings provide combat burst power.',
    biomePrefs: { primary: 'desert', secondary: 'plains' },
    startingUnits: [{ unitId: 'river_skirmisher', count: 2 }, { unitId: 'sun_warrior', count: 1 }],

    onUnitDeath(unit, province, army, gameState) {
      if (unit.id !== 'moon_zealot') return;
      if (Math.random() >= 0.25) return;
      // Spawn undead_mummy at same province
      unit._spawnOnDeath = 'undead_mummy';
    },
  },

  {
    id: FACTION_IDS.CLANS_FIRST_SCALE,
    raceId: RACE_IDS.LIZARD,
    name: 'The Clans of the First Scale',
    fullName: 'The Children of Fang and Thunder',
    description:
      'A loose confederation of warrior clans who live by the law of strength and survival. ' +
      'Bound to the great beasts of their homelands, they raid, hunt, and wage war alongside monstrous creatures, believing that the strong have the right to claim what they can hold.',
    emoji: '🦎',
    flagImg: 'assets/flags/clans_first_scale.png',
    unitCardBgImg: 'assets/cards/backgrounds/clans_first_scale-unit-bg.png',
    backgroundImg: 'assets/backgrounds/clans_first_scale.jpg',
    color: '#276749',
    borderColor: '#22543D',
    textColor: '#68D391',
    resources: {
      basic: { id: 'gold', name: 'Gold', emoji: '🪙', description: 'Universal currency.' },
      advanced: [
        { id: 'ancient_lore', name: 'Ancient Lore', emoji: '📿', description: 'Ancestral knowledge from ruins and beasts. Enables ancient rituals and creature bonds.' },
        { id: 'beasts',       name: 'Beasts',       emoji: '🦕', description: 'Bound war-creatures. Needed to recruit and sustain monster units in your armies.' },
      ],
    },
    startingResources: { gold: 50, research: 0, ancient_lore: 20, beasts: 20 },
    unitEmoji: '🦎',
    loreTag: 'Primal',
    playstyle: 'Raiding. Conquest rewards gold and may destroy enemy buildings. Beast Spawn fills armies from the land itself. Build costs are high but raid income compensates.',
    biomePrefs: { primary: 'forest', secondary: 'swamp' },
    startingUnits: [{ unitId: 'beast_tamer', count: 2 }, { unitId: 'clan_raider', count: 1 }],

    // Faction-scope build cost effects — processed by accumulateFactionEffects()
    effects: [
      { scope: 'faction', type: 'build_cost_percent', target: 'location', percent: 25 },
      { scope: 'faction', type: 'build_cost_percent', target: 'building', percent: 50 },
      { scope: 'faction', type: 'build_time_bonus',   target: 'all',      amount: 1 },
    ],

    onProvinceCapture(battleResult, province, gameState) {
      if (province.coreOf === FACTION_IDS.CLANS_FIRST_SCALE) return;
      const fs = gameState.factions.get(FACTION_IDS.CLANS_FIRST_SCALE);
      if (!fs) return;

      // Gold reward from buildings
      let gold = 0;
      for (const loc of (province.locations ?? [])) {
        if (!loc.isControllable) continue;
        for (const slot of (loc.buildings ?? [])) {
          const bId = slot.buildingId;
          // Assume tier is encoded in building id suffix (_1, _2, _3)
          const tierMatch = bId?.match(/_(\d)$/);
          const tier = tierMatch ? parseInt(tierMatch[1], 10) : 1;
          gold += tier * 15;
        }
      }
      fs.resources.gold = (fs.resources.gold ?? 0) + gold;

      // Random building destruction
      for (const loc of (province.locations ?? [])) {
        if (!loc.isControllable || loc.locationType === 'main_settlement') continue;
        if (Math.random() < 0.10) {
          // 10%: destroy entire location (turn to ruins)
          loc._raidDestroyed = true;
        } else if (!loc._raidDestroyed) {
          // 25%: downlevel one random building
          if ((loc.buildings ?? []).length > 0 && Math.random() < 0.25) {
            loc._raidDownlevel = true;
          }
        }
      }
    },
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
