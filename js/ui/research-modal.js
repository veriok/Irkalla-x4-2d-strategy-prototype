/**
 * research-modal.js
 *
 * Full-screen research tech tree modal.
 * Public API: showResearchModal(), hideResearchModal(), refreshResearchModal()
 */

import { state, getFaction, canAfford, unlockTech, getEffectiveTechCost } from '../engine/game-state.js';
import { computeIncome } from '../engine/turn-engine.js';
import { TECH_MAP, buildFactionTechTree } from '../data/techs-data.js';
import { createCard, getTechCardImage } from './card-renderer.js';
import { TECH_ERAS } from '../data/enums.js';
import { showTechTooltip, hideTechTooltip } from './tooltips.js';

const overlayEl   = document.getElementById('research-modal-overlay');
const closeBtn    = document.getElementById('rmod-close');
const poolEl      = document.getElementById('rmod-research-pool');
const treeGridEl  = document.getElementById('rmod-tree-grid');
const svgLines    = document.getElementById('rmod-lines');
const scrollEl    = document.getElementById('rmod-tree-scroll');

let _isOpen = false;

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

  // Draw lines after layout settles
  requestAnimationFrame(() => _drawLines(techTree, fs));
}

// ── Tree layout ───────────────────────────────────────────

const ERA_ORDER = [TECH_ERAS.STONE, TECH_ERAS.BRONZE, TECH_ERAS.IRON];
const ERA_LABELS = {
  [TECH_ERAS.STONE]:  '⚪ Stone Age',
  [TECH_ERAS.BRONZE]: '🟠 Bronze Age',
  [TECH_ERAS.IRON]:   '⚫ Iron Age',
};

function _renderTree(techTree, fs) {
  treeGridEl.innerHTML = '';

  const byEra = { [TECH_ERAS.STONE]: [], [TECH_ERAS.BRONZE]: [], [TECH_ERAS.IRON]: [] };
  for (const [slotId, techDef] of techTree.entries()) {
    const era = techDef.era ?? TECH_ERAS.STONE;
    if (byEra[era]) byEra[era].push(techDef);
  }

  for (const era of ERA_ORDER) {
    const eraSection = document.createElement('div');
    eraSection.className = 'rmod-era-col';
    eraSection.id = `rmod-col-${era}`;

    const header = document.createElement('div');
    header.className = 'rmod-era-header';
    header.textContent = ERA_LABELS[era] ?? era;
    eraSection.appendChild(header);

    // CSS grid: rows × cols determined by max row/col in this era
    const techs = byEra[era];
    const maxCol = techs.reduce((m, t) => Math.max(m, t.col ?? 0), 0);
    const maxRow = techs.reduce((m, t) => Math.max(m, t.row ?? 0), 0);

    const grid = document.createElement('div');
    grid.className = 'rmod-era-grid';
    grid.style.gridTemplateColumns = `repeat(${maxCol + 1}, var(--rmod-card-w))`;
    grid.style.gridTemplateRows    = `repeat(${maxRow + 1}, var(--rmod-row-h))`;
    eraSection.appendChild(grid);

    for (const techDef of techs) {
      const item = _makeTechItem(techDef, fs);
      // Explicit grid placement from data — supports empty cells naturally
      item.style.gridColumn = (techDef.col ?? 0) + 1;
      item.style.gridRow    = (techDef.row ?? 0) + 1;
      grid.appendChild(item);
    }

    treeGridEl.appendChild(eraSection);
  }
}

function _makeTechItem(techDef, fs) {
  const wrapper = document.createElement('div');
  wrapper.className = 'rmod-tech-item';
  wrapper.dataset.techId = techDef.id;

  const unlocked  = fs.unlockedTechs.includes(techDef.id);
  const prereqsMet = (techDef.requires ?? []).every(r => fs.unlockedTechs.includes(r));
  const cost      = getEffectiveTechCost(state.playerFactionId, techDef.baseCost);
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
      const missingId = (techDef.requires ?? []).find(r => !fs.unlockedTechs.includes(r));
      const missingDef = missingId ? TECH_MAP[missingId] : null;
      btn.textContent = missingDef ? `Req: ${missingDef.name}` : 'Requires tech';
      btn.disabled = true;
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

// ── SVG connection lines ──────────────────────────────────

const MAX_ROW_DIFF  = 5;    // clamp for Y-offset calculation
const MAX_Y_RATIO   = 0.25; // max 25% of card height offset from center
const ARROW_LEN     = 6;
const ARROW_W       = 4;

function _offsetFromContainer(el, container) {
  let x = 0, y = 0;
  let cur = el;
  while (cur && cur !== container) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    cur = cur.offsetParent;
  }
  return { x, y };
}

