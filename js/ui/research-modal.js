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
import { SPELL_SCHOOLS, SPELL_SCHOOL_MAP, getSpellsBySchool } from '../data/hero-spells-data.js';

const overlayEl    = document.getElementById('research-modal-overlay');
const closeBtn     = document.getElementById('rmod-close');
const poolEl       = document.getElementById('rmod-research-pool');
const treeGridEl   = document.getElementById('rmod-tree-grid');
const scrollEl     = document.getElementById('rmod-tree-scroll');
const magicPanelEl = document.getElementById('rmod-magic-panel');
const rmodBodyEl   = document.getElementById('rmod-body');

let _isOpen          = false;
let _activeEra       = TECH_ERAS.STONE;
let _magicSchoolPage = 0;
const SCHOOLS_PER_PAGE = 3;

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
  const balance      = Math.floor(fs.resources.research ?? 0);
  const incomePerTurn = Math.round(income.research ?? 0);
  const multiplier   = fs.researchCostMultiplier ?? 1.0;
  const pctIncrease  = Math.round((multiplier - 1) * 100);

  poolEl.innerHTML = `
    <span class="rmod-balance">📚 ${balance}</span>
    <span class="rmod-income">${incomePerTurn > 0 ? `+${incomePerTurn}/turn` : '—/turn'}</span>
    <span class="rmod-cost-multiplier">${pctIncrease > 0 ? `(costs +${pctIncrease}%)` : ''}</span>
  `;

  const isMagicTab = _activeEra === 'magic';
  if (scrollEl) scrollEl.hidden = isMagicTab;
  if (magicPanelEl) magicPanelEl.hidden = !isMagicTab;

  if (isMagicTab) {
    _renderMagicTab(fs, factionId);
  } else {
    _renderTree(techTree, fs);
  }
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

// ── Magic Tab (Spell Research) ───────────────────────────

const SPELL_TIER_COST = { 1: 25, 2: 50, 3: 75 };

/** Returns school defs for schools where the faction has at least 1 spellbook, in canonical order. */
function _getFactionSpellSchools(fs) {
  const spellbooks = fs.spellbooks ?? {};
  return SPELL_SCHOOLS
    .filter(s => (spellbooks[s.id] ?? 0) >= 1)
    .map(s => SPELL_SCHOOL_MAP[s.id])
    .filter(Boolean);
}

/** Bookshelf: flat row of coloured book covers, one per spellbook owned. */
function _renderSpellbookShelf(fs) {
  const spellbooks = fs.spellbooks ?? {};
  const shelfEl = document.createElement('div');
  shelfEl.className = 'rmod-spellbook-shelf';

  const label = document.createElement('span');
  label.className = 'rmod-spellbook-shelf-label';
  label.textContent = 'Spellbooks';
  shelfEl.appendChild(label);

  const booksRow = document.createElement('div');
  booksRow.className = 'rmod-spellbook-books';

  for (const school of SPELL_SCHOOLS) {
    const count = spellbooks[school.id] ?? 0;
    if (count === 0) continue;
    for (let i = 0; i < count; i++) {
      const cover = document.createElement('div');
      cover.className = 'rmod-spellbook-cover';
      cover.title = `${school.name} — ${count} spellbook${count !== 1 ? 's' : ''}`;
      cover.style.backgroundColor = school.color ?? '#444';
      cover.textContent = school.icon;
      booksRow.appendChild(cover);
    }
  }

  shelfEl.appendChild(booksRow);
  return shelfEl;
}

function _renderMagicTab(fs, factionId) {
  if (!magicPanelEl) return;
  magicPanelEl.innerHTML = '';

  const spellbooks = fs.spellbooks ?? {};
  const allSchools = _getFactionSpellSchools(fs);

  magicPanelEl.appendChild(_renderSpellbookShelf(fs));

  if (allSchools.length === 0) {
    const emptyEl = document.createElement('p');
    emptyEl.className = 'rmod-magic-empty';
    emptyEl.textContent = 'This faction has no spellbooks.';
    magicPanelEl.appendChild(emptyEl);
    return;
  }

  const totalPages = Math.ceil(allSchools.length / SCHOOLS_PER_PAGE);
  if (_magicSchoolPage >= totalPages) _magicSchoolPage = 0;

  if (allSchools.length > SCHOOLS_PER_PAGE) {
    magicPanelEl.appendChild(_renderSchoolPageNav(totalPages, fs, factionId));
  }

  const visibleSchools = allSchools.slice(
    _magicSchoolPage * SCHOOLS_PER_PAGE,
    (_magicSchoolPage + 1) * SCHOOLS_PER_PAGE,
  );

  const gridEl = document.createElement('div');
  gridEl.className = 'rmod-spell-grid';

  const unlockedSpells = new Set(fs.unlockedSpells ?? []);
  const researchBalance = Math.floor(fs.resources.research ?? 0);

  for (const school of visibleSchools) {
    const bookCount = spellbooks[school.id] ?? 0;
    gridEl.appendChild(_renderSchoolCol(school, bookCount, unlockedSpells, researchBalance, fs));
  }

  magicPanelEl.appendChild(gridEl);
}

