// Seven observational instruments; draws ONLY native /graph and original frozen /eval results.
import {nativeGraph,nativeXD,topology,graphSpectrum,coordinateDimensions,causalTrace,mazeShape,DynamicsTracker} from '/science-core.mjs';
const IDS=['spectrum','phases','cycles','dynamics','unfold','causal','shape'];
const $=id=>document.getElementById(id);
const num=(n,d=2)=>Number.isFinite(n)?Number(n).toFixed(d):'unavailable';
const colors={ink:'#b9d4ef',mute:'#70889f',line:'#37b6cc',hot:'#ffcd6c',good:'#5bdeb2',bad:'#fc7c96',purple:'#c19fff'};
function sheet(id){
  const canvas=$('science-'+id),c=canvas?.getContext('2d');if(!canvas||!c)return null;
  const w=Math.max(200,canvas.clientWidth||300),h=Math.max(130,canvas.clientHeight||170),d=Math.min(2,window.devicePixelRatio||1);
  if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d)}
  c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);
  c.fillStyle='#071521';c.fillRect(0,0,w,h);c.strokeStyle='#273b51';c.lineWidth=1;
  for(let k=1;k<=3;k++){c.beginPath();c.moveTo(12,h*k/4);c.lineTo(w-12,h*k/4);c.stroke()}
  return{c,w,h};
}
function status(id,title,subtitle){const x=$('science-status-'+id);if(x)x.textContent=title;const y=$('science-detail-'+id);if(y)y.textContent=subtitle}
function label(c,txt,x,y,col=colors.ink,size=11){c.fillStyle=col;c.font=size+'px system-ui,sans-serif';c.fillText(String(txt),x,y)}
function line(c,pts,color=colors.line,width=1.5){if(pts.length<2)return;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(const p of pts.slice(1))c.lineTo(p[0],p[1]);c.stroke()}
function dot(c,x,y,color=colors.ink,size=2){c.beginPath();c.fillStyle=color;c.arc(x,y,size,0,Math.PI*2);c.fill()}
function mapped(g,axisA,axisB,x0,y0,w,h){
  const pts=g.xyz.map(p=>p&&p.length>Math.max(axisA,axisB)?[p[axisA],p[axisB]]:null);
  const valid=pts.filter(Boolean);if(!valid.length)return null;
  const xs=valid.map(p=>p[0]),ys=valid.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  return pts.map(p=>p?[x0+(p[0]-minX)/(maxX-minX||1)*w,y0+h-(p[1]-minY)/(maxY-minY||1)*h]:null);
}
function drawGraph(c,g,pts,{cycles=null,edges=200,flow=false}={}){
  if(!pts)return;
  for(const e of g.edges.slice(0,edges))if(pts[e.a]&&pts[e.b]){
    const hot=flow&&(g.flow.has(g.nodes[e.a].id+'|'+g.nodes[e.b].id)||g.flow.has(g.nodes[e.b].id+'|'+g.nodes[e.a].id));
    line(c,[pts[e.a],pts[e.b]],hot?colors.good:'#37607e',hot?1.8:.65);
  }
  if(cycles)for(const cycle of cycles)if(cycle.length>1){const q=cycle.map(i=>pts[i]).filter(Boolean);if(q.length===cycle.length)line(c,[...q,q[0]],colors.hot,1.8)}
  for(let i=0;i<pts.length;i++)if(pts[i])dot(c,...pts[i],g.nodes[i].activity>0?colors.purple:colors.ink,1.8);
}
function fallback(g,x,y,w,h){
  const n=g.nodes.length;return g.nodes.map((_,i)=>{const a=i*2.39996323,r=Math.sqrt((i+.5)/(n||1));return[x+w*(.5+.46*r*Math.cos(a)),y+h*(.5+.46*r*Math.sin(a))]});
}
function spectrum(g){const q=sheet('spectrum');if(!q)return;
  if(!g||!g.edges.length){status('spectrum','NO SPECTRUM','No observed edges; no inferred eigenstate.');return}
  const s=graphSpectrum(g,28);if(!s){status('spectrum','NO DATA','No native graph sample.');return}
  const {c,w,h}=q,vals=s.values,max=Math.max(1,...vals),gap=vals.find(x=>x>1e-8)??0;
  vals.forEach((v,i)=>{const x=16+(i+.5)*(w-32)/vals.length,y=h-22-(v/max)*(h-51);
    line(c,[[x,h-22],[x,y]],i===1?colors.hot:colors.line,Math.max(2,(w-32)/vals.length*.65));});
  label(c,'max '+num(Math.max(...vals),3),12,18);label(c,'min positive '+num(gap,4),12,33,colors.hot);
  status('spectrum','smallest positive eigenvalue '+num(gap,4)+' · '+s.sampled+' nodes',
    'Actual unweighted graph-Laplacian modes on a sampled graph; NOT quantum-energy eigenstates.');
}
function phases(g){const q=sheet('phases');if(!q)return;
  if(!g){status('phases','NO GRAPH','Live native state unavailable.');return}
  const m=coordinateDimensions(g);if(!m){status('phases','NO NATIVE U','No measurable native coordinates.');return}
  const {c,w,h}=q,pts=mapped(g,0,1,22,18,w-44,h-38);
  drawGraph(c,g,pts,{edges:220,flow:true});
  label(c,'U0 ↔ U1',12,15);label(c,'periodic: '+(m.periodic?'range [0,1)':'NOT established'),12,h-5,colors.hot,10);
  status('phases',m.samples+' coordinate vectors · '+m.d+' axes',
    'Real native 5D-coordinate projection; periodic coordinates DO NOT establish S3 or Hopf fibration.');
}
function cycles(g){const q=sheet('cycles');if(!q)return;
  if(!g||!g.nodes.length){status('cycles','NO GRAPH','Cannot measure cycles without native edges.');return}
  const t=topology(g),{c,w,h}=q;
  const pts=mapped(g,0,1,24,26,w-48,h-55)||fallback(g,18,22,w-36,h-45);
  drawGraph(c,g,pts,{cycles:t.cycles,edges:350});
  label(c,'cycle rank '+t.rank+' · components '+t.components,12,16,colors.hot);
  status('cycles',t.rank+' independent graph cycles',
    'Undirected observed-edge cycle rank. Yellow loops are detected graph cycles. Geometric link/Hopf index: UNVERIFIED.');
}
function dynamics(tracker){const q=sheet('dynamics');if(!q)return;
  const a=tracker.history;if(a.length<2){status('dynamics',a.length+' changed state(s)',
    'Requires >=2 DISTINCT live activity snapshots; repeated polling does not create oscillations.');return}
  const {c,w,h}=q,vals=a.map(x=>x.delta||0),max=Math.max(1e-12,...vals),pts=vals.map((v,i)=>[16+i*(w-32)/Math.max(1,vals.length-1),h-23-v/max*(h-52)]);
  line(c,pts,colors.good,1.8);pts.slice(-10).forEach(p=>dot(c,...p,colors.hot,2));
  const last=a.at(-1);
  label(c,'change in actual native activity',12,17);label(c,'last delta '+num(last.delta,5),12,32,colors.hot);
  status('dynamics',a.length+' real changes · recurrence '+num(last.recurrence,4),
    'Live node-activity displacement; sparse polling cannot certify phase locking or physical attractors.');
}
function unfold(g){const q=sheet('unfold');if(!q)return;
  if(!g){status('unfold','NO GRAPH','Native projection unavailable.');return}
  const m=coordinateDimensions(g);if(!m||m.d<4){status('unfold','NO 4D COORDINATES',
    'Original graph does not expose enough numeric dimensions for this comparison.');return}
  const {c,w,h}=q,left=mapped(g,0,1,15,28,w*.43,h-50),right=mapped(g,2,3,w*.55,28,w*.42,h-50);
  drawGraph(c,g,left,{edges:160});drawGraph(c,g,right,{edges:160});
  c.strokeStyle=colors.mute;c.beginPath();c.moveTo(w/2,22);c.lineTo(w/2,h-12);c.stroke();
  label(c,'axes 0-1',12,16);label(c,'axes 2-3',w*.54,16);
  label(c,'effective linear dimension '+num(m.effective,2),12,h-6,colors.hot,10);
  status('unfold',m.d+' supplied axes -> paired 2D views',
    'Two projections of the SAME real nodes. This is an observer projection, not proof of a learned unfolding algorithm.');
}
function causal(g){const q=sheet('causal');if(!q)return;
  const t=causalTrace(g?.raw);if(!t){status('causal','NO TRACE',
    'Native shared.training.trace absent: no invented transformations or causal claims.');return}
  const {c,w,h}=q,all=[...t.predicted,...t.observed,...t.before],lo=Math.min(...all),hi=Math.max(...all),n=t.n;
  const scale=v=>h-23-(v-lo)/(hi-lo||1)*(h-51);
  line(c,t.predicted.slice(0,n).map((v,i)=>[16+i*(w-32)/Math.max(1,n-1),scale(v)]),colors.hot,2);
  line(c,t.observed.slice(0,n).map((v,i)=>[16+i*(w-32)/Math.max(1,n-1),scale(v)]),colors.good,2);
  label(c,'predicted yellow / observed green',12,15);
  status('causal','native transition error RMSE '+num(t.rmse,5),
    'Before -> predicted -> observed from original shared training trace. Causality needs logged interventions.');
}
function shape(record){const q=sheet('shape');if(!q)return;
  const m=mazeShape(record);if(!m){status('shape','NO FROZEN MAZE',
    'Run EXISTING Frozen Test -> maze for real preaction plan vs executed path.');return}
  const {c,w,h}=q,n=m.n,step=Math.min((w-24)/n,(h-24)/n),ox=(w-step*n)/2,oy=(h-step*n)/2;
  for(let j=0;j<n*n;j++)if(m.wall?.[j]){c.fillStyle='#385066';c.fillRect(ox+(j%n)*step,oy+Math.floor(j/n)*step,step-1,step-1)}
  const coords=p=>[ox+(p%n+.5)*step,oy+(Math.floor(p/n)+.5)*step];
  line(c,m.path.map(coords),colors.good,2);if(m.planned)line(c,m.planned.map(coords),colors.hot,2.5);
  dot(c,...coords(m.start),colors.purple,4);dot(c,...coords(m.goal),colors.bad,4);
  status('shape',(m.solved?'SOLVED':'UNSOLVED')+' · first '+(m.first===null?'N/A':num(m.first*100,1)+'%'),
    'Green = original executed path; yellow = '+(m.isFirstPlan?'original first plan':'first plan absent')+
    '. Source = frozen /eval, NOT a native 5D solution trajectory.');
}

