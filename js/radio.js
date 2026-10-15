// The car radio: background music through Spotify's official embedded player, with the
// artist credited on the radio itself. Nothing loads until the visitor turns it on.

import { esc } from './ui.js';

const API = 'https://open.spotify.com/embed/iframe-api/v1';

export function createRadio(music, { root, toggle }) {
  if (!music?.spotify) {
    root.remove();
    toggle?.remove();
    return;
  }
  const uri = `spotify:track:${music.spotify.split('/track/')[1].split('?')[0]}`;

  root.innerHTML = `
    <div class="radio-head">
      <span class="radio-label"><span class="radio-led" aria-hidden="true"></span>Radio</span>
      <span class="radio-credit" title="“${esc(music.title)}” by ${esc(music.artist)}${music.year ? ` (${esc(music.year)})` : ''}">Music by <a href="${esc(music.artistUrl || music.spotify)}" target="_blank" rel="noopener">${esc(music.artist)}</a></span>
      <button class="radio-hide" type="button" aria-label="Hide radio">✕</button>
    </div>
    <div class="radio-player">
      <button class="radio-on" type="button">
        <span class="radio-play" aria-hidden="true">▶</span>
        <span><strong>Turn on the radio</strong><small>“${esc(music.title)}” · ${esc(music.artist)} · Spotify</small></span>
      </button>
      <div class="radio-embed"></div>
    </div>`;

  const onBtn = root.querySelector('.radio-on');
  const holder = root.querySelector('.radio-embed');
  let started = false;

  function loadPlainEmbed() {
    holder.innerHTML = `<iframe title="${esc(music.title)} by ${esc(music.artist)} on Spotify" src="https://open.spotify.com/embed/track/${uri.split(':').pop()}?utm_source=generator&theme=0" width="100%" height="80" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
  }

  function turnOn() {
    if (started) return;
    started = true;
    root.classList.add('on');
    const mount = document.createElement('div');
    holder.append(mount);
    // Spotify's iFrame API lets us press play for the visitor right after their click.
    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      IFrameAPI.createController(mount, { uri, width: '100%', height: 80, theme: 'dark' }, (controller) => {
        controller.addListener('ready', () => controller.play());
      });
    };
    const script = document.createElement('script');
    script.src = API;
    script.async = true;
    script.onerror = loadPlainEmbed; // blocked? fall back to the plain player
    document.head.append(script);
  }

  onBtn.addEventListener('click', turnOn);
  root.querySelector('.radio-hide').addEventListener('click', () => {
    root.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  });
  toggle?.addEventListener('click', () => {
    const open = root.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}
