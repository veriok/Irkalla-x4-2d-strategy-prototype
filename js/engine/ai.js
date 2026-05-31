/**
 * ai.js
 *
 * Priority-based AI for non-player factions.
 *
 * Priority order per faction per turn:
 *   1. Expand   — move army into adjacent unowned/neutral province
 *   2. Attack   — move army into adjacent enemy province if strength ≥ 0.8× enemy
 *   3. Reinforce — move army toward a threatened province (enemy army adjacent)
 *   4. Build    — queue the next available building if resources allow
 *   5. Recruit  — queue a unit if resources allow and army is small
 */

import { state, getProvince, getArmy, getProvincesByFaction, getArmiesByFaction,
         moveArmy, captureProvince, placeArmy, getArmiesInProvince } from './game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { resolveCombat } from './combat.js';
import { BUILDING_MAP, getBuildingsForLocation } from '../data/buildings-data.js';
import { getUnitsForFaction, UNIT_MAP } from '../data/units-data.js';
import { armyAttackStrength, armyDefenseStrength, armySize, createArmy } from '../models/army.js';
import { getInstalledBuildingIds } from '../models/location.js';
import { enqueueProduction } from '../models/province.js';
import { computeIncome } from './turn-engine.js';
import { logMessage } from '../ui/event-log.js';

// Small async delay between AI actions (lets UI update)
const AI_DELAY_MS = 40;

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Run AI for the given faction.
 * @param {string} factionId
 */
export async function runAI(factionId) {
  const fs = state.factions.get(factionId);
  if (!fs || fs.isEliminated) return;

  const armies = getArmiesByFaction(factionId);

  for (const army of armies) {
    if (army.movesLeft <= 0) continue;

    const fromProv  = getProvince(army.provinceId);
    if (!fromProv) continue;

    const adjProvIds = fromProv.adjacentIds;
    let acted = false;

    // ── Priority 1 & 2: Expand or Attack ──
    // Prefer neutral → then weak enemies
    const candidates = adjProvIds
      .map(id => getProvince(id))
      .filter(Boolean)
      .filter(p => p.ownerId !== factionId);

    // Sort: neutral first, then enemies
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
          // Truly undefended neutral — just walk in
          moveArmy(army.id, target.id);
          captureProvince(target.id, factionId);
          acted = true;
          await delay(AI_DELAY_MS);
          break;
        }

        if (!hasArmy && hasMilitia) {
          // Militia-only neutral — fight if strong enough
          const militiaDef = (target.militia?.current ?? 0) * 2;
          const atkStr = armyAttackStrength(army, UNIT_MAP);
          if (atkStr >= militiaDef * 0.8) {
            const combatResult = resolveCombat(army.id, target.id);
            if (combatResult) {
              import('../ui/event-log.js').then(({ logCombat }) => logCombat(combatResult));
            }
            acted = true;
            await delay(AI_DELAY_MS);
            break;
          }
        }
      }

      if (target.ownerId !== 'neutral' && target.ownerId !== factionId) {
        // Attack if strong enough
        const enemyArmies = getArmiesInProvince(target.id).filter(a => a.factionId !== factionId);
        const defArmy     = enemyArmies[0] ?? null;

        const atkStr = armyAttackStrength(army, UNIT_MAP);
        const defStr = defArmy ? armyDefenseStrength(defArmy, UNIT_MAP) : 0;

        if (atkStr >= defStr * 0.8) {
          const combatResult = resolveCombat(army.id, target.id);
          if (combatResult) {
            import('../ui/event-log.js').then(({ logCombat }) => logCombat(combatResult));
          }
          acted = true;
          await delay(AI_DELAY_MS);
          break;
        }
      }
    }

    if (!acted) {
      // ── Priority 3: Reinforce threatened province ──
      // Find own provinces with enemy adjacent
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
          // Move only if no friendly army already there
          const friendlyThere = getArmiesInProvince(target.id).some(a => a.factionId === factionId);
          if (!friendlyThere) {
            moveArmy(army.id, target.id);
            acted = true;
            await delay(AI_DELAY_MS);
          }
        }
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

      const installedIds = getInstalledBuildingIds(loc);
      const available    = getBuildingsForLocation(factionId, loc.type, installedIds);

      // Try to build cheapest available building
      const affordable = available.filter(b => {
        return Object.entries(b.cost).every(([res, amt]) => (fs2.resources[res] ?? 0) >= amt);
      });

      if (affordable.length > 0) {
        // Pick lowest tier (cheapest)
        affordable.sort((a, b) => a.tier - b.tier);
        const bDef = affordable[0];
        // Deduct cost
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

      // Recruit if no army in province and can afford basic unit
      if (!prov.armyId || armySize(state.armies.get(prov.armyId) ?? {units:[]}) < 4) {
        const unitTypes = getUnitsForFaction(factionId).filter(u => {
          return (u.requiredBuilding === null || installedIds.includes(u.requiredBuilding)) &&
                 Object.entries(u.cost).every(([res, amt]) => (fs2.resources[res] ?? 0) >= amt);
        });

        if (unitTypes.length > 0) {
          // Pick cheapest unit
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
