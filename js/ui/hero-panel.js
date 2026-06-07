/**
 * hero-panel.js
 *
 * Full-overlay hero management panel: list, detail, level-up dialog, recruit.
 */

import { state, getFaction, heroRecruitCost, computeHeroCount } from '../engine/game-state.js';
import {
  recruitPendingHero, dismissHero, unassignHero,
  applyLevelUp, generateSkillChoices, previewLevelUpStat,
  getHeroArmyBonuses, getHeroProvinceBonuses,
  getHeroMaxMana, getHeroManaRegen,
} from '../engine/hero-engine.js';
import { HERO_CLASS_MAP, getHeroClassesForFaction } from '../data/hero-classes-data.js';
import { HERO_SKILL_MAP, TIER_ORDER } from '../data/hero-skills-data.js';
import { ARTIFACT_MAP } from '../data/artifacts-data.js';
import { heroGenderEmoji, xpForNextLevel, xpForLevel, MAX_HERO_LEVEL } from '../models/hero.js';
import { ARTIFACT_SLOTS } from '../data/enums.js';
import { renderArmyPanel } from './army-panel.js';
import { showModal, hideModal } from './modal.js';
import { createCard } from './card-renderer.js';
import { FACTION_MAP } from '../data/factions-data.js';
import {
  showStatTooltip, hideStatTooltip,
  showSkillTooltip, hideSkillTooltip,
  showArtifactTooltip, hideArtifactTooltip,
} from './tooltips.js';

// ── State ───────────────────────────────────────────────────

let _overlay = null;
let _selectedHeroId = null;

// ── Public API ──────────────────────────────────────────────

export function openHeroPanel() {
  _overlay = _overlay ?? document.getElementById('hero-panel-overlay');
  if (!_overlay) return;

  const fs = getFaction(state.playerFactionId);
  if (fs && !_selectedHeroId && fs.heroes.length > 0) {
    _selectedHeroId = fs.heroes[0].id;
  }

  _render();
  _overlay.removeAttribute('hidden');
}

export function closeHeroPanel() {
  _overlay = _overlay ?? document.getElementById('hero-panel-overlay');
  if (_overlay) _overlay.setAttribute('hidden', '');
}

export function isHeroPanelOpen() {
  _overlay = _overlay ?? document.getElementById('hero-panel-overlay');
  return _overlay && !_overlay.hasAttribute('hidden');
}

/** Returns true if any player hero has a pending level-up */
export function anyHeroPendingLevelUp() {
  const fs = getFaction(state.playerFactionId);
  return (fs?.heroes ?? []).some(h => h.pendingLevelUp);
}

export function initHeroPanel() {
  _overlay = document.getElementById('hero-panel-overlay');
  if (!_overlay) return;
  _overlay.addEventListener('click', e => {
    if (e.target === _overlay) closeHeroPanel();
  });
  document.getElementById('hpanel-close')?.addEventListener('click', closeHeroPanel);
}

// ── Render ──────────────────────────────────────────────────

function _render() {
  const fs = getFaction(state.playerFactionId);
  if (!fs) return;

  _renderHeroList(fs);
  _renderRecruitSection(fs);
  _renderHeroDetail(fs);
}

// ── Hero List ────────────────────────────────────────────────

