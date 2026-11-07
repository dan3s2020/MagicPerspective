// V24: visualize ONLY server-returned ORIGINAL Discoverer.shape paths
// and the real character-level graph learned from corpus contrasts.
// No simulated training, no synthesized answer, no pre-seeded worlds.
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 if(!$("v24CharacterBox"))return;
 const cv=$("v24CharacterCanvas"),ctx=cv.getContext("2d");
 let result=null;
 function draw(){
  const rect=cv.getBoundingClientRect(),scale=Math.min(2,window.devicePixelRatio||1),
        w=Math.max(320,Math.round(rect.width)),h=Math.max(230,Math.round(rect.height));
  cv.width=Math.round(w*scale);cv.height=Math.round(h*scale);
  ctx.setTransform(scale,0,0,scale,0,0);ctx.fillStyle="#08141e";ctx.fillRect(0,0,w,h);
  const graph=result?.after?.wholeAtlas;
  if(!graph?.states?.length){
    ctx.fillStyle="#b4d2e7";ctx.font="13px ui-monospace,monospace";
    ctx.fillText("Niciun graf de caractere primit de la Brain.",18,34);return;
  }
  const offset=Math.max(0,Math.min(Number($("v24CharOffset").value)||0,graph.states.length-1)),
        count=Math.min(140,graph.states.length-offset),map=new Map();
  const cols=Math.max(3,Math.floor(w/140)),rows=Math.ceil(count/cols);
  for(let i=0;i<count;i++)map.set(offset+i,{
    x:24+(w-48)*(i%cols+.4)/cols,
    y:25+(h-60)*(Math.floor(i/cols)+.4)/Math.max(1,rows)
  });
  const pred=result.after.predictedActions||[],route=new Set();
  for(const step of pred){
    const from=graph.states.indexOf(step.from),to=graph.states.indexOf(step.to);
    if(from>=0&&to>=0)route.add(from+":"+to);
  }
  let shown=0;for(const [from,a]of map)for(const edge of graph.neighbors[from]||[]){
    const b=map.get(edge.to);if(!b)continue;
    const selected=route.has(from+":"+edge.to);
    ctx.strokeStyle=selected?"#ffce68":edge.verified?"#56ddaf":"#696ecc";
    ctx.lineWidth=selected?2.7:1.0;ctx.beginPath();ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);ctx.stroke();shown++;
  }
  const goals=new Set(graph.targets||[]);
  for(const [idx,p]of map){
    ctx.fillStyle=goals.has(idx)?"#39dfae":idx===0?"#eff8ff":"#a4bde1";
    ctx.beginPath();ctx.arc(p.x,p.y,goals.has(idx)?6:4,0,Math.PI*2);ctx.fill();
    ctx.font="10px ui-monospace,monospace";ctx.fillStyle="#dceaf4";
    ctx.fillText(idx+" "+String(graph.states[idx]).slice(0,22),p.x+7,p.y-8);
  }
  ctx.fillStyle="#aac6d8";ctx.font="11px ui-monospace,monospace";
  ctx.fillText("Noduri "+offset+"-"+(offset+count-1)+" din "+graph.states.length+
    " | muchii afisate "+shown+" | TOTAL disponibil in atlasul JSONL",13,h-9);
 }
 function status(s){
  if(!s)return;
  $("v24CharacterStatus").textContent=
    "NIVEL CARACTERE UNICODE (original V17 invata separat):\n"+
    "Contraste observate si proiectate: "+s.observedWordContrastEvents+
    "\nReguli caracter induse: "+s.totalCharacterRuleClasses+
    "\nReguli transferabile intre lumi (>=2 contexte): "+s.admittedCrossWorldRuleClasses+
    "\nContraste multi-caracter fara operator sigur: "+s.unsupportedMultiCharacterContrasts+
    "\nContexte efectiv confirmate prin actiune: "+s.verifiedActionContexts+
    "\nMetoda de navigare: "+s.originalNavigator+
    "\nAceste date sunt din documentele reale, NU dintr-un corpus de demo.";
 }
 function report(data){
  const a=data.after,b=data.before;
  $("v24CharBefore").textContent="INAINTE (fara puntea de caractere; harta V23 pe cuvinte): "+
    (b.found?"CALE GASITA":"BLOCAT")+
    "\nCauza: "+b.reason+
    "\nDovezi disponibile pentru acest nivel: "+
      b.diagnostics.admittedCrossWorldClasses+
    "\nTransformari lipsa: "+JSON.stringify(b.diagnostics.missingGoalCharacterPaths||[])+"\n"+
    "Date brute pentru acest experiment: "+JSON.stringify(b.diagnostics,null,2);
  const route=(a.predictedActions||[]).map((e,i)=>
    (i+1)+". "+e.from+" --"+e.action+"--> "+e.to+
    (e.verified?" [VERIFICAT]":" [IPOTEZA NEEXECUTATA]"));
  $("v24CharAfter").textContent="DUPA (transfer între exerciții, ORIGINAL Discoverer.shape): "+
    (a.found?"TRASEU CANDIDAT GASIT":"INCA BLOCAT")+
    "\nForma solutiei prezisa INAINTE de actiune:\n"+
    (route.join("\n")||"(niciun pas)")+
    "\nMetoda: "+a.method+
    "\nHarta cunoscuta fara trunchiere: "+a.completeKnownGraph+
    "\nRaspuns semantic corect din prima: NECERTIFICAT";
  $("v24CharMissing").textContent="DIAGNOSTIC ARHITECTURAL:\n"+
    JSON.stringify(a.diagnostics,null,2)+
    "\n\nUn traseu catre scopul EXPLICIT nu dovedeste ca organismul a ghicit un raspuns necunoscut."+
    "\n\nPentru toate caiile si rezultatele: V23 -> Export integral JSONL.";
  status(data.characterAtlas);draw();
 }
 $("v24CharEvaluate").onclick=async()=>{
  const button=$("v24CharEvaluate");
  let slots;
  try{
   slots=JSON.parse($("v24CharGoal").value);
   if(!slots||Array.isArray(slots)||typeof slots!=="object"||!Object.keys(slots).length)
     throw Error("Trebuie sa introduci o tinta explicita {index: caracter}");
   if(!$("v24CharInitial").value)throw Error("Textul trebuie sa provina din problema reala, nu un demo presetat");
  }catch(err){$("v24CharMissing").textContent="EROARE intrare: "+err.message;return;}
  button.disabled=true;
  $("v24CharAfter").textContent="Calculez campul original pe TOATA harta cunoscuta accesibila, inghetat...";
  try{
   const body={w:Number($("v23AtlasWorker")?.value)||0,
    initial:$("v24CharInitial").value,goal:{charSlots:slots},
    maxNodes:Number($("v24CharNodes").value),maxDepth:Number($("v24CharDepth").value),
    temperature:Number($("v24CharNoise").value),seed:74129};
   const response=await fetch("/character-eval",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(body)});
   const data=await response.json();
   if(data.error)throw Error(data.error);
   result=data;report(data);
  }catch(err){$("v24CharAfter").textContent="EROARE: "+err.message;
   $("v24CharBefore").textContent="Nicio predictie certificata pentru aceasta cerere.";
  }finally{button.disabled=false;}
 };
 $("v24CharOffset").onchange=draw;
 $("v24AnalyzeOriginalWriter").onclick=()=>{
   const button=$("cpuExactEvaluate");
   if(!button){
     $("v24OriginalAnswerForensic").textContent="Eroare: evaluatorul original V17/Q&A nu este activ.";
     return;
   }
   $("v24OriginalAnswerForensic").textContent=
     "Evaluez raspunsuri complete REAL NEVAZUTE; forma originala este generata INAINTE de compararea cu adevarul...";
   button.click();
 };
 window.addEventListener("v24-original-v17-forensics",ev=>{
   const r=ev.detail,summary=r.forensicSummary||{},all=r.forensics||[];
   const text=[
     "V17 ORIGINAL -- raspunsuri inghetate, nu predicator nou.",
     "Procent forma initiala (shapeSame) = "+(100*summary.originalMeanShapeSame).toFixed(3)+"%",
     "Raspunsuri intregi corecte din prima = "+(r.firstAnswerExactCorrect??0)+"/"+(r.firstAnswerExactTotal??0),
     "Pozitii ratate TOTAL = "+summary.totalMispositions,
     "Pozitii analizate post-hoc = "+summary.examinedPostHocOnly,
     "ATENTIE: reparatia POST-HOC foloseste raspunsul de referinta DOAR pentru diagnostic, NU in predictia originala!",
     ""
   ];
   for(let i=0;i<all.length;i++){
     const x=all[i];
     text.push("=== EXERCITIUL NEVAZUT "+(i+1)+" ===");
     text.push("Forma prezisa DIN PRIMA (V17): "+JSON.stringify(x.originalGeneratedBeforeReference));
     text.push("Raspunsul real (citit DUPA): "+JSON.stringify(x.actualReferenceExaminedAfterGeneration));
     text.push("Caractere corecte: "+x.correctOriginalPositions+"/"+x.referenceLength);
     text.push("Zone gresite integrale: "+JSON.stringify(x.allMismatchSpans));
     text.push("Pozitii gresite: "+x.totalAllMismatchedPositions+
       "; explicate cu atlasul: "+x.explainedPositions+
       "; neanalizate computational: "+x.unexaminedMismatchPositions);
     for(const p of (x.examples||[])){
       text.push("index "+p.index+" | prezis "+JSON.stringify(p.predicted)+
         " | real "+JSON.stringify(p.expected)+" | "+p.pathStatus+
         " | traseu POST-HOC "+JSON.stringify((p.postHocCandidatePath||[]).map(t=>t.to))+
         " | lipsa "+JSON.stringify(p.missingCharacterPaths||[]));
     }
     text.push("");
   }
   $("v24OriginalAnswerForensic").textContent=text.join("\n");
   // Route evidence for each original error is recorded in the ORIGINAL
   // append-only JSONL atlas by the frozen native evaluator, not by this UI.
 });
 window.addEventListener("resize",draw);
 // Existing app.js drives live snapshots; we merely consume the real graph.
 window.addEventListener("v24-character-status",e=>status(e.detail));
 draw();
})();
