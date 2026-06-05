import { getFaction } from './game-state.js';
import { FACTION_MAP } from '../data/factions-data.js';

/**
 * Returns true if the faction has unlocked the given action.
 * Checks: faction startingActions, then all researched tech unlockActions.
 */
export function isFactionActionUnlocked(factionId, actionId) {
  const factionDef = FACTION_MAP[factionId];
  if (factionDef?.startingActions?.includes(actionId)) return true;

  const fs = getFaction(factionId);
  if (!fs) return false;

  for (const techDef of (fs.appliedTechEffects ?? [])) {
    if (techDef.unlockActions?.includes(actionId)) return true;
  }

  return false;
}

/**
 * Returns the source that grants the action, or null if locked.
 * Used by tooltips to display "Unlocked via: Boatbuilding".
 *
 * @returns {{ type: 'faction'|'tech', id: string, name: string } | null}
 */
export function getActionUnlockSource(factionId, actionId) {
  const factionDef = FACTION_MAP[factionId];
  if (factionDef?.startingActions?.includes(actionId)) {
    return { type: 'faction', id: factionId, name: factionDef.name };
  }

  const fs = getFaction(factionId);
  if (!fs) return null;

  for (const techDef of (fs.appliedTechEffects ?? [])) {
    if (techDef.unlockActions?.includes(actionId)) {
      return { type: 'tech', id: techDef.id, name: techDef.name };
    }
  }

  return null;
}

/**
 * Returns a Set of all action ids currently unlocked for a faction.
 */
export function getUnlockedActions(factionId) {
  const result = new Set();

  const factionDef = FACTION_MAP[factionId];
  for (const id of (factionDef?.startingActions ?? [])) result.add(id);

  const fs = getFaction(factionId);
  for (const techDef of (fs?.appliedTechEffects ?? [])) {
    for (const id of (techDef.unlockActions ?? [])) result.add(id);
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
