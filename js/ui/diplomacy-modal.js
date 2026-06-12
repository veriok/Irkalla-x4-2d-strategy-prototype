/**
 * diplomacy-modal.js
 *
 * Diplomacy UI: flags row, landscape scene image, flavor text strip,
 * leader info panel, diplomatic actions.
 *
 * Layout (top to bottom inside #dmod-body):
 *   - Landscape scene image (full width, 200px tall)
 *   - Flavor text strip (italic, typewriter animated)
 *   - #dmod-lower (left: leader info | right: actions)
 */

import { state } from '../engine/game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { LEADER_MAP } from '../data/diplomacy-data.js';
import { DIPLOMATIC_STATES, GAME_EVENTS } from '../data/enums.js';
import {
  getRelationship, getDiplomaticState, getOpinion, getMemories,
  areMet, createProposal, giftGold, acceptProposal, denyProposal,
  breakAlliance, getTruceCost, getOpinionLabel, declareWar,
} from '../engine/diplomacy.js';
import { on } from '../engine/game-events.js';
import { confirmModal } from './modal.js';

// ─── State ────────────────────────────────────────────────
let _selectedFactionId = null;
let _cancelTypewriter  = null;
let _isWaiting         = false;

// ─── DOM references ───────────────────────────────────────
const _overlay     = () => document.getElementById('diplomacy-modal-overlay');
const _flagsRow    = () => document.getElementById('dmod-flags-row');
const _leaderImg   = () => document.getElementById('dmod-leader-img');
const _flavorText  = () => document.getElementById('dmod-flavor-text');
const _leaderName  = () => document.getElementById('dmod-leader-name');
const _factionName = () => document.getElementById('dmod-faction-name');
const _opinionWrap = () => document.getElementById('dmod-opinion-wrap');
const _opinionFill = () => document.getElementById('dmod-opinion-bar-fill');
const _opinionLabel= () => document.getElementById('dmod-opinion-label');
const _memTooltip  = () => document.getElementById('dmod-memory-tooltip');
const _dipBadge    = () => document.getElementById('dmod-dipstate-badge');
const _pendingBox  = () => document.getElementById('dmod-pending-proposal');
const _pendingText = () => document.getElementById('dmod-pending-text');
const _pendingBtns = () => document.getElementById('dmod-proposal-btns');
const _actionsList = () => document.getElementById('dmod-actions-list');
const _giftRow     = () => document.getElementById('dmod-gift-row');
const _emptyState  = () => document.getElementById('dmod-empty-state');

// ─── Open / close ─────────────────────────────────────────

