import {AXES, PLANE_NAMES, rotate5, project5, boundedWindow, timeCoord,
        graphHierarchy, lookupHierarchy} from './spacetime-core.mjs';

const $ = id => document.getElementById(id);
const space = $('space'), context = space.getContext('2d');
const history = $('history'), chart = history.getContext('2d');
const state = {
  meta:null, rows:[], bins:[], range:{start:0,end:0,width:0},
  byId:new Map(), edges:new Map(), nodeOffset:0, edgeOffset:0,
  knownNodeTotal:0, knownEdgeTotal:0, graphLoading:false,
  lastGraphFetch:0, busy:false, follow:true, timeCenter:0, timeDepth:0,
  logZoom:0, angles:Array(10).fill(0), cameraCenter:[0,0,0,0,0],
  shell:true, tracks:true, picked:[], level:0, graphIncomplete:false,
  drag:null, problem:null, skipped:0, lastHit:null,
};
const LIMIT_EDGES=65000;
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function text(id,value){$(id).textContent=value;}
function fmt(n){return Number(n).toLocaleString('ro-RO');}
function dpr(){return Math.min(2,window.devicePixelRatio||1);}
function resize(canvas){
  const box=canvas.getBoundingClientRect(), scale=dpr(),w=Math.max(1,Math.round(box.width*scale)),h=Math.max(1,Math.round(box.height*scale));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  return [w,h];
}
async function read(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);return r.json();}
function setError(e){state.problem=String(e.message||e);text('connect','EROARE: '+state.problem);}
function currentWidth(){return Math.pow(2,state.timeDepth);}
function applyTimeControls(){
  if(!state.meta?.total)return;
  const maxDepth=Math.ceil(Math.log2(Math.max(1,state.meta.last-state.meta.first+1)));
  $('timeZoom').max=String(maxDepth);state.timeDepth=clamp(state.timeDepth,0,maxDepth);
  $('timeZoom').value=String(state.timeDepth);
  state.range=boundedWindow(state.meta,state.timeCenter,currentWidth());
  text('timeVal',`${fmt(state.range.width)} înregistrări`);
  text('windowInfo',`T ${fmt(state.range.start)} – ${fmt(state.range.end)}`);
  text('spaceVal','×'+Math.exp(state.logZoom).toExponential(2));
}
async function loadGraph(maxPages=3){
  if(state.graphLoading)return;
  state.graphLoading=true;
  try{
    for(let i=0;i<maxPages;i++){
      const url=`/api/graph/all?node_offset=${state.nodeOffset}&node_limit=1800&edge_offset=${state.edgeOffset}&edge_limit=4000`;
      const page=await read(url);
      if((page.total_nodes<state.nodeOffset)||(page.total_edges<state.edgeOffset)){
        state.byId.clear();state.edges.clear();state.nodeOffset=0;state.edgeOffset=0;
        state.rows=[];state.bins=[];state.picked=[];break;
      }
      for(const n of page.nodes||[])if(Array.isArray(n.p4)&&n.p4.length===4&&n.p4.every(Number.isFinite))state.byId.set(n.id,n);
      for(const e of page.edges||[])state.edges.set(JSON.stringify([e.from,e.to,e.type]),e);
      state.nodeOffset=page.next_node_offset;state.edgeOffset=page.next_edge_offset;
      state.knownNodeTotal=page.total_nodes;state.knownEdgeTotal=page.total_edges;
      state.graphIncomplete=state.edgeOffset<LIMIT_EDGES&&(!page.complete);
      if(page.complete||state.edgeOffset>=LIMIT_EDGES)break;
    }
    state.lastGraphFetch=Date.now();
  }catch(e){setError(e)}finally{state.graphLoading=false}
}
async function refresh(){
  if(state.busy)return;state.busy=true;
  try{
    const meta=await read('/api/spacetime/meta');
    const fresh=!state.meta;
    if(fresh){state.timeDepth=Math.ceil(Math.log2(Math.max(1,meta.last-meta.first+1)));}
    if(fresh||state.follow)state.timeCenter=meta.last;
    state.meta=meta;
    if(meta.total){
      applyTimeControls();
      const r=state.range;
      const win=await read(`/api/spacetime/window?start=${r.start}&end=${r.end}&bins=80&max_events=96`);
      state.rows=win.events;state.bins=win.bins;
      state.skipped=win.visible_total-win.events.length;
      text('sampling',win.sampled ?
        `${fmt(win.events.length)} evenimente reale eșantionate din ${fmt(win.visible_total)}; restul sunt numărate exact, nu inventate.`:
        `${fmt(win.events.length)} / ${fmt(win.visible_total)} evenimente complete, fără eșantionare.`);
      text('source',`Axa T: trace.id; ${fmt(meta.total)} evenimente persistate.`);
    }else{
      state.rows=[];state.bins=[];
      text('sampling','Nu există încă evenimente înregistrate. Activează Capture în Portal și pornește antrenarea.');
      text('windowInfo','T —');
    }
    text('connect','SURSĂ REALĂ · '+(meta.total?'CONECTAT':'FĂRĂ EVENIMENTE'));
    state.problem=null;
    if(Date.now()-state.lastGraphFetch>6000)await loadGraph(3);
  }catch(e){setError(e)}finally{state.busy=false;}
}

