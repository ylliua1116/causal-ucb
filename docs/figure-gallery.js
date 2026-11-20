/* Original manuscript figure crops with keyboard-ready tab controls. No synthetic plot data. */
(() => {
  'use strict';
  const official = 'https://openreview.net/pdf?id=sO7mOWC5TC';
  const $ = id => document.getElementById(id);
  const figures = [
    ['Certified online selection','24 paired seeds and 200 rounds: target regret, pairwise ATE error and decision-active certified width.',8],
    ['Interference sensitivity','Five interference strengths, with target regret and causal estimation error reported separately.',9],
    ['Overlap and context transport','Action–exposure support, post-burn-in context shift and joint matching across three overlap regimes.',9],
    ['Mechanism ablations','Controlled changes to doubly robust correction, exposure representation and exploration.',10],
    ['Identification–deployment trade-off','Exploration-rate sensitivity, target regret and deployment gap across operating conditions.',10],
  ];
  const choose = (buttons, current, key) => buttons.forEach(b => {
    const active = b === current;
    b.classList.toggle('active',active);
    b.setAttribute('aria-selected',String(active));
    b.tabIndex = active ? 0 : -1;
  });
  const plateTabs = [...document.querySelectorAll('[data-plate]')];
  plateTabs.forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.plate), fig = figures[i], url = `assets/paper-figures/paper-figure-${i+3}.png`;
    if (!fig) return;
    $('paper-plate-image').src = url;
    $('paper-plate-image').alt = `Manuscript figure ${i+3}: ${fig[0]}`;
    $('paper-plate-link').href = url;
    $('paper-plate-caption').textContent = `Fig. ${i+3} · ${fig[0]}`;
    $('paper-plate-description').textContent = fig[1];
    $('paper-plate-page').textContent = String(fig[2]);
    $('paper-figure-source').href = official;
    choose(plateTabs,b);
  }));
  const audits = [
    {n:28, page:61, tag:'300 SEEDS × 160 ROUNDS', name:'Full-path coverage & OFU inequality',
     description:'Both full-path target-value coverage and the OFU path inequality hold in all 300/300 independent audit runs, with 95% Wilson intervals.',
     boundary:'Empirical coverage pertains to the stated finite-state calibrated protocol.',
     path:'assets/paper-audit-figures/Fig28_Full_Path_Coverage_p61.png'},
    {n:26, page:60, tag:'GAP / NOISE / BUDGET SWEEP', name:'Certified optimism under changing conditions',
     description:'A 3-gap × 3-noise × 2-budget comparison evaluates optimistic selection against certified greedy selection. Negative paired differences favor optimism.',
     boundary:'Effects vary with gap, noise and budget; confidence intervals are descriptive paired intervals.',
     path:'assets/paper-audit-figures/Fig26_Optimism_vs_Greedy_p60.png'},
    {n:27, page:60, tag:'18 CELLS × 24 PAIRED SEEDS', name:'Paired regret differences across 18 conditions',
     description:'An 18-cell forest of OFU-minus-greedy regret differences with paired 95% Student-t intervals over 24 seeds per cell.',
     boundary:'The zero line represents equal mean regret. Full-path coverage is assessed separately in Figure 28.',
     path:'assets/paper-audit-figures/Fig27_Paired_Regret_18_Cells_p60.png'},
    {n:31, page:62, tag:'HIDDEN ASSUMPTION VIOLATIONS', name:'Certificate diagnostics under hidden violations',
     description:'Conditional empirical full-path coverage and average radius under six deliberately misspecified conditions, with appropriate Wilson and Student-t intervals.',
     boundary:'Formal certificate guarantees depend on the stated validity conditions; this diagnostic explores violations.',
     path:'assets/paper-audit-figures/Fig31_Hidden_Misspecification_p62.png'}
  ];
  const auditTabs = [...document.querySelectorAll('[data-audit]')];
  auditTabs.forEach(b => b.addEventListener('click',() => {
    const a = audits[Number(b.dataset.audit)];
    if (!a) return;
    $('audit-protocol').textContent = `FIG. ${a.n} · SOURCE P. ${a.page} · ${a.tag}`;
    $('audit-title').textContent = a.name;
    $('audit-desc').textContent = a.description;
    $('audit-boundary').textContent = a.boundary;
    $('audit-image').src = a.path;
    $('audit-image').alt = `Figure ${a.n}: ${a.name}`;
    $('audit-image-link').href = a.path;
    $('audit-original').href = a.path;
    $('audit-paper-link').href = official;
    $('audit-source').textContent = `Source manuscript · Figure ${a.n} · page ${a.page}`;
    choose(auditTabs,b);
  }));
})();
