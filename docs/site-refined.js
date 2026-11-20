/* Unified research evidence / browser experiment switcher. No scientific data transformations. */
(()=>{
  'use strict';
  const root=document.getElementById('results');
  const archive=document.getElementById('evidence-archive');
  const lab=document.getElementById('evidence-lab');
  const tabs=[...document.querySelectorAll('[data-evidence-view]')];
  if(!root||!archive||!lab||tabs.length!==2)return;
  let current='archive';
  function select(mode,scroll=false){
    if(!['archive','lab'].includes(mode))return;
    current=mode;
    archive.hidden=mode!=='archive';
    lab.hidden=mode!=='lab';
    for(const tab of tabs){
      const active=tab.dataset.evidenceView===mode;
      tab.classList.toggle('is-active',active);
      tab.setAttribute('aria-selected',String(active));
      tab.tabIndex=active?0:-1;
    }
    if(scroll)root.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }
  function route(hash){
    if(hash==='#live-lab'||hash==='#experiment-lab-notes'){select('lab');return;}
    if(['#paper-figures','#paper-figures-shell','#audit-figures','#audit-figures-shell','#cert-benchmark'].includes(hash)){
      select('archive');
      if(hash.startsWith('#paper-figures'))document.getElementById('paper-figures-shell').open=true;
      if(hash.startsWith('#audit-figures'))document.getElementById('audit-figures-shell').open=true;
    }
  }
  tabs.forEach(tab=>{
    tab.addEventListener('click',()=>select(tab.dataset.evidenceView,true));
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const next=tab.dataset.evidenceView==='lab'?'archive':'lab';
      select(event.key==='Home'?'archive':event.key==='End'?'lab':next);
      tabs.find(x=>x.dataset.evidenceView===current)?.focus();
    });
  });
  document.addEventListener('click',event=>{
    const anchor=event.target.closest?.('a[href^="#"]');
    if(!anchor)return;
    if(anchor.dataset.openMode==='lab'||anchor.getAttribute('href')==='#live-lab')select('lab');
    else route(anchor.getAttribute('href'));
  });
  window.addEventListener('hashchange',()=>route(location.hash));
  route(location.hash);
})();
