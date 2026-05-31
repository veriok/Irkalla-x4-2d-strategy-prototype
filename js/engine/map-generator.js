/**
 * map-generator.js
 *
 * Generates a Paradox-style province map using d3-delaunay Voronoi.
 * - 24 provinces placed in faction quadrants + neutral zones
 * - Deterministic seeded RNG (mulberry32)
 * - Adjacency derived from Voronoi neighbor graph
 * - Biomes assigned by position heuristic
 * - Province names from a per-biome name list
 * - 2–6 locations per province
 * - Injects <path> and <text> elements into the SVG
 *
 * Returns an array of raw province descriptor objects consumed by game-state.js
 */

import { Delaunay } from 'd3-delaunay';
import { BIOMES, getBiome } from '../data/biomes-data.js';
import { FACTIONS } from '../data/factions-data.js';

// ─── Canvas size (must match SVG viewBox) ────────────────
export const MAP_W = 1000;
export const MAP_H = 600;

// ─── Seeded RNG (mulberry32) ─────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─── Province names per biome ────────────────────────────
const BIOME_NAMES = {
  plains:    ['Amara Fields','Duskmeadow','Goldvale','Sunrift','Harrow Plain','Siltvale','Amber March'],
  forest:    ['Thornwood','Verdant Hold','Ashgrove','Moonshadow','Ironbark','Deeproot','Willowfen'],
  mountains: ['Ironpeak','Stormcrag','Greymount','Ashrock','Flinthorn','Duskspire','Coldpass'],
  desert:    ['Khepret Wastes','Sunscorch','Ashsand','Bonedune','Miragefall','Aridus','Saltmere'],
  tundra:    ['Frostveil','Coldmarch','Blizzard Reach','Icevane','Snowmantle','Grimfrost','Whitewaste'],
  swamp:     ['Murkfen','Bogwall','Shadewater','Rotmire','Blackfen','Gloomwater','Drowning Veil'],
  coastal:   ['Saltshorn','Stormhaven','Coral Bay','Ironshores','Wavecrest','Tidecaller','Deephaven'],
};

// ─── Location type weights per biome ─────────────────────
const LOCATION_TYPE_WEIGHTS = {
  plains:    { village: 5, fort: 2, ruins: 1, shrine: 1 },
  forest:    { village: 3, fort: 2, monster_den: 3, shrine: 2 },
  mountains: { village: 2, fort: 4, monster_den: 3, ruins: 2 },
  desert:    { village: 2, ruins: 4, shrine: 3, monster_den: 2 },
  tundra:    { village: 3, fort: 2, monster_den: 4 },
  swamp:     { village: 2, monster_den: 5, ruins: 3, shrine: 1 },
  coastal:   { village: 4, fort: 2, ruins: 2, shrine: 2 },
};

function pickWeighted(rng, weights) {
  const keys = Object.keys(weights);
  const total = keys.reduce((s, k) => s + weights[k], 0);
  let r = rng() * total;
  for (const k of keys) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return keys[keys.length - 1];
}

// ─── Biome by map position ────────────────────────────────
function biomeFromPosition(x, y, rng) {
  const nx = x / MAP_W;   // 0..1
  const ny = y / MAP_H;   // 0..1

  // NW corner: dwarves territory → mountains/tundra
  if (nx < 0.28 && ny < 0.45) return rng() < 0.55 ? 'mountains' : 'tundra';
  // NE corner: elves territory → coastal/forest
  if (nx > 0.72 && ny < 0.45) return rng() < 0.55 ? 'coastal' : 'forest';
  // SE corner: lizards → desert/plains
  if (nx > 0.72 && ny > 0.55) return rng() < 0.6 ? 'desert' : 'plains';
  // SW corner: draig → forest/mountains
  if (nx < 0.28 && ny > 0.55) return rng() < 0.5 ? 'forest' : 'mountains';
  // Top/bottom edges: coastal
  if (ny < 0.12 || ny > 0.88) return 'coastal';
  // Left/right edges: coastal
  if (nx < 0.06 || nx > 0.94) return 'coastal';
  // Central band: mixed
  const roll = rng();
  if (roll < 0.22) return 'plains';
  if (roll < 0.40) return 'forest';
  if (roll < 0.55) return 'swamp';
  if (roll < 0.70) return 'desert';
  if (roll < 0.82) return 'mountains';
  if (roll < 0.92) return 'tundra';
  return 'coastal';
}

// ─── Seed points ──────────────────────────────────────────
/**
 * 24 seed points.
 * Layout: 4 faction quadrants with 5 provinces each + 4 neutral provinces
 * clustered in the center and borders.
 *
 * Quadrant hints:
 *   nw  → dwarves  (top-left)
 *   ne  → elves    (top-right)
 *   se  → lizards  (bottom-right)
 *   sw  → draig    (bottom-left)
 */
