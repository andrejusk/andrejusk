// Builds assets/cover-dark.svg and assets/cover-light.svg — the profile README
// cover: a (completed) `fastfetch` run in a Ghostty-fullscreen terminal window.
// Every glyph is baked into <path> data with opentype.js so it renders on GitHub
// with no fonts installed and survives the Camo image proxy. The README pairs the
// two variants with <picture> so it follows the viewer's light/dark theme.
//
//   node build.mjs            # writes ../../assets/cover-{dark,light}.svg
//
// Fonts: Fira Mono (OFL) in ./fonts. The role line shows GitHub's :octocat:
// (trademark of GitHub) embedded from octocat.png. See LICENSES.md.
// The `uptime` row reads $COVER_UPTIME if set by CI, else a static fallback.
// The `visits` sparkline is fetched live from the public pixel.andrejus.dev /ticker
// API at build time (set $COVER_VISITS_FILE to a JSON snapshot to build offline).
// It degrades to nothing if the data can't be fetched — unless $COVER_REQUIRE_VISITS
// is set (CI), in which case the build fails rather than overwrite a good cover.
import opentype from 'opentype.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FONT = (f) => join(HERE, 'fonts', f);
const out = (name) => join(HERE, '..', '..', 'assets', name);

const load = (p) => { const b = readFileSync(p); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const med = load(FONT('FiraMono-Medium.ttf'));
const bold = load(FONT('FiraMono-Bold.ttf'));

// official GitHub :octocat: emoji (githubassets), embedded as a base64 data URI.
const octocatURI = 'data:image/png;base64,' + readFileSync(join(HERE, 'octocat.png')).toString('base64');
const octocat = (x, y, size) =>
  `<image x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size}" height="${size}" href="${octocatURI}"/>`;

// ---- palettes (dotfiles dots-dark / dots-light Ghostty themes) ------------
const THEMES = {
  dark:  { bg: '#0A0A0A', stroke: '#1d231d', text: '#CCE0D0', grey: '#808080', teal: '#2CB494', blue: '#7290B8' },
  light: { bg: '#F6F0DE', stroke: '#DED3B8', text: '#3C4A50', grey: '#808080', teal: '#1A8A72', blue: '#3C5C94' },
};

const adv = (font, size) => font.getAdvanceWidth('M', size);

// opentype.js 2.x toPathData() emits NaN coords for some glyphs at certain target
// sizes; render at the native em (1000) and scale down via transform (always clean).
const RS = 1000;
function words(font, text, x, y, size) {
  const sc = size / RS, cw = adv(font, size);
  let s = '', i = 0;
  while (i < text.length) {
    if (text[i] === ' ') { i++; continue; }
    let j = i; while (j < text.length && text[j] !== ' ') j++;
    const word = text.slice(i, j);
    const d = font.getPath(word, 0, 0, RS).toPathData(1);
    if (d && d.length > 2)
      s += `<path d="${d}" transform="translate(${(x + i * cw).toFixed(2)} ${y.toFixed(2)}) scale(${sc.toFixed(5)})"/>`;
    i = j;
  }
  return s;
}
const T = (font, text, x, y, size, fill) => `<g fill="${fill}">${words(font, text, x, y, size)}</g>`;

// ---- visits sparkline (live from pixel.andrejus.dev /ticker, baked at build) --
const WEEKS = 13; // most-recent complete weeks to plot (~last 3 months)
const MONTHS = Math.max(1, Math.round((WEEKS * 7) / 30.44));
const TICKER = process.env.COVER_TICKER ??
  'https://pixel.andrejus.dev/ticker?key=andrejusk-profile&interval=604800000';
async function fetchVisits() {
  try {
    const file = process.env.COVER_VISITS_FILE; // optional snapshot for offline builds
    let result;
    if (file) {
      result = JSON.parse(readFileSync(file)).result;
    } else {
      const res = await fetch(TICKER, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`ticker HTTP ${res.status}`);
      result = (await res.json()).result;
    }
    if (!result || result.length < 2) return null;
    const counts = result.map(([, v]) => parseInt(v));
    const bars = counts.slice(0, -1).slice(-WEEKS); // drop current partial week
    const recent = bars.reduce((a, b) => a + b, 0); // sum of exactly the bars shown
    return { bars, recent };
  } catch (err) {
    console.warn('visits unavailable:', err.message);
    return null;
  }
}
// a sparkline drawn with Fira Mono block-element glyphs (▁▂▃▄▅▆▇█) — exactly how a
// terminal sparkline (e.g. `spark`) prints it, baked into the card's own font.
const TICKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
function sparkChars(values) {
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  return values.map((v) => TICKS[Math.round(((v - min) / range) * (TICKS.length - 1))]).join('');
}

// ---------------------------------------------------------------- the cover --
function buildCover(theme, visits) {
  const C = THEMES[theme];
  const size = 19, cw = adv(med, size);
  const rs = 18, rcw = adv(med, rs);
  const tx = 40;
  const prompt = '~/andrejusk';
  const lamI = prompt.length + 1;
  const cmdX = tx + (lamI + 2) * cw;
  const promptLine = (y) => T(med, prompt, tx, y, size, C.teal) + T(med, 'λ', tx + lamI * cw, y, size, C.teal);

  // line 1 — the prompt with `fastfetch` already run (static; content visible at once)
  const y1 = 62;
  const cmdLine = promptLine(y1) + T(med, 'fastfetch', cmdX, y1, size, C.text);

  // right column — tagline + a few key:value rows (plain text, no icons)
  const gx = 310, kx = gx + 11 * rcw, lh = 25;
  const groupA = [
    ['role',      'Software Engineer @ GitHub'],
    ['focus',     'web · platform · accessibility'],
    ['interests', 'AI agents · MCP tools · productivity software'],
  ];
  const groupB = [
    ['langs',  'TypeScript · Ruby · Python'],
    ['uptime', process.env.COVER_UPTIME ?? '12 yrs on GitHub'],
  ];
  const row = (k, val, ry) => T(med, k, gx, ry, rs, C.blue) + T(med, val, kx, ry, rs, C.text);

  const gyTag = 100, sepY = gyTag + 18;
  let info = '';
  info += T(med, 'I build developer tools and accessible interfaces', gx, gyTag, size, C.text);
  info += `<line x1="${gx}" y1="${sepY}" x2="${gx + 600}" y2="${sepY}" stroke="${C.grey}" stroke-width="1.1"/>`;
  let y = sepY + 26;
  const roleY = y;
  groupA.forEach(([k, v]) => { info += row(k, v, y); y += lh; });
  y += 13;
  groupB.forEach(([k, v]) => { info += row(k, v, y); y += lh; });

  // visits — a sparkline of the last ~3 months (1 block/week) printed in the card's own
  // Fira Mono block glyphs, plus that window's visit count.
  if (visits) {
    const spark = sparkChars(visits.bars);
    info += T(med, 'visits', gx, y, rs, C.blue);
    info += T(med, spark, kx, y, rs, C.teal);
    info += T(med, `${visits.recent.toLocaleString('en-US')} · weekly · last ${MONTHS}mo`, kx + (spark.length + 1) * rcw, y, rs, C.text);
    y += lh;
  }

  info += octocat(kx + med.getAdvanceWidth(groupA[0][1], rs) + 0.4 * rcw, roleY - 16, 21);
  const infoBottom = y;

  // logo (slant figlet "ak"), vertically centred against the info block
  const logo = [
    '         __  ',
    '  ____ _/ /__',
    " / __ `/ //_/",
    '/ /_/ / ,<   ',
    '\\__,_/_/|_|  ',
  ];
  const logoLH = 35;
  const logoStart = Math.round((gyTag - 18 + infoBottom) / 2 - (logo.length * logoLH) / 2 + 20);
  let logoSvg = '';
  logo.forEach((ln, i) => { logoSvg += T(bold, ln, tx, logoStart + i * logoLH, 30, C.teal); });

  // fresh prompt + blinking cursor — the only animation (CSS, reduced-motion aware)
  const y3 = infoBottom + 36;
  const cursor = `<rect class="cur" x="${cmdX}" y="${y3 - 16}" width="${cw.toFixed(1)}" height="22" fill="${C.text}"/>`;
  const newPrompt = promptLine(y3) + cursor;

  const w = 970, h = y3 + 30;
  const windowBg = `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="14" fill="${C.bg}" stroke="${C.stroke}"/>`;
  const style = `<style>
  .cur{animation:blink 1.06s linear infinite}
  @keyframes blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}
  @media (prefers-reduced-motion:reduce){.cur{animation:none}}
</style>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Fira Mono" role="img">
<title>Andrejus — Software Engineer at GitHub. I build developer tools and accessible interfaces.</title>
${style}
${windowBg}
${cmdLine}
${logoSvg}
${info}
${newPrompt}
</svg>
`;
}

const visits = await fetchVisits();
if (!visits && process.env.COVER_REQUIRE_VISITS) {
  throw new Error('visits data required but unavailable — refusing to overwrite the cover');
}
mkdirSync(dirname(out('x')), { recursive: true });
for (const theme of ['dark', 'light']) {
  const file = out(`cover-${theme}.svg`);
  writeFileSync(file, buildCover(theme, visits));
  console.log('wrote', file, visits ? `(visits: ${visits.recent} over ${WEEKS}w)` : '(no visits)');
}
