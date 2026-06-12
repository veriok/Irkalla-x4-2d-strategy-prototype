/**
 * diplomacy.js
 *
 * Core diplomacy state and logic.
 *
 * Relationships are stored per sorted faction pair in state.diplomacy.
 * Opinions and memories are stored per-faction on factionState (opinions/memories Maps).
 *
 * Only AI factions compute opinion drift and generate proposals.
 * Player faction opinions/memories are updated (for display) but no drift or AI logic runs on them.
 */

import { state } from './game-state.js';
import { emit } from './game-events.js';
import { DIPLOMATIC_STATES, MEMORY_TYPES, GAME_EVENTS, FACTION_IDS, RACE_IDS } from '../data/enums.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { LEADER_MAP } from '../data/diplomacy-data.js';

// ─── Memory base definitions ──────────────────────────────
// opinionDelta: one-time hit applied at creation (positive = good, negative = bad)
// driftModifier: additive modifier to opponent's opinion drift target while active
// gainMultiplier: multiplier on future positive opinion gains while active (< 1 = dampens bribes etc.)
// totalTurns: base duration before leader memoryDuration is applied
const MEMORY_DEFS = {
  [MEMORY_TYPES.WAR_DECLARED_BY_US]: {
    label: 'We declared war',
    opinionDelta: -5,
    driftModifier: -3,
    gainMultiplier: 0.8,
    totalTurns: 15,
  },
  [MEMORY_TYPES.WAR_DECLARED_ON_US]: {
    label: 'They declared war on us',
    opinionDelta: -30,
    driftModifier: -8,
    gainMultiplier: 0.5,
    totalTurns: 20,
  },
  [MEMORY_TYPES.SURPRISE_WAR_BY_US]: {
    label: 'We launched a surprise attack',
    opinionDelta: -8,
    driftModifier: -5,
    gainMultiplier: 0.7,
    totalTurns: 20,
  },
  [MEMORY_TYPES.SURPRISE_WAR_ON_US]: {
    label: 'They attacked us without warning',
    opinionDelta: -60,
    driftModifier: -15,
    gainMultiplier: 0.3,
    totalTurns: 30,
  },
  [MEMORY_TYPES.TRUCE_BETRAYAL]: {
    label: 'They betrayed our truce',
    opinionDelta: -50,
    driftModifier: -12,
    gainMultiplier: 0.25,
    totalTurns: 25,
  },
  [MEMORY_TYPES.ALLIANCE_FORMED]: {
    label: 'We formed an alliance',
    opinionDelta: 20,
    driftModifier: 10,
    gainMultiplier: 1.2,
    totalTurns: 999, // effectively permanent until explicitly removed on break
  },
  [MEMORY_TYPES.ALLIANCE_BROKEN]: {
    label: 'Alliance was broken',
    opinionDelta: -35,
    driftModifier: -10,
    gainMultiplier: 0.4,
    totalTurns: 20,
  },
  [MEMORY_TYPES.GOLD_GIFT]: {
    label: 'Received a gold gift',
    opinionDelta: 12,
    driftModifier: 3,
    gainMultiplier: 1.0,
    totalTurns: 8,
  },
  [MEMORY_TYPES.PEACE_SIGNED]: {
    label: 'Peace was signed',
    opinionDelta: 10,
    driftModifier: 4,
    gainMultiplier: 0.8,
    totalTurns: 15,
  },
};

// ─── Helpers ──────────────────────────────────────────────

function _pairKey(a, b) {
  return [a, b].sort().join(':');
}

function _getLeader(factionId) {
  return LEADER_MAP[factionId] ?? null;
}

function _getRaceId(factionId) {
  return FACTION_MAP[factionId]?.raceId ?? null;
}

// ─── Public API: relationships ────────────────────────────

export function getRelationship(a, b) {
  return state.diplomacy.get(_pairKey(a, b)) ?? null;
}

export function getDiplomaticState(a, b) {
  return getRelationship(a, b)?.state ?? DIPLOMATIC_STATES.PEACE;
}

export function areMet(a, b) {
  return getRelationship(a, b)?.met ?? false;
}

export function getOpinion(viewerFactionId, targetFactionId) {
  const fs = state.factions.get(viewerFactionId);
  return fs?.opinions?.get(targetFactionId) ?? 0;
}

