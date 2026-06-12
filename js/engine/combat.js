/**
 * combat.js
 * Simultaneous round-based combat resolution.
 */

import {
  state,
  getArmy,
  getProvince,
  captureProvince,
  moveArmy,
  removeArmy,
  addResources,
  getArmiesInProvince,
  getArmySupplyCap,
  addCombatReport,
  rollTreasure,
  getFaction,
} from './game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { UNIT_MAP, getMilitiaUnitIdForFaction } from '../data/units-data.js';
import { BUILDING_MAP } from '../data/buildings-data.js';
import { getBiome } from '../data/biomes-data.js';
import {
  armyAttackStrength,
  armyDefenseStrength,
  armySize,
  armyWoundedCount,
  markArmyAttacked,
  transferActiveUnits,
  transferWoundedUnits,
  recalcArmyMoves,
} from '../models/army.js';
import { getLocationDefenseBonus } from '../models/location.js';
import { flashCombat, flashConquest } from '../ui/map-view.js';
import { logCapture, logMessage } from '../ui/event-log.js';
import { emit } from './game-events.js';
import { GAME_EVENTS, UNIT_TYPES, TRAIT_IDS, EFFECT_TYPES, EFFECT_SCOPES } from '../data/enums.js';
import { isHeroActive, addHeroExperience, woundHero, getHeroArmyBonuses, getHeroWoundChanceBonus, getHeroProvinceBonuses, getHeroSpellpower, getHeroSchoolTier, getHeroFortificationReduction } from './hero-engine.js';
import { HERO_SKILL_MAP } from '../data/hero-skills-data.js';
import { ARTIFACT_MAP, rollRandomArtifact } from '../data/artifacts-data.js';
import { SPELL_MAP } from '../data/hero-spells-data.js';
import { getEffectiveUnitStats, getEffectiveArmyAttack, getEffectiveArmyDefense } from './tech-effects.js';
import { TRAIT_MAP } from '../data/traits-data.js';
import { PROVINCE_STATUS_MAP } from '../data/province-status-data.js';
import { playerCanSee } from './game-state.js';
import { MONSTER_UNITS, BIOME_DEN_ENCOUNTER } from '../data/monsters-data.js';

const WOUND_CHANCE = 0.45;

/**
 * Emit ARMY_CASUALTIES after a combat phase, then apply any resurrections handlers grant.
 * Pending casualties are typeIds of units that were truly destroyed (not naturally wounded).
 * Handlers set entry.resurrect = true to wound the unit; entry.spawnUnitId to queue a spawn.
 * Resurrections are only applied if the army has surviving units (armyWillSurvive).
 */
function _emitArmyCasualties(army, pendingCasualties, province, role, outcome) {
  if (!army || pendingCasualties.length === 0) return;

  const entries = pendingCasualties
    .map(typeId => ({ typeId, unit: { ...(UNIT_MAP[typeId] ?? {}) }, resurrect: false, spawnUnitId: null }))
    .filter(e => e.unit.id);

  if (entries.length === 0) return;

  const armyWillSurvive = armySize(army) > 0;

  emit(GAME_EVENTS.ARMY_CASUALTIES, {
    factionId: army.factionId,
    army,
    province,
    gameState: state,
    outcome,
    role,
    armyWillSurvive,
    casualties: entries,
  });

  if (!armyWillSurvive) return;

  let anyResurrected = false;
  for (const entry of entries) {
    if (!entry.resurrect) continue;
    const maxHp = Math.max(1, UNIT_MAP[entry.typeId]?.maxHp ?? 10);
    army.hp.wounded[entry.typeId] = army.hp.wounded[entry.typeId] ?? [];
    army.hp.wounded[entry.typeId].push(Math.max(1, Math.round(maxHp * 0.15)));
    anyResurrected = true;
  }
  if (anyResurrected) recalcArmyMoves(army, UNIT_MAP);
}

function _d6() { return Math.floor(Math.random() * 6) + 1; }
function _d8() { return Math.floor(Math.random() * 8) + 1; }

function _getHeroTacticsBonus(army) {
  if (!army?.heroId) return 0;
  const fs = getFaction(army.factionId);
  const hero = fs?.heroes?.find(h => h.id === army.heroId);
  if (!hero || !isHeroActive(hero)) return 0;
  return Math.floor((hero.attributes.tactics ?? 0) / 2);
}
function _clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ─── First Strike helpers ──────────────────────────────────

// Sum flat first strike chance bonuses from hero skills that target this unit's type.
function _getHeroFirstStrikeBonusForUnit(hero, unit) {
  if (!hero?.skills) return 0;
  let bonus = 0;
  for (const { skillId, tier } of hero.skills) {
    const skillDef = HERO_SKILL_MAP[skillId];
    if (!skillDef) continue;
    const tierDef = skillDef.tiers.find(t => t.tier === tier);
    if (!tierDef) continue;
    for (const eff of (tierDef.effects ?? [])) {
      if (eff.type === 'army_unit_type_bonus' && eff.stat === 'firstStrikeChance') {
        if (eff.unitType === unit.unitType || eff.unitType === UNIT_TYPES.ALL) {
          bonus += eff.flat ?? 0;
        }
      }
    }
  }
  return bonus / 100;
}

// Sum firstStrikeChance from fort-slot buildings on the province.
function _getDefenderFortFirstStrikeBonus(province) {
  return (province?.locations ?? []).reduce((sum, loc) => {
    const b = BUILDING_MAP[loc.buildingId];
    return sum + (b?.effects ?? [])
      .filter(e => e.type === EFFECT_TYPES.FORTIFICATION_FIRST_STRIKE_CHANCE)
      .reduce((s, e) => s + (e.amount ?? 0), 0);
  }, 0);
}

// Per-unit first strike chance: base 25% ± tactics advantage ± hero skill ± fort ± spell status.
// tacticsAdvantage = attTac - defTac (positive = attacker has edge, negative = defender has edge).
function _calcFirstStrikeChance(army, province, isDefender, tacticsAdvantage, unit) {
  const fs   = getFaction(army.factionId);
  const hero = army.heroId ? fs?.heroes?.find(h => h.id === army.heroId) : null;
  const heroBonus  = (hero && isHeroActive(hero)) ? _getHeroFirstStrikeBonusForUnit(hero, unit) : 0;
  const fortBonus  = isDefender ? _getDefenderFortFirstStrikeBonus(province) : 0;
  const spellBonus = (army.statusEffects ?? []).reduce((s, e) => s + (e.firstStrikeChanceBonus ?? 0), 0);
  const tacBonus   = (isDefender ? -tacticsAdvantage : tacticsAdvantage) * 0.02;
  return _clamp(0.25 + tacBonus + heroBonus + fortBonus + spellBonus, 0, 1);
}

function _snapshotCounts(hpMap) {
  const out = {};
  for (const [id, arr] of Object.entries(hpMap ?? {}))
    if (arr?.length > 0) out[id] = arr.length;
  return out;
}

function _buildUnitCardList(snapActive, snapWounded, postActive, postWounded) {
  const cards = [];
  for (const typeId of new Set([...Object.keys(snapActive), ...Object.keys(snapWounded)])) {
    const priorActive  = snapActive[typeId]  ?? 0;
    const priorWounded = snapWounded[typeId] ?? 0;
    const postActiveCount  = postActive[typeId]?.length  ?? 0;
    const postWoundedCount = postWounded[typeId]?.length ?? 0;

    // Pre-existing wounded: those still in wounded pool stay 'wounded', rest were killed
    const priorWoundedSurviving = Math.min(priorWounded, postWoundedCount);
    for (let i = 0; i < priorWoundedSurviving;                    i++) cards.push({ typeId, status: 'wounded' });
    for (let i = 0; i < priorWounded - priorWoundedSurviving;     i++) cards.push({ typeId, status: 'killed'  });

    // Previously-active units: some newly wounded, rest alive or killed
    const newlyWounded = Math.max(0, postWoundedCount - priorWoundedSurviving);
    const stillActive  = Math.min(priorActive, postActiveCount);
    const activeKilled = Math.max(0, priorActive - stillActive - newlyWounded);
    for (let i = 0; i < stillActive;  i++) cards.push({ typeId, status: 'alive'   });
    for (let i = 0; i < newlyWounded; i++) cards.push({ typeId, status: 'wounded' });
    for (let i = 0; i < activeKilled; i++) cards.push({ typeId, status: 'killed'  });
  }
  return cards;
}

function _pickBestDefenderArmy(defArmies) {
  if (!defArmies || defArmies.length === 0) return null;
  return [...defArmies].sort((a, b) => {
    const byDef = getEffectiveArmyDefense(b, b.factionId, UNIT_MAP) - getEffectiveArmyDefense(a, a.factionId, UNIT_MAP);
    if (byDef !== 0) return byDef;
    return armySize(b) - armySize(a);
  })[0];
}

