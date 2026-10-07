# Road Trip Portfolio

A portfolio you *drive* through. Scrolling moves the car down a winding road past four scenes:

1. **Countryside** (Start, About): farm fields, a red barn, fences, wind turbines on rolling hills
2. **Forest** (Skills): dense pines, steeper hills, mist
3. **Coastal highway** (Projects): the sea on your left with animated waves, a beach with palms, a lighthouse island and sailboats
4. **Harbour city** (Contact): a skyline whose windows light up at night

Highway signs and billboards show who you are, your skills and your projects, and the day turns from
sunrise to a sunset over the sea to night as you reach the contact sign at the end.

No build step and no dependencies to install. Three.js is loaded from a CDN.

## Run it locally

```bash
npm start
```

Then open <http://localhost:5173>. (Double-clicking `index.html` won't work, because browsers block
JavaScript modules on `file://` pages.)

## Make it yours

**Edit [`js/content.js`](js/content.js). That's the only file you need to touch.** The signs,
billboards, info cards, route bar and text version are all generated from it.

| Section    | What it controls |
|------------|------------------|
| `profile`  | Name, initials (top-left badge and steering wheel), role, one-line tagline. Shown on the green "Now entering" sign. |
| `about`    | The About billboard and card. Add `photo: 'assets/me.jpg'` to replace the initials circle with your photo. |
| `education`, `awards` | One "Education & Awards" billboard after About. |
| `experience` | Jobs, newest first. Jobs marked `featured: true` get their own billboard; the rest share a "Where I started" timeline. |
| `skills`   | One billboard per category. Add or remove categories freely. |
| `projects` | One billboard per project, each with its own `accent` colour, tags and links. |
| `contact`  | The blue "Destination" sign at the end: email and social links. |

The road gets longer or shorter automatically when you add or remove skills or projects.

To add a résumé, put the PDF in an `assets/` folder and add
`{ label: 'Résumé', url: 'assets/resume.pdf' }` to `contact.links`.

## How visitors get around

- **Scroll down / swipe up** to drive forward; scroll back up to reverse. The car eases to a stop at
  each sign and its info card slides in.
- **Hold ↑ or W** to accelerate, **hold ↓ or S** to reverse. Let go and the car brakes and pulls up
  at the nearest sign.
- **← / →** jump straight to the previous or next stop.
- **Route bar** (top): click a section to drive there.
- **Deep links**: `yoursite.com/#projects` starts the car at that exit.
- **Text version** (top-right): a plain, printable page with the same content. It is also what
  screen readers and search engines read, and the fallback if a device can't run WebGL.
  `?mode=text` opens it directly.
- People who have *reduce motion* turned on get the same scene without eased camera movement.

## Graphics quality

Desktops get **high** quality (live shadows and glow/bloom on lights, the sun and the water). Phones
get **low** quality (no shadows or bloom, lighter terrain). If a desktop struggles during the first
seconds of driving, the site drops to low by itself. To force a setting, add `?quality=high` or
`?quality=low` to the URL. `?stop=5` starts the car at a given stop (0 = start line).

## Deploy

It's a static site, so any static host works:

- **GitHub Pages**: push this folder to a repository, then go to Settings → Pages → Deploy from branch.
- **Netlify / Vercel / Cloudflare Pages**: drag and drop the folder, or connect the repository.
  Leave the build command empty and set the output directory to the project root.

## Project layout

```
index.html        page shell: top bar, info card, cockpit (wheel, gauges, nav screen)
css/style.css     all styling, including the text version and mobile layout
js/content.js     ← your content
js/main.js        scroll → camera, dashboard, quality settings, render loop
js/world/         the 3D world:
  road.js           the winding road and "where is the road near this point?" lookups
  terrain.js        scene zones, hills / beach / island heightmap, the water shader
  sky.js            sky dome with clouds, sun, moon, stars, mountains; time-of-day colours
  scenery.js        trees, palms, rocks, farm, turbines, lighthouse, boats, city, street lights
  signs.js          billboards and highway gantries
js/textures.js    signs, billboards, road, fields and building facades drawn with Canvas 2D
js/ui.js          info cards, route bar, speedometer, text version
serve.js          tiny local server for `npm start`
```

### Tweaking the drive

These live in `js/world/config.js` unless noted:

- `SPACING`: metres of road between stops (longer gaps mean more driving between stops).
- `LANE`, `EYE`: lane position and driver eye height.
- `KEYS` in `js/world/sky.js`: time-of-day keyframes (sky, sun, sea, cloud and light colours).
- `createZones` in `js/world/terrain.js`: where each scene starts. Zones follow your sections, so
  adding projects lengthens the coast automatically.
