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
    const qaPercent=(n,d)=>d>0?(100*n/d).toFixed(2)+"%":"—";
    setNum("qaLearned",m.qaLearnedPairs??null);
    setNum("qaAxes",m.qaRoleWitnessedAxisEdges??null);
    setNum("qaHeldout",m.qaFrozenHeldoutQuestions??null);
    setNum("qaLongEpisodes",m.qaLongFormEpisodes??null);
    setNum("qaLongTokens",m.qaLongFormAnswerTokens??null);
    setNum("qaLongEdges",m.qaLongFormSequentialEdges??null);
    setNum("qaLongActive",m.qaLongFormActiveChunkDigests??null);
    const cumulative=m.crossMazeMemory||{};
    setNum("cumEpisodes",cumulative.episodes??null);
    setNum("cumVerified",cumulative.physicallyVerifiedEdges??null);
    setNum("cumNodes",cumulative.memoryNodes??null);
    setNum("cumProposed",cumulative.proposedEdges??null);
    setNum("cumShared",cumulative.multiScaleSharedAnchors??null);
    setNum("cumLongShared",cumulative.sharedExactChunkAnchors??null);
    setNum("cumMotifEdges",cumulative.multiScaleObservedSourceEdges??null);
    setNum("cumWalls",cumulative.rejectedActions??null);
    const atlas=m.atlasTotals||{};
    setNum("atlasAttempts",atlas.attemptsTotal??null);
    setNum("atlasFound",atlas.successesTotal??null);
    setNum("atlasFailed",atlas.failuresTotal??null);
    setNum("atlasPhysical",atlas.physicallyTraversableNow??null);
    setNum("atlasGuesses",atlas.proposedEdges??null);
    setNum("atlasAnchors",atlas.sharedPhraseAnchors??null);
    document.documentElement.dataset.cumulativeCrossWorldEpisodes=
      String(cumulative.episodes??0);
    document.documentElement.dataset.cumulativeSharedAnchors=
      String(cumulative.multiScaleSharedAnchors??0);
    $("qaExact").textContent=qaPercent(m.qaFrozenWholeRawExact,m.qaFrozenHeldoutQuestions);
    $("qaCanonical").textContent=qaPercent(m.qaFrozenWholeCanonicalExact,m.qaFrozenHeldoutQuestions);
    $("qaCoverage").textContent=qaPercent(m.qaFrozenGoalsFound,m.qaFrozenHeldoutQuestions);
    document.documentElement.dataset.qaWholeExact=String(m.qaWholeAnswerExactRate??"unmeasured");
    document.documentElement.dataset.qaHeldout=String(m.qaFrozenHeldoutQuestions??0);
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
// A separate experiment on the SAME original native Brain and the SAME
// physical observed-Q/A graph. No answer, target tokens or reference are sent.
$("qaPlan").addEventListener("click",async()=>{
 if(state.busy)return;
 const question=$("qaQuestion").value.trim();
 if(!question||question.length>4000){
  $("qaPrediction").textContent="Introdu doar întrebarea (1–4.000 caractere).";
  return;
 }
 state.busy=true;$("qaPlan").disabled=true;
 try{
  const params=new URLSearchParams({question,execute:"1"});
  const result=await getJson("/native-qa?"+params.toString(),{method:"POST"});
  if(result.referenceAnswerProvided!==false||
     result.plannedBeforeFirstAction!==true||
     result.originalPlanner!=="Discoverer.shapeGraph")
   throw Error("NATIVE QA must be frozen, answer-free and driven by original Discoverer.shapeGraph");
  if(!result.found){
   $("qaPrediction").textContent="CREIERUL REFUZĂ: "+String(result.reason)+
    "\nNu există dovadă suficientă pentru un traseu. Fără răspuns inventat.";
   say("Lumea Q/A nu are încă suficiente tranziții învățate.",true);
   return;
  }
  state.plan={
   ...result,kind:result.originalPlanner,required:[],
   body:{frames:(result.body?.frames||[]).map((actual,i,list)=>({
     stage:i?"after-action":"before-first-action",actual,
     expected:result.initialShape?.[i]||null,
     goalReached:i===list.length-1
   })),replans:0}
  };
  state.topology=result.topology;
  state.frame=0;state.playing=!!state.plan.body.frames.length;
  state.lastTick=performance.now();state.dataVersion++;
  state.idByText=new Map((state.topology?.nodes||[]).map(n=>[n.text,n.id]));
  setNum("nodes",state.topology?.nodes?.length??null);
  setNum("edges",state.topology?.edges?.length??null);
  setNum("steps",result.actions?.length??null);
  $("goal").textContent="Învățată";
  $("frame").max=String(Math.max(0,state.plan.body.frames.length-1));
  $("frame").value="0";
  $("truth").textContent="Țintă construită DIN ÎNTREBARE + efecte Q/A învățate; evaluare semantică externă încă necesară";
  $("predicted").textContent=(result.initialShape||[]).map((x,i)=>i+" → "+x).join("\n\n");
  $("qaPrediction").textContent="RĂSPUNS COMPLET PREZIS ÎNAINTE DE ACȚIUNE:\n"+
   result.predicted+"\n\nTRASEU CAUZAL:\n"+
   (result.trace||[]).map((v,i)=>(i+1)+". "+v.from+"\n  "+JSON.stringify(v.action)+
   "\n  → "+v.to+" (V="+v.value+")").join("\n")+
   "\n\nRăspuns de referință transmis: NU.\nValidare semantică externă în această întrebare: NU.";
  refreshFrame();draw();
  say("Traseul original a fost construit înainte de acțiune din efectele Q/A reale.");
 }catch(error){
  $("qaPrediction").textContent="EROARE: "+error.message;say(error.message,true);
 }finally{state.busy=false;$("qaPlan").disabled=false;}
});
// V30 original single-Brain CUMULATIVE world graph from ALL previous
// observations, never a new demo. GOLD path is frozen BEFORE any physical
// action. Inferred edges are not represented as physically verified.
$("cumPlan").addEventListener("click",async()=>{
 if(state.busy)return;
 const mode=$("cumMode").value,start=$("cumStart").value.trim(),
  depth=$("cumDepth").value,budget=$("cumBudget").value;
 const required=$("cumRequired").value.split(",").map(x=>x.trim()).filter(Boolean);
 const numericInputs=$("cumNumericInputs").value.trim();
 if(!start||start.length>4000){
  $("cumEvidence").textContent="Starea inițială trebuie să aibă între 1 și 4.000 caractere.";
  return;
 }
 if(mode==="numeric"&&!numericInputs){
  $("cumEvidence").textContent="Specifică NUMAI coordonatele de intrare: 0:8,2:7. Nu oferi rezultatul dependent.";
  return;
 }
 if(mode!=="numeric"&&mode!=="question"&&(!required.length||required.length>16)){
  $("cumEvidence").textContent="Pentru text, oferă 1–16 tokeni ai obiectivului; nu răspunsul complet.";
  return;
 }
 state.busy=true;$("cumPlan").disabled=true;
 $("cumEvidence").textContent="Construiesc topologia din toate experiențele memorate de originalul Brain...";
 try{
  const qs=mode==="question"?
   new URLSearchParams({question:start,depth,budget,topology:"1"}):
   mode==="numeric"?
   new URLSearchParams({start,inputs:numericInputs,depth,budget,topology:"1"}):
   new URLSearchParams({start,required:required.join(","),depth,budget,
    inferred:mode==="inferred"?"1":"0",topology:"1"});
  const url=(mode==="question"?"/native-cumulative-question?":
   mode==="numeric"?"/native-cumulative-numeric?":"/native-cumulative?")+qs;
  const result=await getJson(url,{method:"POST"});
  if(result.originalPlanner!=="Discoverer.shapeGraph"||
   result.referenceAnswerProvided!==false||
   result.plannedBeforeFirstAction!==true)
   throw Error("Originalul Discoverer nu a confirmat planificarea globală fără răspuns");
  if(!result.found){
   $("cumEvidence").textContent="NICIO CALE CERTIFICATĂ: "+
    String(result.reason)+"\n\nMEMORIE REALĂ:\n"+
    JSON.stringify(result.memory||result.graph||{},null,2)+
    "\n\nLipsa dovezilor NU înseamnă că legătura nu există; organismul nu a învățat-o încă.";
   say("Labirintul cumulativ nu conține încă o cale către această țintă.",true);
   return;
  }
  state.plan={...result,kind:"native-accumulated-real-topology",
   body:{frames:[],replans:0}};
  state.topology=result.topology||null;
  state.frame=0;state.playing=false;state.dataVersion++;
  state.idByText=new Map((state.topology?.nodes||[]).map(n=>[n.text,n.id]));
  setNum("nodes",state.topology?.nodes?.length??null);
  setNum("edges",state.topology?.edges?.length??null);
  setNum("steps",result.steps);
  $("goal").textContent=mode==="question"&&result.goalLearnedFromQuestion?
   "Țintă descoperită din întrebare":"Formă găsită";
  $("frame").max="0";$("frame").value="0";
  $("truth").textContent="Forma a fost prezisă, execuția fizică încă NU a fost efectuată. Verificarea externă rămâne necesară.";
  $("predicted").textContent="FORMA ORIGINALĂ ÎNAINTE DE PRIMA ACȚIUNE\n"+
   (result.initialShape||[]).map((x,i)=>i+" → "+x).join("\n\n");
  $("actual").textContent="Corpul NU s-a mișcat încă.\n"+
   "Graf vizualizat: stări/muchii observate, respectiv ipoteze etichetate.\n"+
   "Acest rezultat este PREZICȚIE, nu execuție simulată.";
  const items=result.actions||[];
  $("cumEvidence").textContent=
   "TRASEU COMPLET: "+result.steps+" transformări; "+
   (result.pathContainsInferredEdges?"CONȚINE IPOTEZE NEVERIFICATE":"FIZIC VERIFICAT ÎN EXPERIENȚE")+
   "\n\n"+items.map((x,i)=>String(i+1)+". "+
    (x.before??x.from)+"\n   prin "+String(x.action??x.actionId??x.kind)+
    " → "+String(x.after??x.to)+
    "\n   dovadă: "+String(x.edgeStatus??x.status??"learned-inferred")+
    " · suport "+String(x.observedSupport??x.observedTrainingPairs??"n/a")).join("\n\n")+
   "\n\nMEMORIE / AXE / LIMITE:\n"+
   JSON.stringify(result.memory||result.graph||{},null,2)+
   (mode==="question"?"\n\nȚINTĂ ÎNVĂȚATĂ DIN ÎNTREBARE: "+
    String(result.goalLearnedFromQuestion===true)+
    " · exemple Q/A observate: "+String(result.sourceWitnessedQuestionAnswerExamples)+
    " · fără numărul-răspuns în obiectiv":"")+
   "\n\nRĂSPUNS COMPLET INFERAT:\n"+String(result.predicted)+
   "\n\nAcuratețe semantică generală: NEDEMONSTRATĂ.";
  refreshFrame();draw();
  say("Am compus o cale din mai multe lumi; " +
   (result.pathContainsInferredEdges?
    "conține tranziții ce trebuie confirmate în lumea reală.":
    "muchiile din traseu au dovezi fizice independente."));
 }catch(error){
  $("cumEvidence").textContent="EROARE REALĂ: "+error.message;
  say(error.message,true);
 }finally{state.busy=false;$("cumPlan").disabled=false;}
});
// V30 FULL REAL-OBSERVATION ATLAS. These pages are served directly from
// original Brain.v8 evidence; never synthesize a node, solve a path, or
// pretend adjacent text windows are causally verified world movements.
const atlasUI={view:"attempts",filter:"all",search:"",offset:0,
 last:null,busy:false,selectedId:null};
