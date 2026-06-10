/**
 * spellbook-modal.js
 *
 * Open-book spellbook UI.
 * Left page  = combat spells (queue slots + spell list)
 * Right page = province spells (cast list)
 * Pagination: page 0 = cantrips, pages 1-3 = tiers 1-3
 */

import { state, getFaction, getProvince, getArmiesInProvince, moveArmy, placeArmy } from '../engine/game-state.js';
import { renderArmyPanel } from './army-panel.js';
import { getHeroCastableSpells, getHeroMaxMana, getHeroSpellpower, getHeroSchoolTier } from '../engine/hero-engine.js';
import { applyArmyDamageOutOfCombat } from '../engine/combat.js';
import { SPELL_MAP, SPELLS, BIOME_SUMMON_MAP } from '../data/hero-spells-data.js';
import { UNIT_MAP } from '../data/units-data.js';
import { recalcArmyMoves } from '../models/army.js';
import { spawnUnitsIntoArmies } from '../engine/spawn-units.js';

// ── State ────────────────────────────────────────────────────

let _overlay = null;
let _currentHero = null;
let _currentArmy = null;
let _currentPage   = 0;
let _pendingTarget = null; // { spell, validProvinces } waiting for province pick
const MAX_QUEUE       = 5;
const SPELLS_PER_PAGE = 6;

// ── Public API ────────────────────────────────────────────────

export function openSpellbook(hero, army) {
  _overlay = _overlay ?? document.getElementById('spellbook-modal-overlay');
  if (!_overlay) return;
  _currentHero   = hero;
  _currentArmy   = army;
  _currentPage   = 0;
  _pendingTarget = null;
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
  const castable = new Set(getHeroCastableSpells(hero, factionId, SPELL_MAP).map(s => s.id));
  return SPELLS.filter(s => castable.has(s.id));
}

/** Sort spells by tier ascending, then name. */
function _sortedByTier(spells) {
  return [...spells].sort((a, b) => a.tier !== b.tier ? a.tier - b.tier : a.name.localeCompare(b.name));
}

/** Returns scaled value: floor(base × (1 + sp × 0.05)) */
function _scaled(value, spellpower) {
  return Math.floor(value * (1 + spellpower * 0.05));
}

/**
 * Produces HTML summary of effective spell values for the current hero.
 * Values different from effects[0] base are wrapped in <span class="sb-upg">.
 */
