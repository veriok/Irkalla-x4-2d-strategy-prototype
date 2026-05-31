# Irkallia X4 2D Strategy Prototype

## Card Art Specification

### Native Card Resolution
- Recommended native card size: 320x480 px
- Aspect ratio: 2:3
- Preferred format: PNG with transparency for unit foreground sprites

### In-Game Scaling
- Compact panel cards are rendered at CSS size 36x54 px.
- Source PNG art is scaled to destination card bounds automatically.
- Queue cards also preserve 2:3 ratio and scale to available slot width.
- Unit tooltip preview uses native card dimensions (320x480 container).

### Card Art Composition
- Unit cards: faction background PNG + unit sprite PNG layered on top.
- Building cards: static composite card PNG.
- Location cards: static composite card PNG.

### Faction Banner Flags
- Faction flags are rendered in the top-left faction banner.
- If a flag image is missing or fails to load, faction emoji is shown instead.

### Asset Path Conventions (Explicit Fields)
Paths are defined directly in game data files.

- Faction flags:
  - assets/flags/<faction>.png
- Unit card backgrounds:
  - assets/cards/backgrounds/<faction>-unit-bg.png
- Unit card sprites:
  - assets/cards/units/<unit_id>.png
- Building cards:
  - assets/cards/buildings/<building_id>.png
- Location cards:
  - assets/cards/locations/<location_type>.png

### Fallback Behavior
- If image fields are undefined, emoji/icon fallback is used.
- If an image path is defined but the image fails to load, fallback is used.
- Fallback is per-card and does not block rendering of other cards.
