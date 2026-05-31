/**
 * event-log.js
 *
 * Appends log entries to the bottom bar event log.
 */

import { showCombatReportModal } from './modal.js';

const logEl = document.getElementById('event-log');
const MAX_ENTRIES = 80;

function addEntry(text, cssClass = '') {
  const entry = document.createElement('div');
  entry.className = `log-entry${cssClass ? ' ' + cssClass : ''} new`;
  entry.textContent = text;
  logEl.prepend(entry);
  // Remove animation class after it plays
  setTimeout(() => entry.classList.remove('new'), 300);
  // Trim old entries
  while (logEl.children.length > MAX_ENTRIES) {
    logEl.removeChild(logEl.lastChild);
  }
}

export function logTurn(turnNumber) {
  addEntry(`── Turn ${turnNumber} ──────────────────`, 'log-turn');
}

export function logBuild(factionName, buildingName, provinceName) {
  addEntry(`🏗 ${factionName}: ${buildingName} completed in ${provinceName}.`, 'log-build');
}

export function logRecruit(factionName, unitName, count, provinceName) {
  addEntry(`⚔ ${factionName}: ${count}× ${unitName} recruited in ${provinceName}.`, 'log-build');
}

export function logCombat(result) {
  const entry = document.createElement('div');
  entry.className = 'log-entry log-combat new';

  if (result.reportId) {
    const btn = document.createElement('button');
    btn.className = 'log-combat-link';
    btn.textContent = result.summary;
    btn.dataset.reportId = result.reportId;
    btn.addEventListener('click', () => showCombatReportModal(result.reportId));
    entry.appendChild(btn);
  } else {
    entry.textContent = result.summary;
  }

  logEl.prepend(entry);
  setTimeout(() => entry.classList.remove('new'), 300);
  while (logEl.children.length > MAX_ENTRIES) logEl.removeChild(logEl.lastChild);
}

export function logCapture(attackerName, provinceName) {
  addEntry(`🏴 ${attackerName} captured ${provinceName}!`, 'log-capture');
}

export function logElimination(factionName) {
  addEntry(`💀 ${factionName} has been eliminated!`, 'log-elim');
}

export function logMessage(text) {
  addEntry(text);
}
