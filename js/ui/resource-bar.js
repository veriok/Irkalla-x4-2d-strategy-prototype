/**
 * resource-bar.js
 *
 * Renders the player's resources in the top bar.
 */

import { state, getFaction } from '../engine/game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';

const resourceBarEl  = document.getElementById('resource-bar');
const factionEmojiEl = document.getElementById('faction-emoji');
const factionNameEl  = document.getElementById('faction-name');
const turnNumberEl   = document.getElementById('turn-number');

/**
 * Render the full resource bar for the player's faction.
 * @param {Object} [incomeDeltas]  optional { [resourceId]: amount } showing per-turn income
 */
export function renderResourceBar(incomeDeltas = {}) {
  const playerFactionId = state.playerFactionId;
  if (!playerFactionId) return;

  const faction = FACTION_MAP[playerFactionId];
  const fs      = getFaction(playerFactionId);
  if (!faction || !fs) return;

  // Faction banner
  factionEmojiEl.textContent = faction.emoji;
  factionNameEl.textContent  = faction.name;
  factionNameEl.style.color  = faction.textColor;

  // Turn counter
  turnNumberEl.textContent = state.turn;

  // Resource chips
  const allResources = [
    faction.resources.basic,
    ...faction.resources.advanced,
  ];

  resourceBarEl.innerHTML = allResources.map(res => {
    const amount = fs.resources[res.id] ?? 0;
    const delta  = incomeDeltas[res.id] ?? 0;
    const deltaClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';
    const deltaStr   = delta !== 0 ? `(${delta > 0 ? '+' : ''}${delta}/turn)` : '';

    return `<div class="resource-chip" title="${res.description}">
      <span class="r-icon">${res.emoji}</span>
      <span class="r-name" style="color:var(--text-muted);font-size:11px">${res.name}</span>
      <span class="r-value">${amount}</span>
      ${deltaStr ? `<span class="r-delta ${deltaClass}">${deltaStr}</span>` : ''}
    </div>`;
  }).join('');
}
