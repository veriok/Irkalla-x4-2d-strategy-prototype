const STORAGE_KEY = 'irkalla_font_size';
const DEFAULT_SIZE = 14;

const overlay = document.getElementById('settings-modal-overlay');
const btns = document.querySelectorAll('.settings-font-btn');

function applyFontSize(size) {
  document.documentElement.style.fontSize = size + 'px';
  btns.forEach(b => b.classList.toggle('active', Number(b.dataset.size) === size));
}

function loadSetting() {
  const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
  applyFontSize(saved || DEFAULT_SIZE);
}

document.getElementById('settings-btn').addEventListener('click', () => {
  overlay.hidden = false;
});

document.getElementById('settings-close').addEventListener('click', () => {
  overlay.hidden = true;
});

overlay.addEventListener('click', e => {
  if (e.target === overlay) overlay.hidden = true;
});

btns.forEach(btn => {
  btn.addEventListener('click', () => {
    const size = Number(btn.dataset.size);
    applyFontSize(size);
    localStorage.setItem(STORAGE_KEY, size);
  });
});

loadSetting();
