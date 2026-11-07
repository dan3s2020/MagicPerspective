// V21 Aether/Veil — additive read-only LIVE visualization of the ACTUAL V17 worker.
// No artificial trajectories, invented states or training in the browser.
const $=id=>document.getElementById(id);
const canvas=$("veilCanvas"),ctx=canvas.getContext("2d");
const actionCanvas=$("veilActionCanvas"),actionCtx=actionCanvas?.getContext("2d");
let data=null,planned=null,originalShape=null,frame=0,playing=true,loaded="",polling=false,at=0;
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
 const nodes=[...new Map([...(data?.sample?.nodes||[]),...(planned?.routeNodes||[])]
    .map(n=>[n.id,n])).values()];
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
 const repaired=data.last?.frames?.[Math.max(0,frame-1)]?.remainingShape||[];
 path(predicted,coordsByLabel,"#ffcb57",3.5);
 path(repaired,coordsByLabel,"#bb91ff",2.5);
 path(actual,coordsByLabel,"#50cbf7",3);
 const current=actual.at(-1),goal=planned?.found?planned.goal?.join(" "):data.last?.goal?.join(" ");
 const focus=new Set([predicted[0],predicted.at(-1),repaired.at(-1),current,goal]);
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
 ctx.fillText("AURIU: forma inițială | MOV: forma recalculată | ALBASTRU: parcurs real",12,H-17);
}
function drawActualActions(){
 if(!actionCtx)return;
 const C=data?.causalField,g=actionCtx,W=actionCanvas.width,H=actionCanvas.height;
 g.fillStyle="#07101b";g.fillRect(0,0,W,H);
 g.fillStyle="#9ccfe1";g.font="12px monospace";
 g.fillText("CAUSAL V17 · actual (before, action, after) observations",12,18);
 if(!C?.graph?.nodes?.length){g.fillText("Aștept evenimente reale din lumile V17...",20,H/2);return;}
 const domains=["maze","transform","text","code"];
 const colors=["#45c9ea","#e9a668","#aa86ee","#9db5ab"];
 const pos=new Map();
 for(const node of C.graph.nodes){
   const idx=Math.max(0,domains.indexOf(node.domain));
   const phi=((Math.imul(node.id+1,2654435761)>>>0)/4294967296)*Math.PI*2;
   const d=25+Math.min(68,Math.sqrt(node.count||1)*11);
   pos.set(node.id,{x:Math.max(14,Math.min(W-14,W*(.13+idx*.244)+d*Math.cos(phi))),
     y:Math.max(28,Math.min(H-24,H*.5+d*Math.sin(phi))),node});
 }
 for(let i=0;i<domains.length;i++){
   g.fillStyle=colors[i];g.fillText(domains[i]+" "+(C.counts?.[domains[i]]||0),W*(.13+i*.244)-40,39);
 }
 for(const e of C.graph.edges){
   const a=pos.get(e.from),b=pos.get(e.to);if(!a||!b)continue;
   const latest=C.last?.from===e.from&&C.last?.to===e.to&&C.last?.action===e.action;
   g.strokeStyle=latest?"#fff0a8":"rgba(133,167,207,.25)";
   g.lineWidth=latest?3:Math.min(1.7,.5+Math.log1p(e.count)*.14);
   g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
 }
 for(const node of C.graph.nodes){
   const p=pos.get(node.id);if(!p)continue;
   g.fillStyle=colors[Math.max(0,domains.indexOf(node.domain))];
   g.beginPath();g.arc(p.x,p.y,2+Math.min(4,Math.log1p(node.count)),0,2*Math.PI);g.fill();
 }
 if(C.last){
   g.fillStyle="#fff0a8";g.font="12px monospace";
   g.fillText("ULTIMA ACȚIUNE REALĂ: "+C.last.domain+" / "+C.last.action,12,H-13);
 }
}
function renderActualActions(){
 const C=data?.causalField;
 if(C){
   const axes=(C.actualActionAxes||[]).slice(0,7).map(x=>
     x.action+" → "+x.changedCoordinateEvidence.map(([i,n])=>i+":"+n).join(", "));
   const alternatives=(C.stochasticBranches||[]).slice(0,5).map(x=>
     x.domain+" / "+x.action+" → "+x.distinctObservedOutcomes+
      " rezultate, entropie "+x.entropyBits.toFixed(2)+" bits");
   const order=(C.observedNoncommuting||[]).slice(0,4).map(x=>
     x.domain+" "+x.actions.join("→")+" ≠ "+x.actions.slice().reverse().join("→"));
   $("veilActionStats").textContent=[
     "Evenimente V17: "+JSON.stringify(C.counts)+" | stări "+C.states+" | muchii "+C.edges,
     "Ultimul rezultat observat: "+(C.last?C.last.domain+"/"+C.last.action+
       " #"+C.last.from+" → #"+C.last.to+" | schimbat: "+C.last.changed:"—"),
     "AXE observate per operație: "+axes.length,...axes,
     "Ramuri condiționale observate: "+(C.stochasticBranches||[]).length,...alternatives,
     "ORDINI observate AB ≠ BA: "+(C.observedNoncommuting||[]).length,...order,
     "Dovadă de acțiuni trăite, NU de transfer semantic sau dimensiuni fizice."
   ].join("\n");
 }else $("veilActionStats").textContent="Aștept observații reale...";
 drawActualActions();
}

function render(){
 if(!data){draw();return;}
 const l=data.last||{},frames=l.frames||[],now=frames[Math.max(0,frame-1)]||null;
 const values=[
  "ORIGINAL V17 — forma soluției SCRISĂ DIN ÎNTREBARE (test înghețat): "+
    (originalShape?.status==="MEASURED"
     ? pct(originalShape.originalShapeSame)+" | teacher-forced: "+pct(originalShape.teacherForcedAccuracy)+
        " | "+originalShape.trainedChars+" caractere învățate | "+originalShape.generatedLength+
        " caractere generate dinainte"
     : originalShape?.status||"aștept primul test real"),
  "Măsurări diferite: original free-run ≠ V20 next-token ≠ V21 traseu contextual",
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
 $("veilStep").textContent="Pas "+frame+" / "+limit;draw();renderActualActions();
}
async function poll(){
 if(polling)return;polling=true;
 try{
  const resp=await fetch("/graph?w="+worker(),{cache:"no-store"});
  if(!resp.ok)throw Error("HTTP "+resp.status);
  const o=await resp.json();
  data=o.hypermaze?.veil||null;
  originalShape=o.shapeAudit||null;
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
