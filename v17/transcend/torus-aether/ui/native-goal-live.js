// Real V17/V21 native Goal Wavefront observatory (additive).
// This panel READS the original worker and calls Brain.disc.shape() through
// /veil-native-plan. All lines come from measured observed states and edges.
// GOLD is a predicted route; BLUE is a corpus observation, NOT proof that
// the free-writing Brain executed the gold path or answered semantically.
const byId=id=>document.getElementById(id);
const canvas=byId("nativeGoalCanvas"),ctx=canvas.getContext("2d");
const selectWorker=()=>Math.max(0,Math.trunc(Number(byId("textMazeWorker")?.value)||0));
let model=null,native=null,seenDoc=-1,frame=0,active=false,pending=false,play=true,lastAt=0;
const coords=(n,W,H)=>{
 const f=n.features||[0,0,0,0,0];
 const angle=((Math.imul(n.id+1,2654435761)>>>0)/4294967296)*6.283185307;
 return {x:Math.max(15,Math.min(W-15,W*(.12+.72*(.38*f[0]+.34*f[2]+.28*f[4]))+23*Math.cos(angle))),
  y:Math.max(27,Math.min(H-25,H*(.12+.72*(.51*f[1]+.49*f[3]))+23*Math.sin(angle))),n};
};
function draw(){
 const W=canvas.width,H=canvas.height,g=ctx;
 g.fillStyle="#070f19";g.fillRect(0,0,W,H);
 g.fillStyle="#bad0e5";g.font="12px monospace";
 g.fillText("ORIGINAL Discoverer.shape() | observed V21 topology | diagnostic 2D projection",12,21);
 const nodeMap=new Map([...(model?.sample?.nodes||[]),...(native?.routeNodes||[])].map(n=>[n.id,n]));
 const pos=new Map([...nodeMap].map(([id,n])=>[id,coords(n,W,H)]));
 if(!pos.size){g.fillText("Await real corpus transitions from native worker",20,H/2);return;}
 for(const edge of model.sample?.edges||[]){
  const a=pos.get(edge[0]),b=pos.get(edge[1]);if(!a||!b)continue;
  g.strokeStyle="rgba(89,121,156,.22)";g.lineWidth=.7;
  g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
 }
 // The complete predicted route is frozen BEFORE the first hypothetical step.
 const pathIds=(native?.routeNodes||[]).map(n=>n.id);
 for(let i=1;i<pathIds.length;i++){
  const a=pos.get(pathIds[i-1]),b=pos.get(pathIds[i]);if(!a||!b)continue;
  g.strokeStyle="#ffc65e";g.lineWidth=3;
  g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
 }
 // Actual online observed corpus transition sequence is independent evidence.
 const actual=(model.last?.actual||[]).slice(0,120);
 const labelToId=new Map([...nodeMap].map(([id,n])=>[n.label,id]));
 for(let i=1;i<actual.length;i++){
  const a=pos.get(labelToId.get(actual[i-1])),b=pos.get(labelToId.get(actual[i]));
  if(!a||!b)continue;g.strokeStyle="rgba(67,205,251,.68)";g.lineWidth=1.6;
  g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
 }
 const focus=pathIds[Math.min(frame,Math.max(0,pathIds.length-1))];
 for(const [id,p] of pos){
  const selected=id===focus,gold=pathIds.includes(id),r=selected?8:gold?4.5:2.8;
  g.fillStyle=selected?"#ffffff":gold?"#ffce69":"#6089a7";
  g.beginPath();g.arc(p.x,p.y,r,0,Math.PI*2);g.fill();
 }
 g.font="12px monospace";g.fillStyle="#eff8ff";
 const current=pos.get(focus);
 if(current){const txt=nodeMap.get(focus)?.label||String(focus);
  g.fillText(txt.slice(0,46),Math.max(12,Math.min(W-330,current.x+11)),Math.max(38,current.y-12));}
 g.fillStyle="#bad0e5";
 g.fillText("GOLD = native pre-action solution | BLUE = separately observed corpus route",12,H-16);
}
function show(){
 const n=native,stats=byId("nativeGoalStats");
 const steps=n?.links||[];
 const current=steps[Math.max(0,frame-1)];
 stats.textContent=[
  "LIVE source: original V17 Brain checkpoint + real V21 contextual edges",
  "Documents observed: "+(model?.documents??0)+
   " | contextual states "+(model?.states??0)+" | edges "+(model?.edges??0),
  "Same method called: "+(n?.originalMethod??"not yet requested"),
  "Goal was visible before plan: "+Boolean(n?.goal)+
   " | hidden answer supplied: "+(n?.hiddenAnswerUsed??"UNKNOWN"),
  "Full frozen route: "+(n?.found?"GOAL_REACHED":n?.reason??"none"),
  "First emitted action if performed: "+(n?.firstAction??"none"),
  "Step "+frame+"/"+steps.length+" | original Bellman residual: "+
    (n?.math?.maxBellmanResidual??"not measured"),
  "Current edge: "+(current?current.from+" --"+current.action+"--> "+current.to+
    " | outcome p="+current.empiricalOutcomeProbability:"none"),
  "Strict uphill: "+(n?.math?.strictlyUphill??"unknown")+
   " | only observed edges: "+(n?.math?.noUnobservedEdges??"unknown"),
  "Important: original Brain.chat still uses AligningGraph.write; this graph"+
   " route is NOT yet semantic answer generation or full CUDA."
 ].join("\n");
 byId("nativeGoalScrub").max=Math.max(0,steps.length);
 byId("nativeGoalScrub").value=Math.min(frame,steps.length);
 byId("nativeGoalStep").textContent=frame+"/"+steps.length;
 draw();
}
async function planNative(){
 if(pending)return;pending=true;
 const b=byId("nativeGoalPlan");b.disabled=true;
 try{
  const resp=await fetch("/veil-native-plan",{method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({w:selectWorker(),start:byId("veilStart").value,
    goal:byId("veilGoal").value,maxSteps:160}),
   signal:AbortSignal.timeout(20000)});
  if(!resp.ok)throw Error("HTTP "+resp.status);
  const p=await resp.json();if(p.error)throw Error(p.error);
  native=p;frame=0;active=true;show();
  byId("nativeGoalStatus").textContent="LIVE worker #"+selectWorker()+" | native method evaluated on actual observed graph";
 }catch(e){byId("nativeGoalStatus").textContent="Native shape error: "+e.message;}
 finally{b.disabled=false;pending=false;}
}
async function poll(){
 try{
  const r=await fetch("/graph?w="+selectWorker(),{cache:"no-store",signal:AbortSignal.timeout(7000)});
  if(!r.ok)throw Error("HTTP "+r.status);
  const data=await r.json();model=data.hypermaze?.veil||null;
  if(!model){byId("nativeGoalStatus").textContent="Waiting for REAL native hypertext worker";return;}
  const fresh=model.documents!==seenDoc;seenDoc=model.documents;
  if(byId("nativeGoalAuto").checked&&fresh&&byId("veilStart").value&&byId("veilGoal").value)
    await planNative();
  else show();
  if(!active)byId("nativeGoalStatus").textContent="LIVE: "+model.documents+" real docs, ready to call original Discoverer";
 }catch(e){byId("nativeGoalStatus").textContent="Worker connection: "+e.message;}
}
byId("nativeGoalPlan").addEventListener("click",planNative);
byId("nativeGoalScrub").addEventListener("input",e=>{play=false;frame=+e.target.value;show();});
byId("nativeGoalPrev").addEventListener("click",()=>{play=false;frame=Math.max(0,frame-1);show();});
byId("nativeGoalNext").addEventListener("click",()=>{play=false;frame=Math.min(native?.links?.length||0,frame+1);show();});
byId("nativeGoalPlay").addEventListener("click",()=>{play=!play;byId("nativeGoalPlay").textContent=play?"Pause path":"Play path";});
function animate(t){
 if(play&&native?.links?.length&&t-lastAt>320){
  lastAt=t;frame=(frame+1)%(native.links.length+1);show();
 }
 requestAnimationFrame(animate);
}
show();poll();setInterval(poll,2200);requestAnimationFrame(animate);