function _renderHeroList(fs) {
  const listEl = document.getElementById('hpanel-hero-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (fs.heroes.length === 0) {
    listEl.innerHTML = '<p class="hpanel-empty">No heroes yet. Recruit one below.</p>';
    return;
  }

  for (const hero of fs.heroes) {
    const classDef = HERO_CLASS_MAP[hero.classId];
    const isSelected = hero.id === _selectedHeroId;
    const isWounded = hero.woundedFor > 0;
    const isTransit = hero.assignment?.transitFor > 0;
    const hasLevelUp = hero.pendingLevelUp;

    const item = document.createElement('div');
    item.className = [
      'hpanel-hero-item',
      isSelected ? 'hpanel-hero-item--selected' : '',
      isWounded ? 'hpanel-hero-item--wounded' : '',
    ].filter(Boolean).join(' ');

    // Mini hero card (same style as army panel card)
    const factionDef = FACTION_MAP[hero.factionId] ?? null;
    const miniCard = createCard({
      variant: 'unit',
      extraClass: 'hpanel-list-hero-card',
      backgroundSrc: factionDef?.unitCardBgImg ?? null,
      foregroundSrc: null,
      fallbackIcon: classDef?.isSpellcaster ? '🧙' : '⚔',
      fallbackName: hero.name,
      fallbackSub: `Lv.${hero.level}`,
    });
    item.appendChild(miniCard);

    let statusLine = '';
    if (isWounded)       statusLine = `<span class="hpanel-hero-status hpanel-status--wounded">⚔ Wounded (${hero.woundedFor}t)</span>`;
    else if (isTransit)  statusLine = `<span class="hpanel-hero-status hpanel-status--transit">🚶 Transit (${hero.assignment.transitFor}t)</span>`;
    else if (hero.assignment) {
      const label = hero.assignment.type === 'army' ? 'Leading army' : 'Governing province';
      statusLine = `<span class="hpanel-hero-status hpanel-status--active">✦ ${label}</span>`;
    } else {
      statusLine = `<span class="hpanel-hero-status hpanel-status--idle">— Available</span>`;
    }

    const content = document.createElement('div');
    content.className = 'hpanel-hero-item-content';
    content.innerHTML = `
      <div class="hpanel-hero-item-header">
        <span class="hpanel-hero-item-name">${hero.name} ${heroGenderEmoji(hero)}</span>
        <span class="hpanel-hero-item-level">Lv.${hero.level}</span>
      </div>
      <div class="hpanel-hero-item-class">${classDef?.name ?? hero.classId}</div>
      ${statusLine}
      ${hasLevelUp ? '<div class="hpanel-levelup-badge">⬆ Level Up!</div>' : ''}
    `;
    item.appendChild(content);

    item.addEventListener('click', () => {
      _selectedHeroId = hero.id;
      _render();
    });

    listEl.appendChild(item);
  }
}

// ── Recruit Section ──────────────────────────────────────────