async function atlasPage(params={}){
 const query=new URLSearchParams({
  view:params.view??atlasUI.view,
  filter:params.filter??atlasUI.filter,
  search:params.search??atlasUI.search,
  offset:String(params.offset??atlasUI.offset),
  limit:String(params.limit??50)
 });
 if(params.attemptId!==undefined&&params.attemptId!==null)
  query.set("attemptId",String(params.attemptId));
 const data=await getJson("/native-atlas?"+query);
 if(data.ok!==true||data.sameNativeBrain!==true||
    data.originalPlanner!=="Discoverer.shapeGraph")
  throw Error("Atlas must come from ONE original Brain and its real historical evidence");
 return data;
}
function atlasSummary(data){
 const m=data.memory||{},c=data.comparison||{};
 setNum("atlasAttempts",m.attemptsTotal??null);
 setNum("atlasFound",m.successesTotal??null);
 setNum("atlasFailed",m.failuresTotal??null);
 setNum("atlasPhysical",m.physicallyTraversableNow??null);
 setNum("atlasGuesses",m.proposedEdges??null);
 setNum("atlasAnchors",m.sharedPhraseAnchors??null);
 $("atlasComparison").textContent=
  "Din toate încercările păstrate: găsite "+nfmt(c.foundRetained)+
  ", negăsite "+nfmt(c.failedRetained)+
  "\\nTrasee compuse doar din acțiuni fizic confirmate: "+
  nfmt(c.fullyPhysicalRoutes)+
  "\\nTrasee care conțin transformări propuse: "+
  nfmt(c.withInferredEdges)+
  "\\nTotal istoric (inclusiv ieșite din jurnal): "+
  nfmt(m.attemptsTotal)+
  "\\nÎncercări ieșite din memoria limitată: "+nfmt(m.attemptsEvicted)+
  "\\n\\nNu declarăm că sunt cunoscute toate căile posibile.";
 $("atlasMissing").textContent=
  (c.reasons||[]).slice(0,22).map(x=>String(x.count)+" × "+x.code+
   " ["+x.kind+"]\\n  "+x.explanation+
   "\\n  exemple încercări #"+(x.exampleAttemptIds||[]).join(",")).join("\\n\\n")||
  "Nu există încă încercări cu motive diagnosticate. Lipsa dovezilor nu este un perete fizic demonstrat.";
}
function atlasPrintEntry(entry){
 if(Object.hasOwn(entry,"outcome"))
  return "#"+entry.id+" "+(entry.found?"TRASEU GĂSIT":"TRASEU NEGĂSIT")+
   " · "+entry.kind+" · "+entry.actions+" acțiuni"+
   (entry.inferred?" · CONȚINE IPOTEZE":"")+
   "\\n"+entry.start+"  →  "+JSON.stringify(entry.goalTerms)+
   "\\n"+(entry.reason||"dovezi existente în memoria originală");
 if(Object.hasOwn(entry,"status"))
  return String(entry.status)+" · "+String(entry.from??entry.key??entry.id??"")+
   " → "+String(entry.to??"")+
   " · "+String(entry.action??entry.role??"")+
   (entry.observedSupport?" · suport "+entry.observedSupport:"");
 if(Object.hasOwn(entry,"code"))
  return entry.code+" · "+entry.kind+" · încercarea #"+
    String(entry.attemptId)+"\\n"+entry.explanation;
 return JSON.stringify(entry);
}
function atlasDrawHistoricTrace(selected){
 // Only the stored historical path edges, not a fictional full maze!
 // No 5D coordinates are invented for a historical trace.
 const trace=selected?.trace||[];
 if(!selected?.found||!trace.length)return;
 const nodes=[],edges=[],byText=new Map(),route=[];
 const ensure=(text)=>{
  if(byText.has(text))return byText.get(text);
  const id=nodes.length;byText.set(text,id);
  nodes.push({id,text,depth:id,goal:false,kind:0,
   observed:false,position5D:null,potential:null});
  return id;
 };
 for(let i=0;i<trace.length;i++){
  const t=trace[i],from=ensure(t.from),to=ensure(t.to);
  if(!i)route.push(from);
  edges.push({from,to,action:t.action,status:t.status,
   observedSupport:t.observedSupport||0,
   evidenceEpisode:t.episode});
  nodes[to].potential=t.value;route.push(to);
 }
 nodes[route[0]].kind=3;nodes[route.at(-1)].kind=2;
 nodes[route.at(-1)].goal=true;
 state.topology={complete:false,sourceId:route[0],
  originalNativeV17Graph:true,nodes,edges,initialShapeIds:route,
  source:"HISTORICAL STORED TRACE ONLY — NOT all explored states",
  historicalTraceOnly:true,coordinatesAreOriginalLearned5DTorus:false};
 state.plan={kind:"atlas-original-historical-path",found:true,
  predicted:trace.at(-1)?.to,body:{frames:[],replans:0}};
 state.frame=0;state.playing=false;state.dataVersion++;
 state.idByText=new Map(nodes.map(n=>[n.text,n.id]));
 setNum("nodes",nodes.length);setNum("edges",edges.length);
 setNum("steps",trace.length);$("goal").textContent="Traseu istoric";
 $("truth").textContent="Numai muchiile traseului istoric reținut; poziții 5D indisponibile. Restul grafului este disponibil separat prin paginare.";
 draw();
}
function atlasShowAttempt(attempt){
 if(!attempt)return;
 atlasUI.selectedId=attempt.id;
 $("atlasSelected").textContent=
  "ÎNCERCARE ORIGINALĂ #"+attempt.id+" · "+attempt.outcome+
  "\\nSTART:\\n"+attempt.start+
  "\\nOBIECTIV / INPUTURI: "+JSON.stringify(attempt.goalTerms)+
  "\\nRAȚIUNE: "+(attempt.reason||"traseu găsit")+
  "\\n\\nFIECARE TRANSFORMARE (max. 128 păstrate per încercare):\\n"+
  (attempt.trace||[]).map(a=>
   (a.order+1)+". "+a.from+"\\n    "+a.action+" → "+a.to+
   "\\n    "+a.status+" · observație #"+(a.episode||"fără episod")+
   " · suport "+String(a.observedSupport??"necunoscut")+
   " · câmp "+String(a.value??"necunoscut")).join("\\n\\n")+
  "\\n\\nDE CE A FUNCȚIONAT SAU NU:\\n"+
  (attempt.diagnostics||[]).map(d=>d.code+
   " ["+d.kind+"] "+d.explanation).join("\\n")+
  "\\n\\nNoduri explorate: "+String(attempt.graph?.reachableStates)+
  ", trunchiat la limită: "+String(attempt.graph?.expansionTruncated)+
  ". Traseul păstrat nu este o execuție semantică independent verificată.";
 if(attempt.found)atlasDrawHistoricTrace(attempt);
 else{state.topology=null;state.plan=null;state.dataVersion++;draw();}
}
function renderAtlasRows(data){
 atlasSummary(data);
 $("atlasPage").textContent=(data.total?
   (data.offset+1)+"–"+Math.min(data.offset+data.rows.length,data.total):
   "0")+" / "+data.total+" · "+data.view+
   " · paginat (max. 200 rezultate/pagină)";
 $("atlasPrev").disabled=data.offset<=0;
 $("atlasNext").disabled=data.nextOffset===null;
 const root=$("atlasRows");root.replaceChildren();
 if(!data.rows.length){root.textContent="Nicio înregistrare păstrată pentru acest filtru.";return;}
 for(const entry of data.rows){
  const item=document.createElement("button");
  item.type="button";item.style.display="block";item.style.width="100%";
  item.style.textAlign="left";item.style.whiteSpace="pre-wrap";
  item.style.padding="9px";item.style.margin="2px 0";
  item.className="atlas-row";
  item.textContent=atlasPrintEntry(entry);
  if(entry.found===false||String(entry.status).includes("block"))
   item.style.borderLeft="3px solid #f0809a";
  if(entry.found===true||entry.status==="physically-verified")
   item.style.borderLeft="3px solid #67deab";
  if(entry.status==="inferred-unverified"||entry.status==="hypothesis")
   item.style.borderLeft="3px dashed #f0c87a";
  item.addEventListener("click",async()=>{
   const id=entry.id??entry.attemptId;
   if(!id||!["attempts","diagnostics"].includes(data.view)){
    $("atlasSelected").textContent=JSON.stringify(entry,null,2)+
     "\\n\\nAceasta este o dovadă de memorie, nu o cale semantică demonstrată.";
    return;
   }
   try{
    const selected=await atlasPage({view:"attempts",filter:"all",
     search:"",offset:0,limit:1,attemptId:id});
    atlasShowAttempt(selected.selectedAttempt);
   }catch(err){$("atlasSelected").textContent="Eroare citire din Brain: "+err.message;}
  });
  root.appendChild(item);
 }
}
async function loadRealAtlas(offset=0){
 if(atlasUI.busy)return;
 atlasUI.busy=true;$("atlasLoad").disabled=true;
 try{
  atlasUI.view=$("atlasView").value;
  atlasUI.filter=$("atlasFilter").value;
  atlasUI.search=$("atlasSearch").value.trim();
  const data=await atlasPage({offset});
  atlasUI.offset=data.offset;atlasUI.last=data;
  renderAtlasRows(data);
  say("Atlas nativ: "+data.total+" dovezi reale păstrate în categoria selectată.");
 }catch(error){
  $("atlasRows").textContent="ATLAS indisponibil: "+error.message;
  say("Nu am reușit să citesc atlasul real din Brain.",true);
 }finally{atlasUI.busy=false;$("atlasLoad").disabled=false;}
}
$("atlasLoad").addEventListener("click",()=>loadRealAtlas(0));
$("atlasPrev").addEventListener("click",()=>loadRealAtlas(Math.max(0,atlasUI.offset-50)));
$("atlasNext").addEventListener("click",()=>{
 if(atlasUI.last?.nextOffset!==null&&atlasUI.last?.nextOffset!==undefined)
  loadRealAtlas(atlasUI.last.nextOffset);
});
for(const id of ["atlasView","atlasFilter"])
 $(id).addEventListener("change",()=>loadRealAtlas(0));
