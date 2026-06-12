/**
 * diplomacy-modal.js
 *
 * Diplomacy UI: flags row, leader portrait, opinion display, diplomatic actions.
 *
 * Layout:
 *   - Header: title + close
 *   - Flags row: one slot per met faction (state icon overlay)
 *   - Body:
 *     - Left: leader portrait, name, faction name, opinion bar + tooltip
 *     - Right: pending AI proposal (accept/deny) + action buttons
 */

import { state } from '../engine/game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { LEADER_MAP } from '../data/diplomacy-data.js';
import { DIPLOMATIC_STATES, GAME_EVENTS } from '../data/enums.js';
import {
  getRelationship, getDiplomaticState, getOpinion, getMemories,
  areMet, createProposal, giftGold, acceptProposal, denyProposal,
  breakAlliance, getTruceCost, getOpinionLabel,
} from '../engine/diplomacy.js';
import { on } from '../engine/game-events.js';

// ─── State ────────────────────────────────────────────────
let _selectedFactionId = null;
let _memoryTooltipVisible = false;

// ─── DOM references ───────────────────────────────────────
const _overlay  = () => document.getElementById('diplomacy-modal-overlay');
const _flagsRow = () => document.getElementById('dmod-flags-row');
const _leaderImg    = () => document.getElementById('dmod-leader-img');
const _leaderName   = () => document.getElementById('dmod-leader-name');
const _factionName  = () => document.getElementById('dmod-faction-name');
const _opinionWrap  = () => document.getElementById('dmod-opinion-wrap');
const _opinionFill  = () => document.getElementById('dmod-opinion-bar-fill');
const _opinionLabel = () => document.getElementById('dmod-opinion-label');
const _memTooltip   = () => document.getElementById('dmod-memory-tooltip');
const _dipBadge     = () => document.getElementById('dmod-dipstate-badge');
const _pendingBox   = () => document.getElementById('dmod-pending-proposal');
const _pendingText  = () => document.getElementById('dmod-pending-text');
const _pendingBtns  = () => document.getElementById('dmod-proposal-btns');
const _actionsList  = () => document.getElementById('dmod-actions-list');
const _giftRow      = () => document.getElementById('dmod-gift-row');
const _emptyState   = () => document.getElementById('dmod-empty-state');

// ─── Open / close ─────────────────────────────────────────

export function showDiplomacyModal(targetFactionId = null) {
  const overlay = _overlay();
  if (!overlay) return;

  // Find met factions to auto-select one
  const metFactions = _getMetFactions();
  if (targetFactionId && metFactions.includes(targetFactionId)) {
    _selectedFactionId = targetFactionId;
  } else if (metFactions.length > 0 && !metFactions.includes(_selectedFactionId)) {
    _selectedFactionId = metFactions[0];
  }

  overlay.removeAttribute('hidden');
  _renderFlagsRow();
  _renderLeaderPanel();
  _renderActionsPanel();
}

export function hideDiplomacyModal() {
  _overlay()?.setAttribute('hidden', '');
  _hideMemoryTooltip();
}

export function isDiplomacyModalOpen() {
  return !_overlay()?.hasAttribute('hidden');
}

// ─── Helpers ──────────────────────────────────────────────

function _getMetFactions() {
  const player = state.playerFactionId;
  if (!player) return [];
  return [...state.factions.keys()].filter(id => {
    if (id === player) return false;
    if (state.eliminated.has(id)) return false;
    return areMet(player, id);
  });
}

function _getStateEmoji(dipState) {
  switch (dipState) {
    case DIPLOMATIC_STATES.WAR:         return '⚔️';
    case DIPLOMATIC_STATES.WAR_PENDING: return '📯';
    case DIPLOMATIC_STATES.TRUCE:       return '⏳';
    case DIPLOMATIC_STATES.ALLIANCE:    return '🤝';
    default:                            return '🕊️';
  }
}

function _getDipStateName(dipState) {
  switch (dipState) {
    case DIPLOMATIC_STATES.WAR:         return 'At War';
    case DIPLOMATIC_STATES.WAR_PENDING: return 'War Declared';
    case DIPLOMATIC_STATES.TRUCE:       return 'Truce';
    case DIPLOMATIC_STATES.ALLIANCE:    return 'Alliance';
    default:                            return 'Peace';
  }
}

// ─── Flags row ────────────────────────────────────────────

