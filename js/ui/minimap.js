/**
 * minimap.js
 *
 * Canvas-based overview minimap.
 * Shows province ownership (fog-aware), army positions, and the camera viewport rect.
 * Clicking the minimap instantly teleports the camera to that location.
 */

import { state } from '../engine/game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { getCameraState, setCameraPosition } from './map-view.js';

// Canvas dimensions (fixed; height recalculated from map aspect ratio at init)
const CANVAS_W = 240;

let _canvas = null;
let _ctx    = null;
let _mapW   = 1000;
let _mapH   = 600;
let _pathCache = null;   // Map<provinceId, Path2D>

/**
 * Initialise the minimap.
 * @param {number} mapW  - generated map width in SVG units
 * @param {number} mapH  - generated map height in SVG units
 */
export function initMinimap(mapW, mapH) {
  _mapW = mapW;
  _mapH = mapH;

  _canvas = document.getElementById('minimap-canvas');
  const wrap = document.getElementById('minimap-wrap');
  if (!_canvas || !wrap) return;

  // Set canvas pixel size proportional to map aspect ratio
  _canvas.width  = CANVAS_W;
  _canvas.height = Math.round(CANVAS_W * (mapH / mapW));
  wrap.appendChild(_canvas);   // ensure canvas is inside wrap (added via JS so it renders correctly)

  _ctx = _canvas.getContext('2d');

  // Minimap click → teleport camera
  _canvas.addEventListener('click', e => {
    const rect  = _canvas.getBoundingClientRect();
    const px    = (e.clientX - rect.left) * (_canvas.width  / rect.width);
    const py    = (e.clientY - rect.top)  * (_canvas.height / rect.height);
    const mapX  = (px / _canvas.width)  * _mapW;
    const mapY  = (py / _canvas.height) * _mapH;
    const cam   = getCameraState();
    setCameraPosition(mapX - cam.vw / 2, mapY - cam.vh / 2);
    renderMinimap();
  });

  // Toggle button wiring
  const btn = document.getElementById('minimap-btn');
  if (btn && wrap) {
    btn.addEventListener('click', () => {
      wrap.hidden = !wrap.hidden;
      if (!wrap.hidden) renderMinimap();
    });
  }
}

/**
 * Render the minimap onto its canvas.
 * Called automatically from map-view.js after province/army updates.
 */
export function renderMinimap() {
  if (!_canvas || !_ctx || !state.provinces.size) return;
  const wrap = document.getElementById('minimap-wrap');
  if (wrap?.hidden) return;  // skip when not visible

  const cw = _canvas.width;
  const ch = _canvas.height;
  const sx = cw / _mapW;
  const sy = ch / _mapH;

  // Rebuild Path2D cache when province count changes (new game / map change)
  if (!_pathCache || _pathCache.size !== state.provinces.size) {
    _pathCache = new Map();
    for (const prov of state.provinces.values()) {
      try { _pathCache.set(prov.id, new Path2D(prov.svgPath)); } catch (_) { /* skip */ }
    }
  }

  _ctx.clearRect(0, 0, cw, ch);
  _ctx.save();
  _ctx.scale(sx, sy);

  // Draw province fills
  for (const prov of state.provinces.values()) {
    const p2d = _pathCache.get(prov.id);
    if (!p2d) continue;

    let fill;
    if (prov.isOcean) {
      fill = prov.oceanType === 'shallow' ? '#1e4a6e' : '#0a1e33';
    } else if (prov.visibility === 'unexplored') {
      fill = '#1e1c18';
    } else if (prov.ownerId === 'neutral' || prov.ownerId === 'ocean') {
      fill = '#5a5a52';
    } else {
      fill = FACTION_MAP[prov.ownerId]?.color ?? '#5a5a52';
    }

    _ctx.fillStyle = fill;
    _ctx.fill(p2d);
    _ctx.strokeStyle = '#0a0907';
    _ctx.lineWidth   = 0.5;
    _ctx.stroke(p2d);
  }

  // Fog overlays on land provinces
  for (const prov of state.provinces.values()) {
    if (prov.isOcean) continue;
    const p2d = _pathCache.get(prov.id);
    if (!p2d) continue;
    if (prov.visibility === 'unexplored') {
      _ctx.fillStyle = 'rgba(0,0,0,0.88)';
      _ctx.fill(p2d);
    } else if (prov.visibility === 'explored') {
      _ctx.fillStyle = 'rgba(0,0,0,0.50)';
      _ctx.fill(p2d);
    }
  }

  _ctx.restore();

  // Army dots (drawn in screen-space after restoring scale)
  for (const army of state.armies.values()) {
    const prov = state.provinces.get(army.provinceId);
    if (!prov || prov.visibility === 'unexplored') continue;
    const faction = FACTION_MAP[army.factionId];
    if (!faction) continue;

    const [cx, cy] = prov.centroid;
    const dx = cx * sx;
    const dy = cy * sy;

    _ctx.fillStyle   = faction.color ?? '#ffffff';
    _ctx.strokeStyle = '#000';
    _ctx.lineWidth   = 0.8;
    _ctx.beginPath();
    _ctx.arc(dx, dy, 3, 0, Math.PI * 2);
    _ctx.fill();
    _ctx.stroke();
  }

  // Viewport rectangle
  const cam = getCameraState();
  const vx = cam.x  * sx;
  const vy = cam.y  * sy;
  const vw = cam.vw * sx;
  const vh = cam.vh * sy;

  _ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  _ctx.lineWidth   = 1;
  _ctx.strokeRect(vx, vy, vw, vh);
}
