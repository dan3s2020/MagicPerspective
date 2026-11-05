/* Portal V12: real event-sourced graph animation within a four-SPATIAL-dimensional
   solid torus S¹×B³. No torus nodes/links are fabricated for the viewer.
   4D section = w=constant with configurable thickness; time is a REPLAY control.
   Event phases interpolate recorded step ordering, not physical substep timestamps. */
'use strict';
const $ = id => document.getElementById(id);
const canvas=$('graph'),ctx=canvas.getContext('2d');
const dpr=Math.min(2,window.devicePixelRatio||1);
const colors={activation:'#55d4e7',prediction:'#b497ff',decision:'#f7c95d',error:'#ee5e7e',learning:'#f3985e',confirmed:'#52cfa6',growth:'#eef5ff'};
const MAJOR=1.75,MINOR=.92;
let graph={nodes:[],edges:[],total_nodes:0,total_edges:0},nodeMap=new Map(),graphVersion=0;
let traces=[],pending=[],frame=-1,follow=true,mode='torus',yaw=.12,pitch=-.08,zoom=1.08,drag=null,selected=null;
let since=0,skipped=0,lastError='',loadedCorpusDigest=null,phaseStarted=performance.now(),frameDuration=1160;
let sliceW=0,sliceThickness=.34,torusTheta=0,followSlice=false,lastStatus=null;
// User-supplied Clifford Torus HTML establishes the 4D plane rotations.
// True all-graph render positions come exclusively from backend p4 coordinates.
let torusAngles=[.08,-.18,.02,.08,-.10,.04],rotate4Automatically=false,lastRotateTime=performance.now();
const allNodes=new Map(),allEdges=new Map();
let fullGraph={nodes:[],edges:[],byID:new Map()},wholeGraphBusy=false;
let wholeNodeOffset=0,wholeEdgeOffset=0,wholeNodeTotal=0,wholeEdgeTotal=0;
let torusProjections=new Map(),lastTorusInfoAt=0;
const edgeKey=e=>e.from+'|'+e.to+'|'+e.type;
function rebuildWholeGraph(){
  const nodes=new Map(allNodes);
  // The previous fast /api/graph fetch can include a brand-new active node
  // before its all-graph page is fetched; never suppress that live activity.
  for(const n of graph.nodes)nodes.set(n.id,n);
  const edges=new Map(allEdges);
  for(const e of graph.edges)edges.set(edgeKey(e),e);
  fullGraph={nodes:[...nodes.values()],edges:[...edges.values()],byID:nodes};
}
function clearWholeGraph(){
  PortalTorusView.resetGeometry();
  allNodes.clear();allEdges.clear();wholeNodeOffset=0;wholeEdgeOffset=0;
  wholeNodeTotal=0;wholeEdgeTotal=0;
  fullGraph={nodes:[],edges:[],byID:new Map()};torusProjections=new Map();
}