function _militiaPoolForProvince(province) {
  const count = Math.max(0, province.militia?.current ?? 0);
  const unitId = getMilitiaUnitIdForFaction(province.ownerId ?? 'neutral');
  const unitDef = UNIT_MAP[unitId] ?? UNIT_MAP.militia_neutral;
  const hp = Math.max(1, unitDef?.maxHp ?? 5);
  // Apply tech + governor bonuses (governor via provinceId fall-through in getEffectiveUnitStats)
  const factionId = province.ownerId !== 'neutral' ? province.ownerId : null;
  const fakeArmy = factionId
    ? { provinceId: province.id, heroId: province.governorId ?? undefined, units: [] }
    : null;
  const { attack: effectiveAtk, defense: effectiveDef } = factionId
    ? getEffectiveUnitStats(unitId, factionId, UNIT_MAP, fakeArmy)
    : { attack: unitDef?.attack ?? 0, defense: unitDef?.defense ?? 0 };
  return {
    unitId,
    unitDef,
    effectiveAtk,
    effectiveDef,
    hp: Array.from({ length: count }, () => hp),
    combatEffects: [],
  };
}

function _militiaCount(pool) {
  return pool?.hp?.length ?? 0;
}

function _makeMilitiaArmy(pool, province) {
  return {
    id: `_militia_${province.id}`,
    factionId: province.ownerId ?? 'neutral',
    heroId: province.governorId ?? null,
    provinceId: province.id,
    units: [{ typeId: pool.unitId, count: pool.hp.length }],
    hp: { active: { [pool.unitId]: pool.hp.slice() }, wounded: {} },
    combatEffects: [],
    statusEffects: [],
    _isMilitia: true,
  };
}

function _militiaDefense(pool) {
  const n = _militiaCount(pool);
  if (n <= 0 || !pool?.unitDef) return 0;
  return n * (pool.effectiveDef ?? pool.unitDef.defense ?? 0);
}

function _ensureHpPools(army) {
  army.hp = army.hp ?? { active: {}, wounded: {} };
  army.hp.active = army.hp.active ?? {};
  army.hp.wounded = army.hp.wounded ?? {};
}

function _planDefenderBorrow(primaryArmy, allDefArmies, unitMap, supplyCap) {
  const slotsLeft = Math.max(0, supplyCap - (armySize(primaryArmy) + armyWoundedCount(primaryArmy)));
  if (slotsLeft <= 0) return [];

  const candidates = [];
  for (const donor of allDefArmies) {
    if (donor.id === primaryArmy.id) continue;
    for (const stack of donor.units) {
      const unit = unitMap[stack.typeId];
      if (!unit || stack.count <= 0) continue;
      candidates.push({
        fromArmyId: donor.id,
        typeId: stack.typeId,
        available: stack.count,
        unitDefense: unit.defense,
      });
    }
  }

  candidates.sort((a, b) => b.unitDefense - a.unitDefense);

  const plan = [];
  let need = slotsLeft;
  for (const c of candidates) {
    if (need <= 0) break;
    const take = Math.min(c.available, need);
    plan.push({ fromArmyId: c.fromArmyId, typeId: c.typeId, count: take, moved: 0 });
    need -= take;
  }
  return plan;
}

function _applyBorrowedUnits(leadArmy, plan) {
  if (!leadArmy) return;
  for (const b of plan) {
    const donor = getArmy(b.fromArmyId);
    if (!donor) continue;
    const ok = transferActiveUnits(donor, leadArmy, b.typeId, b.count, UNIT_MAP);
    if (ok) b.moved = b.count;
  }
}

function _returnBorrowedUnits(leadArmy, plan) {
  if (!leadArmy) return;
  for (const b of plan) {
    if (!b.moved || b.moved <= 0) continue;
    const donor = getArmy(b.fromArmyId);
    if (!donor) continue;

    let remainingToReturn = b.moved;
    const availableActive = leadArmy.units.find(u => u.typeId === b.typeId)?.count ?? 0;
    if (availableActive > 0) {
      const giveBackActive = Math.min(availableActive, remainingToReturn);
      transferActiveUnits(leadArmy, donor, b.typeId, giveBackActive, UNIT_MAP);
      remainingToReturn -= giveBackActive;
    }

    if (remainingToReturn <= 0) continue;

    const availableWounded = leadArmy.wounded.find(u => u.typeId === b.typeId)?.count ?? 0;
    if (availableWounded <= 0) continue;

    const giveBackWounded = Math.min(availableWounded, remainingToReturn);
    transferWoundedUnits(leadArmy, donor, b.typeId, giveBackWounded, UNIT_MAP);
  }
}

function _estimateBorrowedStrengthBonus(primaryArmy, allDefArmies, unitMap, supplyCap) {
  if (!primaryArmy || !allDefArmies || allDefArmies.length <= 1) return 0;
  const plan = _planDefenderBorrow(primaryArmy, allDefArmies, unitMap, supplyCap);
  let bonus = 0;
  for (const b of plan) {
    const uDef = unitMap[b.typeId];
    if (!uDef || b.count <= 0) continue;
    bonus += b.count * ((uDef.attack ?? 0) + (uDef.defense ?? 0));
  }
  return bonus;
}

function _collectArmyUnits(army, factionId = null) {
  if (!army) return [];
  _ensureHpPools(army);
  const out = [];
  for (const [typeId, arr] of Object.entries(army.hp.active)) {
    const def = UNIT_MAP[typeId];
    if (!def) continue;
    const { attack, defense } = getEffectiveUnitStats(typeId, factionId, UNIT_MAP, army);
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] <= 0) continue;
      // combatEffects: applied by spell resolution, stripped after battle
      const effects = (army.combatEffects ?? []).filter(e => e.unitKey === `a:${typeId}:${i}`);
      const effAtkBonus   = effects.reduce((s, e) => e.stat === 'attack'  ? s + e.amount : s, 0);
      const effDefBonus   = effects.reduce((s, e) => e.stat === 'defense' ? s + e.amount : s, 0);
      const effMaxHpBonus = effects.reduce((s, e) => e.stat === 'maxHp'   ? s + e.amount : s, 0);
      out.push({
        key: `a:${typeId}:${i}`,
        pool: 'army',
        typeId,
        hp: arr[i],
        maxHp: Math.max(1, (def.maxHp ?? 10) + effMaxHpBonus),
        attack:  attack  + effAtkBonus,
        defense: defense + effDefBonus,
        unitType: def.unitType ?? null,
        traitIds: def.traitIds ?? [],
        tagIds: def.tagIds ?? [],
      });
    }
  }
  return out;
}

function _collectMilitiaUnits(pool) {
  const out = [];
  if (!pool || !pool.unitDef) return out;

  // Accumulate per-round stat modifiers from spell effects
  let atkBonus = 0, defBonus = 0;
  for (const eff of (pool.combatEffects ?? [])) {
    if (eff.stat === 'attack')  atkBonus += eff.amount;
    if (eff.stat === 'defense') defBonus += eff.amount;
  }

  for (let i = 0; i < (pool.hp?.length ?? 0); i++) {
    const hp = pool.hp[i];
    if (hp <= 0) continue;
    out.push({
      key: `m:${i}`,
      pool: 'militia',
      typeId: pool.unitId,
      hp,
      maxHp: Math.max(1, pool.unitDef.maxHp ?? 5),
      attack:  (pool.effectiveAtk ?? pool.unitDef.attack  ?? 0) + atkBonus,
      defense: (pool.effectiveDef ?? pool.unitDef.defense ?? 0) + defBonus,
      unitType: pool.unitDef.unitType ?? null,
      traitIds: [],
    });
  }
  return out;
}

function _effectiveAttack(unit, includeRoll = true) {
  const lowHp = unit.hp < Math.ceil(unit.maxHp * 0.5);
  const mult = lowHp ? 0.66 : 1;
  const base = (unit.attack ?? 0) * mult;
  return includeRoll ? (base + _d8()) : base;
}

function _damageAgainst(attacker, target, targetIsDefender, defenderFlatBonus, includeRandom, isFirstStrike = false) {
  let atk = _effectiveAttack(attacker, includeRandom);
  if ((attacker.traitIds ?? []).includes('anti_cavalry') && target.unitType === UNIT_TYPES.CAVALRY) {
    atk += 3;
  }
  let targetDef = (target.defense ?? 0) + (targetIsDefender ? defenderFlatBonus : 0);
  if (isFirstStrike && (target.traitIds ?? []).includes(TRAIT_IDS.SHIELD)) {
    targetDef += 3;
  }
  return Math.max(1, Math.round(atk - targetDef));
}

function _pickTarget(attacker, enemies, bestChance, targetIsDefender, defenderFlatBonus, isFirstStrike = false) {
  if (!enemies || enemies.length === 0) return null;
  const pickBest = Math.random() < bestChance;
  if (!pickBest) return enemies[Math.floor(Math.random() * enemies.length)];

  const sorted = [...enemies].sort((a, b) => {
    const da = _damageAgainst(attacker, a, targetIsDefender, defenderFlatBonus, false, isFirstStrike);
    const db = _damageAgainst(attacker, b, targetIsDefender, defenderFlatBonus, false, isFirstStrike);
    return db - da;
  });
  return sorted[0] ?? enemies[Math.floor(Math.random() * enemies.length)];
}