function _effectSummaryHtml(spell, hero, factionId, army = null) {
  const sp = getHeroSpellpower(hero);
  const tier = getHeroSchoolTier(hero, spell.schoolId);
  const eff     = spell.effects[tier];
  const baseEff = spell.effects[0];
  if (!eff) return '';

  const parts = [];
  const hi  = (val, base) => val !== base
    ? `<span class="sb-upg">${val}</span>`
    : `${val}`;

  const subEffs = Array.isArray(eff) ? eff : [eff];
  const baseSubEffs = Array.isArray(baseEff) ? baseEff : [baseEff];

  for (let i = 0; i < subEffs.length; i++) {
    const se = subEffs[i];
    const be = baseSubEffs[i] ?? se;

    if (se.effectType === 'damage') {
      const val = _scaled(se.baseDamage ?? 0, sp);
      const base = be.baseDamage ?? 0;
      const chains = se.chains ?? 1;
      const baseChains = be.chains ?? 1;
      const chainStr = chains > 1
        ? ` × ${hi(chains, baseChains)} targets`
        : '';
      parts.push(`${hi(val, base)} dmg${chainStr}`);

    } else if (se.effectType === 'buff' || se.effectType === 'debuff') {
      if (se.stats) {
        const statParts = se.stats.map((s, j) => {
          const v = _scaled(s.amount, sp);
          const b = (be.stats?.[j]?.amount ?? s.amount);
          const sign = v >= 0 ? '+' : '';
          return `${sign}${hi(v, _scaled(b, sp))} ${s.stat}`;
        });
        const chains = se.chains ?? 1;
        const baseChains = be.chains ?? 1;
        const chainStr = chains > 1 ? ` (${hi(chains, baseChains)} units)` : '';
        parts.push(statParts.join(', ') + chainStr);
      } else {
        const v = _scaled(se.amount ?? 0, sp);
        const b = _scaled(be.amount ?? 0, sp);
        const sign = v >= 0 ? '+' : '';
        const chains = se.chains ?? 1;
        const baseChains = be.chains ?? 1;
        const chainStr = chains > 1 ? ` × ${hi(chains, baseChains)} units` : '';
        parts.push(`${sign}${hi(v, b)} ${se.stat}${chainStr}`);
      }

    } else if (se.effectType === 'heal') {
      const v = _scaled(se.amount ?? 0, sp);
      const b = _scaled(be.amount ?? 0, sp);
      parts.push(`+${hi(v, b)} HP${se.canRevive ? ' (can revive)' : ''}`);

    } else if (se.effectType === 'army_damage') {
      const v = _scaled(se.baseDamage ?? 0, sp);
      const b = be.baseDamage ?? 0;
      parts.push(`${hi(v, b)} dmg/unit to armies`);

    } else if (se.effectType === 'army_heal') {
      const v = _scaled(se.amount ?? 0, sp);
      const b = _scaled(be.amount ?? 0, sp);
      parts.push(`+${hi(v, b)} HP to all units`);

    } else if (se.effectType === 'income_percent') {
      const turns = Math.floor((se.turnsRemaining ?? 3) * (1 + sp * 0.05));
      const baseTurns = be.turnsRemaining ?? 3;
      parts.push(`${se.percent}% income, ${hi(turns, baseTurns)} turns`);

    } else if (se.effectType === 'research_percent') {
      const turns = Math.floor((se.turnsRemaining ?? 3) * (1 + sp * 0.05));
      const baseTurns = be.turnsRemaining ?? 3;
      parts.push(`+${se.percent}% research, ${hi(turns, baseTurns)} turns`);

    } else if (se.effectType === 'defense_percent') {
      const turns = Math.floor((se.turnsRemaining ?? 2) * (1 + sp * 0.05));
      const baseTurns = be.turnsRemaining ?? 2;
      const sign = (se.defensePercent ?? 0) >= 0 ? '+' : '';
      parts.push(`${sign}${se.defensePercent}% def, ${hi(turns, baseTurns)} turns`);

    } else if (se.effectType === 'army_buff') {
      const turns = Math.floor((se.turnsRemaining ?? 2) * (1 + sp * 0.05));
      const baseTurns = be.turnsRemaining ?? 2;
      if (se.effects?.length) {
        const modifiers = se.effects.map(e => {
          const pieces = [];
          if (e.attack)  pieces.push(`+${hi(e.attack, be.effects?.[0]?.attack ?? e.attack)} atk`);
          if (e.defense) pieces.push(`+${hi(e.defense, be.effects?.[0]?.defense ?? e.defense)} def`);
          return pieces.join(', ');
        }).join('; ');
        parts.push(`${modifiers} for ${hi(turns, baseTurns)} turns`);
      } else if (se.movementBonus) {
        parts.push(`+${se.movementBonus} movement for ${hi(turns, baseTurns)} turns`);
      } else if (se.woundChanceBonus != null) {
        const pct = Math.round(se.woundChanceBonus * 100);
        parts.push(`+${pct}% wound chance for ${hi(turns, baseTurns)} turns`);
      } else if (se.firstStrikeChanceBonus) {
        const pct = Math.round(se.firstStrikeChanceBonus * 100);
        parts.push(`+${pct}% first strike chance for ${hi(turns, baseTurns)} turns`);
      }

    } else if (se.effectType === 'recruit_penalty') {
      const turns = se.turnsRemaining ?? 3;
      parts.push(`+${se.timeIncrease} recruit time, ${turns} turns`);

    } else if (se.effectType === 'summon') {
      const c = se.count ?? 1;
      const bc = be.count ?? 1;
      if (se.biomeDependent) {
        const prov = army?.provinceId ? getProvince(army.provinceId) : null;
        const biomeId = prov?.biomeId ?? 'plains';
        const resolvedUnitId = BIOME_SUMMON_MAP[biomeId] ?? BIOME_SUMMON_MAP['plains'];
        const unitName = UNIT_MAP[resolvedUnitId]?.name ?? 'biome animal';
        parts.push(`Summons ${hi(c, bc)} ${unitName}`);
      } else {
        const unitName = UNIT_MAP[se.unitId]?.name ?? se.unitId;
        parts.push(`Summons ${hi(c, bc)} ${unitName}`);
      }

    } else if (se.effectType === 'teleport') {
      const r = se.range ?? 2;
      const br = be.range ?? 2;
      parts.push(`Teleport range ${hi(r, br)}`);

    } else if (se.effectType === 'artifact') {
      parts.push('Crafts an artifact');

    } else if (se.effectType === 'building_damage') {
      const pct = Math.round((se.buildingDowngradeChance ?? 0) * 100);
      const bpct = Math.round((be.buildingDowngradeChance ?? 0) * 100);
      parts.push(`${hi(pct, bpct)}% chance to downgrade each building`);
    }
  }

  return parts.join(' · ');
}

