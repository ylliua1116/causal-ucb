/* CAUSAL-UCB V8 — paper-archived certified study.
   All archived numbers are read from original cert_dr_all_rounds, per_seed,
   summary and paired_regret files. Never infer terminal ATE from per-round decisions.
   The LIVE conditional lab is maintained separately in lab.js. */
(()=>{
 'use strict';
 const root=document.getElementById('cert-benchmark');if(!root)return;
 const $=id=>document.getElementById(id);
 const NAMESPACE='http://www.w3.org/2000/svg';
 const methods=['CAUSAL-UCB-CERT-DR','CAUSAL-UCB-CERT-IPS'];
 const short=['Certified DR','Certified IPS'];
 const colors=['#1b6b9c','#31a58e'];
 const metrics={
  regret:{name:'Cumulative target regret',label:'Cumulative regret',explanation:'Recorded cumulative oracle target regret. The oracle is used after action selection for evaluation only, not for the algorithm’s decisions.',unit:'Cumulative target regret'},
  deployment:{name:'Cumulative deployment gap',label:'Deployment gap',explanation:'Accumulated cost of the exploration/measurement regime. A lower regret can incur a higher deployment cost.',unit:'Cumulative deployment gap'},
  radius:{name:'Pre-decision radius (logged)',label:'Predecision radius',explanation:'Radius recorded before each online configuration choice; distinct from the final, worst-pair certified width in the summary table.',unit:'Pre-decision radius'},
  ate:{name:'Terminal maximum pairwise ATE error',label:'Final ATE error',explanation:'Available only as a terminal statistic for each seed. This plot compares the 24-seed mean (or one seed) and never invents a round-by-round ATE trajectory.',unit:'Max pairwise ATE error'}
 };
 let source=null,condition='high_mismatch',selection='mean',metric='regret',round=200,timer=null;
 const f=(x,d=3)=>Number.isFinite(Number(x))?Number(x).toFixed(d):'—';
 const pct=x=>`${(100*x).toFixed(1)}%`;
 const esc=str=>String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const NS=(name,attrs={},text)=>{let el=document.createElementNS(NAMESPACE,name);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));if(text!=null)el.textContent=String(text);return el};
 function stop(){if(timer){clearInterval(timer);timer=null;} $('v8-play').textContent='▶ Play';}
 function current(){return source.conditions[condition]}
 function own(m){return current().methods[m]}
 function entry(m){if(selection==='mean')return null;return own(m).seeds.find(s=>String(s.seed)===selection)}
 function from(m,key,t){
   const row=entry(m);
   if(row)return row[key][t-1];
   return own(m).charts[key][t-1][1];
 }
 function render(){if(!source)return;
   const obj=current(),full=metric==='ate';
   $('v8-regime').value=condition;
   $('v8-cohort').value=selection;
   $('v8-chart-heading').textContent=metrics[metric].name;
   $('v8-metric-explainer').textContent=metrics[metric].explanation;
   $('v8-chart-kicker').textContent=full?'FINAL SAVED ESTIMATOR QUALITY · NO PER-ROUND ATE':'SOURCE ROUND LOG · DESCRIPTIVE SEED-MEAN INTERVAL';
   $('v8-round-tag').textContent=full?'Terminal only':`Round ${round} / 200`;
   $('v8-round-current').textContent=full?'END':String(round);
   $('v8-round').value=round;
   $('v8-round').disabled=full;
   $('v8-play').disabled=full;
   $('v8-replay').disabled=full;
   $('v8-table-subhead').textContent=`${selection==='mean'?'24-seed means':'Seed '+selection} · ${full?'final':`round ${round} of 200`}`;
   root.querySelectorAll('[data-v8-metric]').forEach(b=>{const active=b.dataset.v8Metric===metric;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
   if(full)drawTerminal();else drawSeries();
   renderTable();renderInterpretation();
 }
 function drawAxes(svg, maxY,yLabel,chartSize){
   const {L=70,R=25,T=24,B=48,W=800,H=340}=chartSize;
   const y=v=>T+(1-v/maxY)*(H-T-B);
   for(let i=0;i<5;i++){
      const value=maxY*i/4;
      svg.append(NS('line',{x1:L,x2:W-R,y1:y(value),y2:y(value),stroke:'#e7edf6','stroke-width':1}));
      svg.append(NS('text',{x:L-12,y:y(value)+4,'text-anchor':'end',fill:'#8293aa','font-size':12},f(value,value>=10?1:2)));
   }
   svg.append(NS('text',{x:W/2,y:H-6,'text-anchor':'middle',fill:'#8293aa','font-size':12},yLabel));
   return {y,L,R,T,B,W,H};
 }
 function drawSeries(){
   const svg=$('v8-archive-plot');svg.replaceChildren();
   const W=800,H=340,L=68,R=30,T=27,B=49,x=t=>L+((t-1)/199)*(W-L-R);
   const series=methods.map((m,i)=>{
     if(selection==='mean')return {name:short[i],mean:own(m).charts[metric].map(a=>a[1]),lower:own(m).charts[metric].map(a=>Math.max(0,a[2])),upper:own(m).charts[metric].map(a=>a[3])};
     return {name:short[i],mean:entry(m)[metric]};
   });
   const maxY=Math.max(...series.flatMap(s=>s.upper||s.mean),.01)*1.15;
   const {y}=drawAxes(svg,maxY,metrics[metric].unit,{W,H,L,R,T,B});
   [1,40,80,120,160,200].forEach(t=>svg.append(NS('text',{x:x(t),y:H-B+20,'text-anchor':'middle',fill:'#8193a9','font-size':12},t)));
   const smooth=(values,to)=>values.slice(0,to).map((v,i)=>`${i?'L':'M'}${x(i+1).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
   series.forEach((s,j)=>{
     const color=colors[j];
     svg.append(NS('path',{d:smooth(s.mean,200),stroke:color,'stroke-width':2,'stroke-dasharray':'4 7',fill:'none',opacity:.16}));
     if(s.upper){
       const n=round,coords=[];
       for(let i=0;i<n;i++)coords.push(`${x(i+1).toFixed(2)},${y(s.upper[i]).toFixed(2)}`);
       for(let i=n-1;i>=0;i--)coords.push(`${x(i+1).toFixed(2)},${y(s.lower[i]).toFixed(2)}`);
       svg.append(NS('polygon',{points:coords.join(' '),fill:color,opacity:.095}));
     }
     const p=NS('path',{d:smooth(s.mean,round),stroke:color,'stroke-width':3.3,fill:'none','stroke-linejoin':'round','stroke-linecap':'round'});
     if(j===1)p.setAttribute('stroke-dasharray','8 5');
     svg.append(p);
     svg.append(NS('circle',{cx:x(round),cy:y(s.mean[round-1]),r:5.2,fill:'#fff',stroke:color,'stroke-width':3}));
   });
   svg.append(NS('line',{x1:x(round),y1:T,x2:x(round),y2:H-B,stroke:'#b3bfd2','stroke-dasharray':'3 6','stroke-width':1.2}));
   svg.setAttribute('aria-label',`${metrics[metric].name} for certified DR and IPS through round ${round}, ${selection==='mean'?'24 paired seed mean':'seed '+selection}`);
   $('v8-chart-note').textContent=selection==='mean'?'Mean trajectories across 24 paired seeds. Shaded intervals are descriptive 95% Student-t intervals for each mean, not the online decision certificates. The graph is replayed from the recorded 200 rounds.':'One exact saved seed trajectory with recorded configurations. This chart is not a cross-seed average or a new online run.';
 }
 function drawTerminal(){
   const svg=$('v8-archive-plot');svg.replaceChildren();
   const vals=methods.map(m=>selection==='mean'?own(m).summary.ATE_mean:entry(m).ATE_error);
   const err=methods.map(m=>{
     if(selection!=='mean')return 0;
     const data=own(m).seeds.map(s=>s.ATE_error),mean=data.reduce((a,b)=>a+b,0)/data.length;
     const variance=data.reduce((a,b)=>a+(b-mean)**2,0)/(data.length-1);
     return 2.06865761*Math.sqrt(variance/data.length);
   });
   const maxY=Math.max(...vals.map((v,i)=>v+err[i]),.01)*1.27;
   const {y}=drawAxes(svg,maxY,'Terminal max pairwise ATE error',{W:800,H:340,L:70,R:25,T:26,B:55});
   methods.forEach((m,i)=>{
     const cx=255+i*315,bottom=y(0),top=y(vals[i]);
     svg.append(NS('rect',{x:cx-58,y:top,width:116,height:Math.max(1,bottom-top),rx:9,fill:colors[i],opacity:.88}));
     if(selection==='mean'){
       const lo=y(Math.max(0,vals[i]-err[i])),hi=y(vals[i]+err[i]);
       svg.append(NS('line',{x1:cx,x2:cx,y1:hi,y2:lo,stroke:'#183552','stroke-width':2}));
       for(const yp of [lo,hi])svg.append(NS('line',{x1:cx-14,x2:cx+14,y1:yp,y2:yp,stroke:'#183552','stroke-width':2}));
     }
     svg.append(NS('text',{x:cx,y:top-18,'text-anchor':'middle','font-size':18,'font-weight':750,fill:colors[i]},f(vals[i],4)));
     svg.append(NS('text',{x:cx,y:315,'text-anchor':'middle','font-size':14,fill:'#334d6b','font-weight':700},short[i]));
   });
   svg.setAttribute('aria-label','Terminal max pairwise ATE error; no per-round estimates are available');
   $('v8-chart-note').textContent=selection==='mean'?'Exact 24-seed ATE means from summary.csv, with descriptive t-intervals calculated from original per_seed.csv. This is a terminal comparison, not a fabricated online time series.':'Final observed pairwise ATE error for one archived random seed. Synthetic oracle truth is diagnostic and not an input to online policy choice.';
 }
 function cell(textValue,cls){const td=document.createElement('td');td.textContent=textValue;if(cls)td.className=cls;return td}
 function renderTable(){
   const body=$('v8-record-body');body.replaceChildren();
   methods.forEach((m,i)=>{
     const s=own(m).summary,v=entry(m),tr=document.createElement('tr');
     tr.append(cell(short[i],i===0?'v8-dr':'v8-ips'));
     tr.append(cell(f(selection==='mean'&&(metric==='ate'||round===200)?s.regret_mean:from(m,'regret',metric==='ate'?200:round))));
     tr.append(cell(f(selection==='mean'&&(metric==='ate'||round===200)?s.deploy_mean:from(m,'deployment',metric==='ate'?200:round))));
     tr.append(cell(f(from(m,'radius',metric==='ate'?200:round),4)));
     tr.append(cell(f(v?v.ATE_error:s.ATE_mean,4)));
     tr.append(cell(f(v?v.width_decision_certificate:s.width_decision_certificate_mean,4)));
     tr.append(cell(v?(metric==='ate'?`z${v.config[199]}`:`z${v.config[round-1]}`):'— (mean)'));
     body.append(tr);
   });
 }
 function renderInterpretation(){
   const obj=current();
   const reg=methods.map(m=>own(m).summary.regret_mean);
   const ips=own(methods[1]).summary,dr=own(methods[0]).summary;
   const cmp=source.paired.find(r=>r.condition===condition&&r.contrast==='CERT-DR minus CAUSAL-UCB-CERT-IPS');
   const gr=obj.baseline_summaries.find(r=>r.method==='Greedy-Raw');
   const ref=obj.baseline_summaries.find(r=>r.method==='CAUSAL-UCB');
   const refIps=obj.baseline_summaries.find(r=>r.method==='IPS-UCB');
   const matched=obj.matching_config_choices.mean_fraction;
   $('v8-interp-title').textContent=condition==='high_mismatch'?'High mismatch: certified selection matters.':'Low mismatch: decisions almost coincide.';
   $('v8-paired-result').textContent=`Mean regret ${f(reg[0])} (certified DR) vs ${f(reg[1])} (certified IPS). Paired DR − IPS difference: ${f(cmp.mean)}; 95% Student-t CI [${f(cmp.CI95_lower)}, ${f(cmp.CI95_upper)}]. DR has lower regret in ${cmp.CERT_DR_lower_count} of 24 seeds (${cmp.ties} ties); this is not per-seed dominance. Across the two archived trajectories, ${pct(matched)} of configuration choices coincide.`;
   $('v8-estimation-result').textContent=`Earlier/reference CAUSAL-UCB and IPS-UCB have matching mean regret ${f(ref.regret)} vs ${f(refIps.regret)} here, despite terminal ATE errors ${f(ref.ate,4)} vs ${f(refIps.ate,4)}. Smaller estimation error does not alone guarantee a better online decision sequence. The archived live demo below reproduces this type of phenomenon in a separate short-horizon setting.`;
   $('v8-cost-result').textContent=`Certified DR vs IPS terminal ATE error: ${f(dr.ATE_mean,4)} vs ${f(ips.ATE_mean,4)}; certified worst-pair width ${f(dr.width_decision_certificate_mean)} vs ${f(ips.width_decision_certificate_mean)}. But deployment gap is ${f(dr.deploy_mean)} vs ${f(ips.deploy_mean)} (DR costs more). Greedy-Raw regret ${f(gr.regret)}${condition==='low_mismatch'?', lower than certified DR in this regime.':'; do not interpret the comparison as uniform superiority.'}`;
   const tbody=$('v8-baseline-body');tbody.replaceChildren();
   obj.baseline_summaries.forEach(r=>{const tr=document.createElement('tr');
     tr.append(cell(r.method),cell(f(r.regret)),cell(f(r.ate,4)),cell(r.certificate_width==null?'—':f(r.certificate_width)),cell(f(r.deploy)));tbody.append(tr)});
 }
 function populate(){
   const select=$('v8-cohort');select.replaceChildren();
   const make=(value,label)=>{let e=document.createElement('option');e.value=String(value);e.textContent=label;return e};
   select.append(make('mean','24-seed mean (paired)'));
   own(methods[0]).seeds.forEach(e=>select.append(make(e.seed,`Seed ${e.seed} · exact trajectory`)));
   if(![...select.options].some(o=>o.value===selection))selection='mean';
   select.value=selection;
 }
 $('v8-regime').addEventListener('change',e=>{condition=e.target.value;stop();round=200;selection='mean';populate();render()});
 $('v8-cohort').addEventListener('change',e=>{selection=e.target.value;stop();round=200;render()});
 root.querySelectorAll('[data-v8-metric]').forEach(b=>b.addEventListener('click',()=>{metric=b.dataset.v8Metric;stop();round=200;render()}));
 $('v8-round').addEventListener('input',e=>{stop();round=Number(e.target.value);render()});
 $('v8-replay').addEventListener('click',()=>{stop();round=1;render();start()});
 function start(){if(metric==='ate')return;if(round>=200)round=1;render();$('v8-play').textContent='Ⅱ Pause';timer=setInterval(()=>{round=Math.min(200,round+1);render();if(round===200)stop()},55)}
 $('v8-play').addEventListener('click',()=>{if(timer)stop();else start()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 fetch('assets/certified-benchmark/certified-replay.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{
   if(data.version!=='v8-certified-archived'||!data.conditions?.high_mismatch?.methods?.[methods[0]])throw Error('Unexpected archive format');
   source=data;populate();render();
 }).catch(err=>{$('v8-archive-plot').textContent='Could not load archived experiment records.';$('v8-chart-note').textContent=`Error: ${err.message}. Try serving this site over HTTP(S), not file://.`;$('v8-record-body').textContent='Data unavailable.';});
})();