export function getMemories(ownerFactionId, aboutFactionId) {
  const fs = state.factions.get(ownerFactionId);
  return fs?.memories?.get(aboutFactionId) ?? [];
}

/**
 * Returns the 5 memories with the highest strength (used for effect computation).
 * All memories are kept but only top-5 contribute drift/gain effects.
 */
function _getTopMemories(ownerFactionId, aboutFactionId) {
  const all = getMemories(ownerFactionId, aboutFactionId);
  return [...all].sort((a, b) => b.strength - a.strength).slice(0, 5);
}

// ─── Initialisation ───────────────────────────────────────

export function initDiplomacy() {
  state.diplomacy = new Map();

  const factionIds = [...state.factions.keys()];
  for (let i = 0; i < factionIds.length; i++) {
    for (let j = i + 1; j < factionIds.length; j++) {
      const a = factionIds[i];
      const b = factionIds[j];
      state.diplomacy.set(_pairKey(a, b), {
        factionAId: a,
        factionBId: b,
        state: DIPLOMATIC_STATES.PEACE,
        met: false,
        truceTurnsRemaining: null,
        warPendingTurns: null,
        warScore: {
          [a]: { provincesGained: 0, unitLossesInflicted: 0 },
          [b]: { provincesGained: 0, unitLossesInflicted: 0 },
        },
        pendingProposal: null,
        recentlySentProposals: [],
      });
    }
    // Initialise opinion/memory maps on each faction state
    const fs = state.factions.get(factionIds[i]);
    if (fs) {
      if (!fs.opinions) fs.opinions = new Map();
      if (!fs.memories) fs.memories = new Map();
      for (const otherId of factionIds) {
        if (otherId !== factionIds[i]) {
          if (!fs.opinions.has(otherId)) fs.opinions.set(otherId, 0);
          if (!fs.memories.has(otherId)) fs.memories.set(otherId, []);
        }
      }
    }
  }
}

// ─── Mark met ─────────────────────────────────────────────

export function markMet(a, b) {
  const rel = getRelationship(a, b);
  if (!rel || rel.met) return;
  rel.met = true;
  emit(GAME_EVENTS.FACTION_MET, { factionAId: a, factionBId: b });
}

// ─── Memory management ────────────────────────────────────

/**
 * Add a memory from ownerFactionId's perspective about aboutFactionId.
 * Applies leader personality modifiers at creation time.
 * One-time opinionDelta is applied immediately to owner's opinion of about.
 */
export function addMemory(ownerFactionId, aboutFactionId, memoryType) {
  const def = MEMORY_DEFS[memoryType];
  if (!def) return;

  const leader = _getLeader(ownerFactionId);
  const fs = state.factions.get(ownerFactionId);
  if (!fs) return;

  // Compute duration: global multiplier × per-type override
  let durationMult = leader?.memoryDuration ?? 1.0;
  if (leader?.memoryDurationByType?.[memoryType]) {
    durationMult = (leader.memoryDuration ?? 1.0) * leader.memoryDurationByType[memoryType];
  }

  // Compute opinion delta: global multipliers + per-type override
  let opinionDelta = def.opinionDelta;
  if (memoryType === MEMORY_TYPES.GOLD_GIFT) {
    opinionDelta *= (leader?.goldGiftEffectiveness ?? 1.0);
  }
  if ([MEMORY_TYPES.SURPRISE_WAR_ON_US, MEMORY_TYPES.TRUCE_BETRAYAL, MEMORY_TYPES.ALLIANCE_BROKEN].includes(memoryType)) {
    opinionDelta *= (leader?.betrayalSensitivity ?? 1.0);
  }
  if (leader?.memoryOpinionMultiplierByType?.[memoryType]) {
    opinionDelta *= leader.memoryOpinionMultiplierByType[memoryType];
  }
  opinionDelta = Math.round(opinionDelta);

  const totalTurns = Math.max(1, Math.round(def.totalTurns * durationMult));

  const memory = {
    type: memoryType,
    label: def.label,
    opinionDelta,
    baseDriftModifier: def.driftModifier,
    baseGainMultiplier: def.gainMultiplier,
    turnsRemaining: totalTurns,
    totalTurns,
    strength: Math.abs(opinionDelta), // starts at full strength
  };

  if (!fs.memories.has(aboutFactionId)) fs.memories.set(aboutFactionId, []);
  fs.memories.get(aboutFactionId).push(memory);

  // Apply one-time opinion delta, taking existing memories' gain multiplier into account
  if (opinionDelta > 0) {
    const gainMult = _computeGainMultiplier(ownerFactionId, aboutFactionId);
    opinionDelta = Math.round(opinionDelta * gainMult);
  }
  _nudgeOpinion(ownerFactionId, aboutFactionId, opinionDelta);
}

