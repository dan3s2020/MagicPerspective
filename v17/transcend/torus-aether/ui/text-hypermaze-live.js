// Native V17 live UI extension. Reads ONLY /graph snapshots produced by training
// and /hypermaze-plan paths produced by the real worker. No synthesized events.
const el=id=>document.getElementById(id),can=el("textMazeCanvas"),ctx=can.getContext("2d");
let graph=null,plan=null,frame=0,playing=true,selected=0,lastKey="",pending=false,lastTick=0;
const fmt=x=>x==null?"—":(100*x).toFixed(2)+"%";
const choose=()=>Math.max(0,Math.trunc(Number(el("textMazeWorker").value)||0));
const palette={gold:"#f5bc46",actual:"#51caff",goal:"#5de5a8",muted:"#506c83",unknown:"#ef637d"};
const white="#d8eafa";
function line(points,color,width=2,dash=[]){
 if(points.length<2)return;
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();
 for(let i=0;i<points.length;i++)i?ctx.lineTo(points[i].x,points[i].y):ctx.moveTo(points[i].x,points[i].y);
 ctx.stroke();ctx.setLineDash([]);
}
function canvas(){
 const W=can.width,H=can.height;ctx.fillStyle="#05101a";ctx.fillRect(0,0,W,H);
 ctx.fillStyle="#91b9d2";ctx.font="12px monospace";
 ctx.fillText("PROIECȚIE DIN 5 CARACTERISTICI ALE GRAFULUI OBSERVAT",12,19);
 if(!graph?.sample?.nodes?.length){
  ctx.fillText("Aștept primul document real din corpus...",20,H/2);return;
 }
 const nodes=graph.sample.nodes,links=graph.sample.edges;
 const positions=new Map();
 for(const n of nodes){
  const f=n.features,hash=(((Math.imul(n.id+1,2654435761)>>>0)/4294967296)-.5);
  const hash2=(((Math.imul(n.id+113,2246822519)>>>0)/4294967296)-.5);
  // All five features contribute; hash only resolves overlap for legibility.
  const x=W*(.09+.67*(.54*f[0]+.28*f[2]+.18*f[4]))+hash*48;
  const y=H*(.10+.76*(.51*f[1]+.34*f[3]+.15*(1-f[2])))+hash2*48;
  positions.set(n.label,{x:Math.max(15,Math.min(W-16,x)),
   y:Math.max(32,Math.min(H-20,y)),id:n.id,label:n.label,count:n.count});
 }
 const byId=new Map([...positions.values()].map(p=>[p.id,p]));
 for(const [a,b,w] of links){
  const p=byId.get(a),q=byId.get(b);if(!p||!q)continue;
  line([p,q],"rgba(92,127,158,.15)",.5+Math.min(1.3,Math.log1p(w)*.14));
 }
 const active=plan?.found?plan.path:graph.last?.initialShape||[];
 const actual=graph.last?.actual||[];
 const predictedPoints=active.map(s=>positions.get(s)).filter(Boolean);
 const actualPoints=actual.slice(0,frame+1).map(s=>positions.get(s)).filter(Boolean);
 line(predictedPoints,palette.gold,3.5,[]);
 line(actualPoints,palette.actual,3);
 const now=actual[Math.min(frame,actual.length-1)],target=plan?.found?plan.goal:graph.last?.goal;
 const important=new Set([active[0],active.at(-1),now,target]);
 for(const n of nodes.slice(0,75)){
  const p=positions.get(n.label);if(!p)continue;
  const isNow=n.label===now,isGoal=n.label===target,isPath=active.includes(n.label);
  const r=isNow?9:isGoal?8:isPath?5:Math.min(4.2,2.2+Math.log1p(n.count)*.25);
  ctx.beginPath();ctx.arc(p.x,p.y,r,0,2*Math.PI);
  ctx.fillStyle=isNow?palette.actual:isGoal?palette.goal:isPath?palette.gold:"rgba(147,173,196,.70)";
  ctx.fill();
 }
 for(const word of important){
  const p=positions.get(word);if(!p)continue;
  ctx.font="12px sans-serif";ctx.fillStyle=white;
  ctx.fillText(String(word).slice(0,24),Math.min(W-110,p.x+8),p.y-8);
 }
 ctx.fillStyle=white;ctx.font="12px monospace";
 ctx.fillText("AURIU: forma prezisă înainte de mișcare",12,H-38);
 ctx.fillText("ALBASTRU: textul efectiv observat, până la pasul "+frame,12,H-20);
}
function render(){
 if(!graph){canvas();return;}
 const l=graph.last||{},frames=l.frames||[],curr=frames[Math.max(0,frame-1)]||null;
 const s=[
  "Documente absorbite: "+graph.documents+" | tokenuri observate: "+graph.tokens,
  "Noduri UNIQUE (nu per apariție): "+graph.nodes+" | transformări observate: "+graph.edges,
  "Predicție ONLINE înainte de absorbția fiecărui document: "+fmt(graph.onlinePreIngestAccuracy),
  "Bază unigramă pre-document: "+fmt(graph.onlineBaselineAccuracy),
  "Predicții efectuate (unde exista context cunoscut): "+graph.onlinePredictions,
  "Noduri noi omise din buget: "+graph.skippedNewTokens+" | tranziții noi omise: "+graph.skippedNewEdges,
  "Traseu inițial disponibil înainte de textul curent: "+(l.goalReachableBeforeLearning?"DA":"NU"),
  "Distanță optimă pe graful OBSERVAT: "+(l.originalDistance??"—"),
  "Reziduu Bellman max |V - 0.97 max V(next)|: "+(l.originalResidual??"—"),
  "Acoperire predicție pe documentul curent: "+fmt(l.coverage),
  "Pas: "+frame+"/"+frames.length+
    (curr?" | prezis next="+String(curr.predictedNext??"necunoscut")+
    " | observat="+String(curr.observedNext)+" | "+(curr.correct?"corect":"abatere"):"")
 ];
 el("textMazeStats").textContent=s.join("\n");
 const k=graph.last?.actual?.length||0,slider=el("textMazeScrub");
 slider.max=Math.max(0,k-1);slider.value=frame;
 el("textMazeFrame").textContent="Pas "+frame+" / "+Math.max(0,k-1);
 canvas();
}
async function poll(){
 if(pending)return;pending=true;
 try{
  selected=choose();
  const r=await fetch("/graph?w="+selected,{cache:"no-store"});
  if(!r.ok)throw Error("Graph HTTP "+r.status);
  const data=await r.json();
  if(!data.hypermaze){el("textMazeStatus").textContent=
    "Graful #"+selected+" nu are cognitivemap activ. Activează lumea cognitivemap și pornește trainerul.";return;}
  graph=data.hypermaze;
  const now=String(graph.last?.id??"")+":"+String(graph.last?.start??"")+":"+String(graph.last?.goal??"");
  if(now!==lastKey){lastKey=now;frame=0;plan=null;}
  if(!el("textMazeStart").value&&graph.last?.start)el("textMazeStart").value=graph.last.start;
  if(!el("textMazeGoal").value&&graph.last?.goal)el("textMazeGoal").value=graph.last.goal;
  el("textMazeStatus").textContent="LIVE · worker #"+selected+
   " · documente "+graph.documents+" · date reale din backend";
  render();
 }catch(err){el("textMazeStatus").textContent="Conexiune: "+err.message;}
 finally{pending=false;}
}
el("textMazeWorker").addEventListener("change",()=>{lastKey="";graph=null;plan=null;frame=0;poll();});
el("textMazeScrub").addEventListener("input",e=>{frame=Number(e.target.value);playing=false;render();});
el("textMazePlay").addEventListener("click",()=>{playing=!playing;el("textMazePlay").textContent=playing?"⏸ Pauză replay":"▶ Replay";});
el("textMazePrev").addEventListener("click",()=>{playing=false;frame=Math.max(0,frame-1);render();});
el("textMazeNext").addEventListener("click",()=>{playing=false;frame=Math.min((graph?.last?.actual?.length||1)-1,frame+1);render();});
el("textMazePlan").addEventListener("click",async()=>{
 const btn=el("textMazePlan");btn.disabled=true;
 try{
  const start=el("textMazeStart").value.trim(),goal=el("textMazeGoal").value.trim();
  const r=await fetch("/hypermaze-plan",{method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({w:choose(),start,goal,maxSteps:160})});
  const value=await r.json();if(value.error)throw Error(value.error);
  plan=value;el("textMazePlanOut").textContent=[
   "Frozen: "+value.frozen+" | rezultat: "+value.reason,
   "Traseu: "+(value.path||[]).join(" → "),
   "Lungime: "+(value.math?.pathLength??"—")+
      " | optim pe graful observat: "+(value.math?.optimal??"—"),
   "Reziduu Bellman: "+(value.math?.maxResidual??"—")+
      " | strict uphill: "+(value.math?.strictUphill??"—"),
   "Aceasta nu este o demonstrație de corectitudine semantică."
  ].join("\n");
  render();
 }catch(err){el("textMazePlanOut").textContent="Eroare: "+err.message;}
 finally{btn.disabled=false;}
});
el("textMazeUnseen").addEventListener("click",async()=>{
 const button=el("textMazeUnseen");button.disabled=true;
 el("textMazeUnseenOut").textContent="Evaluez documentele originale ținute deoparte; fără modificarea checkpoint-ului...";
 try{
  const count=Math.max(1,Math.min(20,Math.trunc(Number(el("textMazeUnseenCount").value)||8)));
  const r=await fetch("/hypermaze-eval",{method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({w:choose(),count})});
  const v=await r.json();if(v.error)throw Error(v.error);
  const fmtPct=x=>x==null?"—":(100*x).toFixed(2)+"%";
  el("textMazeUnseenOut").textContent=[
   "EVALUARE FROZEN: "+v.frozen+" | sursa: "+v.source+
    " | documente: "+v.documents,
   "Tranziții în test: "+v.observedTransitions+
    " | unde modelul avea o predicție: "+v.predictionsCovered,
   "ACURATEȚE NEXT-TOKEN în zona acoperită: "+fmtPct(v.accuracy),
   "ACOPERIRE pe toate tranzițiile nevăzute: "+fmtPct(v.coverage),
   "UNIGRAM bază independentă: "+fmtPct(v.baselineUnigramAccuracy),
   "Trasee spre țintă vizibilă: "+v.routeReachable+
    " accesibile / "+v.routeSamples+" testate",
   ...(v.samples||[]).map((x,i)=>
    "MOSTRĂ #"+(i+1)+": "+x.start+" → "+x.goal+
    " | găsit: "+x.found+" | optim: "+x.optimal+
    " | reziduu: "+x.residual),
   "Interpretare: reachability pe muchii observate ≠ înțelegere semantică."
  ].join("\n");
 }catch(err){el("textMazeUnseenOut").textContent="Eroare: "+err.message;}
 finally{button.disabled=false;}
});
function tick(t){
 if(playing&&graph?.last?.actual?.length){
  const delta=t-lastTick,delay=Number(el("textMazeSpeed").value)||320;
  if(delta>=delay){lastTick=t;frame=(frame+1)%graph.last.actual.length;render();}
 }
 requestAnimationFrame(tick);
}
poll();setInterval(poll,1500);requestAnimationFrame(tick);