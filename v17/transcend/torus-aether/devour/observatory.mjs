// Read-only Torus Observatory. Existing UI and training routes remain untouched.
import {PLANES, rotation, prepare, images, plan, wrap1} from "../ui/view5.mjs";
import {snapshot, measuredDelta} from "./observatory-core.mjs";
const $ = id => document.getElementById(id);
const canvas = $("graph"), ctx = canvas.getContext("2d");
const fmt = n => Number.isFinite(n) ? Math.round(n).toLocaleString("ro-RO") : "—";
const pct = n => Number.isFinite(n) ? (100*n).toFixed(1) + "%" : "—";
const cam = [.5,.5,.5,.5,.5], angles = new Array(PLANES.length).fill(0);
let zoom=1, thickness=.45, chosen=null, current=null, history=[], delta=null;
let busy=false, lastFrame=0, mouse=null, visualTime=0, pulses=[], projectionCache=null, projectionVersion=0;
let transIndex=0,transPlaying=false,transLastTime=0,transKey="";
const colours = {sym:"#75e2f5",C:"#ffc46d",A:"#ff6f8a"};
const edgeColours = {world:"#7ca1d0",see:"#ffcb70",feel:"#ff6f8a",trust:"#58e6ab",bud:"#f0efff"};
const local = {points:new Map(), drawn:0};