function _tierLabel(tier) {
  return ['Cantrip', 'Tier 1', 'Tier 2', 'Tier 3'][tier] ?? `Tier ${tier}`;
}

function _targetLabel(targetType) {
  const labels = {
    all_enemies:                 'All enemies',
    random_enemy:                'Random enemy',
    all_allies:                  'All allies',
    random_ally:                 'Random ally',
    lowest_hp_ally:              'Lowest HP ally',
    self:                        'Own province',
    any_adjacent_enemy_province: 'Adj. enemy province',
    any_friendly_province:       'Friendly province',
  };
  return labels[targetType] ?? targetType ?? '';
}

// ── Render ────────────────────────────────────────────────────

function _render() {
  const hero = _currentHero;
  if (!hero) return;

  const factionId = state.playerFactionId;
  const allCastable = _getCastableSpells(hero, factionId);
  const combatSpells   = _sortedByTier(allCastable.filter(s => s.type === 'combat'));
  const provinceSpells = _sortedByTier(allCastable.filter(s => s.type === 'province'));

  const totalPages = Math.max(1,
    Math.ceil(combatSpells.length / SPELLS_PER_PAGE),
    Math.ceil(provinceSpells.length / SPELLS_PER_PAGE)
  );
  if (_currentPage >= totalPages) _currentPage = totalPages - 1;

  const titleEl = document.getElementById('sb-hero-name');
  if (titleEl) titleEl.textContent = `📖 ${hero.name}'s Spellbook`;

  const manaEl = document.getElementById('sb-mana');
  if (manaEl) {
    const max = getHeroMaxMana(hero);
    manaEl.textContent = `💧 ${hero.mana} / ${max} mana`;
  }

  _renderCombatPage(hero, combatSpells, factionId);
  _renderProvincePage(hero, provinceSpells, factionId);
  _renderBookNav(totalPages);
}