function _renderRecruitSection(fs) {
  const section = document.getElementById('hpanel-recruit-section');
  if (!section) return;
  section.innerHTML = '';

  const heroCount = computeHeroCount(state.playerFactionId);
  const hasCapacity = fs.heroes.length < heroCount;
  const cost = heroRecruitCost(state.playerFactionId);
  const gold = fs.resources?.gold ?? 0;
  const canAfford = gold >= cost;

  const countLabel = document.createElement('div');
  countLabel.className = 'hpanel-hero-count';
  countLabel.textContent = `Heroes: ${fs.heroes.length} / ${heroCount}`;
  section.appendChild(countLabel);

  if (!fs.pendingHero) {
    const waitEl = document.createElement('p');
    waitEl.className = 'hpanel-recruit-note';
    waitEl.textContent = 'No hero available. Check back next turn.';
    section.appendChild(waitEl);
    return;
  }

  const { hero: candidate, cost: pendingCost, expiresOn } = fs.pendingHero;
  const classDef = HERO_CLASS_MAP[candidate.classId];
  const factionDef = FACTION_MAP[candidate.factionId] ?? null;
  const turnsLeft = Math.max(0, expiresOn - state.turn);

  const card = document.createElement('div');
  card.className = 'hpanel-recruit-card';

  // Top row: hero minicard + info
  const topRow = document.createElement('div');
  topRow.className = 'hpanel-recruit-top';

  const heroMiniCard = createCard({
    variant: 'unit',
    extraClass: 'hpanel-list-hero-card',
    backgroundSrc: factionDef?.unitCardBgImg ?? null,
    foregroundSrc: null,
    fallbackIcon: classDef?.isSpellcaster ? '🧙' : '⚔',
    fallbackName: candidate.name,
    fallbackSub: classDef?.name ?? '',
  });
  topRow.appendChild(heroMiniCard);

  const infoBlock = document.createElement('div');
  infoBlock.className = 'hpanel-recruit-info-block';
  infoBlock.innerHTML = `
    <div class="hpanel-recruit-header">
      <span class="hpanel-recruit-name">${candidate.name} ${heroGenderEmoji(candidate)}</span>
      <span class="hpanel-recruit-class">${classDef?.name ?? candidate.classId}</span>
    </div>
    <div class="hpanel-recruit-meta">
      <span class="hpanel-recruit-cost ${canAfford ? '' : 'hpanel-recruit-cost--poor'}">💰 ${cost}g</span>
      <span class="hpanel-recruit-timer">⏱ ${turnsLeft}t</span>
    </div>
  `;
  topRow.appendChild(infoBlock);
  card.appendChild(topRow);

  // Starting skill with tooltip
  const startingSkill = candidate.skills[0] ?? null;
  const startingSkillDef = startingSkill ? HERO_SKILL_MAP[startingSkill.skillId] : null;
  if (startingSkillDef) {
    const skillEl = document.createElement('div');
    skillEl.className = 'hpanel-recruit-skill';
    skillEl.textContent = `${startingSkillDef.icon ?? '⚔'} ${startingSkillDef.name} · Novice`;
    skillEl.addEventListener('mouseenter', () => showSkillTooltip(startingSkill.skillId, 'novice', skillEl));
    skillEl.addEventListener('mouseleave', hideSkillTooltip);
    card.appendChild(skillEl);
  }

  const recruitBtn = document.createElement('button');
  const canRecruit = hasCapacity && canAfford;
  recruitBtn.className = `btn-primary hpanel-recruit-btn${!canRecruit ? ' btn-disabled' : ''}`;
  recruitBtn.disabled = !canRecruit;
  recruitBtn.textContent = !hasCapacity ? 'Max Heroes' : !canAfford ? `Need ${cost}g` : 'Recruit';
  recruitBtn.addEventListener('click', () => {
    const result = recruitPendingHero(state.playerFactionId);
    if (result) {
      _selectedHeroId = result.id;
      _render();
      renderArmyPanel();
    }
  });
  card.appendChild(recruitBtn);
  section.appendChild(card);
}

// ── Hero Detail ──────────────────────────────────────────────

const _SLOT_FALLBACK_ICONS = {
  [ARTIFACT_SLOTS.WEAPON]:     '⚔',
  [ARTIFACT_SLOTS.ARMOR]:      '🛡',
  [ARTIFACT_SLOTS.ACCESSORY1]: '💍',
  [ARTIFACT_SLOTS.ACCESSORY2]: '💎',
};

function _computeArtifactStatBonuses(hero) {
  const bonuses = {};
  for (const artId of Object.values(hero.artifacts)) {
    if (!artId) continue;
    const artDef = ARTIFACT_MAP[artId];
    if (!artDef) continue;
    for (const eff of (artDef.effects ?? [])) {
      if (eff.type === 'hero_stat_bonus' && eff.stat) {
        bonuses[eff.stat] = (bonuses[eff.stat] ?? 0) + (eff.amount ?? 0);
      }
    }
  }
  return bonuses;
}

function _makeArtifactIconEl(artDef, fallbackIcon, size) {
  const iconEl = document.createElement('div');
  iconEl.className = 'hpanel-artifact-icon';
  const iconSrc = artDef?.icon ?? null;
  if (iconSrc && (iconSrc.startsWith('/') || iconSrc.startsWith('./') || iconSrc.endsWith('.png'))) {
    const img = document.createElement('img');
    img.src = iconSrc;
    img.alt = artDef?.name ?? '';
    img.style.cssText = `width:${size * 0.55}px;height:${size * 0.55}px;object-fit:contain`;
    img.addEventListener('error', () => { img.style.display = 'none'; });
    iconEl.appendChild(img);
  } else {
    iconEl.textContent = iconSrc ?? fallbackIcon ?? '?';
  }
  return iconEl;
}