function _applyBatchDamageToArmy(army, damageMap, woundChance = WOUND_CHANCE) {
  if (!army) return { destroyed: 0, wounded: 0, hpLost: 0, pendingCasualties: [] };
  _ensureHpPools(army);

  let destroyed = 0;
  let wounded = 0;
  let hpLost = 0;
  const pendingCasualties = []; // typeIds of units not naturally wounded — eligible for post-combat resurrection

  const grouped = new Map();
  for (const [key, damage] of damageMap.entries()) {
    if (!key.startsWith('a:')) continue;
    const [, typeId, idxStr] = key.split(':');
    const idx = Number(idxStr);
    if (!grouped.has(typeId)) grouped.set(typeId, []);
    grouped.get(typeId).push({ idx, damage: Math.max(0, Math.round(damage)) });
  }

  for (const [typeId, hits] of grouped.entries()) {
    const arr = army.hp.active[typeId] ?? [];
    const maxHp = Math.max(1, UNIT_MAP[typeId]?.maxHp ?? 10);
    hits.sort((a, b) => b.idx - a.idx);
    for (const hit of hits) {
      if (hit.idx < 0 || hit.idx >= arr.length) continue;
      const before = arr[hit.idx];
      const after = before - hit.damage;
      hpLost += Math.max(0, Math.min(before, hit.damage));
      if (after <= 0) {
        arr.splice(hit.idx, 1);
        destroyed++;
        if (Math.random() < woundChance) {
          army.hp.wounded[typeId] = army.hp.wounded[typeId] ?? [];
          army.hp.wounded[typeId].push(Math.max(1, Math.round(maxHp * 0.15)));
          wounded++;
        } else {
          pendingCasualties.push(typeId);
        }
      } else {
        arr[hit.idx] = after;
      }
    }

    if (arr.length === 0) delete army.hp.active[typeId];
  }

  for (const [typeId, arr] of Object.entries(army.hp.wounded)) {
    if (!arr || arr.length === 0) delete army.hp.wounded[typeId];
  }

  recalcArmyMoves(army, UNIT_MAP);
  return { destroyed, wounded, hpLost, pendingCasualties };
}

function _applyBatchDamageToMilitia(pool, damageMap) {
  if (!pool || !Array.isArray(pool.hp)) return { destroyed: 0, hpLost: 0 };
  let destroyed = 0;
  let hpLost = 0;

  const hits = [];
  for (const [key, damage] of damageMap.entries()) {
    if (!key.startsWith('m:')) continue;
    const [, idxStr] = key.split(':');
    hits.push({ idx: Number(idxStr), damage: Math.max(0, Math.round(damage)) });
  }

  hits.sort((a, b) => b.idx - a.idx);
  for (const hit of hits) {
    if (hit.idx < 0 || hit.idx >= pool.hp.length) continue;
    const before = pool.hp[hit.idx];
    const after = before - hit.damage;
    hpLost += Math.max(0, Math.min(before, hit.damage));
    if (after <= 0) {
      pool.hp.splice(hit.idx, 1);
      destroyed++;
    } else {
      pool.hp[hit.idx] = after;
    }
  }

  return { destroyed, hpLost };
}

function _sumDamage(map) {
  let sum = 0;
  for (const v of map.values()) sum += Math.max(0, Math.round(v));
  return sum;
}

function _phaseNarrative(roundNum, attTac, defTac, attDmg, defDmg, attDestroyed, defDestroyed) {
  let tone;
  if (attDmg > defDmg * 1.3) tone = 'Attackers gain clear momentum.';
  else if (defDmg > attDmg * 1.3) tone = 'Defenders seize the initiative.';
  else tone = 'Both sides trade heavy blows.';

  return `Round ${roundNum}: Tactics ${attTac} vs ${defTac}. Attackers dealt ${attDmg} damage (${defDestroyed} enemy destroyed), defenders dealt ${defDmg} damage (${attDestroyed} attacker destroyed). ${tone}`;
}

function _ensureMinNarrative(rounds, outcome, provinceName) {
  const out = [...rounds];
  if (out.length >= 2) return out;

  if (outcome === 'attacker') {
    while (out.length < 2) out.push(`Attackers consolidate control around ${provinceName}.`);
  } else if (outcome === 'defender') {
    while (out.length < 2) out.push(`Defenders secure ${provinceName} after repelling the assault.`);
  } else {
    while (out.length < 2) out.push(`Both forces disengage around ${provinceName} without a decisive result.`);
  }
  return out;
}

function _buildCombatNarrative(rounds) {
  return rounds.map((text, idx) => ({ round: idx + 1, text }));
}

// Hero spells during the first strike pre-round. Uses round-1 spell slot but filters by reach.
function _resolveHeroSpellsFirstStrike(attArmy, defArmy, militiaPool, attUnits, defUnits) {
  const attResult = _castHeroCombatSpells(attArmy, defArmy, militiaPool, attUnits, defUnits, 1, true);
  const defResult = _castHeroCombatSpells(defArmy, attArmy, null,        defUnits, attUnits, 1, true);
  return {
    lines:         [...attResult.lines, ...defResult.lines],
    attCasualties: attResult.casualties,
    defCasualties: defResult.casualties,
  };
}

// Pre-combat first strike round.
// Returns null when skipped (no eligible units, or none pass the roll).
function _resolveFirstStrikeRound(attArmy, defArmy, militiaPool, province, defenderFlatBonus, seaPenalty) {
  const attUnits = _collectArmyUnits(attArmy, attArmy.factionId);
  const defUnits = [
    ..._collectArmyUnits(defArmy, defArmy?.factionId ?? null),
    ...(defArmy?._isMilitia ? [] : _collectMilitiaUnits(militiaPool)),
  ];

  const attEligible = attUnits.filter(u => (u.traitIds ?? []).includes(TRAIT_IDS.FIRST_STRIKE));
  const defEligible = defUnits.filter(u => (u.traitIds ?? []).includes(TRAIT_IDS.FIRST_STRIKE));
  if (attEligible.length === 0 && defEligible.length === 0) return null;

  const attTac = _d6() + _getHeroTacticsBonus(attArmy);
  const defTac = _d6() + _getHeroTacticsBonus(defArmy);
  const tacAdv = attTac - defTac;

  const attStrikers = attEligible.filter(unit => Math.random() < _calcFirstStrikeChance(attArmy, province, false, tacAdv, unit));
  const defStrikers = defEligible.filter(unit => Math.random() < _calcFirstStrikeChance(defArmy, province, true,  tacAdv, unit));

  // Silently skip if nobody passed their roll.
  if (attStrikers.length === 0 && defStrikers.length === 0) return null;

  const attStatusWound = (attArmy.statusEffects ?? []).reduce((s, e) => s + (e.woundChanceBonus ?? 0), 0);
  const defStatusWound = defArmy ? (defArmy.statusEffects ?? []).reduce((s, e) => s + (e.woundChanceBonus ?? 0), 0) : 0;
  const attWoundChance = Math.min(0.95, WOUND_CHANCE + (getFaction(attArmy.factionId)?.woundChanceBonus ?? 0) + getHeroWoundChanceBonus(attArmy) + attStatusWound);
  const defWoundChance = defArmy ? Math.min(0.95, WOUND_CHANCE + (getFaction(defArmy.factionId)?.woundChanceBonus ?? 0) + getHeroWoundChanceBonus(defArmy) + defStatusWound) : WOUND_CHANCE;

  const spellResult = _resolveHeroSpellsFirstStrike(attArmy, defArmy, militiaPool, attUnits, defUnits);

  const damageToDef = new Map();
  const damageToAtt = new Map();

  for (const unit of attStrikers) {
    const target = _pickTarget(unit, defUnits, 0.5, true, defenderFlatBonus, true);
    if (!target) continue;
    const dmg = Math.round(_damageAgainst(unit, target, true, defenderFlatBonus, true, true) * seaPenalty);
    damageToDef.set(target.key, (damageToDef.get(target.key) ?? 0) + dmg);
  }
  for (const unit of defStrikers) {
    const target = _pickTarget(unit, attUnits, 0.5, false, 0, true);
    if (!target) continue;
    const dmg = _damageAgainst(unit, target, false, 0, true, true);
    damageToAtt.set(target.key, (damageToAtt.get(target.key) ?? 0) + dmg);
  }

  const attApply      = _applyBatchDamageToArmy(attArmy, damageToAtt, attWoundChance);
  const defArmyApply  = _applyBatchDamageToArmy(defArmy, damageToDef, defWoundChance);
  const defMilApply   = defArmy?._isMilitia ? { destroyed: 0 } : _applyBatchDamageToMilitia(militiaPool, damageToDef);
  const defDestroyed  = defArmyApply.destroyed + defMilApply.destroyed;

  const lines = [
    ...spellResult.lines,
    `First Strike: Tactics ${attTac} vs ${defTac}. ` +
    `${attStrikers.length} archer(s) in attacking force and ${defStrikers.length} in defending force opened fire early.` +
    (defDestroyed > 0 || attApply.destroyed > 0
      ? ` ${attApply.destroyed} attacker(s) and ${defDestroyed} defender(s) felled.`
      : ''),
  ];

  return {
    lines,
    attPendingCasualties: [...spellResult.attCasualties, ...(attApply.pendingCasualties ?? [])],
    defPendingCasualties: [...spellResult.defCasualties, ...(defArmyApply.pendingCasualties ?? [])],
  };
}

function _resolveHeroSpells(attackers, defenders, attArmy, defArmy, militiaPool, roundNum) {
  const attResult = _castHeroCombatSpells(attArmy, defArmy, militiaPool, attackers, defenders, roundNum);
  const defResult = _castHeroCombatSpells(defArmy, attArmy, null,        defenders, attackers, roundNum);
  return {
    lines:         [...attResult.lines, ...defResult.lines],
    attCasualties: attResult.casualties,
    defCasualties: defResult.casualties,
  };
}

