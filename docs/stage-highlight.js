/* Passive five-stage highlight; never expands a detail panel without user click. */
(() => {
 'use strict';
 const stageNodes=Array.from(document.querySelectorAll('.flow-interactive [data-flow]'));
 if(stageNodes.length!==5)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let phase=-1;
 function tick(){
   if(document.hidden||reduced.matches||document.documentElement.classList.contains('motion-off'))return;
   phase=(phase+1)%stageNodes.length;
   stageNodes.forEach((n,i)=>n.classList.toggle('flow-passive-focus',i===phase));
 }
 tick();window.setInterval(tick,2300);
})();
