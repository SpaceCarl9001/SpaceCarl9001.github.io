// Everything the scene paints itself: road, grass, mountains, glows,
// and the highway signs / billboards generated from content.js.

const F = {
  sign: '"Overpass", "Inter", system-ui, sans-serif',
  display: '"Space Grotesk", "Inter", system-ui, sans-serif',
  body: '"Inter", system-ui, sans-serif',
};

export const SIGN_SIZE = { billboard: [1280, 720], gantry: [1600, 600] };

/* ───────────────────────── helpers ───────────────────────── */

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

/** Small deterministic PRNG so the world looks the same on every visit. */
export function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function spacing(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

/** Shrinks the font until `text` fits in maxW. Returns the final size. */
function fit(ctx, text, weight, size, family, maxW, min = 28) {
  let s = size;
  for (;;) {
    ctx.font = `${weight} ${s}px ${family}`;
    if (ctx.measureText(text).width <= maxW || s <= min) return s;
    s -= 4;
  }
}

/** Word-wraps text (textBaseline must be 'top'). Returns the y below the last line. */
function wrap(ctx, text, x, y, maxW, lh, maxLines = 99) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxW && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '));
    lines[maxLines - 1] = `${last}…`;
  }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return y + lines.length * lh;
}

function countLines(ctx, text, font, maxW) {
  ctx.font = font;
  let lines = 1, line = '';
  for (const word of String(text).split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) { lines++; line = word; } else line = test;
  }
  return lines;
}

/**
 * Draws a headline that stays readable from the road: one line if it fits at a decent size,
 * otherwise two big lines. Returns the y just below it.
 */
function bigTitle(ctx, text, x, y, maxW, maxSize) {
  const one = fit(ctx, text, 700, maxSize, F.display, maxW);
  if (one >= maxSize * 0.8) {
    ctx.fillText(text, x, y);
    return y + one;
  }
  let size = Math.round(maxSize * 0.86);
  while (size > 60 && countLines(ctx, text, `700 ${size}px ${F.display}`, maxW) > 2) size -= 4;
  ctx.font = `700 ${size}px ${F.display}`;
  return wrap(ctx, text, x, y - 6, maxW, size * 1.04, 2) - 4;
}

function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

function chips(ctx, items, x, y, maxW, o) {
  const { size = 34, padX = 24, h = 64, gap = 14, fill, stroke, color, maxRows = 3 } = o;
  ctx.font = `600 ${size}px ${F.body}`;
  ctx.textBaseline = 'middle';
  let cx = x;
  let row = 0;
  for (const item of items || []) {
    const w = ctx.measureText(item).width + padX * 2;
    if (cx + w > x + maxW && cx > x) {
      row += 1;
      cx = x;
      if (row >= maxRows) { row -= 1; break; }
    }
    const cy = y + row * (h + gap);
    rr(ctx, cx, cy, w, h, h / 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = color;
    ctx.fillText(item, cx + padX, cy + h / 2 + 2);
    cx += w + gap;
  }
  ctx.textBaseline = 'top';
  return y + (row + 1) * (h + gap);
}

const withAlpha = (hex, a) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

function vignette(ctx, w, h, strength = 0.22) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Canvas text needs the web fonts loaded first; give up after a few seconds. */
export function loadFonts() {
  if (!document.fonts?.load) return Promise.resolve();
  const faces = ['800 100px Overpass', '700 100px Overpass', '600 60px Overpass', '700 100px "Space Grotesk"', '400 40px Inter', '600 40px Inter'];
  return Promise.race([
    Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null))),
    new Promise((r) => setTimeout(r, 3500)),
  ]);
}

/* ───────────────────────── highway gantry signs ───────────────────────── */

function signBase(ctx, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  const sheen = ctx.createLinearGradient(0, 0, w, h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
  rr(ctx, 22, 22, w - 44, h - 44, 30);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 9;
  ctx.stroke();
}

function arrowUp(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + w * 0.62);
  ctx.lineTo(x + w * 0.66, y + w * 0.62);
  ctx.lineTo(x + w * 0.66, y + h);
  ctx.lineTo(x + w * 0.34, y + h);
  ctx.lineTo(x + w * 0.34, y + w * 0.62);
  ctx.lineTo(x, y + w * 0.62);
  ctx.closePath();
  ctx.fill();
}