function _renderFlagsRow() {
  const container = _flagsRow();
  if (!container) return;
  container.innerHTML = '';

  const player = state.playerFactionId;

  for (const [factionId, fs] of state.factions.entries()) {
    if (factionId === player) continue;

    const slot = document.createElement('div');
    slot.className = 'dmod-flag-slot';
    slot.dataset.factionId = factionId;

    const isEliminated = state.eliminated.has(factionId);
    const isMet = areMet(player, factionId);
    const factionDef = FACTION_MAP[factionId];

    if (isEliminated) {
      slot.classList.add('eliminated');
    } else if (!isMet) {
      slot.classList.add('unmet');
    }

    if (_selectedFactionId === factionId) {
      slot.classList.add('active');
    }

    // Flag image or emoji
    if (factionDef?.flagImg) {
      const img = document.createElement('img');
      img.src = factionDef.flagImg;
      img.alt = factionDef.name;
      slot.appendChild(img);
    } else {
      const emo = document.createElement('span');
      emo.className = 'dmod-flag-emoji';
      emo.textContent = factionDef?.emoji ?? '?';
      slot.appendChild(emo);
    }

    // Diplomatic state overlay icon
    const stateIcon = document.createElement('span');
    stateIcon.className = 'dmod-state-icon';
    if (isEliminated) {
      stateIcon.textContent = '💀';
    } else if (!isMet) {
      stateIcon.textContent = '🌫️';
    } else {
      const dipState = getDiplomaticState(player, factionId);
      stateIcon.textContent = _getStateEmoji(dipState);
    }
    slot.appendChild(stateIcon);

    if (!isEliminated && isMet) {
      slot.addEventListener('click', () => {
        _selectedFactionId = factionId;
        _renderFlagsRow();
        _renderLeaderPanel();
        _renderActionsPanel();
      });
    }

    container.appendChild(slot);
  }
}

// ─── Leader panel ─────────────────────────────────────────

function _renderLeaderPanel() {
  const targetId = _selectedFactionId;
  const player   = state.playerFactionId;

  const leaderImg  = _leaderImg();
  const leaderName = _leaderName();
  const facName    = _factionName();
  const badge      = _dipBadge();
  const opWrap     = _opinionWrap();
  const opFill     = _opinionFill();
  const opLabel    = _opinionLabel();

  if (!targetId) {
    if (leaderImg)  { leaderImg.src = ''; leaderImg.alt = ''; }
    if (leaderName) leaderName.textContent = '';
    if (facName)    facName.textContent = '';
    if (badge)      badge.textContent = '';
    return;
  }

  const leader     = LEADER_MAP[targetId];
  const factionDef = FACTION_MAP[targetId];
  const dipState   = getDiplomaticState(player, targetId);
  const opinion    = getOpinion(player, targetId);

  if (leaderImg) {
    leaderImg.src = leader?.leaderImg ?? '';
    leaderImg.alt = leader?.name ?? '';
  }
  if (leaderName) leaderName.textContent = leader?.name ?? factionDef?.name ?? '';
  if (facName)    facName.textContent = factionDef?.name ?? '';

  // Diplomatic state badge
  if (badge) {
    badge.textContent = _getDipStateName(dipState);
    badge.className = 'dmod-dipstate-badge';
    const cls = dipState === DIPLOMATIC_STATES.WAR ? 'war' :
                dipState === DIPLOMATIC_STATES.WAR_PENDING ? 'war_pending' :
                dipState === DIPLOMATIC_STATES.TRUCE ? 'truce' :
                dipState === DIPLOMATIC_STATES.ALLIANCE ? 'alliance' : '';
    if (cls) badge.classList.add(cls);
  }

  // Opinion bar: map -100..100 to 0..100% width
  if (opFill) {
    const pct = (opinion + 100) / 2; // 0–100
    opFill.style.width = pct + '%';
    opFill.style.background =
      opinion >= 15 ? 'var(--success)' :
      opinion <= -15 ? 'var(--danger)' : '#c0a000';
  }
  if (opLabel) {
    opLabel.textContent = `${opinion >= 0 ? '+' : ''}${Math.round(opinion)} — ${getOpinionLabel(opinion)}`;
  }

  // Opinion tooltip (show/hide on hover)
  if (opWrap) {
    opWrap.onmouseenter = () => _showMemoryTooltip(player, targetId);
    opWrap.onmouseleave = () => _hideMemoryTooltip();
  }
}

