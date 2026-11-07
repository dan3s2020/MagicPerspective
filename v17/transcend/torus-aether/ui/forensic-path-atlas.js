// V31 — ACTUAL original V17 Brain forensic path atlas, not a decorative demo.
// Every datum is fetched from /api/path-atlas in the active native worker.
// Goal/starting text may be sent. The CORRECT withheld reference NEVER is.
// A snapshot is only the retained graph; lost historical states are counted.
"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 if(!$("forensicAtlas"))return;
 const S={section:"nodes",offset:0,limit:120,latest:null,analysis:null,
   lastPlan:null,scene:{nodes:[],edges:[]},busy:false,exporting:false};
 const parts=["nodes","verified","blocked","proposals","textOnly",
  "operators","observations","qaEpisodes","crossWorld"];
 const color={verified:"#6bdfac",blocked:"#f47d99",
  proposals:"#eec478",textOnly:"#95a6be",operators:"#bf9efa"};
 const short=(v,n=100)=>String(v??"").slice(0,n);
 const number=v=>Number.isFinite(Number(v))?Intl.NumberFormat("ro-RO")
  .format(Number(v)):"—";
 const msg=(id,text)=>$(id).textContent=text;
 const source=()=>({start:$("atlasSource").value.trim(),
  required:$("atlasRequired").value.split(",").map(s=>s.trim()).filter(Boolean)});
 const query=({section=S.section,offset=S.offset,limit=S.limit,withGoal=true}={})=>{
  const q=new URLSearchParams({section,offset:String(offset),limit:String(limit)});
  if(withGoal){
   const s=source();
   if(s.start)q.set("start",s.start);
   if(s.required.length)q.set("required",s.required.join(","));
  }
  return q;
 };
 async function fetchPage(args={}){
  const r=await fetch("/api/path-atlas?"+query(args),{cache:"no-store"});
  if(!r.ok)throw Error("HTTP "+r.status+" reading native path atlas");
  const j=await r.json();
  if(j.error)throw Error(j.error);
  if(!j.originalBrain||j.originalPlanner!=="Discoverer.shapeGraph"||
     j.referenceAnswerSupplied!==false)
   throw Error("Refusing non-native or label-leaking atlas data");
  return j;
 }
 function summary(a){
  if(!a)return;
  for(const [id,v] of Object.entries({
   atlasNodes:a.retainedNodes,atlasVerified:a.walkableVerifiedEdges,
   atlasBlocked:a.blockedEdges,atlasProposed:a.proposedButUnverifiedEdges,
   atlasSequential:a.chronologicalTextLinksNotWalkable,
   atlasEvicted:(a.designLimits?.causalMemory?.evictedNodes||0)+
     (a.designLimits?.causalMemory?.evictedEdges||0)+
     (a.designLimits?.observationMemory?.evictedStates||0)
  }))msg(id,number(v));
  msg("atlasCoverage",
   "Date reale din memoria ACTIVĂ. Observații text păstrate: "+
    number(a.designLimits?.observationMemory?.observedStates)+
    " / "+number(a.designLimits?.observationMemory?.maxObserved)+
    " · operatori păstrați: "+number(a.operatorHypotheses)+
    " · pierderi istorice și limitări: "+
    JSON.stringify(a.designLimits)+
    "\nNu putem numi complet întregul spațiu al limbajului; nu s-au inventat muchii pentru segmentele lipsă.");
 }
 function explain(r){
  if(!r){
   msg("atlasDiagnosis","Atlasul afișează toate dovezile reținute. Introdu un start și un obiectiv pentru analiza traseelor, fără răspunsul ascuns.");
   return;
  }
  const t=r.topology||{},paths=r.verifiedPathAlternatives||{},
    hints=(r.missingBridgeCandidates||[]).slice(0,20);
  const values=[
   "DIAGNOSTIC: "+r.diagnosis,
   "ALGORITM SOLUȚIE: "+r.originalPlanner+" (același solver V17)",
   "FORMA ÎNAINTE DE PRIMA ACȚIUNE: "+(r.predictedBeforeAction??"NU EXISTĂ"),
   "Traseu selectat de solver: "+r.originalSelectedPath?.length+
     " acțiuni; dovezi integral fizice: "+String(r.selectedPathEvidenceComplete),
   "Stări reținute: "+number(t.totalRetainedNodes)+
     ", muchii verificate: "+number(t.retainedVerifiedEdges),
   "Componente separate: "+number(t.weakComponents)+
     " · accesibile de la start: "+number(t.reachableFromStart),
   "Stări care pot atinge ținta: "+number(t.canReachGoalInVerifiedGraph)+
     " · ținte reținute: "+number(t.goalNodesRetained),
   "TOATE TRASEELE SIMPLE găsite în limitele cerute: "+
     number(paths.enumerated)+
     " · enumerare exhaustivă în limite: "+
     String(paths.exhaustiveWithinLimits),
   "Atenție: ciclurile pot produce infinit de multe plimbări; exportăm muchiile, nu pretindem să enumerăm infinitul.",
   "FRONTIERE UNDE SE OPREȘTE:",
   ...(r.deadEnds||[]).slice(0,20).map(v=>
     " - "+short(v.text,110)+" | distanță "+v.stepsFromStart+
       " | tokeni obiectiv comuni "+v.goalTokenOverlap),
   "CĂI CARE AR UNI REGIUNI — încă NEVERIFICATE:",
   ...(r.oneEvidenceBridgeCandidates||[]).slice(0,20).map(v=>
    " - "+v.kind+": "+short(v.from,80)+" --"+short(v.action,50)+
    "--> "+short(v.to,80)+" | "+v.reason),
   "ALTE CĂI RESPINSE/NEVERIFICATE:",
   ...hints.filter(x=>!x.reachesKnownGoalComponent).slice(0,12)
    .map(v=>" - "+v.kind+": "+short(v.from,60)+" → "+short(v.to,60)+
     " | "+v.reason),
   "OPERATORI POSIBILI CÂND SURSA NU ESTE ÎN GRAFUL FIZIC:",
   ...(r.unanchoredTextOperatorHypotheses||[]).slice(0,10)
    .map(v=>" - "+short(v.action,70)+" → "+short(v.to,100)),
   "EXPERIMENT NECESAR: "+String(r.nextExperiment?.type)+
    "\n"+String(r.nextExperiment?.warning),
   "Limite design: "+JSON.stringify(r.designRestrictions),
   "NOISE: "+JSON.stringify(r.noise)
  ];
  msg("atlasDiagnosis",values.join("\n"));
 }
 function printPage(p){
  if(!p)return;
  msg("atlasPageInfo",number(p.offset)+"–"+
   number(Math.min(p.total,p.offset+p.items.length))+" / "+number(p.total)+
   (p.hasMore?" · mai sunt pagini":" · final"));
  $("atlasPrev").disabled=p.offset===0;
  $("atlasNext").disabled=!p.hasMore;
  msg("atlasPage",JSON.stringify(p.items,null,2));
 }
 const canvas=$("atlasCanvas"),ctx=canvas.getContext("2d");
 const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
 const pos=(name,coordinate)=>{
  if(Array.isArray(coordinate)&&coordinate.length>=2&&
     coordinate.every(v=>typeof v==="number"&&Number.isFinite(v))){
   return {x:30+(canvas.width-60)*Math.min(1,Math.max(0,coordinate[0])),
    y:30+(canvas.height-60)*Math.min(1,Math.max(0,coordinate[1])),
    original5D:true};
  }
  const a=hash("a"+name),b=hash("b"+name);
  return {x:30+(canvas.width-60)*(a/4294967295),
   y:30+(canvas.height-60)*(b/4294967295),original5D:false};
 };
 async function fillScene(){
  // Only the first page is drawn for quick live visualization, while the
  // actual full topology is in indexed pages/export. Never fake hidden nodes.
  const [a,b]=await Promise.all([
   fetchPage({section:"nodes",offset:0,limit:250,withGoal:false}),
   fetchPage({section:"verified",offset:0,limit:500,withGoal:false})
  ]);
  S.scene.nodes=a.page.items;S.scene.edges=b.page.items;
  S.scene.nodeMore=a.page.hasMore;S.scene.edgeMore=b.page.hasMore;
  draw();
 }
 function draw(){
  const w=canvas.width,h=canvas.height,nodes=S.scene.nodes||[],
    edges=S.scene.edges||[];
  ctx.clearRect(0,0,w,h);
  ctx.font="12px Consolas";ctx.fillStyle="#c8ddf4";
  ctx.fillText("VERIFICATE • verde   |   IPOTEZE • portocaliu   |   PEREȚI • roșu",14,18);
  if(!nodes.length){
   ctx.fillText("Nu sunt noduri cauzale verificate în memoria reținută. Observațiile text nu sunt acțiuni fizice.",20,60);
   return;
  }
  const locations=new Map(nodes.map(x=>[x.text,pos(x.text,x.position5D)]));
  ctx.strokeStyle=color.verified;ctx.globalAlpha=.48;ctx.lineWidth=1.3;
  for(const e of edges){
   const f=locations.get(e.from),t=locations.get(e.to);
   if(!f||!t)continue;
   ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(t.x,t.y);ctx.stroke();
  }
  ctx.globalAlpha=1;
  for(const n of nodes){
   const p=locations.get(n.text);ctx.fillStyle=color.verified;
   ctx.beginPath();ctx.arc(p.x,p.y,3.3,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle="#b4c9df";
  ctx.fillText("PROIECȚIE: coordonate 5D ORIGINALE când există; altfel layout topologic determinist.",14,h-26);
  ctx.fillText("VIZUALIZATE DOAR PRIMELE PAGINI: "+nodes.length+
   " noduri, "+edges.length+" muchii. Restul: pagina/export complet.",14,h-10);
 }
 async function refresh({reset=false}={}){
  if(S.busy)return;
  S.busy=true;$("atlasAnalyse").disabled=true;
  try{
   if(reset){S.offset=0;S.analysis=null;S.lastPlan=null;}
   const result=await fetchPage();
   S.latest=result;S.analysis=result.report;S.lastPlan=result.report?.originalSelectedPath||null;
   summary(result.summary);explain(result.report);printPage(result.page);
   $("atlasCompare").disabled=!S.analysis;
   msg("atlasConnection","Brain V17 conectat · analiza originală fără referință");
   if(reset)await fillScene();
  }catch(e){
   msg("atlasConnection","Eroare atlas: "+e.message);
   msg("atlasDiagnosis","Citirea a eșuat: "+e.message);
  }finally{S.busy=false;$("atlasAnalyse").disabled=false;}
 }
 $("atlasAnalyse").onclick=()=>{
  $("atlasReference").value="";
  msg("atlasCharResults","Forma trebuie calculată înainte de compararea cu textul de referință.");
  void refresh({reset:true});
 };
 $("atlasSection").onchange=e=>{S.section=e.target.value;S.offset=0;void refresh();};
 $("atlasPrev").onclick=()=>{S.offset=Math.max(0,S.offset-S.limit);void refresh();};
 $("atlasNext").onclick=()=>{
  S.offset=S.latest?.page?.nextOffset??S.offset;void refresh();
 };
 $("atlasCompare").onclick=()=>{
  const r=S.analysis,reference=$("atlasReference").value;
  if(!r){msg("atlasCharResults","Nu există plan înghețat.");return;}
  if(!reference.trim()){msg("atlasCharResults","Introdu un răspuns de referință pentru comparația DUPĂ planificare.");return;}
  // No fetch of reference. No training. Unicode code points, not UTF16 units.
  const a=Array.from(r.predictedBeforeAction??""),
   b=Array.from(reference);
  let correct=0,first=-1;
  for(let i=0;i<Math.max(a.length,b.length);i++){
   if(a[i]===b[i])correct++;
   else if(first<0)first=i;
  }
  const selected=r.originalSelectedPath||[],
   recent=selected.slice(-Math.min(10,selected.length)).map(x=>
    "  "+short(x.action,80)+" · sursă "+short(x.firstEpisode,80)+
    " · dovezi "+x.support).join("\n");
  msg("atlasCharResults",[
   "CORECTUDINE CARACTERE, DOAR DUPĂ PREDICȚIE:",
   "Exacți: "+(a.length===b.length&&first===-1),
   "Caractere la poziția corectă: "+correct+" / "+b.length+
    " ("+(100*correct/Math.max(1,b.length)).toFixed(2)+"%)",
   "Primul caracter greșit: "+(first>=0?first:"NICIUNUL"),
   "Caracter AȘTEPTAT: "+JSON.stringify(b[first]??null)+
    " · U+"+(b[first]?.codePointAt(0).toString(16).toUpperCase()??"—"),
   "Caracter PREZIS: "+JSON.stringify(a[first]??null)+
    " · U+"+(a[first]?.codePointAt(0).toString(16).toUpperCase()??"—"),
   "Traseul ales de Discoverer: "+selected.length+
    " acțiuni; motiv principal de eșec: "+r.diagnosis,
   "Ultimele acțiuni care au condus la răspuns:\n"+(recent||"NICIUN TRASEU"),
   "Predicție: "+(r.predictedBeforeAction??"ABSTENȚIE"),
   "Referință: "+reference,
   "ATENȚIE: dacă textul așteptat conține un caracter absent din această pagină,",
   "nu rezultă că lipsește din TOATĂ memoria. Exportă atlasul complet pentru verificare.",
   "Acest evaluator nu trimite NICIODATĂ referința corectă la Brain."
  ].join("\n"));
 };
 $("atlasExport").onclick=async()=>{
  if(S.exporting)return;
  S.exporting=true;$("atlasExport").disabled=true;
  const originalText=$("atlasExport").textContent;
  const chunks=[],header={kind:"V31-original-Brain-ALL-RETAINED-ATLAS",
    createdAt:new Date().toISOString(),
    source:"native original V17 Brain; NO fabricated evidence",
    sections:parts,referenceWasNeverTransferred:true};
  chunks.push(JSON.stringify({type:"header",...header})+"\n");
  try{
   // A concurrent training update invalidates a paged export. Detect changes
   // and FAIL, rather than silently mixing different model generations.
   const initial=await fetchPage({section:"nodes",offset:0,limit:1,withGoal:false});
   const stamp=x=>JSON.stringify({
    generation:x.summary?.atlasGeneration,
    observed:x.summary?.designLimits?.observationMemory,
    causal:x.summary?.designLimits?.causalMemory,
    nodes:x.summary?.retainedNodes,
    operators:x.summary?.operatorHypotheses,
    qa:x.summary?.qaLongFormEpisodes,
    verified:x.summary?.walkableVerifiedEdges,
    proposed:x.summary?.proposedButUnverifiedEdges,
    textOnly:x.summary?.chronologicalTextLinksNotWalkable,
    cross:x.summary?.crossWorldObservations
   });
   const identity=stamp(initial);
   for(const section of parts){
    let offset=0,pages=0;
    do{
     const j=await fetchPage({section,offset,limit:300,withGoal:false});
     if(stamp(j)!==identity)
      throw Error("Memoria Brain s-a schimbat în timpul exportului. Pune Pauză și repetă; nu pot pretinde un atlas complet.");
     chunks.push(...j.page.items.map((item,i)=>
      JSON.stringify({section,index:offset+i,evidence:item})+"\n"));
     offset=j.page.nextOffset;
     pages++;
     if(pages>30000)throw Error("Limită de paginare atinsă; exportul nu este complet.");
     $("atlasExport").textContent="Export "+section+": "+offset+"/"+j.page.total;
    }while(offset!==null);
   }
   chunks.push(JSON.stringify({type:"complete",generationStable:true,
    sections:parts,summary:initial.summary})+"\n");
   const blob=new Blob(chunks,{type:"application/x-ndjson"});
   const link=document.createElement("a");link.href=URL.createObjectURL(blob);
   link.download="MagicPerspective-V31-complete-retained-path-atlas.jsonl";
   document.body.append(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(link.href),10000);
   msg("atlasConnection","Export complet al dovezilor REȚINUTE. Evicțiile rămân raportate.");
  }catch(e){msg("atlasConnection","EXPORT INCOMPLET / NEEMIS: "+e.message);}
  finally{S.exporting=false;$("atlasExport").disabled=false;
   $("atlasExport").textContent=originalText;}
 };
 draw();void refresh({reset:true});
})();
