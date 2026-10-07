// DOM-side helpers: turns content.js into "stops" along the road, and renders
// the info card, the route bar, the speedometer and the text-only version.

export const esc = (value = '') =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const isExternal = (url) => /^https?:\/\//i.test(url);

function linkHTML({ label, url }, className = 'btn') {
  const ext = isExternal(url) ? ' target="_blank" rel="noopener"' : '';
  return `<a class="${className}" href="${esc(url)}"${ext}>${esc(label)}${isExternal(url) ? ' <span aria-hidden="true">↗</span>' : ''}</a>`;
}

/** One stop = one sign on the road + one info card. */
export function buildStops(c) {
  const { profile, about, skills = [], projects = [], contact } = c;
  const destinations = ['About', skills.length && 'Skills', projects.length && 'Projects', 'Contact'].filter(Boolean);
  const stops = [];

  stops.push({
    group: 'Start', kind: 'gantry', variant: 'start', accent: '#3ddc84',
    kicker: 'Now entering', title: profile.name, subtitle: profile.role,
    body: [profile.tagline], links: contact.links, hint: true,
    signLine: destinations.join('   ·   '),
  });

  stops.push({
    group: 'About', kind: 'billboard', variant: 'about', accent: '#ff7a45',
    kicker: 'About me', title: about.title, summary: about.summary,
    body: about.body, facts: about.facts, photo: about.photo, initials: profile.initials,
  });

  skills.forEach((s, i) => stops.push({
    group: 'Skills', kind: 'billboard', variant: 'skill', accent: s.accent || '#38bdf8',
    kicker: `Skills · ${i + 1} of ${skills.length}`, number: i + 1,
    title: s.category, summary: s.summary, body: [s.summary], chips: s.items,
  }));

  projects.forEach((p, i) => stops.push({
    group: 'Projects', kind: 'billboard', variant: 'project', accent: p.accent || '#ff6b35',
    kicker: `Project ${String(i + 1).padStart(2, '0')}${p.year ? ` · ${p.year}` : ''}`,
    title: p.title, subtitle: p.tagline, summary: p.tagline,
    body: [p.description], chips: p.tags, links: p.links,
  }));

  stops.push({
    group: 'Contact', kind: 'gantry', variant: 'end', accent: '#5b9cff',
    kicker: 'Destination reached', title: contact.headline,
    body: [contact.message], email: contact.email, links: contact.links,
  });

  return stops;
}

export function cardHTML(stop) {
  const out = [`<p class="card-kicker">${esc(stop.kicker)}</p>`, `<h2 class="card-title">${esc(stop.title)}</h2>`];
  if (stop.subtitle) out.push(`<p class="card-sub">${esc(stop.subtitle)}</p>`);
  (stop.body || []).forEach((p) => out.push(`<p class="card-text">${esc(p)}</p>`));
  if (stop.facts?.length) {
    out.push(`<dl class="facts">${stop.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>`);
  }
  if (stop.chips?.length) out.push(`<ul class="chips">${stop.chips.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`);

  const links = [];
  if (stop.email) links.push(linkHTML({ label: stop.email, url: `mailto:${stop.email}` }, 'btn btn-primary'));
  (stop.links || []).forEach((l) => links.push(linkHTML(l)));
  if (links.length) out.push(`<div class="card-links">${links.join('')}</div>`);

  if (stop.hint) {
    out.push(`<p class="card-hint"><span class="mouse" aria-hidden="true"></span>Scroll to start driving <span class="keys">or hold <kbd>↑</kbd> to drive, <kbd>↓</kbd> to reverse</span></p>`);
  }
  return out.join('');
}

/** Route bar along the top: one marker per section, placed by road distance. */
export function renderRoute(groups, end, el) {
  el.innerHTML = `
    <div class="route-line"><span class="route-fill"></span></div>
    <ol class="route-stops">
      ${groups.map((g) => `
        <li style="left:${((g.first.viewDist / end) * 100).toFixed(3)}%">
          <a class="route-stop" href="#${g.id}" data-group="${esc(g.name)}">
            <span class="route-dot" aria-hidden="true"></span><span class="route-label">${esc(g.name)}</span>
          </a>
        </li>`).join('')}
    </ol>`;
  return { fill: el.querySelector('.route-fill'), items: [...el.querySelectorAll('.route-stop')] };
}