/** Returns true if the target army or militia pool already has a combatEffect from the given spell on the given unit. */
function _hasSpellEffect(targetArmy, spellId, unitKey, militiaPool = null) {
  const inArmy    = (targetArmy?.combatEffects    ?? []).some(e => e.sourceId === spellId && e.unitKey === unitKey);
  const inMilitia = (militiaPool?.combatEffects ?? []).some(e => e.sourceId === spellId && e.unitKey === unitKey);
  return inArmy || inMilitia;
}

/** Picks up to n unique items randomly from pool. */
function _pickNRandom(pool, n) {
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

// isFirstStrikeRound: when true, only buffs/heals and reach:true spells may fire.
// If a spell fires in the first strike round, entry._usedEarly is set so it doesn't repeat in round 1.
function _castHeroCombatSpells(army, enemyArmy, enemyMilitia, ownUnits, enemyUnits, roundNum, isFirstStrikeRound = false) {
  const empty = { lines: [], casualties: [] };
  if (!army?.heroId) return empty;
  const fs = getFaction(army.factionId);
  const hero = fs?.heroes?.find(h => h.id === army.heroId);
  if (!hero || !isHeroActive(hero)) return empty;

  const entry = hero.combatSpellQueue?.[roundNum - 1];
  if (!entry) return empty;
  if (entry._usedEarly) return empty;

  const ownPower   = ownUnits.reduce((s, u)  => s + u.attack + u.defense, 0);
  const enemyPower = enemyUnits.reduce((s, u) => s + u.attack + u.defense, 0);
  if (entry.condition === 'if_not_weaker' && ownPower < enemyPower * 0.5) return empty;

  const spell = SPELL_MAP[entry.spellId];
  if (!spell || spell.type !== 'combat') return empty;
  if (hero.mana < spell.manaCost) return empty;

  const spellpower = getHeroSpellpower(hero);
  const schoolTier = getHeroSchoolTier(hero, spell.schoolId);
  const rawEff     = spell.effects[schoolTier];
  const subEffects = Array.isArray(rawEff) ? rawEff : [rawEff];

  // First strike range restriction: only buffs/heals or spells with reach:true may fire.
  if (isFirstStrikeRound) {
    const firstSub = subEffects[0];
    const validForFirstStrike = firstSub?.effectType === 'buff' || firstSub?.effectType === 'heal'
                              || spell.reach === true;
    if (!validForFirstStrike) return empty;
    entry._usedEarly = true;
  }

  hero.mana = Math.max(0, hero.mana - spell.manaCost);
  const scaled     = (v) => Math.floor(v * (1 + spellpower * 0.05));

  const lines = [];
  const casualties = [];

  for (const subEff of subEffects) {
    const effectType = subEff.effectType ?? 'damage';
    const targetType = subEff.targetType ?? spell.targetType;
    const isEnemy    = targetType.includes('enemy');
    const chains     = subEff.chains ?? 1;
    const pool       = isEnemy ? enemyUnits : ownUnits;

    // ── Resolve targets ────────────────────────────────────
    let targets = [];

    if (targetType === 'all_enemies' || targetType === 'all_allies') {
      targets = pool.filter(u => u.hp > 0);

    } else if (targetType === 'lowest_hp_ally') {
      const targetArmy = army;
      let candidates = ownUnits.filter(u => u.hp > 0);
      if (subEff.canRevive && targetArmy.hp?.wounded) {
        for (const [typeId, wArr] of Object.entries(targetArmy.hp.wounded)) {
          for (let i = 0; i < (wArr?.length ?? 0); i++) {
            if ((wArr[i] ?? 0) > 0) {
              candidates.push({ key: `w:${typeId}:${i}`, pool: 'wounded', typeId, hp: wArr[i] });
            }
          }
        }
      }
      candidates = candidates.filter(u => !_hasSpellEffect(targetArmy, spell.id, u.key));
      candidates.sort((a, b) => a.hp - b.hp);
      targets = candidates.slice(0, chains);

    } else {
      // random_enemy or random_ally
      const targetArmyRef = isEnemy ? enemyArmy : army;
      const eligible = pool.filter(u => {
        if (u.hp <= 0) return false;
        if (effectType === 'buff' || effectType === 'debuff') {
          return !_hasSpellEffect(targetArmyRef, spell.id, u.key);
        }
        return true;
      });
      // Re-read from real HP pools for more accurate live pool
      const liveAlive = [];
      if (targetArmyRef) {
        for (const [typeId, arr] of Object.entries(targetArmyRef.hp?.active ?? {})) {
          for (let i = 0; i < arr.length; i++) {
            if (arr[i] <= 0) continue;
            if (effectType === 'buff' || effectType === 'debuff') {
              if (_hasSpellEffect(targetArmyRef, spell.id, `a:${typeId}:${i}`)) continue;
            }
            liveAlive.push({ key: `a:${typeId}:${i}`, pool: 'army', typeId, hp: arr[i] });
          }
        }
      }
      if (isEnemy && enemyMilitia && !enemyArmy?._isMilitia) {
        for (let i = 0; i < (enemyMilitia.hp?.length ?? 0); i++) {
          if (enemyMilitia.hp[i] > 0) liveAlive.push({ key: `m:${i}`, pool: 'militia', typeId: enemyMilitia.unitId, hp: enemyMilitia.hp[i] });
        }
      }
      targets = _pickNRandom(liveAlive, chains);
    }

    if (targets.length === 0) continue;

    // ── Apply effect ───────────────────────────────────────
    if (effectType === 'damage') {
      const scaledBase  = scaled(subEff.baseDamage ?? 0);
      const targetArmy  = isEnemy ? enemyArmy : army;
      const targetMilia = isEnemy ? enemyMilitia : null;
      const armyDmgMap    = new Map();
      const militiaDmgMap = new Map();

      for (const t of targets) {
        const variance = 0.8 + Math.random() * 0.4;
        const unitDef  = UNIT_MAP[t.typeId]?.defense ?? 0;
        const finalDmg = Math.max(1, Math.floor(scaledBase * variance) - unitDef);
        if (t.pool === 'army')    armyDmgMap.set(t.key, finalDmg);
        else if (t.pool === 'militia') militiaDmgMap.set(t.key, finalDmg);
      }

      let hpLost = 0, destroyed = 0;
      if (targetArmy && armyDmgMap.size > 0) {
        const r = _applyBatchDamageToArmy(targetArmy, armyDmgMap, WOUND_CHANCE);
        hpLost += r.hpLost; destroyed += r.destroyed;
        casualties.push(...r.pendingCasualties);
      }
      if (targetMilia && militiaDmgMap.size > 0) {
        const r = _applyBatchDamageToMilitia(targetMilia, militiaDmgMap);
        hpLost += r.hpLost; destroyed += r.destroyed;
      }

      const tLabel  = targets.length === 1 ? (UNIT_MAP[targets[0].typeId]?.name ?? 'enemy unit') : (isEnemy ? 'enemy forces' : 'allied forces');
      const killStr = destroyed > 0 ? ` ${destroyed} unit${destroyed > 1 ? 's' : ''} destroyed!` : '';
      lines.push(`${hero.name} casts '${spell.name}', dealing ${hpLost} damage to ${tLabel}!${killStr}`);

    } else if (effectType === 'buff' || effectType === 'debuff') {
      const targetArmyRef = isEnemy ? enemyArmy : army;

      if (subEff.stats) {
        for (const { stat, amount } of subEff.stats) {
          const scaledAmt = scaled(amount);
          for (const t of targets) {
            if (t.pool === 'army' && targetArmyRef) {
              targetArmyRef.combatEffects = targetArmyRef.combatEffects ?? [];
              targetArmyRef.combatEffects.push({ unitKey: t.key, stat, amount: scaledAmt, sourceId: spell.id });
            } else if (t.pool === 'militia' && enemyMilitia) {
              enemyMilitia.combatEffects.push({ unitKey: t.key, stat, amount: scaledAmt, sourceId: spell.id });
            }
          }
        }
        const statList = subEff.stats.map(s => `${scaled(s.amount) >= 0 ? '+' : ''}${scaled(s.amount)} ${s.stat}`).join(', ');
        lines.push(`${hero.name} casts '${spell.name}' on ${targets.length} unit(s) (${statList}).`);
      } else {
        const stat = subEff.stat;
        const amt  = scaled(subEff.amount ?? 0);
        for (const t of targets) {
          if (t.pool === 'army' && targetArmyRef) {
            targetArmyRef.combatEffects = targetArmyRef.combatEffects ?? [];
            if (stat === 'maxHp') {
              const parts = t.key.split(':');
              const tId = parts[1], tIdx = Number(parts[2]);
              if (targetArmyRef.hp?.active?.[tId]?.[tIdx] != null) {
                targetArmyRef.hp.active[tId][tIdx] += amt;
              }
            }
            targetArmyRef.combatEffects.push({ unitKey: t.key, stat, amount: amt, sourceId: spell.id });
          } else if (t.pool === 'militia' && enemyMilitia) {
            // maxHp buff has no meaning on militia (fixed-HP pool), only atk/def apply
            if (stat !== 'maxHp') {
              enemyMilitia.combatEffects.push({ unitKey: t.key, stat, amount: amt, sourceId: spell.id });
            }
          }
        }
        const sign = (subEff.amount ?? 0) >= 0 ? '+' : '';
        lines.push(`${hero.name} casts '${spell.name}' on ${targets.length} unit(s) (${sign}${amt} ${stat}).`);
      }

    } else if (effectType === 'heal') {
      const healAmt = scaled(subEff.amount ?? 0);
      let revived = 0;
      for (const t of targets) {
        if (t.pool === 'wounded') {
          // Revive unit from wounded pool back to active
          const parts = t.key.split(':'); // w:typeId:idx
          const tId = parts[1], tIdx = Number(parts[2]);
          const maxHp = UNIT_MAP[tId]?.maxHp ?? 10;
          const newHp = Math.min(maxHp, (army.hp.wounded[tId]?.[tIdx] ?? 0) + healAmt);
          army.hp.active[tId] = army.hp.active[tId] ?? [];
          army.hp.active[tId].push(newHp);
          if (army.hp.wounded[tId]) army.hp.wounded[tId][tIdx] = 0;
          revived++;
        } else if (t.pool === 'army') {
          const parts = t.key.split(':');
          const tId = parts[1], tIdx = Number(parts[2]);
          const maxHp = UNIT_MAP[tId]?.maxHp ?? 10;
          if (army.hp.active[tId]?.[tIdx] != null) {
            army.hp.active[tId][tIdx] = Math.min(maxHp, army.hp.active[tId][tIdx] + healAmt);
          }
        }
      }
      const revStr = revived > 0 ? ` ${revived} unit(s) revived!` : '';
      lines.push(`${hero.name} casts '${spell.name}', restoring ${healAmt} HP to ${targets.length} unit(s).${revStr}`);
    }
  }

  return { lines, casualties };
}

function _heroXpForCombat(winnerHero, loserHero, enemyArmy, ownArmy) {
  // Approximate enemy power: (atk + def) × count per unit type
  const power = (enemyArmy?.units ?? []).reduce((sum, { typeId, count }) => {
    const u = UNIT_MAP[typeId];
    return sum + ((u?.attack ?? 0) + (u?.defense ?? 0)) * count;
  }, 0);
  if (winnerHero && isHeroActive(winnerHero)) {
    addHeroExperience(winnerHero, 20 + Math.floor(power / 10));
  }
  if (loserHero && isHeroActive(loserHero)) {
    addHeroExperience(loserHero, 5);
  }
}

function _woundHeroOnArmyDestroyed(army, factionId) {
  if (!army?.heroId) return;
  const turnsWounded = 2 + Math.floor(Math.random() * 3);
  woundHero(army.heroId, factionId, turnsWounded);
  emit(GAME_EVENTS.HERO_WOUNDED, { factionId, heroId: army.heroId });
}

function _lootEnemyHeroArtifacts(enemyArmy, winnerFactionId) {
  if (!enemyArmy?.heroId) return;
  const enemyFactionId = enemyArmy.factionId;
  const enemyFs = getFaction(enemyFactionId);
  if (!enemyFs) return;
  const hero = enemyFs.heroes?.find(h => h.id === enemyArmy.heroId);
  if (!hero) return;

  const winnerFs = getFaction(winnerFactionId);
  if (!winnerFs) return;

  for (const [slot, instanceId] of Object.entries(hero.artifacts)) {
    if (!instanceId) continue;
    if (Math.random() < 0.2) {
      hero.artifacts[slot] = null;
      winnerFs.artifacts = winnerFs.artifacts ?? [];
      winnerFs.artifacts.push({ instanceId, artifactId: instanceId });
      emit(GAME_EVENTS.ARTIFACT_ACQUIRED, { factionId: winnerFactionId, instanceId });
    }
  }
}

export function resolveCombat(attackerArmyId, targetProvinceId) {
  const attArmy = getArmy(attackerArmyId);
  const targetP = getProvince(targetProvinceId);
  if (!attArmy || !targetP) return null;

  // Moving into your own province — just relocate, never fight your own militia
  if (targetP.ownerId === attArmy.factionId) {
    moveArmy(attackerArmyId, targetProvinceId);
    return null;
  }

  const isEnemyProvince = targetP.ownerId !== attArmy.factionId && targetP.ownerId !== 'neutral';
  const enemyArmies = getArmiesInProvince(targetProvinceId)
    .filter(a => a.id !== attackerArmyId && a.factionId !== attArmy.factionId);
  let enemyDefArmy = _pickBestDefenderArmy(enemyArmies);

  let borrowedPlan = [];
  if (enemyDefArmy && enemyArmies.length > 1) {
    borrowedPlan = _planDefenderBorrow(
      enemyDefArmy,
      enemyArmies,
      UNIT_MAP,
      getArmySupplyCap(enemyDefArmy.factionId),
    );
    _applyBorrowedUnits(enemyDefArmy, borrowedPlan);
  }

  const militiaPool = _militiaPoolForProvince(targetP);
  const hasMilitia = _militiaCount(militiaPool) > 0;

  // When there's no real defending army, synthesise one from militia so spell effects work normally.
  if (!enemyDefArmy && hasMilitia) {
    enemyDefArmy = _makeMilitiaArmy(militiaPool, targetP);
    // Keep militiaPool.hp pointing at the same array so casualty write-back still works.
    militiaPool.hp = enemyDefArmy.hp.active[militiaPool.unitId];
  }

  // Snapshot AFTER borrow merge (and militia army creation) so all participants are captured.
  const defSnapActive  = enemyDefArmy ? _snapshotCounts(enemyDefArmy.hp.active)       : {};
  const defSnapWounded = enemyDefArmy ? _snapshotCounts(enemyDefArmy.hp.wounded ?? {}) : {};

  if (!isEnemyProvince && !enemyDefArmy && !hasMilitia) {
    moveArmy(attackerArmyId, targetProvinceId);
    if (targetP.ownerId === 'neutral') {
      captureProvince(targetProvinceId, attArmy.factionId);
      const attFaction = FACTION_MAP[attArmy.factionId];
      if (playerCanSee(targetProvinceId)) 
      {
        logCapture(attFaction?.name ?? attArmy.factionId, targetP.name);
        flashConquest(targetProvinceId);
      }
    }
    return null;
  }

  flashCombat(targetProvinceId);

  const biome = getBiome(targetP.biomeId);
  const terrainMod = 1 + (biome?.terrainDefBonus ?? 0);
  const fortBonus = targetP.locations.reduce((sum, loc) => sum + getLocationDefenseBonus(loc, BUILDING_MAP), 0);
  // Province status defense bonuses
  let statusDefensePercent = 0;
  for (const se of (targetP.statusEffects ?? [])) {
    const def = PROVINCE_STATUS_MAP[se.type];
    const effectsList = def?.effects ?? se.effects ?? [];
    for (const eff of effectsList) {
      if (eff.type === EFFECT_TYPES.FORTIFICATION_BONUS) statusDefensePercent += (eff.amount ?? 0) * (se.stacks ?? 1);
    }
  }
  // Governor Stalwart defense bonus
  if (targetP.governorId && targetP.ownerId !== 'neutral') {
    const defFactionState = getFaction(targetP.ownerId);
    const governor = defFactionState?.heroes?.find(h => h.id === targetP.governorId);
    if (governor && isHeroActive(governor)) {
      statusDefensePercent += getHeroProvinceBonuses(governor).defensePercent ?? 0;
    }
  }
  const statusDefMult = 1 + statusDefensePercent / 100;
  // Siege reduction: unit siege traits (count-based) + hero siege skills
  let totalSiegePct = 0;
  for (const { typeId, count } of (attArmy.units ?? [])) {
    for (const traitId of (UNIT_MAP[typeId]?.traitIds ?? [])) {
      for (const eff of (TRAIT_MAP[traitId]?.effects ?? [])) {
        if (eff.scope === EFFECT_SCOPES.UNIT && eff.type === EFFECT_TYPES.FORTIFICATION_BONUS && (eff.amount ?? 0) < 0)
          totalSiegePct += Math.abs(eff.amount) * count;
      }
    }
  }
  totalSiegePct += getHeroFortificationReduction(attArmy);
  const siegeReduction = Math.max(0, 1 - totalSiegePct / 100);
  const defenderFlatBonus = Math.max(0, Math.round(((biome?.terrainDefBonus ?? 0) * 10 + fortBonus * 12) * siegeReduction * statusDefMult));

  // Sea attack penalty: -20% when attacking FROM shallow ocean
  const attackerOriginProv = getProvince(attArmy.provinceId);
  const isSeaAttack = !!(attackerOriginProv?.isOcean && attackerOriginProv?.oceanType === 'shallow');
  const seaPenalty  = isSeaAttack ? 0.8 : 1.0;

  const attackerStrengthPre = Math.round(getEffectiveArmyAttack(attArmy, attArmy.factionId, UNIT_MAP) * seaPenalty);
  const defenderArmyDefensePre = enemyDefArmy ? getEffectiveArmyDefense(enemyDefArmy, enemyDefArmy.factionId, UNIT_MAP) : 0;
  const defenderMilitiaDefensePre = enemyDefArmy?._isMilitia ? 0 : _militiaDefense(militiaPool);
  const defenderStrengthPre = Math.round((defenderArmyDefensePre + defenderMilitiaDefensePre) * terrainMod + fortBonus * 10);

  // Init combat effect buffers
  attArmy.combatEffects = [];
  if (enemyDefArmy) enemyDefArmy.combatEffects = [];

  markArmyAttacked(attArmy);
  if (enemyDefArmy) markArmyAttacked(enemyDefArmy);

  const attFaction = FACTION_MAP[attArmy.factionId];
  const defFaction = targetP.ownerId !== 'neutral' ? FACTION_MAP[targetP.ownerId] : null;

  const attSizeBefore = armySize(attArmy);
  const defSizeBefore = (enemyDefArmy ? armySize(enemyDefArmy) : 0) + (enemyDefArmy?._isMilitia ? 0 : _militiaCount(militiaPool));

  const attSnapActive   = _snapshotCounts(attArmy.hp.active);
  const attSnapWounded  = _snapshotCounts(attArmy.hp.wounded ?? {});
  const militiaSnapCount = _militiaCount(militiaPool);
  const militiaUnitId   = militiaPool?.unitId ?? null;

  const rounds = [];
  let outcome = 'inconclusive';
  const attPendingCasualties = [];
  const defPendingCasualties = [];

  // First Strike pre-round (silently skipped when no archers or all rolls fail)
  const fsResult = _resolveFirstStrikeRound(attArmy, enemyDefArmy, militiaPool, targetP, defenderFlatBonus, seaPenalty);
  if (fsResult) {
    for (const line of fsResult.lines) rounds.push(line);
    attPendingCasualties.push(...fsResult.attPendingCasualties);
    defPendingCasualties.push(...fsResult.defPendingCasualties);
    const attAliveAfterFS = armySize(attArmy);
    const defAliveAfterFS = (enemyDefArmy ? armySize(enemyDefArmy) : 0) + (enemyDefArmy?._isMilitia ? 0 : _militiaCount(militiaPool));
    if (attAliveAfterFS <= 0) outcome = 'defender';
    else if (defAliveAfterFS <= 0) outcome = 'attacker';
  }

  const totalRounds = 2 + ((attArmy.maxMoves ?? 1) === 2 ? 1 : 0);

  for (let roundNum = 1; roundNum <= totalRounds && outcome === 'inconclusive'; roundNum++) {
    const attackers = _collectArmyUnits(attArmy, attArmy.factionId);
    const defenders = [
      ..._collectArmyUnits(enemyDefArmy, enemyDefArmy?.factionId ?? null),
      ...(enemyDefArmy?._isMilitia ? [] : _collectMilitiaUnits(militiaPool)),
    ];

    // Spell resolution fires before unit attacks; narrative lines prepend the round
    const spellResult = _resolveHeroSpells(attackers, defenders, attArmy, enemyDefArmy, militiaPool, roundNum);
    for (const line of spellResult.lines) rounds.push(line);
    attPendingCasualties.push(...spellResult.attCasualties);
    defPendingCasualties.push(...spellResult.defCasualties);

    if (attackers.length === 0) {
      outcome = 'defender';
      rounds.push(`Round ${roundNum}: Attacking force collapses and can no longer fight.`);
      break;
    }
    if (defenders.length === 0) {
      outcome = 'attacker';
      rounds.push(`Round ${roundNum}: Defending force is shattered.`);
      break;
    }

    const attTac = _d6() + _getHeroTacticsBonus(attArmy);
    const defTac = _d6() + _getHeroTacticsBonus(enemyDefArmy);
    const diff = attTac - defTac;
    const attBestChance = _clamp(0.5 + diff * 0.1, 0, 1);
    const defBestChance = _clamp(0.5 - diff * 0.1, 0, 1);

    const damageToDef = new Map();
    const damageToAtt = new Map();

    for (const unit of attackers) {
      const target = _pickTarget(unit, defenders, attBestChance, true, defenderFlatBonus);
      if (!target) continue;
      const dmg = Math.round(_damageAgainst(unit, target, true, defenderFlatBonus, true) * seaPenalty);
      damageToDef.set(target.key, (damageToDef.get(target.key) ?? 0) + dmg);
    }

    for (const unit of defenders) {
      const target = _pickTarget(unit, attackers, defBestChance, false, defenderFlatBonus);
      if (!target) continue;
      const dmg = _damageAgainst(unit, target, false, defenderFlatBonus, true);
      damageToAtt.set(target.key, (damageToAtt.get(target.key) ?? 0) + dmg);
    }

    const attDamage = _sumDamage(damageToDef);
    const defDamage = _sumDamage(damageToAtt);

    const attStatusWound = (attArmy.statusEffects ?? []).reduce((s, e) => s + (e.woundChanceBonus ?? 0), 0);
    const defStatusWound = enemyDefArmy ? (enemyDefArmy.statusEffects ?? []).reduce((s, e) => s + (e.woundChanceBonus ?? 0), 0) : 0;
    const attWoundChance = Math.min(0.95, WOUND_CHANCE + (getFaction(attArmy.factionId)?.woundChanceBonus ?? 0) + getHeroWoundChanceBonus(attArmy) + attStatusWound);
    const defWoundChance = enemyDefArmy ? Math.min(0.95, WOUND_CHANCE + (getFaction(enemyDefArmy.factionId)?.woundChanceBonus ?? 0) + getHeroWoundChanceBonus(enemyDefArmy) + defStatusWound) : WOUND_CHANCE;
    const attApply = _applyBatchDamageToArmy(attArmy, damageToAtt, attWoundChance);
    attPendingCasualties.push(...attApply.pendingCasualties);
    const defArmyApply = _applyBatchDamageToArmy(enemyDefArmy, damageToDef, defWoundChance);
    defPendingCasualties.push(...(defArmyApply.pendingCasualties ?? []));
    const defMilitiaApply = enemyDefArmy?._isMilitia ? { destroyed: 0 } : _applyBatchDamageToMilitia(militiaPool, damageToDef);

    const attDestroyed = attApply.destroyed;
    const defDestroyed = defArmyApply.destroyed + defMilitiaApply.destroyed;

    rounds.push(_phaseNarrative(
      roundNum,
      attTac,
      defTac,
      attDamage,
      defDamage,
      attDestroyed,
      defDestroyed,
    ));

    const attAlive = armySize(attArmy);
    const defAlive = (enemyDefArmy ? armySize(enemyDefArmy) : 0) + (enemyDefArmy?._isMilitia ? 0 : _militiaCount(militiaPool));

    if (attAlive <= 0) {
      outcome = 'defender';
      rounds.push(`Round ${roundNum}: Attacking army is destroyed.`);
      break;
    }
    if (defAlive <= 0) {
      outcome = 'attacker';
      rounds.push(`Round ${roundNum}: Defending force is destroyed.`);
      break;
    }
  }

  // Strip combat effects: cap HP to base maxHp first (maxHp buffs may have let units absorb extra damage)
  for (const army of [attArmy, enemyDefArmy]) {
    if (!army) continue;
    for (const [typeId, arr] of Object.entries(army.hp?.active ?? {})) {
      const baseMax = UNIT_MAP[typeId]?.maxHp ?? 10;
      for (let i = 0; i < arr.length; i++) arr[i] = Math.min(arr[i], baseMax);
    }
    army.combatEffects = [];
  }

  // Emit post-combat casualties and apply any faction resurrections.
  // Attacker always gets the chance. Defender only if they're not about to be captured
  // (if the province will be taken and their army is gone, resurrecting costs souls for nothing).
  _emitArmyCasualties(attArmy, attPendingCasualties, targetP, 'attacker', outcome);
  _emitArmyCasualties(enemyDefArmy, defPendingCasualties, targetP, 'defender', outcome);

  // Build unit card lists BEFORE returning borrowed units so all participants are captured.
  // Resurrections from _emitArmyCasualties have already been applied (wounded pool is final).
  const attUnitCards = _buildUnitCardList(
    attSnapActive, attSnapWounded, attArmy.hp.active, attArmy.hp.wounded ?? {}
  );
  const defUnitCards = enemyDefArmy
    ? _buildUnitCardList(defSnapActive, defSnapWounded, enemyDefArmy.hp.active, enemyDefArmy.hp.wounded ?? {})
    : [];
  const militiaCards = [];
  if (!enemyDefArmy?._isMilitia && militiaUnitId && militiaSnapCount > 0) {
    const survivingMilitia = _militiaCount(militiaPool);
    const killedMilitia    = Math.max(0, militiaSnapCount - survivingMilitia);
    for (let i = 0; i < survivingMilitia; i++) militiaCards.push({ typeId: militiaUnitId, status: 'alive'  });
    for (let i = 0; i < killedMilitia;    i++) militiaCards.push({ typeId: militiaUnitId, status: 'killed' });
  }

  // Return borrowed units after resurrections — resurrected borrowed units (now wounded)
  // are correctly routed back to their donor armies by transferWoundedUnits.
  if (borrowedPlan.length > 0 && outcome !== 'attacker') {
    _returnBorrowedUnits(enemyDefArmy, borrowedPlan);
  }

  if (targetP.militia) {
    targetP.militia.current = _militiaCount(militiaPool);
    targetP.militia.lastCombatTurn = state.turn;
  }

  // Flag province so militia regen is blocked for this turn
  if (!targetP.statusEffects) targetP.statusEffects = [];
  if (!targetP.statusEffects.some(se => se.type === 'recently_fought')) {
    targetP.statusEffects.push({ type: 'recently_fought', turnsRemaining: 1 });
  }

  const attSizeAfter = armySize(attArmy);
  const defSizeAfter = (enemyDefArmy ? armySize(enemyDefArmy) : 0) + (enemyDefArmy?._isMilitia ? 0 : _militiaCount(militiaPool));
  const attLostTotal = Math.max(0, attSizeBefore - attSizeAfter);
  const defLostTotal = Math.max(0, defSizeBefore - defSizeAfter);

  if (enemyDefArmy && !enemyDefArmy._isMilitia && armySize(enemyDefArmy) <= 0) removeArmy(enemyDefArmy.id);
  if (armySize(attArmy) <= 0) removeArmy(attArmy.id);

  let summary = '';
  if (outcome === 'attacker') {
    summary = `⚔ ${attFaction?.name ?? 'Attacker'} defeats defenders at ${targetP.name}.`;
  } else if (outcome === 'defender') {
    summary = `🛡 ${defFaction?.name ?? 'Defenders'} repel the assault at ${targetP.name}.`;
  } else {
    summary = `⚖ ${attFaction?.name ?? 'Attacker'} and defenders clash at ${targetP.name}; battle remains inconclusive.`;
  }

  const result = {
    outcome,
    attackerFactionId: attArmy.factionId,
    defenderFactionId: targetP.ownerId,
    provinceId: targetProvinceId,
    provinceName: targetP.name,
    summary,
    attackerStrength: Math.max(0, attackerStrengthPre),
    defenderStrength: Math.max(0, defenderStrengthPre),
    defenseBonus: Math.round((biome?.terrainDefBonus ?? 0) * 100 * siegeReduction),
    fortBonus,
    seaAttack: isSeaAttack,
    attLostTotal,
    defLostTotal,
    attUnitCards,
    defUnitCards,
    militiaCards,
    rounds: _buildCombatNarrative(_ensureMinNarrative(rounds, outcome, targetP.name)),
    turn: state.turn,
  };

  // ── Hero post-combat: XP + wounds + artifact loot ────────
  {
    const attFs = getFaction(attArmy.factionId);
    const defFs = enemyDefArmy ? getFaction(enemyDefArmy.factionId) : null;
    const attHero = attFs?.heroes?.find(h => h.id === attArmy.heroId) ?? null;
    const defHero = defFs?.heroes?.find(h => h.id === enemyDefArmy?.heroId) ?? null;

    // Compute XP amounts before applying so we can record them in the report
    const _power = (army) => (army?.units ?? []).reduce((s, { typeId, count }) => {
      const u = UNIT_MAP[typeId];
      return s + ((u?.attack ?? 0) + (u?.defense ?? 0)) * count;
    }, 0);
    const _milPow = (pool) => {
      const n = _militiaCount(pool);
      const u = pool?.unitDef;
      return n > 0 && u ? ((u.attack ?? 0) + (u.defense ?? 0)) * n : 0;
    };
    const _randXp = (base) => Math.round(base * (0.9 + Math.random() * 0.3));

    let attHeroXp = 0, defHeroXp = 0;
    if (outcome === 'attacker') {
      const pow = _power(enemyDefArmy) + (enemyDefArmy?._isMilitia ? 0 : _milPow(militiaPool));
      attHeroXp = attHero && isHeroActive(attHero) ? _randXp(25 + Math.floor(pow / 8)) : 0;
      defHeroXp = defHero && isHeroActive(defHero) ? _randXp(8) : 0;
    } else if (outcome === 'defender') {
      const pow = _power(attArmy);
      defHeroXp = defHero && isHeroActive(defHero) ? _randXp(25 + Math.floor(pow / 8)) : 0;
      attHeroXp = attHero && isHeroActive(attHero) ? _randXp(8) : 0;
    } else {
      attHeroXp = attHero && isHeroActive(attHero) ? _randXp(8) : 0;
      defHeroXp = defHero && isHeroActive(defHero) ? _randXp(8) : 0;
    }

    // Stamp XP onto result so the battle report can display it
    if (attHero && attHeroXp > 0) { result.attHeroName = attHero.name; result.attHeroXp = attHeroXp; }
    if (defHero && defHeroXp > 0) { result.defHeroName = defHero.name; result.defHeroXp = defHeroXp; }

    // Apply XP
    if (attHeroXp > 0) addHeroExperience(attHero, attHeroXp);
    if (defHeroXp > 0) addHeroExperience(defHero, defHeroXp);

    // Wounds and loot
    if (outcome === 'attacker') {
      if (enemyDefArmy && armySize(enemyDefArmy) <= 0) {
        _woundHeroOnArmyDestroyed(enemyDefArmy, enemyDefArmy.factionId);
        _lootEnemyHeroArtifacts(enemyDefArmy, attArmy.factionId);
      }
    } else if (outcome === 'defender') {
      if (armySize(attArmy) <= 0) {
        _woundHeroOnArmyDestroyed(attArmy, attArmy.factionId);
      }
    }
  }

  const reportId = addCombatReport(result);
  result.reportId = reportId;

  if (outcome === 'attacker' && getArmy(attackerArmyId)) {
    const stillEnemyArmies = getArmiesInProvince(targetProvinceId)
      .filter(a => a.factionId !== attArmy.factionId);
    if (stillEnemyArmies.length === 0) {
      if (!targetP.isOcean) {
        const prevOwner = targetP.ownerId;
        // Pass battle result so faction callbacks (soul gain, clans raid) can use it
        captureProvince(targetProvinceId, attArmy.factionId, {
          defeatedUnitCount: defLostTotal,
          attackerFactionId: attArmy.factionId,
        });
        if (targetP.militia) targetP.militia.current = 0;
        if (prevOwner !== attArmy.factionId) {
          if (playerCanSee(targetProvinceId)) logCapture(attFaction?.name ?? attArmy.factionId, targetP.name);
        }
      }
      moveArmy(attackerArmyId, targetProvinceId);
    } else {
      attArmy.movesLeft = Math.max(0, attArmy.movesLeft - 1);
      result.summary = `⚔ ${attFaction?.name ?? 'Attacker'} wins the clash at ${targetP.name}, but cannot occupy and falls back.`;
    }
  } else if (getArmy(attackerArmyId)) {
    const army = getArmy(attackerArmyId);
    if (army) army.movesLeft = Math.max(0, army.movesLeft - 1);
  }

  return result;
}

/**
 * Apply spell damage to all active units in an army outside of combat (province spells).
 * Applies spellpower scaling, ±20% variance, and defence reduction per unit.
 */
export function applyArmyDamageOutOfCombat(army, baseDamage, spellpower) {
  if (!army) return { destroyed: 0, wounded: 0 };
  _ensureHpPools(army);
  const scaledBase = Math.floor(baseDamage * (1 + spellpower * 0.05));
  const dmgMap = new Map();
  for (const [typeId, arr] of Object.entries(army.hp?.active ?? {})) {
    const unitDef = UNIT_MAP[typeId]?.defense ?? 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] <= 0) continue;
      const variance = 0.8 + Math.random() * 0.4;
      const finalDmg = Math.max(1, Math.floor(scaledBase * variance) - unitDef);
      dmgMap.set(`a:${typeId}:${i}`, finalDmg);
    }
  }
  return _applyBatchDamageToArmy(army, dmgMap, WOUND_CHANCE);
}

