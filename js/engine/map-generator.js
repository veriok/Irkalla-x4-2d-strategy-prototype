/**
 * map-generator.js
 *
 * Generates a province map using d3-delaunay Voronoi.
 * Supports multiple world sizes and a Pangea map type.
 *
 * - Land seed points clustered in a central ellipse (Pangea layout)
 * - Ocean seed points placed around the perimeter
 * - Shallow ocean: cells adjacent to land; deep ocean: everything else
 * - Coastal land: land cells adjacent to any ocean cell
 * - Faction biomes derived from faction identity (N/S/E/W quadrant style)
 * - Inner decorative stroke on ocean cells via shrinkPolygon + #ocean-deco-layer
 * - Dynamic MAP_W / MAP_H driven by worldSize parameter
 *
 * Returns an array of raw province descriptors consumed by game-state.js
 */

import { Delaunay } from 'd3-delaunay';
import { getBiome } from '../data/biomes-data.js';
import { BIOME_DEN_ENCOUNTER, MONSTER_UNITS } from '../data/monsters-data.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { LOCATION_BASE_SLOTS, LOCATION_STARTING_BUILDING, LOCATION_TYPES } from '../models/location.js';

// ─── Map size configurations ──────────────────────────────
export const MAP_SIZES = {
  small:  { w: 1000, h: 600,  landCount: 20, oceanCount: 12 },
  medium: { w: 1400, h: 840,  landCount: 32, oceanCount: 14 },
  large:  { w: 1800, h: 1080, landCount: 44, oceanCount: 18 },
  huge:   { w: 2200, h: 1320, landCount: 60, oceanCount: 22 },
};

// ─── Current map dimensions (live bindings — updated per generateMap call) ──
export let MAP_W = 1000;
export let MAP_H = 600;

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
  plains:       ['Amara Fields','Duskmeadow','Goldvale','Sunrift','Harrow Plain','Siltvale','Amber March','Verdant Lea','Goldenfen'],
  forest:       ['Thornwood','Verdant Hold','Ashgrove','Moonshadow','Ironbark','Deeproot','Willowfen','Greywood','Briarmantle'],
  mountains:    ['Ironpeak','Stormcrag','Greymount','Ashrock','Flinthorn','Duskspire','Coldpass','Grimstone','Shatterveil'],
  desert:       ['Khepret Wastes','Sunscorch','Ashsand','Bonedune','Miragefall','Aridus','Saltmere','Dustfall','Blaze Reach'],
  tundra:       ['Frostveil','Coldmarch','Blizzard Reach','Icevane','Snowmantle','Grimfrost','Whitewaste','Greyice','Bitterwind'],
  swamp:        ['Murkfen','Bogwall','Shadewater','Rotmire','Blackfen','Gloomwater','Drowning Veil','Sloughmore','Festermire'],
  coastal:      ['Saltshorn','Stormhaven','Coral Bay','Ironshores','Wavecrest','Tidecaller','Deephaven','Saltmist','Breakwater'],
  shallow_ocean:['The Shallows','Grey Sound','Silver Reach','Stormshelf','Seawall','Brine Edge','The Narrows','Whitecap','Foamveil'],
  deep_ocean:   ['The Abyss','Darkwater','The Deep','Dreadwaters','Eternal Dark','Sunken Reach','The Vastness','Black Gulf','The Void'],
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