function _computeGainMultiplier(ownerFactionId, aboutFactionId) {
  const top5 = _getTopMemories(ownerFactionId, aboutFactionId);
  let mult = 1.0;
  for (const m of top5) {
    // Effective gain multiplier decays toward 1.0 as memory fades
    const progress = m.turnsRemaining / m.totalTurns;
    const effectiveMult = 1.0 + (m.baseGainMultiplier - 1.0) * progress;
    mult *= effectiveMult;
  }
  return Math.max(0.1, mult);
}

function _nudgeOpinion(factionId, targetId, delta) {
  const fs = state.factions.get(factionId);
  if (!fs) return;
  const current = fs.opinions.get(targetId) ?? 0;
  fs.opinions.set(targetId, Math.max(-100, Math.min(100, current + delta)));
}

// ─── Per-turn tick ────────────────────────────────────────

export function tickDiplomacy() {
  const factionIds = [...state.factions.keys()];

  // 1. Memory decay + opinion drift (per faction)
  for (const factionId of factionIds) {
    const fs = state.factions.get(factionId);
    if (!fs) continue;

    for (const [aboutId, memories] of fs.memories.entries()) {
      // Decay all memories
      for (const m of memories) {
        m.turnsRemaining = Math.max(0, m.turnsRemaining - 1);
        m.strength = Math.abs(m.opinionDelta) * (m.turnsRemaining / m.totalTurns);
      }
      // Remove memories with strength < 1 (fully faded)
      const active = memories.filter(m => m.strength >= 1);
      fs.memories.set(aboutId, active);
    }

    // Opinion drift (AI only, or player — both drift toward target)
    for (const [targetId] of fs.opinions.entries()) {
      const rel = getRelationship(factionId, targetId);
      if (!rel || !rel.met) continue;

      const leader = _getLeader(factionId);
      const top5 = _getTopMemories(factionId, targetId);

      // Drift target = base (0) + memory drift modifiers + racial + faction-specific
      let driftTarget = 0;
      for (const m of top5) {
        const progress = m.turnsRemaining / m.totalTurns;
        driftTarget += m.baseDriftModifier * progress;
      }
      if (leader) {
        const targetRace = _getRaceId(targetId);
        if (targetRace && leader.racialDrift[targetRace]) {
          driftTarget += leader.racialDrift[targetRace];
        }
        if (leader.factionDrift[targetId]) {
          driftTarget += leader.factionDrift[targetId];
        }
      }

      const current = fs.opinions.get(targetId) ?? 0;
      if (current < driftTarget) {
        fs.opinions.set(targetId, Math.min(driftTarget, current + 1));
      } else if (current > driftTarget) {
        fs.opinions.set(targetId, Math.max(driftTarget, current - 1));
      }
    }
  }

  // 2. Relationship countdowns
  for (const rel of state.diplomacy.values()) {
    // Truce countdown
    if (rel.state === DIPLOMATIC_STATES.TRUCE && rel.truceTurnsRemaining !== null) {
      rel.truceTurnsRemaining--;
      if (rel.truceTurnsRemaining <= 0) {
        rel.state = DIPLOMATIC_STATES.PEACE;
        rel.truceTurnsRemaining = null;
      }
    }

    // War pending countdown
    if (rel.state === DIPLOMATIC_STATES.WAR_PENDING && rel.warPendingTurns !== null) {
      rel.warPendingTurns--;
      if (rel.warPendingTurns <= 0) {
        rel.state = DIPLOMATIC_STATES.WAR;
        rel.warPendingTurns = null;
        emit(GAME_EVENTS.WAR_DECLARED, {
          declaringFactionId: rel._warDeclarant,
          targetFactionId: rel._warTarget,
          isSurprise: false,
        });
      }
    }

    // Proposal expiry
    if (rel.pendingProposal && rel.pendingProposal.expiresOnTurn <= state.turn) {
      rel.pendingProposal = null;
    }

    // Cooldown expiry
    rel.recentlySentProposals = rel.recentlySentProposals.filter(
      p => p.cooldownUntilTurn > state.turn
    );
  }
}

