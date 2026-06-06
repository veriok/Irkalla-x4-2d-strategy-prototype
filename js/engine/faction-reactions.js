/**
 * faction-reactions.js
 *
 * Implementations of all faction event reactions, keyed by FACTION_REACTION_IDS.
 *
 * Factions declare which reactions they respond to via reaction ID arrays in
 * factions-data.js (e.g. onUnitDeath: [FACTION_REACTION_IDS.KUR_MARGAL_SOUL_RESURRECTION]).
 * Call registerFactionReactions() once at game start to wire them to the EventBus.
 *
 * Event data shapes:
 *   PROVINCE_CAPTURED: { factionId, province, battleResult, gameState }
 *     Handlers may mutate province.locations with _raidDestroyed/_raidDownlevel flags
 *     (consumed by _applyRaidDestruction in game-state.js after the event).
 *
 *   ARMY_CASUALTIES: { factionId, army, province, gameState,
 *                     outcome, role, armyWillSurvive,
 *                     casualties: [{ typeId, unit, resurrect: false, spawnUnitId: null }] }
 *     Fires once per army per combat after all rounds. Iterate casualties and set
 *     entry.resurrect = true to wound instead of destroy; entry.spawnUnitId to queue a spawn.
 *     Check armyWillSurvive before spending resources.
 *
 *   TECH_RESEARCHED: { factionId, techId, techDef }
 *     Read-only — tech effects are applied by unlockTech() before this event fires.
 */

import { FACTION_IDS, RACE_IDS, GAME_EVENTS, FACTION_REACTION_IDS } from '../data/enums.js';
import { FACTIONS } from '../data/factions-data.js';
import { on } from './game-events.js';
import { logMessage } from '../ui/event-log.js';

function _isPlayer(factionId) {
  return factionId === document.body.dataset.playerFactionId;
}