// ─── Blocker terrain weights per biome (for secondary slots) ─
const BIOME_BLOCKER_WEIGHTS = {
  plains:    { dense_forest: 1 },
  forest:    { dense_forest: 1 },
  mountains: { rocky_ground: 1 },
  desert:    { dry_wastes: 1 },
  tundra:    { frozen_wastes: 1 },
  swamp:     { dense_jungle: 1 },
  coastal:   { dense_forest: 1 },
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

// ─── Biome from faction identity ──────────────────────────
// Uses faction data biomePrefs; capitals get primary, non-capitals get weighted spread.
// Primary biome: 65% chance; secondary: 35% chance.
const BIOME_SECONDARY_WEIGHT = 0.35;
function biomeForFaction(factionId, rng, isCapital = false) {
  if (factionId === 'neutral') {
    const r = rng();
    if (r < 0.22) return 'plains';
    if (r < 0.40) return 'forest';
    if (r < 0.55) return 'swamp';
    if (r < 0.70) return 'desert';
    if (r < 0.82) return 'mountains';
    if (r < 0.92) return 'tundra';
    return 'coastal';
  }
  const faction = FACTION_MAP[factionId];
  const primary   = faction?.biomePrefs?.primary   ?? 'plains';
  const secondary = faction?.biomePrefs?.secondary ?? 'forest';
  if (isCapital) return primary;
  return rng() < (1 - BIOME_SECONDARY_WEIGHT) ? primary : secondary;
}

// ─── Pangea seed generation ───────────────────────────────
/**
 * Place land seeds in a central ellipse (faction quadrants + neutral center)
 * and ocean seeds outside the ellipse around the perimeter.
 */
function generateSeeds_pangea(rng, cfg) {
  const cx  = cfg.w / 2;
  const cy  = cfg.h / 2;
  const ax  = cfg.w * 0.32;   // ellipse semi-axis X
  const ay  = cfg.h * 0.34;   // ellipse semi-axis Y
  const PAD = 40;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const jitter = (base, range) => base + (rng() - 0.5) * range;

  // Land counts
  const factPerFaction = Math.max(3, Math.floor(cfg.landCount / 5));
  const neutralCount   = cfg.landCount - factPerFaction * 4;

  const seeds = [];

  function scatter(n, fx, fy, spread, faction) {
    for (let i = 0; i < n; i++) {
      seeds.push({
        x:         clamp(jitter(fx, spread), PAD, cfg.w - PAD),
        y:         clamp(jitter(fy, spread), PAD, cfg.h - PAD),
        faction,
        isCapital: i === 0,
      });
    }
  }

  // Four faction quadrants within the ellipse (one per race, default factions)
  // kur_margal = dwarf NW, poleis_aethera = elf NE, sutekh_ra = lizard SE, draig_goch = human SW
  scatter(factPerFaction, cx - ax * 0.50, cy - ay * 0.40, ax * 0.22, 'kur_margal');       // NW
  scatter(factPerFaction, cx + ax * 0.50, cy - ay * 0.40, ax * 0.22, 'poleis_aethera');   // NE
  scatter(factPerFaction, cx + ax * 0.50, cy + ay * 0.40, ax * 0.22, 'sutekh_ra');        // SE
  scatter(factPerFaction, cx - ax * 0.50, cy + ay * 0.40, ax * 0.22, 'draig_goch');       // SW

  // Neutral in centre band
  for (let i = 0; i < neutralCount; i++) {
    const angle = (i / neutralCount) * Math.PI * 2;
    const r     = (0.15 + rng() * 0.20) * Math.min(ax, ay);
    seeds.push({
      x:         clamp(cx + r * Math.cos(angle), PAD, cfg.w - PAD),
      y:         clamp(cy + r * Math.sin(angle), PAD, cfg.h - PAD),
      faction:   'neutral',
      isCapital: false,
    });
  }

  // Ocean seeds outside the ellipse, distributed around 360°
  for (let i = 0; i < cfg.oceanCount; i++) {
    const angle = (i / cfg.oceanCount) * Math.PI * 2
                + rng() * (Math.PI * 2 / cfg.oceanCount) * 0.6;
    const rFrac = 1.25 + rng() * 0.65;  // 1.25× – 1.90× ellipse radius
    const ox    = cx + ax * rFrac * Math.cos(angle);
    const oy    = cy + ay * rFrac * Math.sin(angle);
    seeds.push({
      x:         clamp(ox, 8, cfg.w - 8),
      y:         clamp(oy, 8, cfg.h - 8),
      faction:   'ocean',
      isCapital: false,
    });
  }

  return seeds;
}

// ─── Polygon area (shoelace formula) ─────────────────────
function polygonArea(polygon) {
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

// ─── Lloyd relaxation — move seeds toward cell centroids ─
/**
 * Runs `iterations` rounds of Lloyd relaxation to equalise cell sizes.
 * Seeds with faction 'ocean' are excluded (kept at their original positions
 * so the ocean ring stays at the perimeter).
 */
function lloydRelax(seeds, mapW, mapH, iterations = 3) {
  let pts = seeds.map(s => [s.x, s.y]);
  for (let iter = 0; iter < iterations; iter++) {
    const del = Delaunay.from(pts);
    const vor = del.voronoi([0, 0, mapW, mapH]);
    const next = pts.map((pt, i) => {
      if (seeds[i].faction === 'ocean') return pt;   // keep ocean seeds in place
      const poly = vor.cellPolygon(i);
      if (!poly) return pt;
      return centroid(poly);
    });
    pts = next;
  }
  // Write relaxed coords back to seeds
  return seeds.map((s, i) => ({ ...s, x: pts[i][0], y: pts[i][1] }));
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

// ─── Shrink polygon toward centroid (inner deco stroke) ──
function shrinkPolygon(polygon, [cx, cy], amount) {
  return polygon.map(([x, y]) => {
    const dx   = cx - x;
    const dy   = cy - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.1) return [x, y];
    const t = amount / dist;
    return [x + dx * t, y + dy * t];
  });
}

// ─── Generate locations for a province ───────────────────
/**
 * @param {string}  provinceId
 * @param {string}  biomeId
 * @param {boolean} isStartingProvince
 * @param {boolean} isCapital
 * @param {function} rng
 * @param {number}  area  - polygon area in SVG units² (larger → more locations)
 */
function generateLocations(provinceId, biomeId, isStartingProvince, isCapital, rng, area = 0) {
  // Scale location count with polygon area.
  // Median province on a medium map ≈ 36 000 u². Use that as the baseline (2–3 locs).
  // Clamp to 1–5 for non-starting, 3–5 for starting.
  let locCount;
  if (isStartingProvince) {
    const base = Math.round(2 + (area / 36000) * 1.5);
    locCount = Math.min(5, Math.max(3, base)) + (rng() < 0.5 ? 0 : 1);
  } else {
    const base = Math.round(1 + (area / 36000) * 2);
    locCount = Math.min(5, Math.max(1, base));
    // small jitter
    if (rng() < 0.35 && locCount < 5) locCount++;
  }

  const locations = [];

  // Only the true faction capital gets a main_settlement
  if (isCapital) {
    locations.push({
      id: `${provinceId}_loc_0`,
      provinceId,
      type: 'main_settlement',
      isControllable: true,
      isCapital: true,
      buildingSlots: 2,
      buildings: [],
    });
  } else {
    // All other provinces (starting or not) get one productive first location
    const firstLocOptions = ['village', 'fort', 'shrine', 'ruins'];
    const t = firstLocOptions[Math.floor(rng() * 4)];
    locations.push({
      id: `${provinceId}_loc_0`,
      provinceId,
      type: t,
      isControllable: LOCATION_TYPES[t]?.isControllable ?? false,
      isCapital: false,
      buildingSlots: LOCATION_BASE_SLOTS[t] ?? 1,
      buildings: LOCATION_STARTING_BUILDING[t] ? [{ buildingId: LOCATION_STARTING_BUILDING[t] }] : [],
    });
  }

  const blockerWeights = BIOME_BLOCKER_WEIGHTS[biomeId] ?? {};
  const hasBlockers = Object.keys(blockerWeights).length > 0;

  for (let i = 1; i < locCount; i++) {
    const hasDen = locations.some(l => l.type === 'monster_den');

    const roll = rng();
    let type;
    if (roll < 0.25) {
      type = 'empty';
    } else if (roll < 0.50) {
      // 25% monster den slot — if den already placed, use a blocker instead
      type = !hasDen ? 'monster_den' : (hasBlockers ? pickWeighted(rng, blockerWeights) : 'empty');
    } else {
      // 50% biome blocker (fall back to empty if biome has none)
      type = hasBlockers ? pickWeighted(rng, blockerWeights) : 'empty';
    }

    const loc = {
      id: `${provinceId}_loc_${i}`,
      provinceId,
      type,
      isControllable: LOCATION_TYPES[type]?.isControllable ?? false,
      isCapital: false,
      buildingSlots: LOCATION_BASE_SLOTS[type] ?? 1,
      buildings: [],
    };
    if (type === 'monster_den') {
      loc.denEnemies = _makeDenEnemies(biomeId);
    }
    locations.push(loc);
  }

  return locations;
}

function _makeDenEnemies(biomeId) {
  const enc = BIOME_DEN_ENCOUNTER[biomeId] ?? BIOME_DEN_ENCOUNTER.default;
  const unitDef = MONSTER_UNITS[enc.unitId];
  return {
    unitId: enc.unitId,
    hp: Array.from({ length: enc.count }, () => unitDef.maxHp),
    woundedHp: [],
  };
}

// ─── Name tracking to avoid duplicates ───────────────────
const usedNames = new Set();
function pickName(rng, biomeId) {
  const pool     = BIOME_NAMES[biomeId] || BIOME_NAMES.plains;
  const shuffled = [...pool].sort(() => rng() - 0.5);
  for (const name of shuffled) {
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  const fallback = `${biomeId.charAt(0).toUpperCase() + biomeId.slice(1)} ${usedNames.size}`;
  usedNames.add(fallback);
  return fallback;
}

// ─── Main generator ──────────────────────────────────────
/**
 * @param {number}     seed       - RNG seed (deterministic)
 * @param {SVGElement} svgEl      - The #map SVG element to inject into
 * @param {string}     mapType    - 'pangea' (only supported type currently)
 * @param {string}     worldSize  - 'small' | 'medium' | 'large' | 'huge'
 * @returns {Array} provinceData  - Array of raw province descriptors
 */
export function generateMap(seed, svgEl, mapType = 'pangea', worldSize = 'medium') {
  usedNames.clear();

  const cfg = MAP_SIZES[worldSize] ?? MAP_SIZES.medium;
  MAP_W = cfg.w;
  MAP_H = cfg.h;

  const rng     = mulberry32(seed);
  const nameRng = mulberry32(seed + 1);

  let seeds  = generateSeeds_pangea(rng, cfg);
  // Equalise cell sizes via Lloyd relaxation (ocean seeds are fixed)
  seeds      = lloydRelax(seeds, MAP_W, MAP_H, 4);
  const points = seeds.map(s => [s.x, s.y]);

  const delaunay = Delaunay.from(points);
  const voronoi  = delaunay.voronoi([0, 0, MAP_W, MAP_H]);

  // ── Build initial province descriptors ──────────────────
  const provinceData = [];

  for (let i = 0; i < seeds.length; i++) {
    const polygon = voronoi.cellPolygon(i);
    if (!polygon) continue;

    const s       = seeds[i];
    const isOcean = s.faction === 'ocean';
    const pathStr = polygonToPath(polygon);
    const center  = centroid(polygon);

    const biomeId = isOcean
      ? 'shallow_ocean'                    // reclassified after adjacency pass
      : biomeForFaction(s.faction, rng, s.isCapital);

    const name      = pickName(nameRng, biomeId);
    const id        = `prov_${i}`;
    const isStarting = !isOcean && s.faction !== 'neutral';

    const locations = isOcean
      ? []
      : generateLocations(id, biomeId, isStarting, s.isCapital, rng, polygonArea(polygon));

    provinceData.push({
      id,
      index: i,
      name,
      biomeId,
      svgPath: pathStr,
      centroid: center,
      adjacentIds: [],
      startingFactionId: isOcean ? 'ocean' : s.faction,
      isCapital: isOcean ? false : s.isCapital,
      locations,
      isOcean,
      oceanType: isOcean ? 'shallow' : null,   // reclassified below
      isCoastal: false,
    });
  }

  // ── Compute adjacency ────────────────────────────────────
  const n = provinceData.length;
  for (let i = 0; i < n; i++) {
    const neighbors = [];
    for (const j of voronoi.neighbors(i)) {
      if (j < n) neighbors.push(provinceData[j].id);
    }
    provinceData[i].adjacentIds = neighbors;
  }

  // ── Classify ocean as shallow / deep ────────────────────
  const idToIndex = new Map(provinceData.map((p, i) => [p.id, i]));

  for (const prov of provinceData) {
    if (!prov.isOcean) continue;
    const touchesLand = prov.adjacentIds.some(adjId => {
      const adj = provinceData[idToIndex.get(adjId)];
      return adj && !adj.isOcean;
    });
    prov.oceanType = touchesLand ? 'shallow' : 'deep';
    prov.biomeId   = touchesLand ? 'shallow_ocean' : 'deep_ocean';
    // Fix name using the correct ocean biome pool
    prov.name = pickName(nameRng, prov.biomeId);
  }

  // ── Mark coastal land provinces ──────────────────────────
  for (const prov of provinceData) {
    if (prov.isOcean) continue;
    prov.isCoastal = prov.adjacentIds.some(adjId => {
      const adj = provinceData[idToIndex.get(adjId)];
      return adj?.isOcean === true;
    });
  }

  // ── Ensure elf faction capital is on an actual ocean-adjacent province ──
  // (elves need coastal capital for shipyard access)
  {
    const ELF_FACTION = 'poleis_aethera';  // default elf faction that needs coastal capital
    const elfCap = provinceData.find(p => p.startingFactionId === ELF_FACTION && p.isCapital);
    if (elfCap && !elfCap.isCoastal) {
      const [ecx, ecy] = elfCap.centroid;
      const dist2 = p => (p.centroid[0] - ecx) ** 2 + (p.centroid[1] - ecy) ** 2;

      const candidate =
        provinceData.filter(p => p.startingFactionId === ELF_FACTION && !p.isCapital && p.isCoastal)
                    .sort((a, b) => dist2(a) - dist2(b))[0] ??
        provinceData.filter(p => p.startingFactionId === 'neutral' && p.isCoastal)
                    .sort((a, b) => dist2(a) - dist2(b))[0];

      if (candidate) {
        // Move capital flag to the coastal province
        elfCap.isCapital            = false;
        candidate.isCapital         = true;
        candidate.startingFactionId = ELF_FACTION;

        // Old capital falls back to forest (inland elf territory)
        elfCap.biomeId   = 'forest';
        elfCap.name      = pickName(nameRng, 'forest');
        elfCap.locations = generateLocations(
          elfCap.id, 'forest', true, false, rng,
          polygonArea(voronoi.cellPolygon(elfCap.index))
        );

        // New capital gets proper coastal biome + capital locations
        candidate.biomeId   = 'coastal';
        candidate.name      = pickName(nameRng, 'coastal');
        candidate.locations = generateLocations(
          candidate.id, 'coastal', true, true, rng,
          polygonArea(voronoi.cellPolygon(candidate.index))
        );
      }
    }
  }

  // ── Inject SVG elements ──────────────────────────────────
  const provincesG = svgEl.querySelector('#provinces');
  const oceanDecoG = svgEl.querySelector('#ocean-deco-layer');
  const fogG       = svgEl.querySelector('#fog-layer');
  const labelG     = svgEl.querySelector('#label-layer');

  provincesG.innerHTML = '';
  if (oceanDecoG) oceanDecoG.innerHTML = '';
  fogG.innerHTML       = '';
  labelG.innerHTML     = '';

  svgEl.setAttribute('viewBox', `0 0 ${MAP_W} ${MAP_H}`);

  const SVG_NS = 'http://www.w3.org/2000/svg';

  for (const prov of provinceData) {
    const biome = getBiome(prov.biomeId);

    // Province fill path
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('id', prov.id);
    path.setAttribute('data-province', prov.id);
    path.setAttribute('d', prov.svgPath);
    path.style.setProperty('--prov-color', biome.color);
    if (prov.isOcean) {
      path.classList.add(prov.oceanType === 'shallow' ? 'ocean-shallow' : 'ocean-deep');
    }
    provincesG.appendChild(path);

    // Ocean inner deco path (no data-province → no click/hover interception)
    if (prov.isOcean && oceanDecoG) {
      const polygon = voronoi.cellPolygon(prov.index);
      if (polygon) {
        const inset    = shrinkPolygon(polygon, prov.centroid, 4);
        const decoPath = document.createElementNS(SVG_NS, 'path');
        decoPath.setAttribute('d', polygonToPath(inset));
        decoPath.setAttribute('fill', 'none');
        decoPath.setAttribute('stroke', prov.oceanType === 'shallow' ? '#4a9fd0' : '#2a5f7a');
        decoPath.setAttribute('stroke-width', '1.5');
        decoPath.setAttribute('pointer-events', 'none');
        decoPath.classList.add('ocean-inner-deco');
        oceanDecoG.appendChild(decoPath);
      }
    }

    // Fog overlay path
    const fogPath = document.createElementNS(SVG_NS, 'path');
    fogPath.setAttribute('id', `fog_${prov.id}`);
    fogPath.setAttribute('data-province', prov.id);
    fogPath.setAttribute('d', prov.svgPath);
    fogPath.classList.add(prov.isOcean ? 'fog-visible' : 'fog-unexplored');
    fogG.appendChild(fogPath);

    // Province label (skip ocean)
    if (!prov.isOcean) {
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', prov.centroid[0]);
      label.setAttribute('y', prov.centroid[1]);
      label.setAttribute('id', `label_${prov.id}`);
      label.textContent = prov.name;
      labelG.appendChild(label);
    }
  }

  return provinceData;
}
