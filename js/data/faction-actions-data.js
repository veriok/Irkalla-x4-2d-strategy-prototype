/**
 * Faction Action Registry
 *
 * Defines all gateable faction/army actions. The gate logic lives in
 * js/engine/faction-actions.js — this file is pure data.
 *
 * Fields:
 *   id          — unique action identifier
 *   label       — short display name
 *   icon        — emoji icon
 *   description — tooltip body text
 *   hintTechId  — optional tech id shown as "Requires: X" in UX; NOT used for gate logic
 */

export const FACTION_ACTIONS = {

  // ── Movement ──────────────────────────────────────────────────────────────

  embark_shallow: {
    id: 'embark_shallow',
    label: 'Embark (Coastal)',
    icon: '🛶',
    description: 'Armies can enter and move through shallow coastal seas.',
    hintTechId: 'boatbuilding',
  },

  embark_deep: {
    id: 'embark_deep',
    label: 'Embark (Deep Sea)',
    icon: '⛵',
    description: 'Armies can venture into deep ocean provinces.',
    hintTechId: 'navigation',
  },

  airship_teleport: {
    id: 'airship_teleport',
    label: 'Airship Teleport',
    icon: '🚁',
    description: 'Deploy armies via airship to any friendly province within range.',
    hintTechId: 'airship_fleet',
  },

  // ── Army Actions ──────────────────────────────────────────────────────────

  code_of_honor: {
    id: 'code_of_honor',
    label: 'Code of Honor',
    icon: '⚔️',
    description: 'Invoke the Dragon Code to temporarily boost the army\'s combat strength.',
    hintTechId: 'code_of_honor',
  },

  // ── Province Actions ──────────────────────────────────────────────────────

  conscript_levies: {
    id: 'conscript_levies',
    label: 'Conscript Levies',
    icon: '🪖',
    description: 'Spend Tribute to instantly raise levies in a province. Applies Conscription Strain.',
    hintTechId: null,
  },

  fortify_province: {
    id: 'fortify_province',
    label: 'Fortify Province',
    icon: '🔒',
    description: 'Spend Schematics to apply a Freehold Fortification to a province.',
    hintTechId: null,
  },
};

export const FACTION_ACTION_LIST = Object.values(FACTION_ACTIONS);
