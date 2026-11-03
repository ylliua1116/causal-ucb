/* V6 free live lab: computed on the visitor's CPU, not a server. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  const section=byId('live-lab');
  if(!section) return;
  const roundInput=byId('lab-rounds'), etaInput=byId('lab-eta'),rhoInput=byId('lab-rho');
  const button=byId('lab-run'),stopButton=byId('lab-cancel'),status=byId('lab-status');
  const chart=byId('lab-chart'), slider=byId('lab-frame'),play=byId('lab-play');
  const download=byId('lab-download'),downloadJson=byId('lab-download-json');
  const tableBody=byId('lab-table-body'),tableSubtitle=byId('lab-table-subtitle');
  const colors={
    'CAUSAL-UCB':'#1466a9','IPS-UCB':'#31a695','Greedy-Raw':'#dc8a36',
    'Raw-UCB':'#9569b3','Switchback-OED':'#d0577e'
  };
  const metrics={
    regret:{field:'cumulative_regret',name:'Cumulative target regret',unit:'',tip:'Lower is better · oracle target used for evaluation only'},
    width:{field:'ci_width',name:'Common DR audit pair width',unit:'',tip:'Post-hoc diagnostic; no general black-box certificate'},
    deploy:{field:'cumulative_deploy',name:'Cumulative deployment gap',unit:'',tip:'Target value minus logged/exploration value'}
  };
  let results=[],chosen='regret',worker=null,running=false,frame=1,timer=null,currentParams=null;
  const format=(x,d=3)=>(typeof x==='number' && Number.isFinite(x))?x.toFixed(d):'—';
  const setStatus=(msg,isError=false)=>{status.textContent=msg;status.classList.toggle('error',isError)};
  const configureSlider=(el,out,dp)=>{const update=()=>{out.textContent=Number(el.value).toFixed(dp)};el.addEventListener('input',update);update()};
  configureSlider(roundInput,byId('lab-rounds-out'),0);
  configureSlider(etaInput,byId('lab-eta-out'),2);
  configureSlider(rhoInput,byId('lab-rho-out'),2);
  const selectedMethods=()=>[...section.querySelectorAll('.lab-choice input:checked')].map(x=>x.value);
  function stopAnimation(){if(timer){clearInterval(timer);timer=null;}play.textContent='▶ Play';}
  function setRunning(flag){running=flag;button.disabled=flag;stopButton.hidden=!flag;[roundInput,etaInput,rhoInput,byId('lab-seed'),...section.querySelectorAll('.lab-choice input')].forEach(e=>e.disabled=flag);}
  function cleanAbort(){if(worker){worker.terminate();worker=null;}setRunning(false);stopAnimation();}
  function requestParams(){return {rounds:Number(roundInput.value),eta:Number(etaInput.value),rho:Number(rhoInput.value),seed:Number(byId('lab-seed').value)};}
  function validRequest(p,methods){return methods.length>0&&methods.length<=5&&Number.isInteger(p.seed)&&p.seed>=0&&p.seed<=9999999&&Number.isInteger(p.rounds)&&p.rounds>=20&&p.rounds<=120&&p.eta>=.1&&p.eta<=.75&&p.rho>=.5&&p.rho<=1.5;}
  function safeTitle(n){return n.replace(/[^a-z0-9_.-]/gi,'_')};
  function downloadData(filename,content,mime){
    const u=URL.createObjectURL(new Blob([content],{type:mime}));
    const link=document.createElement('a');link.href=u;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);
  }
  function csvCell(v){return String(v??'').replaceAll('"','""').includes(',')?`"${String(v).replaceAll('"','""')}"`:String(v??'');}
  function exportCsv(){
    if(!results.length)return;
    const keys=['policy','seed','eta','rho','t','k','cumulative_regret','cumulative_deploy','ci_width','matched_nodes','reward_mean','e_mean'];
    const rows=[keys.join(',')];
    for(const series of results)for(const r of series.trace){const obj={policy:series.method,...currentParams,...r};rows.push(keys.map(k=>csvCell(obj[k])).join(','));}
    downloadData(`causal_ucb_live_seed${currentParams.seed}.csv`,rows.join('\n'),'text/csv;charset=utf-8');
  }
  function exportJson(){if(!results.length)return;downloadData(`causal_ucb_live_seed${currentParams.seed}.json`,JSON.stringify({provenance:'browser-side restricted known ring local-exposure real Python run',params:currentParams,results},null,2),'application/json');}
  function chartCoords(){
    const margin={l:70,r:21,t:22,b:47},W=800,H=330;
    const metric=metrics[chosen];
    const ymax=Math.max(1e-6,...results.flatMap(s=>s.trace.map(x=>x[metric.field]).filter(x=>Number.isFinite(x))));
    const values=results.flatMap(s=>s.trace.map(x=>x[metric.field]).filter(Number.isFinite));
    let ymin=(chosen==='deploy'&&values.length)?Math.min(0,...values):0;
    let hi= Math.max(ymax,Math.max(0,...values),.001);
    if(hi<=ymin+1e-9)hi=ymin+1;
    const top=hi+(hi-ymin)*.07,bottom=ymin-Math.abs(hi-ymin)*.07;
    const xmax=currentParams?.rounds||40;
    return {x:t=>margin.l+(t-1)/(Math.max(1,xmax-1))*(W-margin.l-margin.r),
      y:v=>margin.t+(top-v)/(top-bottom)*(H-margin.t-margin.b),
      left:margin.l,right:W-margin.r,top:margin.t,bottom:H-margin.b,
      topVal:top,bottomVal:bottom,maxX:xmax};
  }
  function render(){
    if(!results.length)return;
    const f=Math.max(1,Math.min(frame,currentParams.rounds)),p=chartCoords(),metric=metrics[chosen];
    let markup=`<title>${metric.name} across ${f} decision rounds</title>`;
    const num=(n)=>Number(n).toFixed(1);
    for(let i=0;i<=4;i++){
      const v=p.bottomVal+(p.topVal-p.bottomVal)*(4-i)/4,y=p.y(v);
      markup+=`<line x1="${p.left}" y1="${y}" x2="${p.right}" y2="${y}" stroke="#dce6f1" stroke-width="1"/>`;
      markup+=`<text x="${p.left-12}" y="${y+4}" text-anchor="end" fill="#7588a0" font-size="13">${format(v,2)}</text>`;
    }
    const steps=[1,Math.ceil(p.maxX/4),Math.ceil(p.maxX/2),Math.ceil(p.maxX*3/4),p.maxX];
    for(const t of [...new Set(steps)]) markup+=`<text x="${p.x(t)}" y="${p.bottom+26}" text-anchor="middle" fill="#7588a0" font-size="12">${t}</text>`;
    markup+=`<text x="${(p.left+p.right)/2}" y="${p.bottom+43}" text-anchor="middle" fill="#7488a0" font-size="12">Online decision round</text>`;
    markup+=`<line x1="${p.x(f)}" x2="${p.x(f)}" y1="${p.top}" y2="${p.bottom}" stroke="#a9bbd3" stroke-dasharray="4 5"/>`;
    for(const s of results){
      const color=colors[s.method],points=s.trace.slice(0,f).map(r=>`${num(p.x(r.t))},${num(p.y(r[metric.field]))}`).join(' ');
      if(!points)continue;
      const latest=s.trace[f-1];
      markup+=`<polyline fill="none" points="${points}" stroke="${color}" stroke-width="3.2" ${s.method==='IPS-UCB'?'stroke-dasharray="7 5"':''} stroke-linecap="round" stroke-linejoin="round"/>`;
      if(latest)markup+=`<circle cx="${p.x(latest.t)}" cy="${p.y(latest[metric.field])}" r="5.2" fill="white" stroke="${color}" stroke-width="2.8"/>`;
    }
    chart.innerHTML=markup;
    chart.setAttribute('aria-label',`${metric.name} plotted from actual Python output through round ${f}`);
    byId('lab-frame-val').textContent=String(f);
    slider.value=String(f);
    tableSubtitle.textContent=`Round ${f} of ${currentParams.rounds} · results from ${results.length} real Python policies`;
    tableBody.replaceChildren();
    for(const s of results){
      const r=s.trace[f-1];if(!r)continue;
      const tr=document.createElement('tr');
      const cells=[s.method,`z${r.k}`,format(r.cumulative_regret),format(r.ci_width),String(r.matched_nodes)];
      cells.forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;if(i===0){td.style.color=colors[s.method];td.style.fontWeight='700'}tr.appendChild(td)});
      tableBody.appendChild(tr);
    }
  }
  function updateComparison(){
    const target=byId('lab-comparison'),note=byId('lab-match-note'),cards=byId('lab-estimator-grid');
    if(!results.length){target.hidden=true;return;}
    target.hidden=false;cards.replaceChildren();
    const ca=results.find(s=>s.method==='CAUSAL-UCB'),ips=results.find(s=>s.method==='IPS-UCB');
    for(const s of results){
      const el=document.createElement('div');el.className='lab-estimator-card';
      const tag=document.createElement('span');tag.className='lab-estimator-title';tag.textContent=s.method;
      tag.style.color=colors[s.method]||'#1a4a6d';
      const v=document.createElement('b');v.textContent=format(s.summary?.ATE_error,4);
      const small=document.createElement('small');small.textContent='Final native pairwise ATE error · oracle diagnostic';
      el.append(tag,v,small);cards.append(el);
    }
    if(ca&&ips){
      const pairs=ca.trace.map((r,i)=>r.k===ips.trace[i]?.k);
      const same=pairs.filter(Boolean).length,all=pairs.length;
      const regSame=Math.abs(ca.summary.regret-ips.summary.regret)<1e-9;
      note.textContent=(same===all && regSame)
        ?`CAUSAL-UCB and IPS-UCB chose the same configuration in all ${all} rounds. Their target-regret paths therefore overlap exactly. This does NOT mean the DR and IPS estimators are the same; compare their final ATE errors below.`
        :`${same} / ${all} configuration choices match between CAUSAL-UCB and IPS-UCB. The two policies may still attain equal regret if distinct configurations have the same target value. Native estimator errors are reported below.`;
    }else note.textContent='Each policy is evaluated on its own logged trajectory. The estimator error below is a final oracle diagnostic, not an online training signal.';
  }
  function drawLegend(){
    const e=byId('lab-legend');e.replaceChildren();
    for(const s of results){const v=document.createElement('span');v.className='lab-legend-tag';
      const dot=document.createElement('i');dot.style.backgroundColor=colors[s.method];v.append(dot,document.createTextNode(s.method));e.append(v);
    }
  }
  function setFrame(x){frame=x;render();}
  function beginPlay(){
    stopAnimation();
    if(!results.length)return;
    if(frame>=currentParams.rounds)setFrame(1);
    play.textContent='Ⅱ Pause';
    timer=setInterval(()=>{if(frame>=currentParams.rounds){stopAnimation();return;}setFrame(frame+1)},115);
  }
  button.addEventListener('click',()=>{
    cleanAbort();
    const methods=selectedMethods(),p=requestParams();
    if(!validRequest(p,methods)){setStatus('Choose at least one policy, a valid seed and supported ranges.',true);return;}
    if(!window.Worker || !window.WebAssembly){setStatus('This browser does not support Web Workers / WebAssembly.',true);return;}
    currentParams=p;results=[];frame=1;chosen='regret';updateComparison();
    section.querySelectorAll('[data-lab-metric]').forEach(b=>b.classList.toggle('active',b.dataset.labMetric===chosen));
    byId('lab-chart-title').textContent='Calculating observed trajectories…';
    byId('lab-result-type').textContent='LIVE PYTHON · RUNNING';
    slider.disabled=true;play.disabled=true;download.disabled=true;downloadJson.disabled=true;
    byId('lab-frame-max').textContent=`/ ${p.rounds}`;
    chart.innerHTML='<text x="400" y="165" text-anchor="middle" fill="#8494aa" font-size="18">Python runtime loading · computation will begin shortly</text>';
    tableBody.innerHTML='<tr><td colspan="5">Loading Python runtime and scientific code…</td></tr>';
    byId('lab-legend').textContent='Actual Python runs will appear here.';
    setRunning(true);
    setStatus('Connecting to Pyodide CDN (first run loads Python and NumPy)…');
    try{
      worker=new Worker(new URL('lab-worker.mjs',document.baseURI),{type:'module'});
    }catch(e){setStatus(`Cannot start Python Web Worker: ${e.message}`,true);cleanAbort();return;}
    worker.onmessage=({data})=>{
      if(data.type==='status')setStatus(data.message);
      if(data.type==='method'){
        results.push(data.result);
        render();drawLegend();updateComparison();
        byId('lab-chart-title').textContent=`${metrics[chosen].name}.`;
        byId('lab-result-type').textContent=`${results.length} / ${methods.length} POLICIES COMPLETE`;
        slider.max=String(p.rounds);slider.disabled=false;play.disabled=false;
        download.disabled=false;downloadJson.disabled=false;
      }
      if(data.type==='done'){
        setStatus(`Completed ${data.count} original-Python policy runs · seed ${p.seed}. No server computation used.`);
        byId('lab-result-type').textContent='LIVE PYTHON · COMPLETED';
        cleanAbort();updateComparison();setFrame(1);beginPlay();
      }
      if(data.type==='failure'){
        setStatus(`Run failed: ${data.message}. Check browser network access to jsDelivr/Pyodide or reduce round count.`,true);
        byId('lab-result-type').textContent='RUN ERROR';cleanAbort();
      }
    };
    worker.onerror=(event)=>{
      setStatus(`Python runtime could not load (${event.message||'network or browser restriction'}). Archived charts remain available.`,true);
      byId('lab-result-type').textContent='CDN ERROR';cleanAbort();
    };
    worker.postMessage({type:'run',methods,params:p});
  });
  stopButton.addEventListener('click',()=>{cleanAbort();setStatus('Stopped. Existing computed runs are kept until the next launch.')});
  play.addEventListener('click',()=>{if(timer)stopAnimation();else beginPlay()});
  slider.addEventListener('input',()=>{stopAnimation();setFrame(Number(slider.value))});
  section.querySelectorAll('[data-lab-metric]').forEach(b=>b.addEventListener('click',()=>{
    chosen=b.dataset.labMetric;
    section.querySelectorAll('[data-lab-metric]').forEach(btn=>btn.classList.toggle('active',btn===b));
    byId('lab-chart-title').textContent=`${metrics[chosen].name}.`;
    if(results.length)render();
  }));
  download.addEventListener('click',exportCsv);
  downloadJson.addEventListener('click',exportJson);
})();
