/**
 * spellbook-modal.js
 *
 * Open-book spellbook UI.
 * Left page = combat spells (queue slots + spell list)
 * Right page = province spells (cast list)
 * Shared pagination: page 1 = tier 1 spells, page 2 = tier 2, page 3 = tier 3
 *
 * Hero-contextual: pass a hero object to filter/display correctly.
 */

import { state, getFaction } from '../engine/game-state.js';
import { getHeroSchoolTier, getHeroMaxMana, getHeroSpellpower } from '../engine/hero-engine.js';
import { SPELL_MAP, SPELLS } from '../data/hero-spells-data.js';

// ── State ────────────────────────────────────────────────────

let _overlay = null;
let _currentHero = null;
let _currentArmy = null;
let _currentPage = 1;  // 1 = tier 1, 2 = tier 2, 3 = tier 3
const MAX_QUEUE = 5;
const MAX_PAGES = 3;

// ── Public API ────────────────────────────────────────────────

export function openSpellbook(hero, army) {
  _overlay = _overlay ?? document.getElementById('spellbook-modal-overlay');
  if (!_overlay) return;
  _currentHero = hero;
  _currentArmy = army;
  _currentPage = 1;
  _render();
  _overlay.removeAttribute('hidden');
}

export function closeSpellbook() {
  _overlay = _overlay ?? document.getElementById('spellbook-modal-overlay');
  if (_overlay) _overlay.setAttribute('hidden', '');
}

export function initSpellbook() {
  _overlay = document.getElementById('spellbook-modal-overlay');
  if (!_overlay) return;
  _overlay.addEventListener('click', e => {
    if (e.target === _overlay) closeSpellbook();
  });
  document.getElementById('sb-close')?.addEventListener('click', closeSpellbook);
}

// ── Helpers ───────────────────────────────────────────────────

function _getCastableSpells(hero, factionId) {
  const fs = getFaction(factionId);
  const unlocked = new Set(fs?.unlockedSpells ?? []);
  return SPELLS.filter(spell => {
    if (!unlocked.has(spell.id)) return false;
    // Check hero has the school skill at sufficient tier
    const schoolTier = getHeroSchoolTier(hero, spell.schoolId);
    return schoolTier >= spell.tier;
  });
}

function _spellDamageLabel(spell, hero) {
  if (!spell.baseDamage) return '';
  const spellpower = getHeroSpellpower(hero);
  const total = (spell.baseDamage ?? 0) + spellpower;
  return `${spell.baseDamage}+${spellpower}=${total} dmg`;
}

function _spellsByTier(spells, tier) {
  return spells.filter(s => s.tier === tier);
}

// ── Render ────────────────────────────────────────────────────

function _render() {
  const hero = _currentHero;
  if (!hero) return;

  const factionId = state.playerFactionId;
  const allCastable = _getCastableSpells(hero, factionId);
  const combatSpells = allCastable.filter(s => s.type === 'combat');
  const provinceSpells = allCastable.filter(s => s.type === 'province');

  const titleEl = document.getElementById('sb-hero-name');
  if (titleEl) titleEl.textContent = `📖 ${hero.name}'s Spellbook`;

  const manaEl = document.getElementById('sb-mana');
  if (manaEl) {
    const max = getHeroMaxMana(hero);
    manaEl.textContent = `💧 ${hero.mana} / ${max} mana`;
  }

  _renderCombatPage(hero, _spellsByTier(combatSpells, _currentPage));
  _renderProvincePage(hero, _spellsByTier(provinceSpells, _currentPage), factionId);
  _renderPageControls(combatSpells, provinceSpells);
}

