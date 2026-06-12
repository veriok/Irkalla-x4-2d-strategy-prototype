/**
 * army-panel.js
 *
 * Renders the left panel with the player's armies.
 * Handles army selection, movement, split.
 */

import { state, getProvince, getArmiesByFaction, getArmiesInProvince, selectArmy,
         startArmyMove, splitArmy, transferUnit,
         getArmySupplyCap, getFaction } from '../engine/game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { UNIT_MAP } from '../data/units-data.js';
import { isArmyActionUnlocked } from '../engine/faction-actions.js';
import { armySize, armyWoundedCount } from '../models/army.js';
import { getEffectiveUnitStats, getEffectiveArmyAttack, getEffectiveArmyDefense } from '../engine/tech-effects.js';
import { showReachableProvinces, renderArmyIcons, renderAllProvinces, cancelArmyMoveAndClear } from './map-view.js';
import { showModal, hideModal } from './modal.js';
import { createCard } from './card-renderer.js';
import { showUnitTooltip, hideUnitTooltip, showActionTooltip, hideActionTooltip, showHeroTooltip, hideHeroTooltip } from './tooltips.js';
import { FACTION_ACTIONS } from '../data/faction-actions-data.js';
import { ARMY_STATUS_MAP } from '../data/army-status-data.js';
import { isHeroActive, getHeroMaxMana, getHeroCastableSpells, unassignHero } from '../engine/hero-engine.js';
import { HERO_CLASS_MAP } from '../data/hero-classes-data.js';
import { heroGenderEmoji } from '../models/hero.js';
import { openHeroAssignModal } from './hero-assign-modal.js';
import { openHeroPanel } from './hero-panel.js';
import { openSpellbook } from './spellbook-modal.js';
import { SPELL_MAP, SPELLS } from '../data/hero-spells-data.js';

const armyListEl = document.getElementById('army-list');

let _onArmySelect = null;

// ── Drag-and-drop state (unit transfer between co-located armies) ─
let _dragSourceArmyId = null;
let _dragTypeId       = null;

export function registerArmyPanelCallbacks({ onArmySelect }) {
  _onArmySelect = onArmySelect;
}

/**
 * Re-render the army list panel.
 */