function pin(ctx, cx, cy, r, holeColor) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.78, Math.PI * 0.22);
  ctx.lineTo(cx, cy + r * 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = holeColor;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

function drawStart(ctx, w, h, s) {
  signBase(ctx, w, h, '#0e6b3e');
  ctx.fillStyle = '#fff';
  ctx.font = `700 44px ${F.sign}`;
  spacing(ctx, 6);
  ctx.fillText(s.kicker.toUpperCase(), 92, 70);
  spacing(ctx, 0);
  const size = fit(ctx, s.title, 800, 168, F.sign, w - 520);
  ctx.fillText(s.title, 86, 128 + (168 - size) * 0.5);
  fit(ctx, s.subtitle, 600, 58, F.sign, w - 520);
  ctx.fillText(s.subtitle, 92, 312);
  ctx.fillRect(92, h - 158, w - 520, 6);
  spacing(ctx, 2);
  fit(ctx, s.signLine.toUpperCase(), 700, 46, F.sign, w - 520);
  ctx.fillText(s.signLine.toUpperCase(), 92, h - 126);
  spacing(ctx, 0);
  arrowUp(ctx, w - 300, 110, 170, h - 220);
  vignette(ctx, w, h, 0.12);
}

function drawEnd(ctx, w, h, s) {
  signBase(ctx, w, h, '#1d4f9e');
  ctx.fillStyle = '#fff';
  ctx.font = `700 44px ${F.sign}`;
  spacing(ctx, 6);
  ctx.fillText('DESTINATION', 92, 70);
  spacing(ctx, 0);
  const size = fit(ctx, s.title, 800, 136, F.sign, w - 480);
  ctx.fillText(s.title, 88, 136 + (136 - size) * 0.5);
  ctx.font = `600 60px ${F.sign}`;
  fit(ctx, s.email, 600, 60, F.sign, w - 480);
  ctx.fillText(s.email, 92, 300);
  ctx.fillRect(92, h - 158, w - 480, 6);
  ctx.font = `700 44px ${F.sign}`;
  spacing(ctx, 2);
  const line = (s.links || []).map((l) => l.label.toUpperCase()).join('   ·   ');
  ctx.fillText(line, 92, h - 126);
  spacing(ctx, 0);
  ctx.fillStyle = '#fff';
  pin(ctx, w - 210, 230, 100, '#1d4f9e');
  vignette(ctx, w, h, 0.12);
}

/* ───────────────────────── roadside billboards ───────────────────────── */

function drawAbout(ctx, w, h, s, photo) {
  const accent = s.accent;
  ctx.fillStyle = '#f6f1e7';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 30, h);
  // subtle paper grain
  const rand = mulberry32(3);
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.035})`;
    ctx.fillRect(rand() * w, rand() * h, 2, 2);
  }

  ctx.fillStyle = accent;
  ctx.font = `700 34px ${F.display}`;
  spacing(ctx, 5);
  ctx.fillText(s.kicker.toUpperCase(), 92, 78);
  spacing(ctx, 0);
  ctx.fillStyle = '#141414';
  const size = fit(ctx, s.title, 700, 100, F.display, 700);
  ctx.fillText(s.title, 88, 128);
  ctx.fillStyle = '#3d3a35';
  ctx.font = `400 40px ${F.body}`;
  wrap(ctx, s.summary, 92, 128 + size + 30, 680, 56, 4);

  (s.facts || []).slice(0, 3).forEach((f, i) => {
    const x = 92 + i * 236;
    ctx.fillStyle = '#8c8270';
    ctx.font = `600 24px ${F.body}`;
    spacing(ctx, 3);
    ctx.fillText(f.label.toUpperCase(), x, h - 142);
    spacing(ctx, 0);
    ctx.fillStyle = '#141414';
    fit(ctx, f.value, 700, 36, F.display, 214, 20);
    ctx.fillText(f.value, x, h - 106);
  });

  const cx = 1010, cy = 330, r = 170;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.setLineDash([22, 16]);
  ctx.beginPath();
  ctx.arc(cx, cy, r + 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (photo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    const k = Math.max((2 * r) / photo.width, (2 * r) / photo.height);
    ctx.drawImage(photo, cx - (photo.width * k) / 2, cy - (photo.height * k) / 2, photo.width * k, photo.height * k);
    ctx.restore();
  } else {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 140px ${F.display}`;
    ctx.fillText(s.initials || '', cx, cy + 8);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }
  vignette(ctx, w, h);
}