/**
 * Pure combat estimate for UI preview.
 */
export function estimateCombat(attackerArmyId, targetProvinceId) {
  const attArmy = getArmy(attackerArmyId);
  const targetP = getProvince(targetProvinceId);
  if (!attArmy || !targetP) return null;

  const biome = getBiome(targetP.biomeId);
  const terrainMod = 1 + (biome?.terrainDefBonus ?? 0);
  const fortBonus = targetP.locations.reduce((sum, loc) => sum + getLocationDefenseBonus(loc, BUILDING_MAP), 0);

  let statusDefPct = 0;
  for (const se of (targetP.statusEffects ?? [])) {
    const seDef = PROVINCE_STATUS_MAP[se.type];
    for (const eff of (seDef?.effects ?? [])) {
      if (eff.type === EFFECT_TYPES.FORTIFICATION_BONUS) statusDefPct += (eff.amount ?? 0) * (se.stacks ?? 1);
    }
  }
  const defFactionState = getFaction(targetP.ownerId);
  const defGovernor = targetP.governorId
    ? (defFactionState?.heroes?.find(h => h.id === targetP.governorId) ?? null)
    : null;
  const heroDefPct = (defGovernor && isHeroActive(defGovernor))
    ? (getHeroProvinceBonuses(defGovernor)?.defensePercent ?? 0)
    : 0;

  // Sea attack penalty: -20% when attacking FROM shallow ocean
  const attackerOriginProv = getProvince(attArmy.provinceId);
  const isSeaAttack = !!(attackerOriginProv?.isOcean && attackerOriginProv?.oceanType === 'shallow');
  const seaPenalty  = isSeaAttack ? 0.8 : 1.0;

  const enemyArmies = getArmiesInProvince(targetProvinceId)
    .filter(a => a.factionId !== attArmy.factionId);
  const enemyDefArmy = _pickBestDefenderArmy(enemyArmies);
  const militiaPool = _militiaPoolForProvince(targetP);

  const attStr = getEffectiveArmyAttack(attArmy, attArmy.factionId, UNIT_MAP) * seaPenalty
    + getEffectiveArmyDefense(attArmy, attArmy.factionId, UNIT_MAP);
  let borrowedStrengthBonus = 0;
  if (enemyDefArmy && enemyArmies.length > 1) {
    borrowedStrengthBonus = _estimateBorrowedStrengthBonus(
      enemyDefArmy,
      enemyArmies,
      UNIT_MAP,
      getArmySupplyCap(enemyDefArmy.factionId),
    );
  }

  const defArmy = enemyDefArmy
    ? getEffectiveArmyAttack(enemyDefArmy, enemyDefArmy.factionId, UNIT_MAP) + getEffectiveArmyDefense(enemyDefArmy, enemyDefArmy.factionId, UNIT_MAP) + borrowedStrengthBonus
    : 0;
  const defStr = Math.round((defArmy + _militiaDefense(militiaPool)) * terrainMod + fortBonus * 10);

  const ratio = defStr > 0 ? attStr / defStr : (attStr > 0 ? 2 : 0.5);
  const winChancePct = Math.round(Math.min(99, Math.max(1, (ratio / (ratio + 1)) * 100)));

  let casualtyLevel = 'Medium';
  if (ratio >= 1.25) casualtyLevel = 'Low';
  else if (ratio >= 0.95) casualtyLevel = 'Medium';
  else if (ratio >= 0.7) casualtyLevel = 'Heavy';
  else casualtyLevel = 'Catastrophic';

  const totalDefBonus = Math.round((biome?.terrainDefBonus ?? 0) * 100)
    + Math.round(fortBonus * 100)
    + statusDefPct
    + heroDefPct;

  return {
    atkStr: Math.round(attStr),
    defStr: Math.round(defStr),
    winChancePct,
    totalDefBonus,
    casualtyLevel,
  };
}