export function renderArmyPanel() {
  armyListEl.innerHTML = '';

  const playerFactionId = state.playerFactionId;
  const armies          = getArmiesByFaction(playerFactionId)
    .slice()
    .sort((a, b) => {
      const nameA = getProvince(a.provinceId)?.name ?? '';
      const nameB = getProvince(b.provinceId)?.name ?? '';
      return nameA.localeCompare(nameB);
    });

  if (armies.length === 0) {
    armyListEl.innerHTML = '<p style="color:var(--text-muted);font-size:12px;font-style:italic">No armies.</p>';
    return;
  }

  for (const army of armies) {
    const prov    = getProvince(army.provinceId);
    const faction = FACTION_MAP[army.factionId];
    const isSelected = state.selectedArmyId === army.id;

    const card = document.createElement('div');
    card.className = `army-card${isSelected ? ' selected' : ''}`;

    // Header
    const header = document.createElement('div');
    header.className = 'army-card-header';
    header.innerHTML = `
      <span class="army-faction-icon">${faction?.emoji ?? '⚔'}</span>
      <span style="font-weight:600;font-size:13px;color:var(--text-bright)">Army</span>
      <span class="army-location">${prov?.name ?? army.provinceId}</span>
    `;
    card.appendChild(header);

    // Unit cards (healthy + wounded) in a 6-per-row card grid
    const unitsEl = document.createElement('div');
    unitsEl.className = 'army-units card-grid card-grid--6';

    // Co-located armies — used to decide whether drag is valid
    const siblingArmies = getArmiesInProvince(army.provinceId)
      .filter(a => a.id !== army.id && a.factionId === army.factionId);
    const hasSiblings = siblingArmies.length > 0;

    // ── Hero slot (first in unit grid, golden outline) ──
    unitsEl.appendChild(_makeHeroSlot(army));

    for (const { typeId, count } of army.units) {
      const uDef = UNIT_MAP[typeId];
      const hpArr = (army.hp?.active?.[typeId] ?? []).slice();
      while (hpArr.length < count) hpArr.push(uDef?.maxHp ?? 10);
      const { attack: effAtk, defense: effDef } = getEffectiveUnitStats(typeId, army.factionId, UNIT_MAP, army);
      for (let i = 0; i < count; i++) {
        const currentHp = hpArr[i] ?? (uDef?.maxHp ?? 10);
        const unitCard = _makeUnitCard(uDef, false, faction, currentHp, effAtk, effDef);
        if (hasSiblings) {
          // Draggable even if it would empty this army — empty army is removed on drop
          unitCard.draggable = true;
          unitCard.title = `Drag to move ${uDef?.name ?? typeId} to another army here`;
          unitCard.addEventListener('dragstart', e => {
            _dragSourceArmyId = army.id;
            _dragTypeId       = typeId;
            e.stopPropagation();
          });
          unitCard.addEventListener('dragend', () => {
            _dragSourceArmyId = null;
            _dragTypeId       = null;
          });
        }
        unitsEl.appendChild(unitCard);
      }
    }
    for (const { typeId, count } of (army.wounded ?? [])) {
      const uDef = UNIT_MAP[typeId];
      const hpArr = (army.hp?.wounded?.[typeId] ?? []).slice();
      while (hpArr.length < count) hpArr.push(Math.max(1, Math.floor((uDef?.maxHp ?? 10) * 0.2)));
      const { attack: effAtk, defense: effDef } = getEffectiveUnitStats(typeId, army.factionId, UNIT_MAP, army);
      for (let i = 0; i < count; i++) {
        const currentHp = hpArr[i] ?? Math.max(1, Math.floor((uDef?.maxHp ?? 10) * 0.2));
        unitsEl.appendChild(_makeUnitCard(uDef, true, faction, currentHp, effAtk, effDef));
      }
    }
    card.appendChild(unitsEl);

    // ── Army status chips ────────────────────────────────────
    const activeStatuses = (army.statusEffects ?? [])
      .filter(s => ARMY_STATUS_MAP[s.type]);
    if (activeStatuses.length > 0) {
      const chipRow = document.createElement('div');
      chipRow.className = 'army-status-chips';
      for (const s of activeStatuses) {
        const def = ARMY_STATUS_MAP[s.type];
        const chip = document.createElement('span');
        chip.className = 'army-status-chip';
        const turns = s.turnsRemaining != null ? `${s.turnsRemaining}t` : '∞';
        chip.innerHTML = `<span>${def.icon ?? '●'}</span><span class="army-status-chip__turns">${turns}</span>`;
        chip.title = `${def.label}: ${def.description}`;
        chipRow.appendChild(chip);
      }
      card.appendChild(chipRow);
    }

    // Drop zone: accept dragged units from sibling armies in same province
    card.addEventListener('dragover', e => {
      if (_dragSourceArmyId && _dragSourceArmyId !== army.id) {
        const src = state.armies.get(_dragSourceArmyId);
        if (src && src.provinceId === army.provinceId) {
          e.preventDefault();
          card.classList.add('drag-over');
        }
      }
    });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', e => {
      e.preventDefault();
      card.classList.remove('drag-over');
      if (!_dragSourceArmyId || _dragSourceArmyId === army.id || !_dragTypeId) return;
      const ok = transferUnit(_dragSourceArmyId, army.id, _dragTypeId, 1);
      _dragSourceArmyId = null;
      _dragTypeId       = null;
      if (ok) {
        renderArmyPanel();
        renderArmyIcons();
      }
    });

    // ── Stats row: ATK / DEF / Supply ───────────────────────
    const healthy  = armySize(army);
    const wounded  = armyWoundedCount(army);
    const cap      = getArmySupplyCap(army.factionId);
    const atk      = Math.round(getEffectiveArmyAttack(army, army.factionId, UNIT_MAP));
    const def      = Math.round(getEffectiveArmyDefense(army, army.factionId, UNIT_MAP));
    const supplyUsed = healthy + wounded;

    const statsRow = document.createElement('div');
    statsRow.className = 'army-stats-row';
    statsRow.innerHTML =
      `<span title="Attack strength">⚔ ${atk}</span>` +
      `<span title="Defense strength">🛡 ${def}</span>` +
      `<span title="Supply: units / cap" class="${supplyUsed >= cap ? 'supply-full' : ''}">📦 ${supplyUsed}/${cap}</span>`;
    card.appendChild(statsRow);

    // ── Move button ──────────────────────────────────────────
    if (army.movesLeft > 0) {
      const moveBtn = document.createElement('button');
      moveBtn.className = 'btn-secondary army-move-btn';
      moveBtn.textContent = state.movingArmyId === army.id
        ? '✕ Cancel Move'
        : `Move (${army.movesLeft} move left)`;

      moveBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (state.movingArmyId === army.id) {
          cancelArmyMoveAndClear();
          renderArmyPanel();
        } else {
          selectArmy(army.id);
          startArmyMove(army.id);
          renderArmyPanel();
          showReachableProvinces(army.id);
          renderAllProvinces();
        }
      });
      card.appendChild(moveBtn);
    } else {
      const exhaustedEl = document.createElement('p');
      exhaustedEl.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:4px;font-style:italic';
      exhaustedEl.textContent = 'No moves remaining.';
      card.appendChild(exhaustedEl);
    }

    // ── Split button ─────────────────────────────────────────
    const canSplit = army.units.length >= 2 ||
                     (army.units.length === 1 && army.units[0].count >= 2);
    if (canSplit) {
      const splitBtn = document.createElement('button');
      splitBtn.className = 'btn-secondary army-move-btn';
      splitBtn.style.marginTop = '4px';
      splitBtn.textContent = '✂ Split Army';
      splitBtn.addEventListener('click', e => {
        e.stopPropagation();
        showSplitModal(army);
      });
      card.appendChild(splitBtn);
    }

    // ── Army Action Bar ───────────────────────────────────────
    _renderArmyActionBar(army, card);

    // Click card to select
    card.addEventListener('click', () => {
      selectArmy(army.id);
      renderArmyPanel();
      renderArmyIcons();
      if (_onArmySelect) _onArmySelect(army.id);
    });

    armyListEl.appendChild(card);
  }
}