function position(p5,w,h){
  const pr=project5(p5,{angles:state.angles,center:state.cameraCenter,logZoom:state.logZoom});
  if(!pr)return null;
  const scale=Math.min(w,h)*.19;
  const x=w/2+pr.x*scale, y=h/2-pr.y*scale;
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1e8||Math.abs(y)>1e8)return null;
  return {x,y,depth:pr.depth};
}
function line(ctx,a,b,color,width=1,dash=[]){
  if(!a||!b)return;
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
}
function toroidPoint(theta,alpha,beta,t){
  const R=1.75,r=.92;
  return [(R+r*Math.cos(alpha))*Math.cos(theta),(R+r*Math.cos(alpha))*Math.sin(theta),
    r*Math.sin(alpha)*Math.cos(beta),r*Math.sin(alpha)*Math.sin(beta),t];
}
function drawReference(ctx,w,h){
  if(!state.shell)return;
  const loop=(fn,steps=70)=>{
    let last=null;
    for(let i=0;i<=steps;i++){
      const p=position(fn(i/steps*2*Math.PI),w,h);
      if(last&&p)line(ctx,last,p,'rgba(66,120,149,.13)',Math.max(.6,dpr()*.55));
      last=p;
    }
  };
  // This mesh is explicitly a CAMERA GUIDE, never a trained synapse.
  for(const t of [-2,0,2])for(const beta of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
    for(const alpha of [0,Math.PI/2,Math.PI,3*Math.PI/2])loop(theta=>toroidPoint(theta,alpha,beta,t));
    for(const theta of [0,Math.PI/2,Math.PI,3*Math.PI/2])loop(alpha=>toroidPoint(theta,alpha,beta,t));
  }
}
function colorOf(node){
  if(node?.role==='temporal')return '#a89bf9';
  if(node?.role==='action')return '#f2bb70';
  if(node?.role==='effect')return '#7bedbe';
  if(node?.role==='sensor')return '#53ded7';
  return '#91bad6';
}
function getLayer(){
  // Scaling a graph does NOT invent new neuronal states: group by existing edges.
  const ids=new Set();
  for(const f of state.rows)for(const id of f.active||[])if(state.byId.has(id))ids.add(id);
  const nodes=[...ids].map(id=>({id,p4:state.byId.get(id).p4}));
  const edges=[...state.edges.values()].filter(e=>ids.has(e.from)&&ids.has(e.to)).map(e=>({
    from:e.from,to:e.to,weight:Math.max(1,Number(e.count)||1)
  }));
  const all=graphHierarchy(nodes,edges,7);
  const level=clamp(Math.floor(Math.max(0,-state.logZoom)*1.2),0,all.length-1);
  state.level=level;
  return {layer:all[level], lookup:lookupHierarchy(all[level]),totalLevels:all.length};
}
function draw(){
  const [w,h]=resize(space),ctx=context;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#030c17';ctx.fillRect(0,0,w,h);
  const ambient=ctx.createRadialGradient(w*.5,h*.55,10,w*.5,h*.55,Math.max(w,h)*.58);
  ambient.addColorStop(0,'rgba(15,58,72,.42)');ambient.addColorStop(1,'rgba(1,5,11,0)');
  ctx.fillStyle=ambient;ctx.fillRect(0,0,w,h);
  drawReference(ctx,w,h);
  state.picked=[];
  if(!state.rows.length){
    ctx.fillStyle='#66899d';ctx.textAlign='center';ctx.font=`${13*dpr()}px ui-monospace,monospace`;
    ctx.fillText('AȘTEAPTĂ EVENIMENTE REALE DIN MOTOR',w/2,h/2);drawHistory();return;
  }
  const {lookup,totalLevels}=getLayer(),scale=dpr();
  const cached=[];
  const trails=new Map();
  let missing=0,drawnMessages=0;
  for(const f of state.rows){
    const grouped=new Map(),t=timeCoord(f.trace_id,state.range);
    for(const id of (f.active||[])){
      const n=lookup.get(id);
      if(!n){missing++;continue;}
      grouped.set(n.id,n);
    }
    const points=new Map();
    for(const n of grouped.values()){
      const p=position([...n.p4,t],w,h);if(!p)continue;
      points.set(n.id,p);
      const original=n.members.length===1?state.byId.get(n.members[0]):null;
      const color=original?colorOf(original):'#8b9ed5';
      const size=(2.5+Math.min(12,Math.sqrt(n.members.length)*1.2))*scale;
      const source=f.error>0.5?'#f27da0':color;
      ctx.globalAlpha=.78;ctx.fillStyle=source;ctx.beginPath();ctx.arc(p.x,p.y,size,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      state.picked.push({x:p.x,y:p.y,event:f,node:n,source:original});
      if(state.tracks && n.members.length===1){
        const prev=trails.get(n.id);
        // These are DRAWN ONLY for successive stored events, never across a
        // sampled gap. A dotted track is an identity guide, not a synapse.
        if(prev&&f.trace_id===prev.id+1)line(ctx,prev.point,p,'rgba(106,188,202,.23)',.7*scale,[2*scale,4*scale]);
        trails.set(n.id,{id:f.trace_id,point:p});
      }
    }
    for(const m of f.messages||[]){
      const a=lookup.get(m.from),b=lookup.get(m.to);
      if(!a||!b||a.id===b.id)continue;
      const pa=points.get(a.id),pb=points.get(b.id);
      if(pa&&pb){line(ctx,pa,pb,'rgba(239,180,108,.34)',Math.max(.6,Math.min(2.5,Number(m.strength)||.6))*scale);drawnMessages++;}
    }
  }
  const count=state.rows.length;
  text('coverage',`${fmt(count)} evenimente ${state.skipped?'eșantionate':'complete'} · ${state.level+1}/${totalLevels} niveluri · ${fmt(drawnMessages)} mesaje desenate · ${fmt(missing)} ID-uri indisponibile · topologie ${fmt(state.edgeOffset)}/${fmt(state.knownEdgeTotal)} muchii` );
  drawHistory();
}
function drawHistory(){
  const [w,h]=resize(history),g=chart,d=state.bins;
  g.clearRect(0,0,w,h);g.fillStyle='#061523';g.fillRect(0,0,w,h);
  if(!d.length)return;
  const max=Math.max(1,...d.map(b=>b.count));
  const step=w/d.length;
  for(let i=0;i<d.length;i++){
    const height=Math.log1p(d[i].count)/Math.log1p(max)*(h-22);
    g.fillStyle=d[i].count?'#287e97':'#193346';
    g.fillRect(i*step+1,h-10-height,Math.max(1,step-2),height);
  }
  const rel=(state.timeCenter-state.range.start)/Math.max(1,state.range.end-state.range.start);
  const x=clamp(rel,0,1)*w;
  g.strokeStyle='#f6c17f';g.lineWidth=2*dpr();g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();
  g.fillStyle='#8eaebf';g.font=`${10*dpr()}px ui-monospace,monospace`;
  g.fillText(`T ${fmt(state.range.start)}`,6,13);g.textAlign='right';
  g.fillText(`T ${fmt(state.range.end)}`,w-6,13);g.textAlign='left';
}
function inspect(hit){
  state.lastHit=hit;const f=hit.event,n=hit.node;
  text('inspect',[
    `T: ${f.trace_id} (înregistrare reală)`,
    `WORLD: ${f.domain||'?'} · ${f.world_hash||'n/a'}`,
    `ID / grup: ${n.members.slice(0,25).join(', ')}${n.members.length>25?' …':''}`,
    `Membri observați: ${n.members.length}`,
    `Rol: ${hit.source?.role||'grupare de vizualizare'}`,
    `Etichetă: ${hit.source?.label||'n/a'}`,
    `Acțiune: ${f.action||'n/a'}`,
    `Efect: ${f.actual?.effect||'n/a'} / recompensă: ${f.reward??'n/a'}`,
    `Predicție: ${f.prediction??'n/a'} · eroare: ${f.error??'n/a'}`,
    `Update parametri: ${f.update_norm??'n/a'}`,
    `Global step: ${f.global_step??'n/a'}`,
    'Coordonate spațiale: embedding de vizualizare 4D',
    'Timp: ordinea acțiunilor înregistrate, nu secunde'
  ].join('\n'));
}

function buildControls(){
  const inputPanel=$('cameraInputs'),anglePanel=$('planes');
  for(let i=0;i<5;i++){
    const el=document.createElement('label');el.textContent=AXES[i];
    const input=document.createElement('input');input.type='number';input.step='.05';input.value='0';
    input.setAttribute('aria-label',`Centru axă ${AXES[i]}`);
    input.addEventListener('input',()=>{const value=Number(input.value);if(Number.isFinite(value))state.cameraCenter[i]=value;});
    inputPanel.append(el);el.append(input);
  }
  for(let i=0;i<PLANE_NAMES.length;i++){
    const el=document.createElement('label');
    const name=document.createElement('span');name.textContent=PLANE_NAMES[i]+' ';
    const out=document.createElement('output');out.textContent='0.00';
    const input=document.createElement('input');input.type='range';input.min='-3.14';input.max='3.14';input.step='.01';input.value='0';
    input.setAttribute('aria-label',`Rotație ${PLANE_NAMES[i]}`);
    input.addEventListener('input',()=>{state.angles[i]=+input.value;out.textContent=(+input.value).toFixed(2);});
    el.append(name,out,input);anglePanel.append(el);
  }
}
function updateControlValues(){
  [...$('cameraInputs').querySelectorAll('input')].forEach((x,i)=>{x.value=state.cameraCenter[i].toFixed(2)});
  [...$('planes').querySelectorAll('label')].forEach((x,i)=>{
    const value=((state.angles[i]+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
    x.querySelector('input').value=value.toFixed(2);x.querySelector('output').textContent=value.toFixed(2);
  });
  $('spatialZoom').value=clamp(state.logZoom,-12,12);
  text('spaceVal','×'+Math.exp(state.logZoom).toExponential(2));
}
function changeDepth(delta){
  state.timeDepth=clamp(state.timeDepth+delta,0,Number($('timeZoom').max));
  state.follow=false;text('follow','URMĂREȘTE LIVE: NU');
  applyTimeControls();refresh();
}
buildControls();
$('resetCamera').onclick=()=>{state.angles.fill(0);state.cameraCenter.fill(0);state.logZoom=0;updateControlValues();};
$('follow').onclick=()=>{state.follow=!state.follow;text('follow','URMĂREȘTE LIVE: '+(state.follow?'DA':'NU'));if(state.follow){state.timeCenter=state.meta?.last||0;refresh();}};
$('reload').onclick=async()=>{state.byId.clear();state.edges.clear();state.nodeOffset=0;state.edgeOffset=0;await loadGraph(16);await refresh();};
$('spatialZoom').oninput=()=>{state.logZoom=Number($('spatialZoom').value);updateControlValues();};
$('timeZoom').oninput=()=>{state.timeDepth=Number($('timeZoom').value);state.follow=false;text('follow','URMĂREȘTE LIVE: NU');applyTimeControls();refresh();};
$('timeBack').onclick=()=>{state.timeCenter-=Math.max(1,Math.round(currentWidth()*.45));state.follow=false;text('follow','URMĂREȘTE LIVE: NU');applyTimeControls();refresh();};
$('timeFront').onclick=()=>{state.timeCenter+=Math.max(1,Math.round(currentWidth()*.45));state.follow=false;text('follow','URMĂREȘTE LIVE: NU');applyTimeControls();refresh();};
$('allTime').onclick=()=>{if(!state.meta)return;state.timeDepth=Number($('timeZoom').max);state.timeCenter=state.meta.last;state.follow=false;text('follow','URMĂREȘTE LIVE: NU');applyTimeControls();refresh();};
$('shell').onchange=()=>state.shell=$('shell').checked;
$('tracks').onchange=()=>state.tracks=$('tracks').checked;
space.addEventListener('pointerdown',e=>{space.setPointerCapture(e.pointerId);state.drag={x:e.clientX,y:e.clientY,shift:e.shiftKey,moved:false};});
space.addEventListener('pointermove',e=>{
  if(!state.drag)return;
  const dx=e.clientX-state.drag.x,dy=e.clientY-state.drag.y;
  if(Math.abs(dx)+Math.abs(dy)>2)state.drag.moved=true;
  if(e.shiftKey||state.drag.shift){state.cameraCenter[0]-=dx/130;state.cameraCenter[1]+=dy/130;}
  else{state.angles[0]+=dx*.008;state.angles[9]+=dy*.008;}
  state.drag.x=e.clientX;state.drag.y=e.clientY;
  updateControlValues();
});
space.addEventListener('pointerup',e=>{
  if(!state.drag)return;const moved=state.drag.moved;state.drag=null;if(moved)return;
  const bounds=space.getBoundingClientRect(),x=(e.clientX-bounds.left)*dpr(),y=(e.clientY-bounds.top)*dpr();
  let selected=null,best=15*dpr();
  for(const h of state.picked){const d=Math.hypot(x-h.x,y-h.y);if(d<best){best=d;selected=h;}}
  if(selected)inspect(selected);
});
space.addEventListener('wheel',e=>{
  e.preventDefault();
  if(e.shiftKey){changeDepth(e.deltaY>0?1:-1);}
  else{state.logZoom=clamp(state.logZoom-e.deltaY*.002,-24,24);updateControlValues();}
},{passive:false});
history.addEventListener('click',e=>{
  if(!state.meta?.total)return;
  const r=history.getBoundingClientRect(),pct=clamp((e.clientX-r.left)/r.width,0,1);
  state.timeCenter=Math.round(state.range.start+pct*(state.range.end-state.range.start));
  state.follow=false;text('follow','URMĂREȘTE LIVE: NU');refresh();
});
history.addEventListener('wheel',e=>{e.preventDefault();changeDepth(e.deltaY>0?1:-1);},{passive:false});
function animate(){draw();requestAnimationFrame(animate)}
refresh();setInterval(refresh,2500);requestAnimationFrame(animate);
