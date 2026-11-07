/* MagicPerspective Living Studio.
 * UI renders ONLY native V17 /graphs /graph /state /telemetry
 * and actual native evaluation endpoints. No fake counters, no synthetic
 * animation frames, no hard-coded training progress or speculative success.
 * Deliberately distinguishes separate synthetic research tests from training.
 */
const $=id=>document.getElementById(id);
const state={slots:[],selected:null,graph:null,global:null,history:null,
 telemetry:[],rendered:[],layer:"all",lastStamp:null,loop:0,requesting:false,
 selectedInfo:null,lastEvaluation:null,mode:"observator",research:null,
 rawResearchId:0,feedbackAt:0,watchingBackend:false,latestError:""};
const color={sym:"#e9c789",A:"#72e5c3",C:"#b6a0ed",self:"#faadb4",other:"#89b6d2"};
const limit=(a,b,c)=>Math.min(c,Math.max(b,a));
const fmt=(v,dec=0)=>Number.isFinite(+v)?Number(v).toLocaleString("ro-RO",{maximumFractionDigits:dec}):"—";
const pct=v=>Number.isFinite(+v)?(100*Number(v)).toFixed(2)+"%":"—";
const nstr=(v)=>v==null?"—":String(v);
const set=(id,value)=>{const el=$(id);if(el)el.textContent=String(value);};
const text=(value,max=100)=>String(value??"—").slice(0,max);
const escapeHtml=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const short=v=>{const n=Number(v);return !Number.isFinite(n)?"—":Math.abs(n)>=1e6?(n/1e6).toFixed(2)+"M":Math.abs(n)>=1e3?(n/1e3).toFixed(1)+"k":fmt(n)};
const show=(message,error=false)=>{const el=$("feedback");el.textContent=message;el.classList.toggle("error",error);state.feedbackAt=Date.now();};
const api=async(url,{method="GET",body=null}={})=>{
 const r=await fetch("/api/native"+url,{method,headers:{"content-type":"application/json"},
   body:body===null?undefined:JSON.stringify(body),cache:"no-store"});
 const v=await r.json().catch(()=>({error:"Malformed native backend response"}));
 if(!r.ok||v?.error)throw Error(v?.error||"Native backend HTTP "+r.status);
 return v;
};
const local=async(url,{method="GET"}={})=>{
 const r=await fetch(url,{method,cache:"no-store"});
 const v=await r.json().catch(()=>({error:"Invalid studio response"}));
 if(!r.ok||v.error)throw Error(v.error||"Studio HTTP "+r.status);
 return v;
};
const qs=o=>new URLSearchParams(Object.entries(o).filter(([,v])=>v!=null&&v!=="")).toString();
const chosen=()=>state.slots.find(g=>g.w===state.selected)||null;
const statusName=s=>s==="antrenează"?"LIVE • TRAINING":s==="pauză"?"PAUSED":s==="gata"?"COMPLETE":s==="eroare"?"ERROR":s==="oprit"?"READY":text(s,18);
const loadedAt=stamp=>stamp?new Date(stamp).toLocaleTimeString("ro-RO"):"fără snapshot";
function selectBrain(w){
 const id=Number(w);if(!state.slots.some(x=>x.w===id))return;
 state.selected=id;state.graph=null;state.history=null;state.telemetry=[];state.lastEvaluation=null;
 state.rendered=[];$("selectedNode").textContent="Selectează un nod din graf";
 $("nodeDescription").textContent="Vezi activitatea și legăturile reale ale acestuia.";
 $('selectedBrain').value=String(id);
 renderSlots();show("Creier #"+id+" selectat. Telemetria va fi citită din motorul original.");poll(true);
}
function renderSlots(){
 $("brainCount").textContent=String(state.slots.length);
 $("brainList").innerHTML=state.slots.map(s=>
   '<button type="button" class="brain-slot '+(s.w===state.selected?"active":"")+'" data-brain="'+s.w+'">'+
    '<span class="brain-slot-top"><span><i class="status-circle '+(s.status==="antrenează"?"running":s.status==="eroare"?"error":"")+'"></i> #'+s.w+' · '+escapeHtml(s.arm)+'</span><span>'+short(s.chars)+'</span></span>'+
    '<span class="brain-slot-detail">'+escapeHtml(s.worlds?.join(" + ")||"—")+' · '+escapeHtml(statusName(s.status))+'</span></button>'
 ).join("")||'<div class="small muted">Niciun creier în motor.</div>';
 const el=$('selectedBrain'),before=String(state.selected??"");
 el.innerHTML=state.slots.map(s=>'<option value="'+s.w+'">#'+s.w+' · '+escapeHtml(s.arm)+' · '+escapeHtml(s.worlds?.join("+")||"—")+'</option>').join("");
 if(state.selected!==null)el.value=before;
 $("brainList").querySelectorAll("[data-brain]").forEach(b=>b.addEventListener("click",()=>selectBrain(+b.dataset.brain)));
}
function renderMetrics(){
 const s=chosen(),g=state.graph||{},t=s?.test||g.test||{},latest=state.telemetry.at(-1)||{};
 const observed=s?.observedTransformations||g.observedTransformations||{};
 const cp=s?.constructedPaths||g.constructedPaths||{};
 const gpu=s?.gpu||g.gpu||{};
 set("metricChars",short(s?.chars));
 set("metricSpeed",s?.status==="antrenează"?"Trăite într-un creier real":"Stare: "+statusName(s?.status));
 set("metricNodes",g.nodes?.length?short(g.nodes.length):s?.nodeCount!=null?short(s.nodeCount):"—");
 set("metricEdges",g.edges?.length?fmt(g.edges.length)+" conexiuni":s?.edgeCount!=null?fmt(s.edgeCount)+" conexiuni":"— conexiuni");
 set("metricAligned",pct(t.aligned??g.accAlign));
 set("metricBaseline",t?.live!=null?"original "+pct(t.live)+" · C "+pct(t.C):"fără test înghețat");
 const maze=s?.maze||g.maze||{};
 set("metricMaze",pct(maze.test?.solved));
 set("metricMazeSub",maze.test?fmt(maze.played)+" jucate · steps/optimal "+fmt(maze.test.ratio,2):fmt(maze.played||0)+" labirinte jucate");
 set("metricOps",observed.learnedOperators==null?"—":short(observed.learnedOperators));
 set("metricOpsSub",observed.oneChangePairs==null?"Aștept observații":fmt(observed.oneChangePairs)+" perechi comparate");
 set("metricDevice",gpu?.info?.name?text(gpu.info.name.replace(/NVIDIA\s*GeForce\s*/i,""),22):
    gpu?.settings?.device||"—");
 set("metricVram",gpu?.error?"ERROR: "+text(gpu.error,34):
    gpu?.text?.vramUsedGB!=null?fmt(gpu.text.vramUsedGB,2)+" GB GPU text":
    gpu?.maze?.vramUsedGB!=null?fmt(gpu.maze.vramUsedGB,2)+" GB maze":"Fără măsurătoare VRAM");
 set("stateReadout",statusName(s?.status));set("worldReadout",s?.worlds?.join(" + ")||"—");
 set("gpuReadout",gpu?.error?text(gpu.error,110):gpu?.info?.device||gpu?.info?.name||gpu?.settings?.device||"neconfigurat");
 set("batchReadout",gpu?.batch?.phase?gpu.batch.phase+" · "+fmt(gpu.batch.done)+"/"+fmt(gpu.batch.total):"—");
 const lanes=s?.language||g.language||{},tr=lanes.trust||[];
 const sorted=tr.filter(x=>x.accuracy!=null).slice().sort((a,b)=>b.accuracy-a.accuracy);
 set("axisReadout",sorted.length?sorted.slice(0,2).map(x=>"context "+x.scale+" = "+pct(x.accuracy)).join(" / "):"—");
 set("textStates",short(cp.scaleGraphStates?.reduce((sum,x)=>sum+(x.distinctStates||0),0)));
 set("observedPairs",short(observed.comparedPairs));
 set("perspectiveCount",lanes.states==null?"—":short(lanes.states));
 set("noiseDecisions",short(s?.endogenousNoise?.decisions??g.endogenousNoise?.decisions));
 $("operators").innerHTML=(observed.topOperators||[]).slice(0,10).map(op=>
   '<div class="operator"><span>'+escapeHtml(op.kind||"edit")+'</span><b>'+escapeHtml(text(op.from,38))+' → '+escapeHtml(text(op.to,38))+'</b><small>'+fmt(op.observedSupport)+'</small></div>'
 ).join("")||'<div class="small muted">Nicio transformare observată încă.</div>';
 set("snapshotTime",loadedAt(g.snapshotAt||s?.snapshotAt));
 set("graphCaption",g.nodes?.length?"NATIVE GRAPH • "+(s?.status==="antrenează"?"LIVE":"SNAPSHOT"):
    "AȘTEPT NODURI DIN MOTOR");
 set("graphCount",fmt(g.nodes?.length||0)+" noduri");
 set("graphLinkCount",fmt(g.edges?.length||0)+" legături");
 const original="http://127.0.0.1:"+state.backendPort+"/";
 $("originalUi").href=original;
}
async function poll(force=false){
 if(state.requesting)return;
 state.requesting=true;
 try{
   const data=await api("/graphs");
   state.slots=Array.isArray(data.graphs)?data.graphs:[];
   state.backendPort=Number(data.backendPort||new URL(state.originalBackend).port)||8871;
   if(state.selected===null||!state.slots.some(x=>x.w===state.selected))state.selected=state.slots[0]?.w??null;
   renderSlots();
   if(state.selected!==null){
     const selected=state.selected;
     const results=await Promise.allSettled([
       api("/graph?"+qs({w:selected})),
       api("/telemetry?"+qs({w:selected})),
       (force||++state.loop%4===0)?api("/state"):Promise.resolve(null)
     ]);
     if(results[0].status==="fulfilled"&&selected===state.selected)state.graph=results[0].value;
     if(results[1].status==="fulfilled"&&selected===state.selected)
       state.telemetry=results[1].value.points||[];
     if(results[2].status==="fulfilled"&&results[2].value)state.history=results[2].value;
     if(force&&state.graph?.textMaze?.ready)consumeLivePath(state.graph.textMaze);
   }
   state.watchingBackend=true;
   $("connectionDot").className="connection online";set("connectionStatus","Motor V17 conectat");
   renderMetrics();renderChart();
 }catch(err){
   state.watchingBackend=false;
   $("connectionDot").className="connection offline";set("connectionStatus","Motor V17 offline");
   if(force||state.latestError!==err.message){state.latestError=err.message;show("Motorul original nu răspunde: "+err.message,true);}
 }finally{state.requesting=false;}
}
function resizeCanvas(c){
 const scale=Math.min(2,devicePixelRatio||1),rect=c.getBoundingClientRect();
 const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
 if(c.width!==Math.round(w*scale)||c.height!==Math.round(h*scale)){c.width=Math.round(w*scale);c.height=Math.round(h*scale);}
 const ctx=c.getContext("2d");ctx.setTransform(scale,0,0,scale,0,0);
 return {ctx,w,h};
}
const hash=(s)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;};
function point(n,geom,w,h,t){
 const phase=(+$("perspectiveSlider").value||0)/100,margin=42;
 const [id,type]=n;let x,y;
 const pos=type==="sym"?geom.get(Number(id.slice(2))):null;
 if(pos&&pos.length>=5){
   const tau=2*Math.PI,ang=(i)=>tau*(pos[i]+phase*(.25+i*.13));
   x=.39*Math.cos(ang(0))+.32*Math.sin(ang(2))+.24*Math.cos(ang(4));
   y=.40*Math.sin(ang(1))+.28*Math.cos(ang(3))+.22*Math.sin(ang(4)+ang(0));
 }else{
   const a=hash(id),b=hash("p"+id),angle=2*Math.PI*(a/4294967296+phase*.08);
   const r=(.26+.67*b/4294967296),scale=type==="self"?.42:type==="C"?.65:1;
   x=Math.cos(angle)*r*scale;y=Math.sin(angle)*r*scale;
 }
 return {x:w/2+x*(w/2-margin),y:h/2+y*(h/2-margin),n};
}
function renderGraph(time){
 const c=$("graphCanvas"),{ctx,w,h}=resizeCanvas(c);
 ctx.clearRect(0,0,w,h);const g=state.graph;
 if(!g?.nodes?.length){ctx.fillStyle="#7c9bb0";ctx.textAlign="center";ctx.font="13px system-ui";ctx.fillText("Aștept primul snapshot real din workerul V17…",w/2,h/2);return;}
 const nodes=g.nodes.filter(n=>state.layer==="all"||n[1]===state.layer).slice(0,1000);
 const U=new Map(g.U||[]),coords=new Map();
 for(const n of nodes)coords.set(n[0],point(n,U,w,h,time));
 state.rendered=[...coords.values()];
 const edges=(g.edges||[]).slice(0,3000);
 ctx.lineCap="round";
 const recent=new Set((g.flow||[]).slice(-30).map(([a,b])=>"s:"+a+">s:"+b));
 for(const e of edges){
   const a=coords.get(e[0]),b=coords.get(e[1]);
   if(!a||!b)continue;
   const observed=recent.has(e[0]+">"+e[1]);
   ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
   const weight=Math.max(0,Number(e[3])||0);
   ctx.lineWidth=observed?1.5:Math.min(1.3,.28+Math.log1p(weight)*.2);
   ctx.strokeStyle=observed?"rgba(241,209,157,.65)":"rgba(91,155,168,.2)";
   ctx.stroke();
 }
 for(const p of coords.values()){
   const [,type,label,act,born,err]=p.n;
   const active=limit(+act||0,0,1),radius=type==="self"?4:2.5+active*3;
   const glow=err?color.self:color[type]||color.other;
   if(active>.45||err){
     const pulse=(.55+.45*Math.sin(time/400+hash(p.n[0])%5));
     ctx.fillStyle=err?"rgba(255,103,125,.10)":type==="sym"?"rgba(233,199,137,.08)":"rgba(102,230,192,.07)";
     ctx.beginPath();ctx.arc(p.x,p.y,radius+4+pulse*3,0,Math.PI*2);ctx.fill();
   }
   ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);
   ctx.fillStyle=glow;ctx.globalAlpha=limit(.22+active*.9,.22,1);ctx.fill();ctx.globalAlpha=1;
   if(p.n[0]===state.selectedInfo?.id){
     ctx.strokeStyle="#ffffff";ctx.lineWidth=1.5;ctx.beginPath();
     ctx.arc(p.x,p.y,radius+6,0,Math.PI*2);ctx.stroke();
   }
 }
 const labels=[...coords.values()].filter(p=>p.n[3]>=.75||p.n[1]==="self").slice(0,21);
 ctx.textAlign="center";ctx.font="10px system-ui";
 for(const p of labels){ctx.fillStyle="#c5d6df";ctx.fillText(text(p.n[2],17),p.x,p.y+13);}
}
function renderChart(){
 const c=$("chartCanvas"),{ctx,w,h}=resizeCanvas(c),mode=$("chartMetric").value;
 ctx.clearRect(0,0,w,h);const margin={l:45,r:18,t:20,b:34};
 const plotW=Math.max(1,w-margin.l-margin.r),plotH=Math.max(1,h-margin.t-margin.b);
 const telemetry=state.telemetry||[],hist=state.history?.graphs?.find(x=>x.w===state.selected)?.history||[];
 let lines=[],points=0,unit="";
 if(mode==="accuracy"){
   lines=[
     {name:"Original",color:"#edd1a2",v:hist.map(x=>({x:x.chars,y:x.live}))},
     {name:"Field",color:"#b5a2fa",v:hist.map(x=>({x:x.chars,y:x.field}))},
     {name:"C",color:"#66e6c0",v:hist.map(x=>({x:x.chars,y:x.C}))}
   ];
   unit="%";
 }else if(mode==="nodes"){
   lines=[{name:"Noduri",color:"#66e6c0",v:telemetry.map(x=>({x:x.chars,y:x.nodes}))},
     {name:"Legături",color:"#edd1a2",v:telemetry.map(x=>({x:x.chars,y:x.edges}))}];
 }else if(mode==="operators"){
   lines=[{name:"Operatori",color:"#66e6c0",v:telemetry.map(x=>({x:x.chars,y:x.updates}))},
     {name:"Comparații",color:"#edd1a2",v:telemetry.map(x=>({x:x.chars,y:x.comparisons}))}];
 }else{
   lines=[{name:"Caractere",color:"#edd1a2",v:telemetry.map(x=>({x:x.at,y:x.chars}))},
     {name:"Exerciții",color:"#66e6c0",v:telemetry.map(x=>({x:x.at,y:x.exercises}))}];
 }
 for(const l of lines)l.v=l.v.filter(x=>Number.isFinite(x.x)&&Number.isFinite(x.y));
 points=lines.reduce((n,x)=>n+x.v.length,0);
 const all=lines.flatMap(x=>x.v),minX=Math.min(...all.map(x=>x.x),0),maxX=Math.max(...all.map(x=>x.x),1);
 const lower=mode==="accuracy"?0:0,upper=mode==="accuracy"?1:Math.max(1,...all.map(x=>x.y));
 ctx.strokeStyle="#294054";ctx.fillStyle="#8199aa";ctx.lineWidth=1;ctx.font="10px system-ui";
 ctx.textAlign="right";
 for(let i=0;i<=4;i++){
   const y=margin.t+plotH*(1-i/4),val=lower+(upper-lower)*i/4;
   ctx.beginPath();ctx.moveTo(margin.l,y);ctx.lineTo(w-margin.r,y);ctx.stroke();
   ctx.fillText(unit==="%"?Math.round(val*100)+"%":short(val),margin.l-8,y+3);
 }
 ctx.textAlign="center";ctx.fillText(mode==="chars"?"timp (sesiunea curentă)":"caractere trăite",margin.l+plotW/2,h-7);
 if(!points){ctx.fillStyle="#93a7b6";ctx.font="12px system-ui";ctx.fillText("Aștept evaluări reale...",margin.l+plotW/2,margin.t+plotH/2);return;}
 const tx=x=>margin.l+(x-minX)/(Math.max(1,maxX-minX))*plotW;
 const ty=y=>margin.t+(1-(y-lower)/Math.max(.00001,upper-lower))*plotH;
 for(const l of lines){
   ctx.strokeStyle=l.color;ctx.lineWidth=2.2;ctx.beginPath();let once=false;
   for(const p of l.v){const x=tx(p.x),y=ty(p.y);if(!once){ctx.moveTo(x,y);once=true;}else ctx.lineTo(x,y);}
   if(once)ctx.stroke();
 }
}
function createPathGraph(d){
 if(!d)return {nodes:[],links:[],steps:[]};
 if(Array.isArray(d.search?.nodes)&&d.search.nodes.length){
   const nodes=d.search.nodes.map(x=>({id:String(x.id),label:x.label||x.id,
      role:x.role,depth:x.depth,shape:!!x.onInitialShape}));
   const links=(d.search.edges||[]).map(e=>({from:e.from,to:e.to,kind:e.kind,
      matched:e.allowed!==false,planned:d.initialShape?.some((x,i)=>x===e.from&&d.initialShape[i+1]===e.to)}));
   return {nodes,links,steps:d.body?.frames||d.steps||[]};
 }
 if(Array.isArray(d.initialShape)&&d.initialShape.length){
   const nodes=d.initialShape.map((v,i)=>({id:String(i),label:String(v),depth:i,shape:true}));
   return {nodes,links:nodes.slice(1).map((x,i)=>({from:String(i),to:x.id,planned:true,matched:true})),steps:d.body?.frames||d.frames||[]};
 }
 const p=d.results?.[0]||d.mazes?.[0];
 if(p){
  const points=p.frames?.map(x=>x.state??x.b??x.pos)||p.path||p.first||p.shapes?.[0]?.path||[];
  if(Array.isArray(points))return {nodes:points.slice(0,150).map((x,i)=>({id:"p"+i,label:typeof x==="string"?x:JSON.stringify(x),depth:i,shape:true})),
   links:points.slice(1,150).map((x,i)=>({from:"p"+i,to:"p"+(i+1),planned:true,matched:true})),steps:p.frames||[]};
 }
 return {nodes:[],links:[],steps:[]};
}
function renderPathCanvas(){
 const c=$("pathCanvas"),{ctx,w,h}=resizeCanvas(c);ctx.clearRect(0,0,w,h);
 const p=state.pathData||createPathGraph(state.graph?.textMaze||{}),N=p.nodes.length;
 if(!N){ctx.fillStyle="#7f9eae";ctx.font="12px system-ui";ctx.textAlign="center";
   ctx.fillText("Forma și ramificațiile vor apărea din evaluarea reală…",w/2,h/2);return;}
 const nodes=p.nodes.slice(0,190),radius=7;
 const positions=new Map();
 const levels=new Map();
 for(const n of nodes){const d=limit(n.depth??0,0,16);if(!levels.has(d))levels.set(d,[]);levels.get(d).push(n);}
 const maxD=Math.max(1,...levels.keys());
 for(const [d,group] of levels)group.forEach((n,i)=>{
   positions.set(n.id,{x:43+(d/maxD)*(w-87),y:h*(i+1)/(group.length+1)});
 });
 const paths=new Set((state.lastEvaluation?.initialShape||[]).map((x,i,arr)=>i<arr.length-1?x+"|"+arr[i+1]:""));
 for(const l of p.links.slice(0,500)){
   const a=positions.get(String(l.from)),b=positions.get(String(l.to));if(!a||!b)continue;
   ctx.beginPath();ctx.moveTo(a.x,a.y);
   const bend=Math.min(30,Math.abs(b.x-a.x)*.3);ctx.bezierCurveTo(a.x+bend,a.y,b.x-bend,b.y,b.x,b.y);
   const on=l.planned||paths.has(l.from+"|"+l.to);
   ctx.strokeStyle=l.matched===false?"#f59a9a":on?"#eacb93":"#477083";
   ctx.lineWidth=on?2.6:1;ctx.globalAlpha=on?1:.6;ctx.stroke();ctx.globalAlpha=1;
 }
 for(const n of nodes){
  const pos=positions.get(n.id),special=n.role==="goal"||n.shape;
  ctx.beginPath();ctx.arc(pos.x,pos.y,special?radius:4,0,Math.PI*2);
  ctx.fillStyle=n.role==="goal"?"#68e4b6":special?"#ebca92":"#638a9c";ctx.fill();
  if(special&&nodes.length<80){ctx.fillStyle="#d7e3ea";ctx.font="10px system-ui";ctx.textAlign="center";ctx.fillText(text(n.label,27),pos.x,pos.y+18);}
 }
}
function stepsFor(d){
 const actions=d?.body?.frames||d?.frames||d?.steps||[];
 if(!Array.isArray(actions))return [];
 return actions.slice(0,65).map((f,i)=>{
  if(typeof f==="string")return {name:f,matched:true};
  return {name:f.after??f.state??f.action?.kind??f.action??("pas "+i),
   matched:f.predictionMatched??f.matches??f.correct??true,
   why:f.why??f.stage??"",before:f.before??null};
 });
}
function consumeLivePath(d){
 if(state.mode!=="trasee"||state.lastEvaluation)return;
 if(!d?.ready)return;
 state.pathData=createPathGraph(d);renderPathCanvas();
 set("pathProvenance","LIVE · modelul original de context");
 set("pathSummary","Traseu observat din antrenarea curentă · "+(d.mode||d.source||"native")+
   " · "+(d.oracleAnswerUsed?"cu referință":"fără răspuns-referință la predicție")+".");
 const steps=stepsFor(d);
 $("pathSteps").innerHTML=steps.slice(0,35).map((s,i)=>'<span class="step-chip">'+(i+1)+": "+escapeHtml(text(s.name,55))+'</span>').join("");
 set("rawEval",JSON.stringify(d,null,2).slice(0,90000));
}
function presentEvaluation(result,source){
 state.lastEvaluation=result;state.pathData=createPathGraph(result);
 set("pathProvenance",source||"Evaluare nativă");
 let details=[];
 for(const key of ["found","reason","plannedBeforeAnswer","predicted","unseen","expanded","solved","count","successRate","answer","aligned","frozen","verifiedByObservedEffect"])
   if(result[key]!==undefined)details.push(key+": "+(typeof result[key]==="number"?fmt(result[key],3):text(result[key],150)));
 if(result.body)details.push("Execuție: "+(result.body.success?"reușită":"neconfirmată")+
   " · "+fmt(result.body.executed)+" acțiuni · "+fmt(result.body.corrections)+" corecții");
 if(result.execution)details.push("Efect intern verificat: "+(result.execution.verified?"da":"nu"));
 if(result.results?.length)details.push("Primele rezultate: "+result.results.slice(0,3).map(x=>JSON.stringify(x).slice(0,130)).join(" | "));
 set("pathSummary",details.join(" · ")||"Rezultat nativ primit. Deschide datele brute pentru câmpurile complete.");
 $("pathSteps").innerHTML=stepsFor(result).map((s,i)=>'<span class="step-chip '+(s.matched?"":"wrong")+'" title="'+escapeHtml(s.why)+'">'+
   (i+1)+": "+escapeHtml(text(s.name,75))+'</span>').join("");
 set("rawEval",JSON.stringify(result,null,2).slice(0,110000));renderPathCanvas();
}
async function action(route,success){
 try{const r=await api(route,{method:"POST"});show(success||"Acțiunea a fost acceptată de backend.");
   await poll(true);return r;
 }catch(e){show(e.message,true);return null;}
}
async function evaluate(kind){
 const w=state.selected;if(w==null)return show("Mai întâi selectează un creier.",true);
 let route;
 if(kind==="maze")route="/constructed-paths-eval?"+qs({w,count:12,seed:73});
 if(kind==="perspective")route="/perspective-eval?"+qs({w,count:20,seed:73});
 if(kind==="text")route="/eval";
 if(kind==="transform")route="/eval";
 if(kind==="shared")route="/shared-eval?"+qs({w,seed:74129});
 show("Se evaluează un checkpoint al creierului real, fără antrenare pe test...");
 try{
  const r=kind==="text"||kind==="transform"?
   await api(route,{method:"POST",body:{w,kind:kind==="text"?"text":"transform",
     opts:{count:12,seed:73,max:4000}}}):await api(route,{method:"POST"});
  if(kind==="shared"&&r.id){
    presentEvaluation({status:"running",jobId:r.id},"Evaluare partajată, în curs");
    for(let k=0;k<60;k++){
      await new Promise(ok=>setTimeout(ok,1500));
      const d=await api("/shared-eval-status?"+qs({id:r.id}));
      if(d.status==="done"||d.status==="failed"){presentEvaluation(d.result||d,"Shared V17 / CUDA");break;}
    }
  }else presentEvaluation(r,"Evaluare înghețată: "+kind);
  setTab("trasee");show("Evaluarea reală a fost returnată de V17.");
 }catch(err){show("Eroare evaluare: "+err.message,true);}
}
async function languageMaze(auto=false){
 const w=state.selected;if(w==null)return show("Selectează un creier.",true);
 const required=$("goalWords").value.trim(),start=$("goalStart").value.trim();
 if(!auto&&!required)return show("Scrie simbolurile obiectivului sau folosește Test autonom.",true);
 show("V17 construiește o formă din operatorii efectiv observați...");
 try{
   const r=await api("/language-maze?"+qs({w,required,start,maxDepth:5,auto:auto?1:0}),{method:"POST"});
   presentEvaluation(r,auto?"TEST AUTONOM · text V17":"LABIRINT TEXT · V17");
   show(r.found?"Traseul a fost calculat înainte de acțiune. Vezi execuția mai jos.":
     "Nu s-a găsit un traseu susținut de observații. "+(r.reason||""),!r.found);
 }catch(err){show(err.message,true);}
}
function researchCards(info){
 const descriptions={
  axes:"Perspectiva fiecărui nod; rotații discrete învățate și trasee anticipate pe legături nevăzute.",
  language:"Învață sensul unor cuvinte de acțiune din transformări matematice observate.",
  coupled:"Verifică dacă aceleași cuvinte și axe locale determină efectiv mișcările.",
  "2048states":"Verifică același mecanism de transport pe un graf cu 2.048 de stări.",
  chance:"Testează direcții, fuziuni și posibilitățile aleatoare din 2048.",
  native:"CONTROL NEGATIV. Testează dacă geometria simbolurilor îmbunătățește textul real.",
  context:"CONTROL NEGATIV. Testează dacă geometria contextuală aduce câștig real."
 };
 $("researchCards").innerHTML=(info.research||[]).map((r,i)=>
  '<div class="research-card"><div class="number">'+String(i+1).padStart(2,"0")+'</div>'+
  '<h3>'+escapeHtml(r.label)+'</h3><p>'+escapeHtml(descriptions[r.id]||"Experiență măsurabilă")+'</p>'+
  '<button data-research="'+escapeHtml(r.id)+'">▶ Rulează testul original</button></div>').join("");
 $("researchCards").querySelectorAll("[data-research]").forEach(el=>el.addEventListener("click",async()=>{
   try{const r=await local("/api/research/run?"+qs({kind:el.dataset.research}),{method:"POST"});
     show("Test pornit: "+r.label+". Datele provin din Node test, nu din UI.");
     renderResearch(await local("/api/research/status"));
   }catch(e){show(e.message,true);}
 }));
}
function renderResearch(data){
 state.research=data;const j=data.current||data.history?.[0];
 if(!j)return;
 set("researchStatus",j.status.toUpperCase()+" · "+j.kind+" #"+j.id);
 $("researchMetrics").innerHTML='<div class="small muted">'+escapeHtml(j.label||"")+" · "+escapeHtml(j.source||"")+
   " · "+(j.ended?((j.ended-j.started)/1000).toFixed(2)+" s":"în execuție")+
   " · exit "+nstr(j.exitCode)+"</div>"+(j.metrics||[]).map(m=>
   '<div class="metric-entry"><b>'+escapeHtml(m.name)+'</b><pre>'+escapeHtml(JSON.stringify(m.data,null,2).slice(0,12000))+'</pre></div>'
 ).join("");
 set("researchRaw",(j.stdout||"").slice(-145000)+(j.stderr?"\n\nSTDERR:\n"+j.stderr.slice(-12000):""));
 if(j.status==="failed"&&j.error)show("Testul experimental a eșuat: "+j.error,true);
}
function setTab(view){
 state.mode=view;
 document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===view));
 document.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
 if(view==="trasee"){if(!state.lastEvaluation)consumeLivePath(state.graph?.textMaze);renderPathCanvas();}
 if(view==="research")local("/api/research/status").then(renderResearch).catch(()=>{});
 if(view==="observator")renderChart();
}
function bind(){
 document.querySelectorAll("[data-view]").forEach(x=>x.addEventListener("click",()=>setTab(x.dataset.view)));
 document.querySelectorAll("[data-layer]").forEach(x=>x.addEventListener("click",()=>{
   state.layer=x.dataset.layer;document.querySelectorAll("[data-layer]").forEach(b=>b.classList.toggle("selected",b===x));
 }));
 $("selectedBrain").addEventListener("change",e=>selectBrain(+e.target.value));
 [["startAll","start"],["pauseAll","pause"],["saveAll","save"]].forEach(([id,mode])=>
   $(id).addEventListener("click",()=>action("/control?"+qs({do:mode}),"Comanda "+mode+" trimisă tuturor creierelor.")));
 [["startSelected","start"],["pauseSelected","pause"],["saveSelected","save"]].forEach(([id,mode])=>
   $(id).addEventListener("click",()=>action("/control?"+qs({do:mode,w:state.selected}),"Comanda "+mode+" trimisă creierului #"+state.selected)));
 $("resetSelected").addEventListener("click",()=>{
   if(state.selected==null)return;
   if(confirm("Resetare #"+state.selected+"? V17 mută checkpointul vechi în brains-before-reset. Confirmi?"))
     action("/control?"+qs({do:"reset",w:state.selected}),"Reset cerut. Salvarea anterioară este arhivată de V17.");
 });
 $("addBrain").addEventListener("click",async()=>{
   const worlds=[...document.querySelectorAll('input[name="world"]:checked')].map(x=>x.value);
   if(!worlds.length)return show("Alege măcar o lume de devorat.",true);
   const arm=$("arm").value,prior=new Set(state.slots.map(s=>s.w));
   const r=await action("/add?"+qs({arm,worlds:worlds.join(",")}),"Creier nou creat, cu lumile "+worlds.join("+")+".");
   if(r){await poll(true);const newborn=state.slots.find(s=>!prior.has(s.w));
     if(newborn){selectBrain(newborn.w);await action("/control?"+qs({do:"start",w:newborn.w}),"Antrenare pornită în creierul nou.");}}
 });
 for(const [id,output] of [["noise","noiseValue"],["temperature","temperatureValue"]])
   $(id).addEventListener("input",e=>set(output,e.target.value));
 $("applyControls").addEventListener("click",()=>action("/controls?"+qs({
  w:state.selected,gnoise:+$("noise").value,wtemp:+$("temperature").value,
  ttemp:+$("temperature").value
 }),"Controalele originale au fost transmise direct creierului."));
 $("applyGpu").addEventListener("click",()=>action("/gpu?"+qs({
  device:$("gpuMode").value,worlds:32,vram:2.8,util:100,textBatch:2
 }),"Dispozitivul GPU a fost configurat pentru workerul nativ. Verifică eventualele erori CUDA."));
 $("runLanguageMaze").addEventListener("click",()=>languageMaze(false));
 $("runSelfChallenge").addEventListener("click",()=>languageMaze(true));
 document.querySelectorAll("[data-eval]").forEach(el=>el.addEventListener("click",()=>evaluate(el.dataset.eval)));
 $("chartMetric").addEventListener("change",renderChart);
 $("graphCanvas").addEventListener("click",e=>{
  const rect=e.currentTarget.getBoundingClientRect();
  const x=e.clientX-rect.left,y=e.clientY-rect.top;
  let near=null,best=450;
  for(const p of state.rendered){const d=(p.x-x)**2+(p.y-y)**2;if(d<best){near=p;best=d;}}
  if(!near)return;
  const [id,type,label,activation,born,err]=near.n;
  state.selectedInfo={id};set("selectedNode",label+" · "+type);
  const connections=(state.graph?.edges||[]).filter(v=>v[0]===id||v[1]===id).length;
  set("nodeDescription","ID "+id+" · activare "+fmt(activation,2)+" · născut pasul "+fmt(born)+
      " · legături "+fmt(connections)+" · "+(err?"eroare predicție observată":"fără impuls de eroare"));
 });
 window.addEventListener("resize",()=>{renderChart();renderPathCanvas();});
}
let lastFrame=0;
function frame(now){
 if(now-lastFrame>33){lastFrame=now;
   if(state.mode==="observator")renderGraph(now);
 }
 requestAnimationFrame(frame);
}
async function boot(){
 bind();requestAnimationFrame(frame);
 try{
  const info=await local("/api/info");state.originalBackend=info.backend;
  state.backendPort=+new URL(info.backend).port;researchCards(info);
 }catch(e){show("Studio API offline: "+e.message,true);}
 await poll(true);
 setInterval(()=>poll(),1500);
 setInterval(()=>{if(state.mode==="research")local("/api/research/status").then(renderResearch).catch(()=>{});},2200);
}
boot();
