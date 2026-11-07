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
  dataVersion:0,drawnVersion:-1,atlas:null,planId:null,
  operatorOffset:0,historyCursor:0,operators:[],history:[],audit:null};
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
 state.atlas=null;state.planId=null;state.audit=null;
 state.operatorOffset=0;state.historyCursor=0;state.operators=[];state.history=[];
 $("atlasAudit").disabled=true;renderAtlas();
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
   required:required.join(","),execute:"1",topology:"1",atlas:"1",maxPaths:"256",
   maxStates:$("atlasMaxStates").value,maxDepth:$("atlasMaxDepth").value});
  const result=await getJson("/native-hypermaze?"+q.toString(),
   {method:"POST"});
  if(!result.plannedBeforeFirstAction||result.referenceAnswerProvided!==false)
   throw Error("Sursa nu a confirmat planificarea înainte de acțiune, fără răspuns de referință");
  if(result.atlas?.schema!=="v17-native-observed-path-atlas-v1")
   throw Error("Original Brain did not return a real learned-path atlas");
  state.plan=result;
  state.topology=result.topology||null;
  state.atlas=result.atlas;state.planId=result.planId;state.audit=null;
  $("atlasAudit").disabled=!state.planId;renderAtlas();
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
function renderAtlas(){
 const a=state.atlas;
 setNum("atlasRoutes",a?.paths?.length??null);
 setNum("atlasDeadEnds",a?.deadEnds?.length??null);
 setNum("atlasFamilies",a?.topology?.knownOperatorFamilies??null);
 setNum("atlasFrontiers",a?.topology?.frontierCount??null);
 $("atlasTruncated").textContent=!a?"—":a.enumeration?.truncated?"DA":"NU";
 setNum("atlasWrong",state.audit?.charAudit?.incorrectCharacters?.length??null);
 $("atlasSource").textContent=!a?"Aștept atlasul original":
  "Limbajul complet: NU · "+(a.topology?.closedUnderLearnedOperators?
   "închiderea grafului actual este verificată":"mai există frontiere")+
   " · "+(a.enumeration?.truncated?"enumerarea este limitată":"trasee simple finite enumerate");
 if(!a){
  $("atlasPaths").textContent="Aștept graful învățat, nu un demo.";
  $("atlasMisses").textContent="Aștept o predicție înghețată.";
  return;
 }
 $("atlasPaths").textContent=
  "SURSĂ: "+a.topology.source+
  "\nTrasee enumerate: "+a.enumeration.pathCount+
  "\nA parcurs TOATE căile posibile din limbaj? NU"+
  "\nTrunchiat: "+a.enumeration.truncated+
  "\nCauza: "+(a.enumeration.enumerationTruncationReason||
    a.enumeration.graphTruncationReasons.join(",")||"niciuna")+
  "\n\n"+a.paths.map((p,i)=>"#"+(i+1)+" "+p.id+
   (p.isInitialShape?" ★ FORMA INIȚIALĂ":"")+
   " · "+p.length+" acțiuni\n"+
   p.actions.map(x=>"   "+(x.fromToken??"∅")+" → "+(x.toToken??"∅")+
    " ["+x.kind+"] · suport "+x.observedSupport+
    " · dovada "+JSON.stringify(x.sourceEvidence)).join("\n")+
   "\n   Stări: "+p.states.join(" ⟶ ")).join("\n\n");
 $("atlasMisses").textContent=
  "MOTIVUL EȘECULUI: "+(a.failureReason||"niciunul")+
  "\nFrontiere: "+a.topology.frontierCount+
  "\nBucle: "+a.topology.cyclesDetected+
  "\nFundături: "+a.deadEnds.length+
  "\n\n"+a.deadEnds.map((d,i)=>"#"+(i+1)+" "+d.reason+
   "\n   stare: "+d.text+"\n   operatori: "+d.via.join(" → ")).join("\n\n")+
  "\n\nTRANSFORMĂRI ÎNVĂȚATE, NEFOLOSITE ÎN TRASĂ:\n"+
  a.missedTransformations.map(o=>o.kind+" "+(o.fromToken??"∅")+"→"+
   (o.toToken??"∅")+" · "+o.sourceObservations+" dovezi"+
   " · "+JSON.stringify(o.examples[0]||null)).join("\n");
 document.documentElement.dataset.nativeAtlasPaths=String(a.paths.length);
 document.documentElement.dataset.nativeAtlasFrontiers=String(a.topology.frontierCount);
}
$("atlasLoadOperators").addEventListener("click",async()=>{
 const button=$("atlasLoadOperators");button.disabled=true;
 try{
  const q=new URLSearchParams({w:String(state.worker),
   offset:String(state.operatorOffset),limit:"100"});
  const data=await getJson("/native-hypermaze-operators?"+q);
  if(!Array.isArray(data.operators))throw Error("Catalogue unavailable");
  state.operators.push(...data.operators);state.operatorOffset=data.nextOffset;
  $("atlasOperatorsProgress").textContent=state.operatorOffset+" / "+data.total+
   " · respinse: "+data.rejectedLongObservations+
   " · limite de operatori: "+data.droppedOperatorFamilies;
  $("atlasOperators").textContent=state.operators.map((o,i)=>
   "#"+(i+1)+" ["+o.kind+"] "+(o.from??"∅")+" → "+(o.to??"∅")+
   "\n  ancore: "+(o.left??"^")+" / "+(o.right??"$")+
   " · observat "+o.sourceObservations+" ori"+
   "\n  dovezi: "+JSON.stringify(o.evidence)).join("\n\n");
  button.disabled=data.complete;
 }catch(e){say("Operatori: "+e.message,true);button.disabled=false;}
});
$("atlasLoadHistory").addEventListener("click",async()=>{
 const button=$("atlasLoadHistory");button.disabled=true;
 try{
  const q=new URLSearchParams({w:String(state.worker),
   cursor:String(state.historyCursor),limit:"10"});
  const data=await getJson("/native-hypermaze-atlas?"+q);
  if(!Array.isArray(data.rows))throw Error("Permanent atlas unavailable");
  state.history.push(...data.rows);state.historyCursor=data.nextCursor;
  $("atlasHistoryProgress").textContent=state.history.length+" evenimente · "+
   state.historyCursor+" octeți citiți";
  $("atlasHistory").textContent=state.history.map((ev,i)=>
   "#"+(i+1)+" "+ev.event+" · "+ev.planId+
   "\n"+(ev.event==="preaction"?
    "FORMA: "+JSON.stringify(ev.plan?.initialShape)+
    "\nTrasee: "+ev.atlas?.paths?.length+
    " · Frontiere: "+ev.atlas?.topology?.frontierCount:
    "Exact: "+ev.audit?.completeTextExactFirstTry+
    " · Greșeli: "+ev.audit?.charAudit?.incorrectCharacters?.length+
    " · lipsuri: "+JSON.stringify(ev.audit?.failureCategories))).join("\n\n");
  button.disabled=data.end;
 }catch(e){say("Istoric: "+e.message,true);button.disabled=false;}
});
$("atlasAudit").addEventListener("click",async()=>{
 if(!state.planId)return say("Întâi îngheață o predicție.",true);
 const reference=$("atlasReference").value;
 if(!reference)return say("Referința trebuie dată după predicție.",true);
 const button=$("atlasAudit");button.disabled=true;
 try{
  const data=await getJson("/native-hypermaze-audit",{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({w:state.worker,planId:state.planId,reference})});
  if(!data.referenceEnteredAfterPathFrozen||data.audit?.referenceWasUsedForPlanning!==false)
   throw Error("Barierele dintre planificare și referință nu au fost respectate");
  state.audit=data.audit;renderAtlas();
  const audited=data.audit,char=audited.charAudit;
  const predicted=Array.from(state.plan.predicted||"");
  const actual=Array.from(reference);
  const lines=Array.from({length:Math.max(actual.length,predicted.length)},(_,i)=>{
   const left=predicted[i]??null,right=actual[i]??null;
   const origin=char.predictedCharacterOrigins?.[i]||null;
   const cause=origin?.kind==="learned-text-transformation"?
    " · axa="+origin.operatorKind+" "+
     (origin.operatorFrom??"∅")+"→"+(origin.operatorTo??"∅")+
     " · dovadă="+JSON.stringify(origin.evidence):
    origin?.kind==="observed-start"?" · sursă=starea inițială observată":
     " · proveniență=necunoscută";
   return String(i).padStart(5,"0")+" "+(left===right?"✓":"✗")+
    " prezis "+JSON.stringify(left)+" · corect "+JSON.stringify(right)+cause;
  });
  $("atlasCharacters").textContent=
   "CORECTE PE POZIȚIE: "+(100*char.accuracy).toFixed(3)+"%"+
   "\nTEXT INTEGRAL EXACT: "+audited.completeTextExactFirstTry+
   "\nPRIMA GREȘEALĂ: "+char.firstMismatch+
   "\nPLANUL A FOST ÎNGHEȚAT ÎNAINTE DE REFERINȚĂ: DA"+
   "\n\n"+lines.join("\n");
  $("atlasGaps").textContent=
   "CATEGORII: "+audited.failureCategories.join(", ")+"\n"+
   "Editări necesare: "+(audited.operatorGap.tokenEdits||[]).length+"\n"+
   (audited.operatorGap.tokenEdits||[]).map((x,i)=>
    "#"+(i+1)+" "+x.kind+" "+(x.from??"∅")+"→"+(x.to??"∅")+
    " · "+x.gapReason+"\n  DOVEZI: "+JSON.stringify(x.matchingEvidence)).join("\n\n")+
   "\n\nFRONTIERE: "+audited.frontierCount+
   "\nBENEFICIU CAUZAL 5D: NEDEMONSTRAT";
  $("atlasAuditStatus").textContent=audited.completeTextExactFirstTry?
   "Răspuns exact pentru acest test":"Greșeli și operatori lipsă identificați.";
  document.documentElement.dataset.nativeAtlasAudited="true";
 }catch(e){say(e.message,true);}finally{button.disabled=false;}
});
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
 const atlas=state.atlas;
 if(atlas?.paths?.length){
  ctx.lineWidth=1.2;ctx.strokeStyle="rgba(181,154,243,.28)";
  for(const route of atlas.paths.slice(0,256)){
   if(route.isInitialShape)continue;
   ctx.beginPath();
   for(const [i,id] of route.nodes.entries()){
    const p=points[id];if(!p)continue;
    if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
   }
   ctx.stroke();
  }
 }
 if(atlas?.deadEnds?.length){
  ctx.strokeStyle=colors.rose;ctx.lineWidth=1.5;
  for(const dead of atlas.deadEnds){
   const p=points[dead.at];if(!p)continue;
   ctx.beginPath();ctx.moveTo(p.x-3,p.y-3);ctx.lineTo(p.x+3,p.y+3);
   ctx.moveTo(p.x+3,p.y-3);ctx.lineTo(p.x-3,p.y+3);ctx.stroke();
  }
 }
 if(topology.frontier?.length){
  ctx.strokeStyle=colors.gold;ctx.lineWidth=1;
  for(const f of topology.frontier){
   const p=points[f.node];if(!p)continue;
   ctx.strokeRect(p.x-4,p.y-4,8,8);
  }
 }
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
