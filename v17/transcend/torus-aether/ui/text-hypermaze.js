// REAL V17/V18 text-route explorer. No demo graph, no random/fabricated states.
// V18: exact learned Q/A prefix topology, preaction global plan and local steps.
// V17: frozen untouched text test, preanswer imagination vs teacher-forced
// next-character guesses vs hidden reference. The latter is NOT a traversable
// language maze or autonomous body movement.
import {observedLayout,frozenTextLayout,native5DSymbolLayout,project4D,routeDivergence} from "./hypermaze-geometry.mjs";
import {committedTrainingMaze} from "./hypermaze-live-training.mjs";
import {livingV17Trace} from "./hypermaze-native-live.mjs";
const $=id=>document.getElementById(id);
const overlay=$("hmOverlay"),cv=$("hmCanvas"),g=cv.getContext("2d");
let model=null,step=0,playing=null,busy=false,layout=null,torusLoading=false;
let camera={yaw:.45,pitch:.21,xw:.65,yw:-.27,zw:.25,zoom:1,panX:0,panY:0};
let pointer=null,lastPaint=0,raf=null;
let liveEnabled=true,liveInFlight=false,liveSequence=0,liveLastGraphAt=0,
  nativeStream=null,liveEpoch=0,liveAnimation=null,livePollTimer=null,livePaintTimer=null;
const fmt=n=>Number.isFinite(n)?Number(n).toLocaleString("ro-RO"):"—";
const pc=n=>Number.isFinite(n)?(100*n).toFixed(1)+"%":"—";
const cut=(s,max=120)=>String(s??"").length>max?String(s).slice(0,max)+"…":String(s??"");
const text=(id,val)=>$(id).textContent=String(val);
const num=id=>Number($(id).value)||0;
const open=()=>!overlay.hidden;
function updateHud(status){text("hmHud",status);}
function halt(){if(playing!==null){clearInterval(playing);playing=null;}text("hmPlay","▶ Replay fiecare acțiune");}
function activeRoute(){
 if(model?.kind==="observed")return model.pair.hybrid.pathNodes||[];
 if(model?.kind==="unseen")return model.layout.tracks[1]?.chars||[];
 return [];
}
function endStep(){return Math.max(0,activeRoute().length-(model?.kind==="observed"?1:0));}
function syncStep(i){
 step=Math.max(0,Math.min(endStep(),Math.trunc(i||0)));
 $("hmScrub").max=String(endStep());
 $("hmScrub").value=String(step);
 text("hmStepNum",fmt(step)+" / "+fmt(endStep()));
 explainStep();draw();
}
function clearView(){
 model=null;layout=null;halt();syncStep(0);
 for(const id of ["hmInitial","hmExecuted","hmAlternative","hmDeviation","hmRevisions","hmGoal"])text(id,"—");
 text("hmStepDetails","Nu există încă un traseu din backend.");
 text("hmMeaning","În V18 vezi stările învățate și navigarea locală. În V17 vezi forma inițială și predicțiile de lectură, nu deplasări printr-un graf navigabil.");
 text("hmProvenance","Nicio geometrie creată până la încărcarea unui rezultat real.");
}
function showOverlay(){
 if(!overlay.hidden)return;
 overlay.hidden=false;document.body.style.overflow="hidden";
 halt();draw();startLive();
 if(!liveEnabled&&!model&&lastFrozen?.result?.exercises?.length){
  try{showFrozenExercise(lastFrozen.result,0);}catch(err){updateHud("Evaluare V17: "+err.message);}
 }
 // Original tabs remain exactly as they were; no native handlers changed.
}
function hideOverlay(){
 halt();stopLiveAnimation();overlay.hidden=true;document.body.style.overflow="";
 if(livePollTimer!==null){clearInterval(livePollTimer);livePollTimer=null;}
 if(livePaintTimer!==null){clearInterval(livePaintTimer);livePaintTimer=null;}
 if(raf){cancelAnimationFrame(raf);raf=null;}
}
$("tabHypermaze").addEventListener("click",showOverlay);
$("hmClose").addEventListener("click",hideOverlay);
window.addEventListener("keydown",e=>{
 if(!open())return;
 if(e.key==="Escape")hideOverlay();
 else if(e.key==="ArrowRight"&&!e.target.matches("input,textarea,select")){e.preventDefault();halt();syncStep(step+1);}
 else if(e.key==="ArrowLeft"&&!e.target.matches("input,textarea,select")){e.preventDefault();halt();syncStep(step-1);}
 else if(e.key===" "&&!e.target.matches("input,textarea,select,button")){e.preventDefault();$("hmPlay").click();}
});
$("hmMode").addEventListener("change",()=>{
 if($("hmMode").value==="live"){enableLive(true);return;}
 enableLive(false);
 clearView();text("hmMeaning",$("hmMode").value==="observed"?
 "V18: navigare prin tranzițiile text învățate; preplan și cursor local reale.":
 "V17: forma din întrebare și predicțiile pe prefixe corecte; nu sunt acțiuni într-un labirint navigabil.");});
