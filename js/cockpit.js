// The car interior around the 3D view: windshield frame, dashboard and steering wheel.
// It's drawn as SVG on top of the canvas (crisp at any size, cheap to render) and lit by
// CSS variables that follow the time of day (see --cabin and --cabin-warm in style.css).
//
// Left-hand drive: the wheel sits at --wheel-x (left of centre) and the car's centre line,
// with the rearview mirror and centre console, is at --car-x.

const f1 = (n) => n.toFixed(1);

/** A-pillars, roof lining, sun visors and a faint tint/glare on the glass. viewBox 1000×1000, stretched. */
export function windshieldSVG() {
  return `
    <svg class="windshield" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="glassTint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0a1420" stop-opacity="0.38"/>
          <stop offset="0.3" stop-color="#0a1420" stop-opacity="0.1"/>
          <stop offset="0.6" stop-color="#0a1420" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="glare" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity="0"/>
          <stop offset="0.5" stop-color="#fff" stop-opacity="1"/>
          <stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="pillarL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#0b0c0f"/>
          <stop offset="0.75" stop-color="#1c1e23"/>
          <stop offset="1" stop-color="#2a2d33"/>
        </linearGradient>
        <linearGradient id="pillarR" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stop-color="#0b0c0f"/>
          <stop offset="1" stop-color="#25282e"/>
        </linearGradient>
        <linearGradient id="headliner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#16181c"/>
          <stop offset="1" stop-color="#2c2f35"/>
        </linearGradient>
      </defs>

      <!-- glass: a light sun band at the top, two soft glare streaks -->
      <rect class="glass-tint" width="1000" height="260" fill="url(#glassTint)"/>
      <path class="glass-glare" d="M610,60 L690,60 L470,1000 L390,1000 Z" fill="url(#glare)"/>
      <path class="glass-glare thin" d="M730,60 L752,60 L560,1000 L538,1000 Z" fill="url(#glare)"/>

      <!-- slim roof lining and folded sun visors -->
      <path class="headliner" d="M0,0 H1000 V50 Q800,42 560,42 Q280,44 0,58 Z" fill="url(#headliner)"/>
      <path class="visor" d="M60,57 Q190,50 330,47 L329,60 Q190,63 66,70 Z"/>
      <path class="visor" d="M720,43 Q850,45 950,50 L948,62 Q850,57 722,56 Z"/>
      <path class="trim-line" d="M0,58 Q280,44 560,42 Q800,42 1000,50" fill="none" vector-effect="non-scaling-stroke"/>

      <!-- A-pillars: the driver's side a little wider (it's closer), the passenger side a sliver -->
      <path class="pillar" d="M0,56 L44,52 L82,55 L34,1000 L0,1000 Z" fill="url(#pillarL)"/>
      <path class="pillar-edge" d="M82,55 L34,1000" fill="none" vector-effect="non-scaling-stroke"/>
      <path class="pillar" d="M1000,49 L976,48 L960,51 L988,1000 L1000,1000 Z" fill="url(#pillarR)"/>
      <path class="pillar-edge" d="M960,51 L988,1000" fill="none" vector-effect="non-scaling-stroke"/>
    </svg>`;
}

/** The dashboard: viewBox 1000×220, stretched across the bottom of the screen. */
export function dashSVG() {
  // top edge: lowest at the driver's door, highest just right of centre, a little lower at the passenger door
  const top = (x) => (x < 560 ? 28 + 48 * ((560 - x) / 560) ** 2 : 28 + 34 * ((x - 560) / 440) ** 2);
  const edge = [];
  for (let x = 0; x <= 1000; x += 20) edge.push(`${x},${f1(top(x))}`);
  const outline = `M${edge.join(' L')} L1000,220 L0,220 Z`;
  const rim = `M${edge.join(' L')}`;
  const seam = `M${edge.map((p) => { const [x, y] = p.split(','); return `${x},${f1(+y + 24)}`; }).join(' L')}`;

  let slots = '';
  for (let x = 170; x <= 950; x += 30) {
    if (x > 500 && x < 740) continue; // the centre stack sits here
    slots += `<rect x="${x}" y="${f1(top(x) + 7)}" width="18" height="3.2" rx="1.6"/>`;
  }

  const vent = (x, y, w, h, louvers = 4) => {
    let lines = '';
    for (let i = 1; i <= louvers; i++) {
      const ly = y + (h * i) / (louvers + 1);
      lines += `<line x1="${x + 3}" y1="${f1(ly)}" x2="${x + w - 3}" y2="${f1(ly)}"/>`;
    }
    return `<g class="vent"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>${lines}</g>`;
  };

  return `
    <svg class="dash" viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#34373e"/>
          <stop offset="0.14" stop-color="#1d1f24"/>
          <stop offset="0.5" stop-color="#141519"/>
          <stop offset="1" stop-color="#0a0b0d"/>
        </linearGradient>
        <linearGradient id="stackFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1b1d22"/>
          <stop offset="1" stop-color="#0d0e11"/>
        </linearGradient>
        <linearGradient id="ventFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#050506"/>
          <stop offset="1" stop-color="#121317"/>
        </linearGradient>
      </defs>

      <!-- wiper arms resting at the bottom of the glass (the dash hides their roots) -->
      <g class="wipers">
        <path d="M150,84 Q300,46 470,30"/>
        <path d="M560,64 Q700,40 860,34"/>
      </g>

      <path class="dash-body" d="${outline}" fill="url(#dashFill)"/>
      <path class="dash-rim" d="${rim}" fill="none" vector-effect="non-scaling-stroke"/>
      <path class="dash-seam" d="${seam}" fill="none" vector-effect="non-scaling-stroke"/>
      <g class="defrost">${slots}</g>

      <!-- driver's door vent -->
      ${vent(14, 104, 66, 46)}

      <!-- centre stack: vents either side of the screen, hazard switch above it -->
      <path class="stack" d="M492,${f1(top(492) + 16)} L752,${f1(top(752) + 16)} L760,220 L484,220 Z" fill="url(#stackFill)"/>
      ${vent(500, 70, 28, 84, 6)}
      ${vent(716, 70, 28, 84, 6)}
      <g class="hazard"><rect x="606" y="42" width="28" height="16" rx="4"/><path d="M620,45 L627,55 L613,55 Z"/></g>

      <!-- passenger side: glovebox and door vent -->
      <rect class="glovebox" x="790" y="118" width="170" height="92" rx="14"/>
      <rect class="glovebox-handle" x="852" y="126" width="46" height="6" rx="3"/>
      ${vent(930, 92, 56, 44)}
    </svg>`;
}