// ── Army Action Bar ───────────────────────────────────────────

function _heroHasCastableSpells(hero, factionId) {
  return getHeroCastableSpells(hero, factionId, SPELL_MAP).length > 0;
}

function _getArmyActions(army) {
  const actions = [];

  // Spellbook action — if army has an active hero with castable spells
  const fs = getFaction(army.factionId);
  const hero = fs?.heroes?.find(h => h.id === army.heroId) ?? null;
  if (hero && isHeroActive(hero) && _heroHasCastableSpells(hero, army.factionId)) {
    actions.push({
      actionId: 'spellbook',
      emoji: '📖',
      label: 'Spellbook',
      description: `Open ${hero.name}'s spellbook to queue combat spells or cast province spells.`,
      enabled: true,
      doAction: () => openSpellbook(hero, army),
    });
  }

  if (isArmyActionUnlocked(army, 'code_of_honor')) {
    const isActive   = (army.statusEffects ?? []).some(s => s.type === 'code_of_honor_stance');
    const unitCount  = armySize(army);
    const cost       = 3 * unitCount;
    const fs         = state.factions.get(army.factionId);
    const essence    = fs?.resources?.dragon_essence ?? 0;
    const canAfford  = essence >= cost;
    const enabled    = !isActive && canAfford;
    const disabledReason = isActive ? 'Already active this turn'
                         : `Not enough Dragon Essence (need ${cost}, have ${essence})`;
    actions.push({
      actionId: 'code_of_honor',
      emoji: '🐉',
      label: `Code of Honor (🔥${cost})`,
      description: isActive
        ? `Code of Honor is active — +3 ATK / -2 DEF until next turn`
        : `Invoke the Dragon Code: +3 ATK / -2 DEF for one turn. Costs ${cost} Dragon Essence.`,
      enabled,
      disabledReason,
      isActive,
      doAction: () => {
        fs.resources.dragon_essence = Math.max(0, essence - cost);
        army.statusEffects = army.statusEffects ?? [];
        army.statusEffects.push({ type: 'code_of_honor_stance', turnsRemaining: 1 });
        renderArmyPanel();
      },
    });
  }

  return actions;
}

