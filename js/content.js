/**
 * ─────────────────────────────────────────────────────────────────────
 *  YOUR CONTENT LIVES HERE
 *
 *  Edit the values below. Every highway sign, billboard, info card and
 *  the text-only version of the site is generated from this file, so
 *  you never have to touch the 3D code to update your portfolio.
 *
 *  - Add or remove skills / projects / jobs freely: the road grows or shrinks.
 *  - `accent` colours are any CSS hex colour (#rrggbb).
 *  - Links that start with http(s) open in a new tab.
 * ─────────────────────────────────────────────────────────────────────
 */
export default {
  profile: {
    name: 'Carl Flores',
    initials: 'CF',
    role: 'Workforce Real-Time Analyst · AI-Assisted Web Developer',
    tagline: '9+ years in contact centers, from the phones to team lead to real-time analyst. I keep operations on target, and I build the web apps and automations that take busywork off my team.',
  },

  about: {
    title: "Hi, I'm Carl.",
    summary: 'I started on the phones, led a support team, and now work as a real-time analyst who builds tools so the team works smarter.',
    body: [
      "I'm a Workforce Management professional with real-time analysis, team leadership and technical support experience. I'm data-driven about schedule adherence and performance monitoring, with a consistent track record of improving efficiency and customer satisfaction.",
      'Alongside the day job I build web apps and automations for my team, like a PTO capacity dashboard, a no-click attendance notification flow and a shift bidding app that generates schedules on its own.',
    ],
    facts: [
      { label: 'Based in', value: 'Dumaguete, PH' },
      { label: 'Experience', value: '9+ years' },
      { label: 'Now', value: 'WFM · RTA' },
    ],
    // Optional: a square-ish photo, e.g. 'assets/me.jpg'. Leave empty to show your initials.
    photo: '',
  },

  education: [
    { school: 'Silliman University', detail: 'BS Electrical Engineering (3rd year, undergraduate)' },
    { school: 'Piapi High School', detail: 'Secondary Education, 2010–2014' },
  ],

  awards: [
    'DepEd Most Outstanding Student of the Year, 2014',
    'Class Valedictorian, 2014',
    'Best in Science and English, 2014',
    'Editor-in-Chief, Northern Quill, 2014',
    'National Finalist, Sports Writing (Press Conference), 2014',
  ],

  // Newest first. `featured` jobs get their own billboard; the rest share an "Earlier roles" timeline.
  experience: [
    {
      featured: true,
      role: 'Workforce Real-Time Analyst (RTA)',
      company: 'ECE Contact Centers',
      account: 'Sales/Retail Account',
      start: 'Feb 2025',
      end: 'Present',
      accent: '#38bdf8',
      tags: ['Queue management', 'Queue monitoring', 'Adherence', 'Intraday trends', 'SLA', 'Dashboards'],
      bullets: [
        'Monitor real-time queue performance, service levels and agent adherence, escalating deviations to maintain SLA compliance.',
        'Manage queues by allocating resources based on staffing and volume per interval.',
        'Analyze intraday call volume and staffing trends to recommend schedule adjustments and prevent service level breaches.',
        'Partner with team leaders and operations managers to optimize agent utilization and real-time break/schedule planning.',
        'Build and maintain real-time and historical reporting dashboards in Excel/Google Sheets for leadership visibility.',
      ],
    },
    {
      featured: true,
      role: 'Tech Support Team Leader',
      company: 'ECE Contact Centers',
      account: 'Home Security System Account',
      start: 'Feb 2022',
      end: 'Feb 2025',
      accent: '#f59e0b',
      tags: ['Coaching', 'AHT', 'CSAT', 'First-contact resolution', 'Escalations'],
      bullets: [
        'Led and coached technical support agents, driving performance against KPIs including AHT, CSAT and first-contact resolution.',
        'Handled escalated technical issues and complex concerns beyond frontline agent scope.',
        'Delivered one-on-one coaching and feedback, supporting agent development and retention.',
        'Coordinated with Workforce Management on staffing and schedule adherence to meet service level targets.',
      ],
    },
    {
      role: 'T1 E-commerce/Retail Specialist → T3 Tech Support SME',
      company: 'ECE Contact Centers',
      account: 'Home Security System',
      start: 'Sept 2020',
      end: 'Feb 2022',
      summary: 'Sales specialist for orders, returns and replacements; mentored agents on troubleshooting and escalations, and maintained knowledge-base documentation.',
    },
    {
      role: 'Customer Support Representative',
      company: 'ECE Contact Centers',
      account: 'Financial App (T1 Chat Support)',
      start: 'May 2019',
      end: 'Sept 2020',
      summary: 'Tier-1 live chat support for account, transaction and technical inquiries, following strict data-security and compliance protocols.',
    },
    {
      role: 'Subject Matter Expert, Benefits & Claims',
      company: 'Teletech',
      account: 'B2B Healthcare Account',
      start: 'Sep 2017',
      end: 'Jul 2018',
      summary: 'SME for escalations, training and process questions; consistently met call quality, handling time and customer satisfaction metrics.',
    },
    {
      role: 'Customer Service Representative',
      company: 'Qualfon',
      account: 'Telco Account',
      start: 'Mar 2016',
      end: 'Aug 2017',
      summary: 'Handled inbound calls resolving billing and service inquiries, keeping accurate customer interaction records.',
    },
  ],

  skills: [
    {
      category: 'Workforce Management',
      accent: '#38bdf8',
      summary: 'Real-time analysis that keeps service levels and adherence on target.',
      items: ['Real-time queue monitoring', 'Queue management', 'Schedule adherence', 'Intraday analysis', 'SLA management', 'Break & schedule planning', 'Real-time & historical reporting'],
    },
    {
      category: 'Leadership & Support',
      accent: '#f59e0b',
      summary: 'Coaching agents and solving the tough tickets.',
      items: ['Team leadership', 'Coaching & feedback', 'AHT · CSAT · FCR', 'Escalation handling', 'Technical troubleshooting', 'Clear written & verbal English'],
    },
    {
      category: 'Tools & Platforms',
      accent: '#a78bfa',
      summary: 'The WFM and support platforms I work in every day.',
      items: ['Assembled', 'Five9', 'Zendesk', 'Intercom', 'Zoho', 'Shopify', 'Jira', 'Asana', 'Slack'],
    },
    {
      // `featured` = the signature skill: a bigger, neon-framed billboard with grouped tools.
      featured: true,
      category: 'AI-Assisted Web Development & Automation',
      shortTitle: 'AI-Assisted Web Dev & Automation',
      accent: '#a3e635',
      summary: 'I build and ship web apps and automations end to end, from the database to deployment, with AI as my pair programmer.',
      groups: [
        { label: 'Languages', items: ['JavaScript', 'Python', 'SQL', 'HTML & CSS'] },
        { label: 'Frameworks', items: ['Next.js', 'Node.js'] },
        { label: 'Build & ship', items: ['Supabase (Postgres + Auth)', 'Vercel', 'GitHub', 'VS Code'] },
        { label: 'AI-assisted dev', items: ['Claude / Claude Code', 'GitHub Copilot'] },
        { label: 'Automation', items: ['Google Apps Script', 'Slack webhooks', 'REST APIs', 'Advanced Excel & Google Sheets'] },
      ],
      highlights: [
        'Built and shipped a live shift bidding web app on Node.js, Supabase (Postgres + Auth) and Vercel that assigns schedules by agent rank and auto-generates full-coverage schedules.',
        'Automated attendance notifications end to end with Apps Script, Slack webhooks and the Assembled API, with zero clicks.',
        'Built a PTO capacity and shrinkage dashboard in Google Apps Script, JavaScript and HTML.',
        'Built and shipped this 3D portfolio with AI-assisted development.',
      ],
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
      stack: ['Google Apps Script', 'JavaScript', 'HTML'],
      links: [],
    },
    {
      title: 'Attendance Notification Automation',
      accent: '#f43f5e',
      tagline: 'From Slack to Sheets to Assembled, with zero clicks.',
      description:
        'Attendance notifications used to be coded and plotted by hand, from Slack into Google Sheets and then into Assembled. This automation takes over the whole chain, so it now happens with no clicks at all.',
      tags: ['Slack', 'Google Sheets', 'Assembled', 'Automation'],
      stack: ['Google Apps Script', 'JavaScript', 'Slack webhooks', 'Assembled API'],
      links: [],
    },
    {
      title: 'Shift Bidding App',
      accent: '#14b8a6',
      tagline: 'Rank-based shift bidding and smart schedules in a live web app.',
      description:
        'Replaced manual bidding through Google Forms and Google Sheets with a live web app that automatically assigns each agent a schedule shell based on their current rank. Its Smart Schedule feature auto-generates the best schedule for team leaders so the team covers all hours of operation (HOOP), and assigns agents evenly across leaders based on how many hours they overlap.',
      tags: ['Web app', 'Rank-based assignment', 'Schedule optimization', 'HOOP coverage'],
      stack: ['JavaScript', 'HTML & CSS', 'Node.js', 'Supabase (Postgres + Auth)', 'Vercel', 'GitHub', 'VS Code', 'Claude Code'],
      links: [],
    },
    {
      title: 'Road Trip Portfolio',
      year: '2026',
      accent: '#eab308',
      tagline: 'This site: a scroll-driven 3D drive through my work.',
      description:
        'A Three.js scene where scrolling drives a car from the countryside, through a forest and along the coast to a city at night. Every sign is drawn at runtime from a single content file.',
      tags: ['3D', 'Scroll-driven', 'Day-to-night'],
      stack: ['JavaScript', 'Three.js', 'WebGL', 'HTML & CSS', 'GitHub Pages', 'Claude Code'],
      links: [{ label: 'Source code', url: 'https://github.com/SpaceCarl9001/SpaceCarl9001.github.io' }],
    },
  ],

  contact: {
    headline: "Let's work together",
    message: "Have a role, a project, or just want to say hi? I'm based in Dumaguete City, Philippines, and my inbox is always open.",
    email: 'florezcarl9001@gmail.com',
    // Add LinkedIn here when ready: { label: 'LinkedIn', url: 'https://www.linkedin.com/in/…' }
    links: [
      { label: 'GitHub', url: 'https://github.com/SpaceCarl9001' },
    ],
  },
};
