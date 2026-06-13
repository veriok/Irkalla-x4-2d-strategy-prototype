/**
 * main.js — Entry point
 *
 * Startup sequence:
 *   1. Generate map (Voronoi, inject SVG paths)
 *   2. Initialise game world (game-state)
 *   3. Update fog of war
 *   4. Render map, resource bar, army panel
 *   5. Wire up UI callbacks
 *   6. Log turn 1
 */

import { generateMap, mapSharedEdges, mapNoisyEdgeData, MAP_SIZES, MAP_W, MAP_H } from './engine/map-generator.js';
import { initWorld, state, getFaction } from './engine/game-state.js';
import { updateFogOfWar } from './engine/fog-of-war.js';
import { renderAllProvinces, renderArmyIcons, initMapEvents,
         registerMapCallbacks, initMapPan, setMinimapCallback } from './ui/map-view.js';
import { renderResourceBar }   from './ui/resource-bar.js';
import { renderArmyPanel, registerArmyPanelCallbacks, setDetailProvince } from './ui/army-panel.js';
import { showProvincePanel, hideProvincePanel } from './ui/province-panel.js';
import { refreshProvinceModal } from './ui/province-modal.js';
import { showResearchModal, hideResearchModal, refreshResearchModal } from './ui/research-modal.js';
import { initHotkeys } from './ui/hotkeys.js';
import { initEndTurnButton }   from './ui/end-turn-btn.js';
import { logTurn, logMessage } from './ui/event-log.js';
import { FACTIONS, FACTION_MAP } from './data/factions-data.js';
import { SPELL_SCHOOL_MAP } from './data/hero-spells-data.js';
import { initMinimap, renderMinimap } from './ui/minimap.js';
import { registerFactionReactions } from './engine/faction-reactions.js';
import { openHeroPanel, initHeroPanel } from './ui/hero-panel.js';
import { initHeroAssignModal } from './ui/hero-assign-modal.js';
import { initSpellbook, initSpellbookListeners } from './ui/spellbook-modal.js';
import { grantStartingHero } from './engine/hero-engine.js';
import { initDiplomacyModal } from './ui/diplomacy-modal.js';
import './ui/settings-panel.js';

// ─── World gen picker ─────────────────────────────────────

const MAP_TYPES = [
  { id: 'pangea',     label: 'Pangea',     emoji: '🌍', desc: 'One large continent',   enabled: true  },
  { id: 'continents', label: 'Continents', emoji: '🗺', desc: 'Multiple landmasses',   enabled: false },
  { id: 'isles',      label: 'Isles',      emoji: '🏝', desc: 'Scattered islands',     enabled: false },
  { id: 'random',     label: 'Random',     emoji: '🎲', desc: 'Surprise world type',   enabled: false },
];