// ─── Diplomatic actions ───────────────────────────────────

/**
 * Declare war. surprise=false uses WAR_PENDING (3 turns, cannot use during TRUCE).
 * surprise=true goes straight to WAR from any state.
 */
export function declareWar(declaringId, targetId, { surprise = false } = {}) {
  const rel = getRelationship(declaringId, targetId);
  if (!rel || rel.state === DIPLOMATIC_STATES.WAR || rel.state === DIPLOMATIC_STATES.WAR_PENDING) return;
  if (!surprise && rel.state === DIPLOMATIC_STATES.TRUCE) return; // formal war blocked during truce

  const wasTruce = rel.state === DIPLOMATIC_STATES.TRUCE;

  if (surprise) {
    rel.state = DIPLOMATIC_STATES.WAR;
    // Reset war score
    rel.warScore[declaringId] = { provincesGained: 0, unitLossesInflicted: 0 };
    rel.warScore[targetId]    = { provincesGained: 0, unitLossesInflicted: 0 };
    rel.pendingProposal = null;

    emit(GAME_EVENTS.WAR_DECLARED, { declaringFactionId: declaringId, targetFactionId: targetId, isSurprise: true });

    // Memories: declaring side gets a mild negative (they attacked), target gets harsh negative
    addMemory(declaringId, targetId, MEMORY_TYPES.SURPRISE_WAR_BY_US);
    addMemory(targetId, declaringId, MEMORY_TYPES.SURPRISE_WAR_ON_US);
    if (wasTruce) {
      addMemory(targetId, declaringId, MEMORY_TYPES.TRUCE_BETRAYAL);
    }
    // Other factions that have met either party see a small opinion drop toward the attacker
    _spreadSurpriseWarOpinion(declaringId, targetId);
  } else {
    rel.state = DIPLOMATIC_STATES.WAR_PENDING;
    rel.warPendingTurns = 3;
    rel._warDeclarant = declaringId;
    rel._warTarget = targetId;
    rel.warScore[declaringId] = { provincesGained: 0, unitLossesInflicted: 0 };
    rel.warScore[targetId]    = { provincesGained: 0, unitLossesInflicted: 0 };
    rel.pendingProposal = null;

    addMemory(declaringId, targetId, MEMORY_TYPES.WAR_DECLARED_BY_US);
    addMemory(targetId, declaringId, MEMORY_TYPES.WAR_DECLARED_ON_US);
  }
}

function _spreadSurpriseWarOpinion(attackerId, victimId) {
  for (const [factionId, fs] of state.factions.entries()) {
    if (factionId === attackerId || factionId === victimId) continue;
    if (!areMet(factionId, attackerId)) continue;
    // Small opinion hit: witness to surprise aggression think less of the attacker
    _nudgeOpinion(factionId, attackerId, -8);
  }
}

/**
 * Create a pending proposal (truce or alliance) from fromId to toId.
 * If toId is an AI faction, it will be evaluated immediately by runAIDiplomacy.
 * If toId is the player faction, it emits DIPLOMATIC_PROPOSAL_RECEIVED.
 */
export function createProposal(fromId, toId, type, goldAmount = null) {
  const rel = getRelationship(fromId, toId);
  if (!rel) return;
  // Check cooldown — don't spam
  const onCooldown = rel.recentlySentProposals.some(
    p => p.fromFactionId === fromId && p.type === type && p.cooldownUntilTurn > state.turn
  );
  if (onCooldown) return;
  if (rel.pendingProposal) return; // already a pending proposal

  rel.pendingProposal = {
    fromFactionId: fromId,
    type,
    goldAmount,
    expiresOnTurn: state.turn + 5,
  };

  if (toId === state.playerFactionId) {
    emit(GAME_EVENTS.DIPLOMATIC_PROPOSAL_RECEIVED, {
      factionId: toId, // playerOnly check in DOM_FORWARD uses factionId
      fromFactionId: fromId,
      toFactionId: toId,
      type,
    });
  }
}

