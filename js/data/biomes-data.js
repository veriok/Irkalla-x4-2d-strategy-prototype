/**
 * biomes-data.js
 * All province biomes with their properties.
 *
 * terrainDefBonus: flat defense multiplier added on top of base (0 = no bonus)
 * resourceMod:     multiplier applied to gold income from this province (1.0 = normal)
 * allowedLocTypes: what location types can appear in this biome
 *   main_settlement always allowed for starting provinces regardless of this list
 */

export const BIOMES = {
  plains: {
    id: 'plains',
    name: 'Plains',
    emoji: '🌾',
    color: '#6a8a3a',
    terrainDefBonus: -0.15,
    resourceMod: 1.15,      // fertile, good income
    allowedLocTypes: ['main_settlement', 'village', 'fort', 'ruins', 'shrine'],
    description: 'Open grasslands — easy to traverse, rich in farmland.',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    color: '#2e6a28',
    terrainDefBonus: 0.10, // forest cover helps defenders
    resourceMod: 0.9,
    allowedLocTypes: ['main_settlement', 'village', 'fort', 'shrine', 'monster_den'],
    description: 'Dense woodland — defenders gain cover. Rich in timber.',
  },
  mountains: {
    id: 'mountains',
    name: 'Mountains',
    emoji: '⛰️',
    color: '#7a6a58',
    terrainDefBonus: 0.20, // strong defensive terrain
    resourceMod: 0.85,
    allowedLocTypes: ['main_settlement', 'village', 'fort', 'monster_den', 'ruins'],
    description: 'Rugged peaks — formidable defenses, rich in ore.',
  },
  hills: {
    id: 'hills',
    name: 'Hills',
    emoji: '⛰',
    color: '#8a7a5a',
    terrainDefBonus: 0.10,
    resourceMod: 0.95,
    allowedLocTypes: ['main_settlement', 'village', 'fort', 'ruins', 'shrine'],
    description: 'Rolling highlands — moderate defenses, suitable for herding and light mining.',
  },
  desert: {
    id: 'desert',
    name: 'Desert',
    emoji: '🏜️',
    color: '#c8a040',
    terrainDefBonus: -0.10,
    resourceMod: 0.8,      // harsh, low income
    allowedLocTypes: ['main_settlement', 'village', 'ruins', 'shrine', 'monster_den'],
    description: 'Scorching sands — harsh and sparse, but hiding ancient ruins.',
  },
  tundra: {
    id: 'tundra',
    name: 'Tundra',
    emoji: '❄️',
    color: '#a0b8c0',
    terrainDefBonus: 0.00,
    resourceMod: 0.85,
    allowedLocTypes: ['main_settlement', 'village', 'fort', 'monster_den'],
    description: 'Frozen wastes — difficult terrain, sparse population.',
  },
  swamp: {
    id: 'swamp',
    name: 'Swamp',
    emoji: '🌿',
    color: '#4a7050',
    terrainDefBonus: 0.15,
    resourceMod: 0.8,
    allowedLocTypes: ['main_settlement', 'village', 'monster_den', 'ruins', 'shrine'],
    description: 'Boggy marshland — attackers struggle, strange creatures lurk.',
  },
  coastal: {
    id: 'coastal',
    name: 'Coastal',
    emoji: '🌊',
    color: '#3a70a0',
    terrainDefBonus: 0,
    resourceMod: 1.0,      // trade ports boost income
    allowedLocTypes: ['main_settlement', 'village', 'fort', 'ruins', 'shrine'],
    description: 'Shores and harbors — good trade, accessible to naval forces.',
  },
  shallow_ocean: {
    id: 'shallow_ocean',
    name: 'Shallow Sea',
    emoji: '🌊',
    color: '#1e4a6e',
    terrainDefBonus: 0,
    resourceMod: 0,
    allowedLocTypes: [],
    description: 'Shallow coastal waters — traversable by armies, but attackers suffer a -20% penalty.',
  },
  deep_ocean: {
    id: 'deep_ocean',
    name: 'Deep Ocean',
    emoji: '🌊',
    color: '#0a1e33',
    terrainDefBonus: 0,
    resourceMod: 0,
    allowedLocTypes: [],
    description: 'Impassable deep ocean.',
  },
};

/** Ordered list for random selection by map-generator */
export const BIOME_IDS = Object.keys(BIOMES);

/** Get biome by id, with fallback */
export function getBiome(id) {
  return BIOMES[id] ?? BIOMES.plains;
}