function _renderCombatPage(hero, pageSpells) {
  const leftEl = document.getElementById('sb-left-page');
  if (!leftEl) return;
  leftEl.innerHTML = '';

  // Queue slots
  const queueSection = document.createElement('div');
  queueSection.className = 'sb-queue-section';

  const queueLabel = document.createElement('div');
  queueLabel.className = 'sb-section-label';
  queueLabel.textContent = 'Combat Spell Queue';
  queueSection.appendChild(queueLabel);

  const queueSlots = document.createElement('div');
  queueSlots.className = 'sb-queue-slots';

  const queue = hero.combatSpellQueue ?? [];
  for (let i = 0; i < MAX_QUEUE; i++) {
    const slot = document.createElement('div');
    slot.className = `sb-queue-slot${queue[i] ? ' sb-queue-slot--filled' : ''}`;
    if (queue[i]) {
      const sp = SPELL_MAP[queue[i].spellId];
      slot.textContent = sp?.name ?? queue[i].spellId;
      slot.title = `${sp?.name} — click to remove`;
      slot.addEventListener('click', () => {
        hero.combatSpellQueue.splice(i, 1);
        _render();
      });
    } else {
      slot.textContent = '—';
    }
    queueSlots.appendChild(slot);
  }
  queueSection.appendChild(queueSlots);

  // Condition toggle
  const condRow = document.createElement('div');
  condRow.className = 'sb-condition-row';
  condRow.innerHTML = `<span class="sb-cond-label">Cast condition:</span>`;

  const condBtn = document.createElement('button');
  condBtn.className = 'btn-secondary sb-cond-btn';
  condBtn.textContent = hero.spellCondition === 'always' ? 'Always Cast' : "Don't cast if 50%+ weaker";
  condBtn.addEventListener('click', () => {
    hero.spellCondition = hero.spellCondition === 'always' ? 'if_not_weaker' : 'always';
    _render();
  });
  condRow.appendChild(condBtn);
  queueSection.appendChild(condRow);
  leftEl.appendChild(queueSection);

  // Spell list for this page
  const listSection = document.createElement('div');
  listSection.className = 'sb-spell-list';

  const listLabel = document.createElement('div');
  listLabel.className = 'sb-section-label';
  listLabel.textContent = `Tier ${_currentPage} Combat Spells`;
  listSection.appendChild(listLabel);

  if (pageSpells.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'sb-empty';
    empty.textContent = `No tier ${_currentPage} combat spells known.`;
    listSection.appendChild(empty);
  } else {
    for (const spell of pageSpells) {
      const inQueue = (hero.combatSpellQueue ?? []).some(q => q.spellId === spell.id);
      const row = document.createElement('div');
      row.className = `sb-spell-row${inQueue ? ' sb-spell-row--queued' : ''}`;
      row.innerHTML = `
        <div class="sb-spell-name">${spell.name}</div>
        <div class="sb-spell-meta">
          <span class="sb-mana-cost">💧${spell.manaCost}</span>
          <span class="sb-spell-dmg">${_spellDamageLabel(spell, _currentHero)}</span>
          <span class="sb-target">${_targetLabel(spell.targetType)}</span>
        </div>
        <div class="sb-spell-desc">${spell.description ?? ''}</div>
      `;

      row.addEventListener('click', () => {
        if (inQueue) {
          const idx = hero.combatSpellQueue.findIndex(q => q.spellId === spell.id);
          if (idx !== -1) hero.combatSpellQueue.splice(idx, 1);
        } else if ((hero.combatSpellQueue ?? []).length < MAX_QUEUE) {
          hero.combatSpellQueue = hero.combatSpellQueue ?? [];
          hero.combatSpellQueue.push({ spellId: spell.id, condition: hero.spellCondition ?? 'always' });
        }
        _render();
      });

      listSection.appendChild(row);
    }
  }

  leftEl.appendChild(listSection);
}

function _renderProvincePage(hero, pageSpells, factionId) {
  const rightEl = document.getElementById('sb-right-page');
  if (!rightEl) return;
  rightEl.innerHTML = '';

  const label = document.createElement('div');
  label.className = 'sb-section-label';
  label.textContent = `Tier ${_currentPage} Province Spells`;
  rightEl.appendChild(label);

  if (pageSpells.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'sb-empty';
    empty.textContent = `No tier ${_currentPage} province spells known.`;
    rightEl.appendChild(empty);
    return;
  }

  const fs = getFaction(factionId);

  for (const spell of pageSpells) {
    const canAffordMana = hero.mana >= spell.manaCost;
    const runesCost = spell.extraCost?.runes ?? 0;
    const canAffordRunes = runesCost === 0 || (fs?.resources?.runes ?? 0) >= runesCost;
    const canCast = canAffordMana && canAffordRunes;

    const row = document.createElement('div');
    row.className = 'sb-province-spell-row';
    row.innerHTML = `
      <div class="sb-spell-name">${spell.name}</div>
      <div class="sb-spell-meta">
        <span class="sb-mana-cost ${!canAffordMana ? 'sb-cost--poor' : ''}">💧${spell.manaCost}</span>
        ${runesCost > 0 ? `<span class="sb-extra-cost ${!canAffordRunes ? 'sb-cost--poor' : ''}">🔷${runesCost} runes</span>` : ''}
        <span class="sb-target">${_targetLabel(spell.targetType)}</span>
      </div>
      <div class="sb-spell-desc">${spell.description ?? ''}</div>
    `;

    const castBtn = document.createElement('button');
    castBtn.className = `btn-primary sb-cast-btn${!canCast ? ' btn-disabled' : ''}`;
    castBtn.disabled = !canCast;
    castBtn.textContent = canCast ? '▶ Cast' : (canAffordMana ? 'Need runes' : 'Need mana');

    if (canCast) {
      castBtn.addEventListener('click', () => {
        _castProvinceSpell(hero, spell, factionId, fs);
      });
    }

    row.appendChild(castBtn);
    rightEl.appendChild(row);
  }
}

