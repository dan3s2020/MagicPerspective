// V28 presentation client for the original V17 trainer.
// Uses the NEW V26 interface, NOT V26's ObservedEffects synthetic trainer.
// Every response and benchmark is delegated to ORIGINAL native V17 endpoints.
import {nativeMeasurements,summarizeNativeEvaluation,formatPct} from "/native-metrics.mjs";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=(v,d=0)=>typeof v==="number"&&Number.isFinite(v)?
  v.toLocaleString("ro-RO",{minimumFractionDigits:d,maximumFractionDigits:d}):"—";
const value=(id,v)=>{const x=$(id);if(x)x.textContent=String(v??"—");};
let state=null,metrics=null,worker=null,selectedEval=null,selectedIndex=0;
let polling=false,graphVersion=0,positions=[],screenPositions=[],lastGraph=null;
let replayTimer=null,hoverId=null,view={x:0,y:0,zoom:1,pointer:false,px:0,py:0};
let projection="full",showEdges=true,showFlow=true,initialized=false,errors=0;
const canvas=$("graphCanvas"),ctx=canvas.getContext("2d");
const notice=(message,bad=false)=>{
  const el=$("toast");el.textContent=String(message);
  el.classList.toggle("error",bad);el.classList.add("visible");
  clearTimeout(notice.timeout);notice.timeout=setTimeout(()=>el.classList.remove("visible"),4900);
};
const logs=[];
const appendLog=(level,message)=>{
  logs.unshift({time:new Date().toLocaleTimeString("ro-RO"),level,message});
  if(logs.length>50)logs.length=50;
  $("logList").innerHTML=logs.map(e=>
    '<div class="log-entry"><span class="time">'+esc(e.time)+
    '</span><span class="type '+esc(e.level)+'">'+esc(e.level)+
    '</span><span>'+esc(e.message)+'</span></div>').join("");
};
const api=async (endpoint,body=null)=>{
  const r=await fetch(endpoint,{cache:"no-store",...(body===null?{}:{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)})});
  const o=await r.json();
  if(!r.ok||o.error||o.ok===false)throw Error(o.error||"HTTP "+r.status);
  return o;
};
async function action(operation,body={}){
  try{const x=await api("/api/native-"+operation,body);
    appendLog("success","Motor ORIGINAL V17: "+operation+" confirmat");
    return x;
  }catch(e){errors++;appendLog("error",e.message);notice(e.message,true);throw e;}
}
function liveIdentity(d){
  const m=nativeMeasurements(d);
  const isConnected=true;
  $("connection").classList.toggle("connected",isConnected);
  $("connection").classList.remove("error");
  value("connectionText","ORIGINAL V17 · conectat");
  value("nativeDevice",m.nativeDevice);
  const gr=d.original,source=d.corpus;
  const first=source?source.kind+" · "+fmt(source.trainRows)+
    " train · "+fmt(source.heldOut)+" holdout · "+fmt(source.totalRows)+" total":
    "Sursa originală nu este raportată";
  value("datasetInfo",(d.world||"—")+"\n"+first+
    "\nFĂRĂ conversie JSONL. Citește direct datasetul ORIGINAL din trainer.");
  $("corpusPath").value=d.world||"";
  $("checkpointPath").placeholder="Checkpoint original este administrat de START_V17.ps1 -Resume / -Out";
  const nativeControls=d.graph?.controls||{};
  if(!initialized){
    for(const [key,v]of [["axes",nativeControls.ltemp],["words",nativeControls.wtemp],
      ["noise",nativeControls.pnoise],["batch",nativeControls.gnoise],
      ["recordEvery",nativeControls.ttemp]]){
      if(typeof v==="number"&&Number.isFinite(v))$(key).value=v;
    }
    for(const key of ["axes","words","noise","batch","recordEvery"]){
      $(key).addEventListener("input",()=>{
        const o=Number($(key).value);
        value(key+"Val",o.toFixed(2));
      });
      $(key).dispatchEvent(new Event("input"));
    }
    initialized=true;
  }
  value("mWorlds",fmt(m.progressTrained));
  value("mWorldSub","din "+fmt(m.progressTotal)+" exerciții originale · "+
    m.progressPercent+" dataset");
  value("mAccuracy",formatPct(m.aligned));
  value("mAccSub","ALIGNED · "+fmt(m.heldoutN)+" caractere nevăzute · original");
  value("mLearned",formatPct(m.live));
  value("mLearnedSub","graf.live · același test și numitor V17");
  value("mThroughput",fmt(m.completedExercisesPerSecond,2)+" ex/s");
  value("mTotal",fmt(m.sustainedCharactersPerSecond)+" caractere/s susținute");
  value("mStates",fmt(m.nativeGraphNodes));
  value("mEdges",fmt(m.nativeGraphEdges)+" legături observate");
  value("gField",formatPct(m.together));
  value("gPlanned",formatPct(m.C));
  value("gExecuted",formatPct(m.field));
  value("gGoal",m.worlds.length?m.worlds.join(" + "):"—");
  value("worldKind",m.arm||"—");
  value("iState",m.status||"—");
  value("iWords",fmt(m.chars)+" simboluri");
  value("iCorrect",formatPct(m.aligned));
  value("graphBadge",fmt(m.nativeGraphNodes)+" noduri · #"+String(m.selectedWorker));
  value("graphLiveText","ORIGINAL V17 · GRAF #"+String(m.selectedWorker)+
    " · "+fmt(m.chars)+" caractere trăite");
  value("runSummary","ORIGINAL V17 / "+String(m.status||"—")+
    " / "+fmt(errors)+" erori UI");
  value("rulesCount","Măsurători originale");
  $("effectsList").innerHTML=[
    ["ALIGNED",formatPct(m.aligned)],
    ["GRAF",formatPct(m.live)],
    ["TOGETHER",formatPct(m.together)],
    ["C",formatPct(m.C)],
    ["CU CÂMP",formatPct(m.field)],
    ["MAZE SHAPE",formatPct(m.mazeShape)],
    ["MAZE SOLVED",formatPct(m.mazeSolved)],
    ["MAZE STEPS / OPTIMAL",fmt(m.mazeRatio,2)],
    ["TRANSFORM SOLVED",formatPct(m.transformSolved)],
    ["TRANSFORM FAILED",formatPct(m.transformFailedRate)],
    ["PRE-UPDATE LOSS",fmt(m.preUpdatePredictionLoss,5)],
    ["BASELINE IDENTITATE",fmt(m.identityBaselineLoss,5)]
  ].map(([name,score])=>'<div class="effect-row"><small>·</small><span>'+
    esc(name)+'</span><strong>'+esc(score)+'</strong></div>').join("");
  $("startBtn").disabled=gr?.status==="antrenează";
  $("pauseBtn").disabled=gr?.status!=="antrenează";
  return m;
}
function updateWorkerOptions(d){
  const dropdown=$("nativeWorker");
  const workers=d.workers||[];
  const current=worker;
  const options=workers.map(g=>({
    id:String(g.w),label:"#"+g.w+" · "+g.arm+" · "+(g.worlds||[]).join("+")+
      " · "+g.status
  }));
  const changed=options.map(x=>x.id+":"+x.label).join("|")!==
    [...dropdown.options].map(o=>o.value+":"+o.textContent).join("|");
  if(changed){
    dropdown.innerHTML=options.map(x=>'<option value="'+esc(x.id)+'">'+
      esc(x.label)+'</option>').join("");
  }
  if(current===null||!workers.some(x=>String(x.w)===String(current))){
    worker=d.selectedWorker;
  }
  if(worker!==null)dropdown.value=String(worker);
}
function stableRandom(id){
  const txt=String(id);let h=2166136261;
  for(let i=0;i<txt.length;i++)h=Math.imul(h^txt.charCodeAt(i),16777619);
  h>>>=0;return (h%100000)/100000;
}
function unpackPosition(p){
  if(Array.isArray(p)&&p.length>=2){
    // Native torus dimensions may contain pairs of complex coordinates.
    const floats=p.flat(Infinity).filter(x=>typeof x==="number"&&Number.isFinite(x));
    if(floats.length>=2)return floats;
  }
  return null;
}
function buildGraph(graph){
  if(!graph||!Array.isArray(graph.nodes))return null;
  // Graph nodes and links come ONLY from actual native /graph.
  // Visual layout never claims that arbitrary 2D coordinates are learned axes.
  const all=graph.nodes;
  const cap=4500,chosen=all.length<=cap?all:all.slice(-cap);
  const nodes=chosen.map((n,i)=>({
    id:String(n[0]),type:String(n[1]||""),label:String(n[2]||n[0]),
    activity:Number(n[3])||0,born:n[4],error:n[5],index:i
  }));
  const byId=new Map(nodes.map((n,i)=>[n.id,i]));
  const nativeU=new Map(graph.U||[]);
  const inferred=n=>{
    const vals=unpackPosition(nativeU.get(n.id));
    if(vals){
      if(projection==="layers")return{x:vals[2]??vals[0],y:vals[3]??vals[1]};
      if(projection==="slice")return{x:vals[1]??vals[0],y:vals[4]??vals[2]??vals[0]};
      return{x:vals[0],y:vals[1]};
    }
    const angle=stableRandom(n.id)*Math.PI*2,rad=Math.sqrt(stableRandom(n.id+"r"));
    return{x:Math.cos(angle)*rad,y:Math.sin(angle)*rad};
  };
  const xy=nodes.map(inferred);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const p of xy){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);
    minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
  const width=Math.max(.001,maxX-minX),height=Math.max(.001,maxY-minY);
  const pts=xy.map(p=>({x:2*(p.x-(minX+maxX)/2)/width,
    y:2*(p.y-(minY+maxY)/2)/height}));
  const edges=[];
  for(const e of graph.edges||[]){
    if(edges.length>=11000)break;
    const a=byId.get(String(e[0])),b=byId.get(String(e[1]));
    if(a===undefined||b===undefined)continue;
    edges.push({a,b,kind:String(e[2]||""),weight:Number(e[3])||0});
  }
  const flow=new Set();
  for(const entry of graph.flow||[]){
    if(Array.isArray(entry)&&entry.length>=2)
      flow.add(String(entry[0])+"|"+String(entry[1]));
  }
  const fromNativeAxes=xy.some((x,i)=>unpackPosition(nativeU.get(nodes[i].id)));
  return {nodes,edges,pts,flow,fromNativeAxes,totalNodes:all.length,
    totalEdges:graph.edges?.length||0,dimensions:fromNativeAxes?"native periodic U":"visual topology only"};
}
function sizeCanvas(){
  const dpr=Math.min(2,devicePixelRatio||1),w=canvas.clientWidth,h=canvas.clientHeight;
  if(w&&h&&(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr))){
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return{w,h};
}
function redraw(){
  const {w,h}=sizeCanvas();ctx.clearRect(0,0,w,h);
  if(!w||!h){requestAnimationFrame(redraw);return;}
  const g=lastGraph;
  if(!g){
    ctx.fillStyle="#90a6be";ctx.font="12px system-ui";ctx.textAlign="center";
    ctx.fillText("Aștept nodurile reale ale trainerului original V17...",w/2,h/2);
    requestAnimationFrame(redraw);return;
  }
  const scale=Math.min(w,h)*.38*view.zoom;
  const points=g.pts.map(p=>({x:w/2+view.x+p.x*scale,
    y:h/2+view.y+p.y*scale}));
  screenPositions=points;
  if(showEdges)for(const e of g.edges){
    const a=points[e.a],b=points[e.b];if(!a||!b)continue;
    const hot=g.flow.has(g.nodes[e.a].id+"|"+g.nodes[e.b].id);
    ctx.strokeStyle=hot?"rgba(66,229,180,.85)":"rgba(97,156,225,.12)";
    ctx.lineWidth=hot?1.7:Math.max(.25,.6*Math.min(1,view.zoom));
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  for(let i=0;i<g.nodes.length;i++){
    const n=g.nodes[i],p=points[i];if(!p)continue;
    const active=showFlow&&n.activity>0;
    const isError=!!n.error;
    ctx.fillStyle=isError?"#fc7085":active?"#62b2f6":"#6a809f";
    if(n.type==="C"||n.type.toLowerCase().includes("perspective"))ctx.fillStyle="#bda2fa";
    const radius=i===hoverId?5:active?2.4:1.5;
    ctx.beginPath();ctx.arc(p.x,p.y,radius,0,7);ctx.fill();
  }
  if(hoverId!==null){
    const n=g.nodes[hoverId],p=points[hoverId];
    if(n&&p){
      ctx.strokeStyle="#dff";ctx.lineWidth=1.3;
      ctx.beginPath();ctx.arc(p.x,p.y,10,0,7);ctx.stroke();
    }
  }
  requestAnimationFrame(redraw);
}
function graphUpdate(raw){
  const next=buildGraph(raw);
  if(next){
    lastGraph=next;
    value("graphHover",next.dimensions+" · "+fmt(next.totalNodes)+" noduri totale · "+
      fmt(next.totalEdges)+" legături reale · vizualizate max. 4.500 noduri");
  }
}
function drawEval(){
  if(!selectedEval)return;
  const ev=selectedEval,rows=ev.kind==="text"?ev.exercises:ev.kind==="maze"?ev.mazes:ev.tasks;
  const x=rows[selectedIndex];if(!x)return;
  const max=rows.length;
  $("replayRange").max=max-1;$("replayRange").value=selectedIndex;
  value("replayLabel",(selectedIndex+1)+" / "+max);
  value("routeCount",fmt(max)+" exerciții reale din același test");
  value("iCorrect",ev.kind==="text"?formatPct(x.answerAccuracy):
    x.solved?"Rezolvat":x.impossible&&x.said?"Imposibil recunoscut":"Nerezolvat");
  if(ev.kind==="text"){
    const full=Array.isArray(x.rows)?x.rows:[];
    // Native eval-worker supplies rows [correct character code, predicted code].
    const correct=[],guess=[],diff=[];
    const limit=Math.min(3500,full.length);
    for(let i=0;i<limit;i++){
      const [a,b]=full[i],c=codepoint(a),p=codepoint(b);
      correct.push(c);guess.push(p);
      diff.push('<span style="color:'+(a===b?"#59efbc":"#ff7994")+
        ';'+(a===b?"":"background:#66233355;")+'">'+esc(c)+'</span>');
    }
    const tail=full.length>limit?"\n… afișare limitată la "+limit+
      " din "+full.length+" caractere; testul a evaluat TOT textul.":"";
    value("textBefore",correct.join("")+tail);
    value("textPredicted",guess.join("")+tail);
    $("textActual").innerHTML=diff.join("")+esc(tail);
    value("gGoal","TEXT ORIGINAL · Q/A");
    value("nativeFrozenStatus","EXACT V17 · "+fmt(ev.count)+" exerciții · răspuns "+
      formatPct(ev.answer)+" · tot exercițiul "+formatPct(ev.all));
    if(x.shape!=null)appendLog("info","Formă din prima disponibilă pe exercițiul "+(selectedIndex+1)+
      " · shapeSame="+formatPct(x.shapeAccuracy));
  }else if(ev.kind==="maze"){
    value("textBefore","Labirint "+x.n+"×"+x.n+"\nStart: "+x.start+
      "\nGoal: "+x.goal+"\nOptimal: "+x.optimal);
    value("textPredicted","Forma soluției calculată înainte de mișcare:\n"+
      JSON.stringify(x.shapes?.[0]||null));
    value("textActual","Traseul efectiv al organismului:\n"+
      JSON.stringify(x.path||[])+"\nSolved: "+x.solved+
      "\nPași: "+x.steps+" / "+x.optimal+"\nForma inițială: "+formatPct(x.first));
    value("nativeFrozenStatus",fmt(ev.solved)+" / "+fmt(ev.count)+
      " labirinte rezolvate · forma inițială "+formatPct(ev.meanFirstShape));
  }else{
    value("textBefore","Transformări originale V17 · "+JSON.stringify(x.goals||[]));
    value("textPredicted","Traseu / predicții originale:\n"+JSON.stringify(x.frames||[]).slice(0,12000));
    value("textActual","Solved "+x.solved+"; impossible "+x.impossible+
      "; recognized "+x.said+"; failed "+x.failed+"/"+x.predicted);
    value("nativeFrozenStatus",fmt(ev.solved)+" / "+fmt(ev.validCount)+
      " transformări posibile rezolvate · predicții greșite "+formatPct(ev.failedRate));
  }
  const table=rows.map((item,i)=>ev.kind==="text"?
    {title:"#"+(i+1)+" · "+fmt(item.length)+" caractere",
      sub:"răspuns "+formatPct(item.answerAccuracy)+
       " · forma din prima "+formatPct(item.shapeAccuracy),
      accurate:item.answerAccuracy===1}:
      {title:"#"+(i+1)+" · "+(item.n??"?")+"×"+(item.n??"?"),
      sub:item.solved?"REZOLVAT":item.said?"IMPOSSIBIL":"EROARE",
      accurate:!!item.solved||!!item.said});
  $("routeList").innerHTML=table.map((v,i)=>
    '<div class="route-step '+(i===selectedIndex?"active":"")+
    '" data-eval="'+i+'" role="button" tabindex="0"><span class="num">'+
    String(i+1).padStart(2,"0")+'</span><div><strong>'+
    esc(v.title)+'</strong><small>'+esc(v.sub)+'</small></div><span class="status">'+
    (v.accurate?"✓":"·")+'</span></div>').join("");
  $("nativeResultsTable").innerHTML=table.map((v,i)=>
    '<button type="button" class="tiny-btn" data-eval="'+i+'" style="margin:3px">'+
    esc(v.title)+": "+esc(v.sub)+'</button>').join("");
}
function codepoint(n){
  if(typeof n!=="number"||!Number.isInteger(n))return "�";
  if(n===10)return "\n";if(n===9)return "\t";
  if(n<32||n>0x10ffff)return "·";
  try{return String.fromCodePoint(n)}catch{return "�";}
}
async function evaluate(){
  if(worker===null)throw Error("Nu este selectat niciun graf V17 real");
  const kind=$("nativeKind").value;
  const count=Math.trunc(Number($("evalCount").value)||12);
  value("nativeFrozenStatus","Se salvează checkpointul original și se evaluează o copie înghețată...");
  const raw=await action("eval",{worker,kind,count,
    maxChars:Math.trunc(Number($("nativeMaxChars").value)||20000),
    temperature:Number($("recordEvery").value)||0,
    noise:Number($("nativeTestNoise").value)||0});
  selectedEval=summarizeNativeEvaluation(raw);
  selectedIndex=0;drawEval();
  appendLog("success","Frozen ORIGINAL "+kind+": "+selectedEval.count+" exerciții");
}
async function poll(){
  if(polling)return;polling=true;
  try{
    const qs=worker===null?"":"?w="+encodeURIComponent(worker);
    const payload=await api("/api/native-state"+qs);
    state=payload;
    if(worker===null)worker=payload.selectedWorker;
    updateWorkerOptions(payload);
    metrics=liveIdentity(payload);
    graphUpdate(payload.graph);
    if(payload.graphError)appendLog("warn","Graf indisponibil momentan: "+payload.graphError);
  }catch(e){
    errors++;
    $("connection").classList.add("error");$("connection").classList.remove("connected");
    value("connectionText","V17 oprit / conexiune întreruptă");
    if(errors===1||errors%20===0){
      appendLog("error",e.message);
      notice("Pornește trainerul ORIGINAL V17 pe portul 8841: "+e.message,true);
    }
  }finally{polling=false;}
}
$("startBtn").addEventListener("click",()=>action("control",{action:"start",worker}).then(poll).catch(()=>{}));
$("pauseBtn").addEventListener("click",()=>action("control",{action:"pause",worker}).then(poll).catch(()=>{}));
$("saveBtn").addEventListener("click",()=>action("control",{action:"save",worker}).then(()=>
  notice("Checkpoint nativ salvat în directorul ORIGINAL -Out / brains")).catch(()=>{}));
$("resetBtn").addEventListener("click",()=>{
  if(!confirm("Resetezi REALUL V17? Checkpointul original va fi arhivat de trainerul V17. NU se resetează UI-ul V26 sintetic."))return;
  if(!confirm("CONFIRMARE FINALĂ: ștergi starea activă de antrenare a grafului selectat?"))return;
  action("control",{action:"reset",worker,confirm:"RESET_ORIGINAL_TRAINING"}).then(poll).catch(()=>{});
});
$("restoreBtn").addEventListener("click",()=>notice(
  "Checkpointul original se reia la pornirea START_V17.ps1 cu -Resume și același -Out. Niciun alt model nu este încărcat."));
$("stepBtn").addEventListener("click",()=>{
  const options=[...$("nativeWorker").options];
  if(!options.length)return notice("Nu există grafuri V17");
  const index=Math.max(0,options.findIndex(o=>String(o.value)===String(worker)));
  worker=Number(options[(index+1)%options.length].value);
  selectedEval=null;value("routeCount","Selectează Frozen Test pentru noul graf");
  poll();
});
$("evalBtn").addEventListener("click",()=>evaluate().catch(e=>{
  value("nativeFrozenStatus","EVALUARE NEREUȘITĂ: "+e.message);
}));
$("applyBtn").addEventListener("click",()=>action("params",{
  worker,ltemp:Number($("axes").value),wtemp:Number($("words").value),
  pnoise:Number($("noise").value),gnoise:Number($("batch").value),
  ttemp:Number($("recordEvery").value)
}).then(()=>notice("Parametrii originali V17 au fost aplicați; formula testelor nu s-a schimbat"))
  .catch(()=>{}));
$("loadCorpusBtn").addEventListener("click",()=>notice("Sursa este configurată numai în START_V17.ps1 -Data. "+(state?.world||"")));
$("uploadBtn").addEventListener("click",()=>notice("Nu schimbăm corpusul în UI! Se folosește split-ul original direct din Parquet."));
$("nativeWorker").addEventListener("change",e=>{
  worker=Number(e.target.value);selectedEval=null;
  value("routeCount","Apasă Frozen Test pentru evaluarea acestui graf");
  poll();
});
$("replayPrev").addEventListener("click",()=>{selectedIndex=Math.max(0,selectedIndex-1);drawEval()});
$("replayNext").addEventListener("click",()=>{selectedIndex=Math.min((selectedEval?.count||1)-1,selectedIndex+1);drawEval()});
$("replayRange").addEventListener("input",e=>{selectedIndex=Number(e.target.value);drawEval()});
$("replayPlay").addEventListener("click",()=>{
  if(replayTimer){clearInterval(replayTimer);replayTimer=null;
    value("replayPlay","▶ Replay");return;}
  if(!selectedEval)return notice("Mai întâi Frozen Test");
  value("replayPlay","Ⅱ Stop");
  replayTimer=setInterval(()=>{
    selectedIndex=(selectedIndex+1)%selectedEval.count;drawEval();
  },850);
});
for(const id of ["routeList","nativeResultsTable"])
  $(id).addEventListener("click",e=>{
    const item=e.target.closest("[data-eval]");
    if(!item)return;selectedIndex=Number(item.dataset.eval);drawEval();
  });
$("projection").addEventListener("change",e=>{
  projection=e.target.value;if(state?.graph)graphUpdate(state.graph);
});
$("showEdges").addEventListener("change",e=>{showEdges=e.target.checked});
$("showField").addEventListener("change",e=>{showFlow=e.target.checked});
$("fitBtn").addEventListener("click",()=>{view={...view,x:0,y:0,zoom:1}});
const axisOpts=$("axisSelect");
axisOpts.innerHTML=Array.from({length:5},(_,i)=>
  '<option value="'+i+'">Axa nativă '+i+"</option>").join("");
axisOpts.addEventListener("change",()=>{if(state?.graph)graphUpdate(state.graph)});
canvas.addEventListener("pointerdown",e=>{
  view.pointer=true;view.px=e.clientX;view.py=e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup",()=>{view.pointer=false});
canvas.addEventListener("pointercancel",()=>{view.pointer=false});
canvas.addEventListener("pointermove",e=>{
  if(view.pointer){
    view.x+=e.clientX-view.px;view.y+=e.clientY-view.py;
    view.px=e.clientX;view.py=e.clientY;return;
  }
  const box=canvas.getBoundingClientRect();
  const x=e.clientX-box.left,y=e.clientY-box.top;
  let best=null,dist=140;
  for(let i=0;i<screenPositions.length;i++){
    const dx=x-screenPositions[i].x,dy=y-screenPositions[i].y,d=dx*dx+dy*dy;
    if(d<dist){dist=d;best=i;}
  }
  hoverId=best;
  if(best!==null&&lastGraph?.nodes[best]){
    const n=lastGraph.nodes[best];
    value("graphHover","Nod real "+n.id+" · "+n.label+" · "+n.type+
      " · activitate "+fmt(n.activity,3));
  }
});
canvas.addEventListener("wheel",e=>{
  e.preventDefault();view.zoom=Math.max(.1,Math.min(10,
    view.zoom*(e.deltaY<0?1.1:.9)));
},{passive:false});
function announce(){
  appendLog("info","V28: designul V26, antrenament/metrici originale V17, fără sintetic.");
  appendLog("info","Trainerul original trebuie să ruleze separat pe 127.0.0.1:8841.");
  value("routeCount","Apasă Frozen Test pentru Q/A native");
  value("nativeFrozenStatus","Testezi text, labirinte sau transformări cu ACELAȘI evaluator V17.");
}
announce();
redraw();
await poll();
setInterval(poll,1600);