function _makeArtifactSlotEl({ artDef, slotId, size, onClick, readOnly }) {
  const rarity = artDef?.rarity;
  const rarityClass = rarity ? `hpanel-artifact-slot--${rarity}` : 'hpanel-artifact-slot--empty';
  const slot = document.createElement('div');
  slot.className = `hpanel-artifact-slot ${rarityClass}`;
  slot.style.cssText = `width:${size}px;height:${size}px`;

  const iconEl = _makeArtifactIconEl(artDef, _SLOT_FALLBACK_ICONS[slotId], size);
  if (!artDef) iconEl.classList.add('hpanel-artifact-icon--empty');
  slot.appendChild(iconEl);

  if (artDef) {
    const nameEl = document.createElement('div');
    nameEl.className = 'hpanel-artifact-name';
    nameEl.textContent = artDef.name;
    slot.appendChild(nameEl);

    slot.addEventListener('mouseenter', () => showArtifactTooltip(artDef, slot));
    slot.addEventListener('mouseleave', hideArtifactTooltip);
  } else {
    const emptyLabel = document.createElement('div');
    emptyLabel.className = 'hpanel-artifact-name';
    emptyLabel.style.color = 'var(--text-muted)';
    emptyLabel.textContent = slotId ?? 'Empty';
    slot.appendChild(emptyLabel);
  }

  if (!readOnly && onClick) {
    slot.style.cursor = 'pointer';
    slot.addEventListener('click', onClick);
  }

  return slot;
}