function _renderPageControls(combatSpells, provinceSpells) {
  const prevBtn = document.getElementById('sb-prev');
  const nextBtn = document.getElementById('sb-next');
  const pageEl  = document.getElementById('sb-page-indicator');
  const prevEdge = document.getElementById('sb-prev-edge');
  const nextEdge = document.getElementById('sb-next-edge');

  const hasPrev = _currentPage > 1;
  const hasNext = _currentPage < MAX_PAGES;

  if (prevBtn) { prevBtn.disabled = !hasPrev; prevBtn.hidden = !hasPrev; }
  if (nextBtn) { nextBtn.disabled = !hasNext; nextBtn.hidden = !hasNext; }
  if (pageEl) pageEl.textContent = `Tier ${_currentPage}`;

  // Page edge: filled = more pages exist in that direction
  if (prevEdge) prevEdge.className = `sb-page-edge ${hasPrev ? 'sb-edge--filled' : 'sb-edge--empty'}`;
  if (nextEdge) nextEdge.className = `sb-page-edge ${hasNext ? 'sb-edge--filled' : 'sb-edge--empty'}`;
}

function _castProvinceSpell(hero, spell, factionId, fs) {
  // Deduct costs
  hero.mana = Math.max(0, hero.mana - spell.manaCost);
  if (spell.extraCost?.runes) {
    fs.resources.runes = Math.max(0, (fs.resources.runes ?? 0) - spell.extraCost.runes);
  }

  if (spell.craftsArtifact) {
    // Roll a crafted artifact
    import('../data/artifacts-data.js').then(({ rollCraftedArtifact }) => {
      const art = rollCraftedArtifact();
      if (art) {
        fs.artifacts = fs.artifacts ?? [];
        const instanceId = `art_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        fs.artifacts.push({ instanceId, artifactId: art.id });
        import('./event-log.js').then(({ logMessage }) => {
          logMessage(`✨ ${hero.name} forged ${art.name}!`);
        });
      }
    });
    _render();
    return;
  }

  // Province effects applied to current province
  if (spell.provinceEffect && _currentArmy?.provinceId) {
    const prov = state.provinces.get(_currentArmy.provinceId);
    if (prov) {
      const effect = spell.provinceEffect;
      prov.statusEffects = prov.statusEffects ?? [];
      prov.statusEffects.push({
        type: `spell_${spell.id}`,
        turnsRemaining: effect.turnsRemaining ?? 3,
        effects: [{ type: effect.type, percent: effect.percent, resourceId: effect.resourceId ?? 'all' }],
      });
    }
  }

  _render();
}

function _targetLabel(targetType) {
  const labels = {
    all_enemies:  'All enemies',
    random_enemy: 'Random enemy',
    all_allies:   'All allies',
    random_ally:  'Random ally',
    self:         'Own province',
    any_adjacent_enemy_province: 'Adj. enemy province',
  };
  return labels[targetType] ?? targetType ?? '';
}

// ── Init event listeners (called once at startup) ─────────────

export function initSpellbookListeners() {
  document.getElementById('sb-prev')?.addEventListener('click', () => {
    if (_currentPage > 1) { _currentPage--; _render(); }
  });
  document.getElementById('sb-next')?.addEventListener('click', () => {
    if (_currentPage < MAX_PAGES) { _currentPage++; _render(); }
  });
}