$("hmBrain").addEventListener("change",()=>{liveSequence=0;nativeStream=null;clearView();if(liveEnabled)pollLive();});
$("hmPrev").addEventListener("click",()=>{halt();syncStep(step-1);});
$("hmNext").addEventListener("click",()=>{halt();syncStep(step+1);});
$("hmRestart").addEventListener("click",()=>{halt();syncStep(0);});
$("hmScrub").addEventListener("input",()=>{halt();syncStep(num("hmScrub"));});
$("hmPlay").addEventListener("click",()=>{
 if(playing!==null){halt();return;}
 if(!model||endStep()===0)return;
 if(step>=endStep())syncStep(0);
 text("hmPlay","⏸ Oprește replay");
 playing=setInterval(()=>{
  if(!open()){halt();return;}
  syncStep(step+1);if(step>=endStep())halt();
 },145);
});
for(const [id,key] of [["hmXW","xw"],["hmYW","yw"],["hmZW","zw"],["hmZoom","zoom"]]){
 $(id).addEventListener("input",()=>{camera[key]=num(id);draw();});
}
$("hmSlice").addEventListener("input",draw);
$("hmSliceEnabled").addEventListener("change",draw);
$("hmPerspective").addEventListener("change",draw);
$("hmSpace").addEventListener("change",()=>{
 if($("hmSpace").value==="learned5")loadNativeGeometry();else{describeGeometry();draw();}
});
$("hmResetCamera").addEventListener("click",()=>{
 camera={yaw:.45,pitch:.21,xw:.65,yw:-.27,zw:.25,zoom:1,panX:0,panY:0};
 for(const [id,key] of [["hmXW","xw"],["hmYW","yw"],["hmZW","zw"],["hmZoom","zoom"]])
  $(id).value=String(camera[key]);
 $("hmSlice").value="1";$("hmSliceEnabled").checked=false;
 draw();
});
cv.addEventListener("pointerdown",e=>{pointer={x:e.clientX,y:e.clientY,yaw:camera.yaw,pitch:camera.pitch};cv.setPointerCapture?.(e.pointerId);});
cv.addEventListener("pointermove",e=>{
 if(!pointer)return;
 camera.yaw=pointer.yaw+(e.clientX-pointer.x)*.008;
 camera.pitch=pointer.pitch+(e.clientY-pointer.y)*.008;
 draw();
});
cv.addEventListener("pointerup",()=>pointer=null);
cv.addEventListener("pointercancel",()=>pointer=null);
cv.addEventListener("wheel",e=>{
 e.preventDefault();camera.zoom=Math.max(.2,Math.min(5,camera.zoom*(e.deltaY>0?.90:1.10)));
 $("hmZoom").value=String(camera.zoom);draw();
},{passive:false});
async function request(url,opts={}){
 const res=await fetch(url,{cache:"no-store",...opts});
 if(!res.ok)throw Error("HTTP "+res.status+" "+url);
 const json=await res.json();
 if(json.error)throw Error(json.error);
 return json;
}
function w(){return Math.max(0,Math.trunc(num("hmBrain")));}

