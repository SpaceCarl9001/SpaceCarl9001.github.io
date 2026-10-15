// The car stereo: a head unit built into the centre console (volume knob, restart, play/pause,
// a little display, eject) and a motorised media screen that rises out of the dash.
//
// Music is the band's official YouTube release, played in full. YouTube's rules say its player
// must stay visible while it plays, so the song plays on the media screen, and anything that
// hides the screen (lowering it, closing the pop-over, the text version, the demo monitor)
// pauses it.

import { esc } from './ui.js';

const API = 'https://www.youtube.com/iframe_api';
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function createRadio(music, { root, toggle, screenEl }) {
  if (!music?.youtube) {
    root.remove();
    toggle?.remove();
    return;
  }
  // band first, so a narrow screen never cuts off their name
  const credit = `Music by <a href="${esc(music.artistUrl || `https://www.youtube.com/watch?v=${music.youtube}`)}" target="_blank" rel="noopener">${esc(music.artist)}</a> · “${esc(music.title)}”`;

  root.innerHTML = `
    <div class="media" aria-hidden="true">
      <div class="media-bezel">
        <div class="media-head">
          <span class="radio-led" aria-hidden="true"></span>
          <span class="media-credit" title="“${esc(music.title)}” by ${esc(music.artist)}${music.year ? ` (${esc(music.year)})` : ''}">${credit}</span>
          <button class="media-down" type="button" aria-label="Lower the screen (pauses the music)" title="Lower screen">▾</button>
        </div>
        <div class="media-player"><div class="media-yt"></div></div>
      </div>
    </div>
    <div class="stereo-face">
      <div class="knob" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="70" title="Volume: drag, scroll or use the arrow keys"><span class="knob-mark"></span></div>
      <button class="st-btn st-prev" type="button" aria-label="Restart the song" title="Restart">⏮</button>
      <button class="st-btn st-play" type="button" aria-label="Play “${esc(music.title)}” by ${esc(music.artist)}" title="Play">▶</button>
      <div class="st-display" aria-live="polite">
        <span class="st-line1">MEDIA</span>
        <span class="st-line2">Press ▶ · ${esc(music.title)}</span>
      </div>
      <button class="st-btn st-eject" type="button" aria-label="Raise the media screen" title="Screen up/down">⏏</button>
    </div>`;

  const q = (s) => root.querySelector(s);
  const media = q('.media'), knob = q('.knob'), playBtn = q('.st-play');
  const line1 = q('.st-line1'), line2 = q('.st-line2');
  let player = null, apiLoading = false, ready = false;
  let wantPlay = false, playing = false, ended = false, volume = 70;
  let resumeAfter = false, timer = 0;
  const narrow = matchMedia('(max-width: 1100px)');

  /* ── the motorised screen ── */
  const screenUp = () => media.classList.contains('up');
  function raise(up) {
    media.classList.toggle('up', up);
    media.setAttribute('aria-hidden', String(!up));
    // lets a card on the right make room for the screen (see body.media-up in style.css)
    document.body.classList.toggle('media-up', up && !narrow.matches);
    place();
    q('.st-eject').setAttribute('aria-label', up ? 'Lower the media screen (pauses the music)' : 'Raise the media screen');
    if (!up) pause();
  }

  // Tells a right-hand info card where the media screen starts, so it can end above it.
  function place() {
    const m = media.getBoundingClientRect();
    if (!m.height) return;
    document.documentElement.style.setProperty('--media-top', `${m.top - 6}px`);
    // only make a card room when the two would actually overlap
    const w = document.documentElement.clientWidth;
    const cardLeft = w - 28 - Math.min(410, w * 0.36);
    document.body.classList.toggle('media-clash', m.right > cardLeft - 8);
  }
  addEventListener('resize', place);
  const watch = new ResizeObserver(place);
  watch.observe(document.documentElement);
  if (screenEl) watch.observe(screenEl); // its height settles once the fonts load
  requestAnimationFrame(place);

  /* ── YouTube player ── */
  // The API script is fetched when the pointer first reaches the stereo, so a click starts the
  // song quickly; the player itself is only created on play.
  let apiReady = false;
  function loadApi() {
    if (apiLoading) return;
    apiLoading = true;
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      apiReady = true;
      if (wantPlay) createPlayer();
    };
    const s = document.createElement('script');
    s.src = API;
    s.async = true;
    s.onerror = () => { line2.textContent = 'YouTube is blocked here'; };
    document.head.append(s);
  }
  root.addEventListener('pointerenter', loadApi, { once: true });
  root.addEventListener('focusin', loadApi, { once: true });

  function createPlayer() {
    if (player) return;
    player = new YT.Player(q('.media-yt'), {
      videoId: music.youtube,
      width: '100%',
      height: '100%',
      host: 'https://www.youtube-nocookie.com',
      // controls off: the stereo's own knob and buttons drive it, so the screen shows just the album art
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, cc_load_policy: 0 },
      events: {
        onReady: () => {
          ready = true;
          player.setVolume(volume);
          if (wantPlay) player.playVideo();
        },
        onStateChange: (e) => {
          playing = e.data === YT.PlayerState.PLAYING;
          ended = e.data === YT.PlayerState.ENDED;
          if (playing) wantPlay = false;
          render();
        },
        onError: () => {
          line1.textContent = 'MEDIA';
          line2.textContent = 'Song unavailable right now';
        },
      },
    });
  }

  let nudge = 0;
  function play() {
    if (blocked()) return;
    if (!screenUp()) raise(true);
    wantPlay = true;
    line1.textContent = `♪ ${music.title}`;
    line2.textContent = 'Loading…';
    // Some browsers (Safari especially) refuse to start sound from our button: then the visitor
    // taps YouTube's own play button on the media screen.
    clearTimeout(nudge);
    nudge = setTimeout(() => { if (wantPlay && !playing) line2.textContent = 'Tap the screen ▶ to play'; }, 8000);
    if (!apiReady) return loadApi();
    if (!player) return createPlayer();
    if (ended) player.seekTo(0, true);
    if (ready) player.playVideo();
  }
  function pause() {
    wantPlay = false;
    if (ready && playing) player.pauseVideo();
  }

  /* ── display ── */
  function render() {
    root.classList.toggle('playing', playing);
    playBtn.textContent = playing ? '❙❙' : '▶';
    playBtn.setAttribute('aria-label', playing ? 'Pause' : `Play “${music.title}” by ${music.artist}`);
    clearInterval(timer);
    if (!ready) return;
    const tick = () => {
      const t = player.getCurrentTime(), d = player.getDuration();
      line1.textContent = `♪ ${music.title}`;
      line2.textContent = ended ? 'Ended · ▶ to replay' : `${fmt(t)} / ${fmt(d)} · ${music.artist}`;
    };
    tick();
    if (playing) timer = setInterval(tick, 500);
  }

  /* ── volume knob ── */
  function setVolume(v) {
    volume = Math.max(0, Math.min(100, Math.round(v)));
    knob.style.setProperty('--turn', `${-135 + volume * 2.7}deg`);
    knob.setAttribute('aria-valuenow', String(volume));
    if (!ready) return;
    player.setVolume(volume);
    line2.textContent = `Volume ${volume}`;
    clearTimeout(knob.t);
    knob.t = setTimeout(render, 900);
  }
  setVolume(volume);
  knob.addEventListener('wheel', (e) => { e.preventDefault(); setVolume(volume - Math.sign(e.deltaY) * 5); }, { passive: false });
  knob.addEventListener('pointerdown', (e) => {
    knob.setPointerCapture(e.pointerId);
    const y0 = e.clientY, x0 = e.clientX, v0 = volume;
    const move = (ev) => setVolume(v0 + (ev.clientX - x0 - (ev.clientY - y0)) * 0.6);
    knob.addEventListener('pointermove', move);
    knob.addEventListener('pointerup', () => knob.removeEventListener('pointermove', move), { once: true });
  });
  knob.addEventListener('keydown', (e) => {
    const step = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5 }[e.key];
    if (step) { e.preventDefault(); e.stopPropagation(); setVolume(volume + step); }
  });

  /* ── buttons ── */
  playBtn.addEventListener('click', () => (playing || wantPlay ? pause() : play()));
  q('.st-prev').addEventListener('click', () => {
    if (!ready) return play();
    player.seekTo(0, true);
    if (!playing) play();
  });
  q('.st-eject').addEventListener('click', () => raise(!screenUp()));
  q('.media-down').addEventListener('click', () => {
    raise(false);
    if (narrow.matches) setOpen(false);
  });

  // Small screens: the ♪ button opens the stereo as a pop-over; closing it pauses the music.
  function setOpen(open) {
    root.classList.toggle('open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    if (open) raise(true);
    else pause();
  }
  toggle?.addEventListener('click', () => setOpen(!root.classList.contains('open')));
  narrow.addEventListener('change', () => {
    if (!narrow.matches) root.classList.remove('open');
    else if (!root.classList.contains('open')) pause();
  });

  // Anything that covers the screen pauses the song; closing the demo monitor resumes it.
  const blocked = () => document.body.classList.contains('text-mode') || document.body.classList.contains('demo-open');
  new MutationObserver(() => {
    if (blocked()) {
      if (playing || wantPlay) resumeAfter = !document.body.classList.contains('text-mode');
      pause();
    } else if (resumeAfter) {
      resumeAfter = false;
      play();
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
