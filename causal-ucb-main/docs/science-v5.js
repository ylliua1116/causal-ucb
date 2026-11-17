/* CAUSAL-UCB V5 · A single-point replay of saved experiment records.
 * This does NOT execute training or create intermediate observations.
 */
(() => {
  'use strict';
  const root=document.querySelector('.science-replay');
  const data=window.CAUSAL_UCB_EVIDENCE_DATA;
  if(!root || !data?.charts?.length) { if(root)root.textContent='Recorded evidence data not found.'; return; }
  const charts=data.charts;
  const ids=['regret','ate','width','interference_regret','interference_ate','trace'];
  const labels={'regret':'01  Target regret','ate':'02  Causal ATE','width':'03  Certificate','interference_regret':'04  ρ · Regret','interference_ate':'05  ρ · ATE','trace':'06  Traces'};
  const palette=['#61e5d5','#83aaff','#f3ab6c','#c49af8','#f48fb3','#efcd82','#a5b6ca'];
  const colorMap={'CAUSAL-UCB-CERT-DR':'#5be0cd','CAUSAL-UCB-CERT-IPS':'#8bb6ff','CAUSAL-UCB':'#efa76a','IPS-UCB':'#b99cf4','Raw-UCB':'#f089b0','Greedy-Raw':'#e8c976','Switchback-OED':'#a3b7c8'};
  const el=id=>document.getElementById(id);
  const svg=el('science-chart'),tabs=el('science-tabs'),tbody=el('science-table-body'),range=el('replay-progress');
  const NS='http://www.w3.org/2000/svg';
  const S=(type,attrs={},text)=>{const node=document.createElementNS(NS,type);for(const [k,v] of Object.entries(attrs)) node.setAttribute(k,String(v));if(text!==undefined)node.textContent=text;return node;};
  let active=0,step=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,hidden=new Set(),inView=false,lastTime=0;
  const current=()=>charts.find(c=>c.id===ids[active]);
  const xkeys=c=>[...new Set(c.series.flatMap(s=>s.points.map(p=>p[0])))].sort((a,b)=>a-b);
  const fmt=v=>v===undefined?'—':Number(v).toFixed(Math.abs(v)>=100?1:Math.abs(v)>=10?2:4);
  const selectedX=()=>xkeys(current())[step];
  for(const [i,id] of ids.entries()) {
    const button=document.createElement('button');button.type='button';button.role='tab';button.textContent=labels[id];button.className=i===0?'active':'';
    button.setAttribute('aria-selected',i===0?'true':'false');button.addEventListener('click',()=>pick(i));tabs.append(button);
  }
  function pick(i){ active=i;step=0;hidden.clear();playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;lastTime=0;render(); }
  function draw(){
    const c=current(), xs=xkeys(c), now=xs[step], all=c.series.flatMap(s=>s.points);
    svg.replaceChildren();
    const W=750,H=340,L=68,R=24,T=22,B=55;
    const minX=Math.min(...xs),maxX=Math.max(...xs);
    let minY=Math.min(0,...all.map(p=>p[1]));let maxY=Math.max(...all.map(p=>p[1]));
    if(Math.abs(maxY-minY)<1e-9)maxY=minY+1;
    maxY+=.07*(maxY-minY);
    const xp=x=>L+(x-minX)/(maxX-minX||1)*(W-L-R);
    const yp=y=>H-B-(y-minY)/(maxY-minY)*(H-T-B);
    for(let i=0;i<5;i++){
      const y=minY+(maxY-minY)*(i/4),px=yp(y);
      svg.append(S('line',{x1:L,y1:px,x2:W-R,y2:px,stroke:'#294861','stroke-width':1,'stroke-dasharray':i===0?'0':'4 7'}));
      svg.append(S('text',{x:L-12,y:px+4,'text-anchor':'end',fill:'#a1b8cc','font-size':11},fmt(y)));
    }
    const xTicks=c.unit==='round'?[1,50,100,150,200]:xs;
    xTicks.forEach(x=>{const label=c.unit==='dataset'?c.xValues[x-1]:c.unit==='sweep'?String(x):String(x);svg.append(S('text',{x:xp(x),y:H-B+22,'text-anchor':'middle',fill:'#a1b8cc','font-size':11},label));});
    svg.append(S('text',{x:W/2,y:H-10,'text-anchor':'middle',fill:'#9ebbd1','font-size':12},c.xLabel));
    const lineY=yp(0);svg.append(S('line',{x1:L,y1:lineY,x2:W-R,y2:lineY,stroke:'#7790a8','stroke-width':1,opacity:.58}));
    // A faint full-run guide makes the chart legible before the animation starts.
    c.series.forEach((series,i)=>{
      if(hidden.has(series.name))return;
      const color=colorMap[series.name]||palette[i%palette.length];
      if(c.type==='bar'){
        const BW=31,gap=4,n=c.series.length;
        series.points.forEach(([x,y])=>{
          const anchor=xp(x),bx=anchor-(n*(BW+gap))/2+i*(BW+gap);
          svg.append(S('rect',{x:bx,y:yp(y),width:BW,height:Math.max(0,yp(0)-yp(y)),rx:4,fill:color,opacity:x<=now?.99:.12}));
          if(x===now)svg.append(S('text',{x:bx+BW/2,y:yp(y)-7,'text-anchor':'middle',fill:color,'font-size':10},fmt(y)));
        });
      } else {
        const makePath=pts=>pts.map(([x,y],j)=>`${j?'L':'M'}${xp(x).toFixed(2)},${yp(y).toFixed(2)}`).join(' ');
        const allPath=makePath(series.points);
        svg.append(S('path',{d:allPath,stroke:color,'stroke-width':2.0,'stroke-dasharray':'4 6',opacity:.23,fill:'none'}));
        const seen=series.points.filter(([x])=>x<=now);
        if(seen.length){
          svg.append(S('path',{d:makePath(seen),stroke:color,'stroke-width':3.2,'stroke-linecap':'round','stroke-linejoin':'round',fill:'none'}));
          const [x,y]=seen[seen.length-1];
          svg.append(S('circle',{cx:xp(x),cy:yp(y),r:6.2,fill:color,stroke:'#0a2238','stroke-width':2}));
        }
      }
    });
    if(c.type!=='bar')svg.append(S('line',{x1:xp(now),x2:xp(now),y1:T,y2:H-B,stroke:'#b1d6f0','stroke-width':1.2,'stroke-dasharray':'3 7',opacity:.55}));
    el('checkpoint-label').textContent=c.unit==='round'?'RECORDED ROUND':c.unit==='dataset'?'TRACE DATASET':'INTERFERENCE ρ';
    el('checkpoint-value').textContent=c.unit==='dataset'?c.xValues[now-1]:c.unit==='round'?`${now} / 200`:String(now);
    tbody.replaceChildren();
    c.series.forEach((series,i)=>{
      const row=series.points.find(([x])=>x===now);
      const tr=document.createElement('tr');tr.className=hidden.has(series.name)?'hidden-row':'';
      const th=document.createElement('th');const btn=document.createElement('button');btn.type='button';btn.className='series-switch';btn.setAttribute('aria-pressed',hidden.has(series.name)?'false':'true');
      const swatch=document.createElement('i');swatch.style.background=colorMap[series.name]||palette[i%palette.length];btn.append(swatch,document.createTextNode(series.name));
      btn.addEventListener('click',()=>{if(hidden.has(series.name))hidden.delete(series.name);else hidden.add(series.name);render(false);});th.append(btn);
      const td=document.createElement('td');td.textContent=row?fmt(row[1]):'—';tr.append(th,td);tbody.append(tr);
    });
    el('replay-current-note').textContent=(c.unit==='round'?`Round ${now}: checkpoint values of ${c.series.length} saved method trajectories.`:c.unit==='sweep'?`Interference level ρ = ${now}; independent parameter setting, not a time step.`:`${c.xValues[now-1]}: separate trace-driven semi-synthetic evaluation, not live telemetry.`);
    el('replay-provenance').textContent=(c.unit==='round'?data.provenance.controlled:c.unit==='sweep'?data.provenance.interference:data.provenance.trace);
  }
  function render(updateTabs=true){
    const c=current(),xs=xkeys(c);step=Math.max(0,Math.min(xs.length-1,step));
    if(updateTabs)[...tabs.children].forEach((b,i)=>{b.classList.toggle('active',i===active);b.setAttribute('aria-selected',String(i===active));});
    el('replay-scope').textContent=c.unit==='round'?'24 paired seeds · 200-round benchmark':c.unit==='dataset'?'8 independent seeds × 180 rounds · traces':'Interference sensitivity · five preset settings';
    el('replay-title').textContent=c.title;
    el('replay-subtitle').textContent=c.subtitle;
    el('replay-number-heading').textContent=c.yLabel;
    el('replay-begin').textContent=c.unit==='round'?'ROUND 1':c.unit==='dataset'?'METR-LA':'LOW ρ';
    el('replay-end').textContent=c.unit==='round'?'ROUND 200':c.unit==='dataset'?'FLOCKLAB':'HIGH ρ';
    range.max=xs.length-1;range.value=step;
    el('replay-play').textContent=playing?'Ⅱ Pause':'▶ Play';
    draw();
  }
  function loop(time){
    if(inView&&playing&&!document.hidden){
      if(!lastTime)lastTime=time;
      if(time-lastTime>=(current().unit==='round'?630:1150)){
        lastTime=time;step++;
        if(step>=xkeys(current()).length){step=xkeys(current()).length-1;playing=false;}
        render(false);
      }
    }else lastTime=0;
    requestAnimationFrame(loop);
  }
  el('replay-play').addEventListener('click',()=>{if(!playing&&step===xkeys(current()).length-1)step=0;playing=!playing;lastTime=0;render(false);});
  el('replay-reset').addEventListener('click',()=>{step=0;playing=true;lastTime=0;render(false);});
  el('replay-next').addEventListener('click',()=>{playing=false;step=(step+1)%xkeys(current()).length;render(false);});
  range.addEventListener('input',()=>{playing=false;step=+range.value;render(false);});
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{inView=es.some(e=>e.isIntersecting);lastTime=0;},{threshold:.04}).observe(root);}else inView=true;
  // High-resolution figure crops from the user-supplied 66-page revision (paper pages 8–10).
  const plates=[
    ['Fig. 3 · Certified online selection','24 paired seeds and 200 rounds: target regret, maximum pairwise ATE error and decision-active confidence width.'],
    ['Fig. 4 · Interference sensitivity','Five interference strengths; target regret and pairwise ATE error are separate metrics.'],
    ['Fig. 5 · Overlap is not context transport','Action–exposure support, post-burn-in context shift and joint matching across three overlap regimes.'],
    ['Fig. 6 · Mechanism ablations','Controlled variants test doubly robust correction, exposure representation, and exploration; no-OFU is not an isolated optimism intervention.'],
    ['Fig. 7 · Identification–deployment trade-off','Exploration-rate sensitivity and measured target-regret versus deployment-gap trade-off; not a general Pareto guarantee.']
  ];
  const plateTabs=document.querySelectorAll('[data-plate]');
  plateTabs.forEach(b=>b.addEventListener('click',()=>{
    const i=+b.dataset.plate,src=`assets/paper-figures/paper-figure-${i+3}.png`;
    el('paper-plate-image').src=src;el('paper-plate-image').alt=`Supplied manuscript Figure ${i+3}`;el('paper-plate-link').href=src;
    el('paper-plate-caption').textContent=plates[i][0];el('paper-plate-description').textContent=plates[i][1];const page=[8,9,9,10,10][i];el('paper-plate-page').textContent=page;el('paper-figure-source').href=`assets/paper/CAUSAL_UCB_2026_Latest_66p.pdf#page=${page}`;
    plateTabs.forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-selected',String(t===b));t.tabIndex=t===b?0:-1;});
  }));
  // Exact figure artwork cropped from the supplied 66-page revision; audit numbers/pages checked against that PDF.
  const audits=[
    ['FIG. 28 · PDF PAGE 61 · 300 SEEDS × 160 ROUNDS',
     'Full-path coverage & OFU inequality',
     'The full-path target-value coverage and OFU path inequality each hold for all 300 of 300 independent audited paths (160 rounds each), with 95% Wilson intervals.',
     'This is an empirical audit of the stated finite-state, calibrated restricted model—not unconditional certification of arbitrary networks.',
     'assets/paper-audit-figures/Fig28_Full_Path_Coverage_p61.png',28,61],
    ['FIG. 26 · PDF PAGE 60 · 18-CELL GAP/NOISE/BUDGET SWEEP',
     'Certified optimism: gap, noise and budget',
     'A 3-gap × 3-noise × 2-budget paired comparison of optimistic selection against certified greedy selection. Differences below zero favor OFU.',
     'The benefit is regime-dependent and the bars are descriptive paired 95% Student-t intervals, not a guarantee that optimism always wins.',
     'assets/paper-audit-figures/Fig26_Optimism_vs_Greedy_p60.png',26,60],
    ['FIG. 27 · PDF PAGE 60 · 18 PAIRED CELLS × 24 SEEDS',
     'Paired regret differences across 18 conditions',
     'The paired 18-cell OFU-minus-Greedy regret forest uses 95% Student-t intervals over 24 paired seeds per cell.',
     'The zero line denotes equal mean regret. Figure 27 is not the 300-seed full-path coverage audit; that is Figure 28.',
     'assets/paper-audit-figures/Fig27_Paired_Regret_18_Cells_p60.png',27,60],
    ['FIG. 31 · PDF PAGE 62 · HIDDEN ASSUMPTION VIOLATIONS',
     'Certificate diagnostics under hidden violations',
     'Full-path coverage conditional on false certificate issuance under six hidden assumption violations, with Wilson intervals; alongside final average radius with Student-t intervals.',
     'Deliberately violated assumptions remove the formal certificate guarantee. Some empirical coverage under misspecification is not evidence of universal validity.',
     'assets/paper-audit-figures/Fig31_Hidden_Misspecification_p62.png',31,62]
  ];
  const audButtons=document.querySelectorAll('[data-audit]');
  audButtons.forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.audit, a=audits[i];
    el('audit-protocol').textContent=a[0];el('audit-title').textContent=a[1];el('audit-desc').textContent=a[2];el('audit-boundary').textContent=a[3];el('audit-image').src=a[4];el('audit-image').alt=a[1];el('audit-image-link').href=a[4];el('audit-original').href=a[4];const auditSource=el('audit-source'), auditPaper=el('audit-paper-link');if(auditSource)auditSource.textContent=`Source: manuscript Figure ${a[5]}, p. ${a[6]} · extracted directly from the supplied PDF.`;if(auditPaper)auditPaper.href=`assets/paper/CAUSAL_UCB_2026_Latest_66p.pdf#page=${a[6]}`;
    audButtons.forEach(t=>{t.classList.toggle('active',b===t);t.setAttribute('aria-selected',String(b===t));});
  }));
  render();requestAnimationFrame(loop);
})();
