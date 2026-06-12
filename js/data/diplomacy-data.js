/**
 * diplomacy-data.js
 *
 * Static AI leader definitions for the diplomacy system.
 * One entry per faction — defines personality, budget bias, and memory modifiers.
 *
 * Fields:
 *   militaryBias    — shifts recruit/army-size thresholds (0–1)
 *   expansionBias   — shifts aggression toward neutral provinces (0–1)
 *   prefersSupriseWar   — if true, always skips formal war declaration
 *   aggressionThreshold — opinion below this → consider declaring war
 *   allianceThreshold   — opinion above this → consider proposing alliance
 *   warDeclarationChance — per-turn probability once threshold crossed
 *   memoryDuration       — global multiplier on all memory durations (1.0 = baseline)
 *   goldGiftEffectiveness — multiplies opinionDelta for GOLD_GIFT memories
 *   betrayalSensitivity   — multiplies opinionDelta for SURPRISE_WAR / TRUCE_BETRAYAL / ALLIANCE_BROKEN
 *   memoryDurationByType  — per-type duration multiplier (overrides global for that type)
 *   memoryOpinionMultiplierByType — per-type opinion delta multiplier
 *   racialDrift  — additive drift target modifier per race id
 *   factionDrift — additive drift target modifier per faction id
 */

import { FACTION_IDS, RACE_IDS, MEMORY_TYPES } from './enums.js';

const LEADER_DATA = [
  {
    factionId: FACTION_IDS.KUR_MARGAL,
    name: 'High Necromancer Valdris',
    leaderImg: 'assets/leaders/kur-margal.png',
    militaryBias: 0.7,
    expansionBias: 0.5,
    prefersSupriseWar: false,
    aggressionThreshold: -35,
    allianceThreshold: 55,
    warDeclarationChance: 0.25,
    memoryDuration: 2.5,
    goldGiftEffectiveness: 0.7,
    betrayalSensitivity: 1.8,
    memoryDurationByType: {},
    memoryOpinionMultiplierByType: {},
    racialDrift: {},
    factionDrift: { [FACTION_IDS.IRON_FREEHOLDS]: -8 },
  },
  {
    factionId: FACTION_IDS.IRON_FREEHOLDS,
    name: 'High Forgemaster Bram',
    leaderImg: 'assets/leaders/iron-freeholds.png',
    militaryBias: 0.55,
    expansionBias: 0.6,
    prefersSupriseWar: false,
    aggressionThreshold: -40,
    allianceThreshold: 50,
    warDeclarationChance: 0.2,
    memoryDuration: 1.5,
    goldGiftEffectiveness: 1.1,
    betrayalSensitivity: 1.2,
    memoryDurationByType: {},
    memoryOpinionMultiplierByType: {},
    racialDrift: {},
    factionDrift: { [FACTION_IDS.DRAIG_GOCH]: -6 },
  },
  {
    factionId: FACTION_IDS.DRAIG_GOCH,
    name: 'Dragon-Queen Ceridwen',
    leaderImg: 'assets/leaders/draig-goch.png',
    militaryBias: 0.65,
    expansionBias: 0.55,
    prefersSupriseWar: false,
    aggressionThreshold: -45,
    allianceThreshold: 60,
    warDeclarationChance: 0.2,
    memoryDuration: 1.0,
    goldGiftEffectiveness: 0.4,
    betrayalSensitivity: 2.2,
    memoryDurationByType: {},
    memoryOpinionMultiplierByType: {
      [MEMORY_TYPES.WAR_DECLARED_ON_US]: 0.5,
    },
    racialDrift: {},
    factionDrift: {},
  },
  {
    factionId: FACTION_IDS.AURIC_EMPIRE,
    name: 'Emperor Varanthos III',
    leaderImg: 'assets/leaders/auric-empire.png',
    militaryBias: 0.45,
    expansionBias: 0.65,
    prefersSupriseWar: false,
    aggressionThreshold: -40,
    allianceThreshold: 45,
    warDeclarationChance: 0.2,
    memoryDuration: 1.0,
    goldGiftEffectiveness: 1.8,
    betrayalSensitivity: 1.1,
    memoryDurationByType: {
      [MEMORY_TYPES.GOLD_GIFT]: 1.8,
      [MEMORY_TYPES.WAR_DECLARED_ON_US]: 1.6,
    },
    memoryOpinionMultiplierByType: {},
    racialDrift: { [RACE_IDS.HUMAN]: 5, [RACE_IDS.ELF]: 3 },
    factionDrift: {},
  },
  {
    factionId: FACTION_IDS.POLEIS_AETHERA,
    name: 'Thalassarch Elysia',
    leaderImg: 'assets/leaders/poleis-aethera.png',
    militaryBias: 0.5,
    expansionBias: 0.6,
    prefersSupriseWar: false,
    aggressionThreshold: -45,
    allianceThreshold: 50,
    warDeclarationChance: 0.2,
    memoryDuration: 1.0,
    goldGiftEffectiveness: 1.1,
    betrayalSensitivity: 1.2,
    memoryDurationByType: {},
    memoryOpinionMultiplierByType: {},
    racialDrift: {},
    factionDrift: {},
  },
  {
    factionId: FACTION_IDS.ARCHONATE_GREYHAVEN,
    name: 'Grand Archon Vetharis',
    leaderImg: 'assets/leaders/archonate-greyhaven.png',
    militaryBias: 0.7,
    expansionBias: 0.6,
    prefersSupriseWar: false,
    aggressionThreshold: -35,
    allianceThreshold: 55,
    warDeclarationChance: 0.3,
    memoryDuration: 1.0,
    goldGiftEffectiveness: 0.9,
    betrayalSensitivity: 1.3,
    memoryDurationByType: {},
    memoryOpinionMultiplierByType: {},
    racialDrift: {},
    factionDrift: {},
  },
  {
    factionId: FACTION_IDS.SUTEKH_RA,
    name: 'God-Pharaoh Amenkharis',
    leaderImg: 'assets/leaders/sutekh-ra.png',
    militaryBias: 0.6,
    expansionBias: 0.55,
    prefersSupriseWar: false,
    aggressionThreshold: -40,
    allianceThreshold: 50,
    warDeclarationChance: 0.2,
    memoryDuration: 1.0,
    goldGiftEffectiveness: 1.0,
    betrayalSensitivity: 1.0,
    memoryDurationByType: {},
    memoryOpinionMultiplierByType: {},
    racialDrift: {},
    factionDrift: {},
  },
  {
    factionId: FACTION_IDS.CLANS_FIRST_SCALE,
    name: 'Great Khan Skrath',
    leaderImg: 'assets/leaders/clans-first-scale.png',
    militaryBias: 0.75,
    expansionBias: 0.7,
    prefersSupriseWar: true,
    aggressionThreshold: -20,
    allianceThreshold: 60,
    warDeclarationChance: 0.4,
    memoryDuration: 0.8,
    goldGiftEffectiveness: 1.4,
    betrayalSensitivity: 1.0,
    memoryDurationByType: {},
    memoryOpinionMultiplierByType: {},
    racialDrift: {},
    factionDrift: {},
  },
];

export const LEADER_MAP = Object.freeze(
  Object.fromEntries(LEADER_DATA.map(l => [l.factionId, l]))
);

export { LEADER_DATA };