function _renderHeroDetail(fs) {
  const detailEl = document.getElementById('hpanel-detail');
  if (!detailEl) return;
  detailEl.innerHTML = '';

  const hero = fs.heroes.find(h => h.id === _selectedHeroId);
  if (!hero) {
    detailEl.innerHTML = '<div class="hpanel-no-selection">Select a hero from the list.</div>';
    return;
  }

  const classDef = HERO_CLASS_MAP[hero.classId];

  if (hero.pendingLevelUp) {
    _renderLevelUpDetail(detailEl, hero, classDef, fs);
    return;
  }

  // ── Two-column top section ────────────────────────────────
  const topSection = document.createElement('div');
  topSection.className = 'hpanel-detail-top';

  // LEFT COLUMN: hero card + name + XP + mana + lore
  const leftCol = document.createElement('div');
  leftCol.className = 'hpanel-detail-left';

  const headerRow = document.createElement('div');
  headerRow.className = 'hpanel-detail-header';

  const factionDef = FACTION_MAP[hero.factionId] ?? null;
  const heroCard = createCard({
    variant: 'unit',
    extraClass: 'hpanel-hero-card',
    backgroundSrc: factionDef?.unitCardBgImg ?? null,
    foregroundSrc: null,
    fallbackIcon: classDef?.isSpellcaster ? '🧙' : '⚔',
    fallbackName: hero.name,
    fallbackSub: classDef?.name ?? '',
  });
  headerRow.appendChild(heroCard);

  const nameBlock = document.createElement('div');
  nameBlock.className = 'hpanel-name-block';
  nameBlock.innerHTML = `
    <div class="hpanel-name">${hero.name} <span class="hpanel-gender">${heroGenderEmoji(hero)}</span></div>
    <div class="hpanel-class-line">${classDef?.name ?? hero.classId}</div>
    ${_levelUpBadge(hero)}
  `;
  headerRow.appendChild(nameBlock);
  leftCol.appendChild(headerRow);

  // XP bar
  if (hero.level < MAX_HERO_LEVEL) {
    const xpStart = xpForLevel(hero.level - 1);
    const xpEnd   = xpForNextLevel(hero.level);
    const xpCurr  = hero.experience;
    const pct     = Math.min(100, Math.round(((xpCurr - xpStart) / (xpEnd - xpStart)) * 100));
    const xpRow = document.createElement('div');
    xpRow.className = 'hpanel-xp-row';
    xpRow.innerHTML = `
      <span class="hpanel-level-label">Level ${hero.level}</span>
      <div class="hpanel-xp-bar-wrap"><div class="hpanel-xp-bar-fill" style="width:${pct}%"></div></div>
      <span class="hpanel-xp-label">${xpCurr} / ${xpEnd} XP</span>
    `;
    leftCol.appendChild(xpRow);
  } else {
    const maxEl = document.createElement('div');
    maxEl.className = 'hpanel-xp-row';
    maxEl.innerHTML = `<span class="hpanel-level-label">Level ${hero.level} (Max)</span>`;
    leftCol.appendChild(maxEl);
  }

  // Mana bar (in left col if spellcaster)
  const maxMana = getHeroMaxMana(hero);
  if (maxMana > 0) {
    const manaPct = Math.round((hero.mana / maxMana) * 100);
    const manaEl = document.createElement('div');
    manaEl.className = 'hpanel-mana-row';
    manaEl.innerHTML = `
      <span class="hpanel-mana-label">💧 Mana</span>
      <div class="hpanel-mana-bar-wrap"><div class="hpanel-mana-bar-fill" style="width:${manaPct}%"></div></div>
      <span class="hpanel-mana-val">${hero.mana} / ${maxMana}</span>
      <span class="hpanel-mana-regen">(+${getHeroManaRegen(hero)}/turn)</span>
    `;
    leftCol.appendChild(manaEl);
  }

  // Lore
  if (classDef?.description) {
    const loreEl = document.createElement('div');
    loreEl.className = 'hpanel-lore';
    loreEl.textContent = classDef.description;
    leftCol.appendChild(loreEl);
  }

  topSection.appendChild(leftCol);

  // RIGHT COLUMN: artifact slots (2×2 grid)
  const rightCol = document.createElement('div');
  rightCol.className = 'hpanel-detail-right';

  const artTitle = document.createElement('div');
  artTitle.className = 'hpanel-section-title';
  artTitle.style.textAlign = 'center';
  artTitle.textContent = 'Equipped';
  rightCol.appendChild(artTitle);

  const artGrid = document.createElement('div');
  artGrid.className = 'hpanel-artifact-grid';

  const SLOT_SIZE = 84;
  for (const slotId of Object.values(ARTIFACT_SLOTS)) {
    const artId = hero.artifacts[slotId];
    const artDef = artId ? ARTIFACT_MAP[artId] : null;
    const slotEl = _makeArtifactSlotEl({
      artDef,
      slotId,
      size: SLOT_SIZE,
      readOnly: false,
      onClick: artDef
        ? () => _openArtifactDetail(hero, slotId, artDef, fs)
        : () => _openArtifactPicker(hero, slotId, fs),
    });
    artGrid.appendChild(slotEl);
  }

  rightCol.appendChild(artGrid);
  topSection.appendChild(rightCol);
  detailEl.appendChild(topSection);

  // ── Stats grid (full width) ───────────────────────────────
  const artBonuses = _computeArtifactStatBonuses(hero);
  const statsEl = document.createElement('div');
  statsEl.className = 'hpanel-stats';
  const statEntries = [
    ['atk',        '⚔ ATK',    hero.stats.atk],
    ['def',        '🛡 DEF',    hero.stats.def],
    ['tactics',    '🎯 TAC',    hero.stats.tactics],
    ['governance', '🏛 GOV',    hero.stats.governance],
    ['knowledge',  '📚 KNO',    hero.stats.knowledge],
    ['spellpower', '✨ SPW',    hero.stats.spellpower],
  ];
  for (const [key, label, base] of statEntries) {
    const bonus = artBonuses[key] ?? 0;
    const total = base + bonus;
    const cell = document.createElement('div');
    cell.className = 'hpanel-stat-cell';
    const valHtml = bonus > 0
      ? `<div class="hpanel-stat-val" style="color:#4aaa77">${total}</div>`
      : `<div class="hpanel-stat-val">${base}</div>`;
    cell.innerHTML = `${valHtml}<div class="hpanel-stat-label">${label}</div>`;
    cell.addEventListener('mouseenter', () => showStatTooltip(key, base, cell, bonus > 0 ? total : null));
    cell.addEventListener('mouseleave', hideStatTooltip);
    statsEl.appendChild(cell);
  }
  detailEl.appendChild(statsEl);

  // ── Skills ───────────────────────────────────────────────
  const skillsSection = document.createElement('div');
  skillsSection.className = 'hpanel-skills';
  const skillTitle = document.createElement('div');
  skillTitle.className = 'hpanel-section-title';
  skillTitle.textContent = 'Skills';
  skillsSection.appendChild(skillTitle);

  const skillGrid = document.createElement('div');
  skillGrid.className = 'hpanel-skill-grid';

  const maxSlots = 5;
  for (let i = 0; i < maxSlots; i++) {
    const skillEntry = hero.skills[i] ?? null;
    const slot = document.createElement('div');
    if (skillEntry) {
      const skillDef = HERO_SKILL_MAP[skillEntry.skillId];
      const tierDef = skillDef?.tiers.find(t => t.tier === skillEntry.tier);
      slot.className = 'hpanel-skill-slot hpanel-skill-slot--filled';
      slot.innerHTML = `
        <div class="hpanel-skill-name">${skillDef?.name ?? skillEntry.skillId}</div>
        <div class="hpanel-skill-tier hpanel-tier--${skillEntry.tier}">${skillEntry.tier}</div>
        <div class="hpanel-skill-desc">${tierDef?.description ?? ''}</div>
      `;
    } else {
      slot.className = 'hpanel-skill-slot hpanel-skill-slot--empty';
      slot.innerHTML = '<div class="hpanel-skill-empty-label">— empty —</div>';
    }
    skillGrid.appendChild(slot);
  }
  skillsSection.appendChild(skillGrid);
  detailEl.appendChild(skillsSection);

  // ── Assignment info ───────────────────────────────────────
  const assignSection = document.createElement('div');
  assignSection.className = 'hpanel-assignment';

  let assignText = 'Unassigned';
  if (hero.woundedFor > 0) {
    assignText = `Wounded — recovers in ${hero.woundedFor} turn${hero.woundedFor !== 1 ? 's' : ''}`;
  } else if (hero.assignment) {
    if (hero.assignment.transitFor > 0) {
      assignText = `In transit (${hero.assignment.transitFor} turn${hero.assignment.transitFor !== 1 ? 's' : ''} remaining)`;
    } else {
      assignText = hero.assignment.type === 'army' ? 'Leading an army' : 'Governing a province';
    }
  }

  const assignLabel = document.createElement('div');
  assignLabel.className = 'hpanel-assign-text';
  assignLabel.textContent = assignText;
  assignSection.appendChild(assignLabel);

  const btnRow = document.createElement('div');
  btnRow.className = 'hpanel-btn-row';

  if (hero.assignment && hero.woundedFor === 0) {
    const unassignBtn = document.createElement('button');
    unassignBtn.className = 'btn-secondary';
    unassignBtn.textContent = 'Unassign';
    unassignBtn.addEventListener('click', () => {
      unassignHero(hero.id, state.playerFactionId);
      _render();
      renderArmyPanel();
    });
    btnRow.appendChild(unassignBtn);
  }

  const kickBtn = document.createElement('button');
  kickBtn.className = 'btn-secondary hpanel-kick-btn';
  kickBtn.textContent = '✕ Dismiss Hero';
  kickBtn.addEventListener('click', () => {
    showModal(`Dismiss ${hero.name}?`, _makeDismissBody(hero), [
      {
        label: 'Dismiss',
        primary: true,
        onClick: () => {
          dismissHero(hero.id, state.playerFactionId);
          _selectedHeroId = null;
          _render();
          renderArmyPanel();
        },
      },
      { label: 'Cancel' },
    ]);
  });
  btnRow.appendChild(kickBtn);
  assignSection.appendChild(btnRow);
  detailEl.appendChild(assignSection);

  // ── Vault (unequipped artifacts) ─────────────────────────
  if ((fs.artifacts ?? []).length > 0) {
    const vaultSection = document.createElement('div');
    vaultSection.className = 'hpanel-vault';

    const vaultTitle = document.createElement('div');
    vaultTitle.className = 'hpanel-section-title';
    vaultTitle.textContent = 'Vault';
    vaultSection.appendChild(vaultTitle);

    const vaultGrid = document.createElement('div');
    vaultGrid.className = 'hpanel-vault-grid';

    for (const inst of fs.artifacts) {
      const artDef = ARTIFACT_MAP[inst.artifactId];
      if (!artDef) continue;
      const vaultSlot = _makeArtifactSlotEl({
        artDef,
        slotId: artDef.slot,
        size: 64,
        readOnly: true,
        onClick: null,
      });
      vaultGrid.appendChild(vaultSlot);
    }

    vaultSection.appendChild(vaultGrid);
    detailEl.appendChild(vaultSection);
  }
}

