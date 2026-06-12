import { getFaction } from './game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';
import { TECH_MAP } from '../data/techs-data.js';

/**
 * Returns true if the faction has unlocked the given action.
 * Checks: faction startingActions, then all researched tech unlockActions.
 */
export function isFactionActionUnlocked(factionId, actionId) {
  const factionDef = FACTION_MAP[factionId];
  if (factionDef?.startingActions?.includes(actionId)) return true;

  const fs = getFaction(factionId);
  if (!fs) return false;

  for (const techId of (fs.unlockedTechs ?? [])) {
    if (TECH_MAP[techId]?.unlockActions?.includes(actionId)) return true;
  }

  return false;
}


/**
 * Returns a Set of all action ids currently unlocked for a faction.
 */
export function getUnlockedActions(factionId) {
  const result = new Set();

  const factionDef = FACTION_MAP[factionId];
  for (const id of (factionDef?.startingActions ?? [])) result.add(id);

  const fs = getFaction(factionId);
  for (const techId of (fs?.unlockedTechs ?? [])) {
    for (const id of (TECH_MAP[techId]?.unlockActions ?? [])) result.add(id);
  }

  return result;
}

/**
 * Returns true if the army can perform the given action.
 * Checks faction unlocks (tech + starting) and hero-granted unlocks (stub — heroes not yet implemented).
 *
 * Use this for army panel button rendering, not isFactionActionUnlocked directly,
 * so that hero unlocks are automatically included once the hero system is added.
 */
export function isArmyActionUnlocked(army, actionId) {
  if (isFactionActionUnlocked(army.factionId, actionId)) return true;
  // Hero-granted actions stub — army.heroActions will be populated by the hero system
  if (army.heroActions?.includes(actionId)) return true;
  return false;
}