function drawSkill(ctx, w, h, s) {
  const accent = s.accent;
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0b1222');
  bg.addColorStop(1, '#162142');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w - 160, 120, 10, w - 160, 120, 520);
  glow.addColorStop(0, withAlpha(accent, 0.32));
  glow.addColorStop(1, withAlpha(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  // faint grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  ctx.fillStyle = withAlpha(accent, 0.12);
  ctx.font = `700 380px ${F.display}`;
  ctx.textAlign = 'right';
  ctx.fillText(String(s.number).padStart(2, '0'), w - 40, 10);
  ctx.textAlign = 'left';

  ctx.fillStyle = accent;
  ctx.font = `700 32px ${F.display}`;
  spacing(ctx, 5);
  ctx.fillText(s.kicker.toUpperCase(), 92, 78);
  spacing(ctx, 0);
  ctx.fillStyle = '#ffffff';
  const size = fit(ctx, s.title, 700, 112, F.display, 1000);
  ctx.fillText(s.title, 88, 124);
  ctx.fillStyle = '#b9c3d6';
  ctx.font = `400 38px ${F.body}`;
  const y = wrap(ctx, s.summary, 92, 124 + size + 22, 1000, 52, 2);
  chips(ctx, s.chips, 92, y + 34, 1100, { fill: 'rgba(255,255,255,0.06)', stroke: accent, color: '#ffffff', maxRows: 3 });
  ctx.fillStyle = accent;
  ctx.fillRect(0, h - 14, w, 14);
  vignette(ctx, w, h, 0.3);
}

function drawProject(ctx, w, h, s) {
  const accent = s.accent;
  ctx.fillStyle = '#fbfaf7';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = withAlpha(accent, 0.14);
  ctx.beginPath();
  ctx.arc(w - 60, h + 40, 360, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(w - 60, h + 40, 250, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = withAlpha(accent, 0.45);
  ctx.lineWidth = 14;
  for (let i = -20; i < 20; i++) {
    ctx.beginPath();
    ctx.moveTo(w - 400 + i * 40, h + 400);
    ctx.lineTo(w + 100 + i * 40, h - 300);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, 20);

  ctx.font = `700 32px ${F.display}`;
  spacing(ctx, 5);
  ctx.fillText(s.kicker.toUpperCase(), 92, 80);
  spacing(ctx, 0);
  ctx.fillStyle = '#111111';
  const titleBottom = bigTitle(ctx, s.title, 88, 126, 1100, 116);
  ctx.fillStyle = '#45454a';
  ctx.font = `400 42px ${F.body}`;
  const y = wrap(ctx, s.summary, 92, titleBottom + 24, 960, 58, titleBottom > 260 ? 2 : 3);
  chips(ctx, s.chips, 92, y + 30, 960, { fill: withAlpha(accent, 0.16), color: '#141414', maxRows: 2 });
  vignette(ctx, w, h, 0.18);
}

function drawJob(ctx, w, h, s) {
  const accent = s.accent;
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#12203a');
  bg.addColorStop(1, '#1d3459');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 18;
  for (let x = -h; x < w; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + h, 0);
    ctx.stroke();
  }
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 28, h);

  if (/present/i.test(s.kicker)) {
    ctx.font = `700 28px ${F.sign}`;
    spacing(ctx, 4);
    const label = 'CURRENT ROLE';
    const bw = ctx.measureText(label).width + 48;
    rr(ctx, w - bw - 60, 56, bw, 54, 27);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.fillStyle = '#0b1220';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w - bw - 36, 85);
    ctx.textBaseline = 'top';
    spacing(ctx, 0);
  }

  ctx.fillStyle = accent;
  ctx.font = `700 32px ${F.display}`;
  spacing(ctx, 5);
  ctx.fillText(s.kicker.toUpperCase(), 92, 74);
  spacing(ctx, 0);
  ctx.fillStyle = '#ffffff';
  const bottom = bigTitle(ctx, s.title, 88, 130, 1090, 104);
  ctx.fillStyle = '#c8d3e6';
  fit(ctx, s.subtitle, 600, 40, F.body, 1090);
  ctx.fillText(s.subtitle, 92, bottom + 20);
  chips(ctx, s.chips, 92, bottom + 96, 1100, { stroke: accent, fill: 'rgba(255,255,255,0.05)', color: '#ffffff', maxRows: 2 });
  vignette(ctx, w, h, 0.3);
}