function showWorldGenPicker() {
  return new Promise(resolve => {
    const overlay   = document.getElementById('modal-overlay');
    const titleEl   = document.getElementById('modal-title');
    const bodyEl    = document.getElementById('modal-body');
    const buttonsEl = document.getElementById('modal-buttons');
    const boxEl     = document.getElementById('modal-box');

    titleEl.textContent = 'New World';
    buttonsEl.innerHTML = '';
    boxEl.classList.add('modal-wide');

    // Random starting seed
    const defaultSeed = Math.floor(Math.random() * 999999) + 1;
    let selectedType  = 'pangea';

    bodyEl.innerHTML = `
      <div class="world-gen-form">
        <div class="wg-section">
          <div class="wg-label">World Type</div>
          <div class="map-type-grid" id="wg-type-grid"></div>
        </div>
        <div class="wg-section wg-options-row">
          <div class="wg-opt">
            <label class="wg-label" for="wg-size">World Size</label>
            <select id="wg-size" class="wg-select">
              <option value="small">Small — 20 land provinces</option>
              <option value="medium" selected>Medium — 32 land provinces</option>
              <option value="large">Large — 44 land provinces</option>
              <option value="huge">Huge — 60 land provinces</option>
            </select>
          </div>
          <div class="wg-opt">
            <label class="wg-label" for="wg-seed">Seed</label>
            <div class="wg-seed-row">
              <input id="wg-seed" class="wg-input" type="number" min="1" max="999999"
                     value="${defaultSeed}" />
              <button id="wg-random" class="btn-secondary" title="Random seed">🎲</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Build map-type cards
    const grid = document.getElementById('wg-type-grid');
    for (const mt of MAP_TYPES) {
      const card = document.createElement('div');
      card.className = [
        'map-type-card',
        mt.enabled  ? 'map-type-card--active'  : 'map-type-card--disabled',
        mt.id === selectedType ? 'map-type-card--selected' : '',
      ].filter(Boolean).join(' ');
      card.dataset.id = mt.id;
      card.innerHTML = `
        <span class="mt-emoji">${mt.emoji}</span>
        <div class="mt-label">${mt.label}</div>
        <div class="mt-desc">${mt.desc}</div>
        ${!mt.enabled ? '<div class="mt-soon">Coming soon</div>' : ''}
      `;
      if (mt.enabled) {
        card.addEventListener('click', () => {
          selectedType = mt.id;
          for (const c of grid.querySelectorAll('.map-type-card--active')) {
            c.classList.remove('map-type-card--selected');
          }
          card.classList.add('map-type-card--selected');
        });
      }
      grid.appendChild(card);
    }

    // Randomise seed button
    document.getElementById('wg-random').addEventListener('click', () => {
      document.getElementById('wg-seed').value =
        String(Math.floor(Math.random() * 999999) + 1);
    });

    // Generate button
    const genBtn = document.createElement('button');
    genBtn.className = 'btn-primary';
    genBtn.textContent = 'Generate World ▶';
    genBtn.addEventListener('click', () => {
      const seedRaw  = parseInt(document.getElementById('wg-seed').value, 10);
      const seed     = (Number.isFinite(seedRaw) && seedRaw > 0) ? seedRaw : defaultSeed;
      const worldSize = document.getElementById('wg-size').value;
      overlay.hidden = true;
      boxEl.classList.remove('modal-wide');
      resolve({ mapType: selectedType, worldSize, seed });
    });
    buttonsEl.appendChild(genBtn);

    overlay.hidden = false;
  });
}

// ─── Faction picker ───────────────────────────────────────

let _fcTooltipEl = null;
function _getFcTooltip() {
  if (!_fcTooltipEl) {
    _fcTooltipEl = document.createElement('div');
    _fcTooltipEl.className = 'fc-playstyle-tooltip';
    _fcTooltipEl.hidden = true;
    document.body.appendChild(_fcTooltipEl);
  }
  return _fcTooltipEl;
}

function buildFactionPickerEl(onPick) {
  const raceOrder = [];
  const raceGroups = {};
  for (const f of FACTIONS) {
    if (!raceGroups[f.raceId]) { raceGroups[f.raceId] = []; raceOrder.push(f.raceId); }
    raceGroups[f.raceId].push(f);
  }
  const raceNames = { dwarf: 'Dwarves', elf: 'Elves', lizard: 'Lizardmen', human: 'Humans' };

  const layout = document.createElement('div');
  layout.className = 'fp-layout';

  // ── Left: flag browser ──────────────────────────────────
  const browser = document.createElement('div');
  browser.className = 'fp-flag-browser';

  for (const raceId of raceOrder) {
    const section = document.createElement('div');
    section.className = 'fp-race-section';

    const label = document.createElement('div');
    label.className = 'fp-race-label';
    label.textContent = raceNames[raceId] ?? raceId;
    section.appendChild(label);

    const flagsRow = document.createElement('div');
    flagsRow.className = 'fp-flags-row';

    for (const f of raceGroups[raceId]) {
      const btn = document.createElement('button');
      btn.className = 'fp-flag-btn';
      btn.title = f.name;
      btn.dataset.factionId = f.id;

      const img = document.createElement('img');
      img.src = f.flagImg ?? '';
      img.alt = f.name;
      img.className = 'fp-flag-img';
      btn.appendChild(img);

      btn.addEventListener('click', () => selectFaction(f.id));
      flagsRow.appendChild(btn);
    }

    section.appendChild(flagsRow);
    browser.appendChild(section);
  }
  layout.appendChild(browser);

  // ── Separator ───────────────────────────────────────────
  const sep = document.createElement('div');
  sep.className = 'fp-separator';
  layout.appendChild(sep);

  // ── Right: detail panel ─────────────────────────────────
  const detail = document.createElement('div');
  detail.className = 'fp-detail';
  layout.appendChild(detail);

  function selectFaction(factionId) {
    layout.querySelectorAll('.fp-flag-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.factionId === factionId);
    });

    const f = FACTIONS.find(x => x.id === factionId);
    if (!f) return;

    detail.innerHTML = '';
    detail.style.setProperty('--fc', f.color);

    const titleEl = document.createElement('div');
    titleEl.className = 'fp-detail-title';
    titleEl.textContent = 'Choose Your Faction';
    detail.appendChild(titleEl);

    // Leader image + name block
    const inner = document.createElement('div');
    inner.className = 'fp-detail-inner';
    inner.innerHTML = `
      <div class="fp-detail-leader-wrap">
        <img class="fp-detail-leader" src="${f.factionImg ?? ''}" alt="${f.name}" />
      </div>
      <div class="fp-detail-name">${f.name}</div>
      <div class="fp-detail-full">${f.fullName}</div>
      <div class="fp-detail-desc">${f.description}</div>
    `;
    detail.appendChild(inner);

    // Magic + Playstyle row
    const infoRow = document.createElement('div');
    infoRow.className = 'fp-info-row';

    // Left: spellbooks
    const sbooksEntries = Object.entries(f.startingSpellbooks ?? {});
    const sbooksHtml = sbooksEntries
      .flatMap(([sid, n]) => {
        const s = SPELL_SCHOOL_MAP[sid];
        return Array.from({ length: n }, () =>
          `<span class="fc-spellbook-cover" style="background:${s?.color ?? '#555'}">${s?.icon ?? '📖'}</span>`
        );
      }).join('');
    infoRow.innerHTML = `
      <div class="fp-magic-col">
        <div class="fp-col-label">Magic</div>
        <div class="fc-spellbooks fp-spellbooks">${sbooksHtml}</div>
      </div>
      <div class="fp-playstyle-col">
        <div class="fp-col-label">Playstyle</div>
        <ul class="fp-playstyle-list">
          ${(f.playstyle ?? []).map(e =>
            `<li class="fp-playstyle-entry fp-playstyle-${e.type}">${e.text}</li>`
          ).join('')}
        </ul>
      </div>
    `;
    detail.appendChild(infoRow);

    // Play button
    const playBtn = document.createElement('button');
    playBtn.className = 'btn-primary fp-play-btn';
    playBtn.textContent = `Play as ${f.shortName ?? f.name}`;
    playBtn.addEventListener('click', () => onPick(f.id));
    detail.appendChild(playBtn);
  }

  // Default to first faction
  selectFaction(FACTIONS[0]?.id);

  return layout;
}

function showFactionPicker() {
  return new Promise(resolve => {
    const overlay   = document.getElementById('modal-overlay');
    const titleEl   = document.getElementById('modal-title');
    const bodyEl    = document.getElementById('modal-body');
    const buttonsEl = document.getElementById('modal-buttons');
    const boxEl     = document.getElementById('modal-box');

    titleEl.textContent = '';
    bodyEl.innerHTML    = '';
    buttonsEl.innerHTML = '';
    boxEl.classList.add('modal-wide');

    bodyEl.appendChild(buildFactionPickerEl(factionId => {
      overlay.hidden = true;
      boxEl.classList.remove('modal-wide');
      resolve(factionId);
    }));

    overlay.hidden = false;
  });
}

// ─── Startup ──────────────────────────────────────────────
async function init() {
  const svgEl = document.getElementById('map');

  // 1. Show world gen picker — choose map type, size, seed
  const worldConfig = await showWorldGenPicker();

  // 2. Generate Voronoi map + inject SVG paths
  let provinceData;
  try {
    provinceData = generateMap(worldConfig.seed, svgEl, worldConfig.mapType, worldConfig.worldSize);
  } catch (err) {
    console.error('Map generation failed:', err);
    document.body.innerHTML = `<div style="color:#f00;padding:2rem">
      Map generation failed — check console.<br><pre>${err.message}</pre>
    </div>`;
    return;
  }

  // 3. Initialise camera / pan system
  initMapPan(svgEl, MAP_W, MAP_H);

  // 4. Show faction picker — wait for choice
  const playerFaction = await showFactionPicker();

  // 5. Initialise game state
  document.body.dataset.playerFactionId = playerFaction;
  initWorld(provinceData, playerFaction);
  state.sharedEdges   = mapSharedEdges;
  state.noisyEdgeData = mapNoisyEdgeData;
  registerFactionReactions();

  // Grant each faction a starting hero assigned to their capital army
  for (const factionId of state.factions.keys()) {
    grantStartingHero(factionId);
  }

  // 6. Minimap init + wire callback
  initMinimap(MAP_W, MAP_H);
  setMinimapCallback(renderMinimap);

  // 7. Fog of war
  updateFogOfWar();

  // 8. Render map
  renderAllProvinces();
  renderArmyIcons();

  // 9. Resource bar
  renderResourceBar();

  // 10. Army panel
  renderArmyPanel();

  // 11. Map event callbacks
  registerMapCallbacks({
    onProvinceSelect: (provinceId) => {
      setDetailProvince(provinceId);
      showProvincePanel(provinceId);
      renderArmyPanel();
    },
    onArmySelect: () => { renderArmyPanel(); },
  });
  initMapEvents();

  registerArmyPanelCallbacks({
    onArmySelect:   () => { renderArmyIcons(); },
    onShowProvince: (provinceId) => { showProvincePanel(provinceId); },
  });

  // 12. End Turn button
  initEndTurnButton();

  // 13. Research button + open-research-modal event (fired by resource chip click)
  document.getElementById('research-btn')?.addEventListener('click', showResearchModal);
  document.addEventListener('open-research-modal', showResearchModal);

  // Diplomacy
  initDiplomacyModal();

  // Heroes button
  initHeroPanel();
  initHeroAssignModal();
  document.addEventListener('open-hero-panel', openHeroPanel);

  // Spellbook
  initSpellbook();
  initSpellbookListeners();

  // Hero event notifications
  document.addEventListener('hero-wounded', ({ detail }) => {
    const fs = getFaction(detail.factionId);
    const hero = fs?.heroes?.find(h => h.id === detail.heroId);
    if (hero) logMessage(`⚔ ${hero.name} has been wounded and will recover in ${hero.woundedFor} turns.`);
    renderArmyPanel();
  });
  document.addEventListener('artifact-acquired', ({ detail }) => {
    if (detail.artifactName) logMessage(`💎 Artifact acquired: ${detail.artifactName}!`);
  });
  document.addEventListener('hero-can-level', ({ detail }) => {
    logMessage(`⬆ ${detail.heroName} can level up to Level ${detail.newLevel}!`);
    renderResourceBar();
  });
  document.addEventListener('hero-leveled', () => {
    renderResourceBar();
    renderArmyPanel();
  });

  // 14. Army panel: re-render immediately on tech unlock (unit stat changes)
  document.addEventListener('technology-researched', ({ detail }) => {
    if (detail?.techDef?.effects?.some(e => e.type === 'stat_modifier_unit_type')) {
      renderArmyPanel();
    }
  });

  // 15. Province panel: re-render on tech unlock (income/militia changes)
  document.addEventListener('technology-researched', () => {
    if (state.selectedProvinceId) showProvincePanel(state.selectedProvinceId);
    refreshProvinceModal();
  });

  // 16. Hotkeys (ESC, m)
  initHotkeys();

  // 13. Hook end-turn completion to refresh UI panels
  patchEndTurnCallback();

  // 14. Initial log entry
  logTurn(1);
  const chosen = FACTION_MAP[playerFaction];
  logMessage(`Welcome to Irkallia. You lead ${chosen?.name ?? playerFaction}. Good luck.`);
}

/**
 * Wrap the end-turn button's onComplete to also refresh army panel + province panel.
 * (end-turn-btn.js handles map/resource/fog already; this catches the UI panel refreshes)
 */
function patchEndTurnCallback() {
  // Observe turn number changes by polling state after each turn
  // (simple approach — no event bus needed for prototype)
  let lastTurn = state.turn;
  const observer = setInterval(() => {
    if (state.turn !== lastTurn) {
      lastTurn = state.turn;
      renderArmyPanel();
      renderResourceBar();
      // Refresh province panel if a province is selected
      if (state.selectedProvinceId) {
        showProvincePanel(state.selectedProvinceId);
      }
      // Refresh province modal if open
      refreshProvinceModal();
      // Refresh research modal if open
      refreshResearchModal();
    }
  }, 200);
}

// ─── Boot ─────────────────────────────────────────────────
init().catch(err => {
  console.error('Startup error:', err);
});