function _renderSchoolPageNav(totalPages, fs, factionId) {
  const navEl = document.createElement('div');
  navEl.className = 'rmod-school-nav';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'rmod-school-nav-btn';
  prevBtn.textContent = '◄';
  prevBtn.disabled = _magicSchoolPage === 0;
  prevBtn.addEventListener('click', () => {
    _magicSchoolPage = Math.max(0, _magicSchoolPage - 1);
    _renderMagicTab(fs, factionId);
  });

  const pageInfo = document.createElement('span');
  pageInfo.className = 'rmod-school-nav-info';
  pageInfo.textContent = `${_magicSchoolPage + 1} / ${totalPages}`;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'rmod-school-nav-btn';
  nextBtn.textContent = '►';
  nextBtn.disabled = _magicSchoolPage >= totalPages - 1;
  nextBtn.addEventListener('click', () => {
    _magicSchoolPage = Math.min(totalPages - 1, _magicSchoolPage + 1);
    _renderMagicTab(fs, factionId);
  });

  navEl.appendChild(prevBtn);
  navEl.appendChild(pageInfo);
  navEl.appendChild(nextBtn);
  return navEl;
}

function _renderSchoolCol(school, bookCount, unlockedSpells, researchBalance, fs) {
  const col = document.createElement('div');
  col.className = 'rmod-spell-col';

  const header = document.createElement('div');
  header.className = 'rmod-spell-school-header';
  header.textContent = `${school.icon} ${school.name}`;
  if (school.color) header.style.setProperty('--school-color', school.color + '99');
  col.appendChild(header);

  const schoolSpells = getSpellsBySchool(school.id) ?? [];
  const spellsByTier = { 1: [], 2: [], 3: [] };
  for (const spell of schoolSpells) {
    if (spellsByTier[spell.tier]) spellsByTier[spell.tier].push(spell);
  }

  for (const tier of [1, 2, 3]) {
    const locked = bookCount < tier;
    const tierLabel = ['Novice', 'Expert', 'Master'][tier - 1];
    const cost = SPELL_TIER_COST[tier];

    const tierGroup = document.createElement('div');
    tierGroup.className = `rmod-spell-tier-group${locked ? ' rmod-spell-tier-group--locked' : ''}`;

    const tierHeader = document.createElement('div');
    tierHeader.className = 'rmod-spell-tier-label';
    if (locked) {
      tierHeader.classList.add('rmod-spell-tier-label--locked');
      tierHeader.textContent = `${tierLabel} — needs ${tier} spellbook${tier > 1 ? 's' : ''}`;
    } else {
      tierHeader.textContent = `${tierLabel} — ${cost} 📚`;
    }
    tierGroup.appendChild(tierHeader);

    for (const spell of spellsByTier[tier]) {
      const isUnlocked = unlockedSpells.has(spell.id);
      const canAffordSpell = !locked && researchBalance >= cost;

      const row = document.createElement('div');
      row.className = `rmod-spell-row${isUnlocked ? ' rmod-spell-row--unlocked' : ''}${locked ? ' rmod-spell-row--locked' : ''}`;

      const infoEl = document.createElement('div');
      infoEl.className = 'rmod-spell-info';
      infoEl.innerHTML = `
        <span class="rmod-spell-name">${spell.name}</span>
        <span class="rmod-spell-type">${spell.type === 'combat' ? '⚔ Combat' : '🏛 Province'}</span>
        <span class="rmod-spell-desc">${spell.description ?? ''}</span>
      `;
      row.appendChild(infoEl);

      if (!locked) {
        if (isUnlocked) {
          const known = document.createElement('span');
          known.className = 'rmod-spell-known';
          known.textContent = '✓ Known';
          row.appendChild(known);
        } else {
          const btn = document.createElement('button');
          btn.className = `rmod-spell-btn${!canAffordSpell ? ' rmod-spell-btn--poor' : ''}`;
          btn.disabled = !canAffordSpell;
          btn.textContent = canAffordSpell ? `Research (${cost} 📚)` : `Need ${cost} 📚`;
          btn.addEventListener('click', () => {
            if ((fs.resources.research ?? 0) >= cost) {
              fs.resources.research = Math.max(0, (fs.resources.research ?? 0) - cost);
              fs.unlockedSpells = fs.unlockedSpells ?? [];
              fs.unlockedSpells.push(spell.id);
              _render();
            }
          });
          row.appendChild(btn);
        }
      }

      tierGroup.appendChild(row);
    }

    col.appendChild(tierGroup);
  }

  return col;
}

// ── Event listeners ───────────────────────────────────────
overlayEl?.addEventListener('click', e => {
  const tab = e.target.closest('.rmod-era-tab');
  if (!tab) return;
  _activeEra = tab.dataset.era;
  _magicSchoolPage = 0;
  _render();
});

closeBtn?.addEventListener('click', hideResearchModal);

document.addEventListener('technology-researched', () => refreshResearchModal());

// Close on overlay backdrop click
overlayEl?.addEventListener('click', (e) => {
  if (e.target === overlayEl) hideResearchModal();
});