function _renderArmyActionBar(army, containerEl) {
  const actions = _getArmyActions(army);
  if (actions.length === 0) return;

  const label = document.createElement('div');
  label.className = 'province-action-bar-label';
  label.style.marginTop = '6px';
  label.textContent = 'Army Actions';
  containerEl.appendChild(label);

  const bar = document.createElement('div');
  bar.className = 'action-bar';

  for (const action of actions) {
    const btn = document.createElement('button');
    btn.className = `action-bar-btn${!action.enabled ? ' action-bar-btn--disabled' : ''}${action.isActive ? ' action-bar-btn--active' : ''}`;
    btn.disabled = !action.enabled;
    btn.title = action.enabled ? action.description : action.disabledReason;
    btn.innerHTML = `
      <span class="action-bar-btn__icon">${action.emoji}</span>
      <span class="action-bar-btn__label">${action.label}</span>
    `;
    if (action.enabled) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        action.doAction();
      });
    }
    if (action.actionId && action.actionId !== 'spellbook' && FACTION_ACTIONS[action.actionId]) {
      const actionDef = FACTION_ACTIONS[action.actionId];
      btn.addEventListener('mouseenter', () => showActionTooltip(actionDef, btn));
      btn.addEventListener('mouseleave', hideActionTooltip);
    }
    bar.appendChild(btn);
  }

  containerEl.appendChild(bar);
}

// ── Hero card slot ───────────────────────────────────────────

function _makeHeroSlot(army) {
  const slot = document.createElement('div');
  slot.className = 'hero-card-slot';

  const fs   = getFaction(army.factionId);
  const hero = fs?.heroes?.find(h => h.id === army.heroId) ?? null;

  if (!hero) {
    slot.classList.add('hero-card-slot--empty');
    slot.title = 'No hero — click to assign';
    slot.innerHTML = `<span class="hero-slot-plus">+</span><span class="hero-slot-label">Hero</span>`;
    slot.addEventListener('click', e => {
      e.stopPropagation();
      openHeroAssignModal({ targetType: 'army', targetId: army.id });
    });
    return slot;
  }

  const classDef  = HERO_CLASS_MAP[hero.classId];
  const active    = isHeroActive(hero);
  const isTransit = hero.assignment?.transitFor > 0;
  const isWounded = hero.woundedFor > 0;

  if (!active)   slot.classList.add('hero-card-slot--inactive');
  if (isWounded) slot.classList.add('hero-card-slot--wounded');

  let statusLine = '';
  if (isWounded)            statusLine = `<span class="hero-slot-status hero-slot-status--wounded">⚔ ${hero.woundedFor}t</span>`;
  else if (isTransit)       statusLine = `<span class="hero-slot-status hero-slot-status--transit">🚶 ${hero.assignment.transitFor}t</span>`;
  else if (hero.pendingLevelUp) statusLine = `<span class="hero-slot-status hero-slot-status--levelup">⬆ Lv!</span>`;

  // Mana bar — rendered inside the card at the bottom
  const maxMana = getHeroMaxMana(hero);
  const manaPct = maxMana > 0 ? Math.round((hero.mana / maxMana) * 100) : 0;
  const manaBar = !isWounded
    ? `<div class="hero-slot-mana-bar" title="Mana: ${hero.mana}/${maxMana}"><div class="hero-slot-mana-fill" style="width:${manaPct}%"></div></div>`
    : '';

  // Background and portrait images — added first so text overlays sit on top in DOM order
  const fDef = FACTION_MAP[army.factionId] ?? null;
  if (fDef?.unitCardBgImg) {
    const bgImg = document.createElement('img');
    bgImg.className = 'hero-slot-bg-img';
    bgImg.src = fDef.unitCardBgImg;
    bgImg.alt = '';
    bgImg.addEventListener('error', () => bgImg.remove());
    slot.appendChild(bgImg);
  }
  if (classDef?.cardImg) {
    const fgImg = document.createElement('img');
    fgImg.className = 'hero-slot-fg-img';
    fgImg.src = classDef.cardImg;
    fgImg.alt = '';
    fgImg.addEventListener('error', () => fgImg.remove());
    slot.appendChild(fgImg);
  }

  const overlays = document.createElement('div');
  overlays.innerHTML = `
    <div class="hero-slot-level">${hero.level}</div>
    <div class="hero-slot-icon">${classDef?.isSpellcaster ? '🧙' : '⚔'}</div>
    <div class="hero-slot-name">${hero.name}</div>
    ${statusLine}
    ${manaBar}
  `;
  while (overlays.firstChild) slot.appendChild(overlays.firstChild);

  // Small unassign button in top-right corner
  const unassignBtn = document.createElement('button');
  unassignBtn.className = 'hero-slot-unassign-btn';
  unassignBtn.title = 'Unassign hero';
  unassignBtn.textContent = '×';
  unassignBtn.addEventListener('click', e => {
    e.stopPropagation();
    unassignHero(hero.id, army.factionId);
    renderArmyPanel();
  });
  slot.appendChild(unassignBtn);

  slot.addEventListener('mouseenter', () => {
    const fDef = FACTION_MAP[army.factionId] ?? null;
    showHeroTooltip(hero, fDef, slot);
  });
  slot.addEventListener('mouseleave', hideHeroTooltip);
  slot.addEventListener('click', e => {
    e.stopPropagation();
    openHeroPanel();
  });

  return slot;
}

