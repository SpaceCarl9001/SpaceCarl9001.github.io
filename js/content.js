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
      'Alongside that I build web apps and automations for my team, like a PTO capacity dashboard, a no-click attendance notification flow and a shift bidding app that generates schedules on its own.',
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
      items: ['Google Sheets', 'Google Forms', 'Slack', 'Assembled', 'Google Apps Script', 'Webhooks'],
    },
  ],

  // Add `year: '2025'` or links like `links: [{ label: 'Demo', url: 'https://…' }]` to any project.
  projects: [
    {
      title: 'PTO Capacity Dashboard',
      accent: '#ff6b35',
      tagline: 'Daily shrinkage, overtime and absence tracking for every line of business.',
      description:
        'Tracks planned and unplanned shrinkage, total overtime and daily absences across all LOBs in one place, so the team can see at a glance whether we are about to exceed the planned shrinkage threshold.',
      tags: ['Shrinkage', 'Overtime', 'Absence tracking', 'All LOBs'],
      links: [],
    },
    {
      title: 'Attendance Notification Automation',
      accent: '#f43f5e',
      tagline: 'From Slack to Sheets to Assembled, with zero clicks.',
      description:
        'Attendance notifications used to be coded and plotted by hand, from Slack into Google Sheets and then into Assembled. This automation takes over the whole chain, so it now happens with no clicks at all.',
      tags: ['Slack', 'Google Sheets', 'Assembled', 'Automation'],
      links: [],
    },
    {
      title: 'Shift Bidding App',
      accent: '#14b8a6',
      tagline: 'Rank-based shift bidding and smart schedules in a live web app.',
      description:
        'Replaced manual bidding through Google Forms and Google Sheets with a live web app that automatically assigns each agent a schedule shell based on their current rank. Its Smart Schedule feature auto-generates the best schedule for team leaders so the team covers all hours of operation (HOOP), and assigns agents evenly across leaders based on how many hours they overlap.',
      tags: ['Web app', 'Rank-based assignment', 'Schedule optimization', 'HOOP coverage'],
      links: [],
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
