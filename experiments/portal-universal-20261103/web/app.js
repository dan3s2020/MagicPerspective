/* Real graph event explorer; no simulated activation frames. */
const $=id=>document.getElementById(id);
let graph={nodes:[],edges:[],total_nodes:0,total_edges:0},traces=[],frame=0,follow=true,mode='3d',yaw=.48,pitch=-.22,zoom=1,drag=null,selected=null;
let replayAt=0,lastError='',lastTraceSeq=0,activePulse=null;
const cols={activation:'#55d4e7',prediction:'#b497ff',decision:'#f7c95d',error:'#ee5e7e',learning:'#f3985e',confirmed:'#52cfa6',growth:'#eef5ff'};
const canvas=$('graph'),ctx=canvas.getContext('2d'),dpr=Math.min(2,window.devicePixelRatio||1);
function resize(){const r=canvas.getBoundingClientRect();canvas.width=r.width*dpr;canvas.height=r.height*dpr}
new ResizeObserver(resize).observe(canvas);resize();
function selectedTrace(){return traces[frame]||null}
function project(p,time=0){
  let [x,y,z]=p;
  if(mode==='4d'){x+=time*.85;y+=time*.2;z+=time*.55;}
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  let xx=x*cy-z*sy,zz=x*sy+z*cy,yy=y*cp-zz*sp;
  zz=y*sp+zz*cp;
  const s=Math.min(canvas.width,canvas.height)*.28*zoom/(1+zz*.18);
  return {x:canvas.width/2+xx*s,y:canvas.height/2-yy*s,z:zz,s};
}
function color(role){return role==='action'?cols.decision:role==='motif'?'#bb9afa':role==='effect'?cols.confirmed:role==='world'?'#63b6ff':'#526f9a'}
function draw(ts){
 const W=canvas.width,H=canvas.height;
 ctx.clearRect(0,0,W,H);
 const f=selectedTrace();const now=performance.now();
 if(!f) {ctx.fillStyle='#6d849f';ctx.textAlign='center';ctx.font=`${13*dpr}px monospace`;ctx.fillText('Așteaptă acțiuni reale din antrenare',W/2,H/2);requestAnimationFrame(draw);return;}
 const nodeMap=new Map(graph.nodes.map(n=>[n.id,n]));
 const active=new Set(f.active||[]),born=new Set(f.growth?.born||[]);
 const amplitude=new Map((f.activations?.at(-1)?.nodes||[]).map(n=>[n.id,n.amplitude]));
 const projections=new Map(graph.nodes.map(n=>[n.id,project(n.pos)]));
 // 4D view shows REAL preceding frames stacked along time, not invented geometry.
 if(mode==='4d'){
   const samples=traces.slice(Math.max(0,frame-11),frame+1);
   samples.forEach((v,i)=>{
     const t=(i-samples.length+1)/Math.max(1,samples.length);
     const ap=new Set(v.active||[]);
     for(const id of ap){const n=nodeMap.get(id);if(!n)continue;
       const p=project(n.pos,t*1.55);ctx.beginPath();ctx.fillStyle=`rgba(166,143,255,${.12+(i/samples.length)*.28})`;
       ctx.arc(p.x,p.y,(1.2+i/samples.length)*dpr,0,Math.PI*2);ctx.fill();}
   });
 }
 // Edges never move; they use the actual persisted topology.
 for(const e of graph.edges){const a=projections.get(e.from),b=projections.get(e.to);if(!a||!b)continue;
   const isActive=active.has(e.from)&&active.has(e.to);
   ctx.strokeStyle=isActive?'rgba(94,205,226,.48)':'rgba(67,89,128,.16)';
   ctx.lineWidth=(isActive?1.2:.62)*dpr;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 }
 // Meaningful pulse travels only on message edges present in the actual recorded trace.
 const elapsed=activePulse&&activePulse.seq===f.event_seq?Math.max(0,now-activePulse.at):99999;
 if(elapsed<1200){const progress=elapsed/1200;
   for(const m of (f.messages||[])){
     const a=projections.get(m.from),b=projections.get(m.to);
     if(!a||!b)continue;
     const q=(progress*(.8)+((m.round||1)-1)*.13)%1;
     const x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q;
     ctx.beginPath();ctx.fillStyle=`rgba(85,212,231,${Math.min(.98,Math.max(.2,(m.strength||.1)*2))})`;
     ctx.arc(x,y,Math.max(1.3,2.7*(m.strength||.5))*dpr,0,Math.PI*2);ctx.fill();
   }
   const err=Math.min(1,(f.error||0));
   if(err>.03){const id=f.growth?.action_id,p=projections.get(id);
     if(p){ctx.strokeStyle=`rgba(238,94,126,${(1-progress)*(.25+.7*err)})`;ctx.lineWidth=2*dpr;
       ctx.beginPath();ctx.arc(p.x,p.y,(8+40*progress)*dpr,0,Math.PI*2);ctx.stroke();}
   }
 }
 // Nodes use measured activation amplitudes. Births are marked only when graph truly grew.
 for(const n of graph.nodes){const p=projections.get(n.id),isOn=active.has(n.id),a=amplitude.get(n.id)||0;
   const radius=(isOn?3+Math.min(6,a*18):1.7+Math.log1p(n.uses)*.4)*dpr;
   ctx.beginPath();ctx.fillStyle=isOn?cols.activation:color(n.role);ctx.globalAlpha=isOn?1:.62;
   ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
   if(born.has(n.id)){ctx.beginPath();ctx.strokeStyle=cols.growth;ctx.lineWidth=2*dpr;
     ctx.arc(p.x,p.y,radius+4*dpr,0,Math.PI*2);ctx.stroke();}
   if(n.id===selected){ctx.beginPath();ctx.strokeStyle='#ffffff';ctx.lineWidth=2*dpr;ctx.arc(p.x,p.y,radius+7*dpr,0,Math.PI*2);ctx.stroke();}
 }
 // Actual chosen action and predicted output are explicit overlays, not graph-layout decorations.
 const action=projections.get(f.growth?.action_id),effect=projections.get(f.growth?.effect_id);
 if(action){ctx.strokeStyle=cols.decision;ctx.lineWidth=2.8*dpr;ctx.beginPath();ctx.arc(action.x,action.y,10*dpr,0,Math.PI*2);ctx.stroke();}
 if(effect){ctx.strokeStyle=f.error>.15?cols.error:cols.confirmed;ctx.lineWidth=2.3*dpr;
   ctx.beginPath();ctx.arc(effect.x,effect.y,10*dpr,0,Math.PI*2);ctx.stroke();}
 requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
function highlightFrame(){const f=selectedTrace();if(!f)return;
 $('frameN').textContent=(frame+1)+'/'+traces.length;
 $('timeline').max=Math.max(0,traces.length-1);$('timeline').value=frame;
 $('world').textContent=`${f.domain} / #${f.seed} / step ${f.step}`;
 $('action').textContent=`${f.action} · P=${Number(f.prediction).toFixed(3)}`;
 $('actual').textContent=`${f.actual?.effect} · reward=${f.reward} · ${JSON.stringify(f.actual?.before)} → ${JSON.stringify(f.actual?.after)}`;
 $('mismatch').textContent=`${(100*Number(f.error||0)).toFixed(1)}% · target=${f.target}`;
 $('update').textContent=`||ΔW||=${f.update_norm} · ||∇||=${f.gradient_norm}`;
 $('growth').textContent=`+${(f.growth?.born||[]).length} noduri · ${f.growth?.node_count} în total`;
 $('frameInfo').textContent=`Trace #${f.event_seq} · ${f.world_hash?.slice(0,12)}… · ${f.device}`;
 activePulse={seq:f.event_seq,at:performance.now()};
}
function inspect(id){selected=id;const n=graph.nodes.find(x=>x.id===id);
 if(!n){$('nodeInfo').textContent='Nodul nu este în proiecția actuală.';return;}
 const relations=graph.edges.filter(e=>e.from===id||e.to===id);
 $('nodeInfo').textContent=`ID: ${n.id}\nLabel: ${n.label}\nRol: ${n.role}\nFolosiri: ${n.uses}\nDomenii: ${n.domains.join(', ')}\nPoziție 3D: ${n.pos.join(', ')}\nLegături vizibile: ${relations.length}\n\n${relations.slice(0,10).map(e=>`${e.from} → ${e.to} (${e.type}, count=${e.count})`).join('\n')}`;
}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY, moved:false}});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;
 yaw+=dx*.006;pitch=Math.max(-1.5,Math.min(1.5,pitch+dy*.006));drag.x=e.clientX;drag.y=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;if(moved)return;
 const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*dpr,y=(e.clientY-rect.top)*dpr;
 let best=null,dist=14*dpr;
 for(const n of graph.nodes){const p=project(n.pos),d=Math.hypot(x-p.x,y-p.y);
  if(d<dist){dist=d;best=n.id;}}
 if(best!=null)inspect(best);
});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.3,Math.min(4,zoom*Math.exp(-e.deltaY*.001)))},{passive:false});
$('center').onclick=()=>{yaw=.48;pitch=-.22;zoom=1};
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{mode=b.dataset.mode;for(const x of document.querySelectorAll('[data-mode]'))x.classList.toggle('active',x===b);$('axis').textContent=mode==='4d'?'X · Y · Z · T (proiecție)':'X · Y · Z'};
$('batch').oninput=()=>{$('batchValue').textContent=$('batch').value};
$('timeline').oninput=()=>{follow=false;frame=+$('timeline').value;highlightFrame()};
$('prev').onclick=()=>{follow=false;frame=Math.max(0,frame-1);highlightFrame()};
$('next').onclick=()=>{follow=false;frame=Math.min(traces.length-1,frame+1);highlightFrame()};
$('play').onclick=()=>{follow=!follow;$('play').textContent=follow?'❚❚':'▶';if(follow){frame=traces.length-1;highlightFrame()}};
document.onkeydown=e=>{if(e.code==='Space'&&e.target.tagName!=='INPUT'){e.preventDefault();$('play').click()}};
async function post(url,obj={}){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
async function act(cb){try{await cb();lastError='';}catch(e){lastError=e.message;$('statusline').textContent='EROARE: '+lastError}}
$('start').onclick=()=>act(()=>post('/api/start',{domains:[...document.querySelectorAll('.domain:checked')].map(x=>x.value),batch_size:+$('batch').value,autosave_every:+$('autosave').value,epsilon:+$('epsilon').value,capture:$('capture').checked}));
$('stop').onclick=()=>act(()=>post('/api/stop'));
$('save').onclick=()=>act(()=>post('/api/save'));
$('evaluate').onclick=()=>act(async()=>{const d=await post('/api/evaluate',{domains:[...document.querySelectorAll('.domain:checked')].map(x=>x.value),count:24});$('evaluation').textContent=JSON.stringify(d,null,2)});
$('loadCorpus').onclick=()=>act(async()=>{const d=await post('/api/corpus',{path:$('corpus').value});$('corpusState').textContent=`${(d.bytes/1048576).toFixed(1)} MiB · SHA ${d.sha256.slice(0,12)}`});
async function refresh(){try{
 const [s,g,t]=await Promise.all([fetch('/api/status').then(r=>r.json()),fetch('/api/graph').then(r=>r.json()),fetch('/api/traces?limit=120').then(r=>r.json())]);
 graph=g;const old=traces.at(-1)?.event_seq||0;traces=t;
 if(follow||!traces.length){frame=Math.max(0,traces.length-1);if(traces.length&&old!==traces.at(-1).event_seq)highlightFrame()}
 else frame=Math.min(frame,Math.max(0,traces.length-1));
 $('unique').textContent=s.unique_worlds_verified_sqlite.toLocaleString('ro-RO');
 $('episodes').textContent=s.episodes.toLocaleString('ro-RO');$('steps').textContent=s.steps.toLocaleString('ro-RO');
 $('nodes').textContent=`${s.graph.nodes.toLocaleString('ro-RO')} / ${s.graph.edges.toLocaleString('ro-RO')}`;
 $('error').textContent=Number(s.prediction_error).toFixed(4);$('loss').textContent=Number(s.loss).toFixed(4);
 $('device').textContent='DEVICE: '+s.device.toUpperCase();$('runState').textContent=s.state.toUpperCase();
 $('dataStatus').textContent=s.saved_at?'SAVED '+new Date(s.saved_at*1000).toLocaleTimeString('ro-RO'):'NOT YET SAVED';
 $('statusline').textContent=lastError?'EROARE: '+lastError:`${s.state} · ${s.config.batch_size} lumi per lot · ${g.total_nodes} noduri totale · ${g.total_edges} legături · ${s.graph.cross_domain_links} conexiuni multi-domeniu observate${s.error?' · SERVER ERROR: '+s.error:''}`;
 $('domainStats').innerHTML=Object.entries(s.domains).map(([k,v])=>`<div>${k}: ${v.episodes} exerciții · ${(100*v.success_rate).toFixed(1)}% succes</div>`).join('');
 $('start').disabled=s.state==='running'||s.state==='stopping';$('stop').disabled=s.state!=='running';$('evaluate').disabled=s.state==='running'||s.state==='stopping';
 }catch(e){$('statusline').textContent='Conexiune întreruptă: '+e.message}}
refresh();setInterval(refresh,900);