// ── Unit card helper ─────────────────────────────────────────

function _makeUnitCard(uDef, wounded, factionDef, currentHp = null, effectiveAtk = null, effectiveDef = null) {
  const c = createCard({
    variant: 'unit',
    wounded,
    backgroundSrc: factionDef?.unitCardBgImg ?? null,
    foregroundSrc: uDef?.cardSpriteImg ?? null,
    fallbackIcon: uDef?.emoji ?? '⚔',
    fallbackName: '',
    fallbackSub: '',
  });

  const maxHp = Math.max(1, uDef?.maxHp ?? 10);
  const hpNow = Math.max(0, Math.min(maxHp, currentHp ?? maxHp));
  const missingPct = Math.round(((maxHp - hpNow) / maxHp) * 100);

  const hpOverlay = document.createElement('div');
  hpOverlay.className = 'game-card__hp-overlay';
  hpOverlay.style.height = `${missingPct}%`;
  c.appendChild(hpOverlay);

  c.addEventListener('mouseenter', () => showUnitTooltip(uDef, factionDef, c, hpNow, maxHp, effectiveAtk, effectiveDef));
  c.addEventListener('mouseleave', hideUnitTooltip);
  return c;
}

// ── Split Army Modal ─────────────────────────────────────────

function showSplitModal(army) {
  const cap = getArmySupplyCap(army.factionId);
  const body = document.createElement('div');
  body.style.cssText = 'text-align:left;';

  const intro = document.createElement('p');
  intro.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:10px;';
  intro.textContent = 'Select how many units to split off into a new army. Both armies must have at least 1 unit.';
  body.appendChild(intro);

  const inputs = [];

  for (const { typeId, count } of army.units) {
    const uDef = UNIT_MAP[typeId];
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';

    const label = document.createElement('span');
    label.style.cssText = 'flex:1;font-size:12px;';
    label.textContent = `${uDef?.emoji ?? '⚔'} ${uDef?.name ?? typeId} (×${count})`;

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(count);
    input.value = '0';
    input.style.cssText = 'width:56px;background:var(--bg-dark);border:1px solid var(--border);color:var(--text-bright);border-radius:4px;padding:3px 6px;font-size:13px;';

    row.appendChild(label);
    row.appendChild(input);
    body.appendChild(row);
    inputs.push({ typeId, input, maxCount: count });
  }

  const errorEl = document.createElement('p');
  errorEl.style.cssText = 'font-size:11px;color:var(--danger);min-height:16px;margin-top:4px;';
  body.appendChild(errorEl);

  showModal('✂ Split Army', body, [
    {
      label: 'Split',
      primary: true,
      keepOpen: true,
      onClick: () => {
        const splitUnits = inputs
          .map(({ typeId, input }) => ({ typeId, count: parseInt(input.value, 10) || 0 }))
          .filter(u => u.count > 0);

        const totalSplit = splitUnits.reduce((s, u) => s + u.count, 0);
        const totalArmy  = armySize(army);

        if (totalSplit < 1) { errorEl.textContent = 'Select at least 1 unit to split off.'; return; }
        if (totalSplit >= totalArmy) { errorEl.textContent = 'Original army must keep at least 1 unit.'; return; }

        for (const { typeId, input, maxCount } of inputs) {
          const v = parseInt(input.value, 10) || 0;
          if (v > maxCount) { errorEl.textContent = `Cannot split more ${typeId} than available.`; return; }
        }

        const newArmy = splitArmy(army.id, splitUnits);
        if (!newArmy) { errorEl.textContent = 'Split failed — check counts.'; return; }

        hideModal();
        renderArmyPanel();
        renderArmyIcons();
      },
    },
    { label: 'Cancel' },
  ]);
}
