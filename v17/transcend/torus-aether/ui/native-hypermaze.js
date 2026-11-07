// MagicPerspective ORIGINAL V17 native text-hypermaze observatory.
// This UI makes zero decisions about learning. Every node, edge, potential,
// 5D phase, pre-action predicted path and executed step comes from the
// REAL original Brain through /graphs and /native-hypermaze.
// No sample arrays, preset answers, fabricated percentages or auto-generated
// fake paths. The original V17 and magic.html UIs are NOT changed.
"use strict";
const $=id=>document.getElementById(id);
const nfmt=x=>typeof x==="number"&&Number.isFinite(x)?
 Intl.NumberFormat("ro-RO",{maximumFractionDigits:2}).format(x):"—";
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const colors={gold:"#f0c87a",cyan:"#66cce7",mint:"#67deab",
 rose:"#f0809a",gray:"#8299b0"};
const state={worker:0,summary:null,plan:null,topology:null,
  frame:0,playing:false,lastTick:0,rotation:0,offsetX:0,offsetY:0,
  zoom:1,drag:null,busy:false,idToPoint:[],idByText:new Map(),
  dataVersion:0,drawnVersion:-1};
function say(message,isError=false){
 const element=$("status");
 element.textContent=message;
 element.className=isError?"failure":"muted";
}
function setNum(id,n){$(id).textContent=nfmt(n);}
async function getJson(path,opts={}){
 const r=await fetch(path,{cache:"no-store",...opts});
 if(!r.ok)throw Error("HTTP "+r.status+" "+path.slice(0,50));
 const data=await r.json();
 if(data.error)throw Error(data.error);
 return data;
}
async function poll(){
 try{
  const data=await getJson("/graphs");
  const list=data.graphs||[];
  const picker=$("worker");
  const selected=String(state.worker);
  const opts=list.map(s=>String(s.w)+":"+s.arm+":"+s.status).join("|");
  if(picker.dataset.last!==opts){
   picker.replaceChildren();
   for(const s of list){
    const x=document.createElement("option");
    x.value=String(s.w);
    x.textContent="#"+s.w+" · "+s.arm+" · "+s.status;
    picker.appendChild(x);
   }
   picker.dataset.last=opts;
  }
  if(list.length&&!list.some(s=>s.w===state.worker))state.worker=list[0].w;
  if(list.length)picker.value=String(state.worker);
  const item=list.find(s=>s.w===state.worker);
  state.summary=item||null;
  const native=item?.nativeHypermaze||null;
  $("connected").textContent=item?"V17 online":"—";
  $("worldStatus").textContent=!item?"Niciun worker activ":
    native?"Original Brain: "+item.status:
      "Motorul native hypermaze nu este activat";
  setNum("observed",native?.actualCorpusRows??null);
  document.documentElement.dataset.nativeConnected=String(!!native);
  document.documentElement.dataset.nativeObservedRows=String(native?.actualCorpusRows??0);
  if(item?.error)$("worldStatus").textContent="EROARE: "+item.error;
  // The standalone corpus worker runs ONLY the previously tested original
  // text hypermaze. All numbers are taken from the real source-offset and
  // same original Brain, never a fabricated separate GPU trainer.
  try{
   const api=await getJson("/api/status");
   const m=api.status;
   if(m){
    const format=v=>Number.isFinite(v)?
     Intl.NumberFormat("ro-RO",{maximumFractionDigits:2}).format(v):"—";
    $("realPhase").textContent=m.phase+" · "+
     (m.checkpointWritten?"checkpoint salvat":"nesalvat încă");
    $("realPercent").textContent=m.percent.toFixed(2)+"%";
    $("realBar").style.width=Math.min(100,Math.max(0,m.percent))+"%";
    $("realMBs").textContent=format(m.textMBPerSecond);
    $("realEPS").textContent=format(m.exercisesPerSecond);
    $("realRows").textContent=format(m.trainedRows);
    $("realOps").textContent=format(m.learnedOperators);
    $("realHeldout").textContent=m.probeEligible?
     (100*m.probeCorrect/m.probeEligible).toFixed(2)+"%":"—";
    $("realDetails").textContent=
     format(m.bytesRead)+" / "+format(m.totalBytes)+" octeți JSONL · "+
     format(m.observedTokens)+" tokeni text observați · "+
     format(m.actualObservedWindows)+" ferestre antrenate · "+
     format(m.heldoutRows)+" rânduri rezervate · "+
     format(m.learnedGeometry5DAxes)+" axe 5D · "+
     format(m.endogenousNoiseDecisions)+" decizii NoiseAgency · "+
     format(m.oldStatesEvicted)+" stări scoase din memoria activă · "+
     format(m.operatorsDropped)+" operatori neacceptați din cauza limitei";
    document.documentElement.dataset.realCorpusPercent=m.percent.toFixed(2);
    document.documentElement.dataset.realCorpusRows=String(m.trainedRows);
    document.documentElement.dataset.realCorpusNative="true";
    if(api.error)$("realPhase").textContent="EROARE: "+api.error;
   }else{
    $("realPhase").textContent=api.error||"Brain inițializează datele reale";
   }
  }catch{
   $("realPhase").textContent="Mod de cercetare: fără server separat de corpus";
  }
 }catch(error){
  $("connected").textContent="Offline";
  $("worldStatus").textContent="Conexiunea V17 nu este disponibilă";
  document.documentElement.dataset.nativeConnected="false";
  $("status").textContent=error.message;
 }
}
for(const [id,defaultAxis] of [["axisX",0],["axisY",1],["axisZ",2]]){
 for(let d=0;d<5;d++){
  const x=document.createElement("option");
  x.value=String(d);x.textContent="axa "+(d+1);$(id).appendChild(x);
 }
 $(id).value=String(defaultAxis);
 $(id).addEventListener("change",()=>{state.dataVersion++;draw();});
}
$("zoom").addEventListener("input",e=>{
 state.zoom=+e.target.value;
 state.dataVersion++;draw();
});
$("worker").addEventListener("change",e=>{
 state.worker=Number(e.target.value);
 state.plan=null;state.topology=null;state.frame=0;
 clearCanvas();poll();
});
for(const action of ["start","pause","save"]){
 $(action).addEventListener("click",async()=>{
  try{
   await getJson("/control?do="+action+"&w="+state.worker,
    {method:"POST"});
   say("Comanda "+action+" a fost transmisă workerului original V17.");
   await poll();
  }catch(e){say(e.message,true);}
 });
}
$("plan").addEventListener("click",async()=>{
 if(state.busy)return;
 const start=$("source").value.trim();
 const required=$("required").value.split(",").map(x=>x.trim()).filter(Boolean);
 if(!start||!required.length){
  say("Introdu un text observat și tokenii obiectivului. Nu introduce răspunsul de referință.",true);
  return;
 }
 if(start.length>4000||required.length>16){
  say("Textul trebuie să aibă cel mult 4.000 caractere, iar obiectivul maximum 16 tokeni.",true);
  return;
 }
 state.busy=true;$("plan").disabled=true;
 say("Solicit traseul original Discoverer.shapeGraph de la Brain. Referința nu este transmisă.");
 try{
  const q=new URLSearchParams({w:String(state.worker),start,
   required:required.join(","),execute:"1",topology:"1"});
  const result=await getJson("/native-hypermaze?"+q.toString(),
   {method:"POST"});
  if(!result.plannedBeforeFirstAction||result.referenceAnswerProvided!==false)
   throw Error("Sursa nu a confirmat planificarea înainte de acțiune, fără răspuns de referință");
  state.plan=result;
  state.topology=result.topology||null;
  state.frame=0;state.playing=!!result.body?.frames?.length;
  state.lastTick=performance.now();
  state.dataVersion++;
  const topology=state.topology;
  state.idByText=new Map(topology?.nodes?.map(x=>[x.text,x.id])||[]);
  setNum("nodes",topology?.nodes?.length??null);
  setNum("edges",topology?.edges?.length??null);
  setNum("steps",result.actions?.length??null);
  $("goal").textContent=result.found?"Găsit":"Negăsit";
  document.documentElement.dataset.nativeNodeCount=String(topology?.nodes?.length??0);
  document.documentElement.dataset.nativeBeforeAction=String(result.plannedBeforeFirstAction);
  $("truth").textContent="Fără referință ascunsă · semantică externă: NEDOVEDITĂ";
  $("replans").textContent="Replanificări: "+nfmt(result.body?.replans??null);
  const frames=result.body?.frames||[];
  $("frame").max=String(Math.max(0,frames.length-1));
  $("frame").value="0";
  $("play").textContent=state.playing?"Ⅱ Oprește animația":"▶ Redă animația";
  $("predicted").textContent="PREDICȚIA INITIALĂ ÎNAINTE DE ACȚIUNE\n"+
    (result.initialShape||[]).map((v,i)=>i+" → "+v).join("\n\n")+
    "\n\nMecanism: "+result.kind+
    "\nRăspuns de referință disponibil: NU"+
    "\nValidare semantică externă: NU"+
    "\nȚinta: "+JSON.stringify(result.required)+
    "\nGeometrie folosită la scorare: "+String(result.geometricPreferenceUsed);
  refreshFrame();
  draw();
  say(result.found?
    "Traseul nativ a fost construit din observații reale. Evaluarea semantică externă rămâne nedovedită.":
    "Niciun traseu spre obiectiv nu a fost descoperit în graful actual.");
 }catch(e){
  say(e.message,true);
 }finally{state.busy=false;$("plan").disabled=false;}
});
$("frame").addEventListener("input",e=>{
 state.frame=Number(e.target.value);state.playing=false;
 $("play").textContent="▶ Redă animația";refreshFrame();draw();
});
$("play").addEventListener("click",()=>{
 if(!state.plan?.body?.frames?.length)return;
 state.playing=!state.playing;
 $("play").textContent=state.playing?"Ⅱ Oprește animația":"▶ Redă animația";
 state.lastTick=performance.now();
});
function refreshFrame(){
 const frames=state.plan?.body?.frames||[];
 const current=frames[clamp(state.frame,0,Math.max(0,frames.length-1))]||null;
 $("stepLabel").textContent=state.frame+" / "+Math.max(0,frames.length-1);
 $("frame").value=String(state.frame);
 if(!current){
  $("actual").textContent=state.plan?
   "Nu există execuție deoarece traseul nu a fost găsit.":"Aștept execuția reală.";
  return;
 }
 $("actual").textContent="CADRU: "+state.frame+
  "\nETAPĂ: "+String(current.stage)+
  "\nSTARE ACTUALĂ:\n"+String(current.actual??current.state??"")+
  "\n\nACȚIUNE:\n"+JSON.stringify(current.action??null,null,2)+
  "\n\nURMĂTORUL STADIU PREZIS:\n"+String(current.expected??current.globalShape?.[1]??"")+
  "\n\nACORD CU PLANUL:\n"+String(current.matchedInitialPlan??"înainte de prima acțiune")+
  "\n\nNOISE ORIGINAL:\n"+JSON.stringify(current.noise??null,null,2)+
  "\n\nȚINTĂ INTERNĂ ATINSĂ:\n"+String(current.goalReached??false)+
  "\n\nEFECTUL ESTE MODEL INTERN, NU UN EVALUATOR SEMANTIC EXTERN.";
}
function clearCanvas(){
 const canvas=$("world"),ctx=canvas.getContext("2d");
 ctx.clearRect(0,0,canvas.width,canvas.height);
 setNum("nodes",null);setNum("edges",null);setNum("steps",null);
 $("goal").textContent="—";
 $("viewInfo").textContent="Aștept topologia efectiv calculată.";
}
function screen(node,index,total,w,h){
 const d=node.depth||0;
 const v=node.position5D;
 if(Array.isArray(v)&&v.length>=5&&v.every(Number.isFinite)){
  const ax=+($("axisX").value||0),ay=+($("axisY").value||1),az=+($("axisZ").value||2);
  const A=2*Math.PI*v[ax],B=2*Math.PI*v[ay],C=2*Math.PI*v[az];
  const px=Math.cos(A)+.35*Math.sin(C);
  const py=Math.sin(B)+.32*Math.cos(C);
  const z=.35*Math.cos(B)+.27*Math.sin(A);
  const r=state.rotation;
  const rx=px*Math.cos(r)-z*Math.sin(r);
  const rz=px*Math.sin(r)+z*Math.cos(r);
  const scale=Math.min(w/4,h/3.6)*state.zoom*(1+.13*rz);
  return {x:w/2+rx*scale+state.offsetX,
    y:h/2+py*scale+state.offsetY,learned:true};
 }
 // Explicit non-geometric fallback: graph-depth and state index are
 // TRUE search-derived facts; these positions are only a 2D layout.
 const local=index%Math.max(1,Math.ceil(total/7));
 const col=Math.max(1,Math.ceil(total/7));
 return {x:30+clamp(d/6,0,1)*(w-60)+state.offsetX,
   y:20+((local+.5)/col)*(h-40)+state.offsetY,learned:false};
}
function draw(){
 const canvas=$("world"),ctx=canvas.getContext("2d");
 const rect=canvas.getBoundingClientRect();
 const dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(200,rect.width),h=Math.max(200,rect.height);
 if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){
  canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);
 }
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,w,h);
 const topology=state.topology;
 if(!topology?.nodes?.length){
  ctx.font="19px Georgia";ctx.fillStyle=colors.gold;
  ctx.textAlign="center";ctx.fillText("Niciun nod inventat",w/2,h/2-6);
  ctx.fillStyle=colors.gray;ctx.font="12px Segoe UI";
  ctx.fillText("Aștept topologia produsă de originalul Brain",w/2,h/2+22);
  ctx.textAlign="left";return;
 }
 const nodes=topology.nodes;
 const points=nodes.map((n,i)=>screen(n,i,nodes.length,w,h));
 let genuine=0;for(const p of points)if(p.learned)genuine++;
 $("viewInfo").textContent=nodes.length+" stări reale · "+
  topology.edges.length+" muchii · "+genuine+" poziții 5D învățate/inferate · "+
  (nodes.length-genuine)+" poziții 2D derivate topologic · rotiți cu mouse-ul";
 ctx.lineWidth=.65;
 ctx.strokeStyle="rgba(75,122,153,.13)";
 ctx.beginPath();
 for(const e of topology.edges){
  const a=points[e.from],b=points[e.to];
  if(!a||!b)continue;
  ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
 }
 ctx.stroke();
 for(const n of nodes){
  const p=points[n.id];if(!p)continue;
  const potential=Number.isFinite(n.potential)?n.potential:0;
  ctx.fillStyle=n.goal?colors.mint:n.kind===1?colors.rose:
    p.learned?"rgba(111,178,210,"+(0.27+clamp(potential,0,1)*.6)+")":"#61798e";
  ctx.beginPath();ctx.arc(p.x,p.y,n.goal?3:potential>.5?2.4:1.45,0,2*Math.PI);ctx.fill();
 }
 const initial=topology.initialShapeIds||[];
 ctx.strokeStyle=colors.gold;ctx.lineWidth=3;ctx.beginPath();
 initial.forEach((id,i)=>{const p=points[id];if(!p)return;
  if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});
 ctx.stroke();
 for(const id of initial){const p=points[id];if(!p)continue;
  ctx.fillStyle=colors.gold;ctx.beginPath();ctx.arc(p.x,p.y,3.3,0,Math.PI*2);ctx.fill();}
 const frames=state.plan?.body?.frames||[];
 const actual=[topology.sourceId];
 for(let j=1;j<=state.frame&&j<frames.length;j++){
  const id=state.idByText.get(frames[j].actual);
  if(id!==undefined)actual.push(id);
 }
 ctx.lineWidth=3.4;ctx.strokeStyle=colors.cyan;ctx.beginPath();
 actual.forEach((id,i)=>{const p=points[id];if(!p)return;
  if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.stroke();
 const focus=actual.at(-1)??topology.sourceId;
 for(const id of new Set([topology.sourceId,focus,...nodes.filter(n=>n.goal).slice(0,8).map(n=>n.id)])){
  const n=nodes[id],p=points[id];if(!p||!n)continue;
  const c=id===focus?colors.cyan:n.goal?colors.mint:colors.gold;
  ctx.fillStyle=c;ctx.beginPath();ctx.arc(p.x,p.y,6,0,2*Math.PI);ctx.fill();
  const label=(id===topology.sourceId?"START":n.goal?"ȚINTĂ":"CORP")+
   " · "+n.text.slice(0,44);
  ctx.font="11px Segoe UI";ctx.fillStyle="#e3f4fd";
  ctx.fillText(label,clamp(p.x+9,8,w-170),clamp(p.y-9,12,h-12),170);
 }
}
const canvas=$("world");
canvas.addEventListener("pointerdown",e=>{
 state.drag={x:e.clientX,y:e.clientY,rotation:state.rotation,
  ox:state.offsetX,oy:state.offsetY,move:e.shiftKey};
 canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove",e=>{
 if(!state.drag)return;
 const dx=e.clientX-state.drag.x,dy=e.clientY-state.drag.y;
 if(state.drag.move){state.offsetX=state.drag.ox+dx;state.offsetY=state.drag.oy+dy;}
 else{state.rotation=state.drag.rotation+dx*.008;state.offsetY=state.drag.oy+dy*.55;}
 draw();
});
for(const event of ["pointerup","pointercancel"])canvas.addEventListener(event,()=>{state.drag=null;});
canvas.addEventListener("wheel",e=>{
 e.preventDefault();
 state.zoom=clamp(state.zoom*(e.deltaY>0?.89:1.12),.4,2.8);
 $("zoom").value=String(state.zoom);draw();
},{passive:false});
function animation(timestamp){
 if(state.playing&&state.plan?.body?.frames?.length){
  if(timestamp-state.lastTick>510){
   const max=state.plan.body.frames.length-1;
   if(state.frame>=max)state.playing=false;
   else{state.frame++;refreshFrame();draw();}
   state.lastTick=timestamp;
   $("play").textContent=state.playing?"Ⅱ Oprește animația":"▶ Redă animația";
  }
 }
 requestAnimationFrame(animation);
}
poll();setInterval(poll,1500);requestAnimationFrame(animation);
draw();
// Deep link is NOT a demo or fabricated answer. Only an explicitly
// user-supplied observed start + goal tokens + plan=1 triggers the SAME
// real worker POST route; no hidden reference answer is included.
const deep=new URLSearchParams(location.search);
if(deep.get("plan")==="1"&&deep.has("source")&&deep.has("required")){
 $("source").value=deep.get("source");
 $("required").value=deep.get("required");
 setTimeout(()=>$("plan").click(),300);
}
