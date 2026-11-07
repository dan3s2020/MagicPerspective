// ONE original V17 Brain / immutable append-only local JSONL atlas.
// No synthetic paths, no new training model, no fake unexplored edges.
"use strict";
const $=id=>document.getElementById(id);
const fmt=x=>typeof x==="number"&&Number.isFinite(x)?
 Intl.NumberFormat("ro-RO",{maximumFractionDigits:1}).format(x):"—";
const colors={gold:"#ffcf80",green:"#70d7b0",red:"#ed8ba0",
 cyan:"#7acfe4",gray:"#6489a2"};
const state={w:0,mode:"search",after:0,stack:[],
 page:null,selected:null,summary:null,lastIndex:null,
 offset:[0,0],angle:0,zoom:1,pointer:null};
function info(message,error=false){
 $("status").textContent=message;
 $("status").style.color=error?colors.red:colors.gray;
}
async function api(q){
 const url="/native-hypermaze-atlas?"+new URLSearchParams(q);
 const response=await fetch(url,{cache:"no-store"});
 if(!response.ok)throw Error("Atlas HTTP "+response.status);
 const result=await response.json();
 if(result.error)throw Error(result.error);
 return result.result??result;
}
const sum=(id,x)=>{$(id).textContent=fmt(x);};
async function refreshSummary(){
 const s=await api({w:state.w,mode:"summary"});
 state.summary=s;
 sum("events",s.journalEvents);
 sum("worlds",s.totalWorlds);
 sum("operators",s.learnedOperatorEvents);
 sum("successes",s.searchesFound);
 sum("failures",s.searchesFailed);
 sum("bytes",s.journalBytes);
 document.documentElement.dataset.atlasEventCount=String(s.journalEvents);
 $("listTitle").textContent=s.persisted?"Jurnal pe disc, păstrat între restarturi":"Jurnal doar în memoria testului";
 return s;
}
function request(){
 const mode=state.mode;
 if(mode==="operators"||mode==="unused")
  return {w:state.w,mode:"operators",after:state.after,
   limit:30,onlyUnused:mode==="unused"?"1":"0"};
 if(mode==="search")return {w:state.w,mode:"events",
  kind:"search",after:state.after,limit:30};
 if(mode==="failed")return {w:state.w,mode:"events",
  kind:"search",after:state.after,limit:30,onlyFailed:"1"};
 if(mode==="worlds")return {w:state.w,mode:"events",
  kind:"world",after:state.after,limit:30};
 return {w:state.w,mode:"events",after:state.after,limit:30};
}
function kindOf(entry){
 if(entry.type==="search")return entry.found?"success":"failure";
 if(entry.type==="operator")return "success";
 return entry.type||"operator";
}
function textOf(entry){
 if(entry.type==="search")
  return "#"+entry.seq+" · "+(entry.found?"CALE GĂSITĂ":"NU S-A GĂSIT CALE")+
   " · "+(entry.diagnostic?.reason||"")+
   " · "+(entry.graph?.states??0)+" stări";
 if(entry.type==="world")
  return "#"+entry.seq+" · "+(entry.world||"lume")+
   " · "+(entry.rawText||entry.nativeObservedTransition?.domain||"observație").slice(0,90);
 if(entry.type==="operator")
  return "#"+entry.seq+" · "+(entry.kind||"operator")+
   " · "+(entry.from||"∅")+" → "+(entry.to||"∅");
 if(entry.key)return entry.kind+" · "+(entry.from||"∅")+" → "+(entry.to||"∅")+
  " · folosit în "+entry.pathsUsedSuccessful+" rute reușite · explorat în "+
  entry.exploredDuringUnsuccessfulSearches+" căutări nereușite";
 return "#"+(entry.seq||"?")+" · "+entry.type;
}
function detailOf(entry){
 if(entry.type==="search"){
  const d=entry.diagnostic||{};
  return "CĂUTARE ORIGINALĂ #"+entry.seq+
   "\nSTARE: "+(entry.found?"CALE GĂSITĂ":d.outcome)+
   "\n\nCERINȚĂ:\n"+JSON.stringify(entry.required)+
   "\n\nPLAN GLOBAL ÎNAINTE DE ACȚIUNE:\n"+(entry.initialShape||[]).map((x,i)=>
    i+" | "+x).join("\n")+
   "\n\nOPERATORII FOLOSIȚI, ÎN ORDINE:\n"+(entry.actions||[]).map((x,i)=>
    i+" | "+x.kind+" "+x.from+"→"+x.to+
    " suport="+x.observedSupport+" key="+x.key).join("\n")+
   "\n\nGRAF: "+JSON.stringify(entry.graph)+
   "\n\nDIAGNOSTIC: "+JSON.stringify(d,null,2)+
   "\n\nEXACTITATE SEMANTICĂ EXTERNĂ: NEDEMONSTRATĂ";
 }
 if(entry.key){
  return "TRANSFORMARE REAL OBSERVATĂ\n"+JSON.stringify(entry,null,2);
 }
 if(entry.type==="world"){
  return "OBSERVAȚIE DIN CORPUL ORIGINAL\n"+JSON.stringify(entry,null,2);
 }
 return JSON.stringify(entry,null,2);
}
function diagnostic(entry){
 const el=$("missing");
 if(entry.type!=="search"){
  el.textContent=entry.key?
   "Operator din memoria originală. "+
   "Pe trasee reușite: "+fmt(entry.pathsUsedSuccessful)+
   "\nExecutat efectiv de corpul V17: "+fmt(entry.executedNativeBodySteps)+
   "\nExplorat în căutări nereușite: "+fmt(entry.exploredDuringUnsuccessfulSearches)+
   "\nExplorat în căutări reușite: "+fmt(entry.exploredDuringSuccessfulSearches)+
   "\nBlocat de invariante structurale: "+fmt(entry.blockedByStructuralInvariant)+
   "\nExplorat ≠ executat."+
   "\nDovezi originale: "+JSON.stringify(entry.supportingExamples||[]):
   "Acest eveniment este dovadă observată, nu o căutare cu o țintă.";
  return;
 }
 const d=entry.diagnostic||{};
 el.textContent=entry.found?
  "TRASEU GĂSIT\n"+
  (entry.graph?.completeKnownOperatorClosure?
   "Frontiera operatorilor cunoscuți: explorată complet":
   "ATENȚIE: graful încă are frontiere neexplorate")+
  "\nOperatori folosiți: "+(entry.actions||[]).length+
  "\nNu înseamnă că răspunsul semantic este demonstrat. ":
  "DE CE NU AM GĂSIT CALEA?\n"+
  "Clasificare: "+(d.outcome||"necunoscut")+
  "\nCauze: "+(d.causes||[]).join(", ")+
  "\nConcepte neobservate: "+(d.missingTargetTokens||[]).join(", ")+
  "\nTipuri de acțiuni lipsă: "+(d.missingActionKinds||[]).join(", ")+
  "\nFrontieră neexplorată: "+fmt(d.unexpandedFrontier)+
  "\nLimită de stări: "+String(!!d.stateBudgetExceeded)+
  "\nLimită de adâncime: "+String(!!d.depthBudgetExceeded)+
  "\nRestricții structurale: "+fmt(d.unresolvedEdges)+
  "\nCapete fără continuări: "+fmt(d.deadEnds)+
  "\nRestricții de design și memorie: "+JSON.stringify(d.designRestrictions||{},null,2)+
  "\nOperatori globali cunoscuți, inaccesibili în acest graf: "+fmt(d.relevantOperatorsUnavailableFromExploredStates)+
  "\nExemple: "+JSON.stringify(d.sampleUnavailableOperators||[],null,2)+
  "\nNu putem deduce «imposibil» dintr-o căutare trunchiată.";
}
function select(entry){
 state.selected=entry;
 document.documentElement.dataset.atlasSelectedKind=kindOf(entry);
 $("detail").textContent=detailOf(entry);
 diagnostic(entry);
 const buttons=[...$("items").querySelectorAll(".item")];
 for(const b of buttons)b.classList.toggle("selected",
  b.dataset.seq===String(entry.seq??entry.key));
 draw();
}
function renderList(){
 const box=$("items");box.replaceChildren();
 const ops=state.mode==="operators"||state.mode==="unused";
 const rows=ops?state.page?.operators||[]:state.page?.events||[];
 for(const entry of rows){
  const button=document.createElement("button");
  button.type="button";button.className="item "+kindOf(entry);
  button.dataset.seq=String(entry.seq??entry.key);
  const title=document.createElement("b");title.textContent=textOf(entry);
  const meta=document.createElement("small");
  meta.textContent=entry.type==="search"?
   "scop: "+(entry.required||[]).join(", ")+
   " · "+(entry.graph?.completeKnownOperatorClosure?"graf complet":"frontieră incompletă"):
   entry.type==="operator"?"dovezi efective din corpus":
   entry.key?"suport observat "+entry.observedSupport:
   "înregistrare din jurnalul V17";
  button.append(title,meta);
  button.addEventListener("click",()=>select(entry));
  box.appendChild(button);
 }
 if(!rows.length){
  const empty=document.createElement("p");empty.className="mini muted";
  empty.textContent="Nu există evenimente corespunzătoare acestui filtru. Nu inventez căi.";
  box.appendChild(empty);
 }
 const total=ops?state.page?.totalOperators??0:state.page?.totalEvents??0;
 $("cursor").textContent=fmt(state.page?.nextCursor??0)+" / "+fmt(total);
 $("pageStatus").textContent=rows.length+" rezultate reale";
 $("next").disabled=!state.page?.hasMore;
 $("previous").disabled=!state.stack.length;
 if(rows.length)select(rows[0]);else{
  state.selected=null;$("detail").textContent="Niciun traseu selectat.";
  $("missing").textContent="Nu sunt date pentru diagnosticul cerut.";draw();
 }
}
async function load({keepSelection=false}={}){
 const prev=keepSelection?state.selected?.seq??state.selected?.key:null;
 const page=await api(request());
 state.page=page;
 renderList();
 const rows=(page.events||page.operators||[]);
 if(prev!==null){
  const matching=rows.find(x=>(x.seq??x.key)===prev);
  if(matching)select(matching);
 }
}
async function refresh(){
 try{
  await refreshSummary();
  await load({keepSelection:true});
  info("Date de la originalul Brain · toate evenimentele accesibile prin paginare.");
 }catch(e){info("Atlasul real nu este disponibil: "+e.message,true);}
}
$("mode").addEventListener("change",async e=>{
 state.mode=e.target.value;state.after=0;state.stack=[];
 await refresh();
});
$("worker").addEventListener("change",async e=>{
 state.w=Number(e.target.value);
 state.after=0;state.stack=[];await refresh();
});
$("refresh").addEventListener("click",refresh);
$("previous").addEventListener("click",async()=>{
 if(!state.stack.length)return;
 state.after=state.stack.pop();await load();
});
$("next").addEventListener("click",async()=>{
 if(!state.page?.hasMore)return;
 state.stack.push(state.after);
 state.after=state.page.nextCursor;
 await load();
});
for(const [name,current]of [["axisX",0],["axisY",1],["axisZ",2]]){
 const el=$(name);
 for(let k=0;k<5;k++){
  const o=document.createElement("option");o.value=String(k);o.textContent=String(k+1);
  el.appendChild(o);
 }
 el.value=String(current);el.addEventListener("change",draw);
}
$("zoom").addEventListener("input",e=>{state.zoom=+e.target.value;draw();});
const canvas=$("graph");
canvas.addEventListener("pointerdown",e=>{
 state.pointer={x:e.clientX,y:e.clientY,angle:state.angle,
  ox:state.offset[0],oy:state.offset[1],drag:e.shiftKey};
 canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove",e=>{
 if(!state.pointer)return;
 const dx=e.clientX-state.pointer.x,dy=e.clientY-state.pointer.y;
 if(state.pointer.drag){
  state.offset=[state.pointer.ox+dx,state.pointer.oy+dy];
 }else{
  state.angle=state.pointer.angle+dx*.008;
  state.offset[1]=state.pointer.oy+dy*.4;
 }
 draw();
});
for(const e of ["pointerup","pointercancel"])
 canvas.addEventListener(e,()=>{state.pointer=null;});
