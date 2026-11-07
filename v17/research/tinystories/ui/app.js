// TinyStories Aether UI: ALL source values are bound to actual /api/status
// and /api/test responses. No generated statistics or fabricated lines.
const $=id=>document.getElementById(id);
const colors={cyan:"#82d6ec",gold:"#f2cb87",rose:"#f688a1",green:"#69e3c3",purple:"#bd97f6",muted:"#627d9d"};
const num=x=>Number.isFinite(x)?Intl.NumberFormat("ro-RO",{maximumFractionDigits:1}).format(x):"—";
const pct=x=>Number.isFinite(x)?x.toFixed(2)+"%":"—";
const trim=(s,n)=>String(s||"").slice(0,n);
let current=null,pollBusy=false;
function canvas(id){
 const c=$(id),ratio=Math.min(devicePixelRatio||1,2),w=Math.max(180,c.clientWidth),h=Math.max(120,c.clientHeight);
 if(c.width!==Math.floor(w*ratio)||c.height!==Math.floor(h*ratio)){
  c.width=Math.floor(w*ratio);c.height=Math.floor(h*ratio);
 }
 const ctx=c.getContext("2d");ctx.setTransform(ratio,0,0,ratio,0,0);
 ctx.clearRect(0,0,w,h);
 return {ctx,w,h};
}
function title(ctx,text,x,y,color=colors.muted,size=11){
 ctx.fillStyle=color;ctx.font=size+"px Segoe UI";ctx.fillText(text,x,y);
}
function pathLine(ctx,pts,color,width=2){
 if(pts.length<2)return;
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
 for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
 ctx.stroke();
}
function drawPath(){
 const {ctx,w,h}=canvas("path"),actual=current?.preview?.preUpdate?.actual,
  predicted=current?.preview?.preUpdate?.predicted;
 if(!actual||!predicted){
  ctx.textAlign="center";title(ctx,"Nicio predicție reală încă — aștept primul lot",w/2,h/2,colors.gold,15);
  ctx.textAlign="start";return;
 }
 const a=[...actual],b=[...predicted],n=Math.min(a.length,b.length,96);
 if(n<2)return;
 title(ctx,"PRE-UPDATE: traseul condițional în 2D este o proiecție a octeților, nu spațiu fizic 4D",16,21,colors.muted,11);
 const lo=38,hi=h-25,dx=(w-46)/(n-1);
 const point=(c,i,upper)=>({x:23+dx*i,y:(upper?h*.37:h*.72)+(c.charCodeAt(0)-72)*.68});
 const correct=[],aPts=[],bPts=[];
 for(let i=0;i<n;i++){
  const p=point(a[i],i,true),q=point(b[i],i,false);
  aPts.push(p);bPts.push(q);
  if(a[i]!==b[i])correct.push({a:p,b:q});
 }
 for(let i=0;i<5;i++){
  const y=lo+(hi-lo)*(i/4);ctx.strokeStyle="#29415a66";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(16,y);ctx.lineTo(w-16,y);ctx.stroke();
 }
 pathLine(ctx,aPts,colors.cyan,2);pathLine(ctx,bPts,colors.gold,2);
 for(const c of correct.filter((x,i)=>i%Math.max(1,Math.floor(correct.length/35))===0)){
  ctx.strokeStyle=colors.rose+"78";ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(c.a.x,c.a.y);ctx.lineTo(c.b.x,c.b.y);ctx.stroke();
 }
 const last=aPts.at(-1),prev=bPts.at(-1);
 for(const [p,color] of [[last,colors.cyan],[prev,colors.gold]]){
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();
 }
 title(ctx,"Text observat",16,h*.19,colors.cyan,12);
 title(ctx,"Predicție înaintea învățării",16,h*.54,colors.gold,12);
}
function drawChart(){
 const {ctx,w,h}=canvas("chart"),points=current?.history||[];
 if(points.length<2){ctx.textAlign="center";title(ctx,"Date reale după două loturi confirmate",w/2,h/2,colors.gold,15);ctx.textAlign="left";return;}
 const clip=points.slice(-80),start=clip[0].at,end=clip.at(-1).at,
  ax=25,bx=w-15,ay=26,by=h-31;
 for(let i=0;i<4;i++){const y=ay+(by-ay)*i/3;ctx.strokeStyle="#263a50a5";
  ctx.beginPath();ctx.moveTo(ax,y);ctx.lineTo(bx,y);ctx.stroke();}
 for(const {key,color} of [{key:"rateMB",color:colors.green},{key:"rateStories",color:colors.purple}]){
  const values=clip.map(p=>p[key]).filter(Number.isFinite);
  if(values.length<2)continue;
  const max=Math.max(...values,.001),min=Math.min(...values);
  const series=clip.map((p,i)=>{
   const x=ax+(bx-ax)*(end===start?i/(clip.length-1):(p.at-start)/(end-start));
   const y=by-(by-ay)*(max===min?.5:(p[key]-min)/(max-min));
   return {x,y};
  });
  pathLine(ctx,series,color,2.2);
 }
 title(ctx,"Timp măsurat",ax,h-10,colors.muted,11);
 title(ctx,Math.round((end-start)/1000)+" s",w-45,h-10,colors.muted,11);
}
function details(s){
 const gpu=s.gpuInfo||{},model=s.gpuModel||"—",
  last=s.lastBatch||{};
 const info=[
  ["Modul",s.mode],
  ["Sursă train",s.train],
  ["Sursă VALIDARE (separată)",s.valid],
  ["Tip date",s.sourceDelimiter==="tiny-mark"?"<|endoftext|> = o poveste":"blocuri separate de linii goale"],
  ["Model",model+" · 4 perspective de context"],
  ["Metodă",s.algorithm],
  ["GPU cerut",s.device],
  ["GPU identificat",gpu.name||gpu.device||"—"],
  ["CUDA real la ultimul lot",last.gpuWeightsUpdated?"DA":last.gpuWeightsUpdated===false?"NU":"fără lot"],
  ["Ultimul lot confirmat",last.stories!=null?num(last.stories)+" povești / "+num(last.chars)+" caractere":"—"],
  ["Salvare",s.lastSave||"încă nu"],
  ["Caractere în checkpoint",num(s.checkpointChars)],
  ["Faza",s.phase]
 ];
 const root=$("details");root.replaceChildren();
 for(const [name,value] of info){
  const row=document.createElement("div");row.textContent=name+": ";
  const span=document.createElement("span");span.textContent=String(value??"—");
  row.append(span);root.append(row);
 }
}
function paint(s){
 current=s;
 const waiting=s.phase==="initializing",bad=s.phase==="error",
  active=s.phase==="training"||s.phase==="GPU learning";
 $("status").textContent=bad?"EROARE: "+trim(s.error,130):s.phase+(s.paused?" · pauză":"");
 $("orb").className="orb "+(bad?"error":active?"active":"");
 $("stories").textContent=num(s.stories);
 $("storiesRate").textContent=num(s.storiesPerSecond);
 $("mbRate").textContent=Number.isFinite(s.MBPerSecond)?s.MBPerSecond.toFixed(3):"—";
 $("chars").textContent=num(s.chars);
 $("accuracy").textContent=s.heldout?.accuracy!=null?(s.heldout.accuracy*100).toFixed(2)+"%":"—";
 $("device").textContent=s.device||"—";
 $("deviceInfo").textContent=s.gpuInfo?.name||"Aștept GPU";
 $("pct").textContent=pct(s.percent);
 $("fill").style.width=Math.max(0,Math.min(100,s.percent||0))+"%";
 $("dataProgress").textContent=(s.bytesRead/1e6).toFixed(2)+" MB / "+(s.datasetSize/1e6).toFixed(1)+" MB";
 $("saveStatus").textContent="Checkpoint: "+(s.lastSave?new Date(s.lastSave).toLocaleTimeString("ro-RO"):"nu este încă salvat");
 $("start").disabled=bad||s.finished||(!s.paused&&!waiting);
 $("pause").disabled=s.paused||bad;
 $("actual").textContent=s.preview?.preUpdate?.actual||"Aștept predicție pe text real…";
 $("predicted").textContent=s.preview?.preUpdate?.predicted||"Aștept predicție înainte de update…";
 $("predictionNote").textContent=s.preview?
  "Modelul anterior · "+num(s.preview.correct)+" / "+num(s.preview.total)+" caractere prezise corect"+
  " ("+(s.preview.accuracy!=null?(s.preview.accuracy*100).toFixed(1)+"%":"—")+
  "). EXCLUSIV exemplu de antrenare înainte de actualizare; nu este scorul testului independent.":
  "Predicțiile apar după ce începe antrenarea efectivă.";
 details(s);drawPath();drawChart();
 const history=(s.history||[]).slice(-9).reverse().map(p=>
  new Date(p.at).toLocaleTimeString("ro-RO")+" · "+num(p.stories)+" povești · "+num(p.chars)+
  " caractere · "+p.rateStories.toFixed(1)+" povești/s · "+p.rateMB.toFixed(3)+" MB/s");
 $("log").textContent=history.join("\n")||(s.error||"Aștept primele loturi confirmate…");
 if(s.heldout){
  const h=s.heldout;const lines=[
   "Validare independentă: "+num(h.stories)+" povești",
   "Caractere prezise: "+num(h.seen),
   "Top-1 exact: "+num(h.hits)+" / "+num(h.seen)+" = "+(100*h.accuracy).toFixed(2)+"%",
   "Evaluare frozen: "+(h.frozen?"DA":"NU"),
   "Nicio actualizare de model din fișierul de validare.",
   "Data: "+h.time
  ];
  $("heldout").textContent=lines.join("\n");
 }
 document.documentElement.dataset.tinystoriesConnected="true";
 document.documentElement.dataset.tinystoriesTrained=String(s.stories);
}
async function api(path,method="GET"){
 const res=await fetch(path,{method,cache:"no-store"});
 const data=await res.json();
 if(!res.ok||data.error)throw Error(data.error||"HTTP "+res.status);
 return data;
}
async function command(path){
 try{
  $("status").textContent="Execută comandă…";
  const response=await api(path,"POST");
  if(path==="/api/test"){
   const old=current||{};paint({...old,heldout:response});
  }else if(path==="/api/save"){
   $("saveStatus").textContent="Cerere salvare acceptată; scriere după lotul curent";
  }else if(path==="/api/start"||path==="/api/pause"){
   paint(response);
  }
  await refresh();
 }catch(e){$("status").textContent="EROARE: "+trim(e.message,160);}
}
$("start").onclick=()=>command("/api/start");
$("pause").onclick=()=>command("/api/pause");
$("save").onclick=()=>command("/api/save");
$("test").onclick=()=>command("/api/test?stories=32");
$("refresh").onclick=()=>refresh();
async function refresh(){
 if(pollBusy)return;
 pollBusy=true;
 try{paint(await api("/api/status"));}
 catch(e){
  $("status").textContent="Server indisponibil: "+trim(e.message,150);
  $("orb").className="orb error";
  document.documentElement.dataset.tinystoriesConnected="false";
 }finally{pollBusy=false;}
}
async function cycle(){await refresh();setTimeout(cycle,650);}
window.addEventListener("resize",()=>{drawPath();drawChart();});
cycle();
