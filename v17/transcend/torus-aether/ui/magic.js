// MAGIC OBSERVATORY · always the ORIGINAL V17 live worker, no mock network data.
// All coordinates are projections of learned symbol phases; all routes are
// captured by native ConstructedPathLearner or observed native transformation
// endpoints. Neither rendering nor polling trains the model.
const $=id=>document.getElementById(id);
const fmt=n=>typeof n==="number"&&Number.isFinite(n)?Intl.NumberFormat("ro-RO",{maximumFractionDigits:1}).format(n):"—";
const pct=n=>typeof n==="number"&&Number.isFinite(n)?(100*n).toFixed(1)+"%":"—";
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const el=(tag,text,cls)=>{const x=document.createElement(tag);x.textContent=String(text);if(cls)x.className=cls;return x;};
const COLORS={gold:"#eec77c",cyan:"#63d1eb",mint:"#67ddb6",rose:"#ff8198",purple:"#bf9dff",grey:"#7893af"};
const state={w:0,summary:null,graph:null,telemetry:[],lastAt:0,episode:null,episodeKey:"",frame:0,playing:true,frameAt:0,pull:false,dx:0,dy:0,zoom:1,rotation:0,hold:null,selected:false,status:"",lastChar:0};
for(const [id,selection] of [["axisX",0],["axisY",1],["axisZ",3]]){
 for(let i=0;i<5;i++){const o=el("option","axa "+(i+1));o.value=String(i);$(id).append(o);}
 $(id).value=String(selection);
}
function sizeCanvas(canvas){
 const width=Math.max(150,canvas.clientWidth||300),height=Math.max(120,canvas.clientHeight||240),dpr=Math.min(window.devicePixelRatio||1,2);
 const w=Math.round(width*dpr),h=Math.round(height*dpr);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w:width,h:height};
}
function roundRect(ctx,x,y,w,h,r,fill){
 ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
}
function label(ctx,text,x,y,color="#b4cedc",font="12px Segoe UI"){
 ctx.fillStyle=color;ctx.font=font;ctx.fillText(text,x,y);
}
function line(ctx,a,b,color,width=1,dashed=false){
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashed?[5,7]:[]);
 ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
}
function dot(ctx,x,y,color,r=4){
 ctx.fillStyle=color;ctx.shadowBlur=r*3;ctx.shadowColor=color;
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
}
function emptyMessage(canvas,heading,detail){
 const {ctx,w,h}=sizeCanvas(canvas);ctx.clearRect(0,0,w,h);
 ctx.textAlign="center";label(ctx,heading,w/2,h/2-9,COLORS.gold,"18px Georgia");
 label(ctx,detail,w/2,h/2+17,"#9aafc5","12px Segoe UI");ctx.textAlign="left";
}
function project(coord,w,h){
 const ax=+($("axisX").value||0),ay=+($("axisY").value||1),az=+($("axisZ").value||2);
 const c=coord||[];
 const a=2*Math.PI*(c[ax]||0),b=2*Math.PI*(c[ay]||0),z=2*Math.PI*(c[az]||0);
 const x=Math.cos(a)+.42*Math.sin(z),y=Math.sin(b)+.27*Math.cos(a),depth=Math.sin(z);
 const spin=state.rotation,xx=x*Math.cos(spin)-depth*Math.sin(spin),zz=x*Math.sin(spin)+depth*Math.cos(spin);
 const sc=Math.min(w/3.1,h/2.75)*state.zoom*(1+.17*zz);
 return {x:w/2+xx*sc+state.dx,y:h/2+y*sc+state.dy,depth:zz};
}
// Draw only original observed GraphTrace nodes for which genuine learned
// symbol 5D coordinates or observed-neighbor weighted coordinates exist.
function geometry(){
 const snap=state.graph;
 if(!snap||!Array.isArray(snap.nodes)||!Array.isArray(snap.U))return null;
 const positions=new Map(snap.U.map(e=>[Number(e[0]),e[1]]));
 const wanted=new Map();
 for(const node of snap.nodes){
  const [id,type,name,act,born,error]=node;
  if(type==="sym"){
   const c=positions.get(Number(String(id).slice(2)));
   if(c?.length>=5)wanted.set(id,{id,type,name,act,born,error,c});
  }
 }
 // Global self/perceptions have no independent 5D position, so a
 // weighted average of their actual NEIGHBOR symbol positions is explicit.
 const others=snap.nodes.filter(n=>n[1]!=="sym").slice(0,120),connect=snap.edges||[];
 for(const node of others){
  const [id,type,name,act,born,error]=node;
  let sum=0;const vector=[0,0,0,0,0];
  for(const e of connect){
   const other=e[0]===id?e[1]:e[1]===id?e[0]:null;
   const neighbor=other&&wanted.get(other);
   if(!neighbor)continue;
   const weight=clamp(Number(e[3])||0,.03,3);
   for(let i=0;i<5;i++)vector[i]+=weight*neighbor.c[i];
   sum+=weight;
  }
  if(sum){wanted.set(id,{id,type,name,act,born,error,c:vector.map(x=>x/sum),derived:true});}
 }
 const priority=new Map([...wanted.values()].sort((a,b)=>(b.act||0)-(a.act||0)).slice(0,320).map(x=>[x.id,x]));
 const edges=connect.filter(e=>priority.has(e[0])&&priority.has(e[1]))
  .sort((a,b)=>(Number(b[3])||0)-(Number(a[3])||0)).slice(0,1300);
 return {nodes:[...priority.values()],edges};
}
let seenGraph=null,geoCache=null;
function field(){
 const canvas=$("field"),{ctx,w,h}=sizeCanvas(canvas);
 ctx.clearRect(0,0,w,h);
 const snap=state.graph;if(!snap){emptyMessage(canvas,"Se formează lumea…","Aștept primul snapshot de la worker");return;}
 if(seenGraph!==snap){geoCache=geometry();seenGraph=snap;}
 if(!geoCache?.nodes.length){emptyMessage(canvas,"Niciun nod inventat","Aștept coordonatele 5D învățate");return;}
 const points=new Map();
 for(const node of geoCache.nodes)points.set(node.id,project(node.c,w,h));
 // Derived polar rings, purely a projection grid, not measured edges.
 ctx.strokeStyle="#1c385144";ctx.lineWidth=1;
 for(const r of [.36,.72,1.06]){ctx.beginPath();ctx.ellipse(w/2+state.dx,h/2+state.dy,
   r*Math.min(w/3,h/2.7)*state.zoom,r*Math.min(w/3.1,h/2.8)*state.zoom,0,0,2*Math.PI);ctx.stroke();}
 for(const e of geoCache.edges){
  const a=points.get(e[0]),b=points.get(e[1]);if(!a||!b)continue;
  const kind=e[2],c=kind==="align"?COLORS.mint+"88":kind==="miss"?COLORS.rose+"96":
   kind==="moves"?COLORS.gold+"98":"#6385a071";
  line(ctx,a,b,c,clamp(Math.log1p(Number(e[3])||0)*.6,.4,2.2));
 }
 for(const node of geoCache.nodes){
  const p=points.get(node.id),err=node.error===1,hot=clamp(Number(node.act)||0,0,1);
  const color=err?COLORS.rose:node.type==="sym"?COLORS.cyan:node.type==="C"?COLORS.gold:COLORS.purple;
  const radius=node.type==="sym"?2.4+hot*2.6:2.5+hot*1.7;
  dot(ctx,p.x,p.y,color,radius);
  if((hot>.75||err)&&node.name&&node.type==="sym"){
   ctx.fillStyle="#b8d8ea";ctx.font="11px Segoe UI";ctx.fillText(String(node.name).slice(0,3),p.x+7,p.y-6);
  }
 }
 $("fieldCount").textContent=fmt(geoCache.nodes.length)+" noduri · "+fmt(geoCache.edges.length)+" legături";
}
function getEpisode(){
 if(state.episode?.ready&&Array.isArray(state.episode.frames))return state.episode;
 return null;
}
function textContextCoord(text){
 // Circular average of truly learned 5D character locations (a derived
 // context projection, NOT an independently trained sentence embedding).
 const pos=new Map(Array.isArray(state.graph?.U)?state.graph.U.map(x=>[Number(x[0]),x[1]]):[]);
 const sequence=String(text||"").slice(-32),c=[];
 for(let d=0;d<5;d++){
  let sx=0,sy=0,n=0;
  for(const ch of sequence){
   const q=pos.get(ch.charCodeAt(0));if(!q||!finite(q[d]))continue;
   sx+=Math.cos(q[d]*Math.PI*2);sy+=Math.sin(q[d]*Math.PI*2);n++;
  }
  c[d]=n?Math.atan2(sy,sx)/Math.PI:0;
 }
 return c;
}
function pathPoint(str,i,total,w,h,bottom=false){
 const position=textContextCoord(str),num=Math.max(1,total);
 const spread=w-55,x=26+spread*clamp(i/num,0,1);
 const ax=+($("axisY").value||1),az=+($("axisZ").value||2);
 const y=(bottom?h*.76:h*.27)+position[ax]*(bottom?45:42)+position[az]*17;
 return {x,y};
}
function paths(){
 const canvas=$("paths"),{ctx,w,h}=sizeCanvas(canvas),ep=getEpisode();
 ctx.clearRect(0,0,w,h);
 if(!ep){emptyMessage(canvas,"Forma încă nu a apărut","Predicția este afișată numai după învățarea reală");return;}
 const shape=ep.initialShape||[],frames=ep.frames||[];
 const total=Math.max(1,shape.length-1,frames.length-1);
 ctx.strokeStyle="#24415a";ctx.lineWidth=1;
 for(let j=0;j<5;j++){let y=22+j*(h-40)/4;ctx.beginPath();ctx.moveTo(12,y);ctx.lineTo(w-12,y);ctx.stroke();}
 label(ctx,"PERSPECTIVA GLOBALĂ · ÎNAINTE DE PRIMA ACȚIUNE",16,19,COLORS.gold,"11px Segoe UI");
 label(ctx,"PERSPECTIVA CORPULUI · EXECUȚIA LOCALĂ",16,h*.55,COLORS.cyan,"11px Segoe UI");
 if(!shape.length){label(ctx,"Modelul nu a găsit încă forma.",20,55);return;}
 const top=shape.map((value,i)=>pathPoint(value,i,total,w,h,false));
 for(let i=1;i<top.length;i++)line(ctx,top[i-1],top[i],COLORS.gold,2.4);
 top.forEach((p,i)=>dot(ctx,p.x,p.y,i===top.length-1?COLORS.mint:COLORS.gold,3.5));
 const cap=clamp(state.frame,0,Math.max(0,frames.length-1));
 const bottom=frames.map((f,i)=>pathPoint(f?.state||"",i,total,w,h,true));
 for(let i=1;i<=cap;i++){
  const f=frames[i],from=bottom[i-1],to=bottom[i];
  for(const [j,alt] of (f?.alternatives||[]).slice(0,5).entries()){
   if(!alt.state||alt.state===f.state)continue;
   const p=pathPoint(alt.state,i,total,w,h,true);p.y+=((j%2)?1:-1)*(j+1)*6;
   line(ctx,from,p,COLORS.purple+"65",.9,true);
  }
  line(ctx,from,to,f?.alignedWithInitial===false?COLORS.rose:COLORS.cyan,2.3);
 }
 for(let i=0;i<=cap&&i<bottom.length;i++){
  const f=frames[i];dot(ctx,bottom[i].x,bottom[i].y,f?.alignedWithInitial===false?COLORS.rose:COLORS.cyan,
    i===cap?6:3);
 }
 if(frames[cap]?.correctedShape?.length>1){
  let cursor=bottom[cap];for(let k=1;k<frames[cap].correctedShape.length&&k<8;k++){
   const next=pathPoint(frames[cap].correctedShape[k],cap+k,total,w,h,true);
   line(ctx,cursor,next,COLORS.mint+"9c",1.7,true);cursor=next;
  }
 }
 label(ctx,"Predicție inițială: "+String(ep.globalPrediction||"").slice(0,70),16,h*.48,
  "#acc6d6","11px Consolas");
 const f=frames[cap]||{};
 label(ctx,"Pas "+cap+"/"+Math.max(0,frames.length-1)+
  " · "+(f.alignedWithInitial===false?"abatere/recalculare":"predicție urmărită"),16,h-14,
  f.alignedWithInitial===false?COLORS.rose:COLORS.mint,"11px Consolas");
}
function showFrame(){
 const episode=getEpisode();
 const frames=episode?.frames||[];
 const max=Math.max(0,frames.length-1);
 state.frame=clamp(state.frame,0,max);
 $("pathStep").max=String(max);$("pathStep").value=String(state.frame);
 $("pathFrame").textContent=state.frame+" / "+max;
 if(!episode){$("pathInfo").textContent=
   "Aștept episodul REAL de predicție din textul pe care organismul îl învață. "+
   (state.graph?.textMaze?.reason||"Până atunci nu există o linie dovedită de afișat.");return;}
 const f=frames[state.frame]||{};
 const s=[
  "Episod: "+(episode.epoch??"—")+" · Observații anterioare: "+(episode.modelRowsBeforeNewObservation??0),
  "Șase perspective de context: "+(episode.scales||[]).join(" / "),
  "Forma anticipată înainte de acțiune: "+String(episode.globalPrediction||"").slice(0,240),
  "Ținta semantică verificată independent: NU",
  "Cadru "+state.frame+" / "+max,
  "Stare curentă: "+String(f.state||"").slice(0,200),
  state.frame===0?"Acțiuni încă neexecutate":"Acțiune emisă: "+JSON.stringify(f.action),
  "Aliniere la planul inițial: "+(f.alignedWithInitial===false?"NU — traseu diferit":"DA / încă necunoscut"),
  "Ramuri învățate: "+(f.alternatives?.length||0),
  "Traseu corectat: "+(f.correctedShape?f.correctedShape.join(" → ").slice(0,200):"—"),
  "Acțiuni ale cursorului: "+(episode.bodyActions??0)+" · abateri: "+(episode.divergences??0)+" · recalculări: "+(episode.replans??0)
 ];
 $("pathInfo").textContent=s.join("\n");
}
function updatePath(snap){
 const epi=snap?.textMaze;
 if(!epi||epi.epoch==null)return;
 const id=[epi.epoch,epi.modelRowsBeforeNewObservation,epi.ready].join(":");
 if(id!==state.episodeKey){state.episodeKey=id;state.episode=epi;state.frame=0;state.playing=true;state.frameAt=0;showFrame();}
}
function renderOperators(){
 const box=$("ops"),data=state.graph?.observedTransformations||
  state.summary?.observedTransformations;
 const operators=Array.isArray(data?.topOperators)?data.topOperators.slice(0,16):[];
 box.replaceChildren();
 if(!operators.length){
  box.append(el("p","Încă nu există operatori din comparații observate. Nu desenez ramuri inventate.","dim"));
  return;
 }
 for(const op of operators){
  const row=el("div","","op"),description=el("span",
   (op.from??"∅")+"  →  "+(op.to??"∅"),"p");
  const support=el("b",fmt(op.observedSupport??op.sourceObservations??0)+" obs.","c");
  description.title=String(op.kind||"")+" · "+String(op.key||"");
  row.append(description,support);box.append(row);
 }
}
function drawChart(){
 const canvas=$("chart"),{ctx,w,h}=sizeCanvas(canvas),points=state.telemetry;
 ctx.clearRect(0,0,w,h);
 if(points.length<2){emptyMessage(canvas,"Aștept cel puțin două măsurători","Seriile nu sunt inventate înaintea antrenării");return;}
 const left=36,right=w-14,top=16,bottom=h-23;const minT=points[0].at,maxT=points.at(-1).at;
 const series=[
  {name:"chars",color:COLORS.cyan,get:p=>p.chars},
  {name:"operators",color:COLORS.gold,get:p=>p.updates},
  {name:"mistakes",color:COLORS.rose,get:p=>p.noiseDecisions}
 ];
 for(let i=0;i<4;i++){
  const y=top+(bottom-top)*i/3;line(ctx,{x:left,y},{x:right,y},"#2b3e50aa",.7);
 }
 for(const S of series){
  const valid=points.filter(p=>finite(S.get(p))),values=valid.map(S.get);
  if(valid.length<2)continue;
  const min=Math.min(...values),max=Math.max(...values);
  ctx.strokeStyle=S.color;ctx.lineWidth=2;ctx.beginPath();
  for(let i=0;i<valid.length;i++){
   const p=valid[i],x=left+(right-left)*(maxT===minT?i/(valid.length-1):(p.at-minT)/(maxT-minT)),
    y=bottom-(bottom-top)*(max===min?0:(S.get(p)-min)/(max-min));
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.stroke();
 }
 label(ctx,"Timp →",left,bottom+17,"#99aec5","10px Segoe UI");
 label(ctx,fmt(points.at(-1)?.chars)+" caractere",right-160,bottom+17,COLORS.cyan,"10px Segoe UI");
}
function drawMath(){
 const c=$("mathPath"),{ctx,w,h}=sizeCanvas(c),plan=state.mathResult?.plan;
 ctx.clearRect(0,0,w,h);
 if(!plan?.found||!Array.isArray(plan.states)||!plan.states.length){
  label(ctx,"Traseu numeric nedemonstrat",18,35,COLORS.gold,"16px Georgia");
  label(ctx,"Aștept observații numerice reale din corpus / obiectiv.",18,60,"#9eb3c5","12px Segoe UI");
  return;
 }
 const rows=plan.states,n=rows.length;
 const numbers=rows.map(s=>[...String(s).matchAll(/\d+/gu)].map(x=>Number(x[0])));
 const vals=numbers.map(x=>x.at(-1)).filter(finite);
 const min=Math.min(...vals),max=Math.max(...vals),normal=v=>max===min?0:(v-min)/(max-min);
 const pts=rows.map((s,i)=>({x:22+(w-44)*(n<2?0:i/(n-1)),y:h-38-70*normal(numbers[i].at(-1))}));
 for(let i=1;i<pts.length;i++)line(ctx,pts[i-1],pts[i],COLORS.gold,2.5);
 pts.forEach((p,i)=>{dot(ctx,p.x,p.y,i===pts.length-1?COLORS.mint:COLORS.gold,4);
  label(ctx,(i+1)+": "+String(rows[i]).slice(0,23),p.x+5,p.y-9,i===pts.length-1?COLORS.mint:"#b2cbdd","10px Consolas");
 });
 label(ctx,"Poziții derivate din ultima valoare numerică observată / prezisă",16,h-13,"#8ba8bc","10px Segoe UI");
}
function renderLiveMath(){
 const x=state.graph?.realMathAxes||state.summary?.realMathAxes;
 if(!x){$("mathStats").textContent="Cercetarea axelor numerice nu este activă în worker (pornește cu START_MAGIC_REAL.ps1).";return;}
 const prediction=x.predictiveState||null;
 if(prediction){
  const f=n=>n==null?"—":Number(n).toFixed(3);
  $("predictiveState").textContent=
   "Perechi observate: "+fmt(prediction.pairs)+
   " · utilizabile: "+fmt(prediction.usable)+
   " · învățare: "+fmt(prediction.training)+
   " · validare: "+fmt(prediction.validationScored)+
   " · test nevăzut: "+fmt(prediction.testScored)+
   " · axe contextuale selectate: "+fmt(prediction.selectedContextAxes)+
   "\nMAE test: constant "+f(prediction.prequentialTestBaselineMAE)+
   " / contextual "+f(prediction.prequentialTestContextMAE)+
   " / selectat "+f(prediction.prequentialTestSelectedMAE)+
   "\n"+(prediction.last?.scorable?
     "Predicție anterioară: "+f(prediction.last.predictedBaseline)+
     " / contextual "+f(prediction.last.predictedContextual)+
     " · observat "+prediction.last.delta+" · set "+prediction.last.split:
     "Insuficiente observații pentru o predicție înainte de învățare.")+
   "\nAsocieri observate în text; cauzalitatea și limbajul general nu sunt demonstrate.";
 }else $("predictiveState").textContent="Aștept măsurători reale din worker.";
 $("mathStats").textContent=
  "Rânduri reale observate: "+fmt(x.rows)+
  " · perechi numerice extrase: "+fmt(x.candidatePairs)+
  " · axe cuplate acceptate: "+fmt(x.coupledPairs)+
  " · câmpuri dependente de stare: "+fmt(x.stateDependentPairs)+
  " · structuri cunoscute: "+fmt(x.templatesCoupled)+
  " · axe în ultima structură: "+fmt(x.axes?.transformationRank)+
  ". \n"+(x.lastExample?"Ultima dovadă: "+x.lastExample.before+" → "+x.lastExample.after:"Nu există încă perechi acceptate; nu afișez rezultate inventate.");
}
function displayMetrics(){
 const G=state.graph,S=state.summary;
 document.documentElement.dataset.magicConnected=String(!!G);
 document.documentElement.dataset.magicObservedChars=String(S?.chars??G?.chars??0);
 const language=G?.language||S?.language||{},op=G?.observedTransformations||S?.observedTransformations||{};
 $("mChars").textContent=fmt(S?.chars??G?.chars);
 const D=S?.dataset||G?.dataset||null;
 $("mExercises").textContent=D?.trainingTotal!=null?
  fmt(D.processed)+" / "+fmt(D.trainingTotal):fmt(S?.exercises??G?.exercises);
 $("mDatasetPct").textContent=D?.percent!=null?D.percent.toFixed(2)+"%":"—";
 $("datasetProgressBar").value=D?.percent!=null?clamp(D.percent,0,100):0;
 $("datasetProgressBar").setAttribute("aria-valuetext",D?.percent!=null?
  D.percent.toFixed(2)+"% din datasetul de antrenare":"Totalul exercițiilor nu este disponibil");
 $("datasetProgressDetail").textContent=D?
  "Procesate "+fmt(D.processed)+" din "+fmt(D.trainingTotal)+
  " exemple pentru acest creier · rămase "+fmt(D.remaining)+
  " · fișiere "+fmt(D.fileCount)+
  " · exemple în întregul dataset "+fmt(D.datasetRows)+
  " · rezervate evaluării (NU antrenate) "+fmt(D.heldOutRows)+
  " · simbolurile unice ale grafului sunt alt indicator":
  "Aștept metadata reală a datasetului din /graphs. Nu estimez procentul din numărul nodurilor.";
 $("mTokens").textContent=fmt(language.observedTokens);
 $("mStates").textContent=fmt(language.states);
 $("mOps").textContent=fmt(op.learnedOperators);
 $("mAccuracy").textContent=pct(S?.test?.aligned);
 const gpu=G?.gpu||S?.gpu||null;
 $("gpu").textContent=gpu?
  "Motor: "+(gpu.info?.name||gpu.info?.device||gpu.settings?.device||"necunoscut")+
  " · Fază: "+(gpu.batch?.phase||"—")+
  " · lot: "+fmt(gpu.batch?.done)+" / "+fmt(gpu.batch?.total)+
  " · învățare text CUDA: "+(gpu.text?.acc!=null?pct(gpu.text.acc):"încă fără metrică"):
  "CUDA: nu apare încă în snapshotul original. Verifică dacă ai pornit cu -Gpu cuda:0.";
 const newest=String(G?.text||"");
 if(newest.length&&S?.chars!==state.lastChar){
  state.lastChar=S?.chars??0;$("stream").textContent=newest.slice(-420);
 }
 const status=S?.status||"așteptare",failure=S?.error||null;
 $("connection").replaceChildren(el("i","","dots "+(failure?"error":G?"online":"")),document.createTextNode(
  failure?" Eroare worker":G?" Worker conectat":" Se așteaptă graf"));
 $("connectionDetail").textContent=failure||("Worker #"+state.w+" · "+status+
  " · ultimul snapshot "+(G?.snapshotAt?new Date(G.snapshotAt).toLocaleTimeString("ro-RO"):"încă nu există"));
 $("workerInfo").textContent="Stare: "+status+
  "\nLumi: "+(S?.worlds?.join(" / ")||"—")+
  "\nExerciții consumate: "+fmt(D?.processed??S?.exercises)+
  " / "+fmt(D?.trainingTotal)+" · corpus: "+(D?.percent!=null?D.percent.toFixed(2)+"%":"—")+
  " · rămase "+fmt(D?.remaining)+
  "\nNoduri: "+fmt(S?.nodeCount)+
  "\nMuchii: "+fmt(S?.edgeCount);
 if(G?.controls&&finite(G.controls.gnoise)&&!state.selected){
  $("noise").value=String(clamp(G.controls.gnoise,0,12));
 }
 $("noiseOut").textContent=G?.controls?.gnoise!=null?fmt(G.controls.gnoise):"—";
 const observedScales=Array.isArray(language.trust)?language.trust:[];
 $("scaleTrust").textContent=observedScales.length?
  observedScales.map(x=>x.scale+" tokeni: "+pct(x.accuracy)+" · "+fmt(x.seen)+" observații").join("\n")+
  "\nAceste valori sunt estimări DIN ANTRENARE, nu note de examen pe date nevăzute.":
  "Nu există încă suficiente observații de context pentru activarea perspectivelor.";
 renderLiveMath();
}
function mergeWorkers(list){
 const selected=$("worker"),value=String(state.w),old=[...selected.options].map(o=>o.value);
 const next=list.map(x=>String(x.w));
 if(old.join(",")!==next.join(",")){
  selected.replaceChildren(...list.map(x=>{const opt=el("option","#"+x.w+" · "+x.arm+" · "+x.status);opt.value=String(x.w);return opt;}));
 }
 selected.value=value;
}
function setSelected(w){
 state.w=w;state.summary=null;state.graph=null;state.telemetry=[];state.lastAt=0;
 state.episode=null;state.episodeKey="";state.frame=0;state.playing=true;state.mathResult=null;
 state.dx=0;state.dy=0;state.zoom=1;state.rotation=0;state.selected=false;
 seenGraph=null;geoCache=null;$("ops").replaceChildren(el("p","Aștept datele noului creier…","dim"));
 showFrame();displayMetrics();
}
async function requestJson(uri,method="GET"){
 const r=await fetch(uri,{method,cache:"no-store"});
 if(!r.ok)throw Error(uri+" HTTP "+r.status);
 return r.json();
}
async function poll(){
 if(state.pull)return;state.pull=true;
 try{
  const listing=await requestJson("/graphs"),workers=listing.graphs||[];
  mergeWorkers(workers);
  state.summary=workers.find(x=>Number(x.w)===state.w)||null;
  let snap=null;try{snap=await requestJson("/graph?w="+state.w);}catch(e){if(state.summary?.status==="eroare")throw e;}
  if(Array.isArray(snap?.nodes)){state.graph=snap;updatePath(snap);renderOperators();}
  const telemetry=await requestJson("/telemetry?w="+state.w+"&after="+(state.lastAt||0));
  if(Array.isArray(telemetry.points)){
   const added=telemetry.points.filter(p=>finite(p.at)&&p.at>state.lastAt);
   state.telemetry.push(...added);
   state.telemetry=state.telemetry.slice(-360);
   if(added.length)state.lastAt=added.at(-1).at;
  }
  displayMetrics();
  state.status="";
 }catch(e){
  state.status=String(e.message);
  $("connection").replaceChildren(el("i","","dots error"),document.createTextNode(" Server indisponibil"));
  $("connectionDetail").textContent=state.status+" · reluare automată";
 }finally{state.pull=false;}
}
function frame(t){
 const epi=getEpisode();
 if(epi&&state.playing&&t-state.frameAt>520){
  state.frameAt=t;
  if(state.frame<(epi.frames?.length||1)-1){state.frame++;showFrame();}
  else state.playing=false;
 }
 field();paths();drawMath();drawChart();
 requestAnimationFrame(frame);
}
const sync=()=>poll();
async function control(action){
 try{await requestJson("/control?do="+encodeURIComponent(action)+"&w="+state.w,"POST");await sync();}
 catch(e){$("connectionDetail").textContent="Eroare control "+action+": "+e.message;}
}
$("start").onclick=()=>control("start");
$("pause").onclick=()=>control("pause");
$("save").onclick=()=>control("save");
$("check").onclick=()=>sync();
$("worker").onchange=e=>{setSelected(Number(e.target.value)||0);sync();};
$("noise").oninput=e=>{state.selected=true;$("noiseOut").textContent=e.target.value;};
$("applyNoise").onclick=async()=>{
 try{const value=Number($("noise").value);
  await requestJson("/controls?w="+state.w+"&gnoise="+encodeURIComponent(value),"POST");
  $("noiseOut").textContent=String(value);state.selected=false;await sync();
 }catch(e){$("connectionDetail").textContent="Noise nu a fost aplicat: "+e.message;}
};
$("pathPrev").onclick=()=>{state.playing=false;state.frame=clamp(state.frame-1,0,Math.max(0,(getEpisode()?.frames?.length||1)-1));showFrame();};
$("pathNext").onclick=()=>{state.playing=false;state.frame=clamp(state.frame+1,0,Math.max(0,(getEpisode()?.frames?.length||1)-1));showFrame();};
$("pathPlay").onclick=()=>{const max=(getEpisode()?.frames?.length||1)-1;
 if(state.frame>=max)state.frame=0;state.playing=!state.playing;state.frameAt=0;showFrame();
 $("pathPlay").textContent=state.playing?"Ⅱ":"▶";
};
$("pathStep").oninput=e=>{state.playing=false;state.frame=+e.target.value;showFrame();};
$("recenter").onclick=()=>{state.dx=state.dy=state.rotation=0;state.zoom=1;};
$("mathPlan").onclick=async()=>{
 $("mathOut").textContent="Caută în transformările numerice observate…";
 try{
  const request="/real-math-plan?w="+state.w+
   "&start="+encodeURIComponent($("mathStart").value)+
   "&index="+encodeURIComponent($("mathIndex").value)+
   "&value="+encodeURIComponent($("mathValue").value);
  const found=await requestJson(request,"POST");
  if(found.error)throw Error(found.error);
  state.mathResult=found;
  $("mathOut").textContent=JSON.stringify({
   source:found.explanation||"same native observed text worker",
   found:found.found,field:found.field,goal:found.goals,
   initial:found.input,states:found.plan?.states||[],
   actions:found.plan?.actions||[],expanded:found.plan?.expanded||0,
   holonomy:found.holonomy,
   predictiveFirstMovement:found.preActionEffect||null,
   readOnly:found.frozen,semanticVerifier:found.independentSemanticVerifier,
   reason:found.plan?.reason||null
  },null,2);
 }catch(e){
  state.mathResult=null;
  $("mathOut").textContent="Modelul n-a demonstrat încă această cale: "+e.message;
 }
};
$("autoProbe").onclick=async()=>{
 $("probeStatus").textContent="Căutare pe creierul real…";
 try{
  const data=await requestJson("/language-maze?w="+state.w+"&auto=1&maxDepth=5","POST");
  if(data.error)throw Error(data.error);
  $("probe").textContent=JSON.stringify({
   source:"Native V17 observed transformations, frozen search",
   found:!!data.found,reason:data.reason||null,
   initialShape:data.initialShape||null,
   predicted:data.predicted||null,
   searchNodes:data.search?.nodes?.length||0,searchEdges:data.search?.edges?.length||0,
   actualBodyMoves:data.body?.executed||0,
   correctByObservedEffects:!!data.verifiedByObservedEffect,
   independentSemanticVerification:false,
   selfGoal:data.selfGoal||null
  },null,2);
  $("probeStatus").textContent=data.found?"Traseu găsit de V17":"Nicio cale învățată";
 }catch(e){$("probeStatus").textContent="Probă nereușită";$("probe").textContent=String(e.message);}
};
const fieldCanvas=$("field");
fieldCanvas.addEventListener("pointerdown",e=>{
 state.hold={x:e.clientX,y:e.clientY,dx:state.dx,dy:state.dy};fieldCanvas.setPointerCapture(e.pointerId);
});
fieldCanvas.addEventListener("pointermove",e=>{
 if(!state.hold)return;
 state.dx=state.hold.dx+e.clientX-state.hold.x;state.dy=state.hold.dy+e.clientY-state.hold.y;
});
fieldCanvas.addEventListener("pointerup",()=>state.hold=null);
fieldCanvas.addEventListener("pointercancel",()=>state.hold=null);
fieldCanvas.addEventListener("wheel",e=>{e.preventDefault();state.zoom=clamp(state.zoom*Math.exp(-e.deltaY*.0008),.3,4);},{passive:false});
for(const id of ["axisX","axisY","axisZ"])$(id).onchange=()=>{state.rotation=0;};
document.addEventListener("keydown",e=>{if(e.key==="Escape")state.playing=false;});
async function cycle(){await poll();setTimeout(cycle,1200);}
showFrame();requestAnimationFrame(frame);cycle();
// Expose a test-only readonly display snapshot for browser acceptance checks.
Object.defineProperty(window,"MAGIC_OBSERVATORY",{
 get:()=>({worker:state.w,connected:!!state.graph,chars:state.summary?.chars??null,
  traceEpoch:state.episode?.epoch??null,nodeCount:state.graph?.nodes?.length??0,
  telemetryCount:state.telemetry.length}),
 configurable:false
});