function _renderCombatPage(hero, allSpells, factionId) {
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

  // Paginated spell list
  const pageSpells = allSpells.slice(_currentPage * SPELLS_PER_PAGE, (_currentPage + 1) * SPELLS_PER_PAGE);

  const listSection = document.createElement('div');
  listSection.className = 'sb-spell-list';

  const listLabel = document.createElement('div');
  listLabel.className = 'sb-section-label';
  listLabel.textContent = 'Combat Spells';
  listSection.appendChild(listLabel);

  if (allSpells.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'sb-empty';
    empty.textContent = 'No Combat Spells available.';
    listSection.appendChild(empty);
  } else {
    let lastTier = -1;
    for (const spell of pageSpells) {
      if (spell.tier !== lastTier) {
        const divider = document.createElement('div');
        divider.className = 'sb-tier-divider';
        divider.textContent = _tierLabel(spell.tier);
        listSection.appendChild(divider);
        lastTier = spell.tier;
      }

      const queueCount = (hero.combatSpellQueue ?? []).filter(q => q.spellId === spell.id).length;
      const row = document.createElement('div');
      row.className = `sb-spell-row${queueCount > 0 ? ' sb-spell-row--queued' : ''}`;

      const summaryHtml = _effectSummaryHtml(spell, hero, factionId);
      const queueBadge = queueCount > 0 ? `<span class="sb-queue-count">×${queueCount}</span>` : '';
      const reachBadge = spell.reach ? `<span class="sb-reach-badge" title="Reach — can be cast during the First Strike pre-round">🏹</span>` : '';
      row.innerHTML = `
        <div class="sb-spell-row-top">
          <span class="sb-spell-name">${spell.icon ?? ''} ${spell.name}${reachBadge}${queueBadge}</span>
          <span class="sb-spell-meta"><span class="sb-mana-cost">💧${spell.manaCost}</span> <span class="sb-target">${_targetLabel(spell.targetType)}</span></span>
        </div>
        ${summaryHtml ? `<div class="sb-spell-effect">${summaryHtml}</div>` : ''}
        <div class="sb-spell-desc">${spell.description ?? ''}</div>
      `;

      row.addEventListener('click', () => {
        hero.combatSpellQueue = hero.combatSpellQueue ?? [];
        if ((hero.combatSpellQueue).length < MAX_QUEUE) {
          hero.combatSpellQueue.push({ spellId: spell.id, condition: hero.spellCondition ?? 'always' });
        }
        _render();
      });

      listSection.appendChild(row);
    }
  }

  leftEl.appendChild(listSection);
}

function _renderProvincePage(hero, allSpells, factionId) {
  const rightEl = document.getElementById('sb-right-page');
  if (!rightEl) return;
  rightEl.innerHTML = '';

  // Province target picker (rendered when a spell is waiting for a target)
  if (_pendingTarget) {
    _renderProvincePicker(hero, factionId, rightEl);
    return;
  }

  const label = document.createElement('div');
  label.className = 'sb-section-label';
  label.textContent = 'Province Spells';
  rightEl.appendChild(label);

  if (allSpells.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'sb-empty';
    empty.textContent = 'No province spells known.';
    rightEl.appendChild(empty);
    return;
  }

  const pageSpells = allSpells.slice(_currentPage * SPELLS_PER_PAGE, (_currentPage + 1) * SPELLS_PER_PAGE);

  const fs = getFaction(factionId);

  let lastTier = -1;
  for (const spell of pageSpells) {
    if (spell.tier !== lastTier) {
      const divider = document.createElement('div');
      divider.className = 'sb-tier-divider';
      divider.textContent = _tierLabel(spell.tier);
      rightEl.appendChild(divider);
      lastTier = spell.tier;
    }

    const canAffordMana  = hero.mana >= spell.manaCost;
    const runesCost      = spell.extraCost?.runes ?? 0;
    const canAffordRunes = runesCost === 0 || (fs?.resources?.runes ?? 0) >= runesCost;
    const canCast        = canAffordMana && canAffordRunes;

    const summaryHtml = _effectSummaryHtml(spell, hero, factionId, _currentArmy);

    const row = document.createElement('div');
    row.className = 'sb-province-spell-row';
    row.innerHTML = `
      <div class="sb-spell-row-top">
        <span class="sb-spell-name">${spell.icon ?? ''} ${spell.name}</span>
        <span class="sb-spell-meta">
          <span class="sb-mana-cost ${!canAffordMana ? 'sb-cost--poor' : ''}">💧${spell.manaCost}</span>
          ${runesCost > 0 ? `<span class="sb-extra-cost ${!canAffordRunes ? 'sb-cost--poor' : ''}">🔷${runesCost}</span>` : ''}
          <span class="sb-target">${_targetLabel(spell.targetType)}</span>
        </span>
      </div>
      ${summaryHtml ? `<div class="sb-spell-effect">${summaryHtml}</div>` : ''}
      <div class="sb-spell-desc">${spell.description ?? ''}</div>
    `;

    const castBtn = document.createElement('button');
    castBtn.className = `btn-primary sb-cast-btn${!canCast ? ' btn-disabled' : ''}`;
    castBtn.disabled = !canCast;
    castBtn.textContent = canCast ? '▶ Cast' : (canAffordMana ? 'Need runes' : 'Need mana');

    if (canCast) {
      castBtn.addEventListener('click', () => _initiateProvinceCast(hero, spell, factionId, fs));
    }

    row.appendChild(castBtn);
    rightEl.appendChild(row);
  }
}