export function acceptProposal(fromId, toId) {
  const rel = getRelationship(fromId, toId);
  if (!rel?.pendingProposal) return;
  const proposal = rel.pendingProposal;
  rel.pendingProposal = null;

  if (proposal.type === 'propose_truce') {
    _signTruce(fromId, toId, proposal.goldAmount);
  } else if (proposal.type === 'propose_alliance') {
    _formAlliance(fromId, toId);
  }
}

export function denyProposal(fromId, toId) {
  const rel = getRelationship(fromId, toId);
  if (!rel?.pendingProposal) return;
  const { type } = rel.pendingProposal;
  const proposerId = rel.pendingProposal.fromFactionId;
  rel.pendingProposal = null;
  // Log cooldown so AI doesn't immediately re-send
  rel.recentlySentProposals.push({
    fromFactionId: proposerId,
    type,
    cooldownUntilTurn: state.turn + 8,
  });
}

function _signTruce(a, b, goldAmount) {
  const rel = getRelationship(a, b);
  if (!rel) return;
  rel.state = DIPLOMATIC_STATES.TRUCE;
  rel.truceTurnsRemaining = 10;
  // Gold transfer: loser pays winner
  if (goldAmount) {
    const payerId   = Object.keys(goldAmount).find(id => goldAmount[id] > 0);
    const amount    = payerId ? goldAmount[payerId] : 0;
    const receiverId = payerId === a ? b : a;
    if (payerId && amount > 0) {
      const payerFs = state.factions.get(payerId);
      const recvFs  = state.factions.get(receiverId);
      if (payerFs && recvFs) {
        payerFs.resources.gold   = Math.max(0, (payerFs.resources.gold ?? 0) - amount);
        recvFs.resources.gold    = (recvFs.resources.gold ?? 0) + amount;
      }
    }
  }
  addMemory(a, b, MEMORY_TYPES.PEACE_SIGNED);
  addMemory(b, a, MEMORY_TYPES.PEACE_SIGNED);
  emit(GAME_EVENTS.PEACE_SIGNED, { factionAId: a, factionBId: b });
}

function _formAlliance(a, b) {
  const rel = getRelationship(a, b);
  if (!rel) return;
  rel.state = DIPLOMATIC_STATES.ALLIANCE;
  addMemory(a, b, MEMORY_TYPES.ALLIANCE_FORMED);
  addMemory(b, a, MEMORY_TYPES.ALLIANCE_FORMED);
}

export function breakAlliance(a, b) {
  const rel = getRelationship(a, b);
  if (!rel || rel.state !== DIPLOMATIC_STATES.ALLIANCE) return;
  rel.state = DIPLOMATIC_STATES.PEACE;
  // Remove ALLIANCE_FORMED memories (they are permanent until here)
  for (const [owner, about] of [[a, b], [b, a]]) {
    const fs = state.factions.get(owner);
    if (!fs) continue;
    const mems = fs.memories.get(about) ?? [];
    fs.memories.set(about, mems.filter(m => m.type !== MEMORY_TYPES.ALLIANCE_FORMED));
  }
  addMemory(a, b, MEMORY_TYPES.ALLIANCE_BROKEN);
  addMemory(b, a, MEMORY_TYPES.ALLIANCE_BROKEN);
  emit(GAME_EVENTS.ALLIANCE_BROKEN, { factionAId: a, factionBId: b });
}

export function giftGold(fromId, toId, amount) {
  const fromFs = state.factions.get(fromId);
  const toFs   = state.factions.get(toId);
  if (!fromFs || !toFs) return;
  if ((fromFs.resources.gold ?? 0) < amount) return;
  fromFs.resources.gold = (fromFs.resources.gold ?? 0) - amount;
  toFs.resources.gold   = (toFs.resources.gold ?? 0) + amount;
  // Only the recipient gets the memory (their opinion of the gifter improves)
  addMemory(toId, fromId, MEMORY_TYPES.GOLD_GIFT);
}

