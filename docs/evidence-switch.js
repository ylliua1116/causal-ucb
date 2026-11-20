/* Evidence has two distinct protocols: recorded 7-method study and 5-policy Python lab. */
(() => {
  'use strict';
  const recorded = document.getElementById('evidence-archive');
  const python = document.getElementById('live-lab');
  const tabs = [...document.querySelectorAll('[data-evidence-view]')];
  if (!recorded || !python || tabs.length !== 2) return;

  function activate(view, focus = false) {
    const showPython = view === 'python';
    recorded.hidden = showPython;
    python.hidden = !showPython;
    for (const tab of tabs) {
      const selected = tab.dataset.evidenceView === view;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus({preventScroll:true});
    }
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab.dataset.evidenceView));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const i = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 :
        (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      activate(tabs[i].dataset.evidenceView, true);
    });
  });
  for (const anchor of document.querySelectorAll('a[href="#live-lab"]')) {
    anchor.addEventListener('click', () => activate('python'));
  }
  for (const anchor of document.querySelectorAll('a[href="#cert-benchmark"],a[href="#evidence-archive"]')) {
    anchor.addEventListener('click', () => activate('recorded'));
  }
  const useHash = () => {
    if (location.hash === '#live-lab') activate('python');
    if (location.hash === '#cert-benchmark' || location.hash === '#evidence-archive') activate('recorded');
  };
  window.addEventListener('hashchange', useHash);
  useHash();
})();
