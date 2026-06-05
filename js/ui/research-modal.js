/**
 * research-modal.js
 *
 * Full-screen research tech tree modal.
 * Public API: showResearchModal(), hideResearchModal(), refreshResearchModal()
 */

import { state, getFaction, canAfford, unlockTech, getEffectiveTechCost } from '../engine/game-state.js';
import { computeIncome } from '../engine/turn-engine.js';
import { TECH_MAP, buildFactionTechTree, resolveTechBaseCost } from '../data/techs-data.js';
import { createCard, getTechCardImage } from './card-renderer.js';
import { TECH_ERAS } from '../data/enums.js';
import { showTechTooltip, hideTechTooltip } from './tooltips.js';

const overlayEl   = document.getElementById('research-modal-overlay');
const closeBtn    = document.getElementById('rmod-close');
const poolEl      = document.getElementById('rmod-research-pool');
const treeGridEl  = document.getElementById('rmod-tree-grid');
const scrollEl    = document.getElementById('rmod-tree-scroll');

let _isOpen     = false;
let _activeEra  = TECH_ERAS.STONE;

// ── Public API ────────────────────────────────────────────

export function showResearchModal() {
  _isOpen = true;
  overlayEl.hidden = false;
  _render();
}

export function hideResearchModal() {
  _isOpen = false;
  overlayEl.hidden = true;
}

export function refreshResearchModal() {
  if (!_isOpen) return;
  _render();
}