function _showMemoryTooltip(ownerFactionId, aboutFactionId) {
  const tooltip = _memTooltip();
  if (!tooltip) return;

  const memories = getMemories(ownerFactionId, aboutFactionId);
  if (memories.length === 0) {
    tooltip.innerHTML = '<span style="color:var(--text-muted)">No memories.</span>';
  } else {
    const sorted = [...memories].sort((a, b) => b.strength - a.strength);
    tooltip.innerHTML = sorted.map(m => {
      const turns = m.turnsRemaining;
      const delta = m.opinionDelta;
      const cls   = delta >= 0 ? 'pos' : 'neg';
      const sign  = delta >= 0 ? '+' : '';
      return `<div class="dmod-memory-row">
        <span>${m.label} <small style="color:var(--text-muted)">(${turns}t)</small></span>
        <span class="dmod-mem-delta ${cls}">${sign}${Math.round(delta)}</span>
      </div>`;
    }).join('');
  }
  tooltip.removeAttribute('hidden');
}

function _hideMemoryTooltip() {
  _memTooltip()?.setAttribute('hidden', '');
}

// ─── Actions panel ────────────────────────────────────────

function _renderActionsPanel() {
  const targetId = _selectedFactionId;
  const player   = state.playerFactionId;

  const pendingBox  = _pendingBox();
  const pendingText = _pendingText();
  const actList     = _actionsList();
  const giftRow     = _giftRow();
  const empty       = _emptyState();

  if (!targetId) {
    pendingBox?.setAttribute('hidden', '');
    if (actList) actList.innerHTML = '';
    giftRow?.setAttribute('hidden', '');
    empty?.removeAttribute('hidden');
    return;
  }

  empty?.setAttribute('hidden', '');

  const rel      = getRelationship(player, targetId);
  const dipState = getDiplomaticState(player, targetId);

  // ── Pending proposal ──
  if (rel?.pendingProposal && pendingBox && pendingText) {
    const p = rel.pendingProposal;
    const fromName = FACTION_MAP[p.fromFactionId]?.name ?? p.fromFactionId;
    let desc = '';
    if (p.type === 'propose_truce')   desc = `${fromName} is proposing a Truce.`;
    if (p.type === 'propose_alliance') desc = `${fromName} is proposing an Alliance.`;

    if (p.fromFactionId !== player) {
      // AI → player: show accept/deny
      pendingText.textContent = desc;
      const btns = _pendingBtns();
      if (btns) {
        btns.innerHTML = '';
        const accept = document.createElement('button');
        accept.className = 'btn-primary';
        accept.textContent = 'Accept';
        accept.addEventListener('click', () => {
          acceptProposal(p.fromFactionId, player);
          _refresh();
        });
        const deny = document.createElement('button');
        deny.className = 'btn-secondary';
        deny.textContent = 'Decline';
        deny.addEventListener('click', () => {
          denyProposal(p.fromFactionId, player);
          _refresh();
        });
        btns.appendChild(accept);
        btns.appendChild(deny);
      }
      pendingBox.removeAttribute('hidden');
    } else {
      // Player → AI: show awaiting response
      pendingText.textContent = 'Awaiting response...';
      const btns = _pendingBtns();
      if (btns) {
        btns.innerHTML = '';
        const cancel = document.createElement('button');
        cancel.className = 'btn-secondary';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', () => {
          if (rel) rel.pendingProposal = null;
          _refresh();
        });
        btns.appendChild(cancel);
      }
      pendingBox.removeAttribute('hidden');
    }
  } else {
    pendingBox?.setAttribute('hidden', '');
  }

  // ── Action buttons ──
  if (actList) {
    actList.innerHTML = '';
    const buttons = _buildActionButtons(player, targetId, dipState);
    buttons.forEach(b => actList.appendChild(b));
  }

  // ── Gift gold row (always show when at peace/truce/alliance) ──
  if (giftRow) {
    const canGift = [DIPLOMATIC_STATES.PEACE, DIPLOMATIC_STATES.TRUCE, DIPLOMATIC_STATES.ALLIANCE].includes(dipState);
    if (canGift) {
      giftRow.removeAttribute('hidden');
      _renderGiftRow(player, targetId, giftRow);
    } else {
      giftRow.setAttribute('hidden', '');
    }
  }
}

