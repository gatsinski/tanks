# Asset Style Guide

All game art follows one look: **flat, bold, top-down vector art** with a few
saturated colors, simple shapes and a light outline that picks out the edges.
Use this guide when drawing assets by hand or when prompting an AI to generate
them. Paste the "Prompt template" section into the prompt.

## Format

| Asset type        | Canvas  | `viewBox`   | Notes                                        |
| ----------------- | ------- | ----------- | -------------------------------------------- |
| Map tiles         | 40 × 40 | `0 0 40 40` | Fill the full square, no transparency        |
| Tanks             | 30 × 30 | `0 0 30 30` | Transparent background, barrel points **up** |
| Boosters          | 40 × 40 | `0 0 40 40` | Rounded badge, `rx="8"`                      |
| Overlays / debris | 40 × 40 | `0 0 40 40` | Transparent background                       |

-   Write plain, hand-editable SVG: `width`, `height`, `viewBox`, `xmlns` only.
    No Inkscape/Sodipodi metadata, no `transform` chains, no inline `style=""`.
    Use `fill` and `stroke` attributes instead.
-   Use integer or `.5` coordinates.
-   Keep it under ~2 KB per file. Prefer `rect`, `circle`, `polygon` and short `path`s.
-   Use no gradients, filters, blur or text. Fake depth with flat highlight and shadow shapes.
-   Add a short `<!-- comment -->` per logical part (Treads, Hull, Turret…).

## Lighting & depth

-   The light comes from the **top-left**.
-   Each solid object gets three flat tones:
    -   **base**: the main fill
    -   **highlight**: a 1–2px strip on the top/left edge, one step lighter
    -   **shadow**: a 1–2px strip on the bottom/right edge, one step darker
-   Outline objects with a `stroke` one step **lighter** than the fill
    (for example the tank hull `#2e7d32` gets the stroke `#4caf50`). Stroke widths:
    -   tanks: `1`
    -   boosters: `2`–`2.5`
    -   fine details: `0.5`
-   Gaps between blocks (mortar, joints) are the darkest tone of that material.

## Palette

The colors are taken from the Material Design color set. Use these hex values. If you need a new
one, pick it from the same family (Material 900 / 700 / 400 shades).

### Ground & terrain

| Role           | Dark (shadow/gap) | Base      | Light (highlight) |
| -------------- | ----------------- | --------- | ----------------- |
| Floor          | —                 | `#000000` | —                 |
| Foliage (bush) | `#175e19`         | `#238226` | `#42c447`         |
| Water          | `#1e528e`         | `#3385d6` | `#7ac0ff`         |

### Walls

| Role             | Mortar / gap | Shadow    | Base      | Highlight |
| ---------------- | ------------ | --------- | --------- | --------- |
| Brick            | `#2b0000`    | `#7a1f1f` | `#a83232` | `#c95454` |
| Concrete         | `#263238`    | `#546e7a` | `#78909c` | `#b0bec5` |
| Scorched / crack | —            | `#150000` | —         | —         |

### Units

| Role                   | Dark (turret) | Base (hull) | Light (stroke/hatch) |
| ---------------------- | ------------- | ----------- | -------------------- |
| Player                 | `#1b5e20`     | `#2e7d32`   | `#4caf50`            |
| Enemy: Red             | `#7f0000`     | `#b71c1c`   | `#ff5722`            |
| Enemy: Blue            | `#0d47a1`     | `#1565c0`   | `#42a5f5`            |
| Enemy: Purple          | `#4a148c`     | `#7b1fa2`   | `#ba68c8`            |
| Enemy: Steel           | `#263238`     | `#546e7a`   | `#b0bec5`            |
| Ally (AI, player team) | `#004d40`     | `#00796b`   | `#4db6ac`            |
| Treads                 | `#1b1b1b`     | —           | `#444444`            |
| Wreckage / char        | `#211512`     | `#3e2723`   | `#ff5722` (embers)   |

### Boosters (badge fill / badge stroke)

| Booster   | Fill      | Stroke    | Icon              |
| --------- | --------- | --------- | ----------------- |
| Generic   | `#222222` | `#ffcc00` | `#ffcc00` star    |
| Speed     | `#0d47a1` | `#42a5f5` | `#ffeb3b` bolt    |
| Fire rate | `#e65100` | `#ffa726` | `#ffffff` bullets |
| Damage    | `#b71c1c` | `#ef5350` | `#ffeb3b` burst   |
| Shield    | `#006064` | `#00e5ff` | `#00b0ff` shield  |
| Repair    | `#1b5e20` | `#66bb6a` | `#ffffff` cross   |

Icons on badges use white (`#ffffff`) or yellow (`#ffeb3b`) so they stay readable.

## State chains

Each damage step changes the **same shapes**. Never redraw the object from scratch
for a new state:

-   `wall` → `damaged-wall` (same brick layout + dark cracks and chipped bricks) →
    `rubble` (broken brick shards on grass)
-   `tank` → `tank-damage-1` (scorch marks) → `tank-damage-2` (more scorch + cracks)
    → `wreckage`
-   `enemy` follows the same chain as `tank`, in enemy colors. Each team has its own
    set: `enemy-<team>.svg`, `enemy-<team>-damage-1.svg`, `enemy-<team>-damage-2.svg`
    (red team uses plain `enemy*.svg`). Damage marks keep their yellow/orange
    warning colors on every team.
-   Team colors must stay distinct from the player green and from each other.

## Naming

-   Use lowercase kebab-case: `booster-speed.svg`, `enemy-damage-1.svg`.
-   Damage states get a `-damage-N` suffix, where a higher N means more damaged.

## Prompt template

> Create a top-down SVG game asset for a 2D arcade tank game: `<describe asset>`.
> Canvas `<40x40 | 30x30>`, `viewBox="0 0 <size> <size>"`. Use flat vector
> style with no gradients, filters or text. Light comes from the top-left: a lighter
> highlight on the top/left edges and a darker shadow on the bottom/right. Outline
> with a stroke one shade lighter than the fill. Use only these colors: `<paste the relevant palette rows>`. Write plain SVG with `rect`/`circle`/`polygon`/`path`
> and a short comment per part. Keep it under 2 KB.
