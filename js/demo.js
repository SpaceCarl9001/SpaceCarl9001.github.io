// The in-car demo monitor: the dashboard's nav screen grows into a big screen in the middle of
// the view and runs a project's live demo in an iframe. It shrinks back on close.

const $ = (s) => document.querySelector(s);
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

export function createDemoMonitor({ reduceMotion = false, onOpenChange } = {}) {
  const root = $('#demo');
  const monitor = root.querySelector('.demo-monitor');
  const backdrop = root.querySelector('.demo-backdrop');
  const frame = $('#demoFrame');
  const title = $('#demoTitle');
  const urlText = $('#demoUrl');
  const openTab = $('#demoOpen');
  const closeBtn = $('#demoClose');
  let open = false;
  let origin = null;     // the element it grew out of (and shrinks back into)
  let returnFocus = null;

  frame.addEventListener('load', () => {
    if (open && frame.getAttribute('src') !== 'about:blank') frame.classList.add('loaded');
  });

  /** Transform that makes the monitor sit exactly over `el` (transform-origin is top-left). */
  function fitOver(el) {
    const from = el?.offsetParent ? el.getBoundingClientRect() : null;
    if (!from || !from.width) return 'translate(0px, 40px) scale(0.92)';
    const to = monitor.getBoundingClientRect();
    return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
  }

  function show({ url, project }, from) {
    if (open) return;
    open = true;
    origin = from || null;
    returnFocus = document.activeElement;
    title.textContent = `${project} · Live demo`;
    urlText.textContent = url.replace(/^https?:\/\//, '');
    openTab.href = url;
    frame.classList.remove('loaded');
    frame.src = url;
    root.hidden = false;
    document.body.classList.add('demo-open');
    onOpenChange?.(true);
    if (!reduceMotion) {
      monitor.animate([{ transform: fitOver(origin), opacity: 0.5 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: EASE });
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420 });
    }
    closeBtn.focus({ preventScroll: true });
  }

  function hide() {
    if (!open) return;
    open = false;
    const finish = () => {
      root.hidden = true;
      frame.src = 'about:blank'; // stop the demo running in the background
      frame.classList.remove('loaded');
      document.body.classList.remove('demo-open');
      onOpenChange?.(false);
      returnFocus?.focus?.({ preventScroll: true });
    };
    if (reduceMotion) return finish();
    let done = false;
    const finishOnce = () => {
      if (done) return;
      done = true;
      monitor.getAnimations().forEach((a) => a.cancel());
      backdrop.getAnimations().forEach((a) => a.cancel());
      finish();
    };
    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360, fill: 'forwards' });
    monitor.animate([{ transform: 'none', opacity: 1 }, { transform: fitOver(origin), opacity: 0.3 }], { duration: 420, easing: EASE, fill: 'forwards' })
      .finished.then(finishOnce, finishOnce);
    setTimeout(finishOnce, 650); // never leave it half-closed if the page is busy
  }

  root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) hide(); });
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); hide(); return; }
    // keep keyboard focus inside the monitor
    if (e.key === 'Tab') {
      const stops = [openTab, closeBtn, frame];
      const i = stops.indexOf(document.activeElement);
      e.preventDefault();
      stops[(i + (e.shiftKey ? stops.length - 1 : 1)) % stops.length].focus();
    }
  });

  return { show, hide, isOpen: () => open };
}
