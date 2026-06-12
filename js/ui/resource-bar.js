/**
 * resource-bar.js
 *
 * Renders the player's resources in the top bar.
 */

import { state, getFaction, computeHeroCount } from '../engine/game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { computeIncomeBreakdown } from '../engine/turn-engine.js';
import { showFactionEffectsTooltip, hideFactionEffectsTooltip } from './tooltips.js';

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
    faction.resources.gold,
    ...faction.resources.advanced,
    faction.resources.research,
  ];

  resourceBarEl.innerHTML = allResources.map(res => {
    const amount = Math.floor(fs.resources[res.id] ?? 0);
    const info   = breakdown[res.id] ?? { total: 0, sources: [] };
    const delta  = info.total;
    const deltaDisplay = Math.round(delta);
    const deltaClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';
    const deltaStr   = deltaDisplay !== 0 ? `${deltaDisplay > 0 ? '+' : ''}${deltaDisplay}/turn` : '—';
    const tipLines   = info.sources.length > 0
      ? info.sources.map(s => `${s.label}: ${s.amount > 0 ? '+' : ''}${parseFloat(Number(s.amount).toFixed(2))}`).join('&#10;')
      : 'No income sources';
    const isResearch = res.id === 'research';

    return `<div class="resource-chip${isResearch ? ' resource-chip--research' : ''}" title="${res.description}" ${isResearch ? 'id="research-resource-chip"' : ''}>
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

  // Wire research chip click to open research modal (if available)
  const researchChip = document.getElementById('research-resource-chip');
  if (researchChip) {
    researchChip.style.cursor = 'pointer';
    researchChip.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('open-research-modal'));
    });
  }

  // Hero count chip — rendered in dedicated top-bar slot next to minimap button
  const heroesAreaEl = document.getElementById('heroes-top-area');
  if (heroesAreaEl) {
    const heroCount = fs.heroes?.length ?? 0;
    const heroMax   = computeHeroCount(playerFactionId);
    const pendingLevelUps = (fs.heroes ?? []).filter(h => h.pendingLevelUp).length;
    const alertBadge = pendingLevelUps > 0 ? `<span class="heroes-levelup-badge">⬆${pendingLevelUps}</span>` : '';
    heroesAreaEl.innerHTML = `<div class="resource-chip resource-chip--heroes" id="heroes-resource-chip" title="Heroes — click to manage" style="cursor:pointer">
      <div class="r-row-top">
        <span class="r-icon">🦸</span>
        <span class="r-name">Heroes</span>
        <span class="r-value">${heroCount}/${heroMax}</span>
        ${alertBadge}
      </div>
    </div>`;
    const heroChip = document.getElementById('heroes-resource-chip');
    if (heroChip) {
      heroChip.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('open-hero-panel'));
      });
    }
  }
}

document.addEventListener('technology-researched', () => renderResourceBar());

// Faction banner hover — show all active faction-level effects
const factionBannerEl = document.getElementById('faction-banner');
if (factionBannerEl) {
  factionBannerEl.style.cursor = 'help';
  factionBannerEl.addEventListener('mouseenter', (e) => showFactionEffectsTooltip(factionBannerEl, e));
  factionBannerEl.addEventListener('mouseleave', hideFactionEffectsTooltip);
}
