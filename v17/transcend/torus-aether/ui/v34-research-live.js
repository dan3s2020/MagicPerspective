// V34 — original live V17 Brain, witnessed evidence and frozen candidate paths.
// This script does not contain graph data, random examples, fake counters,
// predicted answers, an independent model or another training loop.
// All its values and full per-edge traces originate in the SAME native
// worker as v17/transcend/torus-aether/ui/app.js.
"use strict";
const $=id=>document.getElementById(id);
if($("v34ResearchPanel")){
 const to=n=>typeof n==="number"&&Number.isFinite(n)?n.toLocaleString("ro-RO"):"—";
 const say=(id,s)=>{const x=$(id);if(x)x.textContent=String(s)};
 let live=null,shape=null,position=0,refreshing=false,lastSave=null;
 const originalClock=()=>new Date().toLocaleTimeString("ro-RO");
 async function request(path,body,timeoutMs=35000){
  const timer=new AbortController(),abort=setTimeout(()=>timer.abort(),timeoutMs);
  try{
   const r=await fetch(path,{method:body?"POST":"GET",
    headers:body?{"content-type":"application/json"}:{},
    body:body?JSON.stringify(body):undefined,
    signal:timer.signal,cache:"no-store"});
   const j=await r.json();
   if(!r.ok||j.error)throw Error(j.error||("HTTP "+r.status));
   if(j.originalLiveWorker!==true)throw Error("Original native V17 worker did not answer");
   return j;
  }finally{clearTimeout(abort);}
 }
 const send=body=>request("/v34/research?w=0",body,60000);
 function summariseStatus(t){
  const r=t.result||t;
  if(!r.sourceTraining||!r.originalBrainIdentityVerified)
   throw Error("No original native Brain state returned");
  live=r;
  say("v34Chars",to(r.sourceTraining.charactersCommitted));
  say("v34Episodes",to(r.sourceTraining.exercisesCommitted));
  say("v34Operators",to(r.sourceTraining.nativeTextContrasts));
  say("v34Xd",to(r.physicalXDAtlas.learnedWorlds));
  say("v34Pairs",to(r.causalNumeric.externallyProvidedPairs));
  const noise=r.recordedNoise;
  say("v34Noise",noise?to(noise.decisions??noise.noiseDecisions??0):"Inactiv");
  say("v34Health","ACELAȘI Brain V17 • "+originalClock()+" • "+
    to(r.sourceTraining.nativeTextStatesActive)+" stări text active • "+
    to(r.sourceTraining.nativeTextStatesEvicted)+" stări eliminate prin buget • "+
    to(r.originalField.mazeEpisodes)+" labirinturi trăite • "+
    "atracție "+Number(r.originalField.targetAttraction).toFixed(3)+
    " • operatori de corpus = ipoteze, nu acțiuni fizice confirmate");
 }
 async function refresh(){
  if(refreshing)return;refreshing=true;
  try{const r=await request("/v34/status?w=0");
   summariseStatus(r);
  }catch(e){say("v34Health","Backend original indisponibil: "+e.message)}
  finally{refreshing=false;}
 }
 function charNodes(s){
  const w=s?.knownWorldGraph;
  if(!w||!Array.isArray(w.states))return [];
  return w.states.map((x,i)=>({id:i,text:Array.isArray(x)?x.join(""):String(x),
   start:i===0,target:Array.isArray(w.targets)&&w.targets.includes(i),
   distance:null}));
 }
 function xyFor(nodes,world){
  const levels=Array.isArray(world?.depth)?world.depth:[];
  const groups=new Map();
  for(const n of nodes){
   const d=Number.isFinite(levels[n.id])?levels[n.id]:n.id===0?0:1;
   const a=groups.get(d)||[];a.push(n);groups.set(d,a);
  }
  const maxD=Math.max(...groups.keys(),1),coords=new Map();
  for(const [depth,ns] of groups){
   ns.forEach((n,i)=>coords.set(n.id,{
    x:38+884*depth/maxD,y:24+(i+.5)*307/ns.length
   }));
  }
  return coords;
 }
 function renderMap(){
  const cv=$("v34CharMap");if(!cv)return;
  const cx=cv.getContext("2d"),W=cv.width,H=cv.height;
  cx.fillStyle="#06121d";cx.fillRect(0,0,W,H);
  if(!shape?.knownWorldGraph?.states?.length){
   cx.fillStyle="#b4c7dc";cx.font="16px system-ui";
   cx.fillText("Nu există încă un graf de căi observate.",24,48);
   return;
  }
  const world=shape.knownWorldGraph,nodes=charNodes(shape);
  const pos=xyFor(nodes,world),gold="#ffca75",blue="#719fc2",red="#ff6d89";
  let edges=0;
  const path=(shape.candidatePath||[]).map(x=>({from:x.from,to:x.to}));
  // Resolve path indices from actual full state strings, not fake state IDs.
  const index=new Map(nodes.map(n=>[n.text,n.id]));
  const selected=new Set(path.map(x=>{
   const a=typeof x.from==="number"?x.from:index.get(x.from),
    b=typeof x.to==="number"?x.to:index.get(x.to);
   return a+"|"+b;
  }));
  for(let i=0;i<world.neighbors.length;i++){
   for(const e of world.neighbors[i]){
    const A=pos.get(i),B=pos.get(e.to);
    if(!A||!B)continue;
    const chosen=selected.has(i+"|"+e.to);
    cx.beginPath();cx.moveTo(A.x,A.y);cx.lineTo(B.x,B.y);
    cx.lineWidth=chosen?3.5:1.3;
    cx.strokeStyle=chosen?gold:e.verified?"#66dab0":"#7aa9e0";
    cx.setLineDash(e.hypothesis?[6,4]:[]);cx.globalAlpha=chosen?1:.52;
    cx.stroke();cx.setLineDash([]);cx.globalAlpha=1;edges++;
   }
  }
  for(const n of nodes){
   const p=pos.get(n.id);if(!p)continue;
   const here=position>0?path[position-1]:null;
   const selectedNode=here&&(typeof here.to==="number"?here.to:index.get(here.to))===n.id;
   cx.beginPath();cx.arc(p.x,p.y,selectedNode?11:7,0,Math.PI*2);
   cx.fillStyle=selectedNode?gold:n.target?"#56e3af":n.start?"#f1bc64":blue;
   cx.fill();cx.strokeStyle="#13283b";cx.lineWidth=2;cx.stroke();
   if(nodes.length<=35){
    cx.font="11px Consolas,monospace";cx.fillStyle="#e1edf8";
    cx.fillText(n.text.slice(0,19),p.x+9,p.y-6);
   }
  }
  cx.fillStyle=red;cx.font="13px system-ui";
  const d=world.diagnostics||{};
  cx.fillText("Noduri "+nodes.length+" • coridoare "+edges+
   " • lipsă "+(d.missingGoalCharacterPaths?.length||0)+
   " • ziduri observate "+(d.rejectedByWorldWalls||0)+
   " • limită "+((d.nodeLimitReached||d.depthLimitReached)?"DA":"nu"),15,H-12);
 }
 function formatCharacterPath(plan){
  const d=plan.knownWorldGraph?.diagnostics||{};
  const examples=(plan.candidatePath||[]).map((x,i)=>({
   step:i+1,from:x.from,characterAction:x.action,
   predictedNext:x.to,physicallyVerified:x.verified===true,
   trainingEvidenceIsHypothesis:x.verified!==true
  }));
  return {source:"ACTUAL original V17 Brain + original Discoverer shapeGraph",
   sourceEvidence:plan.observedSourceEvidence,
   predictedBeforeAnyAction:plan.plannedBeforeAnyPhysicalAction,
   answerReferenceNeverProvided:true,
   found:plan.found,reason:plan.reason,
   chosenPath:examples,
   missingGoalCharacterPaths:d.missingGoalCharacterPaths||[],
   designLimitations:d.designLimitations||[],
   observedWalls:d.rejectedByWorldWalls||0,
   blockedByStateBudget:d.rejectedByStateBudget||0,
   blockedByDepthBudget:d.frontierDepthLimited||0,
   generatedWorldStates:plan.knownWorldGraph?.states?.length||0,
   generatedWorldEdges:plan.knownWorldGraph?.neighbors?.reduce((n,x)=>n+x.length,0)||0,
   hypothesisNotValidatedExternally:true,
   knownWorldNodes:plan.knownWorldGraph?.states||[],
   knownWorldAdjacency:plan.knownWorldGraph?.neighbors||[]
  };
 }
 function showCharacter(plan){
  shape=plan;
  const count=plan.candidatePath?.length||0;
  position=0;$("v34CharScrub").max=String(count);
  $("v34CharScrub").value="0";
  say("v34CharVerdict",(plan.found?"RUTĂ CANDIDATĂ învățată: "+count+" pași":
   "FĂRĂ CALE: "+(plan.reason||"necunoscut"))+
   " • planificare ÎNAINTE de acțiune • validarea fizică externă: NEEXECUTATĂ");
  say("v34CharDetails",JSON.stringify(formatCharacterPath(plan),null,2));
  renderMap();
 }
 function shiftStep(index){
  if(!shape)return;
  const max=shape.candidatePath?.length||0;position=Math.min(max,Math.max(0,index));
  $("v34CharScrub").value=String(position);
  const s=shape.candidatePath?.[position-1]||null;
  const d=formatCharacterPath(shape);
  say("v34CharDetails",JSON.stringify({...d,
   currentStep:position,currentPredictedEdge:s,
   actualPhysicalActionAttempted:false},null,2));
  renderMap();
 }
 async function act(button,fn){
  const b=$(button);if(!b||b.disabled)return;
  b.disabled=true;
  try{await fn();}
  catch(e){say(button==="v34NumericPlan"||button==="v34Witness"?"v34NumericDetails":
    button==="v34Refresh"||button==="v34Save"?"v34Health":
    button==="v34CharStatus"?"v34Rules":"v34CharVerdict",
    "Eroare din workerul real: "+e.message)}
  finally{b.disabled=false;}
 }
 $("v34Refresh").onclick=()=>act("v34Refresh",refresh);
 $("v34Save").onclick=()=>act("v34Save",async()=>{
  const r=await fetch("/control?do=save&w=0",{method:"POST"});
  const j=await r.json();
  if(j.error||!j.ok)throw Error(j.error||"Original V17 save refused");
  lastSave=originalClock();
  say("v34Health","Solicitarea de salvare a fost acceptată la "+lastSave+
    ". Verifică fișierul .v8 și confirmarea efectivă în jurnalul original al workerului.");
 });
 $("v34CharStatus").onclick=()=>act("v34CharStatus",async()=>{
  const s=await send({type:"character-status"});
  say("v34RuleInfo",to(s.structurallyReusableHypotheses)+
   " ipoteze Unicode structurale • "+to(s.acceptedMinimalOneCharacterContrasts)+
   " contraste reale • niciun efect cauzal inventat");
  say("v34Rules",JSON.stringify(s,null,2));
 });
 $("v34CharPlan").onclick=()=>act("v34CharPlan",async()=>{
  const at=Number($("v34CharAt").value),char=$("v34CharGoal").value;
  if(Array.from(char).length!==1)throw Error("Alege exact un caracter Unicode țintă");
  showCharacter(await send({type:"character-plan",
   start:$("v34CharStart").value,charSlots:{[at]:char},
   allowCorpusHypotheses:$("v34AllowHypotheses").checked,
   maxNodes:Number($("v34Nodes").value),
   maxDepth:Number($("v34Depth").value)}));
 });
 $("v34CharScrub").oninput=()=>shiftStep(Number($("v34CharScrub").value));
 $("v34CharPrev").onclick=()=>shiftStep(position-1);
 $("v34CharNext").onclick=()=>shiftStep(position+1);
 $("v34CharExport").onclick=()=>{
  if(!shape){say("v34CharVerdict","Fără traseu real de exportat");return}
  const json=JSON.stringify({generatedAt:new Date().toISOString(),
   scope:"ONE actual native V17 Brain; source-backed, bounded known world",
   shape},null,2);
  const link=document.createElement("a"),url=URL.createObjectURL(
   new Blob([json],{type:"application/json;charset=utf-8"}));
  link.href=url;link.download="MagicPerspective-V34-original-actual-character-paths.json";
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 $("v34Witness").onclick=()=>act("v34Witness",async()=>{
  if(!$("v34WitnessTruth").checked)
   throw Error("Confirmă că efectul provine din observații reale. Nu inventez acțiuni.");
  const result=await send({type:"numeric-observe",
   before:$("v34Before").value,after:$("v34After").value,
   actualActionWitness:true});
  say("v34NumericDetails",JSON.stringify(result,null,2));
  await refresh();
 });
 $("v34NumericPlan").onclick=()=>act("v34NumericPlan",async()=>{
  const result=await send({type:"numeric-plan",
   start:$("v34NumericStart").value,
   dependentDelta:Number($("v34Delta").value),includeAtlas:true});
  say("v34NumericDetails",JSON.stringify(result,null,2));
 });
 refresh();renderMap();
 setInterval(()=>{if($("v34Auto")?.checked)refresh();},4000);
}
