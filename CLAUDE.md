# Codebase Guidelines

## 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State your assumptions explicitly. If uncertain or vague requirement, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.

---

## Enumerable Types — Finite Categories Belong in Enums

Plain strings are fine for names, descriptions, IDs, and other open-ended values. But any **finite categorical set** — a type system where the full list of valid values is known and bounded - must be defined as a frozen enum in [js/data/enums.js](js/data/enums.js) and referenced by its const everywhere.

Examples of things that are enumerables: unit types, factions, resources, building categories, tech eras, biome types.

**Pattern:**
```js
// enums.js
export const DAMAGE_TYPES = Object.freeze({
  PHYSICAL: 'physical',
  FIRE:     'fire',
  ARCANE:   'arcane',
});

// usage elsewhere
import { DAMAGE_TYPES } from '../data/enums.js';
if (attack.damageType === DAMAGE_TYPES.FIRE) { ... }
```

When adding a new categorical type, add it to `enums.js` first, then reference the const everywhere. Never scatter a new enum across individual data files.

---

## Effects System — Structured, Scoped Effect Objects

TBD.

---

## Event-Based Communication — EventBus + Reaction IDs

Game events are dispatched through the central EventBus in [js/engine/game-events.js](js/engine/game-events.js). Engine code calls `emit()`; listeners registered at startup react without any direct coupling.

**Established events** (defined as `GAME_EVENTS` in [js/data/enums.js](js/data/enums.js)):
```js
GAME_EVENTS.PROVINCE_CAPTURED  // { factionId, province, battleResult, gameState }
GAME_EVENTS.ARMY_CASUALTIES    // { factionId, army, province, gameState,
                               //   outcome: 'attacker'|'defender'|'inconclusive',
                               //   role: 'attacker'|'defender',
                               //   armyWillSurvive: bool,
                               //   casualties: [{ typeId, unit, resurrect: false, spawnUnitId: null }] }
GAME_EVENTS.TECH_RESEARCHED    // { factionId, techId, techDef }
```

`ARMY_CASUALTIES` fires once per army per combat (after all rounds, before armies are removed). Handlers iterate `data.casualties` and may set `entry.resurrect = true` on matching units to wound them instead of destroying them, or `entry.spawnUnitId` to queue a unit spawn. Check `data.armyWillSurvive` before spending resources — if `false`, the army will be removed and resurrection is wasted.

**Faction reactions are data, not code.** Factions declare which reactions they have by listing `FACTION_REACTION_IDS` in arrays on their definition. The implementations live in [js/engine/faction-reactions.js](js/engine/faction-reactions.js) and are wired to the EventBus at game start by `registerFactionReactions()`.

```js
// factions-data.js — pure data, no functions
{
  id: FACTION_IDS.KUR_MARGAL,
  onProvinceCapture: [FACTION_REACTION_IDS.KUR_MARGAL_SOUL_HARVEST],    // → PROVINCE_CAPTURED
  onArmyCasualties:  [FACTION_REACTION_IDS.KUR_MARGAL_SOUL_RESURRECTION], // → ARMY_CASUALTIES
}

// faction-reactions.js — implementation
[FACTION_REACTION_IDS.KUR_MARGAL_SOUL_RESURRECTION](data) { ... }
```

**DOM forwarding** is configured per-event in `game-events.js`. Events listed in `DOM_FORWARD` also dispatch a browser `CustomEvent` on `document`, letting UI scripts react without importing engine modules. Add a DOM forward entry only when a UI layer needs to react to a game event. `playerOnly: true` limits forwarding to events from the player's faction (faction ID is stored in `document.body.dataset.playerFactionId` at game start).

**Two ways to register a faction reaction:**

- **Static (available from game start)** — declare the ID in `onProvinceCapture` or `onArmyCasualties` on the faction definition in `factions-data.js`. Wired by `registerFactionReactions()` at startup.
- **Tech-unlocked (wired when researched)** — add `unlockReactions` to the tech definition. When `TECH_RESEARCHED` fires, `registerFactionReactions`'s listener wires it for the researching faction. A registration guard prevents double-wiring.

```js
// techs-data.js
unlockReactions: [
  { reactionId: FACTION_REACTION_IDS.SOME_REACTION, event: GAME_EVENTS.PROVINCE_CAPTURED },
]
```

**Adding a new game event:**
1. Add the event name to `GAME_EVENTS` in `enums.js`.
2. Call `emit(GAME_EVENTS.YOUR_EVENT, data)` from the engine at the right moment.
3. If factions need to react, add a `FACTION_REACTION_IDS` entry, implement the handler in `faction-reactions.js`, and declare the ID on the relevant faction definitions (static) or tech definitions (tech-unlocked).
4. If UI needs to react without importing engine code, add an entry to `DOM_FORWARD` in `game-events.js`.

---

## Actions System — Unlockable, Data-Driven, Two-Level

Custom actions (abilities the player can trigger) are defined in [js/data/faction-actions-data.js](js/data/faction-actions-data.js) and unlocked via faction `startingActions` or tech `unlockActions` arrays. Gate logic lives in [js/engine/faction-actions.js](js/engine/faction-actions.js). UI surfaces them at two levels:

- **Army panel** — actions that operate on or through an army (movement abilities, combat abilities, army buffs). Use `isArmyActionUnlocked(army, actionId)`.
- **Province sidebar** — actions that operate on a province (fortify, conscript, build special structures). Checked against the faction's unlocked action set.

**Adding a new action:**
1. Add an entry to `FACTION_ACTIONS` in `faction-actions-data.js` with `id`, `label`, `icon`, `description`, and optionally `hintTechId`.
2. Grant it to a faction either via `startingActions` on the faction definition (available from the start, no unlock needed — e.g. Iron Freeholds always has `fortify_province`) or via `unlockActions` on a tech definition (earned through research).
3. Implement the effect in the relevant panel handler (army panel or province panel), using the effects system where applicable.

The point of this system is to avoid long `if (faction === X)` or `if (unlockedTech === T)` chains in engine logic. Faction-specific behaviour is expressed as data; the engine queries `isArmyActionUnlocked` / `getUnlockedActions` and dispatches generically.
