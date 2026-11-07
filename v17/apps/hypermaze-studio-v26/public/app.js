// Original V26 browser UI. ALL graph data comes from /api/events, which is
// produced by actual causal text transitions + original Discoverer.shape().
const $=id=>document.getElementById(id);
const fmt=(n,d=0)=>Number.isFinite(+n)?(+n).toLocaleString("ro-RO",{
  maximumFractionDigits:d,minimumFractionDigits:d}):"—";
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let status=null,lastId=null,visibleLast=null;
let replayAt=0,replayTimer=null,replayPinned=false;
let projection="full",axisSlice=0,showEdges=true,showField=true;
let view={zoom:1,panX:0,panY:0,dragging:false,downX:0,downY:0,
  prevX:0,prevY:0,hover:null,coords:[]};
const canvas=$("graphCanvas"),ctx=canvas.getContext("2d");
let connectionOk=false,controlsLoaded=false,pending=false,toastTimer=null;
function toast(message,isError=false){
  const el=$("toast");el.textContent=String(message);el.classList.toggle("error",isError);
  el.classList.add("visible");clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove("visible"),4500);
}
function text(id,value){$(id).textContent=String(value);}
function connection(online){
  connectionOk=online;const el=$("connection");
  el.classList.toggle("connected",online);el.classList.toggle("error",!online);
  text("connectionText",online?"Motor live conectat":"Conexiune întreruptă");
}
async function command(action,rest={}){
  if(pending&&action!=="pause")return;
  pending=true;
  try{
    const response=await fetch("/api/control",{method:"POST",
      headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...rest})});
    const payload=await response.json();
    if(!response.ok||!payload.ok)throw Error(payload.error||"Control failed");
    if(action==="save"&&payload.result?.path){
      $("checkpointPath").value=payload.result.path;
      toast("Checkpoint real salvat: "+payload.result.path);
    }
    if(action==="evaluate")toast("Evaluarea holdout este completă și modelul a rămas înghețat");
    if(action==="reset"){visibleLast=null;lastId=null;replayAt=0;}
    if(payload.result?.stats||payload.result?.phase)consume(payload.result);
    return payload.result;
  }catch(err){toast(err.message||err,true);throw err;}
  finally{pending=false;}
}
function controls(model){
  if(controlsLoaded)return;
  for(const key of ["axes","words","noise","batch","recordEvery"]){
    if(model.config[key]!==undefined)$(key).value=model.config[key];
  }
  if(model.source?.path)$("corpusPath").value=model.source.path;
  updateSliderLabels();controlsLoaded=true;
}
function updateSliderLabels(){
  for(const key of ["axes","words","noise","batch","recordEvery"]){
    const value=$(key).value;
    text(key+"Val",key==="noise"?(+value).toFixed(2):fmt(+value));
  }
}
function updateMetrics(s){
  const st=s.stats||{};
  text("mWorlds",fmt(st.trainWorlds||0));
  text("mWorldSub",fmt(st.trainTokenVisits||0)+" tokenuri observate în exerciții");
  text("mAccuracy",st.holdoutWorlds?fmt(st.holdoutFirstShapeRate*100,1)+"%":"—");
  text("mAccSub",fmt(st.holdoutExactShape||0)+" / "+fmt(st.holdoutWorlds||0)+" lumi holdout înghețate");
  text("mLearned",fmt(st.learnedActionRules||0)+" / "+fmt(s.physicsAxes?.length||0));
  text("mLearnedSub",fmt(st.actionsObserved||0)+" observații cauzale înregistrate");
  text("mThroughput",fmt(st.trainMBs||0,3)+" MB/s");
  text("mTotal",fmt(st.totalMB||0,2)+" MB de stări textuale procesate");
  text("mStates",fmt(s.last?.graphNodes||0));
  text("mEdges",fmt(s.last?.graphEdges||0)+" legături cauzale");
  text("datasetInfo",s.source?
    s.source.path+"\n"+fmt(s.source.sizeBytes)+" bytes sursă · "+
    fmt(s.source.sampledBytes)+" bytes eșantionați · "+
    fmt(s.source.trainTokens)+" train / "+fmt(s.source.testTokens)+" holdout\n"+
    s.source.split:"Nu există corpus încă");
  text("runSummary",(s.running?"TRAINING LIVE":"STARE: "+s.phase.toUpperCase())+
    " · "+fmt(st.modelUpdates||0)+" actualizări · "+
    fmt(st.errors||0)+" erori");
  const started=s.phase==="running",loading=s.evaluating;
  $("startBtn").disabled=started||loading;
  $("pauseBtn").disabled=!started;
  $("stepBtn").disabled=started||loading;
  $("evalBtn").disabled=loading;
  $("resetBtn").disabled=loading;
  $("applyBtn").disabled=loading;
}
function updateRules(s){
  const list=s.learned||[];
  text("rulesCount",fmt(list.length)+" axe observate");
  if(!list.length){
    $("effectsList").innerHTML='<div class="empty">Motor rece. Primele acțiuni fizice sunt observate în timpul antrenării.</div>';
    return;
  }
  $("effectsList").innerHTML=list.map((r,i)=>
    '<div class="effect-row"><small>#'+i+'</small><span><strong>'+
    escape(r.from)+'</strong> → '+escape(r.to)+
    '</span><small>×'+fmt(r.count)+'</small></div>').join("");
}
function updateLog(s){
  const entries=(s.logs||[]).slice().reverse();
  $("logList").innerHTML=entries.length?entries.map(x=>
    '<div class="log-entry"><span class="time">'+escape((x.time||"").slice(11,19))+
    '</span><span class="type '+escape(x.level)+'">'+escape(x.level)+
    '</span><span>'+escape(x.text)+'</span></div>').join(""):
    '<div class="empty">Nu există încă evenimente.</div>';
}
function renderLast(record){
  if(!record)return;
  // Every selectable axis corresponds to an ACTUAL learned graph dimension.
  const dimension=record.graph?.dimension||0;
  const axisPicker=$("axisSelect");
  if(dimension&&axisPicker.options.length!==dimension){
    axisPicker.innerHTML=Array.from({length:dimension},(_,i)=>
      '<option value="'+i+'">Axa '+i+' · '+
      escape(record.graph.axes?.[i]?.from||"")+' → '+
      escape(record.graph.axes?.[i]?.to||"")+'</option>').join("");
    axisSlice=Math.min(axisSlice,dimension-1);
    axisPicker.value=String(axisSlice);
  }
  text("graphBadge",record.found?"PATH READY · "+record.learnedAxes+" AXE":
    "NO PATH · "+record.reason);
  text("graphLiveText","EXERCIȚIUL #"+record.id+" · "+record.kind.toUpperCase()+
    " · "+fmt(record.inputWords)+" TOKENURI");
  text("gField",record.nativeFieldAtStart?fmt(record.nativeFieldAtStart,7):"—");
  text("gPlanned",fmt(record.planLength));text("gExecuted",fmt(record.actualSteps));
  text("gGoal",(record.goal||[]).join(", ")||"—");
  text("worldKind",record.sourceSplit==="holdout"?"FROZEN HOLDOUT":"TRAIN");
  text("iState",record.found?"TARGET ACHIEVABLE":record.reason);
  text("iWords",fmt(record.inputWords)+" words");
  text("iCorrect",record.initialPathExact?"100% exact":record.found?"Greșit":"Nicio cale");
  text("routeCount",fmt(record.planLength)+" pași");
  const steps=record.initialPath||[];
  $("replayRange").max=steps.length;
  $("replayRange").value=Math.max(0,Math.min(replayAt,steps.length));
  text("replayLabel",replayAt+" / "+steps.length);
  $("routeList").innerHTML=steps.length?steps.map((step,i)=>{
    const actual=(record.trace||[])[i];
    return '<div role="button" tabindex="0" data-route="'+i+
      '" class="route-step '+(i===replayAt-1?"active":i<replayAt?"past":"")+
      '"><span class="num">'+String(i+1).padStart(2,"0")+
      '</span><div><strong>'+escape(step.observedSource)+
      ' → '+escape(step.predictedTarget)+
      '</strong><small>Axa '+escape(step.axis)+
      ' · poziție '+fmt(step.position)+
      ' · nod '+step.from+" → "+step.to+
      '</small></div><span class="status">'+(actual?.accurate?"✓":"→")+
      '</span></div>';
  }).join(""):'<div class="empty">Nu există traseu valid în lumea observată. Organismul poate încă învăța efectele acțiunilor.</div>';
  text("textBefore",record.before||"—");
  text("textPredicted",record.plannedText||"Nu există o formă completă calculată.");
  text("textActual",record.executedText||"Nicio acțiune executată.");
}
function consume(s){
  if(!s||typeof s!=="object"||!s.stats)return;
  status=s;connection(true);controls(s);updateMetrics(s);updateRules(s);updateLog(s);
  if(s.last&&s.last.id!==lastId){
    lastId=s.last.id;
    if(!replayPinned){
      visibleLast=s.last;replayAt=s.last.initialPath?.length||0;
      renderLast(visibleLast);view.hover=null;
    }
  }else if(s.last&&visibleLast?.id===s.last.id)renderLast(visibleLast);
}
function fit(){view.zoom=1;view.panX=0;view.panY=0;}
function popcount(n){let x=n,c=0;while(x){x&=x-1;c++;}return c;}
function nodeXY(mask,k,mode,focus){
  if(mode==="layers"){
    const count=popcount(mask),signature=((mask*2654435761)>>>0)/4294967296;
    return {x:(count-k*.5)*.43,y:(signature-.5)*2.8};
  }
  if(mode==="slice"){
    let y=0;
    for(let i=0;i<k;i++)if(i!==focus){
      const bit=(mask&(1<<i))?1:-1;
      y+=bit*Math.sin(i*2.39+1)*Math.pow(.79,i%5);
    }
    return {x:(mask&(1<<focus))?.62:-.62,y:y/Math.sqrt(k)*1.15};
  }
  let x=0,y=0;
  for(let i=0;i<k;i++){
    const bit=(mask&(1<<i))?1:-1,theta=i*2.399963229728653;
    const w=1+.19*Math.sin(i*1.71);
    x+=bit*Math.cos(theta)*w;y+=bit*Math.sin(theta)*w;
  }
  return {x:x/Math.sqrt(k)*1.2,y:y/Math.sqrt(k)*1.2};
}
function canvasSize(){
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const width=canvas.clientWidth,height=canvas.clientHeight;
  if(!width||!height)return {width:0,height:0};
  const iw=Math.round(width*dpr),ih=Math.round(height*dpr);
  if(canvas.width!==iw||canvas.height!==ih){
    canvas.width=iw;canvas.height=ih;
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return {width,height};
}
function drawGraph(ts=0){
  const {width:w,height:h}=canvasSize();
  if(!w||!h){requestAnimationFrame(drawGraph);return;}
  ctx.clearRect(0,0,w,h);
  const graph=visibleLast?.graph;
  if(!graph||!graph.nodes?.length){
    ctx.textAlign="center";ctx.fillStyle="#8295af";
    ctx.font="13px 'DM Sans',sans-serif";
    ctx.fillText("Antrenarea produce primele noduri și primul traseu real…",w/2,h/2-5);
    ctx.font="11px 'DM Sans',sans-serif";
    ctx.fillText("Graful se construiește numai din efecte observate.",w/2,h/2+18);
    requestAnimationFrame(drawGraph);return;
  }
  const k=graph.dimension||graph.axes.length;
  const range=Math.min(w,h)*.255*view.zoom,centerX=w*.5+view.panX,
    centerY=h*.5+view.panY;
  const positions=graph.nodes.map(n=>{
    const p=nodeXY(n.id,k,projection,axisSlice);
    return {x:centerX+p.x*range,y:centerY+p.y*range};
  });
  view.coords=positions;
  const replayPath=(visibleLast.initialPath||[]).slice(0,replayAt);
  const passed=new Set(replayPath.map(h=>h.to));passed.add(0);
  const traversed=new Set(replayPath.map(h=>h.from+":"+h.to));
  if(showEdges){
    ctx.lineWidth=.6;
    for(const e of graph.edges){
      const a=positions[e.from],b=positions[e.to];
      if(!a||!b)continue;
      ctx.strokeStyle="rgba(76,115,155,.15)";
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  }
  // Yellow = full preaction native V17 shape. Green = executed prefix at replay.
  for(const e of graph.edges)if(e.onPlan){
    const a=positions[e.from],b=positions[e.to];if(!a||!b)continue;
    const done=traversed.has(e.from+":"+e.to);
    ctx.strokeStyle=done?"#47e6b7":"#ffd36a";
    ctx.lineWidth=done?3:2.6;ctx.shadowBlur=done?8:6;
    ctx.shadowColor=done?"#41ebbd77":"#ffd36a66";
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.shadowBlur=0;
    // Movement arrow head reflects actual direction of the learned transition.
    const theta=Math.atan2(b.y-a.y,b.x-a.x),mx=a.x+(b.x-a.x)*.55,my=a.y+(b.y-a.y)*.55;
    ctx.fillStyle=done?"#4ef3c4":"#ffe59b";ctx.beginPath();
    ctx.moveTo(mx+Math.cos(theta)*4,my+Math.sin(theta)*4);
    ctx.lineTo(mx-Math.cos(theta-.7)*4,my-Math.sin(theta-.7)*4);
    ctx.lineTo(mx-Math.cos(theta+.7)*4,my-Math.sin(theta+.7)*4);
    ctx.closePath();ctx.fill();
  }
  const radius=graph.nodes.length>512?2:graph.nodes.length>200?3:4;
  for(const n of graph.nodes){
    const p=positions[n.id];if(!p)continue;
    const inExecuted=passed.has(n.id);
    const glow=showField?Math.min(1,n.field||0):0;
    const r=n.start?7:n.goal?6:n.onPlan?5:radius;
    ctx.fillStyle=n.start?"#64b8ff":n.goal?"#b19bff":
      inExecuted?"#4ae3bb":n.onPlan?"#ffe19a":
      showField?("rgba(86,166,240,"+(.18+glow*.66)+")"):"rgba(100,130,170,.45)";
    ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
    if(n.start||n.goal||n.id===visibleLast?.graph?.path?.[replayAt]){
      ctx.strokeStyle="#ecf9ff";ctx.lineWidth=1.25;
      ctx.beginPath();ctx.arc(p.x,p.y,r+3,0,Math.PI*2);ctx.stroke();
    }
    if(k<=6&&view.zoom>=1.2&&(n.onPlan||n.start||n.terminal)){
      ctx.fillStyle="#c5dbec";ctx.font="10px ui-monospace,monospace";
      ctx.fillText(n.id.toString(2).padStart(k,"0"),p.x+9,p.y-7);
    }
  }
  if(view.hover!==null){
    const n=graph.nodes[view.hover],p=positions[view.hover];
    if(n&&p){
      ctx.strokeStyle="#e2f2ff";ctx.lineWidth=1.3;
      ctx.beginPath();ctx.arc(p.x,p.y,13,0,Math.PI*2);ctx.stroke();
    }
  }
  requestAnimationFrame(drawGraph);
}
canvas.addEventListener("pointerdown",e=>{
  view.dragging=true;view.downX=e.clientX;view.downY=e.clientY;
  view.prevX=e.clientX;view.prevY=e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove",e=>{
  const rect=canvas.getBoundingClientRect();
  if(view.dragging){
    view.panX+=e.clientX-view.prevX;view.panY+=e.clientY-view.prevY;
    view.prevX=e.clientX;view.prevY=e.clientY;return;
  }
  const mx=e.clientX-rect.left,my=e.clientY-rect.top;
  let near=null,d=Infinity;
  for(let i=0;i<view.coords.length;i++){
    const p=view.coords[i],dd=(p.x-mx)**2+(p.y-my)**2;
    if(dd<d){d=dd;near=i;}
  }
  view.hover=d<225?near:null;
  const node=visibleLast?.graph?.nodes?.[view.hover];
  text("graphHover",node?
    "Nod "+node.id+" · stare "+node.id.toString(2).padStart(visibleLast.graph.dimension,"0")+
    " · valoare câmp "+fmt(node.field,6)+(node.goal?" · ȚINTĂ":""):
    "Scroll: zoom · Drag: pan · Nodurile și muchiile sunt din lumea antrenată");
});
canvas.addEventListener("pointerup",()=>{view.dragging=false});
canvas.addEventListener("pointercancel",()=>{view.dragging=false});
canvas.addEventListener("wheel",e=>{
  e.preventDefault();
  view.zoom=Math.max(.15,Math.min(7,view.zoom*(e.deltaY<0?1.12:.89)));
},{passive:false});
function replay(step){
  replayAt=Math.max(0,Math.min(visibleLast?.initialPath?.length||0,step));
  if(visibleLast)renderLast(visibleLast);
}
function stopReplay(){
  if(replayTimer!==null){clearInterval(replayTimer);replayTimer=null;}
  replayPinned=false;text("replayPlay","▶ Replay");
}
function toggleReplay(){
  if(replayTimer!==null){stopReplay();return;}
  if(!visibleLast?.initialPath?.length)return toast("Nu există încă un traseu de redat");
  replayPinned=true;
  if(replayAt>=visibleLast.initialPath.length)replay(0);
  text("replayPlay","Ⅱ Stop");
  replayTimer=setInterval(()=>{
    if(replayAt>=visibleLast.initialPath.length){stopReplay();return;}
    replay(replayAt+1);
  },570);
}
$("startBtn").addEventListener("click",()=>command("start").catch(()=>{}));
$("pauseBtn").addEventListener("click",()=>command("pause").catch(()=>{}));
$("stepBtn").addEventListener("click",()=>command("step").catch(()=>{}));
$("evalBtn").addEventListener("click",()=>{
  const count=Math.max(1,Math.min(10000,Number($("evalCount").value)||100));
  command("evaluate",{count}).catch(()=>{});
});
$("saveBtn").addEventListener("click",()=>command("save").catch(()=>{}));
$("restoreBtn").addEventListener("click",()=>{
  const file=$("checkpointPath").value.trim();
  if(!file)return toast("Introdu calea checkpointului din jurnal",true);
  command("restore",{file}).catch(()=>{});
});
$("resetBtn").addEventListener("click",()=>{
  if(confirm("Resetezi observațiile curente? Fișierele checkpoint rămân intacte.")){
    stopReplay();command("reset").catch(()=>{});
  }
});
$("applyBtn").addEventListener("click",()=>{
  const config={};
  for(const key of ["axes","words","noise","batch","recordEvery"])
    config[key]=Number($(key).value);
  command("configure",{config}).then(()=>toast("Parametrii au fost aplicați")).catch(()=>{});
});
for(const key of ["axes","words","noise","batch","recordEvery"])
  $(key).addEventListener("input",updateSliderLabels);
$("loadCorpusBtn").addEventListener("click",()=>{
  const file=$("corpusPath").value.trim();
  if(!file)return toast("Introdu calea fișierului corpus",true);
  stopReplay();command("corpus",{file}).then(()=>toast("Corpus nou, împărțit train/holdout")).catch(()=>{});
});
$("uploadBtn").addEventListener("click",async()=>{
  const file=$("fileUpload").files[0];
  if(!file)return toast("Selectează un corpus de pe calculator",true);
  if(file.size>14*1024*1024)return toast("Pentru corpus mari folosește calea fișierului",true);
  try{
    const response=await fetch("/api/upload",{method:"POST",headers:{
      "Content-Type":"application/json"},body:JSON.stringify({
        name:file.name,text:await file.text()})});
    const data=await response.json();
    if(!data.ok)throw Error(data.error||"Upload nereușit");
    controlsLoaded=false;consume(data.result);
    $("corpusPath").value=data.file;toast("Corpus încărcat în server și antrenarea resetată");
  }catch(e){toast(e.message,true);}
});
$("projection").addEventListener("change",e=>{projection=e.target.value;fit()});
$("axisSelect").addEventListener("change",e=>{axisSlice=Number(e.target.value)||0;fit()});
$("showEdges").addEventListener("change",e=>{showEdges=e.target.checked});
$("showField").addEventListener("change",e=>{showField=e.target.checked});
$("fitBtn").addEventListener("click",fit);
$("replayPrev").addEventListener("click",()=>{stopReplay();replay(replayAt-1)});
$("replayNext").addEventListener("click",()=>{stopReplay();replay(replayAt+1)});
$("replayPlay").addEventListener("click",toggleReplay);
$("replayRange").addEventListener("input",e=>{stopReplay();replay(Number(e.target.value))});
$("routeList").addEventListener("click",e=>{
  const el=e.target.closest("[data-route]");
  if(el){stopReplay();replay(Number(el.dataset.route)+1);}
});
$("routeList").addEventListener("keydown",e=>{
  const el=e.target.closest("[data-route]");
  if(el&&(e.key==="Enter"||e.key===" ")){e.preventDefault();stopReplay();replay(Number(el.dataset.route)+1);}
});
function connect(){
  const events=new EventSource("/api/events");
  events.addEventListener("snapshot",e=>{
    try{consume(JSON.parse(e.data))}catch(err){console.error("Snapshot",err)}
  });
  events.addEventListener("open",()=>connection(true));
  events.addEventListener("error",()=>connection(false));
}
fetch("/api/state").then(r=>r.json()).then(consume)
  .catch(err=>{connection(false);toast("Serverul local nu răspunde: "+err.message,true)});
connect();
requestAnimationFrame(drawGraph);