function generateSeeds(rng) {
  const jitter = (base, range) => base + (rng() - 0.5) * range;
  const PAD = 60;  // keep points away from edges so voronoi cells aren't too thin

  const seeds = [
    // ── NW (dwarves) × 5 ──
    { x: jitter(130, 60), y: jitter(110, 60), faction: 'dwarves', isCapital: true  },
    { x: jitter(200, 60), y: jitter(190, 60), faction: 'dwarves', isCapital: false },
    { x: jitter(100, 50), y: jitter(240, 60), faction: 'dwarves', isCapital: false },
    { x: jitter(250, 50), y: jitter(100, 50), faction: 'dwarves', isCapital: false },
    { x: jitter(160, 50), y: jitter(300, 50), faction: 'dwarves', isCapital: false },

    // ── NE (elves) × 5 ──
    { x: jitter(870, 60), y: jitter(110, 60), faction: 'elves',   isCapital: true  },
    { x: jitter(800, 60), y: jitter(190, 60), faction: 'elves',   isCapital: false },
    { x: jitter(900, 50), y: jitter(240, 60), faction: 'elves',   isCapital: false },
    { x: jitter(750, 50), y: jitter(100, 50), faction: 'elves',   isCapital: false },
    { x: jitter(840, 50), y: jitter(300, 50), faction: 'elves',   isCapital: false },

    // ── SE (lizards) × 5 ──
    { x: jitter(870, 60), y: jitter(490, 60), faction: 'lizards', isCapital: true  },
    { x: jitter(800, 60), y: jitter(410, 60), faction: 'lizards', isCapital: false },
    { x: jitter(900, 50), y: jitter(360, 60), faction: 'lizards', isCapital: false },
    { x: jitter(750, 50), y: jitter(500, 50), faction: 'lizards', isCapital: false },
    { x: jitter(840, 50), y: jitter(300, 50), faction: 'lizards', isCapital: false },

    // ── SW (draig) × 5 ──
    { x: jitter(130, 60), y: jitter(490, 60), faction: 'draig',   isCapital: true  },
    { x: jitter(200, 60), y: jitter(410, 60), faction: 'draig',   isCapital: false },
    { x: jitter(100, 50), y: jitter(360, 60), faction: 'draig',   isCapital: false },
    { x: jitter(250, 50), y: jitter(500, 50), faction: 'draig',   isCapital: false },
    { x: jitter(160, 50), y: jitter(300, 50), faction: 'draig',   isCapital: false },

    // ── Neutral × 4 (center) ──
    { x: jitter(500, 80), y: jitter(200, 60), faction: 'neutral', isCapital: false },
    { x: jitter(500, 80), y: jitter(400, 60), faction: 'neutral', isCapital: false },
    { x: jitter(360, 60), y: jitter(300, 80), faction: 'neutral', isCapital: false },
    { x: jitter(640, 60), y: jitter(300, 80), faction: 'neutral', isCapital: false },
  ];

  // Clamp to map bounds
  return seeds.map(s => ({
    ...s,
    x: Math.max(PAD, Math.min(MAP_W - PAD, s.x)),
    y: Math.max(PAD, Math.min(MAP_H - PAD, s.y)),
  }));
}

// ─── Polygon → SVG path string ───────────────────────────
function polygonToPath(polygon) {
  if (!polygon || polygon.length === 0) return '';
  const [first, ...rest] = polygon;
  return `M${first[0].toFixed(1)},${first[1].toFixed(1)}` +
    rest.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join('') +
    'Z';
}

// ─── Centroid of a polygon ───────────────────────────────
function centroid(polygon) {
  const n = polygon.length;
  const x = polygon.reduce((s, p) => s + p[0], 0) / n;
  const y = polygon.reduce((s, p) => s + p[1], 0) / n;
  return [Math.round(x), Math.round(y)];
}

// ─── Generate locations for a province ───────────────────
function generateLocations(provinceId, biomeId, isStartingProvince, isCapital, rng) {
  const locCount = isStartingProvince
    ? 3 + Math.floor(rng() * 2)      // 3–4 for starting provinces
    : 2 + Math.floor(rng() * 4);     // 2–5 for others (max 5 total with main)

  const weights = LOCATION_TYPE_WEIGHTS[biomeId] || LOCATION_TYPE_WEIGHTS.plains;
  const locations = [];
  const usedTypes = new Set();

  // First slot is always main_settlement for starting provinces; shrine/ruins otherwise
  if (isStartingProvince) {
    locations.push({
      id: `${provinceId}_loc_0`,
      provinceId,
      type: 'main_settlement',
      isControllable: true,
      isCapital,
      buildingSlots: 2,       // starts with 2 slots; upgrades via town_hall chain
      buildings: [],
      productionQueue: [],
    });
  } else {
    // Non-starting: 50% chance of a small settlement, otherwise ruins/shrine/den
    const t = rng() < 0.5 ? 'village' : (rng() < 0.5 ? 'ruins' : 'shrine');
    locations.push({
      id: `${provinceId}_loc_0`,
      provinceId,
      type: t,
      isControllable: t !== 'monster_den',
      isCapital: false,
      buildingSlots: t === 'village' ? 2 : 1,
      buildings: [],
      productionQueue: [],
    });
  }

  // Fill remaining slots
  for (let i = 1; i < locCount; i++) {
    // Avoid duplicate monster_den (max 1 per province)
    const adjustedWeights = usedTypes.has('monster_den')
      ? Object.fromEntries(Object.entries(weights).filter(([k]) => k !== 'monster_den'))
      : weights;

    const type = pickWeighted(rng, adjustedWeights);
    usedTypes.add(type);
    const isControllable = type !== 'monster_den';
    locations.push({
      id: `${provinceId}_loc_${i}`,
      provinceId,
      type,
      isControllable,
      isCapital: false,
      buildingSlots: type === 'village' ? 2 : type === 'fort' ? 1 : 1,
      buildings: [],
      productionQueue: [],
    });
  }

  return locations;
}