/** Speedometer cluster that sits behind the steering wheel. */
export function clusterSVG() {
  const cx = 200, cy = 128, r = 84;
  const polar = (deg, rad) => {
    const a = (deg * Math.PI) / 180;
    return [(cx + Math.sin(a) * rad).toFixed(1), (cy - Math.cos(a) * rad).toFixed(1)];
  };
  let ticks = '', labels = '';
  for (let v = 0; v <= 240; v += 20) {
    const major = v % 40 === 0;
    const [x1, y1] = polar(v - 120, r - (major ? 13 : 7));
    const [x2, y2] = polar(v - 120, r - 1);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${major ? 3 : 1.5}"/>`;
    if (major) {
      const [lx, ly] = polar(v - 120, r - 28);
      labels += `<text x="${lx}" y="${(+ly + 5).toFixed(1)}">${v}</text>`;
    }
  }
  const [rx1, ry1] = polar(80, r - 1);
  const [rx2, ry2] = polar(120, r - 1);
  return `
    <svg viewBox="0 0 400 200" aria-hidden="true">
      <path class="hood" d="M6,200 C6,72 88,4 200,4 C312,4 394,72 394,200 Z"/>
      <circle class="face" cx="${cx}" cy="${cy}" r="${r + 6}"/>
      <path class="redline" d="M${rx1},${ry1} A${r - 1},${r - 1} 0 0 1 ${rx2},${ry2}"/>
      <g class="ticks">${ticks}</g>
      <g class="labels">${labels}</g>
      <g id="needle" transform="rotate(-120 ${cx} ${cy})">
        <line x1="${cx}" y1="${cy + 12}" x2="${cx}" y2="${cy - r + 10}"/>
      </g>
      <circle class="pivot" cx="${cx}" cy="${cy}" r="7"/>
      <text id="speed" class="speed" x="${cx}" y="${cy + 38}">0</text>
      <text class="unit" x="${cx}" y="${cy + 54}">km/h</text>
      <text class="side-label" x="66" y="150">ODO</text>
      <text id="odo" class="side-value" x="66" y="172">0.00</text>
      <text class="side-label" x="334" y="150">GEAR</text>
      <text id="gear" class="side-value gear" x="334" y="172">P</text>
    </svg>`;
}

/** Plain, accessible version of everything: used by screen readers and the "Text version" toggle. */
export function renderStatic(c, el) {
  const { profile, about, skills = [], projects = [], contact } = c;
  const links = (list = []) => list.map((l) => linkHTML(l, 's-link')).join('');
  el.innerHTML = `
    <header class="s-hero">
      <p class="s-kicker">Portfolio</p>
      <h1>${esc(profile.name)}</h1>
      <p class="s-role">${esc(profile.role)}</p>
      <p class="s-lead">${esc(profile.tagline)}</p>
    </header>

    <section class="s-section" aria-labelledby="s-about">
      <h2 id="s-about">About</h2>
      <h3>${esc(about.title)}</h3>
      ${(about.body || []).map((p) => `<p>${esc(p)}</p>`).join('')}
      ${about.facts?.length ? `<dl class="s-facts">${about.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>` : ''}
    </section>

    ${skills.length ? `
    <section class="s-section" aria-labelledby="s-skills">
      <h2 id="s-skills">Skills</h2>
      <div class="s-grid">
        ${skills.map((s) => `
          <article class="s-card" style="--accent:${esc(s.accent || '#38bdf8')}">
            <h3>${esc(s.category)}</h3>
            <p>${esc(s.summary)}</p>
            <ul class="s-tags">${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
          </article>`).join('')}
      </div>
    </section>` : ''}

    ${projects.length ? `
    <section class="s-section" aria-labelledby="s-projects">
      <h2 id="s-projects">Projects</h2>
      <div class="s-grid s-grid-wide">
        ${projects.map((p) => `
          <article class="s-card" style="--accent:${esc(p.accent || '#ff6b35')}">
            <p class="s-meta">${esc(p.year || '')}</p>
            <h3>${esc(p.title)}</h3>
            <p class="s-tagline">${esc(p.tagline)}</p>
            <p>${esc(p.description)}</p>
            <ul class="s-tags">${(p.tags || []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
            <div class="s-links">${links(p.links)}</div>
          </article>`).join('')}
      </div>
    </section>` : ''}

    <section class="s-section" aria-labelledby="s-contact">
      <h2 id="s-contact">Contact</h2>
      <h3>${esc(contact.headline)}</h3>
      <p>${esc(contact.message)}</p>
      <div class="s-links">
        ${linkHTML({ label: contact.email, url: `mailto:${contact.email}` }, 's-link s-link-primary')}
        ${links(contact.links)}
      </div>
    </section>`;
}
