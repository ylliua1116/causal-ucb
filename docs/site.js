(() => {
  const c = window.CAUSAL_UCB_SITE || {};
  for (const a of document.querySelectorAll('[data-link]')) {
    const target = c[a.dataset.link];
    if (typeof target === 'string' && (target.startsWith('https://') || /^\.?\/?assets\//.test(target))) {
      a.href = target;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    } else {
      a.removeAttribute('href');
      a.setAttribute('aria-disabled', 'true');
      a.title = 'Link will be enabled after public release';
      a.classList.add('link-disabled');
    }
  }
  if (c.authors) {
    const el = document.getElementById('authors');
    el.textContent = c.authors; el.hidden = false;
  }
  if (c.status) document.getElementById('research-status').textContent = c.status;
})();


// Progressive-enhancement motion, accessibility, and figure lightbox.
(() => {
  const doc = document.documentElement;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.getElementById('motion-toggle');
  let motionOn = !prefersReduced.matches;
  function refreshMotion() {
    doc.classList.toggle('motion-off', !motionOn);
    if (toggle) {
      toggle.textContent = motionOn ? 'Ⅱ Pause motion' : '▶ Play motion';
      toggle.setAttribute('aria-pressed', String(!motionOn));
      toggle.setAttribute('aria-label', motionOn ? 'Pause decorative motion' : 'Resume decorative motion');
    }
  }
  refreshMotion();
  toggle?.addEventListener('click', () => {motionOn = !motionOn; refreshMotion();});
  prefersReduced.addEventListener?.('change', event => {motionOn = !event.matches; refreshMotion();});

  const fill = document.getElementById('reading-progress-fill');
  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, max > 0 ? (window.scrollY / max * 100) : 0))}%`;
  }
  window.addEventListener('scroll', updateProgress, {passive:true});
  window.addEventListener('resize', updateProgress, {passive:true});
  updateProgress();

  if ('IntersectionObserver' in window && !prefersReduced.matches) {
    const targets = Array.from(document.querySelectorAll('.section-label, .section h2, .insight, .method-grid article, .result-card, .terminal'));
    // Never hide content without confirming JS + support for observing.
    doc.classList.add('js-motion');
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {entry.target.classList.add('in-view'); observer.unobserve(entry.target);}
      }
    }, {threshold: .09, rootMargin:'0px 0px 35px 0px'});
    for (const target of targets) observer.observe(target);
  }

  const dlg = document.getElementById('figure-dialog');
  const dlgImage = document.getElementById('figure-dialog-image');
  const dlgCaption = document.getElementById('figure-dialog-caption');
  if (dlg && typeof dlg.showModal === 'function') {
    document.querySelectorAll('.result-card > a').forEach(anchor => {
      anchor.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const img = anchor.querySelector('img');
        dlgImage.src = img?.getAttribute('src') || anchor.href;
        dlgImage.alt = img?.alt || 'Research figure';
        dlgCaption.textContent = anchor.closest('.result-card')?.querySelector('figcaption strong')?.textContent || 'Research figure';
        dlg.showModal();
      });
    });
    document.getElementById('figure-dialog-close')?.addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', event => {if (event.target === dlg) dlg.close();});
    dlg.addEventListener('close', () => {dlgImage.removeAttribute('src');});
  }
})();


// Homepage video wall. The montage is independent of the scientific plots below.
(() => {
  const wall = document.querySelector('.cinematic');
  if (!wall) return;
  const tiles = Array.from(wall.querySelectorAll('.cinema-tile'));
  const toggle = document.getElementById('cinema-motion');
  const lowButton = document.getElementById('cinema-quality');
  const existingToggle = document.getElementById('motion-toggle');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen = window.matchMedia('(max-width: 640px)');
  const videos = new Map();
  let enabled = !reduced.matches;
  let lowData = false;
  let inView = true;
  let staged = false;

  function maxStreams() {
    if (!enabled || lowData) return 0;
    // Avoid opening 24 heavy video streams. Photo posters for other windows keep moving.
    return smallScreen.matches ? 3 : 7;
  }
  function syncControls() {
    wall.classList.toggle('off', !enabled);
    toggle.textContent = enabled ? 'Ⅱ PAUSE' : '▶ PLAY';
    toggle.setAttribute('aria-pressed', String(!enabled));
    lowButton.textContent = lowData ? 'NORMAL DATA' : 'LOW DATA';
    lowButton.setAttribute('aria-pressed', String(lowData));
    for (const [tile, video] of videos) {
      const shouldPlay = enabled && !lowData && inView && !document.hidden;
      if (shouldPlay) video.play().catch(() => tile.classList.remove('has-motion'));
      else video.pause();
    }
  }
  function installVideo(tile, index) {
    if (videos.has(tile) || !tile.dataset.media) return;
    const video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-hidden', 'true');
    video.setAttribute('disablepictureinpicture', '');
    video.addEventListener('playing', () => tile.classList.add('has-motion'));
    video.addEventListener('error', () => {tile.classList.remove('has-motion'); video.pause();});
    tile.appendChild(video);
    videos.set(tile, video);
    video.src = tile.dataset.media;
    video.load();
    // Stagger time phases for repeated source clips.
    video.addEventListener('loadedmetadata', () => {
      try { if (video.duration > 4) video.currentTime = (index * 2.3) % Math.max(2, video.duration - 1); } catch(_) {}
      if (enabled && !lowData && inView && !document.hidden) video.play().catch(() => {});
    }, {once:true});
    if (enabled && !lowData && inView && !document.hidden) video.play().catch(() => {});
  }
  function stageVideos() {
    if (staged || !enabled || lowData || !inView) return;
    staged = true;
    const available = tiles.filter(tile => !!tile.dataset.media);
    const picks = [0,2,4,7,11,14,18,21];
    const list = picks.map(i => tiles[i]).filter(tile => tile?.dataset.media).slice(0, maxStreams());
    if (!list.length) list.push(...available.slice(0, maxStreams()));
    list.forEach((tile,i) => setTimeout(() => {if (enabled && !lowData && inView) installVideo(tile,i);}, i*350));
  }
  // A short delay lets page text and photo posters paint first.
  setTimeout(stageVideos, 1100);
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    // Keep first hero flow pause switch in sync visually.
    document.documentElement.classList.toggle('motion-off', !enabled);
    syncControls();
    if (enabled) stageVideos();
  });
  existingToggle?.addEventListener('click', () => {
    enabled = !document.documentElement.classList.contains('motion-off');
    syncControls();
    if (enabled) stageVideos();
  });
  lowButton.addEventListener('click', () => {
    lowData = !lowData;
    if (!lowData && !videos.size) staged = false;
    syncControls();
    if (!lowData) stageVideos();
  });
  reduced.addEventListener?.('change', e => {enabled = !e.matches; syncControls();});
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      inView = entries[0]?.isIntersecting ?? false;
      if (!inView) for (const v of videos.values()) v.pause();
      else {syncControls();stageVideos();}
    }, {threshold:0.04});
    obs.observe(wall);
  }
  document.addEventListener('visibilitychange', syncControls);
  syncControls();
})();
