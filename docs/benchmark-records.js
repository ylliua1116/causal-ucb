/* CAUSAL-UCB benchmark comparison | scientific seven-method comparison.
 * 24 paired seeds x 200 rounds. High mismatch: 7 archived trajectories.
 * Low mismatch: 2 archived certified trajectories and 5 new deterministic
 * replays verified against all archived decision hashes and terminal metrics.
 * No interpolated series and no reference-method certification claims.
 * Separately maintained Live Lab (lab.js) runs different conditional/reference Python policies.
 */
(()=>{
 'use strict';
 const root=document.getElementById('cert-benchmark');if(!root)return;
 const $=id=>document.getElementById(id);
 const NS='http://www.w3.org/2000/svg';
 const METHODS=['CAUSAL-UCB-CERT-DR','CAUSAL-UCB-CERT-IPS','CAUSAL-UCB','IPS-UCB','Raw-UCB','Greedy-Raw','Switchback-OED'];
 const NAMES=['Certified CAUSAL-UCB (DR)','Certified IPS-UCB','Reference CAUSAL-UCB','Reference IPS-UCB','Raw-UCB','Greedy-Raw','Switchback-OED'];
 const COLORS=['#1767a0','#23a18f','#805ac0','#c57b31','#d05b78','#647e9f','#2d92ac'];
 const DASH=['','9 5','','7 4','4 5','3 5','12 4 2 4'];
 const tCritical=2.068657610;
 const metrics={
  regret:{label:'Cumulative target regret',final:'regret',desc:'Lower is better · oracle target values are used after decisions for evaluation only.'},
  deployment:{label:'Cumulative deployment gap',final:'deployment',desc:'Accumulated exploration/measurement loss. CAUSAL-UCB can reduce regret while incurring a higher deployment cost.'},
  ate:{label:'Terminal maximum pairwise ATE error',final:'ate',desc:'Only terminal observations are recorded. No per-round ATE error is invented.'},
  width:{label:'Certified worst-pair diameter (final)',final:'width',desc:'Valid decision-active certificates are available only for the two certified methods. “N/A” for the other five is intentional, not zero.'}
 };
 let src=null,regime='high_mismatch',selectedSeed='mean',metric='regret',view='trajectory',step=200,showCI=false,playing=null;
 const selected=new Set(METHODS);
 const fmt=(x,d=3)=>Number.isFinite(Number(x))&&x!==null&&x!==undefined?Number(x).toFixed(d):'—';
 const svg=(tag,attrs={},content)=>{const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));if(content!==undefined)n.textContent=String(content);return n};
 const termOnly=()=>metric==='ate'||metric==='width';
 const seedRecord=m=>src.conditions[regime].methods[m].seeds[selectedSeed];
 const data=m=>src.conditions[regime].methods[m];
 const methods=()=>METHODS.filter(m=>selected.has(m));
 const isCertified=m=>METHODS.indexOf(m)<2;
 const label=m=>NAMES[METHODS.indexOf(m)];
 const color=m=>COLORS[METHODS.indexOf(m)];
 const condition=()=>src.conditions[regime];
 const isReplayed=m=>regime==='low_mismatch'&&!isCertified(m);
 const sourceLabel=m=>isReplayed(m)?'200r replay · verified':'200r archive';
 function selectedConfigCell(m){
   if(selectedSeed!=='mean'){
     const rec=seedRecord(m);
     if(view==='trajectory'&&!termOnly()&&rec?.trace?.config)return `z${rec.trace.config[step-1]}`;
     return Number.isInteger(rec?.terminal_config)?`z${rec.terminal_config}`:'—';
   }
   const records=Object.values(data(m).seeds);
   const atRound=view==='trajectory'&&!termOnly()&&step<200;
   const cfgs=records.map(r=>atRound?r.trace?.config?.[step-1]:r.terminal_config)
       .filter(n=>Number.isInteger(n));
   if(!cfgs.length)return '—';
   const counts=new Map();cfgs.forEach(z=>counts.set(z,(counts.get(z)||0)+1));
   const [cfg,n]=[...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0];
   const modal=`z${cfg} · ${n}/${cfgs.length}`;
   const best=data(m).summary?.final_best_identification_rate;
   return atRound?modal:modal+(Number.isFinite(best)?` · opt ${Math.round(100*best)}%`:'');
 }

 function stop(){if(playing!==null){clearInterval(playing);playing=null;}$('archive-play').textContent='▶ Play';}
 function values(m,key){
  if(selectedSeed==='mean')return data(m).charts?.[key]?.map(r=>r[1])||null;
  return seedRecord(m)?.trace?.[key]||null;
 }
 function point(m,key,t){const a=values(m,key);return a?.[t-1]??null}
 function finalValue(m,key){return selectedSeed==='mean'?data(m).summary[key]:seedRecord(m)?.[key]}
 function listMethods(){
  const list=$('compare-method-list');list.replaceChildren();
  METHODS.forEach((m,i)=>{
   const lab=document.createElement('label');lab.className='compare-method-option';lab.title=isReplayed(m)?'Deterministic replay verified against original final values and decision hashes':'Archived round trace and final values';
   const input=document.createElement('input');input.type='checkbox';input.checked=selected.has(m);input.value=m;
   input.addEventListener('change',()=>{if(input.checked)selected.add(m);else if(selected.size>1)selected.delete(m);else input.checked=true;stop();render()});
   const swatch=document.createElement('span');swatch.className='compare-line-swatch';swatch.style.setProperty('--line-color',COLORS[i]);
   const name=document.createElement('span');name.textContent=NAMES[i];
   const sourceBadge=document.createElement('small');sourceBadge.textContent=isReplayed(m)?'replay':'200r';
   lab.append(input,swatch,name,sourceBadge);list.append(lab);
  });
  $('compare-selected-count').textContent=String(selected.size);
 }
 function populateSeeds(){
  const box=$('archive-cohort');box.replaceChildren();
  const add=(v,txt)=>{const opt=document.createElement('option');opt.value=v;opt.textContent=txt;box.append(opt)};
  add('mean','24 paired seeds · mean');
  const ss=Object.keys(data(METHODS[0]).seeds).sort((a,b)=>Number(a)-Number(b));
  ss.forEach(s=>add(s,`Seed ${s} · matched`));
  if(![...box.options].some(o=>o.value===selectedSeed))selectedSeed='mean';
  box.value=selectedSeed;
 }
 function plotBase(S,minVal,maxVal,x0=66,x1=769,y0=25,y1=290,mode='rounds'){
  const scale=(v)=>y1-(v-minVal)/(maxVal-minVal||1)*(y1-y0);
  for(let i=0;i<=4;i++){
   const v=minVal+(maxVal-minVal)*i/4,y=scale(v);
   S.append(svg('line',{x1,x2:x1,y1:y,y2:y,stroke:'#e4edf6'}));
   S.append(svg('text',{x:x0-9,y:y+4,'text-anchor':'end',fill:'#7186a0','font-size':12},fmt(v,maxVal<2?3:2)));
  }
  if(mode==='rounds'){
   [1,40,80,120,160,200].forEach(t=>S.append(svg('text',{x:x0+(t-1)/199*(x1-x0),y:318,'text-anchor':'middle',fill:'#7186a0','font-size':12},t)));
   S.append(svg('text',{x:(x0+x1)/2,y:337,'text-anchor':'middle',fill:'#8190a3','font-size':11},'Recorded online decision round'));
  }
  return scale;
 }
 function showMessage(text){
  const chart=$('archive-archive-plot');chart.replaceChildren();chart.append(svg('text',{x:400,y:148,'text-anchor':'middle','font-size':17,fill:'#587899'},text));
  chart.append(svg('text',{x:400,y:178,'text-anchor':'middle','font-size':12,fill:'#8094a9'},'Select the valid source view or switch the methods above.'));
  $('archive-chart-note').textContent='No valid certified width for the selected methods. Baseline reference methods have no certified decision-active width; this is not zero.';
 }
 function drawTrajectory(){
  const eligible=methods().filter(m=>data(m).has_per_round),missing=methods().filter(m=>!data(m).has_per_round);
  const chart=$('archive-archive-plot');
  if(!eligible.length){showMessage('No archived round trajectories for the selected methods in this regime.');return;}
  chart.replaceChildren();chart.append(svg('title',{},`${metrics[metric].label}: ${eligible.map(label).join(', ')}`));
  const L=69,R=766,T=26,B=286,x=t=>L+(t-1)/199*(R-L);
  const datasets=eligible.map(m=>({m,v:values(m,metric)}));
  const ymax=Math.max(.01,...datasets.flatMap(d=>d.v||[]));const hi=ymax*1.10 +(.001);
  const scale=plotBase(chart,0,hi,L,R,T,B,'rounds');
  const path=(vs,n)=>vs.slice(0,n).map((v,i)=>`${i===0?'M':'L'}${x(i+1).toFixed(2)},${scale(v).toFixed(2)}`).join(' ');
  if(showCI&&selectedSeed==='mean'){
   eligible.forEach(m=>{
    const rows=data(m).charts[metric]||[],lo=rows.slice(0,step).map(r=>Math.max(0,r[2])),high=rows.slice(0,step).map(r=>r[3]);
    if(rows.length!==200)return;
    const coords=[];high.forEach((v,i)=>coords.push(`${x(i+1).toFixed(1)},${scale(v).toFixed(1)}`));
    for(let i=lo.length-1;i>=0;i--)coords.push(`${x(i+1).toFixed(1)},${scale(lo[i]).toFixed(1)}`);
    chart.append(svg('polygon',{points:coords.join(' '),fill:color(m),opacity:.045}));
   });
  }
  datasets.forEach(({m,v})=>{
    if(!v)return;
    const attrs={d:path(v,step),fill:'none',stroke:color(m),'stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'};
    if(DASH[METHODS.indexOf(m)])attrs['stroke-dasharray']=DASH[METHODS.indexOf(m)];
    chart.append(svg('path',attrs));
    chart.append(svg('circle',{cx:x(step),cy:scale(v[step-1]),r:4.4,fill:'#fff',stroke:color(m),'stroke-width':2.4}));
  });
  chart.append(svg('line',{x1:x(step),x2:x(step),y1:T,y2:B,stroke:'#b3c4d7','stroke-dasharray':'4 5'}));
  const omitted=missing.length?` ${missing.length} selected method(s) have no round traces.`:'';
  $('archive-chart-note').textContent=`${eligible.length} matched 200-round trajectories through round ${step} (${regime==='low_mismatch'?'2 original certified logs + 5 verified deterministic baseline replays':'7 original logs'}). ${selectedSeed==='mean'?'The 24-seed curves are means; t-interval bands are descriptive, not decision certificates.':'Individual seed; baseline replays match the original archived decision hashes.'}${selected.has('CAUSAL-UCB')&&selected.has('IPS-UCB')&&metric==='regret'?' Reference CAUSAL-UCB and Reference IPS-UCB have exactly overlapping regret curves: equal decisions but distinct final ATE errors.':''}${omitted}`;
 }
 function confidence(m,key){
  if(selectedSeed!=='mean')return 0;
  const arr=Object.values(data(m).seeds).map(r=>r[key]).filter(x=>x!==null&&Number.isFinite(x));
  if(arr.length!==24)return 0;
  const mean=arr.reduce((a,b)=>a+b,0)/24;
  const variance=arr.reduce((a,b)=>a+(b-mean)**2,0)/23;
  return tCritical*Math.sqrt(variance/24);
 }
 function drawFinal(){
  const plot=$('archive-archive-plot');plot.replaceChildren();
  const key=metrics[metric].final,valid=methods().filter(m=>finalValue(m,key)!==null && Number.isFinite(finalValue(m,key)));
  if(!valid.length){showMessage('No valid certified widths for this selection.');return;}
  const vals=valid.map(m=>finalValue(m,key)),errs=valid.map(m=>confidence(m,key));
  const maxV=Math.max(.001,...vals.map((v,i)=>v+(showCI?errs[i]:0)))*1.15;
  const L=264,R=722,top=30,dy=Math.min(39,265/valid.length),barH=Math.min(24,dy*.66),y0=45;
  for(let i=0;i<=4;i++){
    const n=maxV*i/4,x=L+(R-L)*i/4;
    plot.append(svg('line',{x1:x,x2:x,y1:top,y2:top+282,stroke:'#e7eef6'}));
    plot.append(svg('text',{x,y:330,'text-anchor':'middle',fill:'#71869f','font-size':11},fmt(n,maxV<2?3:2)));
  }
  valid.forEach((m,i)=>{
    const n=vals[i],y=y0+i*dy,width=Math.max(1,(n/maxV)*(R-L));
    plot.append(svg('text',{x:L-14,y:y+barH/2+4,'text-anchor':'end','font-size':11.5,'font-weight':700,fill:'#35536e'},label(m)));
    plot.append(svg('rect',{x:L,y,width,height:barH,rx:4,fill:color(m),opacity:.92}));
    plot.append(svg('text',{x:Math.min(775,L+width+8),y:y+barH/2+4,'text-anchor':(L+width+30>775?'end':'start'),'font-size':11.5,'font-weight':800,fill:color(m)},fmt(n,key==='ate'||key==='width'?4:3)));
    if(showCI&&selectedSeed==='mean'){
      const xlo=L+Math.max(0,n-errs[i])/maxV*(R-L),xhi=L+(n+errs[i])/maxV*(R-L),cy=y+barH/2;
      plot.append(svg('line',{x1:xlo,y1:cy,x2:xhi,y2:cy,stroke:'#293b53','stroke-width':1.8}));
      [xlo,xhi].forEach(x=>plot.append(svg('line',{x1:x,y1:cy-5,x2:x,y2:cy+5,stroke:'#293b53','stroke-width':1.8})));
    }
  });
  plot.setAttribute('aria-label',`Final ${metrics[metric].label} comparison for ${valid.length} selected valid method values`);
  const excluded=methods().length-valid.length;
  $('archive-chart-note').textContent=`Original ${selectedSeed==='mean'?'24-seed means':'seed '+selectedSeed+' terminal observations'} from summary.csv / per_seed.csv. ${showCI&&selectedSeed==='mean'?'Error bars: descriptive paired-protocol per-method 95% t-intervals, not online certificates.':''} ${excluded?`${excluded} selected reference method${excluded>1?'s have':' has'} no certified width: missing is not zero.`:''} No synthetic per-round values.`;
 }
 function updateLegend(){
  const el=$('compare-dynamic-legend');el.replaceChildren();
  methods().forEach(m=>{
    const span=document.createElement('span');span.className='compare-legend-item';
    const line=document.createElement('i');line.className='compare-legend-line';line.style.backgroundColor=color(m);
    const name=document.createElement('span');name.textContent=label(m);span.append(line,name);el.append(span);
  });
 }
 function td(value,style){const n=document.createElement('td');n.textContent=String(value);if(style)n.className=style;return n}
 function renderTable(){
  const body=$('archive-record-body');body.replaceChildren();
  const trajectory=(view==='trajectory'&&!termOnly());
  methods().forEach(m=>{
   const cur=data(m),s=seedRecord(m),finals=selectedSeed==='mean'?cur.summary:s;
   const v=(k)=>trajectory?point(m,k,step):finals[k==='deployment'&&selectedSeed==='mean'?'deploy':k];
   const scoreReg=v('regret'),scoreDep=v('deployment');
   const isEnd=!trajectory||step===200;
   const row=document.createElement('tr');
   row.append(td(label(m),isCertified(m)?'archive-dr':'compare-reference-method'));
   row.append(td(fmt(scoreReg)));
   row.append(td(fmt(scoreDep)));
   row.append(td(isEnd?fmt(finals.ate,4):'at final round'));
   row.append(td(!isCertified(m)?'— · uncertified':isEnd?fmt(finals.width,4):'at final round'));
   row.append(td(selectedConfigCell(m),'compare-config-cell'));
   row.append(td(sourceLabel(m),isReplayed(m)?'compare-source-replay':'compare-source-full'));
   body.append(row);
  });
  $('archive-table-subhead').textContent=`${selectedSeed==='mean'?'24-seed mean':`Seed ${selectedSeed}`} · ${trajectory?`round ${step} / 200`:'terminal comparison'}`;
  $('compare-table-badge').textContent=`${selected.size} of 7 methods · ${regime==='high_mismatch'?'7 archived trajectories':'2 archives + 5 verified replays'}`;
 }
 function interpretation(){
  const d=condition();
  const dr=data(METHODS[0]).summary, ips=data(METHODS[1]).summary;
  const earlier=data(METHODS[2]).summary, eips=data(METHODS[3]).summary;
  const greedy=data(METHODS[5]).summary;
  const pair=d.paired.find(r=>r.condition===regime&&r.contrast==='CERT-DR minus CAUSAL-UCB-CERT-IPS');
  $('archive-interp-title').textContent=regime==='high_mismatch'?'High mismatch: gain and measurement trade-off.':'Low mismatch: advantages narrow.';
  $('archive-paired-result').textContent=`Certified DR mean regret ${fmt(dr.regret)} versus Certified IPS ${fmt(ips.regret)}. Paired DR − IPS: ${fmt(pair.mean)}; descriptive 95% CI [${fmt(pair.CI95_lower)}, ${fmt(pair.CI95_upper)}]. DR wins ${pair.CERT_DR_lower_count} / 24 seeds (${pair.ties} ties); it does not dominate every seed.`;
  $('archive-estimation-result').textContent=`The two earlier reference methods have equal mean regret ${fmt(earlier.regret)}, but ATE errors ${fmt(earlier.ate,4)} (CAUSAL) and ${fmt(eips.ate,4)} (IPS). Better estimation alone did not change their choices in this archived comparison.`;
  $('archive-cost-result').textContent=`Certified DR vs IPS: ATE ${fmt(dr.ate,4)} vs ${fmt(ips.ate,4)}, certified width ${fmt(dr.width)} vs ${fmt(ips.width)}, deployment loss ${fmt(dr.deploy)} vs ${fmt(ips.deploy)}. Greedy-Raw regret ${fmt(greedy.regret)}. Every method is selectable above; lower regret is not free.`;
 }
 function updateProofStrip(){
  const cards=[...root.querySelectorAll('.archive-proof-strip>div')];
  if(cards.length<3)return;
  const dr=data(METHODS[0]).summary,ips=data(METHODS[1]).summary,greedy=data(METHODS[5]).summary;
  const put=(idx,kicker,numbers,note)=>{
    cards[idx].querySelector('span').textContent=kicker;
    cards[idx].querySelector('strong').textContent=numbers;
    cards[idx].querySelector('small').textContent=note;
  };
  put(0,`${regime==='high_mismatch'?'High':'Low'} mismatch · Regret`,
      `${fmt(dr.regret)} vs. ${fmt(ips.regret)}`,
      `Certified DR / IPS · Greedy ${fmt(greedy.regret)}`);
  put(1,'Certified width',`${fmt(dr.width)} vs. ${fmt(ips.width)}`,
      'Decision-active worst-pair diameter');
  put(2,'Cumulative deployment gap',`${fmt(dr.deploy)} vs. ${fmt(ips.deploy)}`,
      'Certified DR / IPS · lower is better');
 }
 function render(){if(!src)return;
  if(termOnly())view='terminal';
  updateProofStrip();
  const traceMode=view==='trajectory'&&!termOnly();
  const available=methods().filter(m=>data(m).has_per_round).length;
  $('archive-regime').value=regime;$('archive-cohort').value=selectedSeed;
  $('archive-chart-heading').textContent=metrics[metric].label;
  $('archive-metric-explainer').textContent=metrics[metric].desc;
  $('archive-chart-kicker').textContent=traceMode?'RECORDED ROUND RESULTS':'FINAL COMPARISON · SEVEN METHODS';
  $('archive-round-tag').textContent=traceMode?`Round ${step} / 200`:'Terminal only';
  $('archive-round-current').textContent=traceMode?String(step):'END';
  $('archive-round').value=step;$('archive-round').disabled=!traceMode||!available;
  $('archive-play').disabled=!traceMode||!available;
  $('archive-replay').disabled=!traceMode||!available;
  $('compare-show-ci').checked=showCI;
  $('compare-selected-count').textContent=selected.size;
  root.querySelectorAll('[data-archive-metric]').forEach(b=>{const active=b.dataset.archiveMetric===metric;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  root.querySelectorAll('[data-compare-view]').forEach(b=>{const active=b.dataset.compareView===view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));b.disabled=termOnly()&&b.dataset.compareView==='trajectory';});
  $('compare-source-coverage').textContent=regime==='high_mismatch'
    ? 'HIGH MISMATCH · 7 original archived trajectories · 24 matched seeds × 200 rounds.'
    : 'LOW MISMATCH · 2 original certified trajectories + 5 independently replayed baseline trajectories · 168/168 decision hashes and terminal metrics verified.';
  if(traceMode)drawTrajectory();else drawFinal();
  updateLegend();renderTable();interpretation();
 }
 function preset(which){
  selected.clear();METHODS.forEach((m,i)=>{if(which==='all'||(which==='certified'?i<2:i>=2))selected.add(m)});
  stop();listMethods();render();
 }
 $('compare-preset-all').addEventListener('click',()=>preset('all'));
 $('compare-preset-certified').addEventListener('click',()=>preset('certified'));
 $('compare-preset-reference').addEventListener('click',()=>preset('reference'));
 $('archive-regime').addEventListener('change',e=>{regime=e.target.value;selectedSeed='mean';step=200;stop();populateSeeds();listMethods();render()});
 $('archive-cohort').addEventListener('change',e=>{selectedSeed=e.target.value;step=200;stop();render()});
 root.querySelectorAll('[data-archive-metric]').forEach(b=>b.addEventListener('click',()=>{metric=b.dataset.archiveMetric;if(termOnly())view='terminal';step=200;stop();render()}));
 root.querySelectorAll('[data-compare-view]').forEach(b=>b.addEventListener('click',()=>{if(termOnly()&&b.dataset.compareView==='trajectory')return;view=b.dataset.compareView;stop();render()}));
 $('compare-show-ci').addEventListener('change',e=>{showCI=e.target.checked;render()});
 $('archive-round').addEventListener('input',e=>{stop();step=Math.max(1,Math.min(200,Number(e.target.value)));render()});
 function start(){if(termOnly()||view!=='trajectory'||!methods().some(m=>data(m).has_per_round))return;stop();if(step===200)step=1;render();$('archive-play').textContent='Ⅱ Pause';playing=setInterval(()=>{step=Math.min(200,step+1);render();if(step===200)stop()},70)}
 $('archive-play').addEventListener('click',()=>{if(playing!==null)stop();else start()});
 $('archive-replay').addEventListener('click',()=>{stop();step=1;render();start()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 $('compare-download-selection').addEventListener('click',()=>{
  if(!src)return;const columns=['condition','seed_scope','method','record_type','regret','deployment_gap','final_ate_error','certified_width','final_modal_config','optimal_config_rate'];
  const rows=[columns.join(',')];
  for(const m of methods()){
   const d=data(m),v=selectedSeed==='mean'?d.summary:seedRecord(m);
   const values=[regime,selectedSeed,m,isReplayed(m)?'replayed_round_trace_verified': 'archived_round_trace',v.regret,v.deploy??v.deployment,v.ate,v.width??'',selectedConfigCell(m),d.summary.final_best_identification_rate];
   rows.push(values.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(','));
  }
  const blob=new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`causal_ucb_${regime}_${selectedSeed}_selected_terminal.csv`;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 });
 $('compare-download-rounds').addEventListener('click',()=>{
  if(!src)return;
  const cols=['condition','seed_scope','round','method','configuration','cumulative_regret','cumulative_deployment_gap','provenance'];
  const lines=[cols.join(',')];
  const safe=x=>`"${String(x??'').replaceAll('"','""')}"`;
  for(const m of methods()){
    const traces=selectedSeed==='mean'?null:seedRecord(m)?.trace;
    const chart=data(m).charts;
    const origin=isReplayed(m)?'verified_deterministic_replay':'original_archive';
    for(let t=1;t<=200;t++){
      const n=t-1;
      const config=selectedSeed==='mean'?'':(traces?.config?.[n]??'');
      const regret=selectedSeed==='mean'?chart.regret?.[n]?.[1]:traces?.regret?.[n];
      const deployment=selectedSeed==='mean'?chart.deployment?.[n]?.[1]:traces?.deployment?.[n];
      lines.push([regime,selectedSeed,t,m,config,regret,deployment,origin].map(safe).join(','));
    }
  }
  const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`causal_ucb_${regime}_${selectedSeed}_round_traces.csv`;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 });
 fetch('assets/certified-benchmark/seven-method-comparison.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(d=>{
  if(d.version!=='matched-seven-method-study'||d.methods.length!==7||!d.conditions?.low_mismatch)throw Error('Unexpected study format');
  src=d;populateSeeds();listMethods();render();
 }).catch(e=>{
  showMessage('The seven-method study could not be loaded.');
  $('archive-chart-note').textContent=`Failed: ${e.message}. Open the deployed website over HTTP(S) and check the archive JSON URL.`;
  $('archive-record-body').textContent='Archive unavailable.';
 });
})();