function _makeDismissBody(hero) {
  const div = document.createElement('div');
  div.innerHTML = `<p>Dismiss <strong>${hero.name}</strong>? Their artifacts will be returned to your pool.</p>`;
  return div;
}

function _levelUpBadge(hero) {
  if (!hero.pendingLevelUp) return '';
  return `<button class="hpanel-levelup-btn" id="hpanel-levelup-trigger-${hero.id}">⬆ Level Up!</button>`;
}

// ── Level-Up Dialog ──────────────────────────────────────────

const _STAT_SHORT = { atk: 'ATK', def: 'DEF', tactics: 'TAC', governance: 'GOV', knowledge: 'KNO', spellpower: 'SPW' };

function _renderLevelUpDetail(detailEl, hero, classDef, fs) {
  // Generate skill choices if not yet generated
  if (!hero.pendingSkillChoices) {
    hero.pendingSkillChoices = generateSkillChoices(hero, classDef);
  }
  // Pre-roll stat gain so we can display it before the player chooses
  const statKey = previewLevelUpStat(hero);

  const container = document.createElement('div');
  container.className = 'hpanel-levelup-dialog';

  const title = document.createElement('h3');
  title.className = 'hpanel-levelup-title';
  title.textContent = `⬆ ${hero.name} reached Level ${hero.level + 1}!`;
  container.appendChild(title);

  // Stat gain banner
  if (statKey) {
    const statBanner = document.createElement('div');
    statBanner.className = 'hpanel-levelup-stat-banner';
    statBanner.innerHTML = `📈 <strong>${_STAT_SHORT[statKey] ?? statKey} +1</strong> gained on level up`;
    container.appendChild(statBanner);
  }

  const infoEl = document.createElement('p');
  infoEl.className = 'hpanel-levelup-info';
  infoEl.textContent = 'Choose a skill to learn or upgrade:';
  container.appendChild(infoEl);

  const choicesEl = document.createElement('div');
  choicesEl.className = 'hpanel-skill-choices';

  for (const choice of hero.pendingSkillChoices) {
    const skillDef = HERO_SKILL_MAP[choice.skillId];
    const isUpgrade = choice.isUpgrade;
    const newTier = choice.upgradeTier;
    const tierDef = skillDef?.tiers.find(t => t.tier === newTier);

    const card = document.createElement('div');
    card.className = 'hpanel-skill-choice-card';
    card.innerHTML = `
      <div class="hpanel-choice-header">
        <span class="hpanel-choice-name">${skillDef?.name ?? choice.skillId}</span>
        <span class="hpanel-choice-badge ${isUpgrade ? 'hpanel-badge--upgrade' : 'hpanel-badge--new'}">
          ${isUpgrade ? `→ ${newTier}` : `New · ${newTier}`}
        </span>
      </div>
      <div class="hpanel-choice-desc">${tierDef?.description ?? ''}</div>
    `;

    card.addEventListener('click', () => {
      if (!hero.pendingLevelUp) return;
      const statGained = applyLevelUp(hero, choice);
      _showLevelUpResult(hero, statGained, skillDef?.name ?? choice.skillId, newTier);
      _render();
      renderArmyPanel();
    });

    choicesEl.appendChild(card);
  }
  container.appendChild(choicesEl);
  detailEl.appendChild(container);
}

