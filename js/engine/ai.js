/**
 * ai.js
 *
 * Priority-based AI for non-player factions.
 *
 * Priority order per faction per turn:
 *   1. Expand   — move army into adjacent unowned/neutral province
 *   2. Attack   — move army into adjacent enemy province if strength ≥ 0.8× enemy
 *   3. Reinforce — move army toward a threatened province (enemy army adjacent)
 *   3.5. Move toward targetProvinceId if set
 *   3.6. Dispersal — province has 2+ armies, move one into adjacent own province with no army
 *   3.7. Research — unlock cheapest available tech
 *   4. Build    — queue the next available building if resources allow
 *   5. Recruit  — queue a unit if resources allow and army is small
 */

import { state, getProvince, getProvincesByFaction, getArmiesByFaction,
         moveArmy, captureProvince, getArmiesInProvince, playerCanSee,
         getFaction, unlockTech, getEffectiveTechCost, canAfford, getArmySupplyCap,
         removeArmy } from './game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { resolveCombat } from './combat.js';
import { BUILDING_MAP, getBuildingsForLocation } from '../data/buildings-data.js';
import { getRecruitableUnits, UNIT_MAP } from '../data/units-data.js';
import { armyAttackStrength, armyDefenseStrength, armySize, armyTotalCount,
         transferActiveUnits, transferWoundedUnits } from '../models/army.js';
import { getInstalledBuildingIds } from '../models/location.js';
import { enqueueProduction } from '../models/province.js';
import { computeIncome } from './turn-engine.js';
import { buildFactionTechTree, TECH_MAP } from '../data/techs-data.js';