/** A leather steering wheel with thumb grips, a top-centre marker and spoke buttons. */
export function wheelSVG() {
  const arc = (r, a0, a1) => {
    const p = (a) => [Math.cos((a * Math.PI) / 180) * r, Math.sin((a * Math.PI) / 180) * r];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M${f1(x0)},${f1(y0)} A${r},${r} 0 0 1 ${f1(x1)},${f1(y1)}`;
  };
  return `
    <svg class="wheel" viewBox="-200 -200 400 400" aria-hidden="true">
      <defs>
        <linearGradient id="rimLeather" x1="0" y1="-1" x2="0" y2="1">
          <stop offset="0" stop-color="#3b3f47"/>
          <stop offset="0.35" stop-color="#1c1e23"/>
          <stop offset="1" stop-color="#0c0d10"/>
        </linearGradient>
        <linearGradient id="spokeFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2a2d33"/>
          <stop offset="1" stop-color="#121418"/>
        </linearGradient>
        <radialGradient id="hubFill" cx="0.5" cy="0.3" r="0.8">
          <stop offset="0" stop-color="#2c3037"/>
          <stop offset="1" stop-color="#14161a"/>
        </radialGradient>
      </defs>

      <!-- spokes (behind the rim) -->
      <path class="spoke" d="M-56,-14 L-160,-4 L-160,40 L-60,44 Z" fill="url(#spokeFill)"/>
      <path class="spoke" d="M56,-14 L160,-4 L160,40 L60,44 Z" fill="url(#spokeFill)"/>
      <path class="spoke" d="M-34,52 L34,52 L24,162 L-24,162 Z" fill="url(#spokeFill)"/>

      <!-- rim, thumb grips at ten and two, stitching, highlight, 12 o'clock marker -->
      <circle r="170" fill="none" stroke="url(#rimLeather)" stroke-width="30"/>
      <path d="${arc(170, 196, 222)}" fill="none" stroke="url(#rimLeather)" stroke-width="38" stroke-linecap="round"/>
      <path d="${arc(170, 318, 344)}" fill="none" stroke="url(#rimLeather)" stroke-width="38" stroke-linecap="round"/>
      <circle class="stitch" r="158" fill="none"/>
      <path class="rim-shine" d="${arc(178, 205, 335)}" fill="none"/>
      <rect class="marker" x="-5" y="-186" width="10" height="30" rx="3"/>

      <!-- spoke buttons -->
      <g class="buttons">
        <rect x="-140" y="4" width="22" height="16" rx="5"/><rect x="-112" y="4" width="22" height="16" rx="5"/>
        <rect x="-140" y="24" width="22" height="12" rx="5"/><rect x="-112" y="24" width="22" height="12" rx="5"/>
        <circle cx="118" cy="16" r="13"/><circle cx="118" cy="16" r="5" class="dot"/>
        <rect x="84" y="6" width="18" height="12" rx="4"/><rect x="84" y="22" width="18" height="12" rx="4"/>
      </g>

      <!-- airbag hub and badge -->
      <rect x="-64" y="-46" width="128" height="104" rx="30" fill="url(#hubFill)" class="hub"/>
      <circle r="24" class="badge"/>
      <text id="wheelLogo" class="wheel-logo" y="7"></text>
    </svg>`;
}