export function showDiplomacyModal(targetFactionId = null) {
  const overlay = _overlay();
  if (!overlay) return;

  const metFactions = _getMetFactions();
  if (targetFactionId && metFactions.includes(targetFactionId)) {
    _selectedFactionId = targetFactionId;
  } else if (metFactions.length > 0 && !metFactions.includes(_selectedFactionId)) {
    _selectedFactionId = metFactions[0];
  }

  overlay.removeAttribute('hidden');
  _renderFlagsRow();
  _renderSceneImage();
  _renderLeaderPanel();
  _renderActionsPanel();
  if (_selectedFactionId) _triggerGreeting(_selectedFactionId);
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

function _selectFaction(factionId) {
  _selectedFactionId = factionId;
  _renderFlagsRow();
  _renderSceneImage();
  _renderLeaderPanel();
  _renderActionsPanel();
  _triggerGreeting(factionId);
}

// ─── Flavor text ──────────────────────────────────────────

function _typewriterPrint(text, speed = 22) {
  if (_cancelTypewriter) { _cancelTypewriter(); _cancelTypewriter = null; }
  const el = _flavorText();
  if (!el) return;
  el.textContent = '';
  let i = 0;
  let cancelled = false;
  _cancelTypewriter = () => { cancelled = true; };
  const tick = () => {
    if (cancelled) return;
    if (i >= text.length) { _cancelTypewriter = null; return; }
    el.textContent += text[i++];
    setTimeout(tick, speed);
  };
  setTimeout(tick, 0);
}

function _resolveFlavorText(template, playerId, targetId) {
  const playerLeader  = LEADER_MAP[playerId];
  const targetFaction = FACTION_MAP[targetId];
  const playerFaction = FACTION_MAP[playerId];
  return template
    .replace(/\{leader_name\}/g,             playerLeader?.name  ?? 'Stranger')
    .replace(/\{faction_short_name\}/g,       playerFaction?.shortName ?? playerFaction?.name ?? 'your people')
    .replace(/\{self_faction_short_name\}/g,  targetFaction?.shortName ?? targetFaction?.name ?? 'our people')
    .replace(/\{self_leader_name\}/g,         LEADER_MAP[targetId]?.name ?? 'I');
}

function _triggerFlavorLine(targetId, path) {
  if (!targetId) return;
  const player = state.playerFactionId;
  const leader = LEADER_MAP[targetId];
  if (!leader?.lines) return;

  const parts = path.split('.');
  let node = leader.lines;
  for (const part of parts) {
    node = node?.[part];
    if (!node) return;
  }

  const arr = Array.isArray(node) ? node : [node];
  if (arr.length === 0) return;
  const template = arr[Math.floor(Math.random() * arr.length)];
  const text = _resolveFlavorText(template, player, targetId);
  _typewriterPrint(text);
}

function _triggerGreeting(targetId) {
  if (!targetId) return;
  const player   = state.playerFactionId;
  const dipState = getDiplomaticState(player, targetId);
  const rel      = getRelationship(player, targetId);

  // If AI has an outgoing proposal waiting, use that line instead of greeting
  if (rel?.pendingProposal && rel.pendingProposal.fromFactionId !== player) {
    const key = rel.pendingProposal.type === 'propose_alliance'
      ? 'incoming.alliance' : 'incoming.truce';
    _triggerFlavorLine(targetId, key);
    return;
  }

  const aiOpinion = getOpinion(targetId, player) ?? 0;
  let key;
  if      (dipState === DIPLOMATIC_STATES.WAR)         key = 'greeting.war';
  else if (dipState === DIPLOMATIC_STATES.WAR_PENDING)  key = 'greeting.war_pending';
  else if (dipState === DIPLOMATIC_STATES.TRUCE)        key = 'greeting.truce';
  else if (dipState === DIPLOMATIC_STATES.ALLIANCE)     key = 'greeting.alliance';
  else if (aiOpinion >= 40)                             key = 'greeting.high';
  else if (aiOpinion >= 15)                             key = 'greeting.positive';
  else if (aiOpinion >= -15)                            key = 'greeting.neutral';
  else if (aiOpinion >= -40)                            key = 'greeting.negative';
  else                                                  key = 'greeting.hostile';

  _triggerFlavorLine(targetId, key);
}

// ─── Flags row ────────────────────────────────────────────

function _renderFlagsRow() {
  const container = _flagsRow();
  if (!container) return;
  container.innerHTML = '';

  const player = state.playerFactionId;

  for (const [factionId] of state.factions.entries()) {
    if (factionId === player) continue;

    const slot = document.createElement('div');
    slot.className = 'dmod-flag-slot';
    slot.dataset.factionId = factionId;

    const isEliminated = state.eliminated.has(factionId);
    const isMet        = areMet(player, factionId);
    const factionDef   = FACTION_MAP[factionId];

    if (isEliminated) slot.classList.add('eliminated');
    else if (!isMet)  slot.classList.add('unmet');
    if (_selectedFactionId === factionId) slot.classList.add('active');

    // Flag image — unknown for unmet, real flag otherwise
    if (!isMet && !isEliminated) {
      const img = document.createElement('img');
      img.src = 'assets/flags/unknown_nation.png';
      img.alt = '???';
      slot.appendChild(img);
    } else if (factionDef?.flagImg) {
      const img = document.createElement('img');
      img.src = factionDef.flagImg;
      img.alt = factionDef.name ?? '';
      slot.appendChild(img);
    } else {
      const emo = document.createElement('span');
      emo.className = 'dmod-flag-emoji';
      emo.textContent = factionDef?.emoji ?? '?';
      slot.appendChild(emo);
    }

    // State icon overlay
    const stateIcon = document.createElement('span');
    stateIcon.className = 'dmod-state-icon';
    if (isEliminated) {
      stateIcon.textContent = '💀';
    } else if (!isMet) {
      stateIcon.textContent = '🌫️';
    } else {
      stateIcon.textContent = _getStateEmoji(getDiplomaticState(player, factionId));
    }
    slot.appendChild(stateIcon);

    if (!isEliminated && isMet) {
      slot.addEventListener('click', () => _selectFaction(factionId));
      // Pending incoming proposal — red border + badge
      const rel = getRelationship(player, factionId);
      if (rel?.pendingProposal && rel.pendingProposal.fromFactionId === factionId) {
        slot.classList.add('has-proposal');
        const badge = document.createElement('span');
        badge.className = 'dmod-proposal-badge';
        badge.textContent = '!';
        slot.appendChild(badge);
      }
    }

    container.appendChild(slot);
  }
}

// ─── Scene image ──────────────────────────────────────────

function _renderSceneImage() {
  const img    = _leaderImg();
  if (!img) return;
  const leader = LEADER_MAP[_selectedFactionId];
  img.src = leader?.leaderImg ?? '';
  img.alt = '';
}

// ─── Leader panel ─────────────────────────────────────────

function _renderLeaderPanel() {
  const targetId  = _selectedFactionId;
  const player    = state.playerFactionId;
  const leaderName = _leaderName();
  const facName    = _factionName();
  const badge      = _dipBadge();
  const opFill     = _opinionFill();
  const opLabel    = _opinionLabel();
  const opWrap     = _opinionWrap();

  if (!targetId) {
    if (leaderName) leaderName.textContent = '';
    if (facName)    facName.textContent = '';
    if (badge)      badge.textContent = '';
    return;
  }

  const leader     = LEADER_MAP[targetId];
  const factionDef = FACTION_MAP[targetId];
  const dipState   = getDiplomaticState(player, targetId);
  const opinion    = getOpinion(targetId, player); // AI's opinion of us

  if (leaderName) leaderName.textContent = leader?.name ?? factionDef?.name ?? '';
  if (facName)    facName.textContent    = factionDef?.name ?? '';

  if (badge) {
    badge.textContent = _getDipStateName(dipState);
    badge.className = 'dmod-dipstate-badge';
    const cls = dipState === DIPLOMATIC_STATES.WAR ? 'war' :
                dipState === DIPLOMATIC_STATES.WAR_PENDING ? 'war_pending' :
                dipState === DIPLOMATIC_STATES.TRUCE ? 'truce' :
                dipState === DIPLOMATIC_STATES.ALLIANCE ? 'alliance' : '';
    if (cls) badge.classList.add(cls);
  }

  if (opFill) {
    const pct = (opinion + 100) / 2;
    opFill.style.width      = pct + '%';
    opFill.style.background = opinion >= 15 ? 'var(--success)' :
                              opinion <= -15 ? 'var(--danger)' : '#c0a000';
  }
  if (opLabel) {
    opLabel.textContent = `${opinion >= 0 ? '+' : ''}${Math.round(opinion)} — ${getOpinionLabel(opinion)}`;
  }

  if (opWrap) {
    opWrap.onmouseenter = () => _showMemoryTooltip(targetId, player); // AI's memories about us
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
      const delta = m.opinionDelta;
      const cls   = delta >= 0 ? 'pos' : 'neg';
      const sign  = delta >= 0 ? '+' : '';
      return `<div class="dmod-memory-row">
        <span>${m.label} <small style="color:var(--text-muted)">(${m.turnsRemaining}t)</small></span>
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
  const targetId    = _selectedFactionId;
  const player      = state.playerFactionId;
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
    if (p.type === 'propose_truce')    desc = `${fromName} is proposing a Truce.`;
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
          const isAlliance = p.type === 'propose_alliance';
          acceptProposal(p.fromFactionId, player);
          _triggerFlavorLine(targetId, isAlliance ? 'response.player_alliance_accept' : 'response.player_truce_accept');
          _refresh();
        });
        const deny = document.createElement('button');
        deny.className = 'btn-secondary';
        deny.textContent = 'Decline';
        deny.addEventListener('click', () => {
          const isAlliance = p.type === 'propose_alliance';
          denyProposal(p.fromFactionId, player);
          _triggerFlavorLine(targetId, isAlliance ? 'response.player_alliance_deny' : 'response.player_truce_deny');
          _refresh();
        });
        btns.appendChild(accept);
        btns.appendChild(deny);
      }
      pendingBox.removeAttribute('hidden');
    } else {
      // Player → AI: awaiting (will auto-resolve via _sendProposalWithDelay)
      pendingText.textContent = _isWaiting ? 'Considering...' : 'Awaiting response...';
      const btns = _pendingBtns();
      if (btns) {
        btns.innerHTML = '';
        if (!_isWaiting) {
          const cancel = document.createElement('button');
          cancel.className = 'btn-secondary';
          cancel.textContent = 'Cancel';
          cancel.addEventListener('click', () => {
            if (rel) rel.pendingProposal = null;
            _refresh();
          });
          btns.appendChild(cancel);
        }
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

  // ── Gift gold row ──
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
  const buttons    = [];
  const targetName = FACTION_MAP[targetId]?.name ?? targetId;
  const rel        = getRelationship(player, targetId);
  const noProposal = !rel?.pendingProposal;

  if (dipState === DIPLOMATIC_STATES.PEACE && noProposal) {
    buttons.push(_makeBtn(`📯 Declare War on ${targetName}`, 'danger', () => {
      declareWar(player, targetId, { surprise: false });
      _triggerFlavorLine(targetId, 'response.war_declared');
      _refresh();
    }));
    buttons.push(_makeBtn(`🤝 Propose Alliance to ${targetName}`, '', () => {
      _sendProposalWithDelay(player, targetId, 'propose_alliance');
    }));
  }

  if (dipState === DIPLOMATIC_STATES.TRUCE && noProposal) {
    buttons.push(_makeBtn(`🤝 Propose Alliance to ${targetName}`, '', () => {
      _sendProposalWithDelay(player, targetId, 'propose_alliance');
    }));
    const turnsLeft = rel?.truceTurnsRemaining ?? 0;
    const info = document.createElement('p');
    info.style.cssText = 'font-size:.78rem;color:var(--text-muted);margin:0';
    info.textContent = `Truce expires in ${turnsLeft} turn${turnsLeft !== 1 ? 's' : ''}. Moving armies into their territory will trigger a surprise war.`;
    buttons.push(info);
  }

  if (dipState === DIPLOMATIC_STATES.ALLIANCE) {
    buttons.push(_makeBtn(`💔 Break Alliance with ${targetName}`, 'danger', () => {
      confirmModal(
        `💔 Break Alliance with ${targetName}`,
        `Ending this alliance will deal a significant opinion penalty and may lead to war.`,
        () => {
          breakAlliance(player, targetId);
          _triggerFlavorLine(targetId, 'response.alliance_broken');
          _refresh();
        }
      );
    }));
  }

  if (dipState === DIPLOMATIC_STATES.WAR && noProposal) {
    const cost = getTruceCost(player, targetId);
    const myPay    = cost[player]   ?? 0;
    const theirPay = cost[targetId] ?? 0;
    const costDesc = myPay > 0    ? ` (you pay ${myPay} gold)` :
                     theirPay > 0 ? ` (they pay ${theirPay} gold)` : '';
    buttons.push(_makeBtn(`🕊️ Propose Truce${costDesc}`, '', () => {
      _sendProposalWithDelay(player, targetId, 'propose_truce', cost);
    }));
  }

  if (dipState === DIPLOMATIC_STATES.WAR_PENDING) {
    const turns = rel?.warPendingTurns ?? 0;
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
      _triggerFlavorLine(targetId, 'response.gift_received');
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

// ─── Proposal with AI response delay ──────────────────────

function _sendProposalWithDelay(player, targetId, type, costData = null) {
  if (_isWaiting) return;
  _isWaiting = true;

  createProposal(player, targetId, type, costData);

  // Cancel any running typewriter and start hourglass animation
  if (_cancelTypewriter) { _cancelTypewriter(); _cancelTypewriter = null; }
  const flavEl = _flavorText();
  const hourglasses = ['⏳', '⌛'];
  let hIdx = 0;
  if (flavEl) flavEl.textContent = `${hourglasses[hIdx]} Considering...`;
  const hInterval = setInterval(() => {
    hIdx = (hIdx + 1) % 2;
    if (flavEl) flavEl.textContent = `${hourglasses[hIdx]} Considering...`;
  }, 500);

  _renderActionsPanel();

  const delay = 1800 + Math.random() * 400;
  setTimeout(() => {
    clearInterval(hInterval);
    _isWaiting = false;
    const decision = _evaluateProposalDecision(targetId, player, type);

    if (decision === 'accept') {
      acceptProposal(player, targetId);
      const key = type === 'propose_alliance' ? 'response.ai_alliance_accept' : 'response.ai_truce_accept';
      _triggerFlavorLine(targetId, key);
    } else {
      denyProposal(player, targetId);
      const key = type === 'propose_alliance' ? 'response.ai_alliance_deny' : 'response.ai_truce_deny';
      _triggerFlavorLine(targetId, key);
    }

    _refresh();
  }, delay);
}

function _evaluateProposalDecision(aiId, playerId, type) {
  const leader  = LEADER_MAP[aiId];
  const opinion = getOpinion(aiId, playerId) ?? 0;
  const rel     = getRelationship(aiId, playerId);

  if (type === 'propose_truce') {
    const aiScore     = rel?.warScore?.[aiId]?.provincesGained ?? 0;
    const playerScore = rel?.warScore?.[playerId]?.provincesGained ?? 0;
    const isLosing    = aiScore < playerScore;
    const threshold   = isLosing ? 0.7 : opinion > -20 ? 0.5 : 0.2;
    return Math.random() < threshold ? 'accept' : 'deny';
  }

  if (type === 'propose_alliance') {
    const threshold = leader?.allianceThreshold ?? 50;
    if (opinion < threshold) return 'deny';
    const hasWar = [...(state.diplomacy?.values() ?? [])].some(r => {
      if (r.factionAId !== aiId && r.factionBId !== aiId) return false;
      return r.state === DIPLOMATIC_STATES.WAR || r.state === DIPLOMATIC_STATES.WAR_PENDING;
    });
    if (hasWar) return 'deny';
    return Math.random() < 0.7 ? 'accept' : 'deny';
  }

  return 'deny';
}

// ─── Internal refresh (no greeting re-trigger) ────────────

function _refresh() {
  _renderFlagsRow();
  _renderSceneImage();
  _renderLeaderPanel();
  _renderActionsPanel();
}

// ─── Notification badge on button ─────────────────────────

function _updateBadge() {
  const btn = document.getElementById('diplomacy-btn');
  if (!btn) return;
  let badge = btn.querySelector('.dmod-badge');

  const player = state.playerFactionId;
  const hasPending = player && [...(state.diplomacy?.values() ?? [])].some(rel =>
    rel.pendingProposal && rel.pendingProposal.fromFactionId !== player &&
    (rel.factionAId === player || rel.factionBId === player)
  );

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

  document.addEventListener('diplomatic-proposal-received', () => {
    _updateBadge();
    if (isDiplomacyModalOpen()) _renderActionsPanel();
  });

  document.addEventListener('alliance-broken', () => {
    if (isDiplomacyModalOpen()) _refresh();
  });
}