$("atlasSearch").addEventListener("keydown",e=>{
 if(e.key==="Enter")loadRealAtlas(0);
});
// Export ALL retained records in every view: the browser follows every
// page until nextOffset=null. Do not silently cut off old paths, or invent
// absent evidence. The checkpoint explicitly reports its eviction totals.
$("atlasExport").addEventListener("click",async()=>{
 if(atlasUI.busy)return;
 atlasUI.busy=true;const btn=$("atlasExport");btn.disabled=true;
 try{
  const evidence={origin:"ORIGINAL MagicPerspective V17 Brain",views:{},
   scope:"bounded retained evidence only, not all logically possible routes"};
  for(const view of ["attempts","diagnostics","nodes","edges","motifs","motifEdges"]){
   const all=[];let offset=0,first=true;
   for(;;){
    const data=await atlasPage({view,filter:"all",search:"",
     offset,limit:200});
    if(first){evidence.memory=data.memory;
     evidence.provenance=data.provenance;
     evidence.comparison=data.comparison;first=false;}
    all.push(...data.rows);
    $("atlasPage").textContent="Export real: "+view+" "+
     all.length+" / "+data.total+" dovezi...";
    if(data.nextOffset===null)break;
    if(data.nextOffset<=offset)throw Error("Invalid pagination cursor in Brain atlas");
    offset=data.nextOffset;
   }
   evidence.views[view]=all;
  }
  const json=JSON.stringify(evidence,null,2);
  const url=URL.createObjectURL(new Blob([json],{type:"application/json"}));
  const link=document.createElement("a");link.href=url;
  link.download="MagicPerspective_V30_Original_Brain_Retained_Atlas.json";
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),12000);
  $("atlasPage").textContent="Atlas reținut exportat. Număr de înregistrări: "+
   Object.values(evidence.views).reduce((n,x)=>n+x.length,0)+
   ". Consultați eviction totals pentru dovezi mai vechi pierdute.";
 }catch(error){$("atlasPage").textContent="Export oprit: "+error.message;
  say("Exportul atlasului a eșuat; nu a fost substituit cu date fictive.",true);
 }finally{atlasUI.busy=false;btn.disabled=false;}
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
 // Verified edges are solid. Hypotheses are dashed and reddish; they are
 // NOT real walls/corridors until independent action feedback confirms them.
 for(const inferred of [false,true]){
  ctx.lineWidth=inferred?.9:.75;
  ctx.strokeStyle=inferred?"rgba(240,128,154,.30)":"rgba(102,204,231,.20)";
  ctx.setLineDash(inferred?[3,4]:[]);
  ctx.beginPath();
  for(const e of topology.edges){
   const status=String(e.status||"physically-verified");
   const guess=status.includes("inferred")||status.includes("hypothesis");
   if(guess!==inferred)continue;
   const a=points[e.from],b=points[e.to];
   if(!a||!b)continue;
   ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
  }
  ctx.stroke();ctx.setLineDash([]);
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