let statusBusy=false,traceBusy=false,graphBusy=false,graphFetched=0;
const phaseLabels=[
  '01 • PERCEPȚIE — noduri activate în lumea curentă',
  '02 • MESAJE — propagări măsurate între noduri',
  '03 • DECIZIE — acțiunea aleasă de controller',
  '04 • REZULTAT — predicție comparată cu lumea',
  '05 • ÎNVĂȚARE — gradient, conexiuni și memorie'
];
function resize(){const r=canvas.getBoundingClientRect();canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr)}
new ResizeObserver(resize).observe(canvas);resize();
function clamp(v,min,max){return Math.min(max,Math.max(min,v))}
function wrap(a){return ((a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI}
function toroidalLocal(p){
  const theta=Math.atan2(p[1],p[0]);
  // Inside-camera coordinates of the *actual 4D graph node*. These are
  // a 3D cross-section, not a projection of time into a fourth axis.
  return [Math.hypot(p[0],p[1])-MAJOR,p[2],wrap(theta-torusTheta)*MAJOR*1.2];
}
function visible4(n){return n.p4 && Math.abs(n.p4[3]-sliceW)<=sliceThickness}
function nodePosition(n){return mode==='4d'?toroidalLocal(n.p4):n.pos}
function project(v){
  if(!v)return null;
  let [x,y,z]=v;
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  let xx=x*cy-z*sy,zz=x*sy+z*cy,yy=y*cp-zz*sp;
  zz=y*sp+zz*cp;
  const s=Math.min(canvas.width,canvas.height)*(mode==='4d'?.31:.28)*zoom/(1+zz*.16);
  return {x:canvas.width/2+xx*s,y:canvas.height/2-yy*s,z:zz,s};
}
function projectNode(n){return project(nodePosition(n))}
function roleColor(role){return role==='temporal'?'#b497ff':role==='relation'?'#5b80b9':role==='action'?colors.decision:role==='motif'?'#bb9afa':role==='effect'?colors.confirmed:role==='world'?'#63b6ff':role==='perspective'?'#64d6a2':'#526f9a'}
function selectedTrace(){return frame>=0?traces[frame]||null:null}
function normalizedPhase(now){return clamp((now-phaseStarted)/frameDuration,0,1)}
function phaseIndex(v){return v<.18?0:v<.56?1:v<.68?2:v<.88?3:4}
function drawTorusSectionGuide(){
  // Mathematical SECTION boundary, not graph nodes/edges. Looking from
  // inside the toroidal corridor along the theta direction: radial u and
  // vertical z span a disk with radius sqrt(r²-w²). Time plays no part.
  const radius=Math.sqrt(Math.max(0,MINOR*MINOR-sliceW*sliceW));
  if(radius<.03)return;
  for(const depth of [-2.6,-1.5,0,1.5,2.6]){
    ctx.beginPath();let started=false;
    for(let i=0;i<=80;i++){
      const phi=2*Math.PI*i/80;
      const point=project([radius*Math.cos(phi),radius*Math.sin(phi),depth]);
      if(!point)continue;
      if(!started){ctx.moveTo(point.x,point.y);started=true}else ctx.lineTo(point.x,point.y);
    }
    ctx.strokeStyle='rgba(116,113,195,.13)';ctx.lineWidth=1*dpr;
    ctx.setLineDash([4*dpr,12*dpr]);ctx.stroke();ctx.setLineDash([]);
  }
}
function sectionIntersects(a,b){
  if(!a?.p4||!b?.p4)return null;
  const w1=a.p4[3],w2=b.p4[3];
  if(w1===w2||sliceW<Math.min(w1,w2)||sliceW>Math.max(w1,w2))return null;
  const t=(sliceW-w1)/(w2-w1);
  const p=a.p4.map((v,i)=>v+(b.p4[i]-v)*t);
  return project(toroidalLocal(p));
}
function circle(p,r,fill,alpha=1){
  if(!p)return;
  ctx.globalAlpha=alpha;ctx.beginPath();ctx.fillStyle=fill;ctx.arc(p.x,p.y,r,0,2*Math.PI);ctx.fill();ctx.globalAlpha=1;
}
function ring(p,r,color,width=1.4,alpha=1){
  if(!p)return;
  ctx.globalAlpha=alpha;ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width*dpr;ctx.arc(p.x,p.y,r,0,2*Math.PI);ctx.stroke();ctx.globalAlpha=1;
}
function draw(){
  const now=performance.now();
  const W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);
  if(!W||!H){requestAnimationFrame(draw);return}
  if(mode==='torus'||mode==='4d'){
    if(rotate4Automatically){
      const dt=Math.min(.06,(now-lastRotateTime)/1000);
      torusAngles[0]+=dt*.12;torusAngles[1]+=dt*.075;torusAngles[2]+=dt*.04;
    }
    lastRotateTime=now;
    const f=selectedTrace();
    const rendered=PortalTorusView.draw(ctx,{
      width:W,height:H,dpr,mode,nodes:fullGraph.nodes,edges:fullGraph.edges,
      byID:fullGraph.byID,angles:torusAngles.map((a,i)=>i===3?a+torusTheta:a),
      yaw,pitch,zoom,w:sliceW,thickness:sliceThickness,
      trace:f,phase:normalizedPhase(now),selected
    });
    torusProjections=rendered.visible;
    const loadedN=allNodes.size,loadedE=allEdges.size;
    const totalN=Math.max(wholeNodeTotal,graph.total_nodes||0),totalE=Math.max(wholeEdgeTotal,graph.total_edges||0);
    if(now-lastTorusInfoAt>250){lastTorusInfoAt=now;
    $('torusInfo').textContent=(mode==='torus'?'TOROID 4D COMPLET':'SECȚIUNE A INTERIORULUI')+
      ' · '+loadedN.toLocaleString('ro-RO')+'/'+totalN.toLocaleString('ro-RO')+' noduri citite'+
      ' · '+loadedE.toLocaleString('ro-RO')+'/'+totalE.toLocaleString('ro-RO')+' legături citite'+
      (mode==='4d'?' · '+rendered.insideCount.toLocaleString('ro-RO')+' noduri în secțiune':'')+
      ' · XW '+(torusAngles[0]*180/Math.PI).toFixed(0)+'° YW '+(torusAngles[1]*180/Math.PI).toFixed(0)+'°';
    $('sliceCount').textContent=mode==='torus'?
      'Întreg toroidul · '+rendered.insideCount.toLocaleString('ro-RO')+' noduri reale · '+rendered.drawnEdges.toLocaleString('ro-RO')+' legături reale desenate':
      'Felie W='+sliceW.toFixed(2)+' ±'+sliceThickness.toFixed(2)+' · '+rendered.insideCount.toLocaleString('ro-RO')+
      ' noduri · '+rendered.drawnEdges.toLocaleString('ro-RO')+' segmente din legături reale';
    }
    if(follow&&normalizedPhase(now)>=1&&pending.length)showNext();
    requestAnimationFrame(draw);return;
  }

  if(mode==='4d')drawTorusSectionGuide();
  const f=selectedTrace(),p=normalizedPhase(now),idx=phaseIndex(p);
  // The set of existing graph nodes is fetched separately from events. Only
  // persisted nodes are rendered. The ring itself contributes NO fake cells.
  const active=new Set(f?.active||[]),born=new Set(f?.growth?.born||[]);
  const amplitudes=new Map((f?.activations||[]).flatMap(l=>l.nodes||[]).map(n=>[n.id,n.amplitude]));
  const projections=new Map();const visible=new Set();
  for(const n of graph.nodes){
    if(mode==='4d'&&!visible4(n))continue;
    projections.set(n.id,projectNode(n));visible.add(n.id);
  }
  if(mode==='4d')$('sliceCount').textContent=`Secțiune 4D W=${sliceW.toFixed(2)} ±${sliceThickness.toFixed(2)} · ${visible.size} noduri reale din ${graph.total_nodes.toLocaleString('ro-RO')}`;
  // Render persistent links using topology returned by the learning engine.
  for(const e of graph.edges){
    const a=projections.get(e.from),b=projections.get(e.to);
    if(!a||!b){
      if(mode==='4d'){
        // An edge piercing the slice gets a dot, NOT a fabricated node.
        const intersection=sectionIntersects(nodeMap.get(e.from),nodeMap.get(e.to));
        if(intersection)circle(intersection,.85*dpr,'#4d547c',.36);
      }
      continue;
    }
    const isActive=active.has(e.from)&&active.has(e.to);
    const temporal=nodeMap.get(e.from)?.dimension===4||nodeMap.get(e.to)?.dimension===4;
    ctx.strokeStyle=isActive?'rgba(91,225,236,.64)':temporal?'rgba(180,151,255,.28)':'rgba(66,89,126,.23)';
    ctx.lineWidth=(isActive?1.8:temporal?1.15:.6)*dpr;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  // Sensory activity is real: a recorded active set, not a random blinking field.
  for(const n of graph.nodes){const screen=projections.get(n.id);if(!screen)continue;
    const on=active.has(n.id),a=amplitudes.get(n.id)||0;
    const r=(on?3.2+Math.min(5.5,a*18):1.5+Math.log1p(n.uses||0)*.38)*dpr;
    circle(screen,r,on?colors.activation:roleColor(n.role),on?1:.65);
    if(mode==='4d'&&n.dimension===4)ring(screen,r+3*dpr,colors.prediction,1.2,.86);
    if(born.has(n.id)&&idx===4)ring(screen,r+(4+4*Math.sin(p*Math.PI*5)**2)*dpr,colors.growth,2);
    if(selected===n.id)ring(screen,r+7*dpr,'#ffffff',2);
  }
  if(f){
    // MESSAGE PHASE: pulse order follows recorded message-round index. Timing
    // within an action is interpolation for human eyes, not measured latency.
    if(idx===1){
      const msgs=f.messages||[],rounds=Math.max(1,...msgs.map(x=>x.round||1));
      const local=(p-.18)/.38,sub=clamp(local*rounds,0,rounds-.00001);
      const activeRound=Math.floor(sub)+1,amount=sub-Math.floor(sub);
      for(const m of msgs){if((m.round||1)!==activeRound)continue;
        const a=projections.get(m.from),b=projections.get(m.to);
        if(!a||!b)continue;
        const strength=clamp(Number(m.strength)||0,0,2);
        circle({x:a.x+(b.x-a.x)*amount,y:a.y+(b.y-a.y)*amount},
          (1.6+Math.min(3.3,strength*2))*dpr,colors.activation,clamp(.4+strength*.4,.4,1));
      }
    }
    const action=projections.get(f.growth?.action_id),effect=projections.get(f.growth?.effect_id);
    if(idx===2&&action){ring(action,(8+(p-.56)*28)*dpr,colors.decision,2.6);circle(action,4*dpr,colors.decision)}
    if(idx===3){
      const err=clamp(Number(f.error)||0,0,1),q=clamp((p-.68)/.2,0,1);
      const anchor=effect||action;
      if(anchor){
        if(err>.03){ring(anchor,(8+45*q)*dpr,colors.error,2.5,(1-q)*(.3+err*.7));ring(anchor,(12+29*q)*dpr,colors.error,1.1,(1-q)*.6)}
        else ring(anchor,(8+25*q)*dpr,colors.confirmed,2,(1-q));
      }
    }
    if(idx===4){
      const strength=clamp((Number(f.update_norm)||0)*500,0,1);
      if(action)ring(action,(8+10*Math.sin(p*14)**2)*dpr,colors.learning,2,.3+strength*.65);
      // Only actually *new* edges get growth highlights.
      for(const e of (f.growth?.edges_born||[]).slice(0,70)){
        const a=projections.get(e.from),b=projections.get(e.to);if(!a||!b)continue;
        ctx.strokeStyle='rgba(243,152,94,.84)';ctx.lineWidth=1.9*dpr;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
    }
    if(follow && p>=1 && pending.length){showNext()}
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
function setPhaseText(){const f=selectedTrace();const idx=phaseIndex(normalizedPhase(performance.now()));
  $('eventPhase').textContent=f?`${phaseLabels[idx]} · acțiune #${f.event_seq} · ${f.domain}`:'Așteaptă evenimente reale';
}
setInterval(setPhaseText,110);
function highlightFrame(){const f=selectedTrace();if(!f)return;
  $('frameN').textContent=`${frame+1}/${traces.length}`;
  $('timeline').max=Math.max(0,traces.length-1);$('timeline').value=frame;
  $('world').textContent=`${f.domain} / #${f.seed} / step ${f.step}`;
  $('action').textContent=`${f.action} · P=${Number(f.prediction).toFixed(3)}`;
  $('actual').textContent=`${f.actual?.effect} · reward=${f.reward} · ${JSON.stringify(f.actual?.before)} → ${JSON.stringify(f.actual?.after)}`;
  $('mismatch').textContent=`${(100*Number(f.error||0)).toFixed(1)}% · target=${f.target}`;
  $('update').textContent=`||ΔW||=${f.update_norm} · ||∇||=${f.gradient_norm}`;
  $('growth').textContent=`+${(f.growth?.born||[]).length} noduri · ${f.growth?.node_count} în total · ${f.growth?.dimension||1}D · ${(f.growth?.edges_born||[]).length} conexiuni noi`;
  const ex=f.expansion;
  $('expansionInfo').textContent=ex ?
    `CANALE ÎNVĂȚATE: ${ex.extra_coordinates} · niveluri active: ${ex.active_levels}\n`+
    `Consistență scară MSE: ${ex.consistency_mse}\n`+
    `Eroare proprie prezisă: ${ex.self_predicted_error}\n`+
    `Zgomot local / corelat: ${ex.local_noise} / ${ex.shared_noise}\n`+
    `Memorie temporală observată: ${ex.temporal_memory_norm ?? 0}\n`+
    `Coordonate înregistrate pentru ${ex.nodes?.length||0} noduri reale` :
    'Nu există canale de expansiune în această înregistrare.';
  $('frameInfo').textContent=`Trace #${f.trace_id||f.event_seq} · ${f.world_hash?.slice(0,12)}… · ${f.device}`;
  const lens=f.perspective;
  if(lens?.features?.length){
    const different=lens.features.filter(v=>v.different).length;
    $('perspectiveLatest').textContent=
      'PERECHE INTERVENȚII (aceeași stare)\n'+lens.actual_action+' ↔ '+lens.alternative_action+
      '\n'+different+'/'+lens.features.length+' caracteristici au răspuns diferit.\n'+
      lens.features.slice(0,6).map(x=>x.channel+': '+x.observed+' / '+x.alternative+
        ' · control='+Math.round(x.controllability*100)+'% · '+x.classification).join('\n');
  }
  phaseStarted=performance.now();
  if(mode==='4d'&&followSlice){
    const current=fullGraph.byID.get(f.growth?.action_id)||nodeMap.get(f.growth?.action_id);
    if(current?.p4){
      const rp=PortalTorusView.rotate(current.p4,torusAngles.map((a,i)=>i===3?a+torusTheta:a));
      sliceW=clamp(rp[3],-2.7,2.7);$('sliceW').value=sliceW;$('sliceWValue').textContent=sliceW.toFixed(2);
    }
  }
}
function pushTrace(f){traces.push(f);if(traces.length>300){traces.shift();if(!follow&&frame>0)frame--}if(follow){frame=traces.length-1;highlightFrame()}}
function showNext(){if(!follow||!pending.length)return;
  const next=pending.shift();pushTrace(next);
  // New geometry is not invented; the next /api/graph fetch catches up.
}
function inspect(id){selected=id;const n=(mode==='3d'?nodeMap:fullGraph.byID).get(id)||nodeMap.get(id);
 if(!n){$('nodeInfo').textContent='Nodul nu este în secțiunea actuală.';return;}
 const rel=(mode==='3d'?graph.edges:fullGraph.edges).filter(e=>e.from===id||e.to===id);
 $('nodeInfo').textContent=`ID: ${n.id}\nLabel: ${n.label}\nRol: ${n.role}\nControlabilitate (intervenții pereche): ${n.controllability==null?'neestimată':(100*n.controllability).toFixed(1)+'%'} · încercări: ${n.trials||0}\nDimensiune structurală: ${n.dimension||1}D\nNăscut la eveniment: ${n.born_at||0}\nOrigine REALĂ: ${JSON.stringify(n.origin||{})}\nFolosiri: ${n.uses}\nDomenii: ${(n.domains||[]).join(', ')}\nPoziție afișare 3D: ${n.pos.join(', ')}\nPoziție TOROID 4D (x,y,z,w): ${(n.p4||[]).join(', ')}\nLegături vizibile: ${rel.length}\n${rel.slice(0,18).map(e=>`${e.from} → ${e.to} (${e.type}, count=${e.count})`).join('\n')}`;
}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,moved:false}});
canvas.addEventListener('pointermove',e=>{if(!drag)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;
 if(mode!=='3d'&&!e.shiftKey){
   torusAngles[0]+=dx*.0074;torusAngles[1]+=dy*.0074;
   torusAngles[2]+=(dx-dy)*.0020;torusAngles[3]+=(dx+dy)*.0014;
 }else{yaw+=dx*.006;pitch=clamp(pitch+dy*.006,-1.5,1.5)}
 drag.x=e.clientX;drag.y=e.clientY});
canvas.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;if(moved)return;
 const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*dpr,y=(e.clientY-r.top)*dpr;
 let best=null,dist=14*dpr;
 if(mode==='3d')for(const n of graph.nodes){const p=projectNode(n),d=Math.hypot(x-p.x,y-p.y);if(d<dist){dist=d;best=n.id}}
 else for(const [id,p] of torusProjections){const d=Math.hypot(x-p.x,y-p.y);if(d<dist){dist=d;best=id}}
 if(best!==null)inspect(best);
});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*Math.exp(-e.deltaY*.001),.3,4)},{passive:false});
$('center').onclick=()=>{
 yaw=mode==='3d'?.48:.12;pitch=mode==='3d'?-.22:-.08;zoom=mode==='3d'?1:1.08;
 torusAngles=[.08,-.18,.02,.08,-.10,.04];torusTheta=0;
 $('torusTheta').value=0;$('thetaValue').textContent='0.00';
};
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{mode=b.dataset.mode;for(const other of document.querySelectorAll('[data-mode]'))other.classList.toggle('active',other===b);
 $('sliceTools').hidden=mode==='3d';
 $('sliceW').disabled=mode!=='4d';$('sliceThickness').disabled=mode!=='4d';
 $('torusInfo').hidden=mode==='3d';
 yaw=mode==='3d'?.48:.12;pitch=mode==='3d'?-.22:-.08;zoom=mode==='3d'?1:1.08;
 $('axis').textContent=mode==='torus'?'TOROID 4D COMPLET · S¹ × B³':
   mode==='4d'?'SECȚIUNE SPAȚIALĂ W · REPLAY SEPARAT':'X · Y · Z';
 if(mode!=='3d')refreshWholeGraph();
};
$('sliceW').oninput=()=>{sliceW=+$('sliceW').value;followSlice=false;$('followSlice').checked=false;$('sliceWValue').textContent=sliceW.toFixed(2)};
$('sliceThickness').oninput=()=>{sliceThickness=+$('sliceThickness').value;$('thicknessValue').textContent=sliceThickness.toFixed(2)};
$('torusTheta').oninput=()=>{torusTheta=+$('torusTheta').value;$('thetaValue').textContent=torusTheta.toFixed(2)};
$('followSlice').onchange=()=>{followSlice=$('followSlice').checked};
$('autoRotate4').onchange=()=>{rotate4Automatically=$('autoRotate4').checked;lastRotateTime=performance.now()};
const torusPresets={
 ring:{angles:[.08,-.18,.02,.08,-.10,.04],yaw:.12,pitch:-.08},
 flower:{angles:[.95,-.72,.18,.34,-.05,.20],yaw:.24,pitch:-.18},
 sphere:{angles:[1.12,.88,-.40,.30,.26,-.12],yaw:.34,pitch:-.10}
};
for(const button of document.querySelectorAll('[data-preset4]'))button.onclick=()=>{
 const v=torusPresets[button.dataset.preset4];torusAngles=v.angles.slice();yaw=v.yaw;pitch=v.pitch;
 for(const other of document.querySelectorAll('[data-preset4]'))other.classList.toggle('active',other===button);
};
$('batch').oninput=()=>{$('batchValue').textContent=$('batch').value};
$('timeline').oninput=()=>{follow=false;frame=+$('timeline').value;highlightFrame();$('play').textContent='▶'};
$('prev').onclick=()=>{follow=false;frame=Math.max(0,frame-1);highlightFrame();$('play').textContent='▶'};
$('next').onclick=()=>{follow=false;frame=Math.min(traces.length-1,frame+1);highlightFrame();$('play').textContent='▶'};
$('play').onclick=()=>{follow=!follow;$('play').textContent=follow?'❚❚':'▶';if(follow){
 if(pending.length>24){skipped+=pending.length-24;pending.splice(0,pending.length-24);$('skipped').textContent=skipped.toLocaleString('ro-RO')}
 if(pending.length)showNext();else if(traces.length){frame=traces.length-1;highlightFrame()}
 }};
