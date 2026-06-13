/**
 * notification-toasts.js
 *
 * Renders queued notifications as CK3/Stellaris-style toasts in the bottom-right
 * of the map. Toasts pop in one by one (bottom first, then upward), each
 * sliding down into slot + fading in, with a glow indicator that clears on hover.
 */

import { NOTIFICATION_TYPES } from '../data/enums.js';
import { getProvince } from '../engine/game-state.js';
import { centerCameraOn } from './map-view.js';

const STAGGER_MS  = 120;
const AREA_ID     = 'notification-area';

function _area() { return document.getElementById(AREA_ID); }

// ─── Click handlers ───────────────────────────────────────

function _handleClick(type, payload) {
  switch (type) {
    case NOTIFICATION_TYPES.WAR_DECLARED: {
      import('./diplomacy-modal.js').then(({ showDiplomacyModal, triggerFlavorLine }) => {
        showDiplomacyModal(payload.factionId);
        // Override greeting with the war declaration speech line
        triggerFlavorLine(payload.factionId, 'speech.war_declared');
      });
      break;
    }
    case NOTIFICATION_TYPES.SURPRISE_WAR:
    case NOTIFICATION_TYPES.PROVINCE_LOST: {
      const prov = payload.provinceId ? getProvince(payload.provinceId) : null;
      if (prov?.centroid) centerCameraOn(prov.centroid[0], prov.centroid[1]);
      break;
    }
    case NOTIFICATION_TYPES.HERO_CAN_LEVEL: {
      import('./hero-panel.js').then(({ openHeroPanel }) => openHeroPanel());
      break;
    }
    case NOTIFICATION_TYPES.PROPOSAL_RECEIVED: {
      import('./diplomacy-modal.js').then(({ showDiplomacyModal }) => {
        showDiplomacyModal(payload.factionId);
      });
      break;
    }
  }
}

// ─── Toast DOM builder ────────────────────────────────────

function _buildToast(notification) {
  const { type, title, body, iconPath, iconFallback, payload } = notification;

  const toast = document.createElement('div');
  toast.className = 'notif-toast notif-toast--entering';
  toast.dataset.notifId = notification.id;

  // Icon
  const iconEl = document.createElement('div');
  iconEl.className = 'notif-toast__icon';
  const img = document.createElement('img');
  img.src = iconPath;
  img.alt = '';
  img.onerror = () => {
    iconEl.textContent = iconFallback;
    img.remove();
  };
  iconEl.appendChild(img);
  toast.appendChild(iconEl);

  // Text
  const textEl = document.createElement('div');
  textEl.className = 'notif-toast__text';
  const titleEl = document.createElement('div');
  titleEl.className = 'notif-toast__title';
  titleEl.textContent = title ?? '';
  const bodyEl = document.createElement('div');
  bodyEl.className = 'notif-toast__body';
  bodyEl.textContent = body ?? '';
  textEl.appendChild(titleEl);
  if (body) textEl.appendChild(bodyEl);
  toast.appendChild(textEl);

  // Dismiss button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'notif-toast__close';
  closeBtn.textContent = '×';
  closeBtn.title = 'Dismiss';
  closeBtn.addEventListener('click', e => {
    e.stopPropagation();
    _removeToast(toast);
  });
  toast.appendChild(closeBtn);

  // Click: act + dismiss
  toast.addEventListener('click', () => {
    _handleClick(type, payload);
    _removeToast(toast);
  });

  // Glow clears on hover
  toast.addEventListener('mouseenter', () => {
    toast.classList.remove('notif-toast--glow');
  });

  return toast;
}

function _removeToast(toastEl) {
  toastEl.classList.add('notif-toast--leaving');
  toastEl.addEventListener('animationend', () => toastEl.remove(), { once: true });
}

// ─── Public API ───────────────────────────────────────────

/**
 * Render a batch of notifications as toasts, staggered bottom-to-top.
 * @param {Array} notifications
 */
export function showToasts(notifications) {
  const area = _area();
  if (!area) return;

  notifications.forEach((notif, i) => {
    setTimeout(() => {
      const toast = _buildToast(notif);
      // Prepend so newest end up at the top; combined with column-reverse layout
      // in CSS, first in queue lands at the bottom.
      // Toast starts hidden; adding it to the DOM then applying --entering on the
      // next paint lets the browser register the initial state before animating.
      toast.style.opacity = '0';
      area.appendChild(toast);
      requestAnimationFrame(() => {
        toast.style.opacity = '';
        toast.classList.add('notif-toast--entering');
        // When the slide-in finishes, add the glow indicator
        toast.addEventListener('animationend', () => {
          toast.classList.remove('notif-toast--entering');
          toast.classList.add('notif-toast--glow');
        }, { once: true });
      });
    }, i * STAGGER_MS);
  });
}

/** Remove all currently visible toasts immediately (called on end-turn). */
export function clearToasts() {
  const area = _area();
  if (!area) return;
  area.innerHTML = '';
}