function _drawLines(techTree, fs) {
  svgLines.innerHTML = '';
  svgLines.setAttribute('width',  scrollEl.scrollWidth);
  svgLines.setAttribute('height', scrollEl.scrollHeight);

  function getItemEl(techId) {
    return treeGridEl.querySelector(`.rmod-tech-item[data-tech-id="${techId}"]`);
  }

  for (const [slotId, techDef] of techTree.entries()) {
    if (!techDef.requires || techDef.requires.length === 0) continue;

    const targetEl = getItemEl(techDef.id);
    if (!targetEl) continue;
    const targetOff = _offsetFromContainer(targetEl, scrollEl);
    const targetH   = targetEl.offsetHeight;
    const targetCenterY = targetOff.y + targetH * 0.5;

    for (const reqId of techDef.requires) {
      const sourceEl = getItemEl(reqId);
      if (!sourceEl) continue;
      const sourceOff = _offsetFromContainer(sourceEl, scrollEl);
      const sourceH   = sourceEl.offsetHeight;
      const sourceCenterY = sourceOff.y + sourceH * 0.5;

      // Row difference drives Y-offset (up to 25% of item height)
      const sourceDef   = techTree.get(reqId);
      const rowDiff     = (techDef.row ?? 0) - (sourceDef?.row ?? 0);
      const clamped     = Math.max(-MAX_ROW_DIFF, Math.min(MAX_ROW_DIFF, rowDiff));
      const maxOffset   = sourceH * MAX_Y_RATIO;
      const yOffset     = (clamped / MAX_ROW_DIFF) * maxOffset;

      const x1 = sourceOff.x + sourceEl.offsetWidth; // right edge of source
      const y1 = sourceCenterY + yOffset;             // departure: shifted toward target
      const x2 = targetOff.x;                         // left edge of target
      const y2 = targetCenterY - yOffset;             // arrival: shifted toward source (opposite direction)
      const midX = (x1 + x2) / 2;

      // Polyline: horizontal → vertical step → horizontal (angular, like Civ 4)
      const isStraight = Math.abs(y1 - y2) < 1.5;
      const points = isStraight
        ? `${x1},${y1} ${x2 - ARROW_LEN},${y2}`
        : `${x1},${y1} ${midX},${y1} ${midX},${y2} ${x2 - ARROW_LEN},${y2}`;

      // Unlock state → CSS class
      const sourceUnlocked = fs.unlockedTechs.includes(reqId);
      const targetUnlocked = fs.unlockedTechs.includes(techDef.id);
      const stateCls = sourceUnlocked && targetUnlocked ? 'unlocked'
                     : sourceUnlocked                   ? 'available'
                     :                                    'locked';

      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      poly.setAttribute('points', points);
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke-width', '2');
      poly.setAttribute('class', `rmod-line-${stateCls}`);
      svgLines.appendChild(poly);

      // Arrowhead at arrival (right-pointing triangle)
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      arrow.setAttribute('points',
        `${x2 - ARROW_LEN},${y2 - ARROW_W} ${x2},${y2} ${x2 - ARROW_LEN},${y2 + ARROW_W}`
      );
      arrow.setAttribute('stroke', 'none');
      arrow.setAttribute('class', `rmod-arrow-${stateCls}`);
      svgLines.appendChild(arrow);
    }
  }
}

// ── Scroll listener: redraw lines on scroll ───────────────
scrollEl?.addEventListener('scroll', () => {
  if (!_isOpen) return;
  const factionId = state.playerFactionId;
  if (!factionId) return;
  const fs = getFaction(factionId);
  const techTree = buildFactionTechTree(factionId);
  _drawLines(techTree, fs);
});

// ── Event listeners ───────────────────────────────────────
closeBtn?.addEventListener('click', hideResearchModal);

document.addEventListener('technology-researched', () => refreshResearchModal());

// Close on overlay backdrop click
overlayEl?.addEventListener('click', (e) => {
  if (e.target === overlayEl) hideResearchModal();
});
