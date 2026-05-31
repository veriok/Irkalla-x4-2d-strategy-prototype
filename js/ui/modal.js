/**
 * modal.js
 *
 * Reusable modal dialog for game-over, confirm, etc.
 */

const overlayEl  = document.getElementById('modal-overlay');
const titleEl    = document.getElementById('modal-title');
const bodyEl     = document.getElementById('modal-body');
const buttonsEl  = document.getElementById('modal-buttons');

/**
 * Show a modal dialog.
 * @param {string} title
 * @param {string} body
 * @param {Array<{label:string, primary?:boolean, danger?:boolean, onClick:Function}>} buttons
 */
export function showModal(title, body, buttons = []) {
  titleEl.textContent = title;
  bodyEl.innerHTML = '';
  if (body instanceof Node) {
    bodyEl.appendChild(body);
  } else {
    bodyEl.textContent = body;
  }
  buttonsEl.innerHTML = '';

  for (const btn of buttons) {
    const el = document.createElement('button');
    el.className = btn.danger ? 'btn-danger' : 'btn-primary';
    el.textContent = btn.label;
    el.addEventListener('click', () => {
      overlayEl.hidden = true;
      if (btn.onClick) btn.onClick();
    });
    buttonsEl.appendChild(el);
  }

  overlayEl.hidden = false;
}

/**
 * Show a confirmation modal.
 * @param {string} title
 * @param {string} body
 * @param {Function} onConfirm
 * @param {Function} [onCancel]
 */
export function confirmModal(title, body, onConfirm, onCancel) {
  showModal(title, body, [
    { label: 'Confirm', primary: true, onClick: onConfirm },
    { label: 'Cancel', danger: false, onClick: onCancel ?? (() => {}) },
  ]);
}

/** Hide the modal. */
export function hideModal() {
  overlayEl.hidden = true;
}

// Close on overlay click (outside box)
overlayEl.addEventListener('click', e => {
  if (e.target === overlayEl) hideModal();
});