function drawTimeline(ctx, w, h, s) {
  const accent = '#3b6fb6';
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1d3459';
  ctx.fillRect(0, 0, w, 20);
  ctx.fillStyle = accent;
  ctx.font = `700 32px ${F.display}`;
  spacing(ctx, 5);
  ctx.fillText(s.kicker.toUpperCase(), 92, 70);
  spacing(ctx, 0);
  ctx.fillStyle = '#141414';
  ctx.font = `700 92px ${F.display}`;
  ctx.fillText(s.title, 88, 112);

  const items = (s.timeline || []).slice(0, 4);
  const top = 232, row = (h - top - 26) / Math.max(items.length, 1);
  ctx.fillStyle = withAlpha(accent, 0.35);
  ctx.fillRect(116, top + 14, 6, row * (items.length - 1) + 4);
  items.forEach((j, i) => {
    const y = top + i * row;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(119, y + 18, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath();
    ctx.arc(119, y + 18, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.font = `700 28px ${F.sign}`;
    spacing(ctx, 2);
    ctx.fillText(`${j.start} – ${j.end}`.toUpperCase(), 160, y);
    spacing(ctx, 0);
    ctx.fillStyle = '#141414';
    fit(ctx, j.role, 700, 42, F.display, 1050, 24);
    ctx.fillText(j.role, 160, y + 32);
    ctx.fillStyle = '#5b5b62';
    fit(ctx, [j.company, j.account].filter(Boolean).join(' · '), 500, 29, F.body, 1050, 18);
    ctx.fillText([j.company, j.account].filter(Boolean).join(' · '), 160, y + 80);
  });
  vignette(ctx, w, h, 0.16);
}

function drawEducation(ctx, w, h, s) {
  const accent = s.accent;
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#1d1233');
  bg.addColorStop(1, '#30205a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w - 200, 120, 10, w - 200, 120, 520);
  glow.addColorStop(0, withAlpha(accent, 0.3));
  glow.addColorStop(1, withAlpha(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = accent;
  ctx.font = `700 32px ${F.display}`;
  spacing(ctx, 5);
  ctx.fillText(s.kicker.toUpperCase(), 92, 70);
  spacing(ctx, 0);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 92px ${F.display}`;
  ctx.fillText(s.title, 88, 112);

  let y = 262;
  for (const e of (s.education || []).slice(0, 3)) {
    ctx.fillStyle = '#ffffff';
    fit(ctx, e.school, 700, 40, F.display, 470, 24);
    ctx.fillText(e.school, 92, y);
    ctx.fillStyle = '#c9bfe0';
    ctx.font = `400 28px ${F.body}`;
    y = wrap(ctx, e.detail, 92, y + 50, 470, 36, 2) + 34;
  }

  ctx.fillStyle = withAlpha(accent, 0.35);
  ctx.fillRect(610, 262, 3, h - 330);
  y = 258;
  ctx.font = `500 30px ${F.body}`;
  for (const a of (s.awards || []).slice(0, 5)) {
    ctx.fillStyle = '#ffd36b';
    star(ctx, 668, y + 18, 17);
    ctx.fillStyle = '#ffffff';
    ctx.font = `500 30px ${F.body}`;
    y = wrap(ctx, a, 702, y, 500, 38, 2) + 22;
  }
  vignette(ctx, w, h, 0.3);
}

/** The signature skill: neon frame, badge, and tools grouped by category. */
function drawSignature(ctx, w, h, s) {
  const accent = s.accent;
  ctx.fillStyle = '#070b10';
  ctx.fillRect(0, 0, w, h);
  for (const [x, y, c, r] of [[w - 120, 80, accent, 560], [80, h - 40, '#22d3ee', 520]]) {
    const g = ctx.createRadialGradient(x, y, 10, x, y, r);
    g.addColorStop(0, withAlpha(c, 0.26));
    g.addColorStop(1, withAlpha(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // neon frame
  const frame = ctx.createLinearGradient(0, 0, w, h);
  frame.addColorStop(0, accent);
  frame.addColorStop(0.55, '#22d3ee');
  frame.addColorStop(1, '#a78bfa');
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = 28;
  ctx.strokeStyle = frame;
  ctx.lineWidth = 10;
  rr(ctx, 18, 18, w - 36, h - 36, 26);
  ctx.stroke();
  ctx.restore();

  // badge
  ctx.font = `800 26px ${F.sign}`;
  spacing(ctx, 4);
  const badge = '★ SIGNATURE SKILL';
  const bw = ctx.measureText(badge).width + 44;
  rr(ctx, 60, 52, bw, 50, 25);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = '#071006';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, 82, 79);
  ctx.textBaseline = 'top';
  spacing(ctx, 0);

  ctx.fillStyle = '#ffffff';
  const bottom = bigTitle(ctx, s.signTitle, 58, 124, 1150, 82);

  const groups = (s.groups || []).slice(0, 5);
  const top = bottom + 22;
  const row = Math.min(84, (h - 40 - top) / Math.max(groups.length, 1));
  groups.forEach((g, i) => {
    const y = top + i * row;
    ctx.fillStyle = accent;
    ctx.font = `700 22px ${F.sign}`;
    spacing(ctx, 3);
    ctx.fillText(g.label.toUpperCase(), 62, y + 13);
    spacing(ctx, 0);
    chips(ctx, g.items, 330, y, w - 330 - 50, {
      size: 27, h: 50, padX: 18, gap: 10, maxRows: 1,
      fill: withAlpha(accent, 0.1), stroke: withAlpha(accent, 0.75), color: '#ffffff',
    });
  });
  vignette(ctx, w, h, 0.25);
}

const DRAW = {
  start: drawStart, end: drawEnd, about: drawAbout, skill: drawSkill, project: drawProject,
  job: drawJob, timeline: drawTimeline, education: drawEducation, signature: drawSignature,
};

export function drawSign(stop, photo) {
  const [w, h] = SIGN_SIZE[stop.kind];
  const [c, ctx] = makeCanvas(w, h);
  ctx.textBaseline = 'top';
  DRAW[stop.variant](ctx, w, h, stop, photo);
  return c;
}

/* ───────────────────────── environment ───────────────────────── */

/** One 12 m tile of two-lane road: u runs across the road, v along it. */
export function drawRoadTexture() {
  const [c, ctx] = makeCanvas(256, 512);
  ctx.fillStyle = '#393b40';
  ctx.fillRect(0, 0, 256, 512);
  const rand = mulberry32(11);
  for (let i = 0; i < 9000; i++) {
    const v = 40 + rand() * 50;
    ctx.fillStyle = `rgba(${v},${v},${v + 4},${0.25 + rand() * 0.35})`;
    ctx.fillRect(rand() * 256, rand() * 512, 1 + rand() * 2, 1 + rand() * 2);
  }
  // darker tyre tracks in each lane
  for (const x of [38, 90, 166, 218]) {
    const g = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 14, 0, 28, 512);
  }
  ctx.fillStyle = '#ecebe6';
  ctx.fillRect(10, 0, 7, 512);
  ctx.fillRect(239, 0, 7, 512);
  ctx.fillStyle = '#f2c94c';
  ctx.fillRect(124, 0, 8, 240);
  return c;
}

/** Neutral speckle detail for the terrain; the hue comes from per-vertex colours. */
export function drawGroundDetailTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, 256, 256);
  const rand = mulberry32(5);
  for (let i = 0; i < 3200; i++) {
    const v = 190 + rand() * 65;
    ctx.fillStyle = `rgba(${v},${v},${v},${0.35 + rand() * 0.5})`;
    ctx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 4, 1 + rand() * 4);
  }
  return c;
}

/** Crop rows for farm fields: green, wheat, ploughed soil, lavender. */
export function drawFieldTexture(kind) {
  const [c, ctx] = makeCanvas(128, 256);
  const palettes = {
    green: ['#6f9e3f', '#5a8732'],
    wheat: ['#d9bb5c', '#c4a548'],
    soil: ['#8d6c47', '#76593a'],
    lavender: ['#9a86cc', '#6f8f45'],
  };
  const [base, row] = palettes[kind];
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = row;
  for (let x = 0; x < 128; x += 16) ctx.fillRect(x, 0, 6, 256);
  const rand = mulberry32(kind.length * 13);
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.08})`;
    ctx.fillRect(rand() * 128, rand() * 256, 2, 2);
  }
  return c;
}

/** Building facade (8 × 8 windows = one 24 m tile) plus a matching night-lights map. */
export function drawFacadeTextures() {
  const [map, m] = makeCanvas(512, 512);
  const [glow, g] = makeCanvas(512, 512);
  m.fillStyle = '#d9d6cf';
  m.fillRect(0, 0, 512, 512);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 512, 512);
  const rand = mulberry32(21);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const x = col * 64 + 12, y = row * 64 + 14, w = 40, h = 36;
      const glass = m.createLinearGradient(x, y, x + w, y + h);
      glass.addColorStop(0, '#47586b');
      glass.addColorStop(1, '#232c37');
      m.fillStyle = glass;
      m.fillRect(x, y, w, h);
      m.fillStyle = 'rgba(255,255,255,0.12)';
      m.fillRect(x, y, w, 4);
      const r = rand();
      if (r < 0.5) {
        g.fillStyle = r < 0.08 ? '#bfe2ff' : r < 0.3 ? '#ffd27a' : '#ffb85c';
        g.globalAlpha = 0.55 + rand() * 0.45;
        g.fillRect(x, y, w, h);
        g.globalAlpha = 1;
      }
    }
  }
  return { map, glow };
}

/** Vertical fade used by the lighthouse beams. */
export function drawBeamTexture() {
  const [c, ctx] = makeCanvas(4, 128);
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 128);
  return c;
}

/** Seamless panorama of two mountain ridges (white + alpha, tinted in the scene). */
export function drawMountainTexture() {
  const [c, ctx] = makeCanvas(2048, 256);
  const ridge = (base, waves, alpha) => {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, 256);
    for (let x = 0; x <= 2048; x += 4) {
      const t = (x / 2048) * Math.PI * 2;
      let y = base;
      for (const [k, a, ph, sharp] of waves) {
        const s = Math.sin(k * t + ph);
        y += sharp ? a * (1 - Math.abs(s)) * 2 - a : a * s;
      }
      ctx.lineTo(x, 256 - y);
    }
    ctx.lineTo(2048, 256);
    ctx.closePath();
    ctx.fill();
  };
  ridge(150, [[3, 34, 0.3], [7, 26, 1.1, true], [13, 12, 2.0], [29, 6, 0.5, true], [53, 3, 1.4]], 0.5);
  ridge(98, [[5, 26, 1.1], [11, 18, 0.2, true], [23, 8, 3.0], [41, 4, 1.0, true], [71, 2, 0.4]], 1);
  return c;
}

export function drawGlowTexture() {
  const [c, ctx] = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return c;
}
