// Original V7-compatible ADDITIVE visualization foundation; no fake training.
// Host must call setGraph() with actual 4D coordinates and setFrame() with
// actual decisions/transfers. No guessed W coordinates or intercepted requests.
import {AXES,CORNERS,HYPERCUBE_EDGES,project4,navigation,parseGraph,
 graphBounds,normalizeNodes,onWSlice,crossingWSlice} from './geometry.mjs';
const COLORS={cage:'#9990e0',w:'#78e4d3',edge:'#568bad',active:'#f8c579',
 predicted:'#c99ef6',executed:'#8ef2ac',muted:'#a7bbd5'};
const controls=[
 '<div class="p4header"><div><small>GRAF 4D · TESSERACT</small><h2>Fereastră fixă spre spațiul 4D</h2></div>',
 '<span class="p4status" data-role="status">AȘTEAPTĂ DATE 4D REALE</span></div>',
 '<div class="p4grid"><div class="p4scene"><canvas data-role="canvas" aria-label="Graf 4D într-o fereastră tesseract fixă"></canvas>',
 '<div class="p4overlay" data-role="overlay">Hypercubeul este fix; săgețile schimbă poziția camerei în 4D.</div></div>',
 '<div class="p4side"><small>CAMERĂ 4D · LUMEA NU SE MIȘCĂ</small><div class="p4arrows">',
 '<div class="p4axis" data-axis="x"><strong>X</strong><button type="button" data-move="x:-1">← X−</button><button type="button" data-move="x:1">X+ →</button></div>',
 '<div class="p4axis" data-axis="y"><strong>Y</strong><button type="button" data-move="y:-1">↓ Y−</button><button type="button" data-move="y:1">Y+ ↑</button></div>',
 '<div class="p4axis" data-axis="z"><strong>Z</strong><button type="button" data-move="z:-1">↙ Z−</button><button type="button" data-move="z:1">Z+ ↗</button></div>',
 '<div class="p4axis" data-axis="w"><strong>W (4D)</strong><button type="button" data-move="w:-1">◀ W−</button><button type="button" data-move="w:1">W+ ▶</button></div>',
 '</div><label>Pas navigare <output data-role="stepLabel">0.20</output></label>',
 '<input type="range" min=".05" max="1" step=".05" value=".20" data-role="step">',
 '<label><span>Secțiune 3D pe axa W</span><input type="checkbox" data-role="slice"></label>',
 '<label>Lățime secțiune <output data-role="sliceLabel">0.70</output></label>',
 '<input type="range" min=".05" max="2" step=".05" value=".70" data-role="sliceWidth">',
 '<div class="p4readout" data-role="position"></div>',
 '<div class="p4readout" data-role="selected">Nod selectat: niciunul</div>',
 '<button type="button" data-role="reset">◎ CENTREAZĂ CAMERA</button>',
 '<div class="p4warning" data-role="warning">Afișez exclusiv activări și acțiuni transmise de motorul original.</div>',
 '</div></div>',
 '<div class="p4legend"><span>🟣 structură tesseract</span><span>🟦 muchie reală</span>',
 '<span>🟠 nod activ</span><span>🟪 predicție</span><span>🟩 execuție</span></div>'
].join('');
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const safeId=x=>x===undefined||x===null?null:String(x);
function segment(ctx,p,q,color,width=1.5,alpha=1,dash=false){
 if(!p||!q)return;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;
 ctx.lineWidth=width;ctx.setLineDash(dash?[7,6]:[]);ctx.beginPath();
 ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.restore();
}
function dot(ctx,p,r,color,alpha=1){
 if(!p)return;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;
 ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,r),0,2*Math.PI);ctx.fill();ctx.restore();
}
function label(ctx,s,x,y,color=COLORS.muted,size=12){
 ctx.fillStyle=color;ctx.font='600 '+size+'px system-ui';ctx.fillText(s,x,y);
}
export function createTesseractViewer(target,{graph=null}={}){
 if(typeof HTMLElement==='undefined'||!(target instanceof HTMLElement))
  throw Error('Tesseract viewer requires a real HTML target');
 const root=document.createElement('section');root.className='p4d';
 const css=document.createElement('link');css.rel='stylesheet';
 css.href=new URL('./viewer.css',import.meta.url).href;
 root.append(css);const wrap=document.createElement('div');
 wrap.innerHTML=controls;root.append(...Array.from(wrap.childNodes));
 target.append(root);
 const el=name=>root.querySelector('[data-role="'+name+'"]');
 const canvas=el('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw Error('2D canvas unavailable');
 let width=650,height=440,zoom=1,camera=[0,0,0,0],step=.2,
  slice=false,sliceWidth=.7,parsed=null,bounds=null,
  frame=null,selected=null,locations=new Map(),
  lastFrameAt=0,phase=0,disposed=false,raf=0;
 const listeners=[];
 function on(target,name,fn){target.addEventListener(name,fn);
  listeners.push([target,name,fn]);}
 function updatePosition(){
  el('position').textContent='CAMERĂ '+AXES.map((axis,i)=>
   axis.toUpperCase()+' '+camera[i].toFixed(2)).join(' · ')+
   (slice?' | SECȚIUNE 3D W ±'+sliceWidth.toFixed(2):' | PROIECȚIE 4D');
 }
 function setGraph(value){
  const data=parseGraph(value),computedBounds=graphBounds(data.nodes);
  // The data truly has 4 coordinates. Normalization does not invent W.
  parsed={...data,nodes:normalizeNodes(data.nodes,computedBounds)};
  bounds=computedBounds;frame=null;selected=null;locations=new Map();
  el('status').textContent='GRAF 4D CONECTAT · '+parsed.nodes.length+' NODURI';
  el('warning').textContent='Sursa este graful original furnizat prin setGraph(). Cadrul de training este separat.';
  draw();
 }
 function setFrame(value){
  if(!parsed)throw Error('No source graph connected');
  if(!value||typeof value!=='object')throw Error('Invalid real training frame');
  const known=new Set(parsed.nodes.map(n=>n.id));
  const edges=items=>(Array.isArray(items)?items:[]).map(e=>({
   from:safeId(e?.from),to:safeId(e?.to),strength:finite(e?.strength)?e.strength:0
  })).filter(e=>known.has(e.from)&&known.has(e.to));
  frame={
   activeNodes:(Array.isArray(value.activeNodes)?value.activeNodes:[]).map(String).filter(x=>known.has(x)),
   messages:edges(value.messages),predictedEdges:edges(value.predictedEdges),
   executed:value.executed?edges([value.executed])[0]||null:null,
   step:value.step??null,domain:value.domain??null,
   outcome:value.outcome??null
  };
  lastFrameAt=performance.now();draw();
 }
 function move(axis,sign){
  camera=navigation(camera,axis,sign,step);
  updatePosition();draw();
 }
 function nodesProjected(){
  const pts=new Map();
  if(!parsed)return pts;
  for(const n of parsed.nodes){
   if(slice&&!onWSlice(n.normalized,camera[3],sliceWidth))continue;
   pts.set(n.id,project4(n.normalized,{camera,width,height,zoom}));
  }
  return pts;
 }
 function draw(){
  if(disposed)return;
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle='#071122';ctx.fillRect(0,0,width,height);
  ctx.strokeStyle='#14263c';ctx.lineWidth=.7;
  for(let i=1;i<6;i++){
   ctx.beginPath();ctx.moveTo(width*i/6,0);ctx.lineTo(width*i/6,height);
   ctx.moveTo(0,height*i/6);ctx.lineTo(width,height*i/6);ctx.stroke();
  }
  // Frame project4(...,frame:true) ignores camera: visually fixed.
  const cage=CORNERS.map(p=>project4(p,{width,height,zoom:.78,frame:true}));
  for(const e of HYPERCUBE_EDGES)
   segment(ctx,cage[e.from],cage[e.to],e.axis===3?COLORS.w:COLORS.cage,
    e.axis===3?2.3:1.45,.68);
  for(const p of cage)dot(ctx,p,3,COLORS.cage,.83);
  label(ctx,'TESSERACT FIX · 16 VÂRFURI · 32 MUCHII',12,23,COLORS.muted,11);
  if(!parsed){
   label(ctx,'AȘTEPT GRAFUL REAL CU x,y,z,w',14,height-64,COLORS.active,13);
   label(ctx,'Fără evenimente reale nu afișez activări inventate.',14,height-42,COLORS.muted,11);
   el('overlay').textContent='Rama este geometrică. Nu sunt simulate antrenamente sau soluții.';
   locations=new Map();return;
  }
  const points=nodesProjected(),byId=new Map(parsed.nodes.map(n=>[n.id,n]));
  for(const e of parsed.edges){
   const p=points.get(e.from),q=points.get(e.to);
   segment(ctx,p,q,COLORS.edge,1.3,.49);
   if(slice&&!p&&!q){
    const a=byId.get(e.from)?.normalized,b=byId.get(e.to)?.normalized;
    if(a&&b){
     const x=crossingWSlice(a,b,camera[3]);
     if(x)dot(ctx,project4(x.position,{camera,width,height,zoom}),3,COLORS.w,.9);
    }
   }
  }
  for(const e of frame?.messages||[]){
   const p=points.get(e.from),q=points.get(e.to);
   segment(ctx,p,q,COLORS.w,1.5+Math.min(2.5,Math.abs(e.strength)),.91);
  }
  for(const e of frame?.predictedEdges||[])
   segment(ctx,points.get(e.from),points.get(e.to),COLORS.predicted,2.5,.9,true);
  if(frame?.executed)segment(ctx,points.get(frame.executed.from),
   points.get(frame.executed.to),COLORS.executed,3.6);
  for(const n of parsed.nodes){
   const p=points.get(n.id),active=!!frame?.activeNodes.includes(n.id);
   dot(ctx,p,active?7+Math.sin(phase*.11)*1.5:3.6,
    active?COLORS.active:COLORS.w,active?1:.67);
   if(selected===n.id&&p){
    ctx.beginPath();ctx.arc(p.x,p.y,12,0,2*Math.PI);
    ctx.strokeStyle=COLORS.active;ctx.lineWidth=2;ctx.stroke();
   }
  }
  if(frame?.messages.length&&performance.now()-lastFrameAt<2300){
   const t=((performance.now()-lastFrameAt)/600)%1;
   for(const m of frame.messages){
    const a=points.get(m.from),b=points.get(m.to);
    if(a&&b)dot(ctx,{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},
     3.4,COLORS.w,Math.min(1,Math.max(.2,Math.abs(m.strength))));
   }
  }
  locations=points;
  el('overlay').textContent=parsed.nodes.length+' noduri 4D · '+parsed.edges.length+
   ' legături reale · '+(frame?.step===undefined||frame?.step===null?
   'fără eveniment de training':'acțiune executată #'+frame.step)+
   (slice?' · secțiune 3D w='+camera[3].toFixed(2):' · proiecție 4D completă');
 }
 function resize(){
  const r=canvas.getBoundingClientRect();
  width=Math.max(280,Math.round(r.width||650));
  height=Math.max(190,Math.round(r.height||440));
  const dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);draw();
 }
 for(const b of root.querySelectorAll('[data-move]')){
  const [axis,sign]=b.dataset.move.split(':');
  on(b,'click',()=>move(axis,Number(sign)));
 }
 on(el('step'),'input',e=>{step=Number(e.target.value);
  el('stepLabel').textContent=step.toFixed(2);});
 on(el('slice'),'change',e=>{slice=e.target.checked;updatePosition();draw();});
 on(el('sliceWidth'),'input',e=>{sliceWidth=Number(e.target.value);
  el('sliceLabel').textContent=sliceWidth.toFixed(2);draw();});
 on(el('reset'),'click',()=>{camera=[0,0,0,0];updatePosition();draw();});
 on(canvas,'click',e=>{
  const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  let best=20*20,id=null;
  for(const [key,p] of locations){
   if(!p)continue;const d=(p.x-x)**2+(p.y-y)**2;
   if(d<best){best=d;id=key;}
  }
  selected=id;
  const node=parsed?.nodes.find(n=>n.id===id);
  el('selected').textContent=node?'NOD '+id+
   ' · coordonate reale: '+node.position.map(v=>v.toFixed(3)).join(', ')+
   (finite(node.activity)?' · activare '+node.activity.toFixed(5):
   ' · activare indisponibilă'):'Nod selectat: niciunul';
  draw();
 });
 const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
 observer?.observe(canvas);on(window,'resize',resize);
 function tick(){
  if(disposed)return;
  if(frame?.messages.length&&performance.now()-lastFrameAt<2300){phase++;draw();}
  raf=requestAnimationFrame(tick);
 }
 updatePosition();resize();tick();
 if(graph)setGraph(graph);
 return {root,setGraph,setFrame,move,getCamera:()=>camera.slice(),
  getGraph:()=>parsed,
  destroy(){disposed=true;cancelAnimationFrame(raf);observer?.disconnect();
   for(const [element,name,fn] of listeners)element.removeEventListener(name,fn);
   root.remove();}
 };
}
export function bindPortal4DHost(target,options={}){
 const viewer=createTesseractViewer(target,options);
 const g=e=>viewer.setGraph(e.detail),f=e=>viewer.setFrame(e.detail);
 window.addEventListener('portal4d:graph4d',g);
 window.addEventListener('portal4d:frame4d',f);
 return {...viewer,destroy(){
  window.removeEventListener('portal4d:graph4d',g);
  window.removeEventListener('portal4d:frame4d',f);
  viewer.destroy();
 }};
}
