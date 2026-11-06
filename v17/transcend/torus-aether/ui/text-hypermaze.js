// REAL V17/V18 text-route explorer. No demo graph, no random/fabricated states.
// V18: exact learned Q/A prefix topology, preaction global plan and local steps.
// V17: frozen untouched text test, preanswer imagination vs teacher-forced
// next-character guesses vs hidden reference. The latter is NOT a traversable
// language maze or autonomous body movement.
import {observedLayout,frozenTextLayout,project4D,routeDivergence} from "./hypermaze-geometry.mjs";
const $=id=>document.getElementById(id);
const overlay=$("hmOverlay"),cv=$("hmCanvas"),g=cv.getContext("2d");
let model=null,step=0,playing=null,busy=false,layout=null;
let camera={yaw:.45,pitch:.21,xw:.65,yw:-.27,zw:.25,zoom:1,panX:0,panY:0};
let pointer=null,lastPaint=0,raf=null;
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
 halt();draw();
 // Original tabs remain exactly as they were; no native handlers changed.
}
function hideOverlay(){
 halt();overlay.hidden=true;document.body.style.overflow="";
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
$("hmMode").addEventListener("change",()=>{clearView();text("hmMeaning",$("hmMode").value==="observed"?
 "V18: navigare prin tranzițiile text învățate; preplan și cursor local reale.":
 "V17: forma din întrebare și predicțiile pe prefixe corecte; nu sunt acțiuni într-un labirint navigabil.");});
$("hmBrain").addEventListener("change",clearView);
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
 text("hmRevisions",h.viewpointEvidence?.actualRepropagationAfterEachMove?"vezi jurnal":"NEIMPLEMENTAT");
 text("hmGoal",h.solvedKnownGoal?"terminal memorat":"NU / NECUNOSCUT");
 text("hmMeaning",
  "MODEL V18 · "+(isTrainingExample?"întrebare observată la antrenare":"input nou fără răspuns-țintă")+
  "\nAURIU = forma completă propagată ÎNAINTE de acțiune."+
  "\nTURCOAZ = nodurile vizitate efectiv de politica locală după fiecare caracter."+
  "\nGRI = conexiunile alternative deja observate, nu universuri inventate."+
  "\nNu există încă un algoritm care să învețe un perete nou sau să repropagheze global după fiecare caracter. Abaterile se văd numai dacă se întâmplă în backend.");
 text("hmProvenance","Din backend: /language-maze/analyze, același worker, graf observat și câmpuri V17/Successor."+
  "\nCoordonate 4D diagnostice:\n"+layout.dimensions.join("\n")+
  "\nNU este o topologie 4D învățată de organism. Fiecare răspuns memorat este în prezent o ramură de prefix (nu două drumuri către același terminal)."+
  (h.graph.partialPreview?"\nAtenție: rețeaua e trunchiată pentru replay.":""));
 syncStep(0);
}
$("hmLoadPrompt").addEventListener("click",()=>busyFetch(async()=>{
 $("hmMode").value="observed";
 await observedFromPrompt($("hmPrompt").value,{isTrainingExample:false});
}));
$("hmLoadObserved").addEventListener("click",()=>busyFetch(async()=>{
 $("hmMode").value="observed";
 const r=await request("/language-maze/observatory?w="+w());
 if(r.protocol!=="OBSERVED_TRAINING_TEXT_WORLD"||!r.observedPrompt)
  throw Error("Nu există încă un Q/A complet observat pentru creierul #"+w()+". Antrenează pe Parquet Q/A, apoi reîncearcă.");
 $("hmPrompt").value=r.observedPrompt;
 await observedFromPrompt(r.observedPrompt,{isTrainingExample:true});
}));
$("hmUnseen").addEventListener("click",()=>busyFetch(async()=>{
 $("hmMode").value="unseen";
 const opts={count:1,max:Math.max(50,Math.min(12000,num("hmMax")||2000)),
  T:Math.max(0,Math.min(1.5,num("hmTemp"))),noise:0};
 const r=await request("/eval",{method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({w:w(),kind:"text",opts})});
 const ex=r.exercises?.[0];
 if(!ex||!Array.isArray(ex.rows))throw Error("Evaluarea V17 nu a returnat observații per caracter.");
 model={kind:"unseen",source:r.source,exercise:ex,layout:frozenTextLayout(ex),
  frozenLived:r.lived,opts};
 layout=model.layout;
 text("hmInitial",fmt([...String(ex.shape||"")].length));
 text("hmExecuted",fmt(layout.rows.length)+" pred.");
 text("hmAlternative","3 secvențe");
 text("hmDeviation",pc(ex.shapeSame));
 text("hmRevisions","NU: teacher-forced");
 text("hmGoal",pc(ex.answer));
 text("hmMeaning",
  "MODEL V17 ÎNGHEȚAT · exercițiu nevăzut, "+fmt(ex.n)+" caractere. "+
  "\nAURIU = forma de răspuns imaginată DIN ÎNTREBARE, înainte de a vedea răspunsul."+
  "\nTURCOAZ = predicția următorului caracter când modelul citește prefixul REAL al exercițiului."+
  "\nVIOLET = caracterele adevărate (referința folosită numai pentru scor)."+
  "\nTrei secvențe, NU trei drumuri valide printr-un labirint învățat. Nu există mișcare autonomă către o țintă semantică în acest test.");
 text("hmProvenance",
  "Date reale de la /eval · Brain.load(checkpoint), fără învățare."+
  "\nScor predicții teacher-forced (răspuns): "+pc(ex.answer)+
  "\nForma înainte de acțiune vs referință: "+pc(ex.shapeSame)+
  "\nCoordonate 4D diagnostice:\n"+layout.dimensions.join("\n")+
  "\nNu reprezintă geometrie latentă reală, mecanism cuantic sau drum de planificare.");
 syncStep(0);
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
   "Replanificare după acțiune: NU (backendul păstrează câmpul inițial).",
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
 if(!$("hmSliceEnabled").checked)return true;
 const w=(coord?.[3]??0);
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
  const p=project4D(coord,camera,cv.width,cv.height);
  const x=p.x+shift.x,y=p.y+shift.y;
  if(!began){g.moveTo(x,y);began=true;}else g.lineTo(x,y);
 }
 g.stroke();g.setLineDash([]);g.globalAlpha=1;
}
function drawPoint(coord,color,radius=7,shift={x:0,y:0},label=""){
 if(!coord||!visibleInSlice(coord))return;
 const p=project4D(coord,camera,cv.width,cv.height);
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
 const c=project4D(current,camera,cv.width,cv.height);
 return {x:cv.width*.5-c.x,y:cv.height*.5-c.y};
}
function drawObserved(){
 const h=model.pair.hybrid,graph=h.graph,coords=model.layout.coords,
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
  const a=project4D(coords[e.from],camera,cv.width,cv.height),
   b=project4D(coords[e.to],camera,cv.width,cv.height);
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
 for(const goal of graph.goals||[])drawPoint(coords[goal.node],"#c181ea",4.5,shift);
 drawPoint(coords[pre[0]??0],"#94b8cd",5,shift,"START");
 drawPoint(coords[pos],"#f5a568",8,shift,"EU · "+step);
}
function drawUnseen(){
 const tracks=model.layout.tracks;
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
 if(!model){
  g.fillStyle="#b0cfdd";g.textAlign="center";g.font="16px system-ui";
  g.fillText("Selectează un traseu real sau un test pe text nevăzut.",W/2,H/2);
  g.fillText("Globala → corp → fiecare pas · proiecție rotativă a 4 componente",W/2,H/2+30);
  g.textAlign="left";return;
 }
 if(model.kind==="observed")drawObserved();else drawUnseen();
 g.fillStyle="#8aacc1";g.textAlign="left";g.font="11px ui-monospace,monospace";
 g.fillText("X,Y,Z,W = variabile reale derivate · nu geometrii 4D învățate de model",14,H-16);
}
window.addEventListener("resize",()=>{if(open())draw();});
const params=new URLSearchParams(location.search);
if(params.has("w"))$("hmBrain").value=params.get("w");
if(location.hash==="#hypermaze")showOverlay();
clearView();