function _showLevelUpResult(hero, statGained, skillName, tier) {
  const body = document.createElement('div');
  body.className = 'hpanel-levelup-result';
  body.innerHTML = `
    <p><strong>${hero.name}</strong> is now <strong>Level ${hero.level}</strong>.</p>
    <p>📈 <strong>+1 ${statGained.toUpperCase()}</strong> gained.</p>
    <p>🌟 Learned: <strong>${skillName} (${tier})</strong>.</p>
  `;
  showModal('Level Up!', body, [{ label: 'Continue', primary: true }]);
}

// ── Artifact UI ──────────────────────────────────────────────

function _openArtifactDetail(hero, slotId, artDef, fs) {
  const body = document.createElement('div');
  body.innerHTML = `
    <p><strong>${artDef.name}</strong> <em class="hpanel-rarity--${artDef.rarity}">${artDef.rarity}</em></p>
    <p style="color:var(--text-muted);margin:6px 0">${artDef.description}</p>
    <p style="font-size:12px;color:var(--text-muted)">Slot: ${slotId}</p>
  `;
  showModal('Equipped Artifact', body, [
    {
      label: 'Remove',
      onClick: () => {
        // Move artifact back to faction vault pool
        hero.artifacts[slotId] = null;
        fs.artifacts.push({ instanceId: `art_${Date.now()}_${slotId}`, artifactId: artDef.id });
        _render();
      },
    },
    { label: 'Keep', primary: true },
  ]);
}