function currentGeometry(){
 if(!model)return null;
 return $("hmSpace").value==="learned5"?model.native:model.layout;
}
function describeGeometry(){
 if(model?.kind==="native-stream"){
   text("hmSpaceStatus","V17 LIVE: simbolurile folosesc coordonatele 5D U[0..4] învățate real; nodurile A/C fără U au poziții vizuale calculate NUMAI din vecinii conectați. "+
    fmt(nativeStream?.countNative)+" simboluri native, "+
    fmt(nativeStream?.countProjected)+" noduri A/C proiectate.");
   return;
 }
 if(!model){
  text("hmSpaceStatus","Alege o evaluare reală sau un traseu real înainte de proiecție.");
  return;
 }
 if($("hmSpace").value!=="learned5"){
  text("hmSpaceStatus","4D DIAGNOSTIC: coordonate derivate din topologia de căi / scorurile observate. "+
   "Nu sunt pozițiile învățate ale simbolurilor V17.");
  return;
 }
 if(!model.native){
  text("hmSpaceStatus",torusLoading?"Citesc coordonatele reale U[0..4] din graful V17…":
   "Coordonate V17 5D indisponibile. Nu fabric poziții. Selectează 4D diagnostic sau pornește originalul V17.");
  return;
 }
 const N=model.native;
 text("hmSpaceStatus","5D V17 ÎNVĂȚAT: "+fmt(N.known)+" poziții observate din "+fmt(N.possible)+
  " simboluri; "+fmt(N.missing)+" fără coordonate native. "+
  "Proiectăm U[0..3], secționăm U[4]. Aceeași literă poate reveni în exact aceeași poziție. "+
  "Discontinuitățile din proiecție pot fi tăieturi de torus, NU transport 4D.");
}
async function loadNativeGeometry(){
 if(!model||torusLoading)return;
 const current=model;
 torusLoading=true;describeGeometry();
 try{
  const snap=await request("/graph?w="+w());
  if(current!==model)return;
  if(!Array.isArray(snap.U))throw Error("Graful original nu include Geometry.U");
  const source=model.kind==="observed"?model.pair.hybrid.graph:model.layout;
  model.native=native5DSymbolLayout(source,snap.U);
  model.nativeSnapshot={chars:snap.chars,at:Date.now()};
 }catch(err){
  if(current!==model)return;
  model.native=null;
  model.nativeError=err.message;
 }finally{
  torusLoading=false;
  describeGeometry();
  draw();
 }
}
function projectCoord(coord){
 // The fifth learned coordinate participates ONLY in the real slice; it
 // cannot be silently projected as a fabricated sixth/fourth coordinate.
 return project4D(coord?.length===5?coord.slice(0,4):coord,camera,cv.width,cv.height);
}
async function busyFetch(fn){
 if(busy)return;
 busy=true;for(const id of ["hmLoadObserved","hmLoadPrompt","hmUnseen"])$(id).disabled=true;
 halt();updateHud("Citesc rezultatele modelului real. Nu generez trasee de demonstrație…");
 try{await fn();}
 catch(e){updateHud("EROARE: "+e.message+"\nDacă serverul are cod vechi, salvează, oprește, git pull și repornește.");}
 finally{busy=false;for(const id of ["hmLoadObserved","hmLoadPrompt","hmUnseen"])$(id).disabled=false;}
}
async function observedFromPrompt(prompt,{isTrainingExample=false}={}){
 if(!prompt.trim())throw Error("Introdu o întrebare sau încarcă o experiență reală.");
 const data=await request("/language-maze/analyze",{
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({w:w(),prompt})
 });
 if(data.protocol!=="FROZEN_SAME_EXPERIENCED_TEXT_WORLD"||
    data.referenceEnteredPlanner!==false||!data.original||!data.hybrid)
  throw Error("Serverul nu a returnat aceeași lume V18 pentru ambele perspective.");
 const h=data.hybrid;
 if(!h.graph?.nodes?.length||!Array.isArray(h.graph.edges))
  throw Error("Lipsesc nodurile/muchiile reale din backend.");
 model={kind:"observed",source:isTrainingExample?"TRAINING_EXAMPLE_PREVIOUSLY_OBSERVED":"UNVERIFIED_NEW_PROMPT",
  prompt,pair:data,layout:observedLayout(h.graph)};
 layout=model.layout;
 const gPlan=h.globalPlanNodes||null;
 const d=gPlan?routeDivergence(gPlan,h.pathNodes):null;
 text("hmInitial",fmt(Math.max(0,(gPlan||[]).length-1)));
 text("hmExecuted",fmt(Math.max(0,(h.pathNodes||[]).length-1)));
 const branches=h.graph.edges.filter(e=>
  h.graph.edges.filter(v=>v.from===e.from).length>1).map(e=>e.from);
 const realBranches=new Set(branches);
 text("hmAlternative",fmt(realBranches.size)+" puncte");
 text("hmDeviation",d?(d.diverged?"pas "+fmt(d.firstDifferentNodeIndex):"nu există"):"neînregistrat");
 text("hmRevisions",h.revisionStats?
  fmt(h.revisionStats.repropagations)+" reprop. / "+fmt(h.revisionStats.revisedGlobalShapes)+" revizii":
  "fără jurnal");
 text("hmGoal",h.solvedKnownGoal?"terminal memorat":"NU / NECUNOSCUT");
 text("hmMeaning",
  "MODEL V18 · "+(isTrainingExample?"întrebare observată la antrenare":"input nou fără răspuns-țintă")+
  "\nAURIU = forma completă propagată ÎNAINTE de acțiune."+
  "\nTURCOAZ = nodurile vizitate efectiv de politica locală după fiecare caracter."+
  "\nVIOLET PUNCTAT = forma recalculată cu legea V17 din poziția actuală a cursorului, înaintea mișcării următoare."+
  "\nGRI = conexiunile alternative deja observate, nu universuri inventate."+
  "\nRecalcularea folosește TOPOLOGIA CUNOSCUTĂ; nu primește informații noi din text și NU înlocuiește politica locală de mișcare. Revizuirile sunt măsurate, nu animate fictiv.");
 text("hmProvenance","Din backend: /language-maze/analyze, același worker, graf observat și câmpuri V17/Successor."+
  "\nCoordonate 4D diagnostice:\n"+layout.dimensions.join("\n")+
  "\nNU este o topologie 4D învățată de organism. Fiecare răspuns memorat este în prezent o ramură de prefix (nu două drumuri către același terminal)."+
  (h.graph.partialPreview?"\nAtenție: rețeaua e trunchiată pentru replay.":""));
 syncStep(0);loadNativeGeometry();
}
$("hmLoadPrompt").addEventListener("click",()=>busyFetch(async()=>{
 enableLive(false);
 $("hmMode").value="observed";
 await observedFromPrompt($("hmPrompt").value,{isTrainingExample:false});
}));
$("hmLoadObserved").addEventListener("click",()=>busyFetch(async()=>{
 enableLive(false);
 $("hmMode").value="observed";
 const r=await request("/language-maze/observatory?w="+w());
 if(r.protocol!=="OBSERVED_TRAINING_TEXT_WORLD"||!r.observedPrompt)
  throw Error("Nu există încă un Q/A complet observat pentru creierul #"+w()+". Antrenează pe Parquet Q/A, apoi reîncearcă.");
 $("hmPrompt").value=r.observedPrompt;
 await observedFromPrompt(r.observedPrompt,{isTrainingExample:true});
}));
let lastFrozen=null; // original V17 /eval result from the user's actual Evaluare tab
function showFrozenExercise(result,index=0,opts={}){
 if(!result?.exercises?.length)throw Error("Nu există exerciții V17 de vizualizat.");
 const i=Math.min(Math.max(0,Number(index)||0),result.exercises.length-1),ex=result.exercises[i];
 if(!Array.isArray(ex.rows))throw Error("Evaluarea V17 nu a returnat predicțiile caracter cu caracter.");
 $("hmMode").value="unseen";
 model={kind:"unseen",source:result.source,exercise:ex,layout:frozenTextLayout(ex),
  frozenLived:result.lived,opts,exerciseIndex:i};
 layout=model.layout;
 const drop=$("hmExercise");drop.replaceChildren();
 result.exercises.forEach((entry,j)=>{
  const option=document.createElement("option");option.value=String(j);
  option.textContent="#"+j+" · "+fmt(entry.n)+" caractere · pred. "+pc(entry.answer);
  drop.append(option);
 });
 drop.value=String(i);
 text("hmInitial",fmt([...String(ex.shape||"")].length));
 text("hmExecuted",fmt(layout.rows.length)+" pred.");
 text("hmAlternative","3 secvențe");
 text("hmDeviation",pc(ex.shapeSame));
 text("hmRevisions","NU: teacher-forced");
 text("hmGoal",pc(ex.answer));
 text("hmMeaning",
  "MODEL V17 ÎNGHEȚAT · exercițiu #"+i+" · "+fmt(ex.n)+" caractere. "+
  "\nAURIU = forma de răspuns imaginată DIN ÎNTREBARE, înainte de a vedea răspunsul."+
  "\nTURCOAZ = predicția următorului caracter când modelul citește prefixul REAL al exercițiului."+
  "\nVIOLET = caracterele adevărate (referința folosită numai pentru scor)."+
  "\nTrei secvențe, NU trei drumuri valide printr-un labirint învățat. Nu există mișcare autonomă către o țintă semantică în acest test.");
 text("hmProvenance",
  "Date reale din testul V17 înghețat, după "+fmt(result.lived)+" pași trăiți anterior."+
  "\nScor predicții teacher-forced (răspuns): "+pc(ex.answer)+
  "\nForma înainte de acțiune vs referință: "+pc(ex.shapeSame)+
  "\nCoordonate 4D diagnostice:\n"+layout.dimensions.join("\n")+
  "\nNu reprezintă geometrie latentă reală, mecanism cuantic sau drum de planificare.");
 syncStep(0);loadNativeGeometry();
}
function showCachedFrozen(){
 if(!lastFrozen?.result?.exercises?.length){
  updateHud("Nicio evaluare V17 anterioară în această pagină. Deschide Evaluare → text nevăzut → Evaluează sau folosește butonul care rulează o evaluare nouă.");
  return;
 }
 showFrozenExercise(lastFrozen.result,Number($("hmExercise").value)||0);
}
$("hmUseCurrent").addEventListener("click",()=>{enableLive(false);showCachedFrozen();});
$("hmExercise").addEventListener("change",showCachedFrozen);
window.addEventListener("magicperspective:text-frozen-evaluation",event=>{
 const value=event.detail;
 if(!value?.result?.exercises?.length)return;
 lastFrozen=value;
 if(open()&&(!model||model.kind==="unseen")){
  try{showFrozenExercise(value.result,0);}catch(err){updateHud("Eroare de interpretare V17: "+err.message);}
 }
});
$("hmUnseen").addEventListener("click",()=>busyFetch(async()=>{
 enableLive(false);
 $("hmMode").value="unseen";
 const opts={count:1,max:Math.max(50,Math.min(20000,num("hmMax")||2000)),
  T:Math.max(0,Math.min(1.5,num("hmTemp"))),noise:0};
 const result=await request("/eval",{method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({w:w(),kind:"text",opts})});
 lastFrozen={w:w(),result};
 showFrozenExercise(result,0,opts);
}));
function stepMessageObserved(){
 const h=model.pair.hybrid,global=h.globalPlanNodes||[],actual=h.pathNodes||[];
 const total=h.trace?.length||0;
 const frame=step>0?h.trace?.[Math.min(step-1,total-1)]:null;
 const curr=actual[Math.min(step,actual.length-1)]??0;
 const from=h.graph.nodes[curr];
 const outgoing=h.graph.edges.filter(e=>e.from===curr);
 const firstDiff=routeDivergence(global,actual);
 const remaining=(global.includes(curr)?global.length-1-global.indexOf(curr):null);
 if(model.trainingLive){
  const event=model.liveEvent,info=model.liveInfo;
  if(!frame)return [
   "LIVE · T=0 · ÎNAINTE DE ACTUALIZAREA ACESTUI RÂND Q/A",
   "Întrebare reală: "+cut(event.prompt,240),
   "Predicția existentă în MEMORIA V18 ÎNAINTE de noul rând: "+
     (event.before?.before?cut(event.before.before,320):"ABȚINERE · nicio soluție cunoscută"),
   "Răspunsul real de antrenare are "+fmt(event.fullAnswerChars)+" caractere.",
   "Copacul a fost construit numai din tranziții deja învățate și din noua observație efectivă.",
   "Fără răspuns ascuns și fără traseu inventat."
  ].join("\n");
  return [
   "LIVE · CHAR #"+fmt(step)+" DIN Q/A FINALIZAT",
   "Întrebare: "+cut(event.prompt,170),
   "Nod din copacul real: "+frame.source+" → "+frame.target,
   "CARACTER CITIT EFECTIV DIN CORPUS: "+JSON.stringify(frame.character),
   "PREDICȚIE disponibilă înainte de rând: "+JSON.stringify(frame.predictedCharacter),
   "Potrivire: "+(frame.agreesWithGlobal?"CORECT":"DIFERIT / NEMĂSURAT"),
   "Alte căi din același nod: "+fmt(frame.localChoices),
   "V17 atracție după antrenare: "+fmt(frame.potentialBefore)+" → "+fmt(frame.potentialAfter),
   "Successor după antrenare: "+fmt(frame.successorBefore)+" → "+fmt(frame.successorAfter),
   "Cuvinte/simboluri recente: "+cut(frame.prefix,260),
   "Succesor TD la rândul curent: "+fmt(info.metrics.successorUpdates)+" actualizări",
   "Aceasta este deplasarea cursorului de OBSERVAȚIE din antrenare, nu o acțiune autonomă.",
   "Forma violet: rezultat calculat după învățarea acestui rând."
  ].join("\n");
 }
 if(!frame)return [
   "T=0 · ÎNAINTE SĂ SE MIȘTE",
   "Poziție actuală: start #0. Rol: perspectiva globală.",
   "Forma anticipată: "+fmt(global.length-1)+" muchii.",
   "Graful observat: "+fmt(h.graph.nodes.length)+" noduri / "+fmt(h.graph.edges.length)+" muchii.",
   "Alternative la start: "+fmt(outgoing.length),
   "Ținte posibile deja văzute: "+fmt(h.graph.goals?.length||0),
   "Predicția globală este calculată din EXPERIENȚE; nu din răspunsul nevăzut."
 ].join("\n");
 return [
   "T="+fmt(step)+" · PERSPECTIVA CORPULUI",
   "Nod înainte → după: "+frame.source+" → "+frame.target,
   "Caracter/acțiune: "+JSON.stringify(frame.character),
   "Caracter anticipat în forma globală: "+JSON.stringify(frame.predictedCharacter),
   "Se potrivește cu prima formă: "+(frame.agreesWithGlobal?"DA":"NU"),
   "Transformare observată: "+String(frame.transformation||"necunoscută"),
   "Alternative locale în acel moment: "+fmt(frame.localChoices),
   "V17 atracție: "+(Number.isFinite(frame.potentialBefore)?frame.potentialBefore.toFixed(5):"—")+
   " → "+(Number.isFinite(frame.potentialAfter)?frame.potentialAfter.toFixed(5):"—"),
   "Successor: "+(Number.isFinite(frame.successorBefore)?frame.successorBefore.toFixed(5):"—")+
   " → "+(Number.isFinite(frame.successorAfter)?frame.successorAfter.toFixed(5):"—"),
   "Pași rămași pe prima formă: "+(remaining===null?"a ieșit din traseu":fmt(remaining)),
   "Output local până aici: "+cut(frame.prefix,450),
   "Forma RECALCULATĂ acum: "+(h.replans?.[step]?
     fmt(h.replans[step].fullNodes-1)+" pași viitori (preview "+fmt(h.replans[step].nodes.length-1)+")":
     "fără nouă repropagare / terminal"),
   "Replanificare: "+(h.replans?.[step]?.changedFromInitialContinuation?"TRASEU DIFERIT":"aceeași continuare / fără schimbare"),
   "Nouă evidență învățată în timpul replay-ului: NU",
   "Forma recalculată controlează acțiunea? NU; politica locală originală a rămas intactă.",
   "Prima abatere global/local: "+(firstDiff.diverged?fmt(firstDiff.firstDifferentNodeIndex):"niciuna")
 ].join("\n");
}
function stepMessageUnseen(){
 const rows=layout.rows,shape=layout.initial,i=Math.min(step-1,rows.length-1);
 if(step===0)return [
  "T=0 · FORMA DIN ÎNTREBARE, ÎNAINTE DE A CITI RĂSPUNSUL",
  "Text anticipat: "+cut(model.exercise.shape,350),
  "Lungime: "+fmt(shape.length)+" caractere.",
  "Nu există încă acțiune sau hartă semantică a răspunsului.",
  "Evaluarea următorului caracter folosește prefixul real — este alt proces."
 ].join("\n");
 const row=rows[i],guess=String.fromCharCode(row[1]),real=String.fromCharCode(row[0]),ahead=shape[i]??null;
 return [
  "T="+fmt(step)+" · TEXT V17 / EVALUARE ÎNGHEȚATĂ",
  "Poziția în răspuns: "+fmt(i),
  "Caracter din forma inițială: "+JSON.stringify(ahead),
  "Predicție nouă după prefixul REAL: "+JSON.stringify(guess),
  "Caracterul corect (scor): "+JSON.stringify(real),
  "Predicție pe poziție: "+(guess===real?"CORECTĂ":"GREȘITĂ"),
  "Forma inițială pe poziție: "+(ahead===null?"nu are caracter":ahead===real?"CORECTĂ":"GREȘITĂ"),
  "Diferența reflectă schimbarea contextului; NU este o replănuire a unei rute într-un labirint.",
  "Citește modelul din checkpoint fără actualizarea greutăților."
 ].join("\n");
}
function explainStep(){
 if(!model)return;
 text("hmStepDetails",model.kind==="observed"?stepMessageObserved():stepMessageUnseen());
}
function visibleInSlice(coord){
 if(!Array.isArray(coord))return false;
 if(!$("hmSliceEnabled").checked)return true;
 const w=(coord?.length===5?coord[4]:coord?.[3])??0;
 const slice=num("hmSlice")*2-1;
 return Math.abs(w-slice)<.33;
}
function paintPath(path,coords,{color,width=2,upto=null,dashed=false,opacity=1,sample=1}={},shift){
 if(!path?.length)return;
 g.strokeStyle=color;g.lineWidth=width;g.globalAlpha=opacity;g.setLineDash(dashed?[8,6]:[]);
 g.beginPath();let began=false;
 const stop=upto===null?path.length:Math.min(path.length,upto+1);
 for(let k=0;k<stop;k++){
  if(k%sample&&k!==stop-1)continue;
  const id=path[k],coord=coords[id];
  if(!coord||!visibleInSlice(coord)){began=false;continue;}
  const p=projectCoord(coord);
  const x=p.x+shift.x,y=p.y+shift.y;
  if(!began){g.moveTo(x,y);began=true;}else g.lineTo(x,y);
 }
 g.stroke();g.setLineDash([]);g.globalAlpha=1;
}
function drawPoint(coord,color,radius=7,shift={x:0,y:0},label=""){
 if(!coord||!visibleInSlice(coord))return;
 const p=projectCoord(coord);
 g.beginPath();g.arc(p.x+shift.x,p.y+shift.y,radius,0,Math.PI*2);
 g.fillStyle=color;g.fill();g.strokeStyle="#031017";g.lineWidth=2;g.stroke();
 if(label){
  g.font="13px ui-monospace,monospace";g.fillStyle=color;
  g.fillText(label,p.x+shift.x+10,p.y+shift.y-10);
 }
}
function focus(coords,current){
 if($("hmPerspective").value!=="local")return {x:0,y:0};
 if(!current)return {x:0,y:0};
 const c=projectCoord(current);
 return {x:cv.width*.5-c.x,y:cv.height*.5-c.y};
}
function drawObserved(){
 const h=model.pair.hybrid,graph=h.graph,coords=currentGeometry().coords,
  actual=h.pathNodes||[],pre=h.globalPlanNodes||[],old=model.pair.original.globalPlanNodes||[],
  pos=actual[Math.min(step,actual.length-1)]??0,shift=focus(coords,coords[pos]);
 const out=graph.edges||[],routeEdges=new Set();
 for(let i=1;i<pre.length;i++)routeEdges.add(pre[i-1]+":"+pre[i]);
 for(let i=1;i<actual.length;i++)routeEdges.add(actual[i-1]+":"+actual[i]);
 g.strokeStyle="#395b76";g.lineWidth=.8;g.globalAlpha=.4;
 g.beginPath();let shown=0;
 for(const e of out){
  if(routeEdges.has(e.from+":"+e.to))continue;
  if(!visibleInSlice(coords[e.from])||!visibleInSlice(coords[e.to]))continue;
  const a=projectCoord(coords[e.from]),
   b=projectCoord(coords[e.to]);
  g.moveTo(a.x+shift.x,a.y+shift.y);g.lineTo(b.x+shift.x,b.y+shift.y);
  if(++shown>=13000)break;
 }
 g.stroke();g.globalAlpha=1;
 if(old.length)paintPath(old,coords,{color:"#9d7a55",width:2,dashed:true,opacity:.75,
  sample:old.length>4500?Math.ceil(old.length/4500):1},shift);
 if(pre.length)paintPath(pre,coords,{color:"#f5c45c",width:3.6,
  sample:pre.length>6000?Math.ceil(pre.length/6000):1},shift);
 // The local body is only drawn up to the replay step; future actions are NOT
 // drawn as if they had already occurred.
 paintPath(actual,coords,{color:"#3de7d0",width:4,upto:step,
  sample:step>4500?Math.ceil(step/4500):1},shift);
 // Diagnostic repropagation is computed by the SAME original law after each
 // real local action. It visualizes a new planned future but NEVER claims
 // that it replaced the original policy or observed an unknown wall.
 const replan=h.replans?.[step];
 const postCommit=model.trainingLive?h.postCommitNodes:null;
 if(postCommit?.length>1)paintPath(postCommit,coords,{
   color:"#c392f2",width:3,dashed:true,opacity:.90,
   sample:postCommit.length>4000?Math.ceil(postCommit.length/4000):1
 },shift);
 if(replan?.nodes?.length>1)paintPath(replan.nodes,coords,{
   color:"#c392f2",width:3,dashed:true,opacity:.95,
   sample:replan.nodes.length>4000?Math.ceil(replan.nodes.length/4000):1
 },shift);
 if(!graph.partialPreview)for(const goal of graph.goals||[])drawPoint(coords[goal.node],"#c181ea",4.5,shift);
 drawPoint(coords[pre[0]??0],"#94b8cd",5,shift,"START");
 drawPoint(coords[pos],"#f5a568",8,shift,(model.trainingLive?"CITESC ":"EU · ")+step);
 // Display REAL branch characters and answer-word fragments directly next
 // to actual nodes, rather than showing only mathematical line geometry.
 const route=model.trainingLive?actual:pre;
 if(route.length){
   g.font="12px ui-monospace,monospace";
   const stride=Math.max(1,Math.ceil(route.length/25));
   for(let i=0;i<route.length;i+=stride){
     const id=route[i],coord=coords[id];
     if(!coord||!visibleInSlice(coord))continue;
     const label=model.trainingLive?
        model.liveEvent.observedAnswer.slice(Math.max(0,i-12),i+1):
        graph.nodes[id]?.lastCharacter;
     if(!label)continue;
     const p=projectCoord(coord);
     g.fillStyle="#b6f3e8";g.fillText(cut(label,20),p.x+shift.x+10,p.y+shift.y-9);
   }
 }
 if(model.trainingLive){
   const observedText=model.liveEvent.observedAnswer;
   const prefix=observedText.slice(0,Math.min(step,observedText.length));
   g.fillStyle="#103b48";g.fillRect(18,cv.height-91,Math.min(cv.width-36,900),64);
   g.fillStyle="#e2fcf4";g.font="13px ui-monospace,monospace";
   g.fillText("TEXT OBSERVAT LIVE: "+cut(prefix.slice(-92),92),30,cv.height-64);
   g.fillStyle="#e9c65a";
   g.fillText("FORMA ANTERIOARĂ: "+cut(model.liveEvent.before?.before??"(abținere)",95),30,cv.height-42);
 }
}
function drawUnseen(){
 const tracks=currentGeometry().tracks;
 for(const tr of tracks){
  const col=tr.key==="preanswer"?"#f5c45c":tr.key==="teacherForced"?"#3de7d0":"#b479db";
  // Rows/guesses themselves determine the path; no invented graph edges.
  const coords=tr.coords,ids=coords.map((_,i)=>i);
  const current=tr.key==="preanswer"?null:Math.min(step,ids.length);
  const focusCoord=tracks[1].coords[Math.min(step,tracks[1].coords.length-1)];
  const shift=focus(null,focusCoord);
  paintPath(ids,coords,{color:col,width:tr.key==="reference"?2.4:3.3,
   dashed:tr.key==="reference",opacity:tr.key==="reference"?.7:1,
   upto:current===null?null:Math.max(0,current-1),
   sample:ids.length>5500?Math.ceil(ids.length/5500):1},shift);
  const at=step>0?Math.min(step-1,coords.length-1):0;
  if(coords.length)drawPoint(coords[at],tr.key==="teacherForced"?"#f5a568":col,
    tr.key==="teacherForced"?8:4.5,shift,
    step>0&&tr.key==="teacherForced"?"CITESC":(step===0?tr.label.slice(0,11):""));
 }
}
function stopLiveAnimation(){
 if(liveAnimation!==null){clearInterval(liveAnimation);liveAnimation=null;}
}
function enableLive(on){
 liveEnabled=!!on;
 $("hmLiveSwitch").setAttribute?.("aria-pressed",liveEnabled?"true":"false");
 text("hmLiveSwitch",liveEnabled?"● LIVE ON · urmărește antrenarea":"○ LIVE OFF · activează");
 if(liveEnabled){$("hmMode").value="live";startLive();}
 else{stopLiveAnimation();text("hmLiveBadge","○ LIVE · oprit pentru inspecție");}
}
$("hmLiveSwitch").addEventListener("click",()=>enableLive(!liveEnabled));
function startLive(){
 if(!open()||!liveEnabled)return;
 $("hmMode").value="live";
 text("hmLiveBadge","● LIVE · conectare la workerul de antrenare");
 if(livePollTimer===null)livePollTimer=setInterval(()=>{void pollLive();},460);
 if(livePaintTimer===null)livePaintTimer=setInterval(()=>{
   if(open()&&liveEnabled&&model?.kind==="native-stream")draw();
 },130);
 void pollLive();
}
function showLiveTrainingEvent(event){
 const m=committedTrainingMaze(event),prior=m.preNodes,visited=m.observedNodes,
  post=m.postNodes;
 const h={graph:m.graph,globalPlanNodes:prior,pathNodes:visited,
   postCommitNodes:post,trace:m.trace,steps:visited.length-1,
   replans:[],solvedKnownGoal:false,
   viewpointEvidence:{actualRepropagationAfterEachMove:false,
     trainingObservation:true,agentActions:false},
   output:event.observedAnswer};
 $("hmSpace").value="diagnostic4";
 model={kind:"observed",trainingLive:true,liveInfo:m,liveEvent:event,
  pair:{hybrid:h,original:{globalPlanNodes:prior}},
  layout:observedLayout(m.graph),source:m.provenance};
 layout=model.layout;step=0;
 text("hmInitial",m.metrics.beforeHadPrediction?fmt(m.metrics.preAnswerCharacters):"ABȚINERE");
 text("hmExecuted",fmt(m.metrics.observedCharacters)+" / "+fmt(event.fullAnswerChars));
 text("hmAlternative",fmt(m.metrics.observedBranches)+" ramuri");
 text("hmDeviation",m.metrics.beforePredictionCharacterRate===null?"nemăsurat":
    pc(m.metrics.beforePredictionCharacterRate)+" corect");
 text("hmRevisions","1 actualizare după exemplu");
 text("hmGoal","răspuns observat");
 text("hmTrainingRows",fmt(m.metrics.trainedRows));
 text("hmTrainingTD",fmt(m.metrics.successorUpdates));
 text("hmTrainingMatch",pc(m.metrics.beforePredictionCharacterRate));
 text("hmTrainingBranches",fmt(m.metrics.observedBranches));
 text("hmMeaning",
   "LIVE: exercițiul a fost procesat REAL de antrenare, prin "+event.where+"."+
   "\nAURIU = răspunsul disponibil din memoria V18 ÎNAINTE de actualizarea cu acest rând."+
   "\nTURCOAZ = caracterele acestui răspuns REAL citite în antrenare, pe ramurile efectiv observate."+
   "\nVIOLET = traseul calculat DUPĂ învățarea acestui exemplu, nu o revizuire autonomă la fiecare caracter."+
   "\nGRI = alte tranziții existente în lumea textului învățată."+
   "\nCaracterele observate sunt ținte de antrenare, NU acțiuni alese autonom de agent."+
   (event.answerPreviewTruncated?"\nPreview limitat la 1.024 caractere; total real: "+fmt(event.fullAnswerChars):""));
 describeGeometry();
 text("hmProvenance",
   "SURSĂ LIVE: worker → eveniment după commit Q/A → /hypermaze/live."+
   "\nPredicția inițială a fost extrasă din memoria anterioară a lumii text."+
   "\nAntrenare originală V17/CUDA: păstrată; harta V18: actualizată."+
   "\nPoziții: "+model.layout.dimensions.join("; ")+
   "\nÎNVĂȚARE reală, nu test pe text nevăzut. Scorul de antrenare nu este acuratețe pe held-out.");
 updateHud("● LIVE · "+new Date(event.at).toLocaleTimeString("ro-RO")+
  " · Q/A #"+fmt(m.metrics.trainedRows)+" · simboluri "+fmt(event.brainChars)+
  "\nÎntrebare: "+cut(event.prompt,150)+
  "\nFormă ÎNAINTE: "+(event.before?.before?cut(event.before.before,120):"nicio cale cunoscută")+
  "\nRăspuns observat: "+cut(event.observedAnswer,150));
 syncStep(0);
 stopLiveAnimation();
 // One complete animation within roughly 1 second; this does NOT make the
 // trained model run at a fabricated rate. Event timestamps stay explicit.
 const stride=Math.max(1,Math.ceil(Math.max(1,endStep())/28));
 liveAnimation=setInterval(()=>{
  if(!open()||!liveEnabled){stopLiveAnimation();return;}
  syncStep(step+stride);
  if(step>=endStep())stopLiveAnimation();
 },42);
}
function drawNativeStream(){
 const n=nativeStream;if(!n)return;
 const W=cv.width,H=cv.height;
 const valid=n.nodes.filter(x=>Array.isArray(x.coord));
 const limited=n.links.slice(0,3600);
 g.lineWidth=1;
 const time=Date.now()*.005;
 for(const e of limited){
  const a=n.nodes[e.fromIndex]?.coord,b=n.nodes[e.toIndex]?.coord;
  if(!a||!b||!visibleInSlice(a)||!visibleInSlice(b))continue;
  const p=projectCoord(a),q=projectCoord(b);
  g.globalAlpha=Math.max(.08,Math.min(.75,Math.abs(e.weight||0)/10));
  g.strokeStyle=e.kind==="world"?"#3edbbd":e.kind==="miss"?"#ef6a83":
    e.kind==="bud"?"#b189e5":"#6a9bc0";
  g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.stroke();
  // Pulse moves over REAL graph edge; it is a display of current activation,
  // not a claim that an unrecorded packet physically traversed that link.
  if(Math.abs(e.weight||0)>.2&&e.fromIndex%9===0){
   const t=(time+e.fromIndex*.17)%1;
   g.globalAlpha=.8;g.fillStyle=g.strokeStyle;g.beginPath();
   g.arc(p.x*(1-t)+q.x*t,p.y*(1-t)+q.y*t,2.2,0,Math.PI*2);g.fill();
  }
 }
 g.globalAlpha=1;
 const chosen=valid.slice(0,Math.min(850,valid.length));
 for(const node of chosen){
  const p=projectCoord(node.coord);
  const active=Math.max(0,Math.min(1,Number(node.activation)||0));
  g.fillStyle=node.error?"#ff687a":node.type==="sym"?"#35dbc0":
   node.type==="A"?"#f0bd5d":"#b48ce9";
  g.globalAlpha=.25+active*.75;g.beginPath();
  g.arc(p.x,p.y,node.error?6:node.type==="sym"?3.4:2.5,0,Math.PI*2);g.fill();
 }
 g.globalAlpha=1;
 // Real word/symbol labels: source is GraphTrace's original label.
 const labels=chosen.filter(x=>x.type==="sym"&&x.activation>.15)
  .slice(0,36);
 g.font="11px ui-monospace,monospace";
 for(const n of labels){
  const p=projectCoord(n.coord);g.fillStyle="#e0f6ed";
  g.fillText(String(n.label),p.x+6,p.y-6);
 }
 g.fillStyle="#b4d3db";g.font="12px ui-monospace,monospace";
 g.fillText("V17 ORIGINAL · LIVE: "+fmt(n.nodes.length)+" noduri · "+
   fmt(n.links.length)+" muchii · "+fmt(n.countNative)+" simboluri U(5D)",14,H-16);
}
async function pollLive(){
 if(!open()||!liveEnabled||liveInFlight)return;
 liveInFlight=true;
 try{
  const id=w();
  const res=await request("/hypermaze/live?w="+id+"&since="+liveSequence);
  if(!open()||!liveEnabled||id!==w())return;
  if(res.protocol!=="LIVE_TRAINING_COMMITTED_QA_STREAM")
   throw Error("Serverul nu are protocolul de antrenare LIVE");
  text("hmLiveBadge",res.liveWorker?"● LIVE · worker conectat ("+res.status+")":
    "● LIVE · worker oprit / pauză");
  const stat=res.training||{},td=stat.successorTraining||{};
  text("hmLiveMetrics","LIVE TRAINING · CREIER #"+id+
   "\nCaractere model: "+fmt(res.chars)+
   "\nQ/A antrenate: "+fmt(stat.rowsObserved)+
   "\nActualizări TD: "+fmt(td.updates)+
   "\nStări successor: "+fmt(td.states)+
   "\nEtapa GPU/CPU: "+String(res.gpuPhase||res.status||"—")+
   "\nUltimul eveniment: "+fmt(res.latestSeq));
  if(Number.isFinite(stat.rowsObserved))text("hmTrainingRows",fmt(stat.rowsObserved));
  if(Number.isFinite(td.updates))text("hmTrainingTD",fmt(td.updates));
  const newEvents=(res.events||[]).filter(e=>e.seq>liveSequence);
  for(const event of newEvents){
   liveSequence=Math.max(liveSequence,event.seq);
   if(event.kind==="TRAINING_QA_COMMITTED")showLiveTrainingEvent(event);
   else if(event.error)updateHud("LIVE: eroare la înregistrarea unui Q/A: "+event.error);
  }
  if(Date.now()-liveLastGraphAt>1100){
   liveLastGraphAt=Date.now();
   try{
    const graph=await request("/graph?w="+id);
    if(!open()||id!==w()||!liveEnabled)return;
    nativeStream=livingV17Trace(graph);
    if(!model||model.kind==="native-stream"){
      const statsText=$("hmLiveMetrics").textContent;
      text("hmLiveMetrics",statsText+"\nV17 C: "+pc(nativeStream.accC)+
        " · câmp: "+pc(nativeStream.accF)+
        "\nNoduri V17: "+fmt(nativeStream.nodes.length)+
        " · muchii: "+fmt(nativeStream.links.length));
    }
    if(!model||model.kind==="native-stream"){
      model={kind:"native-stream",source:"LIVE_V17_GRAPHTRACE",layout:null};
      $("hmSpace").value="learned5";describeGeometry();
      text("hmInitial","formă V17 în curs");
      text("hmExecuted",fmt(nativeStream.stream.length)+" observații recente");
      text("hmAlternative",fmt(nativeStream.links.length)+" legături");
      text("hmGoal","antrenează");
      text("hmMeaning","V17 LIVE: fiecare nod și legătură apar din GraphTrace.record() "+
       "în timpul antrenării; activările, erorile și legăturile cresc real. "+
       "Simbolurile au coordonate U[0..4] învățate; A/C sunt proiectate lângă vecinii conectați.");
      text("hmProvenance",nativeStream.provenance);
      updateHud("● LIVE: graful V17 este activ.\n"+
       fmt(nativeStream.nodes.length)+" noduri · "+fmt(nativeStream.links.length)+
       " muchii reale · "+fmt(nativeStream.countNative)+" simboluri pe torus 5D.\n"+
       "Aștept o observație Q/A completă pentru forma globală și traseul textului.");
    }
    if(model?.kind==="native-stream")draw();
   }catch(err){
    if(!model)updateHud("LIVE: aștept prima captură reală de graf: "+err.message);
   }
  }
 }catch(err){
  text("hmLiveBadge","● LIVE · conexiune indisponibilă");
  updateHud("Nu pot citi fluxul real de antrenare: "+err.message+
   "\nAsigură-te că serverul nou rulează; nu afișez demo.");
 }finally{liveInFlight=false;}
}
function drawNativeInset(){
 const inset=$("hmNativeInset"),ctx=inset.getContext("2d"),W=inset.width,H=inset.height;
 ctx.clearRect(0,0,W,H);ctx.fillStyle="#051524";ctx.fillRect(0,0,W,H);
 if(!nativeStream){
  ctx.fillStyle="#8dbccc";ctx.font="11px ui-monospace,monospace";
  ctx.fillText("Aștept graful real V17…",10,H/2);return;
 }
 const nodes=nativeStream.nodes;
 const point=v=>project4D(v.slice(0,4),{...camera,zoom:.72},W,H);
 ctx.lineWidth=.65;
 for(const e of nativeStream.links.slice(0,700)){
  const a=nodes[e.fromIndex]?.coord,b=nodes[e.toIndex]?.coord;
  if(!a||!b)continue;
  const x=point(a),y=point(b);
  ctx.globalAlpha=.25;ctx.strokeStyle=e.kind==="world"?"#4bdfc8":"#78a0bf";
  ctx.beginPath();ctx.moveTo(x.x,x.y);ctx.lineTo(y.x,y.y);ctx.stroke();
 }
 ctx.globalAlpha=1;
 for(const node of nodes.slice(0,280)){
  if(!node.coord)continue;
  const p=point(node.coord);
  ctx.fillStyle=node.error?"#fa697b":node.type==="sym"?"#44dac6":
    node.type==="A"?"#ebbf67":"#b791dd";
  ctx.beginPath();ctx.arc(p.x,p.y,node.error?2.7:1.7,0,Math.PI*2);ctx.fill();
 }
 ctx.fillStyle="#b4e6e2";ctx.font="10px ui-monospace,monospace";
 ctx.fillText(fmt(nodes.length)+" noduri · "+fmt(nativeStream.links.length)+" legături",6,H-7);
}
function draw(){
 if(!open())return;
 const rect=cv.getBoundingClientRect();
 const scale=Math.min(window.devicePixelRatio||1,1.7);
 const W=Math.max(500,Math.floor(rect.width*scale)),
       H=Math.max(300,Math.floor(rect.height*scale));
 if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
 g.clearRect(0,0,W,H);
 g.fillStyle="#03101c";g.fillRect(0,0,W,H);
 g.strokeStyle="#102c3d";g.lineWidth=1;g.beginPath();
 for(let k=1;k<8;k++){
  const x=W*k/8,y=H*k/8;
  g.moveTo(x,0);g.lineTo(x,H);g.moveTo(0,y);g.lineTo(W,y);
 }g.stroke();
 if(model&&model.kind!=="native-stream"&&$("hmSpace").value==="learned5"&&!model.native){
  g.fillStyle="#c4dde8";g.textAlign="center";g.font="15px system-ui";
  g.fillText(torusLoading?"Citesc Geometry.U din creierul original V17…":
    "Coordonatele 5D V17 lipsesc; nu inventez un torus.",W/2,H/2);
  g.fillText("Selectează 4D diagnostic pentru a vedea imediat căile observate.",W/2,H/2+28);
  g.textAlign="left";return;
 }
 if(!model){
  drawNativeInset();
  g.fillStyle="#b0cfdd";g.textAlign="center";g.font="16px system-ui";
  g.fillText("Selectează un traseu real sau un test pe text nevăzut.",W/2,H/2);
  g.fillText("Globala → corp → fiecare pas · proiecție rotativă a 4 componente",W/2,H/2+30);
  g.textAlign="left";return;
 }
 if(model.kind==="observed")drawObserved();
 else if(model.kind==="native-stream")drawNativeStream();
 else drawUnseen();
 drawNativeInset();
 g.fillStyle="#8aacc1";g.textAlign="left";g.font="11px ui-monospace,monospace";
 g.fillText($("hmSpace").value==="learned5"?
  "Geometria REALĂ a simbolurilor V17 · Geometry.U[0..4] · torus 5D, secțiune 4D":
  "X,Y,Z,W = variabile reale derivate · nu geometrii 4D învățate de model",14,H-16);
}
window.addEventListener("resize",()=>{if(open())draw();});
const params=new URLSearchParams(location.search);
if(params.has("w"))$("hmBrain").value=params.get("w");
if(location.hash==="#hypermaze")showOverlay();
clearView();
