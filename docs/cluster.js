/*
 CAUSAL–UCB: stable-topology cluster-network VISUALIZATION.
 The moving elements represent signals and local states, not growing graph structure.
 This is a conceptual explainer, not the CAUSAL-UCB algorithm or a real experiment.
 No dependencies. All nodes, edges and particles are created exactly once per graph.
 */
(()=>{
 'use strict';
 const prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const rand=(seed)=>()=>{seed=(Math.imul(1664525,seed)+1013904223)|0;return (seed>>>0)/4294967296};
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 const TAU=Math.PI*2;
 const heroCanvas=document.getElementById('hero-cluster-network');
 const demoCanvas=document.getElementById('demo-network-canvas');
 if(!heroCanvas || !demoCanvas) return;
 const heroCtx=heroCanvas.getContext('2d',{alpha:true});
 const demoCtx=demoCanvas.getContext('2d',{alpha:true});
 if(!heroCtx || !demoCtx) return;
 const coresHero=[[.11,.23],[.34,.14],[.73,.16],[.92,.35],[.17,.70],[.41,.86],[.72,.75],[.93,.84]];
 const coresDemo=[[.15,.32],[.43,.26],[.77,.27],[.29,.75],[.69,.72]];
 const heroColor=[[87,206,236],[112,224,204],[111,166,251],[106,226,213],[97,167,248],[116,228,206],[114,197,255],[112,231,215]];
 const demoColor=[[101,166,247],[122,219,238],[101,240,204],[134,186,245],[96,212,232]];
 function buildGraph(cores,count,seed,hero){
   const random=rand(seed);const nodes=[];const edges=[];const edgeSet=new Set();
   const groups=cores.map((c,i)=>({x:c[0],y:c[1],phase:random()*TAU,size:hero?(.066+random()*.016):(.085+random()*.008),id:i}));
   groups.forEach((g,group)=>{
     for(let i=0;i<count;i++){
       // Deterministic sunflower layout: readable, organic, and no overlaps.
       const a=i*2.39996+random()*.28;
       const r=Math.sqrt((i+.7)/(count+.5))*(.65+.27*random());
       nodes.push({group,angle:a,radius:r,ox:Math.cos(a)*r,oy:Math.sin(a)*r,phase:random()*TAU,speed:.38+random()*.7,size:(hero?1.25:1.7)+random()*(hero?1.45:1.5),impact:random(),center:i===0});
     }
   });
   function attach(a,b,bridge=false){
     if(a===b)return;const k=Math.min(a,b)+'-'+Math.max(a,b);
     if(edgeSet.has(k))return;edgeSet.add(k);
     edges.push({a,b,bridge,phase:random(),speed:.16+random()*.22});
   }
   for(let group=0;group<groups.length;group++){
     const start=group*count;
     for(let i=1;i<count;i++){
       const idx=start+i;
       const candidates=nodes.slice(start,idx).map((n,k)=>{
         const q=nodes[idx];return {j:start+k,d:(q.ox-n.ox)**2+(q.oy-n.oy)**2};
       }).sort((a,b)=>a.d-b.d);
       attach(idx,candidates[0].j);
       if(i>4 && i%3===0)attach(idx,candidates[1].j);
     }
   }
   // Static, sparse inter-cluster bridges; topology never changes at runtime.
   const bridges=hero?[[0,1],[1,2],[2,3],[0,4],[4,5],[5,6],[6,7],[2,6],[3,7],[1,5]]:[[0,1],[1,2],[0,3],[1,3],[1,4],[2,4],[3,4]];
   bridges.forEach(([a,b],i)=>{
     attach(a*count+(i%3),b*count+(i%4),true);
     if(hero && i%2===0)attach(a*count+((i+5)%count),b*count+((i+8)%count),true);
   });
   const packets=Array.from({length:hero?32:19},(_,i)=>({edge:(i*43+11)%edges.length,offset:random(),speed:.09+random()*.23,tint:random()}));
   return {nodes,edges,groups,packets,count,colors:hero?heroColor:demoColor,hero};
 }
 const hero=buildGraph(coresHero,12,2091,true); // 96 fixed nodes
 const demo=buildGraph(coresDemo,11,7331,false); // 55 fixed nodes
 const controls={rho:document.getElementById('rho-slider'),rhoValue:document.getElementById('rho-display'),apply:document.getElementById('config-next'),pause:document.getElementById('network-pause'),status:document.getElementById('demo-status'),config:document.getElementById('config-value'),caption:document.getElementById('demo-mini-caption')};
 let rho=.45,selected=2,paused=false,heroVisible=true,demoVisible=false,last=0,t=0,raf=0;
 const active=()=>!document.hidden && !prefersReduced.matches && !document.documentElement.classList.contains('motion-off') && !document.querySelector('.cinematic')?.classList.contains('off');
 function fit(canvas,ctx){
   const r=canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2);
   const w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));
   if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr)}
   ctx.setTransform(dpr,0,0,dpr,0,0);return {w,h};
 }
 function groupState(graph,group,t,interf){
   const g=graph.groups[group];
   const breath=1+.042*Math.sin(t*.76+g.phase);
   return {x:g.x+.003*Math.sin(t*.24+g.phase),y:g.y+.005*Math.cos(t*.22+g.phase),breath};
 }
 function locate(n,group,w,h,t,graph){
   const hero=graph.hero;
   const sx=hero?w*1.0:w,sy=h;
   const dr=(hero?.8:1)*(.95+.05*Math.sin(t*.52+n.phase));
   const px=group.x*w + n.ox*graph.groups[n.group].size*w*group.breath*dr + Math.sin(t*n.speed*.37+n.phase)*(hero?1.8:1.2);
   const py=group.y*h + n.oy*graph.groups[n.group].size*h*group.breath*dr + Math.cos(t*n.speed*.43+n.phase)*(hero?1.8:1.2);
   return {x:px,y:py};
 }
 function rgba(arr,a){return `rgba(${arr[0]},${arr[1]},${arr[2]},${a})`}
 function graphFrame(ctx,canvas,graph,frameTime,rho,sel,still){
   const {w,h}=fit(canvas,ctx);ctx.clearRect(0,0,w,h);
   const now=still?0:frameTime;
   const states=graph.groups.map((_,i)=>groupState(graph,i,now,rho));
   const pos=graph.nodes.map(n=>locate(n,states[n.group],w,h,now,graph));
   const colors=graph.colors;
   if(!graph.hero){
     // Fixed rounded cluster atmosphere; clusters may breathe, but never reproduce.
     states.forEach((g,i)=>{
       const c=colors[i],r=Math.min(w,h)*.115*(1+.05*Math.sin(now*.65+i));
       const grad=ctx.createRadialGradient(g.x*w,g.y*h,2,g.x*w,g.y*h,r*1.55);
       grad.addColorStop(0,rgba(c,i===sel?.135:.078));grad.addColorStop(1,rgba(c,0));
       ctx.fillStyle=grad;ctx.fillRect(g.x*w-r*1.6,g.y*h-r*1.6,r*3.2,r*3.2);
       ctx.beginPath();ctx.arc(g.x*w,g.y*h,r*.89,0,TAU);
       ctx.strokeStyle=rgba(c,i===sel?.22:.11);ctx.lineWidth=1;ctx.setLineDash([3,7]);ctx.stroke();ctx.setLineDash([]);
     });
   }else{
     states.forEach((g,i)=>{
       const c=colors[i],r=Math.min(w,h)*.12;
       const grad=ctx.createRadialGradient(g.x*w,g.y*h,0,g.x*w,g.y*h,r);
       grad.addColorStop(0,rgba(c,.085));grad.addColorStop(1,rgba(c,0));
       ctx.fillStyle=grad;ctx.fillRect(g.x*w-r,g.y*h-r,2*r,2*r);
     });
   }
   const propagation=(g)=>{
     if(graph.hero) return .48;
     if(g===sel)return 1;
     const a=graph.groups[g],b=graph.groups[sel];const dist=Math.hypot(a.x-b.x,a.y-b.y);
     return clamp(Math.pow(rho,1.25)*Math.exp(-Math.max(0,dist-.26)*1.7),.045,.86);
   };
   // Edge set is constant. rho changes visual activity, not topology.
   for(const e of graph.edges){
     const a=pos[e.a],b=pos[e.b],node=graph.nodes[e.a];const c=colors[node.group];
     const intensity=propagation(node.group);
     ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
     ctx.lineWidth=graph.hero?(e.bridge?.60:.94):(e.bridge?.70:1.06);
     ctx.strokeStyle=rgba(c,e.bridge?(graph.hero?.12:.07+.32*intensity):(graph.hero?.20:.12+.26*intensity));ctx.stroke();
   }
   // Signals travel over already existing links. Fixed particle count.
   for(const packet of graph.packets){
     const e=graph.edges[packet.edge],a=pos[e.a],b=pos[e.b],group=graph.nodes[e.a].group;
     const strength=propagation(group);
     const step=(packet.offset+now*packet.speed)%1;
     const x=a.x+(b.x-a.x)*step,y=a.y+(b.y-a.y)*step;
     const opacity=(graph.hero?.34:.35+.65*strength);
     const color=packet.tint>.37?[110,250,219]:[123,172,255];
     const r=graph.hero?2.15:2.9;
     const glow=ctx.createRadialGradient(x,y,0,x,y,r*5.2);
     glow.addColorStop(0,rgba(color,opacity*.7));glow.addColorStop(1,rgba(color,0));
     ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,r*5.2,0,TAU);ctx.fill();
     ctx.fillStyle=rgba(color,opacity);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
   }
   graph.nodes.forEach((node,i)=>{
     const p=pos[i],c=colors[node.group],activity=propagation(node.group);
     const puls=.85+.15*Math.sin(now*(.8+node.speed)+node.phase);
     const radius=node.size*(graph.hero?1:1.13)*puls;
     if(!graph.hero && activity>.5 && node.center){
       const hr=11+2*Math.sin(now*1.2+node.phase);
       ctx.beginPath();ctx.arc(p.x,p.y,hr,0,TAU);
       ctx.strokeStyle=rgba(c,.15+.22*activity);ctx.lineWidth=1.4;ctx.stroke();
     }
     ctx.beginPath();ctx.arc(p.x,p.y,radius,0,TAU);
     ctx.fillStyle=rgba(c,graph.hero?.7:.45+.52*activity);ctx.fill();
   });
   if(!graph.hero){
     const labels='ABCDE';
     states.forEach((g,i)=>{
       const x=g.x*w,y=g.y*h;const labelY=y-h*.105;
       ctx.font='700 11px ui-monospace, SFMono-Regular, Consolas, monospace';ctx.textAlign='center';ctx.textBaseline='middle';
       ctx.fillStyle=i===sel?'#ffce91':'#9bb6c8';
       ctx.fillText('CLUSTER '+labels[i],x,labelY);
       if(i===sel){
         ctx.beginPath();ctx.arc(x,y,Math.min(w,h)*.088,0,TAU);
         ctx.strokeStyle='rgba(255,198,113,.55)';ctx.lineWidth=1.3;ctx.stroke();
       }
     });
   }
 }
 function paint(time){
   raf=0;
   const running=active()&&!paused;
   if(running) t+=Math.min(.055,Math.max(0,(time-last)/1000));
   last=time;
   if(heroVisible)graphFrame(heroCtx,heroCanvas,hero,t,rho,selected,!running);
   if(demoVisible)graphFrame(demoCtx,demoCanvas,demo,t,rho,selected,!running);
   if(!document.hidden && running && (heroVisible||demoVisible)) schedule();
 }
 function schedule(){if(!raf)raf=requestAnimationFrame(paint)}
 function refreshUI(){
   const label=rho<.33?'localized':rho<.67?'moderate':'wide-reaching';
   controls.rhoValue.textContent=rho.toFixed(2);controls.config.textContent='ABCDE'[selected];
   controls.caption.textContent=`Selected cluster: ${'ABCDE'[selected]} · Illustrative response: ${label}`;
   controls.rho.style.setProperty('--fill',`${rho*100}%`);
   controls.status.textContent='FIXED EDGES';
   controls.pause.textContent=paused?'▶ Resume motion':'Ⅱ Pause motion';controls.pause.setAttribute('aria-pressed',String(paused));
   schedule();
 }
 controls.rho.addEventListener('input',()=>{rho=Number(controls.rho.value)/100;refreshUI()});
 controls.apply.addEventListener('click',()=>{selected=(selected+1)%5;refreshUI()});
 controls.pause.addEventListener('click',()=>{paused=!paused;refreshUI()});
 demoCanvas.addEventListener('click',event=>{
   const b=demoCanvas.getBoundingClientRect(),x=(event.clientX-b.left)/b.width,y=(event.clientY-b.top)/b.height;
   let min=Infinity,choice=selected;
   demo.groups.forEach((g,i)=>{const d=Math.hypot((g.x-x)*1.2,g.y-y);if(d<min){min=d;choice=i}});
   if(min<.23){selected=choice;refreshUI()}
 });
 function observe(canvas,onChange){
   if('IntersectionObserver' in window){
     const ob=new IntersectionObserver(entries=>{onChange(entries[0]?.isIntersecting||false);schedule()},{threshold:0.01});ob.observe(canvas)
   }else onChange(true);
 }
 observe(heroCanvas,v=>{heroVisible=v});observe(demoCanvas,v=>{demoVisible=v});
 if('ResizeObserver' in window){const ro=new ResizeObserver(schedule);ro.observe(heroCanvas);ro.observe(demoCanvas)}
 else window.addEventListener('resize',schedule,{passive:true});
 prefersReduced.addEventListener?.('change',schedule);
 const mo=new MutationObserver(schedule);mo.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 mo.observe(document.querySelector('.cinematic'),{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{last=performance.now();schedule()});
 window.addEventListener('resize',schedule,{passive:true});
 refreshUI();schedule();
})();