function _openArtifactPicker(hero, slotId, fs) {
  const available = (fs.artifacts ?? []).filter(inst => {
    const def = ARTIFACT_MAP[inst.artifactId];
    return def?.slot === slotId;
  });

  if (available.length === 0) {
    showModal('No Artifacts', _makeEl('<p style="color:var(--text-muted);text-align:center">No artifacts of this type in your vault.</p>'), [
      { label: 'Close', primary: true },
    ]);
    return;
  }

  const body = document.createElement('div');
  body.className = 'hpanel-artifact-picker';
  for (const inst of available) {
    const def = ARTIFACT_MAP[inst.artifactId];
    if (!def) continue;
    const row = document.createElement('div');
    row.className = 'hpanel-artifact-pick-row';
    row.innerHTML = `
      <span class="hpanel-pick-name">${def.name}</span>
      <span class="hpanel-rarity--${def.rarity}" style="font-size:11px;text-transform:capitalize">${def.rarity}</span>
      <span style="color:var(--text-muted);font-size:11px;flex:1;text-align:right">${def.description}</span>
    `;
    row.addEventListener('mouseenter', () => showArtifactTooltip(def, row));
    row.addEventListener('mouseleave', hideArtifactTooltip);
    row.addEventListener('click', () => {
      // Equip: store artifactId (not instanceId) in hero slot, remove from pool
      hero.artifacts[slotId] = inst.artifactId;
      const idx = fs.artifacts.indexOf(inst);
      if (idx !== -1) fs.artifacts.splice(idx, 1);
      hideModal();
      _render();
    });
    body.appendChild(row);
  }

  showModal(`Equip ${slotId}`, body, [{ label: 'Cancel' }]);
}

function _makeEl(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

// ── Heroes bar button helper ─────────────────────────────────

/** Returns badge text for top-bar hero button */
export function heroBtnBadge() {
  const fs = getFaction(state.playerFactionId);
  if (!fs) return '';
  const pending = (fs.heroes ?? []).filter(h => h.pendingLevelUp).length;
  return pending > 0 ? ` ⚠${pending}` : '';
}
