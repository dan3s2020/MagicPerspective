// Dedicated V18 Puzzle / Successor observatory.
// Every numeric observation comes from live /graphs, /telemetry,
// /language-maze/analyze or the real Parquet-heldout /language-maze/compare.
// Never manufacture data when a brain, route or comparison is unavailable.
const el=id=>document.getElementById(id);
const side=document.querySelector("aside.side");
let selectedGraph=0,paired=null,evaluation=null,step=0,playTimer=null;
let pairBusy=false,evalBusy=false,pollBusy=false,positions=null;
let pollAt=null,observedRequest=false,lastObservedAt=0,observedReady=false;
const tdHistory=new Map(); // true telemetry samples only
const number=x=>Number.isFinite(x)?Number(x).toLocaleString("ro-RO"):"—";
const fixed=(x,d=5)=>Number.isFinite(x)?Number(x).toFixed(d):"—";
const percent=x=>Number.isFinite(x)?(100*x).toFixed(2)+"%":"—";
const deltaPercent=x=>Number.isFinite(x)?((x>0?"+":"")+(100*x).toFixed(2)+" pp"):"—";
const excerpt=(v,n=150)=>String(v??"").length>n?String(v).slice(0,n)+"…":String(v??"");
const active=()=>side.classList.contains("successorOn");
function message(id,value){el(id).textContent=String(value);}
function stopReplay(){
 if(playTimer!==null){clearInterval(playTimer);playTimer=null;}
 message("scReplay","▶ Replay traseu real");
}
function blank(canvasId,label){
 const canvas=el(canvasId),g=canvas.getContext("2d");
 g.clearRect(0,0,canvas.width,canvas.height);
 g.fillStyle="#030d16";g.fillRect(0,0,canvas.width,canvas.height);
 g.fillStyle="#86b0c1";g.font="13px system-ui";g.textAlign="center";
 g.fillText(label,canvas.width/2,canvas.height/2);g.textAlign="left";
}
function resetPlans(){
 stopReplay();paired=null;positions=null;step=0;
 el("scStep").value="0";el("scStep").max="0";
 message("scStepLabel","0 / 0");
 for(const id of ["scV","scS","scCandidates","scTies","scDivergence","scAgreement","scOnlineCovered","scOnlineRoot"])message(id,"—");
 message("scStepDetail","Nu există încă un traseu calculat pe acest creier.");
 message("scPathDiff","Nu există încă un traseu calculat.");
 message("scPlanStatus","Introdu o întrebare și propagă ambele câmpuri pe backendul real.");
 el("scEdges").replaceChildren();
 blank("scPathCanvas","Aștept graful antrenat…");
 blank("scFieldCanvas","V și S apar după propagare…");
}
function clearEvaluation(){
 evaluation=null;
 for(const id of ["scExactOriginal","scExactHybrid","scExactDelta","scCharDelta"])message(id,"—");
 message("scEvalStatus","Nicio evaluare măsurată pentru acest creier în sesiunea serverului.");
 el("scEvalRows").replaceChildren();
}
function graphId(){
 const i=Number(el("scGraphId").value);
 return Number.isSafeInteger(i)&&i>=0?i:0;
}
function selectGraph(w){
 if(!Number.isSafeInteger(w)||w<0)return;
 selectedGraph=w;el("scGraphId").value=String(w);
 resetPlans();clearEvaluation();observedReady=false;lastObservedAt=0;refreshLive();
 if(active())inspectEvaluation();
}
function openTab(){
 side.classList.remove("evalOn","psOn","metricsOn","transferOn","langOn");
 side.classList.add("successorOn");
 for(const b of side.querySelectorAll(".tabs button"))b.classList.remove("on");
 el("tabSuccessor").classList.add("on");
 selectedGraph=graphId();
 // Hash links can land directly on this actual tab.
 if(location.hash!=="#successor")history.replaceState(null,"",location.pathname+location.search+"#successor");
 refreshLive();inspectEvaluation();loadObserved(true);
}
el("tabSuccessor").addEventListener("click",openTab);
// Every other tab regains complete control; no original UI handler is replaced.
for(const btn of side.querySelectorAll(".tabs button")){
 if(btn.id==="tabSuccessor")continue;
 btn.addEventListener("click",()=>{
  side.classList.remove("successorOn");
  el("tabSuccessor").classList.remove("on");
  stopReplay();
  if(location.hash==="#successor")history.replaceState(null,"",location.pathname+location.search);
 },{capture:true});
}
document.addEventListener("click",e=>{
 const card=e.target.closest?.("#liveList .lgc");
 if(card?.dataset?.w!==undefined){
  const w=Number(card.dataset.w);
  if(Number.isSafeInteger(w)&&w>=0&&w!==selectedGraph)selectGraph(w);
 }
},{capture:true});
el("scGraphId").addEventListener("change",()=>selectGraph(graphId()));
el("scRefresh").addEventListener("click",()=>{refreshLive();inspectEvaluation();});
el("scUsePrompt").addEventListener("click",()=>{
 message("scSampleStatus","Input preluat din tabul Limbaj; nu conține referința de evaluare.");
 const input=el("langPrompt");if(input?.value)el("scPrompt").value=input.value;
});
async function getJson(url,options={}){
 const response=await fetch(url,{cache:"no-store",...options});
 if(!response.ok)throw Error("HTTP "+response.status+" "+url);
 const value=await response.json();
 if(value.error)throw Error(value.error);
 return value;
}
function renderTdTraining(stat,w){
 const ids=["scTdRows","scTdUpdates","scTdStates","scTdError","scTdCharacters","scTdScales","scTdBridges"];
 if(!stat||stat.enabled!==true){
  for(const id of ids)message(id,"—");
  message("scTdStatus","Backendul încă nu raportează antrenare TD. Dacă actualizezi codul în timpul unui server pornit, salvează și repornește.");
  blank("scTdCanvas","Aștept date reale ale TD…");return;
 }
 message("scTdRows",number(stat.rows));
 message("scTdUpdates",number(stat.updates));
 message("scTdStates",number(stat.states)+" / "+number(stat.maxStates));
 message("scTdError",fixed(stat.tdAbsMean,7));
 message("scTdCharacters",number(stat.characters));
 message("scTdScales",(stat.levelUpdates||[]).map(number).join(" / "));
 message("scTdBridges",number(stat.hierarchicalBridges));
 const samples=tdHistory.get(w)||[];
 const newPoint={at:Date.now(),updates:stat.updates,error:stat.tdAbsMean,states:stat.states};
 if(!samples.length||samples.at(-1).updates!==newPoint.updates||
    samples.at(-1).error!==newPoint.error||samples.at(-1).states!==newPoint.states){
  samples.push(newPoint);if(samples.length>160)samples.shift();tdHistory.set(w,samples);
 }
 message("scTdStatus",(stat.updates>0?"ÎNVĂȚARE TD DIN CORPUS":"NU A PRIMIT ÎNCĂ RÂNDURI Q/A")+
  " · "+number(stat.rows)+" exemple, "+number(stat.updates)+" actualizări, "+
  number(stat.states)+" stări. Scări: "+(stat.levels||[]).join(" / ")+
  (stat.restored?" · checkpoint restaurat":"")+
  (stat.evicted?" · stări eliminate: "+number(stat.evicted):"")+
  ". Actualizările și eroarea TD nu sunt precizie lingvistică.");
 drawTdTraining(samples);
}
function drawTdTraining(samples){
 if(!samples?.length){blank("scTdCanvas","Fără observații de antrenare");return;}
 const c=el("scTdCanvas"),g=c.getContext("2d"),W=c.width,H=c.height;
 g.fillStyle="#030d16";g.fillRect(0,0,W,H);
 const L=55,R=W-16,T=19,M=106,B=H-25,N=samples.length;
 const maxUpdates=Math.max(1,...samples.map(p=>p.updates));
 const maxError=Math.max(1e-7,...samples.map(p=>p.error));
 const x=i=>L+(R-L)*(N===1?.5:i/(N-1));
 const plot=(k,color,top,bottom,max)=>{
  g.strokeStyle=color;g.lineWidth=2.2;g.beginPath();
  samples.forEach((p,i)=>{
   const y=bottom-(bottom-top)*Math.max(0,Math.min(1,p[k]/max));
   if(i)g.lineTo(x(i),y);else g.moveTo(x(i),y);
  });g.stroke();
  if(N===1){g.fillStyle=color;g.beginPath();g.arc(x(0),bottom-
   (bottom-top)*Math.min(1,samples[0][k]/max),3,0,Math.PI*2);g.fill();}
 };
 g.strokeStyle="#345268";g.lineWidth=1;
 for(const y of [T,M,B]){g.beginPath();g.moveTo(L,y);g.lineTo(R,y);g.stroke();}
 plot("updates","#56dcc6",T,M-7,maxUpdates);
 plot("error","#e7aa6e",M+9,B,maxError);
 g.fillStyle="#b9d6e2";g.font="11px system-ui";
 g.fillText("TD updates "+number(samples.at(-1).updates),L+5,T+12);
 g.fillText("TD |Δ| "+fixed(samples.at(-1).error,6),L+5,M+24);
 g.fillText("Succesiune de actualizări reale din worker · "+N+" punct(e)",L+5,H-6);
}
async function refreshLive(){
 if(pollBusy||document.hidden||!active())return;
 pollBusy=true;
 try{
  const w=selectedGraph;
  const [meta,telemetry]=await Promise.all([
   getJson("/graphs"),getJson("/telemetry?w="+w)
  ]);
  if(w!==selectedGraph)return;
  const g=meta.graphs?.find(o=>o.w===w);
  if(!g)throw Error("Graful #"+w+" nu este în lista serverului.");
  const t=telemetry.telemetry||{},lm=t.languageMaze||g.progress?.languageMaze||null;
  message("scServerStatus","BACKEND REAL · "+(g.status||"necunoscut"));
  message("scGraphState","Graf #"+w+" · "+excerpt(g.arm,35)+" · "+excerpt(meta.world,65));
  message("scChars",number(g.chars??t.chars));
  message("scRows",number(lm?.rowsObserved));
  message("scTransitions",number(lm?.characterTransitionsObserved));
  message("scGoals",number(lm?.knownGoalObservationCount));
  message("scRulesCount",number(lm?.observedPositionalRules));
  renderTdTraining(lm?.successorTraining??null,w);
  const gpuMode=g.gpu?.settings?.device||meta.gpu?.device||"off / indisponibil";
  message("scGpu",gpuMode);
  const lines=[
   "Sursă: /graphs + /telemetry · actualizat la "+new Date().toLocaleTimeString("ro-RO"),
   "Stare proces: "+(g.status||"necunoscut")+
   " · GPU configurat "+gpuMode+" (utilizarea efectivă nu este măsurată aici)",
   "Observații Q/A: "+number(lm?.rowsObserved)+
   " · tranziții/caractere: "+number(lm?.characterTransitionsObserved),
   "Test separat din creierul V17: text "+percent(g.test?.live)+
   " · labirinturi rezolvate "+percent(g.maze?.test?.solved),
   "Aceste teste originale NU reprezintă scorul noului successor.",
   g.error?"EROARE DIN WORKER: "+g.error:""
  ].filter(Boolean);
  message("scLive",lines.join("\n"));
  pollAt=Date.now();
  if(!observedReady&&(!paired)&&!el("scPrompt").value.trim()&&
    Date.now()-lastObservedAt>11000)loadObserved(true);
 }catch(err){
  message("scServerStatus","BACKEND INDISPONIBIL");
  message("scLive","Nu pot citi datele reale: "+err.message+
   ". Verifică procesul PowerShell, portul și ramura instalată; nu afișez valori simulate.");
 }finally{pollBusy=false;}
}
// Optional real example, never a generated "demo": pick a completed
// observation actually stored by the original language-world learner.
async function loadObserved(auto=false){
 if(observedRequest||(!auto&&pairBusy))return;
 observedRequest=true;lastObservedAt=Date.now();
 if(!auto)el("scObserved").disabled=true;
 try{
  const w=selectedGraph;
  const data=await getJson("/language-maze/observatory?w="+w);
  if(w!==selectedGraph)return;
  if(data.protocol!=="OBSERVED_TRAINING_TEXT_WORLD")throw Error("Unknown training-world provenance");
  const stat=data.trainingMemory||{};
  for(const [id,key] of [
    ["scRows","rowsObserved"],["scTransitions","characterTransitionsObserved"],
    ["scGoals","knownGoalObservationCount"],["scRulesCount","observedPositionalRules"]
  ])if(Number.isFinite(stat[key]))message(id,number(stat[key]));
  if(!data.observedPrompt){
   message("scSampleStatus","Momentan nu există un prompt real de antrenare cu traseu vizualizabil pe creierul #"+w+
    ". După observarea unor Q/A, devine disponibil automat.");
   return;
  }
  if(auto&&(paired||el("scPrompt").value.trim()))return;
  observedReady=true;
  el("scPrompt").value=data.observedPrompt;
  message("scSampleStatus","Sursa inputului: întrebare reală din ANTrENARE (răspuns de "+
    number(data.observedAnswerLength)+" caractere văzut anterior). "+
    "Vizualizare a căii memorate, NU evaluare pe întrebări noi.");
  await analyze();
 }catch(err){
  message("scSampleStatus","Nu pot obține încă o experiență reală din corpus: "+err.message);
 }finally{observedRequest=false;el("scObserved").disabled=false;}
}
el("scObserved").addEventListener("click",()=>loadObserved(false));
el("scPrompt").addEventListener("input",()=>{
 if(!observedRequest)message("scSampleStatus","Input introdus manual. Corectitudinea se verifică doar cu o referință nevăzută, în evaluarea separată.");
});
function computeLayout(g){
 const N=g.nodes.length,W=el("scPathCanvas").width,H=el("scPathCanvas").height;
 const neighbors=Array.from({length:N},()=>[]);
 for(const e of g.edges||[])if(Number.isInteger(e.from)&&Number.isInteger(e.to)&&
   e.from>=0&&e.from<N&&e.to>=0&&e.to<N)neighbors[e.from].push(e.to);
 const depth=new Array(N).fill(-1),queue=[0];depth[0]=0;
 for(let i=0;i<queue.length;i++){
  const node=queue[i];
  for(const to of neighbors[node])if(depth[to]<0){depth[to]=depth[node]+1;queue.push(to);}
 }
 let max=0;for(const d of depth)if(d>max)max=d;
 const totals=new Map(),used=new Map();
 for(const d of depth)totals.set(d,(totals.get(d)||0)+1);
 return depth.map((d,i)=>{
  const k=used.get(d)||0;used.set(d,k+1);
  return {x:24+(W-48)*(d<0?1:d/Math.max(1,max)),
   y:25+(H-50)*(k+1)/((totals.get(d)||1)+1)};
 });
}
function linePath(g,coords,indices,color,thickness,dashed=false){
 if(!indices?.length)return;
 g.beginPath();g.strokeStyle=color;g.lineWidth=thickness;
 g.setLineDash(dashed?[6,4]:[]);
 indices.forEach((id,i)=>{
  const p=coords[id];if(!p)return;
  if(i===0)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);
 });
 g.stroke();g.setLineDash([]);
}
function drawTopology(){
 const canvas=el("scPathCanvas"),g=canvas.getContext("2d");
 const r=paired?.hybrid;
 if(!r?.graph?.nodes?.length){blank("scPathCanvas","Nu există încă un graf de soluție.");return;}
 const nodes=r.graph.nodes,edges=r.graph.edges||[],coords=positions||computeLayout(r.graph);
 positions=coords;
 g.fillStyle="#030d16";g.fillRect(0,0,canvas.width,canvas.height);
 const limit=Math.min(edges.length,4500);
 g.strokeStyle="rgba(81,116,147,.32)";g.lineWidth=1;
 for(let i=0;i<limit;i++){
  const e=edges[i],a=coords[e.from],b=coords[e.to];if(!a||!b)continue;
  g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
 }
 linePath(g,coords,paired.original?.pathNodes,"#c5a87d",2,true);
 linePath(g,coords,r.pathNodes,"#39d7c2",2.7);
 const current=r.pathNodes[Math.min(step,Math.max(0,r.pathNodes.length-1))];
 const selection=new Set(r.pathNodes||[]);
 const paint=nodes.length>1000?new Set([...(r.pathNodes||[]),...nodes.slice(0,450).map((_,i)=>i)]):null;
 for(let i=0;i<nodes.length;i++){
  if(paint&&!paint.has(i))continue;
  const p=coords[i];if(!p)continue;
  const n=nodes[i],on=selection.has(i),isCurrent=i===current;
  const v=Number.isFinite(n.potential)?n.potential:0;
  const radius=isCurrent?6:on?3.3:2;
  g.beginPath();g.arc(p.x,p.y,radius,0,2*Math.PI);
  g.fillStyle=isCurrent?"#efb85e":n.kind===2?"#cf7ad9":on?"#37dbc4":
    v>.1?"#578c9f":"#31536d";
  g.fill();
 }
 g.font="11px system-ui";g.fillStyle="#c1e0e7";
 g.fillText(number(nodes.length)+" noduri · "+number(edges.length)+" muchii observate",10,16);
 if(nodes.length>1000||edges.length>limit)
  g.fillText("Randare parțială a grafului · rezultate complete în backend",10,canvas.height-10);
}
function plotValues(){
 const canvas=el("scFieldCanvas"),g=canvas.getContext("2d"),r=paired?.hybrid;
 if(!r?.pathNodes?.length){blank("scFieldCanvas","Fără valori de propagare");return;}
 const W=canvas.width,H=canvas.height,padL=41,padR=18,padT=22,padB=33;
 g.fillStyle="#030d16";g.fillRect(0,0,W,H);
 g.strokeStyle="#345164";g.lineWidth=1;g.font="11px system-ui";g.fillStyle="#a3c1cb";
 for(let q=0;q<=4;q++){
  const y=padT+(H-padT-padB)*q/4;
  g.beginPath();g.moveTo(padL,y);g.lineTo(W-padR,y);g.stroke();
  g.fillText((1-q/4).toFixed(2),5,y+4);
 }
 const route=r.pathNodes,denom=Math.max(1,route.length-1);
 const series=[
  {key:"potential",color:"#efb85e",name:"V17 max"},
  {key:"successorOccupancy",color:"#39d7c2",name:"Successor S"},
  {key:"successorOnline",color:"#ce9df1",name:"TD antrenat"},
  {key:"successorEmpirical",color:"#638aa9",name:"fallback empiric"}
 ];
 for(const item of series){
  const avail=route.some(id=>Number.isFinite(r.graph.nodes[id]?.[item.key]));
  if(!avail)continue;
  g.beginPath();g.strokeStyle=item.color;g.lineWidth=2.2;
  let started=false;
  route.forEach((id,i)=>{
   const v=r.graph.nodes[id]?.[item.key];if(!Number.isFinite(v))return;
   const x=padL+(W-padL-padR)*i/denom;
   const y=padT+(H-padT-padB)*(1-Math.max(0,Math.min(1,v)));
   if(!started){g.moveTo(x,y);started=true;}else g.lineTo(x,y);
  });
  g.stroke();
 }
 const x=padL+(W-padL-padR)*Math.min(step,denom)/denom;
 g.strokeStyle="rgba(238,245,250,.52)";g.setLineDash([3,3]);
 g.beginPath();g.moveTo(x,padT);g.lineTo(x,H-padB);g.stroke();g.setLineDash([]);
 g.fillStyle="#efb85e";g.fillText("V17 (max)",padL+3,H-9);
 g.fillStyle="#39d7c2";g.fillText("Successor (viitor)",padL+115,H-9);
 g.fillStyle="#9fb8c6";g.fillText("Pași: "+number(denom),W-100,H-9);
}
function renderEdges(){
 const body=el("scEdges");body.replaceChildren();
 const r=paired?.hybrid; if(!r?.graph){return;}
 const current=r.pathNodes[Math.min(step,r.pathNodes.length-1)];
 const outgoing=(r.graph.edges||[]).filter(e=>e.from===current);
 if(!outgoing.length){
  const row=document.createElement("tr"),cell=document.createElement("td");
  cell.colSpan=5;cell.textContent="Fără vecini: terminal / cale blocată / încă neobservată.";
  row.append(cell);body.append(row);return;
 }
 const chosen=r.pathNodes[Math.min(step+1,r.pathNodes.length-1)];
 const max=25;
 for(const e of outgoing.slice(0,max)){
  const row=document.createElement("tr"),n=r.graph.nodes[e.to]||{};
  const vals=[excerpt(e.character===" "?"␣":e.character??"tranziție",44),
   fixed(n.potential),fixed(n.successorOccupancy),number(e.observedSupport),
   e.to===chosen&&step<r.pathNodes.length-1?"CALE ALEASĂ":"alternativă"];
  vals.forEach((v,j)=>{
   const td=document.createElement("td");td.textContent=v;
   if(j===4&&e.to===chosen)td.style.color="#64d9a5";
   row.append(td);
  });body.append(row);
 }
 if(outgoing.length>max){
  const tr=document.createElement("tr"),td=document.createElement("td");
  td.colSpan=5;td.textContent="Vizualizare limitată la "+max+" din "+outgoing.length+" muchii reale.";
  tr.append(td);body.append(tr);
 }
}
function renderStep(){
 const r=paired?.hybrid;
 if(!r){return;}
 const size=r.trace?.length||0;step=Math.min(step,size);
 el("scStep").max=String(size);el("scStep").value=String(step);
 message("scStepLabel",step+" / "+size+(r.steps>size?" (replay parțial din "+number(r.steps)+" pași)":""));
 const tr=step>0?r.trace[step-1]:null;
 if(!tr){
  message("scStepDetail",
   "ÎNAINTE DE PRIMA ACȚIUNE\n"+
   "Soluție globală planificată: "+number(r.steps)+" tranziții.\n"+
   "Atractie inițială V(start): "+fixed(r.field?.[0])+"\n"+
   "Successor S(start): "+fixed(r.successor?.rootOccupancy)+"\n"+
   "Țintă validată: "+(r.solvedKnownGoal?"terminal observat":"necunoscut")+
   "\nNu se afișează o referință corectă la input nou.");
 }else{
  message("scStepDetail",
   "Pas #"+number(tr.step)+": nod "+tr.source+" → "+tr.target+"\n"+
   "Tranziție (caracter): "+JSON.stringify(tr.character)+"\n"+
   "V: "+fixed(tr.potentialBefore)+" → "+fixed(tr.potentialAfter)+"\n"+
   "S: "+fixed(tr.successorBefore)+" → "+fixed(tr.successorAfter)+"\n"+
   "Transformare: "+(tr.transformation||"—")+"\n"+
   "Alternative locale: "+number(tr.localChoices)+"\n"+
   "Concordanță cu forma globală: "+(tr.agreesWithGlobal?"DA":"NU")+"\n"+
   "Output până acum: "+excerpt(tr.prefix,450));
 }
 drawTopology();plotValues();renderEdges();
}
function pathDifference(a,b){
 const x=a?.pathNodes||[],y=b?.pathNodes||[];
 if(!x.length&&!y.length)return {same:true,text:"Nicio cale cunoscută în ambele moduri."};
 const m=Math.min(x.length,y.length);
 for(let i=0;i<m;i++)if(x[i]!==y[i])
  return {same:false,text:"DIVERGENȚĂ REALĂ la nodul/pasul #"+i+
   " (original "+x[i]+", hibrid "+y[i]+"). Nu garantează corectitudine."};
 if(x.length!==y.length)return {same:false,text:"Trasee cu lungimi diferite: "+
  number(x.length)+" noduri original, "+number(y.length)+" noduri hibrid."};
 return {same:true,text:"Trasee IDENTICE. Successor nu a schimbat acțiunile pentru acest input."};
}
function showPair(value){
 if(value.protocol!=="FROZEN_SAME_EXPERIENCED_TEXT_WORLD"||
   !value.original||!value.hybrid||value.referenceEnteredPlanner!==false)
   throw Error("Backendul nu a returnat un instantaneu real Original/Successor.");
 paired=value;step=0;stopReplay();positions=null;
 const a=value.original,b=value.hybrid,diagn=b.successor||{},diff=pathDifference(a,b);
 message("scV",fixed(b.field?.[0]));
 message("scS",fixed(diagn.rootOccupancy));
 message("scCandidates",number(b.candidates));
 message("scTies",number(diagn.globalTieBreaks??0)+" / "+number(diagn.localTieBreaks??0));
 message("scDivergence",diff.same?"IDENTIC":"DIFERIT");
 message("scAgreement",percent(b.localAgreementRate));
 message("scOnlineCovered",number(diagn.onlineCoveredNodes)+" / "+number(diagn.onlineNodes));
 message("scOnlineRoot",fixed(diagn.empiricalRootOccupancy)+" / "+fixed(diagn.rootOccupancy));
 message("scPathDiff",diff.text+"\nOriginal: "+excerpt(a.output,170)+
   "\nHibrid: "+excerpt(b.output,170));
 message("scPlanStatus",
  (b.abstained?"NU EXISTĂ CALE SUSȚINUTĂ DE EXPERIENȚE. ":
   "Traseu global înainte de acțiune: "+number(b.steps)+" pași. ")+
  "Noduri/muchii: "+number(b.graph?.nodes?.length)+"/"+
  number(b.graph?.edges?.length)+". "+
  "Successor "+(diagn.enabled?"ACTIV (doar egalități)":"INACTIV ("+(diagn.reason||"fără alternative")+")")+
  ". Răspunsul nu este declarat corect doar fiindcă s-a atins un terminal memorat.");
 const evidence={
  source:"backend-ul real /language-maze/analyze",requestedGraph:selectedGraph,
  protocol:value.protocol,sameWorkerSnapshot:value.sameWorkerSnapshot,
  noHeldOutReferenceInPlanner:value.referenceEnteredPlanner===false,
  trainingStats:value.trainingMemory,
  original:{pathLength:a.steps,output:a.output,rootV:a.field?.[0],
   graphNodes:a.graph?.nodes?.length,candidates:a.candidates,abstained:a.abstained},
  hybrid:{pathLength:b.steps,output:b.output,rootV:b.field?.[0],
   successor:diagn,onlineTraining:diagn.training,
   localAgreementRate:b.localAgreementRate,
   graphNodes:b.graph?.nodes?.length,graphEdges:b.graph?.edges?.length,
   candidates:b.candidates,abstained:b.abstained},
  warning:"V17/S fields are classical, not measured quantum amplitudes. Reached known goal != general text understanding."
 };
 message("scEvidence",JSON.stringify(evidence,null,2));
 renderStep();
}
async function analyze(){
 if(pairBusy)return;
 const prompt=el("scPrompt").value.trim();
 if(!prompt){message("scPlanStatus","Introdu întâi întrebarea. Nu creez o problemă demonstrativă în locul ei.");return;}
 pairBusy=true;el("scAnalyze").disabled=true;stopReplay();
 message("scPlanStatus","Calculez Original și Successor în același worker, pe aceeași lume antrenată…");
 try{
  const w=selectedGraph;
  const result=await getJson("/language-maze/analyze",{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({w,prompt})
  });
  if(w!==selectedGraph)return;
  showPair(result);
 }catch(err){
  resetPlans();message("scPlanStatus","Nu pot obține comparația reală: "+err.message+
   ". Dacă serverul rulează cod vechi, salvează, oprește, git pull și repornește.");
 }finally{pairBusy=false;el("scAnalyze").disabled=false;}
}
el("scAnalyze").addEventListener("click",analyze);
el("scStep").addEventListener("input",()=>{stopReplay();step=Number(el("scStep").value)||0;renderStep();});
el("scReset").addEventListener("click",()=>{stopReplay();step=0;renderStep();});
el("scReplay").addEventListener("click",()=>{
 if(playTimer!==null){stopReplay();return;}
 if(!paired?.hybrid?.trace?.length)return;
 if(step>=paired.hybrid.trace.length)step=0;
 message("scReplay","⏸ Oprește replay");
 playTimer=setInterval(()=>{
  if(!active()){stopReplay();return;}
  step++;renderStep();
  if(step>=paired.hybrid.trace.length)stopReplay();
 },260);
});
function populateTable(body,rows){
 body.replaceChildren();
 if(!rows.length){
  const tr=document.createElement("tr"),td=document.createElement("td");
  td.colSpan=4;td.textContent="Nu există întrebări măsurate";tr.append(td);body.append(tr);return;
 }
 for(const row of rows){
  const tr=document.createElement("tr");
  row.forEach((v,i)=>{
   const td=document.createElement("td");td.textContent=v;
   if(i===2&&v.startsWith("CORECT"))td.style.color="#64d9a5";
   tr.append(td);
  });body.append(tr);
 }
}
function showEvaluation(r){
 if(!r||r.protocol!=="FROZEN_HELDOUT_SAME_WORLD_ABLATION"||
   !r.original||!r.hybrid||r.referenceEnteredPlanner!==false)
  throw Error("Evaluare cu proveniență necunoscută.");
 evaluation=r;
 message("scExactOriginal",percent(r.original.exactRate));
 message("scExactHybrid",percent(r.hybrid.exactRate));
 message("scExactDelta",deltaPercent(r.exactDelta));
 message("scCharDelta",deltaPercent(r.characterDelta));
 const d=r.exactDelta;
 const verdict=d>0?"Hibrid mai precis pe acest set.":
  d<0?"Hibrid mai slab pe acest set.":"Niciun avantaj măsurat pe acest set.";
 message("scEvalStatus",number(r.heldoutRows)+" Q/A nevăzute · checkpoint cu "+
  number(r.trainingRowsSeen)+" observații Q/A · data "+
  (r.evaluatedAt?new Date(r.evaluatedAt).toLocaleString("ro-RO"):"necunoscută")+
  ". "+verdict+" Această comparație NU demonstrează semantică generală.");
 const cases=r.hybrid.cases||[];
 populateTable(el("scEvalRows"),cases.map((c,i)=>{
  const baseline=r.original.cases[i]||{};
  return [
   excerpt(c.prompt,130),
   (baseline.equal?"CORECT: ":"GREȘIT: ")+excerpt(baseline.actual,165),
   (c.equal?"CORECT: ":"GREȘIT: ")+excerpt(c.actual,165),
   "Așteptat: "+excerpt(c.expected,165)
  ];
 }));
}
async function inspectEvaluation(){
 if(!active())return;
 try{
  const w=selectedGraph,r=await getJson("/language-maze/compare-last?w="+w);
  if(w!==selectedGraph)return;
  if(r.available)showEvaluation(r);
  else if(!evaluation)message("scEvalStatus",
   "Nicio evaluare pe Q/A nevăzute în sesiunea curentă a serverului. "+
   "Apasă «Rulează evaluarea reală» după antrenare; nu inventez procente.");
 }catch(err){message("scEvalStatus","Ultimul rezultat nu este accesibil: "+err.message);}
}
el("scInspectEval").addEventListener("click",inspectEvaluation);
el("scEvaluate").addEventListener("click",async()=>{
 if(evalBusy)return;
 evalBusy=true;el("scEvaluate").disabled=true;
 message("scEvalStatus","Salvez checkpoint-ul textului și compar 8 Q/A nevăzute. Procesul nu reantrenează în timpul evaluării…");
 try{
  const w=selectedGraph,r=await getJson("/language-maze/compare?w="+w+"&count=8",{method:"POST"});
  if(w!==selectedGraph)return;
  showEvaluation(r);
 }catch(err){message("scEvalStatus","Evaluarea reală nu a putut fi finalizată: "+err.message+
  ". Pentru date TXT fără Q/A, testul trebuie raportat ca indisponibil.");}
 finally{evalBusy=false;el("scEvaluate").disabled=false;}
});
// Real telemetry while this tab is visible; no synthetic chart updates.
setInterval(()=>{if(active())refreshLive();},2300);
resetPlans();clearEvaluation();
blank("scTdCanvas","Aștept actualizările TD din antrenare…");
// This IS the dedicated isolated V18 Successor checkout. On the genuine
// live server landing page show the new observatory immediately; old V17
// Train/Eval/Graph tabs remain available and retain their own handlers.
const initialGraphMatch=/(?:^|[?&])w=(\d+)/.exec(location.search);
if(initialGraphMatch)el("scGraphId").value=initialGraphMatch[1];
if(location.hash==="#successor"||
   (location.hash===""&&/(?:^|[?&])live(?:=1|&|$)/.test(location.search)))openTab();