function xdPoints(xd,w,h){
  // Exact binary occupancy of the seven ACTIVE coordinates exposed by the native world.
  // x/y are observer-only finite-state coordinates, never learned manifold coordinates.
  const out=new Map();
  for(const v of xd.vertices){
    const low=v.bits.slice(0,3).reduce((s,b,i)=>s+b*(2**i),0);
    const high=v.bits.slice(3).reduce((s,b,i)=>s+b*(2**i),0);
    out.set(v.id,[16+(low/Math.max(1,2**Math.min(3,xd.activeRank)-1))*(w-32),
      18+(high/Math.max(1,2**Math.max(0,xd.activeRank-3)-1))*(h-36)]);
  }
  return out;
}
function xdUnfold(xd){
  const q=sheet('unfold');if(!q||!xd)return;
  const {c,w,h}=q,pts=xdPoints(xd,w,h);
  for(const e of xd.links){const a=pts.get(String(e.from)),b=pts.get(String(e.to));if(a&&b)line(c,[a,b],'#345574',.65)}
  for(const v of xd.vertices){const p=pts.get(v.id);if(p)dot(c,...p,v.wall?colors.bad:colors.ink,v.wall?2:1.6)}
  const solution=xd.predicted.map(id=>pts.get(id)).filter(Boolean);
  const observed=xd.observed.map(id=>pts.get(id)).filter(Boolean);
  line(c,solution,colors.hot,3);line(c,observed,colors.good,1.8);
  label(c,'7-bit occupancy -> 2D observer projection',12,13,colors.hot,10);
  status('unfold',xd.dimensions+' ambient axes · '+xd.activeRank+' active · '+xd.finiteStates+' states',
    'Real finite state map; gold predicted / green executed. 2D flattening is observer-made. NOT the whole 2^D hypercube or a proven emergent unfolding.');
}
function xdCausal(xd){
  const q=sheet('causal');if(!q||!xd)return;
  const {c,w,h}=q,frames=xd.frames,bar=(w-36)/Math.max(1,frames.length);
  for(let i=0;i<frames.length;i++){
    const x=18+i*bar;
    c.fillStyle=frames[i].correct?colors.good:colors.bad;
    c.fillRect(x,h*.3,Math.max(2,bar*.68),h*.5);
    label(c,String(i+1),x,h-10,colors.ink,10);
  }
  label(c,'learned actions executed against hidden physics',12,18,colors.hot,10);
  status('causal',(xd.correct??0)+'/'+(xd.attempted??0)+' predicted action effects matched',
    'Native xD execution.frames: predictedAfter compared against observedAfter. Training uses real interventions; this is held-out execution evidence.');
}
function xdShape(xd){
  const q=sheet('shape');if(!q||!xd)return;
  const {c,w,h}=q,pts=xdPoints(xd,w,h);
  for(const e of xd.links){
    const a=pts.get(String(e.from)),b=pts.get(String(e.to));if(a&&b)line(c,[a,b],'#294963',.5);
  }
  const predicted=xd.predicted.map(id=>pts.get(id)).filter(Boolean),
    observed=xd.observed.map(id=>pts.get(id)).filter(Boolean);
  line(c,predicted,colors.hot,3);
  line(c,observed,colors.good,1.8);
  const first=pts.get(xd.predicted[0]||xd.observed[0]),last=pts.get(xd.predicted.at(-1)||xd.observed.at(-1));
  if(first)dot(c,...first,colors.purple,4);
  if(last)dot(c,...last,colors.bad,4);
  label(c,'Gold = pre-action path / green = executed',10,14,colors.hot,10);
  const exact=xd.predicted.length>0&&xd.predicted.length===xd.observed.length&&
    xd.predicted.every((v,i)=>v===xd.observed[i]);
  status('shape',(xd.solved?'SOLVED':'NOT SOLVED')+' · prediction vs execution '+(exact?'EXACT':'DIFFERENT/UNAVAILABLE'),
    'Original learned action atlas predicted a full route BEFORE action. Actual action consequences from execution.frames; 7 active axes only.');
}

export function createScienceObservatory(){
  const tracker=new DynamicsTracker(),selected={record:null},sampled={g:null};
  function render(){const g=sampled.g,xd=sampled.xd;spectrum(xd?.graph||g);phases(g);cycles(xd?.graph||g);dynamics(tracker);if(xd){xdUnfold(xd);xdCausal(xd);xdShape(xd)}else{unfold(g);causal(g);shape(selected.record)}}
  let lastDraw=0;
  window.addEventListener('resize',render,{passive:true});
  for(const id of IDS)$('science-expand-'+id)?.addEventListener('click',()=>{
    $('science-card-'+id)?.classList.toggle('science-expanded');render();
  });
  return {
    consume(payload){sampled.g=nativeGraph(payload?.graph);sampled.xd=nativeXD(payload?.graph);if(sampled.g)sampled.g.worker=payload?.selectedWorker??null;
      tracker.push(sampled.g);if(Date.now()-lastDraw>1000){lastDraw=Date.now();render()}
    },
    onEvaluation(ev,index){selected.record=ev?.kind==='maze'&&Array.isArray(ev.mazes)?ev.mazes[index]||null:null;render()},
    render
  };
}