# cover build

Generates [`assets/cover-dark.svg`](../../assets/cover-dark.svg) and
[`assets/cover-light.svg`](../../assets/cover-light.svg) — the profile README cover:
a fake `fastfetch` run in a Ghostty-fullscreen terminal window. The README pairs the
two variants with `<picture>` so the card follows the viewer's light/dark theme.

```sh
npm ci
npm run build      # writes ../../assets/cover-{dark,light}.svg
```

## How it works

- Text is baked into `<path>` data with
  [`opentype.js`](https://github.com/opentypejs/opentype.js), so the SVG renders on
  GitHub with **no fonts installed** and survives the Camo image proxy.
- The only animation is a blinking cursor (**CSS**, which respects
  `prefers-reduced-motion`) — no JS, which GitHub strips from `<img>`-embedded SVGs.
- `opentype.js` 2.x can emit `NaN` coordinates at certain target sizes, so glyphs are
  laid out at the font em (1000 units) and scaled down via `transform` — see the note in
  `build.mjs`.
- Colours are the [dotfiles](https://github.com/andrejusk/dotfiles) `dots-dark` /
  `dots-light` palettes (from `~/.config/ghostty/themes`).
- The `visits` row is a sparkline of the last ~3 months of profile visits (one Fira Mono
  block glyph per week, like a terminal `spark`) plus the visit count over that window,
  fetched **live at build time** from the public `pixel.andrejus.dev` `/ticker` API. No
  data is committed; it degrades to nothing if the fetch fails (set `$COVER_VISITS_FILE`
  to a JSON snapshot to build offline, or `$COVER_REQUIRE_VISITS=1` to fail instead).
- An `<img>`-embedded SVG exposes only its `alt` to assistive tech, so the build also
  writes the card's description — including the live visits stat — into the cover `<img>`
  `alt` in the top-level `README.md`, keeping the screen-reader text in sync.

## CI

`.github/workflows/cover.yml` runs on every push that touches `tools/cover/**` and on a
weekly schedule. It runs `npm ci && npm run build` (which fetches the visits live, with
`$COVER_REQUIRE_VISITS` set so a failed fetch can't overwrite a good cover) and commits
`assets/cover-*.svg` if they changed. The visits pixel itself is the invisible `<img>` at
the bottom of the profile README — each profile view ticks the series the sparkline draws from.

## Fonts

Bundled in `fonts/`: Fira Mono (OFL), Medium weight. The `uptime` row can be
made dynamic by setting `$COVER_UPTIME` in CI. To refresh the fonts, run `./fonts.sh`
(needs `curl`).

See [`LICENSES.md`](./LICENSES.md) for font and emoji attributions.