// ─── War score ────────────────────────────────────────────

export function recordProvinceCapture(attackerId, defenderId) {
  const rel = getRelationship(attackerId, defenderId);
  if (!rel || rel.state !== DIPLOMATIC_STATES.WAR) return;
  if (!rel.warScore[attackerId]) rel.warScore[attackerId] = { provincesGained: 0, unitLossesInflicted: 0 };
  rel.warScore[attackerId].provincesGained++;
}

export function recordUnitLoss(victimId, inflictorId, unitCount) {
  const rel = getRelationship(victimId, inflictorId);
  if (!rel || rel.state !== DIPLOMATIC_STATES.WAR) return;
  if (!rel.warScore[inflictorId]) rel.warScore[inflictorId] = { provincesGained: 0, unitLossesInflicted: 0 };
  rel.warScore[inflictorId].unitLossesInflicted += unitCount;
}

/**
 * Compute truce gold cost.
 * Returns { [factionAId]: goldRequired, [factionBId]: goldRequired }
 * Loser pays; winner pays 0.
 */
export function getTruceCost(a, b) {
  const rel = getRelationship(a, b);
  if (!rel) return { [a]: 0, [b]: 0 };
  const scoreA = rel.warScore[a] ?? { provincesGained: 0, unitLossesInflicted: 0 };
  const scoreB = rel.warScore[b] ?? { provincesGained: 0, unitLossesInflicted: 0 };

  const pointsA = scoreA.provincesGained * 30 + scoreA.unitLossesInflicted * 5;
  const pointsB = scoreB.provincesGained * 30 + scoreB.unitLossesInflicted * 5;

  if (pointsA === pointsB) return { [a]: 50, [b]: 50 }; // tied — small mutual fee
  const loser  = pointsA < pointsB ? a : b;
  const winner = loser === a ? b : a;
  const diff   = Math.abs(pointsA - pointsB);
  return { [loser]: Math.min(300, 50 + diff), [winner]: 0 };
}

// ─── Alliance visibility helpers ─────────────────────────

/**
 * Grant player visibility over all provinces owned by allied factions.
 * Called after alliance is formed/broken.
 */
export function applyAllianceVisibility() {
  const playerFactionId = state.playerFactionId;
  if (!playerFactionId) return;

  for (const [factionId] of state.factions.entries()) {
    if (factionId === playerFactionId) continue;
    const rel = getRelationship(playerFactionId, factionId);
    if (!rel?.met) continue;
    const isAllied = rel.state === DIPLOMATIC_STATES.ALLIANCE;

    for (const prov of state.provinces.values()) {
      if (prov.ownerId !== factionId) continue;
      if (isAllied && prov.visibility !== 'visible') {
        prov.visibility = 'visible';
      }
    }
  }
}

// ─── Utility exports ──────────────────────────────────────

/** True if factions are at war (or pending war). */
export function isAtWar(a, b) {
  const s = getDiplomaticState(a, b);
  return s === DIPLOMATIC_STATES.WAR || s === DIPLOMATIC_STATES.WAR_PENDING;
}

/** True if movement/passage should be blocked (not allied). */
export function blocksPassage(movingFactionId, provinceFactionId) {
  if (movingFactionId === provinceFactionId) return false;
  if (provinceFactionId === 'neutral') return false;
  const s = getDiplomaticState(movingFactionId, provinceFactionId);
  return s !== DIPLOMATIC_STATES.ALLIANCE;
}

/** True if this army should be able to attack/capture that province. */
export function canAttackProvince(attackerFactionId, defenderFactionId) {
  if (defenderFactionId === 'neutral') return true;
  if (defenderFactionId === attackerFactionId) return false;
  const s = getDiplomaticState(attackerFactionId, defenderFactionId);
  return s === DIPLOMATIC_STATES.WAR;
}

/** Opinion label for display. */
export function getOpinionLabel(opinion) {
  if (opinion >=  70) return 'Devoted';
  if (opinion >=  40) return 'Friendly';
  if (opinion >=  15) return 'Warm';
  if (opinion >=  -15) return 'Neutral';
  if (opinion >=  -40) return 'Cold';
  if (opinion >=  -65) return 'Hostile';
  return 'Hateful';
}