/**
 * Resolve a monster den combat between a player army and the den's occupants.
 * Runs 3 rounds of simplified simultaneous combat.
 * On attacker win: den converts directly to an empty plot and treasure is rolled.
 * On defender win: army takes casualties, den HP is updated but type unchanged.
 *
 * @param {string} armyId
 * @param {string} locationId   - id of the monster_den location
 * @param {string} provinceId
 * @returns {{ outcome: 'attacker'|'defender', rounds: string[], casualties: number, treasure: Object|null }}
 */
export function resolveMonsterDenCombat(armyId, locationId, provinceId) {
  const army = getArmy(armyId);
  const prov = getProvince(provinceId);
  if (!army || !prov) return null;

  const loc = prov.locations.find(l => l.id === locationId);
  if (!loc || loc.type !== 'monster_den' || !loc.denEnemies) return null;

  const monDef = MONSTER_UNITS[loc.denEnemies.unitId];
  if (!monDef) return null;

  _ensureHpPools(army);

  const rounds = [];
  const ROUNDS = 3;
  let totalArmyCasualties  = 0;
  let totalArmyWounded     = 0;
  let totalEnemyCasualties = 0;
  const armyPendingCasualties = [];
  const monsterUnitId  = loc.denEnemies.unitId;
  const startEnemyCount = loc.denEnemies.hp.length + loc.denEnemies.woundedHp.length;

  for (let r = 1; r <= ROUNDS; r++) {
    const armyUnits = _collectArmyUnits(army, army.factionId);
    const aliveEnemies = loc.denEnemies.hp.length;

    if (armyUnits.length === 0 || aliveEnemies === 0) break;

    // ── Army attacks den ──────────────────────────────────────
    let denDmgDealt = 0;
    let denDestroyed = 0;
    const denDmgMap = new Map();

    for (const u of armyUnits) {
      if (loc.denEnemies.hp.length === 0) break;
      const targetIdx = Math.floor(Math.random() * loc.denEnemies.hp.length);
      const dmg = Math.max(1, Math.round((u.attack ?? 0) + _d8() - (monDef.defense ?? 0)));
      denDmgMap.set(targetIdx, (denDmgMap.get(targetIdx) ?? 0) + dmg);
      denDmgDealt += dmg;
    }

    // Apply damage to den hp (sort descending index for safe splice)
    const denHitIdxs = [...denDmgMap.keys()].sort((a, b) => b - a);
    for (const idx of denHitIdxs) {
      if (idx >= loc.denEnemies.hp.length) continue;
      const dmg = denDmgMap.get(idx);
      loc.denEnemies.hp[idx] -= dmg;
      if (loc.denEnemies.hp[idx] <= 0) {
        loc.denEnemies.hp.splice(idx, 1);
        denDestroyed++;
        // Wound chance: 45% join wounded pool
        if (Math.random() < WOUND_CHANCE) {
          loc.denEnemies.woundedHp.push(Math.max(1, Math.round(monDef.maxHp * 0.15)));
        }
      }
    }

    // ── Den attacks army ─────────────────────────────────────
    const armyUnitsFresh = _collectArmyUnits(army);
    let armyDmgDealt = 0;
    let armyDestroyed = 0;
    const armyDmgMap = new Map();

    const aliveEnemiesNow = loc.denEnemies.hp.length;
    for (let e = 0; e < aliveEnemiesNow; e++) {
      if (armyUnitsFresh.length === 0) break;
      const target = armyUnitsFresh[Math.floor(Math.random() * armyUnitsFresh.length)];
      const dmg = Math.max(1, Math.round((monDef.attack ?? 0) + _d8() - (target.defense ?? 0)));
      armyDmgMap.set(target.key, (armyDmgMap.get(target.key) ?? 0) + dmg);
      armyDmgDealt += dmg;
    }

    const result = _applyBatchDamageToArmy(army, armyDmgMap, WOUND_CHANCE);
    armyDestroyed = result.destroyed;
    totalArmyCasualties  += armyDestroyed;
    totalArmyWounded     += result.wounded;
    armyPendingCasualties.push(...result.pendingCasualties);
    totalEnemyCasualties += denDestroyed;

    rounds.push(`Round ${r}: Your forces dealt ${denDmgDealt} damage (${denDestroyed} enemies slain). Monsters struck back for ${armyDmgDealt} damage (${armyDestroyed} of your units lost).`);
  }

  // ── Determine outcome ─────────────────────────────────────
  const enemiesRemaining = loc.denEnemies.hp.length + loc.denEnemies.woundedHp.length;
  const armyRemaining    = _collectArmyUnits(army).length;

  const enc = BIOME_DEN_ENCOUNTER[prov.biomeId] ?? BIOME_DEN_ENCOUNTER.default;
  const startCount = enc.count;
  const outcome = enemiesRemaining === 0 ? 'attacker'
    : armyRemaining === 0 ? 'defender'
    : loc.denEnemies.hp.length < Math.ceil(startCount / 2) ? 'attacker'
    : 'defender';

  _emitArmyCasualties(army, armyPendingCasualties, prov, 'attacker', outcome);

  // Hero XP for den combat
  {
    const fs = getFaction(army.factionId);
    const hero = fs?.heroes?.find(h => h.id === army.heroId) ?? null;
    if (hero && isHeroActive(hero)) {
      const monPow = ((monDef.attack ?? 0) + (monDef.defense ?? 0)) * Math.max(1, startEnemyCount);
      const base = outcome === 'attacker' ? 20 + Math.floor(monPow / 8) : 8;
      const xp = Math.round(base * (0.9 + Math.random() * 0.3));
      addHeroExperience(hero, xp);
    }
    if (outcome === 'defender' && armySize(army) <= 0) {
      _woundHeroOnArmyDestroyed(army, army.factionId);
    }
  }

  let treasure = null;
  if (outcome === 'attacker') {
    loc.type = 'empty';
    loc.buildings = [];
    loc.buildingSlots = 0;
    delete loc.denEnemies;
    if (Math.random() < 0.65) {
      treasure = rollTreasure(army.factionId, provinceId);
    }

    // Artifact drop from den (always roll, uses weighted rarity)
    const artDrop = rollRandomArtifact();
    if (artDrop) {
      const fs = getFaction(army.factionId);
      if (fs) {
        const instanceId = `art_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        fs.artifacts = fs.artifacts ?? [];
        fs.artifacts.push({ instanceId, artifactId: artDrop.id });
        emit(GAME_EVENTS.ARTIFACT_ACQUIRED, { factionId: army.factionId, instanceId, artifactName: artDrop.name });
      }
    }

    const factionDef = FACTION_MAP[army.factionId];
    const treasureStr = treasure
      ? ` Found treasure: ${Object.entries(treasure).map(([r, a]) => `+${a} ${r}`).join(', ')}.`
      : '';
    const artStr = artDrop ? ` Found artifact: ${artDrop.name}!` : '';
    logMessage(`⚔ ${factionDef?.name ?? army.factionId} cleared the monster den in ${prov.name}!${treasureStr}${artStr}`);
  } else {
    const factionDef = FACTION_MAP[army.factionId];
    logMessage(`⚔ ${factionDef?.name ?? army.factionId} failed to clear the monster den in ${prov.name}.`);
  }

  const denResult = {
    isDen:           true,
    outcome,
    rounds,
    treasure,
    armyCasualties:   totalArmyCasualties - totalArmyWounded,
    armyWounded:      totalArmyWounded,
    enemyCasualties:  totalEnemyCasualties,
    startEnemyCount,
    monsterUnitId,
    provinceName:     prov.name,
    factionId:        army.factionId,
    turn:             state.turn,
  };
  denResult.summary = outcome === 'attacker'
    ? `⚔ Monster den cleared in ${prov.name}!`
    : `💀 Repelled by monsters in ${prov.name}.`;
  const denReportId = addCombatReport(denResult);
  denResult.reportId = denReportId;
  return denResult;
}
