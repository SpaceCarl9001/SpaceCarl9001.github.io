/**
 * ─────────────────────────────────────────────────────────────────────
 *  YOUR CONTENT LIVES HERE
 *
 *  Edit the values below. Every highway sign, billboard, info card and
 *  the text-only version of the site is generated from this file, so
 *  you never have to touch the 3D code to update your portfolio.
 *
 *  - Add or remove skills / projects freely: the road grows or shrinks.
 *  - `accent` colours are any CSS hex colour (#rrggbb).
 *  - Links that start with http(s) open in a new tab.
 * ─────────────────────────────────────────────────────────────────────
 */
export default {
  profile: {
    name: 'Carl Flores',
    initials: 'CF',
    role: 'WFM Real-Time Analyst · Web Dev & Automation',
    tagline: 'I keep workforce operations on track in real time, and build the web tools and automations that take busywork off my team.',
  },

  about: {
    title: "Hi, I'm Carl.",
    summary: 'A real-time analyst who codes: I watch the numbers live, then build tools so the team spends less time on repetitive work.',
    body: [
      'By day I work in Workforce Management as a Real-Time Analyst (RTA), keeping staffing, adherence and service levels on target while the day unfolds.',
      'Alongside that I build web apps and automations for my team: dashboards, trackers and scripts that turn repetitive manual steps into one click. Edit this paragraph to describe your favourite one.',
    ],
    facts: [
      { label: 'Day job', value: 'WFM · RTA' },
      { label: 'Builds', value: 'Web tools' },
      { label: 'Automates', value: 'Team workflows' },
    ],
    // Optional: a square-ish photo, e.g. 'assets/me.jpg'. Leave empty to show your initials.
    photo: '',
  },

  skills: [
    {
      category: 'Workforce Management',
      accent: '#38bdf8',
      summary: 'Keeping service levels on target while the day unfolds.',
      items: ['Real-time monitoring', 'Intraday management', 'Adherence', 'Service level & AHT', 'Scheduling', 'Reporting'],
    },
    {
      category: 'Web Development',
      accent: '#a78bfa',
      summary: 'Internal web apps and dashboards my team uses every day.',
      items: ['HTML & CSS', 'JavaScript', 'Node.js', 'REST APIs', 'Three.js', 'Git & GitHub'],
    },
    {
      category: 'Automation',
      accent: '#a3e635',
      summary: 'Turning repetitive manual steps into one click.',
      items: ['Google Apps Script', 'Excel & VBA', 'Python', 'Power Automate', 'Webhooks', 'Low-code apps'],
    },
  ],

  // EXAMPLE PROJECTS: replace these with your real work (title, what it does, the result, links).
  projects: [
    {
      title: 'RTA Live Board',
      year: '2026',
      accent: '#ff6b35',
      tagline: 'A real-time board showing who is on, off and out of adherence.',
      description:
        'Example: a live dashboard that pulls agent states every minute and flags adherence and service-level risks early, so the floor can react before the numbers slip.',
      tags: ['JavaScript', 'APIs', 'Dashboards'],
      links: [{ label: 'Live demo', url: 'https://example.com' }],
    },
    {
      title: 'Intraday Alert Bot',
      year: '2025',
      accent: '#f43f5e',
      tagline: 'Automatic chat alerts when queues or service levels go off-track.',
      description:
        'Example: a scheduled script that checks queue stats and posts a heads-up to the team chat when thresholds are crossed. Replace this with one of your own automations.',
      tags: ['Automation', 'Webhooks', 'Apps Script'],
      links: [{ label: 'Source code', url: 'https://github.com/your-username/intraday-alerts' }],
    },
    {
      title: 'Schedule Change Tracker',
      year: '2025',
      accent: '#14b8a6',
      tagline: 'A simple web form and log that replaced a messy shared spreadsheet.',
      description:
        'Example: a small web app for submitting shift swaps and schedule changes, with an approval log and automatic summary emails. Replace this with one of your own projects.',
      tags: ['Web app', 'Forms', 'Email automation'],
      links: [{ label: 'Live demo', url: 'https://example.com' }],
    },
    {
      title: 'Road Trip Portfolio',
      year: '2026',
      accent: '#eab308',
      tagline: 'This site: a scroll-driven 3D drive through my work.',
      description:
        'A Three.js scene where scrolling drives a car from the countryside, through a forest and along the coast to a city at night. Every sign is drawn at runtime from a single content file.',
      tags: ['Three.js', 'WebGL', 'Shaders'],
      links: [{ label: 'Source code', url: 'https://github.com/SpaceCarl9001/SpaceCarl9001.github.io' }],
    },
  ],

  contact: {
    headline: "Let's work together",
    message: 'Have a project, a role, or just want to say hi? My inbox is always open.',
    email: 'you@example.com',
    links: [
      { label: 'GitHub', url: 'https://github.com/SpaceCarl9001' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/your-profile' },
    ],
  },
};