function _renderProvincePicker(hero, factionId, rightEl) {
  const { spell, validProvinces, mode } = _pendingTarget;

  const header = document.createElement('div');
  header.className = 'sb-section-label';
  header.textContent = `Select target for ${spell.name}`;
  rightEl.appendChild(header);

  for (const provId of validProvinces) {
    const prov = getProvince(provId);
    if (!prov) continue;
    const btn = document.createElement('button');
    btn.className = 'btn-secondary sb-province-target-btn';
    btn.textContent = `${prov.name} (${prov.ownerId ?? 'neutral'})`;
    btn.addEventListener('click', () => {
      _pendingTarget = null;
      const fs = getFaction(factionId);
      _executeCast(hero, spell, factionId, fs, provId);
    });
    rightEl.appendChild(btn);
  }

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-secondary';
  cancelBtn.textContent = '✕ Cancel';
  cancelBtn.style.marginTop = '8px';
  cancelBtn.addEventListener('click', () => { _pendingTarget = null; _render(); });
  rightEl.appendChild(cancelBtn);
}

function _renderBookNav(totalPages) {
  const footer = document.getElementById('sb-book-nav');
  if (!footer) return;
  footer.innerHTML = '';
  if (totalPages <= 1) return;

  if (_currentPage > 0) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-secondary sb-page-turn sb-page-turn--prev';
    prevBtn.textContent = '◀ Previous';
    prevBtn.addEventListener('click', () => { _currentPage--; _pendingTarget = null; _render(); });
    footer.appendChild(prevBtn);
  }

  const pageLabel = document.createElement('span');
  pageLabel.className = 'sb-page-label';
  pageLabel.textContent = `${_currentPage + 1} / ${totalPages}`;
  footer.appendChild(pageLabel);

  if (_currentPage < totalPages - 1) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-secondary sb-page-turn sb-page-turn--next';
    nextBtn.textContent = 'Next ▶';
    nextBtn.addEventListener('click', () => { _currentPage++; _pendingTarget = null; _render(); });
    footer.appendChild(nextBtn);
  }
}

// ── Province spell casting ────────────────────────────────────

function _initiateProvinceCast(hero, spell, factionId, fs) {
  // Spells targeting adjacent or friendly provinces need a picker
  if (spell.targetType === 'any_adjacent_enemy_province') {
    const prov = _currentArmy?.provinceId ? getProvince(_currentArmy.provinceId) : null;
    if (!prov) return;
    const validProvs = (prov.adjacentIds ?? []).filter(id => {
      const p = getProvince(id);
      return p && p.ownerId !== factionId && p.ownerId !== 'neutral' && !p.isOcean;
    });
    if (validProvs.length === 0) {
      _showMessage('No valid adjacent enemy provinces in range.');
      return;
    }
    if (validProvs.length === 1) {
      _executeCast(hero, spell, factionId, fs, validProvs[0]);
    } else {
      _pendingTarget = { spell, validProvinces: validProvs };
      _render();
    }
    return;
  }

  if (spell.targetType === 'any_friendly_province') {
    // Teleport: get provinces within range
    const schoolTier = getHeroSchoolTier(hero, spell.schoolId);
    const eff = spell.effects[schoolTier];
    const range = (Array.isArray(eff) ? eff[0] : eff)?.range ?? 2;
    const validProvs = _getProvincesWithinRange(_currentArmy?.provinceId, range, p => p.ownerId === factionId && !p.isOcean);
    if (validProvs.length === 0) {
      _showMessage('No friendly provinces in range.');
      return;
    }
    _pendingTarget = { spell, validProvinces: validProvs };
    _render();
    return;
  }

  // self-targeting spells: cast immediately
  _executeCast(hero, spell, factionId, fs, _currentArmy?.provinceId);
}

