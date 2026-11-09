// V44 studio: all numbers and trajectories originate from real engine events.
// requestAnimationFrame repaints ONLY observed progress. There are no fake counters.
const $=id=>document.getElementById(id);
const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString("ro-RO"):"—";
const pct=(a,b)=>Number(b)>0?(100*Number(a)/Number(b)).toFixed(2)+"%":"—";
const pretty=n=>Number.isFinite(Number(n))?Number(n).toFixed(2):"—";
const history=[],events=[],encoder=new TextEncoder();
let lastState=null,lastRecord=null,navIndex=-1,browsing=false,logs=[],olderBefore=Number.MAX_SAFE_INTEGER;
let chartRate=0,shownState="STARTUP",connected=false,selectedId=null;
let renderPending=false;
const note=(s,error=false)=>{const el=$("controlStatus");el.textContent=s;el.style.color=error?"#ff8279":"#a4cabe"};
const asBytes=b64=>{
  if(!b64)return new Uint8Array();
  const bytes=atob(b64),array=new Uint8Array(bytes.length);
  for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);
  return array;
};
const seconds=n=>{
  const t=Math.max(0,Math.floor(Number(n)||0));return [Math.floor(t/3600),Math.floor(t/60)%60,t%60]
    .map(x=>String(x).padStart(2,"0")).join(":");
};
async function send(action,params={}){
  try{
    const r=await fetch("/api/control",{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({action,...params})});
    const data=await r.json();
    if(!r.ok)throw Error(data.error||"Control request rejected");
    note("Solicitare transmisă: "+action);
  }catch(e){note(e.message,true)}
}
$("startBtn").onclick=()=>send("start");
$("pauseBtn").onclick=()=>send("pause");
$("resumeBtn").onclick=()=>send("resume");
$("saveBtn").onclick=()=>send("save");
$("stopBtn").onclick=()=>{if(confirm("Salvezi checkpointul V44 și oprești trainingul după lotul curent?"))send("stop")};
$("resetBtn").onclick=()=>{
  const word=prompt("RESET arhivează checkpointul V44 existent și pornește o sesiune nouă. Scrie exact RESET V44:");
  if(word==="RESET V44")send("reset",{confirm:word});else note("Reset anulat; checkpointul original nu a fost atins");
};
$("batchSlider").oninput=e=>$("batchLabel").textContent=e.target.value;
$("batchSlider").onchange=e=>send("batch",{size:Number(e.target.value)});
$("testBtn").onclick=()=>{const prompt=$("testPrompt").value.trim();
  if(prompt)$("testOutput").textContent="Generare în desfășurare...";
  send("test",{prompt,max_output:128});
};
$("latestRecord").onclick=()=>{browsing=false;if(lastState?.current)showRecord(lastState.current)};
$("prevRecord").onclick=()=>moveRecord(-1);
$("nextRecord").onclick=()=>moveRecord(1);
$("olderBtn").onclick=()=>loadHistory(true);
async function moveRecord(step){
  const a=logs.map(x=>x.id);let i=a.indexOf(selectedId);
  if(i<0)i=0;
  const target=a[i-step];
  if(target!==undefined)await openRecord(target);
}
async function openRecord(id){
  try{const r=await fetch("/api/exercise?id="+encodeURIComponent(id),{cache:"no-store"});
    const data=await r.json();
    if(!data.item)throw Error("Replay indisponibil pentru "+id);
    browsing=true;showRecord(data.item);
    document.querySelector("#solutions").scrollIntoView({behavior:"smooth"});
  }catch(e){note(e.message,true)}
}
async function loadHistory(older=false){
  const before=older?olderBefore:Number.MAX_SAFE_INTEGER;
  try{
    const r=await fetch("/api/history?limit=50&before="+before,{cache:"no-store"});
    const data=await r.json();
    if(!older)logs=[];
    for(const row of data.items||[])if(!logs.some(x=>x.id===row.id))logs.push(row);
    logs.sort((a,b)=>b.id-a.id);
    olderBefore=logs.length?logs[logs.length-1].id:before;
    paintJournal();
  }catch(e){note("Jurnal: "+e.message,true)}
}
function paintJournal(){
  const root=$("exerciseJournal"),fragment=document.createDocumentFragment();
  if(!logs.length){root.textContent="Niciun exercițiu complet în jurnal.";return}
  for(const entry of logs.slice(0,300)){
    const el=document.createElement("div");el.className="journalrow";el.tabIndex=0;
    const bits=[
      "#"+fmt(entry.id),
      entry.prompt_preview||"Exercițiu",
      pct(entry.before_correct,entry.bytes),
      pct(entry.shape_verified,entry.shape_total),
      pct(entry.after_correct,entry.bytes),
      fmt(entry.bytes)+" B"
    ];
    for(let i=0;i<bits.length;i++){
      const span=document.createElement("span");span.textContent=bits[i];
      if(i===1)span.className="preview";
      if(i===3||i===4)span.classList.add("ok");
      if(i===2)span.classList.add("bad");
      el.append(span);
    }
    el.onclick=()=>openRecord(entry.id);
    el.onkeydown=e=>{if(e.key==="Enter")openRecord(entry.id)};
    fragment.append(el);
  }
  root.replaceChildren(fragment);
}
function colorFull(target,maskB64,root){
  if(!root)return;
  const bits=asBytes(maskB64);
  let at=0,run="",prev=null;
  const fragment=document.createDocumentFragment();
  function flush(){
    if(!run)return;
    const s=document.createElement("span");s.className=prev===1?"match":prev===0?"miss":"unseen";
    s.textContent=run;fragment.append(s);run="";
  }
  // Show the ENTIRE original answer. Unicode graphemes are marked correct only
  // if ALL their true UTF-8 bytes matched the real model prediction.
  for(const char of String(target||"")){
    const len=encoder.encode(char).length;
    let score=null;
    if(at+len<=bits.length){
      score=1;for(let j=at;j<at+len;j++)if(bits[j]===0){score=0;break}
    }
    at+=len;
    if(prev!==score){flush();prev=score}
    run+=char;
  }
  flush();root.replaceChildren(fragment);
}
function showRecord(row){
  if(!row)return;
  selectedId=Number(row.id);
  $("recordId").textContent="EXERCIȚIUL REAL #"+fmt(row.id);
  $("recordLength").textContent=fmt(row.bytes)+" octeți · integral";
  $("questionFull").textContent=row.prompt||"";
  $("targetFull").textContent=row.answer||"";
  $("beforeScore").textContent=pct(row.before_correct,row.bytes);
  $("shapeScore").textContent=pct(row.shape_verified,row.shape_total);
  $("afterScore").textContent=pct(row.after_correct,row.bytes);
  $("beforeCounts").textContent=fmt(row.before_correct)+"/"+fmt(row.bytes)+
    " octeți · predicție condiționată pe prefixul adevărat";
  $("shapeCounts").textContent=fmt(row.shape_verified)+"/"+fmt(row.shape_total)+
    " transformări spre destinația vizibilă";
  $("afterCounts").textContent=fmt(row.after_correct)+"/"+fmt(row.bytes)+
    " octeți · scor pe același exercițiu după update";
  colorFull(row.answer,row.before_mask,$("beforeText"));
  colorFull(row.answer,row.shape_mask,$("shapeText"));
  colorFull(row.answer,row.after_mask,$("afterText"));
}
function stage(phase){
  const low=String(phase||"").toLowerCase();
  const ids=["stepRead","stepShape","stepGpu","stepCommit"];
  let active=low.includes("parquet")||low.includes("source")?0:
    low.includes("devour")||low.includes("geometry")?1:
    low.includes("cuda")||low.includes("gpu")||low.includes("update")?2:
    low.includes("commit")||low.includes("save")||low.includes("checkpoint")?3:-1;
  for(let i=0;i<ids.length;i++)$(ids[i]).classList.toggle("active",i===active);
}
const nowSeconds=()=>Math.max(0,Math.floor(Date.now()/(1000)));
function applyState(s){
  if(!s)return;
  const was=lastState?.current?.id;
  lastState=s;
  shownState=s.status;
  connected=true;
  $("liveLed").className=s.status==="ERROR"?"err":"on";
  $("connectionText").textContent=s.status;
  $("runState").textContent=s.status;
  $("completedRate").textContent=pretty(s.real_exercises_per_second);
  $("speedFill").style.width=Math.max(0,Math.min(100,Number(s.real_exercises_per_second)*10))+"%";
  $("completedTotal").textContent=fmt(s.completed);
  $("inputRead").textContent=fmt(s.source_read);
  $("sourceProgress").textContent=Number(s.committed_percent||0).toFixed(4)+"%";
  const shape=s.current?.shape_total?100*s.current.shape_verified/s.current.shape_total:
    s.first_shape_total?100*s.first_shape_verified/s.first_shape_total:0;
  $("geomPct").textContent=Number.isFinite(shape)?shape.toFixed(2)+"%":"—";
  $("geomDial").style.setProperty("--pct",Math.max(0,Math.min(100,shape)));
  $("beforePct").textContent=s.current?pct(s.current.before_correct,s.current.bytes):"—";
  $("afterPct").textContent=s.current?pct(s.current.after_correct,s.current.bytes):"—";
  $("cudaModel").textContent=(s.device||"await CUDA").toUpperCase();
  $("gpuBatchRate").textContent=pretty(s.gpu_batch_exercises_per_second)+" ex/s GPU";
  $("cudaChars").textContent=fmt(s.gpu_batch_characters_per_second)+" B/s";
  $("vramUsed").textContent=(Number(s.vram_peak_bytes||0)/1048576).toFixed(1)+" MiB";
  $("rowIndex").textContent=s.current_source_index<0?"—":"#"+fmt(s.current_source_index);
  $("phaseText").textContent=s.step||"";
  $("phaseClock").textContent=(Number(s.heartbeat_age_ms||0)/1000).toFixed(1)+" s";
  $("sourceLabel").textContent=fmt(s.train_rows)+" exerciții · "+fmt(s.files)+" fișiere · "+
    fmt(s.heldout_rows)+" ținute pentru test";
  $("operatorL2").textContent="Norma operatorului învățat: "+pretty(s.operator_l2);
  if(s.holdout){
    $("holdoutPct").textContent=pct(s.holdout.correct,s.holdout.bytes);
    $("holdoutInfo").textContent=fmt(s.holdout.correct)+"/"+fmt(s.holdout.bytes)+
      " octeți nevăzuți; predicție condiționată pe prefixul corect";
    $("operatorTest").textContent=fmt(s.holdout.prompt_operator_first_byte_correct)+"/"+
      fmt(s.holdout.prompt_operator_first_byte_total)+" exemple";
  }
  if(s.chat_result)$("testOutput").textContent=s.chat_result.text||"";
  if(!browsing&&s.current&&was!==s.current.id)showRecord(s.current);
  if(s.current&&was!==s.current.id){
    if(!logs.some(x=>x.id===s.current.id))loadHistory(false);
    const t=Date.now();
    history.push({t,rate:Number(s.real_exercises_per_second)||0,
      chars:Number(s.gpu_batch_characters_per_second)||0});
    if(history.length>240)history.shift();
    if(Array.isArray(s.graph))edges=s.graph;
  }
  stage(s.step);
  if(s.last_error)note("Motor: "+s.last_error,true);
  renderPending=true;
}
let edges=[];
const resizeCanvas=(can)=>{
  const rect=can.getBoundingClientRect(),scale=devicePixelRatio||1;
  const w=Math.max(100,rect.width),h=Number(can.getAttribute("height"))||200;
  if(can.width!==Math.round(w*scale)||can.height!==Math.round(h*scale)){
    can.width=Math.round(w*scale);can.height=Math.round(h*scale)
  }
  const ctx=can.getContext("2d");ctx.setTransform(scale,0,0,scale,0,0);
  return {ctx,w,h};
};
function drawThroughput(){
  const {ctx,w,h}=resizeCanvas($("throughputCanvas"));
  ctx.clearRect(0,0,w,h);ctx.strokeStyle="#284840";ctx.lineWidth=1;
  for(let k=0;k<5;k++){const y=10+(h-26)*k/4;
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  if(!history.length)return;
  const arr=history.slice(-80),max=Math.max(10,...arr.map(x=>x.rate));
  ctx.strokeStyle="#66ebca";ctx.lineWidth=2.3;ctx.beginPath();
  arr.forEach((p,i)=>{
    const x=i*(w-2)/Math.max(1,arr.length-1);
    const y=h-13-(h-25)*p.rate/max;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  ctx.stroke();
  ctx.fillStyle="#a4c8bc";ctx.font="10px monospace";ctx.fillText(max.toFixed(2)+" ex/s",7,12);
}
function drawAtlas(){
  const {ctx,w,h}=resizeCanvas($("atlasCanvas"));
  ctx.clearRect(0,0,w,h);
  const cx=w/2,cy=h/2,r=Math.min(w,h)*.39;
  ctx.strokeStyle="#34534e";ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  // Only genuine positive-count pair transitions from the GPU learner.
  const strong=edges.filter(e=>Number(e.count)>0).slice(0,256);
  const max=Math.max(1,...strong.map(x=>Number(x.count)));
  for(const e of strong){
    const a=(Number(e.from)/256)*Math.PI*2-Math.PI/2;
    const b=(Number(e.to)/256)*Math.PI*2-Math.PI/2;
    ctx.globalAlpha=.08+.58*Number(e.count)/max;
    ctx.strokeStyle="#66ebca";ctx.lineWidth=.5+1.7*Number(e.count)/max;
    ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
    ctx.quadraticCurveTo(cx,cy,cx+Math.cos(b)*r,cy+Math.sin(b)*r);ctx.stroke();
  }
  ctx.globalAlpha=1;
  for(let i=0;i<32;i++){
    const a=i/32*Math.PI*2-Math.PI/2;
    ctx.beginPath();ctx.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,2,0,Math.PI*2);
    ctx.fillStyle="#6e948e";ctx.fill();
  }
  ctx.fillStyle="#bed8cc";ctx.textAlign="center";ctx.font="700 18px Manrope, sans-serif";
  ctx.fillText(fmt(strong.length),cx,cy-2);
  ctx.font="10px monospace";ctx.fillStyle="#729d92";
  ctx.fillText("TRASEE OBSERVATE",cx,cy+19);
  ctx.textAlign="start";
}
function paint(){
  if(renderPending){drawThroughput();drawAtlas();renderPending=false}
  if(lastState){
    $("wallTime").textContent=seconds(lastState.elapsed_seconds+(Date.now()-Date.parse(lastState.last_event_at))/1000);
    $("phaseHeartbeat").textContent=((Date.now()-Date.parse(lastState.last_event_at))/1000).toFixed(1)+"s";
  }
  requestAnimationFrame(paint);
}
requestAnimationFrame(paint);
window.addEventListener("resize",()=>renderPending=true);
const eventsSocket=new EventSource("/events");
eventsSocket.addEventListener("state",e=>{try{applyState(JSON.parse(e.data))}catch(err){note(err.message,true)}});
eventsSocket.addEventListener("heartbeat",e=>{
  try{const h=JSON.parse(e.data);if(lastState){$("phaseHeartbeat").textContent=((Date.now()-h.at)/1000).toFixed(1)+"s · "+h.status}}catch{}
});
eventsSocket.onopen=()=>{connected=true;note("Conectat la V44, flux live real")};
eventsSocket.onerror=()=>{$("liveLed").className="err";$("connectionText").textContent="RECONNECTING";note("Conexiune SSE întreruptă; reconectare automată",true)};
loadHistory(false);
