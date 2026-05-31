/**
 * card-renderer.js
 *
 * Shared helper for image-backed game cards with emoji/icon fallback.
 * Cards default to fallback content and switch to media mode when any image loads.
 */

function _makeImage(className, src, onAnyImageLoaded) {
  if (!src) return null;
  const img = document.createElement('img');
  img.className = className;
  img.alt = '';
  img.decoding = 'async';
  img.loading = 'lazy';
  img.src = src;
  img.addEventListener('load', () => onAnyImageLoaded());
  img.addEventListener('error', () => {
    img.remove();
  });
  return img;
}

/**
 * Build a card element with optional media layers.
 *
 * @param {Object} opts
 * @param {string} [opts.variant='unit']         BEM variant suffix for .game-card--{variant}
 * @param {string} [opts.extraClass='']          Extra class names
 * @param {string} [opts.fallbackIcon='?']       Emoji/icon fallback
 * @param {string} [opts.fallbackName='']        Fallback text name
 * @param {string} [opts.fallbackSub='']         Fallback sub-label
 * @param {string|null} [opts.compositeSrc=null] Single card art image (buildings/locations)
 * @param {string|null} [opts.backgroundSrc=null] Background card layer (faction frame)
 * @param {string|null} [opts.foregroundSrc=null] Foreground card layer (unit sprite)
 * @param {boolean} [opts.wounded=false]         Adds wounded card style
 * @returns {HTMLDivElement}
 */
export function createCard(opts = {}) {
  const {
    variant = 'unit',
    extraClass = '',
    fallbackIcon = '?',
    fallbackName = '',
    fallbackSub = '',
    compositeSrc = null,
    backgroundSrc = null,
    foregroundSrc = null,
    wounded = false,
  } = opts;

  const card = document.createElement('div');
  const woundedClass = wounded ? ' game-card--wounded' : '';
  const extra = extraClass ? ` ${extraClass}` : '';
  card.className = `game-card game-card--${variant}${woundedClass}${extra}`;

  const media = document.createElement('div');
  media.className = 'game-card__media';

  const onAnyImageLoaded = () => {
    card.classList.add('game-card--has-media');
  };

  const compositeImg = _makeImage('game-card__img game-card__img--composite', compositeSrc, onAnyImageLoaded);
  if (compositeImg) media.appendChild(compositeImg);

  const bgImg = _makeImage('game-card__img game-card__img--bg', backgroundSrc, onAnyImageLoaded);
  if (bgImg) media.appendChild(bgImg);

  const fgImg = _makeImage('game-card__img game-card__img--fg', foregroundSrc, onAnyImageLoaded);
  if (fgImg) media.appendChild(fgImg);

  const fallback = document.createElement('div');
  fallback.className = 'game-card__fallback';
  fallback.innerHTML = `
    <div class="game-card__icon">${fallbackIcon}</div>
    <div class="game-card__name">${fallbackName}</div>
    <div class="game-card__sub">${fallbackSub}</div>
  `;

  media.appendChild(fallback);
  card.appendChild(media);
  return card;
}

/**
 * Build a larger 2:3 card preview for tooltip display.
 * Uses same media/fallback rules as regular cards.
 */
export function createNativePreviewCard(opts = {}) {
  const card = createCard({ ...opts, variant: 'preview', extraClass: 'game-card--native-preview' });
  return card;
}