function _executeCast(hero, spell, factionId, fs, targetProvinceId) {
  hero.mana = Math.max(0, hero.mana - spell.manaCost);
  if (spell.extraCost?.runes) {
    fs.resources.runes = Math.max(0, (fs.resources.runes ?? 0) - spell.extraCost.runes);
  }

  const sp          = getHeroSpellpower(hero);
  const schoolTier  = getHeroSchoolTier(hero, spell.schoolId);
  const rawEff      = spell.effects[schoolTier];
  const subEffects  = Array.isArray(rawEff) ? rawEff : [rawEff];

  for (const eff of subEffects) {
    _applyProvinceSubEffect(hero, spell, eff, factionId, fs, targetProvinceId, sp);
  }

  _render();
}

function _applyProvinceSubEffect(hero, spell, eff, factionId, fs, targetProvinceId, sp) {
  const prov      = targetProvinceId ? getProvince(targetProvinceId) : null;
  const army      = _currentArmy;
  const scaledTurns = (t) => Math.floor(t * (1 + sp * 0.05));

  if (eff.effectType === 'artifact') {
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
    return;
  }

  if (eff.effectType === 'army_damage') {
    if (!prov) return;
    const armies = getArmiesInProvince(targetProvinceId).filter(a => a.factionId !== factionId);
    for (const target of armies) {
      applyArmyDamageOutOfCombat(target, eff.baseDamage ?? 0, sp);
    }
    return;
  }

  if (eff.effectType === 'building_damage') {
    if (!prov) return;
    const chance = eff.buildingDowngradeChance ?? 0;
    const buildings = prov.buildings ?? [];
    for (let i = buildings.length - 1; i >= 0; i--) {
      if (Math.random() < chance) {
        if ((buildings[i].tier ?? 1) <= 1) {
          buildings.splice(i, 1);
        } else {
          buildings[i].tier--;
        }
      }
    }
    return;
  }

  if (eff.effectType === 'army_heal') {
    if (!army) return;
    const healAmt = Math.floor((eff.amount ?? 0) * (1 + sp * 0.05));
    army.hp = army.hp ?? { active: {}, wounded: {} };

    // Heal active units
    for (const [typeId, arr] of Object.entries(army.hp.active ?? {})) {
      const maxHp = UNIT_MAP[typeId]?.maxHp ?? 10;
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.min(maxHp, arr[i] + healAmt);
      }
    }
    // Heal wounded units, reviving those restored to max HP
    for (const [typeId, wArr] of Object.entries(army.hp.wounded ?? {})) {
      const maxHp = UNIT_MAP[typeId]?.maxHp ?? 10;
      for (let i = wArr.length - 1; i >= 0; i--) {
        if ((wArr[i] ?? 0) <= 0) continue;
        const newHp = Math.min(maxHp, wArr[i] + healAmt);
        if (newHp >= maxHp) {
          army.hp.active[typeId] = army.hp.active[typeId] ?? [];
          army.hp.active[typeId].push(maxHp);
          wArr.splice(i, 1);
        } else {
          wArr[i] = newHp;
        }
      }
      if (wArr.length === 0) delete army.hp.wounded[typeId];
    }
    recalcArmyMoves(army, UNIT_MAP);
    return;
  }

  if (eff.effectType === 'army_buff') {
    if (!army) return;
    army.statusEffects = army.statusEffects ?? [];
    const tag = `spell_${spell.id}`;
    // No-stack: don't re-apply if already active
    if (army.statusEffects.some(s => s.type === tag)) return;
    army.statusEffects.push({
      type:                  tag,
      label:                 spell.name,
      icon:                  spell.icon ?? '',
      turnsRemaining:        scaledTurns(eff.turnsRemaining ?? 2),
      effects:               eff.effects ?? [],
      movementBonus:         eff.movementBonus ?? 0,
      woundChanceBonus:      eff.woundChanceBonus ?? 0,
      firstStrikeChanceBonus: eff.firstStrikeChanceBonus ?? 0,
    });
    recalcArmyMoves(army, UNIT_MAP);
    return;
  }

  if (eff.effectType === 'income_percent') {
    if (!prov) return;
    prov.statusEffects = prov.statusEffects ?? [];
    prov.statusEffects.push({
      type:           `spell_${spell.id}_income`,
      label:          spell.name,
      turnsRemaining: scaledTurns(eff.turnsRemaining ?? 3),
      effects:        [{ type: 'income_percent', percent: eff.percent ?? 0, resourceId: eff.resourceId ?? 'all' }],
    });
    return;
  }

  if (eff.effectType === 'research_percent') {
    if (!prov) return;
    prov.statusEffects = prov.statusEffects ?? [];
    prov.statusEffects.push({
      type:           `spell_${spell.id}_research`,
      label:          spell.name,
      turnsRemaining: scaledTurns(eff.turnsRemaining ?? 3),
      effects:        [{ type: 'income_percent', percent: eff.percent ?? 0, resourceId: 'research' }],
    });
    return;
  }

  if (eff.effectType === 'defense_percent') {
    if (!prov) return;
    prov.statusEffects = prov.statusEffects ?? [];
    prov.statusEffects.push({
      type:           `spell_${spell.id}_def`,
      label:          spell.name,
      turnsRemaining: scaledTurns(eff.turnsRemaining ?? 2),
      effects:        [{ type: 'defense_percent', amount: eff.defensePercent ?? 0 }],
    });
    return;
  }

  if (eff.effectType === 'recruit_penalty') {
    if (!prov) return;
    prov.statusEffects = prov.statusEffects ?? [];
    const existing = prov.statusEffects.find(s => s.type === 'plague_recruit_strain');
    if (existing) {
      existing.turnsRemaining = Math.max(existing.turnsRemaining ?? 0, scaledTurns(eff.turnsRemaining ?? 3));
      existing.timeIncrease = Math.max(existing.timeIncrease ?? 0, eff.timeIncrease ?? 1);
    } else {
      prov.statusEffects.push({
        type:           'plague_recruit_strain',
        label:          'Plague',
        turnsRemaining: scaledTurns(eff.turnsRemaining ?? 3),
        timeIncrease:   eff.timeIncrease ?? 1,
      });
    }
    return;
  }

  if (eff.effectType === 'summon') {
    if (!army) return;
    const count = eff.count ?? 1;

    let unitId = eff.unitId;
    if (eff.biomeDependent) {
      const provForArmy = army.provinceId ? getProvince(army.provinceId) : null;
      const biomeId = provForArmy?.biomeId ?? 'plains';
      unitId = BIOME_SUMMON_MAP[biomeId] ?? BIOME_SUMMON_MAP['plains'];
    }

    if (!unitId || !UNIT_MAP[unitId]) return;

    spawnUnitsIntoArmies(unitId, count, army.factionId, army.provinceId, army);
    renderArmyPanel();
    return;
  }

  if (eff.effectType === 'teleport') {
    if (!army || !targetProvinceId) return;
    moveArmy(army.id, targetProvinceId);
    closeSpellbook();
    return;
  }
}

function _getProvincesWithinRange(startId, range, filter) {
  if (!startId) return [];
  const visited = new Set([startId]);
  let frontier  = [startId];
  for (let d = 0; d < range; d++) {
    const next = [];
    for (const id of frontier) {
      const p = getProvince(id);
      for (const adjId of (p?.adjacentIds ?? [])) {
        if (!visited.has(adjId)) {
          visited.add(adjId);
          next.push(adjId);
        }
      }
    }
    frontier = next;
  }
  visited.delete(startId);
  return [...visited].filter(id => {
    const p = getProvince(id);
    return p && filter(p);
  });
}

function _showMessage(text) {
  import('./event-log.js').then(({ logMessage }) => logMessage(text));
}

// ── Init event listeners ──────────────────────────────────────

export function initSpellbookListeners() {
  // Pagination is handled via _renderBookNav; no global button wiring needed.
  // No global prev/next buttons needed.
}