// ─── Name tracking to avoid duplicates ───────────────────
const usedNames = new Set();
function pickName(rng, biomeId) {
  const pool = BIOME_NAMES[biomeId] || BIOME_NAMES.plains;
  // shuffle-pick until unique or exhausted
  const shuffled = [...pool].sort(() => rng() - 0.5);
  for (const name of shuffled) {
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  // fallback: generate a numbered name
  const fallback = `${biomeId.charAt(0).toUpperCase() + biomeId.slice(1)} ${usedNames.size}`;
  usedNames.add(fallback);
  return fallback;
}

// ─── Main generator ──────────────────────────────────────
/**
 * @param {number} seed  - RNG seed (deterministic)
 * @param {SVGElement} svgEl - The #map SVG element to inject into
 * @returns {Array} provinceData - Array of raw province descriptors
 */
export function generateMap(seed, svgEl) {
  usedNames.clear();
  const rng = mulberry32(seed);

  const seeds = generateSeeds(rng);
  const points = seeds.map(s => [s.x, s.y]);
  const flatPoints = points.flat();

  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi([0, 0, MAP_W, MAP_H]);

  const provinceData = [];
  const nameRng = mulberry32(seed + 1);  // separate rng stream for names

  for (let i = 0; i < seeds.length; i++) {
    const polygon = voronoi.cellPolygon(i);
    if (!polygon) continue;

    const pathStr = polygonToPath(polygon);
    const center  = centroid(polygon);
    const seed_i  = seeds[i];
    const isStarting = seed_i.faction !== 'neutral';
    const biomeId = biomeFromPosition(seed_i.x, seed_i.y, rng);
    const name    = pickName(nameRng, biomeId);
    const id      = `prov_${i}`;

    const locations = generateLocations(id, biomeId, isStarting, seed_i.isCapital, rng);

    provinceData.push({
      id,
      index: i,
      name,
      biomeId,
      svgPath: pathStr,
      centroid: center,
      adjacentIds: [],   // filled after all provinces created (see below)
      startingFactionId: seed_i.faction,
      isCapital: seed_i.isCapital,
      locations,
    });
  }

  // ── Compute adjacency from Voronoi neighbor graph ────────
  for (let i = 0; i < provinceData.length; i++) {
    const neighbors = [];
    for (const j of voronoi.neighbors(i)) {
      if (j < provinceData.length) {
        neighbors.push(provinceData[j].id);
      }
    }
    provinceData[i].adjacentIds = neighbors;
  }

  // ── Inject <path> elements into SVG ──────────────────────
  const provincesG = svgEl.querySelector('#provinces');
  const fogG       = svgEl.querySelector('#fog-layer');
  const labelG     = svgEl.querySelector('#label-layer');

  provincesG.innerHTML = '';
  fogG.innerHTML       = '';
  labelG.innerHTML     = '';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  for (const prov of provinceData) {
    const biome = getBiome(prov.biomeId);

    // Province fill path
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('id', prov.id);
    path.setAttribute('data-province', prov.id);
    path.setAttribute('d', prov.svgPath);
    path.style.setProperty('--prov-color', biome.color);
    provincesG.appendChild(path);

    // Fog overlay path (same shape, initially unexplored)
    const fogPath = document.createElementNS(SVG_NS, 'path');
    fogPath.setAttribute('id', `fog_${prov.id}`);
    fogPath.setAttribute('data-province', prov.id);
    fogPath.setAttribute('d', prov.svgPath);
    fogPath.classList.add('fog-unexplored');
    fogG.appendChild(fogPath);

    // Province label
    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', prov.centroid[0]);
    label.setAttribute('y', prov.centroid[1]);
    label.setAttribute('id', `label_${prov.id}`);
    label.textContent = prov.name;
    labelG.appendChild(label);
  }

  return provinceData;
}
