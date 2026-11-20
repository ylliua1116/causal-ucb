/* CAUSAL-UCB Causal: clickable causal semantics + six saved-data visualizations. No algorithm is run by these animations. */
(() => {
  'use strict';
  const stages = [
    {tag:'STEP 01 / DEPLOYMENT',title:'The operator chooses a global configuration',received:'The existing configuration set Z, past estimates, uncertainty certificates and the chosen measurement rate η.',principle:'Online configuration control: choose zₜ and ηₜ before observing this round. The deployment objective is W∞(z; 0), not the exploratory reward.',result:'The global setting and measurement mechanism determine how local controllers will act and adapt.',next:'The deployed configuration zₜ and ηₜ are passed to interacting local controllers.',ref:'Paper §3.1, Eq. (2)–(4) · Algorithm 1'},
    {tag:'STEP 02 / INTERFERENCE',title:'Adaptive controllers generate joint exposure',received:'Global configuration zₜ, exploration rate ηₜ, network topology and local pre-action states.',principle:'An exposure map φᵢ summarizes neighbors and system state. The treatment is the joint action–exposure unit (Aᵢ,Eᵢ); a marginal focal-action propensity is insufficient.',result:'Realized local actions, neighboring interference and joint exposure under the logging regime.',next:'Joint actions, exposures and pre-action contexts are recorded after burn-in.',ref:'Paper §3.2, Eq. (1) · consistency, exchangeability, joint overlap'},
    {tag:'STEP 03 / MEASUREMENT',title:'Post-burn-in logs are collected, not mistaken for the target',received:'Interactions that have settled for Tburn adaptation steps under the exploratory law.',principle:'T₀ post-burn-in windows record action, context and normalized reward. The context law νz,η can differ from the no-exploration νz,0; action correction alone does not transport it.',result:'Cumulative source-regime logs D≤t and their actual behavior laws.',next:'Logged scores and fitted joint propensity / response models become inputs to the causal evaluator.',ref:'Paper §3.1–3.3 · Proposition 3 and Eq. (4)'},
    {tag:'STEP 04 / CAUSAL VALUE',title:'From exploratory logs to a target-value certificate',received:'Source-regime action, exposure, context, reward, and predictable fitted nuisance quantities.',principle:'Clipped doubly robust scoring combines the target joint law, outcome regression and source behavior ratios. The deviation radius separates fluctuation from calibrated nuisance, exposure, context-shift and dependence terms.',result:'An estimated W∞(z;0) and a conditionally valid uncertainty radius bₜ(z), under stated assumptions.',next:'For every candidate z, the predecision upper target value is passed to the selector.',ref:'Paper §4.1–4.2 · Eq. (5)–(9), Theorem 1'},
    {tag:'STEP 05 / NEXT CONFIGURATION',title:'Optimism closes the next decision round',received:'Candidate target-value estimates, predecision certificate radii and available configuration set Z.',principle:'Choose the configuration maximizing estimated target value plus its valid radius. Theorem 3 bounds target regret conditional on valid certificates and information growth; Proposition 1 has a computable restricted-case radius.',result:'The next selected global configuration, not an unconditional guarantee for black-box networks.',next:'Feedback travels back to DEPLOY. A new exploration/adaptation/logging round begins.',ref:'Paper §4.4 · Algorithm 1, Theorem 3, Proposition 1'}
  ];
  const detail=document.getElementById('flow-detail');
  const stageButtons=Array.from(document.querySelectorAll('[data-flow]'));
  function showStage(index){
    const stage=stages[index];if(!stage||!detail)return;
    stageButtons.forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.flow===index)));
    detail.replaceChildren();
    const tag=document.createElement('span');tag.className='detail-eyebrow';tag.textContent=stage.tag;detail.append(tag);
    const h=document.createElement('h3');h.textContent=stage.title;detail.append(h);
    [['Received',stage.received],['Principle / theory',stage.principle],['Result / conclusion',stage.result],['Passed forward',stage.next]].forEach(([label,val])=>{
      const cell=document.createElement('div');cell.className='detail-item';const b=document.createElement('b');b.textContent=label;const p=document.createElement('p');p.textContent=val;cell.append(b,p);detail.append(cell);
    });
    const cite=document.createElement('span');cite.className='detail-cite';cite.textContent=stage.ref;detail.append(cite);
  }
  let openedStage=-1;
  const flowClose=()=>{openedStage=-1;detail.hidden=true;stageButtons.forEach(b=>b.setAttribute('aria-pressed','false'));};
  stageButtons.forEach(b=>b.addEventListener('click',()=>{
    const i=+b.dataset.flow;
    if(openedStage===i){flowClose();return;}
    openedStage=i;showStage(i);detail.hidden=false;
    const close=document.createElement('button');close.className='flow-detail-close';close.textContent='×  Close';close.type='button';close.addEventListener('click',flowClose);detail.prepend(close);
    if(window.matchMedia('(max-width: 980px)').matches)detail.scrollIntoView({block:'nearest',behavior:'smooth'});
  }));
  detail.hidden=true;
  document.addEventListener('keydown',e=>{if(e.key==='Escape')flowClose();});

  const modules=[
    {tag:'MODULE I / INTERFERENCE',title:'Joint action–exposure interface',lead:'The treatment being evaluated is not a single node action. It is a local action together with its realized neighbor exposure.',theory:'Eq. (1): Eᵢ = φᵢ(neighbor actions, system state, graph). Identification requires consistency, conditional exchangeability, overlap of the target joint law against the logging law, and response transport.',io:'Raw neighboring actions + pre-action context + graph telemetry → auditable (Aᵢ,Eᵢ,Cᵢ⁻) observation unit; exposure-enrichment discrepancy for sensitivity.',proof:'§3.2 defines the interface. Theorem 1 requires a calibrated exposure/response error allowance εexp, not merely a descriptive feature map.',caveat:'The exposure-enrichment diagnostic is not a stand-alone certificate of sufficiency. Arbitrary unknown interference remains conditional on explicit assumptions.',ref:'Paper §3.2 · Eq. (1) · Appendix B.3/B.9'},
    {tag:'MODULE II / INFORMATION VS DEPLOYMENT',title:'Exploration changes both information and the environment',lead:'A logged measurement distribution can be informative while representing a different steady state from the one to be deployed.',theory:'Eq. (2) defines W∞(z;0). Eq. (4) defines W∞(z;η). Theorem 2 gives a minimax identification lower bound of order 1/√(1+Σηₜ) and measurement-induced deployment cost of order Σηₜ, for its constructed family.',io:'Configuration z + η + adaptive controllers → exploratory logs under νz,η; target objective remains the no-exploration νz,0.',proof:'Theorem 2 establishes an information–deployment frontier for predetermined exploration schedules in a stated stationary, potentially slow-mixing family.',caveat:'The lower bound does not show CAUSAL-UCB is Pareto-optimal. Action overlap does not identify the no-exploration context distribution.',ref:'Paper §3.3, §4.3 · Theorem 2 · Figure 7'},
    {tag:'MODULE III / CLIPPED DR CERTIFICATE',title:'Doubly robust evaluation with separately audited error budgets',lead:'A target-value estimate alone is not the decision object. The algorithm uses the estimate together with a predecision certificate.',theory:'Eq. (5) clips the target/source joint propensity ratio. Eq. (6) defines the DR score, Eq. (7) its aggregation. Eq. (8) decomposes nuisance product, target-law, clipping, exposure, context shift and configuration-transfer allowances; Theorem 1 adds calibrated dependence/statistical terms.',io:'Previously logged windows + predictable/cross-fitted nuisance models + independent calibration budgets → Ŵₜ(z;0) ± bₜ(z).',proof:'Theorem 1 gives uniform deviation only when all stated calibration, overlap and temporal assumptions hold. Proposition 1 supplies a computable anytime radius under known ring interference, matched rewards and known noise bounds.',caveat:'Plug-in effective sample size and exposure differences are diagnostics, not validated confidence radii by themselves. General black-box certification cannot be inferred from restricted-case results.',ref:'Paper §4.1–4.2, §4.4 · Theorem 1 · Proposition 1 · Eq. (5)–(15)'},
    {tag:'MODULE IV / ONLINE SELECTION',title:'Certified optimism for the next global decision',lead:'Upper bounds are used to choose configurations based on deployment-facing target values, rather than on raw measurement-regime reward.',theory:'Algorithm 1 uses zₜ = argmax_z [Ŵₜ₋₁(z;0) + bₜ₋₁(z)], with decision-time nuisance fits frozen before the next network window is scored.',io:'Past target-value estimates and valid predecision radii → selected zₜ → new global deployment; updated logs re-enter the next decision round.',proof:'Theorem 3 bounds target regret with selected-information growth and certificate error terms. Corollary 1 uses the same anytime radius for online choice and reported interval in the restricted special case.',caveat:'Optimism does not guarantee wins in every experimental regime. The main experiment is 24 paired seeds × 200 rounds; separate OFU stress studies have their own protocols.',ref:'Paper §4.4 · Algorithm 1 · Theorem 3 · Corollary 1 · §5.1/5.3'}
  ];
  const expand=document.getElementById('method-expansion');
  const cards=Array.from(document.querySelectorAll('[data-method]'));
  let selected=-1;
  function closeMethod(){selected=-1;if(expand)expand.hidden=true;cards.forEach(c=>c.setAttribute('aria-expanded','false'));}
  function openMethod(i){if(selected===i){closeMethod();return;}const v=modules[i];if(!v)return;selected=i;
    const parts={'method-deep-tag':v.tag,'method-deep-title':v.title,'method-deep-lead':v.lead,'method-deep-theory':v.theory,'method-deep-io':v.io,'method-deep-proof':v.proof,'method-deep-caveat':v.caveat,'method-deep-reference':v.ref};
    Object.entries(parts).forEach(([id,s])=>{const el=document.getElementById(id);if(el)el.textContent=s;});
    expand.hidden=false;cards.forEach(c=>c.setAttribute('aria-expanded',String(+c.dataset.method===i)));
  }
  cards.forEach(c=>{c.addEventListener('click',()=>openMethod(+c.dataset.method));c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openMethod(+c.dataset.method);}});});
  document.getElementById('method-close')?.addEventListener('click',closeMethod);
})();