function resizeCanvas(cv) {
  const W=Math.max(1,cv.clientWidth),H=Math.max(1,cv.clientHeight),dpr=Math.min(2,window.devicePixelRatio||1);
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
  const g=cv.getContext("2d");g.setTransform(dpr,0,0,dpr,0,0);return [g,W,H];
}
function readControls(){
  for(let i=0;i<5;i++){const key="xyzwv"[i];cam[i]=+$(key).value;$(key+"Out").textContent=cam[i].toFixed(2);}
  zoom=+$("zoom").value;thickness=+$("thickness").value;
  $("zoomOut").textContent=zoom.toFixed(2)+"×";$("thicknessOut").textContent=thickness.toFixed(2);
}
function syncCamera(){for(let i=0;i<5;i++)$("xyzwv"[i]).value=cam[i];readControls();}
for(const name of ["x","y","z","w","v","zoom","thickness"])$(name).addEventListener("input",readControls);
$("plane").addEventListener("change",()=>{$("angle").value=String(Math.round(angles[PLANES.findIndex(p=>p[2]===$("plane").value)]*180/Math.PI));});
$("angle").addEventListener("input",()=>{const index=PLANES.findIndex(p=>p[2]===$("plane").value);if(index>=0)angles[index]=+$("angle").value*Math.PI/180;});
$("center").addEventListener("click",()=>{cam.fill(.5);angles.fill(0);$("angle").value="0";$("zoom").value="1";$("thickness").value=".45";syncCamera();});
$("split").onclick=()=>document.body.className="mode-split";
$("justVisual").onclick=()=>document.body.className="mode-visual";
$("justNative").onclick=()=>document.body.className="mode-native";
$("worker").addEventListener("change",()=>{chosen=Number($("worker").value);current=null;history=[];});
canvas.addEventListener("pointerdown",e=>{mouse={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener("pointermove",e=>{if(!mouse)return;const dx=e.clientX-mouse.x,dy=e.clientY-mouse.y;
  cam[0]=wrap1(cam[0]-dx/Math.max(1,canvas.clientWidth)*1.5/zoom);
  cam[1]=wrap1(cam[1]+dy/Math.max(1,canvas.clientHeight)*1.5/zoom);
  mouse={x:e.clientX,y:e.clientY};syncCamera();});
canvas.addEventListener("pointerup",()=>mouse=null);
canvas.addEventListener("pointercancel",()=>mouse=null);
canvas.addEventListener("wheel",e=>{e.preventDefault();zoom=Math.min(4,Math.max(.35,zoom*Math.exp(-e.deltaY*.001)));
  $("zoom").value=String(zoom);readControls();},{passive:false});

async function response(path){
  const r=await fetch(path,{cache:"no-store"});
  if(!r.ok)throw Error(path+": HTTP "+r.status);
  return r.json();
}
function options(slots){
  const select=$("worker"), old=chosen, ids=new Set(slots.map(v=>Number(v.w)));
  if(old===null||!ids.has(old))chosen=slots.length?Number(slots[0].w):null;
  const key=slots.map(v=>v.w+":"+v.arm+":"+v.status).join("|");
  if(select.dataset.key===key)return;
  select.dataset.key=key;select.replaceChildren();
  for(const sl of slots){const op=document.createElement("option");op.value=String(sl.w);
    op.textContent="#"+sl.w+" "+sl.arm+" · "+sl.status;
    select.append(op);}
  if(chosen!==null)select.value=String(chosen);
}
// Only animate newly observed recorded transitions once. No synthetic continuous "neuron firing".
function newlySeenFlow(before, after){
  const prev=before?.flow||[], next=after.flow||[];
  let overlap=0;
  for(let n=Math.min(prev.length,next.length);n>0;n--){
    const tail=prev.slice(-n),head=next.slice(0,n);
    if(tail.every((v,i)=>v.a===head[i].a&&v.b===head[i].b)){overlap=n;break;}
  }
  return next.slice(overlap).slice(-28);
}
function updateStats(s, raw, snap, diff, selectedSlot){
  $("countNodes").textContent=fmt(snap.counts.nodes);
  $("countEdges").textContent=fmt(snap.counts.edges);
  $("countDirect").textContent=fmt(snap.direct);
  $("countEstimated").textContent=fmt(snap.estimated)+" / "+fmt(snap.unplaced);
  const curTest=raw.test||selectedSlot?.test||null;
  const currentMaze=raw.maze||selectedSlot?.maze||null;
  let line="Creier #"+chosen+" · "+(selectedSlot?.status||"necunoscut")+
    " · "+fmt(raw.chars||0)+" caractere · "+fmt(raw.exercises||0)+" exerciții\n";
  line+="Ultimul interval de telemetrie: "+(diff.first?"primul snapshot":("+"+diff.newNodes+" noduri noi; +"+diff.newEdges+" legături noi"))+"\n";
  line+="Test nevăzut: graf "+pct(curTest?.live)+" · C "+pct(curTest?.C)+" · biți/caracter "+(Number.isFinite(curTest?.bits)?curTest.bits.toFixed(3):"—")+"\n";
  if(currentMaze)line+="Labirinturi trăite: "+fmt(currentMaze.played)+" · teste nevăzute rezolvate: "+pct(currentMaze.test?.solved)+
    " · pași/optim: "+(Number.isFinite(currentMaze.test?.ratio)?currentMaze.test.ratio.toFixed(2):"—")+"\n";
  const tr=raw.transform;
  if(tr){
    line+="Transformări: "+fmt(tr.played)+" trăite · "+fmt(tr.won)+" rezolvate · test noi "+pct(tr.test?.solved)+
      " · eșec predicții cauzale "+pct(tr.test?.failedRate)+
      " · limite declarate "+fmt(tr.test?.saidLimitation)+"/"+fmt(tr.test?.impossible)+"\n";
  }
  line+="Sursă: /graph, /graphs, /state. Acuratețea se actualizează doar când motorul produce un test.";
  $("eventLog").textContent=line;
}
async function poll(){
  if(busy||$("freeze").checked)return;
  busy=true;
  try{
    const graphs=await response("/graphs");const slots=Array.isArray(graphs.graphs)?graphs.graphs:[];
    options(slots);
    if(chosen===null){$("online").textContent="fără grafuri";$("online").className="tag off";return;}
    const [raw, all] = await Promise.all([response("/graph?w="+chosen),response("/state")]);
    const snap=snapshot(raw);
    const prior=current&&current.w===chosen?current.snap:null;
    const previousRaw=current&&current.w===chosen?current.raw:null;
    delta=measuredDelta(prior,snap);
    if(previousRaw&&Number(raw.chars)>Number(previousRaw.chars)){
      const transitions=newlySeenFlow(prior,snap),born=performance.now();
      pulses=transitions.map((e,i)=>({...e,born:born+i*20,duration:900}));
    }else pulses=[];
    current={w:chosen,raw,snap};
    projectionVersion++;
    const tr=raw.transform?.last;
    const newKey=tr?String(chosen)+"|"+tr.i+"|"+tr.steps+"|"+(tr.frames?.length||0):"";
    if(newKey!==transKey){transKey=newKey;transIndex=Math.max(0,(tr?.frames?.length||1)-1);transPlaying=false;}
    $("transFrame").max=String(Math.max(0,(tr?.frames?.length||1)-1));$("transFrame").value=String(transIndex);
    const sel=slots.find(v=>Number(v.w)===chosen);
    const gr=Array.isArray(all.graphs)?all.graphs.find(v=>Number(v.w)===chosen):null;
    history=gr&&Array.isArray(gr.history)?gr.history.filter(h=>Number.isFinite(h.chars)):[];
    $("online").textContent=sel?.status||"live";$("online").className="tag";
    updateStats(all,raw,snap,delta,sel);
  }catch(e){
    $("online").textContent="deconectat";$("online").className="tag off";
    $("eventLog").textContent="Telemetrie indisponibilă: "+e.message+
      "\nVerifică dacă START_V17.ps1 rulează și dacă acest fișier este deschis pe același port.";
  }finally{busy=false;}
}
function drawTrend(){
  const [g,W,H]=resizeCanvas($("trend"));g.clearRect(0,0,W,H);
  const pad={l:42,r:12,t:14,b:26},innerW=Math.max(1,W-pad.l-pad.r),innerH=Math.max(1,H-pad.t-pad.b);
  g.font="11px system-ui";g.lineWidth=1;
  for(let k=0;k<=4;k++){const y=pad.t+innerH*k/4;g.strokeStyle="#20384d";g.beginPath();g.moveTo(pad.l,y);g.lineTo(W-pad.r,y);g.stroke();g.fillStyle="#93a8be";g.fillText((100-25*k)+"%",5,y+4);}
  if(!history.length){g.fillStyle="#92a9bd";g.fillText("Nu există încă teste reale pentru acest graf",pad.l+8,40);return;}
  const min=history[0].chars,max=history.at(-1).chars, X=x=>pad.l+innerW*(x-min)/Math.max(1,max-min),Y=y=>pad.t+(1-y)*innerH;
  for(const [field,col] of [["live","#75e2f5"],["C","#ffc46d"]]){
    g.strokeStyle=col;g.lineWidth=2;g.beginPath();let count=0;
    for(const h of history){if(!Number.isFinite(h[field]))continue;const x=X(h.chars),y=Y(h[field]);count++===0?g.moveTo(x,y):g.lineTo(x,y);}
    if(count>1)g.stroke();else if(count===1){g.fillStyle=col;g.beginPath();g.arc(X(history.at(-1).chars),Y(history.at(-1)[field]),3,0,Math.PI*2);g.fill();}
  }
  g.fillStyle="#8ba5ba";g.fillText(fmt(min),pad.l,H-6);g.textAlign="right";g.fillText(fmt(max),W-pad.r,H-6);g.textAlign="left";
}
function graphView(now){
  const [g,W,H]=resizeCanvas(canvas);g.clearRect(0,0,W,H);
  g.fillStyle="#071421";g.globalAlpha=.6;g.lineWidth=1;
  for(let i=1;i<9;i++){g.strokeStyle="#1a3146";g.beginPath();g.moveTo(W*i/9,0);g.lineTo(W*i/9,H);g.stroke();}
  if(!current){g.fillStyle="#9ab4ca";g.font="14px system-ui";g.fillText("Aștept primul graf real…",20,H/2);return;}
  const full=current.snap, role=$("role").value;
  const items=full.items.filter(n=>role==="all"||n.type===role).sort((a,b)=>b.act-a.act||b.born-a.born).slice(0,1400);
  if(!items.length){g.fillStyle="#a5bad1";g.font="14px system-ui";g.fillText("Niciun nod poziționat în filtrul selectat",20,H/2);return;}
  // Project only when the measured snapshot, camera or slice changes; animating a pulse never recomputes 5D geometry.
  const key=[projectionVersion,role,W,H,...cam,zoom,thickness,...angles].join("|");
  if(!projectionCache||projectionCache.key!==key){
    const M=rotation(angles),P=prepare(M);
    const aspect=W/Math.max(1,H),hw=.85/zoom*Math.max(1,aspect),hh=.85/zoom;
    const pp=plan(P,items.length,hw,hh,550,thickness,1.4);
    const ims=images(items,cam,P,hw,hh,Math.max(.02,pp.t),pp.m,2400);
    const S=Math.min(W/(2*hw),H/(2*hh))*.94,chosenImages=new Map(),positions=[];
    for(const im of ims){
      const n=items[im.it],z=im.q[2],factor=2.9/(2.9-.35*z);
      const q={x:W/2+im.q[0]*S*factor,y:H/2-im.q[1]*S*factor,depth:z,node:n,factor};
      positions.push(q);
      const old=chosenImages.get(n.id),d=im.q[0]*im.q[0]+im.q[1]*im.q[1];
      if(!old||d<old.d)chosenImages.set(n.id,{...q,d});
    }
    positions.sort((a,b)=>a.depth-b.depth);
    projectionCache={key,ims,chosenImages,positions};
  }
  const {ims,chosenImages,positions}=projectionCache;
  if($("edges").checked){
    g.lineWidth=1;
    for(const e of full.links.slice(0,2500)){
      const a=chosenImages.get(e.a),b=chosenImages.get(e.b);if(!a||!b)continue;
      if(Math.hypot(a.x-b.x,a.y-b.y)>Math.max(W,H)*.48)continue;
      g.globalAlpha=Math.min(.55,.09+Math.log1p(e.weight)/10);
      g.strokeStyle=edgeColours[e.kind]||"#7a94b0";
      g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
    }
  }
  if($("motion").checked&&!$("freeze").checked){
    for(const e of pulses){
      const t=(now-e.born)/e.duration;
      if(t<0||t>1)continue;
      const a=chosenImages.get(e.a),b=chosenImages.get(e.b);if(!a||!b)continue;
      if(Math.hypot(a.x-b.x,a.y-b.y)>Math.max(W,H)*.48)continue;
      g.globalAlpha=(1-t)*.85;g.fillStyle="#dffcff";g.shadowColor="#65e3fd";g.shadowBlur=12;
      g.beginPath();g.arc(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,2.2+1.3*t,0,Math.PI*2);g.fill();g.shadowBlur=0;
    }
  }
  for(const p of positions){
    const n=p.node, col=colours[n.type]||"#a6bde1";
    const r=(n.type==="sym"?2.5:4.2)*(0.8+Math.min(1.8,p.factor*.55))*(1+Math.min(.4,n.act*.35));
    g.globalAlpha=n.origin==="learned"?.8:.45;
    g.strokeStyle=col;g.fillStyle=col;
    if(n.origin==="estimated-from-edges"){g.lineWidth=1.5;g.beginPath();g.arc(p.x,p.y,r+1,0,Math.PI*2);g.stroke();}
    else{g.beginPath();g.arc(p.x,p.y,r,0,Math.PI*2);g.fill();}
    if(n.act>.7&&$("motion").checked){g.globalAlpha=.12+.2*n.act;g.lineWidth=1;g.beginPath();g.arc(p.x,p.y,r+5,0,Math.PI*2);g.stroke();}
  }
  g.globalAlpha=1;
  $("viewNote").textContent=fmt(ims.length)+" imagini tăiate 5D din "+fmt(items.length)+
    " noduri poziționate · coordonatele simbolurilor învățate; C/A estimate · "+fmt(full.unplaced)+" fără coordonate";
}
// The transform-world replay is rendered from measured raw boards, not a simulated world.
function transformFrames(){return current?.raw?.transform?.last?.frames||[];}
function setTransformFrame(i){const frames=transformFrames();transIndex=Math.min(Math.max(0,Math.floor(i)),Math.max(0,frames.length-1));$("transFrame").value=String(transIndex);}
$("transPrev").onclick=()=>{transPlaying=false;setTransformFrame(transIndex-1);};
$("transNext").onclick=()=>{transPlaying=false;setTransformFrame(transIndex+1);};
$("transPlay").onclick=()=>{if(!transformFrames().length)return;transPlaying=!transPlaying;if(transPlaying&&transIndex>=transformFrames().length-1)transIndex=0;transLastTime=performance.now();};
$("transFrame").oninput=()=>{transPlaying=false;setTransformFrame(+$("transFrame").value);};
function drawTransform(now){
  const [g,W,H]=resizeCanvas($("transformBoard"));g.clearRect(0,0,W,H);
  const result=current?.raw?.transform, last=result?.last, frames=transformFrames();
  if(!last||!frames.length){g.fillStyle="#9db2c7";g.font="13px system-ui";g.fillText('Nicio experiență în lumea transformărilor.',15,32);
    g.fillText('Pentru experimente noi: opțional -Worlds text,maze,transform',15,53);
    $("transInfo").textContent="Nu au fost raportate cadre de transformare pentru acest organism.";return;}
  if(transPlaying&&now-transLastTime>380){
    transLastTime=now;if(transIndex<frames.length-1)setTransformFrame(transIndex+1);
    else transPlaying=false;
  }
  $("transPlay").textContent=transPlaying?"⏸ Replay":"▶ Replay";
  const f=frames[transIndex],board=f.b||[],goal=last.goal||[],n=Number(last.n)||Math.round(Math.sqrt(board.length));
  if(!n||board.length!==n*n||goal.length!==n*n){g.fillStyle="#f79e9e";g.fillText("Cadru invalid sau incomplet primit de la motor.",15,30);return;}
  const gap=24,margin=15,cell=Math.max(6,Math.min((W-3*margin-gap)/(2*n),(H-58)/n));
  const side=n*cell,wide=2*side+gap,x0=Math.max(margin,(W-wide)/2),y0=Math.max(31,(H-side)/2+10);
  const drawBoard=(arr,left)=>{
    for(let i=0;i<arr.length;i++){
      const v=arr[i],x=left+(i%n)*cell,y=y0+Math.floor(i/n)*cell;
      g.fillStyle=v===17?"#0b1a27":"hsl("+((v*47)%360)+" 60% 35%)";g.fillRect(x+1,y+1,cell-2,cell-2);
      if(v!==17&&cell>=18){g.fillStyle="#e8f5ff";g.font=Math.max(9,Math.min(12,cell*.42))+"px ui-monospace,monospace";
        g.textAlign="center";g.fillText(String(v),x+cell/2,y+cell*.64);}
    }
  };
  drawBoard(board,x0);drawBoard(goal,x0+side+gap);
  g.textAlign="left";g.fillStyle="#b9d2e4";g.font="12px system-ui";g.fillText("STARE OBSERVATĂ",x0,18);
  g.fillText("CONFIGURAȚIE DORITĂ",x0+side+gap,18);
  const missing=goal.reduce((sum,v,i)=>sum+(v!==17&&board[i]!==v?1:0),0);
  $("transIndex").textContent=(transIndex+1)+"/"+frames.length;
  $("transInfo").textContent="Exercițiu "+last.i+" · "+last.goals?.join("+")+" · cadru "+(transIndex+1)+
    "/"+frames.length+" · diferențe față de intenție: "+missing+
    " · rezultat: "+(last.solved?"atins":"neatins")+
    " · mod intervenție: "+(f.how||"observare")+
    " · plan anticipat: "+(f.plan?.length||0)+" pași (raportați)";
}
function animate(now){
  requestAnimationFrame(animate);
  if(now-lastFrame<45)return;
  lastFrame=now;
  if(!$("freeze").checked)visualTime=now;
  graphView(visualTime);
  drawTransform(now);
  if(Math.round(now)%900<50)drawTrend();
}
readControls();poll();setInterval(poll,1800);requestAnimationFrame(animate);
