/**
 * notifications.js
 *
 * Player-only notification queue. Engine code calls queueNotification(); the
 * UI calls flushNotifications() at the start of each player turn to show them,
 * and clearNotifications() when the player ends their turn.
 *
 * Icon paths: assets/notifications/<type>.png (placeholder until PNGs are provided).
 */

import { NOTIFICATION_TYPES } from '../data/enums.js';

const _queue = [];

const ICON_PLACEHOLDERS = {
  [NOTIFICATION_TYPES.WAR_DECLARED]:      '⚔️',
  [NOTIFICATION_TYPES.SURPRISE_WAR]:      '💀',
  [NOTIFICATION_TYPES.PROVINCE_LOST]:     '🏴',
  [NOTIFICATION_TYPES.HERO_CAN_LEVEL]:    '⭐',
  [NOTIFICATION_TYPES.PROPOSAL_RECEIVED]: '📜',
};

/**
 * Queue a notification for the player.
 * @param {string} type - NOTIFICATION_TYPES value
 * @param {{ title: string, body: string, payload: object }} data
 */
export function queueNotification(type, { title, body, payload = {} } = {}) {
  const iconPath = `assets/notifications/${type}.png`;
  const iconFallback = ICON_PLACEHOLDERS[type] ?? '❗';
  _queue.push({ id: `${Date.now()}-${Math.random()}`, type, title, body, iconPath, iconFallback, payload });
  flushNotifications();
}

export function flushNotifications() {
  if (!_queue.length) return;
  const batch = _queue.splice(0);
  import('../ui/notification-toasts.js').then(({ showToasts }) => showToasts(batch));
}

/** Clear visible toasts from the DOM (called on end-turn). Does not affect the queue. */
export function clearNotifications() {
  import('../ui/notification-toasts.js').then(({ clearToasts }) => clearToasts());
}
