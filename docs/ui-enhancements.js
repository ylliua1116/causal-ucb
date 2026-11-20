/* Presentation-only enhancement; CAUSAL-UCB / IPS algorithms and results are not modified. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const methodPicker=$('unified-method-picker');
  if(methodPicker){
    document.addEventListener('pointerdown',ev=>{
      if(methodPicker.open&&!methodPicker.contains(ev.target))methodPicker.open=false;
    });
    document.addEventListener('keydown',ev=>{
      if(ev.key==='Escape'&&methodPicker.open){methodPicker.open=false;methodPicker.querySelector('summary')?.focus();}
    });
  }
  const liveSummary=$('unified-live-summary');
  const updateSummary=()=>{
    if(!liveSummary)return;
    const rounds=$('lab-rounds')?.value??'40';
    const eta=$('lab-eta')?.value??'0.55';
    const rho=$('lab-rho')?.value??'1.0';
    const seed=$('lab-seed')?.value??'42';
    liveSummary.textContent=`${rounds} rounds · η ${Number(eta).toFixed(2)} · ρ ${Number(rho).toFixed(2)} · seed ${seed}`;
  };
  ['lab-rounds','lab-eta','lab-rho','lab-seed'].forEach(id=>{
    const el=$(id);if(el){el.addEventListener('input',updateSummary);el.addEventListener('change',updateSummary);}
  });
  updateSummary();
  const noteToggle=document.querySelector('.unified-lab-one-liner a');
  const notePanel=$('unified-lab-notes');
  if(noteToggle&&notePanel)noteToggle.addEventListener('click',()=>{notePanel.hidden=false;notePanel.open=true;});
})();