export function showResearchModalAndHighlight(techId) {
  const techEra = TECH_MAP[techId]?.era ?? TECH_ERAS.STONE;
  if (techEra !== _activeEra) {
    _activeEra = techEra;
  }
  showResearchModal();
  requestAnimationFrame(() => {
    const el = overlayEl.querySelector(`[data-tech-id="${techId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('tech-highlight-blink');
    el.addEventListener('animationend', () => el.classList.remove('tech-highlight-blink'), { once: true });
  });
}

// ── Rendering ─────────────────────────────────────────────

function _render() {
  const factionId = state.playerFactionId;
  if (!factionId) return;

  const fs        = getFaction(factionId);
  const techTree  = buildFactionTechTree(factionId);
  const income    = computeIncome(factionId);

  // Header pool display
  const balance      = fs.resources.research ?? 0;
  const incomePerTurn = Math.round(income.research ?? 0);
  const multiplier   = fs.researchCostMultiplier ?? 1.0;
  const pctIncrease  = Math.round((multiplier - 1) * 100);

  poolEl.innerHTML = `
    <span class="rmod-balance">📚 ${balance}</span>
    <span class="rmod-income">${incomePerTurn > 0 ? `+${incomePerTurn}/turn` : '—/turn'}</span>
    <span class="rmod-cost-multiplier">${pctIncrease > 0 ? `(costs +${pctIncrease}%)` : ''}</span>
  `;

  _renderTree(techTree, fs);
  _applyActiveEra();
}

// ── Tree layout ───────────────────────────────────────────

const ERA_ORDER = [
  TECH_ERAS.STONE, TECH_ERAS.BRONZE, TECH_ERAS.IRON,
  TECH_ERAS.SILVER, TECH_ERAS.GOLD, TECH_ERAS.MITHRIL,
];

function _renderTree(techTree, fs) {
  treeGridEl.innerHTML = '';

  const byEra = Object.fromEntries(ERA_ORDER.map(e => [e, []]));
  for (const [, techDef] of techTree.entries()) {
    const era = techDef.era ?? TECH_ERAS.STONE;
    if (byEra[era]) byEra[era].push(techDef);
  }

  for (const era of ERA_ORDER) {
    const eraSection = document.createElement('div');
    eraSection.className = 'rmod-era-col';
    eraSection.id = `rmod-col-${era}`;

    const grid = document.createElement('div');
    grid.className = 'rmod-era-grid';
    eraSection.appendChild(grid);

    for (const techDef of _depthSort(byEra[era])) {
      grid.appendChild(_makeTechItem(techDef, fs, techTree));
    }

    treeGridEl.appendChild(eraSection);
  }
}

/** Sort techs by intra-era dependency depth, then alphabetically. */
function _depthSort(techDefs) {
  const slotOf = t => t.replacesId ?? t.id;
  const eraSlots = new Set(techDefs.map(slotOf));
  const depth = new Map(techDefs.map(t => [t.id, 0]));

  let changed = true;
  while (changed) {
    changed = false;
    for (const t of techDefs) {
      const reqSlot = TECH_MAP[slotOf(t)]?.requires;
      if (!reqSlot || !eraSlots.has(reqSlot)) continue;
      const pred = techDefs.find(d => slotOf(d) === reqSlot);
      if (!pred) continue;
      const d = (depth.get(pred.id) ?? 0) + 1;
      if (d > depth.get(t.id)) { depth.set(t.id, d); changed = true; }
    }
  }

  return [...techDefs].sort((a, b) =>
    depth.get(a.id) !== depth.get(b.id)
      ? depth.get(a.id) - depth.get(b.id)
      : a.id.localeCompare(b.id)
  );
}

function _applyActiveEra() {
  ERA_ORDER.forEach(era => {
    const col = document.getElementById(`rmod-col-${era}`);
    if (col) col.classList.toggle('active', era === _activeEra);
  });
  overlayEl.querySelectorAll('.rmod-era-tab').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.era === _activeEra)
  );
}

function _makeTechItem(techDef, fs, techTree) {
  const wrapper = document.createElement('div');
  wrapper.className = 'rmod-tech-item';
  wrapper.dataset.techId = techDef.id;

  const unlocked  = fs.unlockedTechs.includes(techDef.id);
  const req = TECH_MAP[techDef.replacesId ?? techDef.id]?.requires;
  const prereqsMet = !req || fs.unlockedTechs.includes(req);
  const cost      = getEffectiveTechCost(state.playerFactionId, resolveTechBaseCost(techDef));
  const affordable = canAfford(state.playerFactionId, { research: cost });

  let cardClass = 'tech-locked';
  if (unlocked)        cardClass = 'tech-unlocked';
  else if (prereqsMet && affordable) cardClass = 'tech-affordable tech-available';
  else if (prereqsMet) cardClass = 'tech-available';

  // Name label above the card
  const nameLabel = document.createElement('div');
  nameLabel.className = 'rmod-tech-name';
  nameLabel.textContent = techDef.name;
  wrapper.appendChild(nameLabel);

  const card = createCard({
    variant: 'building',
    compositeSrc: techDef.img ?? getTechCardImage(techDef.id),
    fallbackIcon: techDef.emoji,
    fallbackName: '',
    fallbackSub: '',
  });
  card.classList.add(...cardClass.split(' '));
  card.addEventListener('mouseenter', () => showTechTooltip(techDef, card));
  card.addEventListener('mouseleave', () => hideTechTooltip());
  wrapper.appendChild(card);

  if (unlocked) {
    const label = document.createElement('div');
    label.className = 'rmod-unlocked-label';
    label.textContent = '✓ Unlocked';
    wrapper.appendChild(label);
  } else {
    const btn = document.createElement('button');
    btn.className = 'rmod-unlock-btn';

    if (!prereqsMet) {
      const missingId = TECH_MAP[techDef.replacesId ?? techDef.id]?.requires;
      const missingDef = missingId ? (techTree?.get(missingId) ?? TECH_MAP[missingId]) : null;
      btn.textContent = missingDef ? `Req: ${missingDef.name}` : 'Requires tech';
      if (missingId) {
        btn.classList.add('rmod-req-btn');
        btn.addEventListener('click', () => showResearchModalAndHighlight(missingDef.id));
      } else {
        btn.disabled = true;
      }
    } else if (!affordable) {
      btn.textContent = `Need ${cost} 📚`;
      btn.disabled = true;
    } else {
      btn.textContent = `Unlock (${cost} 📚)`;
      btn.disabled = false;
      btn.addEventListener('click', () => {
        const ok = unlockTech(state.playerFactionId, techDef.id);
        if (ok) _render();
      });
    }

    wrapper.appendChild(btn);
  }

  return wrapper;
}

// ── Event listeners ───────────────────────────────────────
overlayEl?.addEventListener('click', e => {
  const tab = e.target.closest('.rmod-era-tab');
  if (!tab) return;
  _activeEra = tab.dataset.era;
  _applyActiveEra();
});

closeBtn?.addEventListener('click', hideResearchModal);

document.addEventListener('technology-researched', () => refreshResearchModal());

// Close on overlay backdrop click
overlayEl?.addEventListener('click', (e) => {
  if (e.target === overlayEl) hideResearchModal();
});