const REACTION_HANDLERS = {

  [FACTION_REACTION_IDS.KUR_MARGAL_SOUL_HARVEST](data) {
    const fs = data.gameState.factions.get(FACTION_IDS.KUR_MARGAL);
    if (!fs) return;
    const gained = data.battleResult?.defeatedUnitCount ?? 0;
    if (gained <= 0) return;
    fs.resources.souls = (fs.resources.souls ?? 0) + gained;
    if (_isPlayer(data.factionId)) {
      logMessage(`👻 Harvested ${gained} soul${gained !== 1 ? 's' : ''} from the fallen in ${data.province.name}.`);
    }
  },

  [FACTION_REACTION_IDS.KUR_MARGAL_SOUL_RESURRECTION](data) {
    if (!data.armyWillSurvive) return;
    const fs = data.gameState.factions.get(FACTION_IDS.KUR_MARGAL);
    if (!fs) return;

    let resurrected = 0;
    let soulsSpent = 0;
    const hasTech = fs.unlockedTechs.includes('eternal_binding');

    for (const entry of data.casualties) {
      if (entry.unit.raceId !== RACE_IDS.DWARF) continue;
      if (entry.unit.unitType === 'construct') continue;
      if (hasTech && Math.random() < 0.5) {
        entry.resurrect = true;
        resurrected++;
      } else if ((fs.resources.souls ?? 0) >= 1) {
        fs.resources.souls -= 1;
        entry.resurrect = true;
        resurrected++;
        soulsSpent++;
      }
    }

    if (resurrected <= 0) return;
    if (!_isPlayer(data.factionId)) return;
    const costStr = soulsSpent > 0 ? ` (-${soulsSpent} 👻)` : '';
    logMessage(`👻 ${resurrected} fallen dwarf${resurrected !== 1 ? 's' : ''} soul-bound back to service${costStr}.`);
  },

  [FACTION_REACTION_IDS.DRAIG_GOCH_PRESTIGE_ON_CAPTURE](data) {
    const fs = data.gameState.factions.get(FACTION_IDS.DRAIG_GOCH);
    if (!fs) return;
    fs.resources.prestige = (fs.resources.prestige ?? 0) + 1;
    const logParts = ['+1 👑 Prestige'];
    if (fs.unlockedTechs.includes('oath_of_the_dragon')) {
      fs.resources.dragon_essence = (fs.resources.dragon_essence ?? 0) + 2;
      logParts.push('+2 🔥 Dragon Essence');
    }
    if (_isPlayer(data.factionId)) {
      logMessage(`🐉 ${logParts.join(', ')} earned from capturing ${data.province.name}.`);
    }
  },

  [FACTION_REACTION_IDS.CLANS_RAID_ON_CAPTURE](data) {
    if (data.province.coreOf === FACTION_IDS.CLANS_FIRST_SCALE) return;
    const fs = data.gameState.factions.get(FACTION_IDS.CLANS_FIRST_SCALE);
    if (!fs) return;

    let gold = 0;
    for (const loc of (data.province.locations ?? [])) {
      if (!loc.isControllable) continue;
      for (const slot of (loc.buildings ?? [])) {
        const tierMatch = slot.buildingId?.match(/_(\d)$/);
        const tier = tierMatch ? parseInt(tierMatch[1], 10) : 1;
        gold += tier * 15;
      }
    }
    fs.resources.gold = (fs.resources.gold ?? 0) + gold;

    for (const loc of (data.province.locations ?? [])) {
      if (!loc.isControllable || loc.locationType === 'main_settlement') continue;
      if (Math.random() < 0.10) {
        loc._raidDestroyed = true;
      } else if (!loc._raidDestroyed && (loc.buildings ?? []).length > 0 && Math.random() < 0.25) {
        loc._raidDownlevel = true;
      }
    }

    if (_isPlayer(data.factionId) && gold > 0) {
      logMessage(`🦎 Raided ${data.province.name} for +${gold} 🪙.`);
    }
  },

  [FACTION_REACTION_IDS.SUTEKH_RA_MUMMY_SPAWN](data) {
    let spawned = 0;
    for (const entry of data.casualties) {
      if (entry.unit.id !== 'moon_zealot') continue;
      if (Math.random() >= 0.25) continue;
      entry.spawnUnitId = 'undead_mummy'; // stub — spawn not yet implemented
      spawned++;
    }
    if (spawned <= 0) return;
    if (!_isPlayer(data.factionId)) return;
    logMessage(`🌙 ${spawned} Moon Zealot${spawned !== 1 ? 's' : ''} rose as Risen Mummies to serve the moon.`);
  },
};

// Maps faction data keys to their corresponding GAME_EVENTS value.
const REACTION_KEY_TO_EVENT = {
  onProvinceCapture: GAME_EVENTS.PROVINCE_CAPTURED,
  onArmyCasualties:  GAME_EVENTS.ARMY_CASUALTIES,
};

// Tracks registered `${factionId}:${reactionId}` pairs to prevent double-registration.
const _registered = new Set();

function _registerReaction(factionId, reactionId, event) {
  const key = `${factionId}:${reactionId}`;
  if (_registered.has(key)) return;
  const handler = REACTION_HANDLERS[reactionId];
  if (!handler) {
    console.warn(`faction-reactions: no handler for "${reactionId}" on "${factionId}"`);
    return;
  }
  _registered.add(key);
  on(event, (data) => {
    if (data.factionId !== factionId) return;
    handler(data);
  });
}

/**
 * Wire faction reactions to the EventBus. Call once at game start.
 *
 * Two registration paths:
 *   1. Static — reads onProvinceCapture / onArmyCasualties arrays from factions-data.js.
 *   2. Tech-unlocked — listens to TECH_RESEARCHED and registers reactions declared in
 *      techDef.unlockReactions: [{ reactionId, event }] when a tech is researched.
 */
export function registerFactionReactions() {
  for (const faction of FACTIONS) {
    for (const [key, event] of Object.entries(REACTION_KEY_TO_EVENT)) {
      for (const reactionId of (faction[key] ?? [])) {
        _registerReaction(faction.id, reactionId, event);
      }
    }
  }

  on(GAME_EVENTS.TECH_RESEARCHED, ({ factionId, techDef }) => {
    for (const { reactionId, event } of (techDef.unlockReactions ?? [])) {
      _registerReaction(factionId, reactionId, event);
    }
  });
}
