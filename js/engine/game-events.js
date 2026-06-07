/**
 * game-events.js
 *
 * Lightweight pub-sub EventBus for game-logic events.
 *
 * Engine modules emit events via emit(). Faction reactions and other listeners
 * subscribe via on(). This keeps engine scripts decoupled — no script needs to
 * import faction definitions to react to game events.
 *
 * Events listed in DOM_FORWARD also dispatch a browser CustomEvent on document,
 * letting UI scripts listen without importing any engine module.
 * playerOnly events only forward to DOM when the emitting factionId matches the
 * player faction, read from document.body.dataset.playerFactionId (set at game start).
 */

import { GAME_EVENTS } from '../data/enums.js';

const _listeners = new Map();

// Only events listed here are forwarded to the DOM. Add an entry when a UI layer
// needs to react to a game event without importing engine modules.
const DOM_FORWARD = {
  [GAME_EVENTS.TECH_RESEARCHED]:   { domName: 'technology-researched',  playerOnly: true },
  [GAME_EVENTS.HERO_WOUNDED]:      { domName: 'hero-wounded',           playerOnly: true },
  [GAME_EVENTS.ARTIFACT_ACQUIRED]: { domName: 'artifact-acquired',      playerOnly: true },
  [GAME_EVENTS.HERO_CAN_LEVEL]:    { domName: 'hero-can-level',         playerOnly: true },
  [GAME_EVENTS.HERO_LEVELED]:      { domName: 'hero-leveled',           playerOnly: true },
};

export function on(event, fn) {
  if (!_listeners.has(event)) _listeners.set(event, []);
  _listeners.get(event).push(fn);
}

export function off(event, fn) {
  const arr = _listeners.get(event);
  if (arr) _listeners.set(event, arr.filter(f => f !== fn));
}

export function emit(event, data) {
  for (const fn of (_listeners.get(event) ?? [])) fn(data);

  const cfg = DOM_FORWARD[event];
  if (!cfg) return;

  const playerFactionId = document.body.dataset.playerFactionId;
  if (cfg.playerOnly && data?.factionId !== playerFactionId) return;

  document.dispatchEvent(new CustomEvent(cfg.domName, { detail: data }));
}
