// V21 Aether/Veil — additive read-only LIVE visualization of the ACTUAL V17 worker.
// No artificial trajectories, invented states or training in the browser.
const $=id=>document.getElementById(id);
const canvas=$("veilCanvas"),ctx=canvas.getContext("2d");
let data=null,planned=null,frame=0,playing=true,loaded="",polling=false,at=0;
const pct=v=>v==null?"—":(100*v).toFixed(2)+"%";
const worker=()=>Math.max(0,Math.trunc(Number($("textMazeWorker")?.value)||0));
const coords=(n,W,H)=>{
 const v=n.features||[0,0,0,0,0],angle=(Math.imul(n.id+1,2654435761)>>>0)/4294967296*Math.PI*2;
 const x=W*(.12+.74*(.44*v[0]+.33*v[2]+.23*v[4]))+30*Math.cos(angle);
 const y=H*(.12+.71*(.46*v[1]+.32*v[3]+.22*(1-v[4])))+30*Math.sin(angle);
 return {x:Math.max(15,Math.min(W-16,x)),y:Math.max(30,Math.min(H-17,y)),label:n.label,id:n.id};
};
function path(points,coords,color,width){
 const good=points.map(label=>coords.get(label)).filter(Boolean);
 if(good.length<2)return;
 ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;
 for(let i=0;i<good.length;i++)i?ctx.lineTo(good[i].x,good[i].y):ctx.moveTo(good[i].x,good[i].y);
 ctx.stroke();
}
function draw(){
 const W=canvas.width,H=canvas.height;
 ctx.fillStyle="#071019";ctx.fillRect(0,0,W,H);
 ctx.fillStyle="#91b9d2";ctx.font="12px monospace";
 ctx.fillText("V21 · CONTEXTUAL STATES / OBSERVED TRANSITIONS · 5 MEASURED LAYOUT FEATURES",12,20);
 const nodes=data?.sample?.nodes||[];
 if(!nodes.length){ctx.fillText("Aștept observații din antrenarea reală...",18,H/2);return;}
 const coordsByLabel=new Map(nodes.map(n=>[n.label,coords(n,W,H)]));
 const coordsById=new Map([...coordsByLabel.values()].map(n=>[n.id,n]));
 for(const [from,to,n] of data.sample.edges||[]){
  const a=coordsById.get(from),b=coordsById.get(to);if(!a||!b)continue;
  ctx.strokeStyle="rgba(111,151,183,.18)";ctx.lineWidth=.5+Math.min(1.4,Math.log1p(n)*.15);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 }
 const predicted=planned?.found?planned.path:(data.last?.initialShape||[]);
 const actual=(data.last?.actual||[]).slice(0,frame+1);
 path(predicted,coordsByLabel,"#ffcb57",3.5);
 path(actual,coordsByLabel,"#50cbf7",3);
 const current=actual.at(-1),goal=planned?.found?planned.goal?.join(" "):data.last?.goal?.join(" ");
 const focus=new Set([predicted[0],predicted.at(-1),current,goal]);
 for(const n of nodes){
  const p=coordsByLabel.get(n.label);if(!p)continue;
  const isCurrent=n.label===current,isGoal=n.label===goal,inPlan=predicted.includes(n.label);
  const r=isCurrent?8:isGoal?7:inPlan?4.5:Math.min(4,2+Math.log1p(n.count)/5);
  ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);
  ctx.fillStyle=isCurrent?"#50cbf7":isGoal?"#61e4ac":inPlan?"#ffcb57":"#688ca7";
  ctx.fill();
 }
 ctx.fillStyle="#ddecff";ctx.font="12px sans-serif";
 for(const label of focus){const p=coordsByLabel.get(label);if(p)ctx.fillText(String(label).slice(0,27),Math.min(W-165,p.x+8),p.y-8);}
 ctx.fillStyle="#b4d0df";ctx.font="12px monospace";
 ctx.fillText("AURIU: predicție ÎNAINTE de document | ALBASTRU: succesiune observată",12,H-17);
}
function render(){
 if(!data){draw();return;}
 const l=data.last||{},frames=l.frames||[],now=frames[Math.max(0,frame-1)]||null;
 const values=[
  "Documente reale: "+data.documents+" | stări contextuale distincte: "+data.states+" | muchii: "+data.edges,
  "Predicții PRE-ingest: "+data.onlinePredictions+
    " | acoperire: "+pct(data.contextCoverage)+" | context corect (acoperite): "+pct(data.contextAccuracyCovered),
  "Control 1-token (aceleași poziții acoperite): "+pct(data.oneTokenAccuracyOnSameCovered)+
    " | toate: "+pct(data.oneTokenAccuracyAll)+
    " | grupuri în care ISTORIA schimbă viitorul observat: "+data.historyAxisEvidence,
  "Axe observate: (simbol anterior, simbol curent) · NU afirmație despre 6 axe fizice",
  "Evenimente V17 din același Brain: "+JSON.stringify(data.domainEvents),
  "Traseu pre-acțiune pe graful anterior: "+(l.initialFound?"DA":"NU")+
   " | document "+(l.id??"—"),
  "Pas "+frame+" / "+Math.max(0,(l.actual?.length||1)-1)+
   (now?" | starea "+now.state+" | prezis "+(now.predicted??"necunoscut")+
    " | observat "+now.observed+" | P(observat) "+pct(now.probability)+
    " | abatere "+(now.surprise?"DA":"NU"):""),
  now?"Ramuri observate: "+now.alternatives.map(o=>o.token+":"+pct(o.p)).join(" | "):"",
  now?"Forma actualizată din observații anterioare: "+(now.remainingShape.join(" → ")||"NECUNOSCUTĂ"):"",
  "Omise din buget: stări "+data.skippedStates+" / muchii "+data.skippedEdges,
  "Semantic verified: "+data.semanticGoalVerified+
    " | original Discoverer called directly: "+data.originalDiscovererDirectlyReused+
    " | full CUDA: "+data.fullCUDAVerified
 ];
 $("veilStats").textContent=values.filter(Boolean).join("\n");
 const limit=Math.max(0,(l.actual?.length||1)-1);
 $("veilScrub").max=limit;$("veilScrub").value=Math.min(frame,limit);
 $("veilStep").textContent="Pas "+frame+" / "+limit;draw();
}
async function poll(){
 if(polling)return;polling=true;
 try{
  const resp=await fetch("/graph?w="+worker(),{cache:"no-store"});
  if(!resp.ok)throw Error("HTTP "+resp.status);
  const o=await resp.json();
  data=o.hypermaze?.veil||null;
  if(!data){$("veilStatus").textContent="Aștept lumea hypertext sau cognitivemap din worker";render();return;}
  const k=String(data.last?.id??"")+":"+String(data.last?.start?.join(" ")??"")+":"+
   String(data.last?.goal?.join(" ")??"");
  if(data.last&&k!==loaded){loaded=k;planned=null;frame=0;}
  if(!$("veilStart").value&&data.last?.start)$("veilStart").value=data.last.start.join(" ");
  if(!$("veilGoal").value&&data.last?.goal)$("veilGoal").value=data.last.goal.join(" ");
  $("veilStatus").textContent="LIVE · worker #"+worker()+" · "+data.documents+" documente";
  render();
 }catch(err){$("veilStatus").textContent="Conexiune: "+err.message;}
 finally{polling=false;}
}
$("veilScrub").addEventListener("input",e=>{playing=false;frame=+e.target.value;render();});
$("veilPrev").addEventListener("click",()=>{playing=false;frame=Math.max(0,frame-1);render();});
$("veilNext").addEventListener("click",()=>{
 playing=false;frame=Math.min(Math.max(0,(data?.last?.actual?.length||1)-1),frame+1);render();
});
$("veilPlay").addEventListener("click",()=>{playing=!playing;$("veilPlay").textContent=playing?"⏸ Pauză":"▶ Replay";});
$("veilPlan").addEventListener("click",async()=>{
 const b=$("veilPlan");b.disabled=true;
 try{
  const r=await fetch("/veil-plan",{method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({w:worker(),start:$("veilStart").value,goal:$("veilGoal").value,maxSteps:160})});
  const p=await r.json();if(p.error)throw Error(p.error);
  planned=p;
  $("veilPlanOut").textContent=[
   "FROZEN "+p.frozen+" | "+p.reason,
   "Shape pre-action: "+(p.path?.join(" → ")||"NU EXISTĂ CALE OBSERVATĂ"),
   "Lungime "+(p.math?.pathLength??"—")+" | optim "+(p.math?.shortestObservedRoute??"—"),
   "Max Bellman residual "+(p.math?.maxResidual??"—")+
   " | strict uphill "+(p.math?.strictUphill??"—"),
   "NOTĂ: drum prin contexte observate, nu răspuns semantic verificat."
  ].join("\n");
  draw();
 }catch(err){$("veilPlanOut").textContent="Eroare: "+err.message;}
 finally{b.disabled=false;}
});
function tick(t){
 if(playing&&data?.last?.actual?.length&&t-at>Number($("veilSpeed").value||320)){
  at=t;frame=(frame+1)%data.last.actual.length;render();
 }
 requestAnimationFrame(tick);
}
poll();setInterval(poll,1800);requestAnimationFrame(tick);
