/**
 * fog-of-war.js
 *
 * Computes province visibility from the player's perspective.
 * Three states:
 *   'visible'    — player owns or has an army in an adjacent province
 *   'explored'   — was visible in a past turn (shows terrain + last known owner)
 *   'unexplored' — never seen
 *
 * Updates province.visibility and the #fog-layer SVG paths.
 */

import { state, getProvincesByFaction, getArmiesByFaction } from './game-state.js';
import { markMet, areMet } from './diplomacy.js';

/**
 * Recompute visibility for the player faction and update SVG fog layer.
 */
export function updateFogOfWar() {
  const playerFactionId = state.playerFactionId;
  if (!playerFactionId) return;

  // Collect all provinces that should be visible this turn
  const visibleIds = new Set();

  // Owned provinces are always visible
  for (const prov of getProvincesByFaction(playerFactionId)) {
    visibleIds.add(prov.id);
    // Adjacent provinces are also visible
    for (const adjId of prov.adjacentIds) {
      visibleIds.add(adjId);
    }
  }

  // Provinces with a player army are visible, plus their neighbors
  for (const army of getArmiesByFaction(playerFactionId)) {
    visibleIds.add(army.provinceId);
    const prov = state.provinces.get(army.provinceId);
    if (prov) {
      for (const adjId of prov.adjacentIds) {
        visibleIds.add(adjId);
      }
    }
  }

  const playerFactionId2 = state.playerFactionId;

  // Update province visibility states
  for (const prov of state.provinces.values()) {
    if (visibleIds.has(prov.id)) {
      prov.visibility = 'visible';
      // Check faction meeting: when we first see a province owned by another faction
      if (playerFactionId2 && prov.ownerId && prov.ownerId !== 'neutral' &&
          prov.ownerId !== 'ocean' && prov.ownerId !== playerFactionId2) {
        if (state.diplomacy?.size > 0 && !areMet(playerFactionId2, prov.ownerId)) {
          markMet(playerFactionId2, prov.ownerId);
        }
      }
    } else if (prov.visibility === 'visible') {
      // Was visible last check → now explored (greyed)
      prov.visibility = 'explored';
    }
    // 'unexplored' stays 'unexplored' if never visited
  }

  // Update SVG fog layer
  applyFogToSVG();
}

/**
 * Apply current visibility states to the #fog-layer SVG paths.
 */
export function applyFogToSVG() {
  for (const prov of state.provinces.values()) {
    const fogPath = document.getElementById(`fog_${prov.id}`);
    if (!fogPath) continue;

    fogPath.classList.remove('fog-unexplored', 'fog-explored', 'fog-visible');

    switch (prov.visibility) {
      case 'visible':
        fogPath.classList.add('fog-visible');
        break;
      case 'explored':
        fogPath.classList.add('fog-explored');
        break;
      case 'unexplored':
      default:
        fogPath.classList.add('fog-unexplored');
        break;
    }
  }
}