const AI_DELAY_MS = 40;

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * BFS from fromProvId toward toProvId restricted to provinces owned by factionId
 * (or the target itself if it's neutral/enemy — the destination may not be owned).
 * Returns the next-step province ID to move through, or null if unreachable.
 */
function findNextStep(fromProvId, toProvId, factionId) {
  if (fromProvId === toProvId) return null;

  const queue = [fromProvId];
  const prev = new Map([[fromProvId, null]]);

  while (queue.length > 0) {
    const cur = queue.shift();
    const prov = getProvince(cur);
    if (!prov) continue;

    for (const adjId of prov.adjacentIds) {
      if (prev.has(adjId)) continue;
      const adj = getProvince(adjId);
      if (!adj) continue;

      prev.set(adjId, cur);

      if (adjId === toProvId) {
        // Walk back to find the first step
        let step = toProvId;
        while (prev.get(step) !== fromProvId) step = prev.get(step);
        return step;
      }

      // Only traverse through own provinces (not destination)
      if (adj.ownerId === factionId) queue.push(adjId);
    }
  }
  return null;
}

/**
 * Merge smaller armies in the same province into the largest one, up to supply cap.
 * Removes empty donor armies. Mutates army objects in place.
 */
function mergeArmiesInProvince(provId, factionId) {
  const armies = getArmiesInProvince(provId).filter(a => a.factionId === factionId);
  if (armies.length <= 1) return;

  const supplyCap = getArmySupplyCap(factionId);

  // Largest army (by total count) is the receiver
  armies.sort((a, b) => armyTotalCount(b) - armyTotalCount(a));
  const receiver = armies[0];

  for (const donor of armies.slice(1)) {
    const slots = supplyCap - armyTotalCount(receiver);
    if (slots <= 0) break;

    for (const stack of [...donor.units]) {
      const take = Math.min(stack.count, supplyCap - armyTotalCount(receiver));
      if (take <= 0) break;
      transferActiveUnits(donor, receiver, stack.typeId, take, UNIT_MAP);
    }
    for (const stack of [...(donor.wounded ?? [])]) {
      const take = Math.min(stack.count, supplyCap - armyTotalCount(receiver));
      if (take <= 0) break;
      transferWoundedUnits(donor, receiver, stack.typeId, take, UNIT_MAP);
    }

    if (armySize(donor) === 0 && (donor.wounded?.length ?? 0) === 0) {
      removeArmy(donor.id);
    }
  }
}

/**
 * Run AI for the given faction.
 * @param {string} factionId
 */
export async function runAI(factionId) {
  const fs = state.factions.get(factionId);
  if (!fs || fs.isEliminated) return;

  // ── Merge armies that share a province ──
  const seenProvs = new Set();
  for (const army of getArmiesByFaction(factionId)) {
    if (!seenProvs.has(army.provinceId)) {
      seenProvs.add(army.provinceId);
      mergeArmiesInProvince(army.provinceId, factionId);
    }
  }

  const armies = getArmiesByFaction(factionId);

  for (const army of armies) {
    if (army.movesLeft <= 0) continue;
    if (!state.armies.has(army.id)) continue; // may have been removed by merge

    const fromProv = getProvince(army.provinceId);
    if (!fromProv) continue;

    const adjProvIds = fromProv.adjacentIds;
    let acted = false;

    // ── Priority 1 & 2: Expand or Attack ──
    const candidates = adjProvIds
      .map(id => getProvince(id))
      .filter(Boolean)
      .filter(p => p.ownerId !== factionId)
      .filter(p => !p.isOcean);

    candidates.sort((a, b) => {
      const aNeutral = a.ownerId === 'neutral' ? 0 : 1;
      const bNeutral = b.ownerId === 'neutral' ? 0 : 1;
      return aNeutral - bNeutral;
    });

    for (const target of candidates) {
      if (acted) break;

      if (target.ownerId === 'neutral') {
        const hasMilitia = (target.militia?.current ?? 0) > 0;
        const targetArmies = getArmiesInProvince(target.id);
        const hasArmy = targetArmies.length > 0;

        if (!hasArmy && !hasMilitia) {
          moveArmy(army.id, target.id);
          captureProvince(target.id, factionId);
          army.targetProvinceId = null;
          acted = true;
          await delay(AI_DELAY_MS);
          break;
        }

        if (!hasArmy && hasMilitia) {
          const militiaDef = (target.militia?.current ?? 0) * 2;
          const atkStr = armyAttackStrength(army, UNIT_MAP);
          if (atkStr >= militiaDef * 0.8) {
            const combatResult = resolveCombat(army.id, target.id);
            if (combatResult && playerCanSee(target.id)) {
              import('../ui/event-log.js').then(({ logCombat }) => logCombat(combatResult));
            }
            army.targetProvinceId = null;
            acted = true;
            await delay(AI_DELAY_MS);
            break;
          }
        }
      }

      if (target.ownerId !== 'neutral' && target.ownerId !== factionId) {
        const enemyArmies = getArmiesInProvince(target.id).filter(a => a.factionId !== factionId);
        const defArmy = enemyArmies[0] ?? null;

        const atkStr = armyAttackStrength(army, UNIT_MAP);
        const defStr = defArmy ? armyDefenseStrength(defArmy, UNIT_MAP) : 0;

        if (atkStr >= defStr * 0.8) {
          const combatResult = resolveCombat(army.id, target.id);
          if (combatResult && playerCanSee(target.id)) {
            import('../ui/event-log.js').then(({ logCombat }) => logCombat(combatResult));
          }
          army.targetProvinceId = null;
          acted = true;
          await delay(AI_DELAY_MS);
          break;
        }
      }
    }

    if (!acted) {
      // ── Priority 3: Reinforce threatened province ──
      const threatened = getProvincesByFaction(factionId).filter(p => {
        return p.adjacentIds.some(adjId => {
          const adj = getProvince(adjId);
          return adj && adj.ownerId !== factionId && adj.ownerId !== 'neutral' &&
                 getArmiesInProvince(adjId).some(a => a.factionId !== factionId);
        });
      });

      if (threatened.length > 0) {
        const target = threatened[0];
        if (fromProv.adjacentIds.includes(target.id) && army.movesLeft > 0 &&
            army.provinceId !== target.id) {
          const friendlyThere = getArmiesInProvince(target.id).some(a => a.factionId === factionId);
          if (!friendlyThere) {
            moveArmy(army.id, target.id);
            army.targetProvinceId = null;
            acted = true;
            await delay(AI_DELAY_MS);
          }
        }
      }
    }

    if (!acted) {
      // ── Priority 3.5: Move toward targetProvinceId ──
      if (army.targetProvinceId) {
        const targetProv = getProvince(army.targetProvinceId);
        // Invalidate stale targets: target captured, threatened home, or no path
        const homeProvs = getProvincesByFaction(factionId);
        const homeUnderThreat = homeProvs.some(p =>
          p.adjacentIds.some(adjId => {
            const adj = getProvince(adjId);
            return adj && adj.ownerId !== factionId && adj.ownerId !== 'neutral' &&
                   getArmiesInProvince(adjId).some(a => a.factionId !== factionId);
          })
        );

        if (!targetProv || targetProv.ownerId === factionId || homeUnderThreat) {
          army.targetProvinceId = null;
        } else {
          const nextStep = findNextStep(army.provinceId, army.targetProvinceId, factionId);
          if (!nextStep) {
            army.targetProvinceId = null;
          } else {
            moveArmy(army.id, nextStep);
            acted = true;
            await delay(AI_DELAY_MS);
          }
        }
      }

      // If no target, find one: nearest neutral province reachable via own territory
      if (!acted && !army.targetProvinceId) {
        const ownProvinceIds = new Set(getProvincesByFaction(factionId).map(p => p.id));
        const visited = new Set([army.provinceId]);
        const queue = [army.provinceId];
        let bestTarget = null;

        while (queue.length > 0 && !bestTarget) {
          const cur = queue.shift();
          const prov = getProvince(cur);
          if (!prov) continue;

          for (const adjId of prov.adjacentIds) {
            if (visited.has(adjId)) continue;
            visited.add(adjId);
            const adj = getProvince(adjId);
            if (!adj || adj.isOcean) continue;

            if (adj.ownerId === 'neutral' || (adj.ownerId !== factionId && adj.ownerId !== 'neutral')) {
              bestTarget = adjId;
              break;
            }
            if (ownProvinceIds.has(adjId)) queue.push(adjId);
          }
        }

        if (bestTarget && bestTarget !== army.provinceId) {
          army.targetProvinceId = bestTarget;
          const nextStep = findNextStep(army.provinceId, bestTarget, factionId);
          if (nextStep) {
            moveArmy(army.id, nextStep);
            acted = true;
            await delay(AI_DELAY_MS);
          }
        }
      }
    }

    if (!acted) {
      // ── Priority 3.6: Dispersal ──
      // If 2+ friendly armies in this province, move this one to an adjacent own province with no army
      const friendliesHere = getArmiesInProvince(army.provinceId).filter(a => a.factionId === factionId);
      if (friendliesHere.length >= 2) {
        const emptyAdj = adjProvIds.find(adjId => {
          const adj = getProvince(adjId);
          if (!adj || adj.ownerId !== factionId || adj.isOcean) return false;
          return !getArmiesInProvince(adjId).some(a => a.factionId === factionId);
        });
        if (emptyAdj) {
          moveArmy(army.id, emptyAdj);
          acted = true;
          await delay(AI_DELAY_MS);
        }
      }
    }
  }

  // ── Priority 3.7: Research — unlock cheapest available tech ──
  {
    const fs = getFaction(factionId);
    if (fs) {
      const techTree = buildFactionTechTree(factionId);
      const candidates = [];
      for (const [slotId, techDef] of techTree.entries()) {
        if (fs.unlockedTechs.includes(techDef.id)) continue;
        const req = TECH_MAP[techDef.replacesId ?? techDef.id]?.requires;
        const prereqsMet = !req || fs.unlockedTechs.includes(req);
        if (!prereqsMet) continue;
        const cost = getEffectiveTechCost(factionId, techDef.baseCost);
        if (canAfford(factionId, { research: cost })) candidates.push({ techDef, cost });
      }
      if (candidates.length > 0) {
        candidates.sort((a, b) => a.cost - b.cost);
        unlockTech(factionId, candidates[0].techDef.id);
      }
    }
  }

  // ── Priority 4 & 5: Build / Recruit ──
  const provinces = getProvincesByFaction(factionId);
  const faction   = FACTION_MAP[factionId];
  const fs2       = state.factions.get(factionId);

  for (const prov of provinces) {
    for (const loc of prov.locations) {
      if (!loc.isControllable || prov.productionQueue.length >= 5) continue;

      const installedIds      = getInstalledBuildingIds(loc);
      const provInstalledIds  = prov.locations.flatMap(l => getInstalledBuildingIds(l));
      const unlockedTechs     = getFaction(factionId)?.unlockedTechs ?? [];
      const available         = getBuildingsForLocation(factionId, loc.type, installedIds, prov.isCoastal, provInstalledIds)
        .filter(b => !b.techRequired || unlockedTechs.includes(b.techRequired));

      const affordable = available.filter(b => {
        return Object.entries(b.cost).every(([res, amt]) => (fs2.resources[res] ?? 0) >= amt);
      });

      if (affordable.length > 0) {
        affordable.sort((a, b) => a.tier - b.tier);
        const bDef = affordable[0];
        for (const [res, amt] of Object.entries(bDef.cost)) {
          fs2.resources[res] = Math.max(0, (fs2.resources[res] ?? 0) - amt);
        }
        enqueueProduction(prov, {
          type:           'building',
          id:             bDef.id,
          locationId:     loc.id,
          turnsRemaining: bDef.buildTurns,
        });
        await delay(AI_DELAY_MS);
        break;
      }

      if (!prov.armyId || armySize(state.armies.get(prov.armyId) ?? { units: [] }) < 4) {
        const unitTypes = getRecruitableUnits(factionId, installedIds, loc.type, unlockedTechs)
          .filter(u => Object.entries(u.cost).every(([res, amt]) => (fs2.resources[res] ?? 0) >= amt));

        if (unitTypes.length > 0) {
          unitTypes.sort((a, b) =>
            Object.values(a.cost).reduce((s, v) => s + v, 0) -
            Object.values(b.cost).reduce((s, v) => s + v, 0)
          );
          const uDef = unitTypes[0];
          for (const [res, amt] of Object.entries(uDef.cost)) {
            fs2.resources[res] = Math.max(0, (fs2.resources[res] ?? 0) - amt);
          }
          enqueueProduction(prov, {
            type:           'unit',
            id:             uDef.id,
            locationId:     loc.id,
            turnsRemaining: uDef.buildTurns,
          });
          await delay(AI_DELAY_MS);
          break;
        }
      }
    }
  }
}