function _buildActionButtons(player, targetId, dipState) {
  const buttons = [];
  const targetName = FACTION_MAP[targetId]?.name ?? targetId;
  const rel = getRelationship(player, targetId);
  const noProposal = !rel?.pendingProposal;

  if (dipState === DIPLOMATIC_STATES.PEACE) {
    if (noProposal) {
      buttons.push(_makeBtn(`📯 Declare War on ${targetName}`, 'danger', () => {
        declareWar(player, targetId, { surprise: false });
        _refresh();
      }));
      buttons.push(_makeBtn(`🤝 Propose Alliance to ${targetName}`, '', () => {
        createProposal(player, targetId, 'propose_alliance');
        _refresh();
      }));
    }
  }

  if (dipState === DIPLOMATIC_STATES.TRUCE) {
    if (noProposal) {
      buttons.push(_makeBtn(`🤝 Propose Alliance to ${targetName}`, '', () => {
        createProposal(player, targetId, 'propose_alliance');
        _refresh();
      }));
      const turnsLeft = rel?.truceTurnsRemaining ?? 0;
      const info = document.createElement('p');
      info.style.cssText = 'font-size:.78rem;color:var(--text-muted);margin:0';
      info.textContent = `Truce expires in ${turnsLeft} turn${turnsLeft !== 1 ? 's' : ''}. Moving armies into their territory will trigger a surprise war.`;
      buttons.push(info);
    }
  }

  if (dipState === DIPLOMATIC_STATES.ALLIANCE) {
    buttons.push(_makeBtn(`💔 Break Alliance with ${targetName}`, 'danger', () => {
      if (confirm(`Breaking the alliance with ${targetName} will cause a significant opinion penalty.`)) {
        breakAlliance(player, targetId);
        _refresh();
      }
    }));
  }

  if (dipState === DIPLOMATIC_STATES.WAR) {
    if (noProposal) {
      const cost = getTruceCost(player, targetId);
      const myPay = cost[player] ?? 0;
      const theirPay = cost[targetId] ?? 0;
      const costDesc = myPay > 0 ? ` (you pay ${myPay} gold)` :
                       theirPay > 0 ? ` (they pay ${theirPay} gold)` : '';
      buttons.push(_makeBtn(`🕊️ Propose Truce${costDesc}`, '', () => {
        createProposal(player, targetId, 'propose_truce', cost);
        _refresh();
      }));
    }
  }

  if (dipState === DIPLOMATIC_STATES.WAR_PENDING) {
    const rel2 = getRelationship(player, targetId);
    const turns = rel2?.warPendingTurns ?? 0;
    const info = document.createElement('p');
    info.style.cssText = 'font-size:.88rem;color:#f06000;margin:0';
    info.textContent = `⚠️ War begins in ${turns} turn${turns !== 1 ? 's' : ''}.`;
    buttons.push(info);
  }

  return buttons;
}

function _renderGiftRow(player, targetId, container) {
  container.innerHTML = '<span style="font-size:.8rem;color:var(--text-muted);margin-right:4px">Gift gold:</span>';
  for (const amount of [50, 100, 200]) {
    const btn = document.createElement('button');
    btn.className = 'dmod-gift-btn';
    btn.textContent = `${amount} 🪙`;
    const myGold = state.factions.get(player)?.resources?.gold ?? 0;
    btn.disabled = myGold < amount;
    if (myGold < amount) btn.style.opacity = '.4';
    btn.addEventListener('click', () => {
      giftGold(player, targetId, amount);
      _refresh();
    });
    container.appendChild(btn);
  }
}

function _makeBtn(label, extraClass, onClick) {
  const btn = document.createElement('button');
  btn.className = `dmod-action-btn${extraClass ? ' ' + extraClass : ''}`;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function _refresh() {
  _renderFlagsRow();
  _renderLeaderPanel();
  _renderActionsPanel();
}

// ─── Notification badge on button ─────────────────────────

function _updateBadge() {
  const btn = document.getElementById('diplomacy-btn');
  if (!btn) return;
  let badge = btn.querySelector('.dmod-badge');

  const player = state.playerFactionId;
  const hasPending = player && [...(state.diplomacy?.values() ?? [])].some(rel => {
    return rel.pendingProposal && rel.pendingProposal.fromFactionId !== player &&
           (rel.factionAId === player || rel.factionBId === player);
  });

  if (hasPending) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'dmod-badge';
      badge.textContent = '!';
      btn.appendChild(badge);
    }
  } else {
    badge?.remove();
  }
}

// ─── Init ─────────────────────────────────────────────────

export function initDiplomacyModal() {
  const overlay = _overlay();
  if (!overlay) return;

  document.getElementById('dmod-close')?.addEventListener('click', hideDiplomacyModal);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) hideDiplomacyModal();
  });

  document.getElementById('diplomacy-btn')?.addEventListener('click', () => showDiplomacyModal());

  // Listen for incoming proposals to update badge
  document.addEventListener('diplomatic-proposal-received', () => {
    _updateBadge();
    if (isDiplomacyModalOpen()) _renderActionsPanel();
  });

  // Refresh the modal when an alliance breaks (state badge + actions change)
  document.addEventListener('alliance-broken', () => {
    if (isDiplomacyModalOpen()) _refresh();
  });
}