document.onkeydown=e=>{if(e.code==='Space'&&e.target.tagName!=='INPUT'&&e.target.tagName!=='TEXTAREA'){e.preventDefault();$('play').click()}};
async function post(url,obj={}){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
async function act(cb){try{const out=await cb();lastError='';return out}catch(e){lastError=e.message;$('statusline').textContent='EROARE: '+lastError;return null}}
$('start').onclick=()=>act(()=>post('/api/start',{domains:[...document.querySelectorAll('.domain:checked')].map(x=>x.value),batch_size:+$('batch').value,autosave_every:+$('autosave').value,epsilon:+$('epsilon').value,capture:$('capture').checked,
 perspective_expansion:$('expansionEnabled').checked ? {
   max_levels:+$('expansionLevels').value,
   local_noise:+$('expansionLocalNoise').value,
   shared_noise:+$('expansionSharedNoise').value} : undefined}));
$('stop').onclick=()=>act(()=>post('/api/stop'));
$('save').onclick=()=>act(()=>post('/api/save'));
$('evaluate').onclick=()=>act(async()=>{const x=await post('/api/evaluate',{domains:[...document.querySelectorAll('.domain:checked')].map(x=>x.value),count:24});$('evaluation').textContent=JSON.stringify(x,null,2)});
$('loadCorpus').onclick=()=>act(async()=>{$('corpusState').textContent='Se verifică fișierul…';const x=await post('/api/corpus',{path:$('corpus').value});$('corpusState').textContent=`Import ${x.state} · 0% · ${x.source||''}`});
const dialog=$('resetDialog');
$('reset').onclick=()=>{if(lastStatus?.state==='running'||lastStatus?.state==='stopping')return; $('resetPhrase').value='';$('confirmReset').disabled=true;dialog.showModal()};
$('cancelReset').onclick=()=>dialog.close();
$('resetPhrase').oninput=()=>{$('confirmReset').disabled=$('resetPhrase').value!=='RESET TOT'};
$('confirmReset').onclick=()=>act(async()=>{
 $('confirmReset').disabled=true;
 await post('/api/reset',{confirm:$('resetPhrase').value});dialog.close();
 graph={nodes:[],edges:[],total_nodes:0,total_edges:0};nodeMap.clear();clearWholeGraph();
 traces=[];pending=[];since=0;frame=-1;skipped=0;follow=true;selected=null;
 loadedCorpusDigest=null;lastError='';$('corpusState').textContent='Textul cere un corpus real.';
 $('timeline').value=0;$('timeline').max=0;$('frameN').textContent='0/0';$('frameInfo').textContent='Fără evenimente de antrenare';
 $('skipped').textContent='0';$('nodeInfo').textContent='Alege un nod din graf.';
 document.querySelector('.domain[value="text"]').checked=false;
 $('evaluation').textContent='Niciun test efectuat după RESET TOT.';
 $('expansionEnabled').checked=false;delete $('expansionEnabled').dataset.restored;
 for(const id of ['expansionEnabled','expansionLevels','expansionLocalNoise','expansionSharedNoise'])$(id).disabled=false;
 $('expansionInfo').textContent='Modul dezactivat. Motorul original rămâne neschimbat.';
 $('perspectiveStats').textContent='0 intervenții pereche · 0 caracteristici';
 $('perspectiveLatest').textContent='Niciun experiment de controlabilitate înregistrat.';
 $('statusline').textContent='RESET COMPLET · Greutăți noi · Graf nou · Replay gol · Corpusul-sursă neatins.';
 await Promise.all([refreshStatus(),refreshGraph(),refreshTraces()]);
});
async function refreshStatus(){if(statusBusy)return;statusBusy=true;try{
 const r=await fetch('/api/status');if(!r.ok)throw Error('Status '+r.status);
 const s=await r.json();lastStatus=s;
 const exp=s.perspective_expansion||{};
 if(exp.max_levels && !$('expansionEnabled').dataset.restored){
   $('expansionEnabled').checked=true;
   $('expansionEnabled').dataset.restored='yes';
   $('expansionLevels').value=exp.max_levels;
   $('expansionLocalNoise').value=exp.local_noise;
   $('expansionSharedNoise').value=exp.shared_noise;
   for(const id of ['expansionEnabled','expansionLevels','expansionLocalNoise','expansionSharedNoise'])$(id).disabled=true;
 }
 $('unique').textContent=Number(s.unique_worlds_verified_sqlite).toLocaleString('ro-RO');
 $('episodes').textContent=Number(s.episodes).toLocaleString('ro-RO');
 $('steps').textContent=Number(s.steps).toLocaleString('ro-RO');
 $('nodes').textContent=`${s.graph.nodes.toLocaleString('ro-RO')} / ${s.graph.edges.toLocaleString('ro-RO')}`;
 $('error').textContent=Number(s.prediction_error).toFixed(4);
 $('loss').textContent=Number(s.loss).toFixed(4);
 const lens=s.perspective||{};
 $('perspectiveStats').textContent=`${Number(lens.probes||0).toLocaleString('ro-RO')} intervenții pereche · ${Number(lens.channels_observed||0)} caracteristici urmărite · `+
   `${Number(lens.counts?.['action-sensitive']||0)} sensibile la acțiune · ${Number(lens.counts?.['action-invariant']||0)} invariante`;
 if(lens.channels?.length && !$('perspectiveLatest').textContent.startsWith('PERECHE')){
   $('perspectiveLatest').textContent=lens.channels.slice(0,8).map(x=>
      `${x.channel}: ${Math.round(x.controllability*100)}% (${x.trials} probe) · ${x.classification}`).join('\n');
 }
 $('device').textContent='DEVICE: '+s.device.toUpperCase();$('runState').textContent=s.state.toUpperCase();
 $('dataStatus').textContent=s.saved_at?'SAVED '+new Date(s.saved_at*1000).toLocaleTimeString('ro-RO'):'NOT YET SAVED';
 const ci=s.corpus_ingest||{state:'idle',progress:0};
 if(ci.state==='reading'||ci.state==='queued')$('corpusState').textContent=`IMPORTĂ ${Math.round((ci.progress||0)*100)}% · ${Number(ci.rows_read||0).toLocaleString('ro-RO')} rânduri · ${(Number(ci.bytes_written||0)/1048576).toFixed(1)} MiB · ${(ci.columns_selected||[]).join(', ')||'detectare schemă'}`;
 else if(ci.state==='error')$('corpusState').textContent='EROARE CORPUS: '+(ci.error||'necunoscută');
 else if(ci.state==='ready'){
  $('corpusState').textContent=`ÎNCĂRCAT · ${(Number(ci.bytes||0)/1048576).toFixed(1)} MiB · ${Number(ci.rows_with_text||0).toLocaleString('ro-RO')} rânduri · ${(ci.columns_selected||[]).join(', ')||ci.source_format||''}`;
  if(ci.sha256&&ci.sha256!==loadedCorpusDigest){loadedCorpusDigest=ci.sha256;document.querySelector('.domain[value="text"]').checked=true}
 }
 const isBusy=s.state==='running'||s.state==='stopping';
 $('start').disabled=isBusy||ci.state==='queued'||ci.state==='reading';
 $('stop').disabled=s.state!=='running';$('save').disabled=isBusy;
 $('reset').disabled=isBusy||ci.state==='queued'||ci.state==='reading';
 $('loadCorpus').disabled=isBusy||ci.state==='queued'||ci.state==='reading';
 $('evaluate').disabled=isBusy||ci.state==='reading';
 $('statusline').textContent=lastError?'EROARE: '+lastError:`${s.state} · ${s.config.batch_size} lumi / lot · ${s.graph.nodes} noduri existente · ${s.graph.edges} legături existente · 1D:${s.graph.dimension_counts?.['1']||0} 2D:${s.graph.dimension_counts?.['2']||0} 3D:${s.graph.dimension_counts?.['3']||0} 4D:${s.graph.dimension_counts?.['4']||0}${s.error?' · SERVER ERROR: '+s.error:''} · Graf redat din jurnal real`;
 $('domainStats').innerHTML=Object.entries(s.domains||{}).map(([k,v])=>`<div>${k}: ${v.episodes} exerciții · ${(100*v.success_rate).toFixed(1)}% succes</div>`).join('');
 }catch(e){$('statusline').textContent='Conexiune status întreruptă: '+e.message}finally{statusBusy=false}}
async function refreshGraph(){if(graphBusy)return;graphBusy=true;try{
 const focus=selectedTrace();const ids=(focus?.active||[]).concat(focus?.growth?.born||[]).slice(0,40).join(',');
 const url='/api/graph?limit=750'+(ids?'&focus='+encodeURIComponent(ids):'');
 const r=await fetch(url);if(!r.ok)throw Error('Graph '+r.status);
 const data=await r.json();graph=data;nodeMap=new Map(data.nodes.map(n=>[n.id,n]));
 if(wholeNodeOffset>data.total_nodes||wholeEdgeOffset>data.total_edges)clearWholeGraph();
 rebuildWholeGraph();graphFetched=Date.now();
 }catch(e){$('statusline').textContent='Vizualizarea grafului: '+e.message}finally{graphBusy=false}}
async function refreshWholeGraph(){
 if(wholeGraphBusy)return;wholeGraphBusy=true;
 try{
   // Global pagination retrieves the ENTIRE persisted topology, never a sample.
   // Bounded work per iteration keeps training and the legacy 3D panel responsive.
   for(let i=0;i<(mode==='3d'?1:16);i++){
     const url='/api/graph/all?node_offset='+wholeNodeOffset+'&node_limit=1200'+
       '&edge_offset='+wholeEdgeOffset+'&edge_limit=3500';
     const res=await fetch(url);
     if(!res.ok)throw Error('Full graph API '+res.status);
     const page=await res.json();
     if(page.schema!=='portal.graph.all.v1')throw Error('Full graph response schema mismatch');
     if(page.total_nodes<wholeNodeOffset||page.total_edges<wholeEdgeOffset){clearWholeGraph();continue}
     for(const n of page.nodes)allNodes.set(n.id,n);
     for(const e of page.edges)allEdges.set(edgeKey(e),e);
     wholeNodeOffset=page.next_node_offset;wholeEdgeOffset=page.next_edge_offset;
     wholeNodeTotal=page.total_nodes;wholeEdgeTotal=page.total_edges;
     if(page.complete)break;
   }
   rebuildWholeGraph();
 }catch(e){$('statusline').textContent='Citire toroid complet: '+e.message}
 finally{wholeGraphBusy=false}
}
async function refreshTraces(){if(traceBusy)return;traceBusy=true;try{
 const r=await fetch('/api/traces?after='+since+'&limit=48');if(!r.ok)throw Error('Traces '+r.status);
 const data=await r.json();
 if(data.skipped){skipped+=data.skipped;$('skipped').textContent=skipped.toLocaleString('ro-RO')}
 since=data.next_cursor;
 for(const f of (data.frames||[]))pending.push(f);
 if(pending.length>90){skipped+=pending.length-90;pending.splice(0,pending.length-90);$('skipped').textContent=skipped.toLocaleString('ro-RO')}
 if(follow && frame===-1 && pending.length)showNext();
 }catch(e){$('statusline').textContent='Jurnal evenimente: '+e.message}finally{traceBusy=false}}
refreshStatus();refreshGraph();refreshTraces();refreshWholeGraph();
setInterval(refreshStatus,900);
setInterval(refreshTraces,350);
setInterval(refreshGraph,1550);
setInterval(refreshWholeGraph,1800);
