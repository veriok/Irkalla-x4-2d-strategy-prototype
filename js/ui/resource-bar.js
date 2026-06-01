/**
 * resource-bar.js
 *
 * Renders the player's resources in the top bar.
 */

import { state, getFaction } from '../engine/game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { computeIncomeBreakdown } from '../engine/turn-engine.js';

const resourceBarEl  = document.getElementById('resource-bar');
const factionFlagEl  = document.getElementById('faction-flag');
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
  factionEmojiEl.hidden = false;
  factionNameEl.textContent  = faction.name;
  factionNameEl.style.color  = faction.textColor;

  if (factionFlagEl) {
    if (faction.flagImg) {
      factionFlagEl.hidden = true;
      factionFlagEl.onload = () => {
        factionFlagEl.hidden = false;
        factionEmojiEl.hidden = true;
      };
      factionFlagEl.onerror = () => {
        factionFlagEl.hidden = true;
        factionEmojiEl.hidden = false;
      };
      if (factionFlagEl.dataset.currentSrc !== faction.flagImg) {
        factionFlagEl.dataset.currentSrc = faction.flagImg;
        factionFlagEl.src = faction.flagImg;
      } else if (factionFlagEl.complete && factionFlagEl.naturalWidth > 0) {
        factionFlagEl.hidden = false;
        factionEmojiEl.hidden = true;
      }
    } else {
      factionFlagEl.hidden = true;
      factionFlagEl.dataset.currentSrc = '';
      factionFlagEl.removeAttribute('src');
      factionEmojiEl.hidden = false;
    }
  }

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
    const deltaRounded = Math.round(delta);
    const deltaClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';
    const deltaStr   = deltaRounded !== 0 ? `${deltaRounded > 0 ? '+' : ''}${deltaRounded}/turn` : '—';
    const tipLines   = info.sources.length > 0
      ? info.sources.map(s => `${s.label}: ${s.amount > 0 ? '+' : ''}${parseFloat(Number(s.amount).toFixed(2))}`).join('&#10;')
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