canvas.addEventListener("wheel",e=>{
 e.preventDefault();
 state.zoom=Math.min(2.5,Math.max(.5,state.zoom*(e.deltaY<0?1.1:.9)));
 $("zoom").value=String(state.zoom);draw();
},{passive:false});
function point(n,i,total,w,h,maxGraphDepth){
 const v=n.position5D;
 if(Array.isArray(v)&&v.length===5&&v.every(Number.isFinite)){
  const ax=Number($("axisX").value),ay=Number($("axisY").value),az=Number($("axisZ").value);
  const x=Math.cos(2*Math.PI*v[ax])+.24*Math.sin(2*Math.PI*v[az]);
  const y=Math.sin(2*Math.PI*v[ay])+.22*Math.cos(2*Math.PI*v[az]);
  const r=state.angle,xr=x*Math.cos(r)-y*Math.sin(r),yr=x*Math.sin(r)+y*Math.cos(r);
  const f=Math.min(w*.33,h*.38)*state.zoom;
  return {x:w/2+xr*f+state.offset[0],y:h/2+yr*f+state.offset[1],actual5D:true};
 }
 // Fallback is an explicitly NON-5D canvas layout from actual graph depth.
 return {x:18+Math.min(w-36,(n.depth+1)/(maxGraphDepth+2)*(w-36))+
     state.offset[0],
  y:18+((i*53+Math.floor(i/7)*37)%(Math.max(50,h-36)))+state.offset[1],
  actual5D:false};
}
function draw(){
 const ctx=canvas.getContext("2d"),rect=canvas.getBoundingClientRect();
 const w=Math.max(220,rect.width),h=Math.max(180,rect.height),
  dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,w,h);
 const e=state.selected,g=e?.fullExploredTopology;
 if(!g?.nodes?.length){
  ctx.textAlign="center";ctx.fillStyle=colors.gold;ctx.font="18px Georgia";
  ctx.fillText("Alege o căutare reală din atlas",w/2,h/2);
  ctx.textAlign="left";
  $("graphStatus").textContent="Nu desenez niciun drum care nu există în jurnal.";
  document.documentElement.dataset.atlasGraphNodes="0";
  return;
 }
 const nodes=g.nodes,maxGraphDepth=nodes.reduce((m,n)=>Math.max(m,n.depth||0),1);
 const points=nodes.map((x,i)=>point(x,i,nodes.length,w,h,maxGraphDepth));
 ctx.beginPath();ctx.lineWidth=.6;ctx.strokeStyle="rgba(102,172,204,.22)";
 for(const x of g.edges){
  const a=points[x.from],b=points[x.to];if(!a||!b)continue;
  ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
 }
 ctx.stroke();
 const unresolved=new Set((g.unresolvedFrontier||[]).map(x=>x.id));
 const chosen=g.initialShapeIds||[];
 const chosenEdges=new Set(chosen.slice(1).map((v,i)=>chosen[i]+">"+v));
 ctx.beginPath();ctx.lineWidth=3;ctx.strokeStyle=colors.gold;
 for(const x of g.edges)if(chosenEdges.has(x.from+">"+x.to)){
  const a=points[x.from],b=points[x.to];if(!a||!b)continue;
  ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
 }
 ctx.stroke();
 let fiveD=0,frontiers=0;
 for(const n of nodes){
  const p=points[n.id];if(!p)continue;
  if(p.actual5D)fiveD++;
  if(unresolved.has(n.id))frontiers++;
  ctx.beginPath();ctx.arc(p.x,p.y,n.goal?4.5:unresolved.has(n.id)?3.8:1.7,0,Math.PI*2);
  ctx.fillStyle=n.goal?colors.green:unresolved.has(n.id)?colors.red:
   chosen.includes(n.id)?colors.gold:colors.cyan;ctx.fill();
 }
 const first=points[g.sourceId??0];
 if(first){
  ctx.font="12px Segoe UI";ctx.fillStyle=colors.gold;
  ctx.fillText("START",first.x+8,first.y-9);
 }
 $("graphStatus").textContent=nodes.length+" stări explorate · "+g.edges.length+
  " muchii ale operatorilor învățați · "+frontiers+
  " frontiere incomplete · "+fiveD+" poziții 5D învățate/inferate · "+
  (g.complete?"complet pentru această închidere finită":"INCOMPLET: limita a tăiat explorarea");
 document.documentElement.dataset.atlasGraphNodes=String(nodes.length);
 document.documentElement.dataset.atlasGraphComplete=String(g.complete===true);
}
window.addEventListener("resize",draw);
async function bootstrap(){
 try{
  const data=await fetch("/graphs",{cache:"no-store"}).then(r=>r.json());
  const workers=(data.graphs||[]).filter(x=>x.nativeHypermaze);
  const picker=$("worker");picker.replaceChildren();
  for(const worker of workers){
   const option=document.createElement("option");option.value=String(worker.w);
   option.textContent="#"+worker.w+" · "+worker.arm;
   picker.appendChild(option);
  }
  const requested=new URLSearchParams(location.search);
  state.w=Number(requested.get("w")||workers[0]?.w||0);
  if(workers.length&&!workers.some(x=>x.w===state.w))state.w=workers[0].w;
  if(!picker.options.length){
   const option=document.createElement("option");option.value=String(state.w);
   option.textContent="#"+state.w+" (checkpoint salvat)";
   picker.appendChild(option);
  }
  picker.value=String(state.w);
  await refreshSummary();
  const selectedSeq=Number(requested.get("searchSequence"));
  if(Number.isSafeInteger(selectedSeq)&&selectedSeq>0){
   state.mode="everything";$("mode").value="everything";
   state.after=selectedSeq-1;
  }
  await load();
  info("Atlasul original a fost încărcat. Selectează căile nereușite pentru a descoperi limitele.");
 }catch(err){info("Nu pot încărca atlasul real: "+err.message,true);}
}
bootstrap();
