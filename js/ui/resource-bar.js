/**
 * resource-bar.js
 *
 * Renders the player's resources in the top bar.
 */

import { state, getFaction } from '../engine/game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { computeIncomeBreakdown } from '../engine/turn-engine.js';

const resourceBarEl  = document.getElementById('resource-bar');
const factionEmojiEl = document.getElementById('faction-emoji');
const factionNameEl  = document.getElementById('faction-name');
const turnNumberEl   = document.getElementById('turn-number');

/**
 * Render the full resource bar for the player's faction.
 * Income breakdown is computed internally.
 */
export function renderResourceBar() {
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

  // Income breakdown
  const breakdown = computeIncomeBreakdown(playerFactionId);

  // Resource chips
  const allResources = [
    faction.resources.basic,
    ...faction.resources.advanced,
  ];

  resourceBarEl.innerHTML = allResources.map(res => {
    const amount = fs.resources[res.id] ?? 0;
    const info   = breakdown[res.id] ?? { total: 0, sources: [] };
    const delta  = info.total;
    const deltaClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';
    const deltaStr   = delta !== 0 ? `${delta > 0 ? '+' : ''}${delta}/turn` : '—';
    const tipLines   = info.sources.length > 0
      ? info.sources.map(s => `${s.label}: ${s.amount > 0 ? '+' : ''}${s.amount}`).join('&#10;')
      : 'No income sources';

    return `<div class="resource-chip" title="${res.description}">
      <div class="r-row-top">
        <span class="r-icon">${res.emoji}</span>
        <span class="r-name">${res.name}</span>
        <span class="r-value">${amount}</span>
      </div>
      <div class="r-row-bottom">
        <span class="r-delta ${deltaClass}" title="${tipLines}">${deltaStr}</span>
      </div>
    </div>`;
  }).join('');
}
