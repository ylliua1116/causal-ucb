/* CAUSAL-UCB Figures. Accessibility and interaction safeguards for source-figure galleries.
   Keeps the underlying figure selection in figure-viewer.js; no experiment changes. */
(()=>{
  'use strict';
  for(const id of ['paper-plate-tabs','audit-tabs']){
    const container=document.getElementById(id);
    if(!container)continue;
    const buttons=[...container.querySelectorAll('button[role="tab"]')];
    for(let i=0;i<buttons.length;i++){
      const button=buttons[i];
      button.type='button';
      button.addEventListener('keydown',(e)=>{
        let index=i;
        if(e.key==='ArrowRight'||e.key==='ArrowDown')index=(i+1)%buttons.length;
        else if(e.key==='ArrowLeft'||e.key==='ArrowUp')index=(i+buttons.length-1)%buttons.length;
        else if(e.key==='Home')index=0;
        else if(e.key==='End')index=buttons.length-1;
        else return;
        e.preventDefault();
        buttons[index].click();
        buttons[index].focus({preventScroll:true});
      });
    }
  }
  const imgs=['paper-plate-image','audit-image'];
  for(const id of imgs){
    const im=document.getElementById(id);
    if(im){im.addEventListener('error',()=>{im.setAttribute('aria-label','Figure image failed to load. Use the manuscript PDF source link.');});}
  }
  document.getElementById('paper-plate-caption')?.setAttribute('aria-live','polite');
  document.getElementById('audit-title')?.setAttribute('aria-live','polite');
})();
