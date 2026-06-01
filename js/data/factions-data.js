/**
 * factions-data.js
 * Static definitions for all 4 playable factions.
 *
 * resource types:
 *   basic:    1 resource, all factions have it (gold equivalent)
 *   advanced: up to 2-3 faction-specific advanced resources
 *
 */

export const FACTIONS = [
  {
    id: 'dwarves',
    name: 'Kur-Malgal',           // "Realm of the Undying Forge" in faux-Babylonian
    fullName: 'Undead Dwarves',
    description:
      'In search of immortality, King Naram-Azu struck a pact with the Dark God of the Forge. ' +
      'His people are undead masters of construction and golemcraft — doomed, but unbreakable.',
    emoji: '💀',
    flagImg: 'assets/flags/dwarves.png',
    unitCardBgImg: 'assets/cards/backgrounds/dwarves-unit-bg.png',
    color: '#8B6914',              // deep bronze-gold
    borderColor: '#b08020',
    textColor: '#d4a030',

    resources: {
      basic:    { id: 'gold',          name: 'Gold',         emoji: '🪙', description: 'Universal currency.' },
      advanced: [
        { id: 'soul_essence', name: 'Soul Essence', emoji: '💠', description: 'Harvested from slain enemies. Powers undead war-golems.' },
        { id: 'forge_iron',   name: 'Forge Iron',   emoji: '⚙️',  description: 'Dark-forged alloy. Unlocks advanced construction and weapons.' },
      ],
    },
    unitEmoji: '💀',
    loreTag: 'Undying',
    playstyle: 'Tall. Fewer but heavily fortified provinces. Strong garrisons. Slow but powerful golems.',
  },
  {
    id: 'elves',
    name: 'Poleis tou Aethera',    // "City-States of the Aether" (faux-Greek)
    fullName: 'Elven City States',
    description:
      'Sailors, explorers, thinkers, and hedonists. The city-states vary between High and Forest Elves. ' +
      'Considered two-faced by all — their charm hides a ruthless pragmatism.',
    emoji: '🌿',
    flagImg: 'assets/flags/elves.png',
    unitCardBgImg: 'assets/cards/backgrounds/elves-unit-bg.png',
    color: '#1E6B5B',              // deep sea-green
    borderColor: '#204860',
    textColor: '#40c890',
    resources: {
      basic:    { id: 'gold',        name: 'Gold',      emoji: '🪙', description: 'Universal currency.' },
      advanced: [
        { id: 'philosophy',  name: 'Philosophy', emoji: '📜', description: 'Accumulated knowledge. Drives research and diplomacy.' },
        { id: 'timber',      name: 'Timber',     emoji: '🌲', description: 'Fine elven wood. Required for fleets and siege equipment.' },
      ],
    },
    unitEmoji: '🌿',
    loreTag: 'Enlightened',
    playstyle: 'Wide. Naval expansion along coasts. Fast light infantry. Philosophy unlocks powerful bonuses.',
  },
  {
    id: 'lizards',
    name: 'Khepri-Hegemony',       // Sun-disk reference (faux-Egyptian)
    fullName: 'Desert Hegemony',
    description:
      'Lizard kings ruling over desert river valleys, granting bountiful harvest. ' +
      'Elite crocodile infantry, prominent priesthood, and devotion to the radiant Sun God.',
    emoji: '🦎',
    flagImg: 'assets/flags/lizards.png',
    unitCardBgImg: 'assets/cards/backgrounds/lizards-unit-bg.png',
    color: '#C06020',              // desert terracotta
    borderColor: '#A04810',
    textColor: '#E08840',
    resources: {
      basic:    { id: 'gold',   name: 'Gold',  emoji: '🪙', description: 'Universal currency.' },
      advanced: [
        { id: 'grain',  name: 'Grain',  emoji: '🌾', description: 'Surplus harvest from river provinces. Fuels large armies.' },
        { id: 'faith',  name: 'Faith',  emoji: '☀️', description: 'Devotion to the Sun God. Powers priestly buildings and elite blessings.' },
      ],
    },
    unitEmoji: '🦎',
    loreTag: 'Divine',
    playstyle: 'Tall/Wide hybrid. River provinces give food bonuses. Strong heavy infantry. Faith buffs armies.',
  },
  {
    id: 'draig',
    name: 'Y Draig Goch',          // Welsh: "The Red Dragon"
    fullName: 'Humans — Dragon Worshippers',
    description:
      'Humans from the north-western isles who worship red dragons. ' +
      'Honor-bound with strict social hierarchy. They prefer death to dishonor. ' +
      'Think of dragon-worshipping samurai.',
    emoji: '🐉',
    flagImg: 'assets/flags/draig.png',
    unitCardBgImg: 'assets/cards/backgrounds/draig-unit-bg.png',
    color: '#7A1010',              // deep dragon-red
    borderColor: '#601010',
    textColor: '#e04020',
    resources: {
      basic:    { id: 'gold',           name: 'Gold',           emoji: '🪙', description: 'Universal currency.' },
      advanced: [
        { id: 'honor',          name: 'Honor',          emoji: '⚔️',  description: 'Gained through victories. Unlocks elite samurai-dragon infantry.' },
        { id: 'dragon_essence', name: 'Dragon Essence', emoji: '🔥', description: 'Sacred dragon fire. Powers draconic blessings and siege weapons.' },
      ],
    },
    unitEmoji: '🐉',
    loreTag: 'Honorbound',
    playstyle: 'Aggressive. Honor income from combat. Strong shock cavalry. Dragon Essence unlocks late-game units.',
  },
];

/** Lookup by id */
export const FACTION_MAP = Object.fromEntries(FACTIONS.map(f => [f.id, f]));

/** The neutral/unclaimed "faction" (not a real faction — just a sentinel) */
export const NEUTRAL = {
  id: 'neutral',
  name: 'Unclaimed',
  emoji: '⬜',
  color: '#2a2a20',
  borderColor: '#3a3a28',
  textColor: '#888880',
};
